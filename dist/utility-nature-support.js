// The player choosing a creature can differ from the effect's controller.
export function createUtilityNatureSupport(api){
 const{card,cost,effective,creatures,put,task,choice,opt}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed),follow=(t,op,more={})=>({...t,op:'g83_'+op,...more});
 const nonEvolution=(s,p)=>living(s,p).filter(x=>!api.isEvolution(x));
 const canPut=(s,p,x)=>api.canEnter(s,p,card(x),{origin:'mana',execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).some(y=>y.uid!==x.uid));
 // Only public battle and mana cards are used to judge the result of a sacrifice.
 function starValue(s,p,x){
  if(!api.canMoveZone(s,p,'mana'))return 0;
  const own=s.players[p],stays=!api.canLeave(s,p,x)||x.exLifeShieldUid||x.exLifeShieldUids?.length;
  const mana=stays||api.manaRedirect(s,p)?own.mana:[...own.mana,...api.allLayers(x)],battle=stays?own.battle:own.battle.filter(y=>y.uid!==x.uid);
  const view={...s,players:s.players.map((y,q)=>q===p?{...y,mana,battle}:y)};
  return Math.max(0,...mana.filter(y=>!y.faceDown&&card(y).type==='creature'&&api.isEvolution(y)&&cost(card(y))<=mana.length&&canPut(view,p,y)).map(y=>20+Math.min(cost(card(y)),30)));
 }
 function run(s,t){if(!t.op.startsWith('g83_'))return false;const own=s.players[t.p];switch(t.op){
 case'g83_Star':choice(s,t,'マナに置く自分の進化ではないクリーチャーを1体選ぶ',api.targetOptions(s,t.p,nonEvolution(s,t.p)).map(o=>({...o,score:starValue(s,t.p,own.battle.find(x=>x.uid===o.value))*10+20-o.score})));break;
 case'g83_StarPut':{const list=api.canMoveZone(s,t.p,'mana')?own.mana.filter(x=>!x.faceDown&&card(x).type==='creature'&&api.isEvolution(x)&&cost(card(x))<=own.mana.length):[];choice(s,t,'マナの枚数以下のコストの進化クリーチャーを1体選ぶ',list.map(x=>{const legal=canPut(s,t.p,x);return opt(card(x).name+(legal?'':'（現在は出せないためマナに残る）'),x.uid,legal?20+Math.min(cost(card(x)),30):-10,x.cardId);}));break;}
 case'g83_Digger':put(s,follow(t,'CreatureMana'),follow(t,'CreatureMana',{p:1-t.p}));break;
 case'g83_CreatureMana':choice(s,t,'マナに置く自分のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,living(s,t.p)).map(o=>({...o,score:20-o.score})));break;
 case'g83_Nasuo':put(s,task('g34_Ramp',t.p,t.source,{n:1}),follow(t,'ManaGrave'));break;
 case'g83_ManaGrave':{const list=api.canMoveZone(s,t.p,'mana')?own.mana:[];choice(s,t,'墓地に置く自分のマナを1枚選ぶ',list.map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,x.faceDown?0:10-Math.min(cost(card(x)),30),x.faceDown?null:x.cardId)));break;}
 case'g83_Mouth':{const n=new Set(own.battle.filter(x=>!x.sealed&&!x.faceDown).flatMap(x=>String(effective(x,s).race||'').split('/')).filter(r=>r&&r!=='ミステリー・トーテム')).size;if(n)put(s,task('g34_Draw',t.p,t.source,{n,optional:true}));break;}
 default:throw Error('未実装の自然の展開補助効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g83_'))return false;switch(t.op){
 case'g83_Star':if(v){
  // 101.3a / official Q&A 44318: attempting the first instruction is sufficient.
  put(s,follow(t,'StarPut'));api.move(s,[{player:t.p,uid:v,to:'mana',destroy:false,controller:t.controller??t.p}]);
 }break;
 case'g83_StarPut':if(v&&api.canMoveZone(s,t.p,'mana'))put(s,task('g34_Put',t.p,t.source,{origin:'mana',target:v}));break;
 case'g83_CreatureMana':if(v)api.move(s,[{player:t.p,uid:v,to:'mana',destroy:false,controller:t.controller??t.p}]);break;
 case'g83_ManaGrave':if(v&&api.canMoveZone(s,t.p,'mana')){const x=api.remove(s.players[t.p].mana,v);if(x){api.clear(x,'grave');api.addZone(s,t.p,'grave',x);}}break;
 default:throw Error('未実装の自然の展開補助選択：'+t.op);
 }return true;}
 return{run,chosen,starUseful:(s,p)=>nonEvolution(s,p).some(x=>starValue(s,p,x)>0),effect(s,p,c,uid){if(!c.g83Effect)return false;put(s,task('g83_'+c.g83Effect,p,c.id,{uid}));return true;},
 decorate(s,p,x,c){if(c.g117GraveCreaturePower)c={...c,power:c.power+s.players[p].grave.filter(x=>card(x).type==='creature').length*c.g117GraveCreaturePower};if(c.g116ShieldDragon){const n=s.players.reduce((n,p)=>n+(Array.isArray(p.shields)?p.shields.length:p.shields),0);c={...c,power:c.power+n*2000};}if(c.type!=='creature'||x.sealed||!String(c.race).includes('ビーストフォーク'))return c;const n=living(s,p).filter(y=>y.uid!==x.uid&&y.tapped&&card(y).g83Valiant&&!api.ignored(s,y)).length;return n?{...c,power:c.power+2000*n}:c;}};
}
