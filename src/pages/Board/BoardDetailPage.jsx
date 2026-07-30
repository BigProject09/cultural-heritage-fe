import "./BoardDetailPage.css";
import { useNavigate, useParams } from "react-router-dom";
import { boardData } from "../../data/boardData";
import HeritagePage from "../../components/workspace/HeritagePage";

function BoardDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const post = boardData.find(
    (item) => item.id === Number(id)
  );

  if (!post) {
    return (
      <HeritagePage
        active="community"
        eyebrow="COMMUNITY · CASE ARCHIVE"
        title="게시글을 찾을 수 없습니다"
        description="삭제되었거나 존재하지 않는 게시글입니다."
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
    >
      <button className="heritage-back" onClick={() => navigate("/board")}>
        <span aria-hidden="true">←</span> 게시판 목록
      </button>

      <article className="heritage-panel board-detail-card">
        <div className="heritage-meta board-detail-meta">
          <span>작성자 {post.writer}</span>
          <span>조회수 {post.views.toLocaleString()}</span>
          <span>작성일 {post.date}</span>
        </div>

        <div className="board-detail-divider" />

        <div className="board-detail-content">{post.content}</div>
      </article>
    </HeritagePage>
  );
}

export default BoardDetailPage;
