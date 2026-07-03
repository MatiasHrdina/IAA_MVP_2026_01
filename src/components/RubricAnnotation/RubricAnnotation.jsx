import { useState, useEffect, useRef } from 'react';
import { pdfjs } from 'react-pdf';
import { useAppContext } from '../../context/AppContext';
import { exportPdfWithAnnotations } from '../../utils/pdfExport';
import ErrorStatsPanel from '../Workspace/ErrorStatsPanel';
import { RUBRIC_CATEGORIES } from '../../mock/data';

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
  const [exportMessage, setExportMessage] = useState('');
  const [exportMessageType, setExportMessageType] = useState('');
  const [showNewDocWarning, setShowNewDocWarning] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [hoveredSeverity, setHoveredSeverity] = useState(null);
  const [rubricForm, setRubricForm] = useState({
    curso: '',
    alumnosGrupo: '',
    corrector: '',
    aprobacion: 'N/A',
  });

  const severityCounts = acceptedErrorRegistry.reduce((acc, err) => {
    acc[err.severity] = (acc[err.severity] || 0) + 1;
    return acc;
  }, {});

  const severityCategoryCounts = acceptedErrorRegistry.reduce((acc, err) => {
    if (!acc[err.severity]) acc[err.severity] = {};
    const cat = RUBRIC_CATEGORIES.find((c) => c.id === err.category);
    const label = cat ? cat.label : err.category;
    acc[err.severity][label] = (acc[err.severity][label] || 0) + 1;
    return acc;
  }, {});

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
    const requiredFields = ['curso', 'alumnosGrupo', 'corrector'];
    const errors = {};
    for (const field of requiredFields) {
      if (!rubricForm[field].trim()) errors[field] = true;
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setExportMessage('Debes rellenar todos los DATOS DE LA RÚBRICA a la izquierda.');
      setExportMessageType('error');
      return;
    }
    setFormErrors({});
    setIsExporting(true);
    setExportMessage('');
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
        rubricFormData: rubricForm,
      });
      if (result.success) {
        setExportMessage('Informe PDF descargado exitosamente.');
        setExportMessageType('success');
      }
    } catch (err) {
      setExportMessage(`Error al generar el informe: ${err.message || 'error desconocido'}`);
      setExportMessageType('error');
    } finally {
      setIsExporting(false);
    }
  }

  function handleNewDocument() {
    setShowNewDocWarning(true);
  }

  function confirmNewDocument() {
    setShowNewDocWarning(false);
    navigate('upload');
  }

  function cancelNewDocument() {
    setShowNewDocWarning(false);
  }

  return (
    <div className="d-flex flex-column vh-100 bg-light">
      {showNewDocWarning && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050 }}
        >
          <div className="card shadow border-0" style={{ maxWidth: '420px', width: '90%' }}>
            <div className="card-body p-4 text-center">
              <div className="mb-3 text-warning" style={{ fontSize: '2.5rem' }}>&#9888;</div>
              <h5 className="fw-bold mb-2">¿Volver a la selección de documento?</h5>
              <p className="text-muted small mb-4">
                Se perderá todo el progreso de la corrección actual.
              </p>
              <div className="d-flex gap-2 justify-content-center">
                <button
                  className="btn btn-outline-secondary px-4"
                  onClick={cancelNewDocument}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-danger px-4"
                  onClick={confirmNewDocument}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex align-items-center justify-content-between px-4 py-2 border-bottom bg-white shadow-sm">
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-dark btn-sm"
            onClick={handleNewDocument}
          >
            Nuevo Documento
          </button>
          <h5 className="fw-bold mb-0">Anotar Rúbrica</h5>
        </div>
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => navigate('summary')}
          >
            &larr; Volver
          </button>
          <button
            className="btn btn-danger px-4"
            onClick={handleExport}
            disabled={isExporting || !documentFile}
          >
            {isExporting ? 'Generando Informe...' : 'Generar Informe PDF'}
          </button>
        </div>
      </div>

      {exportMessage && (
        <div
          className={`text-center py-2 small fw-semibold ${
            exportMessageType === 'success' ? 'bg-success text-white' : 'bg-danger text-white'
          }`}
        >
          {exportMessage}
        </div>
      )}

      <div className="flex-grow-1 d-flex" style={{ overflow: 'hidden' }}>
        <div
          className="border-end bg-white d-flex flex-column px-3 py-3"
          style={{ width: '25%', minWidth: '220px', flexShrink: 0 }}
        >
          <h6 className="fw-semibold small text-uppercase text-muted mb-3">
            Datos de la Rúbrica
          </h6>

          <div className="mb-3">
            <label className="form-label small fw-semibold mb-1">Curso:</label>
            <input
              type="text"
              className={`form-control form-control-sm${formErrors.curso ? ' is-invalid' : ''}`}
              value={rubricForm.curso}
              onChange={(e) => { setRubricForm({ ...rubricForm, curso: e.target.value }); setFormErrors((prev) => ({ ...prev, curso: false })); }}
              placeholder="Nombre del curso"
            />
          </div>

          <div className="mb-3">
            <label className="form-label small fw-semibold mb-1">Alumnos/Grupo:</label>
            <input
              type="text"
              className={`form-control form-control-sm${formErrors.alumnosGrupo ? ' is-invalid' : ''}`}
              value={rubricForm.alumnosGrupo}
              onChange={(e) => { setRubricForm({ ...rubricForm, alumnosGrupo: e.target.value }); setFormErrors((prev) => ({ ...prev, alumnosGrupo: false })); }}
              placeholder="Nombre del alumno o grupo"
            />
          </div>

          <div className="mb-3">
            <label className="form-label small fw-semibold mb-1">Corrector(a):</label>
            <input
              type="text"
              className={`form-control form-control-sm${formErrors.corrector ? ' is-invalid' : ''}`}
              value={rubricForm.corrector}
              onChange={(e) => { setRubricForm({ ...rubricForm, corrector: e.target.value }); setFormErrors((prev) => ({ ...prev, corrector: false })); }}
              placeholder="Nombre del corrector"
            />
          </div>

          <div className="border-top pt-3 mb-3">
            <h6 className="fw-semibold small text-muted mb-2">
              Distribución por Severidad
            </h6>
            {Object.keys(severityCounts).length > 0 ? (
                  <div className="d-flex gap-2 flex-wrap">
                {Object.entries(severityCounts).map(([severity, count]) => {
                  const catBreakdown = severityCategoryCounts[severity];
                  const tooltipLines = catBreakdown
                    ? Object.entries(catBreakdown).map(([cat, n]) => `${cat}: ${n}`)
                    : [];
                  return (
                    <div
                      key={severity}
                      className="severity-tooltip-wrapper text-center px-2 py-1 rounded bg-light flex-fill"
                      onMouseEnter={() => setHoveredSeverity(severity)}
                      onMouseLeave={() => setHoveredSeverity(null)}
                    >
                      <div className="fw-bold small">
                        {severity === 'minor' ? 'Óptimo' : severity === 'moderate' ? 'Aceptable' : severity === 'major' ? 'Insuficiente' : severity}
                      </div>
                      <div className="fw-bold">{count}</div>
                      {hoveredSeverity === severity && tooltipLines.length > 0 && (
                        <div className="severity-tooltip">
                          {tooltipLines.map((line, i) => (
                            <div key={i}>{line}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <small className="text-muted">Sin datos</small>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label small fw-semibold mb-1">Aprobación:</label>
            <select
              className="form-select form-select-sm"
              value={rubricForm.aprobacion}
              onChange={(e) => setRubricForm({ ...rubricForm, aprobacion: e.target.value })}
            >
              <option value="R">R</option>
              <option value="A">A</option>
              <option value="N/A">N/A</option>
            </select>
          </div>

          <div className="mt-auto border-top pt-3">
            <div className="d-flex flex-column gap-2 align-items-center">
              <small className="text-muted" style={{ fontSize: '0.6rem' }}>
                {currentPage}/{totalPages}
              </small>
              <button
                className="btn btn-sm btn-outline-secondary w-100"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                &larr; Anterior
              </button>
              <button
                className="btn btn-sm btn-outline-secondary w-100"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Siguiente &rarr;
              </button>
            </div>
          </div>
        </div>

        <div className="flex-grow-1 d-flex flex-column align-items-center p-3 overflow-auto" ref={viewerRef}>
          <div className="d-flex gap-2 mb-2">
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
        </div>

        <ErrorStatsPanel disableManualEntry />
      </div>
    </div>
  );
}
