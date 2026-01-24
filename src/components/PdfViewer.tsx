"use client";

interface PdfViewerProps {
  url: string;
  className?: string;
}

export default function PdfViewer({ url, className = "" }: PdfViewerProps) {
  // Use Google Docs Viewer - works on all devices including iOS
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className={`relative ${className}`}>
      <iframe
        src={viewerUrl}
        className="w-full h-full rounded-lg border-0"
        style={{ minHeight: "400px" }}
        title="PDF Viewer"
        allowFullScreen
      />
    </div>
  );
}
