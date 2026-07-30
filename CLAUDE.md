# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm run dev       # start Vite dev server
npm run build     # production build
npm run lint      # eslint over the whole repo
npm run preview   # preview a production build locally
```

There is no test script/framework configured in this project.

The backend lives in the sibling directory `../cultural-heritage-be` (Gradle/Spring project with an `ai-services` module) and is expected to run on `http://localhost:8080`. The frontend has no proxy config — it talks to that origin directly via absolute URLs, so the backend must be running locally for any page that calls the API to work.

## Architecture

This is a single-page React app (Vite, React 19, react-router-dom v7, plain JS/JSX, no TypeScript) that walks a user through a multi-step cultural artifact conservation workflow, from artifact registration through an AI-recommended treatment "flow" to a final report.

### Workflow stages and routing

The domain workflow has a fixed sequence of stages, each with its own page group under `src/pages/`:

```
처리 전 조사 (PreInvestigation) → 해체 (Disassembly) → 세척 (Cleaning) →
강화 처리 (Strengthening) → 접합 (Bonding) → 복원 (Restoration) →
색 맞춤 (ColorMatching) → 처리 후 기록 (PostRecord)
```

- `src/App.jsx` registers every route flatly (no nested `<Route>` groups) — one path per page component, grouped visually by comment banners per stage.
- `src/data/flowData.js` defines `flowRoutes` (stage-name → path) plus `getNextStep`/`getPreviousStep` helpers that walk an "approved flow" array of `{ name, active }` steps. `src/utils/flowNavigation.js` re-implements the same next/previous-step logic plus `moveToNextStep`/`moveToPreviousStep` (which call `navigate` directly) — check both before adding new step-sequencing logic instead of introducing a third copy.
- The user's chosen stage sequence is decided on `FlowRecommendationPage` (toggle stages on/off) and passed forward via `navigate(path, { state: { approvedFlow } })`, not via context.

### Global workflow state: DisassemblyContext

`src/context/DisassemblyContext.jsx` is a single app-wide context (`DisassemblyProvider`, wrapped around the whole `<Routes>` tree in `App.jsx`) holding state for *every* stage, not just disassembly: `taskId`, `preInvestigation`, `cleaning`, `checklist`, `tools`, `methods`, `cleaningMethod`, `cleaningAnalysis`, `cleaningGuide`, `dryingGuide`, `strengtheningRecommendation`, `strengtheningGuide`, and a `completed` map with one boolean per step across all stages. Access it with `useDisassembly()`. When adding a new stage or sub-step, follow the existing pattern: add a piece of state, add its setter to the provider value, and add/reset a matching key in `completed` (both in the initial `useState` and in `resetCompleted`).

### Backend interaction: task start/resume + interrupts

The backend models the conservation workflow as a resumable task with an interrupt-driven flow (LangGraph-style):

- A `taskId` is generated client-side as `` `task-${Date.now()}` `` and stored in `DisassemblyContext`.
- `src/services/conservationGuideApi.js` exposes `startTask(taskId, data)` (`POST /tasks/:id/start`) and `resumeTask(taskId, data)` (`POST /tasks/:id/resume`), both built on the shared `src/services/api.js` axios instance (baseURL `http://localhost:8080`).
- Responses carry a `result.interrupt` object whose keys (`ai_checklist`, `cleaning_method`, `cleaning_analysis`, `cleaning_guide`, `drying_guide`, `ai_tools`, etc.) map to specific pieces of `DisassemblyContext` state — each stage page reads the interrupt key it cares about and calls the matching context setter, then resumes the task with the user's input (e.g. checked checklist IDs) when moving to the next step.
- Some pages call `resumeTask`/`startTask` from `conservationGuideApi.js`; others (e.g. `DisassemblyChecklistPage.jsx`) call `axios` directly against `http://localhost:8080/...` instead of going through `services/api.js`. Prefer routing new calls through `services/api.js` / `conservationGuideApi.js` rather than adding more raw `axios` calls, but be aware both patterns currently coexist.

### Artifact registration hand-off

`ArtifactRegisterPage` writes the registered artifact's data to `localStorage["artifactInfo"]`. `FlowRecommendationPage` reads it back out of `localStorage` (not context) on mount to kick off `startTask`. Keep this in mind if artifact data needs to flow into new pages — it's not currently in `DisassemblyContext`.

### Page/component conventions

- Each page lives in `src/pages/<Stage>/<Name>Page.jsx` with a co-located `<Name>Page.css` (plain CSS, no CSS modules/Tailwind/styled-components).
- Shared UI lives in `src/components/common/` — currently `StepSidebar` (renders a stage list with completed/current/upcoming status) and `ProgressNavigator`.
- Static reference data (board posts, notices, flow step metadata) lives in `src/data/*.js` as plain exported objects/arrays.
