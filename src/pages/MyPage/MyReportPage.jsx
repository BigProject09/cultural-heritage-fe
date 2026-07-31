import "./MyReportPage.css";
import "./AccountPages.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyReports } from "../../utils/myReports";
import HeritagePage from "../../components/workspace/HeritagePage";

function MyReportPage() {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState("title");
  const [keyword, setKeyword] = useState("");

  const reports = getMyReports();
  const filteredReports = reports.filter((report) => {
    const value =
      searchType === "project" ? report.project || "" : report.title || "";
    return value.toLowerCase().includes(keyword.trim().toLowerCase());
  });

  return (
    <HeritagePage
      active="account"
      eyebrow="MY CONSERVATION DESK"
      title="내 보고서"
      description="프로젝트에서 생성한 보존처리 결과 보고서를 확인합니다."
    >
      <nav className="account-subnav" aria-label="마이페이지 메뉴">
        <button onClick={() => navigate("/mypage")}>마이페이지</button>
        <button onClick={() => navigate("/mypage/profile")}>내 정보</button>
        <button onClick={() => navigate("/mypage/activity")}>작업 현황</button>
        <button className="current">내 보고서</button>
      </nav>

      <section className="heritage-panel">
        <div className="heritage-toolbar">
          <select
            className="heritage-select"
            value={searchType}
            onChange={(event) => setSearchType(event.target.value)}
            aria-label="검색 기준"
          >
            <option value="title">보고서명</option>
            <option value="project">프로젝트</option>
          </select>
          <input
            className="heritage-field"
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="보고서를 검색하세요"
          />
        </div>

        <p className="heritage-count">
          총 보고서 <strong>{filteredReports.length}</strong>건
        </p>

        <div className="heritage-table-wrap">
          <table className="heritage-table">
            <thead>
              <tr>
                <th>보고서명</th>
                <th>프로젝트</th>
                <th>생성일</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    data-clickable="true"
                    tabIndex={0}
                    onClick={() => navigate(`/mypage/reports/${report.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        navigate(`/mypage/reports/${report.id}`);
                      }
                    }}
                  >
                    <td className="account-report-title">{report.title}</td>
                    <td>{report.project}</td>
                    <td>{report.date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="heritage-empty-cell" colSpan={3}>
                    {reports.length > 0
                      ? "검색 결과가 없습니다."
                      : "생성된 보고서가 없습니다."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </HeritagePage>
  );
}

export default MyReportPage;
