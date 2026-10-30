// Photograph 160: serializable choices, exact ordered modes and grave execution.
// Official QA38767/44218: choose modes first, then resolve in printed order.
// Official QA45576: Eternal Sword returns one creature before destroying the other.
export function createPhoto160SpellRules(api){
 const{card,faces,cost,colors,effective,put,task,choice,opt}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),living=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 const active=(s,p,r)=>s.players[p].battle.filter(x=>!x.sealed&&!api.ignored(s,x)&&card(x).g160SRole===r);
 const sources=(s,p)=>active(s,p,'abis').filter(x=>s.g160SAbisUses?.[key(x)]!==s.turn);
 const next=(s,t,op,more={})=>put(s,{...t,op:'g160S_'+op,...more});
 const event=(p,x,op,more={})=>({player:p,uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g160S_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const ref=x=>({uid:x.uid,incarnation:x.incarnation||0});
 const target=(s,p,r)=>s.players[p].battle.find(x=>key(x)===key(r));
 const mana=(s,p)=>s.players[p].mana;
 function zoneMove(s,p,uid,to){if(!api.canMoveZone(s,p,'mana')||api.manaMoveForbidden(s,p))return;const x=api.remove(mana(s,p),uid);if(x){api.clear(x,to);api.addZone(s,p,to,x);}}
 function swordPick(s,t){const selected=t.selected||[],rows=living(s,1-t.p).filter(x=>!selected.some(r=>key(r)===key(x)));if(selected.length>=2||!rows.length){next(s,t,'SwordBounce',{selected});return;}const opts=api.targetOptions(s,t.p,rows);if(!opts.length){next(s,t,'SwordBounce',{selected});return;}choice(s,{...t,selected},'英知と追撃の宝剣：相手のクリーチャーを2体選ぶ（'+selected.length+'/2）',opts);}
 function swordManaPick(s,t){const selected=t.selected||[],rows=mana(s,1-t.p).filter(x=>!selected.includes(x.uid));if(selected.length>=2||!rows.length){next(s,t,'SwordManaBounce',{selected});return;}choice(s,{...t,selected},'英知と追撃の宝剣：相手のマナを2枚選ぶ（'+selected.length+'/2）',rows.map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,x.faceDown?10:cost(card(x)),x.faceDown?null:x.cardId)));}
 function cup(s,t){const selected=t.selected||[],own=s.players[t.p],targets=living(s,1-t.p).filter(x=>api.targetOptions(s,t.p,living(s,1-t.p)).some(o=>o.value===x.uid));if(selected.length===2){const defs=[...selected].sort((a,b)=>a-b).flatMap(n=>n===0?[task('draw',t.p,t.source,{n:2}),task('discard',t.p,t.source,{n:1,causedBy:t.p})]:n===1?[task('g160S_CupMinus',t.p,t.source)]:[task('g34_Select',t.p,t.source,{origin:'grave',n:1,filter:{seed:true,max:4},deploy:true,title:'邪杯と魔術の決断：墓地のコスト4以下のタマシードを1つ出す'})]);put(s,...defs);return;}
  const draws=selected.filter(n=>n===0).length;choice(s,{...t,selected},'邪杯と魔術の決断：先に2回分の効果を選ぶ（'+selected.length+'/2・同じ効果も可）',[opt('2枚引いて1枚捨てる',0,own.deck.length>2*(draws+1)?25:-1000),opt('墓地の枚数に応じて相手1体のパワーを下げる',1,targets.length?Math.max(...targets.map(x=>api.power(x,false,s)<=own.grave.length*1000?45:own.grave.length?18:0)):0),opt('墓地からコスト4以下のタマシードを出す',2,api.canMoveZone(s,t.p,'grave')&&own.grave.some(x=>card(x).type==='seed'&&cost(card(x))<=4)?30:0)]);
 }
 function lost(s,t){const own=s.players[t.p],used=s.g160SLost?.[key(t)]||[];const opts=[opt('相手のシールド1つを墓地へ',0,s.players[1-t.p].shields.length?35:0),opt('相手が手札を2枚選んで捨てる',1,Math.min(2,s.players[1-t.p].hand.length)*15),opt('自分のシールド2つを手札へ（S・トリガー不可）',2,own.shields.length?8:0),opt('自分はゲームに負ける',3,-1000)].filter(o=>!used.includes(o.value));if(opts.length)choice(s,t,'デス・ザ・ロストの黒像：まだ選んでいない効果を1つ選ぶ',opts);}
 function run(s,t){if(!t.op.startsWith('g160S_'))return false;const own=s.players[t.p];switch(t.op){
 case'g160S_Sword':swordPick(s,t);break;
 case'g160S_SwordBounce':{const p=1-t.p,rows=(t.selected||[]).map(r=>target(s,p,r)).filter(Boolean);if(!rows.length){next(s,t,'SwordMana',{selected:[]});break;}choice(s,{...t,p,controller:t.p},'英知と追撃の宝剣：選ばれた中から手札に戻す自分の1体を選ぶ',rows.map(x=>opt(card(x).name,x.uid,cost(card(x)),x.cardId)));break;}
 case'g160S_SwordDestroy':{const p=1-t.p,x=t.destroy&&target(s,p,t.destroy);next(s,t,'SwordMana',{selected:[]});if(x)api.move(s,[{player:p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);break;}
 case'g160S_SwordMana':swordManaPick(s,t);break;
 case'g160S_SwordManaBounce':{const p=1-t.p,rows=(t.selected||[]).map(uid=>mana(s,p).find(x=>x.uid===uid)).filter(Boolean);if(rows.length)choice(s,{...t,p,controller:t.p},'英知と追撃の宝剣：選ばれたマナから手札に戻す1枚を選ぶ',rows.map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,x.faceDown?1:cost(card(x)),x.faceDown?null:x.cardId)));break;}
 case'g160S_AbisLoot':put(s,task('draw',t.p,t.source,{n:2}),task('discard',t.p,t.source,{n:2,causedBy:t.p}));break;
 case'g160S_Cup':cup(s,t);break;
 case'g160S_CupMinus':choice(s,t,'邪杯と魔術の決断：パワーを下げる相手1体を選ぶ',api.targetOptions(s,t.p,living(s,1-t.p)).map(o=>{const x=living(s,1-t.p).find(x=>x.uid===o.value);return{...o,score:api.power(x,false,s)<=own.grave.length*1000?45+cost(card(x)):cost(card(x))};}));break;
 case'g160S_Love':api.mill(s,t.p,2);put(s,task('g34_Select',t.p,t.source,{origin:'grave',n:1,filter:{creatureOrSeed:true,color:'闇',max:4},deploy:true,optional:true,title:'愛・爆・発：墓地の闇のコスト4以下のクリーチャーかタマシードを1つまで出す'}));break;
 case'g160S_Lost':lost(s,t);break;
 case'g160S_LostShield':{const p=t.owner,rows=s.players[p].shields.filter(x=>!api.shieldCards(x).some(y=>y.g37ShieldHeld)),selected=t.selected||[];if(selected.length>=t.n||!rows.some(x=>!selected.includes(x.uid))){const moved=[];for(const uid of selected)moved.push(...api.moveShield(s,p,uid,t.to));if(t.to==='hand')put(s,...moved.filter(x=>card(x).gStrike).map(x=>task('gsTarget',p,x.cardId)));break;}choice(s,{...t,selected},t.to==='grave'?'墓地に置く相手のシールドを1つ選ぶ':'手札へ加える自分のシールドを2つ選ぶ（S・トリガー不可）',rows.filter(x=>!selected.includes(x.uid)).map((x,i)=>opt('シールド '+(i+1),x.uid,10)));break;}
 case'g160S_Parthenon':put(s,task('discard',1-t.p,t.source,{n:1,causedBy:t.p}));break;
 default:throw Error('未実装の写真160呪文効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g160S_'))return false;const own=s.players[t.p];switch(t.op){
 case'g160S_Sword':{const x=target(s,1-t.p,{uid:v,incarnation:s.players[1-t.p].battle.find(x=>x.uid===v)?.incarnation||0});if(x)next(s,t,'Sword',{selected:[...(t.selected||[]),ref(x)]});break;}
 case'g160S_SwordBounce':{const p=t.p,controller=t.controller,x=(t.selected||[]).map(r=>target(s,p,r)).find(x=>x?.uid===v),destroy=(t.selected||[]).find(r=>r.uid!==v);next(s,{...t,p:controller},'SwordDestroy',{destroy});if(x)api.move(s,[{player:p,uid:x.uid,to:'hand',destroy:false,controller}]);break;}
 case'g160S_SwordMana':next(s,t,'SwordMana',{selected:[...(t.selected||[]),v]});break;
 case'g160S_SwordManaBounce':{zoneMove(s,t.p,v,'hand');for(const uid of t.selected||[])if(uid!==v)zoneMove(s,t.p,uid,'grave');break;}
 case'g160S_Cup':next(s,t,'Cup',{selected:[...(t.selected||[]),v]});break;
 case'g160S_CupMinus':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)(x.powerModifiers??=[]).push({amount:-1000*own.grave.length,expires:'end',who:s.active,spellCost:cost(card(t.source)),spellSource:t.source});break;}
 case'g160S_Lost':{const k=key(t);((s.g160SLost??={})[k]??=[]).push(v);if(v===0)next(s,t,'LostShield',{owner:1-t.p,n:1,to:'grave',selected:[]});else if(v===1)put(s,task('discard',1-t.p,t.source,{n:2,causedBy:t.p}));else if(v===2)next(s,t,'LostShield',{owner:t.p,n:2,to:'hand',selected:[]});else api.finish(s,1-t.p,'デス・ザ・ロストの黒像：敗北の効果を選択','loss');break;}
 case'g160S_LostShield':next(s,t,'LostShield',{selected:[...(t.selected||[]),v]});break;
 default:throw Error('未実装の写真160呪文選択：'+t.op);
 }return true;}
 return{run,chosen,
 effect(s,p,c,uid,entry){if(!c.g160SEffect)return false;put(s,task('g160S_'+c.g160SEffect,p,c.id,{uid,incarnation:entry?.incarnation??s.players[p].battle.find(x=>x.uid===uid)?.incarnation??0}));return true;},
 graveAdded(s,p,xs){if(xs.length)s.g160SGraveTurn=s.turn;},
 discount(s,p,c){return(c.g160SRole==='cup'&&s.g160SGraveTurn===s.turn?2:0)+(c.summonOrigin==='grave'?active(s,p,'abis').length*2:0);},
 mainActions(s,p){if(!api.canMoveZone(s,p,'grave'))return[];const out=[];for(const x of s.players[p].grave)for(const[face,c]of faces(card(x)).entries()){if(c.type!=='spell'||!api.canCast(s,p,c,'grave'))continue;const payment={...c,summonOrigin:'grave',executionUid:x.uid};if(!api.canPay(s,p,payment))continue;for(const w of sources(s,p))out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,origin:'grave',manaPermit:'g160S:'+key(w),cost:api.summonCost(s,p,payment),label:c.name+'を墓地から唱える（アビス記号jS・使用後は山札の下）'});}return out;},
 played(s,p,c,x,origin,permit){if(origin==='grave'&&c.type==='spell'&&permit?.startsWith('g160S:')){(s.g160SAbisUses??={})[permit.slice(6)]=s.turn;x.finishTo='deck';}},
 end(s){return s.players[s.active].battle.filter(x=>!x.sealed&&!api.ignored(s,x)).flatMap(x=>card(x).g160SRole==='lost'?[event(s.active,x,'Lost')]:card(x).g160SRole==='parthenon'?[event(s.active,x,'Parthenon')]:[]);}
 };
}
