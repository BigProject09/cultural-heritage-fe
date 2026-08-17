import { BrowserRouter, Routes, Route } from "react-router-dom";

import { DisassemblyProvider } from "./context/DisassemblyContext";
//첫 화면
import HomePage from "./pages/Home/HomePage";
import NoticePage from "./pages/Notice/NoticePage";
import NoticeDetailPage from "./pages/Notice/NoticeDetailPage";
import NoticeWritePage from "./pages/Notice/NoticeWritePage";
import LoginPage from "./pages/Auth/LoginPage";
import SignUpPage from "./pages/Auth/SignUpPage";
import WorkListPage from "./pages/WorkList/WorkListPage";
import BoardPage from "./pages/Board/BoardPage";
import BoardDetailPage from "./pages/Board/BoardDetailPage";
import BoardWritePage from "./pages/Board/BoardWritePage";
import ProjectDetailPage from "./pages/ProjectDetail/ProjectDetailPage";
import LegacyArtifactRedirect from "./components/routing/LegacyArtifactRedirect";
import ArtifactRouteSync from "./components/routing/ArtifactRouteSync";
import GuideFlowGuard from "./components/routing/GuideFlowGuard";
import Footer from "./components/common/Footer";

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
import GuideResultPage from "./pages/FlowRecommendationPage/GuideResultPage";
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

// 최종 통합 보고서
import FinalReportPage from "./pages/FinalReport/FinalReportPage";
import "./styles/HeritageWorkflow.css";

function App() {
  return (
    <BrowserRouter>
      <DisassemblyProvider>
        <Routes>
          {/* 홈페이지 */}
          <Route path="/" element={<HomePage />} />

          {/* 공지사항 */}
          <Route path="/notice" element={<NoticePage />} />
          <Route path="/notice/write" element={<NoticeWritePage />} />
          <Route path="/notice/:id" element={<NoticeDetailPage />} />

          {/* 로그인 */}
          <Route path="/login" element={<LoginPage />} />

          {/* 회원가입 */}
          <Route path="/signup" element={<SignUpPage />} />

          {/* 마이페이지 */}
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/mypage/profile" element={<ProfilePage />} />
          <Route path="/mypage/activity" element={<ActivityPage />} />
          <Route path="/mypage/projects" element={<ProjectPage />} />
          <Route path="/mypage/reports" element={<MyReportPage />} />
          <Route path="/mypage/reports/:id" element={<MyReportDetailPage />} />

          {/* 작업 리스트 */}
          <Route path="/worklist" element={<WorkListPage />} />

          {/* artifactId 중심 유물 워크스페이스 */}
          <Route path="/artifacts/new" element={<ArtifactRegisterPage />} />
          <Route path="/artifacts/:artifactId" element={<ArtifactRouteSync />}>
            <Route index element={<ProjectDetailPage />} />
            <Route path="guide" element={<FlowRecommendationPage />} />
            <Route path="guide/result" element={<GuideResultPage />} />
            <Route path="xray" element={<XrayPage />} />
            <Route path="visual" element={<VisualPage />} />
            <Route path="final-report" element={<FinalReportPage />} />

            {/* 복원 가이드 세부 공정: 이전 공정/세부단계 선진입 차단 */}
            <Route element={<GuideFlowGuard />}>
              <Route path="guide/disassembly" element={<DisassemblyPage />} />
              <Route
                path="guide/disassembly/checklist"
                element={<DisassemblyChecklistPage />}
              />
              <Route
                path="guide/disassembly/tool"
                element={<DisassemblyToolPage />}
              />
              <Route
                path="guide/disassembly/method"
                element={<DisassemblyMethodPage />}
              />
              <Route path="guide/cleaning" element={<CleaningPage />} />
              <Route
                path="guide/cleaning/method-select"
                element={<CleaningMethodSelectPage />}
              />
              <Route
                path="guide/cleaning/step"
                element={<CleaningStepPage />}
              />
              <Route
                path="guide/cleaning/drying"
                element={<CleaningDryingStepPage />}
              />
              <Route
                path="guide/strengthening"
                element={<StrengtheningPage />}
              />
              <Route
                path="guide/strengthening/material"
                element={<StrengtheningMaterialPage />}
              />
              <Route
                path="guide/strengthening/method"
                element={<StrengtheningMethodPage />}
              />
              <Route
                path="guide/strengthening/wetting"
                element={<StrengtheningWettingPage />}
              />
              <Route path="guide/bonding" element={<BondingPage />} />
              <Route
                path="guide/bonding/method"
                element={<BondingMethodPage />}
              />
              <Route
                path="guide/bonding/material"
                element={<BondingMaterialPage />}
              />
              <Route
                path="guide/bonding/work"
                element={<BondingWorkPage />}
              />
              <Route path="guide/restoration" element={<RestorationPage />} />
              <Route
                path="guide/restoration/method"
                element={<RestorationMethodPage />}
              />
              <Route
                path="guide/restoration/finishing"
                element={
                  <RestorationMethodPage
                    title="마감처리"
                    guideField="restorationFinishingGuide"
                    completedKey="restorationFinishing"
                    backPath="/restoration"
                  />
                }
              />
              <Route
                path="guide/restoration/material"
                element={<RestorationMaterialPage />}
              />
            </Route>

            {/* 구 복원 가이드 보고서 URL은 유물 워크스페이스로 복귀 */}
            <Route
              path="guide/post-record"
              element={<LegacyArtifactRedirect target="workspace" />}
            />
            <Route
              path="guide/report"
              element={<LegacyArtifactRedirect target="workspace" />}
            />
            <Route
              path="guide/complete"
              element={<LegacyArtifactRedirect target="workspace" />}
            />
          </Route>

          {/* 구 URL은 현재 선택된 artifactId의 새 URL로 이동 */}
          <Route
            path="/worklist/:id"
            element={<LegacyArtifactRedirect target="workspace" />}
          />
          <Route
            path="/workspace/:id"
            element={<LegacyArtifactRedirect target="workspace" />}
          />

          {/* 게시판 */}
          <Route path="/board" element={<BoardPage />} />

          <Route path="/board/write" element={<BoardWritePage />} />

          <Route path="/board/:id" element={<BoardDetailPage />} />

          {/* 유물 등록 */}
          <Route path="/artifact-register" element={<ArtifactRegisterPage />} />

          {/* AI Flow 추천 */}
          <Route
            path="/flow-recommendation"
            element={<LegacyArtifactRedirect moduleKey="guide" />}
          />

          {/* 처리 전 조사 */}
          <Route
            path="/pre-investigation"
            element={<LegacyArtifactRedirect target="workspace" />}
          />

          <Route
            path="/pre-investigation/xray"
            element={<LegacyArtifactRedirect moduleKey="xray" />}
          />

          <Route
            path="/pre-investigation/visual"
            element={<LegacyArtifactRedirect moduleKey="visual" />}
          />

          {/* 해체 */}
          <Route
            path="/disassembly"
            element={<LegacyArtifactRedirect stepKey="disassembly" />}
          />

          <Route
            path="/disassembly-checklist"
            element={
              <LegacyArtifactRedirect stepKey="disassembly/checklist" />
            }
          />

          <Route
            path="/disassembly-tool"
            element={<LegacyArtifactRedirect stepKey="disassembly/tool" />}
          />

          <Route
            path="/disassembly-method"
            element={<LegacyArtifactRedirect stepKey="disassembly/method" />}
          />

          {/* 세척 */}
          <Route
            path="/cleaning"
            element={<LegacyArtifactRedirect stepKey="cleaning" />}
          />

          <Route
            path="/cleaning-method-select"
            element={
              <LegacyArtifactRedirect stepKey="cleaning/method-select" />
            }
          />

          <Route
            path="/cleaning-step"
            element={<LegacyArtifactRedirect stepKey="cleaning/step" />}
          />

          <Route
            path="/cleaning-drying-step"
            element={<LegacyArtifactRedirect stepKey="cleaning/drying" />}
          />

          {/* 강화 처리 */}
          <Route
            path="/strengthening"
            element={<LegacyArtifactRedirect stepKey="strengthening" />}
          />

          <Route
            path="/strengthening-material"
            element={
              <LegacyArtifactRedirect stepKey="strengthening/material" />
            }
          />

          <Route
            path="/strengthening-method"
            element={
              <LegacyArtifactRedirect stepKey="strengthening/method" />
            }
          />

          <Route
            path="/strengthening-wetting"
            element={
              <LegacyArtifactRedirect stepKey="strengthening/wetting" />
            }
          />

          {/* 접합 */}
          <Route
            path="/bonding"
            element={<LegacyArtifactRedirect stepKey="bonding" />}
          />

          <Route
            path="/joining"
            element={<LegacyArtifactRedirect stepKey="bonding" />}
          />

          <Route
            path="/bonding-method"
            element={<LegacyArtifactRedirect stepKey="bonding/method" />}
          />

          <Route
            path="/bonding-material"
            element={<LegacyArtifactRedirect stepKey="bonding/material" />}
          />

          <Route
            path="/bonding-work"
            element={<LegacyArtifactRedirect stepKey="bonding/work" />}
          />

          {/* 복원 */}
          <Route
            path="/restoration"
            element={<LegacyArtifactRedirect stepKey="restoration" />}
          />

          <Route
            path="/restoration-method"
            element={
              <LegacyArtifactRedirect stepKey="restoration/method" />
            }
          />

          <Route
            path="/restoration-material"
            element={
              <LegacyArtifactRedirect stepKey="restoration/material" />
            }
          />

          <Route
            path="/restoration-finishing"
            element={
              <LegacyArtifactRedirect stepKey="restoration/finishing" />
            }
          />

          {/* 구 복원 가이드 보고서 URL */}
          <Route
            path="/post-record"
            element={<LegacyArtifactRedirect target="workspace" />}
          />

          <Route
            path="/report"
            element={<LegacyArtifactRedirect target="workspace" />}
          />

          <Route
            path="/report-complete"
            element={<LegacyArtifactRedirect target="workspace" />}
          />
        </Routes>

        <Footer />
      </DisassemblyProvider>
    </BrowserRouter>
  );
}

export default App;
