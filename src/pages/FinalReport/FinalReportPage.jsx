import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HeritageHeader from "../../components/workspace/HeritageHeader";
import {
  MODULE_STATUS,
  WORKSPACE_MODULES,
  getWorkspaceProject,
  selectWorkspaceProject,
} from "../../data/workspaceProjects";
import { addMyReport } from "../../utils/myReports";
import { getArtifactRoute } from "../../utils/artifactRoutes";
import { useDisassembly } from "../../context/useDisassembly";
import {
  getLatestTaskByArtifact,
  getTask,
} from "../../services/conservationGuideApi";
import {
  downloadFinalStitchResult,
  getRememberedXrayJob,
  getStitchJobByArtifactId,
  getWorkflowDefects,
  getWorkflowReportText,
} from "../../services/xrayApi";
import { getLatestInspectionJob } from "../../services/potteryInspectionApi";
import {
  downloadReportFromUrl,
  generateReportJson,
  getLatestSavedReport,
  getPotterySource,
  getVcaSource,
  saveReportDocument,
  saveReportJson,
} from "../../services/reportApi";
import "./FinalReportPage.css";

/**
 * xrayApi의 결함 형태(regionId/position/userNote/reviewDecision, 카멜케이스)를
 * report-ai가 읽는 xray_regions 원소 형태(snake_case)로 바꾼다.
 * report-ai의 pre_investigation_node는 review_decision이 정확히 "damage"
 * 문자열일 때만 확정 이상영역으로 취급하므로 대소문자를 맞춰준다.
 */
// VisualPage.jsx가 "육안 조사 완료" 시점에 합성한 마스킹 사진을 넣어두는 키.
// 페이지 컴포넌트끼리 import하면 번들이 불필요하게 엮여서 문자열만 맞춰 쓴다.
const ANNOTATED_IMAGE_STORAGE_KEY = "voraAnnotatedInspectionImageV1";
const ANNOTATED_IMAGE_URL_STORAGE_KEY = "voraAnnotatedInspectionImageUrlV1";

function toReportXrayRegion(defect) {
  return {
    region_code: defect.regionId ?? "",
    position: defect.position ?? "",
    user_note: defect.userNote ?? "",
    review_decision: String(defect.reviewDecision ?? "").toLowerCase(),
  };
}

/** Blob/File을 report-ai가 받는 순수 base64 문자열(data: 접두사 없음)로 바꾼다. */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = String(reader.result).split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = () =>
      reject(reader.error || new Error("이미지 인코딩 실패"));
    reader.readAsDataURL(blob);
  });
}

/** 이미지 URL(S3 등)을 fetch해서 base64로 바꾼다. */
async function urlToBase64(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `이미지를 불러오지 못했습니다 (HTTP ${response.status}): ${url}`,
    );
  }
  return blobToBase64(await response.blob());
}

/** section.key가 없는 구버전 report_json도 대비해 title로 한 번 더 판별한다. */
function isPreInvestigationSection(section) {
  return (
    section.key === "pre_investigation" || section.title?.includes("처리 전")
  );
}

function percent(score) {
  return typeof score === "number" ? `${Math.round(score * 100)}%` : null;
}

/**
 * 육안조사 AI 응답(visualResult.detail)에서 핵심 수치만 뽑아 뱃지로 보여준다.
 * report_json.sections는 문장으로만 되어 있어 이 수치들이 없다 - FE가 이미
 * 갖고 있는 원본 분석 결과(visualResult)에서 직접 뽑는다.
 */
function VisualInspectionBadges({ detail, xrayDamageCount }) {
  if (!detail && xrayDamageCount === undefined) return null;

  const badges = [];
  if (detail?.completeness?.prediction) {
    const value = percent(detail.completeness.score);
    badges.push(
      `완전도 ${detail.completeness.prediction}${value ? ` (${value})` : ""}`,
    );
  }
  if (detail?.glaze) {
    const value = percent(detail.glaze.score);
    badges.push(
      `광택${value ? ` ${value}` : ""}${detail.glaze.prediction ? ` · ${detail.glaze.prediction}` : ""}`,
    );
  }
  if (detail?.era?.prediction) {
    const value = percent(detail.era.score);
    badges.push(
      `시대 ${detail.era.prediction} 예측${value ? ` (모델점수 ${value})` : ""}`,
    );
  }
  if (typeof xrayDamageCount === "number") {
    badges.push(
      xrayDamageCount > 0
        ? `X-ray 확정 이상영역 ${xrayDamageCount}건`
        : "X-ray 확정 이상영역 없음",
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className="report-stat-badges">
      {badges.map((label) => (
        <span key={label} className="report-stat-badge">
          {label}
        </span>
      ))}
    </div>
  );
}

/** report_json 섹션 하나를 문서처럼 렌더링한다 (header는 표, 나머지는 문단). */
function ReportSection({ section, index, badgeSlot, photoSlot }) {
  if (section.fields) {
    const rows = Object.entries(section.fields).filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    );
    return (
      <section className="report-preview-section">
        <h3>
          {index}. {section.title}
        </h3>
        <table className="report-preview-fields">
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2}>입력된 유물 정보가 없습니다.</td>
              </tr>
            ) : (
              rows.map(([label, value]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{String(value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    );
  }

  const parts = Array.isArray(section.parts) ? section.parts : [];

  const paragraphs = String(section.body || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section className="report-preview-section">
      <h3>
        {index}. {section.title}
      </h3>

      {badgeSlot}

      {parts.length > 0 ? (
        parts.map((part, partIndex) => {
          const partParagraphs = String(part.body || "")
            .split(/\n\s*\n/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean);

          return (
            <div
              key={part.key || `${section.key || index}-part-${partIndex}`}
              className="report-preview-part"
            >
              {part.title && <h4>{part.title}</h4>}

              {partParagraphs.length === 0 ? (
                <p className="report-preview-empty">내용이 없습니다.</p>
              ) : (
                partParagraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)
              )}
            </div>
          );
        })
      ) : paragraphs.length === 0 ? (
        <p className="report-preview-empty">내용이 없습니다.</p>
      ) : (
        paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)
      )}

      {photoSlot}
    </section>
  );
}

/**
 * 육안조사 미리보기(화면)용 사진 소스를 구한다. docx용 gatherPhotos()와 달리
 * base64 변환이 필요 없다 - 브라우저는 S3 URL도 data: base64도 <img src>에
 * 그대로 넣을 수 있다. S3 URL이 있으면 그걸 우선 쓰고(세션이 끝나도 유효),
 * 없으면 이번 세션에서 합성한 base64를 쓴다.
 */
function resolvePreviewPhotoSrc(visualResult, artifactId) {
  if (visualResult?.__annotatedPhotoUrl)
    return visualResult.__annotatedPhotoUrl;
  if (visualResult?.__annotatedImageBase64) {
    return `data:image/png;base64,${visualResult.__annotatedImageBase64}`;
  }

  try {
    const storedUrl = sessionStorage.getItem(
      `${ANNOTATED_IMAGE_URL_STORAGE_KEY}:${artifactId}`,
    );
    if (storedUrl) return storedUrl;

    const storedBase64 = sessionStorage.getItem(
      `${ANNOTATED_IMAGE_STORAGE_KEY}:${artifactId}`,
    );
    if (storedBase64) return `data:image/png;base64,${storedBase64}`;
  } catch {
    // sessionStorage 접근 불가 - 사진 없이 진행
  }

  return null;
}

function FinalReportPage() {
  const navigate = useNavigate();
  const { artifactId = "" } = useParams();
  const decodedArtifactId = decodeURIComponent(artifactId);
  const { taskId, visualResult } = useDisassembly() ?? {};
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [reportJson, setReportJson] = useState(null);
  const [reportSources, setReportSources] = useState(null);
  const [savedReport, setSavedReport] = useState(null);
  const [savedReportLoading, setSavedReportLoading] = useState(true);
  const [generationNotice, setGenerationNotice] = useState("");

  useEffect(() => {
    if (!generating) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [generating]);

  useEffect(() => {
    const controller = new AbortController();

    getWorkspaceProject(decodedArtifactId, { signal: controller.signal })
      .then((item) => {
        setProject(item);
        selectWorkspaceProject(item);
        setError("");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [decodedArtifactId]);

  useEffect(() => {
    let cancelled = false;
    const loadingTimer = window.setTimeout(() => {
      if (!cancelled) setSavedReportLoading(true);
    }, 0);

    getLatestSavedReport(decodedArtifactId)
      .then((document) => {
        if (!cancelled) setSavedReport(document);
      })
      .catch((requestError) => {
        console.error("기존 최종보고서 조회 실패:", requestError);
      })
      .finally(() => {
        if (!cancelled) setSavedReportLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
    };
  }, [decodedArtifactId]);

  const missingModules = useMemo(
    () =>
      project
        ? WORKSPACE_MODULES.filter(
            (module) => project.modules[module.key] !== MODULE_STATUS.DONE,
          )
        : [],
    [project],
  );

  const reportReady =
    Boolean(project) &&
    (missingModules.length === 0 || Boolean(savedReport?.reportJson));

  const visualResultForThisArtifact =
    visualResult && project && visualResult.__artifactId === project.artifactId
      ? visualResult
      : null;

  // 보고서가 생성된 뒤에만 의미가 있어서 reportJson이 있을 때만 계산한다 -
  // 그 전에는 project.artifactId만으로 sessionStorage를 매번 뒤질 이유가 없다.
  const previewPhotoSrc = reportJson
    ? resolvePreviewPhotoSrc(visualResultForThisArtifact, project.artifactId)
    : null;

  const handleGenerateReport = async ({ stayOnCurrentView = false } = {}) => {
    if (!reportReady || !project || generating) return;

    setGenerating(true);
    setGenerateError("");
    setGenerationNotice("");
    const previousReportJson = reportJson;
    if (!stayOnCurrentView) setReportJson(null);
    setSaved(false);

    try {
      // 보존가이드: 현재 세션의 taskId가 있으면 우선 사용하고, 새로고침/다른
      // 브라우저처럼 Context가 비어 있으면 artifactId 기준 최신 Task를 RDS에서 복구한다.
      const task = taskId
        ? await getTask(taskId).catch(() => null)
        : await getLatestTaskByArtifact(project.artifactId).catch(() => null);
      const guideResult = task?.results ?? {};

      // X-ray: localStorage의 기억값을 우선 사용하되, 없으면 artifactId로 서버 작업을
      // 복구한다. 최종보고서는 브라우저 저장소가 아니라 서버 영속 상태를 기준으로 해야 한다.
      const rememberedXray = getRememberedXrayJob(project.artifactId);
      const xrayJob = rememberedXray?.jobId
        ? rememberedXray
        : await getStitchJobByArtifactId(project.artifactId).catch(() => null);
      let xrayReportText = null;
      let xrayRegions = [];
      if (xrayJob?.jobId) {
        const [defectResult, reportResult] = await Promise.all([
          getWorkflowDefects(xrayJob.jobId).catch(() => null),
          getWorkflowReportText(xrayJob.jobId).catch(() => null),
        ]);
        xrayReportText = reportResult?.reportText || null;
        xrayRegions = (defectResult?.defects || []).map(toReportXrayRegion);
      }

      // 육안조사: 이번 세션에서 한 결과(visualResult)가 있으면 그걸 쓰고,
      // 없으면(새로고침 등으로 사라졌으면) DB에 저장된 최근 결과로 대체한다.
      let potteryInspection = visualResultForThisArtifact
        ? {
            inspection_text: visualResultForThisArtifact.inspection_text || "",
            human_review_recommended: Boolean(
              visualResultForThisArtifact.human_review_recommended,
            ),
            detail: visualResultForThisArtifact.detail || {},
          }
        : null;

      if (!potteryInspection) {
        try {
          const source = await getPotterySource(project.artifactId);
          if (source?.inspection_text) {
            potteryInspection = source;
          }
        } catch (sourceError) {
          console.error("저장된 문양 기반 육안조사 결과 조회 실패:", sourceError);
        }
      }

      let vcaAssessment = null;
      try {
        const source = await getVcaSource(project.artifactId);
        if (source && Object.keys(source).length > 0) {
          vcaAssessment = source;
        }
      } catch (sourceError) {
        console.error("저장된 VCA 상태조사 결과 조회 실패:", sourceError);
      }

      // 미리보기 단계에서는 사진을 안 붙인다 - report-ai의 /generate는 어차피
      // photos를 안 쓰고(문서 변환 단계에서만 씀), 사진 fetch+base64 인코딩은
      // 시간이 걸려서 미리보기 응답을 느리게 만든다. 사진은 "저장하기" 시점에만 모은다.
      const payload = {
        artifact_id: project.artifactId,
        relic_info: {
          artifact_code: project.artifactId,
          name: project.name,
          material: project.material,
          period: project.period,
          weight: project.weight || task?.relicInfo?.weight,
          bondingArea: project.bondingArea || task?.relicInfo?.bondingArea,
          treatmentPurpose:
            project.treatmentPurpose || task?.relicInfo?.treatmentPurpose,
        },
        guide_result: guideResult,
        xray_report_text: xrayReportText,
        xray_regions: xrayRegions,
        pottery_inspection: potteryInspection,
        vca_assessment: vcaAssessment,
        photos: {},
      };

      const json = await generateReportJson(payload);
      if (stayOnCurrentView) {
        if (previousReportJson) setReportJson(json);
      } else {
        setReportJson(json);
      }

      try {
        const stored = await saveReportJson(project.artifactId, json);
        setSavedReport(stored);
        if (stayOnCurrentView) {
          setGenerationNotice("최종보고서가 재생성되었습니다.");
        }
      } catch (saveError) {
        console.error("생성된 최종보고서 저장 실패:", saveError);
        setGenerateError(
          "보고서는 생성됐지만 서버 저장에 실패했습니다. 다시 생성하거나 저장하기를 시도해주세요.",
        );
      }

      setReportSources({
        hasGuide: Boolean(guideResult && Object.keys(guideResult).length),
        hasXray: Boolean(xrayReportText || xrayRegions.length),
        hasPottery: Boolean(potteryInspection),
        hasVca: Boolean(vcaAssessment),
        potteryDetail: potteryInspection?.detail || null,
        xrayDamageCount: xrayRegions.filter(
          (r) => r.review_decision === "damage",
        ).length,
      });
    } catch (requestError) {
      setGenerateError(requestError.message || "보고서 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  /**
   * 저장(다운로드) 시점에만 사진을 모은다.
   * - 육안조사/X-ray 사진 → "처리 전 상태조사"(pre_investigation) 섹션
   * - 보존가이드 단계별 사진 → 각 단계 key(disassembly/cleaning/reinforcement/
   *   bonding/restoration) 섹션. assemble.py가 title이 아니라 이 key로
   *   사진을 매칭하므로 key 이름을 그대로 써야 한다.
   * 사진 하나가 실패해도(깨진 URL 등) 전체 다운로드는 막지 않고 그 사진만 뺀다.
   */
  const gatherPhotos = async () => {
    const photos = {};

    const addPhoto = (sectionKey, caption, base64) => {
      if (!photos[sectionKey]) photos[sectionKey] = [];
      photos[sectionKey].push({ caption, image_base64: base64 });
    };

    // 육안조사: S3에 업로드된 마스킹 사진이 있으면 그걸 우선 쓰고(다른
    // 세션/기기에서도 유효), 없으면 이번 세션에서 합성한 base64를 쓴다.
    // 업로드 URL만 있고 base64가 없는 경우(다른 세션에서 이어받은 경우 등)를
    // 대비해 URL이면 fetch해서 base64로 변환한다 - report-ai는 base64만 받는다.
    let annotatedImageBase64 =
      visualResultForThisArtifact?.__annotatedImageBase64;
    let annotatedPhotoUrl = visualResultForThisArtifact?.__annotatedPhotoUrl;

    if (!annotatedPhotoUrl) {
      try {
        const latestPotteryJob = await getLatestInspectionJob(project.artifactId);
        annotatedPhotoUrl = latestPotteryJob?.annotatedPhotoUrl || null;
      } catch (serverPhotoError) {
        console.error("서버 보정 이미지 조회 실패:", serverPhotoError);
      }
    }

    if (!annotatedImageBase64 && !annotatedPhotoUrl) {
      try {
        annotatedPhotoUrl = sessionStorage.getItem(
          `${ANNOTATED_IMAGE_URL_STORAGE_KEY}:${project.artifactId}`,
        );
        annotatedImageBase64 = sessionStorage.getItem(
          `${ANNOTATED_IMAGE_STORAGE_KEY}:${project.artifactId}`,
        );
      } catch (storageError) {
        console.error("마스킹 사진 임시 저장본 조회 실패:", storageError);
      }
    }

    if (annotatedPhotoUrl) {
      try {
        const base64 = await urlToBase64(annotatedPhotoUrl);
        addPhoto("pre_investigation_visual", "육안조사 문양 식별 결과", base64);
      } catch (photoError) {
        console.error(
          "마스킹 사진(S3) 첨부 실패, base64로 재시도:",
          photoError,
        );
        if (annotatedImageBase64) {
          addPhoto(
            "pre_investigation_visual",
            "육안조사 문양 식별 결과",
            annotatedImageBase64,
          );
        }
      }
    } else if (annotatedImageBase64) {
      addPhoto(
        "pre_investigation_visual",
        "육안조사 문양 식별 결과",
        annotatedImageBase64,
      );
    }

    const rememberedXray = getRememberedXrayJob(project.artifactId);
    const xrayJob = rememberedXray?.jobId
      ? rememberedXray
      : await getStitchJobByArtifactId(project.artifactId).catch(() => null);
    if (xrayJob?.jobId) {
      try {
        const file = await downloadFinalStitchResult(
          xrayJob.jobId,
          "assembled_final.png",
        );
        const base64 = await blobToBase64(file);
        addPhoto("pre_investigation_xray", "X-ray 결합 이미지", base64);
      } catch (photoError) {
        console.error("X-ray 이미지 첨부 실패:", photoError);
      }
    }

    {
      try {
        const task = taskId
          ? await getTask(taskId).catch(() => null)
          : await getLatestTaskByArtifact(project.artifactId).catch(() => null);
        const results = task?.results || {};
        for (const [stageKey, stageResult] of Object.entries(results)) {
          const urls = stageResult?.photo || stageResult?.photo_urls;
          if (!Array.isArray(urls) || urls.length === 0) continue;

          for (const url of urls) {
            try {
              const base64 = await urlToBase64(url);
              addPhoto(stageKey, `${stageKey} 작업 사진`, base64);
            } catch (photoError) {
              console.error(`${stageKey} 사진 첨부 실패:`, photoError);
            }
          }
        }
      } catch (photoError) {
        console.error("보존가이드 사진 조회 실패:", photoError);
      }
    }

    return photos;
  };

  const handleDownload = async () => {
    if (!reportJson || !project || downloading) return;

    setDownloading(true);
    setGenerateError("");

    try {
      const photos = await gatherPhotos();

      // 사진까지 포함한 DOCX를 S3/DB에 저장한 뒤 같은 파일을 다운로드한다.
      const stored = await saveReportDocument({
        artifactId: project.artifactId,
        reportJson,
        photos,
      });
      setSavedReport(stored);

      if (!stored?.docxDownloadUrl) {
        throw new Error("저장된 DOCX 다운로드 주소가 없습니다.");
      }
      await downloadReportFromUrl(
        stored.docxDownloadUrl,
        `${project.name}_최종보고서.docx`,
      );

      addMyReport({
        id: `final-report-${project.artifactId}-${Date.now()}`,
        title: `${project.name} 최종 통합 보고서`,
        project: project.name,
        date: new Date().toISOString().slice(0, 10),
        artifactInfo: project,
        summary: [
          reportSources?.hasGuide
            ? "복원 가이드 작업 결과 연결 완료"
            : "복원 가이드 결과 없이 생성됨",
          reportSources?.hasXray
            ? "X-RAY 파편 결합 및 결함 조사 결과 연결 완료"
            : "X-RAY 결과 없이 생성됨",
          reportSources?.hasVca || reportSources?.hasPottery
            ? "육안 상태 조사 결과 연결 완료"
            : "육안조사 결과 없이 생성됨",
        ],
        methods: [],
        futureCare:
          "세 모듈의 확정 결과를 바탕으로 정기적인 상태 점검과 보존 환경 관리를 권장한다.",
        reportType: "FINAL_INTEGRATED",
      });

      setSaved(true);
    } catch (requestError) {
      setGenerateError(requestError.message || "다운로드에 실패했습니다.");
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenSavedReport = () => {
    if (!savedReport?.reportJson) return;
    setReportJson(savedReport.reportJson);
    setReportSources(null);
    setGenerateError("");
    setGenerationNotice("");
    setSaved(false);
  };

  if (loading || savedReportLoading) {
    return (
      <div className="final-report-page">
        <HeritageHeader active="projects" />
        <main className="final-report-state">
          <span>FINAL REPORT</span>
          <h1>보고서 생성 조건을 확인하는 중입니다.</h1>
        </main>
      </div>
    );
  }

  if (!project || error) {
    return (
      <div className="final-report-page">
        <HeritageHeader active="projects" />
        <main className="final-report-state">
          <span>REPORT UNAVAILABLE</span>
          <h1>유물 정보를 불러올 수 없습니다.</h1>
          <p>{error || "프로젝트 목록에서 유물을 다시 선택해주세요."}</p>
          <button onClick={() => navigate("/worklist")}>프로젝트 목록</button>
        </main>
      </div>
    );
  }

  return (
    <div className="final-report-page">
      <HeritageHeader active="projects" />

      {generating && (
        <div
          className="final-report-generating-overlay"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="final-report-generating-modal">
            <span className="final-report-spinner" aria-hidden="true" />
            <span>FINAL REPORT</span>
            <h2>최종보고서를 생성하고 있습니다.</h2>
            <p>보존가이드 · X-RAY · 육안조사 결과를 종합하고 있습니다.</p>
            <small>생성이 완료될 때까지 잠시만 기다려주세요.</small>
          </div>
        </div>
      )}

      <main className="final-report-main">
        <button
          className="final-report-back"
          onClick={() => navigate(getArtifactRoute(project.artifactId))}
        >
          ← 유물 워크스페이스
        </button>

        <header className="final-report-heading">
          <div>
            <span>FINAL INTEGRATED REPORT</span>
            <h1>최종 복원 결과 보고서</h1>
            <p>
              {project.name} · {project.artifactId}
            </p>
          </div>
          <strong className={reportReady ? "ready" : "locked"}>
            {reportReady ? "생성 가능" : "생성 대기"}
          </strong>
        </header>

        {!reportReady ? (
          <section className="final-report-lock">
            <span className="final-report-lock-icon">LOCK</span>
            <div>
              <h2>아직 최종 보고서를 생성할 수 없습니다.</h2>
              <p>
                세 기능은 원하는 순서로 독립 진행할 수 있지만, 최종 보고서는
                모두 완료된 뒤 생성됩니다.
              </p>
              <ul>
                {missingModules.map((module) => (
                  <li key={module.key}>
                    <span>{module.number}</span>
                    <strong>{module.title}</strong>
                    <button
                      onClick={() =>
                        navigate(
                          `/artifacts/${encodeURIComponent(project.artifactId)}/${module.key}`,
                        )
                      }
                    >
                      작업하기 →
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : !reportJson ? (
          <>
            <section className="final-report-paper">
              <div className="final-report-title">
                <span>VORA CONSERVATION RECORD</span>
                <h2 className="report-artifact-name">{project.name}</h2>
                <p className="report-artifact-id">{project.artifactId}</p>
                <div className="report-meta-row">
                  <span>시대 · {project.period}</span>
                  <span>재질 · {project.material}</span>
                  {project.weight && <span>무게 · {project.weight}</span>}
                </div>
              </div>

              <div className="final-report-artifact-grid">
                <div>
                  <span>관리번호</span>
                  <strong>{project.artifactId}</strong>
                </div>
                <div>
                  <span>재질</span>
                  <strong>{project.material}</strong>
                </div>
                <div>
                  <span>시대</span>
                  <strong>{project.period}</strong>
                </div>
                <div>
                  <span>처리 전 상태</span>
                  <strong>{project.condition || "기록 없음"}</strong>
                </div>
              </div>

              <div className="final-report-modules">
                {WORKSPACE_MODULES.map((module) => (
                  <article key={module.key}>
                    <span>{module.number}</span>
                    <div>
                      <h3>{module.title}</h3>
                      <p>{module.description}</p>
                    </div>
                    <strong>결과 연결 완료</strong>
                  </article>
                ))}
              </div>

              {!savedReportLoading && savedReport?.reportJson && (
                <div className="final-report-saved-card">
                  <div>
                    <span>SAVED REPORT</span>
                    <strong>기존 최종보고서가 저장되어 있습니다.</strong>
                    <p>
                      마지막 저장 · {new Date(savedReport.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div className="final-report-saved-actions">
                    <button
                      type="button"
                      className="final-report-secondary"
                      onClick={handleOpenSavedReport}
                    >
                      최종보고서 보기
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateReport({ stayOnCurrentView: true })}
                      disabled={generating}
                    >
                      {generating ? "재생성 중..." : "다시 생성하기"}
                    </button>
                  </div>
                </div>
              )}

              <p className="final-report-note">
                "최종 보고서 생성"을 누르면 AI가 세 모듈의 결과를 종합해
                보고서를 만들고, 이 화면에서 먼저 내용을 확인할 수 있습니다.
                사진은 "저장하기"를 누를 때 모아서 docx에 함께 담깁니다.
              </p>
            </section>

            <div className="final-report-actions">
              {generateError && (
                <span className="final-report-error">{generateError}</span>
              )}
              {generationNotice && !generateError && (
                <span className="final-report-success">{generationNotice}</span>
              )}
              <div className="final-report-actions-right">
                {!savedReport?.reportJson && (
                  <button onClick={handleGenerateReport} disabled={generating}>
                    {generating ? "생성 중..." : "최종 보고서 생성"}
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <section className="final-report-paper report-preview">
              <div className="final-report-title">
                <span>VORA CONSERVATION RECORD · 미리보기</span>
                <h2 className="report-artifact-name">{project.name}</h2>
                <p className="report-artifact-id">{project.artifactId}</p>
                <div className="report-meta-row">
                  <span>시대 · {project.period}</span>
                  <span>재질 · {project.material}</span>
                  {project.weight && <span>무게 · {project.weight}</span>}
                </div>
              </div>

              <div className="report-preview-body">
                {(reportJson.sections || []).map((section, i) => (
                  <ReportSection
                    key={i}
                    section={section}
                    index={i + 1}
                    badgeSlot={
                      isPreInvestigationSection(section) ? (
                        <VisualInspectionBadges
                          detail={reportSources?.potteryDetail}
                          xrayDamageCount={reportSources?.xrayDamageCount}
                        />
                      ) : null
                    }
                    photoSlot={
                      isPreInvestigationSection(section) && previewPhotoSrc ? (
                        <img
                          className="report-preview-photo"
                          src={previewPhotoSrc}
                          alt="육안조사 문양 식별 결과"
                        />
                      ) : null
                    }
                  />
                ))}
              </div>
            </section>

            <div className="final-report-actions">
              <div className="final-report-actions-status">
                {generateError && (
                  <span className="final-report-error">{generateError}</span>
                )}
                {generationNotice && !generateError && (
                  <span className="final-report-success">{generationNotice}</span>
                )}
                {saved && !generateError && !generationNotice && (
                  <span>다운로드 완료 - 내 보고서에도 저장되었습니다.</span>
                )}
              </div>
              <div className="final-report-actions-right">
                <button
                  type="button"
                  className="final-report-secondary"
                  onClick={() => navigate(getArtifactRoute(project.artifactId))}
                  disabled={generating || downloading}
                >
                  ← 뒤로가기
                </button>
                <button
                  className="final-report-secondary"
                  onClick={() => handleGenerateReport({ stayOnCurrentView: true })}
                  disabled={generating || downloading}
                >
                  {generating ? "다시 생성 중..." : "다시 생성하기"}
                </button>
                <button onClick={handleDownload} disabled={downloading}>
                  {downloading
                    ? "사진 첨부 중..."
                    : "저장하기 (.docx 다운로드)"}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default FinalReportPage;
