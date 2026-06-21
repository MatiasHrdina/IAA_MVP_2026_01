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

function buildErrorDetectionPrompt(currentText, prevText, nextText, userQuery) {
  const sections = [];
  if (prevText) {
    sections.push(`--- INICIO PÁGINA ANTERIOR (contexto) ---\n${prevText}\n--- FIN PÁGINA ANTERIOR ---`);
  }
  sections.push(`--- INICIO PÁGINA ACTUAL (analizar esta página) ---\n${currentText}\n--- FIN PÁGINA ACTUAL ---`);
  if (nextText) {
    sections.push(`--- INICIO PÁGINA SIGUIENTE (contexto) ---\n${nextText}\n--- FIN PÁGINA SIGUIENTE ---`);
  }

  return `TEXTO DEL DOCUMENTO:
${sections.join('\n\n')}

INSTRUCCIÓN DEL USUARIO:
${userQuery}

Analiza ÚNICAMENTE el texto de la sección "PÁGINA ACTUAL" según la rúbrica y detecta TODOS los errores.
Las secciones "PÁGINA ANTERIOR" y "PÁGINA SIGUIENTE" se incluyen solo como contexto para que puedas ver párrafos completos que continúan entre páginas; NO las analices.

IMPORTANTE: No hay límite en la cantidad de errores. Revisa CADA línea de la página actual. En una misma página puede haber 0, 1 o MÚLTIPLES errores de una misma categoría.

Responde ÚNICAMENTE con un objeto JSON con esta estructura exacta:
{
  "errors": [
    {
      "error": "Descripción del error",
      "original_text": "Texto exacto con el error",
      "suggestion": "Texto corregido",
      "category": "cientifica"
    },
    {
      "error": "Descripción de otro error",
      "original_text": "Otro texto exacto con error",
      "suggestion": "Otra sugerencia de corrección",
      "category": "coherencia"
    }
  ]
}
Si no hay errores, responde: {"errors": []}`;
}

function buildFullDocumentPrompt(pagesText, userQuery, pageNumbers) {
  const sections = pagesText.map((text, index) => {
    const pageNum = pageNumbers ? pageNumbers[index] : index + 1;
    return `--- INICIO PÁGINA ${pageNum} ---\n${text}\n--- FIN PÁGINA ${pageNum} ---`;
  });

  return `TEXTO DEL DOCUMENTO:
${sections.join('\n\n')}

INSTRUCCIÓN DEL USUARIO:
${userQuery}

Analiza CADA página del documento según la rúbrica y detecta TODOS los errores presentes en cada página.

IMPORTANTE: No hay límite en la cantidad de errores. Revisa CADA línea de CADA página. En una misma página puede haber 0, 1 o MÚLTIPLES errores de una misma categoría.

Debes incluir el número de página al que pertenece cada error.

Responde ÚNICAMENTE con un objeto JSON con esta estructura exacta:
{
  "errors": [
    {
      "error": "Descripción del error",
      "original_text": "Texto exacto con el error",
      "suggestion": "Texto corregido",
      "category": "coherencia",
      "page": 1
    },
    {
      "error": "Descripción de otro error",
      "original_text": "Otro texto exacto con error",
      "suggestion": "Otra sugerencia de corrección",
      "category": "gramatica",
      "page": 1
    }
  ]
}
Si no hay errores, responde: {"errors": []}`;
}

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

async function queryGroq(systemInstruction, userPrompt, useJsonMode, maxTokens = 2000) {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: maxTokens,
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

export async function detectErrors(currentText, prevText, nextText, userQuery) {
  const userPrompt = buildErrorDetectionPrompt(currentText, prevText, nextText, userQuery);
  const raw = await queryGroq(SYSTEM_INSTRUCTION, userPrompt, true, 8000);

  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.errors)) return parsed.errors;
    if (Array.isArray(parsed)) return parsed;
    if (parsed && parsed.error && parsed.category) return [parsed];
    for (const val of Object.values(parsed)) {
      if (Array.isArray(val)) return val;
    }
    return [];
  } catch {
    return [];
  }
}

export async function detectFullDocumentErrors(pagesText, userQuery, pageNumbers) {
  const userPrompt = buildFullDocumentPrompt(pagesText, userQuery, pageNumbers);
  const raw = await queryGroq(SYSTEM_INSTRUCTION, userPrompt, true, 32000);

  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.errors)) return parsed.errors;
    if (Array.isArray(parsed)) return parsed;
    if (parsed && parsed.error && parsed.category) return [parsed];
    for (const val of Object.values(parsed)) {
      if (Array.isArray(val)) return val;
    }
    return [];
  } catch {
    return [];
  }
}

export async function generatePerformanceAnalysis(acceptedErrors, rejectedErrors, annotationStrokes, annotationHighlights) {
  const userPrompt = buildAnalysisPrompt(acceptedErrors, rejectedErrors, annotationStrokes, annotationHighlights);
  const analysis = await queryGroq(SYSTEM_INSTRUCTION, userPrompt, false);
  return analysis || 'No se pudo generar el análisis.';
}
