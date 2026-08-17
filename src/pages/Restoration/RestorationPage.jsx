import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import GuideNavigation from "../../components/guide/GuideNavigation";
import "./RestorationPage.css";

import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import {
  getPreviousStep,
  moveToNextStep,
  moveToPreviousStep,
} from "../../utils/flowNavigation";

import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

function RestorationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const ctx = useDisassembly();
  const {
    taskId,
    completed,
    setCompleted,
    savingSteps,
    approvedFlow: savedApprovedFlow,
    setApprovedFlow,
  } = ctx;

  const [photos, setPhotos] = useState([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [movingNext, setMovingNext] = useState(false);

  // location.state는 하위 단계 페이지를 오가며 유실될 수 있어,
  // context에 저장해둔 값을 우선 쓰고 없을 때만 기본 플로우로 대체한다.
  const approvedFlow = location.state?.approvedFlow || savedApprovedFlow || [
    { id: 2, name: "해체" },
    { id: 3, name: "세척" },
    { id: 4, name: "강화" },
    { id: 5, name: "접합" },
    { id: 6, name: "복원" },
  ];

  useEffect(() => {
    if (location.state?.approvedFlow) {
      setApprovedFlow(location.state.approvedFlow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // 작업 후 기록은 사용자 선택 사항이라 완료 조건에서 제외
  const allCompleted =
    completed.restorationMaterial &&
    completed.restorationMethod &&
    completed.restorationFinishing;

  const handleAddPhoto = () => {
    if (!photoUrl.trim()) return;
    setPhotos((prev) => [...prev, photoUrl.trim()]);
    setPhotoUrl("");
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // 복원 종료 인터럽트는 photo_urls/memo resume이 와야만 풀리기 때문에,
  // 아무것도 안 채워도 "다음 단계"를 누르는 시점엔 반드시 한 번은 resume을 보내야 한다.
  const handleSavePost = async () => {
    if (!taskId) {
      alert("taskId가 없습니다.");
      return false;
    }

    try {
      const response = await resumeTask(taskId, {
        resume: {
          memo,
          photo_urls: photos,
        },
      });

      applyInterrupt(response.interrupt, ctx);

      setCompleted((prev) => ({
        ...prev,
        restorationPost: true,
      }));
      ctx.setPostRecord("restoration", { memo, photos });

      return true;
    } catch (error) {
      console.error(error);
      alert("복원 작업 후 기록 저장 실패");
      return false;
    }
  };

  const handleNextStep = async () => {
    setMovingNext(true);

    try {
      if (!completed.restorationPost) {
        const saved = await handleSavePost();
        if (!saved) return;
      }

      await moveToNextStep(navigate, approvedFlow, "복원");
    } catch (error) {
      console.error(error);
      alert(`복원 가이드 완료 처리 실패: ${error.message}`);
    } finally {
      setMovingNext(false);
    }
  };

  return (
    <div className="restoration-page">
      <GuideNavigation currentLabel="복원" />

      <div className="top-bar">
        <button
          className={`nav-btn${
            getPreviousStep(approvedFlow, "복원") ? "" : " invisible"
          }`}
          onClick={() => moveToPreviousStep(navigate, approvedFlow, "복원")}
        >
          ← 이전
        </button>
        <button
          className="nav-btn"
          disabled={!allCompleted || movingNext}
          onClick={handleNextStep}
        >
          가이드 완료 →
        </button>
      </div>

      <div className="page-layout">
        <ProgressNavigator approvedFlow={approvedFlow} currentStep="복원" />

        <div className="page-main">
          <div className="content-columns">
            <div className="restoration-container">
              {/* ① 복원 재료 선택 */}
              <div
                className="task-card"
                onClick={() => navigate("/restoration-material")}
              >
                <div className="task-icon">
                  {savingSteps.has("restorationMaterial") ? (
                    <span className="task-icon-spinner" />
                  ) : completed.restorationMaterial ? (
                    "✔"
                  ) : (
                    "①"
                  )}
                </div>

                <div className="task-content">
                  <h2>복원제 선택</h2>

                  <p>AI가 추천한 복원 재료를 확인하고 적합한 재료를 선택합니다.</p>
                </div>

                <div className="task-arrow">→</div>
              </div>

              {/* ② 단계별 복원 작업 */}
              <div
                className={`task-card${
                  !completed.restorationMaterial ? " locked" : ""
                }`}
                onClick={() => {
                  if (!completed.restorationMaterial) return;
                  navigate("/restoration-method");
                }}
              >
                <div className="task-icon">
                  {savingSteps.has("restorationMethod") ? (
                    <span className="task-icon-spinner" />
                  ) : completed.restorationMethod ? (
                    "✔"
                  ) : (
                    "②"
                  )}
                </div>

                <div className="task-content">
                  <h2>복원</h2>

                  <p>AI가 추천한 복원 절차를 확인하고 단계별 작업을 수행합니다.</p>
                </div>

                <div className="task-arrow">→</div>
              </div>

              {/* ③ 마감처리 */}
              <div
                className={`task-card${
                  !completed.restorationMethod ? " locked" : ""
                }`}
                onClick={() => {
                  if (!completed.restorationMethod) return;
                  navigate("/restoration-finishing");
                }}
              >
                <div className="task-icon">
                  {savingSteps.has("restorationFinishing") ? (
                    <span className="task-icon-spinner" />
                  ) : completed.restorationFinishing ? (
                    "✔"
                  ) : (
                    "③"
                  )}
                </div>

                <div className="task-content">
                  <h2>마감처리</h2>

                  <p>AI가 추천한 연마·채색·광택 절차를 확인하고 단계별 작업을 수행합니다.</p>
                </div>

                <div className="task-arrow">→</div>
              </div>
            </div>

            {/* 작업 후 기록 (선택 사항, 별도 페이지 없이 바로 입력) */}
            <div className="post-record-card">
              <h3>작업 후 기록</h3>

              <div className="photo-url-row">
                <input
                  type="text"
                  className="photo-url-input"
                  placeholder="사진 URL을 입력하세요"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />

                <button className="photo-url-add-btn" onClick={handleAddPhoto}>
                  + 추가
                </button>
              </div>

              <div className="photo-url-list">
                {photos.map((url, index) => (
                  <div key={index} className="photo-url-chip">
                    <span>{url}</span>

                    <button onClick={() => handleRemovePhoto(index)}>✕</button>
                  </div>
                ))}
              </div>

              <textarea
                className="post-record-memo"
                placeholder="복원 작업 내용을 입력해주세요."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />

              <button className="post-record-save-btn" onClick={handleSavePost}>
                {completed.restorationPost ? "✔ 저장됨" : "기록 저장"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {movingNext && (
        <div className="analyzing-overlay">
          <div className="analyzing-box">
            <p>다음 단계로 이동 중...</p>

            <div className="analyzing-bar-track">
              <div className="analyzing-bar-fill" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RestorationPage;
