import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import ControlPanel from './ControlPanel';
import PdfViewer from './PdfViewer';
import ErrorStatsPanel from './ErrorStatsPanel';

export default function Workspace() {
  const { state, navigate } = useAppContext();
  const { documentFile } = state;
  const [showNewDocWarning, setShowNewDocWarning] = useState(false);

  if (!documentFile) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="text-center">
          <p className="text-muted mb-3">
            No se ha cargado ningún documento para corregir.
          </p>
          <button
            className="btn btn-dark"
            onClick={() => navigate('upload')}
          >
            Volver a Carga de Documento
          </button>
        </div>
      </div>
    );
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

      <header className="bg-white border-bottom px-4 py-2 d-flex align-items-center justify-content-between">
        <button
          className="btn btn-dark btn-sm"
          onClick={handleNewDocument}
        >
          Nuevo Documento
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => navigate('summary')}
        >
          Ver Resumen de Evaluación
        </button>
      </header>

      <div className="flex-grow-1 d-flex" style={{ overflow: 'hidden' }}>
        <div className="border-end bg-white" style={{ width: '38%', minWidth: '320px' }}>
          <ControlPanel />
        </div>
        <div className="flex-grow-1 d-flex" style={{ overflow: 'hidden' }}>
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <PdfViewer />
          </div>
          <ErrorStatsPanel />
        </div>
      </div>
    </div>
  );
}
