const ids=['dm24rp4-042','dm24rp4-064','dm24rp4-060','dm24rp3-042','dm24rp4-039','dm24rp4-037','dm24rp4-032','dm24rp3-032','dm24rp4-030','dm24rp3-050','dm24rp4-043','dm24rp4-017'];
const deck=(i,rows)=>({id:'standard564-'+i,name:['異なるコストで攻守を強化','バラバラエティと登場時の効果'][i],format:'original',cards:rows.map(id=>({id,count:4}))});
export const STANDARD564_DECKS=[deck(0,ids.slice(0,10)),deck(1,ids.slice(2))];
