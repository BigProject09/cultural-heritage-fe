import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";
import "./XrayPage.css";

import StitchEditor from "../../components/xray/StitchEditor";
import ImageViewer from "../../components/xray/ImageViewer";
import ReportPanel from "../../components/xray/ReportPanel";
import TaskProgress from "../../components/xray/TaskProgress";
import {
  TARGET,
  checkInspectionHealth,
  createStitchJob,
  detectBatch,
  detectOne,
  downloadStitchResult,
  fetchStitchLayout,
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
  REVIEW: "REVIEW",
};

const WORKFLOW_STEPS = [
  ["이미지 등록", "X-RAY 조각 선택"],
  ["조각 결합", "AI 배치 결과 확인"],
  ["영역 검수", "정상 후보만 제외"],
  ["문안 작성", "조사 초안 편집"],
  ["최종 검토", "전체 결과 확인"],
];

/**
 * Mock 모드 여부.
 *
 * 백엔드 없이 화면만 확인할 때 쓴다. .env 에서
 * VITE_USE_XRAY_MOCK=true 로 두면 서버를 부르지 않고
 * 가짜 응답으로 동작한다.
 *
 * 값이 없으면 실제 API 를 호출한다. 팀 저장소에서는 실서버가
 * 기본이어야 안전하기 때문이다. Mock 은 명시적으로 켜야 한다.
 *
 * services/xrayApi.js 도 같은 규칙을 쓴다. 두 곳의 판정이
 * 어긋나면, 화면은 Mock 이라 판단해 컬러 이미지를 비워 보내는데
 * 실제 API 가 호출되어 결합이 실패한다.
 */
const USE_MOCK = import.meta.env.VITE_USE_XRAY_MOCK === "true";

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

function UploadThumbnail({ file, index, disabled, onRemove }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <article className="upload-thumbnail">
      <div className="upload-thumbnail-image">
        {url && <img src={url} alt={`X-RAY 조각 ${index + 1}`} />}
        <span>{String(index + 1).padStart(2, "0")}</span>
      </div>
      <div className="upload-thumbnail-info">
        <strong title={file.name}>{file.name}</strong>
        <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
      </div>
      <button
        type="button"
        className="icon-button"
        aria-label={`${file.name} 삭제`}
        onClick={() => onRemove(file)}
        disabled={disabled}
      >
        ×
      </button>
    </article>
  );
}

function sourceValue(source) {
  if (!source || typeof source !== "object") return source;
  if (source instanceof Blob) return source;

  return source.file || source.url || source.imageUrl || source.src || "";
}

function ResultPreviewImage({ source, alt }) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const resolved = sourceValue(source);

    if (resolved instanceof Blob) {
      const objectUrl = URL.createObjectURL(resolved);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setPreviewUrl(typeof resolved === "string" ? resolved : "");
    return undefined;
  }, [source]);

  if (!previewUrl) {
    return (
      <div className="result-image-empty">
        <span aria-hidden="true">＋</span>
        <strong>등록된 이미지가 없습니다</strong>
      </div>
    );
  }

  return <img src={previewUrl} alt={alt} />;
}

function StepIcon({ number, done }) {
  return (
    <span className="workflow-step-icon" aria-hidden="true">
      {done ? "✓" : number}
    </span>
  );
}

export default function XrayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setPreInvestigation } = useDisassembly();
  const fileInputRef = useRef(null);
  const reportSectionRef = useRef(null);

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

  /**
   * 조각별 배치 정보.
   *
   * 수동 보정 화면이 이 값으로 조각을 개별 배치한다.
   * 서버가 아직 제공하지 않으면 빈 배열이 오고, 그때는
   * 보정 버튼을 내보내지 않는다.
   */
  const [stitchLayout, setStitchLayout] = useState(null);

  /** 보정 화면 표시 여부 */
  const [editingPlacement, setEditingPlacement] = useState(false);

  /**
   * 사람이 바로잡은 조각별 변환행렬.
   *
   * 다음 단계로 넘길 때 함께 전달해, 어떤 조각을 손댔는지
   * 기록에 남긴다.
   */
  const [correctedFragments, setCorrectedFragments] = useState(null);

  const [health, setHealth] = useState(null);
  const [confidence, setConfidence] = useState(0.08);
  const [regions, setRegions] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [excludedRegions, setExcludedRegions] = useState([]);
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
  const [isDragging, setIsDragging] = useState(false);
  const [lastRemoved, setLastRemoved] = useState(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

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
    setStitchLayout(null);
    setCorrectedFragments(null);
  }

  function acceptFragmentFiles(files) {
    const images = Array.from(files || []).filter((file) =>
      ["image/png", "image/jpeg", "image/webp"].includes(file.type),
    );

    if (images.length === 0) {
      setStitchMessage("PNG, JPG, WEBP 형식의 이미지를 선택하세요.");
      return;
    }

    setFragmentFiles(images);
    setAssembledFile(null);
    setStitchStatus("IDLE");
    setStitchMessage("");
    setStitchLayout(null);
    setCorrectedFragments(null);
  }

  function removeFragment(target) {
    setFragmentFiles((current) => current.filter((file) => file !== target));
    setAssembledFile(null);
    setStitchStatus("IDLE");
    setStitchMessage("");
    setStitchLayout(null);
    setCorrectedFragments(null);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    if (!stitchBusy) acceptFragmentFiles(event.dataTransfer.files);
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
      // 조각별 배치 정보를 함께 받아 둔다.
      // 실패해도 결합 결과 자체는 쓸 수 있어야 하므로
      // 예외를 밖으로 던지지 않는다.
      const layout = await fetchStitchLayout(completed.jobId);
      setStitchLayout(layout);
      setCorrectedFragments(null);
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
   * 수동 보정 결과를 받는다.
   *
   * 화면에서 그린 그대로를 결합본으로 삼는다. 조각을 옮긴
   * 위치가 곧 결과여야 이후 분석과 어긋나지 않는다.
   */
  function applyCorrection({ file, fragments: corrected, movedCount }) {
    setAssembledFile(file);
    setViewFile(file);
    setCorrectedFragments(corrected);
    setEditingPlacement(false);

    setStitchMessage(
      movedCount > 0
        ? `조각 ${movedCount}개를 보정했습니다. 결과를 확인한 뒤 확정하세요.`
        : "보정 없이 저장했습니다.",
    );
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
    setExcludedRegions([]);
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
        // AI가 탐지한 영역은 우선 이상 영역으로 포함한다.
        // 작업자는 정상으로 확인한 오탐만 제외하면 된다.
        reviewDecision: "damage",
      }));

      const allSummaries = [
        ...(assembledResult.summary ? [assembledResult.summary] : []),
        ...(fragmentResult.summaries || []),
        ...(fragmentResult.summary ? [fragmentResult.summary] : []),
      ];

      setRegions(allRegions);
      setSummaries(allSummaries);
      const firstRegion = allRegions[0];
      const firstFile = [assembledFile, ...fragmentFiles].find(
        (file) => file?.name === firstRegion?.fileName,
      );
      setSelectedId(firstRegion?.regionId || null);
      setViewFile(firstFile || assembledFile);
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

  /** 정상 영역 제외. 제외한 영역은 문안 생성 대상에서 빠진다. */
  function removeRegion(id) {
    setRegions((current) => {
      const index = current.findIndex((region) => region.regionId === id);
      const region = current[index];
      if (region) {
        const excludedRegion = {
          ...region,
          reviewDecision: "normal",
          excludedAt: new Date().toISOString(),
        };
        setExcludedRegions((excluded) => [...excluded, excludedRegion]);
        setLastRemoved({ region, index });
      }

      const next = current.filter((item) => item.regionId !== id);
      if (selectedId === id) {
        const fallback = next[Math.min(index, next.length - 1)];
        setSelectedId(fallback?.regionId || null);
        const file = [assembledFile, ...fragmentFiles].find(
          (item) => item?.name === fallback?.fileName,
        );
        if (file) setViewFile(file);
      }
      return next;
    });
  }

  function undoRemove() {
    if (!lastRemoved) return;
    setRegions((current) => {
      const next = [...current];
      next.splice(lastRemoved.index, 0, lastRemoved.region);
      return next;
    });
    setSelectedId(lastRemoved.region.regionId);
    const file = [assembledFile, ...fragmentFiles].find(
      (item) => item?.name === lastRemoved.region.fileName,
    );
    if (file) setViewFile(file);
    setExcludedRegions((current) =>
      current.filter(
        (region) => region.regionId !== lastRemoved.region.regionId,
      ),
    );
    setLastRemoved(null);
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
    if (!inspectionDone || !report.trim()) return;

    setPreInvestigation((previous) => ({
      ...previous,
      xray: true,
    }));

    navigate("/pre-investigation", {
      state: {
        approvedFlow,
        artifactInfo,
        xrayResult: {
          status: "COMPLETED",
          completedAt: new Date().toISOString(),
          stitchJobId,
          regionCount: regions.length,
          regions,
          excludedRegionCount: excludedRegions.length,
          excludedRegions,
          summaries,
          report,
          reportStyle,
          colorImage: colorSources[0] || null,
          stitchedXrayImage: assembledFile,
          // 사람이 조각 위치를 바로잡았는지와 그 결과.
          // 검수 이력의 일부이므로 함께 남긴다.
          placementCorrected: Boolean(correctedFragments),
          correctedFragments,
        },
      },
    });
  }

  function openFinalReview() {
    if (!inspectionDone || !report.trim()) return;
    setWorkflow(WORKFLOW.REVIEW);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToReport() {
    setWorkflow(WORKFLOW.INSPECTION);
    window.setTimeout(() => {
      reportSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  const stitchBusy = STITCH_BUSY.includes(stitchStatus);

  // 결합본과 원본 조각을 한 목록으로 묶어 탭에 쓴다
  const allInspectionFiles = [assembledFile, ...fragmentFiles].filter(Boolean);

  // 지금 보고 있는 이미지의 영역만 화면에 그린다.
  // 파일명이 영역과 이미지를 잇는 키다.
  const visibleRegions = viewFile
    ? regions.filter((region) => region.fileName === viewFile.name)
    : [];

  const selectedRegion =
    regions.find((region) => region.regionId === selectedId) || regions[0];
  const selectedIndex = regions.findIndex(
    (region) => region.regionId === selectedRegion?.regionId,
  );
  const excludedCount = excludedRegions.length;
  const currentStep =
    workflow === WORKFLOW.STITCH
      ? assembledFile
        ? 2
        : 1
      : workflow === WORKFLOW.REVIEW
        ? 5
        : report
          ? 4
          : 3;
  const artifactManager = String(
    valueFrom(
      artifactInfo,
      ["taskManager", "manager", "managerName", "createdBy"],
      "담당자 정보 없음",
    ),
  );
  const reviewDate = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    [],
  );

  function selectRegion(id) {
    setSelectedId(id);
    const region = regions.find((item) => item.regionId === id);
    const file = allInspectionFiles.find(
      (item) => item.name === region?.fileName,
    );
    if (file) setViewFile(file);
  }

  function selectNextRegion() {
    if (selectedIndex < 0 || regions.length === 0) return;
    const next = regions[(selectedIndex + 1) % regions.length];
    selectRegion(next.regionId);
  }

  function inspectionFileLabel(file, index) {
    if (file === assembledFile) return "결합본";
    return `조각 ${String(index).padStart(2, "0")}`;
  }

  return (
    <div className="xray-page">
      <div className="xray-container">
        <nav className="xray-breadcrumb" aria-label="현재 위치">
          <button type="button" onClick={() => navigate(-1)}>
            처리 전 조사
          </button>
          <span>/</span>
          <strong>X-RAY 분석</strong>
        </nav>

        <header className="xray-header">
          <div className="xray-heading">
            <span className="xray-eyebrow">PRE-INVESTIGATION</span>
            <h1 className="xray-title">X-RAY 분석</h1>
            <p>AI 분석 결과를 확인하고 전문가 판정을 기록합니다.</p>
          </div>
          <div className="save-status">
            <span aria-hidden="true">✓</span>
            현재 작업 내용은 이 단계에서 유지됩니다
          </div>
        </header>

        <section className="artifact-summary">
          <div className="artifact-identity">
            <span className="artifact-mark" aria-hidden="true">
              XR
            </span>
            <div>
              <span>분석 대상 유물</span>
              <strong>{artifactType || "유물 정보 없음"}</strong>
            </div>
          </div>
          <div className="artifact-data">
            <span>관리번호</span>
            <strong>{artifactId || "정보 없음"}</strong>
          </div>
          <div className="artifact-data">
            <span>재질</span>
            <strong>{material || "정보 없음"}</strong>
          </div>
          <div className="artifact-data">
            <span>등록 이미지</span>
            <strong>
              컬러 {colorSources.length}장 · X-RAY {fragmentFiles.length}장
            </strong>
          </div>
        </section>

        <ol
          className="workflow-steps"
          aria-label="X-RAY 분석 진행 단계"
          data-workflow-version="5-step"
        >
          {WORKFLOW_STEPS.map(([label, description], index) => {
            const step = index + 1;
            const state =
              step < currentStep
                ? "done"
                : step === currentStep
                  ? "active"
                  : "";
            return (
              <li key={label} className={state}>
                <StepIcon number={step} done={step < currentStep} />
                <div>
                  <strong>{label}</strong>
                  <span>{description}</span>
                </div>
              </li>
            );
          })}
        </ol>

        {workflow === WORKFLOW.STITCH && (
          <main className="workflow-content">
            {!assembledPreview && (
              <section className="xray-section">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">STEP 1</span>
                    <h2>X-RAY 조각 이미지</h2>
                    <p>
                      결합할 조각 이미지를 한 번에 등록하세요. 원본 파일은
                      변경되지 않습니다.
                    </p>
                  </div>
                  <span className="requirement-chip">2장 이상 필요</span>
                </div>

                <div className="upload-layout">
                  <div
                    className={`xray-upload ${isDragging ? "dragging" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    aria-label="X-RAY 조각 이미지 업로드"
                  >
                    <span className="upload-icon" aria-hidden="true">
                      ↑
                    </span>
                    <strong>이미지를 끌어다 놓으세요</strong>
                    <p>또는 클릭하여 파일 선택</p>
                    <small>PNG, JPG, WEBP · 파일당 최대 20MB 권장</small>
                  </div>

                  <aside className="upload-summary">
                    <span className="summary-label">등록 현황</span>
                    <div className="summary-count">
                      <strong>{fragmentFiles.length}</strong>
                      <span>장</span>
                    </div>
                    <ul>
                      <li>
                        <span>X-RAY 조각</span>
                        <strong>{fragmentFiles.length}장</strong>
                      </li>
                      <li>
                        <span>컬러 기준 이미지</span>
                        <strong>{colorSources.length}장</strong>
                      </li>
                      <li>
                        <span>결합 준비</span>
                        <strong
                          className={fragmentFiles.length >= 2 ? "ready" : ""}
                        >
                          {fragmentFiles.length >= 2 ? "완료" : "대기"}
                        </strong>
                      </li>
                    </ul>
                  </aside>
                </div>

                <input
                  ref={fileInputRef}
                  className="visually-hidden"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(event) => {
                    handleFragmentChange(event);
                    event.target.value = "";
                  }}
                  disabled={stitchBusy}
                />

                {fragmentFiles.length > 0 && (
                  <div className="upload-thumbnail-grid">
                    {fragmentFiles.map((file, index) => (
                      <UploadThumbnail
                        key={`${file.name}-${file.lastModified}`}
                        file={file}
                        index={index}
                        disabled={stitchBusy}
                        onRemove={removeFragment}
                      />
                    ))}
                  </div>
                )}

                <div className="section-action-bar">
                  <p>
                    AI가 컬러 기준 이미지의 형태를 참고해 조각 배치 초안을
                    생성합니다.
                  </p>
                  <button
                    className="xray-primary"
                    onClick={runStitch}
                    disabled={fragmentFiles.length < 2 || stitchBusy}
                  >
                    {stitchBusy ? "조각 결합 중..." : "조각 결합 시작"}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>

                {stitchMessage && !stitchBusy && (
                  <div
                    className={`xray-message ${stitchStatus === "FAILED" ? "error" : ""}`}
                  >
                    {stitchMessage}
                  </div>
                )}

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
            )}

            {assembledPreview && editingPlacement && (
              <section className="xray-section">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">STEP 2</span>
                    <h2>조각 위치 보정</h2>
                    <p>
                      조각을 끌어 옮기고 회전해 위치를 바로잡습니다. AI가
                      배치하지 못한 조각은 오른쪽 목록에서 직접 놓을 수
                      있습니다.
                    </p>
                  </div>
                  <span className="requirement-chip">전문가 보정</span>
                </div>

                <StitchEditor
                  assembledFile={assembledFile}
                  fragmentFiles={fragmentFiles}
                  fragments={stitchLayout?.fragments ?? []}
                  canvas={stitchLayout?.canvas ?? null}
                  artifactId={artifactId}
                  onConfirm={applyCorrection}
                  onCancel={() => setEditingPlacement(false)}
                />
              </section>
            )}

            {assembledPreview && !editingPlacement && (
              <section className="xray-section">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">STEP 2</span>
                    <h2>조각 결합 결과</h2>
                    <p>조각 방향과 파손 간격을 확인한 뒤 분석을 계속하세요.</p>
                  </div>
                  <span className="ai-chip">
                    {correctedFragments ? "전문가 보정본" : "AI 배치 초안"}
                  </span>
                </div>

                <div className="assembled-preview">
                  <div className="viewer-toolbar">
                    <div>
                      <span className="status-dot" />
                      결합 결과 · {fragmentFiles.length}개 조각
                    </div>
                    <span>원본 비율 유지</span>
                  </div>
                  <img src={assembledPreview} alt="X-RAY 결합 결과" />
                </div>

                <div className="section-action-bar">
                  <p>결과를 계속 사용해도 원본 X-RAY 이미지는 보존됩니다.</p>
                  <div className="xray-actions">
                    <button
                      className="xray-secondary"
                      onClick={() => {
                        setAssembledFile(null);
                        setStitchStatus("IDLE");
                        setStitchLayout(null);
                        setCorrectedFragments(null);
                      }}
                      disabled={stitchBusy}
                    >
                      이미지 다시 선택
                    </button>
                    <button
                      className="xray-secondary"
                      onClick={runStitch}
                      disabled={stitchBusy}
                    >
                      다시 결합하기
                    </button>

                    {/*
                      조각별 배치 정보가 있어야 개별로 움직일 수 있다.
                      서버가 아직 제공하지 않으면 버튼을 감춘다.
                    */}
                    {stitchLayout?.fragments?.length > 0 && (
                      <button
                        className="xray-secondary"
                        onClick={() => setEditingPlacement(true)}
                      >
                        조각 위치 보정
                      </button>
                    )}

                    <button className="xray-primary" onClick={confirmStitch}>
                      이 결과로 분석 계속하기
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </section>
            )}
          </main>
        )}

        {workflow === WORKFLOW.INSPECTION && (
          <main className="workflow-content">
            <section className="xray-section analysis-launch">
              <div className="section-heading compact">
                <div>
                  <span className="section-kicker">STEP 3</span>
                  <h2>이상 영역 검수</h2>
                  <p>
                    결합본과 원본 조각을 함께 분석해 검토할 영역을 찾습니다.
                  </p>
                </div>
                <span className={`health-badge ${health?.ok ? "ok" : "fail"}`}>
                  <span className="status-dot" />
                  {health === null
                    ? "분석 환경 확인 중"
                    : health.ok
                      ? "분석 준비 완료"
                      : "분석 환경 연결 실패"}
                </span>
              </div>

              {!inspectionDone && (
                <>
                  <div className="analysis-notice">
                    <span className="ai-symbol" aria-hidden="true">
                      AI
                    </span>
                    <div>
                      <strong>
                        AI 결과는 최종 판정이 아닌 검토 후보입니다.
                      </strong>
                      <p>
                        결합 경계와 실제 손상을 구분하려면 원본 조각을 함께
                        확인해야 합니다.
                      </p>
                    </div>
                  </div>

                  <details className="advanced-settings">
                    <summary>고급 설정</summary>
                    <label className="confidence-field">
                      <span>
                        탐지 민감도
                        <strong>{confidence.toFixed(2)}</strong>
                      </span>
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
                      <small>
                        값을 낮추면 더 많은 후보가 표시되며 검수량도 증가합니다.
                      </small>
                    </label>
                  </details>

                  <div className="section-action-bar">
                    <button
                      className="text-button"
                      onClick={() => setWorkflow(WORKFLOW.STITCH)}
                      disabled={inspectionLoading}
                    >
                      ← 결합 결과로 돌아가기
                    </button>
                    <button
                      className="xray-primary"
                      onClick={runInspection}
                      disabled={inspectionLoading || !health?.ok}
                    >
                      {inspectionLoading
                        ? "이상 영역 찾는 중..."
                        : "이상 영역 찾기"}
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </>
              )}

              {inspectionMessage && !inspectionLoading && (
                <div className="xray-message">{inspectionMessage}</div>
              )}

              <TaskProgress
                active={inspectionLoading}
                headline="이상 영역을 탐지하고 있습니다"
                detail={`결합본 1장 · 원본 조각 ${fragmentFiles.length}장`}
                steps={INSPECTION_STEPS}
                currentKey={inspectionStep}
                note="조각 수에 따라 1분에서 4분이 걸립니다."
              />

              {inspectionDone && (
                <div className="inspection-summary-bar">
                  <div>
                    <strong>{regions.length}</strong>
                    <span>이상 영역 포함</span>
                  </div>
                  <div>
                    <strong>{excludedCount}</strong>
                    <span>정상으로 제외</span>
                  </div>
                  {elapsed && <p>분석 소요 {elapsed}초</p>}
                  <button
                    type="button"
                    className="text-button"
                    onClick={runInspection}
                    disabled={inspectionLoading}
                  >
                    다시 분석
                  </button>
                </div>
              )}
            </section>

            {inspectionDone && regions.length > 0 && (
              <section className="inspection-workspace">
                <div className="image-workspace">
                  <div className="workspace-toolbar">
                    <div>
                      <strong>이미지 판독 화면</strong>
                      <span>
                        신뢰도는 탐지 확률이며 손상 심각도가 아닙니다.
                      </span>
                    </div>
                    <span className="candidate-count">
                      현재 이미지 {visibleRegions.length}건
                    </span>
                  </div>
                  <div className="image-tabs">
                    {allInspectionFiles.map((file, index) => {
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
                          title={file.name}
                        >
                          <span>{inspectionFileLabel(file, index)}</span>
                          <strong>{count}</strong>
                        </button>
                      );
                    })}
                  </div>

                  <ImageViewer
                    file={viewFile}
                    regions={visibleRegions}
                    selectedId={selectedId}
                    onSelect={selectRegion}
                  />
                </div>

                <aside className="review-sidebar">
                  <div className="review-sidebar-header">
                    <div>
                      <span>검토 영역</span>
                      <strong>
                        {selectedIndex + 1} / {regions.length}
                      </strong>
                    </div>
                    <span>{regions.length}건 이상 영역으로 포함</span>
                  </div>

                  <div className="review-default-guide">
                    <strong>기본 판정: 이상 있음</strong>
                    <span>
                      AI 탐지 영역은 모두 결과에 포함됩니다. 정상으로 확인된
                      영역만 제외하세요.
                    </span>
                  </div>

                  <div className="region-list" aria-label="검토 영역 목록">
                    {regions.map((region) => (
                      <button
                        type="button"
                        key={region.regionId}
                        className={
                          region.regionId === selectedRegion?.regionId
                            ? "active"
                            : ""
                        }
                        onClick={() => selectRegion(region.regionId)}
                      >
                        <span className="review-state damage" />
                        <strong>{region.regionId}</strong>
                        <span>{region.position}</span>
                        <small>{region.confidence.toFixed(2)}</small>
                      </button>
                    ))}
                  </div>

                  {selectedRegion && (
                    <div className="review-detail">
                      <div className="review-detail-title">
                        <div>
                          <strong>{selectedRegion.regionId}</strong>
                          <span className="decision-chip damage">
                            이상 있음 · 결과 포함
                          </span>
                        </div>
                      </div>

                      <dl className="region-meta">
                        <div>
                          <dt>분석 이미지</dt>
                          <dd title={selectedRegion.fileName}>
                            {selectedRegion.analysisTarget === TARGET.ASSEMBLED
                              ? "결합본"
                              : "원본 조각"}
                          </dd>
                        </div>
                        <div>
                          <dt>탐지 신뢰도</dt>
                          <dd>{selectedRegion.confidence.toFixed(3)}</dd>
                        </div>
                        <div>
                          <dt>위치</dt>
                          <dd>{selectedRegion.position}</dd>
                        </div>
                        <div>
                          <dt>영역 비율</dt>
                          <dd>{selectedRegion.areaRatioPercent.toFixed(3)}%</dd>
                        </div>
                      </dl>

                      <div className="ai-finding">
                        <span className="ai-symbol" aria-hidden="true">
                          AI
                        </span>
                        <div>
                          <strong>AI 탐지 결과</strong>
                          <p>
                            이상 영역 후보로 탐지되었습니다. 결합 경계 또는 파손
                            흔적일 수 있습니다.
                          </p>
                        </div>
                      </div>

                      <label className="review-note">
                        <span>전문가 소견 · 선택 입력</span>
                        <textarea
                          value={selectedRegion.userNote || ""}
                          onChange={(event) =>
                            updateNote(
                              selectedRegion.regionId,
                              event.target.value,
                            )
                          }
                          placeholder="이미지에서 확인한 특징과 판단 근거를 입력하세요."
                        />
                      </label>

                      <div className="review-navigation">
                        <button
                          type="button"
                          className="xray-secondary"
                          onClick={() => {
                            const previous =
                              regions[
                                (selectedIndex - 1 + regions.length) %
                                  regions.length
                              ];
                            selectRegion(previous.regionId);
                          }}
                        >
                          이전
                        </button>
                        <button
                          type="button"
                          className="normal-exclude-button"
                          onClick={() => removeRegion(selectedRegion.regionId)}
                        >
                          정상으로 제외
                        </button>
                        <button
                          type="button"
                          className="xray-primary"
                          onClick={selectNextRegion}
                        >
                          다음
                          <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </div>
                  )}
                </aside>
              </section>
            )}

            {inspectionDone && (
              <section className="report-section" ref={reportSectionRef}>
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">STEP 4</span>
                    <h2>조사 문안 작성</h2>
                    <p>
                      검수 결과를 바탕으로 초안을 만들고, 최종 기록에 맞게 직접
                      편집하세요.
                    </p>
                  </div>
                  <span className="ai-chip">AI 초안 · 전문가 검토 전</span>
                </div>
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
                <TaskProgress
                  active={reportLoading}
                  headline="AI 1차 상태조사 문안을 작성하고 있습니다"
                  detail={`이상 포함 ${regions.length}건 · 정상 제외 ${excludedCount}건`}
                  note="30초에서 2분이 걸립니다."
                />
              </section>
            )}

            <div className="complete-area">
              <div>
                <strong>최종 검토 전 확인</strong>
                <span>
                  이상 포함 {regions.length}건 · 정상 제외 {excludedCount}건 ·
                  문안 {report.trim() ? "작성 완료" : "작성 필요"}
                </span>
              </div>
              <button
                className="complete-btn"
                onClick={openFinalReview}
                disabled={!inspectionDone || !report.trim()}
              >
                최종 검토로 이동
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </main>
        )}

        {workflow === WORKFLOW.REVIEW && (
          <main className="workflow-content">
            <section className="final-review-section">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">STEP 5</span>
                  <h2>최종 결과 검토</h2>
                  <p>
                    컬러 기준 이미지, X-RAY 결합 결과와 조사 문안을 확인한 뒤
                    작업을 완료하세요.
                  </p>
                </div>
                <span className="review-ready-chip">
                  <span aria-hidden="true">✓</span>
                  완료 준비
                </span>
              </div>

              <dl className="final-artifact-info">
                <div>
                  <dt>분석 대상</dt>
                  <dd>{artifactType || "유물 정보 없음"}</dd>
                </div>
                <div>
                  <dt>관리번호</dt>
                  <dd>{artifactId || "정보 없음"}</dd>
                </div>
                <div>
                  <dt>분석일</dt>
                  <dd>{reviewDate}</dd>
                </div>
                <div>
                  <dt>담당자</dt>
                  <dd>{artifactManager}</dd>
                </div>
              </dl>

              <div className="final-image-grid">
                <article className="result-image-card">
                  <header>
                    <div>
                      <span>REFERENCE IMAGE</span>
                      <h3>컬러 기준 이미지</h3>
                    </div>
                    <small>외형 및 표면 상태</small>
                  </header>
                  <div className="result-image-frame color">
                    <ResultPreviewImage
                      source={colorSources[0]}
                      alt="유물 컬러 기준 이미지"
                    />
                  </div>
                </article>

                <article className="result-image-card">
                  <header>
                    <div>
                      <span>ASSEMBLED X-RAY</span>
                      <h3>X-RAY 결합 결과</h3>
                    </div>
                    <small>{fragmentFiles.length}개 조각 결합</small>
                  </header>
                  <div className="result-image-frame xray">
                    <ResultPreviewImage
                      source={assembledFile}
                      alt="X-RAY 조각 결합 결과"
                    />
                  </div>
                </article>
              </div>

              <article className="final-report-card">
                <header>
                  <div>
                    <span>FINAL INSPECTION NOTE</span>
                    <h3>상태조사 문안</h3>
                  </div>
                  <div className="final-report-actions">
                    <span>전문가 검토본</span>
                    <button type="button" onClick={returnToReport}>
                      문안 수정하기
                    </button>
                  </div>
                </header>
                <div className="final-report-body">
                  {report.replace(/\*\*/g, "")}
                </div>
                <footer>
                  <span>
                    {reportStyle === "detailed" ? "상세본" : "요약본"} ·{" "}
                    {report.length.toLocaleString()}자
                  </span>
                  <span>
                    이상 포함 {regions.length}건 · 정상 제외 {excludedCount}건
                  </span>
                </footer>
              </article>
            </section>

            <div className="complete-area final">
              <div>
                <strong>모든 결과를 확인하셨나요?</strong>
                <span>
                  완료 후 결과는 조회할 수 있으며 수정하려면 작업을 다시 열어야
                  합니다.
                </span>
              </div>
              <div className="final-complete-actions">
                <button
                  type="button"
                  className="xray-secondary"
                  onClick={returnToReport}
                >
                  이전 단계로
                </button>
                <button
                  type="button"
                  className="complete-btn"
                  onClick={() => setShowCompleteConfirm(true)}
                >
                  조사 작업 완료
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </main>
        )}

        {lastRemoved && (
          <div className="undo-toast" role="status">
            <span>
              {lastRemoved.region.regionId}을 정상 영역으로 제외했습니다.
            </span>
            <button type="button" onClick={undoRemove}>
              되돌리기
            </button>
            <button
              type="button"
              aria-label="알림 닫기"
              onClick={() => setLastRemoved(null)}
            >
              ×
            </button>
          </div>
        )}

        {showCompleteConfirm && (
          <div
            className="complete-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowCompleteConfirm(false);
              }
            }}
          >
            <section
              className="complete-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="complete-modal-title"
            >
              <span className="complete-modal-icon" aria-hidden="true">
                ✓
              </span>
              <h2 id="complete-modal-title">X-RAY 조사를 완료할까요?</h2>
              <p>
                완료된 결과는 처리 전 조사에서 다시 확인할 수 있습니다. 수정이
                필요하면 작업을 다시 열어야 합니다.
              </p>
              <div>
                <button
                  type="button"
                  className="xray-secondary"
                  onClick={() => setShowCompleteConfirm(false)}
                >
                  계속 검토하기
                </button>
                <button
                  type="button"
                  className="xray-primary"
                  onClick={handleComplete}
                >
                  작업 완료
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
