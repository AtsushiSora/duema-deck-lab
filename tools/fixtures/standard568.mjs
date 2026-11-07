const ids=['dm25rp4-049','promoy22-spd1002','dm25rp4-052','dm24rp2-059','dm25rp4-053'];
const deck=(i,extra)=>({id:'standard568-'+i,name:['条件付き別コストとNEO進化','墓地とマナからの展開'][i],format:'original',cards:[...ids,...extra].map(id=>({id,count:4}))});
export const STANDARD568_DECKS=[deck(0,['dm01-108','dm01-097','dm01-083','dm01-075','dm01-090']),deck(1,['dm01-108','dm01-097','dm01-083','dm01-042','dmsd20-016'])];
