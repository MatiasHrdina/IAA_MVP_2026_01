import { useState, useEffect, useRef, useCallback } from 'react';
import { pdfjs } from 'react-pdf';
import { useAppContext } from '../../context/AppContext';
import AnnotationCanvas from './AnnotationCanvas';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function PdfViewer() {
  const { state, setCurrentPage, recordHighlight } = useAppContext();
  const {
    documentUrl, currentPage, totalPages,
    acceptedErrorRegistry,
    annotationHighlights,
  } = state;

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const textOverlayRef = useRef(null);
  const [isHighlightModeActive, setIsHighlightModeActive] = useState(false);

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

      textOverlay.querySelectorAll('.pdf-text-entity').forEach((el) => el.remove());

      const displayW = Math.min(viewport.width, 700);
      const coordScale = displayW / viewport.width;
      const displayH = viewport.height * coordScale;

      textOverlay.style.position = 'absolute';
      textOverlay.style.top = '0';
      textOverlay.style.left = '0';
      textOverlay.style.width = `${displayW}px`;
      textOverlay.style.height = `${displayH}px`;
      textOverlay.style.overflow = 'hidden';
      textOverlay.style.zIndex = '5';

      const acceptedTexts = acceptedErrorRegistry
        .filter((e) => e.original_text)
        .map((e) => e.original_text.toLowerCase());

      textContent.items.forEach((item) => {
        const span = document.createElement('span');
        span.textContent = item.str;
        span.style.position = 'absolute';
        span.className = 'pdf-text-entity';

        const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
        const fontSize = item.transform[0] * SCALE * coordScale;
        span.style.fontSize = `${fontSize}px`;
        span.style.lineHeight = 1;
        span.style.fontFamily = item.fontName || 'sans-serif';
        span.style.left = `${x * coordScale}px`;
        span.style.top = `${(y * coordScale) - fontSize}px`;
        span.style.color = 'transparent';
        span.style.pointerEvents = isHighlightModeActive ? 'auto' : 'none';
        span.style.userSelect = isHighlightModeActive ? 'text' : 'none';
        span.style.cursor = isHighlightModeActive ? 'text' : 'default';
        span.style.zIndex = '2';
        span.style.whiteSpace = 'pre';

        const text = item.str.toLowerCase();

        const isAcceptedError = acceptedTexts.some((at) => text.includes(at));
        if (isAcceptedError) {
          span.style.backgroundColor = 'rgba(255, 230, 0, 0.5)';
          span.style.borderBottom = '2px solid rgba(255, 166, 0, 0.8)';
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

  useEffect(() => {
    const textOverlay = textOverlayRef.current;
    if (!textOverlay) return;
    textOverlay.querySelectorAll('.pdf-text-entity').forEach((span) => {
      span.style.pointerEvents = isHighlightModeActive ? 'auto' : 'none';
      span.style.userSelect = isHighlightModeActive ? 'text' : 'none';
      span.style.cursor = isHighlightModeActive ? 'text' : 'default';
    });
  }, [isHighlightModeActive]);

  useEffect(() => {
    const textOverlay = textOverlayRef.current;
    if (!textOverlay) return;

    function handleMouseUp() {
      if (!isHighlightModeActive) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return;

      const overlayRect = textOverlay.getBoundingClientRect();
      const rects = [];

      for (let r = 0; r < selection.rangeCount; r++) {
        const range = selection.getRangeAt(r);
        const clientRects = range.getClientRects();
        for (let i = 0; i < clientRects.length; i++) {
          const cr = clientRects[i];
          rects.push({
            x: cr.left - overlayRect.left,
            y: cr.top - overlayRect.top,
            width: cr.width,
            height: cr.height,
          });
        }
      }

      if (rects.length > 0) {
        recordHighlight({ page: currentPage, rects });
      }

      selection.removeAllRanges();
    }

    textOverlay.addEventListener('mouseup', handleMouseUp);
    return () => textOverlay.removeEventListener('mouseup', handleMouseUp);
  }, [isHighlightModeActive, currentPage, recordHighlight]);

  useEffect(() => {
    const textOverlay = textOverlayRef.current;
    if (!textOverlay) return;

    textOverlay.querySelectorAll('.user-highlight').forEach((el) => el.remove());

    const pageHighlights = annotationHighlights[currentPage] || [];
    pageHighlights.forEach((hl) => {
      hl.rects.forEach((rect) => {
        const div = document.createElement('div');
        div.className = 'user-highlight';
        div.style.position = 'absolute';
        div.style.left = `${rect.x}px`;
        div.style.top = `${rect.y}px`;
        div.style.width = `${rect.width}px`;
        div.style.height = `${rect.height}px`;
        div.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        div.style.pointerEvents = 'none';
        div.style.zIndex = '1';
        textOverlay.appendChild(div);
      });
    });
  }, [annotationHighlights, currentPage]);

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
        className="flex-grow-1 d-flex justify-content-center p-3 overflow-auto position-relative"
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
          style={{ width: `${displayWidth}px`, flexShrink: 0, alignSelf: 'flex-start' }}
        >
          <canvas
            ref={canvasRef}
            className="d-block pdf-render-canvas"
            style={{ width: '100%', height: 'auto' }}
          />
          <div ref={textOverlayRef} />

          <AnnotationCanvas
            pageWidth={displayWidth}
            pageHeight={displayHeight}
            pageNumber={currentPage}
            onHighlightModeChange={setIsHighlightModeActive}
          />
        </div>
      </div>
    </div>
  );
}
