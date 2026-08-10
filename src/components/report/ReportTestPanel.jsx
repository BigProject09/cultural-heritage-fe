import { useEffect, useMemo, useState } from "react";
import {
  checkReportHealth,
  downloadBlob,
  fileToBase64,
  generateReport,
  getReportAiBaseUrl,
  isReportMockEnabled,
  reportToDocx,
} from "../../services/reportApi";
import { addMyReport } from "../../utils/myReports";
import "./ReportTestPanel.css";

// report-ai(app/nodes/assemble.py)의 SECTION_ORDER와 같다. 사진을 붙일 때
// 어느 단계 섹션에 붙일지 고르는 선택지로도 쓴다.
const SECTION_ORDER = [
  { key: "header", label: "유물 기본정보" },
  { key: "pre_investigation", label: "처리 전 상태조사" },
  { key: "disassembly", label: "해체" },
  { key: "cleaning", label: "세척" },
  { key: "reinforcement", label: "강화처리" },
  { key: "bonding", label: "접합" },
  { key: "restoration", label: "복원" },
  { key: "conclusion", label: "처리 결과 및 종합 결론" },
];

const PROCESS_STAGE_KEYS = [
  "disassembly",
  "cleaning",
  "reinforcement",
  "bonding",
  "restoration",
];

// report-ai/app/nodes 가 기대하는 형태를 그대로 흉내낸 샘플 값.
// FE에는 아직 각 모듈의 실제 결과가 중앙에 저장되지 않아서(로컬 상태 한정),
// 버튼 한 번으로 바로 호출해 볼 수 있도록 기본값을 채워둔다.
const SAMPLE_GUIDE_RESULT = {
  disassembly: {
    aiRecommendation: "기계적 해체 (완충패드 지지)",
    finalChoice: "기계적 해체",
    memo: "접합부 3개소를 완충패드 위에서 분리, 파손 없이 완료",
  },
  cleaning: {
    aiRecommendation: "이온교환수 습식세척",
    finalChoice: "이온교환수 습식세척 + 연질 붓 병용",
    memo: "표면 흙때와 이물질 제거 후 상온 자연 건조",
  },
  reinforcement: {
    material: "Paraloid B-72 5% (아세톤 희석)",
    memo: "태토 취약 부위에 함침 강화 처리, 24시간 건조",
  },
  bonding: {
    adhesive: "Paraloid B-72 40%",
    memo: "접합부 3개소 가접합 검증 후 본접합 진행",
  },
  restoration: {
    material: "석고 충전 + 안료 색맞춤",
    memo: "결실부 복원 후 주변 태토 색조에 맞춰 마감",
  },
};

const SAMPLE_XRAY_REPORT_TEXT =
  "X-ray 촬영 결과 동체 하단부에서 폭 0.3mm 내외의 미세 균열이 확인되었으며, 그 외 영역에서는 특이 이상소견이 관찰되지 않음.";

const SAMPLE_XRAY_REGIONS = [
  {
    region_code: "R1",
    position: "동체 하단부",
    user_note: "미세 균열 확인",
    review_decision: "damage",
  },
  {
    region_code: "R2",
    position: "구연부 내측",
    user_note: "음영이 있으나 이물질로 판단, 손상 아님",
    review_decision: "not_damage",
  },
];

const SAMPLE_POTTERY_INSPECTION = {
  inspection_text:
    "회청색 태토에 음각 연화문이 시문되어 있으며, 구연부 일부에서 마모 흔적이 확인됨.",
};

function stringifySample(value) {
  return JSON.stringify(value, null, 2);
}

function buildRelicInfo(project) {
  return {
    artifact_code: project.artifactId,
    id: project.artifactId,
    name: project.name,
    material: project.material,
    period: project.period,
    weight: project.weight,
    bondingArea: project.bondingArea,
    treatmentPurpose: project.treatmentPurpose,
  };
}

function sectionByKey(reportJson, key) {
  return (reportJson?.sections || []).find((section) => section.key === key);
}

function buildMyReportPayload(project, reportJson) {
  const methods = PROCESS_STAGE_KEYS.map((key) => sectionByKey(reportJson, key))
    .filter(Boolean)
    .map((section) => `[${section.title}] ${section.body}`);

  const preInvestigation = sectionByKey(reportJson, "pre_investigation");
  const conclusion = sectionByKey(reportJson, "conclusion");

  const summary = [preInvestigation?.body, conclusion?.body].filter(Boolean);

  return {
    id: `ai-report-${project.artifactId}-${Date.now()}`,
    title: `${project.name} AI 최종 보고서 (테스트)`,
    project: project.name,
    date: new Date().toISOString().slice(0, 10),
    artifactInfo: project,
    summary,
    methods,
    futureCare: conclusion?.body || "",
    reportType: "AI_GENERATED_TEST",
    reportJson,
  };
}

function ReportTestPanel({ project }) {
  const [health, setHealth] = useState({ loading: true, ok: null, detail: "" });

  const [guideResultText, setGuideResultText] = useState(
    stringifySample(SAMPLE_GUIDE_RESULT),
  );
  const [xrayReportText, setXrayReportText] = useState(SAMPLE_XRAY_REPORT_TEXT);
  const [xrayRegionsText, setXrayRegionsText] = useState(
    stringifySample(SAMPLE_XRAY_REGIONS),
  );
  const [potteryInspectionText, setPotteryInspectionText] = useState(
    stringifySample(SAMPLE_POTTERY_INSPECTION),
  );
  const [fieldErrors, setFieldErrors] = useState({});

  const [photos, setPhotos] = useState([]); // [{ id, file, previewUrl, sectionKey }]
  const [photoSectionKey, setPhotoSectionKey] = useState(SECTION_ORDER[0].key);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [reportJson, setReportJson] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    checkReportHealth()
      .then((data) => {
        if (cancelled) return;
        setHealth({
          loading: false,
          ok: data.status === "ok",
          detail: data.indexReady
            ? "정상 (참고문헌 인덱스 준비됨)"
            : "정상 (참고문헌 인덱스 없음 — 생성은 가능)",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setHealth({ loading: false, ok: false, detail: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const relicInfo = useMemo(() => buildRelicInfo(project), [project]);

  function parseJsonField(name, text) {
    try {
      const value = JSON.parse(text);
      setFieldErrors((previous) => ({ ...previous, [name]: "" }));
      return { ok: true, value };
    } catch (error) {
      setFieldErrors((previous) => ({
        ...previous,
        [name]: `JSON 형식이 올바르지 않습니다: ${error.message}`,
      }));
      return { ok: false, value: null };
    }
  }

  function handleAddPhotos(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const next = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      sectionKey: photoSectionKey,
    }));

    setPhotos((previous) => [...previous, ...next]);
    event.target.value = "";
  }

  function handleRemovePhoto(id) {
    setPhotos((previous) => {
      const target = previous.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return previous.filter((photo) => photo.id !== id);
    });
  }

  async function buildPhotosPayload() {
    const grouped = {};

    for (const photo of photos) {
      const base64 = await fileToBase64(photo.file);
      if (!grouped[photo.sectionKey]) grouped[photo.sectionKey] = [];
      grouped[photo.sectionKey].push({
        caption: photo.file.name,
        image_base64: base64,
      });
    }

    return grouped;
  }

  function buildBasePayload() {
    const guideResult = parseJsonField("guideResult", guideResultText);
    const xrayRegions = parseJsonField("xrayRegions", xrayRegionsText);
    const potteryInspection = parseJsonField(
      "potteryInspection",
      potteryInspectionText,
    );

    if (!guideResult.ok || !xrayRegions.ok || !potteryInspection.ok) {
      return null;
    }

    return {
      artifact_id: project.artifactId,
      relic_info: relicInfo,
      guide_result: guideResult.value,
      xray_report_text: xrayReportText || null,
      xray_regions: xrayRegions.value,
      pottery_inspection: potteryInspection.value,
    };
  }

  async function handleGenerate() {
    setGenerateError("");
    setSaved(false);

    const payload = buildBasePayload();
    if (!payload) {
      setGenerateError("입력값을 확인해주세요 (JSON 형식 오류).");
      return;
    }

    setGenerating(true);
    try {
      const { report_json: json } = await generateReport(payload);
      setReportJson(json);
    } catch (error) {
      setGenerateError(error.message);
      setReportJson(null);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadDocx() {
    if (!reportJson) return;

    setDownloadError("");
    setDownloading(true);
    try {
      const photosPayload = await buildPhotosPayload();
      const { blob, fileName } = await reportToDocx({
        artifactId: project.artifactId,
        reportJson,
        photos: photosPayload,
      });
      downloadBlob(blob, fileName);
    } catch (error) {
      setDownloadError(error.message);
    } finally {
      setDownloading(false);
    }
  }

  function handleSaveToMyReports() {
    if (!reportJson) return;
    addMyReport(buildMyReportPayload(project, reportJson));
    setSaved(true);
  }

  const orderedSections = useMemo(() => {
    if (!reportJson?.sections) return [];
    const order = SECTION_ORDER.map((item) => item.key);
    return [...reportJson.sections].sort(
      (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
    );
  }, [reportJson]);

  return (
    <section className="report-test-panel">
      <header className="report-test-panel-head">
        <div>
          <span>REPORT-AI 연동 테스트</span>
          <h2>AI 최종 보고서 생성 테스트</h2>
          <p>
            report-ai 서비스(<code>{getReportAiBaseUrl()}</code>)를 직접
            호출합니다. Spring 오케스트레이션 API가 아직 없어 프론트에서
            임시로 붙인 테스트 도구입니다.
            {isReportMockEnabled() && " 현재 Mock 모드입니다."}
          </p>
        </div>
        <span
          className={`report-test-health ${
            health.loading ? "pending" : health.ok ? "ok" : "down"
          }`}
        >
          {health.loading
            ? "확인 중…"
            : health.ok
              ? "서비스 연결됨"
              : "서비스 연결 안 됨"}
        </span>
      </header>

      {!health.loading && !health.ok && (
        <p className="report-test-health-detail">{health.detail}</p>
      )}

      <div className="report-test-grid">
        <div className="report-test-field">
          <label>유물 기본정보 (자동, 프로젝트 정보 사용)</label>
          <pre className="report-test-readonly">
            {stringifySample(relicInfo)}
          </pre>
        </div>

        <div className="report-test-field">
          <label htmlFor="rt-guide-result">
            복원 가이드 결과 (guide_result JSON)
          </label>
          <textarea
            id="rt-guide-result"
            value={guideResultText}
            onChange={(event) => setGuideResultText(event.target.value)}
            spellCheck={false}
            rows={10}
          />
          {fieldErrors.guideResult && (
            <p className="report-test-field-error">{fieldErrors.guideResult}</p>
          )}
        </div>

        <div className="report-test-field">
          <label htmlFor="rt-xray-text">X-ray 상태조사 문안 (텍스트)</label>
          <textarea
            id="rt-xray-text"
            value={xrayReportText}
            onChange={(event) => setXrayReportText(event.target.value)}
            rows={4}
          />
        </div>

        <div className="report-test-field">
          <label htmlFor="rt-xray-regions">
            X-ray 확정 이상영역 (xray_regions JSON 배열)
          </label>
          <textarea
            id="rt-xray-regions"
            value={xrayRegionsText}
            onChange={(event) => setXrayRegionsText(event.target.value)}
            spellCheck={false}
            rows={8}
          />
          {fieldErrors.xrayRegions && (
            <p className="report-test-field-error">{fieldErrors.xrayRegions}</p>
          )}
        </div>

        <div className="report-test-field">
          <label htmlFor="rt-pottery">
            육안조사 결과 (pottery_inspection JSON)
          </label>
          <textarea
            id="rt-pottery"
            value={potteryInspectionText}
            onChange={(event) => setPotteryInspectionText(event.target.value)}
            spellCheck={false}
            rows={4}
          />
          {fieldErrors.potteryInspection && (
            <p className="report-test-field-error">
              {fieldErrors.potteryInspection}
            </p>
          )}
        </div>
      </div>

      <div className="report-test-photos">
        <label>
          단계별 첨부 사진 (선택, .docx 변환에만 사용됩니다)
        </label>
        <div className="report-test-photos-controls">
          <select
            value={photoSectionKey}
            onChange={(event) => setPhotoSectionKey(event.target.value)}
          >
            {SECTION_ORDER.map((section) => (
              <option key={section.key} value={section.key}>
                {section.label}
              </option>
            ))}
          </select>
          <input type="file" accept="image/*" multiple onChange={handleAddPhotos} />
        </div>

        {photos.length > 0 && (
          <ul className="report-test-photo-list">
            {photos.map((photo) => (
              <li key={photo.id}>
                <img src={photo.previewUrl} alt={photo.file.name} />
                <div>
                  <strong>{photo.file.name}</strong>
                  <span>
                    {SECTION_ORDER.find((s) => s.key === photo.sectionKey)
                      ?.label || photo.sectionKey}
                  </span>
                </div>
                <button type="button" onClick={() => handleRemovePhoto(photo.id)}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="report-test-actions">
        <button
          type="button"
          className="primary"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? "생성 중…" : "AI 보고서 생성"}
        </button>

        <button
          type="button"
          onClick={handleDownloadDocx}
          disabled={!reportJson || downloading}
        >
          {downloading ? "변환 중…" : "DOCX 다운로드"}
        </button>

        <button
          type="button"
          onClick={handleSaveToMyReports}
          disabled={!reportJson || saved}
        >
          {saved ? "저장 완료" : "내 보고서에 저장"}
        </button>
      </div>

      {generateError && <p className="report-test-error">{generateError}</p>}
      {downloadError && <p className="report-test-error">{downloadError}</p>}

      {reportJson && (
        <div className="report-test-result">
          <div className="report-test-result-head">
            <h3>생성 결과</h3>
            <button type="button" onClick={() => setShowRawJson((v) => !v)}>
              {showRawJson ? "섹션 보기" : "원본 JSON 보기"}
            </button>
          </div>

          {showRawJson ? (
            <pre className="report-test-readonly">
              {JSON.stringify(reportJson, null, 2)}
            </pre>
          ) : (
            <div className="report-test-sections">
              {orderedSections.map((section) => (
                <article key={section.key}>
                  <h4>{section.title}</h4>
                  {section.fields ? (
                    <dl>
                      {Object.entries(section.fields).map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value || "-"}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p>{section.body}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ReportTestPanel;
