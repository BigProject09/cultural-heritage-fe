import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PostRecordPage.css";
import { useDisassembly } from "../../context/useDisassembly";

function PostRecordPage() {
  const navigate = useNavigate();

  const [futureCare, setFutureCare] = useState(
    "직사광선 및 고습 환경을 피하고 정기적인 상태 점검을 권장한다.",
  );

  const {
    completed,
    selectedTools,
    cleaningMethod,
    cleaningSelection,
    strengtheningRecommendation,
    strengtheningChoice,
    colorChangeAnalysis,
    bondingAdhesive,
    bondingChoice,
    restorationMaterial,
    restorationChoice,
  } = useDisassembly();

  // AI 복원 결과 요약: 실제로 완료된 단계의 AI 분석/추천 사유를 모아서 구성
  const summary = [];

  if (completed.cleaningPost && cleaningMethod?.ai_analysis?.reason) {
    summary.push(`세척: ${cleaningMethod.ai_analysis.reason}`);
  }

  if (completed.strengtheningPost) {
    if (strengtheningRecommendation?.reason) {
      summary.push(`강화 처리: ${strengtheningRecommendation.reason}`);
    }
    if (colorChangeAnalysis?.description) {
      summary.push(`습윤 테스트: ${colorChangeAnalysis.description}`);
    }
  }

  if (completed.bondingPost && bondingAdhesive?.reason) {
    summary.push(`접합: ${bondingAdhesive.reason}`);
  }

  if (completed.restorationPost && restorationMaterial?.reason) {
    summary.push(`복원: ${restorationMaterial.reason}`);
  }

  // 적용된 복원 방법: 사용자가 각 단계에서 실제로 선택한 값
  const methods = [];

  if (completed.cleaningMethod) {
    const parts = [];
    if (cleaningSelection.usePhysical) parts.push("물리적 세척");
    if (cleaningSelection.useChemical) parts.push("화학적 세척");
    if (parts.length > 0) methods.push(parts.join(" + "));
  }

  if (completed.strengtheningMaterial && strengtheningChoice.agent) {
    methods.push(
      `${strengtheningChoice.agent}(${strengtheningChoice.solvent}) 강화 처리`,
    );
  }

  if (completed.bondingMaterial && bondingChoice.adhesive) {
    methods.push(`${bondingChoice.adhesive} 접합`);
  }

  if (completed.restorationMaterial && restorationChoice.material) {
    methods.push(`${restorationChoice.material} 복원`);
  }

  return (
    <div className="post-record-page">

      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() => navigate(-1)}
        >
          ← 이전
        </button>

        <div className="logo">VORA</div>

        <button
          className="nav-btn"
          onClick={() => {
            navigate("/report", {
              state: { summary, methods, selectedTools, futureCare },
            });
          }}
        >
        보고서 생성
        </button>
      </div>

      <h1>AI 보고서 초안</h1>

      <div className="image-section">

        <div className="image-card">
          <h3>복원 전</h3>

          <div className="dummy-image">
            이미지
          </div>
        </div>

        <div className="image-card">
          <h3>복원 후</h3>

          <div className="dummy-image">
            이미지
          </div>
        </div>

      </div>

      <div className="report-card">

        <h2>AI 복원 결과 요약</h2>

        {summary.length > 0 ? (
          summary.map((item, index) => (
            <div
              className="report-row"
              key={index}
            >
              <span>{item}</span>

              <div className="report-actions">
                <button>✏️</button>
                <button>🗑</button>
              </div>
            </div>
          ))
        ) : (
          <p>아직 완료된 작업 결과가 없습니다.</p>
        )}

        <button className="add-btn">
          + 문장 추가
        </button>

      </div>

      <div className="report-card">

        <h2>적용된 복원 방법</h2>

        {methods.length > 0 ? (
          methods.map((item, index) => (
            <div
              className="report-row"
              key={index}
            >
              <span>{item}</span>

              <div className="report-actions">
                <button>✏️</button>
                <button>🗑</button>
              </div>
            </div>
          ))
        ) : (
          <p>아직 선택된 처리 방법이 없습니다.</p>
        )}

        <button className="add-btn">
          + 문장 추가
        </button>

      </div>

      <div className="report-card">

        <h2>선택된 도구</h2>

        {selectedTools.length > 0 ? (
          selectedTools.map((name, index) => (
            <div
              className="report-row"
              key={index}
            >
              <span>{name}</span>
            </div>
          ))
        ) : (
          <p>아직 선택된 도구가 없습니다.</p>
        )}

      </div>

      <div className="report-card">

        <h2>향후 관리</h2>

        <textarea
          className="future-care-textarea"
          value={futureCare}
          onChange={(e) => setFutureCare(e.target.value)}
          placeholder="향후 보관 및 관리 방법을 입력해주세요."
        />

      </div>

    </div>
  );
}

export default PostRecordPage;
