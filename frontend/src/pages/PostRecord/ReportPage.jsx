import { useNavigate } from "react-router-dom";
import "./ReportPage.css";

function ReportPage() {
  const navigate = useNavigate();

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
          onClick={() => navigate("/report-complete")}
        >
          저장
        </button>
      </div>

      <div className="report-paper">

        <h1>AI 복원 보고서</h1>

        <section>
          <h2>기본 정보</h2>

          <p><strong>유물명</strong> : 청자 매병</p>
          <p><strong>재질</strong> : 도자기</p>
          <p><strong>복원 일자</strong> : 2026.07.23</p>
        </section>

        <section>
          <h2>복원 전 상태</h2>

          <p>
            유물 표면에 오염물과 균열이 확인되었으며,
            일부 결손 및 변색이 발견되었다.
          </p>
        </section>

        <section>
          <h2>복원 과정</h2>

          <ul>
            <li>건식 세척을 통해 표면 오염 제거</li>
            <li>Paraloid B-72를 이용한 강화 처리</li>
            <li>에폭시 접합을 이용한 파편 결합</li>
            <li>안료를 활용한 색 맞춤 진행</li>
          </ul>
        </section>

        <section>
          <h2>복원 결과</h2>

          <p>
            구조적 안정성이 확보되었으며
            외관이 자연스럽게 복원되었다.
          </p>
        </section>

        <section>
          <h2>향후 관리</h2>

          <p>
            직사광선 및 고습 환경을 피하고
            정기적인 상태 점검을 권장한다.
          </p>
        </section>

      </div>

    </div>
  );
}

export default ReportPage;