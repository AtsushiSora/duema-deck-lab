const additions=['dm07-013','dm19-087','dm28-099','dm20-012','dm07-027','dm03-028','dm13-049'];
export const STANDARD478_DECKS=[
 ['dm01-108','dm01-090','dm01-097'],
 ['dm06-110','dm01-090','dm01-097']
].map((fillers,i)=>({id:'standard478-'+i,name:'Shield hand and defense '+i,format:'original',cards:[...additions,...fillers].map(id=>({id,count:4}))}));
