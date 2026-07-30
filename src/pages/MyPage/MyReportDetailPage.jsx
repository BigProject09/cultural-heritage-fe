import { useNavigate, useParams } from "react-router-dom";
import "./AccountPages.css";
import { getMyReports } from "../../utils/myReports";
import HeritagePage from "../../components/workspace/HeritagePage";

function MyReportDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const report = getMyReports().find((item) => item.id === id);

  if (!report) {
    return (
      <HeritagePage
        active="account"
        eyebrow="CONSERVATION REPORT"
        title="보고서를 찾을 수 없습니다"
        description="삭제되었거나 존재하지 않는 보고서입니다."
      >
        <button
          className="heritage-button secondary"
          onClick={() => navigate("/mypage/reports")}
        >
          보고서 목록
        </button>
      </HeritagePage>
    );
  }

  const {
    artifactInfo = {},
    summary = [],
    methods = [],
    futureCare,
  } = report;

  return (
    <HeritagePage
      active="account"
      eyebrow="CONSERVATION REPORT"
      title="보고서 상세"
      description="프로젝트에서 생성한 보존처리 기록입니다."
    >
      <button
        className="heritage-back"
        onClick={() => navigate("/mypage/reports")}
      >
        <span aria-hidden="true">←</span> 보고서 목록
      </button>

      <article className="account-report-paper">
        <h2>{report.title}</h2>

        <section>
          <h3>기본 정보</h3>

          <p><strong>유물명</strong> : {artifactInfo.name || "-"}</p>
          <p><strong>재질</strong> : {artifactInfo.material || "-"}</p>
          <p><strong>시대</strong> : {artifactInfo.period || "-"}</p>
        </section>

        <section>
          <h3>복원 전 상태</h3>

          <p>
            {artifactInfo.condition || "등록된 처리 전 상태 정보가 없습니다."}
          </p>
        </section>

        <section>
          <h3>복원 과정</h3>

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
          <h3>복원 결과</h3>

          {summary.length > 0 ? (
            summary.map((item, index) => <p key={index}>{item}</p>)
          ) : (
            <p>기록된 결과 요약이 없습니다.</p>
          )}
        </section>

        <section>
          <h3>향후 관리</h3>

          <p>
            {futureCare ||
              "직사광선 및 고습 환경을 피하고 정기적인 상태 점검을 권장한다."}
          </p>
        </section>
      </article>
    </HeritagePage>
  );
}

export default MyReportDetailPage;
