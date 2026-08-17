import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArtifactThumb from "../../components/workspace/ArtifactThumb";
import HeritageHeader from "../../components/workspace/HeritageHeader";
import {
  MODULE_STATUS,
  WORKSPACE_MODULES,
  deleteWorkspaceProject,
  formatWorkspaceDate,
  getMyWorkspaceProjects,
  getPublicWorkspaceProjects,
  selectWorkspaceProject,
} from "../../data/workspaceProjects";
import { getArtifactRoute } from "../../utils/artifactRoutes";
import { getMyReports } from "../../utils/myReports";
import { getAccessToken } from "../../services/authToken";
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

  const [scope, setScope] = useState("mine");
  const [projects, setProjects] = useState([]);
  const [reports, setReports] = useState(() => getMyReports());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const [publicDetail, setPublicDetail] = useState(null);

  const isMine = scope === "mine";
  const isLoggedIn = Boolean(getAccessToken());

  const currentProjectReports = useMemo(() => {
    if (!isMine) return [];

    const projectIds = new Set(
      projects.map((project) => String(project.artifactId)).filter(Boolean),
    );

    return reports.filter((report) =>
      projectIds.has(getReportArtifactId(report)),
    );
  }, [isMine, projects, reports]);

  const reportArtifactIds = useMemo(
    () =>
      new Set(currentProjectReports.map(getReportArtifactId).filter(Boolean)),
    [currentProjectReports],
  );

  const projectStats = useMemo(() => {
    if (!isMine) {
      return {
        total: projects.length,
        active: 0,
        completed: 0,
        reports: 0,
      };
    }

    const completed = projects.filter((project) =>
      Object.values(project.modules).every(
        (status) => status === MODULE_STATUS.DONE,
      ),
    ).length;

    return {
      total: projects.length,
      active: projects.length - completed,
      completed,
      reports: currentProjectReports.length,
    };
  }, [currentProjectReports.length, isMine, projects]);

  useEffect(() => {
    if (!isLoggedIn) {
      setProjects([]);
      setError("");
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    const loader = isMine ? getMyWorkspaceProjects : getPublicWorkspaceProjects;

    loader({ signal: controller.signal })
      .then((items) => {
        if (controller.signal.aborted) return;

        setProjects(items);
        setError("");
      })
      .catch((requestError) => {
        if (!controller.signal.aborted && requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [isLoggedIn, isMine, reloadKey]);

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

        if (!isMine) {
          return matchesKeyword;
        }

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
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [filter, isMine, projects, reportArtifactIds, search]);

  const handleScopeChange = (nextScope) => {
    if (nextScope === scope) return;

    setLoading(true);
    setError("");
    setDeleteError("");

    setSearch("");
    setFilter("all");
    setPublicDetail(null);

    setProjects([]);
    setScope(nextScope);
  };

  const openProject = (project) => {
    selectWorkspaceProject(project);
    navigate(getArtifactRoute(project.artifactId));
  };

  const retry = () => {
    setLoading(true);
    setError("");
    setDeleteError("");

    setReloadKey((current) => current + 1);
  };

  const handleDelete = async (project) => {
    const confirmed = window.confirm(
      `"${project.name}" 프로젝트를 삭제하시겠습니까?\n\n이 프로젝트의 X-Ray, 육안 상태 조사, 보존가이드, 보고서 및 관련 파일이 모두 삭제되며 복구할 수 없습니다.`,
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

            <p>
              {isMine
                ? "내가 등록한 유물의 AI 작업 현황과 최근 저장 결과를 확인합니다."
                : "등록된 유물의 기본 정보를 함께 확인할 수 있습니다. 다른 사용자의 작업 결과는 공개되지 않습니다."}
            </p>
          </div>

          {isMine && isLoggedIn && (
            <button
              onClick={() =>
                navigate("/artifacts/new", {
                  state: {
                    entryModule: "guide",
                    workspaceEntry: true,
                  },
                })
              }
            >
              ＋ 신규 유물 등록
            </button>
          )}
        </section>

        {!isLoggedIn ? (
          <section className="heritage-worklist-login-required" aria-live="polite">
            <span>MEMBER ACCESS</span>
            <h2>로그인이 필요합니다.</h2>
            <p>
              로그인 후 내가 등록한 프로젝트와 전체 프로젝트를 확인할 수 있습니다.
            </p>
            <button type="button" onClick={() => navigate("/login")}>
              로그인
            </button>
          </section>
        ) : (
          <>
        <section
          className="heritage-worklist-scope"
          aria-label="프로젝트 조회 범위"
        >
          <button
            className={isMine ? "active" : ""}
            aria-pressed={isMine}
            onClick={() => handleScopeChange("mine")}
          >
            <strong>내 프로젝트</strong>
            <span>내가 등록한 유물 · 작업 및 관리 가능</span>
          </button>

          <button
            className={!isMine ? "active" : ""}
            aria-pressed={!isMine}
            onClick={() => handleScopeChange("public")}
          >
            <strong>전체 프로젝트</strong>
            <span>전체 유물 · 기본 정보만 읽기 전용</span>
          </button>
        </section>

        {isMine ? (
          <section
            className="heritage-worklist-summary"
            aria-label="내 프로젝트 현황"
          >
            <button
              className={filter === "all" ? "active" : ""}
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
            >
              <span>전체 상태</span>
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
        ) : (
          <section className="heritage-worklist-public-note">
            <strong>읽기 전용 공개 범위</strong>

            <span>
              유물명, 분류, 재질, 시대, 설명과 대표 이미지만 표시합니다. X-Ray,
              육안 상태 조사, 보존가이드, 최종보고서 및 수정·삭제 기능은 소유자와
              관리자만 접근할 수 있습니다.
            </span>
          </section>
        )}

        <section
          className={`heritage-worklist-tools ${!isMine ? "public" : ""}`}
        >
          <input
            type="search"
            placeholder="유물명, artifactId, 재질 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {isMine && (
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">전체 상태</option>

              <option value="active">진행 중</option>

              <option value="completed">완료</option>

              <option value="reports">보고서 생성 프로젝트</option>
            </select>
          )}

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
                  ? isMine
                    ? "내 프로젝트가 없습니다."
                    : "등록된 공개 유물이 없습니다."
                  : "검색 조건에 맞는 프로젝트가 없습니다."}
              </strong>

              <span>
                {projects.length === 0 && isMine
                  ? "신규 유물을 등록해 첫 프로젝트를 시작하세요."
                  : projects.length === 0
                    ? "등록된 유물이 생기면 이곳에서 기본 정보를 확인할 수 있습니다."
                    : "검색어나 진행 상태 필터를 변경해보세요."}
              </span>
            </div>
          )}

          {filteredProjects.map((project) => {
            if (!isMine) {
              return (
                <article
                  key={project.artifactId}
                  className="heritage-worklist-public-card"
                >
                  <div className="heritage-worklist-card-head public">
                    <ArtifactThumb project={project} />

                    <div>
                      <span>{project.artifactId}</span>

                      <h2>{project.name}</h2>

                      <p>
                        {project.category || "분류 미입력"} · {project.material}{" "}
                        · {project.period}
                      </p>
                    </div>

                    <em>읽기 전용</em>
                  </div>

                  <p className="heritage-worklist-public-description">
                    {project.description || "등록된 유물 설명이 없습니다."}
                  </p>

                  <div className="heritage-worklist-card-foot">
                    <small>
                      최근 갱신 {formatWorkspaceDate(project.updatedAt)}
                    </small>

                    <div className="heritage-worklist-card-actions">
                      <button onClick={() => setPublicDetail(project)}>
                        유물 정보 보기 →
                      </button>
                    </div>
                  </div>
                </article>
              );
            }

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
                  <small>
                    마지막 저장 {formatWorkspaceDate(project.updatedAt)}
                  </small>

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
          </>
        )}
      </main>

      {publicDetail && (
        <div
          className="heritage-public-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPublicDetail(null);
            }
          }}
        >
          <section
            className="heritage-public-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-artifact-title"
          >
            <button
              className="heritage-public-modal-close"
              aria-label="닫기"
              onClick={() => setPublicDetail(null)}
            >
              ×
            </button>

            <div className="heritage-public-modal-visual">
              <ArtifactThumb project={publicDetail} />
            </div>

            <div className="heritage-public-modal-content">
              <span>READ ONLY · ARTIFACT INFORMATION</span>

              <h2 id="public-artifact-title">{publicDetail.name}</h2>

              <dl>
                <div>
                  <dt>분류</dt>
                  <dd>{publicDetail.category || "미입력"}</dd>
                </div>

                <div>
                  <dt>재질</dt>
                  <dd>{publicDetail.material || "미입력"}</dd>
                </div>

                <div>
                  <dt>시대</dt>
                  <dd>{publicDetail.period || "미입력"}</dd>
                </div>

                <div>
                  <dt>Artifact ID</dt>
                  <dd>{publicDetail.artifactId}</dd>
                </div>
              </dl>

              <div className="heritage-public-modal-description">
                <strong>유물 설명</strong>

                <p>{publicDetail.description || "등록된 설명이 없습니다."}</p>
              </div>

              <p className="heritage-public-modal-policy">
                다른 사용자의 조사 결과와 작업 문서는 개인정보 및 작업 데이터
                보호를 위해 공개되지 않습니다.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default WorkListPage;
