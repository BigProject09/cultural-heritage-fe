import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HeritageHeader from "../../components/workspace/HeritageHeader";
import {
  WORKSPACE_MODULES,
  getArtifactStorageMode,
  getModuleRoute,
  selectWorkspaceProject,
  upsertWorkspaceProject,
} from "../../data/workspaceProjects";
import "./ArtifactRegisterPage.css";

const VISUAL_SUPPORTED_MATERIALS = new Set([
  "연질토기",
  "경질토기",
  "도자기 · 백자",
]);

function getVisualMaterialSupport(material) {
  if (!material) return "unselected";
  return VISUAL_SUPPORTED_MATERIALS.has(material) ? "supported" : "unsupported";
}

function readSavedArtifact(editMode) {
  if (!editMode) return {};

  try {
    return JSON.parse(localStorage.getItem("artifactInfo") || "{}");
  } catch {
    return {};
  }
}

function ArtifactRegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const editMode = Boolean(location.state?.editMode);
  const entryModule = location.state?.entryModule || "guide";
  const savedArtifact = useMemo(() => readSavedArtifact(editMode), [editMode]);
  const moduleMeta =
    WORKSPACE_MODULES.find((module) => module.key === entryModule) ||
    WORKSPACE_MODULES[0];
  const storageMode = getArtifactStorageMode();
  const localStorageMode = storageMode === "local";

  const [imageFile, setImageFile] = useState(null);
  const [name, setName] = useState(savedArtifact.name || "");
  const [material, setMaterial] = useState(savedArtifact.material || "");
  const visualMaterialSupport = getVisualMaterialSupport(material);
  const [period, setPeriod] = useState(savedArtifact.period || "");
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
    savedArtifact.bondingArea || "",
  );
  const [treatmentPurpose, setTreatmentPurpose] = useState(
    savedArtifact.treatmentPurpose || "",
  );
  const [submitError, setSubmitError] = useState("");
  const [imageError, setImageError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const previewUrl = useMemo(
    () =>
      imageFile instanceof Blob
        ? URL.createObjectURL(imageFile)
        : savedArtifact.image || "",
    [imageFile, savedArtifact.image],
  );

  useEffect(
    () => () => {
      if (imageFile instanceof Blob && previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [imageFile, previewUrl],
  );

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setImageError("PNG 또는 JPG 이미지만 등록할 수 있습니다.");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setImageError("이미지 용량은 100MB 이하여야 합니다.");
      return;
    }

    setImageFile(file);
    setImageError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (!name.trim() || !material || !period) {
      setSubmitError("유물명, 재질, 시대를 모두 입력해주세요.");
      return;
    }

    if (!editMode && !imageFile) {
      setImageError("대표 컬러 이미지를 등록해주세요.");
      return;
    }

    const artifactInfo = {
      artifactId: editMode ? savedArtifact.artifactId : undefined,
      name: name.trim(),
      material,
      period,
      condition: condition.trim(),
      weight: weightValue ? `${weightValue}${weightUnit}` : "",
      bondingArea,
      treatmentPurpose,
    };

    setSubmitting(true);

    try {
      const project = await upsertWorkspaceProject(artifactInfo, entryModule, {
        editMode,
        imageFile,
      });
      const selectedArtifact = selectWorkspaceProject(project);

      navigate(getModuleRoute(entryModule, project.artifactId), {
        state: {
          artifactId: project.artifactId,
          artifactInfo: selectedArtifact,
          workspaceEntry: Boolean(location.state?.workspaceEntry),
          workspaceModule: entryModule,
        },
      });
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="artifact-register-page">
      <HeritageHeader active="projects" />

      <main className="artifact-register-main">
        <button
          type="button"
          className="artifact-register-back"
          onClick={() => navigate(-1)}
        >
          ← 이전
        </button>

        <section className="artifact-register-heading">
          <div>
            <span className="artifact-register-kicker">NEW ARTIFACT RECORD</span>
            <h1>{editMode ? "유물 정보 수정" : "신규 유물 등록"}</h1>
            <p>
              공통 유물 정보는 세 가지 AI 복원 기능과 최종 보고서에 함께
              사용됩니다.
            </p>
          </div>

          <div className="artifact-entry-module">
            <span>등록 후 시작할 기능</span>
            <strong>{moduleMeta.title}</strong>
            <small>{moduleMeta.subtitle}</small>
          </div>
        </section>

        <div className="artifact-register-notice">
          <span>{localStorageMode ? "LOCAL TEST" : "artifactId"}</span>
          <p>
            {localStorageMode
              ? "로컬 테스트 모드입니다. 유물 정보는 브라우저에, 대표 이미지는 용량이 더 큰 IndexedDB 임시 저장소에 보관됩니다."
              : "저장이 완료되면 서버가 고유 유물 ID를 발급합니다. 이후의 모든 분석 결과는 이 ID에 누적됩니다."}
          </p>
        </div>

        <form className="artifact-register-form" onSubmit={handleSubmit}>
          <section className="artifact-image-panel">
            <div className="artifact-panel-heading">
              <span>01</span>
              <div>
                <h2>대표 컬러 이미지</h2>
                <p>
                  유물 워크스페이스와 X-RAY 조각 결합에 사용하는 대표
                  이미지입니다. 문양 분석용 사진은 육안조사 단계에서 별도로
                  등록합니다.
                </p>
              </div>
            </div>

            <label
              htmlFor="artifact-image"
              className={`artifact-upload ${previewUrl ? "has-image" : ""}`}
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="유물 대표 이미지 미리보기" />
                  <span className="artifact-upload-change">이미지 변경</span>
                </>
              ) : (
                <span className="artifact-upload-empty">
                  <b>＋</b>
                  <strong>대표 이미지 선택</strong>
                  <small>PNG · JPG / 최대 100MB</small>
                </span>
              )}
            </label>
            <input
              id="artifact-image"
              type="file"
              accept="image/png,image/jpeg"
              hidden
              onChange={handleImageChange}
            />

            {imageFile && (
              <div className="artifact-file-meta">
                <span>{imageFile.name}</span>
                <small>{(imageFile.size / 1024 / 1024).toFixed(1)} MB</small>
              </div>
            )}
            {imageError && <p className="artifact-field-error">{imageError}</p>}

            <div className="artifact-upload-flow">
              <span>업로드 방식</span>
              <p>
                {localStorageMode
                  ? "대표 이미지를 압축된 Blob으로 변환해 IndexedDB에 저장합니다. S3 연동 전 임시 방식이며 브라우저 데이터 삭제 시 함께 사라집니다."
                  : "유물 정보 저장 후 대표 이미지를 서버에 전송하며, 서버가 S3 저장을 처리합니다."}
              </p>
            </div>
          </section>

          <section className="artifact-info-panel">
            <div className="artifact-panel-heading">
              <span>02</span>
              <div>
                <h2>유물 기본 정보</h2>
                <p>확인 가능한 정보를 기준으로 입력해주세요.</p>
              </div>
            </div>

            <div className="artifact-form-grid">
              <label className="artifact-field artifact-field-wide">
                <span>
                  유물명 <em>필수</em>
                </span>
                <input
                  type="text"
                  placeholder="예) 청동 숟가락 파편"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label className="artifact-field">
                <span>
                  재질 <em>필수</em>
                </span>
                <select
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                >
                  <option value="">재질 선택</option>
                  <option>연질토기</option>
                  <option>경질토기</option>
                  <option>도자기 · 백자</option>
                  <option>청동</option>
                  <option>철</option>
                  <option>석재</option>
                  <option>목재</option>
                  <option>지류</option>
                  <option>직물</option>
                </select>
                {visualMaterialSupport === "unsupported" && (
                  <p className="artifact-material-guide unsupported">
                    이 재질은{" "}
                    <span className="artifact-material-guide-keyword">
                      문양 기반 육안조사 AI
                    </span>
                    를 지원하지 않습니다.
                  </p>
                )}
              </label>

              <label className="artifact-field">
                <span>
                  시대 <em>필수</em>
                </span>
                <select
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                >
                  <option value="">시대 선택</option>
                  <option>선사시대</option>
                  <option>삼국시대</option>
                  <option>통일신라시대</option>
                  <option>고려시대</option>
                  <option>조선시대</option>
                  <option>근현대</option>
                  <option>시대 미상</option>
                </select>
              </label>

              <label className="artifact-field artifact-field-wide">
                <span>현재 상태</span>
                <textarea
                  rows="4"
                  placeholder="예) 다수 파편으로 분리되어 있으며 표면 부식이 확인됨"
                  value={condition}
                  onChange={(event) => setCondition(event.target.value)}
                />
              </label>

              <label className="artifact-field">
                <span>무게</span>
                <span className="artifact-weight-field">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="예) 3.2"
                    value={weightValue}
                    onChange={(event) => setWeightValue(event.target.value)}
                  />
                  <select
                    value={weightUnit}
                    onChange={(event) => setWeightUnit(event.target.value)}
                    aria-label="무게 단위"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                  </select>
                </span>
              </label>

              <label className="artifact-field">
                <span>접합 부위</span>
                <select
                  value={bondingArea}
                  onChange={(event) => setBondingArea(event.target.value)}
                >
                  <option value="">선택 안 함</option>
                  <option>충분함</option>
                  <option>보통</option>
                  <option>부족함</option>
                </select>
              </label>

              <label className="artifact-field artifact-field-wide">
                <span>처리 목적</span>
                <select
                  value={treatmentPurpose}
                  onChange={(event) => setTreatmentPurpose(event.target.value)}
                >
                  <option value="">선택 안 함</option>
                  <option>전시용</option>
                  <option>보관용</option>
                  <option>연구용</option>
                  <option>복원 처리용</option>
                </select>
              </label>
            </div>

            {submitError && (
              <div className="artifact-submit-error">{submitError}</div>
            )}

            <div className="artifact-form-actions">
              <button
                type="button"
                className="artifact-cancel"
                onClick={() => navigate(-1)}
                disabled={submitting}
              >
                취소
              </button>
              <button
                type="submit"
                className="artifact-submit"
                disabled={submitting}
              >
                {submitting
                  ? "저장 중..."
                  : editMode
                    ? "변경 내용 저장"
                    : `${moduleMeta.shortTitle} 시작 →`}
              </button>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}

export default ArtifactRegisterPage;