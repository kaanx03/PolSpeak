"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Set worker source from public folder
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

interface PdfThumbnailProps {
  url: string;
  className?: string;
}

export default function PdfThumbnail({ url, className = "" }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPdfThumbnail = async () => {
      if (!url) return;

      try {
        setLoading(true);
        setError(false);

        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        // Check if component is still mounted and canvas exists
        if (!isMounted || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;

        // Scale to fit the container while maintaining aspect ratio
        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = canvas.parentElement?.clientWidth || 200;
        const containerHeight = canvas.parentElement?.clientHeight || 128;

        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const scale = Math.min(scaleX, scaleY);

        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading PDF thumbnail:", err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadPdfThumbnail();

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="material-symbols-outlined text-4xl text-red-500">picture_as_pdf</span>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="size-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`max-w-full max-h-full object-contain ${loading ? "opacity-0" : "opacity-100"} transition-opacity`}
      />
    </div>
  );
}
