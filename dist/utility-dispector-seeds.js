// Grave permissions belong to a particular battlefield incarnation, not a card name.
export function createUtilityDispectorSeeds(api){
 const{card,cost,effective,put,task,choice,opt}=api,key=x=>x.uid+'@'+(x.incarnation||0);
 const sources=(s,p)=>s.active===p?s.players[p].battle.filter(x=>!x.sealed&&effective(x,s).g91Grave&&!(s.extLimits||[]).some(l=>l.kind==='g91GraveUsed'&&l.player===p&&l.ref===key(x))):[];
 const dispector=c=>c.type==='creature'&&String(c.race).includes('ディスペクター');
 function gravePermits(s,p,x,c=card(x)){return dispector(c)&&api.canMoveZone(s,p,'grave')?sources(s,p).map(x=>'g91:'+key(x)):[];}
 function protectedTarget(s,p,owner,x){return p!==owner&&api.isSpellResolution(s)&&(s.extLimits||[]).some(l=>l.kind==='g91SpellProtection'&&l.player===owner&&api.allLayers(x).some(y=>key(y)===l.ref));}
 return{
  gravePermits,
  effect(s,p,c,uid){if(c.g91Effect!=='Discard')return false;put(s,task('g91_DiscardPick',s.active,c.id,{controller:p,stage:0,selected:[]}));return true;},
  mainActions(s,p){if(!sources(s,p).length||!api.canMoveZone(s,p,'grave'))return[];return s.players[p].grave.flatMap(x=>{const c=card(x),payment={...c,summonOrigin:'grave'};return dispector(c)&&api.canCast(s,p,c,'grave')&&api.canEnter(s,p,c,{origin:'grave',execution:true})&&(!c.evolution||api.evolutionBases(s,p,c).length)&&api.canPay(s,p,payment)?gravePermits(s,p,x,c).map(permit=>({kind:'play',uid:x.uid,cardId:x.cardId,origin:'grave',manaPermit:permit,cost:api.summonCost(s,p,payment),label:c.name+'を墓地から召喚（ア・ストラ・ゼーレの電影）'})):[];});},
  played(s,p,c,x,origin,permit){if(origin==='grave'&&permit?.startsWith('g91:'))(s.extLimits??=[]).push({kind:'g91GraveUsed',player:p,ref:permit.slice(4),expires:'end',who:s.active});},
  targetable:(s,p,owner,x)=>!protectedTarget(s,p,owner,x),
  snapshot(s){return[0,1].flatMap(p=>s.players[p].battle.filter(x=>!x.sealed&&effective(x,s).g91Al).map(x=>({p,ref:key(x)})));},
  leaving(s,p,x,before,to,destroy){if(to==='grave'&&destroy&&before?.some(r=>r.p===p&&r.ref===key(x)))api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g91_Protect',p,x.cardId)});},
  run(s,t){if(t.op==='g91_DiscardPick'){if(t.stage===2){put(s,...t.selected.map(r=>task('discardChosen',r.p,t.source,{uid:r.uid,n:1,causedBy:t.controller})));}else{const p=t.stage===0?s.active:1-s.active,hand=s.players[p].hand;if(hand.length)choice(s,{...t,p},'捨てる自分の手札を1枚選ぶ',hand.map(x=>opt(card(x).name,x.uid,15-Math.min(cost(card(x)),30),x.cardId)));else put(s,{...t,stage:t.stage+1});}return true;}if(t.op!=='g91_Protect')return false;choice(s,t,'次の自分のターンのはじめまで呪文から守る、自分のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,api.creatures(s,t.p).filter(x=>!x.sealed)).map(o=>({...o,score:20+cost(effective(s.players[t.p].battle.find(x=>x.uid===o.value),s))*3})));return true;},
  chosen(s,t,v){if(t.op==='g91_DiscardPick'){put(s,{...t,stage:t.stage+1,selected:[...t.selected,{p:t.p,uid:v}]});return true;}if(t.op!=='g91_Protect')return false;const x=s.players[t.p].battle.find(x=>x.uid===v);if(x)(s.extLimits??=[]).push({kind:'g91SpellProtection',player:t.p,ref:key(x),expires:'start',who:t.p});return true;}
 };
}
