import { useAppContext } from '../../context/AppContext';
import ControlPanel from './ControlPanel';
import PdfViewer from './PdfViewer';
import ErrorStatsPanel from './ErrorStatsPanel';

export default function Workspace() {
  const { state, navigate } = useAppContext();
  const { documentFile } = state;

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

  return (
    <div className="d-flex flex-column vh-100 bg-light">
      <header className="bg-white border-bottom px-4 py-2 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-3">
          <span className="badge bg-dark fs-6 px-2 py-1">AC</span>
          <span className="fw-semibold small text-truncate" style={{ maxWidth: '300px' }}>
            {documentFile.name}
          </span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-outline-dark"
            onClick={() => navigate('summary')}
          >
            Ver Resumen de Evaluación
          </button>
          <span className="text-muted small">|</span>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => navigate('upload')}
          >
            Nuevo Documento
          </button>
        </div>
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
