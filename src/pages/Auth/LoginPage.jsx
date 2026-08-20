import "./LoginPage.css";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import HeritageHeader from "../../components/workspace/HeritageHeader";
import PrivacyPolicyModal from "../../components/common/PrivacyPolicyModal";
import TermsOfServiceModal from "../../components/common/TermsOfServiceModal";
import { login } from "../../services/userApi";
import { decodeJwtPayload } from "../../utils/jwt";

const ID_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{4,20}$/;
const DEMO_LOGIN_ID = "vora1";
const DEMO_PASSWORD = "vora1234!";

function LoginPage() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ userId: false, password: false });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fieldErrors = useMemo(() => ({
    userId:
      !userId.trim()
        ? "아이디를 입력해주세요."
        : !ID_REGEX.test(userId.trim())
          ? "아이디는 영문과 숫자를 포함한 4~20자입니다."
          : "",
    password: !password ? "비밀번호를 입력해주세요." : "",
  }), [userId, password]);

  const performLogin = async (loginId, loginPassword) => {
    setSubmitting(true);
    setError("");

    try {
      const response = await login({ loginId, password: loginPassword });
      const payload = decodeJwtPayload(response.token);

      const loginUser = {
        loginId: response.loginId || payload?.sub || loginId,
        email: response.email || "",
        name: response.nickName || response.loginId || payload?.sub || loginId,
        role: response.role || payload?.role || "USER",
        accessToken: response.token,
      };

      localStorage.setItem("loginUser", JSON.stringify(loginUser));
      navigate("/");
    } catch (err) {
      setError(err.message || "로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setTouched({ userId: true, password: true });
    setError("");

    if (fieldErrors.userId || fieldErrors.password) return;

    await performLogin(userId.trim(), password);
  };

  const handleDemoLogin = async () => {
    setTouched({ userId: false, password: false });
    await performLogin(DEMO_LOGIN_ID, DEMO_PASSWORD);
  };

  const inputStateClass = (name) => {
    if (!touched[name]) return "";
    return fieldErrors[name] ? "invalid" : "valid";
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

          <form onSubmit={handleLogin} noValidate>
            <label htmlFor="login-id">아이디</label>
            <input
              id="login-id"
              className={inputStateClass("userId")}
              type="text"
              placeholder="아이디를 입력하세요"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setError("");
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, userId: true }))}
              autoComplete="username"
              aria-invalid={Boolean(touched.userId && fieldErrors.userId)}
            />
            {touched.userId && fieldErrors.userId && (
              <p className="heritage-field-message error">{fieldErrors.userId}</p>
            )}

            <label htmlFor="login-password">비밀번호</label>
            <div className="heritage-password-field">
              <input
                id="login-password"
                className={inputStateClass("password")}
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                autoComplete="current-password"
                aria-invalid={Boolean(touched.password && fieldErrors.password)}
              />
              <button
                type="button"
                className="heritage-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {showPassword ? "숨김" : "보기"}
              </button>
            </div>
            {touched.password && fieldErrors.password && (
              <p className="heritage-field-message error">{fieldErrors.password}</p>
            )}

            {error && (
              <p className="heritage-auth-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="heritage-auth-submit" disabled={submitting}>
              {submitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="heritage-auth-demo">
            <div className="heritage-auth-divider" aria-hidden="true">
              <span />
              <b>DEMO</b>
              <span />
            </div>
            <button
              type="button"
              className="heritage-auth-demo-button"
              onClick={handleDemoLogin}
              disabled={submitting}
            >
              {submitting ? "접속 중..." : "데모 계정으로 시작하기"}
            </button>
            <p>별도의 계정 입력 없이 VORA 주요 기능을 체험할 수 있습니다.</p>
          </div>

          <div className="heritage-auth-links">
            <button type="button" onClick={() => navigate("/signup")}>회원가입</button>
            <span>|</span>
            <button type="button" onClick={() => alert("준비 중인 기능입니다.")}>비밀번호 찾기</button>
          </div>

          <p className="heritage-auth-security-note">
            비밀번호는 화면에 표시하거나 저장하지 않으며, 서버에는 암호화된 형태로 처리됩니다.
          </p>
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
