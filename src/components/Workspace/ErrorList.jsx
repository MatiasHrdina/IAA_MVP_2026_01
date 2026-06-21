import { useState } from 'react';
import { RUBRIC_CATEGORIES } from '../../mock/data';

const SEVERITY_OPTIONS = [
  { id: 'minor', label: 'Óptimo', class: 'btn-outline-success', activeClass: 'btn-success' },
  { id: 'moderate', label: 'Aceptable', class: 'btn-outline-info', activeClass: 'btn-info' },
  { id: 'major', label: 'Insuficiente', class: 'btn-outline-danger', activeClass: 'btn-danger' },
];

const SEVERITY_CLASS_MAP = {
  minor: 'border-success bg-success-subtle',
  moderate: 'border-info bg-info-subtle',
  major: 'border-danger bg-danger-subtle',
  info: 'bg-secondary-subtle border-secondary',
};

function getCategoryLabel(categoryId) {
  if (!categoryId) return null;
  const cat = RUBRIC_CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.label : categoryId;
}

export default function ErrorList({ errors, onAccept, onReject }) {
  const [selectedSeverities, setSelectedSeverities] = useState({});
  const [tooltipErrorId, setTooltipErrorId] = useState(null);

  function handleSelectSeverity(errorId, severityId) {
    setSelectedSeverities((prev) => ({ ...prev, [errorId]: severityId }));
    setTooltipErrorId(null);
  }

  function handleAccept(error) {
    const severity = selectedSeverities[error.id];
    if (!severity) {
      setTooltipErrorId(error.id);
      return;
    }
    setTooltipErrorId(null);
    onAccept({ ...error, severity });
  }

  return (
    <div className="d-flex flex-column gap-2">
      {errors.map((error) => {
        const selectedSeverity = selectedSeverities[error.id];
        const severityClass = selectedSeverity
          ? SEVERITY_CLASS_MAP[selectedSeverity]
          : error.severity === 'info'
          ? SEVERITY_CLASS_MAP.info
          : 'bg-light border-secondary';
        const isResolved = error.status === 'accepted' || error.status === 'rejected';
        const showTooltip = tooltipErrorId === error.id;
        const categoryLabel = getCategoryLabel(error.category);

        return (
          <div
            key={error.id}
            className={`border rounded-2 p-2 small ${severityClass} ${
              isResolved ? 'opacity-50' : ''
            }`}
          >
            <div className="d-flex justify-content-between align-items-start mb-1">
              <div className="d-flex gap-1">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    className={`btn btn-sm py-0 px-2 ${
                      selectedSeverity === opt.id ? opt.activeClass : opt.class
                    }`}
                    style={{ fontSize: '0.65rem' }}
                    onClick={() => handleSelectSeverity(error.id, opt.id)}
                    disabled={isResolved}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="d-flex gap-1 align-items-center">
                {categoryLabel && (
                  <span className="badge bg-dark" style={{ fontSize: '0.6rem' }}>
                    {categoryLabel}
                  </span>
                )}
                {error.status && (
                  <span
                    className={`badge ${
                      error.status === 'accepted' ? 'bg-success' : 'bg-secondary'
                    }`}
                    style={{ fontSize: '0.6rem' }}
                  >
                    {error.status === 'accepted' ? 'Aceptado' : 'Rechazado'}
                  </span>
                )}
              </div>
            </div>
            <p className="mb-1" style={{ lineHeight: 1.3 }}>
              {error.error}
            </p>
            {error.original_text && (
              <div className="mb-1">
                <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                  Encontrado:{' '}
                </span>
                <span
                  className="fst-italic bg-dark text-white px-1 rounded"
                  style={{ fontSize: '0.7rem' }}
                >
                  &ldquo;{error.original_text}&rdquo;
                </span>
              </div>
            )}
            {error.suggestion && (
              <div className="mb-2">
                <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                  Sugerencia:{' '}
                </span>
                <span
                  className="fst-italic text-success"
                  style={{ fontSize: '0.7rem' }}
                >
                  &ldquo;{error.suggestion}&rdquo;
                </span>
              </div>
            )}
            {!isResolved && (
              <div className="d-flex gap-1 mt-1 align-items-center">
                <div className="error-tooltip-wrapper">
                  <button
                    className="btn btn-sm btn-outline-success py-0 px-2"
                    style={{ fontSize: '0.65rem' }}
                    onClick={() => handleAccept(error)}
                  >
                    Aceptar
                  </button>
                  {showTooltip && (
                    <div className="error-tooltip">Escoge la severidad</div>
                  )}
                </div>
                <button
                  className="btn btn-sm btn-outline-danger py-0 px-2"
                  style={{ fontSize: '0.65rem' }}
                  onClick={() => onReject(error)}
                >
                  Rechazar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
