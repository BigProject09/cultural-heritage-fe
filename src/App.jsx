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
import MyReportDetailPage from "./pages/MyPage/MyReportDetailPage";

// X-RAY 분석/육안 상태 조사
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

// 세척
import CleaningPage from "./pages/Cleaning/CleaningPage";
import CleaningMethodSelectPage from "./pages/Cleaning/CleaningMethodSelectPage";
import CleaningStepPage from "./pages/Cleaning/CleaningStepPage";
import CleaningDryingStepPage from "./pages/Cleaning/CleaningDryingStepPage";

// 강화 처리
import StrengtheningPage from "./pages/Strengthening/StrengtheningPage";
import StrengtheningMethodPage from "./pages/Strengthening/StrengtheningMethodPage";
import StrengtheningWettingPage from "./pages/Strengthening/StrengtheningWettingPage";
import StrengtheningMaterialPage from "./pages/Strengthening/StrengtheningMaterialPage";

// 접합
import BondingPage from "./pages/Bonding/BondingPage";
import BondingMethodPage from "./pages/Bonding/BondingMethodPage";
import BondingMaterialPage from "./pages/Bonding/BondingMaterialPage";
import BondingWorkPage from "./pages/Bonding/BondingWorkPage";

//복원
import RestorationPage from "./pages/Restoration/RestorationPage";
import RestorationMethodPage from "./pages/Restoration/RestorationMethodPage";
import RestorationMaterialPage from "./pages/Restoration/RestorationMaterialPage";

// 보고서 생성
import PostRecordPage from "./pages/PostRecord/PostRecordPage";
import ReportPage from "./pages/PostRecord/ReportPage";
import ReportCompletePage from "./pages/PostRecord/ReportCompletePage";
import "./styles/HeritageWorkflow.css";

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
          <Route path="/mypage/reports/:id" element={<MyReportDetailPage />} />
          {/* 홈페이지 */}
          <Route path="/" element={<HomePage />} />

          {/* 공지사항 */}
          <Route path="/notice" element={<NoticePage />} />

          {/* 로그인 */}
          <Route path="/login" element={<LoginPage />} />

          {/* 회원가입 */}
          <Route path="/signup" element={<SignUpPage />} />

          {/* 마이페이지 */}
          <Route path="/mypage" element={<MyPage />} />

          {/* 작업 리스트 */}
          <Route path="/worklist" element={<WorkListPage />} />

          {/* 프로젝트 상세 */}
          <Route path="/worklist/:id" element={<ProjectDetailPage />} />
          <Route path="/workspace/:id" element={<ProjectDetailPage />} />

          {/* 게시판 */}
          <Route path="/board" element={<BoardPage />} />

          <Route path="/board/:id" element={<BoardDetailPage />} />

          {/* 유물 등록 */}
          <Route path="/artifact-register" element={<ArtifactRegisterPage />} />

          {/* AI Flow 추천 */}
          <Route
            path="/flow-recommendation"
            element={<FlowRecommendationPage />}
          />

          {/* X-RAY 분석/육안 상태 조사 */}
          <Route path="/pre-investigation" element={<PreInvestigationPage />} />

          <Route path="/pre-investigation/xray" element={<XrayPage />} />

          <Route path="/pre-investigation/visual" element={<VisualPage />} />

          {/* 해체 */}
          <Route path="/disassembly" element={<DisassemblyPage />} />

          <Route
            path="/disassembly-checklist"
            element={<DisassemblyChecklistPage />}
          />

          <Route path="/disassembly-tool" element={<DisassemblyToolPage />} />

          <Route
            path="/disassembly-method"
            element={<DisassemblyMethodPage />}
          />

          {/* 세척 */}
          <Route path="/cleaning" element={<CleaningPage />} />

          <Route
            path="/cleaning-method-select"
            element={<CleaningMethodSelectPage />}
          />

          <Route path="/cleaning-step" element={<CleaningStepPage />} />

          <Route
            path="/cleaning-drying-step"
            element={<CleaningDryingStepPage />}
          />

          {/* 강화 처리 */}
          <Route path="/strengthening" element={<StrengtheningPage />} />

          <Route
            path="/strengthening-material"
            element={<StrengtheningMaterialPage />}
          />

          <Route
            path="/strengthening-method"
            element={<StrengtheningMethodPage />}
          />

          <Route
            path="/strengthening-wetting"
            element={<StrengtheningWettingPage />}
          />

          {/* 접합 */}
          <Route path="/bonding" element={<BondingPage />} />

          <Route path="/joining" element={<BondingPage />} />

          <Route path="/bonding-method" element={<BondingMethodPage />} />

          <Route path="/bonding-material" element={<BondingMaterialPage />} />

          <Route path="/bonding-work" element={<BondingWorkPage />} />

          {/* 복원 */}
          <Route path="/restoration" element={<RestorationPage />} />

          <Route
            path="/restoration-method"
            element={<RestorationMethodPage />}
          />

          <Route
            path="/restoration-material"
            element={<RestorationMaterialPage />}
          />

          {/* 보고서 생성 */}
          <Route path="/post-record" element={<PostRecordPage />} />

          <Route path="/report" element={<ReportPage />} />

          <Route path="/report-complete" element={<ReportCompletePage />} />
        </Routes>
      </DisassemblyProvider>
    </BrowserRouter>
  );
}

export default App;
