// camelCase/snake_case 필드명을 사람이 읽을 공백 구분 표기로 바꾼다.
// 이 파일의 모든 Rag* 컴포넌트가 dt 라벨을 만들 때 공용으로 쓴다.
function formatLabel(label) {
  return String(label)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ");
}

// RAG 근거 데이터는 값 타입(문자열/배열/객체)이 필드마다 달라, 어떤
// 값이 와도 화면에 표시 가능한 문자열로 재귀 변환한다.
function formatValue(value) {
  if (value == null || value === "") return "정보 없음";
  if (Array.isArray(value)) return value.map(formatValue).join(" · ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([label, detail]) => `${formatLabel(label)}: ${formatValue(detail)}`)
      .join(" · ");
  }
  return String(value);
}

// ragArtifacts 항목은 검색 단계(query/retrieval/evidence/concept card)별로
// 스키마가 조금씩 달라 같은 뜻의 값도 필드명이 다르다 - 후보 키를 순서대로
// 찾아 첫 값을 쓴다.
function preferredValue(record, keys) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return record;
  return keys.map((key) => record[key]).find((value) => value != null && value !== "");
}

function DetailItems({ details }) {
  return details.map(([label, value]) => (
    <div key={label}>
      <dt>{formatLabel(label)}</dt>
      <dd>{formatValue(value)}</dd>
    </div>
  ));
}

// entry의 필드를 primaryLabels에 있는 것과 나머지(상세 메타, <details>로
// 접어둠)로 나눠 보여준다. RagEvidenceRows, RagConceptCards에서 각 항목의
// 부가 필드를 렌더링할 때 쓴다.
function DetailList({ entry, omit = [], primaryLabels = [] }) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const details = Object.entries(entry).filter(([label]) => !omit.includes(label));
  if (details.length === 0) return null;
  const primaryDetails = details.filter(([label]) => primaryLabels.includes(label));
  const metadataDetails = details.filter(([label]) => !primaryLabels.includes(label));

  return (
    <>
      {primaryDetails.length > 0 && (
        <dl className="visual-vca-rag-details">
          <DetailItems details={primaryDetails} />
        </dl>
      )}
      {metadataDetails.length > 0 && (
        <details className="visual-vca-rag-meta">
          <summary>상세 메타</summary>
          <dl className="visual-vca-rag-details">
            <DetailItems details={metadataDetails} />
          </dl>
        </details>
      )}
    </>
  );
}

// 이 특이점 근거로 쓰인 RAG 검색 질의 목록. VisualFindingDetailPage의
// 근거 섹션에서 correlateEvidence로 걸러진 queries를 받아 렌더링한다.
export function RagQueries({ queries }) {
  if (!queries || queries.length === 0) return null;

  return (
    <div className="visual-vca-rag-group">
      <h4>검색 질의</h4>
      <ol className="visual-vca-rag-queries">
        {queries.map((query, index) => <li key={`${formatValue(query)}-${index}`}>{formatValue(query)}</li>)}
      </ol>
    </div>
  );
}

// 검색 질의로 얻은 문헌 스니펫 목록. VisualFindingDetailPage 근거 섹션에서
// RagQueries 다음에 렌더링한다.
export function RagRetrievalResults({ results }) {
  if (!results || results.length === 0) return null;

  return (
    <div className="visual-vca-rag-group">
      <h4>검색 결과</h4>
      <ul className="visual-vca-rag-retrievals">
        {results.map((result, index) => {
          const title = preferredValue(result, ["sourceCitation", "title", "sourceTitle", "source", "documentTitle"]);
          const snippet = preferredValue(result, ["snippetText", "snippet", "excerpt", "content", "text"]);
          const score = preferredValue(result, ["score", "similarity", "relevance"]);
          return (
            <li key={`${formatValue(title)}-${index}`}>
              <div>
                <strong>{formatValue(title)}</strong>
                {score != null && <span>관련도 {formatValue(score)}</span>}
              </div>
              <p>{formatValue(snippet)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// 검색 결과를 특이점 후보와 연결한 근거 행. VisualFindingDetailPage 근거
// 섹션에서 렌더링하며, 부가 필드는 DetailList로 접어서 보여준다.
export function RagEvidenceRows({ rows }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="visual-vca-rag-group">
      <h4>근거 행</h4>
      <ul className="visual-vca-rag-evidence-rows">
        {rows.map((row, index) => {
          const title = preferredValue(row, ["ragParentCandidateId", "finding", "claim", "title", "label"]);
          return (
            <li key={`${formatValue(title)}-${index}`}>
              <strong>{formatValue(title)}</strong>
              <DetailList
                entry={row}
                omit={["ragParentCandidateId", "finding", "claim", "title", "label"]}
                primaryLabels={["topCitationId", "matchedCitationIds", "topRetrievalScore", "retrievalScore", "score", "similarity", "relevance"]}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// RAG 코퍼스에서 뽑힌 관찰 개념 카드(원문 근거 문장 포함). 근거 섹션에서
// 가장 구체적인 근거로, 다른 Rag* 목록들 아래에 렌더링한다.
export function RagConceptCards({ cards }) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="visual-vca-rag-group">
      <h4>관찰 카드</h4>
      <div className="visual-vca-rag-concepts">
        {cards.map((card, index) => {
          const title = preferredValue(card, ["conceptFamily", "conceptCardId", "title", "label", "concept", "name"]);
          const description = preferredValue(card, ["rawRetrievedSentence", "description", "summary", "observation", "text"]);
          const keywords = preferredValue(card, ["descriptorTerms", "contextTerms", "keywords", "tags"]);
          return (
            <article key={`${formatValue(title)}-${index}`}>
              <h5>{formatValue(title)}</h5>
              <p>{formatValue(description)}</p>
              {Array.isArray(keywords) && keywords.length > 0 && (
                <ul>{keywords.map((keyword, keywordIndex) => <li key={`${formatValue(keyword)}-${keywordIndex}`}>{formatValue(keyword)}</li>)}</ul>
              )}
              <DetailList
                entry={card}
                omit={["conceptFamily", "title", "label", "concept", "name", "rawRetrievedSentence", "description", "summary", "observation", "text", "descriptorTerms", "contextTerms", "keywords", "tags"]}
                primaryLabels={["ragParentCandidateId", "provenanceStrength", "retrievalScore", "sourceCitationIds", "sourceCitation", "score", "similarity", "relevance"]}
              />
            </article>
          );
        })}
      </div>
    </div>
  );
}
