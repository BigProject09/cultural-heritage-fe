import "./BoardDetailPage.css";
import { useNavigate, useParams } from "react-router-dom";
import { boardData } from "../../data/boardData";

function BoardDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const post = boardData.find(
    (item) => item.id === Number(id)
  );

  if (!post) {
    return (
      <div className="board-detail-page">
        <h2>게시글을 찾을 수 없습니다.</h2>

        <button
          className="back-btn"
          onClick={() => navigate("/board")}
        >
          목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="board-detail-page">
      <button
        className="back-btn"
        onClick={() => navigate("/board")}
      >
        ← 목록
      </button>

      <div className="detail-card">
        <h1>{post.title}</h1>

        <div className="detail-info">
          <span>작성자 : {post.writer}</span>
          <span>조회수 : {post.views}</span>
          <span>작성일 : {post.date}</span>
        </div>

        <hr />

        <div className="detail-content">
          {post.content}
        </div>
      </div>
    </div>
  );
}

export default BoardDetailPage;