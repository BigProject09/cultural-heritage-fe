const USE_MOCK = import.meta.env.VITE_USE_XRAY_MOCK !== "false";

const INSPECTION_API_BASE =
  import.meta.env.VITE_XRAY_INSPECTION_API_BASE ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8001";

const STITCH_API_BASE =
  import.meta.env.VITE_XRAY_STITCH_API_BASE ||
  "http://localhost:8080/api/xray/stitch";

const VIA_SPRING = import.meta.env.VITE_VIA_SPRING === "true";

export const TARGET = {
  ASSEMBLED: "결합 완료본",
  FRAGMENT: "원본 조각",
};

let mockResultFile = null;
let mockJobStartedAt = 0;

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function readError(response) {
  try {
    const data = await response.json();
    return data.detail || data.message || JSON.stringify(data);
  } catch {
    return response.text();
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

export async function createStitchJob({ artifactId, colorFiles, xrayFiles }) {
  if (USE_MOCK) {
    await delay(500);
    const source = xrayFiles[0];
    mockResultFile = new File(
      [source],
      `mock-assembled-${artifactId || "artifact"}.png`,
      { type: source.type || "image/png" }
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

  return requestJson(`${STITCH_API_BASE}/jobs`, {
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

  return requestJson(`${STITCH_API_BASE}/jobs/${encodeURIComponent(jobId)}`);
}

export async function waitForStitchJob(
  jobId,
  onUpdate,
  { intervalMs = USE_MOCK ? 500 : 2000, timeoutMs = 15 * 60 * 1000 } = {}
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const status = await getStitchJob(jobId);
    onUpdate?.(status);
    if (status.status === "COMPLETED") return status;
    if (status.status === "FAILED") {
      throw new Error(status.errorMessage || status.message || "AI 결합 작업이 실패했습니다.");
    }
    await delay(intervalMs);
  }

  throw new Error("AI 결합 작업 대기 시간이 초과되었습니다.");
}

export async function downloadStitchResult(jobId, fileName) {
  if (USE_MOCK) {
    if (!mockResultFile) throw new Error("Mock 결합 결과가 없습니다.");
    return new File([mockResultFile], fileName, {
      type: mockResultFile.type || "image/png",
    });
  }

  const response = await fetch(
    `${STITCH_API_BASE}/jobs/${encodeURIComponent(jobId)}/result`
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

export async function checkInspectionHealth() {
  if (USE_MOCK) {
    await delay(250);
    return { ok: true, llmEnabled: true, mock: true };
  }

  const data = await requestJson(`${INSPECTION_API_BASE}/health`);
  return {
    ok: VIA_SPRING ? data.aiServiceHealthy === true : data.modelLoaded === true,
    llmEnabled: data.llmEnabled === true,
    raw: data,
  };
}

export async function detectOne(file, target, confidence) {
  if (USE_MOCK) {
    await delay(700);
    const { width, height } = await getImageSize(file);
    return {
      regions: mockRegions(file, target, width, height, 2).filter(
        (region) => region.confidence >= confidence
      ),
      summary: `${file.name}: Mock 검토 후보 2건`,
    };
  }

  const form = new FormData();
  form.append("file", file);
  if (VIA_SPRING) {
    if (confidence != null) form.append("confidence", String(confidence));
    const path = target === TARGET.ASSEMBLED ? "/detect/assembled" : "/detect/fragments";
    return requestJson(`${INSPECTION_API_BASE}${path}`, { method: "POST", body: form });
  }
  form.append("analysis_target", target);
  if (confidence != null) form.append("confidence", String(confidence));
  return requestJson(`${INSPECTION_API_BASE}/detect`, { method: "POST", body: form });
}

export async function detectBatch(files, target, confidence) {
  if (USE_MOCK) {
    await delay(700);
    const results = await Promise.all(
      files.map(async (file) => {
        const { width, height } = await getImageSize(file);
        return mockRegions(file, target, width, height, 1).filter(
          (region) => region.confidence >= confidence
        );
      })
    );
    return {
      regions: results.flat(),
      summaries: files.map((file) => `${file.name}: Mock 검토 후보 분석 완료`),
    };
  }

  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  if (!VIA_SPRING) form.append("analysis_target", target);
  if (confidence != null) form.append("confidence", String(confidence));
  const path = VIA_SPRING ? "/detect/fragments" : "/detect-batch";
  return requestJson(`${INSPECTION_API_BASE}${path}`, { method: "POST", body: form });
}

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
          `- ${region.regionId} (${region.fileName}, ${region.position}): ${region.userNote}`
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
      detailCount: Math.min(regions.length, reportStyle === "detailed" ? 12 : 5),
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
  return requestJson(`${INSPECTION_API_BASE}/report`, { method: "POST", body: form });
}
