import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./DisassemblyToolPage.css";
import { useDisassembly } from "../../context/DisassemblyContext";

function DisassemblyToolPage() {
  const navigate = useNavigate();

  const {
    taskId,
    tools,
    completed,
    setCompleted,
    setMethods,
  } = useDisassembly();

  console.log("tools =", tools);

  console.log("tools =", tools);

  const [selectedTools, setSelectedTools] = useState([]);

  const handleSelect = (toolId) => {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(
        selectedTools.filter((id) => id !== toolId)
      );
    } else {
      setSelectedTools([
        ...selectedTools,
        toolId,
      ]);
    }
  };

  const handleComplete = async () => {
    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }

    if (selectedTools.length === 0) {
      alert("도구를 1개 이상 선택해주세요.");
      return;
    }

    console.log("선택된 도구", selectedTools);

    try {
      const response = await axios.post(
        `http://localhost:8080/tasks/${taskId}/resume`,
        {
          resume: {
            confirmed_tools: selectedTools,
          },
        }
      );

      const methods =
        response.data.interrupt?.ai_disassembly_method ?? {};

      setMethods(methods);

      setCompleted({
        ...completed,
        tool: true,
      });

      navigate("/disassembly-method");
    } catch (error) {
      console.error(error);
      alert("도구 저장 실패");
    }
    };

    return (
    <div className="tool-page">

      {/* 상단 */}
      <div className="top-bar">

        <button
          className="nav-btn"
          onClick={() => navigate("/disassembly")}
        >
          ← 이전
        </button>

        <h1 className="logo">VORA</h1>

        <button
          className="nav-btn"
          onClick={handleComplete}
        >
          완료
        </button>

      </div>

      {/* 제목 */}
      <div className="page-header">

        <h1>AI 추천 해체 도구</h1>

        <p>
          유물 정보와 해체 전 조사 결과를 기반으로 추천된 도구입니다.
        </p>

      </div>

      {/* 도구 목록 */}
      <div className="tool-list">

        {tools.map((tool) => (

          <div
            key={tool.id}
            className={`tool-card ${
              selectedTools.includes(tool.id)
                ? "selected"
                : ""
            }`}
          >

            <h2>{tool.name}</h2>

            <p>{tool.description}</p>

            <button
              className="select-btn"
              onClick={() =>
                handleSelect(tool.id)
              }
            >
              {selectedTools.includes(tool.id)
                ? "✔ 선택됨"
                : "선택"}
            </button>

          </div>

        ))}

      </div>

    </div>
  );
}

export default DisassemblyToolPage;