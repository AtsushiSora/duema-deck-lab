// Test fixtures exercise new effects; official and saved recipes remain unchanged.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY109_DECKS=[
 make('utility109-fire','追加カード検証・火の全体除去',['dmrp17-048','dm09-017','dmx08-020','dm01-032','dm01-097','dm01-008','dm01-108','dm06-085','dm01-080','dm05-024']),
 make('utility109-dark','追加カード検証・光と闇の除去',['dm22ex2-020','dm07-014','dm01-032','dm01-075','dm01-090','dm01-008','dm01-108','dm06-085','dm01-080','dm05-024'])
];
