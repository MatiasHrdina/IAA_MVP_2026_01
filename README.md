# Plataforma de Corrección Académica Asistida por IA

Herramienta web para la corrección asistida por IA de informes académicos en español. Permite cargar un PDF, ejecutar análisis automático contra una rúbrica de 7 categorías, revisar/aceptar/rechazar errores detectados, anotar manualmente con lápiz digital y exportar un PDF completamente anotado.

---

## Flujo de la aplicación

```
Login → Upload → Workspace (corrección) → Summary / Export
                                              ↘ RubricAnnotation → Export
```

### Pantallas

| Pantalla | Componente | Descripción |
|---|---|---|
| **Login** | `Login.jsx` | Autenticación simulada con credenciales fijas: `escritura@uandes.cl` / `UANDES2020` |
| **Upload** | `Upload.jsx` | Selección de PDF, validación de tipo MIME y extensión, extracción de número de páginas |
| **Workspace** | `Workspace.jsx` | Interfaz principal de corrección con 3 paneles (control, visor PDF, estadísticas) |
| **Summary** | `Summary.jsx` | Métricas, distribución por severidad, análisis de rendimiento por IA, exportación de PDF |
| **RubricAnnotation** | `RubricAnnotation.jsx` | Anotación de la rúbrica PDF con formulario, lápiz digital y exportación final |

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| Framework | React 18 |
| Build | Vite 5 |
| Estilo | Bootstrap 5 |
| Renderizado PDF | `pdfjs-dist` (via `react-pdf`) |
| Manipulación PDF | `pdf-lib` |
| IA | Groq API (Llama 3.3 70B) — capa gratuita |
| Estado | `useReducer` + Context + `sessionStorage` |
| Markdown | `react-markdown` + `remark-gfm` |
| Contenedores | Docker / docker-compose |

---

## Categorías de la rúbrica

| Categoría | Importancia | Descripción |
|---|---|---|
| Estructura Científica | alta | Secciones del informe científico |
| Coherencia | alta | Orden lógico, una idea por párrafo |
| Cohesión | alta | Conectores, correferencia, marcadores discursivos |
| Exposición de Resultados | alta | Explicación de resultados, tablas/figuras |
| Referencias | alta | Atribución de fuentes, estilo Harvard |
| Adecuación y Gramática | media | Registro académico formal, núcleo verbal |
| Formato y Ortografía | media | Portada, tipografía, ortografía |

---

## Interfaz de trabajo (Workspace)

Diseño de 3 paneles:

```
┌───────────────┬──────────────────────────┬──────────────────┐
│ Panel izq.    │ Visor PDF (centro)       │ Panel der.        │
│ (38%)         │ (flex)                   │ (sidebar)         │
│               │                          │                   │
│ · Analizar    │ 3 capas superpuestas:    │ · Gráfico de      │
│ · Analizar    │   1. Canvas PDF (pdfjs)  │   barras por      │
│   documento   │   2. Texto + resaltados  │   categoría       │
│   completo    │   3. Canvas lápiz        │ · Conteos rápidos │
│ · Registro de │                          │ · Formulario de   │
│   errores     │ Herramientas flotantes:  │   entrada manual  │
│   (aceptar/   │   - Lápiz (activar/desc.)│ · Lista de        │
│   rechazar)   │   - Deshacer trazo       │   entradas        │
│ · Paginación  │                          │   manuales        │
└───────────────┴──────────────────────────┴──────────────────┘
```

### Capas del visor PDF

| Capa | z-index | Contenido |
|---|---|---|
| 1 — Canvas PDF | auto | Renderizado pdfjs a escala 1.5x, máx. 700px de ancho |
| 2 — Texto + resaltados | 5 | Spans posicionados con texto transparente para detección de hits |
| 3 — Canvas de anotación | 20 | Canvas transparente para dibujo con lápiz + barra flotante |

### Anotaciones

- **Lápiz digital:** trazos libres en rojo (`rgba(220, 38, 38, 0.85)`) a 2.5px. Se almacenan por página en `annotationStrokes`.
- **Resaltado automático:** al aceptar un error, el texto coincidente se resalta con el color de su categoría.
- **Resaltado manual:** infraestructura presente en el código pero botón deshabilitado en la interfaz.
- **Errores manuales:** formulario en panel derecho para agregar errores sin depender de la IA.

---

## Servicios de IA

Tres servicios separados que usan Groq API (modelo `llama-3.3-70b-versatile`, temperatura 0.3):

| Servicio | Archivo | Función | Modo |
|---|---|---|---|
| Página individual | `services/AISinglePageCorrection.js` | `detectErrors()` — analiza una página | JSON mode |
| Documento completo | `services/AIFullCorrection.js` | `detectFullDocumentErrors()` — lotes de 10 páginas | JSON mode |
| Análisis de rendimiento | `services/AIPerformanceAnalysis.js` | `generatePerformanceAnalysis()` — informe en español | Markdown |

El proxy de Vite redirige `/groq-api` → `https://api.groq.com/openai`. Si la API falla, se usan datos simulados (mock).

---

## Exportación de PDF (`utils/pdfExport.js`)

`exportPdfWithAnnotations()` genera un PDF final llamado `informe_anotado_YYYY-MM-DD.pdf`:

1. Carga el PDF original con `pdf-lib` + `pdfjs`
2. Por cada página:
   - Incrusta trazos de lápiz (coordenadas proporcionales con inversión Y)
   - Dibuja rectángulos de resaltado (manuales y automáticos)
   - Busca posiciones de texto de errores aceptados y subraya con color de categoría
3. Crea un **Apéndice** con errores agrupados por categoría (severidad, texto original, sugerencia)
4. Incluye la sección de análisis de rendimiento (markdown renderizado a PDF)
5. Agrega las páginas de la rúbrica PDF con trazos y datos del formulario superpuestos

---

## Estructura del proyecto

```
src/
├── main.jsx                          # Punto de entrada (Bootstrap + CSS global)
├── App.jsx                           # Router de 5 pantallas
├── context/
│   └── AppContext.jsx                 # Estado global (reducer + sessionStorage)
├── components/
│   ├── Login/Login.jsx               # Pantalla de inicio de sesión
│   ├── Upload/Upload.jsx             # Pantalla de carga de PDF
│   ├── Workspace/
│   │   ├── Workspace.jsx             # Layout de 3 paneles
│   │   ├── PdfViewer.jsx             # Visor PDF con 3 capas y resaltado automático
│   │   ├── AnnotationCanvas.jsx      # Canvas de lápiz + barra flotante
│   │   ├── ControlPanel.jsx          # Disparadores de IA + registro de errores
│   │   ├── ErrorList.jsx             # Tarjetas de error con aceptar/rechazar
│   │   ├── Pagination.jsx            # Navegación de páginas
│   │   └── ErrorStatsPanel.jsx       # Gráfico de barras + entrada manual
│   ├── Summary/Summary.jsx           # Métricas + análisis de rendimiento + exportación
│   └── RubricAnnotation/
│       └── RubricAnnotation.jsx      # Anotación de rúbrica con formulario
├── services/
│   ├── AISinglePageCorrection.js     # Detección de errores por página
│   ├── AIFullCorrection.js           # Detección de errores en documento completo
│   └── AIPerformanceAnalysis.js      # Generación de informe de rendimiento
├── utils/
│   └── pdfExport.js                  # Exportación de PDF anotado (770 líneas)
├── mock/
│   ├── api.js                        # Wrappers mock con fallback a servicios reales
│   └── data.js                       # Categorías, credenciales, plantilla de evaluación
└── styles/
    └── global.css                    # Estilos personalizados
```

---

## Requisitos del sistema

### Hardware

| Componente | Mínimo |
|---|---|
| RAM | 1 GB |
| Procesador | Cualquier procesador moderno (Intel Core i3 / AMD Ryzen 3 o equivalente) |
| Almacenamiento | 200 MB libres |
| Pantalla | 1280 × 720 px (recomendado 1920 × 1080 px para el layout de 3 paneles) |

### Software

| Componente | Versión |
|---|---|
| Sistema operativo | Windows 10+, macOS 12+, o Linux (Ubuntu 20.04+) |
| Node.js | 20.x LTS o superior |
| npm | 9.x o superior (incluido con Node.js) |
| Navegador | Chrome 100+, Firefox 100+, Edge 100+ |
| Docker | 24.x o superior (opcional, para ejecución contenedorizada) |
| docker-compose | 2.x o superior (opcional) |
| Git | 2.x o superior (opcional, para clonar el repositorio) |

### Red

- Conexión a internet para el análisis por IA (Groq API).
- Puerto `3000` libre para desarrollo local.
- Puerto `8080` libre para producción con Docker.

---

## Dependencias

### Sistema

- **Node.js** 20.x o superior
- **npm** (incluido con Node.js)
- **Navegador web moderno** (Chrome, Firefox, Edge)
- **Conexión a internet** para el análisis por IA
- **Docker** y **docker-compose** (opcional, para ejecución contenedorizada)

### Dependencias de producción

| Paquete | Versión | Propósito |
|---|---|---|
| `react` | ^18.3.1 | Framework de interfaz de usuario |
| `react-dom` | ^18.3.1 | Renderizado DOM de React |
| `bootstrap` | ^5.3.3 | Biblioteca de estilos y componentes UI |
| `react-pdf` | ^9.1.0 | Visor de PDF en React |
| `pdfjs-dist` | ^4.0.379 | Motor de renderizado de PDF (usado por react-pdf) |
| `pdf-lib` | ^1.17.1 | Creación y modificación de documentos PDF |
| `react-markdown` | ^10.1.0 | Renderizado de texto Markdown |
| `remark-gfm` | ^4.0.1 | Soporte para tablas y listas en Markdown (GFM) |

### Dependencias de desarrollo

| Paquete | Versión | Propósito |
|---|---|---|
| `vite` | ^5.3.1 | Empaquetador y servidor de desarrollo |
| `@vitejs/plugin-react` | ^4.3.1 | Plugin de Vite para React (HMR) |
| `eslint` | ^8.57.0 | Linter de JavaScript |
| `eslint-plugin-react` | ^7.34.2 | Reglas de linting específicas de React |
| `eslint-plugin-react-hooks` | ^4.6.2 | Reglas de linting para hooks de React |
| `@types/react` | ^18.3.3 | Tipados TypeScript para React (asistencia en IDE) |

### API externa

| Servicio | Recurso | Propósito |
|---|---|---|
| **Groq API** | `llama-3.3-70b-versatile` | Análisis de errores y generación de informes (gratuito, requiere clave API) |

> Sin clave de Groq API la aplicación funciona con datos simulados (mock), permitiendo explorar la interfaz sin conexión a internet.

---

## Ejecución

### Local (sin Docker)

```bash
cp .env.example .env   # Configurar GROQ_API_KEY (opcional, sin ella usa mock)
npm install
npm run dev            # Servidor de desarrollo → http://localhost:3000
npm run build          # Build de producción → dist/
npm run preview        # Vista previa del build de producción
npm run lint           # ESLint
```

### Con Docker

```bash
docker compose up --build          # Modo desarrollo (hot-reload) en :3000
docker compose up prod             # Modo producción (nginx) en :8080
```

### Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `GROQ_API_KEY` | Opcional | Clave API de Groq (gratis en https://console.groq.com/keys) |

---

## Mantenimiento

### Actualizar dependencias

```bash
npm outdated                  # Ver paquetes desactualizados
npm update                    # Actualizar dentro del rango de versiones permitido
npm install <paquete>@latest  # Actualizar a la última versión (validar compatibilidad)
```

### Reconstruir contenedores Docker

```bash
docker compose down --volumes    # Detener y limpiar volúmenes
docker compose build --no-cache  # Reconstruir sin caché
docker compose up --build        # Reconstruir e iniciar
```

### Lint y formato

```bash
npm run lint   # Verificar estilo de código con ESLint
```

### Estructura de archivos clave a mantener

| Archivo | Propósito |
|---|---|
| `.env` | Configuración local (`GROQ_API_KEY`). No se versiona. |
| `.env.example` | Plantilla de variables de entorno. Mantener sincronizada con `.env`. |
| `Dockerfile` | Build multi-etapa para producción. Actualizar si cambian dependencias del sistema. |
| `docker-compose.yml` | Servicios dev y prod. |
| `vite.config.js` | Proxy de API y configuración del empaquetador. |

---

## Estado global (`AppContext.jsx`)

El estado se maneja con `useReducer` y se persiste en `sessionStorage` bajo la clave `academic-correction-session`.

```javascript
{
  isAuthenticated: boolean,
  currentUser: { email, role } | null,
  currentScreen: 'login' | 'upload' | 'workspace' | 'summary' | 'rubric',
  documentFile: File | null,
  documentUrl: string | null,
  totalPages: number,
  currentPage: number,
  errorCorpus: { [page]: Error[] },
  acceptedErrorRegistry: Error[],
  rejectedErrorRegistry: Error[],
  performanceAnalysis: string | null,
  analysisGeneratedAt: string | null,
  annotationStrokes: { [page]: Stroke[] },
  annotationHighlights: { [page]: Highlight[] },
  rubricAnnotationStrokes: { [page]: Stroke[] },
}
```

---

## Limitaciones conocidas

1. **Autenticación simulada** — credenciales fijas, sin backend real
2. **Persistencia en sesión** — los datos se pierden al cerrar la pestaña
3. **Análisis página por página** — no es un análisis global del documento
4. **Resaltado manual deshabilitado** — infraestructura presente pero botón oculto en la UI
5. **Precisión del text-mapping** — depende de PDF.js; puede desalinearse en PDFs complejos
6. **Límite de 50 páginas** para extracción de texto
7. **Sin historial de estudiantes** ni integración con base de datos
8. **Sin exportación a Excel/CSV**
