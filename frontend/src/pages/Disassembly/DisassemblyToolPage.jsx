import { useNavigate } from "react-router-dom";
import "./DisassemblyToolPage.css";

function DisassemblyToolPage() {
  const navigate = useNavigate();

  return (
    <div className="tool-page">
      {/* 상단 */}
      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() => navigate("/disassembly")}
        >
          ← 해체 전 조사
        </button>

        <button
          className="nav-btn"
          onClick={() => alert("다음 단계(세척) 준비 중")}
        >
          해체 방법 선택 →
        </button>
      </div>

      <h1 className="title">AI 추천 해체 도구</h1>

      <p className="sub-title">
        유물 정보와 해체 전 조사 결과를 기반으로 추천된 도구입니다.
      </p>

      <div className="tool-list">

        <div className="tool-card">


          <img
            src="https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600"
            alt="메스"
          />

          <h2>메스</h2>

          <div className="score">
            추천도 <strong>92%</strong>
          </div>

          <h3>추천 이유</h3>

          <ul>
            <li>부분 해체가 필요한 상태</li>
            <li>균열 주변 정밀 작업 가능</li>
            <li>표면 손상을 최소화</li>
          </ul>

          <button className="select-btn">
            선택하기
          </button>

        </div>

        <div className="tool-card">

          <img
            src="https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=600"
            alt="열풍기"
          />

          <h2>저온 열풍기</h2>

          <div className="score">
            추천도 <strong>74%</strong>
          </div>

          <h3>추천 이유</h3>

          <ul>
            <li>열가소성 접착제 제거</li>
            <li>넓은 면적 작업</li>
            <li>빠른 해체 가능</li>
          </ul>

          <button className="select-btn">
            선택하기
          </button>

        </div>

      </div>
    </div>
  );
}

export default DisassemblyToolPage;