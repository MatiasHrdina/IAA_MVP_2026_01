import { detectErrors, generatePerformanceAnalysis } from '../services/aiService';
import { MOCK_EVALUATION_TEMPLATE } from './data';

let useMockFallback = false;

export function setMockFallback(enable) {
  useMockFallback = enable;
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
