import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getWorkspaceProject,
  selectWorkspaceProject,
  setWorkspaceVcaArtifactId,
} from "../../data/workspaceProjects";
import {
  cancelVcaRun,
  createVcaArtifact,
  createVcaPdfJob,
  createVcaRun,
  deleteVcaImage,
  getVcaArtifact,
  getVcaPdfJob,
  getVcaReport,
  isVcaMockMode,
  runVcaPotteryInspection,
  uploadVcaImage,
} from "../../services/vcaApi";

const IMAGE_TYPES = "image/png,image/jpeg,image/webp";
const ACTIVE_RUN_STATUSES = new Set(["QUEUED", "RUNNING"]);

// API 에러를 사용자용 안내 문구로 바꾼다. 409는 원인이 서로 다른 두 가지를
// 구분해야 한다 - "다른 분석이 지금 돌고 있어 기다려야 함"(ACTIVE_RUN_EXISTS)과
// "이 이미지가 예전 분석 run에 참조돼 있어 영구히 삭제 불가"(IMAGE_REFERENCED_BY_RUN,
// 기다려도 안 풀림)는 같은 상태 코드지만 안내가 완전히 달라야 한다. 그 외는
// 서버 메시지를 붙여 보여준다. 이 훅의 모든 액션 핸들러가 catch 블록에서
// 공용으로 쓴다.
function operationMessage(error, action) {
  if (error?.code === "IMAGE_REFERENCED_BY_RUN") {
    return "이 이미지는 이미 예전 분석 실행에 사용돼 삭제할 수 없습니다.";
  }
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

// 방금 업로드한 이미지는 서버가 downloadUrl을 내려주기 전까지 잠깐 빈
// 화면으로 보이므로, 업로드 직후 로컬 blob URL로 즉시 미리보기를 채워
// 넣는다. 업로드 목록과 리포트의 이미지 목록 둘 다 같은 방식으로 덮어써야
// 해서 공용 함수로 뺐다.
function withPreviewUrl(image, previewUrls) {
  const previewUrl = previewUrls[image.imageId];
  if (!previewUrl) return image;
  return { ...image, imageUrl: previewUrl, downloadUrl: previewUrl };
}

// VisualPage(육안 상태 조사)가 쓰는 모든 상태와 액션(이미지 업로드/삭제,
// 분석 실행/중지, 보고서·PDF·도자기 검사 불러오기)을 관리하는 훅. 활성
// run은 2초 간격으로 폴링하고, 완료되면 보고서를 자동으로 불러온다.
export function useVisualInvestigation(artifactId) {
  const [workspaceArtifact, setWorkspaceArtifact] = useState({});
  // 워크스페이스 프로젝트 ID(로컬 모드에서는 브라우저 전용 값)와는 다른,
  // BE의 VCA 공유 artifacts 테이블에 실재하는 서버 발급 UUID. 첫 업로드
  // 전에는 비어 있다(createVcaArtifact로 채워짐 - selectFiles 참고).
  const [vcaArtifactId, setVcaArtifactId] = useState("");
  // loadArtifact(useCallback, deps=[artifactId])가 폴링 시점에 최신
  // vcaArtifactId를 stale closure 없이 읽기 위한 미러. state 자체를 deps에
  // 넣으면 콜백이 매번 재생성돼 활성 run 폴링 interval effect가 다시
  // 걸리므로 ref로 우회한다.
  const vcaArtifactIdRef = useRef("");
  useEffect(() => {
    vcaArtifactIdRef.current = vcaArtifactId;
  }, [vcaArtifactId]);
  const [artifact, setArtifact] = useState(null);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [report, setReport] = useState(null);
  const [reportRunId, setReportRunId] = useState("");
  const [previewUrls, setPreviewUrls] = useState({});
  const [pdfJob, setPdfJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [runRequestPending, setRunRequestPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(null);
  const selectedRun = useMemo(
    () => artifact?.runs?.find((run) => run.runId === selectedRunId) || null,
    [artifact, selectedRunId],
  );
  const uploadedImages = useMemo(
    () => (artifact?.uploadedImages || []).map((image) => withPreviewUrl(image, previewUrls)),
    [artifact, previewUrls],
  );
  const runIsActive = ACTIVE_RUN_STATUSES.has(selectedRun?.status);

  // withPreviewUrl을 report.images 전체에 적용한 새 report를 만든다.
  // loadReport, handlePotteryInspection이 서버 응답을 state에 넣기 전에 쓴다.
  // TEMP: conceptFamily가 "unknown"(미분류)인 특이점을 화면에서 잠깐
  // 숨긴다 - 확인이 끝나면 이 필터는 지운다.
  const withPreviewReport = useCallback((nextReport) => ({
    ...nextReport,
    images: (nextReport.images || []).map((image) => withPreviewUrl(image, previewUrls)),
    findings: (nextReport.findings || []).filter((finding) => finding.conceptFamily !== "unknown"),
  }), [previewUrls]);

  // 워크스페이스 정보와 VCA artifact를 함께 불러온다. 마운트 시 1회,
  // 이후 활성 run 폴링 중 silent:true로 반복 호출된다. VCA artifact가
  // 아직 없으면(404 ARTIFACT_NOT_FOUND) 에러 대신 빈 artifact로 초기화해
  // "새로 시작" 화면을 보여준다.
  const loadArtifact = useCallback(async ({ silent = false } = {}) => {
    if (!artifactId) {
      setError(new Error("유물 ID가 없습니다."));
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    if (!silent) setError(null);
    const workspaceResult = await getWorkspaceProject(artifactId).catch((workspaceError) => {
      if (!silent) setError(workspaceError);
      return null;
    });
    if (!workspaceResult && silent) {
      // 활성 run을 2초마다 재조회하는 백그라운드 폴링 중에는, 워크스페이스
      // 프로젝트 조회 한 번 실패했다고 화면을 통째로 에러/빈 상태로 덮어쓰지
      // 않는다 - 이미 알고 있는 vcaArtifactId/진행 중인 run 표시를 그대로 두고
      // 이번 폴링만 건너뛴다(다음 폴링에서 회복 가능). 예전에는 이게 없어서
      // 실행 중인 분석이 화면에서 갑자기 사라지는 것처럼 보였다.
      return;
    }
    const workspaceValue = workspaceResult ? selectWorkspaceProject(workspaceResult) : {};
    if (workspaceResult) setWorkspaceArtifact(workspaceValue);

    // 서버 VCA 아티팩트가 아직 한 번도 만들어지지 않았으면(첫 업로드 전)
    // 워크스페이스 프로젝트에 vcaArtifactId 자체가 없다 - 이 경우 404를
    // 유발할 GET을 굳이 보내지 않고 바로 "새로 시작" 상태로 초기화한다.
    // 이미 알고 있는 vcaArtifactId(state)가 있는데 이번 조회에서만 비어
    // 왔다면(위와 같은 일시적 결함) 기존 값을 그대로 유지한다.
    const resolvedVcaArtifactId = workspaceValue.vcaArtifactId || vcaArtifactIdRef.current || "";
    setVcaArtifactId(resolvedVcaArtifactId);

    if (!resolvedVcaArtifactId) {
      setArtifact(emptyVcaArtifact(artifactId, workspaceValue));
      setSelectedRunId("");
      setNotice("이 유물의 VCA 조사를 새로 시작합니다. 이미지를 먼저 업로드하세요.");
      if (!silent) setLoading(false);
      return;
    }

    const vcaResult = await getVcaArtifact(resolvedVcaArtifactId).then(
      (value) => ({ status: "fulfilled", value }),
      (reason) => ({ status: "rejected", reason }),
    );
    if (vcaResult.status === "rejected") {
      if (vcaResult.reason?.status === 404 && vcaResult.reason?.code === "ARTIFACT_NOT_FOUND") {
        setArtifact(emptyVcaArtifact(artifactId, workspaceValue));
        setSelectedRunId("");
        setNotice("이 유물의 VCA 조사를 새로 시작합니다. 이미지를 먼저 업로드하세요.");
      } else if (!silent) {
        setError(vcaResult.reason);
      }
      // silent 폴링 중 VCA 조회가 일시적으로 실패한 경우도 화면을 덮어쓰지
      // 않는다 - 위 워크스페이스 실패와 같은 이유.
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

  // setTimeout(0)으로 감싸는 이유: effect 본문에서 곧바로 setState를 하면
  // react-hooks/set-state-in-effect 린트 규칙에 걸린다 (연쇄 렌더링 방지
  // 목적). 아래 다른 effect들에서도 같은 이유로 동일한 패턴을 쓴다.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadArtifact().catch((loadError) => {
        setError(loadError);
        setLoading(false);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadArtifact]);

  // 현재 선택된 진행 중 run을 중지한다. VisualPage의 "분석 중지" 버튼에서
  // 호출하며, 서버 응답으로 받은 run 상태를 artifact.runs 안에 낙관적으로
  // 반영한다.
  const cancelRun = useCallback(async () => {
    if (!selectedRunId) return;
    // 클릭 시점에 실제로 중지할 진행 중 run이었는지 미리 기억해둔다 - 서버는
    // 이미 끝난 run의 취소 요청을 에러가 아니라 현재 상태 그대로 돌려주는
    // no-op으로 처리하므로, 응답만 보고는 "중지 요청이 실제로 뭔가를
    // 멈췄는지" 구분할 수 없다.
    const wasActive = runIsActive;
    setWorking("cancel");
    setNotice("");
    try {
      const cancelledRun = await cancelVcaRun(vcaArtifactId, selectedRunId);
      setArtifact((current) => ({
        ...current,
        runs: current.runs.map((run) =>
          run.runId === cancelledRun.runId ? { ...run, ...cancelledRun } : run,
        ),
      }));
      setNotice(
        wasActive
          ? "분석 중지를 요청했습니다."
          : "분석이 이미 종료되어 중지할 항목이 없습니다.",
      );
    } catch (cancelError) {
      setNotice(operationMessage(cancelError, "분석을 중지"));
    } finally {
      setWorking((current) => current === "cancel" ? "" : current);
    }
  }, [vcaArtifactId, selectedRunId, runIsActive]);

  // 파일 input의 onChange 핸들러. 선택한 이미지를 하나씩 업로드하고, 기존
  // report/PDF 상태를 초기화한다(새 이미지가 등록됐으니 이전 분석 결과는
  // 더 이상 최신이 아니다). VisualPage의 "파일 선택 및 업로드"에 연결된다.
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
      // 이 유물의 서버 VCA 아티팩트가 아직 없으면(첫 업로드) 여기서 만든다.
      // state(vcaArtifactId) 갱신은 비동기라 이번 호출 안에서는 지역 변수로
      // 즉시 써야 하고, 다음 로드부터 재사용하도록 워크스페이스 프로젝트에도
      // 영구 저장한다.
      let currentVcaArtifactId = vcaArtifactId;
      if (!currentVcaArtifactId) {
        const created = await createVcaArtifact(workspaceArtifact.name);
        currentVcaArtifactId = created.artifactId;
        await setWorkspaceVcaArtifactId(artifactId, currentVcaArtifactId);
        setVcaArtifactId(currentVcaArtifactId);
      }

      const uploaded = [];
      const nextPreviewUrls = {};
      for (const file of files) {
        const image = await uploadVcaImage(currentVcaArtifactId, file);
        uploaded.push(image);
        nextPreviewUrls[image.imageId] = URL.createObjectURL(file);
      }
      setPreviewUrls((current) => ({ ...current, ...nextPreviewUrls }));
      setArtifact(await getVcaArtifact(currentVcaArtifactId));
      setReport(null);
      setReportRunId("");
      setPdfJob(null);
      setNotice(`${uploaded.length}개 이미지를 등록했습니다.`);
    } catch (uploadError) {
      setNotice(operationMessage(uploadError, "이미지를 업로드"));
    } finally {
      setWorking((current) => current === "upload" ? "" : current);
    }
  }

  // 등록 이미지 하나를 삭제한다. VisualPage 이미지 그리드의 "삭제"
  // 버튼에서 호출하며, blob 미리보기 URL도 함께 해제한다.
  async function removeImage(imageId) {
    const operation = `delete-${imageId}`;
    setWorking(operation);
    setNotice("");
    try {
      await deleteVcaImage(vcaArtifactId, imageId);
      setArtifact((current) => ({ ...current, uploadedImages: current.uploadedImages.filter((image) => image.imageId !== imageId) }));
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
      setWorking((current) => current === operation ? "" : current);
    }
  }

  // 새 분석 run을 접수한다. VisualPage의 "분석 시작"(resume=false) 또는
  // "이어서 분석 시작"(resume=true) 버튼에서 호출하며, 기존 report/PDF
  // 상태를 비워 이전 run의 결과가 남아있지 않게 한다.
  async function startRun({ resume = false } = {}) {
    setRunRequestPending(true);
    setWorking("run");
    setNotice("");
    try {
      const run = await createVcaRun(vcaArtifactId, {
        material: workspaceArtifact.material,
        resume,
      });
      setArtifact(await getVcaArtifact(vcaArtifactId));
      setSelectedRunId(run.runId);
      setReport(null);
      setReportRunId("");
      setPdfJob(null);
      setNotice(
        resume
          ? "이전 실패 지점부터 이어서 분석을 시작했습니다. 진행 상태는 자동으로 갱신됩니다."
          : "분석 작업을 접수했습니다. 진행 상태는 자동으로 갱신됩니다.",
      );
    } catch (runError) {
      setNotice(operationMessage(runError, "분석을 시작"));
    } finally {
      setRunRequestPending(false);
      setWorking((current) => current === "run" ? "" : current);
    }
  }

  // run의 보고서를 불러온다. 아래 "run이 COMPLETED가 되면 자동으로
  // 부른다" effect와, VisualPage에서 재시도할 때 둘 다에서 쓰인다.
  // silentNotReady:true면 아직 준비되지 않음(409)을 조용히 무시한다 -
  // 자동 호출 시점이 서버가 완료 처리를 마치기 직전일 수 있어서다.
  const loadReport = useCallback(async (runId = selectedRunId, { silentNotReady = false } = {}) => {
    if (!runId) {
      setNotice("불러올 분석 실행을 선택하세요.");
      return;
    }

    setWorking("report");
    setNotice("");
    try {
      const result = await getVcaReport(vcaArtifactId, runId);
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
      setWorking((current) => current === "report" ? "" : current);
    }
  }, [vcaArtifactId, selectedRunId, withPreviewReport]);

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

  // run이 실패하면 실패 사유를 시스템 메시지 영역(notice)에 한 번만
  // 띄운다 - run당 한 번만 알리도록 추적하지 않으면, 실패 이후 다른
  // 작업(업로드 등)이 artifact를 다시 불러올 때마다 selectedRun 참조가
  // 바뀌어 방금 뜬 다른 알림을 실패 메시지가 덮어써 버린다.
  const notifiedFailedRunIds = useRef(new Set());
  useEffect(() => {
    if (!selectedRun || selectedRun.status !== "FAILED" || !selectedRun.failureReason) return;
    if (notifiedFailedRunIds.current.has(selectedRun.runId)) return;
    notifiedFailedRunIds.current.add(selectedRun.runId);
    setNotice(selectedRun.failureReason);
  }, [selectedRun]);

  // PDF 생성/상태확인 버튼 핸들러 - pdfJob이 없으면 새로 만들고, 있으면
  // 같은 jobId로 상태만 다시 확인한다(재생성하지 않음). VisualReport
  // 푸터의 "PDF 생성"/"PDF 상태 확인" 버튼에서 호출한다.
  async function handlePdfJob() {
    if (!selectedRunId) return;
    setWorking("pdf");
    setNotice("");
    try {
      const job = pdfJob
        ? await getVcaPdfJob(vcaArtifactId, pdfJob.jobId)
        : await createVcaPdfJob(vcaArtifactId, selectedRunId);
      setPdfJob(job);
      setNotice(job.status === "COMPLETED" ? "PDF가 준비되었습니다. 다운로드를 열 수 있습니다." : "PDF 생성 작업을 접수했습니다. 상태 확인을 다시 선택하세요.");
    } catch (pdfError) {
      setNotice(operationMessage(pdfError, "PDF 작업을 처리"));
    } finally {
      setWorking((current) => current === "pdf" ? "" : current);
    }
  }

  // 도자기 보조 검사를 실행하고 결과를 report에 반영한다. 도자기 재질
  // 유물에 대해 아래 자동 실행 effect가 부르거나, VisualReport의 "도자기
  // 검사 (다시) 실행" 버튼으로 수동으로도 부를 수 있다.
  const handlePotteryInspection = useCallback(async () => {
    if (!selectedRunId) return;
    setWorking("pottery");
    setNotice("");
    try {
      const nextReport = await runVcaPotteryInspection(vcaArtifactId, selectedRunId, {
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
      setWorking((current) => current === "pottery" ? "" : current);
    }
  }, [vcaArtifactId, selectedRunId, withPreviewReport, workspaceArtifact.material]);

  // 도자기 검사 시작 요청 후 report가 NOT_STARTED로 갱신될 때까지는 지연이
  // 있어, 이 run에 대해 이미 자동 실행을 시도했는지 별도로 기억해 두지
  // 않으면 report가 바뀔 때마다 effect가 다시 실행되어 중복 요청된다.
  const autoPotteryAttemptedRunIds = useRef(new Set());

  useEffect(() => {
    const status = report?.potteryInspectionStatus;
    if (!status?.applicable || status.status !== "NOT_STARTED") return undefined;
    if (!selectedRunId || working) return undefined;
    if (autoPotteryAttemptedRunIds.current.has(selectedRunId)) return undefined;
    autoPotteryAttemptedRunIds.current.add(selectedRunId);
    const timer = window.setTimeout(() => {
      handlePotteryInspection();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [handlePotteryInspection, report, selectedRunId, working]);

  return {
    artifact,
    cancelRun,
    error,
    isMock: isVcaMockMode(),
    loadArtifact,
    loading,
    notice,
    pdfJob,
    removeImage,
    report,
    reportRunId,
    runRequestPending,
    runIsActive,
    selectFiles,
    selectedRun,
    startRun,
    uploadedImages,
    working,
    workspaceArtifact,
    handlePdfJob,
    handlePotteryInspection,
  };
}
