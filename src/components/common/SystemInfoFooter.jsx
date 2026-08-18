import { useEffect, useState } from "react";
import { getVcaSystemInfo } from "../../services/vcaApi";

// 페이지 최하단에 붙는 copyright 느낌의 작은 안내 문구 - 지금 VCA 분석
// 결과가 어떤 환경(CPU/GPU, OS, 라이브러리·모델 버전)에서 나온 것인지
// 보여준다. vca-ai 엔진 자체의 실행 환경 정보라 VCA(육안 조사) 관련
// 페이지에서만 마운트한다. 조회에 실패해도(예: 게이트웨이 미설정) 페이지
// 자체는 영향받지 않아야 하므로 실패는 조용히 무시하고 아무것도 렌더링하지
// 않는다.
export default function SystemInfoFooter() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getVcaSystemInfo()
      .then((result) => {
        if (!cancelled) setInfo(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info) return null;

  const libraries = Object.entries(info.libraries || {})
    .map(([name, version]) => `${name} ${version}`)
    .join(", ");
  const models = (info.models || [])
    .map((model) => model.repoId || model.key)
    .filter(Boolean)
    .join(", ");
  // models까지 한 줄에 다 이어붙이면 라이브러리 목록이 길 때 줄이 너무
  // 길어져서, models부터는 별도 줄로 뺀다.
  const firstLineParts = [
    info.os,
    info.pythonVersion && `Python ${info.pythonVersion}`,
    info.device && `Device: ${info.device.toUpperCase()}`,
    libraries && `Libraries: ${libraries}`,
  ].filter(Boolean);
  const secondLine = models && `Models: ${models}`;

  return (
    <p className="app-system-info-footer">
      {firstLineParts.join(" · ")}
      {secondLine && (
        <>
          <br />
          {secondLine}
        </>
      )}
    </p>
  );
}
