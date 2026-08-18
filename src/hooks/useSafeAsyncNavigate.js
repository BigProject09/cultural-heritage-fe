import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

function getBrowserLocationKey() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function useSafeAsyncNavigate() {
  const navigate = useNavigate();

  const captureAsyncNavigationOrigin = useCallback(
    () => getBrowserLocationKey(),
    [],
  );

  const navigateIfStillHere = useCallback(
    (originLocationKey, target, options) => {
      if (getBrowserLocationKey() !== originLocationKey) {
        return false;
      }

      navigate(target, options);
      return true;
    },
    [navigate],
  );

  return {
    captureAsyncNavigationOrigin,
    navigateIfStillHere,
  };
}
