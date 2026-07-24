import { useState } from "react";
import { useDisassembly } from "../../context/DisassemblyContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ArtifactRegisterPage.css";

function ArtifactRegisterPage() {
  const navigate = useNavigate();
  const {
  setTaskId,
  setChecklist,
} = useDisassembly();

  const [image, setImage] = useState(null);
  const [artifactType, setArtifactType] = useState("도토기");
  const [material, setMaterial] = useState("토기");

  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [depth, setDepth] = useState("");

  const [soilPH, setSoilPH] = useState("");
  const [soilCL, setSoilCL] = useState("");
  const [soilEtc, setSoilEtc] = useState("");

  const [device, setDevice] = useState("");

  const handleImageChange = (e) => {
  const file = e.target.files[0];

    if (file) {
      setImage(URL.createObjectURL(file));
    }
  };

  const handleNext = async () => {

      const request = {
    taskName: "보존처리 프로젝트",
    taskManager: "오서하",

    relicInfo: {
      name: artifactType,
      material: material,
      period: "",
      condition: "",
    },

    relicPhoto: [],

    flow: ["disassembly"],
  };

  console.log("POST 요청 시작", request);

  try {
  const response = await axios.post(
    "http://localhost:8080/tasks/1/start",
    request
  );

  console.log("백엔드 응답:", response.data);

  // Context에 저장
  setTaskId("1");

  setChecklist(
    response.data.interrupt.ai_checklist.checklist
  );

} catch (error) {
  console.error(error);
  alert("백엔드 연결 실패");
  return;
}

  const artifactInfo = {
    image,
    artifactType,
    material,
    width,
    height,
    depth,
    soilPH,
    soilCL,
    soilEtc,
    device,
  };

  localStorage.setItem(
    "artifactInfo",
    JSON.stringify(artifactInfo)
  );

  navigate("/flow-recommendation");
};

  return (
    <div className="register-page">


      {/* Header */}
      <header className="register-header">

  <div
    className="register-logo"
    onClick={() => navigate("/")}
  >
    VORA
  </div>

  <div
    className="register-profile"
    onClick={() => navigate("/login")}
  >
    👤
  </div>

</header>

      {/* Title */}
      <section className="register-title-area">

        <h1>유물 등록</h1>

        <p>
          복원 프로젝트를 시작하기 위해
          유물 정보를 입력해주세요.
        </p>

      </section>

      {/* Step */}

      <div className="register-step-bar">

        <div className="register-step register-active">

          <span>1</span>

          <p>등록</p>

        </div>

        <div className="register-step-line"></div>

        <div className="register-step">

          <span>2</span>

          <p>처리 전 조사</p>

        </div>

        <div className="register-step-line"></div>

        <div className="register-step">

          <span>3</span>

          <p>AI 분석</p>

        </div>

        <div className="register-step-line"></div>

        <div className="register-step">

          <span>4</span>

          <p>완료</p>

        </div>

      </div>

      {/* Content */}

      <div className="register-content">

        {/* Left */}

        <div className="image-card">

          <h2>유물 사진</h2>

          <label
            htmlFor="artifact-image"
            className="upload-area"
          >
            {image ? (

              <img
                src={image}
                alt="preview"
                className="preview-image"
              />

            ) : (

              <div className="upload-placeholder">

                <div className="upload-icon">
                  📷
                </div>

                <h3>사진 업로드</h3>

                <p>클릭하여 이미지를 업로드하세요.</p>

                <span>JPG · PNG</span>

              </div>

            )}
          </label>

          <input
            id="artifact-image"
            type="file"
            accept="image/*"
            hidden
            onChange={handleImageChange}
          />

        </div>

        {/* Right */}

        <div className="form-card">

          <h2>유물 정보</h2>

          <div className="form-group">

            <label>유물 종류</label>

            <select
  value={artifactType}
  onChange={(e) => setArtifactType(e.target.value)}
>
  <option>도토기</option>
  <option>금속 유물</option>
  <option>석조</option>
  <option>목재</option>
</select>

          </div>
                    <div className="form-group">

            <label>제원 조사 (cm)</label>

            <div className="size-inputs">

              <input
  type="number"
  placeholder="가로"
  value={width}
  onChange={(e) => setWidth(e.target.value)}
/>

              <input
  type="number"
  placeholder="세로"
  value={height}
  onChange={(e) => setHeight(e.target.value)}
/>

              <input
                type="number"
                placeholder="높이"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
              />

            </div>

          </div>

          <div className="form-group">

            <label>추정 재질</label>

            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
          >
            <option>토기</option>
           <option>청동</option>
           <option>철</option>
           <option>석재</option>
           <option>목재</option>
           <option>지류</option>
          </select>

          </div>

          <div className="form-group">

            <label>토양 정보</label>

            <div className="soil-inputs">

              <input
  placeholder="pH"
  value={soilPH}
  onChange={(e) => setSoilPH(e.target.value)}
/>

<input
  placeholder="Cl-"
  value={soilCL}
  onChange={(e) => setSoilCL(e.target.value)}
/>

<input
  placeholder="기타"
  value={soilEtc}
  onChange={(e) => setSoilEtc(e.target.value)}
/>

            </div>

          </div>

          <div className="form-group">

            <label>측정 장비</label>

            <textarea
  rows="4"
  placeholder="예) Galaxy S25 Ultra"
  value={device}
  onChange={(e) => setDevice(e.target.value)}
/>

          </div>

          <div className="button-group">

            <button
              className="cancel-btn"
              onClick={() => navigate("/worklist")}
            >
              취소
            </button>

            <button
  className="next-btn"
  onClick={handleNext}
>
  다음 →
</button>

          </div>

        </div>
              </div>

    </div>
  );
}

export default ArtifactRegisterPage;