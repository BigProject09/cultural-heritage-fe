import { BrowserRouter, Routes, Route } from "react-router-dom";


import { DisassemblyProvider } from "./context/DisassemblyContext";
//첫 화면
import HomePage from "./pages/Home/HomePage";
import NoticePage from "./pages/Notice/NoticePage";
import LoginPage from "./pages/Auth/LoginPage";
import SignUpPage from "./pages/Auth/SignUpPage";
import WorkListPage from "./pages/WorkList/WorkListPage";
import BoardPage from "./pages/Board/BoardPage";
import BoardDetailPage from "./pages/Board/BoardDetailPage";
import ProjectDetailPage from "./pages/ProjectDetail/ProjectDetailPage";

//마이페이지
import MyPage from "./pages/MyPage/MyPage";
import ProfilePage from "./pages/MyPage/ProfilePage";
import ActivityPage from "./pages/MyPage/ActivityPage";
import ProjectPage from "./pages/MyPage/ProjectPage";
import MyReportPage from "./pages/MyPage/MyReportPage";

//처리 전 조사
import ArtifactRegisterPage from "./pages/ArtifactRegister/ArtifactRegisterPage";
import FlowRecommendationPage from "./pages/FlowRecommendationPage/FlowRecommendationPage";
import PreInvestigationPage from "./pages/PreInvestigation/PreInvestigationPage";
import XrayPage from "./pages/PreInvestigation/XrayPage";

// 해체
import VisualPage from "./pages/PreInvestigation/VisualPage";
import DisassemblyPage from "./pages/Disassembly/DisassemblyPage";
import DisassemblyChecklistPage from "./pages/Disassembly/DisassemblyChecklistPage";
import DisassemblyToolPage from "./pages/Disassembly/DisassemblyToolPage";
import DisassemblyMethodPage from "./pages/Disassembly/DisassemblyMethodPage";
import DisassemblyPostPage from "./pages/Disassembly/DisassemblyPostPage";

// 세척
import CleaningPage from "./pages/Cleaning/CleaningPage";
import CleaningMethodSelectPage from "./pages/Cleaning/CleaningMethodSelectPage";
import CleaningStepPage from "./pages/Cleaning/CleaningStepPage";
import CleaningDryingStepPage from "./pages/Cleaning/CleaningDryingStepPage";
import CleaningPostPage from "./pages/Cleaning/CleaningPostPage";

// 강화 처리
import StrengtheningPage from "./pages/Strengthening/StrengtheningPage";
import StrengtheningMethodPage from "./pages/Strengthening/StrengtheningMethodPage";
import StrengtheningMaterialPage from "./pages/Strengthening/StrengtheningMaterialPage";
import StrengtheningWorkPage from "./pages/Strengthening/StrengtheningWorkPage";
import StrengtheningPostPage from "./pages/Strengthening/StrengtheningPostPage";

// 접합
import JoiningPage from "./pages/Joining/JoiningPage";
import JoiningMethodPage from "./pages/Joining/JoiningMethodPage";
import JoiningMaterialPage from "./pages/Joining/JoiningMaterialPage";
import JoiningWorkPage from "./pages/Joining/JoiningWorkPage";
import JoiningPostPage from "./pages/Joining/JoiningPostPage";

//복원
import RestorationPage from "./pages/Restoration/RestorationPage";
import RestorationMethodPage from "./pages/Restoration/RestorationMethodPage";
import RestorationMaterialPage from "./pages/Restoration/RestorationMaterialPage";
import RestorationWorkPage from "./pages/Restoration/RestorationWorkPage";
import RestorationPostPage from "./pages/Restoration/RestorationPostPage";

// 색 맞춤
import ColorMatchingPage from "./pages/ColorMatching/ColorMatchingPage";
import ColorMatchingMethodPage from "./pages/ColorMatching/ColorMatchingMethodPage";
import ColorMatchingMaterialPage from "./pages/ColorMatching/ColorMatchingMaterialPage";
import ColorMatchingWorkPage from "./pages/ColorMatching/ColorMatchingWorkPage";
import ColorMatchingPostPage from "./pages/ColorMatching/ColorMatchingPostPage";

// 처리 후 기록
import PostRecordPage from "./pages/PostRecord/PostRecordPage";
import ReportPage from "./pages/PostRecord/ReportPage";
import ReportCompletePage from "./pages/PostRecord/ReportCompletePage";

function App() {
  return (
    <BrowserRouter>
      <DisassemblyProvider>
        <Routes>
<Route path="/mypage" element={<MyPage />} />
<Route path="/mypage/profile" element={<ProfilePage />} />
<Route path="/mypage/activity" element={<ActivityPage />} />
<Route path="/mypage/projects" element={<ProjectPage />} />
<Route path="/mypage/reports" element={<MyReportPage />} />
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

          {/* 마이페이지 */}
          <Route
            path="/mypage"
            element={<MyPage />}
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

          <Route
            path="/disassembly-post"
            element={<DisassemblyPostPage />}
          />

          {/* 세척 */}
          <Route path="/cleaning" element={<CleaningPage />} />

          <Route
            path="/cleaning-method-select"
            element={<CleaningMethodSelectPage />}
          />

          <Route
            path="/cleaning-step"
            element={<CleaningStepPage />}
          />

          <Route
            path="/cleaning-drying-step"
            element={<CleaningDryingStepPage />}
          />

          <Route
            path="/cleaning-post"
            element={<CleaningPostPage />}
          />

          {/* 강화 처리 */}
          <Route
            path="/strengthening"
            element={<StrengtheningPage />}
          />

          <Route
            path="/strengthening-method"
            element={<StrengtheningMethodPage />}
          />

          <Route
            path="/strengthening-material"
            element={<StrengtheningMaterialPage />}
          />

          <Route
            path="/strengthening-work"
            element={<StrengtheningWorkPage />}
          />

          <Route
            path="/strengthening-post"
            element={<StrengtheningPostPage />}
          />

          {/* 접합 */}
          <Route
            path="/joining"
            element={<JoiningPage />}
          />

          <Route
            path="/joining-method"
            element={<JoiningMethodPage />}
          />

          <Route
            path="/joining-material"
            element={<JoiningMaterialPage />}
          />

          <Route
            path="/joining-work"
            element={<JoiningWorkPage />}
          />

          <Route
            path="/joining-post"
            element={<JoiningPostPage />}
          />

          {/* 복원 */}
          <Route
            path="/restoration"
            element={<RestorationPage />}
          />

          <Route
            path="/restoration-method"
            element={<RestorationMethodPage />}
          />

          <Route
            path="/restoration-material"
            element={<RestorationMaterialPage />}
          />

          <Route
            path="/restoration-work"
            element={<RestorationWorkPage />}
          />

          <Route
            path="/restoration-post"
            element={<RestorationPostPage />}
          />

          {/* 색 맞춤 */}
          <Route
            path="/color-matching"
            element={<ColorMatchingPage />}
          />

          <Route
            path="/color-matching-method"
            element={<ColorMatchingMethodPage />}
          />

          <Route
            path="/color-matching-material"
            element={<ColorMatchingMaterialPage />}
          />

          <Route
            path="/color-matching-work"
            element={<ColorMatchingWorkPage />}
          />

          <Route
            path="/color-matching-post"
            element={<ColorMatchingPostPage />}
          />

          {/* 처리 후 기록 */}
          <Route
            path="/post-record"
            element={<PostRecordPage />}
          />

          <Route
            path="/report"
            element={<ReportPage />}
          />

          <Route
            path="/report-complete"
            element={<ReportCompletePage />}
          />

        </Routes>
      </DisassemblyProvider>
    </BrowserRouter>
  );
}

export default App;