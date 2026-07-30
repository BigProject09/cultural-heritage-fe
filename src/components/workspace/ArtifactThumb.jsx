import "./WorkspaceChrome.css";

function ArtifactThumb({ project, large = false }) {
  if (project?.image) {
    return (
      <div
        className={`heritage-artifact-thumb image ${large ? "large" : ""}`}
        aria-hidden="true"
      >
        <img src={project.image} alt="" />
      </div>
    );
  }

  return (
    <div
      className={`heritage-artifact-thumb ${project?.tone || "new"} ${
        large ? "large" : ""
      }`}
      aria-hidden="true"
    >
      <span className="heritage-artifact-object" />
      <span className="heritage-artifact-fragment" />
    </div>
  );
}

export default ArtifactThumb;
