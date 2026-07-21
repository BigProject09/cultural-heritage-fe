import "./HomePage.css";
import { noticeData } from "../../data/noticeData";
import { useNavigate } from "react-router-dom";
import { boardData } from "../../data/boardData";
import { useState } from "react";

function HomePage() {
  const navigate = useNavigate();
  const loginUser = JSON.parse(localStorage.getItem("loginUser"));

  const [showMenu, setShowMenu] = useState(false);

  const checkLogin = (path) => {
    const loginUser = localStorage.getItem("loginUser");

    if (!loginUser) {
      alert("로그인 후 이용해주세요.");
      navigate("/login");
      return;
    }

    navigate(path);
  };

  return (
    <div className="home-page">

      {/* ================= Header ================= */}

      <header className="header">

        <div
          className="logo"
          onClick={() => navigate("/")}
        >
          VORA
        </div>
        
        <div className="header-right">
  {loginUser ? (
    <div
  className="profile-area"
  onMouseEnter={() => setShowMenu(true)}
  onMouseLeave={() => setShowMenu(false)}
>
  <div className="profile-btn">
    👤 {loginUser.name}님 ▾
  </div>

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
    <button
  className="login-btn"
  onClick={() => navigate("/login")}
>
  로그인 / 회원가입
</button>
  )}
</div>

      </header>

      {/* ================= Hero ================= */}

      <section className="hero">

        <div className="hero-text">

          <span className="hero-badge">
            AI Restoration Platform
          </span>

          <h1>
            문화재 복원 플랫폼
            <br />
            <span>VORA</span>
          </h1>

          <p>
            AI와 전문가 협업을 통해
            문화재 복원 과정을
            체계적으로 관리합니다.
          </p>

          <button
            className="hero-start"
            onClick={() => checkLogin("/artifact-register")}
          >
            새 복원 프로젝트 시작
          </button>

        </div>
                <div className="hero-status">

          <h3>프로젝트 현황</h3>

          <div className="status-grid">

            <div className="status-card">
              <h2>17</h2>
              <p>전체 프로젝트</p>
            </div>

            <div className="status-card">
              <h2>5</h2>
              <p>진행 중</p>
            </div>

            <div className="status-card">
              <h2>2</h2>
              <p>검토 대기</p>
            </div>

            <div className="status-card">
              <h2>12</h2>
              <p>완료</p>
            </div>

          </div>

        </div>

      </section>

      {/* ================= Quick Menu ================= */}

      <section className="quick-menu">

        <div
          className="quick-card"
          onClick={() => checkLogin("/board")}
        >
          <div className="quick-icon">📜</div>
          <h3>게시판</h3>
        </div>

        <div
          className="quick-card"
          onClick={() => checkLogin("/worklist")}
        >
          <div className="quick-icon">📂</div>
          <h3>내 프로젝트</h3>
        </div>

        <div
          className="quick-card"
          onClick={() => checkLogin("/flow-recommendation")}
        >
          <div className="quick-icon">🩻</div>
          <h3>X-RAY 분석</h3>
        </div>

        <div
          className="quick-card"
          onClick={() => checkLogin("/visual")}
        >
          <div className="quick-icon">👁️</div>
          <h3>육안 조사</h3>
        </div>

        <div
          className="quick-card"
          onClick={() => checkLogin("/expert")}
        >
          <div className="quick-icon">👨‍🔬</div>
          <h3>전문가 검토</h3>
        </div>

        <div
          className="quick-card"
          onClick={() => checkLogin("/library")}
        >
          <div className="quick-icon">📚</div>
          <h3>자료실</h3>
        </div>

      </section>

      {/* ================= Main ================= */}

      <section className="main-grid">

        <div className="project-panel">

          <div className="section-title">

            <h2>최근 게시글</h2>

            <span
              onClick={() => checkLogin("/board")}
              style={{ cursor: "pointer" }}
            >
              전체보기 →
            </span>

          </div>
                    {boardData.slice(0, 5).map((post) => (
            <div
              key={post.id}
              className="project-card"
              onClick={() => checkLogin(`/board/${post.id}`)}
              style={{ cursor: "pointer" }}
            >
              <div className="project-left">

                <div className="project-thumbnail">
                  📜
                </div>

                <div>

                  <h3>{post.title}</h3>

                  <small>
                    {post.writer} · {post.date}
                  </small>

                </div>

              </div>

              <div className="project-right">

                <span className="status">
                  조회수 {post.views}
                </span>

              </div>

            </div>
          ))}

        </div>

        {/* ================= Board ================= */}

        <div className="board-panel">

          <div className="section-title">

            <h2>공지사항</h2>

            <span
              onClick={() => navigate("/notice")}
              style={{ cursor: "pointer" }}
            >
              더보기 →
            </span>

          </div>

          {noticeData.map((notice) => (
                        <div
              key={notice.id}
              className="board-item"
              style={{ cursor: "pointer" }}
            >
              <p>{notice.title}</p>
              <small>{notice.date}</small>
            </div>
          ))}

        </div>

      </section>

      {/* ================= Footer ================= */}

      <footer className="footer">

        <div className="footer-logo">
          VORA
        </div>

        <p>
          AI 기반 문화재 복원 지원 플랫폼
        </p>

        <small>
          © 2026 VORA. All Rights Reserved.
        </small>

      </footer>
          </div>
  );
}

export default HomePage;