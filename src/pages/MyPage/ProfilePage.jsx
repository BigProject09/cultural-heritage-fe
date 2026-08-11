import "./ProfilePage.css";
import "./AccountPages.css";
import { useNavigate } from "react-router-dom";
import HeritagePage from "../../components/workspace/HeritagePage";

const DEFAULT_ROLE = "복원 전문가";

function ProfilePage() {
  const navigate = useNavigate();

  const loginUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("loginUser") || "null");
    } catch {
      return null;
    }
  })();

  const profileExtra = (() => {
    try {
      return JSON.parse(localStorage.getItem("userProfileExtra") || "null");
    } catch {
      return null;
    }
  })();

  if (!loginUser) {
    return (
      <HeritagePage
        active="account"
        eyebrow="MY CONSERVATION DESK"
        title="내 정보"
        description="워크스페이스에 표시되는 담당자 정보를 확인합니다."
      >
        <section className="heritage-panel account-guest-card">
          <p>담당자 정보를 확인하려면 먼저 로그인해주세요.</p>
          <button className="heritage-button" onClick={() => navigate("/login")}>
            로그인하러 가기
          </button>
        </section>
      </HeritagePage>
    );
  }

  const profile = {
    name: loginUser.name,
    role: profileExtra?.role || DEFAULT_ROLE,
    email: loginUser.email,
    memberGrade: loginUser.role === "ADMIN" ? "관리자" : "일반회원",
  };

  return (
    <HeritagePage
      active="account"
      eyebrow="MY CONSERVATION DESK"
      title="내 정보"
      description="워크스페이스에 표시되는 담당자 정보를 확인합니다."
    >
      <nav className="account-subnav" aria-label="마이페이지 메뉴">
        <button onClick={() => navigate("/mypage")}>마이페이지</button>
        <button className="current">내 정보</button>
        <button onClick={() => navigate("/mypage/activity")}>작업 현황</button>
        <button onClick={() => navigate("/mypage/reports")}>내 보고서</button>
      </nav>

      <section className="heritage-panel account-profile-detail">
        <div className="account-profile-seal" aria-hidden="true">
          {profile.name.slice(0, 1)}
        </div>
        <dl className="account-info-list">
          <div className="account-info-row">
            <dt>이름</dt>
            <dd>{profile.name}</dd>
          </div>
          <div className="account-info-row">
            <dt>담당 업무</dt>
            <dd>{profile.role}</dd>
          </div>
          <div className="account-info-row">
            <dt>이메일</dt>
            <dd>{profile.email}</dd>
          </div>
          <div className="account-info-row">
            <dt>회원 등급</dt>
            <dd>{profile.memberGrade}</dd>
          </div>
        </dl>
        <button
          className="heritage-button secondary"
          onClick={() => navigate("/mypage")}
        >
          마이페이지에서 수정
        </button>
      </section>
    </HeritagePage>
  );
}

export default ProfilePage;
