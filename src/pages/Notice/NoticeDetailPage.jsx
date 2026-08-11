import "../Board/BoardDetailPage.css";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteNotice, findNotice } from "../../services/noticeApi";
import HeritagePage from "../../components/workspace/HeritagePage";
import { isAdminUser, readLoginUser } from "../../utils/auth";

function NoticeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isAdmin = isAdminUser(readLoginUser());

  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    findNotice(id, { signal: controller.signal })
      .then((data) => {
        setNotice(data);
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

  const handleDelete = async () => {
    if (!window.confirm("이 공지를 삭제하시겠습니까?")) return;

    try {
      await deleteNotice(id);
      navigate("/notice");
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <HeritagePage
        active="community"
        eyebrow="COMMUNITY · NOTICE DETAIL"
        title="공지를 불러오는 중입니다"
        description=""
      />
    );
  }

  if (error || !notice) {
    return (
      <HeritagePage
        active="community"
        eyebrow="COMMUNITY · NOTICE"
        title="공지를 찾을 수 없습니다"
        description={error || "삭제되었거나 존재하지 않는 공지입니다."}
      >
        <button className="heritage-button secondary" onClick={() => navigate("/notice")}>
          공지사항으로 돌아가기
        </button>
      </HeritagePage>
    );
  }

  return (
    <HeritagePage
      active="community"
      eyebrow="COMMUNITY · NOTICE DETAIL"
      title={notice.title}
      description="VORA 서비스 운영 소식과 AI 기능 업데이트를 안내합니다."
      action={
        isAdmin && (
          <div className="board-detail-owner-actions">
            <button
              className="heritage-button secondary"
              type="button"
              onClick={() => navigate("/notice/write", { state: { editNoticeId: notice.id } })}
            >
              수정
            </button>
            <button className="heritage-button secondary" type="button" onClick={handleDelete}>
              삭제
            </button>
          </div>
        )
      }
    >
      <button className="heritage-back" onClick={() => navigate("/notice")}>
        <span aria-hidden="true">←</span> 공지사항 목록
      </button>

      <article className="heritage-panel board-detail-card">
        {notice.pinned && (
          <div className="heritage-meta board-detail-meta">
            <span className="heritage-badge">상단 고정</span>
          </div>
        )}

        <div className="board-detail-divider" />

        <div className="board-detail-content">{notice.content}</div>
      </article>
    </HeritagePage>
  );
}

export default NoticeDetailPage;
