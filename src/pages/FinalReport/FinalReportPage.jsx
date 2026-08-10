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
import { getTask } from "../../services/conservationGuideApi";
import {
  downloadFinalStitchResult,
  getRememberedXrayJob,
  getWorkflowDefects,
  getWorkflowReportText,
} from "../../services/xrayApi";
import {
  downloadBlob,
  generateReportJson,
  reportJsonToDocx,
} from "../../services/reportApi";
import "./FinalReportPage.css";

/**
 * xrayApi의 결함 형태(regionId/position/userNote/reviewDecision, 카멜케이스)를
 * report-ai가 읽는 xray_regions 원소 형태(snake_case)로 바꾼다.
 * report-ai의 pre_investigation_node는 review_decision이 정확히 "damage"
 * 문자열일 때만 확정 이상영역으로 취급하므로 대소문자를 맞춰준다.
 */
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
    reader.onerror = () => reject(reader.error || new Error("이미지 인코딩 실패"));
    reader.readAsDataURL(blob);
  });
}

/** 이미지 URL(S3 등)을 fetch해서 base64로 바꾼다. */
async function urlToBase64(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`이미지를 불러오지 못했습니다 (HTTP ${response.status}): ${url}`);
  }
  return blobToBase64(await response.blob());
}

/** report_json 섹션 하나를 문서처럼 렌더링한다 (header는 표, 나머지는 문단). */
function ReportSection({ section, index }) {
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

  const paragraphs = String(section.body || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section className="report-preview-section">
      <h3>
        {index}. {section.title}
      </h3>
      {paragraphs.length === 0 ? (
        <p className="report-preview-empty">내용이 없습니다.</p>
      ) : (
        paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)
      )}
    </section>
  );
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

  const missingModules = useMemo(
    () =>
      project
        ? WORKSPACE_MODULES.filter(
            (module) => project.modules[module.key] !== MODULE_STATUS.DONE,
          )
        : [],
    [project],
  );

  const reportReady = Boolean(project) && missingModules.length === 0;

  const handleGenerateReport = async () => {
    if (!reportReady || !project || generating) return;

    setGenerating(true);
    setGenerateError("");
    setReportJson(null);
    setSaved(false);

    try {
      // 보존가이드: 이 세션에서 작업한 taskId가 context에 남아있을 때만 조회된다
      // (페이지를 새로고침하면 taskId가 초기화되므로, 그 경우 guide_result 없이
      // 나머지 결과만으로 생성한다 - report-ai가 없는 항목은 알아서 건너뛴다).
      const task = taskId ? await getTask(taskId).catch(() => null) : null;
      const guideResult = task?.results ?? {};

      // X-ray: artifactId로 기억해둔 job이 있을 때만 조회한다.
      const rememberedXray = getRememberedXrayJob(project.artifactId);
      let xrayReportText = null;
      let xrayRegions = [];
      if (rememberedXray?.jobId) {
        const [defectResult, reportResult] = await Promise.all([
          getWorkflowDefects(rememberedXray.jobId).catch(() => null),
          getWorkflowReportText(rememberedXray.jobId).catch(() => null),
        ]);
        xrayReportText = reportResult?.reportText || null;
        xrayRegions = (defectResult?.defects || []).map(toReportXrayRegion);
      }

      // 육안조사: VisualPage.jsx가 저장해둔 결과가 이 유물 것일 때만 사용한다.
      const potteryInspection =
        visualResult && visualResult.__artifactId === project.artifactId
          ? {
              inspection_text: visualResult.inspection_text || "",
              human_review_recommended: Boolean(
                visualResult.human_review_recommended,
              ),
              detail: visualResult.detail || {},
            }
          : null;

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
          weight: task?.relicInfo?.weight,
          bondingArea: task?.relicInfo?.bondingArea,
          treatmentPurpose: task?.relicInfo?.treatmentPurpose,
        },
        guide_result: guideResult,
        xray_report_text: xrayReportText,
        xray_regions: xrayRegions,
        pottery_inspection: potteryInspection,
        photos: {},
      };

      const json = await generateReportJson(payload);
      setReportJson(json);
      setReportSources({
        hasGuide: Boolean(guideResult && Object.keys(guideResult).length),
        hasXray: Boolean(xrayReportText),
        hasPottery: Boolean(potteryInspection),
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

    if (visualResult?.__photoUrl && visualResult.__artifactId === project.artifactId) {
      try {
        const base64 = await urlToBase64(visualResult.__photoUrl);
        addPhoto("pre_investigation", "육안조사 촬영 사진", base64);
      } catch (photoError) {
        console.error("육안조사 사진 첨부 실패:", photoError);
      }
    }

    const rememberedXray = getRememberedXrayJob(project.artifactId);
    if (rememberedXray?.jobId) {
      try {
        const file = await downloadFinalStitchResult(
          rememberedXray.jobId,
          "assembled_final.png",
        );
        const base64 = await blobToBase64(file);
        addPhoto("pre_investigation", "X-ray 결합 이미지", base64);
      } catch (photoError) {
        console.error("X-ray 이미지 첨부 실패:", photoError);
      }
    }

    if (taskId) {
      try {
        const task = await getTask(taskId);
        const results = task?.results || {};
        for (const [stageKey, stageResult] of Object.entries(results)) {
          const urls = stageResult?.photo;
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

      // LLM을 다시 부르지 않고, 이미 만든 report_json을 docx로만 변환한다.
      const blob = await reportJsonToDocx({
        artifactId: project.artifactId,
        reportJson,
        photos,
      });
      downloadBlob(blob, `${project.name}_최종보고서.docx`);

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
          reportSources?.hasPottery
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

  if (loading) {
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
                <h2>{project.name} 최종 통합 보고서</h2>
                <p>
                  {project.material} · {project.period}
                </p>
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
              <button onClick={handleGenerateReport} disabled={generating}>
                {generating ? "생성 중..." : "최종 보고서 생성"}
              </button>
            </div>
          </>
        ) : (
          <>
            <section className="final-report-paper report-preview">
              <div className="final-report-title">
                <span>VORA CONSERVATION RECORD · 미리보기</span>
                <h2>{project.name} 최종 통합 보고서</h2>
                <p>
                  {project.material} · {project.period}
                </p>
              </div>

              <div className="report-preview-body">
                {(reportJson.sections || []).map((section, i) => (
                  <ReportSection key={i} section={section} index={i + 1} />
                ))}
              </div>
            </section>

            <div className="final-report-actions">
              {generateError && (
                <span className="final-report-error">{generateError}</span>
              )}
              {saved && !generateError && (
                <span>다운로드 완료 - 내 보고서에도 저장되었습니다.</span>
              )}
              <button
                className="final-report-secondary"
                onClick={handleGenerateReport}
                disabled={generating || downloading}
              >
                {generating ? "다시 생성 중..." : "다시 생성하기"}
              </button>
              <button onClick={handleDownload} disabled={downloading}>
                {downloading ? "사진 첨부 중..." : "저장하기 (.docx 다운로드)"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default FinalReportPage;
