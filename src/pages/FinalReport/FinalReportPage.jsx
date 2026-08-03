import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HeritageHeader from "../../components/workspace/HeritageHeader";
import {
  MODULE_STATUS,
  WORKSPACE_MODULES,
  getWorkspaceProject,
  selectWorkspaceProject,
} from "../../data/workspaceProjects";
import { addMyReport } from "../../utils/myReports";
import { getArtifactRoute } from "../../utils/artifactRoutes";
import "./FinalReportPage.css";

function FinalReportPage() {
  const navigate = useNavigate();
  const { artifactId = "" } = useParams();
  const decodedArtifactId = decodeURIComponent(artifactId);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    getWorkspaceProject(decodedArtifactId, { signal: controller.signal })
      .then((item) => {
        setProject(item);
        selectWorkspaceProject(item);
        setError("");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [decodedArtifactId]);

  const missingModules = useMemo(
    () =>
      project
        ? WORKSPACE_MODULES.filter(
            (module) => project.modules[module.key] !== MODULE_STATUS.DONE,
          )
        : [],
    [project],
  );

  const reportReady = Boolean(project) && missingModules.length === 0;

  const handleSave = () => {
    if (!reportReady || !project) return;

    addMyReport({
      id: `final-report-${project.artifactId}-${Date.now()}`,
      title: `${project.name} 최종 통합 보고서`,
      project: project.name,
      date: new Date().toISOString().slice(0, 10),
      artifactInfo: project,
      summary: [
        "복원 가이드 작업 결과 연결 완료",
        "X-RAY 파편 결합 및 결함 조사 결과 연결 완료",
        "육안 상태 조사 결과 연결 완료",
      ],
      methods: [],
      futureCare:
        "세 모듈의 확정 결과를 바탕으로 정기적인 상태 점검과 보존 환경 관리를 권장한다.",
      reportType: "FINAL_INTEGRATED",
    });

    setSaved(true);
  };

  if (loading) {
    return (
      <div className="final-report-page">
        <HeritageHeader active="projects" />
        <main className="final-report-state">
          <span>FINAL REPORT</span>
          <h1>보고서 생성 조건을 확인하는 중입니다.</h1>
        </main>
      </div>
    );
  }

  if (!project || error) {
    return (
      <div className="final-report-page">
        <HeritageHeader active="projects" />
        <main className="final-report-state">
          <span>REPORT UNAVAILABLE</span>
          <h1>유물 정보를 불러올 수 없습니다.</h1>
          <p>{error || "프로젝트 목록에서 유물을 다시 선택해주세요."}</p>
          <button onClick={() => navigate("/worklist")}>프로젝트 목록</button>
        </main>
      </div>
    );
  }

  return (
    <div className="final-report-page">
      <HeritageHeader active="projects" />

      <main className="final-report-main">
        <button
          className="final-report-back"
          onClick={() => navigate(getArtifactRoute(project.artifactId))}
        >
          ← 유물 워크스페이스
        </button>

        <header className="final-report-heading">
          <div>
            <span>FINAL INTEGRATED REPORT</span>
            <h1>최종 복원 결과 보고서</h1>
            <p>
              {project.name} · {project.artifactId}
            </p>
          </div>
          <strong className={reportReady ? "ready" : "locked"}>
            {reportReady ? "생성 가능" : "생성 대기"}
          </strong>
        </header>

        {!reportReady ? (
          <section className="final-report-lock">
            <span className="final-report-lock-icon">LOCK</span>
            <div>
              <h2>아직 최종 보고서를 생성할 수 없습니다.</h2>
              <p>
                세 기능은 원하는 순서로 독립 진행할 수 있지만, 최종 보고서는
                모두 완료된 뒤 생성됩니다.
              </p>
              <ul>
                {missingModules.map((module) => (
                  <li key={module.key}>
                    <span>{module.number}</span>
                    <strong>{module.title}</strong>
                    <button
                      onClick={() =>
                        navigate(
                          `/artifacts/${encodeURIComponent(project.artifactId)}/${module.key}`,
                        )
                      }
                    >
                      작업하기 →
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : (
          <>
            <section className="final-report-paper">
              <div className="final-report-title">
                <span>VORA CONSERVATION RECORD</span>
                <h2>{project.name} 최종 통합 보고서</h2>
                <p>
                  {project.material} · {project.period}
                </p>
              </div>

              <div className="final-report-artifact-grid">
                <div>
                  <span>관리번호</span>
                  <strong>{project.artifactId}</strong>
                </div>
                <div>
                  <span>재질</span>
                  <strong>{project.material}</strong>
                </div>
                <div>
                  <span>시대</span>
                  <strong>{project.period}</strong>
                </div>
                <div>
                  <span>처리 전 상태</span>
                  <strong>{project.condition || "기록 없음"}</strong>
                </div>
              </div>

              <div className="final-report-modules">
                {WORKSPACE_MODULES.map((module) => (
                  <article key={module.key}>
                    <span>{module.number}</span>
                    <div>
                      <h3>{module.title}</h3>
                      <p>{module.description}</p>
                    </div>
                    <strong>결과 연결 완료</strong>
                  </article>
                ))}
              </div>

              <p className="final-report-note">
                현재 프론트에서는 각 모듈의 완료 상태와 유물 정보를 통합합니다.
                상세 AI 결과와 PPT 파일 생성은 백엔드 통합 보고서 API 응답으로
                교체할 영역입니다.
              </p>
            </section>

            <div className="final-report-actions">
              {saved && <span>내 보고서에 저장되었습니다.</span>}
              <button onClick={handleSave} disabled={saved}>
                {saved ? "저장 완료" : "최종 보고서 저장"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default FinalReportPage;
