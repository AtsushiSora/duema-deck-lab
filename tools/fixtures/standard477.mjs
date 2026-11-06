const additions=['dmr05-008','dmx17-s03','dmr19-082','dm06-038','dmr08-033','dmr13-068'];
export const STANDARD477_DECKS=[
  ['dm01-108','dm06-110','dm09-034','dm01-097'],
  ['dm01-108','dm06-110','dmr05-065','dm01-083']
].map((fillers,i)=>({id:'standard477-'+i,name:'Attack target lures '+i,format:'original',cards:[...additions,...fillers].map(id=>({id,count:4}))}));
