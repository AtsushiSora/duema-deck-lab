const ids=['dmr11-050','dmr18-069','dmr06-052','dmr13-110','dm26-007'];
const deck=(i,extra)=>({id:'standard569-'+i,name:['自然のパワーと比較ブロック制限','強化呪文とガードマン'][i],format:'original',cards:[...ids,...extra].map(id=>({id,count:4}))});
export const STANDARD569_DECKS=[deck(0,['dm01-108','dm01-097','dm01-083','dm01-075','dm01-090']),deck(1,['dm01-108','dm01-080','dm01-042','dm01-004','dm01-s06'])];
