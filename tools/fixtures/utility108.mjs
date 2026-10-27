// Only used by tests; the app's official and saved recipes are unchanged.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const base=['dm01-080','dm02-024','dm01-108','dm06-085','dm01-075','dmbd10-010','dm05-024'];
export const UTILITY108_DECKS=[
 make('utility108-search','追加カード検証・光の呪文検索',['dmrp17-065','dmx13-028','dmr17-035',...base]),
 make('utility108-defence','追加カード検証・光の防御',['dmex08-234','dmr16g-020','dmd06-006',...base])
];
