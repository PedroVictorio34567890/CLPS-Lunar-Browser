import metadata from './frameMetadata.json';
export async function loadLunarRotations() {
  const response=await fetch(`${import.meta.env.BASE_URL}terrain/moon-me-de421.f64`);
  if (!response.ok) throw new Error('frame-download');
  const buffer=await response.arrayBuffer();
  if (buffer.byteLength!==metadata.count*32) throw new Error('frame-size');
  const digest=await crypto.subtle.digest('SHA-256',buffer);
  if (Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')!==metadata.sha256) throw new Error('frame-checksum');
  const view=new DataView(buffer);
  return Float64Array.from({length:metadata.count*4},(_,i)=>view.getFloat64(i*8,true));
}
