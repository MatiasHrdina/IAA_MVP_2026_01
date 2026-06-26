import { useState, useEffect, useRef } from 'react';
import { pdfjs } from 'react-pdf';
import { useAppContext } from '../../context/AppContext';
import { exportPdfWithAnnotations } from '../../utils/pdfExport';
import ErrorStatsPanel from '../Workspace/ErrorStatsPanel';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const RUBRIC_PDF_PATH = '/assets/Rúbrica Escritura Español.pdf';

export default function RubricAnnotation() {
  const { state, navigate, recordRubricStroke, revertRubricStroke } = useAppContext();
  const {
    documentFile,
    annotationStrokes,
    annotationHighlights,
    acceptedErrorRegistry,
    errorCorpus,
    rejectedErrorRegistry,
    performanceAnalysis,
    rubricAnnotationStrokes,
  } = state;

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageDimensions, setPageDimensions] = useState({ width: 800, height: 1000 });
  const [penActive, setPenActive] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);

  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const currentStrokeRef = useRef([]);
  const viewerRef = useRef(null);

  const displayWidth = Math.min(containerWidth * 0.95, 1200);
  const displayHeight = pageDimensions.height * (displayWidth / pageDimensions.width);
  const currentPageStrokes = rubricAnnotationStrokes[currentPage] || [];
  const strokeCount = currentPageStrokes.length;

  useEffect(() => {
    let cancelled = false;
    async function loadPdf() {
      try {
        const doc = await pdfjs.getDocument(RUBRIC_PDF_PATH).promise;
        if (!cancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
        }
      } catch {
        if (!cancelled) setPdfDoc(null);
      }
    }
    loadPdf();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });
        if (cancelled) return;

        setPageDimensions({ width: viewport.width, height: viewport.height });

        const canvas = pdfCanvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        /* page render error */
      }
    }

    renderPage();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    currentPageStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, [currentPageStrokes, displayWidth, displayHeight]);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    if (viewerRef.current) observer.observe(viewerRef.current);
    return () => observer.disconnect();
  }, []);

  function getCanvasCoords(event) {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handlePointerDown(event) {
    if (!penActive) return;
    setIsDrawing(true);
    currentStrokeRef.current = [getCanvasCoords(event)];
  }

  function handlePointerMove(event) {
    if (!isDrawing || !penActive) return;
    const coord = getCanvasCoords(event);
    currentStrokeRef.current.push(coord);

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pts = currentStrokeRef.current;
    if (pts.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }

  function handlePointerUp() {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.length > 0) {
      recordRubricStroke({
        page: currentPage,
        points: [...currentStrokeRef.current],
        timestamp: Date.now(),
      });
    }
    currentStrokeRef.current = [];
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const result = await exportPdfWithAnnotations({
        sourceFile: documentFile,
        annotationStrokes,
        annotationHighlights,
        acceptedErrorRegistry,
        errorCorpus,
        rejectedErrorRegistry,
        performanceAnalysis,
        rubricAnnotationStrokes,
        rubricCanvasWidth: displayWidth,
      });
      if (result.success) {
        navigate('summary');
      }
    } catch (err) {
      console.error('Error al exportar:', err);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="d-flex flex-column vh-100 bg-light">
      <div className="d-flex align-items-center justify-content-between px-4 py-2 border-bottom bg-white shadow-sm">
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => navigate('summary')}
          >
            &larr; Volver
          </button>
          <h5 className="fw-bold mb-0">Anotar Rúbrica</h5>
        </div>
        <div className="d-flex align-items-center gap-3">
          <small className="text-muted me-2">
            {totalPages > 0 ? `Página ${currentPage} de ${totalPages}` : 'Cargando...'}
          </small>
          <button
            className="btn btn-danger px-4"
            onClick={handleExport}
            disabled={isExporting || !documentFile}
          >
            {isExporting ? 'Generando Informe...' : 'Generar Informe PDF'}
          </button>
        </div>
      </div>

      <div className="flex-grow-1 d-flex" style={{ overflow: 'hidden' }}>
        <div className="flex-grow-1 d-flex flex-column align-items-center p-3 overflow-auto" ref={viewerRef}>
          <div
            className="position-relative shadow-sm bg-white"
            style={{ width: `${displayWidth}px`, flexShrink: 0 }}
          >
            <canvas
              ref={pdfCanvasRef}
              className="d-block"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />

            <canvas
              ref={overlayCanvasRef}
              width={Math.round(displayWidth)}
              height={Math.round(displayHeight)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                cursor: penActive ? 'crosshair' : 'default',
                pointerEvents: penActive ? 'auto' : 'none',
                zIndex: 10,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>

          <div className="d-flex align-items-center justify-content-between mt-3" style={{ width: `${displayWidth}px` }}>
            <div className="d-flex gap-2">
              <button
                className={`btn btn-sm ${penActive ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => setPenActive(!penActive)}
              >
                {penActive ? 'Desactivar Lápiz' : 'Activar Lápiz'}
              </button>
              {strokeCount > 0 && (
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => revertRubricStroke(currentPage)}
                >
                  Deshacer ({strokeCount})
                </button>
              )}
            </div>

            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                &larr; Anterior
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Siguiente &rarr;
              </button>
            </div>
          </div>
        </div>

        <ErrorStatsPanel />
      </div>
    </div>
  );
}
