export function maskName(value = "") {
  const text = String(value).trim();
  if (!text) return "-";
  if (text.length === 1) return text;
  if (text.length === 2) return `${text[0]}*`;
  return `${text[0]}${"*".repeat(Math.max(1, text.length - 2))}${text.at(-1)}`;
}

export function maskLoginId(value = "") {
  const text = String(value).trim();
  if (!text) return "-";
  if (text.length <= 2) return `${text[0] || ""}*`;
  if (text.length <= 4) return `${text.slice(0, 1)}${"*".repeat(text.length - 1)}`;
  return `${text.slice(0, 2)}${"*".repeat(Math.max(2, text.length - 4))}${text.slice(-2)}`;
}

export function maskEmail(value = "") {
  const text = String(value).trim();
  if (!text || !text.includes("@")) return text || "-";
  const [local, domain] = text.split("@");
  if (!local) return `***@${domain}`;
  const visible = local.length <= 2 ? 1 : Math.min(3, local.length - 1);
  return `${local.slice(0, visible)}***@${domain}`;
}
