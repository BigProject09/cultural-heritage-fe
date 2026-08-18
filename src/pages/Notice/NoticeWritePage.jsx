import "./NoticeWritePage.css";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { addNotice, findNotice, updateNotice } from "../../services/noticeApi";
import HeritagePage from "../../components/workspace/HeritagePage";
import { isAdminUser, readLoginUser } from "../../utils/auth";

function NoticeWritePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = isAdminUser(readLoginUser());

  const editNoticeId = location.state?.editNoticeId;
  const editMode = Boolean(editNoticeId);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingNotice, setLoadingNotice] = useState(editMode);

  useEffect(() => {
    if (!editMode) return;

    findNotice(editNoticeId)
      .then((notice) => {
        setTitle(notice.title);
        setContent(notice.content);
        setIsPinned(notice.pinned);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingNotice(false));
  }, [editMode, editNoticeId]);

  if (!isAdmin) {
    return (
      <HeritagePage
        active="community"
        eyebrow="COMMUNITY · NOTICE"
        title="권한이 없습니다"
        description="공지사항 등록/수정은 관리자만 할 수 있습니다."
      >
        <button
          className="heritage-button secondary"
          onClick={() => navigate("/notice")}
        >
          공지사항으로 돌아가기
        </button>
      </HeritagePage>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError("제목과 내용을 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const notice = editMode
        ? await updateNotice(editNoticeId, { title, content, isPinned })
        : await addNotice({ title, content, isPinned });

      navigate(`/notice/${notice.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const backPath = editMode ? `/notice/${editNoticeId}` : "/notice";

  return (
    <HeritagePage
      active="community"
      eyebrow="COMMUNITY · NOTICE"
      title={editMode ? "공지 수정" : "공지 등록"}
      description="VORA 서비스 운영 소식과 AI 기능 업데이트를 안내합니다."
    >
      <button
        className="heritage-back notice-write-back"
        type="button"
        onClick={() => navigate(backPath)}
      >
        <span aria-hidden="true">←</span>{" "}
        {editMode ? "공지로 돌아가기" : "공지사항 목록"}
      </button>

      {loadingNotice ? (
        <p className="heritage-empty-cell">공지를 불러오는 중입니다.</p>
      ) : (
        <form
          className="heritage-panel notice-write-form"
          onSubmit={handleSubmit}
        >
          <div className="notice-write-field">
            <label className="notice-write-label" htmlFor="notice-write-title">
              제목
              <span className="notice-required">필수</span>
            </label>
            <input
              id="notice-write-title"
              className="heritage-field notice-write-input"
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="notice-write-field">
            <label className="notice-write-label" htmlFor="notice-write-content">
              내용
              <span className="notice-required">필수</span>
            </label>
            <textarea
              id="notice-write-content"
              className="heritage-field notice-write-textarea"
              placeholder="내용을 입력하세요"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </div>

          <div className="notice-write-footer">
            <label className="notice-pin-control">
              <span className="notice-pin-control-icon" aria-hidden="true">
                📌
              </span>

              <span className="notice-pin-control-copy">
                <strong>상단 고정</strong>
                <span>활성화하면 공지가 목록 상단에 고정됩니다.</span>
              </span>

              <input
                className="notice-pin-checkbox"
                type="checkbox"
                checked={isPinned}
                onChange={(event) => setIsPinned(event.target.checked)}
              />
              <span className="notice-pin-switch" aria-hidden="true">
                <span />
              </span>
            </label>

            <div className="notice-write-actions">
              <button
                type="button"
                className="heritage-button secondary notice-write-action"
                onClick={() => navigate(backPath)}
              >
                취소
              </button>
              <button
                type="submit"
                className="heritage-button notice-write-action"
                disabled={submitting}
              >
                {submitting ? "저장 중..." : editMode ? "수정 완료" : "등록"}
              </button>
            </div>
          </div>

          {error && <p className="notice-write-error">{error}</p>}
        </form>
      )}
    </HeritagePage>
  );
}

export default NoticeWritePage;
