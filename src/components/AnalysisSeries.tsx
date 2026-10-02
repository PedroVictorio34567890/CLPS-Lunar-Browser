import type { SiteSeries, VisibilityWindow } from '../models';

export function AnalysisSeries({ series }: { series: SiteSeries }) {
  const start = series.samples[0].time, end = series.samples.at(-1)!.time;
  const x = (time: number) => (time - start) / (end - start) * 340;
  const range = series.samples.reduce((r, s) => [Math.min(r[0], s.sun, s.earth), Math.max(r[1], s.sun, s.earth)], [-10, 10]);
  const low = Math.floor(range[0] / 10) * 10, high = Math.ceil(range[1] / 10) * 10;
  const y = (altitude: number) => 10 + (high - altitude) / (high - low) * 90;
  // Only the drawing is thinned; statistics always use the complete series.
  const stride = Math.max(1, Math.ceil(series.samples.length / 250));
  const drawing = series.samples.filter((_, i) => i % stride === 0 || i === series.samples.length - 1);
  const path = (field: 'sun' | 'earth') => drawing.map((s, i) => `${i ? 'L' : 'M'}${x(s.time).toFixed(2)},${y(s[field]).toFixed(2)}`).join(' ');
  const bar = (windows: VisibilityWindow[], color: string, label: string) => <div className="availability-row"><span>{label}</span><svg viewBox="0 0 340 12" role="img" aria-label={`${label}: tramos visibles en color; no visibles en gris`}><rect width="340" height="12" fill="#26303d" rx="3"/>{windows.filter(w => w.visible).map(w => <rect key={w.start} x={x(w.start)} width={x(w.end) - x(w.start)} height="12" fill={color}><title>{new Date(w.start).toISOString()} → {new Date(w.end).toISOString()}</title></rect>)}</svg></div>;
  return <section className="analysis-series" aria-label="Evolución temporal calculada">
    <h4>Elevación sobre el horizonte ideal</h4>
    <div className="series-legend"><span className="sun-key">Sol</span><span className="earth-key">Tierra</span><span>{low}° a {high}°</span></div>
    <svg viewBox="0 0 340 110" role="img" aria-label="Elevación geométrica del Sol y la Tierra a lo largo del periodo; línea discontinua a cero grados">
      <rect x="0" y={y(0)} width="340" height={110 - y(0)} fill="#ffffff04"/>
      <path d={`M0,${y(0)} H340`} stroke="#7b8a9c" strokeDasharray="4 4"/>
      <path d={path('sun')} stroke="#f2c76d" strokeWidth="1.8" fill="none"/>
      <path d={path('earth')} stroke="#79caff" strokeWidth="1.8" fill="none"/>
      <text x="2" y={Math.max(9, y(0) - 4)} fill="#a3b0c0" fontSize="8">0°</text>
    </svg>
    {bar(series.sunlight, '#f2c76d', 'Luz')}
    {bar(series.earthVisibility, '#79caff', 'Tierra')}
    <div className="series-dates"><span>{new Date(start).toISOString().slice(5, 16).replace('T', ' ')}</span><span>UTC</span><span>{new Date(end).toISOString().slice(5, 16).replace('T', ' ')}</span></div>
    <p>Color: centro sobre 0°. Gris: centro bajo el horizonte. Sin relieve ni eclipses.</p>
  </section>;
}
