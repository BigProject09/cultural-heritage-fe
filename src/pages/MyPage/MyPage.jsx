import { useState } from "react";
import "./MyPage.css";
import { useNavigate } from "react-router-dom";
import { getMyReports } from "../../utils/myReports";
import HeritagePage from "../../components/workspace/HeritagePage";

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
    <HeritagePage
      active="account"
      eyebrow="MY CONSERVATION DESK"
      title="마이페이지"
      description="담당자 정보와 프로젝트, 생성된 보존처리 보고서를 관리합니다."
    >
      <section className="account-profile-card">
        <div className="account-avatar" aria-hidden="true">
          {profile.name.slice(0, 1)}
        </div>

        {isEditing ? (
          <div className="account-profile-edit">
            <label>
              이름
              <input
                value={draft.name}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              직함
              <input
                value={draft.role}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    role: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              이메일
              <input
                type="email"
                value={draft.email}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <div className="account-edit-actions">
              <button className="heritage-button" onClick={handleSave}>
                저장
              </button>
              <button
                className="heritage-button secondary"
                onClick={handleCancel}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="account-profile-info">
            <p>CONSERVATOR PROFILE</p>
            <h2>{profile.name}</h2>
            <strong>{profile.role}</strong>
            <span>{profile.email}</span>
          </div>
        )}

        {!isEditing && (
          <button
            className="heritage-button secondary account-edit-button"
            onClick={handleStartEdit}
          >
            프로필 수정
          </button>
        )}
      </section>

      <section className="account-menu-grid">
        <article className="account-menu-card">
          <span className="account-menu-number">01</span>
          <p>PROJECT ARCHIVE</p>
          <h2>내 프로젝트</h2>
          <div className="account-menu-copy">
            작업 중인 유물을 다시 열거나 완료된 복원 결과를 확인합니다.
          </div>
          <button
            className="account-text-link"
            onClick={() => navigate("/worklist")}
          >
            프로젝트 보기 <span>→</span>
          </button>
        </article>

        <article className="account-menu-card">
          <span className="account-menu-number">02</span>
          <p>CONSERVATION REPORT</p>
          <h2>내 보고서</h2>
          <div className="account-menu-copy">
            현재 저장된 보고서는 <strong>{reports.length}건</strong>입니다.
          </div>
          <button
            className="account-text-link"
            onClick={() => navigate("/mypage/reports")}
          >
            보고서 보기 <span>→</span>
          </button>
        </article>

        <article className="account-menu-card muted">
          <span className="account-menu-number">03</span>
          <p>WORK SUMMARY</p>
          <h2>작업 현황</h2>
          <div className="account-menu-copy">
            프로젝트와 생성 보고서 현황을 한눈에 확인합니다.
          </div>
          <button
            className="account-text-link"
            onClick={() => navigate("/mypage/activity")}
          >
            현황 보기 <span>→</span>
          </button>
        </article>
      </section>
    </HeritagePage>
  );
}

export default MyPage;
