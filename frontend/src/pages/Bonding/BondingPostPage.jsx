import { resumeTask } from "../../services/conservationGuideApi";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDisassembly } from "../../context/DisassemblyContext";

import "./BondingPostPage.css";

function BondingPostPage() {
  const navigate = useNavigate();

  const { taskId, setCompleted } = useDisassembly();

  const [photos, setPhotos] = useState([]);
  const [memo, setMemo] = useState("");

  const fileInputRef = useRef(null);

  const handleComplete = async () => {
    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }

    const request = {
      resume: {
        photo_urls: photos.map((photo) => photo.name),
        memo,
      },
    };

    try {
      await resumeTask(taskId, request);

      setCompleted((prev) => ({
        ...prev,
        bondingPost: true,
      }));

      // 복원(재료 선택) 페이지로 이동
      navigate("/material");
    } catch (error) {
      console.error(error);
      alert("접합 작업 후 기록 저장 실패");
    }
  };

  return (
    <div className="bonding-post-page">
      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() => navigate("/bonding-method")}
        >
          ← 이전
        </button>

        <div className="logo">VORA</div>

        <button
          className="nav-btn"
          onClick={handleComplete}
        >
          완료
        </button>
      </div>

      <h1>접합 작업 후 기록</h1>

      <div className="post-card">
        <h2>📷 작업 후 사진</h2>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) =>
            setPhotos((prev) => [
              ...prev,
              ...Array.from(e.target.files),
            ])
          }
        />

        <div className="photo-list">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="photo-item"
            >
              <img
                src={URL.createObjectURL(photo)}
                alt={`작업 후 사진 ${index + 1}`}
              />
            </div>
          ))}

          <button
            className="photo-add-btn"
            onClick={() => fileInputRef.current.click()}
          >
            +
          </button>
        </div>
      </div>

      <div className="post-card">
        <h2>📝 작업 메모</h2>

        <textarea
          placeholder="접합 작업 내용을 입력해주세요."
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>
    </div>
  );
}

export default BondingPostPage;