import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./WorkspaceChrome.css";

function HeritageHeader({ active = "dashboard" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const communityRef = useRef(null);
  const [communityOpen, setCommunityOpen] = useState(false);
  const loginUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("loginUser") || "null");
    } catch {
      return null;
    }
  })();
  const communityActive =
    active === "community" ||
    location.pathname.startsWith("/board") ||
    location.pathname.startsWith("/notice");

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!communityRef.current?.contains(event.target)) {
        setCommunityOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setCommunityOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const moveToCommunity = (path) => {
    setCommunityOpen(false);
    navigate(path);
  };

  return (
    <header className="heritage-header">
      <button
        className="heritage-brand"
        onClick={() => navigate("/")}
        aria-label="VORA 대시보드로 이동"
      >
        <span className="heritage-brand-mark">✣</span>
        <span>
          VORA
          <small>AI CONSERVATION WORKSPACE</small>
        </span>
      </button>

      <nav className="heritage-main-nav" aria-label="주 메뉴">
        <button
          className={`heritage-nav-button ${
            active === "dashboard" ? "active" : ""
          }`}
          onClick={() => navigate("/")}
        >
          대시보드
        </button>
        <button
          className={`heritage-nav-button ${
            active === "projects" ? "active" : ""
          }`}
          onClick={() => navigate("/worklist")}
        >
          프로젝트
        </button>
        <div
          className={`heritage-community-menu ${
            communityOpen ? "open" : ""
          }`}
          ref={communityRef}
          onMouseEnter={() => setCommunityOpen(true)}
          onMouseLeave={() => setCommunityOpen(false)}
        >
          <button
            type="button"
            className={`heritage-nav-button heritage-community-trigger ${
              communityActive ? "active" : ""
            }`}
            aria-expanded={communityOpen}
            aria-haspopup="menu"
            onClick={() => setCommunityOpen((open) => !open)}
            onFocus={() => setCommunityOpen(true)}
          >
            커뮤니티
            <span aria-hidden="true">⌄</span>
          </button>

          <div
            className="heritage-community-dropdown"
            role="menu"
            aria-label="커뮤니티 메뉴"
          >
            <button
              type="button"
              role="menuitem"
              className={location.pathname.startsWith("/board") ? "current" : ""}
              onClick={() => moveToCommunity("/board")}
            >
              <span>게시판</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={location.pathname.startsWith("/notice") ? "current" : ""}
              onClick={() => moveToCommunity("/notice")}
            >
              <span>공지사항</span>
            </button>
          </div>
        </div>
      </nav>

      <button
        className={`heritage-profile ${active === "account" ? "active" : ""}`}
        onClick={() => navigate(loginUser ? "/mypage" : "/login")}
      >
        <span>
          {loginUser ? "보존처리 담당자" : "서비스 이용"}
          <small>{loginUser?.name || "로그인"}</small>
        </span>
        <b>{loginUser?.name?.slice(0, 1) || "V"}</b>
      </button>
    </header>
  );
}

export default HeritageHeader;
