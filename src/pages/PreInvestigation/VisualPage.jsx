import { useNavigate, useParams } from "react-router-dom";
import ModulePageHeader from "../../components/common/ModulePageHeader/ModulePageHeader";
import SystemInfoFooter from "../../components/common/SystemInfoFooter";
import { getArtifactRoute } from "../../utils/artifactRoutes";
import "./VisualPage.css";

export default function VisualPage() {
  const navigate = useNavigate();
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);

  const goToWorkspace = () => {
    navigate(getArtifactRoute(artifactId));
  };

  const goToVca = () => {
    navigate(`/artifacts/${encodeURIComponent(artifactId)}/visual/vca`);
  };

  const goToPottery = () => {
    navigate(`/artifacts/${encodeURIComponent(artifactId)}/visual/pottery`);
  };

  return (
    <main className="visual-select-page">
      <div className="visual-select-container">
        <ModulePageHeader
          eyebrow="VISUAL INVESTIGATION"
          title="육안 상태 조사"
          description="조사 목적에 맞는 분석 기능을 선택해 진행하세요."
          onBack={goToWorkspace}
        />

        <section
          className="visual-select-intro"
          aria-labelledby="visual-select-title"
        >
          <span>육안 상태 조사 기능 선택</span>
          <h2 id="visual-select-title">
            두 분석은 서로 독립적으로 진행할 수 있습니다.
          </h2>
          <p>
            육안 상태 조사와 문양 기반 상태 조사는 순서와 관계없이 필요한 기능부터
            선택해 진행할 수 있습니다.
          </p>
        </section>

        <section className="visual-select-grid" aria-label="육안 상태 조사 기능">
          <article className="visual-select-card">
            <div className="visual-select-card-index">01</div>
            <div className="visual-select-card-body">
              <span className="visual-select-card-eyebrow">VCA</span>
              <h3>육안 상태 조사</h3>
              <p>
                다중 이미지 기반 특이점 탐지, 단계별 분석 진행상태, RAG 근거와
                조사 보고서를 확인합니다.
              </p>
              <ul>
                <li>다중 이미지 분석</li>
                <li>Finding 상세 확인</li>
                <li>RAG 근거 및 Report/PDF</li>
              </ul>
            </div>
            <button
              type="button"
              className="visual-select-button"
              onClick={goToVca}
            >
              육안 상태 조사 시작
            </button>
          </article>

          <article className="visual-select-card">
            <div className="visual-select-card-index">02</div>
            <div className="visual-select-card-body">
              <span className="visual-select-card-eyebrow">POTTERY</span>
              <h3>문양 기반 상태 조사</h3>
              <p>
                도자기 형태와 문양을 분석하고, 서버에 저장된 비동기 Job 상태와
                결과를 재진입 시에도 이어서 확인합니다.
              </p>
              <ul>
                <li>문양 및 형태 분석</li>
                <li>비동기 Job 상태 관리</li>
                <li>새로고침·재진입 결과 복구</li>
              </ul>
            </div>
            <button
              type="button"
              className="visual-select-button"
              onClick={goToPottery}
            >
              문양 기반 상태 조사 시작
            </button>
          </article>
        </section>

        <p className="visual-select-note">
          두 기능의 실행 상태와 결과는 각각 독립적으로 저장됩니다.
        </p>
      </div>

      <SystemInfoFooter />
    </main>
  );
}
