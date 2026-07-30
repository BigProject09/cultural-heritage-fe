import "./ActivityPage.css";
import { useNavigate } from "react-router-dom";

function ActivityPage() {
  const navigate = useNavigate();

  return (
    <div className="activity-page">

      <div className="activity-header">
        <button
          className="back-btn"
          onClick={() => navigate("/mypage")}
        >
          ← 마이페이지
        </button>

        <h1>내 작업 현황</h1>
      </div>

      <div className="activity-grid">

        <div className="activity-card">
          <h2>진행 프로젝트</h2>
          <span>3건</span>
        </div>

        <div className="activity-card">
          <h2>완료 프로젝트</h2>
          <span>12건</span>
        </div>

        <div className="activity-card">
          <h2>생성 보고서</h2>
          <span>18건</span>
        </div>

      </div>

    </div>
  );
}

export default ActivityPage;