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

async function queryGroq(systemInstruction, userPrompt, useJsonMode) {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    // Para Llama 3.3 70B el máximo es 32768.
    // Si cambias a un modelo/API key con mayor capacidad, puedes aumentar este valor
    // hasta el `max_tokens` que soporte ese modelo.
    max_tokens: 9000,
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

export async function detectFullDocumentErrors(pagesText, userQuery, pageNumbers) {
  const userPrompt = buildFullDocumentPrompt(pagesText, userQuery, pageNumbers);
  const raw = await queryGroq(SYSTEM_INSTRUCTION, userPrompt, true);

  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.errors)) {
      console.log('[AIFullCorrection] parsed errors:', JSON.stringify(parsed.errors, null, 2));
      return parsed.errors;
    }
    if (Array.isArray(parsed)) {
      console.log('[AIFullCorrection] parsed array:', JSON.stringify(parsed, null, 2));
      return parsed;
    }
    if (parsed && parsed.error && parsed.category) return [parsed];
    for (const val of Object.values(parsed)) {
      if (Array.isArray(val)) return val;
    }
    return [];
  } catch {
    return [];
  }
}


