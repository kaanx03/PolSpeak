import { NextRequest, NextResponse } from "next/server";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const filename = request.nextUrl.searchParams.get("filename") || "download";

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // SSRF protection: only allow requests to our own R2 bucket
  if (!R2_PUBLIC_URL || !url.startsWith(R2_PUBLIC_URL + "/")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: response.status });
    }

    const blob = await response.blob();
    const headers = new Headers();

    // Content type - PDF için octet-stream kullan ki Safari önizleme yapmasın
    const isPdf = blob.type === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
    headers.set("Content-Type", isPdf ? "application/octet-stream" : (blob.type || "application/octet-stream"));

    // Content-Disposition with both filename and filename* for better compatibility
    const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${filename.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodedFilename}`
    );

    headers.set("Content-Length", blob.size.toString());

    // Prevent caching to ensure fresh download
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error("Download proxy error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
