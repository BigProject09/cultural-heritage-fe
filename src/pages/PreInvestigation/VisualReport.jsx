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
          {findings.map((finding) => (
            <li key={`${finding.imageId || "finding"}-${finding.title}`}>
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

export default function VisualReport({
  pdfJob,
  report,
  working,
  onPdfJob,
}) {
  return (
    <>
      <div className="visual-vca-report-body">
        <ReportSummary summary={report.summary} />
        <ReportFindings findings={report.findings || []} />
        <ReportRecommendations recommendations={report.recommendations || []} />
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
