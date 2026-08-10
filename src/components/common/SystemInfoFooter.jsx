import { useEffect, useState } from "react";
import { getVcaSystemInfo } from "../../services/vcaApi";

// 앱 전체 최하단에 붙는 copyright 느낌의 작은 안내 문구 - 지금 VCA 분석
// 결과가 어떤 환경(CPU/GPU, OS, 라이브러리·모델 버전)에서 나온 것인지
// 보여준다. 특정 페이지의 데이터가 아니라 vca-ai 엔진이 지금 도는 환경
// 자체를 설명하는 전역 정보라 App.jsx 최상위(라우트 밖)에서 한 번만
// 마운트된다. 조회에 실패해도(예: 게이트웨이 미설정) 페이지 자체는
// 영향받지 않아야 하므로 실패는 조용히 무시하고 아무것도 렌더링하지 않는다.
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
  const parts = [
    info.os,
    info.pythonVersion && `Python ${info.pythonVersion}`,
    info.device && `Device: ${info.device.toUpperCase()}`,
    libraries && `Libraries: ${libraries}`,
    models && `Models: ${models}`,
  ].filter(Boolean);

  return <p className="app-system-info-footer">{parts.join(" · ")}</p>;
}
