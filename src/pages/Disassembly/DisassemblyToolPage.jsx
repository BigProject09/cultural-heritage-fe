import { useState } from "react";
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
    toolsReason,
    toolsPrecautions,
    setCompleted,
    setStepSaving,
    toolSelection: selectedTools,
    setToolSelection: setSelectedTools,
  } = ctx;

  // 오른쪽 상세 영역에 어떤 도구를 보여줄지만 담당하는 순수 화면 상태.
  // 선택(체크) 로직인 selectedTools/handleSelect와는 별개다.
  const [activeToolId, setActiveToolId] = useState(null);

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

  const activeTool =
    tools.find((tool) => tool.id === activeToolId) ||
    tools.find((tool) => tool.recommended) ||
    tools[0] ||
    null;

  // 왼쪽 목록은 선택용이 아니라 오른쪽 상세를 바꿔 보는 이동바다.
  // 선택/해제는 오른쪽 상세의 "선택" 버튼에서만 한다.
  const handleCardClick = (toolId) => {
    setActiveToolId(toolId);
  };

  const handleCardKeyDown = (e, toolId) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick(toolId);
    }
  };

  const isActiveSelected = activeTool ? selectedTools.includes(activeTool.id) : false;

  // 아래 "선택한 도구" 탭에 표시할 목록 — 기존 selectedTools를 그대로 조회만 한다.
  const selectedToolItems = tools.filter((tool) => selectedTools.includes(tool.id));

  return (
    <div className="tool-page">
      {/* 상단 */}
      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/disassembly")}>
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

      {/* 좌우 2단 레이아웃 */}
      <div className="tool-layout">
        {/* 왼쪽: 추천 도구 목록 + 선택한 도구 목록 */}
        <aside className="tool-list-panel">
          <div className="tool-list-panel-header">
            <h2 className="tool-list-title">추천 도구</h2>
          </div>

          <div className="tool-list-items">
            {tools.map((tool) => {
              const isActive = activeTool?.id === tool.id;

              return (
                <div
                  key={tool.id}
                  className={`tool-list-row ${isActive ? "active" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick(tool.id)}
                  onKeyDown={(e) => handleCardKeyDown(e, tool.id)}
                >
                  {tool.name}
                </div>
              );
            })}
          </div>

          <div className="tool-list-panel-header tool-list-panel-header--secondary">
            <h2 className="tool-list-title">선택한 도구</h2>
          </div>

          <div className="tool-list-items">
            {selectedToolItems.length > 0 ? (
              selectedToolItems.map((tool) => (
                <div key={tool.id} className="tool-list-row tool-list-row--static">
                  {tool.name}
                </div>
              ))
            ) : (
              <p className="tool-list-empty">선택한 도구가 없습니다.</p>
            )}
          </div>
        </aside>

        {/* 오른쪽: 선택된 도구 상세 */}
        <section className="tool-detail-panel">
          {activeTool ? (
            <>
              <h2 className="tool-detail-name">{activeTool.name}</h2>
              <p className="tool-detail-description">{activeTool.description}</p>

              {(activeTool.reason || toolsReason) && (
                <div className="tool-detail-block">
                  <h3>추천 이유</h3>
                  <p>{activeTool.reason || toolsReason}</p>
                </div>
              )}

              {(activeTool.precautions?.length > 0 || toolsPrecautions.length > 0) && (
                <div className="tool-detail-block">
                  <h3>사용 시 주의사항</h3>
                  <ul>
                    {(activeTool.precautions?.length > 0
                      ? activeTool.precautions
                      : toolsPrecautions
                    ).map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="tool-detail-actions">
                <button
                  className={`nav-btn ${isActiveSelected ? "" : "secondary"}`}
                  onClick={() => handleSelect(activeTool.id)}
                >
                  {isActiveSelected ? "선택됨" : "선택"}
                </button>
              </div>
            </>
          ) : (
            <p className="tool-detail-empty">표시할 도구가 없습니다.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default DisassemblyToolPage;
