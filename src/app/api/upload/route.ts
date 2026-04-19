import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
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

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

function getTokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

async function verifyUser(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function POST(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 20MB." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "File type not allowed." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    await S3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    return NextResponse.json({
      url: publicUrl,
      storagePath: fileName,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { storagePath } = await request.json();

    if (!storagePath || typeof storagePath !== "string") {
      return NextResponse.json({ error: "No storage path provided" }, { status: 400 });
    }

    // Prevent path traversal
    if (storagePath.includes("..") || storagePath.startsWith("/")) {
      return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
    }

    await S3.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: storagePath,
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
