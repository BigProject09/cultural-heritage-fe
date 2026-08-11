import { useState } from "react";
import "./PrivacyPolicyModal.css";

const PRIVACY_POLICY_SECTIONS = [
  {
    title: "제1조 (개인정보의 처리목적)",
    body: [
      "회사는 다음의 목적을 위해 개인정보를 처리합니다.",
      "1. 회원가입 및 본인 확인",
      "2. 서비스 제공 및 이용자 관리",
      "3. AI 기반 문화재 복원 서비스 제공",
      "4. 고객 문의 및 서비스 지원",
      "5. 서비스 품질 개선 및 통계 분석",
    ],
  },
  {
    title: "제2조 (수집하는 개인정보 항목)",
    body: [
      "회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집할 수 있습니다.",
      "■ 필수항목",
      "- 이름",
      "- 이메일",
      "- 비밀번호",
      "■ 서비스 이용 과정에서 생성되는 정보",
      "- 로그인 기록",
      "- 접속 IP",
      "- 브라우저 정보",
      "- 서비스 이용 기록",
      "- 업로드한 유물 이미지",
      "- 입력한 복원 관련 정보",
    ],
  },
  {
    title: "제3조 (개인정보의 보유 및 이용기간)",
    body: [
      "회사는 개인정보의 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.",
      "단, 관계 법령에 따라 일정 기간 보관이 필요한 경우에는 해당 기간 동안 안전하게 보관합니다.",
    ],
  },
  {
    title: "제4조 (개인정보의 제3자 제공)",
    body: [
      "회사는 이용자의 개인정보를 외부에 제공하지 않습니다.",
      "다만 다음의 경우에는 예외로 합니다.",
      "- 이용자의 사전 동의를 받은 경우",
      "- 법령에 따라 제공이 요구되는 경우",
    ],
  },
  {
    title: "제5조 (개인정보 처리의 위탁)",
    body: [
      "회사는 원활한 서비스 제공을 위하여 일부 업무를 외부 서비스에 위탁할 수 있습니다.",
      "예시",
      "- AWS : 서버 운영 및 데이터 저장",
      "- OpenAI API : AI 분석 서비스",
      "위탁 내용은 서비스 운영에 따라 변경될 수 있습니다.",
    ],
  },
  {
    title: "제6조 (이용자의 권리)",
    body: [
      "이용자는 언제든지 자신의 개인정보에 대하여 다음 권리를 행사할 수 있습니다.",
      "- 개인정보 조회",
      "- 개인정보 수정",
      "- 개인정보 삭제",
      "- 개인정보 처리 정지 요청",
      "회사는 관련 법령에 따라 이용자의 요청을 신속하게 처리합니다.",
    ],
  },
  {
    title: "제7조 (개인정보의 안전성 확보조치)",
    body: [
      "회사는 개인정보 보호를 위하여 다음과 같은 조치를 시행합니다.",
      "- 개인정보 암호화",
      "- 접근 권한 관리",
      "- 서버 보안 관리",
      "- 정기적인 보안 점검",
    ],
  },
  {
    title: "제8조 (쿠키의 사용)",
    body: [
      "회사는 서비스 품질 향상을 위하여 쿠키를 사용할 수 있습니다.",
      "이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 서비스 이용에 제한이 있을 수 있습니다.",
    ],
  },
  {
    title: "제9조 (개인정보 보호책임자)",
    body: ["서비스명 : VORA", "운영팀 : Team VORA", "문의 : team.vora@example.com"],
  },
  {
    title: "제10조 (개인정보처리방침의 변경)",
    body: [
      "본 개인정보처리방침은 관련 법령 또는 서비스 정책의 변경에 따라 수정될 수 있으며, 변경사항은 서비스 내 공지를 통해 안내합니다.",
    ],
  },
];

function PrivacyPolicyModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="privacy-policy-trigger"
        onClick={() => setIsOpen(true)}
      >
        개인정보 처리방침
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
            aria-labelledby="privacy-policy-title"
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

            <h2 id="privacy-policy-title">개인정보처리방침</h2>
            <p className="privacy-policy-intro">
              VORA(이하 "회사")는 이용자의 개인정보를 소중하게 생각하며 「개인정보
              보호법」 등 관련 법령을 준수합니다. 회사는 이용자의 개인정보를
              적법하게 처리하고 안전하게 관리하기 위해 다음과 같이
              개인정보처리방침을 수립·공개합니다.
            </p>

            <div className="privacy-policy-body">
              {PRIVACY_POLICY_SECTIONS.map((section) => (
                <div className="privacy-policy-section" key={section.title}>
                  <h3>{section.title}</h3>
                  {section.body.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ))}

              <div className="privacy-policy-section">
                <h3>부칙</h3>
                <p>본 개인정보처리방침은 2026년 8월 6일부터 시행됩니다.</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default PrivacyPolicyModal;
