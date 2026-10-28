// Test decks only; existing public deck recipes remain unchanged.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dmbd02-009','dm22-041','dm08-051','dmx02-004','dmx05-010','dm32-043'];
export const UTILITY142_DECKS=[
 make('utility142-dragons','追加カード検証・ドラゴンと手札補充',[...added,'dmx01-009','dm01-076','dm06-085','dm01-108']),
 make('utility142-ramp','追加カード検証・加速と呪文回収',[...added,'dm01-008','dm01-076','dm01-106','dm06-085'])
];
