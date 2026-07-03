import { detectErrors } from '../services/AISinglePageCorrection';
import { detectFullDocumentErrors } from '../services/AIFullCorrection';
import { generatePerformanceAnalysis } from '../services/AIPerformanceAnalysis';
import { RUBRIC_CATEGORIES } from './data';

const VALID_CATEGORY_IDS = RUBRIC_CATEGORIES.map((c) => c.id);

const CATEGORY_NAME_TO_ID = Object.fromEntries(
  RUBRIC_CATEGORIES.map((c) => [
    c.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    c.id,
  ])
);

function normalizeCategory(err) {
  let cat = err.category || err.categoria || err.Category || err.Categoria || err.categoría || err.Categoría;
  if (!cat) return null;
  cat = String(cat).toLowerCase().trim();
  cat = cat.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (VALID_CATEGORY_IDS.includes(cat)) return cat;
  return CATEGORY_NAME_TO_ID[cat] || null;
}

const AUTO_ANALYSIS_PROMPT = `Realiza un analisis exhaustivo y detallado del texto de la pagina actual segun las 7 categorias de la rubrica academica. Evalua minuciosamente CADA linea y detecta TODOS los errores presentes:

1. Estructura Cientifica: faltan secciones? la organizacion es incorrecta?
2. Coherencia: hay orden logico? parrafos con multiples ideas principales?
3. Cohesion: uso adecuado de conectores, correferencia, marcadores discursivos y puntuacion?
4. Exposicion de Resultados: se explican claramente? relacion con objetivos?
5. Referencias: atribucion correcta? formato Harvard?
6. Adecuacion y Gramatica: registro formal? vocabulario preciso? nucleo verbal?
7. Formato y Ortografia: formato homogeneo? ortografia literal y acentual?

IMPORTANTE: En una misma pagina puede haber 0, 1 o MULTIPLES errores de una misma categoria. Revisa CADA linea. No hay limite en la cantidad de errores que puedes reportar.
Para cada error detectado, indica obligatoriamente: categoria (id de la rubrica), el texto exacto donde ocurre, y una sugerencia de correccion. No omitas ningun error. Si no hay errores en una categoria, simplemente no la incluyas.`;

const FULL_DOCUMENT_PROMPT = `Realiza un analisis exhaustivo y detallado de CADA pagina del documento segun las 7 categorias de la rubrica academica. Evalua minuciosamente CADA linea de CADA pagina y detecta TODOS los errores presentes:

1. Estructura Cientifica: faltan secciones? la organizacion es incorrecta?
2. Coherencia: hay orden logico? parrafos con multiples ideas principales?
3. Cohesion: uso adecuado de conectores, correferencia, marcadores discursivos y puntuacion?
4. Exposicion de Resultados: se explican claramente? relacion con objetivos?
5. Referencias: atribucion correcta? formato Harvard?
6. Adecuacion y Gramatica: registro formal? vocabulario preciso? nucleo verbal?
7. Formato y Ortografia: formato homogeneo? ortografia literal y acentual?

IMPORTANTE: No hay limite. En una misma pagina puede haber 0, 1 o MULTIPLES errores de una misma categoria. Por ejemplo, una pagina puede tener 5 errores de coherencia y 3 de gramatica. Revisa CADA linea con atencion.
Para cada error detectado, indica obligatoriamente: categoria (id de la rubrica), el texto exacto donde ocurre, una sugerencia de correccion, y el NUMERO DE PAGINA (1, 2, 3...) donde se encuentra. No omitas ningun error. Si no hay errores de una categoria en una pagina, simplemente no incluyas esa categoria para esa pagina.`;

const BATCH_SIZE = 10;

export async function simulateFullDocumentAnalysis(pageTexts = {}) {
  try {
    const keys = Object.keys(pageTexts)
      .map(Number)
      .sort((a, b) => a - b);

    if (keys.length === 0) {
      return { success: true, errors: [], page: null };
    }

    const allErrors = [];
    let errorIdCounter = 0;

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batchKeys = keys.slice(i, i + BATCH_SIZE);
      const pagesArray = batchKeys.map((key) => pageTexts[key]);

      const errors = await detectFullDocumentErrors(pagesArray, FULL_DOCUMENT_PROMPT, batchKeys);

      const errorsWithId = errors.map((err) => {
        errorIdCounter++;
        return {
          ...err,
          id: Date.now() + errorIdCounter,
          source: 'ai',
          category: normalizeCategory(err),
          page: Number(err.page) || batchKeys[0],
        };
      });

      allErrors.push(...errorsWithId);
    }

    return {
      success: true,
      errors: allErrors,
      page: null,
    };
  } catch (err) {
    console.warn('La detección de IA falló:', err.message);
    return { success: false, errors: [], page: null, error: err.message };
  }
}

export async function simulateAutoAnalysis(currentPage, pageTexts = {}) {
  try {
    const currentText = pageTexts[currentPage] || '';

    const errors = await detectErrors(currentText, AUTO_ANALYSIS_PROMPT);

    const errorsWithId = errors.map((err, idx) => ({
      ...err,
      id: Date.now() + idx,
      source: 'ai',
      category: normalizeCategory(err),
    }));

    return {
      success: true,
      errors: errorsWithId.length > 0
        ? errorsWithId
        : [{
            id: Date.now(),
            error: 'No se detectaron errores especificos segun la rubrica.',
            original_text: '',
            suggestion: '',
            severity: 'info',
            category: null,
            source: 'ai',
          }],
      page: currentPage,
    };
  } catch (err) {
    console.warn('La detección de IA falló:', err.message);
    return { success: false, errors: [], page: currentPage, error: err.message };
  }
}

export async function simulatePromptSubmission(promptText, currentPage, pageTexts = {}) {
  try {
    const currentText = pageTexts[currentPage] || '';

    const errors = await detectErrors(currentText, promptText);

    const errorsWithId = errors.map((err, idx) => ({
      ...err,
      id: Date.now() + idx,
      source: 'ai',
      category: normalizeCategory(err),
    }));

    return {
      success: true,
      errors: errorsWithId.length > 0
        ? errorsWithId
        : [{
            id: Date.now(),
            error: 'No se detectaron errores específicos según la rúbrica.',
            original_text: '',
            suggestion: '',
            severity: 'info',
            category: null,
            source: 'ai',
          }],
      page: currentPage,
    };
  } catch (err) {
    console.warn('La detección de IA falló:', err.message);
    return { success: false, errors: [], page: currentPage, error: err.message };
  }
}

export async function simulatePerformanceAnalysis(acceptedErrors, rejectedErrors = [], annotationStrokes = {}, annotationHighlights = {}) {
  try {
    const analysis = await generatePerformanceAnalysis(
      acceptedErrors,
      rejectedErrors,
      annotationStrokes,
      annotationHighlights
    );

    return {
      success: true,
      analysis,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('El análisis de IA falló:', err.message);
    return { success: false, analysis: '', generatedAt: new Date().toISOString(), error: err.message };
  }
}
