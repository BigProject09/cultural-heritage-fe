import "./ProfilePage.css";
import "./AccountPages.css";
import { useNavigate } from "react-router-dom";
import HeritagePage from "../../components/workspace/HeritagePage";

function ProfilePage() {
  const navigate = useNavigate();
  const profile = (() => {
    try {
      return JSON.parse(localStorage.getItem("userProfile") || "null");
    } catch {
      return null;
    }
  })() || {
    name: "에이블러",
    role: "복원 전문가",
    email: "user@vora.com",
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
