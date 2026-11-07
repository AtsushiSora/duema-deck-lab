const ids=["dmex14-084", "dm26rp1-060", "dm24rp4-034", "dm22rp2-036", "dm24rp3-036", "dm24rp4-028", "dm24rp4-024"];
const deck=(i,extra)=>({id:'standard565-'+i,name:['相手ターンと味方の保護','表向きシールドと異なるコスト'][i],format:'original',cards:[...ids,...extra].map(id=>({id,count:4}))});
export const STANDARD565_DECKS=[deck(0,['dm01-108','dm01-075','dm01-080']),deck(1,['dmsd20-016','dm01-042','dm01-083'])];
