import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { useDisassembly } from "../../context/DisassemblyContext";

import "./DisassemblyChecklistPage.css";

function DisassemblyChecklistPage() {
  const navigate = useNavigate();

  const {
    completed,
    setCompleted,
    taskId,
    checklist: aiChecklist,
    setTools,
  } = useDisassembly();

  console.log("taskId =", taskId);

  const [checkedIds, setCheckedIds] = useState([]);

  const handleComplete = async () => {
    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }

    console.log("taskId =", taskId);
    console.log("checkedIds =", checkedIds);

    try {
      const response = await axios.post(
        `http://localhost:8080/tasks/${taskId}/resume`,
        {
          resume: {
            checked_ids: checkedIds,
          },
        }
      );

      console.log("응답 데이터");
      console.log(response.data);

      // ⭐ ai_tools 구조 확인
      console.log("ai_tools");
      console.log(response.data.interrupt?.ai_tools);

    const tools =
      response.data.interrupt?.ai_tools?.recommended_tools ?? [];

    setTools(tools);

      // 체크리스트 완료
      setCompleted({
        ...completed,
        checklist: true,
      });

      // 저장 후 해체 메인으로 이동
      navigate("/disassembly-tool");

    } catch (error) {
      console.error(error);

      console.log("응답 데이터");
      console.log(error.response?.data);

      alert("체크리스트 저장 실패");
    }
  };


  return (
    <div className="checklist-page">

      {/* 상단 */}
      <div className="top-nav">

        <button
          className="back-btn"
          onClick={() => navigate("/disassembly")}
        >
          ← 이전
        </button>

        <div className="logo">
          VORA
        </div>

        <button
          className="next-btn"
          onClick={handleComplete}
        >
          완료
        </button>

      </div>

      {/* 제목 */}
      <div className="investigation-header">

        <div className="title-area">

          <h1>AI 해체 전 조사</h1>

          <p>
            AI가 유물 정보를 분석하여
            해체 전 점검 항목을 추천했습니다.
          </p>

        </div>

      </div>

      {/* 체크리스트 */}
      <div className="checklist-card">

        <div className="card-title">
          🤖 AI 추천 체크리스트
        </div>

        {aiChecklist.map((item) => (

          <label
            key={item.id}
            className="check-item"
          >

            <input
              type="checkbox"
              checked={checkedIds.includes(item.id)}
              onChange={(e) => {

                if (e.target.checked) {

                  setCheckedIds([
                    ...checkedIds,
                    item.id,
                  ]);

                } else {

                  setCheckedIds(
                    checkedIds.filter(
                      (id) => id !== item.id
                    )
                  );

                }

              }}
            />

            <div className="check-content">

              <span className="check-title">
                {item.label}
              </span>

            </div>

          </label>

        ))}

      </div>

    </div>
  );
}

export default DisassemblyChecklistPage;