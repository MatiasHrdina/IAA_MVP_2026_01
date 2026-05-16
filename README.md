# Academic Correction Tool

AI-assisted academic report correction platform. Upload a PDF, query linguistic patterns, accept/reject AI-detected errors, manually annotate (pen + highlight) PDF pages, and export the annotated report.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 18 |
| Build | Vite 5 |
| Styling | Bootstrap 5 |
| PDF render | `pdfjs-dist` (via `react-pdf`) |
| PDF export | `pdf-lib` |
| State | `useReducer` + context |

## App Flow

```
Login → Upload PDF → Workspace → Summary/Export
```

### Screens

- **Login** — hardcoded mock credentials: `professor@academic.edu` / `correct2024`
- **Upload** — selects a PDF, extracts page count, loads mock error corpus
- **Workspace** — main interface (split layout):
  - **Left panel** (38%): AI query input, error registry per page, accept/reject buttons, pagination
  - **Right panel** (62%): PDF viewer with annotation overlay
- **Summary** — severity distribution, manual annotation count, AI performance analysis, **"Make Report"** export

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
- Rendered as semi-transparent red overlay divs at z-index: 1
- Revert removes last highlight for the current page

## Export Pipeline (`pdfExport.js`)

`exportPdfWithAnnotations()`:
1. Loads original PDF with `pdf-lib` (write) + `pdfjs` (text content)
2. For each page:
   - Maps pen stroke display-coordinates → PDF native coordinates (proportional + Y-flip), draws red lines
   - Maps highlight rects → PDF coordinates, draws yellow rectangles at 0.3 opacity
   - Finds accepted-error text positions via `pdfjs.getTextContent()`, draws yellow highlights
3. Saves modified PDF and triggers download

## Running

```bash
npm install
npm run dev      # development server on port 3000
npm run build    # production build
npm run preview  # preview production build
```

## Project Structure

```
src/
├── App.jsx                     # screen router
├── context/AppContext.jsx       # global state (reducer + session persistence)
├── components/
│   ├── Login/Login.jsx
│   ├── Upload/Upload.jsx
│   ├── Workspace/
│   │   ├── Workspace.jsx        # split layout
│   │   ├── PdfViewer.jsx        # PDF render + 3 layers + highlight capture
│   │   ├── AnnotationCanvas.jsx # pen canvas + floating toolbar
│   │   ├── ControlPanel.jsx     # AI query input + error registry
│   │   ├── ErrorList.jsx        # error cards with accept/reject
│   │   └── Pagination.jsx       # page navigation
│   └── Summary/Summary.jsx      # analysis + export
├── utils/pdfExport.js           # PDF export with annotations
├── mock/api.js                  # simulated AI query + analysis
├── mock/data.js                 # mock credentials, errors, evaluation template
└── styles/global.css
```
