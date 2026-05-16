import { useState, useRef } from 'react';
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
    performanceAnalysis,
    analysisGeneratedAt,
    documentFile,
    annotationStrokes,
    annotationHighlights,
  } = state;

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const analysisContentRef = useRef(null);

  const acceptedErrorCount = acceptedErrorRegistry.length;

  async function handleGenerateAnalysis() {
    setIsGeneratingAnalysis(true);
    try {
      const result = await simulatePerformanceAnalysis(acceptedErrorRegistry);
      generateAnalysis({
        analysis: result.analysis,
        generatedAt: result.generatedAt,
      });
    } catch {
      /* mock failure handled silently */
    }
    setIsGeneratingAnalysis(false);
  }

  async function handleMakeReport() {
    setIsExportingPdf(true);
    setExportMessage('');

    if (!documentFile) {
      setExportMessage('No source document is available for export.');
      setIsExportingPdf(false);
      return;
    }

    try {
      const result = await exportPdfWithAnnotations({
        sourceFile: documentFile,
        annotationStrokes,
        annotationHighlights,
        acceptedErrorRegistry,
      });

      if (result.success) {
        setExportMessage(
          `Report generated successfully with ${acceptedErrorCount} accepted correction(s) and manual annotations embedded.`
        );
      }
    } catch (err) {
      setExportMessage(
        `Report generation encountered an error: ${err.message || 'unknown error'}`
      );
    }

    setIsExportingPdf(false);
  }

  const severityCounts = acceptedErrorRegistry.reduce((acc, err) => {
    acc[err.severity] = (acc[err.severity] || 0) + 1;
    return acc;
  }, {});

  const totalStrokeCount = Object.values(annotationStrokes).reduce(
    (sum, strokes) => sum + strokes.length,
    0
  );

  return (
    <div className="d-flex justify-content-center bg-light" style={{ minHeight: '100vh' }}>
      <div className="py-5 px-4" style={{ width: '100%', maxWidth: '900px' }}>
        <div className="d-flex align-items-center mb-4">
          <button
            className="btn btn-outline-secondary btn-sm me-3"
            onClick={() => navigate('workspace')}
          >
            &larr; Return to Workspace
          </button>
          <div>
            <h4 className="fw-bold mb-0">Evaluative Summary &amp; Analysis</h4>
            <small className="text-muted">
              Consolidated report of the academic correction process
            </small>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm text-center p-3">
              <div className="fs-2 fw-bold text-dark">
                {acceptedErrorCount}
              </div>
              <small className="text-muted">
                Accepted Corrections
              </small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm text-center p-3">
              <div className="fs-2 fw-bold text-dark">
                {state.rejectedErrorRegistry.length}
              </div>
              <small className="text-muted">
                Rejected Corrections
              </small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm text-center p-3">
              <div className="fs-2 fw-bold text-dark">
                {totalStrokeCount}
              </div>
              <small className="text-muted">
                Manual Annotations
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
                Document Size
              </small>
            </div>
          </div>
        </div>

        {Object.keys(severityCounts).length > 0 && (
          <div className="card border-0 shadow-sm p-3 mb-4">
            <h6 className="fw-semibold small text-uppercase text-muted mb-3">
              Severity Distribution
            </h6>
            <div className="d-flex gap-3">
              {Object.entries(severityCounts).map(([severity, count]) => (
                <div key={severity} className="text-center px-3 py-2 rounded bg-light">
                  <div className="fw-bold text-capitalize">{severity}</div>
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
            disabled={isGeneratingAnalysis || acceptedErrorCount === 0}
          >
            {isGeneratingAnalysis
              ? 'Generating Analysis...'
              : 'Generate Performance Analysis'}
          </button>
          <button
            className="btn btn-danger px-4"
            onClick={handleMakeReport}
            disabled={isExportingPdf || !documentFile}
          >
            {isExportingPdf ? 'Generating Report...' : 'Make Report'}
          </button>
        </div>

        {exportMessage && (
          <div className={`alert py-2 small ${
            exportMessage.includes('successfully') ? 'alert-success' : 'alert-info'
          }`} role="alert">
            {exportMessage}
          </div>
        )}

        {performanceAnalysis && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2">
              <span className="fw-semibold small">
                AI-Generated Performance Analysis
              </span>
              <small className="text-muted">
                {analysisGeneratedAt
                  ? new Date(analysisGeneratedAt).toLocaleString()
                  : ''}
              </small>
            </div>
            <div className="card-body">
              <pre
                ref={analysisContentRef}
                className="mb-0"
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: '"Courier New", monospace',
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                }}
              >
                {performanceAnalysis}
              </pre>
            </div>
          </div>
        )}

        {!performanceAnalysis && acceptedErrorCount === 0 && (
          <div className="text-center py-5 text-muted">
            <p>
              No corrections have been accepted yet. Please return to the
              correction workspace to evaluate the document.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
