import { useEffect, useRef, useState } from 'react';
import type { AnalysisPeriod } from '../models';
import { periodError, utcMillis } from '../lib/period';
import { advanceTime, clampTime } from '../lib/playback';

export function usePlayback(period: AnalysisPeriod) {
  const valid = !periodError(period);
  const start = utcMillis(period.start), end = utcMillis(period.end);
  const [time, setTime] = useState(start);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(6);
  const current = useRef(time);
  useEffect(() => {
    setPlaying(false);
    if (valid) { current.current = start; setTime(start); }
  }, [start, end, valid]);
  useEffect(() => {
    if (!playing || !valid) return;
    let previous = performance.now();
    const pauseWhenHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    const timer = window.setInterval(() => {
      if (document.hidden) { setPlaying(false); return; }
      const now = performance.now();
      current.current = advanceTime(current.current, now - previous, speed, end);
      previous = now;
      setTime(current.current);
      if (current.current >= end) setPlaying(false);
    }, 100);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', pauseWhenHidden); };
  }, [playing, valid, speed, end]);
  function seek(value: number) {
    if (!valid || !Number.isFinite(value)) return;
    setPlaying(false);
    current.current = clampTime(value, start, end);
    setTime(current.current);
  }
  function toggle() {
    if (!valid) return;
    if (!playing && current.current >= end) { current.current = start; setTime(start); }
    setPlaying(value => !value);
  }
  return { time: valid ? clampTime(time, start, end) : time, start, end, valid, playing, speed, setSpeed, seek, toggle };
}
