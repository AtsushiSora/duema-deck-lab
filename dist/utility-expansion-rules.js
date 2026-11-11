// Shared zone policies apply to grave recovery and hidden-library searches.
export function createUtilityExpansionRules(api){
 const{card,faces,cost,put,task,choice,opt}=api;
 function search(s,t){const own=s.players[t.p],held=new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
  const matches=c=>t.god?c.type==='creature'&&String(c.race).includes('ゴッド'):c.type==='spell';
  const visible=own.deck.filter(x=>!held.has(x.uid)).slice(0,api.lookCount(s,t.p,own.deck.length)),isPublic=api.lookPublic(s,t.p);
  if(visible.length)api.log(s,t.p,isPublic?'reveal':'look',card(t.source).name+'：山札を'+(isPublic?'公開：'+visible.map(x=>card(x).name).join('・'):'確認'),{cardId:t.source});
  const options=visible.flatMap(x=>{
   const eligible=faces(card(x)).filter(matches);
   return eligible.length?[opt(card(x).name,x.uid,10+Math.max(...eligible.map(cost)),x.cardId)]:[];
  });
  if(t.god&&!options.length){api.shuffleLibrary(s,t.p,[],t.source);api.deckCheck(s,t.p);return;}
  const title=t.god?'公開して山札の一番上に置くゴッドを1体まで選ぶ':t.top?'公開して山札の一番上に置く呪文を1枚まで選ぶ':'公開して手札に加える呪文を1枚まで探す';
  choice(s,t,title,[...options,opt('選ばずにシャッフル',null,0)]);
 }
 function finishShields535(s,t,uids){const to=t.g554To||'hand',moved=api.moveShields(s,t.p,uids,to,{noST:!!t.g238ShieldHand});api.log(s,t.p,to==='mana'?'shieldMana':'shieldHand',card(t.source).name+'：シールド'+uids.length+'つ（カード'+moved.length+'枚）をまとめて'+(to==='mana'?'マナへ置いた':'手札へ加えた（S・トリガーは使えない）'),{cardId:t.source});}
 function run(s,t){if(!/^g5[45]_/.test(t.op))return false;const own=s.players[t.p];switch(t.op){
 case'g55_ShieldHand':{if(t.g535Count==='all'){finishShields535(s,t,own.shields.filter(x=>api.shieldCards(x).some(y=>!y.g37ShieldHeld)).map(x=>x.uid));break;}if(t.g535Count){
  const selected=t.g535Selected||[],rows=own.shields.filter(x=>!selected.includes(x.uid)&&api.shieldCards(x).some(y=>!y.g37ShieldHeld));
  const any=t.g535Count==='any',mana=t.g554To==='mana';
  if(!rows.length||!any&&selected.length>=t.g535Count){if(selected.length)finishShields535(s,t,selected);break;}
  // When there is no cap, the CPU keeps two shields and stops adding mana at eight.
  const score=any&&(rows.length<=2||own.mana.length+selected.length>=8)?-10:10;
  const title=(mana?'マナに置く':'手札に加える')+'シールドを選ぶ（'+selected.length+(any?'つ選択済み':'/'+t.g535Count)+'、選択後まとめて移動）';
  const options=rows.map(x=>{const i=own.shields.indexOf(x);return opt('シールド '+(i+1)+(x.faceUp?'：'+card(x).name:''),x.uid,score,x.faceUp?x.cardId:undefined);});
  if(t.optional)options.push(opt(selected.length?'ここまでの'+selected.length+'つを'+(mana?'マナに置く':'手札に加える'):'選ばずに終了',null,0));
  choice(s,t,title,options);break;
 }if(t.g533CardOnly){const rows=own.shields.flatMap((root,i)=>api.shieldCards(root).map((x,j)=>({x,i,j}))).filter(({x})=>!x.g37ShieldHeld);if(rows.length)choice(s,t,'手札に加えるシールドゾーンのカードを1枚選ぶ（S・トリガーは使えません）',rows.map(({x,i,j})=>opt('シールド '+(i+1)+' のカード '+(j+1)+(x.faceUp?'：'+card(x).name:''),x.uid,10,x.faceUp?x.cardId:undefined)));break;}const owner=t.g832ShieldOwner??t.p,shields=s.players[owner].shields;
 const rows=shields.filter(x=>api.shieldCards(x).some(y=>!y.g37ShieldHeld));
 if(rows.length)choice(s,t,'手札に加える'+(owner===t.p?'自分':'相手')+'のシールドを1つ選ぶ（S・トリガーは使えません）',rows.map((x,i)=>opt('シールド '+(i+1)+(x.faceUp?'：'+card(x).name:''),x.uid,10,x.faceUp?x.cardId:undefined)));break;}
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
 function chosen(s,t,v){if(t.op==='g55_ShieldHand'){if(t.g535Count){const selected=t.g535Selected||[];if(v===null){if(selected.length)finishShields535(s,t,selected);}else put(s,{...t,g535Selected:[...selected,v]});return true;}const moved=api.moveShield(s,t.g832ShieldOwner??t.p,v,'hand',{noST:!!t.g238ShieldHand,cardOnly:!!t.g533CardOnly});api.log(s,t.p,'shieldHand',card(t.source).name+(t.g533CardOnly?'：シールドゾーンのカード'+moved.length+'枚':'：シールド1つ（カード'+moved.length+'枚）')+'を手札へ加えた（S・トリガーは使えない）',{cardId:t.source});return true;}if(t.op!=='g54_Search')return false;const own=s.players[t.p],x=v&&own.deck.find(x=>x.uid===v);if(x){api.remove(own.deck,x.uid);api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(x).name,{cardId:x.cardId});if(!t.god)api.clear(x,t.top?'deck':'hand');else delete x.g11Sideways;}
  if(x&&!t.top)api.addZone(s,t.p,'hand',x);api.shuffleLibrary(s,t.p,[],t.source);if(x&&t.top)own.deck.unshift(x);api.deckCheck(s,t.p);return true;
 }
 return{run,chosen,
  manaTap:(s,p)=>api.creatures(s,1-p).some(x=>!x.sealed&&api.effective(x,s).g55ManaTap),
  snapshot(s,rows){return rows.flatMap(r=>{const x=s.players[r.player].battle.find(x=>x.uid===r.uid);return x&&api.effective(x,s).g55Stepple?[{p:r.player,uid:x.uid}]:[];});},
  leaving(s,p,x,snapshot,to,destroy){if(to==='grave'&&destroy&&snapshot?.some(r=>r.p===p&&r.uid===x.uid))api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Select',p,x.cardId,{origin:'mana',to:'grave',n:1,optional:false,title:'ステップル：マナから墓地に置くカードを1枚選ぶ'})});},
  effect(s,p,c){if(c.g55Effect){put(s,task('g55_'+c.g55Effect,p,c.id));return true;}if(!c.g54Effect)return false;const op=c.g54Effect;if(op==='GodSignal')put(s,task('g54_Search',p,c.id,{top:true,god:true}));else if(op==='Cube'||op==='Circle')put(s,task('g54_Search',p,c.id,{top:op==='Circle'}));else put(s,task('g54_'+op,p,c.id));return true;}};
}
