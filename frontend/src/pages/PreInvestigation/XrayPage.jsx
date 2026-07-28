import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";
import "./XrayPage.css";

import ImageViewer from "./ImageViewer";
import RegionTable from "./RegionTable";
import ReportPanel from "./ReportPanel";
import {
  TARGET,
  checkInspectionHealth,
  createStitchJob,
  detectBatch,
  detectOne,
  downloadStitchResult,
  generateReport,
  waitForStitchJob,
} from "./xrayApi";

const WORKFLOW = {
  STITCH: "STITCH",
  INSPECTION: "INSPECTION",
};

const USE_MOCK = import.meta.env.VITE_USE_XRAY_MOCK !== "false";

function readStoredArtifactInfo() {
  try {
    return JSON.parse(localStorage.getItem("artifactInfo")) || {};
  } catch {
    return {};
  }
}

function valueFrom(info, keys, fallback = "") {
  for (const key of keys) {
    if (info?.[key] != null && info[key] !== "") return info[key];
  }
  return fallback;
}

function collectColorSources(info, locationState) {
  const candidates = [
    locationState?.colorFiles,
    locationState?.rgbFiles,
    locationState?.colorImages,
    info?.colorFiles,
    info?.rgbFiles,
    info?.colorImages,
    info?.relicPhoto,
    info?.images,
    info?.image,
  ];

  return candidates
    .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
    .filter(Boolean);
}

async function sourceToFile(source, index) {
  if (source instanceof File) return source;

  if (source instanceof Blob) {
    return new File([source], `artifact-color-${index + 1}.png`, {
      type: source.type || "image/png",
    });
  }

  if (typeof source === "object") {
    const nested = source.file || source.url || source.imageUrl || source.src;
    if (nested) return sourceToFile(nested, index);
  }

  if (typeof source !== "string") {
    throw new Error("사전 등록된 2D 이미지 형식을 확인할 수 없습니다.");
  }

  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`사전 등록된 2D 이미지를 불러오지 못했습니다. (HTTP ${response.status})`);
  }

  const blob = await response.blob();
  const extension = blob.type.includes("jpeg") ? "jpg" : "png";
  return new File([blob], `artifact-color-${index + 1}.${extension}`, {
    type: blob.type || "image/png",
  });
}

function defaultNote(region) {
  if (region.analysisTarget === TARGET.ASSEMBLED) {
    return `${region.position}에서 탐지된 검토 필요 영역. 결합 경계, 파손 간격, 보간 흔적 여부 확인 필요.`;
  }

  return `원본 조각의 ${region.position}에서 탐지된 검토 필요 영역. 결합 이전부터 존재한 특징인지 확인 필요.`;
}

export default function XrayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setPreInvestigation } = useDisassembly();

  const approvedFlow = location.state?.approvedFlow || [];
  const artifactInfo = useMemo(
    () => location.state?.artifactInfo || readStoredArtifactInfo(),
    [location.state]
  );

  const artifactId = String(
    valueFrom(
      artifactInfo,
      ["artifactId", "relicId", "id", "taskId"],
      location.state?.artifactId || (USE_MOCK ? "artifact-test-001" : "")
    )
  );
  const artifactType = String(
    valueFrom(
      artifactInfo,
      ["artifactType", "relicType", "type", "name"],
      USE_MOCK ? "테스트 유물" : ""
    )
  );
  const material = String(
    valueFrom(
      artifactInfo,
      ["material", "relicMaterial"],
      USE_MOCK ? "테스트 재질" : ""
    )
  );
  const colorSources = useMemo(
    () => collectColorSources(artifactInfo, location.state),
    [artifactInfo, location.state]
  );

  const [workflow, setWorkflow] = useState(WORKFLOW.STITCH);
  const [fragmentFiles, setFragmentFiles] = useState([]);
  const [assembledFile, setAssembledFile] = useState(null);
  const [assembledPreview, setAssembledPreview] = useState("");

  const [stitchStatus, setStitchStatus] = useState("IDLE");
  const [stitchMessage, setStitchMessage] = useState("");
  const [stitchJobId, setStitchJobId] = useState("");

  const [health, setHealth] = useState(null);
  const [confidence, setConfidence] = useState(0.08);
  const [regions, setRegions] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [viewFile, setViewFile] = useState(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionDone, setInspectionDone] = useState(false);
  const [inspectionMessage, setInspectionMessage] = useState("");
  const [elapsed, setElapsed] = useState(null);

  const [report, setReport] = useState("");
  const [reportMeta, setReportMeta] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStyle, setReportStyle] = useState("summary");

  useEffect(() => {
    checkInspectionHealth()
      .then(setHealth)
      .catch((error) => setHealth({ ok: false, error: error.message }));
  }, []);

  useEffect(() => {
    if (!assembledFile) {
      setAssembledPreview("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(assembledFile);
    setAssembledPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [assembledFile]);

  function handleFragmentChange(event) {
    const files = Array.from(event.target.files || []);
    setFragmentFiles(files);
    setAssembledFile(null);
    setStitchStatus("IDLE");
    setStitchMessage("");
  }

  async function runStitch() {
    if (!USE_MOCK && !artifactId) {
      setStitchMessage("유물 ID가 없습니다. 메인 단계의 유물 정보를 확인하세요.");
      return;
    }

    if (!USE_MOCK && colorSources.length === 0) {
      setStitchMessage("사전에 등록된 컬러 2D 이미지가 없습니다.");
      return;
    }

    if (fragmentFiles.length < 2) {
      setStitchMessage("결합할 X-RAY 조각 이미지를 2장 이상 선택하세요.");
      return;
    }

    setStitchStatus("UPLOADING");
    setStitchMessage("입력 이미지를 준비하고 있습니다.");
    setAssembledFile(null);

    try {
      const colorFiles = USE_MOCK
        ? []
        : await Promise.all(
            colorSources.map((source, index) => sourceToFile(source, index))
          );

      const created = await createStitchJob({
        artifactId,
        colorFiles,
        xrayFiles: fragmentFiles,
      });

      setStitchJobId(created.jobId);
      setStitchStatus(created.status || "PENDING");
      setStitchMessage("AI 결합 작업을 시작했습니다.");

      const completed = await waitForStitchJob(created.jobId, (status) => {
        setStitchStatus(status.status);
        setStitchMessage(
          status.status === "RUNNING"
            ? "X-RAY 조각을 결합하고 있습니다."
            : status.message || "결합 작업을 기다리고 있습니다."
        );
      });

      const resultFile = await downloadStitchResult(
        completed.jobId,
        `assembled-${artifactId}.png`
      );

      setAssembledFile(resultFile);
      setViewFile(resultFile);
      setStitchStatus("COMPLETED");
      setStitchMessage("결합이 완료되었습니다. 결과를 확인한 뒤 다음 단계로 이동하세요.");
    } catch (error) {
      setStitchStatus("FAILED");
      setStitchMessage(`결합 실패: ${error.message}`);
    }
  }

  function confirmStitch() {
    if (!assembledFile) return;
    setWorkflow(WORKFLOW.INSPECTION);
    setViewFile(assembledFile);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function runInspection() {
    if (!assembledFile) {
      setInspectionMessage("확정된 결합 결과가 없습니다.");
      return;
    }

    setInspectionLoading(true);
    setInspectionDone(false);
    setInspectionMessage("결합 완료본을 분석하고 있습니다.");
    setRegions([]);
    setSummaries([]);
    setElapsed(null);
    setReport("");
    setReportMeta(null);

    const startedAt = performance.now();

    try {
      const assembledResult = await detectOne(
        assembledFile,
        TARGET.ASSEMBLED,
        confidence
      );
      const fragmentResult = await detectBatch(
        fragmentFiles,
        TARGET.FRAGMENT,
        confidence
      );

      const allRegions = [
        ...(assembledResult.regions || []),
        ...(fragmentResult.regions || []),
      ].map((region, index) => ({
        ...region,
        regionId: `R-${String(index + 1).padStart(3, "0")}`,
        userNote: defaultNote(region),
      }));

      const allSummaries = [
        ...(assembledResult.summary ? [assembledResult.summary] : []),
        ...(fragmentResult.summaries || []),
        ...(fragmentResult.summary ? [fragmentResult.summary] : []),
      ];

      setRegions(allRegions);
      setSummaries(allSummaries);
      setViewFile(assembledFile);
      setInspectionDone(true);
      setElapsed(((performance.now() - startedAt) / 1000).toFixed(1));
      setInspectionMessage(
        allRegions.length === 0
          ? "탐지된 검토 필요 영역이 없습니다."
          : ""
      );
    } catch (error) {
      setInspectionMessage(`결함 분석 실패: ${error.message}`);
    } finally {
      setInspectionLoading(false);
    }
  }

  function updateNote(id, note) {
    setRegions((current) =>
      current.map((region) =>
        region.regionId === id ? { ...region, userNote: note } : region
      )
    );
  }

  function removeRegion(id) {
    setRegions((current) => current.filter((region) => region.regionId !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function runReport() {
    if (!inspectionDone) {
      setInspectionMessage("먼저 결함 분석을 실행하세요.");
      return;
    }

    setReportLoading(true);
    setInspectionMessage("");

    try {
      const rgbFiles = USE_MOCK
        ? []
        : await Promise.all(
            colorSources.map((source, index) => sourceToFile(source, index))
          );
      const result = await generateReport({
        regions,
        assembled: assembledFile,
        fragments: fragmentFiles,
        rgbImages: rgbFiles,
        artifactType,
        material,
        reportStyle,
      });

      setReport(result.report || "");
      setReportMeta({
        style: result.style,
        charCount: result.charCount,
        detailCount: result.detailCount,
        totalRegionCount: result.totalRegionCount,
        model: result.model,
      });
    } catch (error) {
      setInspectionMessage(`문안 생성 실패: ${error.message}`);
    } finally {
      setReportLoading(false);
    }
  }

  function handleComplete() {
    if (!inspectionDone) return;

    setPreInvestigation((previous) => ({
      ...previous,
      xray: true,
    }));

    navigate("/pre-investigation", {
      state: {
        approvedFlow,
        artifactInfo,
        xrayResult: {
          stitchJobId,
          regionCount: regions.length,
          regions,
          summaries,
          report,
          reportStyle,
        },
      },
    });
  }

  const allInspectionFiles = [assembledFile, ...fragmentFiles].filter(Boolean);
  const visibleRegions = viewFile
    ? regions.filter((region) => region.fileName === viewFile.name)
    : [];

  return (
    <div className="xray-page">
      <div className="xray-container">
        <header className="xray-header">
          <div>
            <h1 className="xray-title">X-RAY 분석</h1>
            <p>
              X-RAY 조각 결합 후 결함 후보를 확인하고 전문가 검수를 진행합니다.
            </p>
          </div>

          <div className="xray-steps" aria-label="X-RAY 작업 단계">
            <span className={workflow === WORKFLOW.STITCH ? "active" : "done"}>
              1. 조각 결합
            </span>
            <span className={workflow === WORKFLOW.INSPECTION ? "active" : ""}>
              2. 결함 분석·검수
            </span>
          </div>
        </header>

        <section className="artifact-summary">
          <div>
            <span>유물 ID</span>
            <strong>{artifactId || "정보 없음"}</strong>
          </div>
          <div>
            <span>유물 유형</span>
            <strong>{artifactType || "정보 없음"}</strong>
          </div>
          <div>
            <span>재질</span>
            <strong>{material || "정보 없음"}</strong>
          </div>
          <div>
            <span>사전 등록 이미지</span>
            <strong>{colorSources.length}장</strong>
          </div>
        </section>

        {workflow === WORKFLOW.STITCH && (
          <>
            <section className="xray-panel">
              <h2>1. X-RAY 조각 업로드</h2>
              <p className="xray-help">
                결합할 조각 이미지를 모두 선택하세요. 유물 정보와 컬러 2D 이미지는
                메인 단계에서 전달받습니다.
              </p>

              <label className="xray-upload">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleFragmentChange}
                  disabled={["UPLOADING", "PENDING", "RUNNING"].includes(stitchStatus)}
                />
                <span>
                  {fragmentFiles.length > 0
                    ? `${fragmentFiles.length}장 선택됨`
                    : "X-RAY 조각 이미지 선택"}
                </span>
              </label>

              {fragmentFiles.length > 0 && (
                <ul className="file-list">
                  {fragmentFiles.map((file) => (
                    <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                  ))}
                </ul>
              )}

              <button
                className="xray-primary"
                onClick={runStitch}
                disabled={
                  fragmentFiles.length < 2 ||
                  ["UPLOADING", "PENDING", "RUNNING"].includes(stitchStatus)
                }
              >
                {["UPLOADING", "PENDING", "RUNNING"].includes(stitchStatus)
                  ? "AI 결합 진행 중..."
                  : "AI 결합 시작"}
              </button>

              {stitchMessage && (
                <div className={`xray-message ${stitchStatus === "FAILED" ? "error" : ""}`}>
                  {stitchMessage}
                </div>
              )}
            </section>

            {assembledPreview && (
              <section className="xray-panel">
                <h2>2. 결합 결과 확인</h2>
                <p className="xray-help">
                  현재 1차 통합본에서는 조각별 수동 보정 없이 AI 결합 결과를
                  확인하고 확정합니다.
                </p>
                <div className="assembled-preview">
                  <img src={assembledPreview} alt="X-RAY 결합 결과" />
                </div>
                <div className="xray-actions">
                  <button className="xray-secondary" onClick={runStitch}>
                    다시 결합
                  </button>
                  <button className="xray-primary" onClick={confirmStitch}>
                    결합 결과 확정
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {workflow === WORKFLOW.INSPECTION && (
          <>
            <section className="xray-panel">
              <div className="panel-title-row">
                <div>
                  <h2>1. 결함 분석 실행</h2>
                  <p className="xray-help">
                    결합 완료본과 원본 조각을 함께 분석합니다. AI 결과는 결함 확정이
                    아닌 검토 후보입니다.
                  </p>
                </div>
                <span className={`health-badge ${health?.ok ? "ok" : "fail"}`}>
                  {health === null
                    ? "AI 서비스 확인 중"
                    : health.ok
                    ? "AI 서비스 정상"
                    : "AI 서비스 연결 실패"}
                </span>
              </div>

              <label className="confidence-field">
                <span>신뢰도 임계값: {confidence.toFixed(2)}</span>
                <input
                  type="range"
                  min="0.03"
                  max="0.6"
                  step="0.01"
                  value={confidence}
                  onChange={(event) => setConfidence(Number(event.target.value))}
                />
              </label>

              <div className="xray-actions left">
                <button
                  className="xray-secondary"
                  onClick={() => setWorkflow(WORKFLOW.STITCH)}
                  disabled={inspectionLoading}
                >
                  결합 단계로 돌아가기
                </button>
                <button
                  className="xray-primary"
                  onClick={runInspection}
                  disabled={inspectionLoading || !health?.ok}
                >
                  {inspectionLoading ? "결함 분석 중..." : "결함 분석 실행"}
                </button>
              </div>

              {inspectionMessage && <div className="xray-message">{inspectionMessage}</div>}
              {elapsed && (
                <div className="xray-message subtle">
                  소요 {elapsed}초 · 검토 후보 {regions.length}건
                </div>
              )}
            </section>

            {inspectionDone && regions.length > 0 && (
              <>
                <section className="xray-panel">
                  <h2>2. 탐지 결과</h2>
                  <div className="image-tabs">
                    {allInspectionFiles.map((file) => {
                      const count = regions.filter(
                        (region) => region.fileName === file.name
                      ).length;
                      return (
                        <button
                          key={`${file.name}-${file.lastModified}`}
                          className={viewFile?.name === file.name ? "active" : ""}
                          onClick={() => setViewFile(file)}
                        >
                          {file.name} ({count})
                        </button>
                      );
                    })}
                  </div>
                  <ImageViewer
                    file={viewFile}
                    regions={visibleRegions}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                </section>

                <section className="xray-panel">
                  <h2>3. 전문가 검수</h2>
                  <RegionTable
                    regions={regions}
                    selectedId={selectedId}
                    onSelect={(id) => {
                      setSelectedId(id);
                      const region = regions.find((item) => item.regionId === id);
                      const file = allInspectionFiles.find(
                        (item) => item.name === region?.fileName
                      );
                      if (file) setViewFile(file);
                    }}
                    onNoteChange={updateNote}
                    onRemove={removeRegion}
                  />
                </section>
              </>
            )}

            {inspectionDone && (
              <ReportPanel
                report={report}
                meta={reportMeta}
                style={reportStyle}
                onStyleChange={setReportStyle}
                loading={reportLoading}
                disabled={!health?.llmEnabled}
                disabledReason="문안 생성 서비스가 비활성화되어 있습니다."
                onGenerate={runReport}
                onChange={setReport}
              />
            )}

            <div className="complete-area">
              <button
                className="complete-btn"
                onClick={handleComplete}
                disabled={!inspectionDone}
              >
                X-RAY 작업 완료
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
