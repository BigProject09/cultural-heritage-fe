import "./ProfilePage.css";
import { useNavigate } from "react-router-dom";

function ProfilePage() {
  const navigate = useNavigate();

  return (
    <div className="profile-page">

      <div className="profile-header">
        <button
          className="back-btn"
          onClick={() => navigate("/mypage")}
        >
          ← 마이페이지
        </button>

        <h1>내 정보</h1>
      </div>

      <div className="profile-card">

        <div className="profile-image">
          👤
        </div>

        <div className="profile-info">
          <p><strong>이름</strong></p>
          <span>오서하</span>

          <p><strong>이메일</strong></p>
          <span>oseoha@example.com</span>
        </div>

      </div>

    </div>
  );
}

export default ProfilePage;