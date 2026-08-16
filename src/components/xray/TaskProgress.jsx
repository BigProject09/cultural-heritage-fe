import { useEffect, useRef, useState } from "react";
import "./TaskProgress.css";

/**
 * 오래 걸리는 AI 작업의 진행 표시.
 *
 * 결합, 결함 분석, 문안 생성 세 곳에서 쓴다.
 *
 *
 * 스피너를 쓰지 않는 이유
 *
 *   돌아가는 원은 "잠시만 기다리세요"라는 신호다. 결합은
 *   조각 수에 따라 십 분을 넘기므로, 스피너를 붙이면
 *   사용자가 멈춘 줄 알고 창을 닫는다.
 *
 * 진행 바를 쓰지 않는 이유
 *
 *   AI 서비스는 진행률을 알려주지 않는다. 퍼센트나 남은
 *   시간을 표시하면 지어낸 값이 된다. 공식 기록을 다루는
 *   화면에서 근거 없는 수치를 보여줄 수는 없다.
 *
 * 그래서 실제로 아는 것만 보여준다.
 *
 *   지금 어느 단계인가   steps 와 currentKey
 *   얼마나 지났는가      직접 측정한 경과 시간
 *   왜 오래 걸리는가     detail 에 담은 입력 규모
 *
 *
 * 단계가 없는 작업(문안 생성 등)은 steps 를 비우면
 * 경과 시간과 안내만 표시한다.
 */

function formatElapsed(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  if (minutes === 0) {
    return `${rest}초`;
  }

  return `${minutes}분 ${String(rest).padStart(2, "0")}초`;
}

export default function TaskProgress({
  active,
  headline,
  detail,
  steps = [],
  currentKey,
  note,
  longNote,
  longAfterSeconds = 180,
  showElapsed = true,
}) {
  if (!active) return null;

  return (
    <ActiveTaskProgress
      headline={headline}
      detail={detail}
      steps={steps}
      currentKey={currentKey}
      note={note}
      longNote={longNote}
      longAfterSeconds={longAfterSeconds}
      showElapsed={showElapsed}
    />
  );
}

function ActiveTaskProgress({
  headline,
  detail,
  steps,
  currentKey,
  note,
  longNote,
  longAfterSeconds,
  showElapsed,
}) {
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(null);

  useEffect(() => {
    if (!showElapsed && !longNote) return undefined;

    startedAt.current = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [longNote, showElapsed]);

  const currentIndex = steps.findIndex((step) => step.key === currentKey);

  // 오래 걸리는 작업은 도중에 안내 문구를 바꾼다.
  // 짧게 끝날 작업으로 오해하고 창을 닫는 것을 막기 위함이다.
  const currentNote = longNote && elapsed >= longAfterSeconds ? longNote : note;

  return (
    <div className="task-progress" role="status" aria-live="polite">
      <div className="task-progress-sweep" aria-hidden="true">
        <span />
      </div>

      <div className="task-progress-body">
        <p className="task-progress-headline">{headline}</p>

        {detail && <p className="task-progress-detail">{detail}</p>}

        {steps.length > 0 && (
          <ol className="task-progress-steps">
            {steps.map((step, index) => {
              const state =
                index < currentIndex
                  ? "done"
                  : index === currentIndex
                    ? "current"
                    : "todo";

              return (
                <li key={step.key} className={state}>
                  <span className="task-progress-dot" />
                  <span className="task-progress-label">{step.label}</span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="task-progress-meta">
          {showElapsed && (
            <span className="task-progress-elapsed">
              경과 {formatElapsed(elapsed)}
            </span>
          )}

          {currentNote && (
            <span className="task-progress-note">{currentNote}</span>
          )}
        </div>
      </div>
    </div>
  );
}
