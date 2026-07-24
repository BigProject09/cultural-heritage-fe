import "./ProjectPage.css";
import { useNavigate } from "react-router-dom";

function ProjectPage() {
  const navigate = useNavigate();

  return (
    <div className="project-page">

      <div className="project-header">

        <button
          className="back-btn"
          onClick={() => navigate("/mypage")}
        >
          ← 마이페이지
        </button>

        <h1>📂 내 프로젝트</h1>

      </div>

      {/* 검색 */}

      <div className="search-section">

        <select>
          <option>제목</option>
          <option>상태</option>
        </select>

        <input
          type="text"
          placeholder="검색어를 입력하세요."
        />

        <button className="search-btn">
          🔍
        </button>

      </div>

      <p className="project-count">
        총 프로젝트 3건
      </p>

      {/* 프로젝트 목록 */}

      <table className="project-table">

        <thead>
          <tr>
            <th>프로젝트명</th>
            <th>상태</th>
            <th>시작일</th>
          </tr>
        </thead>

        <tbody>

          <tr>
            <td>🏺 고려청자 복원</td>
            <td>진행 중</td>
            <td>2026-07-20</td>
          </tr>

          <tr>
            <td>⚱️ 청동기 복원</td>
            <td>완료</td>
            <td>2026-07-15</td>
          </tr>

          <tr>
            <td>🏛️ 백자 복원</td>
            <td>보고서 작성 완료</td>
            <td>2026-07-10</td>
          </tr>

        </tbody>

      </table>

      <div className="pagination">
        &lt; 1 &gt;
      </div>

    </div>
  );
}

export default ProjectPage;