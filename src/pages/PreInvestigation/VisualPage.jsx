import { useNavigate, useParams } from "react-router-dom";
import ModulePageHeader from "../../components/common/ModulePageHeader/ModulePageHeader";
import SystemInfoFooter from "../../components/common/SystemInfoFooter";
import "./VisualPage.css";

export default function VisualPage() {
  const navigate = useNavigate();
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);

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
          artifactId={artifactId}
          currentLabel="육안 상태 조사"
          eyebrow="VISUAL INVESTIGATION"
          title="육안 상태 조사"
          description="조사 목적에 맞는 분석 기능을 선택해 진행하세요."
          tone="bronze"
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
                유물 표면의 이상영역을 탐지하고 손상 유형과 위치를 분석하여
                육안 상태 조사 결과를 제공합니다.
              </p>
              <ul>
                <li>표면 이상영역 탐지</li>
                <li>손상 유형·위치 분석</li>
                <li>조사 결과 및 근거 확인</li>
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
                도자기의 형태와 표면 문양을 분석하여 완전도·유약 상태·문양 및
                시대 정보를 확인합니다.
              </p>
              <ul>
                <li>형태·완전도 및 유약 상태 분석</li>
                <li>문양 후보 탐지 및 위치 확인</li>
                <li>시대 추정 및 등록 정보 비교</li>
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
          필요한 조사 기능을 선택해 각각의 분석 결과를 확인할 수 있습니다.
        </p>
      </div>

      <SystemInfoFooter />
    </main>
  );
}
