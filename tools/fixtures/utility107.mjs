// Validation-only lists; no official, character or saved user recipe is edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY107_DECKS=[
 make('utility107-hand','追加カード検証・手札と攻撃',['dm36-102','dm18-065','dmrp20-035','dm29-050','dm01-080','dm24ex2-096','dm01-106','dm01-097','dm01-008','dm01-108']),
 make('utility107-control','追加カード検証・マナと防御',['dm05-008','dmr23-068','dm01-080','dm02-024','dm01-106','dm13-015','dmbd10-010','dm01-075','dm01-090','dm01-015'])
];
