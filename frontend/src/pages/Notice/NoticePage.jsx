import "./NoticePage.css";
import { useNavigate } from "react-router-dom";
import { noticeData } from "../../data/noticeData";

function NoticePage() {
  const navigate = useNavigate();

  return (
    <div className="notice-page">

      <header className="notice-header">
        <div
          className="notice-logo"
          onClick={() => navigate("/")}
        >
          VORA
        </div>
      </header>

      <h1 className="notice-title">
        📢 공지사항
      </h1>

      <p className="notice-count">
        총 공지 {noticeData.length}건
      </p>

      <table className="notice-table">

        <thead>
          <tr>
            <th>제목</th>
            <th>작성일</th>
          </tr>
        </thead>

        <tbody>

          {noticeData.map((notice) => (

            <tr key={notice.id}>

              <td>{notice.title}</td>

              <td>{notice.date}</td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

export default NoticePage;