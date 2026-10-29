// Legal effect-test lists; user photographs are audited separately without editing them.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY159_DECKS=[
 make('photo159-shields','追加写真・シールド連携',['dmx11-015','dm22ex2-S11','dmrp15-km3','dm24ex4-031','dm24rp4-S01','dm24rp2-006','dmx11-021','dm22ex2-011','dmrp14-084','dm26rp3-020']),
 make('photo159-combat','追加写真・進化とディスペクター',['dm25rp1-DM1','dm26rp3-S001','dm26rp3-013','dm24ex2-DM03','dm25ex2-029','dm26ex4-001','dm26rp2-S008','dm24ex2-021','dm26ex4-029','dmrp14-084'])
];
