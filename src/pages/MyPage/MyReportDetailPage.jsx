import { useNavigate, useParams } from "react-router-dom";
import "../PostRecord/ReportPage.css";
import { getMyReports } from "../../utils/myReports";

function MyReportDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const report = getMyReports().find((item) => item.id === id);

  if (!report) {
    return (
      <div className="report-page">
        <div className="top-bar">
          <button className="nav-btn" onClick={() => navigate("/mypage/reports")}>
            ← 목록으로
          </button>

          <div className="logo">VORA</div>
        </div>

        <div className="report-paper">
          <p>보고서를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const {
    artifactInfo = {},
    summary = [],
    methods = [],
    futureCare,
  } = report;

  return (
    <div className="report-page">
      <div className="top-bar">
        <button className="nav-btn" onClick={() => navigate("/mypage/reports")}>
          ← 목록으로
        </button>

        <div className="logo">VORA</div>
      </div>

      <div className="report-paper">
        <h1>{report.title}</h1>

        <section>
          <h2>기본 정보</h2>

          <p><strong>유물명</strong> : {artifactInfo.name || "-"}</p>
          <p><strong>재질</strong> : {artifactInfo.material || "-"}</p>
          <p><strong>시대</strong> : {artifactInfo.period || "-"}</p>
        </section>

        <section>
          <h2>복원 전 상태</h2>

          <p>
            {artifactInfo.condition || "등록된 처리 전 상태 정보가 없습니다."}
          </p>
        </section>

        <section>
          <h2>복원 과정</h2>

          {methods.length > 0 ? (
            <ul>
              {methods.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>기록된 처리 방법이 없습니다.</p>
          )}
        </section>

        <section>
          <h2>복원 결과</h2>

          {summary.length > 0 ? (
            summary.map((item, index) => <p key={index}>{item}</p>)
          ) : (
            <p>기록된 결과 요약이 없습니다.</p>
          )}
        </section>

        <section>
          <h2>향후 관리</h2>

          <p>
            {futureCare ||
              "직사광선 및 고습 환경을 피하고 정기적인 상태 점검을 권장한다."}
          </p>
        </section>
      </div>
    </div>
  );
}

export default MyReportDetailPage;
