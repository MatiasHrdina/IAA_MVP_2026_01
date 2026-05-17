import { RUBRIC_CATEGORIES } from '../mock/data';

const MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';

const RUBRIC_CONTEXT = RUBRIC_CATEGORIES.map(
  (c) => `- ${c.label} (importancia ${c.importance}): ${c.description}`
).join('\n');

const RUBRIC_CATEGORIES_JSON = RUBRIC_CATEGORIES.map((c) => c.id);

function buildErrorDetectionPrompt(currentText, prevText, nextText, userQuery) {
  return `
Eres un corrector académico especializado en evaluar informes científicos.

CONTEXTO DEL DOCUMENTO:
[Página anterior]: ${prevText || '(No disponible)'}
[Página actual]: ${currentText}
[Página siguiente]: ${nextText || '(No disponible)'}

RÚBRICA DE CORRECCIÓN (categorías de error):
${RUBRIC_CONTEXT}

INSTRUCCIÓN DEL USUARIO:
${userQuery}

Analiza el texto de la página actual según la rúbrica y detecta errores.
Responde ÚNICAMENTE con un array JSON válido (sin texto adicional, sin markdown):
[
  {
    "error": "Descripción del error",
    "original_text": "Texto exacto con el error",
    "suggestion": "Texto corregido",
    "severity": "minor" | "moderate" | "major",
    "category": "${RUBRIC_CATEGORIES_JSON.join(' | ')}"
  }
]
Si no hay errores, responde: []
`.trim();
}

function buildAnalysisPrompt(acceptedErrors, rejectedErrors, annotationStrokes, annotationHighlights) {
  const rubricStats = RUBRIC_CATEGORIES.map((cat) => {
    const count = acceptedErrors.filter((e) => e.category === cat.id).length;
    return `  - ${cat.label}: ${count} error(es)`;
  }).join('\n');

  const severityStats = ['minor', 'moderate', 'major'].map((sev) => {
    const count = acceptedErrors.filter((e) => e.severity === sev).length;
    return `  - ${sev}: ${count}`;
  }).join('\n');

  const errorDetails = acceptedErrors.map(
    (e, i) => `${i + 1}. [${e.category}] "${e.error}" → "${e.suggestion}" (severidad: ${e.severity})`
  ).join('\n');

  const rejectedDetails = rejectedErrors.map(
    (e, i) => `${i + 1}. "${e.error}" (severidad: ${e.severity})`
  ).join('\n');

  const totalStrokes = Object.values(annotationStrokes).reduce((s, arr) => s + arr.length, 0);
  const totalHighlights = Object.values(annotationHighlights).reduce((s, arr) => s + arr.length, 0);

  return `
Eres un corrector académico. Genera un informe de evaluación final basado en los siguientes datos:

ERRORES ACEPTADOS (corregidos):
${errorDetails || 'Ninguno'}

ERRORES RECHAZADOS (falsos positivos):
${rejectedDetails || 'Ninguno'}

ANOTACIONES MANUALES:
- Trazos de bolígrafo: ${totalStrokes}
- Destacados: ${totalHighlights}

DISTRIBUCIÓN POR CRITERIO DE RÚBRICA:
${rubricStats}

DISTRIBUCIÓN POR SEVERIDAD:
${severityStats}

Genera un informe estructurado en español con:
1. Resumen general del desempeño
2. Análisis por criterio de la rúbrica
3. Recomendaciones pedagógicas específicas
4. Áreas de mejora priorizadas
`.trim();
}

async function queryHuggingFace(prompt) {
  const response = await fetch(
    `/hf-api/models/${MODEL}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 2000,
          temperature: 0.3,
          return_full_text: false,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Hugging Face API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data[0]?.generated_text || '';
}

export async function detectErrors(currentText, prevText, nextText, userQuery) {
  const prompt = buildErrorDetectionPrompt(currentText, prevText, nextText, userQuery);
  const raw = await queryHuggingFace(prompt);

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

export async function generatePerformanceAnalysis(acceptedErrors, rejectedErrors, annotationStrokes, annotationHighlights) {
  const prompt = buildAnalysisPrompt(acceptedErrors, rejectedErrors, annotationStrokes, annotationHighlights);
  const analysis = await queryHuggingFace(prompt);
  return analysis || 'No se pudo generar el análisis.';
}
