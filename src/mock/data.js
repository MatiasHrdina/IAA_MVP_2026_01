export const RUBRIC_CATEGORIES = [
  {
    id: 'cientifica',
    label: 'Estructura Científica',
    importance: 'alta',
    description: 'Secciones del informe: resumen, índice, introducción, objetivo general y específicos, metodología, resultados, conclusión y bibliografía.',
    levels: {
      optimo: 'El informe presenta todas las secciones correctamente desarrolladas.',
      aceptable: 'La mayoría de las secciones están presentes pero algunas poco desarrolladas.',
      insuficiente: 'Faltan varias secciones fundamentales o la organización no sigue una estructura científica clara.',
    },
  },
  {
    id: 'coherencia',
    label: 'Coherencia',
    importance: 'alta',
    description: 'Orden lógico de las ideas, párrafos con máximo 1 idea principal.',
    levels: {
      optimo: 'Las ideas se desarrollan de forma lógica y consistente.',
      aceptable: 'En algunos párrafos el orden lógico es poco claro o presentan más de una idea principal.',
      insuficiente: 'El informe presenta las ideas de forma desorganizada y/o contradictoria.',
    },
  },
  {
    id: 'cohesion',
    label: 'Cohesión',
    importance: 'alta',
    description: 'Uso de conectores, correferencia, marcadores discursivos y puntuación.',
    levels: {
      optimo: 'Se utilizan adecuadamente mecanismos de correferencia, conectores y marcadores discursivos.',
      aceptable: 'Uso limitado de mecanismos de correferencia y conectores.',
      insuficiente: 'Uso ocasional de mecanismos de correferencia y conectores; lectura lenta y compleja.',
    },
  },
  {
    id: 'resultados',
    label: 'Exposición de Resultados',
    importance: 'alta',
    description: 'Explicación de resultados, relación con objetivos y metodología, uso de tablas/figuras.',
    levels: {
      optimo: 'Los resultados se explican claramente y se complementan con tablas, figuras o imágenes.',
      aceptable: 'Las explicaciones son parciales o su relación con objetivos y metodología es indirecta.',
      insuficiente: 'Las explicaciones están incompletas o son confusas; escasos textos discontinuos.',
    },
  },
  {
    id: 'referencias',
    label: 'Referencias',
    importance: 'alta',
    description: 'Atribución de fuentes, confiabilidad, estilo Harvard.',
    levels: {
      optimo: 'Los contenidos son atribuidos a fuentes confiables usando estilo Harvard correctamente.',
      aceptable: 'Varios contenidos sin atribución; algunas fuentes poco confiables; uso parcial de Harvard.',
      insuficiente: 'Mayoría sin atribución; fuentes poco académicas; no se usa estilo Harvard.',
    },
  },
  {
    id: 'gramatica',
    label: 'Adecuación y Gramática',
    importance: 'media',
    description: 'Registro académico formal, vocabulario preciso, voz impersonal, núcleo verbal.',
    levels: {
      optimo: 'Texto con registro formal, vocabulario preciso y todas las oraciones con núcleo verbal.',
      aceptable: 'Registro mayormente formal con algunas expresiones informales; algunas oraciones sin núcleo verbal.',
      insuficiente: 'Registro mayoritariamente informal e inapropiado; múltiples oraciones sin núcleo verbal.',
    },
  },
  {
    id: 'ortografia',
    label: 'Formato y Ortografía',
    importance: 'media',
    description: 'Portada, contraportada, tipografía, interlineado, márgenes, ortografía literal y acentual.',
    levels: {
      optimo: 'Portada completa, formato homogéneo, sin errores de ortografía.',
      aceptable: 'Faltan algunos datos en portada o formato poco homogéneo; algunos errores ortográficos.',
      insuficiente: 'Portada incompleta, formato inadecuado; múltiples errores de ortografía.',
    },
  },
];

export const MOCK_CREDENTIALS = {
  email: 'professor@academic.edu',
  password: 'correct2024',
};

export const MOCK_CORRECTIONS_PAGE_1 = [
  {
    id: 1,
    error: 'Incorrect verb tense in the introductory paragraph.',
    original_text: 'the experiment demonstrates',
    suggestion: 'the experiment demonstrated',
    severity: 'moderate',
    category: 'gramatica',
    source: 'ai',
  },
  {
    id: 2,
    error: 'Missing definite article before the noun phrase.',
    original_text: 'According to literature',
    suggestion: 'According to the literature',
    severity: 'minor',
    category: 'gramatica',
    source: 'ai',
  },
  {
    id: 3,
    error: 'Subject-verb disagreement in the main clause.',
    original_text: 'The data indicates that',
    suggestion: 'The data indicate that',
    severity: 'major',
    category: 'gramatica',
    source: 'ai',
  },
];

export const MOCK_CORRECTIONS_PAGE_2 = [
  {
    id: 4,
    error: 'Ambiguous pronoun reference obscuring the antecedent.',
    original_text: 'this leads to',
    suggestion: 'this discrepancy leads to',
    severity: 'moderate',
    category: 'cohesion',
    source: 'ai',
  },
  {
    id: 5,
    error: 'Run-on sentence requiring conjunction insertion.',
    original_text: 'the results were inconclusive the hypothesis',
    suggestion: 'the results were inconclusive; therefore, the hypothesis',
    severity: 'major',
    category: 'cohesion',
    source: 'ai',
  },
];

export const MOCK_CORRECTIONS = {
  1: MOCK_CORRECTIONS_PAGE_1,
  2: MOCK_CORRECTIONS_PAGE_2,
};

export const MOCK_EVALUATION_TEMPLATE = (acceptedErrors) => {
  const errorCount = acceptedErrors.length;
  const severityDist = acceptedErrors.reduce((acc, err) => {
    acc[err.severity] = (acc[err.severity] || 0) + 1;
    return acc;
  }, {});

  const rubricDist = acceptedErrors.reduce((acc, err) => {
    const cat = RUBRIC_CATEGORIES.find((c) => c.id === err.category);
    const label = cat ? cat.label : err.category;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return `
INFORME DE EVALUACIÓN — CORRECCIÓN DE COMUNICACIÓN ESCRITA
============================================================

Resumen:
El proceso de revisión identificó ${errorCount} irregularidades lingüísticas y
estructurales que requieren intervención pedagógica.

Distribución por Severidad:
${Object.entries(severityDist)
  .map(
    ([severity, count]) =>
      `  - ${severity.charAt(0).toUpperCase() + severity.slice(1)}: ${count} ocurrencia(s)`
  )
  .join('\n')}

Distribución por Criterio de la Rúbrica:
${Object.entries(rubricDist)
  .map(([cat, count]) => `  - ${cat}: ${count} ocurrencia(s)`)
  .join('\n')}

Áreas que Requieren Refuerzo:
${acceptedErrors
  .map((err) => {
    const cat = RUBRIC_CATEGORIES.find((c) => c.id === err.category);
    const catName = cat ? cat.label : err.category;
    return `  * [${catName}] ${err.error} (Severidad: ${err.severity})`;
  })
  .join('\n')}

Recomendaciones Pedagógicas:
1. El estudiante debe realizar ejercicios específicos enfocados en las
   categorías identificadas anteriormente.
2. Se recomienda una revisión exhaustiva de las convenciones de escritura
   académica, con énfasis en los criterios de alta relevancia.
3. Es recomendable que el estudiante utilice listas de verificación antes
   de la entrega final para minimizar errores recurrentes.

Conclusión:
El estudiante demuestra competencias fundamentales en escritura académica
pero requiere intervención estructurada para abordar deficiencias
persistentes. Se recomienda práctica guiada continua.
`.trim();
};
