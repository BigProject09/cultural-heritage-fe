import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./BondingMaterialPage.css";

function BondingMaterialPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      bondingMaterial: true,
    }));

    navigate("/bonding");
  };

  return (
    <div className="joining-material-page">
      <div className="detail-header">
        <button
          className="nav-btn"
          onClick={() => navigate("/bonding")}
        >
          ← 이전
        </button>

        <h1 className="vora-logo">VORA</h1>

        <button
          className="nav-btn"
          onClick={handleComplete}
        >
          완료
        </button>
      </div>

      <div className="material-container">
        <div className="page-header">
          <h1>접합제</h1>
        </div>

        <div className="material-card">
          <div className="material-title">
            <span className="folder-icon">📁</span>

            <span>Paraloid B-72</span>

            <span className="arrow">▶</span>
          </div>

          <hr />

          <div className="material-image">
            <img
              src="/images/paraloid-b72.png"
              alt="Paraloid B-72"
            />
          </div>

          <p className="material-description">
            유물이 연질토기이므로(점토 낮은 소각건축재 사용 불가 조건)
            Cyanoacrylate를 제외해야 합니다. 또한 처리 목적이 전시용이어서
            추후 분리/재처리 가능성이 중요하며, Paraloid B-72는 비교적
            가역성이 높고 이전 강화처리에서 이미 사용한 강화제
            (Paraloid B-72)와 용매(아세톤) 조합이 확인되어 상성이 가장
            좋습니다. 따라서 표면 균열 및 이물질 부착 상태에서 기존 처리
            체계를 유지하면서 접합 안정성을 확보하기에 적합합니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default BondingMaterialPage;