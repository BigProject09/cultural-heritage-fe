/**
 * 결합 엔진의 변환행렬을 Konva 속성으로 바꾼다.
 *
 *
 * 엔진이 주는 형태
 *
 *   [[a, b, tx],
 *    [c, d, ty],
 *    [0, 0,  1]]
 *
 *   조각 이미지의 픽셀 좌표를 결합본 좌표로 옮기는 행렬이다.
 *
 *     X = a*px + b*py + tx
 *     Y = c*px + d*py + ty
 *
 *   엔진은 조각을 회전과 이동만 시키고 확대 축소나 비선형
 *   변형은 하지 않는다. 따라서 정상이라면
 *
 *     a =  cos θ    b = -sin θ
 *     c =  sin θ    d =  cos θ
 *
 *   가 되고 배율은 1에 가깝다.
 *
 *
 * Konva 가 쓰는 형태
 *
 *   Image 는 x, y, rotation, scaleX, scaleY 로 배치한다.
 *   offset 을 0 으로 두면 왼쪽 위 모서리를 기준으로
 *
 *     X = x + px*cos θ*scaleX - py*sin θ*scaleY
 *     Y = y + px*sin θ*scaleX + py*cos θ*scaleY
 *
 *   가 되어 위 식과 그대로 대응한다.
 *
 *
 * 좌표 기준 (실측으로 확인)
 *
 *   행렬은 '잘린 이미지' 좌표 기준이다. 엔진은 조각에서
 *   내용이 있는 영역만 잘라내어 배치하며, 그 사각형이
 *   cropBBoxXYWH 로 온다.
 *
 *   잘린 이미지의 중심 ((w-1)/2, (h-1)/2) 에 행렬을 적용하면
 *   엔진이 알려준 centerX, centerY 와 소수점까지 일치한다.
 *
 *   따라서 업로드한 원본 이미지를 그대로 화면에 올릴 때는
 *   잘라낸 원점만큼 보정해야 한다. fragmentToKonva 가 이를
 *   자동으로 처리한다.
 */

/** 행렬이 2x3 이든 3x3 이든 앞 두 줄만 쓴다. */
function readMatrix(transform) {
  if (!Array.isArray(transform) || transform.length < 2) {
    return null;
  }

  const [row0, row1] = transform;

  if (!Array.isArray(row0) || !Array.isArray(row1)) {
    return null;
  }

  if (row0.length < 3 || row1.length < 3) {
    return null;
  }

  const values = [...row0.slice(0, 3), ...row1.slice(0, 3)];

  if (
    values.some((value) => typeof value !== "number" || !Number.isFinite(value))
  ) {
    return null;
  }

  const [a, b, tx, c, d, ty] = values;
  return { a, b, tx, c, d, ty };
}

/**
 * 변환행렬을 Konva Image 속성으로 분해한다.
 *
 * @param {Array} transform  엔진이 준 2x3 또는 3x3 행렬
 * @param {{x:number, y:number}} [cropOffset]
 *        행렬이 잘린 이미지 기준일 때 원본과의 차이
 * @returns {{x:number, y:number, rotation:number,
 *            scaleX:number, scaleY:number} | null}
 *        형식이 맞지 않으면 null
 */
export function toKonvaPlacement(transform, cropOffset) {
  const matrix = readMatrix(transform);

  if (matrix === null) {
    return null;
  }

  const { a, b, tx, c, d, ty } = matrix;

  // 회전각. 첫 열이 회전된 x축이므로 그 기울기를 재면 된다.
  const rotation = (Math.atan2(c, a) * 180) / Math.PI;

  // 각 축의 배율. 열 벡터의 길이다.
  const scaleX = Math.hypot(a, c);
  const scaleY = Math.hypot(b, d);

  let x = tx;
  let y = ty;

  // 행렬이 잘린 이미지 기준이면, 잘라낸 만큼을 회전시켜
  // 되돌려야 원본 이미지에 맞는 위치가 된다.
  if (cropOffset) {
    x -= a * cropOffset.x + b * cropOffset.y;
    y -= c * cropOffset.x + d * cropOffset.y;
  }

  return { x, y, rotation, scaleX, scaleY };
}

/**
 * Konva 속성을 다시 변환행렬로 되돌린다.
 *
 * 사용자가 조각을 옮기거나 돌린 결과를 서버에 보내거나
 * 기록으로 남길 때 쓴다. 화면 조작 결과도 AI 결과와 같은
 * 형식이어야 이후 처리가 단순해진다.
 */
export function toTransformMatrix({ x, y, rotation, scaleX = 1, scaleY = 1 }) {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return [
    [cos * scaleX, -sin * scaleY, x],
    [sin * scaleX, cos * scaleY, y],
    [0, 0, 1],
  ];
}

/**
 * 조각 픽셀 좌표를 결합본 좌표로 옮긴다.
 *
 * 조각에서 탐지한 이상영역 상자를 결합본 위에 겹쳐 그릴 때
 * 쓴다. 결합본에서만 나타난 영역이 실제 손상인지 조각을 이어
 * 붙인 자리인지 구분하려면 이 대응이 필요하다.
 */
export function projectPoint(transform, px, py) {
  const matrix = readMatrix(transform);

  if (matrix === null) {
    return null;
  }

  const { a, b, tx, c, d, ty } = matrix;

  return {
    x: a * px + b * py + tx,
    y: c * px + d * py + ty,
  };
}

/**
 * 배치가 회전 이동만인지 확인한다.
 *
 * 엔진은 조각을 확대 축소하지 않는다고 명시한다. 배율이 1에서
 * 크게 벗어나면 좌표 기준을 잘못 해석하고 있다는 신호다.
 */
export function isRigidPlacement(transform, tolerance = 0.02) {
  const placement = toKonvaPlacement(transform);

  if (placement === null) {
    return false;
  }

  return (
    Math.abs(placement.scaleX - 1) <= tolerance &&
    Math.abs(placement.scaleY - 1) <= tolerance
  );
}

/**
 * 응답의 조각 항목을 바로 Konva 속성으로 바꾼다.
 *
 * 업로드한 원본 이미지를 그대로 화면에 올릴 때 쓴다.
 * 잘린 영역 보정을 자동으로 적용하므로 호출부가 좌표 기준을
 * 신경 쓸 필요가 없다.
 *
 * @param {object} fragment  transform 과 cropBBoxXYWH 를 가진 항목
 * @param {{useCrop?: boolean}} [options]
 *        useCrop 을 false 로 두면 보정 없이 잘린 이미지 기준
 *        그대로 반환한다. 잘라낸 이미지를 직접 그릴 때 쓴다.
 */
export function fragmentToKonva(fragment, options = {}) {
  if (!fragment?.transform) {
    return null;
  }

  const { useCrop = true } = options;
  const crop = fragment.cropBBoxXYWH;

  const cropOffset =
    useCrop && Array.isArray(crop) && crop.length >= 2
      ? { x: crop[0], y: crop[1] }
      : undefined;

  return toKonvaPlacement(fragment.transform, cropOffset);
}

/**
 * 분해 결과가 엔진 값과 맞는지 검산한다.
 *
 * 엔진이 rotationDeg 와 centerX, centerY 를 함께 주므로
 * 직접 계산한 값과 대조할 수 있다. 어긋나면 좌표 기준을
 * 잘못 해석하고 있다는 뜻이다.
 *
 * 화면에 조각이 엉뚱한 곳에 놓일 때 원인을 좁히는 데 쓴다.
 */
export function verifyPlacement(fragment, tolerance = 0.01) {
  const placement = toKonvaPlacement(fragment?.transform);

  if (placement === null) {
    return { ok: false, reason: "변환행렬 없음" };
  }

  const issues = [];

  if (typeof fragment.rotationDeg === "number") {
    const diff = Math.abs(placement.rotation - fragment.rotationDeg);
    // 각도는 360도 경계를 넘을 수 있어 정규화해서 비교한다
    const normalized = Math.min(diff, Math.abs(360 - diff));

    if (normalized > tolerance) {
      issues.push(
        `회전각 불일치 (계산 ${placement.rotation.toFixed(3)}, ` +
          `엔진 ${fragment.rotationDeg})`,
      );
    }
  }

  const crop = fragment.cropBBoxXYWH;

  if (
    typeof fragment.centerX === "number" &&
    Array.isArray(crop) &&
    crop.length >= 4
  ) {
    const center = projectPoint(
      fragment.transform,
      (crop[2] - 1) / 2,
      (crop[3] - 1) / 2,
    );

    if (
      Math.abs(center.x - fragment.centerX) > tolerance ||
      Math.abs(center.y - fragment.centerY) > tolerance
    ) {
      issues.push(
        `중심 좌표 불일치 (계산 ${center.x.toFixed(2)}, ` +
          `${center.y.toFixed(2)} / 엔진 ${fragment.centerX.toFixed(2)}, ` +
          `${fragment.centerY.toFixed(2)})`,
      );
    }
  }

  return issues.length === 0
    ? { ok: true }
    : { ok: false, reason: issues.join(" · ") };
}

/**
 * Konva Image 에 그대로 넘길 속성을 만든다.
 *
 *
 * 왜 crop 을 쓰는가
 *
 *   엔진은 업로드 이미지에서 유물 부분만 잘라내어 배치한다.
 *   원본 전체를 그리면 엔진이 잘라낸 배경까지 화면에 나와
 *   결합본과 달라진다.
 *
 *   Konva 의 crop 속성을 쓰면 잘린 영역만 그려지고, 그 노드의
 *   로컬 원점이 잘린 영역의 좌상단이 된다. 엔진의 변환행렬이
 *   바로 그 좌표계를 기준으로 하므로 보정 없이 그대로 쓸 수 있다.
 *
 *
 * 사용
 *
 *   const props = fragmentToKonvaImage(fragment);
 *
 *   <KonvaImage
 *     image={htmlImageElement}
 *     {...props}
 *     draggable
 *   />
 *
 *   htmlImageElement 는 fragment.fileName 과 같은 이름의
 *   업로드 파일로 만든다. 한 파일에서 파편이 여럿 나올 수
 *   있으므로 같은 이미지를 여러 노드가 공유한다.
 *
 * @returns {object|null} 배치되지 않은 조각이면 null
 */
export function fragmentToKonvaImage(fragment) {
  const placement = toKonvaPlacement(fragment?.transform);

  if (placement === null) {
    return null;
  }

  const crop = fragment.cropBBoxXYWH;

  const props = {
    x: placement.x,
    y: placement.y,
    rotation: placement.rotation,
    scaleX: placement.scaleX,
    scaleY: placement.scaleY,
  };

  if (Array.isArray(crop) && crop.length >= 4) {
    const [cropX, cropY, cropWidth, cropHeight] = crop;

    props.crop = {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    };

    // crop 을 지정하면 width, height 도 함께 줘야 한다.
    // 없으면 Konva 가 원본 전체 크기로 늘려 그린다.
    props.width = cropWidth;
    props.height = cropHeight;
  }

  return props;
}

/**
 * 사용자가 화면에서 옮긴 결과를 변환행렬로 되돌린다.
 *
 * Konva 노드의 현재 값을 그대로 넣으면 된다. 반환한 행렬은
 * 엔진이 준 것과 같은 좌표 기준이므로, 원래 값과 나란히
 * 비교하거나 기록으로 남길 수 있다.
 */
export function konvaImageToTransform(node) {
  return toTransformMatrix({
    x: node.x(),
    y: node.y(),
    rotation: node.rotation(),
    scaleX: node.scaleX(),
    scaleY: node.scaleY(),
  });
}

/**
 * 원본 업로드 이미지의 좌표를 결합본 좌표로 옮긴다.
 *
 * 조각에서 탐지한 이상영역 상자를 결합본 위에 겹칠 때 쓴다.
 * 탐지는 업로드한 원본 이미지에 대해 이뤄지므로, 잘라낸
 * 만큼을 먼저 빼서 로컬 좌표로 바꾼 뒤 행렬을 적용한다.
 */
export function projectFromOriginal(fragment, originalX, originalY) {
  if (!fragment?.transform) {
    return null;
  }

  const crop = fragment.cropBBoxXYWH;
  const cropX = Array.isArray(crop) ? crop[0] : 0;
  const cropY = Array.isArray(crop) ? crop[1] : 0;

  return projectPoint(fragment.transform, originalX - cropX, originalY - cropY);
}
