import "./SignUpPage.css";
import "./LoginPage.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import HeritageHeader from "../../components/workspace/HeritageHeader";
import PrivacyPolicyModal from "../../components/common/PrivacyPolicyModal";
import TermsOfServiceModal from "../../components/common/TermsOfServiceModal";
import { signup } from "../../services/userApi";

function SignUpPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isTermsOpen, setIsTermsOpen] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [agreements, setAgreements] = useState({
    service: false,
    privacy: false,
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allTermsChecked = agreements.service && agreements.privacy;

  const handleAllTerms = (event) => {
    const checked = event.target.checked;

    setAgreements({
      service: checked,
      privacy: checked,
    });
  };

  const handleTermChange = (event) => {
    const { name, checked } = event.target;

    setAgreements((previousAgreements) => ({
      ...previousAgreements,
      [name]: checked,
    }));
  };

  const handleTermsConfirm = () => {
    if (!allTermsChecked) {
      return;
    }

    setTermsAccepted(true);
    setIsTermsOpen(false);
    setError("");
  };

  const handleTermsCancel = () => {
    navigate("/login");
  };

  const handleSignUp = async (event) => {
    event.preventDefault();

    setError("");

    if (!termsAccepted) {
      setError("이용 약관에 먼저 동의해주세요.");
      setIsTermsOpen(true);
      return;
    }

    if (!name || !userId || !email || !password || !confirmPassword) {
      setError("모든 항목을 입력해주세요.");
      return;
    }

    if (!name.trim()) {
      setError("실명을 입력해주세요.");
      return;
    }

    const idRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{4,20}$/;

    if (!idRegex.test(userId)) {
      setError("아이디는 영문, 숫자를 포함해 4~20자로 입력해주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError("올바른 이메일 형식을 입력해주세요.");
      return;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;

    if (!passwordRegex.test(password)) {
      setError("비밀번호는 영문, 숫자, 특수문자를 포함해 8~20자로 입력해주세요.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호를 다시 입력해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      await signup({
        loginId: userId,
        email,
        password,
        nickName: name,
      });

      alert("회원가입이 완료되었습니다.");
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="heritage-auth-page heritage-signup-page">
      <HeritageHeader active="account" />

      {isTermsOpen && (
        <div
          className="heritage-terms-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
        >
          <section className="heritage-terms-modal">
            <div className="heritage-terms-modal-heading">
              <p className="heritage-auth-eyebrow">TERMS OF SERVICE</p>

              <h2 id="terms-modal-title">이용 약관 동의</h2>

              <span>
                VORA 서비스 이용을 위해 필수 약관에 동의해주세요.
              </span>
            </div>

            <div className="heritage-terms-content">
              <h3>VORA 서비스 이용 약관</h3>

              <p>
                VORA는 문화유산 보존처리 업무를 지원하기 위한
                워크스페이스입니다. 사용자는 서비스 이용 과정에서 관련
                법령과 운영 정책을 준수해야 합니다.
              </p>

              <p>
                서비스에서 제공하는 분석 결과와 보존처리 가이드는 업무를
                보조하기 위한 참고 자료입니다. 실제 보존처리 여부와 방법에
                대한 최종 판단은 사용자와 관련 전문가가 진행해야 합니다.
              </p>

              <h3>개인정보 수집 및 이용 안내</h3>

              <p>
                VORA는 회원가입과 서비스 제공을 위해 이름, 아이디, 이메일,
                비밀번호를 수집합니다.
              </p>

              <p>
                수집한 개인정보는 회원 관리와 서비스 제공 목적으로만
                사용하며, 회원 탈퇴 또는 보관 기간 종료 시 관련 법령에 따라
                파기합니다.
              </p>
            </div>

            <div className="heritage-terms-checks">
              <label className="heritage-terms-all">
                <input
                  type="checkbox"
                  checked={allTermsChecked}
                  onChange={handleAllTerms}
                />

                <strong>필수 약관에 모두 동의합니다.</strong>
              </label>

              <div className="heritage-terms-divider" />

              <label>
                <input
                  type="checkbox"
                  name="service"
                  checked={agreements.service}
                  onChange={handleTermChange}
                />

                <span>[필수] VORA 서비스 이용 약관 동의</span>
              </label>

              <label>
                <input
                  type="checkbox"
                  name="privacy"
                  checked={agreements.privacy}
                  onChange={handleTermChange}
                />

                <span>[필수] 개인정보 수집 및 이용 동의</span>
              </label>
            </div>

            <div className="heritage-terms-actions">
              <button
                type="button"
                className="heritage-terms-cancel"
                onClick={handleTermsCancel}
              >
                취소
              </button>

              <button
                type="button"
                className="heritage-terms-confirm"
                disabled={!allTermsChecked}
                onClick={handleTermsConfirm}
              >
                확인
              </button>
            </div>
          </section>
        </div>
      )}

      <main className="heritage-signup-main">
        <section
          className="heritage-signup-card"
          aria-labelledby="signup-title"
        >
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
                  placeholder="실명을 입력해주세요."
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
              </label>

              <label className="wide">
                <span>아이디</span>

                <input
                  type="text"
                  placeholder="영문, 숫자 포함 4~20자"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  autoComplete="username"
                />
              </label>

              <label className="wide">
                <span>이메일</span>

                <input
                  type="email"
                  placeholder="example@vora.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </label>

              <label>
                <span>비밀번호</span>

                <input
                  type="password"
                  placeholder="영문, 숫자, 특수문자 포함 8~20자"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </label>

              <label>
                <span>비밀번호 확인</span>

                <input
                  type="password"
                  placeholder="비밀번호를 다시 입력해주세요."
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  autoComplete="new-password"
                />
              </label>
            </div>

            {error && (
              <p className="heritage-auth-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="heritage-auth-submit"
              disabled={submitting}
            >
              {submitting ? "가입 중..." : "회원가입"}
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
        <TermsOfServiceModal />
        <span> · </span>
        <PrivacyPolicyModal />
      </footer>
    </div>
  );
}

export default SignUpPage;
