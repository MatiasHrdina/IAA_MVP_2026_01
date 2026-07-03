import { RUBRIC_CATEGORIES } from '../mock/data';

const MODEL = 'llama-3.3-70b-versatile';

const RUBRIC_CONTEXT = RUBRIC_CATEGORIES.map(
  (c) => `- ${c.label} (importancia ${c.importance}): ${c.description}`
).join('\n');

const RUBRIC_CATEGORY_IDS = RUBRIC_CATEGORIES.map((c) => c.id);

const SYSTEM_INSTRUCTION = `Eres un corrector académico especializado en evaluar informes científicos en español.

RÚBRICA DE CORRECCIÓN (categorías de error):
${RUBRIC_CONTEXT}

Cada error debe clasificarse en una de estas categorías: ${RUBRIC_CATEGORY_IDS.join(', ')}.`;

function buildAnalysisPrompt(acceptedErrors, rejectedErrors, annotationStrokes, annotationHighlights) {
  const rubricStats = RUBRIC_CATEGORIES.map((cat) => {
    const count = acceptedErrors.filter((e) => e.category === cat.id).length;
    return `  - ${cat.label}: ${count} error(es)`;
  }).join('\n');

  const severityLabels = { minor: 'Óptimo', moderate: 'Aceptable', major: 'Insuficiente' };
  const severityStats = ['minor', 'moderate', 'major'].map((sev) => {
    const count = acceptedErrors.filter((e) => e.severity === sev).length;
    return `  - ${severityLabels[sev]}: ${count}`;
  }).join('\n');

  const errorDetails = acceptedErrors.map(
    (e, i) => `${i + 1}. [${e.category}] "${e.error}" → "${e.suggestion}" (severidad: ${severityLabels[e.severity] || e.severity})`
  ).join('\n');

  const rejectedDetails = rejectedErrors.map(
    (e, i) => `${i + 1}. "${e.error}" (severidad: ${severityLabels[e.severity] || e.severity})`
  ).join('\n');

  const totalStrokes = Object.values(annotationStrokes).reduce((s, arr) => s + arr.length, 0);
  const totalHighlights = Object.values(annotationHighlights).reduce((s, arr) => s + arr.length, 0);

  return `Genera un informe de evaluación final basado en los siguientes datos:

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
4. Áreas de mejora priorizadas`;
}

async function queryGroq(systemInstruction, userPrompt, useJsonMode) {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  };

  if (useJsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(
    '/groq-api/v1/chat/completions',
    {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Error de Groq API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function generatePerformanceAnalysis(acceptedErrors, rejectedErrors, annotationStrokes, annotationHighlights) {
  const userPrompt = buildAnalysisPrompt(acceptedErrors, rejectedErrors, annotationStrokes, annotationHighlights);
  const analysis = await queryGroq(SYSTEM_INSTRUCTION, userPrompt, false);
  return analysis || 'No se pudo generar el análisis.';
}
