import { detectErrors, generatePerformanceAnalysis } from '../services/aiService';

const AUTO_ANALYSIS_PROMPT = `Realiza un analisis exhaustivo y detallado del texto de la pagina actual segun las 7 categorias de la rubrica academica. Evalua minuciosamente cada categoria y detecta TODOS los errores presentes:

1. Estructura Cientifica: faltan secciones? la organizacion es incorrecta?
2. Coherencia: hay orden logico? parrafos con multiples ideas principales?
3. Cohesion: uso adecuado de conectores, correferencia, marcadores discursivos y puntuacion?
4. Exposicion de Resultados: se explican claramente? relacion con objetivos?
5. Referencias: atribucion correcta? formato Harvard?
6. Adecuacion y Gramatica: registro formal? vocabulario preciso? nucleo verbal?
7. Formato y Ortografia: formato homogeneo? ortografia literal y acentual?

Para cada error detectado, indica obligatoriamente: categoria (id de la rubrica), severidad (minor/moderate/major), el texto exacto donde ocurre, y una sugerencia de correccion. No omitas ningun error. Si no hay errores en una categoria, simplemente no la incluyas.`;

export async function simulateAutoAnalysis(currentPage, pageTexts = {}) {
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
    console.warn('AI detection failed:', err.message);
    return { success: false, errors: [], page: currentPage, error: err.message };
  }
}

export async function simulatePromptSubmission(promptText, currentPage, pageTexts = {}) {
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
    console.warn('AI detection failed:', err.message);
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
    console.warn('AI analysis failed:', err.message);
    return { success: false, analysis: '', generatedAt: new Date().toISOString(), error: err.message };
  }
}
