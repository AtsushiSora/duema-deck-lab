// These legal decks exercise the new effects without editing shipped recipes.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY112_DECKS=[
 make('utility112-wedding','追加カード検証・闇のエンジェル・コマンド',['dmr07-012','dmx11-023','dmr07-s03','dmd08-018','dmr06-014','dm24ex2-048','dm23rp4-058','dm06-110','dm06-085','dm01-080']),
 make('utility112-recovery','追加カード検証・バウンスと墓地回収',['dm01-006','dm23rp4-058','dmd08-018','dm24ex2-048','dm01-090','dm01-083','dm01-080','dm02-024','dm06-110','dm06-085'])
];
