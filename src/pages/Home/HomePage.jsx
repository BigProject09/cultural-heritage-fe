import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeritageHeader from "../../components/workspace/HeritageHeader";
import ArtifactThumb from "../../components/workspace/ArtifactThumb";
import {
  MODULE_STATUS,
  STATUS_LABEL,
  WORKSPACE_MODULES,
  formatWorkspaceDate,
  getModuleRoute,
  getNextModule,
  getWorkspaceProjects,
  markWorkspaceModule,
  selectWorkspaceProject,
} from "../../data/workspaceProjects";
import { getAccessToken } from "../../services/authToken";
import "./HomePage.css";

const MODULE_ICONS = {
  guide: "⌑",
  xray: "⌗",
  visual: "⌕",
};

function HomePage() {
  const navigate = useNavigate();

  const isLoggedIn = Boolean(getAccessToken());

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(isLoggedIn);
  const [projectsError, setProjectsError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedModule, setSelectedModule] = useState(null);
  const [gateMode, setGateMode] = useState("choice");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) {
      return undefined;
    }

    const controller = new AbortController();

    getWorkspaceProjects({ signal: controller.signal })
      .then((items) => {
        if (controller.signal.aborted) return;

        setProjects(items);
        setProjectsError("");
      })
      .catch((error) => {
        if (!controller.signal.aborted && error.name !== "AbortError") {
          setProjectsError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setProjectsLoading(false);
        }
      });

    return () => controller.abort();
  }, [isLoggedIn, reloadKey]);

  const moduleMeta = useMemo(
    () =>
      WORKSPACE_MODULES.find((module) => module.key === selectedModule) ||
      WORKSPACE_MODULES[0],
    [selectedModule],
  );

  const inProgressCount = projects.filter((project) =>
    Object.values(project.modules).some(
      (status) => status === MODULE_STATUS.IN_PROGRESS,
    ),
  ).length;

  const reviewCount = projects.filter((project) =>
    Object.values(project.modules).some(
      (status) => status === MODULE_STATUS.NEEDS_UPDATE,
    ),
  ).length;

  const openModule = (moduleKey) => {
    setSelectedModule(moduleKey);
    setGateMode(isLoggedIn ? "choice" : "login");
    setActionError("");
  };

  const closeGate = () => {
    setSelectedModule(null);
    setGateMode("choice");
    setActionError("");
  };

  const goToLogin = () => {
    closeGate();
    navigate("/login");
  };

  const enterProjectModule = async (project, moduleKey) => {
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

      if (nextProject !== project) {
        setProjects((current) =>
          current.map((item) =>
            item.artifactId === nextProject.artifactId ? nextProject : item,
          ),
        );
      }

      const artifactInfo = selectWorkspaceProject(nextProject);

      navigate(getModuleRoute(moduleKey), {
        state: {
          artifactId: nextProject.artifactId,
          artifactInfo,
          workspaceEntry: true,
          workspaceModule: moduleKey,
        },
      });
    } catch (error) {
      setActionError(error.message);
    }
  };

  const createProject = () => {
    if (!isLoggedIn) {
      setGateMode("login");
      return;
    }

    navigate("/artifact-register", {
      state: {
        entryModule: selectedModule,
        workspaceEntry: true,
      },
    });
  };

  const openProjectHub = (project) => {
    selectWorkspaceProject(project);

    navigate(`/workspace/${encodeURIComponent(project.artifactId)}`);
  };

  const continueProject = (project) =>
    enterProjectModule(project, getNextModule(project));

  const retryProjects = () => {
    if (!isLoggedIn) return;

    setProjectsLoading(true);
    setProjectsError("");
    setReloadKey((current) => current + 1);
  };

  const openWorkList = () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    navigate("/worklist");
  };

  return (
    <div className="heritage-home">
      <HeritageHeader active="dashboard" />

      <main className="heritage-home-main">
        <section className="heritage-hero">
          <div>
            <span className="heritage-kicker">RESTORATION WORKSPACE</span>

            <h1>유물 복원, 필요한 작업부터 시작하세요</h1>

            <p>
              작업 순서는 자유롭게. 모든 AI 결과는 하나의 유물 ID에 차곡차곡
              연결됩니다.
            </p>
          </div>

          {isLoggedIn ? (
            <div className="heritage-today">
              <span>오늘의 작업</span>
              <strong>진행 중 {inProgressCount}</strong>
              <em>검토 대기 {reviewCount}</em>
            </div>
          ) : (
            <div className="heritage-today">
              <span>VORA WORKSPACE</span>
              <strong>로그인 필요</strong>
              <em>프로젝트 작업은 로그인 후 이용할 수 있습니다.</em>
            </div>
          )}
        </section>

        <section
          className="heritage-quick-grid"
          aria-label="AI 복원 기능 빠른 메뉴"
        >
          {WORKSPACE_MODULES.map((module) => (
            <button
              className={`heritage-quick-card ${module.key}`}
              key={module.key}
              onClick={() => openModule(module.key)}
            >
              <span className="heritage-card-number">{module.number}</span>

              <span className="heritage-card-icon" aria-hidden="true">
                {MODULE_ICONS[module.key]}
              </span>

              <span className="heritage-eyebrow">{module.eyebrow}</span>

              <strong>{module.title}</strong>

              <span className="heritage-card-subtitle">{module.subtitle}</span>

              <span className="heritage-card-description">
                {module.description}
              </span>

              <span className="heritage-card-action">
                작업 선택 <b>→</b>
              </span>
            </button>
          ))}
        </section>

        <section className="heritage-recent">
          <div className="heritage-section-title">
            <div>
              <span className="heritage-kicker">RECENT ARTIFACTS</span>

              <h2>최근 프로젝트</h2>
            </div>

            <button onClick={openWorkList}>
              {isLoggedIn ? "전체 프로젝트 보기 →" : "로그인하기 →"}
            </button>
          </div>

          <div className="heritage-project-list">
            {!isLoggedIn && (
              <div className="heritage-project-state">
                <strong>로그인 후 최근 프로젝트를 확인할 수 있습니다.</strong>

                <span>
                  로그인하면 내가 진행 중인 유물 복원 프로젝트와 AI 작업 상태를
                  이어서 확인할 수 있습니다.
                </span>

                <button onClick={() => navigate("/login")}>로그인하기</button>
              </div>
            )}

            {isLoggedIn && projectsLoading && (
              <div className="heritage-project-state">
                프로젝트를 불러오는 중입니다.
              </div>
            )}

            {isLoggedIn && !projectsLoading && projectsError && (
              <div className="heritage-project-state error">
                <strong>프로젝트를 불러오지 못했습니다.</strong>

                <span>{projectsError}</span>

                <button onClick={retryProjects}>다시 시도</button>
              </div>
            )}

            {isLoggedIn &&
              !projectsLoading &&
              !projectsError &&
              projects.length === 0 && (
                <div className="heritage-project-state">
                  <strong>등록된 유물이 없습니다.</strong>

                  <span>상단 기능을 선택해 첫 유물 프로젝트를 등록하세요.</span>
                </div>
              )}

            {isLoggedIn &&
              !projectsLoading &&
              !projectsError &&
              projects.slice(0, 2).map((project) => (
                <article
                  className="heritage-project-row"
                  key={project.artifactId}
                >
                  <ArtifactThumb project={project} />

                  <button
                    className="heritage-project-name"
                    onClick={() => openProjectHub(project)}
                  >
                    <strong>{project.name}</strong>

                    <span>{project.artifactId}</span>

                    <small>
                      {project.material} · {project.period}
                    </small>
                  </button>

                  <div className="heritage-module-track">
                    {WORKSPACE_MODULES.map((module, index) => {
                      const status = project.modules[module.key];

                      return (
                        <div className="heritage-track-item" key={module.key}>
                          <button
                            className={`heritage-status-node ${status.toLowerCase()}`}
                            onClick={() =>
                              enterProjectModule(project, module.key)
                            }
                            aria-label={`${module.title} ${STATUS_LABEL[status]}`}
                          >
                            {status === MODULE_STATUS.DONE ? "✓" : index + 1}
                          </button>

                          <span>{module.shortTitle}</span>

                          <em className={status.toLowerCase()}>
                            {STATUS_LABEL[status]}
                          </em>
                        </div>
                      );
                    })}
                  </div>

                  <div className="heritage-row-action">
                    <small>
                      마지막 저장 {formatWorkspaceDate(project.updatedAt)}
                    </small>

                    <button onClick={() => continueProject(project)}>
                      이어서 작업 <span>→</span>
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </section>
      </main>

      {selectedModule && (
        <div
          className="heritage-modal-backdrop"
          role="presentation"
          onMouseDown={closeGate}
        >
          <section
            className="heritage-project-gate"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-gate-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="heritage-modal-close"
              onClick={closeGate}
              aria-label="닫기"
            >
              ×
            </button>

            {gateMode === "login" && (
              <>
                <span className="heritage-kicker">LOGIN REQUIRED</span>

                <h2 id="project-gate-title">
                  로그인 후 작업을 시작할 수 있습니다.
                </h2>

                <p>
                  유물 정보와 AI 분석 결과는 사용자 프로젝트에 저장됩니다.
                  로그인 후 기존 프로젝트를 이어서 작업하거나 새로운 유물을
                  등록해주세요.
                </p>

                <div className="heritage-choice-grid">
                  <button onClick={goToLogin}>
                    <span>→</span>

                    <strong>로그인</strong>

                    <small>내 프로젝트와 저장된 작업을 확인합니다.</small>

                    <b>로그인하기 →</b>
                  </button>

                  <button onClick={() => navigate("/signup")}>
                    <span>＋</span>

                    <strong>회원가입</strong>

                    <small>새로운 계정을 만들고 VORA를 시작합니다.</small>

                    <b>가입하기 →</b>
                  </button>
                </div>
              </>
            )}

            {gateMode === "choice" && isLoggedIn && (
              <>
                <span className="heritage-kicker">{moduleMeta.eyebrow}</span>

                <h2 id="project-gate-title">
                  {moduleMeta.title}을 시작할 유물을 선택하세요
                </h2>

                <p>
                  기존 유물을 선택하면 이전 결과에 이어서 저장되고, 신규 등록 시
                  새로운 artifactId가 생성됩니다.
                </p>

                <div className="heritage-choice-grid">
                  <button onClick={() => setGateMode("existing")}>
                    <span>↻</span>

                    <strong>기존 프로젝트에서 계속</strong>

                    <small>등록된 유물과 기능별 진행 상태 확인</small>

                    <b>프로젝트 선택 →</b>
                  </button>

                  <button onClick={createProject}>
                    <span>＋</span>

                    <strong>신규 유물 등록</strong>

                    <small>공통 유물 정보를 먼저 등록하고 시작</small>

                    <b>새로 만들기 →</b>
                  </button>
                </div>
              </>
            )}

            {gateMode === "existing" && isLoggedIn && (
              <>
                <button
                  className="heritage-back-link"
                  onClick={() => setGateMode("choice")}
                >
                  ← 이전
                </button>

                <span className="heritage-kicker">SELECT ARTIFACT</span>

                <h2 id="project-gate-title">기존 프로젝트 선택</h2>

                <p>
                  선택한 기능의 상태와 최근 저장 시점을 확인한 뒤 이어서
                  작업하세요.
                </p>

                <div className="heritage-selector-list">
                  {actionError && (
                    <div className="heritage-gate-error">{actionError}</div>
                  )}

                  {projectsLoading && (
                    <div className="heritage-selector-empty">
                      프로젝트를 불러오는 중입니다.
                    </div>
                  )}

                  {!projectsLoading && projectsError && (
                    <div className="heritage-selector-empty">
                      <strong>프로젝트 목록을 불러오지 못했습니다.</strong>

                      <button onClick={retryProjects}>다시 시도</button>
                    </div>
                  )}

                  {!projectsLoading &&
                    !projectsError &&
                    projects.length === 0 && (
                      <div className="heritage-selector-empty">
                        <strong>이어갈 프로젝트가 없습니다.</strong>

                        <button onClick={createProject}>신규 유물 등록</button>
                      </div>
                    )}

                  {!projectsLoading &&
                    !projectsError &&
                    projects.map((project) => {
                      const status = project.modules[selectedModule];

                      return (
                        <button
                          key={project.artifactId}
                          onClick={() =>
                            enterProjectModule(project, selectedModule)
                          }
                        >
                          <ArtifactThumb project={project} />

                          <span className="heritage-selector-name">
                            <strong>{project.name}</strong>

                            <small>
                              {project.artifactId} · {project.material} ·{" "}
                              {project.period}
                            </small>
                          </span>

                          <span
                            className={`heritage-pill ${status.toLowerCase()}`}
                          >
                            {STATUS_LABEL[status]}
                          </span>

                          <em>{formatWorkspaceDate(project.updatedAt)}</em>

                          <b>→</b>
                        </button>
                      );
                    })}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default HomePage;
