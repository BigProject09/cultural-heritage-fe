import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";
import "./XrayPage.css";

import ImageViewer from "../../components/xray/ImageViewer";
import RegionTable from "../../components/xray/RegionTable";
import ReportPanel from "../../components/xray/ReportPanel";
import TaskProgress from "../../components/xray/TaskProgress";
import {
  TARGET,
  checkInspectionHealth,
  createStitchJob,
  detectBatch,
  detectOne,
  downloadStitchResult,
  generateReport,
  waitForStitchJob,
} from "../../services/xrayApi";

/**
 * X-RAY 분석 페이지
 *
 *
 * 전체 흐름
 *
 *   유물 등록 ─ 컬러 전면 사진과 유물 정보를 localStorage 에 저장
 *        ↓
 *   이 페이지 1단계 ─ X-RAY 조각 업로드 → AI 결합 → 결과 확정
 *        ↓
 *   이 페이지 2단계 ─ 결함 분석 → 전문가 검수 → 문안 생성
 *        ↓
 *   처리 전 조사 ─ 검수 결과를 넘겨받아 다음 공정으로
 *
 *
 * 이 페이지가 지키는 원칙
 *
 *   AI 결과는 확정이 아니라 후보다. 결합 배치도, 탐지된
 *   이상영역도 전문가가 검수한 뒤에야 기록이 된다. 그래서
 *   모든 단계에 사람이 확인하고 수정하는 지점을 둔다.
 *
 *   결합 결과는 확정 버튼을 눌러야 다음으로 넘어가고,
 *   탐지 결과는 검수표에서 오탐을 지우고 소견을 적을 수 있다.
 *
 *
 * 서버 구성
 *
 *   결합    Spring(8080) 경유. 수 분에서 수십 분이 걸려
 *           작업을 접수하고 상태를 폴링하는 방식이다.
 *   결함    AI 서비스(8001) 직접 호출. 동기로 끝난다.
 *
 *   VITE_VIA_SPRING 으로 결함 분석도 Spring 경유로 바꿀 수 있다.
 *   자세한 것은 services/xrayApi.js 참고.
 */

const WORKFLOW = {
  STITCH: "STITCH",
  INSPECTION: "INSPECTION",
};

/**
 * Mock 모드 여부.
 *
 * 백엔드 없이 화면만 확인할 때 쓴다. .env 에서
 * VITE_USE_XRAY_MOCK=false 로 두면 실제 API 를 호출한다.
 * 값이 없으면 Mock 이 기본이므로, 실서버 연동 시 반드시
 * false 를 명시해야 한다.
 */
const USE_MOCK = import.meta.env.VITE_USE_XRAY_MOCK !== "false";

/** 결합 작업이 진행 중인 상태들. 버튼 잠금과 진행 표시에 함께 쓴다. */
const STITCH_BUSY = ["UPLOADING", "PENDING", "RUNNING"];

/**
 * 결합 진행 단계.
 *
 * UPLOADING 만 이 화면에서 정하고, 나머지는 서버가 알려주는
 * 작업 상태를 그대로 쓴다.
 */
const STITCH_STEPS = [
  { key: "UPLOADING", label: "업로드" },
  { key: "PENDING", label: "접수" },
  { key: "RUNNING", label: "결합" },
  { key: "COMPLETED", label: "완료" },
];

/**
 * 결함 분석 진행 단계.
 *
 * 결합과 달리 서버가 상태를 알려주지 않는다. 결합본 분석과
 * 조각 분석을 순서대로 호출하므로 이 화면에서 직접 추적한다.
 */
const INSPECTION_STEPS = [
  { key: "ASSEMBLED", label: "결합본 분석" },
  { key: "FRAGMENTS", label: "조각 분석" },
];

function readStoredArtifactInfo() {
  try {
    return JSON.parse(localStorage.getItem("artifactInfo")) || {};
  } catch {
    return {};
  }
}

/**
 * 여러 후보 키 중 값이 있는 것을 찾는다.
 *
 * 유물 정보를 만드는 화면이 여럿이라 키 이름이 통일되어 있지
 * 않다. 서버 연동으로 스키마가 확정되면 이 함수는 없앨 수 있다.
 */
function valueFrom(info, keys, fallback = "") {
  for (const key of keys) {
    if (info?.[key] != null && info[key] !== "") return info[key];
  }
  return fallback;
}

/**
 * 사전 등록된 컬러 2D 이미지를 모은다.
 *
 * 결합 엔진은 이 컬러 완성본의 외곽 형태를 기준으로 조각을
 * 회전 이동하여 배치한다. 따라서 이 이미지가 없으면 결합
 * 자체를 시작할 수 없다.
 */
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

/**
 * 어떤 형태로 전달됐든 업로드 가능한 File 로 바꾼다.
 *
 * 유물 등록 화면은 사진을 data URL 문자열로 저장한다.
 * blob URL 은 새로고침하면 무효가 되어 이후 단계에서 쓸 수
 * 없기 때문이다. 문자열인 경우 fetch 로 가져와 File 을 만든다.
 */
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
    throw new Error(
      `사전 등록된 2D 이미지를 불러오지 못했습니다. (HTTP ${response.status})`,
    );
  }

  const blob = await response.blob();
  const extension = blob.type.includes("jpeg") ? "jpg" : "png";
  return new File([blob], `artifact-color-${index + 1}.${extension}`, {
    type: blob.type || "image/png",
  });
}

/**
 * 검수표에 미리 채워 넣을 소견 초안.
 *
 * 전문가가 지우거나 고쳐 쓰는 출발점이다. 결합본에서 나온
 * 영역과 원본 조각에서 나온 영역은 확인할 내용이 다르므로
 * 문구를 나눈다.
 *
 * 결합본에서만 보이는 영역은 실제 손상일 수도 있고 조각을
 * 이어 붙인 자리일 수도 있어, 원본 조각과 대조해야 한다.
 */
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

  /**
   * 유물 정보.
   *
   * 이전 화면이 넘겨준 값을 먼저 보고, 없으면 유물 등록
   * 단계에서 저장한 값을 읽는다. 새로고침이나 직접 접근으로
   * 넘겨받은 값이 사라져도 동작하게 하려는 것이다.
   */
  const artifactInfo = useMemo(
    () => location.state?.artifactInfo || readStoredArtifactInfo(),
    [location.state],
  );

  const artifactId = String(
    valueFrom(
      artifactInfo,
      ["artifactId", "relicId", "id", "taskId"],
      location.state?.artifactId || (USE_MOCK ? "artifact-test-001" : ""),
    ),
  );
  const artifactType = String(
    valueFrom(
      artifactInfo,
      ["artifactType", "relicType", "type", "name"],
      USE_MOCK ? "테스트 유물" : "",
    ),
  );
  const material = String(
    valueFrom(
      artifactInfo,
      ["material", "relicMaterial"],
      USE_MOCK ? "테스트 재질" : "",
    ),
  );
  const colorSources = useMemo(
    () => collectColorSources(artifactInfo, location.state),
    [artifactInfo, location.state],
  );

  // 1단계 조각 결합, 2단계 결함 분석·검수
  const [workflow, setWorkflow] = useState(WORKFLOW.STITCH);

  const [fragmentFiles, setFragmentFiles] = useState([]);
  const [assembledFile, setAssembledFile] = useState(null);
  const [assembledPreview, setAssembledPreview] = useState("");

  // 결합 상태. STITCH_STEPS 의 key 와 FAILED, IDLE 을 갖는다.
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

  // 결함 분석의 현재 단계. INSPECTION_STEPS 의 key 를 갖는다.
  const [inspectionStep, setInspectionStep] = useState(null);

  const [report, setReport] = useState("");
  const [reportMeta, setReportMeta] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStyle, setReportStyle] = useState("summary");

  // AI 서비스 상태를 미리 확인해 두고 결함 분석 버튼 활성화에 쓴다
  useEffect(() => {
    checkInspectionHealth()
      .then(setHealth)
      .catch((error) => setHealth({ ok: false, error: error.message }));
  }, []);

  /**
   * 결합본 미리보기 URL 관리.
   *
   * createObjectURL 로 만든 주소는 직접 해제하지 않으면
   * 메모리에 남는다. 결합을 여러 번 시도하면 그만큼 쌓이므로
   * 정리 함수에서 반드시 해제한다.
   */
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

    // 조각을 다시 고르면 이전 결합 결과는 더 이상 유효하지 않다
    setFragmentFiles(files);
    setAssembledFile(null);
    setStitchStatus("IDLE");
    setStitchMessage("");
  }

  /**
   * 1단계 - AI 조각 결합.
   *
   * 결합은 조각 수에 따라 수 분에서 수십 분이 걸린다. 그래서
   * 작업을 접수하고 jobId 를 먼저 받은 뒤, 완료될 때까지
   * 상태를 주기적으로 확인한다.
   */
  async function runStitch() {
    // 결합 엔진이 요구하는 입력을 미리 확인한다.
    // 서버까지 다녀와서 실패하면 사용자가 원인을 알기 어렵다.
    if (!USE_MOCK && !artifactId) {
      setStitchMessage(
        "유물 ID가 없습니다. 메인 단계의 유물 정보를 확인하세요.",
      );
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
            colorSources.map((source, index) => sourceToFile(source, index)),
          );

      // 작업 접수. 결합을 기다리지 않고 jobId 를 바로 받는다.
      const created = await createStitchJob({
        artifactId,
        colorFiles,
        xrayFiles: fragmentFiles,
      });

      setStitchJobId(created.jobId);
      setStitchStatus(created.status || "PENDING");
      setStitchMessage("AI 결합 작업을 시작했습니다.");

      // 완료될 때까지 상태를 확인한다. 진행 상황은 콜백으로 받는다.
      const completed = await waitForStitchJob(created.jobId, (status) => {
        setStitchStatus(status.status);
        setStitchMessage(
          status.status === "RUNNING"
            ? "X-RAY 조각을 결합하고 있습니다."
            : status.message || "결합 작업을 기다리고 있습니다.",
        );
      });

      // 결합본을 File 로 받는다. 이어지는 결함 분석과 문안 생성에
      // 그대로 다시 업로드하므로 File 형태여야 한다.
      const resultFile = await downloadStitchResult(
        completed.jobId,
        `assembled-${artifactId}.png`,
      );

      setAssembledFile(resultFile);
      setViewFile(resultFile);
      setStitchStatus("COMPLETED");
      setStitchMessage(
        "결합이 완료되었습니다. 결과를 확인한 뒤 다음 단계로 이동하세요.",
      );
    } catch (error) {
      setStitchStatus("FAILED");
      setStitchMessage(`결합 실패: ${error.message}`);
    }
  }

  /**
   * 결합 결과 확정.
   *
   * 사람이 확인하고 넘기는 지점이다. AI 결합 결과를 그대로
   * 다음 단계로 흘리지 않는다.
   */
  function confirmStitch() {
    if (!assembledFile) return;

    setWorkflow(WORKFLOW.INSPECTION);
    setViewFile(assembledFile);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * 2단계 - 이상영역 탐지.
   *
   * 결합본과 원본 조각을 함께 분석한다. 두 번 나눠 보는 이유는,
   * 결합본에서만 나타난 영역이 실제 손상인지 조각을 이어 붙인
   * 자리인지 대조해야 하기 때문이다.
   *
   * 서버가 진행 상태를 알려주지 않으므로 단계를 직접 표시한다.
   */
  async function runInspection() {
    if (!assembledFile) {
      setInspectionMessage("확정된 결합 결과가 없습니다.");
      return;
    }

    setInspectionLoading(true);
    setInspectionDone(false);
    setInspectionMessage("");
    setRegions([]);
    setSummaries([]);
    setElapsed(null);
    setReport("");
    setReportMeta(null);

    const startedAt = performance.now();

    try {
      setInspectionStep("ASSEMBLED");
      const assembledResult = await detectOne(
        assembledFile,
        TARGET.ASSEMBLED,
        confidence,
      );

      setInspectionStep("FRAGMENTS");
      const fragmentResult = await detectBatch(
        fragmentFiles,
        TARGET.FRAGMENT,
        confidence,
      );

      // 검수표에서 다루기 쉽도록 일련번호와 소견 초안을 붙인다
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
        allRegions.length === 0 ? "탐지된 검토 필요 영역이 없습니다." : "",
      );
    } catch (error) {
      setInspectionMessage(`결함 분석 실패: ${error.message}`);
    } finally {
      setInspectionLoading(false);
      setInspectionStep(null);
    }
  }

  /** 검수 소견 수정 */
  function updateNote(id, note) {
    setRegions((current) =>
      current.map((region) =>
        region.regionId === id ? { ...region, userNote: note } : region,
      ),
    );
  }

  /** 오탐 제외. 지운 영역은 문안에도 반영되지 않는다. */
  function removeRegion(id) {
    setRegions((current) => current.filter((region) => region.regionId !== id));
    if (selectedId === id) setSelectedId(null);
  }

  /**
   * AI 1차 상태조사 문안 생성.
   *
   * 검수를 마친 영역 목록을 근거로 작성한다. 오탐을 지우고
   * 소견을 고친 결과가 그대로 반영되므로, 검수 후에 실행해야
   * 의미가 있다.
   */
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
            colorSources.map((source, index) => sourceToFile(source, index)),
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

  /**
   * X-RAY 작업 완료.
   *
   * 검수 결과를 처리 전 조사 화면으로 넘긴다. 문안은 전문가가
   * 고친 최종본이 전달된다.
   */
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

  const stitchBusy = STITCH_BUSY.includes(stitchStatus);

  // 결합본과 원본 조각을 한 목록으로 묶어 탭에 쓴다
  const allInspectionFiles = [assembledFile, ...fragmentFiles].filter(Boolean);

  // 지금 보고 있는 이미지의 영역만 화면에 그린다.
  // 파일명이 영역과 이미지를 잇는 키다.
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

        {/* ── 1단계 조각 결합 ─────────────────────────── */}
        {workflow === WORKFLOW.STITCH && (
          <>
            <section className="xray-panel">
              <h2>1. X-RAY 조각 업로드</h2>
              <p className="xray-help">
                결합할 조각 이미지를 모두 선택하세요. 유물 정보와 컬러 2D
                이미지는 메인 단계에서 전달받습니다.
              </p>

              <label className="xray-upload">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleFragmentChange}
                  disabled={stitchBusy}
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
                    <li key={`${file.name}-${file.lastModified}`}>
                      {file.name}
                    </li>
                  ))}
                </ul>
              )}

              <button
                className="xray-primary"
                onClick={runStitch}
                disabled={fragmentFiles.length < 2 || stitchBusy}
              >
                {stitchBusy ? "AI 결합 진행 중..." : "AI 결합 시작"}
              </button>

              {/*
                진행 중에는 아래 TaskProgress 가 상태를 보여주므로
                여기서는 대기 전후의 안내만 표시한다. 같은 문구를
                두 곳에 겹쳐 내보내지 않기 위함이다.
              */}
              {stitchMessage && !stitchBusy && (
                <div
                  className={`xray-message ${stitchStatus === "FAILED" ? "error" : ""}`}
                >
                  {stitchMessage}
                </div>
              )}

              {/*
                결합은 십 분을 넘기기도 한다. 남은 시간을 알 수
                없으므로 단계와 경과 시간만 보여준다.
              */}
              <TaskProgress
                active={stitchBusy}
                headline={stitchMessage || "X-RAY 조각을 결합하고 있습니다"}
                detail={`조각 ${fragmentFiles.length}장 · 컬러 기준 ${colorSources.length}장`}
                steps={STITCH_STEPS}
                currentKey={stitchStatus}
                note="결합은 조각 수에 따라 수 분 이상 걸립니다."
                longNote="조각 수가 많으면 수십 분이 걸립니다. 창을 닫으면 결과를 받을 수 없습니다."
              />
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
                  <button
                    className="xray-secondary"
                    onClick={runStitch}
                    disabled={stitchBusy}
                  >
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

        {/* ── 2단계 결함 분석·검수 ─────────────────────── */}
        {workflow === WORKFLOW.INSPECTION && (
          <>
            <section className="xray-panel">
              <div className="panel-title-row">
                <div>
                  <h2>1. 결함 분석 실행</h2>
                  <p className="xray-help">
                    결합 완료본과 원본 조각을 함께 분석합니다. AI 결과는 결함
                    확정이 아닌 검토 후보입니다.
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

              {/*
                신뢰도 임계값.
                낮추면 후보가 늘고 오탐도 늘어난다. 검수 부담과
                놓치는 영역 사이를 전문가가 조절하는 값이다.
              */}
              <label className="confidence-field">
                <span>신뢰도 임계값: {confidence.toFixed(2)}</span>
                <input
                  type="range"
                  min="0.03"
                  max="0.6"
                  step="0.01"
                  value={confidence}
                  onChange={(event) =>
                    setConfidence(Number(event.target.value))
                  }
                  disabled={inspectionLoading}
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

              {inspectionMessage && !inspectionLoading && (
                <div className="xray-message">{inspectionMessage}</div>
              )}

              <TaskProgress
                active={inspectionLoading}
                headline="이상영역을 탐지하고 있습니다"
                detail={`결합본 1장 · 원본 조각 ${fragmentFiles.length}장`}
                steps={INSPECTION_STEPS}
                currentKey={inspectionStep}
                note="조각 수에 따라 1분에서 4분이 걸립니다."
              />

              {elapsed && !inspectionLoading && (
                <div className="xray-message subtle">
                  소요 {elapsed}초 · 검토 후보 {regions.length}건
                </div>
              )}
            </section>

            {inspectionDone && regions.length > 0 && (
              <>
                <section className="xray-panel">
                  <h2>2. 탐지 결과</h2>

                  {/*
                    이미지별 탭. 괄호 안 숫자는 그 이미지에서
                    탐지된 영역 수다. 결합본과 조각을 오가며
                    같은 위치인지 대조할 때 쓴다.
                  */}
                  <div className="image-tabs">
                    {allInspectionFiles.map((file) => {
                      const count = regions.filter(
                        (region) => region.fileName === file.name,
                      ).length;

                      return (
                        <button
                          key={`${file.name}-${file.lastModified}`}
                          className={
                            viewFile?.name === file.name ? "active" : ""
                          }
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

                  {/*
                    표에서 행을 고르면 해당 이미지로 전환하고
                    그 영역을 강조한다. 검수 중 위치를 눈으로
                    확인할 수 있어야 하기 때문이다.
                  */}
                  <RegionTable
                    regions={regions}
                    selectedId={selectedId}
                    onSelect={(id) => {
                      setSelectedId(id);

                      const region = regions.find(
                        (item) => item.regionId === id,
                      );
                      const file = allInspectionFiles.find(
                        (item) => item.name === region?.fileName,
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
              <>
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

                {/*
                  문안 생성은 단계를 나눌 수 없는 한 번의 호출이라
                  경과 시간만 보여준다.
                */}
                <TaskProgress
                  active={reportLoading}
                  headline="AI 1차 상태조사 문안을 작성하고 있습니다"
                  detail={`검수 완료 영역 ${regions.length}건`}
                  note="30초에서 2분이 걸립니다."
                />
              </>
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
