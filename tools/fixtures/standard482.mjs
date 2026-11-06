const first=['dmx04-011','dm37-009','dm09-040','dm09-048','dm37-019','dm37-037'];
const second=['dm09-036','dm09-054','dm37-054','dm09-015','dm13-026'];
export const STANDARD482_DECKS=[
 [...first,'dm01-083','dm01-097','dm01-075','dm01-108'],
 [...second,'dm01-083','dm01-097','dm01-075','dm01-108','dm06-110']
].map((ids,i)=>({id:'standard482-'+i,name:'Unblocked player attacks '+i,format:'original',cards:ids.map(id=>({id,count:4}))}));
