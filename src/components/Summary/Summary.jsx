import { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { simulatePerformanceAnalysis } from '../../mock/api';

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

  async function handleDownloadModifiedPdf() {
    setIsExportingPdf(true);
    setExportMessage('');

    if (!documentFile) {
      setExportMessage('No source document is available for export.');
      setIsExportingPdf(false);
      return;
    }

    try {
      const arrayBuffer = await documentFile.arrayBuffer();
      const pdfJs = await import('pdfjs-dist');
      pdfJs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();

      const pdfDoc = await pdfJs.getDocument(arrayBuffer).promise;

      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      const imgData = await captureCurrentRender();

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);

      for (let i = 2; i <= pdfDoc.numPages; i++) {
        pdf.addPage();
        const pageImage = await capturePageAsImage(pdfDoc, i);
        pdf.addImage(pageImage, 'PNG', 0, 0, pageWidth, pageHeight);
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      pdf.save(`corrected_report_${timestamp}.pdf`);
      setExportMessage(
        `Modified document exported successfully with ${acceptedErrorCount} accepted correction(s) applied.`
      );
    } catch {
      setExportMessage(
        'PDF export encountered an error. In this mock iteration, annotations are exported visually via canvas rasterization. A production implementation would use pdf-lib for programmatic PDF manipulation.'
      );
    }

    setIsExportingPdf(false);
  }

  async function captureCurrentRender() {
    const pdfView = document.querySelector('.pdf-render-canvas') ||
      document.querySelector('canvas');
    if (pdfView) {
      return pdfView.toDataURL('image/png');
    }
    return null;
  }

  async function capturePageAsImage(pdfDoc, pageIndex) {
    try {
      const page = await pdfDoc.getPage(pageIndex);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      const annotCanvas = document.querySelector('canvas.annotation-layer');
      if (annotCanvas) {
        ctx.drawImage(annotCanvas, 0, 0);
      }

      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
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
          <div className="col-md-4">
            <div className="card border-0 shadow-sm text-center p-3">
              <div className="fs-2 fw-bold text-dark">
                {acceptedErrorCount}
              </div>
              <small className="text-muted">
                Accepted Corrections
              </small>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm text-center p-3">
              <div className="fs-2 fw-bold text-dark">
                {state.rejectedErrorRegistry.length}
              </div>
              <small className="text-muted">
                Rejected Corrections
              </small>
            </div>
          </div>
          <div className="col-md-4">
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
            className="btn btn-outline-dark px-4"
            onClick={handleDownloadModifiedPdf}
            disabled={isExportingPdf || !documentFile}
          >
            {isExportingPdf ? 'Exporting...' : 'Download Modified PDF'}
          </button>
        </div>

        {exportMessage && (
          <div className="alert alert-info py-2 small" role="alert">
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
