import { useState } from "react";
import "./PrivacyPolicyModal.css";

const TERMS_OF_SERVICE_SECTIONS = [
  {
    title: "제1장 총칙",
    body: [],
  },
  {
    title: "제1조 (목적)",
    body: [
      "본 약관은 Team VORA(이하 \"회사\")가 제공하는 AI 기반 문화재 복원 지원 플랫폼 VORA(이하 \"서비스\")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 서비스 이용조건 및 절차 등 필요한 사항을 규정함을 목적으로 합니다.",
    ],
  },
  {
    title: "제2조 (약관의 효력 및 변경)",
    body: [
      "① 본 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.",
      "② 회사는 관련 법령을 위반하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 안내합니다.",
      "③ 이용자가 변경된 약관 시행 이후에도 서비스를 계속 이용하는 경우 변경된 약관에 동의한 것으로 간주합니다.",
    ],
  },
  {
    title: "제3조 (용어의 정의)",
    body: [
      "본 약관에서 사용하는 용어의 뜻은 다음과 같습니다.",
      "1. \"서비스\"란 VORA가 제공하는 AI 기반 문화재 복원 지원 플랫폼을 말합니다.",
      "2. \"회원\"이란 본 약관에 동의하고 회원가입을 완료하여 서비스를 이용하는 자를 말합니다.",
      "3. \"비회원\"이란 회원가입 없이 서비스를 이용하는 자를 말합니다.",
      "4. \"콘텐츠\"란 이용자가 업로드한 이미지, 문서, 복원 기록 및 회사가 제공하는 모든 정보를 말합니다.",
    ],
  },
  {
    title: "제2장 서비스 이용",
    body: [],
  },
  {
    title: "제4조 (서비스의 제공)",
    body: [
      "회사는 다음의 서비스를 제공합니다.",
      "- AI 기반 문화재 손상 분석",
      "- 보존처리 단계 추천",
      "- 보존 가이드 제공",
      "- X-Ray 분석 지원",
      "- 복원 보고서 생성",
      "- 기타 회사가 제공하는 서비스",
    ],
  },
  {
    title: "제5조 (회원가입)",
    body: [
      "① 회원은 회사가 제공하는 가입 절차에 따라 회원가입을 신청할 수 있습니다.",
      "② 회사는 다음 각 호의 경우 가입을 제한하거나 거절할 수 있습니다.",
      "- 허위 정보를 입력한 경우",
      "- 타인의 정보를 도용한 경우",
      "- 관련 법령을 위반한 경우",
      "- 서비스 운영에 중대한 지장을 줄 우려가 있는 경우",
    ],
  },
  {
    title: "제6조 (서비스 이용)",
    body: [
      "① 회사는 특별한 사정이 없는 한 연중무휴 24시간 서비스를 제공합니다.",
      "② 시스템 점검, 서버 장애 또는 불가피한 사유가 발생하는 경우 서비스 제공이 일시 중단될 수 있습니다.",
    ],
  },
  {
    title: "제3장 이용자의 권리와 의무",
    body: [],
  },
  {
    title: "제7조 (회원의 의무)",
    body: [
      "회원은 다음 행위를 하여서는 안 됩니다.",
      "- 허위 정보 등록",
      "- 타인의 개인정보 도용",
      "- 서비스의 정상적인 운영을 방해하는 행위",
      "- 불법 프로그램의 사용",
      "- 회사 또는 제3자의 지식재산권 침해",
      "- 관련 법령에 위반되는 행위",
    ],
  },
  {
    title: "제8조 (회사의 의무)",
    body: [
      "① 회사는 관련 법령을 준수하며 안정적인 서비스 제공을 위해 노력합니다.",
      "② 회사는 이용자의 개인정보를 개인정보처리방침에 따라 안전하게 보호합니다.",
      "③ 회사는 이용자의 의견이나 문의사항을 성실하게 처리합니다.",
    ],
  },
  {
    title: "제4장 지식재산권",
    body: [],
  },
  {
    title: "제9조 (지식재산권)",
    body: [
      "① 서비스에서 제공되는 디자인, 로고, AI 분석 결과 화면 및 기타 콘텐츠의 저작권은 회사 또는 정당한 권리자에게 있습니다.",
      "② 이용자가 업로드한 이미지 및 자료의 저작권은 해당 이용자에게 있으며, 회사는 서비스 제공 목적 범위 내에서만 이를 이용합니다.",
      "③ 이용자는 회사의 사전 동의 없이 서비스를 복제, 배포, 판매하거나 상업적으로 이용할 수 없습니다.",
    ],
  },
  {
    title: "제5장 서비스 이용 제한",
    body: [],
  },
  {
    title: "제10조 (이용 제한)",
    body: [
      "회사는 회원이 본 약관을 위반하거나 서비스 운영에 심각한 영향을 미치는 경우 서비스 이용을 제한하거나 회원 자격을 정지 또는 해지할 수 있습니다.",
    ],
  },
  {
    title: "제6장 면책사항",
    body: [],
  },
  {
    title: "제11조 (면책)",
    body: [
      "① 회사는 천재지변, 시스템 장애, 통신망 장애 등 불가항력으로 인한 서비스 중단에 대하여 책임을 지지 않습니다.",
      "② 회사는 이용자가 서비스를 이용하면서 발생한 손해가 회사의 고의 또는 중대한 과실이 없는 경우 책임을 부담하지 않습니다.",
      "③ AI 분석 결과는 복원 작업을 지원하기 위한 참고자료이며, 최종 복원 판단과 책임은 이용자에게 있습니다.",
    ],
  },
  {
    title: "제7장 기타",
    body: [],
  },
  {
    title: "제12조 (약관의 변경)",
    body: [
      "회사는 서비스 운영 및 관련 법령의 변경에 따라 본 약관을 수정할 수 있으며, 변경 사항은 서비스 내 공지를 통해 안내합니다.",
    ],
  },
  {
    title: "제13조 (준거법 및 관할)",
    body: [
      "본 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련하여 발생한 분쟁은 대한민국 법원을 관할 법원으로 합니다.",
    ],
  },
];

function TermsOfServiceModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="privacy-policy-trigger"
        onClick={() => setIsOpen(true)}
      >
        이용약관
      </button>

      {isOpen && (
        <div
          className="privacy-policy-backdrop"
          role="presentation"
          onMouseDown={() => setIsOpen(false)}
        >
          <section
            className="privacy-policy-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-of-service-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="privacy-policy-close"
              onClick={() => setIsOpen(false)}
              aria-label="닫기"
            >
              ×
            </button>

            <h2 id="terms-of-service-title">이용약관</h2>

            <div className="privacy-policy-body">
              {TERMS_OF_SERVICE_SECTIONS.map((section) => (
                <div className="privacy-policy-section" key={section.title}>
                  <h3>{section.title}</h3>
                  {section.body.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ))}

              <div className="privacy-policy-section">
                <h3>부칙</h3>
                <p>본 약관은 2026년 8월 6일부터 시행합니다.</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default TermsOfServiceModal;
