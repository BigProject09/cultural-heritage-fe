import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getArtifactStorageMode,
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
  uploadVcaImage,
} from "../../services/vcaApi";
import { getVcaSource } from "../../services/reportApi";

const IMAGE_TYPES = "image/png,image/jpeg,image/webp";
const ACTIVE_RUN_STATUSES = new Set(["QUEUED", "RUNNING"]);
// "api" 저장 모드에서는 워크스페이스 artifactId 자체가 이미 BE의 공유
// artifacts 테이블 UUID다(VcaArtifactEntity와 Artifact가 같은 테이블을
// 매핑) - VCA용으로 별도 UUID를 새로 만들 필요가 없다. "local" 모드(유물이
// 브라우저에만 있는 경우)만 createVcaArtifact로 VCA 전용 서버 레코드를
// 새로 만들어야 한다.
const IS_API_ARTIFACT_STORAGE = getArtifactStorageMode() === "api";

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
  return (
    [...runs].sort((first, second) => {
      const firstTime = new Date(first.createdAt || 0).getTime();
      const secondTime = new Date(second.createdAt || 0).getTime();
      return secondTime - firstTime;
    })[0] || null
  );
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

// VCA 전용 육안 상태 조사 페이지가 쓰는 상태와 액션(이미지 업로드/삭제,
// 분석 실행/중지, 보고서·PDF 조회)을 관리하는 훅. 활성 VCA run은 2초
// 간격으로 폴링하고, 완료되면 보고서를 자동으로 불러온다.
// Pottery 정밀 검사는 별도 페이지와 별도 AssessmentRun 흐름에서 처리한다.
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
  const [reportRecoveredFromServer, setReportRecoveredFromServer] =
    useState(false);
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
    () =>
      (artifact?.uploadedImages || []).map((image) =>
        withPreviewUrl(image, previewUrls),
      ),
    [artifact, previewUrls],
  );

  const runIsActive = ACTIVE_RUN_STATUSES.has(selectedRun?.status);

  // withPreviewUrl을 report.images 전체에 적용한 새 report를 만든다.
  // loadReport가 서버 응답을 state에 넣기 전에 쓴다.
  const withPreviewReport = useCallback(
    (nextReport) => ({
      ...nextReport,
      images: (nextReport.images || []).map((image) =>
        withPreviewUrl(image, previewUrls),
      ),
      findings: nextReport.findings || [],
    }),
    [previewUrls],
  );

  // 워크스페이스 정보와 VCA artifact를 함께 불러온다. 마운트 시 1회,
  // 이후 활성 run 폴링 중 silent:true로 반복 호출된다. VCA artifact가
  // 아직 없으면(404 ARTIFACT_NOT_FOUND) 에러 대신 빈 artifact로 초기화해
  // "새로 시작" 화면을 보여준다.
  const loadArtifact = useCallback(
    async ({ silent = false } = {}) => {
      if (!artifactId) {
        setError(new Error("유물 ID가 없습니다."));
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);
      if (!silent) setError(null);

      const workspaceResult = await getWorkspaceProject(artifactId).catch(
        (workspaceError) => {
          if (!silent) setError(workspaceError);
          return null;
        },
      );

      if (!workspaceResult && silent) {
        // 활성 run을 2초마다 재조회하는 백그라운드 폴링 중에는, 워크스페이스
        // 프로젝트 조회 한 번 실패했다고 화면을 통째로 에러/빈 상태로 덮어쓰지
        // 않는다 - 이미 알고 있는 vcaArtifactId/진행 중인 run 표시를 그대로 두고
        // 이번 폴링만 건너뛴다(다음 폴링에서 회복 가능).
        return;
      }

      const workspaceValue = workspaceResult
        ? selectWorkspaceProject(workspaceResult)
        : {};

      if (workspaceResult) {
        setWorkspaceArtifact(workspaceValue);
      }

      // "api" 모드는 워크스페이스 artifactId 자체가 이미 서버 UUID라 항상
      // 곧바로 조회 가능하다. "local" 모드만 서버 VCA 아티팩트가 아직 한
      // 번도 안 만들어졌을 수 있다(첫 업로드 전) - 이때는 워크스페이스
      // 프로젝트에 vcaArtifactId 자체가 없으므로, 404를 유발할 GET을
      // 보내지 않고 바로 "새로 시작" 상태로 초기화한다.
      const resolvedVcaArtifactId = IS_API_ARTIFACT_STORAGE
        ? artifactId
        : workspaceValue.vcaArtifactId || vcaArtifactIdRef.current || "";

      setVcaArtifactId(resolvedVcaArtifactId);

      if (!resolvedVcaArtifactId) {
        setArtifact(emptyVcaArtifact(artifactId, workspaceValue));
        setSelectedRunId("");
        setNotice(
          "이 유물의 VCA 조사를 새로 시작합니다. 이미지를 먼저 업로드하세요.",
        );

        if (!silent) setLoading(false);
        return;
      }

      const vcaResult = await getVcaArtifact(resolvedVcaArtifactId).then(
        (value) => ({ status: "fulfilled", value }),
        (reason) => ({ status: "rejected", reason }),
      );

      if (vcaResult.status === "rejected") {
        if (
          vcaResult.reason?.status === 404 &&
          vcaResult.reason?.code === "ARTIFACT_NOT_FOUND"
        ) {
          setArtifact(emptyVcaArtifact(artifactId, workspaceValue));
          setSelectedRunId("");
          setNotice(
            "이 유물의 VCA 조사를 새로 시작합니다. 이미지를 먼저 업로드하세요.",
          );
        } else if (!silent) {
          // VCA artifact 상세 조회가 실패하더라도 워크스페이스가 이미 육안조사
          // 완료 상태라면 저장된 assessment_report를 직접 복원한다.
          // /api/reports/{artifactId}/vca-source는 RDS의 최신 VCA 보고서를 읽기
          // 때문에 AI 서비스가 일시적으로 실패해도 완료 결과 재진입이 가능하다.
          try {
            const savedSource = await getVcaSource(artifactId);

            if (savedSource && Object.keys(savedSource).length > 0) {
              const recoveredRunId = `saved-${artifactId}`;

              setArtifact({
                ...emptyVcaArtifact(artifactId, workspaceValue),
                status: "COMPLETED",
                runs: [
                  {
                    runId: recoveredRunId,
                    assessmentRunId: recoveredRunId,
                    status: "COMPLETED",
                    imageCount: 0,
                  },
                ],
              });

              setSelectedRunId(recoveredRunId);
              setReport(withPreviewReport(savedSource));
              setReportRunId(recoveredRunId);
              setReportRecoveredFromServer(true);
              setError(null);
              setNotice(
                "저장된 VCA 완료 결과를 복원했습니다. AI 재요청 없이 기존 보고서를 표시합니다.",
              );
            } else {
              setError(vcaResult.reason);
            }
          } catch (recoveryError) {
            console.error("저장된 VCA 결과 복원 실패:", recoveryError);
            setError(vcaResult.reason);
          }
        }

        // silent 폴링 중 VCA 조회가 일시적으로 실패한 경우는 현재 화면을
        // 덮어쓰지 않고 다음 폴링에서 다시 복구를 시도한다.
      } else {
        const nextArtifact = vcaResult.value;
        setReportRecoveredFromServer(false);
        const nextLatestRun = latestRun(nextArtifact.runs);

        setArtifact(nextArtifact);

        setSelectedRunId((current) => {
          if (
            current &&
            nextArtifact.runs?.some((run) => run.runId === current)
          ) {
            return current;
          }

          return nextLatestRun?.runId || "";
        });
      }

      if (!silent) setLoading(false);
    },
    [artifactId, withPreviewReport],
  );

  // setTimeout(0)으로 감싸는 이유: effect 본문에서 곧바로 setState를 하면
  // react-hooks/set-state-in-effect 린트 규칙에 걸린다. 아래 다른 effect도
  // 같은 이유로 동일한 패턴을 쓴다.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadArtifact().catch((loadError) => {
        setError(loadError);
        setLoading(false);
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadArtifact]);

  // 현재 선택된 진행 중 VCA run을 중지한다.
  // VCA 페이지의 "분석 중지" 버튼에서 호출한다.
  const cancelRun = useCallback(async () => {
    if (!selectedRunId) return;

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
      setWorking((current) => (current === "cancel" ? "" : current));
    }
  }, [vcaArtifactId, selectedRunId, runIsActive]);

  // 파일 input의 onChange 핸들러. 선택한 이미지를 하나씩 업로드하고,
  // 기존 report/PDF 상태를 초기화한다.
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
      // "api" 모드는 워크스페이스 artifactId가 이미 서버 UUID이므로 VCA
      // 전용 레코드를 따로 만들 필요가 없다("local" 모드에서만, 이 유물의
      // 서버 VCA artifact가 아직 없으면 첫 업로드 시 생성한다). state
      // 갱신은 비동기이므로 이번 호출 안에서는 지역 변수를 사용하고, 다음
      // 진입부터 재사용할 수 있도록 워크스페이스에도 저장한다.
      let currentVcaArtifactId = vcaArtifactId;

      if (!currentVcaArtifactId && !IS_API_ARTIFACT_STORAGE) {
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

      setPreviewUrls((current) => ({
        ...current,
        ...nextPreviewUrls,
      }));

      setArtifact(await getVcaArtifact(currentVcaArtifactId));

      setReport(null);
      setReportRunId("");
      setPdfJob(null);
      setNotice(`${uploaded.length}개 이미지를 등록했습니다.`);
    } catch (uploadError) {
      setNotice(operationMessage(uploadError, "이미지를 업로드"));
    } finally {
      setWorking((current) => (current === "upload" ? "" : current));
    }
  }

  // 등록 이미지 하나를 삭제한다.
  // VCA 이미지 그리드의 "삭제" 버튼에서 호출하며 blob URL도 함께 정리한다.
  async function removeImage(imageId) {
    const operation = `delete-${imageId}`;

    setWorking(operation);
    setNotice("");

    try {
      await deleteVcaImage(vcaArtifactId, imageId);

      setArtifact((current) => ({
        ...current,
        uploadedImages: current.uploadedImages.filter(
          (image) => image.imageId !== imageId,
        ),
      }));

      setPreviewUrls((current) => {
        const next = { ...current };

        if (next[imageId]) {
          URL.revokeObjectURL(next[imageId]);
        }

        delete next[imageId];
        return next;
      });

      setNotice("이미지를 삭제했습니다.");
    } catch (deleteError) {
      setNotice(operationMessage(deleteError, "이미지를 삭제"));
    } finally {
      setWorking((current) => (current === operation ? "" : current));
    }
  }

  // 새 VCA 분석 run을 접수한다.
  // resume=false는 신규 분석, resume=true는 이전 실패 지점부터 이어서 실행한다.
  // 새 run을 시작할 때 기존 report/PDF 상태를 비워 이전 결과가 남지 않게 한다.
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
      setWorking((current) => (current === "run" ? "" : current));
    }
  }

  // 선택된 VCA run의 보고서를 불러온다.
  // 완료 run 자동 조회와 사용자의 보고서 재조회 양쪽에서 공통으로 사용한다.
  // silentNotReady=true면 서버 보고서 생성 직전 발생할 수 있는 409를 조용히
  // 무시하고 다음 상태 갱신에서 다시 시도한다.
  const loadReport = useCallback(
    async (runId = selectedRunId, { silentNotReady = false } = {}) => {
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
        setReportRecoveredFromServer(false);

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

        setNotice(
          "보고서를 불러왔습니다. AI 결과는 전문가 검토 전 초안입니다.",
        );
      } catch (reportError) {
        if (silentNotReady && reportError?.status === 409) {
          return;
        }

        setNotice(operationMessage(reportError, "보고서를 불러오기"));
      } finally {
        setWorking((current) => (current === "report" ? "" : current));
      }
    },
    [vcaArtifactId, selectedRunId, withPreviewReport],
  );

  // 진행 중인 VCA run은 2초마다 서버 상태를 다시 조회한다.
  useEffect(() => {
    if (!selectedRun || !ACTIVE_RUN_STATUSES.has(selectedRun.status)) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      loadArtifact({ silent: true }).catch((pollError) => {
        setNotice(operationMessage(pollError, "분석 상태를 갱신"));
      });
    }, 2_000);

    return () => window.clearInterval(timer);
  }, [loadArtifact, selectedRun]);

  // 선택된 VCA run이 완료되면 해당 run의 보고서를 자동으로 불러온다.
  useEffect(() => {
    if (!selectedRun || selectedRun.status !== "COMPLETED") {
      return undefined;
    }

    if (reportRunId === selectedRun.runId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      loadReport(selectedRun.runId, {
        silentNotReady: true,
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadReport, reportRunId, selectedRun]);

  // VCA run이 실패하면 실패 사유를 시스템 메시지 영역에 run당 한 번만 표시한다.
  // 다른 작업으로 artifact가 재조회되어도 동일 실패 메시지가 반복 출력되지 않게 한다.
  const notifiedFailedRunIds = useRef(new Set());

  useEffect(() => {
    if (
      !selectedRun ||
      selectedRun.status !== "FAILED" ||
      !selectedRun.failureReason
    ) {
      return;
    }

    if (notifiedFailedRunIds.current.has(selectedRun.runId)) {
      return;
    }

    notifiedFailedRunIds.current.add(selectedRun.runId);

    setNotice(selectedRun.failureReason);
  }, [selectedRun]);

  // VCA 보고서 PDF 생성/상태 확인 핸들러.
  // pdfJob이 없으면 새 작업을 생성하고, 이미 있으면 같은 jobId로 상태만 확인한다.
  async function handlePdfJob() {
    if (!selectedRunId) return;

    setWorking("pdf");
    setNotice("");

    try {
      const job = pdfJob
        ? await getVcaPdfJob(vcaArtifactId, pdfJob.jobId)
        : await createVcaPdfJob(vcaArtifactId, selectedRunId);

      setPdfJob(job);

      setNotice(
        job.status === "COMPLETED"
          ? "PDF가 준비되었습니다. 다운로드를 열 수 있습니다."
          : "PDF 생성 작업을 접수했습니다. 상태 확인을 다시 선택하세요.",
      );
    } catch (pdfError) {
      setNotice(operationMessage(pdfError, "PDF 작업을 처리"));
    } finally {
      setWorking((current) => (current === "pdf" ? "" : current));
    }
  }

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
    reportRecoveredFromServer,
    runRequestPending,
    runIsActive,
    selectFiles,
    selectedRun,
    startRun,
    uploadedImages,
    working,
    workspaceArtifact,
    handlePdfJob,
  };
}
