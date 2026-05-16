import { useState, useEffect, useRef, useCallback } from 'react';
import { pdfjs } from 'react-pdf';
import { useAppContext } from '../../context/AppContext';
import AnnotationCanvas from './AnnotationCanvas';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function PdfViewer() {
  const { state, setCurrentPage } = useAppContext();
  const { documentUrl, currentPage, totalPages, acceptedErrorRegistry } = state;

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const textOverlayRef = useRef(null);

  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 700, height: 906 });
  const [isLoading, setIsLoading] = useState(false);

  const SCALE = 1.5;

  useEffect(() => {
    if (!documentUrl) return;
    let cancelled = false;

    async function loadPdf() {
      try {
        const doc = await pdfjs.getDocument(documentUrl).promise;
        if (!cancelled) setPdfDocument(doc);
      } catch {
        if (!cancelled) setPdfDocument(null);
      }
    }

    loadPdf();
    return () => { cancelled = true; };
  }, [documentUrl]);

  const renderPageContent = useCallback(async () => {
    if (!pdfDocument || !canvasRef.current || !textOverlayRef.current) return;
    setIsLoading(true);

    try {
      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale: SCALE });

      setPageDimensions({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport }).promise;

      const textContent = await page.getTextContent();
      const textOverlay = textOverlayRef.current;
      textOverlay.innerHTML = '';
      textOverlay.style.width = `${viewport.width}px`;
      textOverlay.style.height = `${viewport.height}px`;
      textOverlay.style.position = 'absolute';
      textOverlay.style.top = '0';
      textOverlay.style.left = '0';
      textOverlay.style.overflow = 'hidden';
      textOverlay.style.zIndex = '5';
      textOverlay.style.pointerEvents = 'none';

      const acceptedTexts = acceptedErrorRegistry
        .filter((e) => e.original_text)
        .map((e) => e.original_text.toLowerCase());

      textContent.items.forEach((item) => {
        const span = document.createElement('span');
        span.textContent = item.str;
        span.style.position = 'absolute';
        span.style.left = `${item.transform[4] * SCALE}px`;
        span.style.top = `${item.transform[5] * SCALE}px`;
        span.style.fontSize = `${item.height * SCALE}px`;
        span.style.fontFamily = 'serif';
        span.style.whiteSpace = 'pre';
        span.style.color = 'transparent';
        span.style.pointerEvents = 'none';
        span.className = 'pdf-text-entity';

        const text = item.str.toLowerCase();
        const shouldHighlight = acceptedTexts.some((at) => text.includes(at));
        if (shouldHighlight) {
          span.style.backgroundColor = 'rgba(255, 230, 0, 0.5)';
          span.style.borderBottom = '2px solid rgba(255, 166, 0, 0.8)';
          span.style.color = '#000';
        }

        textOverlay.appendChild(span);
      });
    } catch {
      /* rendering error */
    }

    setIsLoading(false);
  }, [pdfDocument, currentPage, acceptedErrorRegistry]);

  useEffect(() => {
    renderPageContent();
  }, [renderPageContent]);

  function handlePageNavigation(delta) {
    const target = currentPage + delta;
    if (target >= 1 && target <= totalPages) {
      setCurrentPage(target);
    }
  }

  const displayWidth = Math.min(pageDimensions.width, 700);
  const displayHeight = pageDimensions.height * (displayWidth / pageDimensions.width);

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-light">
        <small className="fw-semibold text-muted">
          Folio {currentPage} of {totalPages}
        </small>
        <div className="d-flex gap-1">
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={currentPage <= 1}
            onClick={() => handlePageNavigation(-1)}
          >
            &larr;
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageNavigation(1)}
          >
            &rarr;
          </button>
        </div>
      </div>

      <div
        className="flex-grow-1 d-flex justify-content-center align-items-start p-3 overflow-auto"
        style={{ backgroundColor: '#e9ecef' }}
      >
        {isLoading && (
          <div className="text-muted small position-absolute mt-5">
            Rendering page...
          </div>
        )}

        <div
          ref={containerRef}
          className="position-relative shadow-sm bg-white"
          style={{ width: `${displayWidth}px`, flexShrink: 0 }}
        >
          <canvas
            ref={canvasRef}
            className="d-block pdf-render-canvas"
            style={{ width: '100%', height: 'auto' }}
          />
          <div ref={textOverlayRef} />

          <div
            className="position-absolute"
            style={{
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 20,
            }}
          >
            <AnnotationCanvas
              pageWidth={displayWidth}
              pageHeight={displayHeight}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
