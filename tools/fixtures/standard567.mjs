const ids=['dmrp17-093','dmr17-057','dmrp12-104','dm26rp1-046','dmr02-029','dmex14-057','dm22ex2-061','dmex14-042','dmd15-006'];
const deck=(i,extra)=>({id:'standard567-'+i,name:['攻撃条件と対プレイヤー防御','パワー強化とクリーチャー戦'][i],format:'original',cards:[...ids,extra].map(id=>({id,count:4}))});
export const STANDARD567_DECKS=[deck(0,'dmr02-054'),deck(1,'dmr04-048')];
