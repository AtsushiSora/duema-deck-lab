const additions=['dmd21-002','dmd05-002','dm05-048','dm13-022','dm04-013','dmc21-007','dm04-006'];
export const STANDARD483_DECKS=[['dm01-097','dm01-075','dm01-090'],['dm01-097','dm01-083','dm01-108']].map((fillers,i)=>({id:'standard483-'+i,name:'Civilization attack permissions '+i,format:'original',cards:[...additions,...fillers].map(id=>({id,count:4}))}));
