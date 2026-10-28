// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dmpcd01-r04','dm22-046','dm19-065','dm09-027','dm19-108','dmc55-054'];
export const UTILITY122_DECKS=[
 make('utility122-dragons','追加カード検証・ドラゴン進化と墓地強化',[...added,'dm08-045','dm01-090','dm01-106','dm06-110']),
 make('utility122-seraphim','追加カード検証・アークと闇の連携',[...added,'dm08-045','dm01-108','dm01-106','dm06-110'])
];
