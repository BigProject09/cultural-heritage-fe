import { useNavigate } from "react-router-dom";
import "./DisassemblyToolPage.css";
import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

function DisassemblyToolPage() {
  const navigate = useNavigate();

  const ctx = useDisassembly();
  const {
    taskId,
    tools,
    setCompleted,
    setStepSaving,
    toolSelection: selectedTools,
    setToolSelection: setSelectedTools,
  } = ctx;

  const handleSelect = (toolId) => {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(selectedTools.filter((id) => id !== toolId));
    } else {
      setSelectedTools([...selectedTools, toolId]);
    }
  };

  const handleSelectAll = () => {
    setSelectedTools(tools.map((tool) => tool.id));
  };

  const handleComplete = () => {
    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }

    if (selectedTools.length === 0) {
      alert("도구를 1개 이상 선택해주세요.");
      return;
    }

    setStepSaving("tool", true);
    navigate("/disassembly");

    (async () => {
      try {
        const result = await resumeTask(taskId, {
          resume: {
            confirmed_tools: selectedTools,
          },
        });

        applyInterrupt(result.interrupt, ctx);

        ctx.setSelectedTools(
          tools
            .filter((tool) => selectedTools.includes(tool.id))
            .map((tool) => tool.name),
        );

        setCompleted((prev) => ({
          ...prev,
          tool: true,
        }));
      } catch (error) {
        console.error(error);
        alert("도구 저장 실패");
      } finally {
        setStepSaving("tool", false);
      }
    })();
  };

  return (
    <div className="tool-page">
      {/* 상단 */}
      <div className="detail-header">
        <button
          className="nav-btn"
          onClick={() => navigate("/disassembly")}
        >
          ← 이전
        </button>

        <h1 className="vora-logo">VORA</h1>

        <div className="nav-btn-group">
          <button className="nav-btn secondary" onClick={handleSelectAll}>
            전체 선택
          </button>

          <button className="nav-btn" onClick={handleComplete}>
            완료
          </button>
        </div>
      </div>

      {/* 제목 */}
      <div className="page-header">
        <h1>해체 도구 선택</h1>
      </div>

      {/* 도구 목록 */}
      <div className="tool-list">
        {tools.map((tool) => {
          const isSelected = selectedTools.includes(tool.id);

          return (
            <div
              key={tool.id}
              className={`tool-card ${isSelected ? "selected" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(tool.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(tool.id);
                }
              }}
            >
              <div className="tool-card-header">
                <span className="tool-card-radio" aria-hidden="true" />

                <h2>{tool.name}</h2>
              </div>

              <p>{tool.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DisassemblyToolPage;
