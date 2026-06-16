import { useState, useEffect } from 'react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  function handleNavigate(delta) {
    const target = currentPage + delta;
    if (target >= 1 && target <= totalPages) {
      onPageChange(target);
    }
  }

  function handleDirectNavigation() {
    const target = parseInt(pageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      onPageChange(target);
    }
  }

  function handleInputKeyDown(e) {
    if (e.key === 'Enter') {
      handleDirectNavigation();
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-between px-3 py-2 small">
      <button
        className="btn btn-sm btn-outline-secondary"
        disabled={currentPage <= 1}
        onClick={() => handleNavigate(-1)}
      >
        &larr; Anterior
      </button>

      <div className="d-flex align-items-center gap-1">
        <input
          type="number"
          className="form-control form-control-sm text-center"
          style={{ width: '3.5rem' }}
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          min={1}
          max={totalPages}
        />
        <span className="text-muted">/ {totalPages}</span>
        <button
          className="btn btn-sm btn-outline-dark ms-1"
          onClick={handleDirectNavigation}
        >
          Ir
        </button>
      </div>

      <button
        className="btn btn-sm btn-outline-secondary"
        disabled={currentPage >= totalPages}
        onClick={() => handleNavigate(1)}
      >
        Siguiente &rarr;
      </button>
    </div>
  );
}
