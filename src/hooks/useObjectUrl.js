import { useEffect, useMemo } from "react";

export default function useObjectUrl(source) {
  const url = useMemo(() => {
    if (source instanceof Blob) return URL.createObjectURL(source);
    return typeof source === "string" ? source : "";
  }, [source]);

  useEffect(
    () => () => {
      if (source instanceof Blob && url) URL.revokeObjectURL(url);
    },
    [source, url],
  );

  return url;
}
