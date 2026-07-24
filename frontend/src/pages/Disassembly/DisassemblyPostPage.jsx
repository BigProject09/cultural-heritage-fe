import axios from "axios";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DisassemblyPostPage.css";

import { useDisassembly } from "../../context/DisassemblyContext";

function DisassemblyPostPage() {
  const navigate = useNavigate();

  const {
    taskId,
    completed,
    setCompleted,
  } = useDisassembly();

  const [photos, setPhotos] = useState([]);
  const [memo, setMemo] = useState("");

  const fileInputRef = useRef(null);

  const handleComplete = async () => {
    const request = {
     resume: {
        memo,
        photo_urls: photos.map((photo) => photo.name),
        },
    };

    console.log(request);

    try {
      const response = await axios.post(
        `http://localhost:8080/tasks/${taskId}/resume`,
        request
      );

      console.log(response.data);

      setCompleted({
        ...completed,
        post: true,
      });

      navigate("/disassembly");
    } catch (error) {
      console.error(error);
      alert("작업 후 기록 저장 실패");
    }
  };

  return (
    <div className="disassembly-post-page">

      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() => navigate("/disassembly")}
        >
          ← 이전
        </button>

        <div className="logo">
          VORA
        </div>

        <button
          className="nav-btn"
          onClick={handleComplete}
        >
          완료
        </button>
      </div>

      <h1>작업 후 기록</h1>

      <div className="post-card">
        <h2>📷 작업 후 사진</h2>

       <p className="card-description">
        작업 중 특이사항이나 추가 내용을 자유롭게 작성해주세요.
      </p>

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
                alt=""
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

        <h2>📝 메모</h2>
        <p className="card-description">
          작업 중 특이사항이나 추가 내용을 자유롭게 작성해주세요.
        </p>

        <textarea
          placeholder="작업 내용을 입력해주세요."
          value={memo}
          onChange={(e) =>
            setMemo(e.target.value)
          }
        />

      </div>

    </div>
  );
}

export default DisassemblyPostPage;