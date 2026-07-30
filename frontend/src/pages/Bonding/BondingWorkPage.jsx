import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

import "./BondingWorkPage.css";

function BondingWorkPage() {
  const navigate = useNavigate();

  const ctx = useDisassembly();
  const { taskId, setCompleted, setStepSaving } = ctx;

  const [beforePhotos, setBeforePhotos] = useState([]);
  const [beforePhotoUrl, setBeforePhotoUrl] = useState("");
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState("");

  const handleAddBeforePhoto = () => {
    if (!beforePhotoUrl.trim()) return;
    setBeforePhotos((prev) => [...prev, beforePhotoUrl.trim()]);
    setBeforePhotoUrl("");
  };

  const handleRemoveBeforePhoto = (index) => {
    setBeforePhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddAfterPhoto = () => {
    if (!afterPhotoUrl.trim()) return;
    setAfterPhotos((prev) => [...prev, afterPhotoUrl.trim()]);
    setAfterPhotoUrl("");
  };

  const handleRemoveAfterPhoto = (index) => {
    setAfterPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }

    setStepSaving("bondingWork", true);
    navigate("/bonding");

    (async () => {
      try {
        const response = await resumeTask(taskId, {
          resume: {
            before_photo_urls: beforePhotos,
            after_photo_urls: afterPhotos,
          },
        });

        applyInterrupt(response.interrupt, ctx);

        setCompleted((prev) => ({
          ...prev,
          bondingWork: true,
        }));
      } catch (error) {
        console.error(error);
        alert("접합 작업 저장 실패");
      } finally {
        setStepSaving("bondingWork", false);
      }
    })();
  };

  return (
    <div className="bonding-work-page">
      <div className="detail-header">
        <button
          className="nav-btn"
          onClick={() => navigate("/bonding")}
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

      <h1>접합 작업</h1>

      <div className="work-card">
        <h2>📷 작업 전 사진</h2>

        <div className="photo-url-row">
          <input
            type="text"
            className="photo-url-input"
            placeholder="사진 URL을 입력하세요"
            value={beforePhotoUrl}
            onChange={(e) => setBeforePhotoUrl(e.target.value)}
          />

          <button className="photo-url-add-btn" onClick={handleAddBeforePhoto}>
            + 추가
          </button>
        </div>

        <div className="photo-url-list">
          {beforePhotos.map((url, index) => (
            <div key={index} className="photo-url-chip">
              <span>{url}</span>

              <button onClick={() => handleRemoveBeforePhoto(index)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="work-card">
        <h2>📷 작업 후 사진</h2>

        <div className="photo-url-row">
          <input
            type="text"
            className="photo-url-input"
            placeholder="사진 URL을 입력하세요"
            value={afterPhotoUrl}
            onChange={(e) => setAfterPhotoUrl(e.target.value)}
          />

          <button className="photo-url-add-btn" onClick={handleAddAfterPhoto}>
            + 추가
          </button>
        </div>

        <div className="photo-url-list">
          {afterPhotos.map((url, index) => (
            <div key={index} className="photo-url-chip">
              <span>{url}</span>

              <button onClick={() => handleRemoveAfterPhoto(index)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BondingWorkPage;