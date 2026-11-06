const additions=['dm11-029','dm06-032','dm11-054','dm06-101'];
export const STANDARD484_DECKS=[['dm01-097','dm01-108','dm01-076','dm06-110','dm01-083','dm06-085'],['dm01-097','dm01-108','dm06-090','dm06-110','dm01-075','dm01-090']].map((fillers,i)=>({id:'standard484-'+i,name:'Break returns and blocked attacks '+i,format:'original',cards:[...additions,...fillers].map(id=>({id,count:4}))}));
