import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { uploadPhoto } from "../../services/photoUploadApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

import GuideNavigation from "../../components/guide/GuideNavigation";
import "./BondingWorkPage.css";

// 업로드 박스용 아이콘. 새 패키지 의존성 없이 인라인 SVG로 둔다.
// (습윤 효과 테스트 페이지와 동일한 아이콘)
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

const ALIGNMENT_METRICS = [
  ["axis_alignment", "축 정렬"],
  ["fracture_match_quality", "파단면 매칭"],
];

const ALIGNMENT_LABELS = {
  good: "양호",
  minor_issue: "경미한 문제",
  major_issue: "심각한 문제",
  unclear: "판단 불가",
};

const SEVERITY_LABELS = {
  mild: "경미",
  moderate: "보통",
  severe: "심함",
};

function BondingWorkPage() {
  const navigate = useNavigate();
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);

  const ctx = useDisassembly();
  const {
    taskId,
    bondingTempAnalysis,
    setBondingTempAnalysis,
    setCompleted,
    setStepSaving,
    savingSteps,
  } = ctx;

  const isSaving = savingSteps.has("bondingWork");

  const [beforePhoto, setBeforePhoto] = useState("");
  const [afterPhoto, setAfterPhoto] = useState("");
  const [beforeUploading, setBeforeUploading] = useState(false);
  const [afterUploading, setAfterUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // 백엔드가 추천하는 기본 선택값. 항상 "proceed"로 오지만, 실제 진행 여부는
  // 아래 severity/recommendation을 보고 작업자가 최종 판단한다 — 자동 진행 아님.
  const defaultAction = bondingTempAnalysis?.default_action || "proceed";

  const handleBeforeFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBeforeUploading(true);
    try {
      const url = await uploadPhoto(file, artifactId);
      setBeforePhoto(url);
    } catch (error) {
      console.error(error);
      alert("임시접합 전 사진 업로드 실패");
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
      alert("임시접합 후 사진 업로드 실패");
    } finally {
      setAfterUploading(false);
    }
  };

  // 사진을 넣어 임시접합 검증(VLM) 결과를 받는다. 여기서는 완료 처리하지 않고,
  // 결과를 보고 사용자가 진행/재입력을 선택해야 한다.
  const handleAnalyze = async () => {
    if (!beforePhoto || !afterPhoto) {
      alert("임시접합 전/후 사진을 입력해주세요.");
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
      const response = await resumeTask(taskId, request, {
        mockStage: "bonding-temp",
      });
      applyInterrupt(response.interrupt, ctx);
    } catch (error) {
      console.error(error);
      alert("임시접합 사진 저장 실패");
    } finally {
      setAnalyzing(false);
    }
  };

  // 검증 결과가 마음에 들지 않으면 사진을 다시 올려 재검증한다.
  const handleRetry = async () => {
    setAnalyzing(true);
    try {
      const response = await resumeTask(taskId, {
        resume: { action: "retry" },
      });

      setBondingTempAnalysis(null);
      setBeforePhoto("");
      setAfterPhoto("");
      applyInterrupt(response.interrupt, ctx);
    } catch (error) {
      console.error(error);
      alert("재입력 요청 실패");
    } finally {
      setAnalyzing(false);
    }
  };

  // 검증 결과를 그대로 승인하고 다음(접합 방법 안내)으로 진행한다.
  const handleProceed = async () => {
    if (isSaving) return;
    setStepSaving("bondingWork", true);

    try {
        const response = await resumeTask(taskId, {
          resume: { action: "proceed" },
        });

        applyInterrupt(response.interrupt, ctx);

        setCompleted((prev) => ({
          ...prev,
          bondingWork: true,
        }));

      navigate("/bonding");
    } catch (error) {
        console.error(error);
        alert("임시접합 검증 결과 저장 실패");
    } finally {
        setStepSaving("bondingWork", false);
    }
  };

  return (
    <div className="bonding-work-page">
      <GuideNavigation currentLabel="임시접합 검증" />

      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/bonding")}>
          ← 이전
        </button>
        <div className="nav-btn-group">
          {!bondingTempAnalysis && (
            <button
              className="nav-btn"
              disabled={analyzing}
              onClick={handleAnalyze}
            >
              {analyzing ? "분석 중..." : "분석"}
            </button>
          )}

          {bondingTempAnalysis && (
            <button
              className={`nav-btn ${defaultAction === "retry" ? "" : "secondary"}`}
              disabled={analyzing}
              onClick={handleRetry}
            >
              다시 촬영
            </button>
          )}

          <button
            className={`nav-btn ${defaultAction === "retry" ? "secondary" : ""}`}
            disabled={!bondingTempAnalysis || isSaving}
            onClick={handleProceed}
          >
            {isSaving ? "완료 처리 중..." : "다음 →"}
          </button>
        </div>
      </div>

      <div className="method-container">
        <div className="page-header">
          <h1>임시접합 검증</h1>
        </div>

        <div className="photo-row">
          <div
            className={`info-card photo-upload-zone ${
              bondingTempAnalysis || beforeUploading ? "is-disabled" : ""
            } ${beforePhoto ? "has-photo" : ""}`}
          >
            <h2>임시접합 전</h2>

            <input
              className="photo-file-input"
              type="file"
              accept="image/*"
              aria-label="임시접합 전 사진 선택"
              disabled={!!bondingTempAnalysis || beforeUploading}
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
                    <img src={beforePhoto} alt="임시접합 전" />
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
              bondingTempAnalysis || afterUploading ? "is-disabled" : ""
            } ${afterPhoto ? "has-photo" : ""}`}
          >
            <h2>임시접합 후</h2>

            <input
              className="photo-file-input"
              type="file"
              accept="image/*"
              aria-label="임시접합 후 사진 선택"
              disabled={!!bondingTempAnalysis || afterUploading}
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
                    <img src={afterPhoto} alt="임시접합 후" />
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

        {bondingTempAnalysis && (
          <div className="info-card temp-analysis-card">
            {!bondingTempAnalysis.is_analyzable && (
              <p className="temp-analysis-warning">
                사진으로 판단이 어렵습니다. 다시 촬영해주세요.
              </p>
            )}

            <div className="severity-legend">
              {Object.entries(ALIGNMENT_LABELS).map(([key, label]) => (
                <span key={key} className="severity-legend-item">
                  <span className={`severity-dot status-${key}`} />
                  {label}
                </span>
              ))}
            </div>

            <ul className="metric-list">
              {ALIGNMENT_METRICS.map(([key, label]) => {
                const value = bondingTempAnalysis[key];
                if (!value) return null;

                return (
                  <li key={key} className="metric-row">
                    <span className="metric-label">{label}</span>
                    <span className={`severity-dot status-${value}`} />
                  </li>
                );
              })}

              <li className="metric-row">
                <span className="metric-label">종합 심각도</span>
                <span className="temp-analysis-severity">
                  {SEVERITY_LABELS[bondingTempAnalysis.overall_severity] ||
                    bondingTempAnalysis.overall_severity}
                </span>
              </li>
            </ul>

            <p className="temp-analysis-description">
              {bondingTempAnalysis.description}
            </p>
            <p className="recommendation">
              ✔ {bondingTempAnalysis.recommendation}
            </p>
          </div>
        )}
      </div>

      {analyzing && (
        <div className="analyzing-overlay">
          <div className="analyzing-box">
            <p>임시접합 상태를 분석하고 있어요...</p>

            <div className="analyzing-bar-track">
              <div className="analyzing-bar-fill" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BondingWorkPage;
