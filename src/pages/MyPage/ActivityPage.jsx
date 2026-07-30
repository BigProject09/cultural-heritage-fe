import "./ActivityPage.css";
import "./AccountPages.css";
import { useNavigate } from "react-router-dom";
import HeritagePage from "../../components/workspace/HeritagePage";
import { getMyReports } from "../../utils/myReports";

function ActivityPage() {
  const navigate = useNavigate();
  const reportCount = getMyReports().length;

  return (
    <HeritagePage
      active="account"
      eyebrow="MY CONSERVATION DESK"
      title="내 작업 현황"
      description="담당 프로젝트와 생성 결과를 요약해 확인합니다."
    >
      <nav className="account-subnav" aria-label="마이페이지 메뉴">
        <button onClick={() => navigate("/mypage")}>마이페이지</button>
        <button onClick={() => navigate("/mypage/profile")}>내 정보</button>
        <button className="current">작업 현황</button>
        <button onClick={() => navigate("/mypage/reports")}>내 보고서</button>
      </nav>

      <section className="account-stat-grid">
        <article className="account-stat-card">
          <p>ACTIVE PROJECT</p>
          <h2>진행 프로젝트</h2>
          <span className="account-stat-value">
            — <small>프로젝트 목록에서 확인</small>
          </span>
        </article>

        <article className="account-stat-card">
          <p>COMPLETED PROJECT</p>
          <h2>완료 프로젝트</h2>
          <span className="account-stat-value">
            — <small>프로젝트 목록에서 확인</small>
          </span>
        </article>

        <article className="account-stat-card">
          <p>GENERATED REPORT</p>
          <h2>생성 보고서</h2>
          <span className="account-stat-value">
            {reportCount} <small>건</small>
          </span>
        </article>
      </section>

      <section className="account-callout">
        <p>
          프로젝트 상태는 백엔드의 실제 유물 목록에서 확인하도록 샘플 수치를
          제거했습니다.
        </p>
        <button className="heritage-button" onClick={() => navigate("/worklist")}>
          프로젝트 목록
        </button>
      </section>
    </HeritagePage>
  );
}

export default ActivityPage;
