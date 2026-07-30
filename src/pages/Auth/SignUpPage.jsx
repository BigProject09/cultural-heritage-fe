import "./SignUpPage.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function SignUpPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, "");

    if (numbers.length < 4) return numbers;
    if (numbers.length < 8)
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;

    return `${numbers.slice(0, 3)}-${numbers.slice(
      3,
      7
    )}-${numbers.slice(7, 11)}`;
  };

  const handleSignUp = (e) => {
    e.preventDefault();

    setError("");

    if (!name || !email || !phone || !password || !confirmPassword) {
      setError("모든 항목을 입력해주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError("올바른 이메일 형식을 입력해주세요.");
      return;
    }

    if (password.length < 8) {
      setError("비밀번호는 8자 이상 입력해주세요.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("users")) || [];

    const existUser = users.find((user) => user.email === email);

    if (existUser) {
      setError("이미 가입된 이메일입니다.");
      return;
    }

    const newUser = {
      name,
      email,
      phone,
      password,
    };

    users.push(newUser);

    localStorage.setItem("users", JSON.stringify(users));

    alert("회원가입이 완료되었습니다.");

    navigate("/login");
  };

  return (
    <div className="signup-container">
      <header className="signup-header">
        <div
          className="signup-logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          <h1>VORA</h1>
          <span>AI와 전문가가 함께하는 문화재 복원 플랫폼</span>
        </div>
      </header>

      <main className="signup-main">
        <div className="signup-card">
          <div className="signup-icon">📝</div>

          <h2>회원가입</h2>

          <form onSubmit={handleSignUp}>
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="text"
              placeholder="전화번호"
              value={phone}
              maxLength={13}
              onChange={(e) =>
                setPhone(formatPhone(e.target.value))
              }
            />

            <input
              type="password"
              placeholder="비밀번호 (8자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <input
              type="password"
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
            />

            {error && <p className="error-text">{error}</p>}

            <button
              type="submit"
              className="signup-btn"
            >
              회원가입
            </button>
          </form>

          <div className="signup-links">
            <span onClick={() => navigate("/login")}>
              로그인으로 돌아가기
            </span>
          </div>
        </div>
      </main>

      <footer className="signup-footer">
        © 2026 VORA. All rights reserved.
      </footer>
    </div>
  );
}

export default SignUpPage;