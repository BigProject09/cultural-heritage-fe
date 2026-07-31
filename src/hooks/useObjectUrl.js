import { useEffect, useState } from "react";

export default function useObjectUrl(source) {
  const [preview, setPreview] = useState({
    source: null,
    url: "",
  });

  useEffect(() => {
    if (!(source instanceof Blob)) {
      return undefined;
    }

    const url = URL.createObjectURL(source);

    const frameId = window.requestAnimationFrame(() => {
      setPreview({ source, url });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      URL.revokeObjectURL(url);
    };
  }, [source]);

  if (source instanceof Blob) {
    return preview.source === source ? preview.url : "";
  }

  return typeof source === "string" ? source : "";
}
