/**
 * AI 1차 상태조사 문안 패널.
 *
 * 두 가지 스타일을 지원한다.
 *
 *   요약본 - PPT 삽입용, 1500자 내외, 영역 5건 개별 서술
 *   상세본 - 공식 기록용, 9개 절, 영역 12건 개별 서술
 *
 * 문안은 전문가가 수정하는 초안이므로
 * 읽기 전용이 아니라 편집 가능한 textarea로 제공한다.
 */

const STYLES = [
  {
    value: "summary",
    label: "요약본",
    desc: "PPT 삽입용. 1,500자 내외, 주요 영역 5건",
  },
  {
    value: "detailed",
    label: "상세본",
    desc: "공식 기록용. 9개 절, 주요 영역 12건",
  },
];

export default function ReportPanel({
  report,
  meta,
  style,
  onStyleChange,
  loading,
  disabled,
  disabledReason,
  onGenerate,
  onChange,
}) {
  const current = STYLES.find(
    (s) => s.value === style
  );

  return (
    <section className="panel">
      <h2>4. AI 1차 상태조사 문안</h2>

      <p className="sub">
        검수표에서 오탐을 제외하고 검수 내용을 입력한 뒤
        생성하면 그 결과가 문안에 반영됩니다. 신뢰도 상위
        영역만 개별 서술하며 나머지는 통계로 요약됩니다.
      </p>

      {disabled && (
        <div className="alert">{disabledReason}</div>
      )}

      <div className="style-picker">
        {STYLES.map((s) => (
          <button
            key={s.value}
            className={
              style === s.value
                ? "style-btn active"
                : "style-btn"
            }
            onClick={() => onStyleChange(s.value)}
            disabled={loading}
          >
            {s.label}
          </button>
        ))}
      </div>

      {current && (
        <div className="msg dim">{current.desc}</div>
      )}

      <button
        className="primary"
        onClick={onGenerate}
        disabled={loading || disabled}
      >
        {loading
          ? "문안 생성 중... (30초~2분)"
          : report
          ? "문안 다시 생성"
          : "AI 문안 생성"}
      </button>

      {meta && (
        <div className="msg dim">
          {meta.style === "detailed" ? "상세본" : "요약본"}
          {" | "}
          {meta.charCount != null && (
            <>{meta.charCount.toLocaleString()}자 | </>
          )}
          전체 {meta.totalRegionCount}건 중 개별 서술{" "}
          {meta.detailCount}건 | 모델 {meta.model}
        </div>
      )}

      {report && (
        <>
          <textarea
            className="report"
            value={report}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />

          <div className="msg dim">
            문안은 직접 수정할 수 있습니다. 최종본은
            JSON 저장 시 함께 포함됩니다.
          </div>
        </>
      )}
    </section>
  );
}
