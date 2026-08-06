import { getVcaPdfDownloadUrl } from "../../services/vcaApi";

const PDF_STATUS_LABELS = {
  QUEUED: "PDF 생성 대기",
  RUNNING: "PDF 생성 중",
  COMPLETED: "PDF 준비 완료",
  FAILED: "PDF 생성 실패",
};

function statusLabel(status) {
  return PDF_STATUS_LABELS[status] || status || "상태 확인 필요";
}

function ReportSummary({ summary }) {
  if (!summary) return <p>요약 정보가 없습니다.</p>;

  return (
    <section>
      <h3>{summary.headline || "조사 요약"}</h3>
      <p>{summary.description || "설명 정보가 없습니다."}</p>
      <dl className="visual-vca-summary-details">
        <div>
          <dt>전체 상태</dt>
          <dd>{summary.overallCondition || "정보 없음"}</dd>
        </div>
        <div>
          <dt>위험 수준</dt>
          <dd>{summary.riskLevel || "정보 없음"}</dd>
        </div>
      </dl>
    </section>
  );
}

function ReportFindings({ findings }) {
  return (
    <section>
      <h3>주요 관찰</h3>
      {findings.length === 0 ? (
        <p>등록된 관찰 항목이 없습니다.</p>
      ) : (
        <ul>
          {findings.map((finding, findingIndex) => (
            <li key={[
              finding.imageId || "finding",
              finding.category || "uncategorized",
              finding.severity || "unrated",
              finding.title || "untitled",
              finding.description || findingIndex,
            ].join("-")}
            >
              <strong>{finding.severity || "관찰"}</strong>
              <span>{finding.category || "분류 없음"}</span>
              <p>{finding.title || "관찰 항목"}</p>
              <p>{finding.description || "세부 설명이 없습니다."}</p>
              {finding.confidence != null && (
                <small>분석 신뢰도 {Math.round(finding.confidence * 100)}%</small>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReportRecommendations({ recommendations }) {
  return (
    <section>
      <h3>권고 사항</h3>
      {recommendations.length === 0 ? (
        <p>등록된 권고 사항이 없습니다.</p>
      ) : (
        <ol>
          {recommendations.map((recommendation) => (
            <li key={`${recommendation.priority}-${recommendation.title}`}>
              <strong>{recommendation.priority || "일반"}</strong>
              <p>{recommendation.title || "권고 사항"}</p>
              <p>{recommendation.description || "세부 설명이 없습니다."}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatPotteryInspectionLabel(label) {
  return label
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ");
}

function formatPotteryInspectionValue(value) {
  if (value == null) return "정보 없음";
  if (typeof value === "boolean") return value ? "예" : "아니오";
  if (Array.isArray(value)) {
    return value.length === 0
      ? "정보 없음"
      : value.map(formatPotteryInspectionValue).join(", ");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    return entries.length === 0
      ? "정보 없음"
      : entries
        .map(([key, detail]) => `${formatPotteryInspectionLabel(key)}: ${formatPotteryInspectionValue(detail)}`)
        .join(" · ");
  }
  return String(value);
}

function isPotteryMaterial(material = "") {
  const normalized = material.toLowerCase();
  return normalized.includes("도자") || normalized.includes("pottery") || normalized.includes("ceramic");
}

function potteryActionLabel(status, working) {
  if (working === "pottery") return "도자기 검사 실행 중";
  if (status === "FAILED") return "도자기 검사 다시 실행";
  if (status === "COMPLETED") return "도자기 검사 다시 실행";
  return "도자기 검사 실행";
}

function ReportPotteryInspection({ artifactMaterial, onPotteryInspection, potteryInspection, potteryInspectionStatus, working }) {
  const hasInspection = potteryInspection && typeof potteryInspection === "object" && !Array.isArray(potteryInspection);
  const applicable = Boolean(potteryInspectionStatus?.applicable || isPotteryMaterial(artifactMaterial));
  if (!applicable && !hasInspection) {
    return null;
  }

  const detailEntries = Object.entries(potteryInspection || {})
    .filter(([key]) => !["moduleVersion", "summary", "humanReviewRecommended", "inspectionText"].includes(key))
    .flatMap(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return Object.entries(value).map(([detailKey, detailValue]) => ({
          label: `${formatPotteryInspectionLabel(key)} · ${formatPotteryInspectionLabel(detailKey)}`,
          value: detailValue,
        }));
      }

      return [{ label: formatPotteryInspectionLabel(key), value }];
    });

  return (
    <section className="visual-vca-pottery-inspection" aria-labelledby="visual-pottery-inspection-title">
      <header>
        <span>VCA OBJECT RECORD</span>
        <h3 id="visual-pottery-inspection-title">도자기 검사</h3>
      </header>
      <div className="visual-vca-pottery-inspection-actions">
        <p>
          {potteryInspectionStatus?.status === "FAILED"
            ? potteryInspectionStatus.failureMessage || "도자기 검사를 완료하지 못했습니다."
            : hasInspection
              ? "도자기 보조 검사 결과가 VCA 보고서에 반영되었습니다."
              : "이 유물은 도자기 보조 검사를 별도로 실행할 수 있습니다."}
        </p>
        {onPotteryInspection && (
          <button
            type="button"
            className="visual-secondary-button"
            onClick={onPotteryInspection}
            disabled={Boolean(working)}
          >
            {potteryActionLabel(potteryInspectionStatus?.status, working)}
          </button>
        )}
      </div>
      {!hasInspection ? (
        <div className="visual-vca-pottery-inspection-empty">
          도자기 검사 결과가 아직 없습니다. 위 버튼으로 현재 VCA run에 결과를 추가하세요.
        </div>
      ) : (
        <>
      <dl className="visual-vca-pottery-inspection-meta">
        <div>
          <dt>모듈 버전</dt>
          <dd>{formatPotteryInspectionValue(potteryInspection.moduleVersion)}</dd>
        </div>
        <div>
          <dt>전문가 검토 권장</dt>
          <dd>{formatPotteryInspectionValue(potteryInspection.humanReviewRecommended)}</dd>
        </div>
      </dl>
      <div className="visual-vca-pottery-inspection-copy">
        <h4>요약</h4>
        <p>{formatPotteryInspectionValue(potteryInspection.summary)}</p>
        <h4>검사 기록</h4>
        <p>{formatPotteryInspectionValue(potteryInspection.inspectionText)}</p>
      </div>
      <div className="visual-vca-pottery-inspection-details">
        <h4>대상 세부 정보</h4>
        {detailEntries.length === 0 ? (
          <p>제공된 세부 정보가 없습니다.</p>
        ) : (
          <dl>
            {detailEntries.map((detail, detailIndex) => (
              <div key={`${detail.label}-${detailIndex}`}>
                <dt>{detail.label}</dt>
                <dd>{formatPotteryInspectionValue(detail.value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
        </>
      )}
    </section>
  );
}

function formatFileSize(sizeBytes) {
  if (!Number.isFinite(sizeBytes)) return "크기 정보 없음";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function IntermediateResults({ intermediateResults }) {
  const stages = intermediateResults?.stages || [];

  return (
    <section className="visual-vca-intermediate-results" aria-labelledby="visual-intermediate-results-title">
      <h3 id="visual-intermediate-results-title">중간 처리 결과</h3>
      <p>
        {intermediateResults?.projectName
          ? `${intermediateResults.projectName} 실행에서 생성된 단계별 파일입니다.`
          : "완료된 실행에서 생성된 단계별 파일을 확인할 수 있습니다."}
      </p>
      {stages.length === 0 ? (
        <div className="visual-vca-intermediate-empty">
          중간 처리 결과가 제공되지 않았습니다.
        </div>
      ) : (
        <div className="visual-vca-intermediate-stages">
          {stages.map((stage, stageIndex) => (
            <article className="visual-vca-intermediate-stage" key={`${stage.stage}-${stageIndex}`}>
              <header>
                <span>{stage.stage || "PROCESSING_STAGE"}</span>
                <h4>{stage.displayName || stage.stage || "처리 단계"}</h4>
              </header>
              {stage.items.length === 0 ? (
                <p className="visual-vca-intermediate-empty">이 단계에서 생성된 파일이 없습니다.</p>
              ) : (
                <ul>
                  {stage.items.map((item, itemIndex) => (
                    <li key={`${item.relativePath}-${item.fileName}-${itemIndex}`}>
                      <div className="visual-vca-intermediate-file-heading">
                        <strong>{item.fileName || "파일 이름 없음"}</strong>
                        <span>{item.contentType || "형식 정보 없음"}</span>
                      </div>
                      <dl className="visual-vca-intermediate-file-meta">
                        <div>
                          <dt>상대 경로</dt>
                          <dd>{item.relativePath || "경로 정보 없음"}</dd>
                        </div>
                        <div>
                          <dt>파일 크기</dt>
                          <dd>{formatFileSize(item.sizeBytes)}</dd>
                        </div>
                      </dl>
                      {item.preview ? (
                        <details>
                          <summary>텍스트 미리보기</summary>
                          <pre>{item.preview}</pre>
                        </details>
                      ) : (
                        <p className="visual-vca-intermediate-preview-empty">텍스트 미리보기가 제공되지 않았습니다.</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function VisualReport({
  artifactMaterial,
  intermediateResults,
  pdfJob,
  report,
  working,
  onPotteryInspection,
  onPdfJob,
}) {
  return (
    <>
      <div className="visual-vca-report-body">
        <ReportSummary summary={report.summary} />
        <ReportFindings findings={report.findings || []} />
        <ReportRecommendations recommendations={report.recommendations || []} />
        <ReportPotteryInspection
          artifactMaterial={artifactMaterial}
          onPotteryInspection={onPotteryInspection}
          potteryInspection={report.potteryInspection}
          potteryInspectionStatus={report.potteryInspectionStatus}
          working={working}
        />
        {report.images?.length > 0 && (
          <section>
            <h3>분석 참고 이미지</h3>
            <div className="visual-vca-report-images">
              {report.images.map((image) => (
                image.downloadUrl ? (
                  <img
                    key={image.imageId || image.downloadUrl}
                    src={image.downloadUrl}
                    alt={`${image.fileName || "분석 참고"} 이미지`}
                  />
                ) : (
                  <div
                    key={image.imageId || image.fileName}
                    className="visual-vca-image-placeholder"
                    aria-label={`${image.fileName || "분석 참고"} 이미지 미리보기 준비 중`}
                  >
                    PREVIEW
                  </div>
                )
              ))}
            </div>
          </section>
        )}
        <IntermediateResults intermediateResults={intermediateResults} />
      </div>
      <footer className="visual-vca-pdf">
        <div>
          <strong>{pdfJob ? statusLabel(pdfJob.status) : "PDF 보고서 미생성"}</strong>
          <span>
            {pdfJob
              ? "생성 작업은 재사용되며 상태를 다시 확인할 수 있습니다."
              : "조사 보고서를 PDF로 준비할 수 있습니다."}
          </span>
        </div>
        <div>
          <button
            type="button"
            className="visual-secondary-button"
            onClick={onPdfJob}
            disabled={Boolean(working)}
          >
            {working === "pdf"
              ? "PDF 상태 확인 중"
              : pdfJob
                ? "PDF 상태 확인"
                : "PDF 생성"}
          </button>
          {pdfJob?.status === "COMPLETED" && (
            <a
              className="visual-primary-button"
              href={getVcaPdfDownloadUrl(pdfJob)}
              target="_blank"
              rel="noreferrer"
            >
              PDF 열기
            </a>
          )}
        </div>
      </footer>
    </>
  );
}
