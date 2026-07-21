import { useNavigate } from "react-router-dom";
import "./DisassemblyMethodPage.css";

function DisassemblyMethodPage() {
  const navigate = useNavigate();

  return (
    <div className="method-page">
      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() => navigate("/disassembly")}
        >
          ← 해체 도구 선택
        </button>

        <button
          className="nav-btn"
          onClick={() => navigate("/disassembly-tool")}
        >
           완료 →
        </button>
      </div>

      <div className="method-content">

        <div className="step-menu">
          <div className="step-item">단계 1 : 처리 전 조사</div>
          <div className="step-item active">단계 2 : 해체</div>
          <div className="step-item">단계 3 : 세척</div>
          <div className="step-item">단계 4 : 강화 처리</div>
          <div className="step-item">단계 5 : 접합</div>
          <div className="step-item">단계 6 : 복원</div>
          <div className="step-item">단계 7 : 색 맞춤</div>
          <div className="step-item">단계 8 : 처리 후 기록</div>
        </div>

        <div className="method-area">

          <h1>AI 해체 방법 추천</h1>

          <div className="recommend-card">

            <div className="recommend-header">
              ⭐ AI 추천
            </div>

            <h2>용제 이용 부분 해체</h2>

            <p>
              기존 접착제가 열화되어 있으며,
              부분 해체가 필요한 것으로 판단되었습니다.
            </p>

            <div className="score">
              추천도 <strong>92%</strong>
            </div>

            <h3>추천 이유</h3>

            <ul>
              <li>접착제 열화 확인</li>
              <li>부분 해체 적합</li>
              <li>유물 손상 최소화</li>
            </ul>

            <h3>작업 순서</h3>

            <ol>
              <li>접착 부위 확인</li>
              <li>용제 도포</li>
              <li>접착층 연화 확인</li>
              <li>메스를 이용한 분리</li>
            </ol>

          </div>

        </div>

      </div>
    </div>
  );
}

export default DisassemblyMethodPage;