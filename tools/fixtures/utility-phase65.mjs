// Verification fixtures only: never inserted into a user's saved decks or preset library.
const deck=(id,name,rows)=>({id,name,format:'original',cards:rows.map(([id,count])=>({id,count}))});
export const UTILITY_DECKS=[
 deck('utility-nature65','追加検証・自然と進化',[
 ['dm14-109',4],['dm34-020',4],['dm27-030',1],['dm13-015',4],['dmr01-109',4],['dm36-069',1],['dmx13-036',4],['dmr06-055',4],['dm01-106',4],['dm02-s05',4],['dm01-107',3],['dm01-108',3]]),
 deck('utility-water65','追加検証・水と進化',[
 ['dmr05-086',4],['dm21-026',4],['dm01-021',4],['dm23-043',4],['dm06-050',4],['dmc27-011',4],['dmr01-052',4],['dm32-052',4],['dm02-024',4],['dm01-080',4]]),
 deck('utility-dark65','追加検証・回収と多色',[
 ['dmc58-002',4],['dm17-047',4],['dm26-040',4],['dm26-051',4],['dm10-069',4],['dm10-067',4],['dm10-065',4],['dm04-029',4],['dm01-s06',4],['dm01-106',4]])
];
