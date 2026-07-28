import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDisassembly } from "../../context/DisassemblyContext";
import { resumeTask } from "../../services/conservationGuideApi";

import "./StrengtheningWettingPage.css";


function StrengtheningWettingPage() {
  const navigate = useNavigate();

  const { taskId, setCompleted } = useDisassembly();

  const [beforePhoto, setBeforePhoto] = useState("");
  const [afterPhoto, setAfterPhoto] = useState("");


  const handleComplete = async () => {

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


    try {

      const response = await resumeTask(taskId, request);

      console.log("습윤 테스트 사진 저장:", response.data);


      setCompleted((prev) => ({
        ...prev,
        strengtheningWetting: true,
      }));


      navigate("/strengthening-wetting-result");


    } catch (error) {

      console.error(error);
      alert("습윤 테스트 사진 저장 실패");

    }

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


        <button
          className="nav-btn"
          onClick={handleComplete}
        >
          완료
        </button>

      </div>



      <div className="method-container">


        <div className="page-header">

          <h1>
            💧 습윤 효과 테스트
          </h1>

          <p>
            강화제 적용 전후 사진을 입력하여 색 변화 여부를 분석합니다.
          </p>

        </div>



        <div className="info-card">


          <h2>
            테스트 전 사진
          </h2>


          <input
            type="text"
            placeholder="before_photo_url 입력"
            value={beforePhoto}
            onChange={(e) =>
              setBeforePhoto(e.target.value)
            }
          />


        </div>



        <div className="info-card">


          <h2>
            테스트 후 사진
          </h2>


          <input
            type="text"
            placeholder="after_photo_url 입력"
            value={afterPhoto}
            onChange={(e) =>
              setAfterPhoto(e.target.value)
            }
          />


        </div>



        <div className="warning-box">

          <strong>
            ⚠ 주의사항
          </strong>


          <p>
            강화 처리 전후 동일한 조건에서 촬영한 사진을 입력해주세요.
          </p>


        </div>


      </div>


    </div>
  );
}


export default StrengtheningWettingPage;