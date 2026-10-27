import{RECOVERY_RACES}from'./utility-recovery-races.js?v=0.119.0';
// Select the full recovery set before moving any card; remember target costs before removal.
export function createUtilityRecoveryRules(api){
 const{card,cost,effective,power,creatures,put,task,choice,opt,targetOptions}=api;
 const follow=(t,op,more={})=>({...t,op:'g67_'+op,...more});
 const enemies=(s,p)=>creatures(s,1-p).filter(x=>!x.sealed);
 const currentPower=(s,x)=>power(x,x.uid===s.attack?.attacker||s.attackLifecycle?.uid===x.uid&&(s.attackLifecycle.incarnation||0)===(x.incarnation||0),s);
 const matching=(s,p,race)=>api.canMoveZone(s,p,'grave')?s.players[p].grave.filter(x=>card(x).type==='creature'&&String(card(x).race).includes(race)):[];
 function recover(s,t){if(!api.canMoveZone(s,t.p,'grave'))return;for(const uid of t.selected){const x=s.players[t.p].grave.find(x=>x.uid===uid&&card(x).type==='creature'&&String(card(x).race).includes(t.race));if(x){api.remove(s.players[t.p].grave,uid);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);}}}
 function run(s,t){if(!t.op.startsWith('g67_'))return false;const own=s.players[t.p];switch(t.op){
 case'g67_Zombie':{if(!api.canMoveZone(s,t.p,'grave'))break;const races=RECOVERY_RACES.filter(r=>matching(s,t.p,r).length);if(races.length)choice(s,t,'墓地から手札に戻すクリーチャーの種族を1つ選ぶ',[...races.map(r=>opt(r,r,matching(s,t.p,r).map(x=>10+Math.min(30,cost(card(x)))).sort((a,b)=>b-a).slice(0,3).reduce((a,b)=>a+b,0))),opt('回収しない',null,0)]);break;}
 case'g67_ZombiePick':{const list=matching(s,t.p,t.race).filter(x=>!t.selected.includes(x.uid));if(t.selected.length>=3||!list.length){recover(s,t);break;}choice(s,t,t.race+'を墓地から3体まで選ぶ（'+t.selected.length+'/3）',[...list.map(x=>opt(card(x).name,x.uid,10+Math.min(30,cost(card(x))),x.cardId)),opt('ここまでで確定',null,0)]);break;}
 case'g67_Mobius':choice(s,t,'マナゾーンに置く自分のクリーチャーを1体選ぶ',targetOptions(s,t.p,creatures(s,t.p).filter(x=>!x.sealed)).map(o=>({...o,score:-o.score})));break;
 case'g67_Castle':put(s,follow(t,'CastleDestroy'),follow(t,'CastleTap'));break;
 case'g67_CastleDestroy':choice(s,t,'破壊するパワー3000以下の相手を1体選ぶ',targetOptions(s,t.p,enemies(s,t.p).filter(x=>currentPower(s,x)<=3000)));break;
 case'g67_CastleTap':choice(s,t,'タップする相手を1体まで選ぶ',[...targetOptions(s,t.p,enemies(s,t.p)).map(o=>{const x=s.players[1-t.p].battle.find(x=>x.uid===o.value);return{...o,label:o.label+'（'+(x.tapped?'タップ中':'アンタップ')+'）',score:x.tapped?-5:10+o.score};}),opt('タップしない',null,0)]);break;
 case'g67_SuperHand':choice(s,t,'破壊して、そのコストと同じ枚数を山札から墓地へ置く相手を選ぶ',targetOptions(s,t.p,enemies(s,t.p)).map(o=>{const x=s.players[1-t.p].battle.find(x=>x.uid===o.value),n=cost(effective(x,s));return{...o,score:n>=own.deck.length?-1000:o.score};}));break;
 case'g67_SuperMill':api.mill(s,t.p,t.n==='∞'?own.deck.length:t.n);break;
 default:throw Error('未実装の墓地・手札効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g67_'))return false;switch(t.op){
 case'g67_Zombie':if(v)put(s,follow(t,'ZombiePick',{race:v,selected:[]}));break;
 case'g67_ZombiePick':if(v)put(s,follow(t,'ZombiePick',{selected:[...t.selected,v]}));else recover(s,t);break;
 case'g67_Mobius':if(v)api.move(s,[{player:t.p,uid:v,to:'mana',destroy:false,controller:t.p}]);break;
 case'g67_CastleDestroy':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);break;
 case'g67_CastleTap':if(v)api.tap(s,1-t.p,s.players[1-t.p].battle.find(x=>x.uid===v));break;
 case'g67_SuperHand':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x){const n=cost(effective(x,s));put(s,follow(t,'SuperMill',{n:Number.isFinite(n)?n:'∞'}));api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);}break;}
 default:throw Error('未実装の墓地・手札選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g67Effect)return false;put(s,task('g67_'+c.g67Effect,p,c.id,{uid}));return true;}};
}
