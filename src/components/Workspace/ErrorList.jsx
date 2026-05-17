import { RUBRIC_CATEGORIES } from '../../mock/data';

const SEVERITY_CLASS_MAP = {
  minor: 'bg-warning-subtle border-warning',
  moderate: 'bg-info-subtle border-info',
  major: 'bg-danger-subtle border-danger',
  info: 'bg-secondary-subtle border-secondary',
};

function getCategoryLabel(categoryId) {
  if (!categoryId) return null;
  const cat = RUBRIC_CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.label : categoryId;
}

export default function ErrorList({ errors, onAccept, onReject }) {
  return (
    <div className="d-flex flex-column gap-2">
      {errors.map((error) => {
        const severityClass = SEVERITY_CLASS_MAP[error.severity] || 'bg-light border-secondary';
        const isResolved = error.status === 'accepted' || error.status === 'rejected';
        const categoryLabel = getCategoryLabel(error.category);

        return (
          <div
            key={error.id}
            className={`border rounded-2 p-2 small ${severityClass} ${
              isResolved ? 'opacity-50' : ''
            }`}
          >
            <div className="d-flex justify-content-between align-items-start mb-1">
              <span className="fw-semibold text-capitalize" style={{ fontSize: '0.7rem' }}>
                {error.severity}
              </span>
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
                    {error.status}
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
                  Found:{' '}
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
                  Suggestion:{' '}
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
              <div className="d-flex gap-1 mt-1">
                <button
                  className="btn btn-sm btn-outline-success py-0 px-2"
                  style={{ fontSize: '0.65rem' }}
                  onClick={() => onAccept(error)}
                >
                  Accept
                </button>
                <button
                  className="btn btn-sm btn-outline-danger py-0 px-2"
                  style={{ fontSize: '0.65rem' }}
                  onClick={() => onReject(error)}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
