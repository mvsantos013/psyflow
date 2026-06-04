import { useEffect, useState } from "react";

type UseLoadingCrossfadeOptions = {
  revealDelayMs?: number;
  durationMs?: number;
};

export function useLoadingCrossfade(isLoading: boolean, options: UseLoadingCrossfadeOptions = {}) {
  const revealDelayMs = options.revealDelayMs ?? 60;
  const durationMs = options.durationMs ?? 150;

  const [showSkeleton, setShowSkeleton] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
      setContentVisible(false);
      return;
    }

    setShowSkeleton(true);

    const revealTimer = window.setTimeout(() => {
      setContentVisible(true);
    }, revealDelayMs);

    const hideSkeletonTimer = window.setTimeout(() => {
      setShowSkeleton(false);
    }, revealDelayMs + durationMs);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(hideSkeletonTimer);
    };
  }, [durationMs, isLoading, revealDelayMs]);

  return { showSkeleton, contentVisible, durationMs };
}
