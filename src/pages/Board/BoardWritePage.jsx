import "./BoardWritePage.css";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { addPost, findPost, updatePost } from "../../services/postApi";
import HeritagePage from "../../components/workspace/HeritagePage";
import { maskName } from "../../utils/maskName";
import { readLoginUser } from "../../utils/auth";

function BoardWritePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginUser = readLoginUser();
  const writer = loginUser?.name ? maskName(loginUser.name) : "익명";

  const editPostId = location.state?.editPostId;
  const editMode = Boolean(editPostId);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingPost, setLoadingPost] = useState(editMode);

  useEffect(() => {
    if (!editMode) return;

    findPost(editPostId)
      .then((post) => {
        setTitle(post.title);
        setContent(post.content);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingPost(false));
  }, [editMode, editPostId]);

  if (!loginUser) {
    return (
      <HeritagePage
        active="community"
        eyebrow="COMMUNITY · CASE ARCHIVE"
        title="로그인이 필요합니다"
        description="게시글 작성/수정은 로그인 후 이용할 수 있습니다."
      >
        <button className="heritage-button secondary" onClick={() => navigate("/login")}>
          로그인하러 가기
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
      const post = editMode
        ? await updatePost(editPostId, { title, content })
        : await addPost({ title, content });

      navigate(`/board/${post.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HeritagePage
      active="community"
      eyebrow="COMMUNITY · CASE ARCHIVE"
      title={editMode ? "게시글 수정" : "게시글 작성"}
      description="문화유산 보존처리 사례와 현장 경험을 공유해주세요."
    >
      <button
        className="heritage-back"
        onClick={() => navigate(editMode ? `/board/${editPostId}` : "/board")}
      >
        <span aria-hidden="true">←</span> {editMode ? "게시글로 돌아가기" : "게시판 목록"}
      </button>

      {loadingPost ? (
        <p className="heritage-empty-cell">게시글을 불러오는 중입니다.</p>
      ) : (
        <form className="heritage-panel board-write-form" onSubmit={handleSubmit}>
          <p className="board-write-writer">작성자 {writer}</p>

          <div className="board-write-field">
            <label className="board-write-label" htmlFor="board-write-title">
              제목
            </label>
            <input
              id="board-write-title"
              className="heritage-field"
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="board-write-field">
            <label className="board-write-label" htmlFor="board-write-content">
              내용
            </label>
            <textarea
              id="board-write-content"
              className="heritage-field board-write-textarea"
              placeholder="내용을 입력하세요"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </div>

          {error && <p className="board-write-error">{error}</p>}

          <div className="board-write-actions">
            <button
              type="button"
              className="heritage-button secondary"
              onClick={() => navigate(editMode ? `/board/${editPostId}` : "/board")}
            >
              취소
            </button>
            <button type="submit" className="heritage-button" disabled={submitting}>
              {submitting ? "저장 중..." : editMode ? "수정 완료" : "등록"}
            </button>
          </div>
        </form>
      )}
    </HeritagePage>
  );
}

export default BoardWritePage;
