import GuideNavigation from "../../components/guide/GuideNavigation";
import "./StrengtheningPage.css";

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";
import {
  getNextStep,
  getPreviousStep,
  moveToNextStep,
  moveToPreviousStep,
} from "../../utils/flowNavigation";

function StrengtheningPage() {
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
  const approvedFlow =
    location.state?.approvedFlow ||
    savedApprovedFlow || [
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
    completed.strengtheningMaterial &&
    completed.strengtheningWetting &&
    completed.strengtheningMethod;

  const handleAddPhoto = () => {
    if (!photoUrl.trim()) return;
    setPhotos((prev) => [...prev, photoUrl.trim()]);
    setPhotoUrl("");
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // 강화 종료 인터럽트는 photo_urls/memo resume이 와야만 풀리기 때문에,
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

      // 접합이 flow에 없으면 그 다음 활성 단계의 interrupt가 바로 실려온다
      applyInterrupt(response.interrupt, ctx);

      setCompleted((prev) => ({
        ...prev,
        strengtheningPost: true,
      }));
      ctx.setPostRecord("strengthening", { memo, photos });

      return true;
    } catch (error) {
      console.error(error);
      alert("강화 처리 작업 후 기록 저장 실패");
      return false;
    }
  };

  const handleNextStep = async () => {
    setMovingNext(true);

    try {
      if (!completed.strengtheningPost) {
        const saved = await handleSavePost();
        if (!saved) return;
      }

      await moveToNextStep(navigate, approvedFlow, "강화");
    } catch (error) {
      console.error(error);
      alert(`복원 가이드 완료 처리 실패: ${error.message}`);
    } finally {
      setMovingNext(false);
    }
  };

  return (
    <div className="strengthening-page">
      <GuideNavigation currentLabel="강화" />


      <div className="top-bar">


        <button
          className={`nav-btn${
            getPreviousStep(approvedFlow, "강화") ? "" : " invisible"
          }`}
          onClick={() =>
            moveToPreviousStep(
              navigate,
              approvedFlow,
              "강화"
            )
          }
        >
          ← 이전
        </button>
        <button
          className="nav-btn"
          disabled={!allCompleted || movingNext}
          onClick={handleNextStep}
        >
          {getNextStep(approvedFlow, "강화")
            ? "다음 단계 →"
            : "가이드 완료 →"}
        </button>


      </div>

      <div className="page-layout">
        <ProgressNavigator
          approvedFlow={approvedFlow}
          currentStep="강화"
        />

        <div className="page-main">
          <div className="content-columns">
            <div className="strengthening-container">

              {/* 1. 강화제 선택 */}

              <div
                className="task-card"
                onClick={() => navigate("/strengthening-material")}
              >

                <div className="task-icon">
                  {savingSteps.has("strengtheningMaterial") ? (
                    <span className="task-icon-spinner" />
                  ) : completed.strengtheningMaterial ? (
                    "✔"
                  ) : (
                    "①"
                  )}
                </div>


                <div className="task-content">

                  <h2>강화제 선택</h2>

                  <p>
                    AI가 유물의 재질과 손상 상태를 분석하여
                    적합한 강화제와 용매를 추천합니다.
                  </p>

                </div>


                <div className="task-arrow">
                  →
                </div>

              </div>




              {/* 2. 습윤 테스트 */}

              <div
                className={`task-card${
                  !completed.strengtheningMaterial ? " locked" : ""
                }`}
                onClick={() => {
                  if (!completed.strengtheningMaterial) return;
                  navigate("/strengthening-wetting");
                }}
              >

                <div className="task-icon">
                  {savingSteps.has("strengtheningWetting") ? (
                    <span className="task-icon-spinner" />
                  ) : completed.strengtheningWetting ? (
                    "✔"
                  ) : (
                    "②"
                  )}
                </div>


                <div className="task-content">

                  <h2>습윤 효과 테스트</h2>

                  <p>
                    강화제 적용 전후 사진을 비교하여 색 변화 여부를 분석하고,
                    결과를 확인해 강화 처리 진행 여부를 결정합니다.
                  </p>

                </div>


                <div className="task-arrow">
                  →
                </div>


              </div>





              {/* 3. 단계별 강화 작업 */}

              <div
                className={`task-card${
                  !completed.strengtheningWetting ? " locked" : ""
                }`}
                onClick={() => {
                  if (!completed.strengtheningWetting) return;
                  navigate("/strengthening-method");
                }}
              >

                <div className="task-icon">
                  {savingSteps.has("strengtheningMethod") ? (
                    <span className="task-icon-spinner" />
                  ) : completed.strengtheningMethod ? (
                    "✔"
                  ) : (
                    "③"
                  )}
                </div>


                <div className="task-content">

                  <h2>강화</h2>

                  <p>
                    AI가 추천한 강화 처리 절차를 확인하고
                    단계별 작업을 수행합니다.
                  </p>

                </div>


                <div className="task-arrow">
                  →
                </div>

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
                placeholder="강화 처리 작업 내용을 입력해주세요."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />

              <button className="post-record-save-btn" onClick={handleSavePost}>
                {completed.strengtheningPost ? "✔ 저장됨" : "기록 저장"}
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


export default StrengtheningPage;
