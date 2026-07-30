import "./BoardPage.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { boardData } from "../../data/boardData";

function BoardPage() {
  const navigate = useNavigate();

  const [searchType, setSearchType] = useState("title");
  const [keyword, setKeyword] = useState("");

  const filteredBoard = boardData.filter((item) => {
    if (!keyword) return true;

    if (searchType === "title") {
      return item.title.toLowerCase().includes(keyword.toLowerCase());
    }

    if (searchType === "writer") {
      return item.writer.includes(keyword);
    }

    return true;
  });

  return (
    <div className="board-page">

  <header className="board-header">
  <div
    className="board-logo"
    onClick={() => navigate("/")}
    style={{ cursor: "pointer" }}
  >
    VORA
  </div>
</header>

<h1 className="board-title">
  📜 게시판
</h1>

  {/* 검색 */}
      <div className="search-box">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
        >
          <option value="title">제목</option>
          <option value="writer">작성자</option>
        </select>

        <input
          type="text"
          placeholder="검색어를 입력하세요."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <button>🔍</button>
      </div>

      <p className="board-count">
        총 게시글 {filteredBoard.length}건
      </p>

      {/* 게시판 */}
      <table className="board-table">
        <thead>
          <tr>
            <th>제목</th>
            <th>작성자</th>
            <th>조회수</th>
            <th>작성일</th>
          </tr>
        </thead>

        <tbody>
          {filteredBoard.map((post) => (
            <tr
              key={post.id}
              onClick={() =>
                navigate(`/board/${post.id}`)
              }
            >
              <td>{post.title}</td>
              <td>{post.writer}</td>
              <td>{post.views}</td>
              <td>{post.date}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 페이지네이션(더미) */}
      <div className="pagination">
        &lt; 1 2 3 4 5 &gt;
      </div>
    </div>
  );
}

export default BoardPage;