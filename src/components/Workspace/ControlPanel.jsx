import { useState, useCallback, useEffect, useRef } from 'react';
import { pdfjs } from 'react-pdf';
import { useAppContext } from '../../context/AppContext';
import { simulateAutoAnalysis, simulateFullDocumentAnalysis } from '../../mock/api';
import ErrorList from './ErrorList';
import Pagination from './Pagination';

export default function ControlPanel() {
  const {
    state,
    registerErrors,
    setErrorsByPage,
    acceptError,
    rejectError,
    setCurrentPage,
  } = useAppContext();

  const { currentPage, totalPages, errorCorpus, documentUrl } = state;

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingFull, setIsAnalyzingFull] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(true);
  const [analysisFeedback, setAnalysisFeedback] = useState('');
  const pageTextsRef = useRef({});

  const pageErrors = errorCorpus[currentPage] || [];

  useEffect(() => {
    if (!documentUrl) return;

    setIsExtractingText(true);

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
      } finally {
        setIsExtractingText(false);
      }
    };

    pdfLoad();
  }, [documentUrl]);

  const handleAutoAnalysis = useCallback(async () => {
    const pageCount = Object.keys(pageTextsRef.current).length;
    if (pageCount === 0) {
      setAnalysisFeedback('El texto del PDF aún se está extrayendo. Espere un momento y vuelva a intentarlo.');
      return;
    }

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
      } else if (!response.success) {
        setAnalysisFeedback('Hubo un error, intente de nuevo.');
      } else {
        setAnalysisFeedback('Análisis completado. No se detectaron errores.');
      }
    } catch {
      setAnalysisFeedback('Hubo un error, intente de nuevo.');
    }

    setIsAnalyzing(false);
  }, [currentPage, registerErrors]);

  const handleFullAnalysis = useCallback(async () => {
    const pageCount = Object.keys(pageTextsRef.current).length;
    if (pageCount === 0) {
      setAnalysisFeedback('El texto del PDF aún se está extrayendo. Espere un momento y vuelva a intentarlo.');
      return;
    }

    setIsAnalyzingFull(true);
    setAnalysisFeedback('');

    try {
      const response = await simulateFullDocumentAnalysis(pageTextsRef.current);
      if (response.success && response.errors.length > 0) {
        const byPage = {};
        response.errors.forEach((err) => {
          const page = err.page || 1;
          if (!byPage[page]) byPage[page] = [];
          byPage[page].push(err);
        });
        setErrorsByPage(byPage);
        setAnalysisFeedback(
          `Análisis completo: ${response.errors.length} error(es) en ${Object.keys(byPage).length} página(s).`
        );
      } else if (!response.success) {
        setAnalysisFeedback('Hubo un error, intente de nuevo.');
      } else {
        setAnalysisFeedback('Análisis completo: no se detectaron errores.');
      }
    } catch {
      setAnalysisFeedback('Hubo un error, intente de nuevo.');
    }

    setIsAnalyzingFull(false);
  }, [setErrorsByPage]);

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
          {isExtractingText && (
            <div className="small text-warning mb-2">
              Extrayendo texto del PDF...
            </div>
          )}
          <button
            className="btn btn-dark w-100 mb-2"
            onClick={handleFullAnalysis}
            disabled={isAnalyzingFull || isAnalyzing || isExtractingText}
          >
            {isAnalyzingFull ? 'Analizando documento completo...' : 'Analizar Documento Completo'}
          </button>
          <div className="text-center small text-muted mb-2">
            Analiza todas las páginas del documento según las 7 categorías de la rúbrica
          </div>
          <button
            className="btn btn-outline-dark w-100"
            onClick={handleAutoAnalysis}
            disabled={isAnalyzing || isAnalyzingFull || isExtractingText}
          >
            {isAnalyzing ? 'Analizando...' : 'Analizar Página Actual'}
          </button>
          <div className="text-center small text-muted mt-1">
            Vuelve a analizar solo la página actual
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
              "Analizar Documento Completo" para analizar todo el informe.
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
