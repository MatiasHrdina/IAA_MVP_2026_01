import { MOCK_CORRECTIONS, MOCK_EVALUATION_TEMPLATE } from './data';

export function simulatePromptSubmission(promptText, currentPage) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newErrors = [];
      const words = promptText.toLowerCase().split(' ');
      if (words.includes('grammar') || words.includes('grammatical')) {
        newErrors.push({
          id: Date.now() + 1,
          error: 'Grammatical inconsistency detected in the predicate structure.',
          original_text: 'has been conducted',
          suggestion: 'was conducted',
          severity: 'moderate',
        });
      }
      if (words.includes('style') || words.includes('stylistic')) {
        newErrors.push({
          id: Date.now() + 2,
          error: 'Stylistic register deviation from formal academic tone.',
          original_text: 'a lot of',
          suggestion: 'a significant number of',
          severity: 'minor',
        });
      }
      if (words.includes('citation') || words.includes('reference')) {
        newErrors.push({
          id: Date.now() + 3,
          error: 'Improper citation format detected in the bibliography entry.',
          original_text: 'et al,',
          suggestion: 'et al.,',
          severity: 'major',
        });
      }
      if (newErrors.length === 0) {
        newErrors.push({
          id: Date.now(),
          error: 'No specific error pattern detected. Please refine your query.',
          original_text: '',
          suggestion: '',
          severity: 'info',
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

export function simulatePerformanceAnalysis(acceptedErrors) {
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
