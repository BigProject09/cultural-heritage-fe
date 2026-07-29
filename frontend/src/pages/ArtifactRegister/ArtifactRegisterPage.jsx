import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ArtifactRegisterPage.css";

function ArtifactRegisterPage() {
  const navigate = useNavigate();

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

  // 유물 사진을 data URL 로 저장한다.
  //
  // URL.createObjectURL 이 만드는 blob: URL 은 문서 수명에 묶여 있어
  // 새로고침하면 무효가 된다. localStorage 에는 문자열이 남지만
  // 실제로 불러올 수 없어, 이후 단계에서 사진을 쓰지 못한다.
  //
  // X-RAY 결합은 이 컬러 사진의 외곽 형태를 기준으로 조각을
  // 배치하므로 반드시 살아 있어야 한다.
  //
  // 원본 그대로 넣으면 localStorage 용량(약 5MB)을 넘길 수 있어
  // 긴 변을 2000px 로 줄인다. 결합 엔진이 기준 이미지를 1400~2200px
  // 로 축소해 분석하므로 정밀도 손실은 없다.
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const maxSide = 2000;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        canvas
          .getContext("2d")
          .drawImage(img, 0, 0, canvas.width, canvas.height);

        setImage(canvas.toDataURL("image/jpeg", 0.9));
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  };

  const handleNext = async () => {
    const artifactInfo = {
      // 유물 식별자.
      //
      // 이후 단계(X-RAY 결합, 결함 분석)가 이 값으로 작업을
      // 구분한다. 없으면 결합이 시작되지 않는다.
      // 서버에서 발급받는 구조로 바뀌면 이 부분을 교체한다.
      artifactId: `artifact-${Date.now()}`,

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

    localStorage.setItem("artifactInfo", JSON.stringify(artifactInfo));

    navigate("/flow-recommendation");
  };

  return (
    <div className="register-page">
      {/* Header */}
      <header className="register-header">
        <div className="register-logo" onClick={() => navigate("/")}>
          VORA
        </div>

        <div className="register-profile" onClick={() => navigate("/login")}>
          👤
        </div>
      </header>

      {/* Title */}
      <section className="register-title-area">
        <h1>유물 등록</h1>

        <p>복원 프로젝트를 시작하기 위해 유물 정보를 입력해주세요.</p>
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

          <label htmlFor="artifact-image" className="upload-area">
            {image ? (
              <img src={image} alt="preview" className="preview-image" />
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">📷</div>

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

            <button className="next-btn" onClick={handleNext}>
              다음 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArtifactRegisterPage;
