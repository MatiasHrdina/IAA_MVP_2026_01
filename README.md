# Academic Correction Tool

AI-assisted academic report correction platform. Upload a PDF, run AI-powered analysis against a rubric (7 categories), accept/reject detected errors, manually annotate (pen + highlight) PDF pages, and export the annotated report.

## Running with Docker

```bash
docker compose up --build          
```

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 18 |
| Build | Vite 5 |
| Styling | Bootstrap 5 |
| PDF render | `pdfjs-dist` (via `react-pdf`) |
| PDF export | `pdf-lib` |
| AI | Groq API (Llama 3.3 70B) — free tier |
| State | `useReducer` + context + sessionStorage persistence |

## App Flow

```
Login → Upload PDF → Workspace (correction) → Summary / Export
```

### Screens

- **Login** — hardcoded mock credentials: `professor@academic.edu` / `correct2024`
- **Upload** — selects a PDF, extracts page count, validates MIME type
- **Workspace** — main interface (split layout):
  - **Left panel** (38%): AI analysis trigger ("Analizar"), error registry per page with accept/reject/status
  - **Center** (flex): PDF viewer with annotation layers
  - **Right sidebar** (`ErrorStatsPanel`): collapsible stats panel — bar chart per rubric category, manual error entry form
- **Summary** — metric cards (accepted/rejected/manual), severity distribution, AI-generated performance analysis (markdown), **"Make Report"** PDF export

## Rubric Categories

The AI evaluates against 7 criteria from the included rubric PDF (`assets/Rúbrica Escritura Español.pdf`):

| Category | Importance | Description |
|---|---|---|
| Estructura Científica | alta | Sections of the scientific report |
| Coherencia | alta | Logical order, one idea per paragraph |
| Cohesión | alta | Connectors, correference, discourse markers |
| Exposición de Resultados | alta | Results explanation, tables/figures |
| Referencias | alta | Source attribution, Harvard style |
| Adecuación y Gramática | media | Formal register, verbal nucleus |
| Formato y Ortografía | media | Cover page, formatting, spelling |

## PDF Viewer Layers

The PDF page is rendered as 3 stacked layers inside a `position-relative` container:

| Layer | z-index | Content |
|---|---|---|
| 1 — PDF canvas | auto | High-resolution `pdfjs` render at SCALE=1.5, displayed at max 700px wide |
| 2 — Text overlay | 5 | Absolutely-positioned `<span>` elements for text hitboxes (error highlights + user highlight mode) |
| 3 — Annotation canvas | 20 | Transparent `<canvas>` for freehand pen drawing + floating toolbar |

All three share the same container dimensions (`displayWidth` x `displayHeight`, capped at 700px wide with aspect ratio maintained).

## Annotation Modes

### Pen Mode
- Toggled by floating button in Layer 3
- Captures pointer events on the overlay `<canvas>`
- Draws red (`rgba(220, 38, 38, 0.85)`) freehand strokes at 2.5px width
- Strokes stored in context per page: `annotationStrokes[pageNumber]`
- Revert removes last stroke for the current page

### Highlight Mode
- Mutually exclusive with Pen mode (toggling one deactivates the other)
- Layer 3 sets `pointerEvents: 'none'` so clicks reach Layer 2
- Text spans become selectable hitboxes (`userSelect: 'text'`, `cursor: 'text'`)
- On `mouseup`, `window.getSelection()` captures bounding rects → stored as `annotationHighlights[pageNumber]`
- Rendered as semi-transparent overlay divs at z-index: 1
- Revert removes last highlight for the current page

### Auto-Highlight (Accepted Errors)
- When an error is accepted, the matching text in the PDF is highlighted with the error's category color
- Each of the 7 rubric categories has a distinct color (mapped in `PdfViewer.jsx` via `CATEGORY_COLORS`)
- Highlights are also recorded into `annotationHighlights` for export

## Export Pipeline (`pdfExport.js`)

`exportPdfWithAnnotations()`:
1. Loads original PDF with `pdf-lib` (write) + `pdfjs` (text content)
2. For each page:
   - Maps pen stroke display-coordinates → PDF native coordinates (proportional + Y-flip), draws red lines
   - Maps highlight rects → PDF coordinates, draws colored rectangles at 0.3 opacity
   - Finds accepted-error text positions via `pdfjs.getTextContent()`, draws category-colored highlights
3. Saves modified PDF and triggers download as `annotated_report_YYYY-MM-DD.pdf`

## AI Service (`aiService.js`)

- Uses **Groq API** (OpenAI-compatible, Llama 3.3 70B) via Vite proxy (`/groq-api` → `https://api.groq.com/openai`)
- `GROQ_API_KEY` must be set in `.env` (get free at: https://console.groq.com/keys)
- Two modes:
  - **`detectErrors()`** — JSON mode, returns structured error objects per page with rubric category
  - **`generatePerformanceAnalysis()`** — Markdown mode, produces comprehensive Spanish evaluation report
- Falls back to mock data if API call fails

## Project Structure

```
src/
├── main.jsx                     # entry point (Bootstrap + global CSS)
├── App.jsx                      # screen router
├── context/AppContext.jsx        # global state (reducer + session persistence)
├── components/
│   ├── Login/Login.jsx
│   ├── Upload/Upload.jsx
│   ├── Workspace/
│   │   ├── Workspace.jsx        # split layout (control + pdf + stats)
│   │   ├── PdfViewer.jsx        # PDF render + 3 layers + auto-highlight
│   │   ├── AnnotationCanvas.jsx # pen canvas + floating toolbar
│   │   ├── ControlPanel.jsx     # AI analysis trigger + error registry
│   │   ├── ErrorList.jsx        # error cards with accept/reject + category badges
│   │   ├── Pagination.jsx       # page navigation
│   │   └── ErrorStatsPanel.jsx  # stats bar chart + manual error entry
│   └── Summary/Summary.jsx      # metrics + AI analysis + PDF export
├── services/aiService.js        # Groq API client
├── utils/pdfExport.js           # PDF export with annotations
├── mock/api.js                  # mock API wrappers (falls back to AI service)
├── mock/data.js                 # rubric categories, credentials, evaluation template
└── styles/global.css            # custom styles
```

## Running (without Docker)

```bash
cp .env.example .env   # set your GROQ_API_KEY
npm install
npm run dev            # development server on port 3000
npm run build          # production build to dist/
npm run preview        # preview production build
npm run lint           # eslint
```
