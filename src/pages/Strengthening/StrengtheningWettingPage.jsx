import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSafeAsyncNavigate } from "../../hooks/useSafeAsyncNavigate";

import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { refreshPhotoUrl, uploadPhotoAsset } from "../../services/photoUploadApi";
import { applyInterrupt } from "../../utils/applyInterrupt";
import { useGuideStepLock } from "../../hooks/useGuideStepLock";

import GuideNavigation from "../../components/guide/GuideNavigation";
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
  const { captureAsyncNavigationOrigin, navigateIfStillHere } = useSafeAsyncNavigate();
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);

  const ctx = useDisassembly();
  const {
    taskId,
    colorChangeAnalysis,
    strengtheningWettingPhotos,
    setStrengtheningWettingPhotos,
    setCompleted,
    setStepSaving,
  } = ctx;

  const { isCompleted, isSaving, isLocked } = useGuideStepLock("strengtheningWetting");

  const beforePhoto = strengtheningWettingPhotos?.before || "";
  const afterPhoto = strengtheningWettingPhotos?.after || "";
  const beforePhotoKey = strengtheningWettingPhotos?.beforeKey || "";
  const afterPhotoKey = strengtheningWettingPhotos?.afterKey || "";
  const [beforeUploading, setBeforeUploading] = useState(false);
  const [afterUploading, setAfterUploading] = useState(false);
  const [openMetric, setOpenMetric] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [photosDirty, setPhotosDirty] = useState(false);

  // 보존가이드 사진 URL은 1시간짜리 presigned URL이다. 분석 시 함께 저장한
  // S3 key가 있으면 페이지 재진입 때 새 URL을 발급해 같은 입력 사진을 복원한다.
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
        setStrengtheningWettingPhotos((current) => ({
          ...(current || {}),
          before: freshBefore || current?.before || "",
          after: freshAfter || current?.after || "",
        }));
      } catch (error) {
        // URL 갱신 실패만으로 결과 화면을 막지는 않는다. 구버전 task의 기존 URL을
        // 유지하고, 새 task는 key를 통해 다음 진입 때 다시 갱신할 수 있다.
        console.error("습윤 효과 테스트 사진 URL 갱신 실패", error);
      }
    }

    refreshStoredPhotos();
    return () => {
      cancelled = true;
    };
  }, [artifactId, beforePhotoKey, afterPhotoKey, setStrengtheningWettingPhotos]);

  // 사진 교체 자체는 S3 업로드/FE 상태만 변경한다. 사용자가 실제로
  // "재분석"을 누르기 전에는 LangGraph checkpoint를 움직이지 않는다.
  const photoInputsLocked = isLocked || analyzing;

  const handleBeforeFileChange = async (e) => {
    if (isLocked) return;
    const file = e.target.files[0];
    if (!file) return;

    setBeforeUploading(true);
    try {
      const asset = await uploadPhotoAsset(file, artifactId);
      setStrengtheningWettingPhotos((current) => ({
        ...(current || {}),
        before: asset.url,
        beforeKey: asset.key,
      }));
      if (colorChangeAnalysis) setPhotosDirty(true);
    } catch (error) {
      console.error(error);
      alert("테스트 전 사진 업로드 실패");
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
      setStrengtheningWettingPhotos((current) => ({
        ...(current || {}),
        after: asset.url,
        afterKey: asset.key,
      }));
      if (colorChangeAnalysis) setPhotosDirty(true);
    } catch (error) {
      console.error(error);
      alert("테스트 후 사진 업로드 실패");
    } finally {
      setAfterUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (isLocked) return;
    if (!beforePhoto || !afterPhoto) {
      alert("습윤 테스트 전/후 사진을 입력해주세요.");
      return;
    }

    setAnalyzing(true);

    try {
      // 오래 열린 페이지에서도 만료된 presigned URL을 VLM에 넘기지 않도록
      // key가 있는 사진은 분석 직전에 한 번 더 URL을 갱신한다.
      const [analysisBeforePhoto, analysisAfterPhoto] = await Promise.all([
        beforePhotoKey ? refreshPhotoUrl(artifactId, beforePhotoKey) : beforePhoto,
        afterPhotoKey ? refreshPhotoUrl(artifactId, afterPhotoKey) : afterPhoto,
      ]);

      setStrengtheningWettingPhotos((current) => ({
        ...(current || {}),
        before: analysisBeforePhoto || current?.before || "",
        after: analysisAfterPhoto || current?.after || "",
      }));

      // 결과 확인 interrupt에 있는 상태에서 사진이 바뀐 경우에만,
      // 사용자가 재분석을 명시적으로 누른 이 시점에 checkpoint를 사진 입력
      // 단계로 되돌린다. 파일 선택/업로드만으로는 resume하지 않는다.
      if (colorChangeAnalysis && photosDirty) {
        await resumeTask(taskId, {
          resume: { action: "retry_photo" },
        });
      }

      const response = await resumeTask(taskId, {
        resume: {
          before_photo_urls: [analysisBeforePhoto],
          after_photo_urls: [analysisAfterPhoto],
          before_photo_keys: beforePhotoKey ? [beforePhotoKey] : [],
          after_photo_keys: afterPhotoKey ? [afterPhotoKey] : [],
        },
      });

      setPhotosDirty(false);
      applyInterrupt(response.interrupt, ctx);
    } catch (error) {
      console.error(error);
      alert(colorChangeAnalysis ? "습윤 테스트 재분석 실패" : "습윤 테스트 사진 저장 실패");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleProceed = async () => {
    if (isLocked) return;
    const pathAtRequest = captureAsyncNavigationOrigin();

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

      navigateIfStillHere(pathAtRequest, "/strengthening");
    } catch (error) {
        console.error(error);
        alert("습윤 테스트 결과 저장 실패");
    } finally {
        setStepSaving("strengtheningWetting", false);
    }
  };

  return (
    <div className="strengthening-wetting-page">
      <GuideNavigation currentLabel="습윤 효과 테스트" />

      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/strengthening")}>
          ← 이전
        </button>
        <div className="nav-btn-group">
          {(!colorChangeAnalysis || photosDirty) && (
            <button
              className="nav-btn"
              disabled={analyzing || beforeUploading || afterUploading || isLocked || !beforePhoto || !afterPhoto}
              onClick={handleAnalyze}
            >
              {analyzing ? "분석 중..." : colorChangeAnalysis ? "재분석" : "분석"}
            </button>
          )}

          <button
            className="nav-btn"
            disabled={!colorChangeAnalysis || photosDirty || analyzing || beforeUploading || afterUploading || isLocked}
            onClick={handleProceed}
          >
            {isSaving ? "완료 처리 중..." : isCompleted ? "완료됨" : "다음 →"}
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
              beforeUploading || photoInputsLocked ? "is-disabled" : ""
            } ${beforePhoto ? "has-photo" : ""}`}
          >
            <h2>처리 전</h2>

            <input
              className="photo-file-input"
              type="file"
              accept="image/*"
              aria-label="처리 전 사진 선택"
              disabled={photoInputsLocked || beforeUploading}
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
                    {colorChangeAnalysis
                      ? "다른 사진으로 바꾸면 재분석할 수 있습니다."
                      : "다른 사진으로 바꾸려면 상자 안을 클릭하세요."}
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
              afterUploading || photoInputsLocked ? "is-disabled" : ""
            } ${afterPhoto ? "has-photo" : ""}`}
          >
            <h2>처리 후</h2>

            <input
              className="photo-file-input"
              type="file"
              accept="image/*"
              aria-label="처리 후 사진 선택"
              disabled={photoInputsLocked || afterUploading}
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
                    {colorChangeAnalysis
                      ? "다른 사진으로 바꾸면 재분석할 수 있습니다."
                      : "다른 사진으로 바꾸려면 상자 안을 클릭하세요."}
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
              {photosDirty && (
                <p className="recommendation">
                  ⚠ 사진이 변경되었습니다. 새 사진 기준으로 재분석해주세요.
                </p>
              )}
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
