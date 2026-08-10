import { getVcaPdfDownloadUrl } from "../../services/vcaApi";
import VisualCandidateOverlay from "./VisualCandidateOverlay";
import { CONCEPT_FAMILY_LABELS, SEVERITY_LABELS, translateDescriptor } from "./visualVcaLabels";
import KoreanLabel from "./KoreanLabel";

const PDF_STATUS_LABELS = {
  QUEUED: "PDF 생성 대기",
  RUNNING: "PDF 생성 중",
  COMPLETED: "PDF 준비 완료",
  FAILED: "PDF 생성 실패",
};

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

function statusLabel(status) {
  return PDF_STATUS_LABELS[status] || status || "상태 확인 필요";
}

// 심각도별 건수를 SEVERITY_ORDER(심각→낮음) 순서로 집계한다.
// ReportFindingsBrief의 요약 칩에 쓴다.
function severityCounts(findings) {
  const counts = new Map();
  findings.forEach((finding) => {
    const key = finding.severity || "INFO";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return SEVERITY_ORDER
    .filter((severity) => counts.has(severity))
    .map((severity) => ({ severity, count: counts.get(severity) }));
}

// 관찰 유형(conceptFamily)별 건수를 집계한다. ReportFindingsBrief의
// 요약 칩에 쓴다.
function conceptFamilyCounts(findings) {
  const counts = new Map();
  findings.forEach((finding) => {
    const key = finding.conceptFamily || "unknown_visual_anomaly";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].map(([conceptFamily, count]) => ({ conceptFamily, count }));
}

// 특이점들을 관찰 유형(conceptFamily)별로 묶어, 몇 건이고 어떤 양상인지를
// 문장으로 요약한다("표면오염 5건(백색 분상 피각 등)" 형태) - 규칙 기반이라
// 새 AI 호출 없이 findings에 이미 있는 conceptFamily/descriptor/severity만
// 쓴다. ReportFindingsBrief가 개별 항목을 나열하기 전에 먼저 보여준다.
function summarizeFindings(findings) {
  if (findings.length === 0) return "";
  const groups = new Map();
  findings.forEach((finding) => {
    const key = finding.conceptFamily || "unknown";
    if (!groups.has(key)) {
      groups.set(key, { count: 0, descriptors: new Set(), highSeverityCount: 0 });
    }
    const group = groups.get(key);
    group.count += 1;
    // descriptor가 "unknown"이면 RAG 근거를 못 찾아 아무 서술어도 못 붙인
    // passthrough 후보라는 뜻이라, 괄호 안에 원문 그대로("unknown") 새는
    // 것을 막는다 - 이 경우는 그냥 건수만 보여준다.
    if (finding.descriptor && finding.descriptor !== "unknown") {
      const translated = translateDescriptor(finding.descriptor);
      if (translated) {
        group.descriptors.add(translated);
      }
    }
    if (finding.severity === "HIGH" || finding.severity === "CRITICAL") {
      group.highSeverityCount += 1;
    }
  });

  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].count - a[1].count);
  const parts = sortedGroups.map(([conceptFamily, group]) => {
    const label = CONCEPT_FAMILY_LABELS[conceptFamily] || conceptFamily;
    const descriptorSample = [...group.descriptors].slice(0, 2);
    const descriptorText = descriptorSample.length > 0 ? `(${descriptorSample.join(", ")} 등)` : "";
    return `${label} ${group.count}건${descriptorText}`;
  });

  const highSeverityTotal = [...groups.values()]
    .reduce((sum, group) => sum + group.highSeverityCount, 0);
  const severityNote = highSeverityTotal > 0
    ? ` 이 중 ${highSeverityTotal}건은 심각도가 '높음' 이상으로 평가되어 주의가 필요합니다.`
    : "";

  return `총 ${findings.length}건의 특이점이 확인되었으며, ${parts.join(", ")}입니다.${severityNote}`;
}

// 심각도별/유형별 건수를 표로 보여준다("정보 3, 균열 2, 결손 1, 변색 2" 같은
// 칩 나열 대신) - ReportFindingsBrief가 pane 맨 위, 설명 문구보다도 앞에
// 배치한다.
function FindingsStatsTable({ findings }) {
  const severities = severityCounts(findings);
  const families = conceptFamilyCounts(findings);
  if (severities.length === 0 && families.length === 0) return null;
  const columns = [
    ...severities.map(({ severity, count }) => ({
      key: `severity-${severity}`,
      count,
      label: <KoreanLabel original={severity} labelMap={SEVERITY_LABELS} fallback={severity} />,
    })),
    ...families.map(({ conceptFamily, count }) => ({
      key: `family-${conceptFamily}`,
      count,
      label: <KoreanLabel original={conceptFamily} labelMap={CONCEPT_FAMILY_LABELS} fallback={conceptFamily} />,
    })),
  ];

  return (
    <div className="visual-vca-stats-table-scroll">
      <table className="visual-vca-stats-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {columns.map((column) => (
              <td key={column.key}>{column.count}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// summary.headline은 백엔드가 항상 "VCA 육안 조사 결과"라는 고정 문구를
// 내려주는 죽은 필드라 별도로 표시하지 않는다 (report_generating이 만드는
// 실제 내용은 summary.description뿐). 개별 특이점 나열은 없앴다 - 통계 표와
// 요약 문장으로 충분하고, 개별 항목은 사진 위 마커(VisualCandidateOverlay)를
// 클릭해서 상세 페이지로 갈 수 있다.
function ReportFindingsBrief({ summary, findings }) {
  return (
    <section className="visual-vca-findings-report">
      <h3>육안 조사 결과</h3>
      <FindingsStatsTable findings={findings} />
      <p>{summary?.description || "설명 정보가 없습니다."}</p>
      {findings.length === 0 ? (
        <p>등록된 특이점이 없습니다.</p>
      ) : (
        <p className="visual-vca-findings-summary">{summarizeFindings(findings)}</p>
      )}
    </section>
  );
}

// 보고서 하단 "참고 및 주의 사항" 알림. VisualReport에서 findings/pottery
// 섹션 아래, PDF 푸터 위에 렌더링하며 recommendations가 없으면 생략된다.
function ReportRecommendations({ recommendations }) {
  if (recommendations.length === 0) return null;

  return (
    <aside className="visual-vca-notice visual-vca-recommendations-note" aria-labelledby="visual-recommendations-title">
      <strong id="visual-recommendations-title">참고 및 주의 사항</strong>
      <ul>
        {recommendations.map((recommendation) => (
          <li key={`${recommendation.priority}-${recommendation.title}`}>
            {recommendation.priority && <em>[{recommendation.priority}] </em>}
            {recommendation.title || "권고 사항"}
            {recommendation.description ? ` — ${recommendation.description}` : ""}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function formatPotteryInspectionLabel(label) {
  return label
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ");
}

// 도자기 검사 결과 값(불리언/배열/객체/원시값)을 무엇이 와도 표시 가능한
// 문자열로 재귀 변환한다. ReportPotteryInspection 전용.
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

// 재질명에 도자기 관련 키워드가 있는지 문자열로 판별한다. ReportPotteryInspection이
// 서버의 potteryInspectionStatus.applicable이 없을 때 폴백으로 쓴다.
// 주의: 같은 판별 로직이 vcaApi.js의 mock 분기에도 독립적으로 있어,
// 키워드를 바꾸려면 두 곳 모두 고쳐야 한다.
function isPotteryMaterial(material = "") {
  const normalized = material.toLowerCase();
  return normalized.includes("도자") || normalized.includes("pottery") || normalized.includes("ceramic");
}

// 도자기 검사 버튼 문구를 진행/실패/완료 상태에 맞게 고른다. ReportPotteryInspection에서 쓴다.
function potteryActionLabel(status, working) {
  if (working === "pottery") return "도자기 검사 실행 중";
  if (status === "FAILED") return "도자기 검사 다시 실행";
  if (status === "COMPLETED") return "도자기 검사 다시 실행";
  return "도자기 검사 실행";
}

// 도자기 재질 유물에 한해 자동 실행되는 보조 검사 결과 섹션. VisualReport에서
// findings 다음에 렌더링하며, 대상 재질이 아니고 기존 검사 결과도 없으면
// 아무것도 그리지 않는다(null).
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
          {working === "pottery"
            ? "도자기 보조 검사를 자동으로 실행하고 있습니다."
            : potteryInspectionStatus?.status === "FAILED"
              ? potteryInspectionStatus.failureMessage || "도자기 검사를 완료하지 못했습니다."
              : hasInspection
                ? "도자기 보조 검사 결과가 VCA 보고서에 반영되었습니다."
                : "이 유물은 도자기 재질로 확인되어 도자기 보조 검사가 자동으로 실행됩니다."}
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
          {working === "pottery"
            ? "도자기 검사 결과를 기다리는 중입니다."
            : "도자기 검사 결과가 아직 없습니다. 실패했다면 위 버튼으로 다시 시도할 수 있습니다."}
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
      {detailEntries.length > 0 && (
        <details className="visual-vca-pottery-inspection-details">
          <summary>대상 세부 정보 {detailEntries.length}건</summary>
          <dl>
            {detailEntries.map((detail, detailIndex) => (
              <div key={`${detail.label}-${detailIndex}`}>
                <dt>{detail.label}</dt>
                <dd>{formatPotteryInspectionValue(detail.value)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
        </>
      )}
    </section>
  );
}

// VisualPage의 STEP 03(조사 보고서) 카드 안에 렌더링되는 보고서 본문
// 전체 - 오버레이, 특이점 목록, 도자기 검사, 권고 사항, PDF 생성/다운로드를
// 이어 붙인다.
export default function VisualReport({
  artifactId,
  runId,
  artifactMaterial,
  pdfJob,
  report,
  working,
  onPotteryInspection,
  onPdfJob,
}) {
  return (
    <>
      <div className="visual-vca-report-body">
        <VisualCandidateOverlay
          images={report.images || []}
          findings={report.findings || []}
          artifactId={artifactId}
          runId={runId}
        />
        <ReportFindingsBrief summary={report.summary} findings={report.findings || []} />
        <ReportPotteryInspection
          artifactMaterial={artifactMaterial}
          onPotteryInspection={onPotteryInspection}
          potteryInspection={report.potteryInspection}
          potteryInspectionStatus={report.potteryInspectionStatus}
          working={working}
        />
      </div>
      <ReportRecommendations recommendations={report.recommendations || []} />
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
