import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./ArtifactRegisterPage.css";
import { useDisassembly } from "../../context/useDisassembly";

function ArtifactRegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setPreInvestigation } = useDisassembly();

  const editMode = !!location.state?.editMode;

  // 새로 등록할 때는 이전에 남아있던 유물 정보를 불러오지 않고 빈 값으로 시작한다.
  // 수정 모드일 때만 기존 값을 불러와 채워준다.
  const savedArtifact = editMode
    ? JSON.parse(localStorage.getItem("artifactInfo") || "{}")
    : {};

  const [image, setImage] = useState(savedArtifact.image || null);
  const [name, setName] = useState(savedArtifact.name || "");
  const [material, setMaterial] = useState(
    savedArtifact.material || "연질토기",
  );
  const [period, setPeriod] = useState(savedArtifact.period || "고려시대");
  const [condition, setCondition] = useState(savedArtifact.condition || "");
  const [weightValue, setWeightValue] = useState(
    savedArtifact.weight ? savedArtifact.weight.replace(/[a-z]/gi, "") : "",
  );
  const [weightUnit, setWeightUnit] = useState(
    savedArtifact.weight?.includes("g") && !savedArtifact.weight?.includes("kg")
      ? "g"
      : "kg",
  );
  const [bondingArea, setBondingArea] = useState(
    savedArtifact.bondingArea || "충분함",
  );
  const [treatmentPurpose, setTreatmentPurpose] = useState(
    savedArtifact.treatmentPurpose || "전시용",
  );

  // 유물 사진을 data URL 로 저장한다.
  //
  // blob: URL 은 문서 수명에 묶여 있어 새로고침하면 무효가 된다.
  // localStorage 에는 문자열이 남지만 실제로 불러올 수 없어
  // 이후 단계에서 사진을 쓰지 못한다.
  //
  // X-RAY 결합은 이 사진의 외곽 형태를 기준으로 조각을 배치한다.
  // 다시 압축하면 경계에 아티팩트가 생겨 마스크 추출이 나빠지므로
  // 용량이 허용하는 한 원본을 그대로 둔다.
  //
  // 줄여야 할 때도 2400px 아래로는 내리지 않는다. 결합 엔진이
  // 기준 이미지를 최대 2200px 로 분석하기 때문이다.
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // localStorage 는 대략 5MB 가 한계다. 다른 값도 함께
    // 저장되므로 여유를 두고 상한을 잡는다.
    const MAX_BYTES = 3_200_000;

    // 해상도와 품질을 단계적으로 낮춘다.
    // 엔진 분석 상한(2200px)을 먼저 지키고, 그래도 크면
    // 품질을 내린 뒤 마지막에 해상도를 줄인다.
    const STEPS = [
      [2400, 0.95],
      [2400, 0.88],
      [2000, 0.88],
      [1600, 0.85],
    ];

    const reader = new FileReader();

    reader.onload = () => {
      const original = reader.result;

      // 원본이 충분히 작으면 손대지 않는다
      if (original.length <= MAX_BYTES) {
        setImage(original);
        return;
      }

      const img = new Image();

      img.onload = () => {
        const render = (maxSide, quality) => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));

          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);

          const context = canvas.getContext("2d");
          context.imageSmoothingQuality = "high";
          context.drawImage(img, 0, 0, canvas.width, canvas.height);

          return canvas.toDataURL("image/jpeg", quality);
        };

        for (const [maxSide, quality] of STEPS) {
          const encoded = render(maxSide, quality);

          if (encoded.length <= MAX_BYTES) {
            setImage(encoded);
            return;
          }
        }

        // 모든 단계로도 부족하면 마지막 설정을 그대로 쓴다
        setImage(render(1600, 0.8));
      };

      img.src = original;
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
      name,
      material,
      period,
      condition,
      weight: weightValue ? `${weightValue}${weightUnit}` : "",
      bondingArea,
      treatmentPurpose,
    };

    localStorage.setItem("artifactInfo", JSON.stringify(artifactInfo));

    // 수정 후에는 새 taskId로 다시 시작되므로, 이전 taskId 기준으로 완료했던
    // 처리 전 조사(X-ray/육안) 결과도 더 이상 유효하지 않아 초기화한다.
    if (editMode) {
      setPreInvestigation({ xray: false, visual: false });
    }

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
        <h1>{editMode ? "유물 정보 수정" : "유물 등록"}</h1>

        <p>
          {editMode
            ? "수정할 항목을 변경한 뒤 저장해주세요."
            : "복원 프로젝트를 시작하기 위해 유물 정보를 입력해주세요."}
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
            <label>유물명</label>

            <input
              type="text"
              placeholder="예) 청자상감운학문매병"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>재질</label>

            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            >
              <option>연질토기</option>
              <option>경질토기</option>
              <option>청동</option>
              <option>철</option>
              <option>석재</option>
              <option>목재</option>
              <option>지류</option>
              <option>직물</option>
            </select>
          </div>

          <div className="form-group">
            <label>시대</label>

            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option>선사시대</option>
              <option>삼국시대</option>
              <option>통일신라시대</option>
              <option>고려시대</option>
              <option>조선시대</option>
              <option>근현대</option>
            </select>
          </div>

          <div className="form-group">
            <label>상태</label>

            <textarea
              rows="4"
              placeholder="예) 표면 균열 및 이물질 부착"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>무게</label>

            <div className="weight-inputs">
              <input
                type="number"
                placeholder="예) 3.2"
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
              />

              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value)}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
              </select>

              {/* <input
                placeholder="기타"
                value={soilEtc}
                onChange={(e) => setSoilEtc(e.target.value)}
              /> */}
            </div>
          </div>

          <div className="form-group">
            <label>접합 부위</label>

            <select
              value={bondingArea}
              onChange={(e) => setBondingArea(e.target.value)}
            >
              <option>충분함</option>
              <option>보통</option>
              <option>부족함</option>
            </select>
          </div>

          <div className="form-group">
            <label>처리 목적</label>

            <select
              value={treatmentPurpose}
              onChange={(e) => setTreatmentPurpose(e.target.value)}
            >
              <option>전시용</option>
              <option>보관용</option>
              <option>연구용</option>
              <option>복원 처리용</option>
            </select>
          </div>

          <div className="button-group">
            <button
              className="cancel-btn"
              onClick={() =>
                navigate(editMode ? "/pre-investigation" : "/worklist")
              }
            >
              취소
            </button>

            <button className="next-btn" onClick={handleNext}>
              {editMode ? "저장" : "다음 →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArtifactRegisterPage;
