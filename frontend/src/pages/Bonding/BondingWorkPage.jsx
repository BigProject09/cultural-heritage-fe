import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDisassembly } from "../../context/DisassemblyContext";
import { resumeTask } from "../../services/conservationGuideApi";

import "./BondingWorkPage.css";

function BondingWorkPage() {
  const navigate = useNavigate();

  const { taskId, setCompleted } = useDisassembly();

  const [beforePhotos, setBeforePhotos] = useState([]);
  const [afterPhotos, setAfterPhotos] = useState([]);

  const beforeInputRef = useRef(null);
  const afterInputRef = useRef(null);

  const handleComplete = async () => {
    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }

    const request = {
      resume: {
        before_photo_urls: beforePhotos.map((photo) => photo.name),
        after_photo_urls: afterPhotos.map((photo) => photo.name),
      },
    };

    try {
      await resumeTask(taskId, request);

      setCompleted((prev) => ({
        ...prev,
        bondingWork: true,
      }));

      navigate("/bonding-method");
    } catch (error) {
      console.error(error);
      alert("접합 작업 저장 실패");
    }
  };

  return (
    <div className="bonding-work-page">
      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() => navigate("/bonding")}
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

      <h1>접합 작업</h1>

      <div className="work-card">
        <h2>📷 작업 전 사진</h2>

        <input
          ref={beforeInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) =>
            setBeforePhotos((prev) => [
              ...prev,
              ...Array.from(e.target.files),
            ])
          }
        />

        <div className="photo-list">
          {beforePhotos.map((photo, index) => (
            <div
              key={index}
              className="photo-item"
            >
              <img
                src={URL.createObjectURL(photo)}
                alt={`작업 전 ${index + 1}`}
              />
            </div>
          ))}

          <button
            className="photo-add-btn"
            onClick={() => beforeInputRef.current.click()}
          >
            +
          </button>
        </div>
      </div>

      <div className="work-card">
        <h2>📷 작업 후 사진</h2>

        <input
          ref={afterInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) =>
            setAfterPhotos((prev) => [
              ...prev,
              ...Array.from(e.target.files),
            ])
          }
        />

        <div className="photo-list">
          {afterPhotos.map((photo, index) => (
            <div
              key={index}
              className="photo-item"
            >
              <img
                src={URL.createObjectURL(photo)}
                alt={`작업 후 ${index + 1}`}
              />
            </div>
          ))}

          <button
            className="photo-add-btn"
            onClick={() => afterInputRef.current.click()}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default BondingWorkPage;