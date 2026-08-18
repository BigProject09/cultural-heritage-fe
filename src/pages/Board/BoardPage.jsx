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
    setAppliedKeyword(keyword.trim());
  };

  const handleWriteClick = () => {
    if (!loginUser) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    navigate("/board/write");
  };

  const handleRetry = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const posts = pageData?.posts || [];
  const totalPages = pageData?.totalPages ?? 0;
  const totalElements = pageData?.totalElements ?? 0;

  return (
    <HeritagePage
      active="community"
      eyebrow="COMMUNITY · CASE ARCHIVE"
      title="게시판"
      description="문화유산 보존처리 사례와 현장 경험을 확인하고 공유합니다."
      action={
        <button
          className="heritage-button board-write-button"
          type="button"
          onClick={handleWriteClick}
        >
          <span aria-hidden="true">✎</span>
          글쓰기
        </button>
      }
    >
      <section className="heritage-panel board-panel">
        <div className="board-toolbar">
          <div className="board-search-group">
            <select
              className="heritage-select board-search-select"
              aria-label="검색 기준"
              value={searchType}
              onChange={(event) => setSearchType(event.target.value)}
            >
              <option value="title">제목</option>
              <option value="writer">작성자</option>
            </select>

            <input
              id="board-search"
              className="heritage-field board-search-input"
              type="search"
              placeholder="검색어를 입력하세요"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
            />

            <button
              className="heritage-button board-search-button"
              type="button"
              onClick={handleSearch}
            >
              검색
            </button>
          </div>

          <button
            className={`heritage-button secondary board-mine-button${
              onlyMine ? " active" : ""
            }`}
            type="button"
            aria-pressed={onlyMine}
            onClick={() => {
              setPage(0);
              setOnlyMine((prev) => !prev);
            }}
          >
            {onlyMine ? "전체 게시글" : "내 게시글"}
          </button>
        </div>

        <div className="board-result-summary">
          <p className="board-count">
            총 게시글 <strong>{totalElements}</strong>건
          </p>

          {(appliedKeyword || onlyMine) && (
            <div className="board-filter-summary">
              {onlyMine && <span className="board-filter-chip">내 게시글</span>}
              {appliedKeyword && (
                <span className="board-filter-chip">
                  {searchType === "title" ? "제목" : "작성자"} · {appliedKeyword}
                </span>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="board-state">게시글을 불러오는 중입니다.</div>
        )}

        {!loading && error && (
          <div className="heritage-project-state error">
            <strong>게시글을 불러오지 못했습니다.</strong>
            <span>{error}</span>
            <button onClick={handleRetry}>다시 시도</button>
          </div>
        )}

        {!loading && !error && (
          <div className="board-table-wrap">
            <table className="board-table">
              <colgroup>
                <col className="board-col-number" />
                <col />
                <col className="board-col-author" />
                <col className="board-col-views" />
                <col className="board-col-date" />
              </colgroup>
              <thead>
                <tr>
                  <th>번호</th>
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
                      <td className="board-number-cell">
                        {String(post.id).padStart(2, "0")}
                      </td>
                      <td>
                        <strong className="board-title-cell">{post.title}</strong>
                      </td>
                      <td className="board-author-cell">{post.author}</td>
                      <td className="board-view-cell">
                        {post.viewCount.toLocaleString()}
                      </td>
                      <td className="board-date-cell">
                        {formatDate(post.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="board-empty-cell" colSpan={5}>
                      {onlyMine
                        ? "작성한 게시글이 없습니다."
                        : "검색 결과가 없습니다."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <nav className="heritage-pagination board-pagination" aria-label="게시판 페이지">
            <button
              type="button"
              aria-label="이전 페이지"
              disabled={pageData?.first}
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
              disabled={pageData?.last}
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
