import "./NoticePage.css";
import "../Board/BoardPage.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { findAllNotices } from "../../services/noticeApi";
import HeritagePage from "../../components/workspace/HeritagePage";
import { isAdminUser, readLoginUser } from "../../utils/auth";

function NoticePage() {
  const navigate = useNavigate();
  const isAdmin = isAdminUser(readLoginUser());

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    findAllNotices({ signal: controller.signal })
      .then((data) => {
        setNotices(data);
        setError("");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  return (
    <HeritagePage
      active="community"
      eyebrow="COMMUNITY · NOTICE"
      title="공지사항"
      description="VORA 서비스 운영 소식과 AI 기능 업데이트를 안내합니다."
      action={
        isAdmin && (
          <button
            className="heritage-button"
            type="button"
            onClick={() => navigate("/notice/write")}
          >
            공지 등록
          </button>
        )
      }
    >
      <section className="heritage-panel notice-panel">
        <p className="heritage-count">
          총 공지 <strong>{notices.length}</strong>건
        </p>

        {loading && <p className="heritage-empty-cell">공지사항을 불러오는 중입니다.</p>}

        {!loading && error && (
          <div className="heritage-project-state error">
            <strong>공지사항을 불러오지 못했습니다.</strong>
            <span>{error}</span>
            <button onClick={() => setReloadKey((prev) => prev + 1)}>다시 시도</button>
          </div>
        )}

        {!loading && !error && (
          <div className="heritage-table-wrap">
            <table className="heritage-table notice-table">
              <thead>
                <tr>
                  <th>제목</th>
                </tr>
              </thead>

              <tbody>
                {notices.map((notice, index) => (
                  <tr
                    key={notice.id}
                    data-clickable="true"
                    tabIndex={0}
                    onClick={() => navigate(`/notice/${notice.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        navigate(`/notice/${notice.id}`);
                      }
                    }}
                  >
                    <td>
                      <span className="board-post-number">
                        {String(notices.length - index).padStart(2, "0")}
                      </span>
                      {notice.pinned && <span className="heritage-badge">고정</span>}
                      {index === 0 && !notice.pinned && (
                        <span className="heritage-badge">NEW</span>
                      )}
                      <strong>{notice.title}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </HeritagePage>
  );
}

export default NoticePage;
