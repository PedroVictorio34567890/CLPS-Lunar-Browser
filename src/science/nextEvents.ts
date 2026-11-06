import type { VisibilityWindow } from '../models.ts';

/** Only genuine state transitions, never the clipped start/end of the study. */
export function nextEvents(windows: VisibilityWindow[], time: number) {
  let rise: number | null = null, set: number | null = null;
  for (let i = 1; i < windows.length; i++) {
    const previous = windows[i - 1], current = windows[i];
    if (current.start <= time || previous.end !== current.start || previous.visible === current.visible) continue;
    if (current.visible && rise === null) rise = current.start;
    if (!current.visible && set === null) set = current.start;
    if (rise !== null && set !== null) break;
  }
  return { rise, set };
}

export function remainingTime(event: number, time: number) {
  const minutes = Math.max(1, Math.ceil((event - time) / 60000));
  return { days: Math.floor(minutes / 1440), hours: Math.floor(minutes % 1440 / 60), minutes: minutes % 60 };
}
