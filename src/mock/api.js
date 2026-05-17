import { detectErrors, generatePerformanceAnalysis } from '../services/aiService';
import { MOCK_EVALUATION_TEMPLATE, RUBRIC_CATEGORIES } from './data';

const AUTO_ANALYSIS_PROMPT = `Realiza un analisis exhaustivo y detallado del texto de la pagina actual segun las 7 categorias de la rubrica academica. Evalua minuciosamente cada categoria y detecta TODOS los errores presentes:

1. Estructura Cientifica: faltan secciones? la organizacion es incorrecta?
2. Coherencia: hay orden logico? parrafos con multiples ideas principales?
3. Cohesion: uso adecuado de conectores, correferencia, marcadores discursivos y puntuacion?
4. Exposicion de Resultados: se explican claramente? relacion con objetivos?
5. Referencias: atribucion correcta? formato Harvard?
6. Adecuacion y Gramatica: registro formal? vocabulario preciso? nucleo verbal?
7. Formato y Ortografia: formato homogeneo? ortografia literal y acentual?

Para cada error detectado, indica obligatoriamente: categoria (id de la rubrica), severidad (minor/moderate/major), el texto exacto donde ocurre, y una sugerencia de correccion. No omitas ningun error. Si no hay errores en una categoria, simplemente no la incluyas.`;

let useMockFallback = false;

export function setMockFallback(enable) {
  useMockFallback = enable;
}

export async function simulateAutoAnalysis(currentPage, pageTexts = {}) {
  if (useMockFallback) {
    return mockAutoAnalysis(currentPage);
  }

  try {
    const currentText = pageTexts[currentPage] || '';
    const prevText = pageTexts[currentPage - 1] || '';
    const nextText = pageTexts[currentPage + 1] || '';

    const errors = await detectErrors(currentText, prevText, nextText, AUTO_ANALYSIS_PROMPT);

    const errorsWithId = errors.map((err, idx) => ({
      ...err,
      id: Date.now() + idx,
      source: 'ai',
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
    console.warn('AI detection failed, falling back to mock:', err.message);
    return mockAutoAnalysis(currentPage);
  }
}

function mockAutoAnalysis(currentPage) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const errors = RUBRIC_CATEGORIES.map((cat, idx) => {
        const severities = ['minor', 'moderate', 'major'];
        return {
          id: Date.now() + idx,
          error: cat.importance === 'alta'
            ? `Deficiencia en ${cat.label.toLowerCase()}: ${cat.levels.aceptable}`
            : `Error de ${cat.label.toLowerCase()}: ${cat.levels.aceptable}`,
          original_text: '',
          suggestion: cat.levels.optimo,
          severity: severities[idx % 3],
          category: cat.id,
          source: 'ai',
        };
      });
      resolve({
        success: true,
        errors,
        page: currentPage,
      });
    }, 1200);
  });
}

export async function simulatePromptSubmission(promptText, currentPage, pageTexts = {}) {
  if (useMockFallback) {
    return mockPromptSubmission(promptText, currentPage);
  }

  try {
    const currentText = pageTexts[currentPage] || '';
    const prevText = pageTexts[currentPage - 1] || '';
    const nextText = pageTexts[currentPage + 1] || '';

    const errors = await detectErrors(currentText, prevText, nextText, promptText);

    const errorsWithId = errors.map((err, idx) => ({
      ...err,
      id: Date.now() + idx,
      source: 'ai',
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
    console.warn('AI detection failed, falling back to mock:', err.message);
    return mockPromptSubmission(promptText, currentPage);
  }
}

export async function simulatePerformanceAnalysis(acceptedErrors, rejectedErrors = [], annotationStrokes = {}, annotationHighlights = {}) {
  if (useMockFallback) {
    return mockPerformanceAnalysis(acceptedErrors);
  }

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
    console.warn('AI analysis failed, falling back to mock:', err.message);
    return mockPerformanceAnalysis(acceptedErrors);
  }
}

function mockPromptSubmission(promptText, currentPage) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newErrors = [];
      const words = promptText.toLowerCase().split(' ');
      if (words.includes('grammar') || words.includes('grammatical') || words.includes('gramática') || words.includes('gramatical')) {
        newErrors.push({
          id: Date.now() + 1,
          error: 'Inconsistencia gramatical detectada en la estructura del predicado.',
          original_text: 'has been conducted',
          suggestion: 'was conducted',
          severity: 'moderate',
          category: 'gramatica',
          source: 'ai',
        });
      }
      if (words.includes('style') || words.includes('stylistic') || words.includes('estilo')) {
        newErrors.push({
          id: Date.now() + 2,
          error: 'Desviación del registro formal académico.',
          original_text: 'a lot of',
          suggestion: 'a significant number of',
          severity: 'minor',
          category: 'gramatica',
          source: 'ai',
        });
      }
      if (words.includes('citation') || words.includes('reference') || words.includes('cita') || words.includes('referencia')) {
        newErrors.push({
          id: Date.now() + 3,
          error: 'Formato de cita incorrecto en la bibliografía.',
          original_text: 'et al,',
          suggestion: 'et al.,',
          severity: 'major',
          category: 'referencias',
          source: 'ai',
        });
      }
      if (words.includes('cohesión') || words.includes('cohesion') || words.includes('conector')) {
        newErrors.push({
          id: Date.now() + 4,
          error: 'Uso inadecuado de conectores discursivos.',
          original_text: 'however the',
          suggestion: 'however, the',
          severity: 'moderate',
          category: 'cohesion',
          source: 'ai',
        });
      }
      if (newErrors.length === 0) {
        newErrors.push({
          id: Date.now(),
          error: 'No se detectaron errores específicos. Refina tu consulta.',
          original_text: '',
          suggestion: '',
          severity: 'info',
          category: null,
          source: 'ai',
        });
      }
      resolve({
        success: true,
        errors: newErrors,
        page: currentPage,
      });
    }, 1200);
  });
}

function mockPerformanceAnalysis(acceptedErrors) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        analysis: MOCK_EVALUATION_TEMPLATE(acceptedErrors),
        generatedAt: new Date().toISOString(),
      });
    }, 2000);
  });
}
