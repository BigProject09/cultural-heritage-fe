import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ArtifactThumb from "../../components/workspace/ArtifactThumb";
import HeritageHeader from "../../components/workspace/HeritageHeader";
import {
  MODULE_STATUS,
  STATUS_LABEL,
  WORKSPACE_MODULES,
  deleteWorkspaceProject,
  formatWorkspaceDate,
  getModuleRoute,
  getWorkspaceProject,
  markWorkspaceModule,
  selectWorkspaceProject,
} from "../../data/workspaceProjects";
import { getFinalReportRoute } from "../../utils/artifactRoutes";
import "./ProjectDetailPage.css";

const PROGRESS_WIDTH_CLASSES = ["w-0", "w-1/3", "w-2/3", "w-full"];

function ProjectDetailPage() {
  const navigate = useNavigate();
  const { artifactId, id } = useParams();
  const decodedId = decodeURIComponent(artifactId || id || "");
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    getWorkspaceProject(decodedId, { signal: controller.signal })
      .then((item) => {
        setProject(item);
        setError("");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [decodedId]);

  const completedCount = useMemo(
    () =>
      project
        ? Object.values(project.modules).filter(
            (status) => status === MODULE_STATUS.DONE,
          ).length
        : 0,
    [project],
  );

  if (loading) {
    return (
      <div className="heritage-project-page">
        <HeritageHeader active="projects" />
        <main className="heritage-project-empty">
          <span>LOADING PROJECT</span>
          <h1>프로젝트를 불러오는 중입니다.</h1>
        </main>
      </div>
    );
  }

  if (!project || error) {
    return (
      <div className="heritage-project-page">
        <HeritageHeader active="projects" />
        <main className="heritage-project-empty">
          <span>PROJECT NOT FOUND</span>
          <h1>프로젝트를 불러올 수 없습니다.</h1>
          <p>{error || "프로젝트 목록에서 다시 선택해주세요."}</p>
          <button onClick={() => navigate("/worklist")}>프로젝트 목록</button>
        </main>
      </div>
    );
  }

  const enterModule = async (moduleKey) => {
    setActionError("");

    try {
      const nextProject =
        project.modules[moduleKey] === MODULE_STATUS.NOT_STARTED
          ? await markWorkspaceModule(
              project.artifactId,
              moduleKey,
              MODULE_STATUS.IN_PROGRESS,
            )
          : project;

      if (nextProject !== project) setProject(nextProject);
      const artifactInfo = selectWorkspaceProject(nextProject);

      navigate(getModuleRoute(moduleKey, nextProject.artifactId), {
        state: {
          artifactId: nextProject.artifactId,
          artifactInfo,
          workspaceEntry: true,
          workspaceModule: moduleKey,
          viewMode:
            moduleKey === "xray" &&
            nextProject.modules[moduleKey] === MODULE_STATUS.DONE
              ? "result"
              : "work",
        },
      });
    } catch (requestError) {
      setActionError(requestError.message);
    }
  };

  const reportReady = completedCount === WORKSPACE_MODULES.length;
  const missingModules = WORKSPACE_MODULES.filter(
    (module) => project.modules[module.key] !== MODULE_STATUS.DONE,
  );

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `"${project.name}" 프로젝트를 삭제하시겠습니까?\n\n대표 이미지와 이 프로젝트에서 저장한 보고서가 함께 삭제되며 복구할 수 없습니다.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setActionError("");

    try {
      await deleteWorkspaceProject(project.artifactId);
      navigate("/worklist", { replace: true });
    } catch (requestError) {
      setActionError(requestError.message);
      setDeleting(false);
    }
  };

  return (
    <div className="heritage-project-page">
      <HeritageHeader active="projects" />

      <main className="heritage-project-main">
        <div className="heritage-project-toolbar">
          <button
            className="heritage-project-back"
            onClick={() => navigate("/")}
          >
            ← 대시보드
          </button>
          <button
            className="heritage-project-delete"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? "프로젝트 삭제 중…" : "프로젝트 삭제"}
          </button>
        </div>

        <section className="heritage-artifact-banner">
          <ArtifactThumb project={project} large />
          <div>
            <span className="heritage-project-kicker">
              {project.artifactId}
            </span>
            <h1>{project.name}</h1>
            <p>
              {project.material} · {project.period} · 마지막 저장{" "}
              {formatWorkspaceDate(project.updatedAt)}
            </p>
          </div>
          <div className="heritage-overall-progress">
            <span>전체 작업 현황</span>
            <strong>
              {completedCount} / {WORKSPACE_MODULES.length}
            </strong>
            <div>
              <i className={PROGRESS_WIDTH_CLASSES[completedCount] || "w-0"} />
            </div>
          </div>
        </section>

        <section className="heritage-hub-grid">
          {WORKSPACE_MODULES.map((module) => {
            const status = project.modules[module.key];
            const actionLabel =
              status === MODULE_STATUS.NOT_STARTED
                ? "작업 시작"
                : status === MODULE_STATUS.DONE
                  ? "결과 보기"
                  : status === MODULE_STATUS.NEEDS_UPDATE
                    ? "결과 업데이트"
                    : "이어서 작업";

            return (
              <article className="heritage-hub-card" key={module.key}>
                <div className="heritage-hub-card-top">
                  <span className={`heritage-hub-pill ${status.toLowerCase()}`}>
                    {STATUS_LABEL[status]}
                  </span>
                  <span>{module.number}</span>
                </div>
                <span className="heritage-project-eyebrow">
                  {module.eyebrow}
                </span>
                <h2>{module.title}</h2>
                <p>{module.description}</p>

                {status === MODULE_STATUS.NEEDS_UPDATE && (
                  <div className="heritage-inline-alert">
                    저장된 결과의 갱신이 필요합니다.
                  </div>
                )}

                <button
                  className={`heritage-module-action ${
                    status === MODULE_STATUS.DONE ? "result" : ""
                  }`}
                  onClick={() => enterModule(module.key)}
                >
                  {actionLabel} →
                </button>
              </article>
            );
          })}
        </section>

        {actionError && (
          <div className="heritage-project-action-error">{actionError}</div>
        )}

        <section
          className={`heritage-final-report ${reportReady ? "ready" : ""}`}
        >
          <div className="heritage-report-icon">PPT</div>
          <div>
            <span className="heritage-project-kicker">FINAL DELIVERABLE</span>
            <h2>최종 복원 결과 보고서</h2>
            <p>
              {reportReady
                ? "세 기능이 모두 완료되었습니다. 최종 통합 보고서를 생성할 수 있습니다."
                : `세 기능은 독립적으로 진행되며, 최종 보고서만 모두 완료된 뒤 생성할 수 있습니다. 현재 ${completedCount}개 완료.`}
            </p>
            {!reportReady && (
              <div className="heritage-report-missing">
                남은 작업:{" "}
                {missingModules.map((module) => module.shortTitle).join(", ")}
              </div>
            )}
          </div>
          <button
            disabled={!reportReady}
            onClick={() => {
              selectWorkspaceProject(project);
              navigate(getFinalReportRoute(project.artifactId));
            }}
          >
            최종 보고서
          </button>
        </section>
      </main>
    </div>
  );
}

export default ProjectDetailPage;
