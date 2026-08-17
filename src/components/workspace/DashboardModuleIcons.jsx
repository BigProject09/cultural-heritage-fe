const commonProps = (size) => ({
  width: size,
  height: size,
  viewBox: "0 0 32 32",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": "true",
  focusable: "false",
});

/** 보존 가이드: 조금 더 크게 보이는 도자기 + 반짝임 */
export function ConservationGuideIcon({ size = 32, className }) {
  return (
    <svg
      {...commonProps(size)}
      className={className}
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* pottery */}
      <path d="M9.7 8.8h12.1" />
      <path d="M11 8.8c.2 2.2-1.9 3.3-2.3 5.6-.8 4.7 1.8 9.7 7.1 10.1 5.3-.4 7.9-5.4 7.1-10.1-.4-2.3-2.5-3.4-2.3-5.6" />
      <path d="M10.4 21.7h10.8" />

      {/* restoration / AI sparkle */}
      <path d="M24.5 4.4v4.6" />
      <path d="M22.2 6.7h4.6" />
      <path d="M27.2 10.2v2.8" />
      <path d="M25.8 11.6h2.8" />
    </svg>
  );
}

/** X-RAY 분석: 네 모서리 스캔 프레임 + 중앙 X + 실제 스캔 위치를 나타내는 점선 */
export function XrayAnalysisIcon({ size = 31, className }) {
  return (
    <svg
      {...commonProps(size)}
      className={className}
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* scan frame corners: 모서리 전체를 점선으로 만들면 선택 영역처럼 보여 solid로 유지 */}
      <path d="M9 4.8H4.8V9" />
      <path d="M23 4.8h4.2V9" />
      <path d="M9 27.2H4.8V23" />
      <path d="M23 27.2h4.2V23" />

      {/* X-RAY */}
      <path d="M11.4 10.6 20.6 21.4" />
      <path d="m20.6 10.6-9.2 10.8" />

      {/* scan beam: 아래쪽 장식이 아니라 실제 스캔선처럼 중앙을 통과 */}
      <path d="M7.6 16h16.8" strokeDasharray="2.1 2.1" />
    </svg>
  );
}

/** 육안 상태 조사: 긴 손잡이 돋보기 */
export function VisualInspectionIcon({ size = 30, className }) {
  return (
    <svg
      {...commonProps(size)}
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="13.7" cy="13.7" r="7.1" />
      <path d="m18.8 18.8 8.1 8.1" />
    </svg>
  );
}
