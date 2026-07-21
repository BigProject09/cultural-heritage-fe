import "./StepSidebar.css";

function StepSidebar({ steps, currentStep }) {
  return (
    <aside className="step-sidebar">
      <h3 className="sidebar-title">작업 Flow</h3>

      <div className="step-list">
        {steps.map((step, index) => {
          const stepName =
            typeof step === "string" ? step : step.name;

          const currentIndex = steps.findIndex((item) =>
            typeof item === "string"
              ? item === currentStep
              : item.name === currentStep
          );

          let status = "upcoming";

          if (index < currentIndex) {
            status = "completed";
          } else if (index === currentIndex) {
            status = "current";
          }

          return (
            <div
              key={index}
              className={`step-item ${status}`}
            >
              <div className="step-circle">
                {status === "completed" ? "✔" : index + 1}
              </div>

              <span>{stepName}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default StepSidebar;