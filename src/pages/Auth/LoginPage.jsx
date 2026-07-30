import "./LoginPage.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    const users = JSON.parse(localStorage.getItem("users")) || [];

    const user = users.find(
      (user) =>
        user.email === email &&
        user.password === password
    );

    if (user) {
      localStorage.setItem(
        "loginUser",
        JSON.stringify(user)
      );

      setError("");
      alert(`${user.name}님 환영합니다!`);
      navigate("/");
    } else {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <div className="login-container">
      {/* Header */}
      <header className="login-header">
        <div
          className="login-logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          <h1>VORA</h1>
          <span>
            AI와 전문가가 함께하는 문화재 복원 플랫폼
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="login-main">
        <div className="login-card">
          <div className="login-icon">👤</div>

          <h2>로그인</h2>

          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <p
                style={{
                  color: "red",
                  fontSize: "14px",
                  marginTop: "10px",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="login-btn"
            >
              로그인
            </button>
          </form>

          <div className="login-links">
            <span
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/signup")}
            >
              회원가입
            </span>

            <span>|</span>

            <span
              style={{ cursor: "pointer" }}
              onClick={() =>
                alert("준비 중인 기능입니다.")
              }
            >
              비밀번호 찾기
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        © 2026 VORA. All rights reserved.
      </footer>
    </div>
  );
}

export default LoginPage;