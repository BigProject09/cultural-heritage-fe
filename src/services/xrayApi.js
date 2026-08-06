/**
 * X-RAY AI 서비스 호출.
 *
 *
 * 로컬 개발에서는 결합과 결함 분석의 호출 대상을 나눌 수 있다.
 *
 *   결합    Spring(8080) 작업 접수 → 상태 폴링 → 결과 내려받기
 *   결함    FastAPI(8001) 직접 호출 또는 Spring 경유
 *   문안    결함 분석과 동일한 호출 대상
 *
 * 주소는 .env 의 VITE_XRAY_STITCH_API_BASE,
 * VITE_XRAY_INSPECTION_API_BASE, VITE_VIA_SPRING으로 정한다.
 */

/**
 * Mock 모드 여부.
 *
 * 백엔드 없이 화면만 확인할 때 쓴다. 값이 없으면 실제 API 를
 * 호출한다. 팀 저장소에서는 실서버가 기본이어야 안전하므로
 * Mock 은 명시적으로 켜야 한다.
 *
 * pages/PreInvestigation/XrayPage.jsx 도 같은 규칙을 쓴다.
 * 두 곳의 판정이 어긋나면, 화면은 Mock 이라 판단해 컬러
 * 이미지를 비워 보내는데 실제 API 가 호출되어 결합이 실패한다.
 */
const USE_MOCK = import.meta.env.VITE_USE_XRAY_MOCK === "true";

const SPRING_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8080"
).replace(/\/+$/, "");
const VIA_SPRING = import.meta.env.VITE_VIA_SPRING === "true";
const STITCH_API_BASE = (
  import.meta.env.VITE_XRAY_STITCH_API_BASE ||
  `${SPRING_BASE}/api/xray/stitch`
).replace(/\/+$/, "");
const DIRECT_INSPECTION_API_BASE = (
  import.meta.env.VITE_XRAY_INSPECTION_API_BASE || "http://localhost:8001"
).replace(/\/+$/, "");
const SPRING_INSPECTION_API_BASE = (
  import.meta.env.VITE_XRAY_SPRING_INSPECTION_API_BASE ||
  `${SPRING_BASE}/api/xray`
).replace(/\/+$/, "");
const INSPECTION_API_BASE = VIA_SPRING
  ? SPRING_INSPECTION_API_BASE
  : DIRECT_INSPECTION_API_BASE;
const INSPECTION_HEALTH_URL = VIA_SPRING
  ? `${SPRING_BASE}/api/xray/health`
  : `${DIRECT_INSPECTION_API_BASE}/health`;
const STITCH_JOBS_BASE = `${STITCH_API_BASE}/jobs`;

export const TARGET = {
  ASSEMBLED: "결합 완료본",
  FRAGMENT: "원본 조각",
};

let mockResultFile = null;
let mockJobStartedAt = 0;

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * 오류 응답에서 사람이 읽을 메시지를 뽑는다.
 *
 * 본문은 한 번만 읽을 수 있으므로 미리 복제해 둔다. JSON 파싱에
 * 실패한 뒤 text() 를 부르면 이미 읽은 본문이라 오류가 난다.
 */
async function readError(response) {
  const copy = response.clone();

  try {
    const data = await response.json();
    return data.detail || data.message || JSON.stringify(data);
  } catch {
    return copy.text();
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.json();
}

async function getImageSize(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: 1200, height: 900 };
  }
}

function mockRegions(file, target, width, height, count = 2) {
  const boxes = [
    [0.18, 0.22, 0.38, 0.42, 0.31, "좌측 상단"],
    [0.58, 0.48, 0.78, 0.7, 0.18, "우측 중앙"],
  ];

  return boxes.slice(0, count).map((box) => {
    const [x1, y1, x2, y2, confidence, position] = box;

    return {
      analysisTarget: target,
      fileName: file.name,
      confidence,
      position,
      areaRatioPercent: Number(((x2 - x1) * (y2 - y1) * 100).toFixed(3)),
      bbox: {
        x1: Math.round(width * x1),
        y1: Math.round(height * y1),
        x2: Math.round(width * x2),
        y2: Math.round(height * y2),
      },
    };
  });
}

// ------------------------------------------------------------
// 조각 결합
// ------------------------------------------------------------

/**
 * 결합 작업을 접수한다.
 *
 * 결합은 조각 수에 따라 수 분에서 수십 분이 걸린다. 결과를
 * 기다리지 않고 jobId 를 먼저 받은 뒤 상태를 폴링한다.
 */
export async function createStitchJob({ artifactId, colorFiles, xrayFiles }) {
  if (USE_MOCK) {
    await delay(500);

    const source = xrayFiles[0];
    mockResultFile = new File(
      [source],
      `mock-assembled-${artifactId || "artifact"}.png`,
      { type: source.type || "image/png" },
    );
    mockJobStartedAt = Date.now();

    return {
      jobId: `mock-job-${Date.now()}`,
      artifactId,
      status: "PENDING",
      message: "Mock 결합 작업이 접수되었습니다.",
      colorFileCount: colorFiles.length,
      xrayFileCount: xrayFiles.length,
    };
  }

  const form = new FormData();
  form.append("artifactId", artifactId);
  colorFiles.forEach((file) => form.append("colorFiles", file));
  xrayFiles.forEach((file) => form.append("xrayFiles", file));

  return requestJson(STITCH_JOBS_BASE, {
    method: "POST",
    body: form,
  });
}

export function getStitchJob(jobId) {
  if (USE_MOCK) {
    const elapsed = Date.now() - mockJobStartedAt;

    return Promise.resolve({
      jobId,
      status: elapsed < 1500 ? "RUNNING" : "COMPLETED",
      message:
        elapsed < 1500
          ? "Mock X-RAY 조각을 결합하고 있습니다."
          : "Mock 결합이 완료되었습니다.",
    });
  }

  return requestJson(`${STITCH_JOBS_BASE}/${encodeURIComponent(jobId)}`);
}

/**
 * 결합이 끝날 때까지 상태를 확인한다.
 *
 * 대기 한도는 서버보다 길게 잡는다. 화면이 먼저 포기하면
 * 서버는 계속 도는데 결과를 받을 방법이 없어진다.
 */
export async function waitForStitchJob(
  jobId,
  onUpdate,
  { intervalMs = USE_MOCK ? 500 : 2000, timeoutMs = 40 * 60 * 1000 } = {},
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const status = await getStitchJob(jobId);
    onUpdate?.(status);

    if (status.status === "COMPLETED") return status;

    if (status.status === "FAILED") {
      throw new Error(status.errorMessage || "AI 결합 작업이 실패했습니다.");
    }

    await delay(intervalMs);
  }

  throw new Error("AI 결합 작업 대기 시간이 초과되었습니다.");
}

/**
 * 결합본을 File 로 받는다.
 *
 * 이어지는 결함 분석과 문안 생성에 그대로 다시 업로드하므로
 * File 형태여야 한다.
 */
export async function downloadStitchResult(jobId, fileName) {
  if (USE_MOCK) {
    if (!mockResultFile) throw new Error("Mock 결합 결과가 없습니다.");

    return new File([mockResultFile], fileName, {
      type: mockResultFile.type || "image/png",
    });
  }

  const response = await fetch(
    `${STITCH_JOBS_BASE}/${encodeURIComponent(jobId)}/result`,
  );

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`결합 결과 조회 실패: HTTP ${response.status} ${detail}`);
  }

  const blob = await response.blob();

  if (!blob.type.startsWith("image/")) {
    throw new Error("결합 결과 응답이 이미지가 아닙니다.");
  }

  return new File([blob], fileName, { type: blob.type || "image/png" });
}

/**
 * 조각별 배치 정보를 가져온다.
 *
 * 결합 엔진이 만든 layout.json 이다. 조각마다 어떤 위치와
 * 각도로 놓였는지가 담겨 있어, 수동 보정 화면이 조각을 개별로
 * 배치하는 근거가 된다.
 *
 * 실패해도 예외를 던지지 않고 빈 배열을 준다. 보정 기능만
 * 막히고 결합 결과 자체는 그대로 쓸 수 있어야 하기 때문이다.
 */
export async function fetchStitchLayout(jobId) {
  if (USE_MOCK) {
    await delay(300);
    return { fragments: [], canvas: null, mock: true };
  }

  try {
    const data = await requestJson(
      `${STITCH_JOBS_BASE}/${encodeURIComponent(jobId)}/layout`,
    );

    return normalizeLayout(data);
  } catch (error) {
    console.warn("결합 배치 정보를 가져오지 못했습니다:", error.message);
    return { fragments: [], canvas: null, unavailable: true };
  }
}

/**
 * 엔진 원본 형식을 화면에서 쓰는 형태로 정리한다.
 *
 * 파일명 키가 두 개인 점에 주의한다.
 *
 *   originalSourceName  업로드한 원본 파일명.
 *                       화면의 업로드 목록과 짝짓는 키다.
 *   file                엔진이 배치한 단위 이름.
 *                       한 장에서 파편이 여럿 나오면
 *                       "원본명#cc00.jpg" 처럼 나뉜다.
 *
 * 변환행렬은 originalCropBBoxXYWH 로 잘라낸 이미지의 좌표
 * 기준이다. 자세한 내용은 services/stitchGeometry.js 참고.
 */
function normalizeLayout(data) {
  const rawFragments = Array.isArray(data?.fragments) ? data.fragments : [];

  const fragments = rawFragments.map((item) => {
    const transform = item.affineMatrix ?? item.transform ?? null;
    const status = item.assignmentStatus;

    return {
      index: item.index ?? null,
      fileName: item.originalSourceName ?? item.file ?? null,
      originalSourceName: item.originalSourceName ?? item.file ?? null,
      placementName: item.file ?? null,
      transform,
      matched:
        typeof status === "string" ? status === "assigned" : transform != null,
      cropBBoxXYWH: item.originalCropBBoxXYWH ?? null,
      subfragmentIndex: item.subfragmentIndex ?? 0,
      sourceIndex: item.originalSourceIndex ?? item.index ?? null,
      originalSourceIndex: item.originalSourceIndex ?? item.index ?? null,
      rotationDeg: item.rotationDeg ?? 0,
      centerX: item.centerX ?? null,
      centerY: item.centerY ?? null,
      unassignedReason: item.assignmentUnassignedReason ?? null,
    };
  });

  // 캔버스 크기는 layout 에 직접 들어 있다.
  // 결합본 이미지에서 유추하지 않아도 되므로 이 값을 쓴다.
  const canvas = data?.canvas ?? null;

  return {
    fragments,
    canvas:
      canvas && canvas.width && canvas.height
        ? { width: canvas.width, height: canvas.height }
        : null,
    coordinateSystem: data?.coordinateSystem ?? null,
  };
}

/**
 * Konva에서 확정한 모든 fragment transform을 서버에 저장한다.
 * 저장 직후 서버는 원본 X-ray로 assembled_xray.final.png와 provenance를 재생성한다.
 */
export async function saveFinalStitchLayout(jobId, fragments) {
  if (USE_MOCK) {
    await delay(250);
    return { layoutStage: "FINAL", fragments };
  }

  return requestJson(
    `${STITCH_JOBS_BASE}/${encodeURIComponent(jobId)}/layout/final`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragments }),
    },
  );
}

/** 서버가 final transform으로 다시 렌더링한 정본 결합 이미지를 받는다. */
export async function downloadFinalStitchResult(jobId, fileName) {
  if (USE_MOCK) {
    if (!mockResultFile) throw new Error("Mock 결합 결과가 없습니다.");
    return new File([mockResultFile], fileName, {
      type: mockResultFile.type || "image/png",
    });
  }

  const response = await fetch(
    `${STITCH_JOBS_BASE}/${encodeURIComponent(jobId)}/result/final`,
  );
  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`최종 결합 결과 조회 실패: HTTP ${response.status} ${detail}`);
  }
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error("최종 결합 결과 응답이 이미지가 아닙니다.");
  }
  return new File([blob], fileName, { type: blob.type || "image/png" });
}

// ------------------------------------------------------------
// 이상영역 탐지와 문안
// ------------------------------------------------------------

export async function checkInspectionHealth() {
  if (USE_MOCK) {
    await delay(250);
    return { ok: true, llmEnabled: true, mock: true };
  }

  const data = await requestJson(INSPECTION_HEALTH_URL);

  return {
    ok: data.aiServiceHealthy === true || data.status === "ok",
    llmEnabled: data.llmEnabled === true,
    raw: data,
  };
}

/**
 * 이미지 한 장을 분석한다.
 *
 * 분석 대상에 따라 경로가 갈린다. 결합본은 더 큰 해상도로
 * 추론해야 결합 경계의 미세한 흔적을 잡을 수 있다.
 */
export async function detectOne(file, target, confidence) {
  if (USE_MOCK) {
    await delay(700);

    const { width, height } = await getImageSize(file);

    return {
      regions: mockRegions(file, target, width, height, 2).filter(
        (region) => region.confidence >= confidence,
      ),
      summary: `${file.name}: Mock 검토 후보 2건`,
    };
  }

  const form = new FormData();
  form.append("file", file);

  if (confidence != null) form.append("confidence", String(confidence));

  const path =
    target === TARGET.ASSEMBLED ? "/detect/assembled" : "/detect/fragments";

  return requestJson(`${INSPECTION_API_BASE}${path}`, {
    method: "POST",
    body: form,
  });
}

export async function detectBatch(files, target, confidence) {
  if (USE_MOCK) {
    await delay(700);

    const results = await Promise.all(
      files.map(async (file) => {
        const { width, height } = await getImageSize(file);

        return mockRegions(file, target, width, height, 1).filter(
          (region) => region.confidence >= confidence,
        );
      }),
    );

    return {
      regions: results.flat(),
      summaries: files.map((file) => `${file.name}: Mock 검토 후보 분석 완료`),
    };
  }

  const form = new FormData();
  files.forEach((file) => form.append("files", file));

  if (confidence != null) form.append("confidence", String(confidence));

  return requestJson(`${INSPECTION_API_BASE}/detect/fragments`, {
    method: "POST",
    body: form,
  });
}

/** 결합/Konva/final 렌더링이 끝난 job의 최종 결합본을 분석한다. */
export async function detectFinalAssembled(jobId, confidence) {
  const params = new URLSearchParams();
  if (confidence != null) params.set("confidence", String(confidence));
  const suffix = params.size ? `?${params.toString()}` : "";
  return requestJson(
    `${SPRING_INSPECTION_API_BASE}/detect/assembled/${encodeURIComponent(jobId)}${suffix}`,
    { method: "POST" },
  );
}

/** 결합이 확정된 job에 보관된 원본 X-ray들을 sourceIndex 순서로 분석한다. */
export async function detectFinalFragments(jobId, confidence) {
  const params = new URLSearchParams();
  if (confidence != null) params.set("confidence", String(confidence));
  const suffix = params.size ? `?${params.toString()}` : "";
  return requestJson(
    `${SPRING_INSPECTION_API_BASE}/detect/fragments/${encodeURIComponent(jobId)}${suffix}`,
    { method: "POST" },
  );
}

/** 두 탐지 결과를 layout.final.json 좌표계에서 대응시킨다. */
export async function mapDefects(jobId, fragmentDetection, assembledDetection) {
  return requestJson(
    `${SPRING_INSPECTION_API_BASE}/defect-mapping/${encodeURIComponent(jobId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragmentDetection, assembledDetection }),
    },
  );
}

/**
 * AI 1차 상태조사 문안을 생성한다.
 *
 * 검수를 마친 영역 목록을 근거로 작성한다. 제외한 영역은
 * 반영되지 않으므로 검수 후에 실행해야 의미가 있다.
 */
export async function generateReport({
  regions,
  artifactType = "",
  material = "",
  reportStyle = "summary",
  assembled,
  fragments = [],
  rgbImages = [],
}) {
  if (USE_MOCK) {
    await delay(800);

    const details = regions
      .slice(0, reportStyle === "detailed" ? 12 : 5)
      .map(
        (region) =>
          `- ${region.regionId} (${region.fileName}, ${region.position}): ${region.userNote}`,
      )
      .join("\n");

    const report = [
      `[Mock 상태조사 문안 - ${reportStyle === "detailed" ? "상세본" : "요약본"}]`,
      `유물 유형: ${artifactType || "미입력"}`,
      `재질: ${material || "미입력"}`,
      `검토 영역: 총 ${regions.length}건`,
      "",
      details || "검토 영역 없음",
      "",
      "※ 이 문안과 탐지 결과는 프론트 화면 검증용 Mock 데이터입니다.",
    ].join("\n");

    return {
      report,
      style: reportStyle,
      charCount: report.length,
      detailCount: Math.min(
        regions.length,
        reportStyle === "detailed" ? 12 : 5,
      ),
      totalRegionCount: regions.length,
      model: "frontend-mock",
    };
  }

  const form = new FormData();
  form.append("regions", JSON.stringify(regions));
  form.append("artifact_type", artifactType);
  form.append("material", material);
  form.append("report_style", reportStyle);

  if (assembled) form.append("assembled", assembled);

  fragments.slice(0, 6).forEach((file) => form.append("fragments", file));
  rgbImages.slice(0, 6).forEach((file) => form.append("rgb_images", file));

  return requestJson(`${INSPECTION_API_BASE}/report`, {
    method: "POST",
    body: form,
  });
}
