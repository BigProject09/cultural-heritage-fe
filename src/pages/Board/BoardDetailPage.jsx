import "./BoardDetailPage.css";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deletePost, findPost, isMyPost } from "../../services/postApi";
import HeritagePage from "../../components/workspace/HeritagePage";
import { isAdminUser, readLoginUser } from "../../utils/auth";

function normalizeUtcValue(value) {
  if (
    typeof value === "string" &&
    !value.endsWith("Z") &&
    !/[+-]\d{2}:\d{2}$/.test(value)
  ) {
    return `${value}Z`;
  }

  return value;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(normalizeUtcValue(value));
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function BoardDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const loginUser = readLoginUser();
  const isAdmin = isAdminUser(loginUser);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    findPost(id, { signal: controller.signal })
      .then((data) => {
        setPost(data);
        setError("");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!loginUser) return;

    isMyPost(id)
      .then(setIsOwner)
      .catch(() => setIsOwner(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loginUser?.loginId]);

  const canEdit = isOwner || isAdmin;
  const canDelete = isOwner || isAdmin;

  const handleDelete = async () => {
    if (!window.confirm("이 게시글을 삭제하시겠습니까?")) return;

    try {
      await deletePost(id);
      navigate("/board");
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <HeritagePage
        active="community"
        eyebrow="COMMUNITY · CASE DETAIL"
        title="게시글을 불러오는 중입니다"
        description=""
      />
    );
  }

  if (error || !post) {
    return (
      <HeritagePage
        active="community"
        eyebrow="COMMUNITY · CASE ARCHIVE"
        title="게시글을 찾을 수 없습니다"
        description={error || "삭제되었거나 존재하지 않는 게시글입니다."}
      >
        <button className="heritage-button secondary" onClick={() => navigate("/board")}>
          게시판으로 돌아가기
        </button>
      </HeritagePage>
    );
  }

  return (
    <HeritagePage
      active="community"
      eyebrow="COMMUNITY · CASE DETAIL"
      title={post.title}
      description="보존처리 현장에서 공유된 사례입니다."
      action={
        (canEdit || canDelete) && (
          <div className="board-detail-owner-actions">
            {canEdit && (
              <button
                className="heritage-button secondary board-detail-action"
                type="button"
                onClick={() =>
                  navigate("/board/write", { state: { editPostId: post.id } })
                }
              >
                수정
              </button>
            )}
            {canDelete && (
              <button
                className="heritage-button secondary board-detail-action board-detail-delete"
                type="button"
                onClick={handleDelete}
              >
                삭제
              </button>
            )}
          </div>
        )
      }
    >
      <button
        className="heritage-back board-detail-back"
        type="button"
        onClick={() => navigate("/board")}
      >
        <span aria-hidden="true">←</span> 게시판 목록
      </button>

      <article className="heritage-panel board-detail-card">
        <header className="board-detail-card-header">
          <div className="board-detail-label">CASE ARCHIVE</div>

          <div className="board-detail-meta">
            <span>
              <small>작성자</small>
              <strong>{post.author}</strong>
            </span>
            <span>
              <small>조회수</small>
              <strong>{post.viewCount.toLocaleString()}</strong>
            </span>
            <span>
              <small>작성일</small>
              <strong>{formatDate(post.createdAt)}</strong>
            </span>
          </div>
        </header>

        <div className="board-detail-divider" />

        <div className="board-detail-content">{post.content}</div>
      </article>
    </HeritagePage>
  );
}

export default BoardDetailPage;
