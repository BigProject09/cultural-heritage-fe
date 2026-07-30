import { useNavigate, useParams } from "react-router-dom";
import "./ProjectDetailPage.css";

function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  // 임시 데이터
  const project = {
    id,
    title: "청자 매병 복원",
    artifact: "청자 매병",
    material: "도자기",
    status: "진행 중",
    currentStep: "처리 전 조사",
    progress: 35,
    date: "2026.07.18",
  };

  const handleContinue = () => {
    switch (project.currentStep) {
      case "처리 전 조사":
        navigate("/pre-investigation");
        break;

      case "세척":
        navigate("/cleaning");
        break;

      default:
        navigate("/pre-investigation");
    }
  };

  return (
    <div className="project-detail-page">

      <header className="detail-header">

        <div
          className="detail-logo"
          onClick={() => navigate("/")}
        >
          VORA
        </div>

        <button
          className="back-btn"
          onClick={() => navigate("/worklist")}
        >
          ← 작업 목록
        </button>

      </header>

      <div className="detail-card">

        <h1>{project.title}</h1>

        <div className="info-grid">

          <div>
            <span>유물명</span>
            <p>{project.artifact}</p>
          </div>

          <div>
            <span>재질</span>
            <p>{project.material}</p>
          </div>

          <div>
            <span>등록일</span>
            <p>{project.date}</p>
          </div>

          <div>
            <span>상태</span>
            <p>{project.status}</p>
          </div>

        </div>

        <div className="progress-section">

          <h3>진행률</h3>

          <div className="progress-bar">

            <div
              className="progress-fill"
              style={{
                width: `${project.progress}%`,
              }}
            />

          </div>

          <p>{project.progress}% 완료</p>

        </div>

        <div className="current-step">

          <h3>현재 단계</h3>

          <div className="step-box">
            {project.currentStep}
          </div>

        </div>

        <div className="button-group">

          <button
            className="continue-btn"
            onClick={handleContinue}
          >
            ▶ 이어서 작업
          </button>

          <button
            className="report-btn"
            onClick={() => alert("보고서 기능 준비 중")}
          >
            📄 보고서 보기
          </button>

        </div>

      </div>

    </div>
  );
}

export default ProjectDetailPage;