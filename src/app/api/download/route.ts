import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const filename = request.nextUrl.searchParams.get("filename") || "download";

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: response.status });
    }

    const blob = await response.blob();
    const headers = new Headers();
    headers.set("Content-Type", blob.type || "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set("Content-Length", blob.size.toString());

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error("Download proxy error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
