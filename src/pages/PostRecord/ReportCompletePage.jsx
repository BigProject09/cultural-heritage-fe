import { useNavigate } from "react-router-dom";
import "./ReportCompletePage.css";

function ReportCompletePage() {
  const navigate = useNavigate();

  return (
    <div className="complete-page">
      <div className="complete-card">
        <div className="check">✅</div>

        <h1>보고서가 저장되었습니다.</h1>

        <p>
          AI 복원 보고서가 성공적으로 저장되었습니다.
        </p>

        <button
          className="complete-btn"
          onClick={() => navigate("/mypage")}
        >
          마이페이지로 이동
        </button>
      </div>
    </div>
  );
}

export default ReportCompletePage;