import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSafeAsyncNavigate } from "../../hooks/useSafeAsyncNavigate";

import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { refreshPhotoUrl, uploadPhotoAsset } from "../../services/photoUploadApi";
import { applyInterrupt } from "../../utils/applyInterrupt";
import { useGuideStepLock } from "../../hooks/useGuideStepLock";

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
  const { captureAsyncNavigationOrigin, navigateIfStillHere } = useSafeAsyncNavigate();
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);

  const ctx = useDisassembly();
  const {
    taskId,
    bondingTempAnalysis,
    setBondingTempAnalysis,
    bondingTempPhotos,
    setBondingTempPhotos,
    setCompleted,
    setStepSaving,
  } = ctx;

  const { isCompleted, isSaving, isLocked } = useGuideStepLock("bondingWork");

  const beforePhoto = bondingTempPhotos?.before || "";
  const afterPhoto = bondingTempPhotos?.after || "";
  const beforePhotoKey = bondingTempPhotos?.beforeKey || "";
  const afterPhotoKey = bondingTempPhotos?.afterKey || "";
  const [beforeUploading, setBeforeUploading] = useState(false);
  const [afterUploading, setAfterUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [photosDirty, setPhotosDirty] = useState(false);

  // 보존가이드 사진 URL은 presigned URL이라 만료될 수 있다. LangGraph/Task에
  // 함께 저장한 S3 key가 있으면 페이지 진입 때마다 새 URL을 발급해 미리보기를
  // 복원한다. key가 없는 구버전 task는 기존 URL을 그대로 사용한다.
  useEffect(() => {
    if (!artifactId || (!beforePhotoKey && !afterPhotoKey)) return undefined;

    let cancelled = false;

    async function refreshStoredPhotos() {
      try {
        const [freshBefore, freshAfter] = await Promise.all([
          beforePhotoKey
            ? refreshPhotoUrl(artifactId, beforePhotoKey)
            : Promise.resolve(""),
          afterPhotoKey
            ? refreshPhotoUrl(artifactId, afterPhotoKey)
            : Promise.resolve(""),
        ]);

        if (cancelled) return;
        setBondingTempPhotos((current) => ({
          ...(current || {}),
          before: freshBefore || current?.before || "",
          after: freshAfter || current?.after || "",
        }));
      } catch (error) {
        // URL 갱신 실패가 전체 단계 진입을 막으면 안 된다. 기존 URL을 유지하고
        // 사용자가 필요하면 사진을 다시 업로드할 수 있게 둔다.
        console.error("임시접합 사진 URL 갱신 실패", error);
      }
    }

    refreshStoredPhotos();
    return () => {
      cancelled = true;
    };
  }, [artifactId, beforePhotoKey, afterPhotoKey, setBondingTempPhotos]);

  // 분석 결과에 따라 백엔드가 proceed/retry를 기본 권고한다. 최종 진행 여부는
  // 작업자가 직접 결정하므로 두 버튼은 모두 유지한다.
  const defaultAction = bondingTempAnalysis?.default_action || "proceed";

  // 파일 선택/업로드 자체는 workflow 상태를 변경하지 않는다. 결과 화면에서
  // 사진을 바꾸면 FE에 dirty 상태만 남기고, 실제 LangGraph retry는 사용자가
  // "재분석" 또는 "다시 촬영"을 명시적으로 실행했을 때만 수행한다.

  const handleBeforeFileChange = async (e) => {
    if (isLocked) return;
    const file = e.target.files[0];
    if (!file) return;

    setBeforeUploading(true);
    try {
      const asset = await uploadPhotoAsset(file, artifactId);
      setBondingTempPhotos((current) => ({
        ...(current || {}),
        before: asset.url,
        beforeKey: asset.key,
      }));
      if (bondingTempAnalysis) setPhotosDirty(true);
    } catch (error) {
      console.error(error);
      alert("임시접합 전 사진 업로드 실패");
    } finally {
      setBeforeUploading(false);
    }
  };

  const handleAfterFileChange = async (e) => {
    if (isLocked) return;
    const file = e.target.files[0];
    if (!file) return;

    setAfterUploading(true);
    try {
      const asset = await uploadPhotoAsset(file, artifactId);
      setBondingTempPhotos((current) => ({
        ...(current || {}),
        after: asset.url,
        afterKey: asset.key,
      }));
      if (bondingTempAnalysis) setPhotosDirty(true);
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
    if (isLocked) return;
    if (!beforePhoto || !afterPhoto) {
      alert("임시접합 전/후 사진을 입력해주세요.");
      return;
    }

    setAnalyzing(true);
    try {
      const [analysisBeforePhoto, analysisAfterPhoto] = await Promise.all([
        beforePhotoKey ? refreshPhotoUrl(artifactId, beforePhotoKey) : beforePhoto,
        afterPhotoKey ? refreshPhotoUrl(artifactId, afterPhotoKey) : afterPhoto,
      ]);

      setBondingTempPhotos((current) => ({
        ...(current || {}),
        before: analysisBeforePhoto || current?.before || "",
        after: analysisAfterPhoto || current?.after || "",
      }));

      // 기존 검증 결과를 본 뒤 사진을 교체한 경우에만 이 시점에서 retry한다.
      // 사진 업로드만으로는 checkpoint가 변하지 않는다.
      if (bondingTempAnalysis && photosDirty) {
        await resumeTask(taskId, {
          resume: { action: "retry" },
        });
      }

      const response = await resumeTask(taskId, {
        resume: {
          before_photo_urls: [analysisBeforePhoto],
          after_photo_urls: [analysisAfterPhoto],
          before_photo_keys: beforePhotoKey ? [beforePhotoKey] : [],
          after_photo_keys: afterPhotoKey ? [afterPhotoKey] : [],
        },
      }, {
        mockStage: "bonding-temp",
      });

      setPhotosDirty(false);
      applyInterrupt(response.interrupt, ctx);
    } catch (error) {
      console.error(error);
      alert(bondingTempAnalysis ? "임시접합 재분석 실패" : "임시접합 사진 저장 실패");
    } finally {
      setAnalyzing(false);
    }
  };

  // 검증 결과가 마음에 들지 않으면 사진을 다시 올려 재검증한다.
  const handleRetry = async () => {
    if (isLocked) return;
    setAnalyzing(true);
    try {
      const response = await resumeTask(taskId, {
        resume: { action: "retry" },
      });

      // 기존 사진은 지우지 않는다. 결과가 부적합해도 작업자는 어떤 사진으로
      // 검증했는지 확인한 상태에서 필요한 한쪽만 교체할 수 있어야 한다.
      setBondingTempAnalysis(null);
      setPhotosDirty(false);
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
    if (isLocked) return;
    const pathAtRequest = captureAsyncNavigationOrigin();

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

      navigateIfStillHere(pathAtRequest, "/bonding");
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
          {(!bondingTempAnalysis || photosDirty) && (
            <button
              className="nav-btn"
              disabled={analyzing || beforeUploading || afterUploading || isLocked || !beforePhoto || !afterPhoto}
              onClick={handleAnalyze}
            >
              {analyzing ? "분석 중..." : bondingTempAnalysis ? "재분석" : "분석"}
            </button>
          )}

          {bondingTempAnalysis && !photosDirty && (
            <button
              className={`nav-btn ${defaultAction === "retry" ? "" : "secondary"}`}
              disabled={analyzing || isLocked}
              onClick={handleRetry}
            >
              다시 촬영
            </button>
          )}

          <button
            className={`nav-btn ${defaultAction === "retry" ? "secondary" : ""}`}
            disabled={!bondingTempAnalysis || photosDirty || analyzing || isLocked}
            onClick={handleProceed}
          >
            {isSaving ? "완료 처리 중..." : isCompleted ? "완료됨" : "다음 →"}
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
              beforeUploading ? "is-disabled" : ""
            } ${beforePhoto ? "has-photo" : ""}`}
          >
            <h2>임시접합 전</h2>

            <input
              className="photo-file-input"
              type="file"
              accept="image/*"
              aria-label="임시접합 전 사진 선택"
              disabled={isLocked || beforeUploading || analyzing}
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
              afterUploading ? "is-disabled" : ""
            } ${afterPhoto ? "has-photo" : ""}`}
          >
            <h2>임시접합 후</h2>

            <input
              className="photo-file-input"
              type="file"
              accept="image/*"
              aria-label="임시접합 후 사진 선택"
              disabled={isLocked || afterUploading || analyzing}
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
            {photosDirty && (
              <p className="temp-analysis-warning">
                사진이 변경되었습니다. 새 사진 기준으로 재분석해주세요.
              </p>
            )}
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
