import { PDFDocument, rgb } from 'pdf-lib';
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

function canvasToPdfCoordinate(canvasPoint, canvasWidth, canvasHeight, pdfPage) {
  const pdfWidth = pdfPage.getWidth();
  const pdfHeight = pdfPage.getHeight();
  return {
    x: (canvasPoint.x / canvasWidth) * pdfWidth,
    y: pdfHeight - (canvasPoint.y / canvasHeight) * pdfHeight,
  };
}

function drawStrokeOnPage(pdfPage, stroke, canvasWidth, canvasHeight) {
  if (stroke.points.length < 2) return;

  for (let i = 1; i < stroke.points.length; i++) {
    const start = canvasToPdfCoordinate(
      stroke.points[i - 1],
      canvasWidth,
      canvasHeight,
      pdfPage
    );
    const end = canvasToPdfCoordinate(
      stroke.points[i],
      canvasWidth,
      canvasHeight,
      pdfPage
    );

    pdfPage.drawLine({
      start,
      end,
      color: rgb(0.86, 0.15, 0.15),
      thickness: 1.8,
      opacity: 0.85,
    });
  }
}

function findTextPositions(textContent, searchText) {
  const positions = [];
  const lowerSearch = searchText.toLowerCase();

  for (const item of textContent.items) {
    const lowerItem = item.str.toLowerCase();
    if (lowerItem.includes(lowerSearch)) {
      positions.push({
        x: item.transform[4],
        baselineY: item.transform[5],
        width: item.width,
        height: item.height,
        text: item.str,
      });
    }
  }

  return positions;
}

function drawAcceptedErrorHighlight(pdfPage, pos) {
  const rectX = pos.x;
  const rectY = pos.baselineY - pos.height;
  const rectW = pos.width;
  const rectH = pos.height;

  pdfPage.drawRectangle({
    x: rectX,
    y: rectY,
    width: rectW,
    height: rectH,
    color: rgb(1, 0.9, 0.6),
    opacity: 0.4,
  });

  pdfPage.drawRectangle({
    x: rectX,
    y: rectY - 1.5,
    width: rectW,
    height: 2,
    color: rgb(0.86, 0.15, 0.15),
    opacity: 0.7,
  });
}

async function highlightAcceptedErrorsOnPage(pdfPage, pdfJsPage, textsToHighlight, pdfPageWidth) {
  if (textsToHighlight.length === 0) return;

  try {
    const textContent = await pdfJsPage.getTextContent();
    const viewport = pdfJsPage.getViewport({ scale: 1 });
    const pdfScale = pdfPageWidth / viewport.width;

    for (const { text } of textsToHighlight) {
      const textPositions = findTextPositions(textContent, text);
      for (const pos of textPositions) {
        const scaledPos = {
          x: pos.x * pdfScale,
          baselineY: pos.baselineY * pdfScale,
          width: pos.width * pdfScale,
          height: pos.height * pdfScale,
        };
        drawAcceptedErrorHighlight(pdfPage, scaledPos);
      }
    }
  } catch {
    /* highlighting failed for this page */
  }
}

export async function exportPdfWithAnnotations({
  sourceFile,
  annotationStrokes,
  annotationHighlights,
  acceptedErrorRegistry,
  totalPages,
}) {
  const arrayBuffer = await sourceFile.arrayBuffer();

  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  const pdfJsDoc = await pdfjs.getDocument(arrayBuffer.slice(0)).promise;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pdfPage = pages[pageIdx];
    const pageNumber = pageIdx + 1;

    const pdfPageHeight = pdfPage.getHeight();
    const pdfPageWidth = pdfPage.getWidth();
    const estimatedCanvasWidth = 700;
    const estimatedCanvasHeight =
      pdfPageHeight * (estimatedCanvasWidth / pdfPageWidth);

    const pageStrokes = annotationStrokes[pageNumber];
    if (pageStrokes && pageStrokes.length > 0) {
      for (const stroke of pageStrokes) {
        drawStrokeOnPage(pdfPage, stroke, estimatedCanvasWidth, estimatedCanvasHeight);
      }
    }

    const pageHighlights = annotationHighlights[pageNumber];
    if (pageHighlights && pageHighlights.length > 0) {
      const scaleX = pdfPageWidth / estimatedCanvasWidth;
      const scaleY = pdfPageHeight / estimatedCanvasHeight;

      pageHighlights.forEach((highlight) => {
        highlight.rects.forEach((rect) => {
          const rectPdfWidth = rect.width * scaleX;
          const rectPdfHeight = rect.height * scaleY;
          const pdfX = rect.x * scaleX;
          const pdfY = pdfPageHeight - (rect.y * scaleY) - rectPdfHeight;

          pdfPage.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: rectPdfWidth,
            height: rectPdfHeight,
            color: rgb(1, 0, 0),
            opacity: 0.3,
          });
        });
      });
    }

    const pdfJsPage = await pdfJsDoc.getPage(pageNumber);

    const pageAcceptedErrors = acceptedErrorRegistry.filter(
      (err) => err.page === pageNumber && err.original_text
    );
    await highlightAcceptedErrorsOnPage(
      pdfPage, pdfJsPage,
      pageAcceptedErrors.map((e) => ({ text: e.original_text })),
      pdfPageWidth
    );
  }

  pdfJsDoc.destroy();

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;

  const timestamp = new Date().toISOString().slice(0, 10);
  anchor.download = `annotated_report_${timestamp}.pdf`;

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return { success: true };
}
