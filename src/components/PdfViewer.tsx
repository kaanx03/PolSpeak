"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Set worker source from public folder
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

interface PdfViewerProps {
  url: string;
  className?: string;
}

export default function PdfViewer({ url, className = "" }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadPdf = async () => {
      if (!url) return;

      try {
        setLoading(true);
        setError(false);

        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        if (!isMounted) return;

        setNumPages(pdf.numPages);
        canvasRefs.current = new Array(pdf.numPages).fill(null);

        // Render all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (!isMounted) return;

          const page = await pdf.getPage(pageNum);

          // Wait for canvas to be available
          await new Promise<void>((resolve) => {
            const checkCanvas = () => {
              if (canvasRefs.current[pageNum - 1] || !isMounted) {
                resolve();
              } else {
                requestAnimationFrame(checkCanvas);
              }
            };
            checkCanvas();
          });

          if (!isMounted) return;

          const canvas = canvasRefs.current[pageNum - 1];
          if (!canvas) continue;

          const context = canvas.getContext("2d");
          if (!context) continue;

          // Calculate scale based on container width
          const containerWidth = containerRef.current?.clientWidth || 800;
          const viewport = page.getViewport({ scale: 1 });
          const scale = (containerWidth - 32) / viewport.width; // 32px for padding
          const scaledViewport = page.getViewport({ scale });

          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;

          await page.render({
            canvasContext: context,
            viewport: scaledViewport,
            canvas: canvas,
          }).promise;
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading PDF:", err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [url]);

  // Track scroll to update current page
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      // Find which page is most visible
      let cumulativeHeight = 0;
      for (let i = 0; i < canvasRefs.current.length; i++) {
        const canvas = canvasRefs.current[i];
        if (canvas) {
          const pageHeight = canvas.height + 16; // 16px gap
          if (scrollTop < cumulativeHeight + pageHeight - containerHeight / 2) {
            setCurrentPage(i + 1);
            break;
          }
          cumulativeHeight += pageHeight;
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages]);

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
      {/* Page indicator */}
      {numPages > 0 && (
        <div className="sticky top-2 z-10 flex justify-center mb-2">
          <span className="px-3 py-1 bg-black/70 text-white text-sm rounded-full">
            {currentPage} / {numPages}
          </span>
        </div>
      )}

      {/* PDF Container */}
      <div
        ref={containerRef}
        className="overflow-y-auto h-full"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="size-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500">Loading PDF...</p>
          </div>
        )}

        {/* Canvas elements for each page */}
        <div className="flex flex-col items-center gap-4 pb-4">
          {Array.from({ length: numPages }, (_, i) => (
            <canvas
              key={i}
              ref={(el) => {
                canvasRefs.current[i] = el;
              }}
              className={`shadow-lg bg-white ${loading ? "hidden" : "block"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
