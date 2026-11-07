const spells=['dmd14-003','dmr23-062','dm08-039','dmr01-077','dm29-039','dmr09-078','dm04-040'];
const cards=ids=>ids.map(id=>({id,count:4}));
export const STANDARD562_DECKS=[
 {id:'standard562-0',name:'鬼羅とターン終了の防御',format:'original',cards:cards(['dmrp17-s01',...spells,'dm01-075','dm01-108'])},
 {id:'standard562-1',name:'アンタップと光の展開',format:'original',cards:cards(['dmrp17-s01',...spells,'dm01-076','dm01-080'])}
];
