import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./BondingMethodPage.css";

import { useDisassembly } from "../../context/DisassemblyContext";


function BondingMethodPage() {

  const navigate = useNavigate();


  const {
    taskId,
    methods,
    completed,
    setCompleted,
  } = useDisassembly();



  const {
    steps: bondingSteps = [],
    overall_caution = "",
  } = methods || {};



  const [steps, setSteps] = useState(
    bondingSteps.map((step) => ({
      ...step,
      approved: false,
    }))
  );



  const [showWarning, setShowWarning] =
    useState(false);



  const handleDelete = (stepId) => {

    const isDelete = window.confirm(
      "이 단계를 삭제하시겠습니까?"
    );

    if (!isDelete) return;


    setSteps((prev) =>
      prev.filter(
        (step) => step.id !== stepId
      )
    );

  };



  const handleAddStep = () => {

    const title = window.prompt(
      "단계명을 입력하세요."
    );


    if (!title || title.trim() === "") return;



    const description = window.prompt(
      "단계 설명을 입력하세요."
    );


    if (!description || description.trim() === "") return;



    setSteps((prev)=>[

      ...prev,

      {
        id:`bonding-step-${Date.now()}`,
        order:prev.length + 1,
        label:title,
        caution:description,
        approved:false,
      }

    ]);

  };



  const handleEdit = (stepId)=>{

    const step = steps.find(
      (s)=>s.id===stepId
    );


    if(!step) return;



    const title = window.prompt(
      "단계명을 수정하세요.",
      step.label
    );


    const description = window.prompt(
      "단계 설명을 수정하세요.",
      step.caution
    );


    if(!title || !description) return;



    setSteps((prev)=>
      prev.map((s)=>
        s.id===stepId
        ?
        {
          ...s,
          label:title,
          caution:description,
        }
        :
        s
      )
    );

  };




  const handleComplete = async()=>{


    if(!taskId){

      alert("taskId가 없습니다.");
      return;

    }



    const completedStepIds =
      steps
      .filter((step)=>step.approved)
      .map((step)=>step.id);



    if(completedStepIds.length===0){

      alert("최소 1개의 단계를 승인해주세요.");

      return;

    }



    try{


      await axios.post(

        `http://localhost:8080/tasks/${taskId}/resume`,

        {
          resume:{
            completed_step_ids:
              completedStepIds
          }
        }

      );



      setCompleted({

        ...completed,

        bondingMethod:true,

      });



      navigate("/bonding-post");



    }catch(error){

      console.error(error);

      alert("접합 단계 저장 실패");

    }


  };



  return (

    <div className="method-page">


      <div className="top-bar">


        <button

          className="nav-btn"

          onClick={()=>
            navigate("/bonding")
          }

        >

          ← 이전

        </button>



        <div className="logo">
          VORA
        </div>



        <button

          className="nav-btn"

          onClick={handleComplete}

        >

          완료

        </button>


      </div>




      <div className="page-header">


        <h1>
          AI 단계별 접합 안내
        </h1>


        <p>
          AI가 분석한 최적의 접합 작업 절차입니다.
        </p>


      </div>




      <div className="method-card">



        <div className="reason-card">


          <h3>
            주의사항
          </h3>


          <p>
            {overall_caution}
          </p>


        </div>




        <div className="step-title">


          <span>
            추천 접합 방법
          </span>



          <button

            className="warning-btn"

            onClick={()=>
              setShowWarning(true)
            }

          >

            ⚠ 주의사항

          </button>


        </div>





        {showWarning && (

          <div className="warning-modal">


            <div className="warning-content">


              <h2>
                ⚠ 주의사항
              </h2>


              <p>
                {overall_caution}
              </p>


              <button

                className="close-btn"

                onClick={()=>
                  setShowWarning(false)
                }

              >
                닫기
              </button>


            </div>


          </div>

        )}







        {
          steps.map((step,index)=>(

            <div
              key={step.id}
              className="step-card"
            >


              <div className="step-number">

                {index+1}

              </div>




              <div className="step-info">


                <h3>
                  {step.label}
                </h3>



                <p>

                  <strong>
                    주의사항
                  </strong>

                  <br/>

                  {step.caution}

                </p>


              </div>




              <div className="step-actions">


                <button
                  className="edit-btn"
                  onClick={()=>
                    handleEdit(step.id)
                  }
                >
                  ✏ 수정
                </button>



                <button
                  className="delete-btn"
                  onClick={()=>
                    handleDelete(step.id)
                  }
                >
                  🗑 삭제
                </button>




                <button

                  className="approve-btn"

                  onClick={()=>{

                    setSteps((prev)=>
                      prev.map((s)=>
                        s.id===step.id
                        ?
                        {
                          ...s,
                          approved:
                          !s.approved
                        }
                        :
                        s
                      )
                    );

                  }}

                >

                  {
                    step.approved
                    ?
                    "✔ 승인됨"
                    :
                    "✔ 승인"
                  }

                </button>


              </div>


            </div>

          ))
        }





        <button

          className="add-step-btn"

          onClick={handleAddStep}

        >

          + 단계 추가

        </button>



      </div>



    </div>

  );

}


export default BondingMethodPage;