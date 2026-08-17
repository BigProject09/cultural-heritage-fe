import { useNavigate } from "react-router-dom";
import { getActiveArtifactId } from "../../data/workspaceProjects";
import { getArtifactRoute } from "../../utils/artifactRoutes";
import "./GuideNavigation.css";

/**
 * 보존가이드 공통 위치 네비게이션.
 *
 * 홈 / 유물 워크스페이스는 기존 공통 화면을 그대로 사용하고,
 * 보존가이드 내부 화면에서만 현재 위치를 덧붙인다.
 */
function GuideNavigation({ currentLabel }) {
  const navigate = useNavigate();
  const artifactId = getActiveArtifactId();
  const hasArtifact = Boolean(artifactId);

  const goWorkspace = () => {
    if (!hasArtifact) return;
    navigate(getArtifactRoute(artifactId));
  };


  return (
    <nav className="guide-breadcrumb" aria-label="현재 위치">
      <button type="button" onClick={() => navigate("/")}>
        홈
      </button>

      <span aria-hidden="true">/</span>

      <button type="button" onClick={goWorkspace} disabled={!hasArtifact}>
        유물 워크스페이스
      </button>

      <span aria-hidden="true">/</span>

      <strong>
        {currentLabel ? `보존 가이드 · ${currentLabel}` : "보존 가이드"}
      </strong>
    </nav>
  );
}

export default GuideNavigation;
