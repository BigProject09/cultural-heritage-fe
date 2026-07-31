import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArtifactThumb from "../../components/workspace/ArtifactThumb";
import HeritageHeader from "../../components/workspace/HeritageHeader";
import {
  MODULE_STATUS,
  WORKSPACE_MODULES,
  deleteWorkspaceProject,
  formatWorkspaceDate,
  getWorkspaceProjects,
  selectWorkspaceProject,
} from "../../data/workspaceProjects";
import { getArtifactRoute } from "../../utils/artifactRoutes";
import { getMyReports } from "../../utils/myReports";
import "./WorkListPage.css";

function getReportArtifactId(report) {
  return String(
    report.artifactId ||
      report.artifactInfo?.artifactId ||
      report.relicInfo?.artifactId ||
      "",
  );
}

function WorkListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [reports, setReports] = useState(() => getMyReports());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const reportArtifactIds = useMemo(
    () => new Set(reports.map(getReportArtifactId).filter(Boolean)),
    [reports],
  );

  const projectStats = useMemo(() => {
    const completed = projects.filter((project) =>
      Object.values(project.modules).every(
        (status) => status === MODULE_STATUS.DONE,
      ),
    ).length;

    return {
      total: projects.length,
      active: projects.length - completed,
      completed,
      reports: reports.length,
    };
  }, [projects, reports]);

  useEffect(() => {
    const controller = new AbortController();

    getWorkspaceProjects({ signal: controller.signal })
      .then((items) => {
        setProjects(items);
        setError("");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const filteredProjects = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return projects
      .filter((project) => {
        const matchesKeyword =
          !keyword ||
          [project.name, project.artifactId, project.material, project.period]
            .join(" ")
            .toLowerCase()
            .includes(keyword);

        const completed = Object.values(project.modules).every(
          (status) => status === MODULE_STATUS.DONE,
        );
        const matchesFilter =
          filter === "all" ||
          (filter === "completed" && completed) ||
          (filter === "active" && !completed) ||
          (filter === "reports" &&
            reportArtifactIds.has(String(project.artifactId)));

        return matchesKeyword && matchesFilter;
      })
      .sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [filter, projects, reportArtifactIds, search]);

  const openProject = (project) => {
    selectWorkspaceProject(project);
    navigate(getArtifactRoute(project.artifactId));
  };

  const retry = () => {
    setLoading(true);
    setError("");
    setReloadKey((current) => current + 1);
  };

  const handleDelete = async (project) => {
    const confirmed = window.confirm(
      `"${project.name}" 프로젝트를 삭제하시겠습니까?\n\n대표 이미지와 이 프로젝트에서 저장한 보고서가 함께 삭제되며 복구할 수 없습니다.`,
    );
    if (!confirmed) return;

    setDeletingId(project.artifactId);
    setDeleteError("");

    try {
      await deleteWorkspaceProject(project.artifactId);
      setProjects((current) =>
        current.filter((item) => item.artifactId !== project.artifactId),
      );
      setReports(getMyReports());
    } catch (requestError) {
      setDeleteError(requestError.message);
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="heritage-worklist">
      <HeritageHeader active="projects" />

      <main className="heritage-worklist-main">
        <section className="heritage-worklist-heading">
          <div>
            <span>ARTIFACT PROJECTS</span>
            <h1>유물 복원 프로젝트</h1>
            <p>유물별 AI 작업 현황과 최근 저장 결과를 확인합니다.</p>
          </div>
          <button
            onClick={() =>
              navigate("/artifacts/new", {
                state: { entryModule: "guide", workspaceEntry: true },
              })
            }
          >
            ＋ 신규 유물 등록
          </button>
        </section>

        <section
          className="heritage-worklist-summary"
          aria-label="프로젝트 현황"
        >
          <button
            className={filter === "all" ? "active" : ""}
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            <span>전체 프로젝트</span>
            <strong>{projectStats.total}</strong>
            <small>건</small>
          </button>
          <button
            className={filter === "active" ? "active" : ""}
            aria-pressed={filter === "active"}
            onClick={() => setFilter("active")}
          >
            <span>진행 중</span>
            <strong>{projectStats.active}</strong>
            <small>건</small>
          </button>
          <button
            className={filter === "completed" ? "active" : ""}
            aria-pressed={filter === "completed"}
            onClick={() => setFilter("completed")}
          >
            <span>완료</span>
            <strong>{projectStats.completed}</strong>
            <small>건</small>
          </button>
          <button
            className={filter === "reports" ? "active" : ""}
            aria-pressed={filter === "reports"}
            onClick={() => setFilter("reports")}
          >
            <span>생성 보고서</span>
            <strong>{projectStats.reports}</strong>
            <small>건</small>
          </button>
        </section>

        <section className="heritage-worklist-tools">
          <input
            type="search"
            placeholder="유물명, artifactId, 재질 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">전체 프로젝트</option>
            <option value="active">진행 중</option>
            <option value="completed">완료</option>
            <option value="reports">보고서 생성 프로젝트</option>
          </select>
          <span>총 {filteredProjects.length}건</span>
        </section>

        <section className="heritage-worklist-grid">
          {deleteError && (
            <div className="heritage-worklist-delete-error" role="alert">
              {deleteError}
            </div>
          )}

          {loading && (
            <div className="heritage-worklist-state">
              프로젝트를 불러오는 중입니다.
            </div>
          )}

          {!loading && error && (
            <div className="heritage-worklist-state error">
              <strong>프로젝트를 불러오지 못했습니다.</strong>
              <span>{error}</span>
              <button onClick={retry}>다시 시도</button>
            </div>
          )}

          {!loading && !error && filteredProjects.length === 0 && (
            <div className="heritage-worklist-state">
              <strong>
                {projects.length === 0
                  ? "등록된 유물이 없습니다."
                  : "검색 조건에 맞는 프로젝트가 없습니다."}
              </strong>
              <span>
                {projects.length === 0
                  ? "신규 유물을 등록해 첫 프로젝트를 시작하세요."
                  : "검색어나 진행 상태 필터를 변경해보세요."}
              </span>
            </div>
          )}

          {filteredProjects.map((project) => {
            const completed = Object.values(project.modules).filter(
              (status) => status === MODULE_STATUS.DONE,
            ).length;

            return (
              <article key={project.artifactId}>
                <div className="heritage-worklist-card-head">
                  <ArtifactThumb project={project} />
                  <div>
                    <span>{project.artifactId}</span>
                    <h2>{project.name}</h2>
                    <p>
                      {project.material} · {project.period}
                    </p>
                  </div>
                  <strong>
                    {completed} / {WORKSPACE_MODULES.length}
                  </strong>
                </div>

                <div className="heritage-worklist-progress">
                  {WORKSPACE_MODULES.map((module) => (
                    <div key={module.key}>
                      <i
                        className={project.modules[module.key].toLowerCase()}
                      />
                      <span>{module.shortTitle}</span>
                    </div>
                  ))}
                </div>

                <div className="heritage-worklist-card-foot">
                  <small>마지막 저장 {formatWorkspaceDate(project.updatedAt)}</small>
                  <div className="heritage-worklist-card-actions">
                    <button
                      className="delete"
                      disabled={deletingId === project.artifactId}
                      onClick={() => handleDelete(project)}
                    >
                      {deletingId === project.artifactId ? "삭제 중…" : "삭제"}
                    </button>
                    <button onClick={() => openProject(project)}>
                      프로젝트 열기 →
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}

export default WorkListPage;
