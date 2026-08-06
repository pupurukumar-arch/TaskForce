import { useEffect, useRef } from "react";

export const FIVE_MINUTES = 5 * 60 * 1000;

// Refreshes server data without reloading the browser or interrupting forms.
// Hidden tabs do not poll; they refresh once when the user returns.
export function useBackgroundRefresh(refresh, intervalMs = FIVE_MINUTES) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshRef.current();
      }
    };

    const intervalId = window.setInterval(refreshIfVisible, intervalMs);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [intervalMs]);
}
