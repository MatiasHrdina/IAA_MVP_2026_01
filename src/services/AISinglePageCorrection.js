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

function buildErrorDetectionPrompt(currentText, userQuery) {
  return `TEXTO DEL DOCUMENTO:
--- INICIO PÁGINA ACTUAL ---
${currentText}
--- FIN PÁGINA ACTUAL ---

INSTRUCCIÓN DEL USUARIO:
${userQuery}

Analiza el texto de la página según la rúbrica y detecta TODOS los errores.

IMPORTANTE: No hay límite en la cantidad de errores. Revisa CADA línea de la página. En una misma página puede haber 0, 1 o MÚLTIPLES errores de una misma categoría.

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

async function queryGroq(systemInstruction, userPrompt, useJsonMode, maxTokens = 8000) {
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

export async function detectErrors(currentText, userQuery) {
  const userPrompt = buildErrorDetectionPrompt(currentText, userQuery);
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
