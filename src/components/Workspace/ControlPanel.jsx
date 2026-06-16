import { useState, useCallback, useEffect, useRef } from 'react';
import { pdfjs } from 'react-pdf';
import { useAppContext } from '../../context/AppContext';
import { simulateAutoAnalysis } from '../../mock/api';
import ErrorList from './ErrorList';
import Pagination from './Pagination';

export default function ControlPanel() {
  const {
    state,
    registerErrors,
    acceptError,
    rejectError,
    setCurrentPage,
  } = useAppContext();

  const { currentPage, totalPages, errorCorpus, documentUrl } = state;

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisFeedback, setAnalysisFeedback] = useState('');
  const pageTextsRef = useRef({});

  const pageErrors = errorCorpus[currentPage] || [];

  useEffect(() => {
    if (!documentUrl) return;

    const pdfLoad = async () => {
      try {
        const doc = await pdfjs.getDocument(documentUrl).promise;
        const texts = {};
        const numPages = Math.min(doc.numPages, 50);
        for (let i = 1; i <= numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          texts[i] = content.items.map((item) => item.str).join(' ');
        }
        pageTextsRef.current = texts;
      } catch {
        /* text extraction error */
      }
    };

    pdfLoad();
  }, [documentUrl]);

  const handleAutoAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisFeedback('');

    try {
      const response = await simulateAutoAnalysis(
        currentPage,
        pageTextsRef.current
      );
      if (response.success && response.errors.length > 0) {
        registerErrors({ page: currentPage, errors: response.errors });
        setAnalysisFeedback(
          `Análisis completado. ${response.errors.length} error(es) detectado(s).`
        );
      }
    } catch {
      setAnalysisFeedback('Error durante el análisis. Intente de nuevo.');
    }

    setIsAnalyzing(false);
  }, [currentPage, registerErrors]);

  function handleAccept(error) {
    acceptError(currentPage, error);
  }

  function handleReject(error) {
    rejectError(currentPage, error);
  }

  return (
    <div className="d-flex flex-column h-100">
      <div className="flex-grow-1" style={{ overflow: 'hidden' }}>
        <div className="p-3 border-bottom">
          <button
            className="btn btn-dark w-100"
            onClick={handleAutoAnalysis}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analizando...' : 'Analizar Página'}
          </button>
          <div className="text-center small text-muted mt-1">
            Analiza la página actual según las 7 categorías de la rúbrica
          </div>
          {analysisFeedback && (
            <div className="small text-muted mt-1">{analysisFeedback}</div>
          )}
        </div>

        <div className="p-3" style={{ overflowY: 'auto', maxHeight: 'calc(75% - 60px)' }}>
          <h6 className="fw-semibold small text-uppercase text-muted mb-2">
            Registro de Errores — Pág. {currentPage}
          </h6>
          {pageErrors.length === 0 ? (
            <p className="small text-muted text-center py-4">
              No se han detectado errores en esta página. Presione
              "Analizar Página" para ejecutar la detección automática.
            </p>
          ) : (
            <ErrorList
              errors={pageErrors}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          )}
        </div>
      </div>

      <div className="border-top bg-light" style={{ flexShrink: 0 }}>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
