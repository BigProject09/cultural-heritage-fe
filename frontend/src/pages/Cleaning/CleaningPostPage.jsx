import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./CleaningPostPage.css";

function CleaningPostPage() {
  const navigate = useNavigate();

  const {
    taskId,
    setCompleted,
  } = useDisassembly();

  const [memo, setMemo] = useState("");

  const handleComplete = async () => {
    const request = {
      resume: {
        photo_urls: [],
        memo: memo,
      },
    };

    try {
      const response = await axios.post(
        `http://localhost:8080/tasks/${taskId}/resume`,
        request
      );

      console.log("✅ 백엔드 응답:", response.data);

      setCompleted((prev) => ({
        ...prev,
        cleaningPost: true,
      }));

      navigate("/cleaning");
    } catch (error) {
      console.error("❌ 에러:", error);
      alert("작업 후 기록 저장 실패");
    }
  };

  return (
    <div className="cleaning-post-page">
      <div className="detail-header">
        <button
          className="nav-btn"
          onClick={() => navigate("/cleaning")}
        >
          ← 이전
        </button>

        <h1 className="vora-logo">VORA</h1>

        <button
          className="nav-btn"
          onClick={handleComplete}
        >
          완료
        </button>
      </div>

      <div className="work-container">
        <div className="page-header">
          <h1>📝 작업 후 기록</h1>
          <p>세척 작업 결과를 기록합니다.</p>
        </div>

        <div className="info-card">
          <h2>사진</h2>
          <p>추후 업로드 기능이 추가될 예정입니다.</p>
        </div>

        <div className="info-card">
          <h2>작업 메모</h2>

          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="작업 내용을 입력하세요."
            rows={8}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}

export default CleaningPostPage;