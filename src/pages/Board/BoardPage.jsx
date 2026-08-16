import "./BoardPage.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { findAllPosts, findMyPosts } from "../../services/postApi";
import HeritagePage from "../../components/workspace/HeritagePage";
import { readLoginUser } from "../../utils/auth";

const SEARCH_TYPE_MAP = {
  title: "TITLE",
  writer: "AUTHOR",
};

function formatDate(isoString) {
  if (!isoString) return "-";
  return isoString.slice(0, 10);
}

function BoardPage() {
  const navigate = useNavigate();
  const loginUser = readLoginUser();

  const [searchType, setSearchType] = useState("title");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [page, setPage] = useState(0);

  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const request = onlyMine
      ? findMyPosts({ page, signal: controller.signal })
      : findAllPosts({
          searchType: SEARCH_TYPE_MAP[searchType],
          keyword: appliedKeyword,
          page,
          signal: controller.signal,
        });

    request
      .then((data) => {
        setPageData(data);
        setError("");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [searchType, appliedKeyword, onlyMine, page, reloadKey]);

  const handleSearch = () => {
    setPage(0);
    setAppliedKeyword(keyword);
  };

  const handleWriteClick = () => {
    if (!loginUser) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    navigate("/board/write");
  };

  const posts = pageData?.posts || [];
  const totalPages = pageData?.totalPages ?? 0;

  return (
    <HeritagePage
      active="community"
      eyebrow="COMMUNITY · CASE ARCHIVE"
      title="게시판"
      description="문화유산 보존처리 사례와 현장 경험을 확인하고 공유합니다."
      action={
        <button className="heritage-button" type="button" onClick={handleWriteClick}>
          글쓰기
        </button>
      }
    >
      <section className="heritage-panel board-panel">
        <div className="heritage-toolbar">
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
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch();
            }}
          />

          <button className="heritage-button" type="button" onClick={handleSearch}>
            검색
          </button>

          <button
            className={`heritage-button secondary${onlyMine ? " active" : ""}`}
            type="button"
            aria-pressed={onlyMine}
            onClick={() => {
              setPage(0);
              setOnlyMine((prev) => !prev);
            }}
          >
            내 게시글
          </button>
        </div>

        <p className="heritage-count">
          총 게시글 <strong>{pageData?.totalElements ?? 0}</strong>건
        </p>

        {loading && <p className="heritage-empty-cell">게시글을 불러오는 중입니다.</p>}

        {!loading && error && (
          <div className="heritage-project-state error">
            <strong>게시글을 불러오지 못했습니다.</strong>
            <span>{error}</span>
            <button onClick={() => setReloadKey((prev) => prev + 1)}>다시 시도</button>
          </div>
        )}

        {!loading && !error && (
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
                {posts.length > 0 ? (
                  posts.map((post) => (
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
                      <td>{post.author}</td>
                      <td>{post.viewCount.toLocaleString()}</td>
                      <td>{formatDate(post.createdAt)}</td>
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
        )}

        {!loading && !error && totalPages > 1 && (
          <nav className="heritage-pagination" aria-label="게시판 페이지">
            <button
              type="button"
              aria-label="이전 페이지"
              disabled={pageData.first}
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index}
                type="button"
                className={index === page ? "active" : ""}
                aria-current={index === page ? "page" : undefined}
                onClick={() => setPage(index)}
              >
                {index + 1}
              </button>
            ))}
            <button
              type="button"
              aria-label="다음 페이지"
              disabled={pageData.last}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
            >
              ›
            </button>
          </nav>
        )}
      </section>
    </HeritagePage>
  );
}

export default BoardPage;
