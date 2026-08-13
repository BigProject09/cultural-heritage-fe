import "./LoginPage.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import HeritageHeader from "../../components/workspace/HeritageHeader";
import PrivacyPolicyModal from "../../components/common/PrivacyPolicyModal";
import TermsOfServiceModal from "../../components/common/TermsOfServiceModal";
import { login } from "../../services/userApi";
import { decodeJwtPayload } from "../../utils/jwt";

function LoginPage() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      const response = await login({ loginId: userId, password });
      const payload = decodeJwtPayload(response.token);

      const loginUser = {
        loginId: response.loginId || payload?.sub || userId,
        email: response.email || "",
        name: response.nickName || response.loginId || payload?.sub || userId,
        role: response.role || payload?.role || "USER",
        accessToken: response.token,
      };

      localStorage.setItem("loginUser", JSON.stringify(loginUser));

      alert(`${loginUser.name}님 환영합니다!`);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="heritage-auth-page">
      <HeritageHeader active="account" />

      <main className="heritage-auth-main">
        <section className="heritage-auth-copy">
          <p>VORA CONSERVATION WORKSPACE</p>
          <h1>
            보존처리의 기록을
            <br />
            하나의 공간에서
          </h1>
          <span>
            프로젝트와 조사 결과, AI 복원 가이드를 안전하게 이어서 관리하세요.
          </span>
          <div className="heritage-auth-ornament" aria-hidden="true">
            <i />
            <b>V</b>
            <i />
          </div>
        </section>

        <section className="heritage-auth-card" aria-labelledby="login-title">
          <p className="heritage-auth-eyebrow">MEMBER ACCESS</p>
          <h2 id="login-title">로그인</h2>
          <p className="heritage-auth-help">
            등록한 계정으로 보존처리 워크스페이스에 접속합니다.
          </p>

          <form onSubmit={handleLogin}>
            <label htmlFor="login-email">아이디</label>
            <input
              id="login-email"
              type="text"
              placeholder="아이디를 입력하세요"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              autoComplete="username"
            />

            <label htmlFor="login-password">비밀번호</label>
            <input
              id="login-password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {error && <p className="heritage-auth-error">{error}</p>}

            <button type="submit" className="heritage-auth-submit" disabled={submitting}>
              {submitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="heritage-auth-links">
            <button
              type="button"
              onClick={() => navigate("/signup")}
            >
              회원가입
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={() => alert("준비 중인 기능입니다.")}
            >
              비밀번호 찾기
            </button>
          </div>
        </section>
      </main>

      <footer className="heritage-auth-footer">
        <TermsOfServiceModal />
        <span> · </span>
        <PrivacyPolicyModal />
      </footer>
    </div>
  );
}

export default LoginPage;
