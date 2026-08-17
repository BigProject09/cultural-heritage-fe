import { useRef, useState } from "react";
import { getVcaPdfDownloadUrl } from "../../services/vcaApi";
import VisualCandidateOverlay from "./VisualCandidateOverlay";
import {
  CONCEPT_FAMILY_LABELS,
  SEVERITY_LABELS,
  translateDescriptor,
} from "./visualVcaLabels";
import KoreanLabel from "./KoreanLabel";
import { parseInspectionSections } from "../../utils/inspectionText";

const PHOTO_ZOOM_STEP = 0.25;
const PHOTO_ZOOM_MAX = 3;

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
  return SEVERITY_ORDER.filter((severity) => counts.has(severity)).map(
    (severity) => ({ severity, count: counts.get(severity) }),
  );
}

// 관찰 유형(conceptFamily)별 건수를 집계한다. ReportFindingsBrief의
// 요약 칩에 쓴다.
function conceptFamilyCounts(findings) {
  const counts = new Map();
  findings.forEach((finding) => {
    const key = finding.conceptFamily || "unknown_visual_anomaly";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].map(([conceptFamily, count]) => ({
    conceptFamily,
    count,
  }));
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
      groups.set(key, {
        count: 0,
        descriptors: new Set(),
        highSeverityCount: 0,
      });
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

  const sortedGroups = [...groups.entries()].sort(
    (a, b) => b[1].count - a[1].count,
  );
  const parts = sortedGroups.map(([conceptFamily, group]) => {
    const label = CONCEPT_FAMILY_LABELS[conceptFamily] || conceptFamily;
    const descriptorSample = [...group.descriptors].slice(0, 2);
    const descriptorText =
      descriptorSample.length > 0 ? `(${descriptorSample.join(", ")} 등)` : "";
    return `${label} ${group.count}건${descriptorText}`;
  });

  const highSeverityTotal = [...groups.values()].reduce(
    (sum, group) => sum + group.highSeverityCount,
    0,
  );
  const severityNote =
    highSeverityTotal > 0
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
      label: (
        <KoreanLabel
          original={severity}
          labelMap={SEVERITY_LABELS}
          fallback={severity}
        />
      ),
    })),
    ...families.map(({ conceptFamily, count }) => ({
      key: `family-${conceptFamily}`,
      count,
      label: (
        <KoreanLabel
          original={conceptFamily}
          labelMap={CONCEPT_FAMILY_LABELS}
          fallback={conceptFamily}
        />
      ),
    })),
  ];

  return (
    <div className="visual-vca-stats-table-scroll">
      <table className="visual-vca-stats-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
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
      <h3>육안 상태 조사 결과</h3>
      <FindingsStatsTable findings={findings} />
      <p>{summary?.description || "설명 정보가 없습니다."}</p>
      {findings.length === 0 ? (
        <p>등록된 특이점이 없습니다.</p>
      ) : (
        <p className="visual-vca-findings-summary">
          {summarizeFindings(findings)}
        </p>
      )}
    </section>
  );
}

// 보고서 하단 "참고 및 주의 사항" 알림.
// VCA 분석 결과의 권고 사항과 주의 문구를 표시한다.
// 섹션 아래, PDF 푸터 위에 렌더링하며 recommendations가 없으면 생략된다.
function ReportRecommendations({ recommendations }) {
  if (recommendations.length === 0) return null;

  return (
    <aside
      className="visual-vca-notice visual-vca-recommendations-note"
      aria-labelledby="visual-recommendations-title"
    >
      <strong id="visual-recommendations-title">참고 및 주의 사항</strong>
      <ul>
        {recommendations.map((recommendation) => (
          <li key={`${recommendation.priority}-${recommendation.title}`}>
            {recommendation.priority && <em>[{recommendation.priority}] </em>}
            {recommendation.title || "권고 사항"}
            {recommendation.description
              ? ` — ${recommendation.description}`
              : ""}
          </li>
        ))}
      </ul>
    </aside>
  );
}

// VCA 상태 조사 보고서 본문.
// 이미지 오버레이, 특이점 목록, 권고 사항, PDF 생성/다운로드를 렌더링한다.
// Pottery 정밀 검사 결과는 별도 Pottery 페이지에서 독립적으로 관리한다.
export default function VisualReport({
  artifactId,
  runId,
  pdfJob,
  report,
  working,
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
        <ReportFindingsBrief
          summary={report.summary}
          findings={report.findings || []}
        />
      </div>
      <ReportRecommendations recommendations={report.recommendations || []} />
      <footer className="visual-vca-pdf">
        <div>
          <strong>
            {pdfJob ? statusLabel(pdfJob.status) : "PDF 보고서 미생성"}
          </strong>
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
