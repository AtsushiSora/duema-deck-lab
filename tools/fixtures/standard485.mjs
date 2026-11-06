const additions=['dmc52-004','dm28-082','dmr12-017'];
export const STANDARD485_DECKS=[['dm01-075','dm01-083','dm06-085','dm06-110','dm01-080','dm01-027','dm01-108'],['dm01-075','dm01-083','dm06-085','dm01-015','dm01-080','dm01-108','dm01-s01']].map((fillers,i)=>({id:'standard485-'+i,name:'Optional spell reductions '+i,format:'original',cards:[...additions,...fillers].map(id=>({id,count:4}))}));
