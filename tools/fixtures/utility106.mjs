// Test-only forty-card compositions; official and user recipes remain untouched.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY106_DECKS=[
 make('utility106-dragons','追加カード検証・ドラゴンとマナ',['dmsd17-006','dmx24-005','dmr18-043','dm01-108','dmbd16-011','dmex04-027','dm01-008','dmbd15-006','dm01-039','dm01-075']),
 make('utility106-revival','追加カード検証・墓地と手札',['dmex06-037','dmx07-005','dmrp06-031','dm01-080','dm01-106','dmr01-056','dm01-027','dm01-008','dm01-090','dm01-108'])
];
