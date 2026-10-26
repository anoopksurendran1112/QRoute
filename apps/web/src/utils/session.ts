// The last scanned location, kept for the lifetime of the tab.
//
// React Router `state` is lost the moment the user navigates via a button that
// does not forward it (Route -> Search -> Route was dropping the origin, which
// then rendered as "Current location" with no route). The scanned node is a
// property of the session, not of one screen, so it is stored here.
//
// sessionStorage, not localStorage: a scan is "where I am right now", and a
// stale position from yesterday must not silently become today's start point.

const ORIGIN_KEY = "qroute_origin";

export interface ScannedOrigin {
  id: string;
  code?: string;
  kind?: string;
  label?: string | null;
  x?: number;
  y?: number;
  floorId?: string;
  /** Human-readable building/floor, from the scan response's `location`. */
  buildingName?: string;
  floorName?: string;
  scannedAt?: number;
}

export function saveOrigin(origin: ScannedOrigin): void {
  try {
    sessionStorage.setItem(ORIGIN_KEY, JSON.stringify({ ...origin, scannedAt: Date.now() }));
  } catch (e) {
    console.warn("Failed to remember scanned location", e);
  }
}

export function getOrigin(): ScannedOrigin | null {
  try {
    const raw = sessionStorage.getItem(ORIGIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScannedOrigin;
    return parsed?.id ? parsed : null;
  } catch (e) {
    console.warn("Failed to read scanned location", e);
    return null;
  }
}

export function clearOrigin(): void {
  try {
    sessionStorage.removeItem(ORIGIN_KEY);
  } catch (e) {
    console.warn("Failed to clear scanned location", e);
  }
}
