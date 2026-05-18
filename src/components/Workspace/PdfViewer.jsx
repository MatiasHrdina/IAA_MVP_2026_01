import { useState, useEffect, useRef, useCallback } from 'react';
import { pdfjs } from 'react-pdf';
import { useAppContext } from '../../context/AppContext';
import AnnotationCanvas from './AnnotationCanvas';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const CATEGORY_COLORS = {
  cientifica: { bg: 'rgba(74, 144, 217, 0.35)', border: '#4A90D9' },
  coherencia: { bg: 'rgba(39, 174, 96, 0.35)', border: '#27AE60' },
  cohesion: { bg: 'rgba(155, 89, 182, 0.35)', border: '#9B59B6' },
  resultados: { bg: 'rgba(26, 188, 156, 0.35)', border: '#1ABC9C' },
  referencias: { bg: 'rgba(230, 126, 34, 0.35)', border: '#E67E22' },
  gramatica: { bg: 'rgba(211, 84, 0, 0.35)', border: '#D35400' },
  ortografia: { bg: 'rgba(233, 30, 99, 0.35)', border: '#E91E63' },
};

function getCategoryColor(categoryId) {
  return CATEGORY_COLORS[categoryId] || { bg: 'rgba(255, 230, 0, 0.5)', border: 'rgba(255, 166, 0, 0.8)' };
}

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
  const recordedErrorHighlightsRef = useRef(new Set());
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

      textOverlay.querySelectorAll('.pdf-text-entity, .accepted-error-highlight').forEach((el) => el.remove());

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

      const spansWithErrors = [];
      const spanMeta = [];
      let concatString = '';
      const matchedSpans = new Set();

      textContent.items.forEach((item, index) => {
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

        if (index > 0) concatString += ' ';
        const startIndex = concatString.length;
        concatString += item.str;
        spanMeta.push({ span, startIndex, endIndex: concatString.length });

        textOverlay.appendChild(span);
      });

      function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }

      function buildFlexibleRegex(text) {
        const escaped = escapeRegExp(text);
        return new RegExp(escaped.replace(/\s+/g, '\\s+'), 'gi');
      }

      acceptedErrorRegistry.forEach((error) => {
        if (error.page !== currentPage) return;
        if (!error.original_text) return;

        const searchRegex = buildFlexibleRegex(error.original_text);
        const colors = getCategoryColor(error.category);
        let match;

        while ((match = searchRegex.exec(concatString)) !== null) {
          const matchIndex = match.index;
          const matchEnd = matchIndex + match[0].length;

          spanMeta.forEach(({ span, startIndex, endIndex }) => {
            if (startIndex < matchEnd && endIndex > matchIndex && !matchedSpans.has(span)) {
              matchedSpans.add(span);
              span.style.backgroundColor = colors.bg;
              span.style.borderBottom = `2px solid ${colors.border}`;
              span.dataset.errorId = error.id;
              span.dataset.category = error.category || '';
              spansWithErrors.push({ span, errorId: error.id });
            }
          });
        }
      });

      const errorGroups = {};
      spansWithErrors.forEach(({ span, errorId }) => {
        if (!errorGroups[errorId]) errorGroups[errorId] = [];
        errorGroups[errorId].push(span);
      });

      const newHighlights = [];
      Object.entries(errorGroups).forEach(([errorId, spans]) => {
        const id = Number(errorId);
        if (recordedErrorHighlightsRef.current.has(id)) return;
        recordedErrorHighlightsRef.current.add(id);

        const rects = spans.map((s) => {
          const rect = s.getBoundingClientRect();
          const overlayRect = textOverlay.getBoundingClientRect();
          return {
            x: rect.left - overlayRect.left,
            y: rect.top - overlayRect.top,
            width: rect.width,
            height: rect.height,
            category: s.dataset.category,
          };
        });

        const error = acceptedErrorRegistry.find((e) => e.id === id);
        if (error && error.page === currentPage) {
          newHighlights.push({ id, rects });
        }
      });

      if (newHighlights.length > 0) {
        const allRects = newHighlights.flatMap((h) => h.rects);
        recordHighlight({ page: currentPage, rects: allRects });
      }
    } catch {
      /* rendering error */
    }

    setIsLoading(false);
  }, [pdfDocument, currentPage, acceptedErrorRegistry, recordHighlight]);

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
        div.style.pointerEvents = 'none';
        div.style.zIndex = '1';
        if (rect.category) {
          const colors = getCategoryColor(rect.category);
          div.style.backgroundColor = colors.bg;
          div.style.borderBottom = `2px solid ${colors.border}`;
        } else {
          div.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        }
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
