import { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { MOCK_CORRECTIONS } from '../../mock/data';

const ALLOWED_MIME_TYPE = 'application/pdf';
const ALLOWED_EXTENSION = '.pdf';

export default function Upload() {
  const { registerDocument, navigate } = useAppContext();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [ingestionError, setIngestionError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  function validateFile(file) {
    if (!file) return 'No file was selected for ingestion.';
    if (file.type !== ALLOWED_MIME_TYPE && !file.name.toLowerCase().endsWith(ALLOWED_EXTENSION)) {
      return 'Invalid file format. Only PDF documents are accepted.';
    }
    return '';
  }

  function handleFileSelection(event) {
    const file = event.target.files[0];
    const validation = validateFile(file);
    if (validation) {
      setIngestionError(validation);
      setSelectedFile(null);
      return;
    }
    setIngestionError('');
    setSelectedFile(file);
  }

  function handleDropZoneClick() {
    fileInputRef.current?.click();
  }

  function handleFileRemoval() {
    setSelectedFile(null);
    setIngestionError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function proceedToWorkspace() {
    if (!selectedFile) return;
    setIsProcessing(true);

    const documentUrl = URL.createObjectURL(selectedFile);

    const pdfJs = await import('pdfjs-dist');
    pdfJs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    let totalPages = 1;
    try {
      const pdfDocument = await pdfJs.getDocument(documentUrl).promise;
      totalPages = pdfDocument.numPages;
    } catch {
      totalPages = 10;
    }

    registerDocument({
      file: selectedFile,
      url: documentUrl,
      totalPages,
      errorCorpus: MOCK_CORRECTIONS,
    });

    setIsProcessing(false);
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow-sm border-0" style={{ width: '32rem' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center mb-4">
            <button
              className="btn btn-outline-secondary btn-sm me-3"
              onClick={() => navigate('login')}
            >
              &larr; Back
            </button>
            <div>
              <h5 className="fw-bold mb-0">Document Ingestion</h5>
              <small className="text-muted">
                Upload the academic report for evaluation
              </small>
            </div>
          </div>

          <div
            className="border border-2 border-dashed rounded-3 p-5 text-center"
            style={{
              cursor: 'pointer',
              backgroundColor: '#f8f9fa',
              borderStyle: 'dashed',
            }}
            onClick={handleDropZoneClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="d-none"
              onChange={handleFileSelection}
            />

            {!selectedFile ? (
              <>
                <div className="mb-2 text-muted" style={{ fontSize: '2.5rem' }}>
                  &#128196;
                </div>
                <p className="mb-1 fw-semibold">
                  Click to select a PDF document
                </p>
                <small className="text-muted">
                  Only .pdf files are permitted
                </small>
              </>
            ) : (
              <>
                <div className="mb-2 text-success" style={{ fontSize: '2.5rem' }}>
                  &#9989;
                </div>
                <p className="mb-1 fw-semibold text-truncate">
                  {selectedFile.name}
                </p>
                <small className="text-muted">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </small>
                <div className="mt-3">
                  <button
                    className="btn btn-outline-danger btn-sm me-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileRemoval();
                    }}
                  >
                    Remove
                  </button>
                  <button
                    className="btn btn-dark btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      proceedToWorkspace();
                    }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Proceed to Workspace'}
                  </button>
                </div>
              </>
            )}
          </div>

          {ingestionError && (
            <div className="alert alert-danger py-2 small mt-3" role="alert">
              {ingestionError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
