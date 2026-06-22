import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppContext } from '../../context/AppContext';
import { simulatePerformanceAnalysis } from '../../mock/api';
import { exportPdfWithAnnotations } from '../../utils/pdfExport';

export default function Summary() {
  const {
    state,
    generateAnalysis,
    navigate,
  } = useAppContext();

  const {
    acceptedErrorRegistry,
    rejectedErrorRegistry,
    performanceAnalysis,
    analysisGeneratedAt,
    documentFile,
    annotationStrokes,
    annotationHighlights,
  } = state;

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [analysisError, setAnalysisError] = useState('');

  const aiAcceptedCount = acceptedErrorRegistry.filter((e) => e.source === 'ai').length;
  const manualErrorCount = acceptedErrorRegistry.filter((e) => e.source === 'manual').length;

  async function handleGenerateAnalysis() {
    setIsGeneratingAnalysis(true);
    setAnalysisError('');
    try {
      const result = await simulatePerformanceAnalysis(
        acceptedErrorRegistry,
        state.rejectedErrorRegistry,
        annotationStrokes,
        annotationHighlights
      );
      if (!result.success || !result.analysis) {
        setAnalysisError('Hubo un error, intente de nuevo.');
        return;
      }
      generateAnalysis({
        analysis: result.analysis,
        generatedAt: result.generatedAt,
      });
    } catch {
      setAnalysisError('Hubo un error, intente de nuevo.');
    } finally {
      setIsGeneratingAnalysis(false);
    }
  }

  async function handleMakeReport() {
    setIsExportingPdf(true);
    setExportMessage('');

    if (!documentFile) {
      setExportMessage('No hay documento disponible para exportar.');
      setIsExportingPdf(false);
      return;
    }

    try {
      const result = await exportPdfWithAnnotations({
        sourceFile: documentFile,
        annotationStrokes,
        annotationHighlights,
        acceptedErrorRegistry,
        errorCorpus: state.errorCorpus,
        rejectedErrorRegistry: state.rejectedErrorRegistry,
        performanceAnalysis: state.performanceAnalysis,
      });

      if (result.success) {
      setExportMessage(
        `        Informe generado exitosamente con ${aiAcceptedCount} corrección(es) de IA aceptada(s) y ${manualErrorCount} corrección(es) manual(es) incrustadas.`
      );
    }
  } catch (err) {
    setExportMessage(
      `Error al generar el informe: ${err.message || 'error desconocido'}`
    );
    }

    setIsExportingPdf(false);
  }

  const severityCounts = acceptedErrorRegistry.reduce((acc, err) => {
    acc[err.severity] = (acc[err.severity] || 0) + 1;
    return acc;
  }, {});



  return (
    <div className="d-flex justify-content-center bg-light" style={{ minHeight: '100vh' }}>
      <div className="py-5 px-4" style={{ width: '100%', maxWidth: '900px' }}>
        <div className="d-flex align-items-center mb-4">
            <button
              className="btn btn-outline-secondary btn-sm me-3"
              onClick={() => navigate('workspace')}
            >
              &larr; Volver al Espacio de Trabajo
            </button>
          <div>
            <h4 className="fw-bold mb-0">Resumen y Análisis Evaluativo</h4>
            <small className="text-muted">
              Informe consolidado del proceso de corrección académica
            </small>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm text-center p-3">
              <div className="fs-2 fw-bold text-dark">
                {aiAcceptedCount}
              </div>
              <small className="text-muted">
                Correcciones Aceptadas
              </small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm text-center p-3">
              <div className="fs-2 fw-bold text-dark">
                {state.rejectedErrorRegistry.length}
              </div>
              <small className="text-muted">
                Correcciones Rechazadas
              </small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm text-center p-3">
              <div className="fs-2 fw-bold text-dark">
                {manualErrorCount}
              </div>
              <small className="text-muted">
                Correcciones Manuales
              </small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm text-center p-3">
              <div className="fs-2 fw-bold text-dark">
                {documentFile
                  ? `${(documentFile.size / 1024).toFixed(0)} KB`
                  : '—'}
              </div>
              <small className="text-muted">
                Tamaño del Documento
              </small>
            </div>
          </div>
        </div>

        {Object.keys(severityCounts).length > 0 && (
          <div className="card border-0 shadow-sm p-3 mb-4">
            <h6 className="fw-semibold small text-uppercase text-muted mb-3">
              Distribución por Severidad
            </h6>
            <div className="d-flex gap-3">
              {Object.entries(severityCounts).map(([severity, count]) => (
                <div key={severity} className="text-center px-3 py-2 rounded bg-light">
                  <div className="fw-bold">{severity === 'minor' ? 'Óptimo' : severity === 'moderate' ? 'Aceptable' : severity === 'major' ? 'Insuficiente' : severity}</div>
                  <div className="fs-4 fw-bold">{count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="d-flex gap-2 mb-4">
          <button
            className="btn btn-dark px-4"
            onClick={handleGenerateAnalysis}
            disabled={isGeneratingAnalysis || acceptedErrorRegistry.length === 0}
          >
            {isGeneratingAnalysis
              ? 'Generando Análisis...'
              : 'Generar Análisis de Rendimiento'}
          </button>
          <button
            className="btn btn-danger px-4"
            onClick={handleMakeReport}
            disabled={isExportingPdf || !documentFile}
          >
            {isExportingPdf ? 'Generando Informe...' : 'Generar Informe PDF'}
          </button>
        </div>

        {exportMessage && (
          <div className={`alert py-2 small ${
            exportMessage.includes('exitosamente') ? 'alert-success' : 'alert-info'
          }`} role="alert">
            {exportMessage}
          </div>
        )}

        {analysisError && (
          <div className="alert alert-danger py-2 small" role="alert">
            {analysisError}
          </div>
        )}

        {performanceAnalysis && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2">
              <span className="fw-semibold small">
                Análisis de Rendimiento Generado por IA
              </span>
              <small className="text-muted">
                {analysisGeneratedAt
                  ? new Date(analysisGeneratedAt).toLocaleString()
                  : ''}
              </small>
            </div>
            <div className="card-body markdown-analysis">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {performanceAnalysis}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {!performanceAnalysis && aiAcceptedCount === 0 && manualErrorCount === 0 && (
          <div className="text-center py-5 text-muted">
            <p>
              No se han aceptado correcciones todavía. Vuelva al espacio de
              trabajo para evaluar el documento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
