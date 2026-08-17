import { Outlet, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  getActiveArtifactId,
  getWorkspaceProject,
  selectWorkspaceProject,
} from "../../data/workspaceProjects";
import { useDisassembly } from "../../context/useDisassembly";
import { getLatestTaskByArtifact } from "../../services/conservationGuideApi";
import { restoreGuideTaskContext } from "../../utils/guideTaskRecovery";

function ArtifactRouteSync() {
  const { artifactId = "" } = useParams();
  const decodedArtifactId = decodeURIComponent(artifactId);
  const ctx = useDisassembly();
  const ctxRef = useRef(ctx);

  useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx]);

  const [state, setState] = useState({
    artifactId: "",
    loading: true,
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    // 같은 유물 안에서 구 URL -> artifact URL 리다이렉트가 일어나면
    // ArtifactRouteSync가 다시 마운트될 수 있다. 이때 이미 살아 있는 taskId까지
    // 초기화하면 체크리스트/도구/방법 데이터와 taskId가 모두 사라진다.
    //
    // - 같은 유물 + taskId가 이미 있음: 현재 Context를 그대로 재사용
    // - 다른 유물이거나 새로고침으로 taskId가 없음: Context 초기화 후 DB에서 복구
    const reuseCurrentGuideContext =
      Boolean(ctxRef.current.taskId) &&
      getActiveArtifactId() === decodedArtifactId;

    if (!reuseCurrentGuideContext) {
      ctxRef.current.resetCompleted();
    }

    const stateTimer = window.setTimeout(() => {
      setState({ artifactId: decodedArtifactId, loading: true, error: "" });
    }, 0);

    (async () => {
      try {
        const project = await getWorkspaceProject(decodedArtifactId, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        selectWorkspaceProject(project);

        if (!reuseCurrentGuideContext) {
          try {
            const guideTask = await getLatestTaskByArtifact(decodedArtifactId, {
              signal: controller.signal,
            });

            if (!controller.signal.aborted && guideTask) {
              restoreGuideTaskContext(
                guideTask,
                decodedArtifactId,
                ctxRef.current,
              );
            }
          } catch (guideError) {
          if (guideError.name !== "CanceledError" && guideError.name !== "AbortError") {
            // 워크스페이스 자체는 열어두고, 가이드 진입 시 ProjectDetail에서 한 번 더
            // 조회해 사용자에게 오류를 보여준다. 일시적인 가이드 조회 실패 때문에
            // 다른 모듈(X-RAY/육안조사)까지 막지 않는다.
              console.warn("보존가이드 진행상태 복구 실패:", guideError);
            }
          }
        }

        if (!controller.signal.aborted) {
          setState({
            artifactId: decodedArtifactId,
            loading: false,
            error: "",
          });
        }
      } catch (error) {
        if (error.name !== "AbortError" && error.name !== "CanceledError") {
          setState({
            artifactId: decodedArtifactId,
            loading: false,
            error: error.message,
          });
        }
      }
    })();

    return () => {
      window.clearTimeout(stateTimer);
      controller.abort();
    };
    // Context 객체는 각 state 변경 때마다 새 객체가 되므로 dependency에 넣으면
    // 복구 자체가 다시 실행된다. artifactId가 바뀔 때만 복구한다.
  }, [decodedArtifactId]);

  if (state.loading || state.artifactId !== decodedArtifactId) {
    return (
      <main className="artifact-route-state">
        <span>ARTIFACT WORKSPACE</span>
        <h1>유물 프로젝트를 불러오는 중입니다.</h1>
      </main>
    );
  }

  if (state.error) {
    return (
      <main className="artifact-route-state error">
        <span>ARTIFACT NOT FOUND</span>
        <h1>유물 프로젝트를 열 수 없습니다.</h1>
        <p>{state.error}</p>
        <a href="/worklist">프로젝트 목록으로 이동</a>
      </main>
    );
  }

  return <Outlet />;
}

export default ArtifactRouteSync;
