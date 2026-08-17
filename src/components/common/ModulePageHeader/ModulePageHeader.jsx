import { useNavigate } from "react-router-dom";
import { getArtifactRoute } from "../../../utils/artifactRoutes";
import "./ModulePageHeader.css";

/**
 * 독립 분석/가이드 모듈의 공통 상단 영역.
 *
 * 페이지마다 달랐던 breadcrumb, eyebrow, 제목, 설명 배치를 동일하게 유지한다.
 * 우측 상태/버튼은 rightContent로 넘겨 각 모듈 기능은 그대로 보존한다.
 */
function ModulePageHeader({
  artifactId,
  currentLabel,
  eyebrow,
  title,
  description,
  tone = "blue",
  rightContent = null,
}) {
  const navigate = useNavigate();

  return (
    <div className={`module-page-header-block module-page-header-${tone}`}>
      <nav className="module-page-breadcrumb" aria-label="현재 위치">
        <button type="button" onClick={() => navigate("/")}>
          홈
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => navigate(getArtifactRoute(artifactId))}
        >
          유물 워크스페이스
        </button>
        <span>/</span>
        <strong>{currentLabel}</strong>
      </nav>

      <header className="module-page-header">
        <div className="module-page-heading">
          {eyebrow && <span className="module-page-eyebrow">{eyebrow}</span>}
          <h1 className="module-page-title">{title}</h1>
          {description && (
            <p className="module-page-description">{description}</p>
          )}
        </div>

        {rightContent && (
          <div className="module-page-header-action">{rightContent}</div>
        )}
      </header>
    </div>
  );
}

export default ModulePageHeader;
