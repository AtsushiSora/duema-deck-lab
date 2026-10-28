// Test decks only; no shipped recipe changes.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const spells=['dmd08-007','dm36-064','dm10-056','dm02-051','dm04-025','dm30-039'];
export const UTILITY120_DECKS=[
 make('utility120-fire','追加呪文検証・火の攻撃補助',[...spells,'dm24ex4-084','dm14-074','dm01-008','dm01-097']),
 make('utility120-light','追加呪文検証・光の防御',[...spells,'dm24ex4-084','dm32-045','dm01-075','dm01-097'])
];
