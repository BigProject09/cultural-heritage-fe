import { useCallback, useEffect, useMemo, useState } from "react";
import { getWorkspaceProject, selectWorkspaceProject } from "../../data/workspaceProjects";
import {
  createVcaPdfJob,
  createVcaRun,
  deleteVcaCorpusPdf,
  deleteVcaImage,
  getVcaArtifact,
  getVcaCorpusPdfs,
  getVcaIntermediateResults,
  getVcaPdfJob,
  getVcaReport,
  isVcaMockMode,
  runVcaPotteryInspection,
  uploadVcaCorpusPdf,
  uploadVcaImage,
} from "../../services/vcaApi";

const IMAGE_TYPES = "image/png,image/jpeg,image/webp";
const ACTIVE_RUN_STATUSES = new Set(["QUEUED", "RUNNING"]);

function operationMessage(error, action) {
  if (error?.status === 409) {
    return `${action}할 수 없습니다. 이전 작업이 아직 완료되지 않았습니다.`;
  }
  return `${action} 실패: ${error.message}`;
}

function emptyVcaArtifact(artifactId, workspaceArtifact) {
  return {
    artifactId,
    displayName: workspaceArtifact.name || `Artifact ${artifactId}`,
    status: "DRAFT",
    uploadedImages: [],
    runs: [],
  };
}

function latestRun(runs = []) {
  return [...runs].sort((first, second) => {
    const firstTime = new Date(first.createdAt || 0).getTime();
    const secondTime = new Date(second.createdAt || 0).getTime();
    return secondTime - firstTime;
  })[0] || null;
}

function isVcaGatewayUrl(url = "") {
  return url.includes("/api/vca/");
}

export function useVisualInvestigation(artifactId) {
  const [workspaceArtifact, setWorkspaceArtifact] = useState({});
  const [artifact, setArtifact] = useState(null);
  const [corpusPdfs, setCorpusPdfs] = useState([]);
  const [corpusLoading, setCorpusLoading] = useState(true);
  const [corpusWorking, setCorpusWorking] = useState("");
  const [corpusError, setCorpusError] = useState(null);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [report, setReport] = useState(null);
  const [reportRunId, setReportRunId] = useState("");
  const [intermediateResults, setIntermediateResults] = useState(null);
  const [previewUrls, setPreviewUrls] = useState({});
  const [pdfJob, setPdfJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(null);
  const selectedRun = useMemo(
    () => artifact?.runs?.find((run) => run.runId === selectedRunId) || null,
    [artifact, selectedRunId],
  );
  const selectedRunStatus = selectedRun?.status;
  const uploadedImages = useMemo(
    () => (artifact?.uploadedImages || []).map((image) => {
      const previewUrl = previewUrls[image.imageId];
      if (previewUrl) return { ...image, imageUrl: previewUrl, downloadUrl: previewUrl };
      if (isVcaGatewayUrl(image.imageUrl)) return { ...image, imageUrl: "", downloadUrl: "" };
      return image;
    }),
    [artifact, previewUrls],
  );
  const runIsActive = ACTIVE_RUN_STATUSES.has(selectedRun?.status);

  const withPreviewReport = useCallback((nextReport) => ({
    ...nextReport,
    images: (nextReport.images || []).map((image) => {
      const previewUrl = previewUrls[image.imageId];
      if (previewUrl) return { ...image, imageUrl: previewUrl, downloadUrl: previewUrl };
      if (isVcaGatewayUrl(image.downloadUrl)) return { ...image, imageUrl: "", downloadUrl: "" };
      return image;
    }),
  }), [previewUrls]);

  const loadArtifact = useCallback(async ({ silent = false } = {}) => {
    if (!artifactId) {
      setError(new Error("유물 ID가 없습니다."));
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setError(null);
    const [workspaceResult, vcaResult] = await Promise.allSettled([
      getWorkspaceProject(artifactId),
      getVcaArtifact(artifactId),
    ]);
    if (workspaceResult.status === "fulfilled") {
      setWorkspaceArtifact(selectWorkspaceProject(workspaceResult.value));
    }
    if (vcaResult.status === "rejected") {
      const workspaceValue = workspaceResult.status === "fulfilled"
        ? selectWorkspaceProject(workspaceResult.value)
        : {};
      if (vcaResult.reason?.status === 404 && vcaResult.reason?.code === "ARTIFACT_NOT_FOUND") {
        setArtifact(emptyVcaArtifact(artifactId, workspaceValue));
        setSelectedRunId("");
        setNotice("이 유물의 VCA 조사를 새로 시작합니다. 이미지를 먼저 업로드하세요.");
      } else {
        setError(vcaResult.reason);
      }
    } else {
      const nextArtifact = vcaResult.value;
      const nextLatestRun = latestRun(nextArtifact.runs);
      setArtifact(nextArtifact);
      setSelectedRunId((current) => {
        if (current && nextArtifact.runs?.some((run) => run.runId === current)) return current;
        return nextLatestRun?.runId || "";
      });
    }
    if (!silent) setLoading(false);
  }, [artifactId]);

  const loadCorpusPdfs = useCallback(async ({ signal } = {}) => {
    setCorpusLoading(true);
    setCorpusError(null);
    try {
      const pdfs = await getVcaCorpusPdfs({ signal });
      setCorpusPdfs(pdfs);
      return pdfs;
    } catch (corpusLoadError) {
      if (corpusLoadError?.name !== "AbortError") setCorpusError(corpusLoadError);
      throw corpusLoadError;
    } finally {
      setCorpusLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadArtifact().catch((loadError) => {
        setError(loadError);
        setLoading(false);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadArtifact]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      loadCorpusPdfs({ signal: controller.signal }).catch(() => {});
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadCorpusPdfs]);

  const refreshStatus = useCallback(async () => {
    setWorking("refresh");
    try {
      await loadArtifact({ silent: true });
      setNotice("분석 상태를 갱신했습니다.");
    } catch (refreshError) {
      setNotice(operationMessage(refreshError, "분석 상태를 갱신"));
    } finally {
      setWorking("");
    }
  }, [loadArtifact]);

  async function selectFiles(event) {
    const files = Array.from(event.target.files || []).filter((file) =>
      IMAGE_TYPES.split(",").includes(file.type),
    );
    event.target.value = "";
    if (files.length === 0) {
      setNotice("PNG, JPG, WEBP 이미지 파일을 선택하세요.");
      return;
    }

    setWorking("upload");
    setNotice("");
    try {
      const uploaded = [];
      const nextPreviewUrls = {};
      for (const file of files) {
        const image = await uploadVcaImage(artifactId, file);
        uploaded.push(image);
        nextPreviewUrls[image.imageId] = URL.createObjectURL(file);
      }
      setPreviewUrls((current) => ({ ...current, ...nextPreviewUrls }));
      setArtifact(await getVcaArtifact(artifactId));
      setReport(null);
      setReportRunId("");
      setIntermediateResults(null);
      setPdfJob(null);
      setNotice(`${uploaded.length}개 이미지를 등록했습니다.`);
    } catch (uploadError) {
      setNotice(operationMessage(uploadError, "이미지를 업로드"));
    } finally {
      setWorking("");
    }
  }

  async function removeImage(imageId) {
    setWorking(`delete-${imageId}`);
    setNotice("");
    try {
      await deleteVcaImage(artifactId, imageId);
      setArtifact((current) => ({ ...current, uploadedImages: current.uploadedImages.filter((image) => image.imageId !== imageId) }));
      setIntermediateResults(null);
      setPreviewUrls((current) => {
        const next = { ...current };
        if (next[imageId]) URL.revokeObjectURL(next[imageId]);
        delete next[imageId];
        return next;
      });
      setNotice("이미지를 삭제했습니다.");
    } catch (deleteError) {
      setNotice(operationMessage(deleteError, "이미지를 삭제"));
    } finally {
      setWorking("");
    }
  }

  async function uploadCorpusFiles(files) {
    const pdfFiles = Array.from(files || []).filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfFiles.length === 0) {
      setCorpusError(new Error("PDF 파일을 선택하세요."));
      return;
    }

    setCorpusWorking("upload");
    setCorpusError(null);
    setNotice("");
    try {
      for (const file of pdfFiles) {
        const uploadedPdf = await uploadVcaCorpusPdf(file);
        setCorpusPdfs((current) => [uploadedPdf, ...current]);
      }
      setNotice(`${pdfFiles.length}개 PDF를 RAG 문서 corpus에 등록했습니다.`);
    } catch (uploadError) {
      setCorpusError(uploadError);
      setNotice(operationMessage(uploadError, "RAG 문서 corpus에 PDF를 업로드"));
    } finally {
      setCorpusWorking("");
    }
  }

  async function removeCorpusPdf(fileName) {
    setCorpusWorking(`delete-${fileName}`);
    setCorpusError(null);
    setNotice("");
    try {
      await deleteVcaCorpusPdf(fileName);
      setCorpusPdfs((current) => current.filter((pdf) => pdf.fileName !== fileName));
      setNotice("RAG 문서 corpus에서 PDF를 삭제했습니다.");
    } catch (deleteError) {
      setCorpusError(deleteError);
      setNotice(operationMessage(deleteError, "RAG 문서 corpus에서 PDF를 삭제"));
    } finally {
      setCorpusWorking("");
    }
  }

  async function startRun() {
    setWorking("run");
    setNotice("");
    try {
      const run = await createVcaRun(artifactId, {
        material: workspaceArtifact.material,
      });
      setArtifact(await getVcaArtifact(artifactId));
      setSelectedRunId(run.runId);
      setReport(null);
      setReportRunId("");
      setIntermediateResults(null);
      setPdfJob(null);
      setNotice("분석 작업을 접수했습니다. 진행 상태는 자동으로 갱신됩니다.");
    } catch (runError) {
      setNotice(operationMessage(runError, "분석을 시작"));
    } finally {
      setWorking("");
    }
  }

  const loadReport = useCallback(async (runId = selectedRunId, { silentNotReady = false } = {}) => {
    if (!runId) {
      setNotice("불러올 분석 실행을 선택하세요.");
      return;
    }

    setWorking("report");
    setNotice("");
    try {
      const result = await getVcaReport(artifactId, runId);
      const nextReport = result.report || result;
      setReport(withPreviewReport(nextReport));
      setReportRunId(runId);
      const completedRun = result.run || {
        assessmentRunId: runId,
        runId,
        status: "COMPLETED",
      };
      setArtifact((current) => ({
        ...current,
        runs: current.runs.map((run) =>
          run.runId === completedRun.runId
            ? { ...run, ...completedRun }
            : run,
        ),
      }));
      setPdfJob(nextReport.pdfJob || null);
      setNotice("보고서를 불러왔습니다. AI 결과는 전문가 검토 전 초안입니다.");
    } catch (reportError) {
      if (silentNotReady && reportError?.status === 409) {
        return;
      }
      setNotice(operationMessage(reportError, "보고서를 불러오기"));
    } finally {
      setWorking("");
    }
  }, [artifactId, selectedRunId, withPreviewReport]);

  useEffect(() => {
    if (!selectedRun || !ACTIVE_RUN_STATUSES.has(selectedRun.status)) return undefined;
    const timer = window.setInterval(() => {
      loadArtifact({ silent: true }).catch((pollError) => {
        setNotice(operationMessage(pollError, "분석 상태를 갱신"));
      });
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [loadArtifact, selectedRun]);

  useEffect(() => {
    if (!selectedRun || selectedRun.status !== "COMPLETED") return undefined;
    if (reportRunId === selectedRun.runId) return undefined;
    const timer = window.setTimeout(() => {
      loadReport(selectedRun.runId, { silentNotReady: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReport, reportRunId, selectedRun]);

  useEffect(() => {
    if (selectedRunStatus !== "COMPLETED" || reportRunId !== selectedRunId) return undefined;

    let isCurrent = true;
    getVcaIntermediateResults(artifactId, selectedRunId)
      .then((result) => {
        if (isCurrent) setIntermediateResults(result);
      })
      .catch(() => {
        if (isCurrent) setIntermediateResults(null);
      });

    return () => {
      isCurrent = false;
    };
  }, [artifactId, reportRunId, selectedRunId, selectedRunStatus]);

  async function handlePdfJob() {
    if (!selectedRunId) return;
    setWorking("pdf");
    setNotice("");
    try {
      const job = pdfJob
        ? await getVcaPdfJob(artifactId, pdfJob.jobId)
        : await createVcaPdfJob(artifactId, selectedRunId);
      setPdfJob(job);
      setNotice(job.status === "COMPLETED" ? "PDF가 준비되었습니다. 다운로드를 열 수 있습니다." : "PDF 생성 작업을 접수했습니다. 상태 확인을 다시 선택하세요.");
    } catch (pdfError) {
      setNotice(operationMessage(pdfError, "PDF 작업을 처리"));
    } finally {
      setWorking("");
    }
  }

  async function handlePotteryInspection() {
    if (!selectedRunId) return;
    setWorking("pottery");
    setNotice("");
    try {
      const nextReport = await runVcaPotteryInspection(artifactId, selectedRunId, {
        material: workspaceArtifact.material,
      });
      setReport(withPreviewReport(nextReport));
      setReportRunId(selectedRunId);
      setNotice(
        nextReport.potteryInspectionStatus?.status === "FAILED"
          ? "도자기 검사를 완료하지 못했습니다. 보고서는 유지되며 다시 시도할 수 있습니다."
          : "도자기 검사 결과를 보고서에 반영했습니다.",
      );
    } catch (potteryError) {
      setNotice(operationMessage(potteryError, "도자기 검사를 실행"));
    } finally {
      setWorking("");
    }
  }

  function selectRun(run) {
    setSelectedRunId(run.runId);
    setReport(null);
    setReportRunId("");
    setIntermediateResults(null);
    setPdfJob(run.pdfJob || null);
  }

  return {
    artifact,
    corpusError,
    corpusLoading,
    corpusPdfs,
    corpusWorking,
    error,
    isMock: isVcaMockMode(),
    loadArtifact,
    loadCorpusPdfs,
    loadReport,
    loading,
    notice,
    pdfJob,
    refreshStatus,
    removeCorpusPdf,
    removeImage,
    report,
    runIsActive,
    selectFiles,
    selectedRun,
    selectRun,
    startRun,
    uploadedImages,
    uploadCorpusFiles,
    working,
    workspaceArtifact,
    handlePdfJob,
    handlePotteryInspection,
    intermediateResults,
  };
}
