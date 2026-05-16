import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { simulatePromptSubmission } from '../../mock/api';
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

  const { currentPage, totalPages, errorCorpus } = state;

  const [promptQuery, setPromptQuery] = useState('');
  const [isSubmittingPrompt, setIsSubmittingPrompt] = useState(false);
  const [promptFeedback, setPromptFeedback] = useState('');

  const pageErrors = errorCorpus[currentPage] || [];

  function handlePromptSubmission() {
    if (!promptQuery.trim()) return;
    setIsSubmittingPrompt(true);
    setPromptFeedback('');

    simulatePromptSubmission(promptQuery, currentPage).then((response) => {
      if (response.success && response.errors.length > 0) {
        registerErrors({ page: currentPage, errors: response.errors });
        setPromptFeedback(
          `Analysis complete. ${response.errors.length} pattern(s) detected.`
        );
      }
      setIsSubmittingPrompt(false);
      setPromptQuery('');
    });
  }

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
          <label className="form-label small fw-semibold mb-1">
            Linguistic Analysis Query
          </label>
          <div className="input-group input-group-sm">
            <input
              type="text"
              className="form-control"
              placeholder='e.g., "Check grammar and stylistic issues"'
              value={promptQuery}
              onChange={(e) => setPromptQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePromptSubmission()}
            />
            <button
              className="btn btn-dark"
              onClick={handlePromptSubmission}
              disabled={isSubmittingPrompt || !promptQuery.trim()}
            >
              {isSubmittingPrompt ? 'Analyzing...' : 'Submit'}
            </button>
          </div>
          {promptFeedback && (
            <div className="small text-muted mt-1">{promptFeedback}</div>
          )}
        </div>

        <div className="p-3" style={{ overflowY: 'auto', maxHeight: 'calc(75% - 60px)' }}>
          <h6 className="fw-semibold small text-uppercase text-muted mb-2">
            Error Registry — Page {currentPage}
          </h6>
          {pageErrors.length === 0 ? (
            <p className="small text-muted text-center py-4">
              No errors have been detected on this page. Submit a query or
              navigate to another page.
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
