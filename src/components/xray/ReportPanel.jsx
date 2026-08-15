/**
 * AI 기반 X-ray 상태조사 문안 패널.
 *
 * 실서비스에서는 실무자용 요약 문안 하나만 사용한다.
 * 최종 결합 X-ray와 전문가 검수 결과를 근거로 생성하며,
 * 전문가는 생성 결과를 직접 수정한 뒤 최종 기록으로 확정한다.
 */

export default function ReportPanel({
  report,
  meta,
  loading,
  disabled,
  disabledReason,
  onGenerate,
  onChange,
}) {
  return (
    <section className="panel">
      <h2>4. AI 기반 X-ray 상태조사 문안</h2>

      <p className="sub">
        최종 결합 X-ray와 전문가가 이상으로 포함한 검수 영역을 함께 분석해,
        실제 확인 위치·결합 영향 가능성·추가 확인사항을 중심으로 실무자용
        상태조사 초안을 생성합니다. 생성 후 직접 수정할 수 있습니다.
      </p>

      {disabled && disabledReason && (
        <div className="alert">{disabledReason}</div>
      )}

      <div className="msg dim">
        실무자용 요약 · 주요 검토 영역과 후속 확인 우선순위 중심
      </div>

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
          {meta.charCount != null && (
            <>{meta.charCount.toLocaleString()}자 | </>
          )}
          전체 {meta.totalRegionCount}건 중 개별 검토 {meta.detailCount}건 |
          모델 {meta.model}
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
            AI가 작성한 초안입니다. 실제 상태조사 기록으로 확정하기 전에
            전문가가 영상과 검수 결과를 대조해 수정·확인해주세요.
          </div>
        </>
      )}
    </section>
  );
}
