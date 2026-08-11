import "./BoardDetailPage.css";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deletePost, findPost, isMyPost } from "../../services/postApi";
import HeritagePage from "../../components/workspace/HeritagePage";
import { isAdminUser, readLoginUser } from "../../utils/auth";

function formatDate(isoString) {
  if (!isoString) return "-";
  return isoString.slice(0, 10);
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
  }, [id, loginUser?.email]);

  const canEdit = isOwner;
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
                className="heritage-button secondary"
                type="button"
                onClick={() => navigate("/board/write", { state: { editPostId: post.id } })}
              >
                수정
              </button>
            )}
            {canDelete && (
              <button className="heritage-button secondary" type="button" onClick={handleDelete}>
                삭제
              </button>
            )}
          </div>
        )
      }
    >
      <button className="heritage-back" onClick={() => navigate("/board")}>
        <span aria-hidden="true">←</span> 게시판 목록
      </button>

      <article className="heritage-panel board-detail-card">
        <div className="heritage-meta board-detail-meta">
          <span>작성자 {post.author}</span>
          <span>조회수 {post.viewCount.toLocaleString()}</span>
          <span>작성일 {formatDate(post.createdAt)}</span>
        </div>

        <div className="board-detail-divider" />

        <div className="board-detail-content">{post.content}</div>
      </article>
    </HeritagePage>
  );
}

export default BoardDetailPage;
