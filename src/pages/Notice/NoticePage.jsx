import "./NoticePage.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { findAllNotices } from "../../services/noticeApi";
import HeritagePage from "../../components/workspace/HeritagePage";
import { isAdminUser, readLoginUser } from "../../utils/auth";

function formatNoticeDate(value) {
  if (!value) return "";

  const normalizedValue =
    typeof value === "string" &&
    !value.endsWith("Z") &&
    !/[+-]\d{2}:\d{2}$/.test(value)
      ? `${value}Z`
      : value;

  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

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
        setNotices(Array.isArray(data) ? data : []);
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
            className="heritage-button notice-create-button"
            type="button"
            onClick={() => navigate("/notice/write")}
          >
            <span aria-hidden="true">✎</span>
            공지 등록
          </button>
        )
      }
    >
      <section className="heritage-panel notice-panel">
        <div className="notice-panel-header">
          <p className="notice-count">
            총 공지 <strong>{notices.length}</strong>건
          </p>
        </div>

        {loading && (
          <div className="notice-state">공지사항을 불러오는 중입니다.</div>
        )}

        {!loading && error && (
          <div className="heritage-project-state error">
            <strong>공지사항을 불러오지 못했습니다.</strong>
            <span>{error}</span>
            <button
              onClick={() => {
                setLoading(true);
                setReloadKey((prev) => prev + 1);
              }}
            >
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && notices.length === 0 && (
          <div className="notice-state">등록된 공지사항이 없습니다.</div>
        )}

        {!loading && !error && notices.length > 0 && (
          <div className="notice-list" role="list">
            <div className="notice-list-head" aria-hidden="true">
              <span>번호</span>
              <span>제목</span>
              <span>등록일</span>
            </div>

            {notices.map((notice, index) => {
              const number = String(notices.length - index).padStart(2, "0");
              const createdAt =
                notice.createdAt ??
                notice.created_at ??
                notice.updatedAt ??
                notice.updated_at;

              return (
                <button
                  key={notice.id}
                  type="button"
                  className={`notice-list-row${notice.pinned ? " is-pinned" : ""}`}
                  onClick={() => navigate(`/notice/${notice.id}`)}
                  role="listitem"
                >
                  <span className="notice-number-wrap">
                    <span
                      className={`notice-pin-icon${notice.pinned ? " visible" : ""}`}
                      aria-hidden="true"
                    >
                      ★
                    </span>
                    <span className="notice-number">{number}</span>
                  </span>

                  <span className="notice-title-wrap">
                    {notice.pinned && (
                      <span className="notice-pin-badge">고정</span>
                    )}
                    {index === 0 && !notice.pinned && (
                      <span className="notice-new-badge">NEW</span>
                    )}
                    <strong className="notice-title">{notice.title}</strong>
                  </span>

                  <span className="notice-date">
                    {formatNoticeDate(createdAt)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </HeritagePage>
  );
}

export default NoticePage;
