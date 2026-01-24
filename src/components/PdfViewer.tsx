"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  className?: string;
}

export default function PdfViewer({ url, className = "" }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = () => {
    setError(true);
    setLoading(false);
  };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 ${className}`}>
        <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-3xl text-red-500">error</span>
        </div>
        <p className="text-slate-600 text-center mb-4">Failed to load PDF</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium"
        >
          Open in new tab
        </a>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
          <div className="size-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500">Loading PDF...</p>
        </div>
      )}

      {/* PDF Document */}
      <div className="overflow-y-auto h-full" style={{ WebkitOverflowScrolling: "touch" }}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex flex-col items-center gap-4 pb-4"
        >
          {Array.from(new Array(numPages), (_, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              className="shadow-lg"
              width={Math.min(typeof window !== "undefined" ? window.innerWidth - 64 : 600, 800)}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          ))}
        </Document>
      </div>

      {/* Page count indicator */}
      {numPages > 0 && !loading && (
        <div className="sticky bottom-4 flex justify-center">
          <span className="px-3 py-1 bg-black/70 text-white text-sm rounded-full">
            {numPages} pages
          </span>
        </div>
      )}
    </div>
  );
}
