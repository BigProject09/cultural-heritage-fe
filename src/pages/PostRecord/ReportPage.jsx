import { useLocation, useNavigate } from "react-router-dom";
import "./ReportPage.css";
import { addMyReport } from "../../utils/myReports";
import {
  MODULE_STATUS,
  markWorkspaceModule,
} from "../../data/workspaceProjects";

function ReportPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    summary = [],
    methods = [],
    futureCare = "직사광선 및 고습 환경을 피하고 정기적인 상태 점검을 권장한다.",
  } = location.state || {};

  const artifactInfo = JSON.parse(
    localStorage.getItem("artifactInfo") || "{}",
  );

  const handleSave = async () => {
    const artifactName = artifactInfo.name || "무명 유물";

    if (artifactInfo.artifactId) {
      try {
        await markWorkspaceModule(
          artifactInfo.artifactId,
          "guide",
          MODULE_STATUS.DONE,
        );
      } catch (error) {
        window.alert(`복원 가이드 상태 저장 실패: ${error.message}`);
        return;
      }
    }

    addMyReport({
      id: `report-${Date.now()}`,
      title: `${artifactName} 복원 보고서`,
      project: artifactName,
      date: new Date().toISOString().slice(0, 10),
      artifactInfo,
      summary,
      methods,
      futureCare,
    });

    navigate("/report-complete");
  };

  return (
    <div className="report-page">

      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() => navigate("/post-record")}
        >
          ← 이전
        </button>

        <div className="logo">VORA</div>

        <button
          className="nav-btn"
          onClick={handleSave}
        >
          저장
        </button>
      </div>

      <div className="report-paper">

        <h1>AI 복원 보고서</h1>

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

          <p>{futureCare}</p>
        </section>

      </div>

    </div>
  );
}

export default ReportPage;
