import { useState } from "react";
import "./MyPage.css";
import { useNavigate } from "react-router-dom";
import { getMyReports } from "../../utils/myReports";

const DEFAULT_PROFILE = {
  name: "에이블러",
  role: "복원 전문가",
  email: "user@vora.com",
};

function MyPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("userProfile");
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(profile);

  const reports = getMyReports();

  const handleStartEdit = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const handleSave = () => {
    setProfile(draft);
    localStorage.setItem("userProfile", JSON.stringify(draft));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(profile);
    setIsEditing(false);
  };

  return (
    <div className="my-page">

      {/* ================= 헤더 ================= */}

      <div className="mypage-header">

        <button
          className="back-btn"
          onClick={() => navigate("/")}
        >
          ← 홈으로
        </button>

        <h1>마이페이지</h1>

      </div>

      {/* ================= 프로필 카드 ================= */}

      <div className="profile-card">

        <div className="profile-avatar">
          👤
        </div>

        {isEditing ? (
          <div className="profile-info profile-info-editing">

            <input
              className="profile-edit-input"
              value={draft.name}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="이름"
            />

            <input
              className="profile-edit-input"
              value={draft.role}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, role: e.target.value }))
              }
              placeholder="직함"
            />

            <input
              className="profile-edit-input"
              value={draft.email}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="이메일"
            />

            <div className="profile-edit-actions">
              <button className="profile-save-btn" onClick={handleSave}>
                저장
              </button>

              <button className="profile-cancel-btn" onClick={handleCancel}>
                취소
              </button>
            </div>

          </div>
        ) : (
          <div
            className="profile-info"
            onClick={handleStartEdit}
          >

            <h2>{profile.name}</h2>

            <p>{profile.role}</p>

            <span>{profile.email}</span>

          </div>
        )}

      </div>

      {/* ================= 프로젝트 & 보고서 ================= */}

      <div className="menu-grid">

        <div className="menu-card">

          <h2>📂 진행 중인 프로젝트</h2>

          <div className="list-area">

            <p>청동기 복원 프로젝트</p>
            <p>고려청자 복원 프로젝트</p>
            <p>백자 복원 프로젝트</p>

          </div>

          <button
            className="view-btn"
            onClick={() => navigate("/mypage/projects")}
          >
            전체보기 →
          </button>

        </div>

        <div className="menu-card">

          <h2>📄 내 보고서</h2>

          <div className="list-area">

            {reports.length > 0 ? (
              reports
                .slice(0, 3)
                .map((report) => <p key={report.id}>{report.title}</p>)
            ) : (
              <p>아직 생성된 보고서가 없습니다.</p>
            )}

          </div>

          <button
            className="view-btn"
            onClick={() => navigate("/mypage/reports")}
          >
            전체보기 →
          </button>

        </div>

      </div>

    </div>
  );
}

export default MyPage;