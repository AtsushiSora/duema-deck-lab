const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const STANDARD168_DECKS=[
 make('standard168-energy','ハイパーエナジーの検証',['dm24ex2-081','promoy23-067','dm24rp4-072','dm24rp4-074','dm24rp4-057','dm24rp3-039','dm24rp4-062','dm01-108','dm01-075','dm01-083']),
 make('standard168-grave','墓地召喚とアビスラッシュの検証',['dm22rp1-060','promoy22-059','promoy21-901','dm25rp1-063','dm25rp3-064','dmx22b-166','dmrp18-040','dm01-108','dm01-090','dm01-097']),
 make('standard168-sympathy','シンパシーとササゲールの検証',['dmrp12-066','dmrp10-066','dmrp19-059','dm24rp4-074','dm24rp4-057','dmrp18-040','dm01-108','dm01-075','dm01-083','dm01-090'])
];
