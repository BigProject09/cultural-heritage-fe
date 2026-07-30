import "./BoardPage.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { boardData } from "../../data/boardData";
import HeritagePage from "../../components/workspace/HeritagePage";

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
    <HeritagePage
      active="community"
      eyebrow="COMMUNITY · CASE ARCHIVE"
      title="게시판"
      description="문화유산 보존처리 사례와 현장 경험을 확인하고 공유합니다."
    >
      <section className="heritage-panel board-panel">
        <div className="heritage-toolbar">
          <label className="board-search-label" htmlFor="board-search">
            게시글 검색
          </label>
          <select
            className="heritage-select"
            aria-label="검색 기준"
            value={searchType}
            onChange={(event) => setSearchType(event.target.value)}
          >
            <option value="title">제목</option>
            <option value="writer">작성자</option>
          </select>

          <input
            id="board-search"
            className="heritage-field"
            type="search"
            placeholder="검색어를 입력하세요"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />

          <button className="heritage-button" type="button">
            검색
          </button>
        </div>

        <p className="heritage-count">
          총 게시글 <strong>{filteredBoard.length}</strong>건
        </p>

        <div className="heritage-table-wrap">
          <table className="heritage-table board-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>작성자</th>
                <th>조회수</th>
                <th>작성일</th>
              </tr>
            </thead>

            <tbody>
              {filteredBoard.length > 0 ? (
                filteredBoard.map((post) => (
                  <tr
                    key={post.id}
                    data-clickable="true"
                    tabIndex={0}
                    onClick={() => navigate(`/board/${post.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        navigate(`/board/${post.id}`);
                      }
                    }}
                  >
                    <td>
                      <span className="board-post-number">
                        {String(post.id).padStart(2, "0")}
                      </span>
                      {post.title}
                    </td>
                    <td>{post.writer}</td>
                    <td>{post.views.toLocaleString()}</td>
                    <td>{post.date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="heritage-empty-cell" colSpan={4}>
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <nav className="heritage-pagination" aria-label="게시판 페이지">
          <button type="button" aria-label="이전 페이지">
            ‹
          </button>
          <button type="button" className="active" aria-current="page">
            1
          </button>
          <button type="button">2</button>
          <button type="button">3</button>
          <button type="button" aria-label="다음 페이지">
            ›
          </button>
        </nav>
      </section>
    </HeritagePage>
  );
}

export default BoardPage;
