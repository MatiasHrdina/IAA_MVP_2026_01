# TODO — Progress

## ✅ 1. Integrate Rubric (Rúbrica Escritura Español.pdf)
- PDF moved to `assets/Rúbrica Escritura Español.pdf`
- Created `RUBRIC_CATEGORIES` in `mock/data.js` with 7 criteria from the PDF (5 alta, 2 media)
- Each criterion has: id, label, importance, description, and levels (óptimo/aceptable/insuficiente)
- Mock errors extended with `category` and `source` fields
- AI now categorizes errors directly according to rubric categories
- ErrorList shows rubric category badge on each error card
- `MOCK_EVALUATION_TEMPLATE` updated to use rubric categories in Spanish

## ✅ 2. Lateral Error Statistics Bar
- `ErrorStatsPanel.jsx` fully implemented as collapsible right panel
- Shows bar chart count per rubric category (accepted errors)
- Auto-updates when errors are accepted/rejected
- Manual entry form: select category + level (óptimo/aceptable/insuficiente) + optional note
- Remove button for manual entries
- Shows total accepted and page annotation counts
- Wired into `Workspace.jsx` layout next to PdfViewer
- CSS styles added to `global.css` (stats-panel, stat-chip, stats-bar, etc.)

## ✅ 3. AI Assistance with Free API (Groq)
- `src/services/aiService.js` uses **Groq API** (OpenAI-compatible, Llama 3 70B):
  - `detectErrors()` — system instruction + user prompt with prev/current/next page context + rubric
  - `generatePerformanceAnalysis()` — comprehensive analysis prompt
  - `queryGroq()` — calls Groq via Vite proxy (key stays server-side)
  - JSON mode (`response_format: { type: 'json_object' }`) for reliable error parsing
  - No regex JSON extraction needed — Groq outputs valid JSON directly
- `mock/api.js` falls back to mock data if Groq API call fails or key is not set
- Vite proxy `/groq-api` → `https://api.groq.com/openai`
- `.env` requires `GROQ_API_KEY` (get free at: https://console.groq.com/keys)

## 4. Visual Improvements — PENDING
- Polish the UI: better typography, spacing, color consistency
- Improve the PDF viewer layout (zoom controls, better scroll behavior)
- Refine the floating annotation toolbar (icons, tooltips, grouping)
- Smooth transitions for mode toggling

## ✅ 5. Final AI Analysis Prompt
- `buildAnalysisPrompt()` includes:
  - Accepted errors with rubric category + severity
  - Rejected errors
  - Manual annotations (pen strokes count + highlights count)
  - Distribution by rubric criterion and severity
- `Summary.jsx` now passes all data to `simulatePerformanceAnalysis`
- AI service produces structured Spanish evaluation report

## Setup
```bash
# 1. Get a free Groq API key: https://console.groq.com/keys
# 2. Create .env file:
cp .env.example .env
# 3. Add your key to .env:
GROQ_API_KEY=your_groq_api_key_here
```
