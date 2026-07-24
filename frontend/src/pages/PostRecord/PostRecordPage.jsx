import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PostRecordPage.css";

function PostRecordPage() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState([
    "오염 제거 완료",
    "균열 접합 완료",
    "결손부 복원 완료",
    "색상 복원 완료",
  ]);

  const [methods, setMethods] = useState([
    "건식 세척",
    "Paraloid B-72 강화 처리",
    "에폭시 접합",
    "안료 색 맞춤",
  ]);

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
            console.log("버튼 클릭!");
            navigate("/report");
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

        {summary.map((item, index) => (
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
        ))}

        <button className="add-btn">
          + 문장 추가
        </button>

      </div>

      <div className="report-card">

        <h2>적용된 복원 방법</h2>

        {methods.map((item, index) => (
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
        ))}

        <button className="add-btn">
          + 문장 추가
        </button>

      </div>

    </div>
  );
}

export default PostRecordPage;