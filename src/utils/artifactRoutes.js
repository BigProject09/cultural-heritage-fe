const encodeArtifactId = (artifactId) =>
  encodeURIComponent(String(artifactId || ""));

export function getArtifactRoute(artifactId) {
  const encodedId = encodeArtifactId(artifactId);
  return encodedId ? `/artifacts/${encodedId}` : "/worklist";
}

export function getArtifactModuleRoute(artifactId, moduleKey) {
  const base = getArtifactRoute(artifactId);

  if (base === "/worklist") return base;

  const moduleRoutes = {
    guide: `${base}/guide`,
    xray: `${base}/xray`,
    visual: `${base}/visual`,
  };

  return moduleRoutes[moduleKey] || base;
}

export function getArtifactWorkflowRoute(artifactId, stepKey = "") {
  const base = getArtifactRoute(artifactId);
  if (base === "/worklist") return base;

  return stepKey ? `${base}/guide/${stepKey}` : `${base}/guide`;
}

export function getFinalReportRoute(artifactId) {
  const base = getArtifactRoute(artifactId);
  return base === "/worklist" ? base : `${base}/final-report`;
}
