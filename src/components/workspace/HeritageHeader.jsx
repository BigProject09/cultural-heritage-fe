import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./WorkspaceChrome.css";
import { logout } from "../../services/userApi";

function HeritageHeader({ active = "dashboard" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const communityRef = useRef(null);
  const [communityOpen, setCommunityOpen] = useState(false);
  const accountRef = useRef(null);
  const [accountOpen, setAccountOpen] = useState(false);
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
      if (!accountRef.current?.contains(event.target)) {
        setAccountOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setCommunityOpen(false);
        setAccountOpen(false);
      }
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

  const handleAccountTriggerClick = () => {
    if (loginUser) {
      setAccountOpen((open) => !open);
    } else {
      navigate("/login");
    }
  };

  const handleLogout = () => {
    setAccountOpen(false);
    logout().catch(() => {});
    localStorage.removeItem("loginUser");
    navigate("/");
  };

  return (
    <header className="heritage-header">
      <button
        className="heritage-brand"
        onClick={() => navigate("/")}
        aria-label="VORA 홈로 이동"
      >
        <img
          src="/vora-logo.png"
          alt=""
          className="heritage-brand-mark"
        />
        <span className="heritage-brand-copy">
          <small lang="en">Value of Restoration with AI</small>
          <strong>VORA</strong>
        </span>
      </button>

      <nav className="heritage-main-nav" aria-label="주 메뉴">
        <button
          className={`heritage-nav-button ${
            active === "dashboard" ? "active" : ""
          }`}
          onClick={() => navigate("/")}
        >
          홈
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
          className={`heritage-community-menu ${communityOpen ? "open" : ""}`}
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
              className={
                location.pathname.startsWith("/board") ? "current" : ""
              }
              onClick={() => moveToCommunity("/board")}
            >
              <span>게시판</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={
                location.pathname.startsWith("/notice") ? "current" : ""
              }
              onClick={() => moveToCommunity("/notice")}
            >
              <span>공지사항</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="heritage-profile">
        <button
          type="button"
          className={`heritage-profile-link ${
            active === "account" ? "active" : ""
          }`}
          onClick={() => navigate(loginUser ? "/mypage" : "/login")}
        >
          <span>
            <small>{loginUser ? "마이페이지" : "회원"}</small>
            <strong>{loginUser ? `${loginUser.name || loginUser.loginId}님` : "로그인"}</strong>
          </span>
        </button>
        <div
          className={`heritage-account-menu ${accountOpen ? "open" : ""}`}
          ref={accountRef}
        >
          <button
            type="button"
            className="heritage-logout-trigger"
            onClick={handleAccountTriggerClick}
            aria-haspopup={loginUser ? "menu" : undefined}
            aria-expanded={loginUser ? accountOpen : undefined}
            aria-label={loginUser ? "계정 메뉴" : "로그인 페이지로 이동"}
          >
            <b>{loginUser?.name?.slice(0, 1) || "V"}</b>
          </button>

          {loginUser && (
            <div
              className="heritage-account-dropdown"
              role="menu"
              aria-label="계정 메뉴"
            >
              <button type="button" role="menuitem" onClick={handleLogout}>
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default HeritageHeader;
