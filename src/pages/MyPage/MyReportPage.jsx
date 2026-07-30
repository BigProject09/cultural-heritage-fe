import "./MyReportPage.css";
import { useNavigate } from "react-router-dom";
import { getMyReports } from "../../utils/myReports";

function MyReportPage() {
  const navigate = useNavigate();

  const reports = getMyReports();

  return (
    <div className="report-page">

      <div className="report-header">

        <button
          className="back-btn"
          onClick={() => navigate("/mypage")}
        >
          ← 마이페이지
        </button>

        <h1>📄 내 보고서</h1>

      </div>

      {/* 검색 */}

      <div className="search-section">

        <select>
          <option>제목</option>
          <option>프로젝트</option>
        </select>

        <input
          type="text"
          placeholder="검색어를 입력하세요."
        />

        <button className="search-btn">
          🔍
        </button>

        <button
          className="upload-btn"
          onClick={() => alert("보고서 업로드 페이지")}
        >
          + 보고서 업로드
        </button>

      </div>

      <p className="report-count">
        총 보고서 {reports.length}건
      </p>

      {/* 보고서 목록 */}

      <table className="report-table">

        <thead>
          <tr>
            <th>보고서명</th>
            <th>프로젝트</th>
            <th>생성일</th>
          </tr>
        </thead>

        <tbody>

          {reports.length > 0 ? (
            reports.map((report) => (
              <tr
                key={report.id}
                onClick={() => navigate(`/mypage/reports/${report.id}`)}
              >
                <td>{report.title}</td>
                <td>{report.project}</td>
                <td>{report.date}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>생성된 보고서가 없습니다.</td>
            </tr>
          )}

        </tbody>

      </table>

      <div className="pagination">
        &lt; 1 &gt;
      </div>

    </div>
  );
}

export default MyReportPage;