import { useRef, useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';

export default function AnnotationCanvas({ pageWidth, pageHeight, pageNumber, onHighlightModeChange }) {
  const { state, recordStroke, revertAnnotation, revertHighlight } = useAppContext();
  const { annotationStrokes, annotationHighlights } = state;

  const canvasRef = useRef(null);
  const [isDrawingModeActive, setIsDrawingModeActive] = useState(false);
  const [isHighlightModeActive, setIsHighlightModeActive] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef([]);

  const currentPageStrokes = annotationStrokes[pageNumber] || [];
  const pageHighlightCount = (annotationHighlights[pageNumber] || []).length;

  useEffect(() => {
    onHighlightModeChange?.(isHighlightModeActive);
  }, [isHighlightModeActive, onHighlightModeChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    currentPageStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, [currentPageStrokes, pageNumber]);

  const getCanvasCoordinates = useCallback(
    (event) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    },
    []
  );

  function handlePointerDown(event) {
    if (!isDrawingModeActive) return;
    setIsDrawing(true);
    const coord = getCanvasCoordinates(event);
    currentStrokeRef.current = [coord];
  }

  function handlePointerMove(event) {
    if (!isDrawing || !isDrawingModeActive) return;
    const coord = getCanvasCoordinates(event);
    currentStrokeRef.current.push(coord);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pts = currentStrokeRef.current;
    if (pts.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }

  function handlePointerUp() {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.length > 0) {
      recordStroke({
        page: pageNumber,
        points: [...currentStrokeRef.current],
        timestamp: Date.now(),
      });
    }
    currentStrokeRef.current = [];
  }

  function handleRevertAnnotation() {
    revertAnnotation(pageNumber);
  }

  function handleRevertHighlight() {
    revertHighlight(pageNumber);
  }

  function handleTogglePen() {
    if (isDrawingModeActive) {
      setIsDrawingModeActive(false);
    } else {
      setIsDrawingModeActive(true);
      setIsHighlightModeActive(false);
    }
  }

  function handleToggleHighlight() {
    if (isHighlightModeActive) {
      setIsHighlightModeActive(false);
    } else {
      setIsHighlightModeActive(true);
      setIsDrawingModeActive(false);
    }
  }

  const pageStrokeCount = currentPageStrokes.length;

  return (
    <div
      className="position-absolute"
      style={{
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 20,
        pointerEvents: isDrawingModeActive ? 'auto' : 'none',
      }}
    >
      <div
        className="position-absolute"
        style={{ top: 0, left: 0, width: pageWidth || '100%', height: pageHeight || 'auto' }}
      >
        <canvas
          ref={canvasRef}
          width={pageWidth || 800}
          height={pageHeight || 600}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: isDrawingModeActive ? 'crosshair' : (isHighlightModeActive ? 'text' : 'default'),
            pointerEvents: isDrawingModeActive ? 'auto' : 'none',
            zIndex: 10,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      <div className="d-flex gap-2 mb-2" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'auto', zIndex: 30 }}>
        <button
          className={`btn btn-sm ${
            isDrawingModeActive ? 'btn-danger' : 'btn-outline-danger'
          }`}
          onClick={handleTogglePen}
        >
          {isDrawingModeActive
            ? 'Deactivate Annotation Pen'
            : 'Activate Annotation Pen'}
        </button>
        {pageStrokeCount > 0 && (
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleRevertAnnotation}
          >
            Revert Annotation ({pageStrokeCount})
          </button>
        )}
        <button
          className={`btn btn-sm ${
            isHighlightModeActive ? 'btn-warning' : 'btn-outline-warning'
          }`}
          onClick={handleToggleHighlight}
        >
          {isHighlightModeActive
            ? 'Deactivate Highlight Mode'
            : 'Activate Highlight Mode'}
        </button>
        {pageHighlightCount > 0 && (
          <button
            className="btn btn-sm btn-outline-warning"
            onClick={handleRevertHighlight}
          >
            Revert Highlight ({pageHighlightCount})
          </button>
        )}
      </div>
    </div>
  );
}
