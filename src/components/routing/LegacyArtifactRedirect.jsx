import { Navigate, useParams } from "react-router-dom";
import { getActiveArtifactId } from "../../data/workspaceProjects";
import {
  getArtifactModuleRoute,
  getArtifactRoute,
  getArtifactWorkflowRoute,
} from "../../utils/artifactRoutes";

function LegacyArtifactRedirect({ target, moduleKey, stepKey }) {
  const params = useParams();
  const artifactId = params.id || params.artifactId || getActiveArtifactId();

  if (!artifactId) {
    return <Navigate to="/worklist" replace />;
  }

  let destination = getArtifactRoute(artifactId);

  if (moduleKey) {
    destination = getArtifactModuleRoute(artifactId, moduleKey);
  } else if (stepKey) {
    destination = getArtifactWorkflowRoute(artifactId, stepKey);
  } else if (target === "workspace") {
    destination = getArtifactRoute(artifactId);
  }

  return <Navigate to={destination} replace />;
}

export default LegacyArtifactRedirect;
