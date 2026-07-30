import "./NoticePage.css";
import { noticeData } from "../../data/noticeData";
import HeritagePage from "../../components/workspace/HeritagePage";

function NoticePage() {
  return (
    <HeritagePage
      active="community"
      eyebrow="COMMUNITY · NOTICE"
      title="공지사항"
      description="VORA 서비스 운영 소식과 AI 기능 업데이트를 안내합니다."
    >
      <section className="heritage-panel notice-panel">
        <p className="heritage-count">
          총 공지 <strong>{noticeData.length}</strong>건
        </p>

        <div className="heritage-table-wrap">
          <table className="heritage-table notice-table">
            <thead>
              <tr>
                <th>번호</th>
                <th>제목</th>
                <th>작성일</th>
              </tr>
            </thead>

            <tbody>
              {noticeData.map((notice, index) => (
                <tr key={notice.id}>
                  <td>{String(noticeData.length - index).padStart(2, "0")}</td>
                  <td>
                    {index === 0 && <span className="heritage-badge">NEW</span>}
                    <div>
                      <strong>{notice.title}</strong>
                      <p>{notice.content}</p>
                    </div>
                  </td>
                  <td>{notice.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </HeritagePage>
  );
}

export default NoticePage;
