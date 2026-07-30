import "./SignUpPage.css";
import "./LoginPage.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import HeritageHeader from "../../components/workspace/HeritageHeader";

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
    <div className="heritage-auth-page heritage-signup-page">
      <HeritageHeader active="account" />

      <main className="heritage-signup-main">
        <section className="heritage-signup-card" aria-labelledby="signup-title">
          <div className="heritage-signup-heading">
            <div>
              <p className="heritage-auth-eyebrow">CREATE ACCOUNT</p>
              <h1 id="signup-title">회원가입</h1>
              <span>VORA 보존처리 워크스페이스를 시작합니다.</span>
            </div>
            <b aria-hidden="true">✣</b>
          </div>

          <form onSubmit={handleSignUp}>
            <div className="heritage-signup-grid">
              <label>
                <span>이름</span>
                <input
                  type="text"
                  placeholder="담당자 이름"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
              </label>

              <label>
                <span>전화번호</span>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={phone}
                  maxLength={13}
                  onChange={(event) => setPhone(formatPhone(event.target.value))}
                  autoComplete="tel"
                />
              </label>

              <label className="wide">
                <span>이메일</span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </label>

              <label>
                <span>비밀번호</span>
                <input
                  type="password"
                  placeholder="8자 이상"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </label>

              <label>
                <span>비밀번호 확인</span>
                <input
                  type="password"
                  placeholder="한 번 더 입력"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
            </div>

            {error && <p className="heritage-auth-error">{error}</p>}

            <button type="submit" className="heritage-auth-submit">
              회원가입
            </button>
          </form>

          <div className="heritage-auth-links">
            <span>이미 계정이 있나요?</span>
            <button type="button" onClick={() => navigate("/login")}>
              로그인
            </button>
          </div>
        </section>
      </main>

      <footer className="heritage-auth-footer">
        © 2026 VORA. All rights reserved.
      </footer>
    </div>
  );
}

export default SignUpPage;
