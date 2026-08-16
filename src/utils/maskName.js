/** 이름 가운데를 가린다. 예: "오세하" -> "오*하", "김민" -> "김*". */
export function maskName(name) {
  if (!name) return name;
  if (name.length <= 1) return name;
  if (name.length === 2) return `${name[0]}*`;

  const middle = "*".repeat(name.length - 2);
  return `${name[0]}${middle}${name[name.length - 1]}`;
}
