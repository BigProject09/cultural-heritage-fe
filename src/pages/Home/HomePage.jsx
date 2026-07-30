import "./HomePage.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { boardData } from "../../data/boardData";
import { noticeData } from "../../data/noticeData";

function HomePage() {
  const navigate = useNavigate();

  const loginUser = JSON.parse(localStorage.getItem("loginUser"));
  const [showMenu, setShowMenu] = useState(false);

  const checkLogin = (path) => {
    navigate(path);
  };

  return (
    <div className="home-page">
      {/* ================= Header ================= */}

      <header className="header">
        <div className="logo-area">
          <div className="logo" onClick={() => navigate("/")}>
            VORA
          </div>

          <div className="logo-text">
            <h3>AI와 전문가가 함께하는</h3>
            <p>문화재 복원 플랫폼</p>
          </div>
        </div>

        <div className="header-right">
          {loginUser ? (
            <div
              className="profile-area"
              onMouseEnter={() => setShowMenu(true)}
              onMouseLeave={() => setShowMenu(false)}
            >
              <div className="profile-btn">👤 {loginUser.name}님 ▾</div>

              <div className={`logout-slide ${showMenu ? "show" : ""}`}>
                <div
                  className="logout-btn"
                  onClick={() => {
                    localStorage.removeItem("loginUser");
                    alert("로그아웃되었습니다.");
                    navigate("/");
                    window.location.reload();
                  }}
                >
                  🚪 로그아웃
                </div>
              </div>
            </div>
          ) : (
            <button className="login-btn" onClick={() => navigate("/login")}>
              로그인 / 회원가입
            </button>
          )}
        </div>
      </header>

      {/* ================= Dashboard ================= */}

      <section className="dashboard">
        {/* ================= Top ================= */}

        <div className="dashboard-grid">
          {/* ================= 마이페이지================= */}

          <div className="workspace-panel">
            <div className="section-title">
              <div className="workspace-title">
                <div className="workspace-title-icon">📂</div>

                <div className="workspace-title-text">
                  <h2>마이페이지</h2>
                  <p>나의 프로젝트와 자료를 한눈에 확인하세요.</p>
                </div>
              </div>

              <button className="more-btn" onClick={() => navigate("/mypage")}>
                더보기 →
              </button>
            </div>
            <div className="workspace-grid">
              <div className="workspace-card">
                <div className="workspace-icon">📦</div>

                <div className="workspace-content">
                  <p>진행 프로젝트</p>
                </div>

                <h3 className="workspace-count">15</h3>
              </div>

              <div className="workspace-card">
                <div className="workspace-icon">✅</div>

                <div className="workspace-content">
                  <p>완료 프로젝트</p>
                </div>

                <h3 className="workspace-count">23</h3>
              </div>

              <div className="workspace-card">
                <div className="workspace-icon">📄</div>

                <div className="workspace-content">
                  <p>생성한 보고서</p>
                </div>

                <h3 className="workspace-count">18</h3>
              </div>

              <div className="workspace-card">
                <div className="workspace-icon">📁</div>

                <div className="workspace-content">
                  <p>업로드 파일</p>
                </div>

                <h3 className="workspace-count">41</h3>
              </div>
            </div>
            <div
              className="new-project-btn"
              onClick={() => checkLogin("/artifact-register")}
            >
              <div className="plus-circle">＋</div>

              <div className="new-project-text">
                <h3>새 복원 프로젝트 시작</h3>
                <p>새로운 유물 복원 프로젝트를 시작해보세요.</p>
              </div>

              <div className="arrow">→</div>
            </div>
          </div>

          {/* ================= 공지사항 ================= */}

          <div className="notice-panel">
            <div className="section-title">
              <div className="workspace-title">
                <div className="workspace-title-icon">📢</div>

                <div className="workspace-title-text">
                  <h2>공지사항</h2>
                  <p>서비스 최신 소식을 확인하세요.</p>
                </div>
              </div>

              <button className="more-btn" onClick={() => navigate("/notice")}>
                더보기 →
              </button>
            </div>

            {noticeData.map((notice) => (
              <div
                key={notice.id}
                className="board-item"
                style={{ cursor: "pointer" }}
              >
                <p>
                  <span className="notice-dot">●</span>
                  {notice.title}
                </p>

                <small>{notice.date}</small>
              </div>
            ))}
          </div>
        </div>
        {/* ================= Bottom ================= */}

        <div className="dashboard-grid">
          {/* ================= 게시판 ================= */}

          <div className="board-panel">
            <div className="section-title">
              <div className="workspace-title">
                <div className="workspace-title-icon">📜</div>

                <div>
                  <h2>게시판</h2>
                </div>
              </div>

              <button className="more-btn" onClick={() => navigate("/board")}>
                전체보기 →
              </button>
            </div>

            {boardData.slice(0, 5).map((post) => (
              <div
                key={post.id}
                className="project-card"
                onClick={() => navigate(`/board/${post.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="project-left">
                  <div className="project-thumbnail">📜</div>
                  <div className="project-info">
                    <div className="board-tag">복원 사례</div>

                    <h3>{post.title}</h3>

                    <small>
                      {post.writer} · {post.date}
                    </small>
                  </div>
                </div>

                <div className="project-right">
                  <span className="status">조회수 {post.views}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ================= 즐겨찾기 ================= */}

          <div className="favorite-panel">
            <div className="section-title">
              <div className="workspace-title">
                <div className="workspace-title-icon">⭐</div>

                <div>
                  <h2>즐겨찾기</h2>
                </div>
              </div>
            </div>

            <div className="favorite-item">
              <div className="favorite-left">
                <div className="favorite-icon">📄</div>

                <div>
                  <h3>고려청자_최종보고서.pdf</h3>

                  <small>내 보고서</small>
                </div>
              </div>

              <span className="favorite-star">⭐</span>
            </div>

            <div className="favorite-item">
              <div className="favorite-left">
                <div className="favorite-icon">📂</div>

                <div>
                  <h3>청동기 복원 프로젝트</h3>

                  <small>프로젝트</small>
                </div>
              </div>

              <span className="favorite-star">⭐</span>
            </div>

            <div className="favorite-item">
              <div className="favorite-left">
                <div className="favorite-icon">📄</div>

                <div>
                  <h3>세척 방법 비교</h3>

                  <small>문서</small>
                </div>
              </div>

              <span className="favorite-star">⭐</span>
            </div>

            <div className="favorite-item">
              <div className="favorite-left">
                <div className="favorite-icon">📄</div>

                <div>
                  <h3>백자 복원 보고서</h3>

                  <small>보고서</small>
                </div>
              </div>

              <span className="favorite-star">⭐</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Footer ================= */}

      <footer className="footer">
        <div className="footer-logo">VORA</div>

        <p>AI 기반 문화재 복원 지원 플랫폼</p>

        <small>© 2026 VORA. All Rights Reserved.</small>
      </footer>
    </div>
  );
}

export default HomePage;
