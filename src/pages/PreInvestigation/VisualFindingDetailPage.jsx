import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getVcaReport } from "../../services/vcaApi";
import { RagConceptCards, RagEvidenceRows, RagQueries, RagRetrievalResults } from "./VisualRagEvidence";
import { BboxFigure, BboxMarker } from "./VisualBboxFigure";
import { badgeRadiusFor, markerColorForNumber } from "./visualMarkerColors";
import {
  CATEGORY_LABELS,
  CONCEPT_FAMILY_LABELS,
  SEVERITY_LABELS,
  findingImageLabel,
  translateDescriptor,
} from "./visualVcaLabels";
import KoreanLabel from "./KoreanLabel";
import "./VisualPage.css";

// 검색 질의/검색 결과/근거 행은 run 전체에 대해 한 번만 생성되므로, 이
// 특이점의 인용 citationId(및 못 찾으면 conceptFamily)로 관련된 항목만
// 걸러서 보여준다 - 그래야 상세 페이지가 이 특이점과 무관한 근거로
// 뒤덮이지 않는다.
function correlateEvidence(finding, ragArtifacts) {
  if (!ragArtifacts || typeof ragArtifacts !== "object") return null;

  const citationIds = new Set((finding.citations || []).map((citation) => citation.citationId).filter(Boolean));
  const queries = Array.isArray(ragArtifacts.queries) ? ragArtifacts.queries : [];
  const retrievalResults = Array.isArray(ragArtifacts.retrievalResults) ? ragArtifacts.retrievalResults : [];
  const evidenceRows = Array.isArray(ragArtifacts.evidenceRows) ? ragArtifacts.evidenceRows : [];
  const visualConceptCards = Array.isArray(ragArtifacts.visualConceptCards) ? ragArtifacts.visualConceptCards : [];

  const matchedRetrievalResults = citationIds.size > 0
    ? retrievalResults.filter((result) => citationIds.has(result.citationId))
    : [];
  const matchedEvidenceRows = citationIds.size > 0
    ? evidenceRows.filter((row) =>
      citationIds.has(row.topCitationId) || (row.matchedCitationIds || []).some((id) => citationIds.has(id)))
    : [];
  const matchedConceptCards = visualConceptCards.filter((card) =>
    (citationIds.size > 0 && (card.sourceCitationIds || []).some((id) => citationIds.has(id)))
    || (finding.conceptFamily && card.conceptFamily === finding.conceptFamily));

  const relevantQueryIds = new Set([
    ...matchedRetrievalResults.map((result) => result.queryId),
    ...matchedEvidenceRows.map((row) => row.queryId),
  ].filter(Boolean));
  const matchedQueries = queries.filter((query) => relevantQueryIds.has(query.queryId));

  return {
    queries: matchedQueries,
    retrievalResults: matchedRetrievalResults,
    evidenceRows: matchedEvidenceRows,
    visualConceptCards: matchedConceptCards,
  };
}

// 특이점 하나의 상세 페이지. 라우트(/artifacts/:artifactId/visual/findings/:runId/:findingId)로
// 직접 진입할 수 있어 report를 location.state로 받지 않고 매번 getVcaReport로
// 다시 불러온다. VisualReport/VisualCandidateOverlay의 항목 클릭으로 이동한다.
export default function VisualFindingDetailPage() {
  const navigate = useNavigate();
  const { artifactId: routeArtifactId = "", runId: routeRunId = "", findingId: routeFindingId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);
  const runId = decodeURIComponent(routeRunId);
  const findingId = decodeURIComponent(routeFindingId);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      getVcaReport(artifactId, runId)
        .then((result) => {
          if (cancelled) return;
          setReport(result.report || result);
        })
        .catch((loadError) => {
          if (!cancelled) setError(loadError);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [artifactId, runId]);

  function backToReport() {
    navigate(`/artifacts/${encodeURIComponent(artifactId)}/visual`);
  }

  if (loading) {
    return (
      <main className="visual-page visual-vca-page visual-state" aria-live="polite">
        특이점 정보를 불러오는 중입니다.
      </main>
    );
  }

  if (error) {
    return (
      <main className="visual-page visual-vca-page visual-state" role="alert">
        <span className="visual-vca-kicker">VCA CONNECTION</span>
        <h1>특이점 정보를 불러오지 못했습니다</h1>
        <p>{error.message}</p>
        <button type="button" className="visual-primary-button" onClick={backToReport}>
          조사 보고서로 돌아가기
        </button>
      </main>
    );
  }

  const findings = report?.findings || [];
  const images = report?.images || [];
  const finding = findings.find((candidate) => candidate.findingId === findingId);

  if (!finding) {
    return (
      <main className="visual-page visual-vca-page visual-state" role="alert">
        <span className="visual-vca-kicker">VCA CONNECTION</span>
        <h1>특이점을 찾을 수 없습니다</h1>
        <p>요청한 특이점 정보가 더 이상 존재하지 않습니다.</p>
        <button type="button" className="visual-primary-button" onClick={backToReport}>
          조사 보고서로 돌아가기
        </button>
      </main>
    );
  }

  const image = images.find((candidate) => candidate.imageId === finding.imageId);
  const bbox = finding.bbox;
  const evidence = correlateEvidence(finding, report?.ragArtifacts);
  // 목록/오버레이 배지 번호와 맞추려면 findings 원본 순서의 index+1이어야
  // 한다 (VisualCandidateOverlay 참고).
  const number = findings.findIndex((candidate) => candidate.findingId === findingId) + 1;

  return (
    <VisualFindingDetailLayout
      backToReport={backToReport}
      finding={finding}
      number={number}
      image={image}
      bbox={bbox}
      images={images}
      evidence={evidence}
    />
  );
}

// 실제 본문 레이아웃. VisualFindingDetailPage에서 로딩/에러/찾음-못함
// 조건부 반환이 모두 끝난 뒤에만 렌더링되는 별도 컴포넌트로 분리했다 -
// 그래야 여기 있는 useState(imageSize)가 조건부 반환 이전에 호출되는
// 문제(rules of hooks)가 생기지 않는다.
function VisualFindingDetailLayout({ backToReport, finding, number, image, bbox, images, evidence }) {
  const [imageSize, setImageSize] = useState(null);

  function handleImageLoad(event) {
    setImageSize({ width: event.target.naturalWidth, height: event.target.naturalHeight });
  }

  return (
    <main className="visual-page visual-vca-page">
      <div className="visual-container visual-vca-container">
        <nav className="visual-vca-breadcrumb" aria-label="현재 위치">
          <button type="button" onClick={backToReport}>
            육안 상태 조사
          </button>
          <span aria-hidden="true">/</span>
          <strong>특이점 상세</strong>
        </nav>

        <header className="visual-vca-header">
          <div>
            <span className="visual-vca-kicker">VCA FINDING DETAIL</span>
            <h1>
              {number > 0 && <span className="visual-vca-finding-number visual-vca-finding-number-lg">{number}</span>}
              <KoreanLabel original={finding.conceptFamily} labelMap={CONCEPT_FAMILY_LABELS} fallback="특이점 상세" />
            </h1>
            <p>사진에서 표시된 위치와 근거 문헌을 함께 확인합니다.</p>
          </div>
        </header>

        <section className="visual-vca-card visual-vca-overlay" aria-labelledby="visual-finding-detail-title">
          {image?.downloadUrl ? (
            <div className="visual-vca-overlay-grid visual-vca-overlay-grid-single">
              <BboxFigure image={image} size={imageSize} onImageLoad={handleImageLoad}>
                {bbox && (
                  <BboxMarker
                    bbox={bbox}
                    polygon={finding.polygon}
                    number={number}
                    color={markerColorForNumber(number)}
                    badgeRadius={badgeRadiusFor(imageSize)}
                  />
                )}
              </BboxFigure>
            </div>
          ) : (
            <p>대상 이미지를 불러올 수 없습니다.</p>
          )}
        </section>

        <section className="visual-vca-card" aria-labelledby="visual-finding-detail-body">
          <div className="visual-vca-heading">
            <div>
              <span className="visual-vca-kicker">
                <KoreanLabel original={finding.severity} labelMap={SEVERITY_LABELS} fallback="관찰" />
              </span>
              <h2 id="visual-finding-detail-body">
                <KoreanLabel original={finding.category} labelMap={CATEGORY_LABELS} fallback="분류 없음" />
              </h2>
              <p>
                <KoreanLabel original={finding.conceptFamily} labelMap={CONCEPT_FAMILY_LABELS} fallback="관찰 항목" />
                {finding.descriptor && (
                  <span className="visual-vca-original-hint" title={`원문: ${finding.descriptor}`}>
                    {" "}
                    · {translateDescriptor(finding.descriptor)}
                  </span>
                )}
              </p>
            </div>
          </div>
          <p>{finding.description || "세부 설명이 없습니다."}</p>
          {findingImageLabel(finding.imageId, images) && (
            <small>대상 이미지: {findingImageLabel(finding.imageId, images)}</small>
          )}
          {finding.citations?.length > 0 && (
            <details className="visual-vca-finding-citations" open>
              <summary>인용 근거 {finding.citations.length}건</summary>
              <ul>
                {finding.citations.map((citation, citationIndex) => (
                  <li key={citation.citationId || citationIndex}>
                    {citation.sourceCitation || "출처 미상"}
                    {citation.pageNumber != null ? ` (p.${citation.pageNumber})` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {evidence && (
            <div className="visual-vca-findings-evidence">
              <RagQueries queries={evidence.queries} />
              <RagRetrievalResults results={evidence.retrievalResults} />
              <RagEvidenceRows rows={evidence.evidenceRows} />
              <RagConceptCards cards={evidence.visualConceptCards} />
            </div>
          )}
        </section>

        <footer className="visual-vca-complete">
          <button type="button" className="visual-primary-button" onClick={backToReport}>
            조사 보고서로 돌아가기
          </button>
        </footer>
      </div>
    </main>
  );
}
