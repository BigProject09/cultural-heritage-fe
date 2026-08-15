import "./SignUpPage.css";
import "./LoginPage.css";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import HeritageHeader from "../../components/workspace/HeritageHeader";
import PrivacyPolicyModal from "../../components/common/PrivacyPolicyModal";
import TermsOfServiceModal from "../../components/common/TermsOfServiceModal";
import { signup } from "../../services/userApi";

const ID_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{4,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;

function SignUpPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({});

  const [isTermsOpen, setIsTermsOpen] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [agreements, setAgreements] = useState({ service: false, privacy: false });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allTermsChecked = agreements.service && agreements.privacy;

  const fieldErrors = useMemo(() => ({
    name: !name.trim() ? "이름을 입력해주세요." : name.trim().length > 30 ? "이름은 30자 이하여야 합니다." : "",
    userId: !userId.trim()
      ? "아이디를 입력해주세요."
      : !ID_REGEX.test(userId.trim())
        ? "영문과 숫자를 모두 포함해 4~20자로 입력해주세요."
        : "",
    email: !email.trim()
      ? "이메일을 입력해주세요."
      : !EMAIL_REGEX.test(email.trim())
        ? "예: name@example.com 형식으로 입력해주세요."
        : "",
    password: !password
      ? "비밀번호를 입력해주세요."
      : !PASSWORD_REGEX.test(password)
        ? "영문·숫자·특수문자를 모두 포함해 8~20자로 입력해주세요."
        : "",
    confirmPassword: !confirmPassword
      ? "비밀번호를 한 번 더 입력해주세요."
      : password !== confirmPassword
        ? "비밀번호가 일치하지 않습니다."
        : "",
  }), [name, userId, email, password, confirmPassword]);

  const touch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const inputClass = (field) => {
    if (!touched[field]) return "";
    return fieldErrors[field] ? "invalid" : "valid";
  };

  const handleAllTerms = (event) => {
    const checked = event.target.checked;
    setAgreements({ service: checked, privacy: checked });
  };

  const handleTermChange = (event) => {
    const { name: fieldName, checked } = event.target;
    setAgreements((previous) => ({ ...previous, [fieldName]: checked }));
  };

  const handleTermsConfirm = () => {
    if (!allTermsChecked) return;
    setTermsAccepted(true);
    setIsTermsOpen(false);
    setError("");
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    setError("");
    setTouched({ name: true, userId: true, email: true, password: true, confirmPassword: true });

    if (!termsAccepted) {
      setError("필수 약관 동의가 필요합니다.");
      setIsTermsOpen(true);
      return;
    }

    if (Object.values(fieldErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await signup({
        loginId: userId.trim(),
        email: email.trim(),
        password,
        nickName: name.trim(),
      });
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message || "회원가입에 실패했습니다. 입력 정보를 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="heritage-auth-page heritage-signup-page">
      <HeritageHeader active="account" />

      {isTermsOpen && (
        <div className="heritage-terms-overlay" role="dialog" aria-modal="true" aria-labelledby="terms-modal-title">
          <section className="heritage-terms-modal">
            <div className="heritage-terms-modal-heading">
              <p className="heritage-auth-eyebrow">TERMS OF SERVICE</p>
              <h2 id="terms-modal-title">이용 약관 동의</h2>
              <span>VORA 서비스 이용을 위해 필수 약관에 동의해주세요.</span>
            </div>

            <div className="heritage-terms-content">
              <h3>VORA 서비스 이용 약관</h3>
              <p>VORA는 문화유산 보존처리 업무를 지원하기 위한 워크스페이스입니다. 사용자는 서비스 이용 과정에서 관련 법령과 운영 정책을 준수해야 합니다.</p>
              <p>서비스에서 제공하는 분석 결과와 보존처리 가이드는 업무를 보조하기 위한 참고 자료입니다. 실제 보존처리 여부와 방법에 대한 최종 판단은 사용자와 관련 전문가가 진행해야 합니다.</p>
              <h3>개인정보 수집 및 이용 안내</h3>
              <p>VORA는 회원가입 및 서비스 제공을 위해 이름, 아이디, 이메일을 수집하며 비밀번호는 인증을 위해 암호화하여 처리합니다.</p>
              <p>수집한 개인정보는 회원 관리와 서비스 제공 목적으로만 사용하며, 회원 탈퇴 또는 보관 기간 종료 시 관련 법령과 내부 정책에 따라 처리합니다.</p>
            </div>

            <div className="heritage-terms-checks">
              <label className="heritage-terms-all">
                <input type="checkbox" checked={allTermsChecked} onChange={handleAllTerms} />
                <strong>필수 약관에 모두 동의합니다.</strong>
              </label>
              <div className="heritage-terms-divider" />
              <label>
                <input type="checkbox" name="service" checked={agreements.service} onChange={handleTermChange} />
                <span>[필수] VORA 서비스 이용 약관 동의</span>
              </label>
              <label>
                <input type="checkbox" name="privacy" checked={agreements.privacy} onChange={handleTermChange} />
                <span>[필수] 개인정보 수집 및 이용 동의</span>
              </label>
            </div>

            <div className="heritage-terms-actions">
              <button type="button" className="heritage-terms-cancel" onClick={() => navigate("/login")}>취소</button>
              <button type="button" className="heritage-terms-confirm" disabled={!allTermsChecked} onClick={handleTermsConfirm}>확인</button>
            </div>
          </section>
        </div>
      )}

      <main className="heritage-signup-main">
        <section className="heritage-signup-card" aria-labelledby="signup-title">
          <div className="heritage-signup-heading">
            <div>
              <p className="heritage-auth-eyebrow">CREATE ACCOUNT</p>
              <h1 id="signup-title">회원가입</h1>
              <span>입력 조건을 확인하면서 VORA 계정을 생성합니다.</span>
            </div>
            <b aria-hidden="true">✣</b>
          </div>

          <form onSubmit={handleSignUp} noValidate>
            <div className="heritage-signup-grid">
              <label>
                <span>이름</span>
                <input className={inputClass("name")} type="text" placeholder="실명을 입력해주세요." value={name} onChange={(e) => setName(e.target.value)} onBlur={() => touch("name")} autoComplete="name" />
                {touched.name && <p className={`heritage-field-message ${fieldErrors.name ? "error" : "success"}`}>{fieldErrors.name || "입력되었습니다."}</p>}
              </label>

              <label className="wide">
                <span>아이디</span>
                <input className={inputClass("userId")} type="text" placeholder="영문 + 숫자, 4~20자" value={userId} onChange={(e) => setUserId(e.target.value.replace(/\s/g, ""))} onBlur={() => touch("userId")} autoComplete="username" />
                {touched.userId && <p className={`heritage-field-message ${fieldErrors.userId ? "error" : "success"}`}>{fieldErrors.userId || "사용 가능한 형식입니다. 중복 여부는 가입 시 확인합니다."}</p>}
              </label>

              <label className="wide">
                <span>이메일</span>
                <input className={inputClass("email")} type="email" placeholder="example@vora.com" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => touch("email")} autoComplete="email" />
                {touched.email && <p className={`heritage-field-message ${fieldErrors.email ? "error" : "success"}`}>{fieldErrors.email || "올바른 이메일 형식입니다."}</p>}
              </label>

              <label>
                <span>비밀번호</span>
                <div className="heritage-password-field">
                  <input className={inputClass("password")} type={showPassword ? "text" : "password"} placeholder="영문·숫자·특수문자 8~20자" value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => touch("password")} autoComplete="new-password" />
                  <button type="button" className="heritage-password-toggle" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "숨김" : "보기"}</button>
                </div>
                {touched.password && <p className={`heritage-field-message ${fieldErrors.password ? "error" : "success"}`}>{fieldErrors.password || "사용 가능한 비밀번호입니다."}</p>}
              </label>

              <label>
                <span>비밀번호 확인</span>
                <div className="heritage-password-field">
                  <input className={inputClass("confirmPassword")} type={showConfirmPassword ? "text" : "password"} placeholder="비밀번호를 다시 입력해주세요." value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onBlur={() => touch("confirmPassword")} autoComplete="new-password" />
                  <button type="button" className="heritage-password-toggle" onClick={() => setShowConfirmPassword((v) => !v)}>{showConfirmPassword ? "숨김" : "보기"}</button>
                </div>
                {touched.confirmPassword && <p className={`heritage-field-message ${fieldErrors.confirmPassword ? "error" : "success"}`}>{fieldErrors.confirmPassword || "비밀번호가 일치합니다."}</p>}
              </label>
            </div>

            <p className="heritage-signup-privacy-note">개인정보는 계정 운영에 필요한 범위에서만 사용하며, 화면 표시 시 필요한 정보는 마스킹하여 노출합니다.</p>

            {error && <p className="heritage-auth-error" role="alert">{error}</p>}
            <button type="submit" className="heritage-auth-submit" disabled={submitting}>{submitting ? "가입 중..." : "회원가입"}</button>
          </form>

          <div className="heritage-auth-links">
            <span>이미 계정이 있나요?</span>
            <button type="button" onClick={() => navigate("/login")}>로그인</button>
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
