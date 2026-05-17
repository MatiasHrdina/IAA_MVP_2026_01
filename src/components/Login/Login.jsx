import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { MOCK_CREDENTIALS } from '../../mock/data';

export default function Login() {
  const { authenticate } = useAppContext();
  const [emailField, setEmailField] = useState('');
  const [passwordField, setPasswordField] = useState('');
  const [validationMessage, setValidationMessage] = useState('');

  function handleSubmission(event) {
    event.preventDefault();
    setValidationMessage('');

    if (
      emailField === MOCK_CREDENTIALS.email &&
      passwordField === MOCK_CREDENTIALS.password
    ) {
      authenticate({ email: emailField, role: 'professor' });
    } else {
      setValidationMessage(
        'Authentication failed. Please verify your credentials and try again.'
      );
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow-sm border-0" style={{ width: '24rem' }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <div className="mb-3">
              <span className="badge bg-dark fs-6 px-3 py-2">AC</span>
            </div>
            <h4 className="card-title fw-bold">Academic Correction Platform</h4>
            <p className="text-muted small">
              AI-Assisted Report Evaluation System
            </p>
          </div>

          <form onSubmit={handleSubmission}>
            <div className="mb-3">
              <label htmlFor="loginEmail" className="form-label small fw-semibold">
                Institutional Email
              </label>
              <input
                id="loginEmail"
                type="email"
                className="form-control"
                placeholder="professor@academic.edu"
                value={emailField}
                onChange={(e) => setEmailField(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="loginPassword" className="form-label small fw-semibold">
                Password
              </label>
              <input
                id="loginPassword"
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={passwordField}
                onChange={(e) => setPasswordField(e.target.value)}
                required
              />
            </div>

            {validationMessage && (
              <div className="alert alert-danger py-2 small" role="alert">
                {validationMessage}
              </div>
            )}

            <button type="submit" className="btn btn-dark w-100 mt-2">
              Sign In
            </button>
          </form>

          <p className="text-center text-muted small mt-3 mb-0">
            Demo credentials:{' '}
            <span className="fw-semibold">
              professor@academic.edu / correct2024
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
