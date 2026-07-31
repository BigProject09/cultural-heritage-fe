import { useState } from "react";
import "./MyPage.css";
import "./AccountPages.css";
import { useNavigate } from "react-router-dom";
import HeritagePage from "../../components/workspace/HeritagePage";

const DEFAULT_PROFILE_EXTRA = {
  role: "복원 전문가",
  bio: "",
};

const NOTICE_ITEMS = [
  "이름, 이메일, 연락처는 회원가입 시 등록한 정보로 표시됩니다.",
  "직무와 소개는 [프로필 수정]에서 언제든 바꿀 수 있습니다.",
  "회원 탈퇴 시 저장된 계정 정보가 즉시 삭제되며 되돌릴 수 없습니다.",
];

function readLoginUser() {
  try {
    return JSON.parse(localStorage.getItem("loginUser") || "null");
  } catch {
    return null;
  }
}

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem("users") || "[]");
  } catch {
    return [];
  }
}

function formatDate(value, withTime = false) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const pad = (n) => String(n).padStart(2, "0");
  const base = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;

  if (!withTime) return base;

  return `${base} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function MyPage() {
  const navigate = useNavigate();
  const [loginUser] = useState(readLoginUser);

  const [profileExtra, setProfileExtra] = useState(() => {
    const saved = localStorage.getItem("userProfileExtra");
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE_EXTRA;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(profileExtra);

  const handleStartEdit = () => {
    setDraft(profileExtra);
    setIsEditing(true);
  };

  const handleSave = () => {
    setProfileExtra(draft);
    localStorage.setItem("userProfileExtra", JSON.stringify(draft));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(profileExtra);
    setIsEditing(false);
  };

  const handleWithdraw = () => {
    if (!loginUser) return;

    const confirmed = window.confirm(
      "정말로 탈퇴하시겠습니까?\n탈퇴 시 모든 정보가 삭제되며 복구할 수 없습니다."
    );
    if (!confirmed) return;

    const remainingUsers = readUsers().filter(
      (user) => user.email !== loginUser.email
    );

    localStorage.setItem("users", JSON.stringify(remainingUsers));
    localStorage.removeItem("loginUser");
    localStorage.removeItem("userProfileExtra");
    navigate("/");
  };

  if (!loginUser) {
    return (
      <HeritagePage
        active="account"
        eyebrow="MY VORA"
        title="마이페이지"
        description="담당자 정보와 프로젝트, 생성된 보존처리 보고서를 관리합니다."
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

  return (
    <HeritagePage
      active="account"
      eyebrow="MY VORA"
      title="마이페이지"
      description="담당자 정보와 프로젝트, 생성된 보존처리 보고서를 관리합니다."
    >
      <section className="account-top-grid">
        <div className="account-profile-card">
          <div className="account-avatar" aria-hidden="true">
            {loginUser.name?.slice(0, 1) || "V"}
          </div>

          {isEditing ? (
            <div className="account-profile-edit">
              <label>
                직무
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
                한 줄 소개
                <input
                  value={draft.bio}
                  placeholder="예) 옛것의 숨결을 오늘에 잇는 마음으로 유물을 마주합니다."
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      bio: event.target.value,
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
              <strong>{profileExtra.role}</strong>
              {profileExtra.bio && <span>“{profileExtra.bio}”</span>}
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
        </div>

        <div className="heritage-panel account-info-card">
          <div className="account-info-card-header">
            <h3 className="card-title">회원 정보</h3>
            <span className="heritage-badge">정회원</span>
          </div>

          <dl className="account-info-list">
            <div className="account-info-row">
              <dt>이름</dt>
              <dd>{loginUser.name}</dd>
            </div>
            <div className="account-info-row">
              <dt>이메일</dt>
              <dd>{loginUser.email}</dd>
            </div>
            <div className="account-info-row">
              <dt>연락처</dt>
              <dd>{loginUser.phone || "-"}</dd>
            </div>
          </dl>

          <button
            type="button"
            className="account-withdraw-button"
            onClick={handleWithdraw}
          >
            회원 탈퇴
          </button>
        </div>
      </section>

      <section className="account-bottom-grid">
        <div className="heritage-panel account-card">
          <h3 className="card-title">계정 정보</h3>

          <dl className="account-info-list">
            <div className="account-info-row">
              <dt>가입일</dt>
              <dd>{formatDate(loginUser.joinedAt)}</dd>
            </div>
            <div className="account-info-row">
              <dt>마지막 로그인</dt>
              <dd>{formatDate(loginUser.lastLoginAt, true)}</dd>
            </div>
            <div className="account-info-row">
              <dt>로그인 방식</dt>
              <dd>이메일 로그인</dd>
            </div>
            <div className="account-info-row">
              <dt>계정 상태</dt>
              <dd>활성</dd>
            </div>
          </dl>
        </div>

        <div className="heritage-panel notice-card">
          <h3 className="card-title">안내</h3>

          <ul className="notice-list">
            {NOTICE_ITEMS.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
      </section>
    </HeritagePage>
  );
}

export default MyPage;
