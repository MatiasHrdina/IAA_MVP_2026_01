import { useMemo, useState } from 'react';
import { RUBRIC_CATEGORIES } from '../../mock/data';
import { useAppContext } from '../../context/AppContext';

export default function ErrorStatsPanel() {
  const { state, addManualError, removeAcceptedError } = useAppContext();
  const { acceptedErrorRegistry, currentPage, annotationStrokes, annotationHighlights } = state;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [manualCategory, setManualCategory] = useState(RUBRIC_CATEGORIES[0].id);
  const [manualSeverity, setManualSeverity] = useState('moderado');
  const [manualNote, setManualNote] = useState('');

  const stats = useMemo(() => {
    const counts = RUBRIC_CATEGORIES.map((cat) => ({
      ...cat,
      count: acceptedErrorRegistry.filter((error) => error.category === cat.id).length,
    }));
    const max = Math.max(1, ...counts.map((item) => item.count));
    return counts.map((item) => ({ ...item, percent: (item.count / max) * 100 }));
  }, [acceptedErrorRegistry]);

  const manualEntries = acceptedErrorRegistry.filter((error) => error.source === 'manual');
  const pageStrokeCount = (annotationStrokes[currentPage] || []).length;
  const pageHighlightCount = (annotationHighlights[currentPage] || []).length;

  function handleAddManualEntry(event) {
    event.preventDefault();
    const rubric = RUBRIC_CATEGORIES.find((cat) => cat.id === manualCategory);
    if (!rubric) return;

    addManualError({
      page: currentPage,
      category: rubric.id,
      severity: manualSeverity,
      error: manualNote.trim() || `Registro manual: ${rubric.label} (severidad: ${manualSeverity}).`,
      original_text: '',
      suggestion: '',
    });
    setManualNote('');
  }

  if (isCollapsed) {
    return (
      <aside className="stats-panel stats-panel-collapsed border-start bg-white">
        <button
          className="btn btn-sm btn-outline-dark stats-toggle"
          onClick={() => setIsCollapsed(false)}
          title="Mostrar estadísticas"
        >
          Stats
        </button>
      </aside>
    );
  }

  return (
    <aside className="stats-panel border-start bg-white">
      <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
        <div>
          <h6 className="mb-0 fw-semibold">Estadísticas por Criterio</h6>
          <small className="text-muted">Errores aceptados por categoría</small>
        </div>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setIsCollapsed(true)}
          title="Ocultar estadísticas"
        >
          &rsaquo;
        </button>
      </div>

      <div className="p-3 stats-scroll">
        <div className="d-flex gap-2 mb-3">
          <div className="stat-chip">
            <strong>{acceptedErrorRegistry.length}</strong>
            <span>Aceptados</span>
          </div>
          <div className="stat-chip">
            <strong>{pageStrokeCount + pageHighlightCount}</strong>
            <span>Anotaciones</span>
          </div>
        </div>

        <div className="d-flex flex-column gap-2 mb-3">
          {stats.map((item) => (
            <div key={item.id}>
              <div className="d-flex justify-content-between small mb-1">
                <span className="fw-semibold">{item.label}</span>
                <span className="text-muted">{item.count}</span>
              </div>
              <div className="stats-bar-track">
                <div
                  className={`stats-bar-fill importance-${item.importance}`}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <form className="border-top pt-3" onSubmit={handleAddManualEntry}>
          <label className="form-label small fw-semibold mb-1">
            Registro Manual
          </label>
          <select
            className="form-select form-select-sm mb-2"
            value={manualCategory}
            onChange={(event) => setManualCategory(event.target.value)}
          >
            {RUBRIC_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          <select
            className="form-select form-select-sm mb-2"
            value={manualSeverity}
            onChange={(event) => setManualSeverity(event.target.value)}
          >
            <option value="leve">Leve</option>
            <option value="moderado">Moderado</option>
            <option value="grave">Grave</option>
          </select>
          <textarea
            className="form-control form-control-sm mb-2"
            rows="2"
            placeholder="Nota opcional para esta anotación manual"
            value={manualNote}
            onChange={(event) => setManualNote(event.target.value)}
          />
          <button className="btn btn-sm btn-dark w-100" type="submit">
            Agregar Entrada Manual
          </button>
        </form>

        {manualEntries.length > 0 && (
          <div className="border-top mt-3 pt-3">
            <h6 className="small text-uppercase text-muted fw-semibold mb-2">
              Entradas Manuales
            </h6>
            <div className="d-flex flex-column gap-2">
              {manualEntries.map((entry) => {
                const cat = RUBRIC_CATEGORIES.find((c) => c.id === entry.category);
                return (
                  <div key={entry.id} className="manual-entry">
                    <div className="d-flex justify-content-between gap-2">
                      <strong>{cat ? cat.label : entry.category}</strong>
                      <button
                        className="btn btn-sm btn-link text-danger p-0"
                        onClick={() => removeAcceptedError(entry.id)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </div>
                    <small className="text-muted">Página {entry.page}</small>
                    <p className="mb-0 small">{entry.error}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
