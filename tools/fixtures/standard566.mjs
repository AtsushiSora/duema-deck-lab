const ids=['dm35-043','dm35-051','dm35-055','dm35-047','dm35-008'];
const deck=(i,extra)=>({id:'standard566-'+i,name:['Evoチャージャーと進化元の補充','進化デッキの探索と攻撃制限'][i],format:'original',cards:[...ids,...extra].map(id=>({id,count:4}))});
export const STANDARD566_DECKS=[deck(0,['dm01-108','dm01-097','dm01-080','dm01-042','dmrp18-058']),deck(1,['dm01-108','dm01-097','dm01-083','dm01-075','dmrp18-058'])];
