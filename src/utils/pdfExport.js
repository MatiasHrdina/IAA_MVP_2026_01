import { PDFDocument, rgb } from 'pdf-lib';
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const CATEGORY_COLORS = {
  cientifica: { r: 74/255, g: 144/255, b: 217/255 },
  coherencia: { r: 39/255, g: 174/255, b: 96/255 },
  cohesion: { r: 155/255, g: 89/255, b: 182/255 },
  resultados: { r: 26/255, g: 188/255, b: 156/255 },
  referencias: { r: 230/255, g: 126/255, b: 34/255 },
  gramatica: { r: 211/255, g: 84/255, b: 0/255 },
  ortografia: { r: 233/255, g: 30/255, b: 99/255 },
};

function getCategoryPdfColor(categoryId) {
  return CATEGORY_COLORS[categoryId] || { r: 1, g: 0.9, b: 0.6 };
}

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

function drawAcceptedErrorHighlight(pdfPage, pos, categoryId) {
  const rectX = pos.x;
  const rectY = pos.baselineY - pos.height;
  const rectW = pos.width;
  const rectH = pos.height;

  const color = getCategoryPdfColor(categoryId);

  pdfPage.drawRectangle({
    x: rectX,
    y: rectY,
    width: rectW,
    height: rectH,
    color: rgb(color.r, color.g, color.b),
    opacity: 0.35,
  });

  pdfPage.drawRectangle({
    x: rectX,
    y: rectY - 1.5,
    width: rectW,
    height: 2,
    color: rgb(color.r, color.g, color.b),
    opacity: 0.8,
  });
}

async function highlightAcceptedErrorsOnPage(pdfPage, pdfJsPage, textsToHighlight, pdfPageWidth) {
  if (textsToHighlight.length === 0) return;

  try {
    const textContent = await pdfJsPage.getTextContent();
    const viewport = pdfJsPage.getViewport({ scale: 1 });
    const pdfScale = pdfPageWidth / viewport.width;

    for (const { text, category } of textsToHighlight) {
      const textPositions = findTextPositions(textContent, text);
      for (const pos of textPositions) {
        const scaledPos = {
          x: pos.x * pdfScale,
          baselineY: pos.baselineY * pdfScale,
          width: pos.width * pdfScale,
          height: pos.height * pdfScale,
        };
        drawAcceptedErrorHighlight(pdfPage, scaledPos, category);
      }
    }
  } catch {
    /* fallo al resaltar en esta página */
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

          const color = rect.category
            ? getCategoryPdfColor(rect.category)
            : { r: 1, g: 0, b: 0 };

          pdfPage.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: rectPdfWidth,
            height: rectPdfHeight,
            color: rgb(color.r, color.g, color.b),
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
      pageAcceptedErrors.map((e) => ({ text: e.original_text, category: e.category })),
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
  anchor.download = `informe_anotado_${timestamp}.pdf`;

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return { success: true };
}
