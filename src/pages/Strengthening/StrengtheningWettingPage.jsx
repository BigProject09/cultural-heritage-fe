import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { uploadPhoto } from "../../services/photoUploadApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

import "./StrengtheningWettingPage.css";

// 업로드 박스용 아이콘. 새 패키지 의존성 없이 인라인 SVG로 둔다.
function UploadDropIcon() {
  return (
    <svg
      className="upload-dropzone-icon"
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 15.5V4M12 4 7.8 8.2M12 4l4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 15.5v2.3A2.2 2.2 0 0 0 7.2 20h9.6a2.2 2.2 0 0 0 2.2-2.2v-2.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ai_color_analysis에 담겨오는 9개 세부 항목 키 -> 한글 라벨 (표시 순서 고정)
const COLOR_ANALYSIS_METRICS = [
  ["hue_shift", "색조 변화"],
  ["brightness_change", "명도 변화"],
  ["saturation_change", "채도 변화"],
  ["gloss_change", "광택 변화"],
  ["blanching", "백화 현상"],
  ["uneven_penetration", "침투 불균일"],
  ["edge_visibility", "경계선 가시성"],
  ["crack_response", "균열 반응"],
  ["texture_change", "질감 변화"],
];

const SEVERITY_LABELS = {
  none: "없음",
  mild: "경미",
  moderate: "보통",
  severe: "심함",
};

function StrengtheningWettingPage() {
  const navigate = useNavigate();
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);

  const ctx = useDisassembly();
  const { taskId, colorChangeAnalysis, setCompleted, setStepSaving, savingSteps } = ctx;

  const isSaving = savingSteps.has("strengtheningWetting");

  const [beforePhoto, setBeforePhoto] = useState("");
  const [afterPhoto, setAfterPhoto] = useState("");
  const [beforeUploading, setBeforeUploading] = useState(false);
  const [afterUploading, setAfterUploading] = useState(false);
  const [openMetric, setOpenMetric] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleBeforeFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBeforeUploading(true);
    try {
      const url = await uploadPhoto(file, artifactId);
      setBeforePhoto(url);
    } catch (error) {
      console.error(error);
      alert("테스트 전 사진 업로드 실패");
    } finally {
      setBeforeUploading(false);
    }
  };

  const handleAfterFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAfterUploading(true);
    try {
      const url = await uploadPhoto(file, artifactId);
      setAfterPhoto(url);
    } catch (error) {
      console.error(error);
      alert("테스트 후 사진 업로드 실패");
    } finally {
      setAfterUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!beforePhoto || !afterPhoto) {
      alert("습윤 테스트 전/후 사진을 입력해주세요.");
      return;
    }

    const request = {
      resume: {
        before_photo_urls: [beforePhoto],
        after_photo_urls: [afterPhoto],
      },
    };

    setAnalyzing(true);

    try {
      const response = await resumeTask(taskId, request);

      applyInterrupt(response.interrupt, ctx);
    } catch (error) {
      console.error(error);
      alert("습윤 테스트 사진 저장 실패");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleProceed = async () => {
    if (isSaving) return;
    setStepSaving("strengtheningWetting", true);

    try {
        const response = await resumeTask(taskId, {
          resume: {
            action: "proceed",
          },
        });

        applyInterrupt(response.interrupt, ctx);

        setCompleted((prev) => ({
          ...prev,
          strengtheningWetting: true,
        }));

      navigate("/strengthening");
    } catch (error) {
        console.error(error);
        alert("습윤 테스트 결과 저장 실패");
    } finally {
        setStepSaving("strengtheningWetting", false);
    }
  };

  return (
    <div className="strengthening-wetting-page">
      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/strengthening")}>
          ← 이전
        </button>

        <h1 className="vora-logo">VORA</h1>

        <div className="nav-btn-group">
          {!colorChangeAnalysis && (
            <button
              className="nav-btn"
              disabled={analyzing}
              onClick={handleAnalyze}
            >
              {analyzing ? "분석 중..." : "분석"}
            </button>
          )}

          <button
            className="nav-btn"
            disabled={!colorChangeAnalysis || isSaving}
            onClick={handleProceed}
          >
            {isSaving ? "완료 처리 중..." : "다음 →"}
          </button>
        </div>
      </div>

      <div className="method-container">
        <div className="page-header">
          <h1>습윤 효과 테스트</h1>
        </div>

        <div className="photo-row">
          <div
            className={`info-card photo-upload-zone ${
              colorChangeAnalysis || beforeUploading ? "is-disabled" : ""
            } ${beforePhoto ? "has-photo" : ""}`}
          >
            <h2>처리 전</h2>

            <input
              className="photo-file-input"
              type="file"
              accept="image/*"
              aria-label="처리 전 사진 선택"
              disabled={!!colorChangeAnalysis || beforeUploading}
              onChange={handleBeforeFileChange}
            />

            <div className="upload-dropzone">
              {beforeUploading ? (
                <div className="upload-dropzone-status">
                  <p className="photo-upload-guide">
                    사진을 업로드하고 있어요...
                  </p>
                  <div className="upload-progress-track">
                    <div className="upload-progress-fill" />
                  </div>
                </div>
              ) : beforePhoto ? (
                <>
                  <div className="photo-preview">
                    <img src={beforePhoto} alt="처리 전" />
                  </div>
                  <p className="photo-upload-guide">
                    다른 사진으로 바꾸려면 상자 안을 클릭하세요.
                  </p>
                </>
              ) : (
                <div className="upload-dropzone-empty">
                  <UploadDropIcon />
                  <p className="upload-dropzone-title">사진을 업로드하세요</p>
                  <p className="upload-dropzone-hint">이미지 파일 (JPG, PNG 등)</p>
                </div>
              )}
            </div>
          </div>

          <div
            className={`info-card photo-upload-zone ${
              colorChangeAnalysis || afterUploading ? "is-disabled" : ""
            } ${afterPhoto ? "has-photo" : ""}`}
          >
            <h2>처리 후</h2>

            <input
              className="photo-file-input"
              type="file"
              accept="image/*"
              aria-label="처리 후 사진 선택"
              disabled={!!colorChangeAnalysis || afterUploading}
              onChange={handleAfterFileChange}
            />

            <div className="upload-dropzone">
              {afterUploading ? (
                <div className="upload-dropzone-status">
                  <p className="photo-upload-guide">
                    사진을 업로드하고 있어요...
                  </p>
                  <div className="upload-progress-track">
                    <div className="upload-progress-fill" />
                  </div>
                </div>
              ) : afterPhoto ? (
                <>
                  <div className="photo-preview">
                    <img src={afterPhoto} alt="처리 후" />
                  </div>
                  <p className="photo-upload-guide">
                    다른 사진으로 바꾸려면 상자 안을 클릭하세요.
                  </p>
                </>
              ) : (
                <div className="upload-dropzone-empty">
                  <UploadDropIcon />
                  <p className="upload-dropzone-title">사진을 업로드하세요</p>
                  <p className="upload-dropzone-hint">이미지 파일 (JPG, PNG 등)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {colorChangeAnalysis && (
          <div className="info-card color-result-card">
            <div className="result-box">
              <div className="severity-legend">
                {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
                  <span key={key} className="severity-legend-item">
                    <span className={`severity-dot severity-${key}`} />
                    {label}
                  </span>
                ))}
              </div>

              <ul className="metric-list">
                {COLOR_ANALYSIS_METRICS.map(([key, label]) => {
                  const metric = colorChangeAnalysis[key];
                  if (!metric) return null;

                  return (
                    <li key={key} className="metric-row">
                      <span className="metric-label">{label}</span>
                      <button
                        type="button"
                        className={`severity-dot severity-${metric.severity}`}
                        onClick={() =>
                          setOpenMetric((prev) => (prev === key ? null : key))
                        }
                        aria-label={`${label} 설명 보기`}
                      >
                        {openMetric === key && (
                          <span className="metric-tooltip">
                            {metric.description}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="recommendation">
                ✔ {colorChangeAnalysis.recommendation}
              </p>
            </div>
          </div>
        )}
      </div>

      {analyzing && (
        <div className="analyzing-overlay">
          <div className="analyzing-box">
            <p>색 변화를 분석하고 있어요...</p>

            <div className="analyzing-bar-track">
              <div className="analyzing-bar-fill" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StrengtheningWettingPage;
