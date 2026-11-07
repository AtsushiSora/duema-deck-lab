const ids=['dm25rp2-034','dmr19-060','dm34-025','dm24-072'];
const deck=(i,extra)=>({id:'standard570-'+i,name:['条件付きブロッカーとNEO進化','革命2と防御時のパワー'][i],format:'original',cards:[...ids,...extra].map(id=>({id,count:4}))});
export const STANDARD570_DECKS=[deck(0,['dm01-075','dm01-083','dm01-090','dm01-097','dm01-108','dm01-080']),deck(1,['dm01-075','dm01-083','dm01-090','dm01-097','dm01-042','dm01-s06'])];
