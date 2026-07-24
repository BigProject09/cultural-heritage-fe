import "./MyReportPage.css";
import { useNavigate } from "react-router-dom";

function MyReportPage() {
  const navigate = useNavigate();

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
        총 보고서 3건
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

          <tr>
            <td>🏺 고려청자 복원 보고서</td>
            <td>고려청자 복원</td>
            <td>2026-07-23</td>
          </tr>

          <tr>
            <td>⚱️ 청동기 보존 보고서</td>
            <td>청동기 복원</td>
            <td>2026-07-20</td>
          </tr>

          <tr>
            <td>🏛️ 백자 복원 보고서</td>
            <td>백자 복원</td>
            <td>2026-07-15</td>
          </tr>

        </tbody>

      </table>

      <div className="pagination">
        &lt; 1 &gt;
      </div>

    </div>
  );
}

export default MyReportPage;