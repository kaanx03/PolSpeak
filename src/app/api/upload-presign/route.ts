import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";

const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "audio/mpeg",
  "audio/mp3",
  "video/mp4",
  "application/zip",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileName, fileType, fileSize, folder } = await request.json();

  if (!fileName || !fileType || !fileSize) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Max 50MB." }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(fileType)) {
    return NextResponse.json({ error: "File type not allowed." }, { status: 400 });
  }

  const key = `${folder || "uploads"}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  const presignedUrl = await getSignedUrl(
    S3,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: fileType,
    }),
    { expiresIn: 300 } // 5 minutes
  );

  return NextResponse.json({
    presignedUrl,
    key,
    publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
  });
}
