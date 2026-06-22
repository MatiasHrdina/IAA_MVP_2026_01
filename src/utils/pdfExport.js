import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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

const CATEGORY_LABELS = {
  cientifica: 'Estructura Científica',
  coherencia: 'Coherencia',
  cohesion: 'Cohesión',
  resultados: 'Exposición de Resultados',
  referencias: 'Referencias',
  gramatica: 'Adecuación y Gramática',
  ortografia: 'Formato y Ortografía',
};

const CATEGORY_ORDER = ['cientifica', 'coherencia', 'cohesion', 'resultados', 'referencias', 'gramatica', 'ortografia'];

const SEVERITY_LABELS = {
  minor: 'Leve',
  moderate: 'Moderado',
  major: 'Grave',
  info: 'Informativo',
};

const STATUS_LABELS = {
  accepted: 'Aceptado',
  rejected: 'Rechazado',
};

const MARGIN = { LEFT: 50, RIGHT: 50, TOP: 50, BOTTOM: 50 };
const FS = { TITLE: 16, CATEGORY: 14, SUBHEADER: 12, BODY: 10, DETAIL: 9 };
const LH = 1.4;

function getCategoryPdfColor(categoryId) {
  return CATEGORY_COLORS[categoryId] || { r: 1, g: 0.9, b: 0.6 };
}

function sanitizeForPdf(text) {
  return text
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u2022\u2023\u25E6]/g, '-')
    .replace(/[\u00AB\u00BB]/g, '"')
    .replace(/[\u02DC]/g, ' ');
}

function wrapText(text, font, fontSize, maxWidth) {
  text = sanitizeForPdf(text);
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawParagraph(pdfDoc, page, lines, font, fontSize, x, y, maxWidth, color) {
  const lineHeight = fontSize * LH;
  let cp = page;
  let cy = y;
  const pw = cp.getWidth();
  const ph = cp.getHeight();
  for (const line of lines) {
    if (cy - lineHeight < MARGIN.BOTTOM) {
      cp = pdfDoc.addPage([pw, ph]);
      cy = ph - MARGIN.TOP;
    }
    cp.drawText(line, { x, y: cy, font, size: fontSize, color: color || rgb(0, 0, 0) });
    cy -= lineHeight;
  }
  return { page: cp, y: cy };
}

function renderCategorySection(pdfDoc, page, opt) {
  const {
    font, boldFont, contentWidth, pageHeight, catLabel, aiErrors, manualErrors,
  } = opt;
  let cp = page;
  let cy = opt.startY;

  // Category header
  if (cy - 20 < MARGIN.BOTTOM) {
    cp = pdfDoc.addPage([cp.getWidth(), pageHeight]);
    cy = pageHeight - MARGIN.TOP;
  }
  const catColor = getCategoryPdfColor(
    CATEGORY_ORDER.find((id) => CATEGORY_LABELS[id] === catLabel) || ''
  );
  cp.drawText(catLabel, {
    x: MARGIN.LEFT, y: cy, font: boldFont, size: FS.CATEGORY,
    color: rgb(catColor.r, catColor.g, catColor.b),
  });
  cy -= FS.CATEGORY * LH;

  // Underline
  cp.drawRectangle({
    x: MARGIN.LEFT, y: cy - 2, width: contentWidth, height: 1,
    color: rgb(catColor.r, catColor.g, catColor.b), opacity: 0.3,
  });
  cy -= 10;

  // AI errors sub-header
  if (aiErrors.length > 0) {
    const r1 = drawSubHeader(pdfDoc, cp, boldFont, 'Errores detectados por IA', cy, pageHeight);
    cp = r1.page;
    cy = r1.y;
    for (const err of aiErrors) {
      const r2 = drawErrorEntry(pdfDoc, cp, { font, boldFont, contentWidth, pageHeight, err, showStatus: true }, cy);
      cp = r2.page;
      cy = r2.y;
    }
    cy -= 6;
  }

  // Manual errors sub-header
  if (manualErrors.length > 0) {
    const r3 = drawSubHeader(pdfDoc, cp, boldFont, 'Errores detectados por el corrector', cy, pageHeight);
    cp = r3.page;
    cy = r3.y;
    for (const err of manualErrors) {
      const r4 = drawErrorEntry(pdfDoc, cp, { font, boldFont, contentWidth, pageHeight, err, showStatus: false }, cy);
      cp = r4.page;
      cy = r4.y;
    }
    cy -= 6;
  }

  return { page: cp, y: cy };
}

function drawSubHeader(pdfDoc, page, boldFont, text, y, pageHeight) {
  let cp = page;
  let cy = y;
  if (cy - 20 < MARGIN.BOTTOM) {
    cp = pdfDoc.addPage([cp.getWidth(), pageHeight]);
    cy = pageHeight - MARGIN.TOP;
  }
  cp.drawText(text, {
    x: MARGIN.LEFT + 10, y: cy, font: boldFont, size: FS.SUBHEADER,
  });
  cy -= FS.SUBHEADER * LH;
  return { page: cp, y: cy };
}

function drawErrorEntry(pdfDoc, page, opt, y) {
  const { font, boldFont, contentWidth, pageHeight, err, showStatus } = opt;
  let cp = page;
  let cy = y;
  const indent = MARGIN.LEFT + 20;
  const maxW = contentWidth - 20;
  const severity = SEVERITY_LABELS[err.severity] || err.severity || 'No especificado';
  const pageStr = err.page ? `Pág ${err.page}` : '';

  // Line 1: bullet + page + severity + error description
  let intro = `-`;
  if (pageStr) intro += ` [${pageStr}]`;
  intro += ` [${severity}] ${err.error}`;

  const introLines = wrapText(intro, font, FS.BODY, maxW);
  const lineHeight = FS.BODY * LH;
  for (const line of introLines) {
    if (cy - lineHeight < MARGIN.BOTTOM) {
      cp = pdfDoc.addPage([cp.getWidth(), pageHeight]);
      cy = pageHeight - MARGIN.TOP;
    }
    cp.drawText(line, { x: indent, y: cy, font, size: FS.BODY });
    cy -= lineHeight;
  }

  // Line 2: original text
  if (err.original_text) {
    const otLines = wrapText(`Texto original: "${err.original_text}"`, font, FS.DETAIL, maxW - 10);
    for (const line of otLines) {
      if (cy - FS.DETAIL * LH < MARGIN.BOTTOM) {
        cp = pdfDoc.addPage([cp.getWidth(), pageHeight]);
        cy = pageHeight - MARGIN.TOP;
      }
      cp.drawText(line, { x: indent + 10, y: cy, font, size: FS.DETAIL, color: rgb(0.3, 0.3, 0.3) });
      cy -= FS.DETAIL * LH;
    }
  }

  // Line 3: suggestion
  if (err.suggestion) {
    const sugLines = wrapText(`Sugerencia: "${err.suggestion}"`, font, FS.DETAIL, maxW - 10);
    for (const line of sugLines) {
      if (cy - FS.DETAIL * LH < MARGIN.BOTTOM) {
        cp = pdfDoc.addPage([cp.getWidth(), pageHeight]);
        cy = pageHeight - MARGIN.TOP;
      }
      cp.drawText(line, { x: indent + 10, y: cy, font, size: FS.DETAIL, color: rgb(0.3, 0.3, 0.3) });
      cy -= FS.DETAIL * LH;
    }
  }

  // Line 4: status (only for AI errors)
  if (showStatus && err.status) {
    const statusText = `Estado: ${STATUS_LABELS[err.status] || err.status}`;
    if (cy - FS.DETAIL * LH < MARGIN.BOTTOM) {
      cp = pdfDoc.addPage([cp.getWidth(), pageHeight]);
      cy = pageHeight - MARGIN.TOP;
    }
    cp.drawText(statusText, { x: indent + 10, y: cy, font, size: FS.DETAIL, color: rgb(0.3, 0.3, 0.3) });
    cy -= FS.DETAIL * LH;
  }

  cy -= 4; // spacing between errors
  return { page: cp, y: cy };
}

function renderPerformanceAnalysis(pdfDoc, page, opt) {
  const { font, boldFont, contentWidth, pageHeight, analysis } = opt;
  let cp = page;
  let cy = opt.startY;

  // Separator
  if (cy - 30 < MARGIN.BOTTOM) {
    cp = pdfDoc.addPage([cp.getWidth(), pageHeight]);
    cy = pageHeight - MARGIN.TOP;
  }

  // Draw a horizontal line
  cp.drawRectangle({ x: MARGIN.LEFT, y: cy, width: contentWidth, height: 1, color: rgb(0, 0, 0), opacity: 0.5 });
  cy -= 15;

  // Header
  cp.drawText('Análisis de Rendimiento', {
    x: MARGIN.LEFT, y: cy, font: boldFont, size: FS.TITLE,
  });
  cy -= FS.TITLE * LH;
  cy -= 8;

  if (!analysis || analysis === '') {
    const noAnalysisText = 'No se hizo un análisis de rendimiento.';
    if (cy - FS.BODY * LH < MARGIN.BOTTOM) {
      cp = pdfDoc.addPage([cp.getWidth(), pageHeight]);
      cy = pageHeight - MARGIN.TOP;
    }
    cp.drawText(noAnalysisText, { x: MARGIN.LEFT, y: cy, font, size: FS.BODY, color: rgb(0.4, 0.4, 0.4) });
    cy -= FS.BODY * LH;
    return { page: cp, y: cy };
  }

  // Split analysis into paragraphs (by double newline) and render
  const paragraphs = analysis.split(/\n\n+/);
  for (const para of paragraphs) {
    if (cy - FS.BODY * LH < MARGIN.BOTTOM) {
      cp = pdfDoc.addPage([cp.getWidth(), pageHeight]);
      cy = pageHeight - MARGIN.TOP;
    }
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Detect if it's a markdown heading (## or #)
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/m);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingSize = level === 1 ? FS.CATEGORY : FS.SUBHEADER;
      const headingText = headingMatch[2];
      const hLines = wrapText(headingText, boldFont, headingSize, contentWidth);
      for (const line of hLines) {
        if (cy - headingSize * LH < MARGIN.BOTTOM) {
          cp = pdfDoc.addPage([cp.getWidth(), pageHeight]);
          cy = pageHeight - MARGIN.TOP;
        }
        cp.drawText(line, { x: MARGIN.LEFT, y: cy, font: boldFont, size: headingSize });
        cy -= headingSize * LH;
      }
      const bodyText = trimmed.replace(/^#{1,3}\s+.+[\n]?/, '').trim();
      if (bodyText) {
        const bodyLines = wrapText(bodyText, font, FS.BODY, contentWidth);
        const r = drawParagraph(pdfDoc, cp, bodyLines, font, FS.BODY, MARGIN.LEFT, cy, contentWidth);
        cp = r.page;
        cy = r.y;
      }
    } else {
      // Check for bold markers (**text**)
      if (trimmed.includes('**')) {
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/);
        let lineX = MARGIN.LEFT;
        if (cy - FS.BODY * LH < MARGIN.BOTTOM) {
          cp = pdfDoc.addPage([cp.getWidth(), pageHeight]);
          cy = pageHeight - MARGIN.TOP;
        }
        for (const part of parts) {
          if (!part) continue;
          if (part.startsWith('**') && part.endsWith('**')) {
            const boldText = part.slice(2, -2);
            cp.drawText(boldText, { x: lineX, y: cy, font: boldFont, size: FS.BODY });
            lineX += boldFont.widthOfTextAtSize(boldText, FS.BODY);
          } else {
            cp.drawText(part, { x: lineX, y: cy, font, size: FS.BODY });
            lineX += font.widthOfTextAtSize(part, FS.BODY);
          }
        }
        cy -= FS.BODY * LH;
      } else {
        const bodyLines = wrapText(trimmed, font, FS.BODY, contentWidth);
        const r = drawParagraph(pdfDoc, cp, bodyLines, font, FS.BODY, MARGIN.LEFT, cy, contentWidth);
        cp = r.page;
        cy = r.y;
      }
    }
    cy -= 4;
  }

  return { page: cp, y: cy };
}

async function createAppendixPages(pdfDoc, {
  errorCorpus = {},
  acceptedErrorRegistry = [],
  performanceAnalysis = null,
}) {
  const existingPages = pdfDoc.getPages();
  if (existingPages.length === 0) return;
  const pageWidth = existingPages[0].getWidth();
  const pageHeight = existingPages[0].getHeight();
  const contentWidth = pageWidth - MARGIN.LEFT - MARGIN.RIGHT;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - MARGIN.TOP;

  // Title
  const titleLines = wrapText('ANEXO - LISTADO COMPLETO DE ERRORES', boldFont, FS.TITLE, contentWidth);
  const r1 = drawParagraph(pdfDoc, page, titleLines, boldFont, FS.TITLE, MARGIN.LEFT, y, contentWidth);
  page = r1.page;
  y = r1.y;

  // Subtitle
  y -= 4;
  const subtitle = 'Errores ordenados por categoría de la rúbrica';
  const r1b = drawParagraph(pdfDoc, page, [subtitle], font, FS.DETAIL, MARGIN.LEFT, y, contentWidth, rgb(0.4, 0.4, 0.4));
  page = r1b.page;
  y = r1b.y;

  // Separator line
  const sepY = y;
  page.drawRectangle({ x: MARGIN.LEFT, y: sepY - 2, width: contentWidth, height: 1, color: rgb(0, 0, 0), opacity: 0.3 });
  y -= 16;

  // Flatten AI errors from errorCorpus (these have source: 'ai')
  const allAiErrors = [];
  for (const [pageNum, errs] of Object.entries(errorCorpus)) {
    for (const err of errs) {
      allAiErrors.push({ ...err, page: parseInt(pageNum, 10) });
    }
  }

  // Manual errors from acceptedErrorRegistry
  const manualErrors = acceptedErrorRegistry.filter((e) => e.source === 'manual');

  // Count total errors for empty-state check
  const hasAnyErrors = allAiErrors.length > 0 || manualErrors.length > 0;

  if (!hasAnyErrors) {
    const msg = 'No se encontraron errores en el documento.';
    if (y - FS.BODY * LH < MARGIN.BOTTOM) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - MARGIN.TOP;
    }
    page.drawText(msg, { x: MARGIN.LEFT, y, font, size: FS.BODY, color: rgb(0.4, 0.4, 0.4) });
    y -= FS.BODY * LH;
    y -= 20;
  } else {
    // Render each category
    for (const catId of CATEGORY_ORDER) {
      const catLabel = CATEGORY_LABELS[catId];
      const catAi = allAiErrors.filter((e) => e.category === catId);
      const catManual = manualErrors.filter((e) => e.category === catId);
      if (catAi.length === 0 && catManual.length === 0) continue;

      const r2 = renderCategorySection(pdfDoc, page, {
        font, boldFont, contentWidth, pageHeight, catLabel, startY: y,
        aiErrors: catAi, manualErrors: catManual,
      });
      page = r2.page;
      y = r2.y;

      // Reduce spacing between categories
      y -= 4;
    }
  }

  // Performance analysis section
  y -= 10;
  const r3 = renderPerformanceAnalysis(pdfDoc, page, {
    font, boldFont, contentWidth, pageHeight, startY: y,
    analysis: performanceAnalysis,
  });
  page = r3.page;
  y = r3.y;
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
  errorCorpus = {},
  rejectedErrorRegistry = [],
  performanceAnalysis = null,
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

  await createAppendixPages(pdfDoc, {
    errorCorpus,
    acceptedErrorRegistry,
    performanceAnalysis,
  });

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
