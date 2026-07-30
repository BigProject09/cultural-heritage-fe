import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { uploadPhoto } from "../../services/photoUploadApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

import "./StrengtheningWettingPage.css";

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

  const ctx = useDisassembly();
  const {
    taskId,
    colorChangeAnalysis,
    setCompleted,
    setStepSaving,
  } = ctx;

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
      const url = await uploadPhoto(file);
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
      const url = await uploadPhoto(file);
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


  const handleProceed = () => {

    setStepSaving("strengtheningWetting", true);
    navigate("/strengthening");

    (async () => {
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

      } catch (error) {

        console.error(error);
        alert("습윤 테스트 결과 저장 실패");

      } finally {

        setStepSaving("strengtheningWetting", false);

      }
    })();

  };


  return (
    <div className="strengthening-wetting-page">


      <div className="detail-header">

        <button
          className="nav-btn"
          onClick={() => navigate("/strengthening")}
        >
          ← 이전
        </button>


        <h1 className="vora-logo">
          VORA
        </h1>

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
            disabled={!colorChangeAnalysis}
            onClick={handleProceed}
          >
            다음 →
          </button>

        </div>

      </div>



      <div className="method-container">


        <div className="page-header">

          <h1>
            습윤 효과 테스트
          </h1>

        </div>



        <div className="photo-row">

          <div className="info-card">


            <h2>
              처리 전
            </h2>


            <input
              type="file"
              accept="image/*"
              disabled={!!colorChangeAnalysis || beforeUploading}
              onChange={handleBeforeFileChange}
            />

            {beforeUploading && <p>업로드 중...</p>}

            {beforePhoto && (
              <div className="photo-preview">
                <img src={beforePhoto} alt="처리 전" />
              </div>
            )}


          </div>



          <div className="info-card">


            <h2>
              처리 후
            </h2>


            <input
              type="file"
              accept="image/*"
              disabled={!!colorChangeAnalysis || afterUploading}
              onChange={handleAfterFileChange}
            />

            {afterUploading && <p>업로드 중...</p>}

            {afterPhoto && (
              <div className="photo-preview">
                <img src={afterPhoto} alt="처리 후" />
              </div>
            )}


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
                          <span className="metric-tooltip">{metric.description}</span>
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
