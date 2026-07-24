import "./MyPage.css";
import { useNavigate } from "react-router-dom";

function MyPage() {
  const navigate = useNavigate();

  return (
    <div className="my-page">

      {/* ================= 헤더 ================= */}

      <div className="mypage-header">

        <button
          className="back-btn"
          onClick={() => navigate("/")}
        >
          ← 홈으로
        </button>

        <h1>마이페이지</h1>

      </div>

      {/* ================= 프로필 카드 ================= */}

      <div className="profile-card">

        <div className="profile-avatar">
          👤
        </div>

        <div className="profile-info">

          <h2>에이블러</h2>

          <p>복원 전문가</p>

          <span>user@vora.com</span>

        </div>

      </div>

      {/* ================= 작업 현황 ================= */}

      <div className="workspace-grid">

        <div className="workspace-card">

          <div className="workspace-icon">
            📦
          </div>

          <h3 className="workspace-count">
            15
          </h3>

          <div className="workspace-content">
            <p>진행 프로젝트</p>
          </div>

          <span className="workspace-arrow">
            →
          </span>

        </div>

        <div className="workspace-card">

          <div className="workspace-icon">
            ✅
          </div>

          <h3 className="workspace-count">
            23
          </h3>

          <div className="workspace-content">
            <p>완료 프로젝트</p>
          </div>

          <span className="workspace-arrow">
            →
          </span>

        </div>

        <div className="workspace-card">

          <div className="workspace-icon">
            📄
          </div>

          <h3 className="workspace-count">
            18
          </h3>

          <div className="workspace-content">
            <p>생성한 보고서</p>
          </div>

          <span className="workspace-arrow">
            →
          </span>

        </div>

        <div className="workspace-card">

          <div className="workspace-icon">
            📁
          </div>

          <h3 className="workspace-count">
            41
          </h3>

          <div className="workspace-content">
            <p>업로드 파일</p>
          </div>

          <span className="workspace-arrow">
            →
          </span>

        </div>

      </div>

      {/* ================= 프로젝트 & 보고서 ================= */}

      <div className="menu-grid">

        <div className="menu-card">

          <h2>📂 내 프로젝트</h2>

          <div className="list-area">

            <p>청동기 복원 프로젝트</p>
            <p>고려청자 복원 프로젝트</p>
            <p>백자 복원 프로젝트</p>

          </div>

          <button
            className="view-btn"
            onClick={() => navigate("/mypage/projects")}
          >
            전체보기 →
          </button>

        </div>

        <div className="menu-card">

          <h2>📄 내 보고서</h2>

          <div className="list-area">

            <p>고려청자 최종보고서.pdf</p>
            <p>백자 복원보고서.pdf</p>
            <p>청동기 복원보고서.pdf</p>

          </div>

          <button
            className="view-btn"
            onClick={() => navigate("/mypage/reports")}
          >
            전체보기 →
          </button>

        </div>

      </div>

    </div>
  );
}

export default MyPage;