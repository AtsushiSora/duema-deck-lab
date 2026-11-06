const additions=['dmex11-s04','dmex09-s04','dmr01-091','dmrp04s-012','dmr23-029','dm10-089'];
export const STANDARD480_DECKS=[
 ['dm01-083','dm01-097','dm01-108','dmrp01-064'],
 ['dm01-083','dm01-097','dm01-008','dmrp01-064']
].map((fillers,i)=>({id:'standard480-'+i,name:'Shared creature abilities '+i,format:'original',cards:[...additions,...fillers].map(id=>({id,count:4}))}));
