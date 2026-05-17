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

## ✅ 3. AI Assistance with Free API (Hugging Face)
- Created `src/services/aiService.js` with:
  - `detectErrors()` — builds prompt with prev/current/next page context + rubric
  - `generatePerformanceAnalysis()` — builds comprehensive analysis prompt
  - `queryHuggingFace()` — calls Mistral-7B-Instruct via HF Inference API
  - Handles JSON parsing from AI responses
- `mock/api.js` updated: calls real AI if `VITE_HF_TOKEN` is set, falls back to mock
- `ControlPanel.jsx` extracts PDF page text via pdfjs for AI context
- `.env.example` created for configuration

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
# 1. Get a free Hugging Face token: https://huggingface.co/settings/tokens
# 2. Create .env file:
cp .env.example .env
# 3. Add your token to .env:
VITE_HF_TOKEN=hf_your_token_here
```
