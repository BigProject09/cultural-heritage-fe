import "./VisualPage.css";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MODULE_STATUS,
  getWorkspaceProject,
  markWorkspaceModule,
  selectWorkspaceProject,
} from "../../data/workspaceProjects";
import { getArtifactRoute } from "../../utils/artifactRoutes";

function VisualPage() {
  const navigate = useNavigate();
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);
  const [artifactInfo, setArtifactInfo] = useState(() =>
    JSON.parse(localStorage.getItem("artifactInfo") || "{}"),
  );

  useEffect(() => {
    if (!artifactId) return undefined;

    const controller = new AbortController();
    getWorkspaceProject(artifactId, { signal: controller.signal })
      .then((project) => {
        setArtifactInfo(selectWorkspaceProject(project));
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          window.alert(`유물 정보 조회 실패: ${error.message}`);
        }
      });

    return () => controller.abort();
  }, [artifactId]);

  const handleComplete = async () => {
    if (artifactId) {
      try {
        await markWorkspaceModule(
          artifactId,
          "visual",
          MODULE_STATUS.DONE,
        );
      } catch (error) {
        window.alert(`육안 조사 상태 저장 실패: ${error.message}`);
        return;
      }
    }

    navigate(getArtifactRoute(artifactId));
  };

  return (
    <div className="visual-page">
      <div className="visual-container">
        <nav className="visual-breadcrumb" aria-label="현재 위치">
          <button type="button" onClick={() => navigate(-1)}>
            유물 워크스페이스
          </button>
          <span>/</span>
          <strong>육안 상태 조사</strong>
        </nav>

        <header className="visual-header">
          <div>
            <span className="visual-eyebrow">INDEPENDENT VISUAL MODULE</span>
            <h1 className="visual-title">육안 상태 조사</h1>
            <p>표면 손상과 오염 상태를 확인하고 전문가 검토를 완료합니다.</p>
          </div>
          <span className="visual-status">AI 분석 초안</span>
        </header>

        <section className="visual-artifact-summary">
          <div>
            <span>조사 대상</span>
            <strong>{artifactInfo.name || "유물 정보 없음"}</strong>
          </div>
          <div>
            <span>관리번호</span>
            <strong>{artifactInfo.artifactId || "정보 없음"}</strong>
          </div>
          <div>
            <span>재질</span>
            <strong>{artifactInfo.material || "정보 없음"}</strong>
          </div>
          <div>
            <span>시대</span>
            <strong>
              {artifactInfo.period || artifactInfo.era || "정보 없음"}
            </strong>
          </div>
        </section>

        <div className="visual-result-layout">
          <section className="result-card">
            <div className="visual-section-heading">
              <div>
                <span>ANALYSIS 01</span>
                <h2>AI 분석 결과</h2>
              </div>
              <small>3개 항목</small>
            </div>

            <div className="result-item">
              <span className="result-label">표면 균열</span>
              <span className="result-value">경미</span>
            </div>

            <div className="result-item">
              <span className="result-label">오염도</span>
              <span className="result-value">보통</span>
            </div>

            <div className="result-item">
              <span className="result-label">결손 여부</span>
              <span className="result-value">없음</span>
            </div>
          </section>

          <aside className="visual-review-card">
            <span className="visual-review-index">REVIEW NOTE</span>
            <h2>전문가 검수 안내</h2>
            <p>
              AI 결과는 조사 초안입니다. 실제 표면 상태와 촬영 조건을 함께
              확인한 뒤 조사 결과를 확정하세요.
            </p>
            <ul>
              <li>균열의 위치와 진행 방향 확인</li>
              <li>표면 이물질과 부식 생성물 구분</li>
              <li>결손부 및 기존 보수 흔적 확인</li>
            </ul>
          </aside>
        </div>

        <footer className="complete-area">
          <p>완료하면 현재 유물의 육안 조사 상태가 저장됩니다.</p>
          <button className="complete-btn" onClick={handleComplete}>
            육안 조사 완료
          </button>
        </footer>
      </div>
    </div>
  );
}

export default VisualPage;
