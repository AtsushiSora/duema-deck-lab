// The six requested cards, with Dispectors for their Sasage abilities.
const requested=['dm24rp4-004','dm24rp1-012','dmbd15-be5','dm26ex4-091','dm26ex4-086','dm26ex4-082'];
const make=(id,name,extra)=>({id,name,format:'original',cards:[...requested,...extra].map(id=>({id,count:4}))});
export const UTILITY161_DECKS=[make('utility161-sasage','指定カード検証・ササゲール',['dm26rp3-008','dm26ex4-005','dm01-108','dm01-097']),make('utility161-triggers','指定カード検証・トリガーと革命チェンジ',['dm26rp3-008','dm26ex4-005','dm01-075','dm01-108'])];
