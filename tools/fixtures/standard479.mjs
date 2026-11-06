const additions=['dm06-055','dm06-093','dm01-044','dm01-s02','dm06-024'];
export const STANDARD479_DECKS=[
 ['dm01-090','dm01-075','dm01-108','dm06-110','dm01-080'],
 ['dm01-090','dm01-075','dm01-108','dm01-076','dm01-097']
].map((fillers,i)=>({id:'standard479-'+i,name:'Own turn endings '+i,format:'original',cards:[...additions,...fillers].map(id=>({id,count:4}))}));
