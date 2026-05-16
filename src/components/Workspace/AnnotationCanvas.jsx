import { useRef, useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';

export default function AnnotationCanvas({ pageWidth, pageHeight }) {
  const { state, recordStroke, clearStrokes } = useAppContext();
  const { annotationStrokes } = state;

  const canvasRef = useRef(null);
  const [isDrawingModeActive, setIsDrawingModeActive] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annotationStrokes.forEach((stroke) => {
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
  }, [annotationStrokes]);

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
        points: [...currentStrokeRef.current],
        timestamp: Date.now(),
      });
    }
    currentStrokeRef.current = [];
  }

  function handleClearAnnotations() {
    clearStrokes();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  return (
    <div className="position-relative">
      <div className="d-flex gap-2 mb-2">
        <button
          className={`btn btn-sm ${
            isDrawingModeActive ? 'btn-danger' : 'btn-outline-danger'
          }`}
          onClick={() => setIsDrawingModeActive((prev) => !prev)}
        >
          {isDrawingModeActive
            ? 'Deactivate Annotation Pen'
            : 'Activate Annotation Pen'}
        </button>
        {annotationStrokes.length > 0 && (
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleClearAnnotations}
          >
            Clear All Strokes
          </button>
        )}
      </div>

      <div className="position-relative" style={{ width: pageWidth || '100%', height: pageHeight || 'auto' }}>
        <canvas
          ref={canvasRef}
          width={pageWidth || 800}
          height={pageHeight || 600}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: isDrawingModeActive ? 'crosshair' : 'default',
            zIndex: 10,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  );
}
