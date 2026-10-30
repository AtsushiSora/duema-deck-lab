// Early utility creatures: hidden shields, optional recovery and ordered library looks.
export function createUtilityControlRules(api){
 const{card,cost,put,task,choice,opt}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0);
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g56_'+op,...more});
 const live=(s,t)=>s.players[t.p].battle.find(x=>key(x)===key(t)||(x.g47ElementRefs||[]).some(r=>key(r)===key(t)));
 function look(s,t){
  const own=s.players[t.p],held=new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
  const xs=own.deck.filter(x=>!held.has(x.uid)).slice(0,api.lookCount(s,t.p,5)),ids=xs.map(x=>x.uid),publicLook=api.lookPublic(s,t.p);
  (own.g34Protected??=[]).push(...ids);
  if(xs.length)api.log(s,t.p,publicLook?'reveal':'look',card(t.source).name+'：山札の上'+xs.length+'枚'+(publicLook?'を公開：'+xs.map(x=>card(x).name).join('・'):'を確認'),{cardId:t.source});
  queue(s,t,'Order',{ids,ordered:[]});
 }
 function order(s,t){
  const own=s.players[t.p],selected=new Set(t.ordered),remaining=t.ids.filter(uid=>!selected.has(uid)&&own.deck.some(x=>x.uid===uid));
  if(remaining.length>1){choice(s,t,'山札の一番上から置く順に選ぶ（'+t.ordered.length+'/'+t.ids.length+'）',remaining.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,Math.min(cost(card(x)),30),x.cardId);}));return;}
  const xs=[...t.ordered,...remaining].map(uid=>api.remove(own.deck,uid)).filter(Boolean);
  own.g34Protected=(own.g34Protected||[]).filter(uid=>!t.ids.includes(uid));own.deck.unshift(...xs);
 }
 function run(s,t){if(!t.op.startsWith('g56_'))return false;const own=s.players[t.p];switch(t.op){
 case'g56_Pointer':put(s,task('g56_PointerPeek',t.p,t.source),task('discard',1-t.p,t.source,{n:1,random:true,causedBy:t.p}));break;
 case'g56_PointerPeek':choice(s,t,'見る相手のシールドを1つ選ぶ',s.players[1-t.p].shields.map((x,i)=>opt('相手のシールド '+(i+1),x.uid,0)));break;
 case'g56_Emeral':if(api.canAddShield(s,t.p)&&own.hand.length)choice(s,t,'裏向きにしてシールドへ加える手札を1枚まで選ぶ',[...own.hand.map(x=>opt(card(x).name,x.uid,api.faces(card(x)).some(c=>c.trigger)?25:5,x.cardId)),opt('シールドを交換しない',null,0)]);break;
 case'g56_Parpi':look(s,t);break;
 case'g56_Order':order(s,t);break;
 case'g56_Sev':choice(s,t,'山札の上3枚を公開し、光・闇のカードを手札へ加える？',[opt('公開して使う',true,own.deck.length>3?20:-100),opt('使わない',null,0)]);break;
 case'g56_Sol':if(api.canMoveZone(s,t.p,'mana')&&own.mana.length)choice(s,t,'手札に戻し、手札1枚と交換するマナを選ぶ',[...own.mana.map(x=>opt(card(x).name,x.uid,Math.min(cost(card(x)),30),x.cardId)),opt('マナを交換しない',null,0)]);break;
 case'g56_Johnny':{const x=live(s,t);if(x&&!x.sealed&&api.canLeave(s,t.p,x))choice(s,t,'ジョニーウォーカーを破壊して能力を使う？',[opt('破壊して使う',true,25,x.cardId),opt('使わない',null,0)]);break;}
 case'g56_JohnnyMode':choice(s,t,'ジョニーウォーカー：効果を選ぶ',[opt('山札の上1枚をマナゾーンへ','ramp',own.deck.length>1?25:-100),opt('相手のパワー2000以下を1体破壊','burn',api.creatures(s,1-t.p).some(x=>!x.sealed&&api.power(x,false,s)<=2000)?30:-10)]);break;
 case'g56_JohnnyBurn':{const rows=api.creatures(s,1-t.p).filter(x=>!x.sealed&&api.power(x,false,s)<=2000);choice(s,t,'破壊するパワー2000以下の相手クリーチャーを選ぶ',api.targetOptions(s,t.p,rows));break;}
 default:throw Error('未実装のコントロールユーティリティ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g56_'))return false;const own=s.players[t.p];switch(t.op){
 case'g56_PointerPeek':{const root=api.findShield(s.players[1-t.p],v);if(root){api.log(s,t.p,'look',card(t.source).name+'で相手のシールドを確認',{cardId:t.source});choice(s,{...t,op:'g56_PointerSeen'},'確認したシールド：'+api.shieldCards(root).map(x=>card(x).name).join(' / '),[opt('確認した',true,0)]);}break;}
 case'g56_PointerSeen':break;
 case'g56_Emeral':{const x=v&&own.hand.find(x=>x.uid===v);if(x&&api.canAddShield(s,t.p)){api.remove(own.hand,x.uid);api.clear(x,'shields');api.addZone(s,t.p,'shields',x);api.notifyShieldAdded(s,t.p,x);put(s,task('g55_ShieldHand',t.p,t.source));}break;}
 case'g56_Order':queue(s,t,'Order',{ordered:[...t.ordered,v]});break;
 case'g56_Sev':if(v)put(s,task('g52_Tutor',t.p,t.source,{n:3,colors:['光','闇']}));break;
 case'g56_Sol':{const x=v&&own.mana.find(x=>x.uid===v);if(x&&api.canMoveZone(s,t.p,'mana')){api.remove(own.mana,x.uid);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);put(s,task('g34_Select',t.p,t.source,{origin:'hand',to:'mana',n:1,optional:false,title:'マナゾーンへ置く手札を1枚選ぶ'}));}break;}
 case'g56_Johnny':if(v){const x=live(s,t);if(x&&!x.sealed&&api.canLeave(s,t.p,x)){queue(s,t,'JohnnyMode');api.move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);}}break;
 case'g56_JohnnyMode':if(v==='ramp')put(s,task('g34_Ramp',t.p,t.source,{n:1}));else if(v==='burn')queue(s,t,'JohnnyBurn');break;
 case'g56_JohnnyBurn':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x&&api.power(x,false,s)<=2000)api.move(s,[{player:1-t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);break;}
 default:throw Error('未実装のコントロールユーティリティ選択：'+t.op);
 }return true;}
 return{run,chosen,mainActions(s,p){return (s.players[p].spellsThisTurn||0)>0?s.players[p].hand.filter(x=>card(x).g118SpellZero&&api.canCast(s,p,card(x),'hand')&&api.canEnter(s,p,card(x),{origin:'hand',execution:true})).map(x=>({kind:'play',uid:x.uid,cardId:x.cardId,origin:'hand',cost:0,freeSummon:'G・ゼロ',label:card(x).name+'をG・ゼロで召喚'})):[];},
  spellTax(s,p,c){if(c.type!=='spell')return 0;const colors=api.colors(c);return s.players.reduce((n,_,owner)=>n+api.creatures(s,owner).filter(x=>!x.sealed).reduce((n,x)=>{const source=api.effective(x,s),tax=source.g222SpellTax;return n+(source.g56SpellTax||0)+(!tax||tax.opponent&&owner===p||tax.exceptColor&&colors.includes(tax.exceptColor)||tax.colors&&!tax.colors.some(color=>colors.includes(color))?0:tax.graveSpells?s.players[p].grave.filter(x=>!x.faceDown&&!(c.summonOrigin==='grave'&&x.uid===c.executionUid)&&api.faces(card(x)).some(c=>c.type==='spell')).length:tax.amount);},0),0);},
  effect(s,p,c,uid,entry){if(!c.g56Effect)return false;put(s,task('g56_'+c.g56Effect,p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;}
 };
}
