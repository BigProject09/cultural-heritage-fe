/**
 * 이상영역 검수표.
 *
 * HITL 구조의 핵심이다. AI가 제시한 후보를
 * 전문가가 판정하고 수정한다.
 *
 * - 사용자 검수 내용은 직접 수정할 수 있다
 * - 오탐이면 행을 삭제한다
 * - 행을 클릭하면 이미지에서 해당 박스가 강조된다
 */
export default function RegionTable({
  regions,
  selectedId,
  onSelect,
  onNoteChange,
  onRemove,
}) {
  if (regions.length === 0) {
    return (
      <div className="empty">
        탐지된 영역이 없습니다.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: 80 }}>영역 ID</th>
            <th style={{ width: 110 }}>분석 대상</th>
            <th style={{ width: 130 }}>파일</th>
            <th style={{ width: 70 }}>신뢰도</th>
            <th style={{ width: 90 }}>위치</th>
            <th style={{ width: 80 }}>면적(%)</th>
            <th>사용자 검수 내용</th>
            <th style={{ width: 50 }}></th>
          </tr>
        </thead>

        <tbody>
          {regions.map((r) => (
            <tr
              key={r.regionId}
              className={
                r.regionId === selectedId ? "selected" : ""
              }
              onClick={() => onSelect(r.regionId)}
            >
              <td className="mono">{r.regionId}</td>
              <td>{r.analysisTarget}</td>
              <td className="ellipsis" title={r.fileName}>
                {r.fileName}
              </td>
              <td className="mono">
                <span
                  className="dot"
                  style={{
                    background:
                      r.confidence < 0.2
                        ? "#ffd400"
                        : r.confidence < 0.4
                        ? "#ff9500"
                        : "#ff2d2d",
                  }}
                />
                {r.confidence.toFixed(3)}
              </td>
              <td>{r.position}</td>
              <td className="mono">
                {r.areaRatioPercent.toFixed(3)}
              </td>
              <td>
                <input
                  type="text"
                  value={r.userNote || ""}
                  onChange={(e) =>
                    onNoteChange(r.regionId, e.target.value)
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td>
                <button
                  className="del"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(r.regionId);
                  }}
                  title="오탐 제외"
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
