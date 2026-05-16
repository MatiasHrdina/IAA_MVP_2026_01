# TODO

## 1. Integrate Rubric (Rubrica Escritura Español.pdf)
- Replace the current mock error types with the error categories from the rubric
- Map rubric criteria to the error-detection pipeline (error types, severity levels, suggestions)
- Update `mock/data.js` error corpus and `mock/api.js` detection patterns accordingly

## 2. Lateral Error Statistics Bar
- Add a collapsible panel on the right side of the Workspace (or an overlay)
- Display a real-time chart/count of accepted errors by category (severity or rubric type)
- Accepted errors increment the counter automatically
- Allow manual add/remove of error entries so manual annotations (pen strokes, highlights) can be registered in the chart

## 3. AI Assistance with Free API
- Replace the current `simulatePromptSubmission` mock with a real API call to a free LLM provider
- The prompt should include context from the **current page**, **previous page**, and **next page** of the PDF
- Show results in the error registry as they do now

## 4. Visual Improvements
- Polish the UI: better typography, spacing, color consistency
- Improve the PDF viewer layout (zoom controls, better scroll behavior)
- Refine the floating annotation toolbar (icons, tooltips, grouping)
- Smooth transitions for mode toggling

## 5. Final AI Analysis Prompt
- Rewrite the AI analysis generation (`simulatePerformanceAnalysis` / `MOCK_EVALUATION_TEMPLATE`) to use all available data:
  - Accepted AI-detected errors
  - Rejected errors
  - User's manual annotations (pen strokes + highlights)
- Build a comprehensive prompt that includes the full correction history
- Replace the mock template with a real API call using this enriched prompt
