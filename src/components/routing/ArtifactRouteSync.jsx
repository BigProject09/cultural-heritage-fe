import { Outlet, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getWorkspaceProject,
  selectWorkspaceProject,
} from "../../data/workspaceProjects";

function ArtifactRouteSync() {
  const { artifactId = "" } = useParams();
  const decodedArtifactId = decodeURIComponent(artifactId);
  const [state, setState] = useState({
    artifactId: "",
    loading: true,
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    getWorkspaceProject(decodedArtifactId, { signal: controller.signal })
      .then((project) => {
        selectWorkspaceProject(project);
        setState({
          artifactId: decodedArtifactId,
          loading: false,
          error: "",
        });
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setState({
            artifactId: decodedArtifactId,
            loading: false,
            error: error.message,
          });
        }
      });

    return () => controller.abort();
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
