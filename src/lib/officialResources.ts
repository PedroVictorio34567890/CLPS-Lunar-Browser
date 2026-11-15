import type { AnalysisPeriod, Coordinates } from '../models.ts';
import { periodError } from './period.ts';
import { validCoordinates } from './coordinates.ts';
import { southPolarXY } from '../science/terrain.ts';

export const RESOURCE_REVIEW_DATE='2026-11-14';
export const TREK_POLAR='https://trek.nasa.gov/tiles/Moon/SP/LRO_LOLA_Shade_SPole875_5mp_v04';
export const OFFICIAL_RESOURCES=[
  {name:'LROC QuickMap',url:'https://quickmap.lroc.asu.edu/',owner:'NASA/GSFC/LROC',es:'Imágenes, capas y revisión del terreno. El enlace original redirige al servicio actual de QuickMap.',en:'Imagery, layers and terrain review. The original link redirects to the current QuickMap service.'},
  {name:'NASA Moon Trek',url:'https://trek.nasa.gov/moon/',owner:'NASA/JPL',es:'Mapas y herramientas de perfiles, pendientes e iluminación. La capa sombreada del visor procede de su servicio WMTS.',en:'Maps and profile, slope and lighting tools. The shaded map below uses its WMTS service.'},
  {name:'JPL Horizons',url:'https://ssd.jpl.nasa.gov/horizons/',owner:'NASA/JPL SSD',es:'Efemérides independientes. Prepara una consulta y contrasta su respuesta con el modelo local.',en:'Independent ephemerides. Prepare a query and compare its response with the local model.'},
  {name:'Moon exploration · CSA',url:'https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/',owner:'Canadian Space Agency',es:'Contexto de exploración, Gateway y robótica canadiense. Es una fuente informativa, no un archivo de órbitas ni ventanas de relé.',en:'Exploration, Gateway and Canadian robotics context. An information source, not relay orbit or service-window data.'},
] as const;

// Verified WMTS capabilities: IAU2000:30120, R=1737400 m, polar stereographic.
export function polarTile(site:Coordinates,zoom:number) {
  if(!validCoordinates(site)||!Number.isInteger(zoom)||zoom<4||zoom>9) throw new Error('invalid-map-input');
  const {x,y}=southPolarXY(site,1737400);
  if(site.latitude>0||Math.abs(x)>75840||Math.abs(y)>75840) return null;
  const span=2191860/2**zoom, col=Math.floor((x+1095930)/span),row=Math.floor((1095930-y)/span);
  return {url:`${TREK_POLAR}/1.0.0/default/default028mm/${zoom}/${row}/${col}.png`,x:((x+1095930)/span-col)*100,y:((1095930-y)/span-row)*100,spanM:span};
}
export function horizonsQuery(period:AnalysisPeriod,site?:Coordinates,body:'sun'|'earth'='sun') {
  if(periodError(period)||(site&&!validCoordinates(site))) throw new Error('invalid-horizons-input');
  const params:Record<string,string>={format:'json',COMMAND:site?(body==='sun'?'10':'399'):'301',CENTER:site?'coord@301':'500@399',MAKE_EPHEM:'YES',EPHEM_TYPE:'OBSERVER',START_TIME:period.start.replace('T',' '),STOP_TIME:period.end.replace('T',' '),STEP_SIZE:'7',QUANTITIES:site?'4':'14,15',CSV_FORMAT:'YES',TIME_TYPE:'UT',TIME_DIGITS:'FRACSEC',CAL_FORMAT:'CAL',ANG_FORMAT:'DEG',EXTRA_PREC:'YES',APPARENT:'AIRLESS',OBJ_DATA:'NO'};
  if(site){params.COORD_TYPE='GEODETIC';params.SITE_COORD=`${site.longitude},${site.latitude},0`;}
  const q=new URLSearchParams();for(const [key,value] of Object.entries(params)) q.set(key,key==='format'?value:`'${value}'`);
  return `https://ssd.jpl.nasa.gov/api/horizons.api?${q}`;
}
