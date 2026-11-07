const neo=['dmrp02-052','promoy16-sp3d01','dmrp02-046','dmrp02-051','dm22ex1-027','dmex17-132','dmex17-113'];
const cards=ids=>ids.map(id=>({id,count:4}));
export const STANDARD563_DECKS=[
 {id:'standard563-0',name:'NEO進化と攻撃の強化',format:'original',cards:cards([...neo,'dm01-108','dm01-097','dm01-083'])},
 {id:'standard563-1',name:'NEO進化と登場時の効果',format:'original',cards:cards([...neo,'dm01-108','dm01-090','dmsd01-012'])}
];
