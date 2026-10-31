// Shared zone policies apply to grave recovery and hidden-library searches.
export function createUtilityExpansionRules(api){
 const{card,faces,cost,put,task,choice,opt}=api;
 function search(s,t){const own=s.players[t.p],held=new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
  const visible=own.deck.filter(x=>!held.has(x.uid)).slice(0,api.lookCount(s,t.p,own.deck.length)),isPublic=api.lookPublic(s,t.p),rows=visible.filter(x=>faces(card(x)).some(c=>c.type==='spell'));
  if(visible.length)api.log(s,t.p,isPublic?'reveal':'look',card(t.source).name+'：山札を'+(isPublic?'公開：'+visible.map(x=>card(x).name).join('・'):'確認'),{cardId:t.source});
  choice(s,t,t.top?'公開して山札の一番上に置く呪文を1枚まで選ぶ':'公開して手札に加える呪文を1枚まで探す',[...rows.map(x=>opt(card(x).name,x.uid,10+Math.max(...faces(card(x)).filter(f=>f.type==='spell').map(cost)),x.cardId)),opt('選ばずにシャッフル',null,0)]);
 }
 function run(s,t){if(!/^g5[45]_/.test(t.op))return false;const own=s.players[t.p];switch(t.op){
 case'g55_ShieldHand':{const rows=own.shields.filter(x=>api.shieldCards(x).some(y=>!y.g37ShieldHeld));if(rows.length)choice(s,t,'手札に加える自分のシールドを1つ選ぶ（S・トリガーは使えません）',rows.map((x,i)=>opt('シールド '+(i+1)+(x.faceUp?'：'+card(x).name:''),x.uid,10,x.faceUp?x.cardId:undefined)));break;}
 case'g54_Shrine':{
  if(!api.canMoveZone(s,t.p,'grave'))break;
  const rows=own.grave.splice(0),to=api.manaRedirect(s,t.p)?'grave':'mana';
  for(const x of rows){api.clear(x,to);if(to==='mana')x.tapped=true;}
  api.addZone(s,t.p,to,...rows);api.log(s,t.p,'graveMana',card(t.source).name+'：墓地の'+rows.length+'枚を'+(to==='mana'?'タップしてマナ':'墓地')+'に置いた',{cardId:t.source});break;
 }
 case'g54_Apocalypse':case'g54_Onsen':{const rows=[0,1].flatMap(p=>api.creatures(s,p).filter(x=>!x.sealed&&(t.op!=='g54_Onsen'||cost(api.effective(x,s))<=3)).map(x=>({player:p,uid:x.uid,to:'grave',destroy:true,controller:t.p})));if(rows.length&&(t.op==='g54_Onsen'||rows.length>=6))api.move(s,rows);break;}
 case'g54_Search':search(s,t);break;
 case'g54_Fortune':if(s.players[1-t.p].shields.length<=3)put(s,task('g34_Draw',t.p,t.source,{n:2,optional:true}));break;
 default:throw Error('未実装の追加ユーティリティ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(t.op==='g55_ShieldHand'){const moved=api.moveShield(s,t.p,v,'hand',{noST:!!t.g238ShieldHand});api.log(s,t.p,'shieldHand',card(t.source).name+'：シールド1つ（カード'+moved.length+'枚）を手札へ加えた（S・トリガーは使えない）',{cardId:t.source});return true;}if(t.op!=='g54_Search')return false;const own=s.players[t.p],x=v&&own.deck.find(x=>x.uid===v);if(x){api.remove(own.deck,x.uid);api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(x).name,{cardId:x.cardId});api.clear(x,t.top?'deck':'hand');}
  if(x&&!t.top)api.addZone(s,t.p,'hand',x);api.shuffleLibrary(s,t.p,[],t.source);if(x&&t.top)own.deck.unshift(x);api.deckCheck(s,t.p);return true;
 }
 return{run,chosen,
  manaTap:(s,p)=>api.creatures(s,1-p).some(x=>!x.sealed&&api.effective(x,s).g55ManaTap),
  snapshot(s,rows){return rows.flatMap(r=>{const x=s.players[r.player].battle.find(x=>x.uid===r.uid);return x&&api.effective(x,s).g55Stepple?[{p:r.player,uid:x.uid}]:[];});},
  leaving(s,p,x,snapshot,to,destroy){if(to==='grave'&&destroy&&snapshot?.some(r=>r.p===p&&r.uid===x.uid))api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Select',p,x.cardId,{origin:'mana',to:'grave',n:1,optional:false,title:'ステップル：マナから墓地に置くカードを1枚選ぶ'})});},
  effect(s,p,c){if(c.g55Effect){put(s,task('g55_'+c.g55Effect,p,c.id));return true;}if(!c.g54Effect)return false;const op=c.g54Effect;if(op==='Cube'||op==='Circle')put(s,task('g54_Search',p,c.id,{top:op==='Circle'}));else put(s,task('g54_'+op,p,c.id));return true;}};
}
