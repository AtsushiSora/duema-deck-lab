// Nature utility cards: optional sacrifices, mana material placement and printed color checks.
export function createUtilityNatureRules(api){
 const {card,cost,put,task,choice,opt,skip}=api;
 const ref=x=>({uid:x.uid,incarnation:x.incarnation||0}),key=x=>x.uid+'@'+(x.incarnation||0);
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g51_'+op,...more});
 const livingSource=(s,t)=>s.players[t.p].battle.find(x=>key(x)===key(t)||(x.g47ElementRefs||[]).some(r=>key(r)===key(t)));
 const hosts=(s,p)=>s.players[p].battle.filter(x=>api.isCreature(s,x)&&api.isEvolution(x));
 const dolgeAllies=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed&&/アースイーター|ジャイアント/.test(api.effective(x,s).race||''));
 const manaCreatures=(s,p)=>api.canMoveZone(s,p,'mana')?s.players[p].mana.filter(x=>card(x).type==='creature'):[];
 function crystal(s,t){const x=api.takeTop(s,t.p);if(!x){api.deckCheck(s,t.p);return;}const to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';api.clear(x,to);api.addZone(s,t.p,to,x);const colors=to==='mana'?api.manaColors(card(x),s,t.p):api.faces(card(x)).flatMap(api.colors);api.log(s,t.p,'ramp','フェアリー・クリスタル：山札の上1枚を'+(to==='mana'?'マナ':'墓地')+'へ置いた',{cardId:x.cardId});if(!colors.length)put(s,task('g34_Ramp',t.p,t.source,{n:1}));api.deckCheck(s,t.p);}
 function lifePlan(s,t){const own=s.players[t.p],reserved=new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v)),n=api.lookCount(s,t.p,5),xs=own.deck.filter(x=>!reserved.has(x.uid)).slice(0,n),isPublic=api.lookPublic(s,t.p);(own.g34Protected??=[]).push(...xs.map(x=>x.uid));api.log(s,t.p,isPublic?'reveal':'look',card(t.source).name+'：山札の上'+xs.length+'枚'+(isPublic?'を公開：'+xs.map(x=>card(x).name).join('・'):'を確認'),{cardId:t.source});queue(s,t,'LifePick',{ids:xs.map(x=>x.uid)});}
 function run(s,t){if(!t.op?.startsWith('g51_'))return false;const own=s.players[t.p];switch(t.op){
 case'g51_Anaris':{const x=livingSource(s,t),win=api.creatures(s,t.p).some(y=>api.effective(y,s).shako);if(x&&!x.sealed&&api.canLeave(s,t.p,x))choice(s,t,'アナリスを破壊して、マナ加速かドローを選ぶ？',[opt('破壊して効果を使う',true,own.deck.length>1||win?20:-100,x.cardId),skip()]);break;}
 case'g51_AnarisMode':{const safe=own.deck.length>1,win=api.creatures(s,t.p).some(x=>api.effective(x,s).shako);choice(s,t,'アナリスの効果を1つ選ぶ',[opt('山札の上1枚をマナに置く','mana',safe?(own.mana.length<6?30:12):-100),opt('カードを1枚引く','draw',safe?(own.hand.length<3?25:10):win?1000:-100)]);break;}
 case'g51_Tower':put(s,task('g34_Ramp',t.p,t.source,{n:own.mana.length>=7?3:1}));break;
 case'g51_Ruins':put(s,task('g34_Ramp',t.p,t.source,{n:1}),task('g51_RuinsBonus',t.p,t.source));break;
 case'g51_RuinsBonus':if(own.mana.filter(x=>api.manaColors(card(x),s,t.p).length>1).length>=4)put(s,task('g34_Ramp',t.p,t.source,{n:2}));break;
 case'g51_Dolge':{const n=dolgeAllies(s,t.p).length;if(n)put(s,task('g34_Draw',t.p,t.source,{n,optional:true}));break;}
 case'g51_Garden':put(s,task('g34_Ramp',t.p,t.source,{n:1}),task('g51_GardenPick',t.p,t.source));break;
 case'g51_GardenPick':{if(!hosts(s,t.p).length)break;const list=manaCreatures(s,t.p);if(list.length)choice(s,t,'マナから自分の進化クリーチャーの下に置くクリーチャーを1体まで選ぶ',[...list.map(x=>opt(card(x).name,{...ref(x),serial:x.zoneSerial||0},10-cost(card(x)),x.cardId)),skip()]);break;}
 case'g51_GardenHost':{const x=own.mana.find(x=>key(x)===key(t.material)&&(x.zoneSerial||0)===t.material.serial);if(x&&api.canMoveZone(s,t.p,'mana'))choice(s,t,'マナのクリーチャーを下に置く自分の進化クリーチャーを選ぶ',hosts(s,t.p).map(x=>opt(card(x).name,ref(x),10+cost(card(x)),x.cardId)));break;}
 case'g51_Dance':put(s,task('g34_Ramp',t.p,t.source,{n:5}),task('g34_Select',t.p,t.source,{origin:'mana',to:'grave',n:5,optional:false,title:'マナから墓地に置くカードを5枚選ぶ'}));break;
 case'g51_Jasmine':{const x=livingSource(s,t);if(x&&!x.sealed&&api.canLeave(s,t.p,x))choice(s,t,'霞み妖精ジャスミンを破壊して、山札の上1枚をマナへ置く？',[opt('破壊してマナを増やす',true,own.deck.length>1?20:-100,x.cardId),skip()]);break;}
 case'g51_Shrine':put(s,task('g34_Select',t.p,t.source,{origin:'grave',to:'mana',n:2,optional:true,title:'墓地からマナへ置くカードを2枚まで選ぶ'}));break;
 case'g51_Crystal':crystal(s,t);break;
 case'g51_LifePlan':lifePlan(s,t);break;
 case'g51_LifePick':{const list=t.ids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(x=>x&&card(x).type==='creature');if(list.length)choice(s,t,'クリーチャーを1体まで公開して手札に加える',[...list.map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),skip()]);else put(s,task('g34_Order',t.p,t.source,{ids:t.ids,ordered:[],rest:'bottom'}));break;}
 default:throw Error('未実装の自然ユーティリティ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op?.startsWith('g51_'))return false;const own=s.players[t.p];switch(t.op){
 case'g51_Anaris':if(v){const x=livingSource(s,t);if(x&&!x.sealed&&api.canLeave(s,t.p,x)){put(s,{...t,op:'g51_AnarisMode'});api.move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);}}break;
 case'g51_AnarisMode':put(s,task(v==='mana'?'g34_Ramp':'g34_Draw',t.p,t.source,{n:1}));break;
 case'g51_GardenPick':if(v)queue(s,t,'GardenHost',{material:v});break;
 case'g51_GardenHost':{const x=own.mana.find(x=>key(x)===key(t.material)&&(x.zoneSerial||0)===t.material.serial),host=hosts(s,t.p).find(x=>key(x)===key(v));if(x&&host&&api.canMoveZone(s,t.p,'mana')){api.remove(own.mana,x.uid);api.clear(x,'battle');x.entered=s.turn;(host.under??=[]).push(x);api.log(s,t.p,'manaUnder',card(x).name+'をマナから'+card(host).name+'の下に置いた',{cardId:x.cardId});}break;}
 case'g51_Jasmine':if(v){const x=livingSource(s,t);if(x&&!x.sealed&&api.canLeave(s,t.p,x)){put(s,task('g34_Ramp',t.p,t.source,{n:1}));api.move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);}}break;
 case'g51_LifePick':{const x=v&&own.deck.find(x=>x.uid===v&&t.ids.includes(x.uid));if(x){api.remove(own.deck,x.uid);own.g34Protected=(own.g34Protected||[]).filter(uid=>uid!==x.uid);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);api.log(s,t.p,'reveal',card(x).name+'を公開して手札に加えた',{cardId:x.cardId});}put(s,task('g34_Order',t.p,t.source,{ids:t.ids.filter(uid=>uid!==v),ordered:[],rest:'bottom'}));break;}
 default:throw Error('未実装の自然ユーティリティ選択：'+t.op);
 }return true;}
 return {run,chosen,discount:(s,p,c)=>c.g164Dolge?Math.min(Math.max(0,cost(c)-2),dolgeAllies(s,p).length):0,effect(s,p,c,uid,entry){if(!c.g51Effect)return false;put(s,task('g51_'+c.g51Effect,p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;}};
}
