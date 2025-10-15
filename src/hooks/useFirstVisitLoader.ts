import * as React from "react";

/**
 * Returns [show, hide] where:
 * - show is a boolean indicating if the loader should be visible
 * - hide is a function to immediately hide it
 *
 * By default, shows only on the first visit of the browser tab (sessionStorage).
 * Pass { always: true } to show on every mount instead.
 */
export function useFirstVisitLoader(opts?: { always?: boolean }) {
  const always = !!opts?.always;
  const key = "app.splash.shown";

  const [show, setShow] = React.useState<boolean>(() => {
    if (always) return true;
    return sessionStorage.getItem(key) !== "1";
  });

  const hide = React.useCallback(() => {
    if (!always) sessionStorage.setItem(key, "1");
    setShow(false);
  }, [always]);

  return [show, hide] as const;
}
