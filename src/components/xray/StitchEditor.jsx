import { useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Transformer,
} from "react-konva";

import {
  fragmentToKonvaImage,
  toTransformMatrix,
} from "../../services/stitchGeometry";
import "./StitchEditor.css";

/**
 * X-RAY 조각 결합 수동 보정 화면.
 *
 *
 * 왜 필요한가
 *
 *   결합 엔진은 컬러 완성본의 외곽 형태를 기준으로 조각을
 *   배치한다. 파편이 작거나 형태가 모호하면 위치를 잘못 잡거나
 *   아예 배치하지 못한다.
 *
 *   AI 결과는 확정이 아니라 후보다. 전문가가 눈으로 확인하고
 *   바로잡은 뒤에야 기록이 된다.
 *
 *
 * 좌표 처리
 *
 *   엔진이 준 변환행렬은 '잘라낸 조각 이미지' 기준이다.
 *   Konva 의 crop 속성으로 같은 영역만 그리면 노드의 로컬
 *   원점이 잘린 영역의 좌상단이 되어, 행렬을 보정 없이
 *   그대로 쓸 수 있다.
 *
 *   자세한 내용은 services/stitchGeometry.js 참고.
 *
 *
 * 확대 축소를 막는 이유
 *
 *   엔진은 조각을 회전과 이동만 시킨다. 크기를 바꾸면 실제
 *   유물과 다른 비율이 되어 기록으로서 의미를 잃는다.
 *   그래서 Transformer 에서 크기 조절을 끄고 회전만 허용한다.
 */

/** 화면에 보일 캔버스의 최대 크기. 결합본은 3000px 을 넘는다. */
const VIEW_MAX_WIDTH = 620;
const VIEW_MAX_HEIGHT = 680;

/**
 * 업로드 파일을 Konva 가 그릴 수 있는 이미지 요소로 만든다.
 *
 * 한 파일에서 파편이 여럿 나올 수 있으므로 파일명으로 묶어
 * 여러 노드가 같은 이미지를 공유하게 한다.
 */
function useFragmentImages(files) {
  const [images, setImages] = useState({});

  useEffect(() => {
    let cancelled = false;
    const loaded = {};
    let remaining = files.length;

    if (remaining === 0) {
      setImages({});
      return undefined;
    }

    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const image = new Image();

      const finish = () => {
        // 이미지가 디코딩된 뒤에는 주소를 놓아줘도 된다.
        URL.revokeObjectURL(url);
        remaining -= 1;

        if (remaining === 0 && !cancelled) {
          setImages(loaded);
        }
      };

      image.onload = () => {
        loaded[file.name] = image;
        finish();
      };

      image.onerror = finish;
      image.src = url;
    });

    return () => {
      cancelled = true;
    };
  }, [files]);

  return images;
}

/** 결합본 이미지와 그 크기를 읽는다. 캔버스 크기의 기준이 된다. */
function useAssembledImage(file) {
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!file) {
      setState(null);
      return undefined;
    }

    let cancelled = false;
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);

      if (!cancelled) {
        setState({
          image,
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      }
    };

    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;

    return () => {
      cancelled = true;
    };
  }, [file]);

  return state;
}

/** 컬러 기준 이미지를 화면에서 사용할 수 있는 URL로 정리한다. */
function resolveReferenceSource(source) {
  if (!source) return "";
  if (source instanceof Blob) return source;

  if (typeof source === "object") {
    return resolveReferenceSource(
      source.file || source.url || source.imageUrl || source.src,
    );
  }

  return typeof source === "string" ? source : "";
}

function useReferencePreview(source) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const resolved = resolveReferenceSource(source);

    if (!resolved) {
      setPreviewUrl("");
      return undefined;
    }

    if (resolved instanceof Blob) {
      const objectUrl = URL.createObjectURL(resolved);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setPreviewUrl(resolved);
    return undefined;
  }, [source]);

  return previewUrl;
}

/**
 * 배치 정보를 화면에서 다루기 쉬운 형태로 정리한다.
 *
 * 배치에 실패한 조각도 목록에 넣는다. 사용자가 직접 놓을 수
 * 있어야 하기 때문이다.
 */
function buildPieces(fragments, canvasWidth, canvasHeight) {
  return (fragments || []).map((fragment, index) => {
    const props = fragmentToKonvaImage(fragment);
    const crop = fragment.cropBBoxXYWH;

    const cropRect =
      Array.isArray(crop) && crop.length >= 4
        ? { x: crop[0], y: crop[1], width: crop[2], height: crop[3] }
        : null;

    // 배치되지 않은 조각은 캔버스 가운데에 세로로 늘어놓는다.
    // 겹쳐 두면 사용자가 하나씩 집어내기 어렵다.
    const fallback = {
      x: canvasWidth / 2 + (index % 5) * 40,
      y: canvasHeight / 2 + (index % 5) * 40,
      rotation: 0,
    };

    return {
      key: `${fragment.fileName ?? "unknown"}#${index}`,
      fileName: fragment.fileName,
      placementName: fragment.placementName,
      matched: Boolean(fragment.matched && props),
      unassignedReason: fragment.unassignedReason,
      cropRect,
      initial: props
        ? { x: props.x, y: props.y, rotation: props.rotation }
        : fallback,
      size: cropRect
        ? { width: cropRect.width, height: cropRect.height }
        : null,
    };
  });
}

export default function StitchEditor({
  assembledFile,
  referenceSource,
  fragmentFiles,
  fragments,
  canvas,
  artifactId,
  onConfirm,
  onCancel,
}) {
  const assembled = useAssembledImage(assembledFile);
  const referencePreview = useReferencePreview(referenceSource);
  const images = useFragmentImages(fragmentFiles);

  const stageRef = useRef(null);
  const layerRef = useRef(null);
  const overlayRef = useRef(null);
  const transformerRef = useRef(null);
  const nodeRefs = useRef({});

  const [selectedKey, setSelectedKey] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [placements, setPlacements] = useState({});
  const [movedKeys, setMovedKeys] = useState(() => new Set());

  // 캔버스 크기는 layout 이 알려주는 값을 먼저 쓴다.
  // 변환행렬이 그 좌표계를 기준으로 하므로 결합본 이미지에서
  // 유추한 값보다 정확하다.
  const canvasWidth = canvas?.width ?? assembled?.width ?? 0;
  const canvasHeight = canvas?.height ?? assembled?.height ?? 0;

  const pieces = useMemo(
    () => buildPieces(fragments, canvasWidth, canvasHeight),
    [fragments, canvasWidth, canvasHeight],
  );

  // 원본 해상도를 화면 크기에 맞춰 줄인다.
  // 노드 좌표는 원본 기준을 유지하고 레이어만 축소하므로
  // 변환행렬을 그대로 쓸 수 있다.
  const scale = useMemo(() => {
    if (!canvasWidth || !canvasHeight) return 1;

    return Math.min(
      VIEW_MAX_WIDTH / canvasWidth,
      VIEW_MAX_HEIGHT / canvasHeight,
      1,
    );
  }, [canvasWidth, canvasHeight]);

  // 초기 배치를 상태로 옮긴다. 되돌리기의 기준이 된다.
  useEffect(() => {
    const initial = {};
    pieces.forEach((piece) => {
      initial[piece.key] = { ...piece.initial };
    });

    setPlacements(initial);
    setMovedKeys(new Set());
    setSelectedKey(null);
  }, [pieces]);

  // 선택한 조각에 회전 손잡이를 붙인다.
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const node = selectedKey ? nodeRefs.current[selectedKey] : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedKey, placements]);

  function updatePlacement(key, next) {
    setPlacements((current) => ({
      ...current,
      [key]: { ...current[key], ...next },
    }));

    setMovedKeys((current) => new Set(current).add(key));
  }

  function resetOne(key) {
    const piece = pieces.find((item) => item.key === key);
    if (!piece) return;

    setPlacements((current) => ({
      ...current,
      [key]: { ...piece.initial },
    }));

    setMovedKeys((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }

  function resetAll() {
    const initial = {};
    pieces.forEach((piece) => {
      initial[piece.key] = { ...piece.initial };
    });

    setPlacements(initial);
    setMovedKeys(new Set());
  }

  /**
   * 보정 결과를 확정한다.
   *
   * 화면에 그린 그대로를 원본 해상도로 내보낸다. 선택 표시와
   * 대조용 겹쳐보기는 결과물에 남으면 안 되므로 잠시 감춘다.
   *
   * 보정된 변환행렬도 함께 넘긴다. 이후 단계에서 조각별 탐지
   * 좌표를 결합본 좌표로 옮기거나, 기록으로 남길 때 쓴다.
   */
  async function handleConfirm() {
    const stage = stageRef.current;
    if (!stage) return;

    const transformer = transformerRef.current;
    const overlay = overlayRef.current;

    transformer?.hide();
    overlay?.hide();
    stage.draw();

    // 화면에서는 축소해 보여주지만 내보낼 때는 원본 해상도로 되돌린다
    const dataUrl = stage.toDataURL({ pixelRatio: 1 / scale });

    transformer?.show();
    if (showOverlay) overlay?.show();
    stage.draw();

    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `assembled-${artifactId}-corrected.png`, {
      type: "image/png",
    });

    const corrected = pieces
      .filter((piece) => placements[piece.key])
      .map((piece) => ({
        fileName: piece.fileName,
        placementName: piece.placementName,
        cropBBoxXYWH: piece.cropRect
          ? [
              piece.cropRect.x,
              piece.cropRect.y,
              piece.cropRect.width,
              piece.cropRect.height,
            ]
          : null,
        transform: toTransformMatrix(placements[piece.key]),
        adjusted: movedKeys.has(piece.key),
      }));

    onConfirm({ file, fragments: corrected, movedCount: movedKeys.size });
  }

  if (!assembled) {
    return (
      <div className="stitch-editor-loading">결합 결과를 불러오는 중입니다</div>
    );
  }

  const unmatched = pieces.filter((piece) => !piece.matched);
  const selected = pieces.find((piece) => piece.key === selectedKey);

  return (
    <div className="stitch-editor">
      <div className="stitch-editor-toolbar">
        <div className="stitch-editor-status">
          <strong>{pieces.length}</strong>
          <span>조각</span>

          {movedKeys.size > 0 && (
            <em className="stitch-editor-moved">{movedKeys.size}개 수정됨</em>
          )}

          {unmatched.length > 0 && (
            <em className="stitch-editor-warn">{unmatched.length}개 미배치</em>
          )}
        </div>

        <div className="stitch-editor-actions">
          <label className="stitch-editor-toggle">
            <input
              type="checkbox"
              checked={showOverlay}
              onChange={(event) => setShowOverlay(event.target.checked)}
            />
            AI 결과와 겹쳐보기
          </label>

          <button
            type="button"
            className="stitch-editor-ghost"
            onClick={() => selectedKey && resetOne(selectedKey)}
            disabled={!selectedKey || !movedKeys.has(selectedKey)}
          >
            선택 조각 되돌리기
          </button>

          <button
            type="button"
            className="stitch-editor-ghost"
            onClick={resetAll}
            disabled={movedKeys.size === 0}
          >
            전체 되돌리기
          </button>
        </div>
      </div>

      <div className="stitch-editor-body">
        <div className="stitch-editor-compare">
          <section className="stitch-editor-pane">
            <header className="stitch-editor-pane-header">
              <div>
                <span>EDITABLE X-RAY</span>
                <h3>X-RAY 결합 보정</h3>
              </div>
              <small>드래그 · 회전 가능</small>
            </header>

            <div className="stitch-editor-canvas">
              <Stage
                ref={stageRef}
                width={canvasWidth * scale}
                height={canvasHeight * scale}
                scaleX={scale}
                scaleY={scale}
                onMouseDown={(event) => {
                  // 빈 곳을 누르면 선택을 푼다
                  if (event.target === event.target.getStage()) {
                    setSelectedKey(null);
                  }
                }}
              >
                <Layer ref={layerRef}>
                  {/* 결합본과 같은 배경. 내보낸 이미지가 투명해지지 않게 한다 */}
                  <Rect
                    x={0}
                    y={0}
                    width={canvasWidth}
                    height={canvasHeight}
                    fill="#000000"
                  />

                  {pieces.map((piece) => {
                    const image = images[piece.fileName];
                    const placement = placements[piece.key];

                    if (!image || !placement) return null;

                    return (
                      <KonvaImage
                        key={piece.key}
                        ref={(node) => {
                          nodeRefs.current[piece.key] = node;
                        }}
                        image={image}
                        crop={piece.cropRect ?? undefined}
                        width={piece.size?.width}
                        height={piece.size?.height}
                        x={placement.x}
                        y={placement.y}
                        rotation={placement.rotation}
                        draggable
                        onClick={() => setSelectedKey(piece.key)}
                        onTap={() => setSelectedKey(piece.key)}
                        onDragEnd={(event) =>
                          updatePlacement(piece.key, {
                            x: event.target.x(),
                            y: event.target.y(),
                          })
                        }
                        onTransformEnd={(event) => {
                          const node = event.target;

                          // 회전만 허용하므로 배율은 되돌린다
                          node.scaleX(1);
                          node.scaleY(1);

                          updatePlacement(piece.key, {
                            x: node.x(),
                            y: node.y(),
                            rotation: node.rotation(),
                          });
                        }}
                      />
                    );
                  })}

                  {/* 대조용. AI 결합본을 반투명하게 덮어 차이를 본다 */}
                  <KonvaImage
                    ref={overlayRef}
                    image={assembled.image}
                    width={canvasWidth}
                    height={canvasHeight}
                    opacity={0.45}
                    listening={false}
                    visible={showOverlay}
                  />

                  <Transformer
                    ref={transformerRef}
                    rotateEnabled
                    resizeEnabled={false}
                    borderStroke="#2767df"
                    anchorStroke="#2767df"
                    anchorFill="#ffffff"
                    anchorSize={10}
                    rotateAnchorOffset={26}
                  />
                </Layer>
              </Stage>
            </div>
          </section>

          <section className="stitch-editor-pane">
            <header className="stitch-editor-pane-header">
              <div>
                <span>REFERENCE IMAGE</span>
                <h3>컬러 원본 이미지</h3>
              </div>
              <small>형상 · 배열 대조</small>
            </header>

            <div className="stitch-editor-reference">
              {referencePreview ? (
                <img
                  src={referencePreview}
                  alt="유물 컬러 원본 기준 이미지"
                  draggable={false}
                />
              ) : (
                <p>등록된 컬러 원본 이미지를 불러올 수 없습니다.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="stitch-editor-side">
          <section>
            <h3>선택한 조각</h3>

            {selected ? (
              <dl className="stitch-editor-detail">
                <dt>파일</dt>
                <dd title={selected.fileName}>{selected.fileName}</dd>

                <dt>위치</dt>
                <dd>
                  {Math.round(placements[selected.key]?.x ?? 0)},{" "}
                  {Math.round(placements[selected.key]?.y ?? 0)}
                </dd>

                <dt>회전</dt>
                <dd>{(placements[selected.key]?.rotation ?? 0).toFixed(1)}°</dd>
              </dl>
            ) : (
              <p className="stitch-editor-hint">
                왼쪽 X-RAY 캔버스에서 조각을 선택하면 위치와 회전을 확인할 수 있습니다.
              </p>
            )}
          </section>

          {unmatched.length > 0 && (
            <section>
              <h3>배치하지 못한 조각</h3>

              <p className="stitch-editor-hint">
                AI가 위치를 찾지 못했습니다. 목록에서 선택해 직접 옮기세요.
              </p>

              <ul className="stitch-editor-unmatched">
                {unmatched.map((piece) => (
                  <li key={piece.key}>
                    <button
                      type="button"
                      className={
                        piece.key === selectedKey ? "selected" : undefined
                      }
                      onClick={() => setSelectedKey(piece.key)}
                    >
                      <strong>{piece.fileName}</strong>
                      {piece.unassignedReason && (
                        <span>{piece.unassignedReason}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <div className="stitch-editor-footer">
        <button
          type="button"
          className="stitch-editor-ghost"
          onClick={onCancel}
        >
          취소
        </button>

        <button
          type="button"
          className="stitch-editor-primary"
          onClick={handleConfirm}
        >
          보정 결과 확정
        </button>
      </div>
    </div>
  );
}
