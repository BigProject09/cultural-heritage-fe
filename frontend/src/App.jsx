import { BrowserRouter, Routes, Route } from "react-router-dom";

import { DisassemblyProvider } from "./context/DisassemblyContext";

import HomePage from "./pages/Home/HomePage";
import NoticePage from "./pages/Notice/NoticePage";
import LoginPage from "./pages/Auth/LoginPage";
import SignUpPage from "./pages/Auth/SignUpPage";
import WorkListPage from "./pages/WorkList/WorkListPage";
import BoardPage from "./pages/Board/BoardPage";
import BoardDetailPage from "./pages/Board/BoardDetailPage";
import ProjectDetailPage from "./pages/ProjectDetail/ProjectDetailPage";

import ArtifactRegisterPage from "./pages/ArtifactRegister/ArtifactRegisterPage";
import FlowRecommendationPage from "./pages/FlowRecommendationPage/FlowRecommendationPage";
import PreInvestigationPage from "./pages/PreInvestigation/PreInvestigationPage";
import XrayPage from "./pages/PreInvestigation/XrayPage";
import VisualPage from "./pages/PreInvestigation/VisualPage";
import DisassemblyPage from "./pages/Disassembly/DisassemblyPage";
import DisassemblyChecklistPage from "./pages/Disassembly/DisassemblyChecklistPage";
import DisassemblyToolPage from "./pages/Disassembly/DisassemblyToolPage";
import DisassemblyMethodPage from "./pages/Disassembly/DisassemblyMethodPage";
import CleaningPage from "./pages/Cleaning/CleaningPage";
import StrengtheningPage from "./pages/Strengthening/StrengtheningPage";

function App() {
  return (
    <BrowserRouter>
      <DisassemblyProvider>
        <Routes>

          {/* 홈페이지 */}
          <Route
            path="/"
            element={<HomePage />}
          />

          {/* 공지사항 */}
          <Route
            path="/notice"
            element={<NoticePage />}
          />

          {/* 로그인 */}
          <Route
            path="/login"
            element={<LoginPage />}
          />

          {/* 회원가입 */}
          <Route
            path="/signup"
            element={<SignUpPage />}
          />

          {/* 작업 리스트 */}
          <Route
            path="/worklist"
            element={<WorkListPage />}
          />

          {/* 프로젝트 상세 */}
          <Route
            path="/worklist/:id"
            element={<ProjectDetailPage />}
          />

          {/* 게시판 */}
          <Route
            path="/board"
            element={<BoardPage />}
          />

          <Route
            path="/board/:id"
            element={<BoardDetailPage />}
          />

          {/* 유물 등록 */}
          <Route
            path="/artifact-register"
            element={<ArtifactRegisterPage />}
          />

          {/* AI Flow 추천 */}
          <Route
            path="/flow-recommendation"
            element={<FlowRecommendationPage />}
          />

          {/* 처리 전 조사 */}
          <Route
            path="/pre-investigation"
            element={<PreInvestigationPage />}
          />

          <Route
            path="/pre-investigation/xray"
            element={<XrayPage />}
          />

          <Route
            path="/pre-investigation/visual"
            element={<VisualPage />}
          />

          {/* 해체 */}
          <Route
            path="/disassembly"
            element={<DisassemblyPage />}
          />

          <Route
            path="/disassembly-checklist"
            element={<DisassemblyChecklistPage />}
          />

          <Route
            path="/disassembly-tool"
            element={<DisassemblyToolPage />}
          />

          <Route
            path="/disassembly-method"
            element={<DisassemblyMethodPage />}
          />

          {/* 세척 */}
          <Route
            path="/cleaning"
            element={<CleaningPage />}
          />

          {/* 강화 처리 */}
          <Route
  path="/strengthening"
  element={<StrengtheningPage />}
/>

        </Routes>
      </DisassemblyProvider>
    </BrowserRouter>
  );
}

export default App;