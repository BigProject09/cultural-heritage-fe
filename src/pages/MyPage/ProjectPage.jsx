import "./ProjectPage.css";
import "./AccountPages.css";
import { useNavigate } from "react-router-dom";
import HeritagePage from "../../components/workspace/HeritagePage";

function ProjectPage() {
  const navigate = useNavigate();

  return (
    <HeritagePage
      active="account"
      eyebrow="MY CONSERVATION DESK"
      title="내 프로젝트"
      description="등록된 유물 프로젝트는 프로젝트 메뉴에서 동일한 최신 상태로 관리합니다."
    >
      <nav className="account-subnav" aria-label="마이페이지 메뉴">
        <button onClick={() => navigate("/mypage")}>마이페이지</button>
        <button onClick={() => navigate("/mypage/profile")}>내 정보</button>
        <button onClick={() => navigate("/mypage/activity")}>작업 현황</button>
        <button className="current">내 프로젝트</button>
      </nav>

      <section className="heritage-panel account-project-link">
        <div>
          <p>PROJECT WORKSPACE</p>
          <h2>프로젝트 허브에서 계속 작업하세요</h2>
          <span>
            샘플 목록 대신 백엔드에서 조회한 실제 유물과 기능별 진행 상태를
            표시합니다.
          </span>
        </div>
        <button className="heritage-button" onClick={() => navigate("/worklist")}>
          프로젝트 목록 열기
        </button>
      </section>
    </HeritagePage>
  );
}

export default ProjectPage;
