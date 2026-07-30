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
  const [material, setMaterial] = useState(savedArtifact.material || "연질토기");
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

  const handleImageChange = (e) => {
  const file = e.target.files[0];

    if (file) {
      setImage(URL.createObjectURL(file));
    }
  };

  const handleNext = async () => {
    const artifactInfo = {
    image,
    name,
    material,
    period,
    condition,
    weight: weightValue ? `${weightValue}${weightUnit}` : "",
    bondingArea,
    treatmentPurpose,
  };

  localStorage.setItem(
    "artifactInfo",
    JSON.stringify(artifactInfo)
  );

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

            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
          >
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
              onClick={() => navigate(editMode ? "/pre-investigation" : "/worklist")}
            >
              취소
            </button>

            <button
  className="next-btn"
  onClick={handleNext}
>
  {editMode ? "저장" : "다음 →"}
</button>

          </div>

        </div>
              </div>

    </div>
  );
}

export default ArtifactRegisterPage;
