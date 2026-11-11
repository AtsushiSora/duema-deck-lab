import {createFifteenPhotoRules} from './fifteen-photo-rules.js?v=0.721.0';
import {createChampionRaid} from './champion-raid-helpers.js';
import {policyTake} from './champion-zone-policy.js';
import {RECOVERY_RACES} from './utility-recovery-races.js?v=0.119.0';
// Six photographed deck lists: serializable effects, physical cards and explicit choices.
export function createSixPhotoRules(api){
 const{card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,enter,cast,move,targetOptions}=api;
 const raid764=createChampionRaid(api,'g34_');
 const attackConditionReading481=new WeakSet(),playerStopReading567=new WeakSet();
 const shieldAdds918=new WeakMap();
 const civilizations805=['光','水','闇','火','自然'];
 function creatureCivilizations805(s){
  return [0,1].flatMap(p=>creatures(s,p).filter(x=>!x.sealed).map(x=>({
   p,x,cs:colors(effective(x,s,true)).filter(c=>civilizations805.includes(c))
  })));
 }
 const exactRaces=c=>String(c.race||'').split('/').filter(Boolean);
 // Soul marks are printed characteristics and remain when abilities are ignored.
 const hasSoul=(c,soul)=>c.g558Souls?.includes(soul)||c.text?.includes('【'+soul+'・ソウル】');
 const race=(c,q)=>String(c.race).includes(q),mecha=c=>race(c,'メカ'),ninja=c=>race(c,'シノビ'),demon=c=>race(c,'デーモン・コマンド'),angel=c=>race(c,'エンジェル・コマンド');
 // A restricted origin permission belongs to one incarnation of its provider.
 function zonePermits450(s,p,x,c,origin){if(s.active!==p||c.type!=='creature'||origin==='mana'&&x.faceDown||!api.canMoveZone(s,p,origin))return[];return creatures(s,p).flatMap(y=>{const r=!y.sealed&&effective(y,s).g450ZoneSummon,k='g450:'+y.uid+'@'+(y.incarnation||0);return r&&r.origin===origin&&s.g450ZoneUses?.[p]?.[k]!==s.turn&&(r.anyShieldsMax===undefined||s.players.some(w=>w.shields.length<=r.anyShieldsMax))&&(!r.filter.evolution||api.isEvolution(x)||!!c.g48HandEvolution)&&matches(s,p,x,r.filter.evolution?{...r.filter,evolution:false}:r.filter)?[k]:[];});}
 // Count visible Joker cards in both zones; a twinpact is one mana card.
 function jokerCount539(s,p){return s.players[p].battle.filter(y=>!y.sealed&&!y.faceDown&&race(effective(y,s),'ジョーカーズ')).length+s.players[p].mana.filter(y=>!y.faceDown&&faces(card(y)).some(c=>race(c,'ジョーカーズ'))).length;}
 const gravePermits294=(s,p,x,c=card(x))=>s.active!==p||c.type!=='creature'||!api.canMoveZone(s,p,'grave')?[]:[...creatures(s,p).filter(y=>{const rule=effective(y,s).g294GraveAura;return !y.sealed&&rule&&(rule.race?race(c,rule.race):colors(c).includes('闇')&&(api.isEvolution(x)||!!c.g48HandEvolution));}).slice(0,1).map(y=>'g294:'+y.uid+'@'+(y.incarnation||0)),...zonePermits450(s,p,x,c,'grave')];
 // Mana characteristics include both twinpact faces and live Courtney effects.
 const manaPermits297=(s,p,x,c=card(x))=>s.active!==p||x.faceDown||!s.players[p].mana.includes(x)||c.type!=='creature'||!api.canMoveZone(s,p,'mana')?[]:[
  ...((s.extLimits||[]).some(l=>l.kind==='g297ManaTurn'&&l.player===p&&l.turn===s.turn)?['g297:turn']:
  creatures(s,p).filter(y=>{const rule=effective(y,s).g297ManaAura,cs=api.manaColors(card(x),s,p);return !y.sealed&&rule&&(rule.colorless?cs.length===0:cs.length>1);}).slice(0,1).map(y=>'g297:'+y.uid+'@'+(y.incarnation||0))),...zonePermits450(s,p,x,c,'mana'),...(c.g539SelfMana&&jokerCount539(s,p)>=c.g539SelfMana?['g539:self']:[])];
 const crossGears728=(s,p)=>s.players[p].battle.filter(x=>!x.sealed&&card(x).type==='gear');
 const crossedCount728=(s,x)=>s.players.reduce((n,_,p)=>n+crossGears728(s,p).filter(g=>g.crossedTo?.uid===x.uid&&g.crossedTo.incarnation===(x.incarnation||0)).length,0);
 const key=x=>x.uid+'@'+(x.incarnation||0),live=(s,t)=>s.players[t.p].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===(t.incarnation||0));
 function turboReady756(s,p,x){
  const history=s.g756Breaks;
  if(history?.turn!==s.turn)return false;
  const refs=api.allLayers(x).map(key);
  return history.players[p].some(breaker=>!breaker.some(ref=>refs.includes(ref)));
 }
 // A new seed and every matching existing seed each create their own trigger.
 function seedWatches548(s,p,y,{selfMuted=false,prospective=false}={}){
  if(y.sealed||!matches(s,p,y,{g295Tamaseed:true}))return[];
  const rows=prospective&&!s.players[p].battle.includes(y)?[...s.players[p].battle,y]:s.players[p].battle;
  return rows.flatMap(x=>{const w=!x.sealed&&effective(x,s).g548SeedEntry,self=x.uid===y.uid;return w&&!(self&&selfMuted)&&(self&&w.selfAlways||matches(s,p,y,w.filter))?[{x,defs:w.defs}]:[];});
 }
 // Only public counts are projected; an unknown library order is never consulted.
 function entryPlan549(s,p,c,source){
  const own=s.players[p],projected={...s,players:s.players.map((v,q)=>q===p?{...v,hand:v.hand.filter(y=>y.uid!==source?.uid),battle:source&&!v.battle.some(y=>y.uid===source.uid)?[...v.battle,source]:v.battle}:v)},walk=defs=>defs.flatMap(d=>d.op==='Sequence'?walk(d.defs):d.op==='IfOwn'?walk(ownCondition(projected,p,d.filter,source?.uid,source?.incarnation||0)?d.defs:d.elseDefs||[]):[d]),defs=walk(c.g34Tasks||[]);
  let left=own.deck?.length??own.deckCount??0;
  if(!api.deckLocked(s,p))for(const d of defs){if(!['Draw','Ramp','ShieldTop'].includes(d.op)||d.optional||d.op==='ShieldTop'&&!api.canAddShield(s,p))continue;left-=d.n||0;if(left<=0)return{defs,exhaustion:d.op==='Draw'&&creatures(s,p).some(y=>effective(y,s).shako)?1000:-1000};}
  return{defs,exhaustion:null};
 }
 // Delayed abilities belong to the controller who created them, independently of their source.
 function collect537(s,when,p){
  const due=[],keep=[];
  for(const r of s.g537Delays||[]){
   if(r.when===when&&(when==='turnEnd'?r.turn===s.turn:(r.who??r.p)===p&&r.turn<s.turn)){
    if(r.spellCost!==undefined&&api.spellIgnored(s,{type:'spell',cost:r.spellCost,spellSource:r.source}))continue;
    due.push({player:r.p,source:r.source,uid:r.uid,incarnation:r.incarnation,effect:'extended',
     task:task('g34_ResolveDelay537',r.p,r.source,{uid:r.uid,incarnation:r.incarnation,defs:r.defs,...(r.spellCost!==undefined?{spellCost:r.spellCost}:{})})});
   }else if(r.when!=='turnEnd'||r.turn>=s.turn)keep.push(r);
  }
  s.g537Delays=keep;
  return due;
 }
 function shieldDeparture536(s,p){
  for(const x of creatures(s,p)){
   if(x.sealed)continue;
   const {g536ShieldLeft,g536Once}=effective(x,s);
   if(!g536ShieldLeft||g536Once&&used(s,'g536ShieldLeftUsed',x))continue;
   if(g536Once)mark(s,'g536ShieldLeftUsed',x);
   queue(s,p,x,g536ShieldLeft);
  }
 }
 function stayUntilStart627(s,t,x){
  if(x&&!x.sealed)(s.extLimits??=[]).push({kind:'g627Stay',ref:{uid:x.uid,incarnation:x.incarnation||0},expires:'start',who:t.p});
 }
 function sourceHost474(s,t){if(!t)return null;for(const p of[0,1]){const x=s.players[p].battle.find(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)));if(x)return{p,x};}return null;}
 function entryFight624(s,t){
  const own=sourceHost474(s,t),enemy=sourceHost474(s,t.enemy);
  return own&&enemy&&own.p!==enemy.p&&[own.x,enemy.x].every(x=>!x.sealed&&api.isCreature(s,x))?[own,enemy]:null;
 }
 // Public history counts creatures, not repeated untaps. Evolution keeps a creature's identity.
 function recordUntap472(s,p,x){if(x.sealed||!api.isCreature(s,x)||!s.players[p].battle.includes(x))return;const refs=api.allLayers(x).map(key),h=s.g472Untapped?.turn===s.turn?s.g472Untapped:(s.g472Untapped={turn:s.turn,groups:[]}),seen=h.groups.filter(xs=>xs.some(k=>refs.includes(k)));if(seen.length){for(const xs of seen)for(const k of refs)if(!xs.includes(k))xs.push(k);}else h.groups.push(refs);}
 // These resolved reductions expire on the next matching use, including free uses.
 function reductionMatches456(c,r){const f=r.filter||{};return !c.crossing&&c.type===r.type&&(!f.race||race(c,f.race))&&(!f.color||colors(c).includes(f.color))&&(f.minPower===undefined||c.power==='∞'||Number(c.power)>=f.minPower);}
 const reductions456=(s,p,c)=>(s.extLimits||[]).filter(r=>r.kind==='g456NextReduction'&&r.player===p&&r.turn===s.turn&&reductionMatches456(c,r));
 function reductionRange456(s,p,c){return reductions456(s,p,c).reduce((r,x)=>({min:r.min+(x.optional?0:x.amount),max:r.max+x.amount}),{min:0,max:0});}
 function nextReduction456(s,p,c){const r=reductionRange456(s,p,c);return c.g456Reduction===undefined?r.max:Math.min(r.max,Math.max(r.min,c.g456Reduction));}
 function consumeReduction456(s,p,c){if(!s.extLimits?.some(r=>r.kind==='g456NextReduction'))return;s.extLimits=(s.extLimits||[]).filter(r=>!(r.kind==='g456NextReduction'&&r.player===p&&r.turn===s.turn&&reductionMatches456(c,r)));}
 // New optional auras choose their combined reduction independently for each summon.
 function summonAuras560(s,p,c){const out={mandatory:0,optional:0,zeroOptional:0};if(c.type!=='creature'||c.crossing)return out;const fits=f=>(!f.g836NameIds||f.g836NameIds.includes(c.id))&&(!f.g832NameIncludes||exactName(creatureFaceName(c)).includes(f.g832NameIncludes))&&(!f.g756Colorless||colors(c).length===0)&&(!f.any||f.any.some(fits))&&(!f.race||race(c,f.race))&&(!f.raceAny||f.raceAny.some(q=>race(c,q)))&&(!f.color||colors(c).includes(f.color))&&(!f.evolution||api.isEvolution({cardId:c.id})||!!c.neoEvolution&&!!c.g27BaseUid)&&(f.minPower===undefined||c.power==='∞'||Number(c.power)>=f.minPower)&&(f.min===undefined||cost({...c,cost:c.printedCost??c.cost})>=f.min)&&(f.max===undefined||cost({...c,cost:c.printedCost??c.cost})<=f.max);
  for(const who of[p,1-p])for(const x of s.players[who].battle){if(x.sealed)continue;const d=effective(x,s);for(const r of[...(d.g290SummonAura?[d.g290SummonAura]:[]),...(d.g349SummonAuras||[])]){if(!api.isCreature(s,x)&&!(r.g560Element&&d.type==='seed')||who!==p&&!r.both)continue;const match=r.filter?fits(r.filter):r.neo?!!c.neoEvolution:r.color?colors(c).includes(r.color):race(c,r.race);if(!match)continue;let state=s;if(r.g560InUse&&who===p&&(c.summonOrigin||'hand')==='hand'){const uid=c.executionUid??s.players[p].hand.find(y=>y.cardId===c.id)?.uid;state={...s,players:s.players.map((v,q)=>q===p?{...v,hand:v.hand.filter(y=>y.uid!==uid)}:v)};}if(r.condition&&!ownCondition(state,who,r.condition))continue;
   const count=r.g912CountRace?creatures(s,who).filter(y=>!y.sealed&&race(effective(y,s),r.g912CountRace)).length:1;
   const amount=r.amount*count;
   out[r.g560Optional?'optional':'mandatory']+=amount;
   if(r.g756ZeroFloor)out.zeroOptional+=amount;
  }}
  return out;
 }
 function payAura560(s,t){const max=summonAuras560(s,t.p,t.c).optional,choices=[];for(let amount=max;amount>=0;amount--){const c={...t.c,g560Handled:true,g560Amount:amount};if(api.canPay(s,t.p,c)){const n=api.summonCost(s,t.p,c);choices.push(opt((amount?amount+'軽減する':'軽減しない')+'（'+n+'マナ）',amount,100-n*5,t.source));}}choice(s,t,'召喚コストの軽減量を選ぶ',[...choices,opt('召喚をやめる',false,-1000)]);}
 // Count all summons, including ones before an aura entered, using the executed face's colors.
 function recordSummon463(s,p,c){if(c.type!=='creature')return;const prev=s.g463Summons?.[p],r=prev?.turn===s.turn?prev:{turn:s.turn,n:0,colors:{}};r.n++;for(const q of new Set(colors(c)))r.colors[q]=(r.colors[q]||0)+1;(s.g463Summons??=[null,null])[p]=r;}
 function firstSummonMax463(s,p,c){if(c.type!=='creature'||c.crossing)return 0;const history=s.g463Summons?.[p],seen=history?.turn===s.turn?history:null;return creatures(s,p).filter(x=>!x.sealed).reduce((n,x)=>{const r=effective(x,s).g463FirstSummon;return n+(r&&(!r.colors.length?!seen?.n:r.colors.some(q=>colors(c).includes(q))&&!r.colors.some(q=>seen?.colors[q]))?r.amount:0);},0);}
 function firstSummonDiscount463(s,p,c){const max=firstSummonMax463(s,p,c);return c.g463Reduction===undefined?max:Math.min(max,Math.max(0,c.g463Reduction));}
 // A card being used from its counted zone is held aside before computing its cost.
 function countDiscountMax499(s,p,c){
  const t=c.g212CountDiscount;
  if(!t)return 0;
  const owner=t.owner==='opponent'?1-p:p;
  if(t.g753AllMana)return s.players[owner].mana.length*t.amount;
  if(t.zone==='draws')return(s.players[owner].drawsThisTurn||0)*t.amount;
  if(t.zone==='shields'){const shields=s.players[owner].shields;return(typeof shields==='number'?shields:shields.length)*t.amount;}
  const count=owner=>(s.players[owner][t.zone]||[]).filter(x=>!x.faceDown&&!((t.excludeExecutingCard||t.optional||t.minimum===2||t.minimum===0)&&owner===p&&c.summonOrigin===t.zone&&x.uid===c.executionUid)&&(t.zone!=='battle'||!x.sealed&&(t.g557Elements?!x.faceDown&&['creature','seed','gear','field','aura'].includes(api.zoneCard(s,owner,x).type):api.isCreature(s,x)))&&matches(s,owner,x,t.filter)).length;
  return Math.min(t.max??Infinity,(t.owner==='both'?count(p)+count(1-p):count(owner))*t.amount);
 }
 function payCount499(s,t){const choices=[],max=countDiscountMax499(s,t.p,t.c);for(let amount=max;amount>=0;amount--){const c={...t.c,g499Handled:true,g499Reduction:amount};if(api.canPay(s,t.p,c)){const n=api.summonCost(s,t.p,c);choices.push(opt((amount?amount+'軽減する':'軽減しない')+'（'+n+'マナ）',amount,100-n*5,t.source));}}choice(s,t,'召喚の軽減量を選ぶ',[...choices,opt('召喚をやめる',false,-1000)]);}
 // Apply higher floors before the independent one-mana-floor reductions.
 function sympathyAmount500(s,p,c){
  const r=c.g211Sympathy;
  if(!r)return 0;
  return s.players[p].battle.filter(x=>!x.sealed&&(r.filter.seed?(card(x).type==='seed'||card(x).natureAce4):
   (r.elements?!x.faceDown:api.isCreature(s,x))&&matches(s,p,x,r.filter))).length*r.amount;
 }
 function floorOptions500(s,p,c){let sums=new Set([0]);if(c.type!=='creature'||c.crossing)return[0];for(const x of creatures(s,p)){const r=!x.sealed&&effective(x,s).g500SummonAura;if(!r||r.filter.race&&!race(c,r.filter.race)||r.filter.multi&&colors(c).length<2)continue;const amounts=r.exact?[0,r.amount]:Array.from({length:r.amount+1},(_,i)=>i);sums=new Set([...sums].flatMap(n=>amounts.map(m=>n+m)));}return[...sums].sort((a,b)=>b-a);}
 function payFloor500(s,t){const choices=[];for(const amount of floorOptions500(s,t.p,t.c)){const c={...t.c,g500Handled:true,g500Amount:amount};if(api.canPay(s,t.p,c)){const n=api.summonCost(s,t.p,c);choices.push(opt((amount?amount+'軽減する':'軽減しない')+'（'+n+'マナ）',amount,100-n*5,t.source));}}choice(s,t,'最低2マナの軽減量を選ぶ',[...choices,opt('召喚をやめる',false,-1000)]);}
 // Optional continuous spell reductions are chosen for each paid cast, including zero use.
 function spellReductionMax485(s,p,c){return c.type==='spell'&&!c.crossing?creatures(s,p).filter(x=>!x.sealed).reduce((n,x)=>{const r=effective(x,s).g485SpellReduction;return n+(typeof r==='number'?r:r&&(!r.color||colors(c).includes(r.color))?r.amount:0);},0):0;}
 function spellReduction485(s,p,c){const max=spellReductionMax485(s,p,c);return c.g485Amount===undefined?max:Math.max(0,Math.min(max,c.g485Amount));}
 function paySpell485(s,t){const max=spellReductionMax485(s,t.p,t.c),choices=[];for(let amount=max;amount>=0;amount--){const c={...t.c,g485Handled:true,g485Amount:amount};if(api.canPay(s,t.p,c)){const n=api.summonCost(s,t.p,c);choices.push(opt((amount?amount+'軽減する':'軽減しない')+'（'+n+'マナ）',amount,100-n*5,t.source));}}choice(s,t,'呪文の軽減を使う量を選ぶ',[...choices,opt('唱えるのをやめる',false,-1000)]);}
 // The card being summoned is in use, so a different physical hand card must be revealed.
 function revealCards470(s,p,c){const rule=c.g470RevealReduction;if(!rule)return[];const source=c.executionUid??((c.summonOrigin||'hand')==='hand'?s.players[p].hand.find(x=>x.cardId===c.id)?.uid:null);return s.players[p].hand.filter(x=>x.uid!==source&&faces(card(x)).some(f=>cost(f)>=rule.min));}
 function revealPayment470(s,t){const payment={...t.c,...(typeof t.args[4]==='object'?t.args[4]:t.args[4]!==null?{cost:t.args[4]}:{}),printedCost:t.c.cost},rows=revealCards470(s,t.p,payment),selected=rows.find(x=>x.uid===t.revealed);if(selected){const n=creatures(s,1-t.p).some(x=>effective(x,s).noCostReduction)?0:payment.g470RevealReduction.amount;choice(s,t,'軽減する量を選ぶ',Array.from({length:n+1},(_,i)=>n-i).filter(amount=>api.canPay(s,t.p,{...payment,g470Handled:true,g470Revealed:selected.uid,g470Amount:amount})).map(amount=>{const c={...payment,g470Handled:true,g470Revealed:selected.uid,g470Amount:amount};return opt(amount+'軽減して召喚（'+api.summonCost(s,t.p,c)+'マナ）',amount,amount*10+5,selected.cardId);}).concat([opt('召喚をやめる',false,-1000)]));return;}const plain={...payment,g470Handled:true,g470Amount:0};choice(s,{...t,revealed:null},'コスト7以上の手札を1枚見せる？',[...rows.map(x=>opt(card(x).name,x.uid,20,x.cardId)),...(api.canPay(s,t.p,plain)?[opt('見せずに召喚する（'+api.summonCost(s,t.p,plain)+'マナ）',null,0)]:[]),opt('召喚をやめる',false,-1000)]);}
 // Unlike first-summon auras, these may be saved for any later matching summon.
 function onceProviders464(s,p,c){if(c.type!=='creature'||c.crossing||creatures(s,1-p).some(x=>effective(x,s).noCostReduction))return[];return creatures(s,p).filter(x=>{const r=!x.sealed&&effective(x,s).g464OnceSummon;return r&&x.g464UsedTurn!==s.turn&&(!r.race||race(c,r.race))&&(!r.colors||r.colors.some(q=>colors(c).includes(q)));});}
 function selectedOnce464(s,p,c){return onceProviders464(s,p,c).filter(x=>c.g464Reducers===undefined||c.g464Reducers.includes(key(x)));}
 function onceDiscount464(s,p,c){return selectedOnce464(s,p,c).reduce((n,x)=>n+effective(x,s).g464OnceSummon.amount,0);}
 function payOnce464(s,t){const rows=onceProviders464(s,t.p,t.c),selected=t.selected.filter(k=>rows.some(x=>key(x)===k)),remaining=rows.filter(x=>!selected.includes(key(x))),payment={...t.c,g464Reducers:selected},payable=api.canPay(s,t.p,payment),n=api.summonCost(s,t.p,payment);choice(s,{...t,selected},'今回使う軽減を選ぶ（支払うコスト：'+n+'）',[...remaining.map(x=>opt(card(x).name+'の軽減を使う',key(x),api.summonCost(s,t.p,{...t.c,g464Reducers:[...selected,key(x)]})<n?20:-5,x.cardId)),...(payable?[opt('この軽減で召喚する',null,5)]:[]),opt('召喚をやめる',false,-1000)]);}
 // Resolved Hyper activation persists through ignored abilities; continuous Z Rush does not (QA44820 / QA48760).
 const hyperMode418=(s,x)=>!!x.hyperActive&&(!!card(x).hyperTap||x.hyperResolved||!api.ignored(s,x));
 // The spell half of a twinpact is not the name of the attacking creature.
 function creatureFaceName(c){
  const name=String(c.name||''),spell=c.spellFace?.name;
  return spell&&name.endsWith(spell)?name.slice(0,-spell.length).replace(/[\s/／]+$/,''):name;
 }
 const exactName=name=>name.normalize('NFKC').replace(/\s/g,'');
 function graveNameCount698(s,owners,name){
  const normalized=exactName(name);
  return owners.reduce((n,p)=>n+s.players[p].grave.filter(x=>!x.faceDown&&exactName(api.zoneCard(s,p,x,'grave').name)===normalized).length,0);
 }
 // A linked God has each component's name, while an evolution uses its top card.
 const battleNames676=x=>x.godLinks?.length?[x,...x.godLinks].map(y=>exactName(creatureFaceName(card(y.cardId)))):[exactName(creatureFaceName(card(x)))];
 function chainMatches838(rows,chosen){
  const names=new Set(battleNames676(chosen));
  return [chosen,...rows.filter(y=>y!==chosen&&battleNames676(y).some(name=>names.has(name)))];
 }
 function chainOptions838(s,p){
  const rows=creatures(s,1-p).filter(y=>!y.sealed);
  return targetOptions(s,p,rows).map(o=>({...o,score:chainMatches838(rows,rows.find(y=>y.uid===o.value))
   .reduce((n,y)=>n+10+cost(effective(y,s))*2+api.power(y,false,s)/3000,0)}));
 }
 function tapNames676(s,target){
  const names=new Set(battleNames676(target));
  const rows=[0,1].flatMap(p=>creatures(s,p).filter(y=>!y.sealed&&battleNames676(y).some(n=>names.has(n))).map(y=>[p,y]));
  for(const [p,y] of rows)api.tap(s,p,y);
 }

 function revengeCard795(s,t){
  const cards=t.origin==='deck'?[api.peekTop(s,t.p)].filter(Boolean):s.players[t.p].hand;
  return cards.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial&&card(y).g795Revenge&&!api.handAbilityIgnored(s,y));
 }
 function revengeDraws910(s,p,filter){return (s.players[1-p].drawsThisTurn||0)>=filter.opponentDraws;}
 function revengeReady795(s,p,x,origin='hand'){
  const c=card(x),filter=c.g795Revenge;
  const condition=filter.opponentDraws===undefined?
   creatures(s,1-p).some(y=>!y.sealed&&matches(s,1-p,y,filter)):revengeDraws910(s,p,filter);
  return condition&&api.canCast(s,p,c,origin)&&api.canEnter(s,p,c,{origin,execution:true});
 }
 const revengeDeclare795=(p,y,origin)=>task('g34_RevengeDeclare795',p,y.cardId,{uid:y.uid,serial:y.zoneSerial||0,...(origin?{origin}:{})});
 function chanceMatches419(s,p,x,w){const name=creatureFaceName(effective(x,s));return(!w.name||name.includes(w.name))&&(!w.g201ExactName||exactName(name)===exactName(w.g201ExactName))&&matches(s,p,x,{...w,g199Power:true});}
 function graveCreatureName614(s,p,c){
  const name=exactName(creatureFaceName(c));
  return s.players[p].grave.some(x=>!x.faceDown&&faces(api.zoneCard(s,p,x,'grave')).some(f=>f.type==='creature'&&exactName(creatureFaceName(f))===name));
 }
 // Smash Burst follows the same physical card through its first zone change (QA48746).
 function smashSource320(s,t){for(const origin of['battle','hand','grave','mana','deck','extra']){const xs=origin==='battle'?s.players[t.p].battle.flatMap(api.allLayers):s.players[t.p][origin],x=xs.find(x=>x.uid===t.uid);if(x&&(origin==='battle'?(x.incarnation||0)===(t.incarnation||0):(x.zoneSerial||0)===(t.serial||0)+1))return{origin,x};}return null;}
 const send=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g34_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const tasks=(p,source,defs,more={})=>(defs||[]).map(d=>task(/^(?:g35_|g393[CDJP]_)/.test(d.op)?d.op:'g34_'+d.op,p,source,{...more,...d,op:/^(?:g35_|g393[CDJP]_)/.test(d.op)?d.op:'g34_'+d.op,p:d.p??p,source}));
 const start=(s,t,defs)=>put(s,...tasks(t.p,t.source,defs,{uid:t.uid,incarnation:t.incarnation||0,controller:t.controller??t.p,moved:t.moved||0,...(t.lastKnownCount!==undefined?{lastKnownCount:t.lastKnownCount}:{}),...(t.g692LastPower!==undefined?{g692LastPower:t.g692LastPower}:{}),...(t.g694Defender?{g694Defender:t.g694Defender}:{}),...(t.g399Attacker?{g399Attacker:t.g399Attacker}:{})}));
 // Delayed effects retain the attacking creature, independently of the watcher.
 const attackHost408=(s,t)=>t.g399Attacker&&s.players[t.p].battle.find(y=>api.allLayers(y).some(z=>z.uid===t.g399Attacker.uid&&(z.incarnation||0)===t.g399Attacker.incarnation));
 function tapSource748(s,t){
  const host=sourceHost474(s,t);
  return host?.p===t.p&&!host.x.tapped&&!host.x.sealed&&api.isCreature(s,host.x)?host.x:null;
 }
 // Hand-evolution GV is an evolution card even before its bases are attached; NEO requires a base.
 const livePower199=(s,x,inCombat)=>api.power(x,!!inCombat&&(x.uid===s.attack?.attacker||x.uid===s.attackLifecycle?.uid&&(x.incarnation||0)===(s.attackLifecycle.incarnation||0)),s);
 const evolutionOrLinkedGod=(x,c)=>api.isEvolution(x)||!!(x.godLinks?.length&&race(c,'ゴッド'));
 function matches(s,p,x,f={}){const c=api.zoneCard(s,p,x),d=s.players[p].battle.includes(x)?effective(x,s):c;if(f.g853Soul&&!hasSoul(c,f.g853Soul))return false;if(f.g508EvolutionOrLink&&!evolutionOrLinkedGod(x,c))return false;const faceMax=f.g228Face?.g815ManaCivilCost?manaCivilizationCount(s,p):f.g228Face?.max;return (!f.g784ShieldTrigger||d.trigger||d.triggerPlus||d.superTrigger)&&(!f.g746Bad||!!d.bad)&&(!f.g724ExactRace||exactRaces(d).includes(f.g724ExactRace))&&(!f.g819CreatureNameIncludes||battleNames676(x).some(name=>name.includes(f.g819CreatureNameIncludes)))&&(!f.g819AnyFaceRace||faces(c).some(face=>exactRaces(face).includes(f.g819AnyFaceRace)))&&(!f.g670Guardman||d.guardman)&&(!f.g661ShieldGo||d.shieldGo)&&(!f.g614GraveCreatureName||graveCreatureName614(s,p,d))&&(!f.g600OverMana||cost(d)>s.players[p].mana.length)&&(!f.g596EnteredThisTurn||(x.originalEntryTurn??x.entered)===s.turn)&&(!f.g587PowerEnding500||currentPower506(s,x)%1000===500)&&(!f.faceUp||!x.faceDown)&&(!f.g556Neo||!!c.neoEvolution)&&(!f.g539JokerCard||faces(c).some(c=>race(c,'ジョーカーズ')))&&(!f.g415Mugen||faces(c).some(c=>c.mugenCrime>0))&&(!f.g412ExceptName||faces(c).every(face=>String(face.name||'').normalize('NFKC').replace(/\s/g,'')!==f.g412ExceptName.normalize('NFKC').replace(/\s/g,'')))&&(!f.g295Tamaseed||c.type==='seed'||!!c.seedCreature||!!c.natureAce4)&&(!f.g228Face||faces(c).some(face=>face.type===f.g228Face.type&&(!f.g228Face.shieldTrigger||face.trigger||face.triggerPlus||face.superTrigger)&&(!f.g228Face.multicolor||colors(face).length>1)&&(!f.g228Face.color||colors(face).includes(f.g228Face.color))&&(!f.g228Face.exceptColor||!colors(face).includes(f.g228Face.exceptColor))&&(!f.g228Face.colorsAll||f.g228Face.colorsAll.every(color=>colors(face).includes(color)))&&(!f.g228Face.raceAll||f.g228Face.raceAll.every(q=>race(face,q)))&&(!f.g228Face.d2||face.d2Field===true)&&(!f.g228Face.nameAny||f.g228Face.nameAny.some(name=>face.name.includes(name)))&&(f.g228Face.min===undefined||cost(face)>=f.g228Face.min)&&(faceMax===undefined||cost(face)<=faceMax)&&(f.g228Face.minPower===undefined||face.power==='∞'||Number(face.power)>=f.g228Face.minPower)&&(f.g228Face.maxPower===undefined||Number(face.power)<=f.g228Face.maxPower)))&&(!f.g584MonoCard||new Set(faces(c).flatMap(colors)).size<=1)&&(!f.g223Multicolor||new Set(faces(c).flatMap(colors)).size>1)&&(!f.g220NameAny||f.g220NameAny.some(q=>faces(c).some(c=>c.name.includes(q))))&&(!f.g218Colored||colors(d).length>0)&&(!f.g217Colorless||faces(c).some(c=>colors(c).length===0))&&(!f.g217SpellColor||faces(c).some(c=>c.type==='spell'&&colors(c).includes(f.g217SpellColor)))&&(!f.g201Gear||c.type==='gear')&&(!f.g201ExactName||faces(c).some(y=>String(y.name||'').normalize('NFKC').replace(/\s/g,'')===f.g201ExactName.normalize('NFKC').replace(/\s/g,'')))&&(!f.g200Colorless||faces(c).every(c=>colors(c).length===0))&&(!f.anyFaceColor||faces(c).some(c=>colors(c).includes(f.anyFaceColor)))&&(f.anyFaceMinCost===undefined||faces(c).some(c=>cost(c)>=f.anyFaceMinCost))&&(!f.colorsAll||f.colorsAll.every(q=>colors(d).includes(q)))&&(!f.any||f.any.some(q=>matches(s,p,x,q)))&&(!f.seed||c.type==='seed')&&(!f.creature||d.type==='creature')&&(!f.nonCreature||faces(c).every(face=>face.type!=='creature'))&&(!f.nonCreatureElement||!api.isCreature(s,x))&&(!f.element||['creature','seed','gear','field'].includes(c.type))&&(!f.nonEvolution||!api.isEvolution(x)&&!c.g48HandEvolution)&&(!f.evolution||api.isEvolution(x))&&(!f.blocker||d.blocker)&&(!f.noColor||colors(d).length===0)&&(!f.creatureOrSeed||['creature','seed'].includes(c.type))&&(f.belowCost===undefined||cost(d)<(f.belowCost==='∞'?Infinity:f.belowCost))&&(!f.notRace||!race(d,f.notRace))&&(!f.race||race(d,f.race))&&(!f.raceAny||f.raceAny.some(q=>race(d,q)))&&(!f.name||c.name.includes(f.name))&&(!f.exactId||c.id===f.exactId)&&(!f.exactUid||x.uid===f.exactUid)&&(f.exactCost===undefined||cost(c)===(f.exactCost==='∞'?Infinity:f.exactCost))&&(f.belowPower===undefined||livePower199(s,x,f.g199Power)<(f.belowPower==='∞'?Infinity:f.belowPower))&&(!f.color||colors(d).includes(f.color))&&(!f.notColor||!colors(d).includes(f.notColor))&&(!f.multi||colors(d).length>1)&&(!f.g510NonMulticolor||colors(d).length<=1)&&(!f.anyFaceRace||faces(c).some(c=>race(c,f.anyFaceRace)))&&(!f.spell||faces(c).some(c=>c.type==='spell'))&&(!f.aura||c.type==='aura')&&(!f.twin||!!c.spellFace)&&(f.min===undefined||cost(d)>=f.min)&&(f.max===undefined||cost(d)<=f.max)&&(f.minPower===undefined||livePower199(s,x,f.g199Power)>=f.minPower)&&(f.maxPower===undefined||livePower199(s,x,f.g199Power)<=f.maxPower)&&(!f.untapped||!x.tapped)&&(!f.tapped||x.tapped);}
 function panyaCanReturn(s,x){
  const linked=x.godLinks||[];
  const evolution=[x,...linked].some(api.isEvolution);
  return !evolution||!linked.length&&race(effective(x,s),'ゴッド');
 }
 // Effect battles use the normal battle pipeline; choices retain physical incarnation.
 const fightRows240=(s,p,owner,filter)=>targetOptions(s,p,creatures(s,owner).filter(x=>!x.sealed&&(!filter||matches(s,owner,x,filter))));
 const fightUnit240=(s,p,r,followEvolution=false)=>r&&creatures(s,p).find(x=>!x.sealed&&
  (followEvolution?api.allLayers(x):[x]).some(y=>y.uid===r.uid&&(y.incarnation||0)===r.incarnation));
 function cardMoveRows579(s,t){
  const rows=new Map();
  const zones=t.zones||['battle'];
  for(const p of t.anyOwner?[t.p,1-t.p]:[t.owner??1-t.p]){
   const own=s.players[p],side=t.anyOwner?(p===t.p?'自分の':'相手の'):'';
   for(const origin of zones.filter(z=>z!=='battle'&&(z!=='hand'||p===t.p)&&api.canMoveZone(s,p,z))){
    const prefix=side+(origin==='mana'?'マナ':'手札')+'：';
    for(const [i,x] of own[origin].entries()){
     const label=prefix+(x.faceDown?'裏向きのカード '+(i+1):card(x).name);
     rows.set(x.uid,{x,label,p,origin});
    }
   }
   if(!zones.includes('battle'))continue;
   for(const top of api.visibleBattleCards(s,p)){
    if(t.g917EvolutionTop&&(!api.isEvolution(top)||!api.isCreature(s,top)))continue;
    const linked=!!top.godLinks?.length;
    const definition=t.min!==undefined||t.max!==undefined?effective(top,s):null;
    for(const [index,x] of api.layers(top).entries()){
     if((t.g917EvolutionTop&&x!==top)||(t.other&&x.uid===t.uid)||x.uid===t.excludeUid)continue;
     if(t.g813NonEvolution&&!x.faceDown&&api.isEvolution(x))continue;
     const sealIndex=own.seals?.indexOf(x)??-1;
     const below=index>0&&!top.godLinks?.includes(x);
     if(linked&&!below&&!api.targetable(s,t.p,p,top))continue;
     if(t.nonCreature&&!x.faceDown&&(below?faces(card(x)).some(c=>c.type==='creature'):api.isCreature(s,top)))continue;
     if(definition){
      const costs=x.faceDown?[0]:below?faces(card(x)).map(cost):[cost(linked?card(x):definition)];
      if(!costs.some(n=>n>=(t.min??0)&&n<=(t.max??Infinity)))continue;
     }
     const name=x.faceDown?'裏向きのカード '+index:card(x).name;
     const label=sealIndex>=0?'封印 '+(sealIndex+1):below?card(top).name+'の下：'+name:name;
     rows.set(x.uid,{x,label:zones.length>1?side+'場：'+label:label,p,origin:'battle'});
    }
   }
  }
  return rows;
 }
 function cardMoveOptions579(s,t){
  const rows=cardMoveRows579(s,t);
  return targetOptions(s,t.p,[...rows.values()].map(r=>r.x)).map(o=>{
   const {x,label,p}=rows.get(o.value),score=x.faceDown?8:o.score;
   return opt(label,x.uid,p===t.p?-score:score,x.faceDown?null:o.cardId);
  });
 }
 function moveSelectedCard581(s,t,row,to){
  const {p,x,origin}=row;
  if(origin==='battle')api.moveBattleCard(s,p,x.uid,to,{destroy:to==='grave',controller:t.controller??t.p});
  else if(origin==='hand'&&to==='grave')api.discardSelected(s,p,[x.uid],t.source,t.controller??t.p);
  else zoneMove(s,p,origin,x.uid,to,{...t,g183Return:to==='deckTop'});
 }
 function ownCard581(s,t,p){
  put(s,{...t,op:'g34_BattleCardMove579',p,owner:p});
 }
 function finishManaPair581(s,t,uid=null){
  if(t.owner===undefined){put(s,{...t,owner:1-t.p,ownUid:uid});return;}
  for(const [p,id] of [[t.p,t.ownUid],[1-t.p,uid]])if(id)zoneMove(s,p,'mana',id,'deckTop',{...t,g183Return:true});
 }
 function elementOrManaOptions796(s,t,max=t.max){
  const rows=new Map(s.players.flatMap((own,p)=>own.battle.filter(x=>!x.sealed&&cost(effective(x,s))<=max).map(x=>[x.uid,{p,x}])));
  const elements=targetOptions(s,t.p,[...rows.values()].map(({x})=>x)).map(o=>{
   const {p,x}=rows.get(o.value);
   return opt((p===t.p?'自分':'相手')+'の場：'+o.label,{p,uid:x.uid,origin:'battle',serial:x.incarnation||0},
    p===t.p?-o.score:Math.max(1,o.score-4),o.cardId);
  });
  const mana=s.players.flatMap((own,p)=>own.mana.map((x,i)=>{
   const label=(p===t.p?'自分':'相手')+'のマナ：'+(x.faceDown?'裏向きのカード '+(i+1):card(x).name);
   return opt(label,{p,uid:x.uid,origin:'mana',serial:x.zoneSerial||0},p===t.p?-5:api.canMoveZone(s,p,'mana')?1:-12,x.faceDown?null:x.cardId);
  }));
  return [...elements,...mana];
 }
 function manaRows582(s,p,t){
  if(!api.canMoveZone(s,p,'mana'))return[];
  return s.players[p].mana.filter(x=>!t.exceptColor||x.faceDown||!api.manaColors(api.zoneCard(s,p,x,'mana'),s,p).includes(t.exceptColor));
 }
 function manaPlayer582(s,t,p){
  put(s,{...t,op:'g34_ManaPick582',p,chosen:[]});
 }
 function finishMana582(s,t,rows){
  const ids=t.keep?rows.filter(x=>!t.chosen.includes(x.uid)).map(x=>x.uid):t.chosen;
  const moves=[...(t.moves||[]),...ids.map((uid,i)=>({p:t.p,uid,to:t.destinations?.[i]??t.to}))];
  if(t.next!==undefined){manaPlayer582(s,{...t,moves,next:undefined},t.next);return;}
  for(const {p,uid,to} of moves)zoneMove(s,p,'mana',uid,to,{g183Return:to==='deckTop'});
  if(moves.length)api.log(s,t.controller??t.p,'manaMove',card(t.source).name+'：マナゾーンから'+moves.length+'枚を移動',{cardId:t.source});
 }
 function stay577(s,p,x,battlePower){
  const rule=effective(x,s).g577Stay;
  if(!rule||rule.opponentTurn&&s.active===p)return false;
  const attacking=x.uid===s.attack?.attacker||x.uid===s.attackLifecycle?.uid&&(x.incarnation||0)===(s.attackLifecycle.incarnation||0);
  if((battlePower??api.power(x,attacking,s))<=0)return false;
  return !rule.lightMana||s.players[p].mana.filter(y=>!y.faceDown&&api.manaColors(api.zoneCard(s,p,y,'mana'),s,p).includes('光')).length>=rule.lightMana;
 }
 function fightScore240(s,a,b){const ap=api.battlePower(s,a,b,a.uid===s.attack?.attacker),bp=api.battlePower(s,b,a,b.uid===s.attack?.attacker),lose=(!hooks.battleSafe(s,a,b,bp)&&bp>=ap)||api.slayerCount(s,b,a)>0&&!hooks.destroySafe409(s,a),win=(!hooks.battleSafe(s,b,a,ap)&&ap>=bp)||api.slayerCount(s,a,b)>0&&!hooks.destroySafe409(s,b);return(win?10+4*cost(card(b)):0)-(lose?10+4*cost(card(a)):0);}
 function fightPairRows586(s,t,owners){
  const cards=owners.flatMap(p=>creatures(s,p).filter(x=>!x.sealed&&x.uid!==t.first?.uid).map(x=>({p,x})));
  return targetOptions(s,t.p,cards.map(r=>r.x)).map(o=>{
   const {p,x}=cards.find(r=>r.x.uid===o.value);
   return {...o,value:{player:p,uid:x.uid,incarnation:x.incarnation||0,origin:'battle'}};
  });
 }
 function fightPairScore586(s,t,a,b,ownerA,ownerB){
  if(ownerA!==ownerB)return ownerA===t.p?fightScore240(s,a,b):fightScore240(s,b,a);
  const ap=api.battlePower(s,a,b,false),bp=api.battlePower(s,b,a,false);
  const lossA=bp>=ap||api.slayerCount(s,b,a)>0,lossB=ap>=bp||api.slayerCount(s,a,b)>0;
  const damage=(lossA?10+cost(card(a))*4:0)+(lossB?10+cost(card(b))*4:0);
  return ownerA===t.p?-damage:damage;
 }
 function finishFightPair586(s,t,second=null){
  const a=fightUnit240(s,t.first.player,t.first),b=second&&fightUnit240(s,second.player,second);
  if(t.tap){if(a)api.tap(s,t.first.player,a);if(b)api.tap(s,second.player,b);}
  if(a&&b)api.battle(s,t.first.player,a,second.player,b);
 }
 function powerMinusScore242(s,t,y){const attacking=y.uid===s.attack?.attacker||y.uid===s.attackLifecycle?.uid&&(y.incarnation||0)===(s.attackLifecycle.incarnation||0),before=api.power(y,attacking,s),after=api.power({...y,powerModifiers:[...(y.powerModifiers||[]),{amount:t.power,spellSource:t.spell?t.source:undefined,spellCost:t.spell?cost(faces(card(t.source)).at(-1)):undefined}]},attacking,s);if(after>=before)return -5;return after<=0&&!effective(y,s).g34AlwaysWinAtZero?40+cost(card(y))*4+before/1000:5+Math.min(-t.power,before)/1000+cost(card(y));}
 function discardColors248(x){return new Set(faces(card(x)).flatMap(colors)).size;}
 function selfUntapValue542(s,t){const host=sourceHost474(s,t);if(!host||host.p!==t.p||s.active!==t.p||!api.isCreature(s,host.x)||!host.x.tapped||!api.canUntap(host.x)||effective(host.x,s).noAttack)return -100;const c=effective(host.x,s);return 24+Math.min(12,api.power(host.x,true,s)/3000)+Math.max(0,(Number(c.breaker)||1)-1)*5;}
 function discardCosts655(s,p,x,creatureOnly){
  const options=faces(api.zoneCard(s,p,x,'hand')).filter(c=>!creatureOnly||c.type==='creature');
  return [...new Set(options.map(c=>cost(c)===Infinity?'∞':cost(c)))];
 }
 const destroyBelowCost655=(belowCost,creatureOnly)=>({op:'Target',element:!creatureOnly,to:'grave',filter:{belowCost}});
 function discardDefs248(s,t,y){
  return t.defs.map(d=>d.op==='DrawColors248'?{op:'Draw',n:discardColors248(y)}:
   d.op==='DiscardCost655'?{...d,costs:discardCosts655(s,t.p,y,d.g835Creature)}:d);
 }
 function discardScore248(s,t,y){const own=s.players[t.p],enemy=creatures(s,1-t.p).filter(x=>!x.sealed),d=t.defs[0];
  if(d.op==='Clock842')return own.deck.length>1&&!api.deckLocked(s,t.p)?5-Math.min(cost(card(y)),8):-100;
  if(d.op==='ShieldTop')return api.canAddShield(s,t.p)&&own.deck.length>1?12-cost(card(y)):-100;
  if(d.op==='SelfGrant754'&&d.grant.speedAttacker){
   const host=sourceHost474(s,t)?.x;
   const c=host&&effective(host,s);
   return host&&s.active===t.p&&host.entered===s.turn&&!host.tapped&&!c.speedAttacker&&!c.noAttack?12-cost(card(y)):-100;
  }
  if(d.op==='DiscardCost655'){const costs=discardCosts655(s,t.p,y,d.g835Creature),rows=targetOptions(s,t.p,s.players[1-t.p].battle.filter(x=>costs.some(max=>matches(s,1-t.p,x,{belowCost:max,creature:d.g835Creature}))));return rows.length?22+Math.max(...rows.map(x=>x.score))-cost(card(y)):-100;}if(d.op==='Draw')return modeScore(s,t,[d])-cost(card(y));if(d.op==='Untap'&&d.g191First)return selfUntapValue542(s,t)-cost(card(y));if(d.op==='SelfBoost313'){const x=own.battle.find(x=>x.uid===t.uid);if(!x)return -100;const c=effective(x,s),victim=enemy.find(z=>z.uid===s.attack?.target),before=api.power(x,true,s),battle=victim&&before<api.power(victim,false,s)&&before+d.power>=api.power(victim,false,s)?18:0,breaks=s.attack?.target==='player'&&s.players[1-t.p].shields.length>1&&Number(c.breaker||1)<(d.breaker||1)?12:0;return battle+breaks-cost(card(y));}if(d.op==='DrawColors248'){const n=discardColors248(y);if(n>=own.deck.length&&n)return creatures(s,t.p).some(x=>effective(x,s).shako)?1000:-1000;return(n?12+n*5:-10)-cost(card(y));}if(d.op==='Select'&&d.origin==='grave'&&d.to==='hand'){const rows=[...own.grave,y].filter(x=>matches(s,t.p,x,d.filter));return rows.length?Math.max(...rows.map(x=>cost(card(x))-cost(card(y))+(x.uid===y.uid?-10:4))):-100;}if(d.op==='Look'&&d.g201Search){if(api.deckLocked(s,t.p)||own.deck.length<=1)return -100;const f=d.stages[0].filter;return(own.deck.some(x=>matches(s,t.p,x,f))?14:-10)-cost(card(y));}if(d.op==='Discard')return(s.players[1-t.p].hand.length?12:-10)-cost(card(y));if(d.op==='OpponentSelect')return(enemy.length?10+Math.min(...enemy.map(x=>cost(card(x))*4+api.power(x,false,s)/2000)):-10)-cost(card(y));if(d.op==='Target'){const rows=targetOptions(s,t.p,enemy.filter(x=>matches(s,1-t.p,x,d.filter)));return(rows.length?Math.max(...rows.map(r=>{const x=enemy.find(x=>x.uid===r.value);return d.power?powerMinusScore242(s,{...t,...d},x):10+cost(card(x))*4;})):-10)-cost(card(y));}return -100;}
 // A tamaseed/creature is one element, even while it has both card types.
 const manaCondition267=(s,p,f)=>s.players[p].mana.filter(y=>{const cs=api.manaColors(y.faceDown?{civilizations:[],civ:'ゼロ'}:card(y),s,p);return f.multi?cs.length>1:cs.includes(f.color);}).length>=f.n;
 function manaCivilizationCount(s,p){
  const colors=s.players[p].mana.flatMap(y=>api.manaColors(y.faceDown?{civilizations:[],civ:'ゼロ'}:card(y),s,p,true));
  return new Set(colors.filter(q=>['光','水','闇','火','自然'].includes(q))).size;
 }
 const neoState563=(s,p,x)=>!!x&&!x.sealed&&api.isCreature(s,x)&&!!api.zoneCard(s,p,x,'battle').neoEvolution&&api.isEvolution(x);
 const sourceNeo563=(s,t)=>{const host=sourceHost474(s,t);return host?neoState563(s,host.p,host.x):!!s.g563LastNeo?.[t.uid+'@'+(t.incarnation||0)];};
 function protects608(s,p,x){
  if(!api.isCreature(s,x))return false;
  return creatures(s,p).some(y=>{
   const filter=!y.sealed&&effective(y,s).g608Protect;
   return filter&&(!filter.g334Other||y.uid!==x.uid)&&matches(s,p,x,filter);
  });
 }
 const ownCondition=(s,p,f,sourceUid=null,sourceIncarnation=null,lastKnownCount=0)=>{
  if(f.g876SummonNumber!==undefined){
   const history=s.g463Summons?.[p];
   return (history?.turn===s.turn?history.n:0)+1===f.g876SummonNumber;
  }
  if(f.g881HighestPower){
   const powers=s.players.map((_,who)=>creatures(s,who).filter(x=>!x.sealed).map(x=>api.power(x,false,s)));
   const highest=Math.max(...powers.flat());
   return powers[p].filter(n=>n===highest).length===1&&!powers[1-p].includes(highest);
  }
  if(f.g837NoManaAdded)return s.g837ManaAddedTurn?.[p]!==s.turn;
  if(f.g834AnyEmptyHand)return s.players.some(player=>player.hand.length===0);
  if(f.g811ManaLeft)return s.g47ManaLeft?.[p]===s.turn;
  if(f.g792AbsentAlly)return !s.players[p].battle.some(x=>!x.sealed&&!x.faceDown&&api.isCreature(s,x)&&effective(x,s).name===f.g792AbsentAlly);
  if(f.g791ExtraSpell)return (s.players[p].extra||[]).some(x=>!x.faceDown&&faces(card(x)).some(c=>c.type==='spell'));
  if(f.g790MinDraws!==undefined)return (s.players[p].drawsThisTurn||0)>=f.g790MinDraws;
  if(f.g857LightSoulEntered)return s.g857LightSoulEnteredTurn?.[p]===s.turn;
  if(f.g722CrossedAny)return [p,1-p].some(owner=>ownCondition(s,owner,{g442CrossedAlly:true}));
  if(f.g666FaceUpShieldGo)return api.shieldGoCount(s,p)>0;
  if(f.g757FaceUpShield)return s.players[p].shields.some(group=>api.shieldCards(group).some(x=>x.faceUp));
  if(f.g650SourceCards){
   const host=sourceHost474(s,{uid:sourceUid,incarnation:sourceIncarnation});
   const count=host?(!host.x.sealed&&api.isCreature(s,host.x)?api.allLayers(host.x).length:0):lastKnownCount;
   return count>=f.g650SourceCards;
  }
  if(f.g688DistinctCreaturePair){
   const [first,second]=f.g688DistinctCreaturePair;
   const allies=creatures(s,p).filter(x=>!x.sealed);
   const candidates=allies.filter(x=>colors(effective(x,s)).includes(first));
   return allies.some(x=>colors(effective(x,s)).includes(second)&&candidates.some(y=>y.uid!==x.uid));
  }
  if(f.g687CreatureCountAtLeastShields){
   const shields=s.players[p].shields;
   return creatures(s,p).filter(x=>!x.sealed).length>=(typeof shields==='number'?shields:shields.length);
  }
  if(f.all)return f.all.every(filter=>ownCondition(s,p,filter,sourceUid,sourceIncarnation,lastKnownCount));if(f.g805NoOpponentMulti)return !s.players[1-p].battle.some(x=>!x.sealed&&!x.faceDown&&colors(effective(x,s,true)).length>1);if(f.g603AttackThisTurn)return !!s.attack||s.g481Attackers?.turn===s.turn&&s.g481Attackers.events.length>0||!!s.g23Attacks?.some(a=>a?.turn===s.turn);if(f.g590AnyEmptyShields)return s.players.some(x=>(x.shields?.length??x.shields)===0);if(f.g590SourceTapped)return s.players[p].battle.some(x=>x.tapped&&api.allLayers(x).some(y=>y.uid===sourceUid&&(sourceIncarnation===null||(y.incarnation||0)===sourceIncarnation)));if(f.g580LaterAttack)return s.g23Attacks?.[p]?.turn===s.turn&&s.g23Attacks[p].count>1;if(f.g580D2Field)return s.players[p].battle.some(x=>!x.sealed&&!x.faceDown&&card(x).d2Field);if(f.g568ManaColors)return f.g568ManaColors.every(color=>s.players[p].mana.some(y=>api.manaColors(y.faceDown?{civilizations:[],civ:'ゼロ'}:card(y),s,p).includes(color)));if(f.g567NoTappedMana)return s.players[p].mana.every(y=>!y.tapped);if(f.g565NoAttacks)return s.g481Attackers?.turn!==s.turn||!s.g481Attackers.events.length;if(f.g565FaceUpShields)return Array.isArray(s.players[p].shields)&&s.players[p].shields.flatMap(api.shieldCards).some(x=>x.faceUp);if(f.g563Neo)return neoState563(s,p,s.players[p].battle.find(x=>x.uid===sourceUid&&(sourceIncarnation===null||(x.incarnation||0)===sourceIncarnation)));if(f.g541CreaturesAtLeastShields){const shields=s.players[p].shields;return creatures(s,p).filter(x=>!x.sealed).length>=(typeof shields==='number'?shields:shields.length);}if(f.g539Jokers!==undefined)return jokerCount539(s,p)>=f.g539Jokers;if(f.g508EvolutionOrLink)return creatures(s,p).some(x=>!x.sealed&&evolutionOrLinkedGod(x,api.zoneCard(s,p,x)));if(f.g501TotalCreaturesMax!==undefined)return[0,1].reduce((n,who)=>n+creatures(s,who).filter(x=>!x.sealed).length,0)<=f.g501TotalCreaturesMax;if(f.g479OnlyCreature){const rows=creatures(s,p).filter(x=>!x.sealed);return rows.length===1&&api.layers(rows[0]).some(x=>x.uid===sourceUid);}if(f.g466DistinctCosts)return new Set(s.players[p].battle.filter(x=>!x.sealed&&!x.faceDown).map(x=>api.zoneCard(s,p,x,'battle')).filter(c=>['creature','seed','gear','field','aura'].includes(c.type)).map(cost)).size>=f.g466DistinctCosts;if(f.g465OwnTurn&&s.active!==p)return false;if(f.g465OpponentShieldsMax!==undefined){const shields=s.players[1-p].shields;return(typeof shields==='number'?shields:shields.length)<=f.g465OpponentShieldsMax;}if(f.g458Defending)return !!s.attack&&(s.attack.blockUid||s.attack.target)===sourceUid;if(f.g448Spells)return(s.g37Spells?.[p]?.turn===s.turn?s.g37Spells[p].n:0)>=f.g448Spells;if(f.g448NoncreatureUses)return(s.g448NoncreatureUses?.[p]?.turn===s.turn?s.g448NoncreatureUses[p].n:0)>=f.g448NoncreatureUses;if(f.g448Draws)return(s.players[p].drawsThisTurn||0)>=f.g448Draws;if(f.g448NoName){const norm=v=>String(v||'').normalize('NFKC').replace(/\s/g,'');return !s.players[p].battle.some(x=>!x.sealed&&api.isCreature(s,x)&&norm(effective(x,s).name)===norm(f.g448NoName));}if(f.g448OpponentOverMana)return s.players[1-p].battle.some(x=>!x.sealed&&api.isCreature(s,x)&&cost(effective(x,s))>s.players[1-p].mana.length);if(f.g442CrossedAlly)return s.players.some(own=>own.battle.some(g=>!g.sealed&&card(g).type==='gear'&&g.crossedTo&&s.players[p].battle.some(y=>!y.sealed&&api.isCreature(s,y)&&y.uid===g.crossedTo.uid&&(y.incarnation||0)===g.crossedTo.incarnation)));if(f.g436Crossed){const source=s.players[p].battle.find(x=>x.uid===sourceUid);return !!source&&s.players.some(own=>own.battle.some(g=>!g.sealed&&card(g).type==='gear'&&g.crossedTo?.uid===sourceUid&&g.crossedTo.incarnation===(source.incarnation||0)));}if(f.g413MoreCreatures){const who=f.g413MoreCreatures==='opponent'?1-p:p;return creatures(s,who).filter(y=>!y.sealed).length>creatures(s,1-who).filter(y=>!y.sealed).length;}if(f.g411ManaRace){const r=f.g411ManaRace;return s.players[p].mana.filter(y=>!y.faceDown&&api.manaColors(card(y),s,p).includes(r.color)&&faces(api.zoneCard(s,p,y,'mana')).some(c=>c.type==='creature'&&race(c,r.race))).length>=r.n;}if(f.g400Wave)return [0,1].reduce((n,who)=>n+s.players[who].battle.filter(y=>!y.sealed&&api.isCreature(s,y)&&!api.ignored(s,y)&&api.zoneCard(s,who,y).g400Wave).length,0)>=f.g400Wave;if(f.g370BattleCount){const c=f.g370BattleCount,n=creatures(s,p).filter(x=>!x.sealed&&matches(s,p,x,c.filter)).length;return(c.min===undefined||n>=c.min)&&(c.max===undefined||n<=c.max);}if(f.g334ZoneCount){const c=f.g334ZoneCount,size=who=>{const rows=s.players[who][c.zone];return typeof rows==='number'?rows:(rows||[]).length;},n=c.sumBoth?size(p)+size(1-p):size(c.opponent?1-p:p);return c.atLeastOpponent?n>=size(1-p):c.moreThanOpponent?n>size(1-p):c.lessThanOpponent?n<size(1-p):(c.min===undefined||n>=c.min)&&(c.max===undefined||n<=c.max);}if(f.g286FaceDownMana!==undefined)return s.players[p].mana.filter(y=>y.faceDown).length>=f.g286FaceDownMana;if(f.g285AllManaTapped)return s.players[p].mana.every(y=>y.tapped);if(f.g282AllMana)return s.players[p].mana.every(y=>{const cs=api.manaColors(y.faceDown?{civilizations:[],civ:'ゼロ'}:card(y),s,p).filter(c=>['光','水','闇','火','自然'].includes(c));return cs.includes(f.g282AllMana.color)||!!f.g282AllMana.colorless&&cs.length===0;});if(f.g273Grave)return s.players[p].grave.filter(y=>matches(s,p,y,f.g273Grave.filter)).length>=f.g273Grave.n;if(f.g272ManaCount!==undefined)return s.players[p].mana.length>=f.g272ManaCount;if(f.g267Mana)return manaCondition267(s,p,f.g267Mana);if(f.g265ShieldsMax!==undefined){const shields=s.players[p].shields;return(typeof shields==='number'?shields:shields.length)<=f.g265ShieldsMax;}const rows=(f.g334Both?[p,1-p]:[p]).flatMap(who=>s.players[who].battle.filter(x=>!x.sealed&&(!f.g334Other||x.uid!==sourceUid||sourceIncarnation!==null&&(x.incarnation||0)!==sourceIncarnation)&&matches(s,who,x,f.seed&&(card(x).seedCreature||card(x).natureAce4)?{...f,seed:false}:f)));return f.g258Civil?rows.length>=f.g258Civil:rows.length>0;};
 const canPut=(s,p,x,origin,execution=false)=>(['creature','seed','field','gear'].includes(card(x).type)||card(x).gCastle)&&(!execution||api.canCast(s,p,card(x),origin))&&api.canEnter(s,p,card(x),{origin,execution})&&(!card(x).evolution||api.evolutionBases(s,p,card(x),card(x).g31Evolution?.minCards?{origin,execution,exclude:x.uid}:undefined).some(y=>y.uid!==x.uid));
 const countBattleCivilizations=(s,rows)=>new Set(rows.filter(y=>!y.sealed&&!y.faceDown)
  .flatMap(y=>colors(effective(y,s,true))).filter(q=>['光','水','闇','火','自然'].includes(q))).size;
 const countDraw=(s,p,t)=>{const owner=t.owner==='opponent'?1-p:p;
  if(t.g777DistinctCreatureCosts)return new Set(creatures(s,owner).filter(x=>!x.sealed&&!x.faceDown).map(x=>cost(api.zoneCard(s,owner,x,'battle')))).size;
  if(t.g641Civilizations)return countBattleCivilizations(s,s.players[owner].battle);
  const owners=t.owner==='both'&&t.zone==='battle'?[0,1]:[owner];
  return owners.reduce((total,who)=>{
   const rows=t.zone==='battle'?(t.g262Elements?s.players[who].battle:creatures(s,who)).filter(y=>!y.sealed):s.players[who][t.zone]||[];
   return total+rows.filter(y=>(!t.g329Other||y.uid!==t.uid||(y.incarnation||0)!==(t.incarnation||0))&&matches(s,who,y,t.filter)).length;
  },0);
 };
 // Attack watchers include tamaseeds; losing an ability or a seal disables the source.
 const watchSources252=(s,p)=>s.players[p].battle.filter(x=>!x.sealed&&!api.ignored(s,x));
 const attackDraws613=(s,p,x)=>(s.extLimits||[]).filter(l=>l.kind==='g613AttackDraw'&&l.turn===s.turn&&
  (l.refs?x&&api.allLayers(x).some(y=>l.refs.includes(key(y))):l.player===p)&&
  (l.spell===false||!api.spellIgnored(s,{type:'spell',spellSource:l.source,cost:cost(card(l.source))})));
 function attackWatches252(s,p,attacker){
  for(const l of attackDraws613(s,p,attacker)){
   const draw={n:l.n??1,...(l.optional?{optional:true}:{})};
   const effect=l.refs
    ?task('g34_ResolveDelay537',l.player,l.source,{spellCost:cost(card(l.source)),defs:[{op:'Draw',...draw}]})
    :task('g34_Draw',l.player,l.source,draw);
   api.enqueue(s,l.player,{source:l.source,effect:'extended',task:effect});
  }
  if(s.attack?.target==='player')for(const l of s.extLimits||[]){
   if(l.kind!=='g741PlayerAttackResponse'||l.who===p)continue;
   api.enqueue(s,l.who,{source:l.source,effect:'extended',task:task('g34_Sequence',l.who,l.source,{defs:l.defs})});
  }
  // Redzone records this attack immediately after this hook; its existing counter
  // also remembers earlier attacks made before a watcher entered the battlefield.
  const previous=s.g23Attacks?.[p],number=previous?.turn===s.turn?previous.count+1:1,first=number===1;
  const firstPlayer=s.attack?.target==='player'&&(s.g481Attackers?.turn!==s.turn||
   !s.g481Attackers.events.some(e=>e.p===p&&e.playerTarget));
  // Count qualifying declarations even if the watcher has not entered yet (QA49402).
  let firstCostSix=false;
  if(cost(effective(attacker,s))>=6){
   if(s.g481Attackers?.turn!==s.turn)s.g481Attackers={turn:s.turn,events:[]};
   const seen=s.g481Attackers.costSix??=[false,false];
   firstCostSix=!seen[p];
   seen[p]=true;
  }
  for(const owner of[s.active,1-s.active])for(const x of watchSources252(s,owner)){const c=effective(x,s),watches=[...(c.g252AttackWatch?[c.g252AttackWatch]:[]),...(c.g253AttackWatches||[])];
   for(const watch of watches){
    if(watch.g814CreatureTarget&&!s.players[owner].battle.some(y=>y.uid===s.attack?.target&&api.isCreature(s,y)))continue;
    if(watch.g814ShieldBroken&&!s.players[owner].brokenThisTurn)continue;
    if((watch.who==='both'||(watch.who==='self'?owner===p:owner!==p))&&!(x.uid===attacker.uid&&(watch.other||api.selfStopped(s,p)))&&(!watch.first||first)&&(!watch.g768AttackNumber||watch.g768AttackNumber===number)&&(!watch.g764FirstCostSix||firstCostSix)&&(!watch.entryTurn||attacker.entered===s.turn)&&(!watch.playerAttack||s.attack?.target==='player')&&(!watch.g799FirstPlayer||firstPlayer)&&(!watch.defs.some(d=>d.g747Once)||!parottaUsed747(s,x))&&!used792(s,x,watch.defs[0])&&matches(s,p,attacker,watch.filter)){if(watch.g399Attacker)send(s,owner,x,'Sequence',{defs:watch.defs,g399Attacker:{uid:attacker.uid,incarnation:attacker.incarnation||0,...(watch.g677Layers?{refs:api.allLayers(attacker).map(key)}:{}),...(watch.defs.some(d=>d.op==='AttackDeploy409'||d.op==='AttackHandDeploy798')?{cost:cost(effective(attacker,s))===Infinity?'∞':cost(effective(attacker,s))}: {})}});else queue(s,owner,x,watch.defs);}
   }
  }
 }
 function opponentAddedShields618(s,p){
  const owner=1-p,prior=s.players[owner].turns-Number(s.active===owner);
  return (s.g618ShieldTurns?.[owner]||[]).includes(prior);
 }
 function ownShieldGraveOptions(s,p){
  const shields=s.players[p].shields;
  return shields.flatMap((x,i)=>api.shieldCards(x).some(y=>!y.g37ShieldHeld)
   ?[opt('シールド '+(i+1)+(x.faceUp?'：'+card(x).name:''),x.uid,10,x.faceUp?x.cardId:undefined)]
   :[]);
 }
 function manaColorOptions698(s,t){
  const selected=t.selected||[],[color,...rest]=t.colors.slice(selected.length);
  const pool=s.players[t.p].mana.filter(x=>!x.tapped&&!selected.includes(x.uid)).map(x=>({
   card:x,colors:api.manaColors(x.faceDown?{civilizations:[],civ:'ゼロ'}:api.zoneCard(s,t.p,x,'mana'),s,t.p)
  }));
  const eligible=(row,allowed)=>Array.isArray(allowed)?allowed.some(c=>row.colors.includes(c)):row.colors.includes(allowed);
  const canComplete=(rows,colors)=>!colors.length||rows.some(r=>eligible(r,colors[0])&&canComplete(rows.filter(x=>x!==r),colors.slice(1)));
  return pool.filter(r=>eligible(r,color)&&canComplete(pool.filter(x=>x!==r),rest)).map(({card:x})=>opt(
   (x.faceDown?'裏向きのマナ':card(x).name)+(Array.isArray(color)?'を選ぶ':'を'+color+'として選ぶ'),x.uid,6,x.faceDown?undefined:x.cardId
  ));
 }
 function finishShieldMove588(s,t){
  if(!t.selected?.length)return;
  const to=t.to==='mana'?'mana':'grave',zone=to==='mana'?'マナゾーン':'墓地';
  const moved=api.moveShields(s,1-t.p,t.selected,to);
  if(moved.length)api.log(s,t.p,to==='mana'?'shieldMana':'shieldGrave',card(t.source).name+'：相手のシールドからカード'+moved.length+'枚を'+zone+'に置いた',{cardId:t.source});
 }
 function winWatches252(s,p,w){const winner=s.players[p].battle.find(x=>x.uid===w?.uid);if(!winner)return[];return watchSources252(s,p).flatMap(x=>{const watch=effective(x,s).g252WinWatch;return watch&&(!watch.first||w.g587First)&&(!watch.other||x.uid!==winner.uid)&&matches(s,p,winner,watch.filter)?[{player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Sequence',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,defs:watch.defs,...(watch.winner?{g399Attacker:{uid:winner.uid,incarnation:winner.incarnation||0}}:{})})}]:[];});}
 // Use events come from actual summons and spell casts, not arbitrary battlefield entries.
 function useBlockers524(s,caster){for(const x of creatures(s,1-caster))if(!x.sealed&&effective(x,s).g524OpponentUseBlocker)queue(s,1-caster,x,[{op:'UseBlocker524'}]);}
 const useColorsMatch=(watch,c)=>(!watch.color||colors(c).includes(watch.color))&&
  (!watch.colorsAny||watch.colorsAny.some(color=>colors(c).includes(color)))&&(!watch.multicolor||colors(c).length>1);
 const spellWatches=(s,caster,c)=>[s.active,1-s.active].flatMap(owner=>creatures(s,owner).filter(x=>!x.sealed).flatMap(x=>{const watch=effective(x,s).g204SpellWatch;return watch&&(watch.who==='both'||(watch.who==='self'?owner===caster:owner!==caster))&&(!watch.opponentTurn||s.active!==owner)&&useColorsMatch(watch,c)&&(!watch.race||race(c,watch.race))&&(!watch.g766Once||!used(s,'g766SpellUse',x))?[{owner,x,watch}]:[];}));
 // Use the already decorated target stats and suppress breaker calculation on sources to avoid power recursion.
 function auraPower(s,x,c){const owner=s.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid));if(owner<0||x.sealed||c.type!=='creature')return 0;const fits=f=>(!f.g856Souls||f.g856Souls.some(soul=>hasSoul(card(x),soul)))&&(!f.creature||c.type==='creature')&&(!f.color||colors(c).includes(f.color))&&(!f.race||race(c,f.race))&&(!f.raceAny||f.raceAny.some(q=>race(c,q)))&&(!f.g220NameAny||f.g220NameAny.some(q=>String(c.name).normalize('NFKC').includes(q.normalize('NFKC'))))&&(!f.any||f.any.some(fits))&&(!f.evolution||api.isEvolution(x))&&(f.min===undefined||cost(c)>=f.min)&&(!f.tapped||x.tapped)&&(!f.g436Crossed||ownCondition(s,owner,{g436Crossed:true},x.uid));let bonus=0;for(const sourceOwner of[0,1])for(const source of s.players[sourceOwner].battle){const raw=api.zoneCard(s,sourceOwner,source);if(source.sealed||(!raw.g205Aura&&!raw.g260Self?.grants?.g205Aura&&!raw.g268ManaGrants?.some(r=>r.grants?.g205Aura))||!api.isCreature(s,source)&&!(raw.type==='field'&&raw.d2Field))continue;const aura=effective(source,s,true).g205Aura;if(!aura||!aura.both&&owner!==(aura.opponent?1-sourceOwner:sourceOwner)||aura.other&&source.uid===x.uid||aura.turn==='own'&&s.active!==sourceOwner||aura.turn==='opponent'&&s.active===sourceOwner||!fits(aura.filter))continue;bonus+=aura.power;}return bonus;}
 // Counting characteristics must not calculate power/breakers on the counted cards.
 function countPower(s,x,c,attacking=false,t=c.g207CountPower){if(!t)return 0;const owner=s.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid));
  if(!t||owner<0||x.sealed||c.type!=='creature'||t.evolution&&!api.isEvolution(x)||t.attackOnly&&!attacking||t.turn==='own'&&s.active!==owner||t.turn==='opponent'&&s.active===owner)return 0;
  const owners=t.both?[0,1]:[t.opponent?1-owner:owner];
  if(t.graveName)return t.amount*graveNameCount698(s,owners,t.graveName);
  if(t.zone==='shields')return t.amount*owners.reduce((n,p)=>n+(typeof s.players[p].shields==='number'?s.players[p].shields:t.g333ShieldCards?s.players[p].shields.reduce((n,x)=>n+api.shieldCards(x).length,0):s.players[p].shields.length),0);
  const rows=owners.flatMap(p=>(s.players[p][t.zone]||[]).map(y=>({p,y}))).filter(({y})=>!t.other||y.uid!==x.uid);
  if(t.manaColor)return t.amount*rows.filter(({p,y})=>api.manaColors(card(y),s,p,true).includes(t.manaColor)).length;
  if(t.civilizations){
   if(t.g561Battle)return t.amount*countBattleCivilizations(s,rows.map(({y})=>y));
   return t.amount*new Set(rows.flatMap(({p,y})=>api.manaColors(card(y),s,p,true)).filter(q=>['光','水','闇','火','自然'].includes(q))).size;
  }
  const {g876BattleName,...f}=t.filter||{};
  const fits=({p,y})=>{
   if(t.zone==='battle'&&(y.sealed||y.faceDown||!t.g561Elements&&!api.isCreature(s,y)))return false;
   if(g876BattleName&&!battleNames676(y).includes(exactName(g876BattleName)))return false;
   if(f.g853Soul&&!hasSoul(card(y),f.g853Soul))return false;
   if(!Object.keys(f).length)return true;
   const d=t.zone==='battle'?effective(y,s,true):card(y),printed=t.zone==='battle'?[d]:faces(d);
   return (!f.g561CreatureRace||printed.some(d=>d.type==='creature'&&race(d,f.g561CreatureRace)))&&(!f.seed||(()=>{const raw=api.zoneCard(s,p,y,'battle');return raw.type==='seed'||!!raw.seedCreature||!!raw.natureAce4;})())&&(!f.creature||printed.some(d=>d.type==='creature'))&&(!f.multi||printed.some(d=>colors(d).length>1))&&(!f.spell||printed.some(d=>d.type==='spell'))&&(!f.color||printed.some(d=>colors(d).includes(f.color)))&&(!f.colorsAny||printed.some(d=>f.colorsAny.some(q=>colors(d).includes(q))))&&(!f.race||printed.some(d=>race(d,f.race)))&&(!f.evolution||api.isEvolution(y)||d.g48HandEvolution)&&(!f.blocker||d.blocker)&&(!f.tapped||y.tapped)&&(!f.untapped||!y.tapped);
  };
  return t.amount*rows.filter(fits).length;
 }
 // Only identity-based filters are accepted. Source abilities are read without
 // recursively decorating other aura recipients; ignored recipients never reach this hook.
 function grantAuras(s,owner,x,c){
  if(c.type!=='creature')return c;
  const fits=f=>(!f.g856Souls||f.g856Souls.some(soul=>hasSoul(card(x),soul)))&&(f.g562MaxCost===undefined||cost(c)<=f.g562MaxCost)&&(!f.g717Silent||!!c.g496Silent)&&(!f.multi||colors(c).length>1)&&(!f.tapped||x.tapped)&&(!f.untapped||!x.tapped)&&(!f.g227NameIncludes||String(c.name).normalize('NFKC').includes(f.g227NameIncludes))&&(!f.g819CreatureNameIncludes||battleNames676(x).some(name=>name.includes(f.g819CreatureNameIncludes)))&&(!f.color||colors(c).includes(f.color))&&(!f.colorsAny||f.colorsAny.some(q=>colors(c).includes(q)))&&(!f.g724ExactRace||exactRaces(c).includes(f.g724ExactRace))&&(!f.race||race(c,f.race))&&(!f.raceAny||f.raceAny.some(q=>race(c,q)))&&(!f.raceAll||f.raceAll.every(q=>race(c,q)))&&(!f.notRace||!race(c,f.notRace))&&(!f.evolution||api.isEvolution(x))&&(f.min===undefined||cost(c)>=f.min);
  let out=c,slayers=c.g208SlayerCount||Number(!!c.slayer);
  for(const p of [0,1])for(const source of s.players[p].battle){
   const sourceCard=card(source),auras=sourceCard.g208Auras;
   if(!auras||source.sealed||api.ignored(s,source))continue;
   if(!api.isCreature(s,source)&&!(sourceCard.type==='field'&&sourceCard.d2Field))continue;
   for(const aura of auras){if(aura.opponentTurn&&s.active===p)continue;if(aura.g557Condition&&!ownCondition(s,p,aura.g557Condition,source.uid))continue;if(!aura.both&&owner!==p||aura.other&&source.uid===x.uid||!fits(aura.filter))continue;
    if(out===c)out={...c};for(const [key,value]of Object.entries(aura.grants)){if(key==='slayer'){out.slayer=true;slayers++;}else if(key==='breaker')out.breaker=out.breaker==='∞'||value==='∞'?'∞':Math.max(Number(out.breaker)||1,value);else if(key==='attackBonus')out.attackBonus=(out.attackBonus||0)+value;else if(key==='raceAdd')out.race=[...new Set([...String(out.race||'').split('/').filter(Boolean),...value])].join('/');else out[key]=value;}
   }
  }
  if(slayers>1)out={...out,g208SlayerCount:slayers};
  return out;
 }
 function battlePower209(s,x,y,c){
  const t=c.g209BattlePower;if(!t||!s)return 0;const p=s.players.findIndex(p=>p.battle.some(z=>z.uid===x.uid));if(p<0)return 0;
  if(t.ownTurn&&s.active!==p)return 0;
  if(t.opponentRaces&&(!y||!t.opponentRaces.some(q=>race(effective(y,s),q))))return 0;
  if(t.opponentDragon&&(!y||!race(effective(y,s),'ドラゴン')))return 0;
  if(t.opponentColors&&(!y||!t.opponentColors.some(q=>colors(effective(y,s)).includes(q))))return 0;
  if(t.vsBlocker&&(!y||!effective(y,s).blocker)||t.opponentMaxCost!=null&&(!y||cost(effective(y,s))>t.opponentMaxCost)||t.handMax!=null&&s.players[p].hand.length>t.handMax||t.opponentTurn&&s.active===p)return 0;
  return t.amount*(t.graveFire?s.players[p].grave.filter(z=>faces(card(z)).some(f=>colors(f).includes('火'))).length:1);
 }
 // Source-owned battle effects are read only for the actual battle or its public preview.
 function battleAuras466(s,x){if(!s)return[];const p=s.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid));if(p<0)return[];return creatures(s,p).flatMap(source=>{const r=!source.sealed&&effective(source,s).g466BattleAura;return r&&(!r.other||source.uid!==x.uid)&&(!r.sourceTapped||source.tapped)&&(!r.condition||ownCondition(s,p,r.condition,source.uid))&&matches(s,p,x,r.filter)?[r]:[];});}
 function battleSafe466(s,x,y,opponentPower){const c=effective(x,s);return !!c.g34BattleSafe||hooks.destroySafe409(s,x)||!!(c.g466BattleSafe&&y&&opponentPower<=c.g466BattleSafe.maxOpponentPower)||!!(y&&effective(y,s).g466ProtectOpponent)||battleAuras466(s,x).some(r=>r.protect);}
 const reserved=own=>new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
 function look(s,t,owner=t.p){
  if(api.deckLocked(s,t.p))return [];
  const own=s.players[owner],held=reserved(own),ownLibrary=owner===t.p;
  const n=ownLibrary?api.lookCount(s,t.p,t.n??3):t.n??3;
  const publicLook=t.public||ownLibrary&&api.lookPublic(s,t.p);
  const rows=own.deck.filter(x=>!held.has(x.uid)).slice(0,n);
  const ids=rows.map(x=>x.uid);
  (own.g34Protected??=[]).push(...ids);
  api.log(s,t.p,publicLook?'reveal':'look',card(t.source).name+'：山札の上'+ids.length+'枚'+
   (publicLook?'を公開：'+rows.map(x=>card(x).name).join('・'):'を確認'),{cardId:t.source});
  return ids;
 }
 function manaDownScore426(s,t,y){
  const own=s.players[t.p],remaining=new Set([...own.mana.filter(x=>x.uid!==y.uid).flatMap(x=>api.manaColors(card(x),s,t.p)),...api.manaColors({civilizations:[],civ:'ゼロ'},s,t.p)]),lost=api.manaColors(card(y),s,t.p).filter(c=>!remaining.has(c)),rows=[...own.hand,...own.battle,...own.grave].map(card),synergy=rows.some(c=>c.g260Self?.filter?.g286FaceDownMana!==undefined||c.g261Discount?.filter?.g286FaceDownMana!==undefined||c.g34Tasks?.some(d=>d.filter?.g286FaceDownMana!==undefined)),zero=(card(y).manaValue??(colors(card(y)).length===5?0:1))===0&&!(s.g35ZeroMana||[]).some(r=>r.p===t.p);
  return(zero?10:synergy?12:0)-lost.length*30+(synergy&&y.tapped?1:0);
 }
 const release=(s,p,uid)=>{for(const k of['g34Protected','g35Protected'])s.players[p][k]=(s.players[p][k]||[]).filter(x=>x!==uid);};
 function zoneMove(s,p,from,uid,to,t={}){if(!api.canMoveZone(s,p,from))return;const shieldOwner=t.g904ShieldOwner??p;if(to==='shields'&&!api.canAddShield(s,shieldOwner)){if(from==='deck')release(s,p,uid);return;}const own=s.players[p];if(from==='battle'){move(s,[{player:p,uid,to,destroy:to==='grave',controller:t.controller??p}]);return;}const x=remove(own[from],uid);if(!x)return;if(from==='deck')release(s,p,uid);let dest=to;if(from==='deck'&&['mana','shields'].includes(to)&&api.deckRedirect(s,p))dest='grave';if(to==='mana'&&!(from==='hand'&&t.g182HandMana)&&api.manaRedirect(s,p))dest='grave';clear(x,dest);if(dest==='shields'&&t.g657FaceUp)x.faceUp=true;if(t.tapped&&dest==='mana')x.tapped=true;if(t.g183Return&&dest==='deckTop')own.deck.unshift(x);else api.addZone(s,dest==='shields'?shieldOwner:p,dest,x);if(from==='hand'&&dest==='mana')api.handMana(s,p,x);if(dest==='shields')api.notifyShieldAdded(s,shieldOwner,x);return true;}
 const attacking587=(s,x)=>x.uid===s.attack?.attacker||x.uid===s.attackLifecycle?.uid&&(x.incarnation||0)===(s.attackLifecycle.incarnation||0);
 const currentPower506=(s,x)=>api.power(x,attacking587(s,x),s);
 function lowestPower741(s,rows){
  const eligible=rows.filter(y=>!y.sealed);
  const power=Math.min(...eligible.map(y=>currentPower506(s,y)));
  return eligible.filter(y=>currentPower506(s,y)===power);
 }
 function fitsPower506(s,t,x){if(t.g506PowerBudget===undefined)return true;const used=(t.rows||[]).reduce((n,r)=>{const y=s.players[r.p].battle.find(y=>y.uid===r.uid);return n+(y?currentPower506(s,y):0);},0);return used+currentPower506(s,x)<=t.g506PowerBudget;}
 // Use effective costs, snapshot all targets before moving them, and allow equality at the cap.
 function fitsCost513(s,t,x){if(t.g513CostBudget===undefined)return true;const used=(t.rows||[]).reduce((n,r)=>{const y=s.players[r.p][r.origin].find(y=>y.uid===r.uid);return n+(y?cost(effective(y,s)):0);},0);const p=s.players.findIndex(own=>own.battle.some(y=>y.uid===x.uid));return p>=0&&used+cost(effective(x,s))<=t.g513CostBudget;}
 const spent550=t=>(t.rows||[]).reduce((n,r)=>n+(r.cost550||0),0);
 function fitsCost550(s,t,x,p,origin){return t.g550CostBudget===undefined||spent550(t)+cost(api.zoneCard(s,p,x,origin))<=t.g550CostBudget;}
 function deploymentState550(s,t){if(t.g550CostBudget===undefined||!t.rows?.length)return s;const future=t.rows.flatMap(r=>{const x=s.players[r.p][r.origin].find(y=>y.uid===r.uid&&(y.zoneSerial||0)===(r.serial550||0));return x?[x]:[];});return{...s,players:s.players.map((own,p)=>p===t.p?{...own,battle:[...own.battle,...future]}:own)};}
 function deployValue550(s,p,x){const c=card(x),n=s.players[p].deck?.length??s.players[p].deckCount??0,draw=c.effect==='draw2'?2:c.effect==='magicDraw'?1:0,entry=modeScore(s,{p,source:c.id},c.g34Tasks||[]);if(entry<=-900||draw>=n&&draw>0)return-1000;return 12+Math.min(30,cost(c)*2)+(c.type==='creature'?Math.min(10,(Number(c.power)||0)/3000):0)+entry+draw*10;}
 function budgetScores550(s,t,rows,n){const cap=t.g550CostBudget-spent550(t),slots=Math.min(rows.length,n-(t.selected?.length||0),t.origin==='deck'?Math.max(0,s.players[t.p].deck.length-1-(t.selected?.length||0)):Infinity),items=rows.map(r=>({...r,cost:cost(api.zoneCard(s,r.p,r.x,r.origin)),value:deployValue550(s,t.p,r.x)})),best=(xs,budget,count)=>{let dp=new Map([['0:0',0]]),out=0;for(const x of xs){if(x.value<=0)continue;for(const[k,v]of[...dp]){const[a,b]=k.split(':').map(Number);if(a+x.cost>budget||b+1>count)continue;const key=(a+x.cost)+':'+(b+1),next=v+x.value;if(next>(dp.get(key)??-Infinity))dp.set(key,next);out=Math.max(out,next);}}return out;};return new Map(items.map(x=>[x.x.uid,slots<=0||x.value<=0?-1000:x.value+best(items.filter(y=>y!==x),cap-x.cost,slots-1)]));}
 function multicolorUntap806(s,p,x,origin){
  if(x.sealed||x.faceDown&&origin!=='mana')return false;
  const cs=origin==='mana'?api.manaColors(x.faceDown?{civilizations:[],civ:'ゼロ'}:api.zoneCard(s,p,x,'mana'),s,p):colors(effective(x,s,true));
  return cs.filter(color=>color!=='ゼロ').length>1;
 }
 function list(s,t){const p=t.owner==='self'?t.p:t.owner==='opponent'?1-t.p:t.owner??t.p,own=s.players[p];return(t.zones||[t.origin||'hand']).flatMap(origin=>((t.g210ManaUntap||t.g806MultiUntap||t.g803DeployForOwner||t.g837Reikon||api.canMoveZone(s,p,origin))?own[origin]||[]:[]).filter(x=>!(t.selected||[]).includes(x.uid)&&(!t.g187OwnPick||!x.sealed)&&(!t.g186Other||x.uid!==t.uid)&&(!t.g899RampTapped||!api.allLayers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)))&&matches(s,p,x,t.filter)&&(!t.g806MultiUntap||multicolorUntap806(s,p,x,origin))).filter(x=>t.g409Budget===undefined||!x.faceDown&&(t.rows||[]).reduce((n,r)=>n+cost(card(s.players[r.p][r.origin].find(y=>y.uid===r.uid))),0)+cost(api.zoneCard(s,p,x))<(t.g409Budget==='∞'?Infinity:t.g409Budget)).filter(x=>(!t.g530Ids||t.g530Ids.includes(x.uid))&&fitsPower506(s,t,x)&&fitsCost513(s,t,x)&&fitsCost550(s,t,x,p,origin)).filter(x=>!t.deploy||canPut(deploymentState550(s,t),p,x,origin,!!t.execution)).filter(x=>origin!=='battle'||!api.targetable||api.targetable(s,t.p,p,x)).map(x=>({x,origin,p})));}
 function scryScore323(s,t,x){const c=card(x),magi=card(t.source).g34Attack?.find(d=>d.op==='Magibomber321');return api.isCreature(s,x)&&cost(c)<=(magi?.n||0)||cost(c)<=s.players[t.p].mana.length+1?-5:5;}
 function selectedBattleScore(s,t,x,candidates,n){
  if(t.anyOwner&&t.to==='hand'&&(s.players[t.p].battle.includes(x)||!api.canLeave(s,1-t.p,x)))return -10;
  if(t.g190Freeze==='end'&&(x.tapped||s.active===t.p&&!effective(x,s).blocker))return -1;if(t.g510Untap)return x.tapped&&api.canUntap(x)?15+Math.min(20,cost(effective(x,s)))*2:-10;if(t.g506PowerBudget!==undefined)return 15+Math.min(20,cost(effective(x,s)))*2+Math.min(20,Math.max(0,currentPower506(s,x)/3000));if(t.g193Tap&&!t.g210TapLock&&!(t.g743NeoLock&&sourceNeo563(s,t))&&x.tapped){const forced=candidates.filter(r=>effective(r.x,s).forceTarget).length;return effective(x,s).forceTarget&&n-(t.selected?.length||0)>forced&&candidates.some(r=>!r.x.tapped)?1:-10;}return 15+cost(effective(x,s))*2+api.power(x,false,s)/3000-(t.to==='mana'?3:0);}
 function attackCondition225(s,p,rule,x){
  const own=s.players[p],bodies=()=>own.battle.filter(y=>!y.sealed&&api.isCreature(s,y));
  switch(rule.kind){
   case'distinctCosts':return ownCondition(s,p,{g466DistinctCosts:rule.min},x?.uid);
   case'noOtherUntapped':return![0,1].some(who=>creatures(s,who).some(y=>!y.sealed&&y.uid!==x?.uid&&!y.tapped));
   case'entries':return(own.enteredThisTurn||0)>=rule.min;
   case'ownBattleWin':return s.g587BattleWins?.turn===s.turn&&s.g587BattleWins.players[p];
   case'creatureDeath':return s.g612CreatureDeathTurn===s.turn;
   case'spells':return(s.g37Spells?.[p]?.turn===s.turn?s.g37Spells[p].n:0)>=rule.min;
   case'draws':return(own.drawsThisTurn||0)>=rule.min;
   case'noncreatureUses':return(s.g448NoncreatureUses?.[p]?.turn===s.turn?s.g448NoncreatureUses[p].n:0)>=rule.min;
   case'opponentCreatures':return creatures(s,1-p).filter(y=>!y.sealed).length>=rule.min;
   case'selfEvolution':return !!x&&api.isEvolution(x);
   case'ally':return bodies().some(y=>(!rule.other||y.uid!==x?.uid)&&matches(s,p,y,rule.filter));
   case'otherAttack':{const refs=new Set(x?api.allLayers(x).map(y=>y.uid+'@'+(y.incarnation||0)):[]);return s.g481Attackers?.turn===s.turn&&s.g481Attackers.events.some(event=>(!rule.own||event.p===p)&&!event.refs.some(ref=>refs.has(ref)));}
   case'handCount':return own.hand.length<=rule.max;
   case'seed':return own.battle.some(y=>!y.sealed&&(card(y).type==='seed'||card(y).seedCreature||card(y).natureAce4));
   case'graveCards':return own.grave.length>=rule.min;
   case'graveCreatures':return own.grave.filter(y=>!y.faceDown&&faces(card(y)).some(c=>c.type==='creature')).length>=rule.min;
   case'bigCreature':return bodies().some(y=>cost(card(y))>=rule.minCost);
   case'untappedMana':return !own.mana.some(y=>y.tapped);
   case'enemyShield':return s.players[1-p].shields.length>0;
   case'shieldsAtMostOpponent':return own.shields.length<=s.players[1-p].shields.length;
   case'evolution':return bodies().some(y=>api.isEvolution(y));
   case'faceDownMana':return own.mana.filter(y=>y.faceDown).length>=rule.min;
   case'tappedCreatures':return bodies().filter(y=>y.tapped).length>=rule.min;
   default:return false;
  }
 }
 function force546(s,t,p,y=null){if(y?.sealed)return;const when=t.g546Force||t.when,refs=y?api.allLayers(y).map(z=>({uid:z.uid,incarnation:z.incarnation||0})):null;(s.extLimits??=[]).push({kind:'g546Force',controller:t.p,player:p,when,turn:s.turn,...(refs?{refs}:{}),expires:when==='nextOpponent'?'manual546':when==='untilOwnStart'?'start':'end',who:when==='untilOwnStart'?t.p:s.active,...(t.spell?{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{})});}
 function forced546(s,p,x){if(x.sealed)return false;if(forceAttack224(s,p))return true;const refs=api.allLayers(x).map(key);if((s.extLimits||[]).some(l=>l.kind==='g546Force'&&(l.refs?l.refs.some(r=>refs.includes(key(r))):l.player===p)&&(l.when!=='nextOpponent'||s.active===1-l.controller&&s.turn>l.turn)&&(l.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource}))))return true;return s.g481Attackers?.turn===s.turn&&s.players[p].battle.some(y=>y.uid!==x.uid&&!y.sealed&&card(y).g546AttackForceOthers&&!api.ignored(s,y)&&s.g481Attackers.events.some(e=>api.allLayers(y).some(z=>e.refs.includes(key(z)))));}
 function forceAttack224(s,p){return [0,1].some(owner=>s.players[owner].battle.some(y=>{const rule=card(y).g224ForceAttack;return rule&&!y.sealed&&api.isCreature(s,y)&&!api.ignored(s,y)&&(rule.owner==='both'||p!==owner)&&(!rule.tapped||y.tapped)&&(!rule.opponentTurn||s.active!==owner);}));}
 // All assignments are chosen before any card moves. Remove the inspected set
 // together, then publish every destination before queued zone triggers resolve.
 function distribute255(s,t){
  if(!api.canMoveZone(s,t.p,'deck')){for(const uid of[...(t.g255Plans||[]).map(r=>r.uid),...t.ids])release(s,t.p,uid);return;}
  const own=s.players[t.p],rest=t.rest==='grave'?'grave':'deck';
  const plans=[...(t.g255Plans||[]),...t.ids.map(uid=>({uid,to:rest}))].map(r=>({...r,to:r.to==='mana'&&(api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p))?'grave':r.to})),rows=plans.flatMap(r=>{const x=remove(own.deck,r.uid);release(s,t.p,r.uid);if(!x)return[];clear(x,r.to);return[{...r,x}];});
  for(const r of rows.filter(r=>r.to==='deck'))own.deck.push(r.x);
  for(const zone of['hand','mana','grave']){const xs=rows.filter(r=>r.to===zone).map(r=>r.x);if(xs.length)api.addZone(s,t.p,zone,...xs);}
  api.deckCheck(s,t.p);
 }
 function peekRows585(s,t){
  const owners=t.who==='both'?[t.p,1-t.p]:[t.who==='self'?t.p:1-t.p];
  return owners.flatMap(p=>s.players[p].shields.flatMap((root,i)=>{
   const group=api.shieldCards(root),label=(p===t.p?'自分':'相手')+'のシールド '+(i+1);
   if(t.cardOnly)return group.map((x,j)=>({x,p,seen:[x],label:label+' のカード '+(j+1)}));
   return [{x:root,p,seen:group,label}];
  }));
 }
 function showPeek585(s,t,rows){
  const seen=rows.flatMap(r=>r.seen.map(x=>({id:x.cardId,label:r.label})));
  if(t.hand)seen.push(...s.players[1-t.p].hand.map(x=>({id:x.cardId,label:'相手の手札'})));
  if(!seen.length)return;
  const uid=t.swap?rows[0]?.x.uid:null,swap=uid&&api.canSwapShield585(s,t.p,uid);
  const zone=t.opponentDeckTop?(t.hand?'相手の山札の上と手札':'相手の山札の上'):t.hand?'手札とシールド':'シールド';
  api.log(s,t.p,'look',card(t.source).name+'で'+zone+'を確認（内容は非公開）',{cardId:t.source});
  choice(s,{...t,op:'g34_PeekRead585',g585Peek:seen,shieldUid:uid},swap?'確認したカードを山札の上のカードと入れ替えますか？':'確認したカード',[
   ...(swap?[opt('入れ替える',true,seen.some(r=>faces(card(r.id)).some(c=>c.trigger))?-10:6)]:[]),
   opt(swap?'入れ替えずに確認を終える':'確認を終える',null,0)
  ]);
 }
 function contractScore583(own,x,selected){
  if(selected+1>=own.deck.length)return -1000;
  return own.hand.length+selected<4&&(own.mana.length-selected>3||x.tapped)?8:0;
 }
 const exchangeElement753=c=>['creature','seed','field','gear','aura'].includes(c.type);
 function exchangeSource753(s,t){
  const {owner,uid,incarnation}=t.element;
  return s.players[owner].battle.find(x=>x.uid===uid&&(x.incarnation||0)===incarnation&&!x.sealed&&!x.faceDown);
 }
 function exchangeFaces753(s,owner,x,ceiling){
  return faces(api.zoneCard(s,owner,x,'mana')).flatMap((c,face)=>exchangeElement753(c)&&cost(c)<ceiling?[{c,face}]:[]);
 }
 function exchangeMana753(s,t){
  const x=exchangeSource753(s,t);
  if(!x)return [];
  const {owner}=t.element,ceiling=cost(effective(x,s));
  return s.players[owner].mana.filter(y=>!y.faceDown).flatMap(y=>exchangeFaces753(s,owner,y,ceiling).map(({c,face})=>
   opt(c.name,{uid:y.uid,serial:y.zoneSerial||0,face},owner===t.p?deployValue550(s,owner,y)-cost(effective(x,s)):5+ceiling-cost(c),y.cardId)));
 }
 function exchangePick753(s,t){
  const rows=s.players.flatMap((own,owner)=>own.battle.flatMap(x=>{
   if(x.sealed||x.faceDown||!exchangeElement753(effective(x,s)))return [];
   const ceiling=cost(effective(x,s));
   return own.mana.some(y=>!y.faceDown&&exchangeFaces753(s,owner,y,ceiling).length)?[x]:[];
  }));
  const options=targetOptions(s,t.p,rows).map(o=>{
   const owner=s.players.findIndex(pl=>pl.battle.some(x=>x.uid===o.value));
   const x=s.players[owner].battle.find(y=>y.uid===o.value);
   return {...o,label:(owner===t.p?'自分：':'相手：')+o.label,
    score:owner===t.p?(x.uid===s.attack?.attacker?-8:8):Math.max(2,o.score),
    value:{owner,uid:x.uid,incarnation:x.incarnation||0}};
  });
  if(options.length)choice(s,t,'マナと入れ替える場のエレメントを選ぶ',[...options,skip()]);
 }
 function selection(s,t){
  let candidates=t.anyOwner?[...list(s,{...t,owner:'opponent'}),...list(s,{...t,owner:'self'})]:list(s,t);
  if(t.g837Reikon&&t.selected.length+candidates.length<t.n)return;
  if(t.g779DistinctTapState&&t.selected.length){
   const first=s.players[t.rows[0].p].battle.find(x=>x.uid===t.selected[0]);
   if(first)candidates=candidates.filter(({x})=>!!x.tapped!==!!first.tapped);
  }
  if(t.g626DistinctEvolution&&t.selected.length){
   const first=s.players[t.p].grave.find(x=>x.uid===t.selected[0]);
   if(first)candidates=candidates.filter(r=>api.isEvolution(r.x)!==api.isEvolution(first));
  }
  if(t.g646CivilizationPair&&t.selected.length){
   const first=s.players[t.p].grave.find(x=>x.uid===t.selected[0]);
   const [one,other]=t.g646CivilizationPair;
   const hasColor=(x,color)=>matches(s,t.p,x,{g228Face:{type:'creature',color}});
   if(first)candidates=candidates.filter(({x})=>hasColor(first,one)&&hasColor(x,other)||hasColor(first,other)&&hasColor(x,one));
  }
  if(t.g907ManaUntapColors){
   const [light,fire]=t.g907ManaUntapColors;
   const colorsByUid=new Map(s.players[t.p].mana.map(x=>[x.uid,
    api.manaColors(x.faceDown?{civilizations:[],civ:'ゼロ'}:api.zoneCard(s,t.p,x,'mana'),s,t.p)]));
   const has=(uid,color)=>colorsByUid.get(uid)?.includes(color);
   const pair=(a,b)=>a!==b&&(has(a,light)&&has(b,fire)||has(a,fire)&&has(b,light));
   const [first]=t.selected;
   const matching=candidates.filter(({x})=>has(x.uid,light)||has(x.uid,fire));
   const paired=matching.filter(({x})=>first?pair(first,x.uid):matching.some(({x:y})=>pair(x.uid,y.uid)));
   candidates=first||paired.length?paired:matching;
  }
  const eligible=t.g173Targets?new Set(targetOptions(s,t.p,candidates.map(r=>r.x)).map(o=>o.value)):null,rows=eligible?candidates.filter(r=>eligible.has(r.x.uid)):candidates,n=t.n==='all'?Infinity:t.n??1;
  if(!rows.length&&t.g585Peek?.length&&!t.selected.length){
   choice(s,t,'確認したカード',[opt('確認を終える',null,0)]);
   return;
  }
  if((t.selected?.length||0)>=n||!rows.length){if(t.selected?.length||t.g891BouncePair&&!t.g891OwnStage)finishSelect(s,t);else if(t.after)start(s,t,t.after);return;}const scores550=t.g550CostBudget===undefined?null:budgetScores550(s,t,rows,n);choice(s,t,t.title||('カードを'+n+'枚'+(t.optional?'まで':'')+'選ぶ'),[...rows.map(({x,origin,p})=>opt((t.anyOwner?(p===t.p?'自分：':'相手：'):'')+(t.zones?.length>1?({mana:'マナ：',grave:'墓地：',hand:'手札：'}[origin]||''):'')+(x.faceDown?'裏向きのカード':card(x).name)+((t.g210ManaUntap||t.g806MultiUntap)?(x.tapped?(api.canUntap(x)?'（タップ中）':'（タップ中・アンタップ不可）'):'（アンタップ）'):''),{uid:x.uid,origin,p,...(scores550?{cost550:cost(api.zoneCard(s,p,x,origin)),serial550:x.zoneSerial||0}:{})},scores550?scores550.get(x.uid):t.g583DrawMoved?contractScore583(s.players[p],x,t.selected.length):t.g405Search&&origin==='deck'&&s.players[t.p].deck.length<=1?-1000:(t.g210ManaUntap||t.g806MultiUntap)?(x.tapped&&api.canUntap(x)?25:-1):x.faceDown?15:t.g530Ids&&origin==='deck'&&(t.selected?.length||0)+1>=s.players[t.p].deck.length?-1000:t.score??(t.g899RampTapped?(s.players[t.p].deck.length>t.selected.length+1?12:-1000):t.g193Select?selectedBattleScore(s,t,x,candidates,n):t.g187OwnPick?-cost(card(x))-api.power(x,false,s)/10000:t.g182HandMana||t.g183Return||t.g184ManaLoss?15-cost(card(x)):t.to==='grave'?-cost(card(x)):15+cost(card(x))),x.faceDown?null:x.cardId)),...(t.optional&&t.selected.length>=(t.minimum??0)&&(!t.g626DistinctEvolution||!t.selected.length)?[opt(t.g837Reikon&&n>1?'返霊を使わない':t.g626DistinctEvolution?'戻さない':'ここまでで確定',null,0)]:[])]);}
 function freeze(s,t,p,y){if(!y||y.sealed)return;for(const kind of ['attack','block'])(s.extLimits??=[]).push({kind,g190Freeze:true,player:p,uid:y.uid,incarnation:y.incarnation||0,controller:t.controller??t.p,expires:t.g190Freeze==='end'?'end':'start',who:t.g190Freeze==='end'?s.active:t.g190Freeze==='opponent'?1-t.p:t.p,...(t.spell?{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{})});}
 function stopPlayerAttack567(s,t,y){
  (s.extLimits??=[]).push({kind:'g567PlayerStop',ref:{uid:y.uid,incarnation:y.incarnation||0},controller:t.p,expires:t.g567PlayerStop,who:t.g567PlayerStop==='start'?t.p:s.active,...(t.spell===false?{}:{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))})});
 }
 function startUntapLock210(t,y){if(t.spell)(y.g170StartFreeze??=[]).push({spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))});else y.skipUntap=true;}
 const timedGrant335=(s,t,grant)=>({turn:s.turn,...grant,...(t.spell?{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{})});
 function releaseHyper781(s,p,y){
  if(y.sealed||y.hyperActive||!card(y).hyper)return;
  y.hyperActive=true;
  y.hyperResolved=true;
  api.log(s,p,'hyper',card(y).name+'のハイパーモードを解放',{cardId:y.cardId});
 }
 function applyGrant(s,t,y){
  if(t.g521UntilStart)(s.extLimits??=[]).push({
   kind:'g521Grant',ref:{uid:y.uid,incarnation:y.incarnation||0},grant:t.grant,expires:'start',who:t.p,
   ...(t.spell?{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{})
  });
  else(y.g34Grants??=[]).push(timedGrant335(s,t,t.grant));
 }
 // Publish the complete movement before its zone triggers or matching draw.
 function moveZoneSelection583(s,t,rows){
  if(!api.canMoveZone(s,t.p,t.origin))return;
  const dest=t.to==='mana'&&t.origin!=='hand'&&api.manaRedirect(s,t.p)?'grave':t.to;
  if(dest===t.origin)return;
  const origin=s.players[t.p][t.origin],moved=rows.map(r=>remove(origin,r.uid)).filter(Boolean);
  for(const x of moved)clear(x,dest);
  api.addZone(s,t.p,dest,...moved);
  if(t.origin==='hand'&&dest==='mana')for(const x of moved)api.handMana(s,t.p,x);
  if(t.g583DrawMoved&&moved.length)start(s,t,[{op:'Draw',n:moved.length}]);
 }
 const graveHandManaOrigins771=['grave','hand'];
 function finishGraveHandMana771(s,t){
  const own=s.players[t.p];
  const moved=graveHandManaOrigins771.map((origin,i)=>{
   if(!t.picks[i]||!api.canMoveZone(s,t.p,origin)||origin==='grave'&&api.manaRedirect(s,t.p))return null;
   return remove(own[origin],t.picks[i]);
  });
  for(const x of moved.filter(Boolean)){clear(x,'mana');x.tapped=true;}
  api.addZone(s,t.p,'mana',...moved.filter(Boolean));
  if(moved[1])api.handMana(s,t.p,moved[1]);
 }
 function graveSpellOptions594(s,t){
  return s.players.flatMap((owner,p)=>api.canMoveZone(s,p,'grave')?owner.grave.flatMap(x=>faces(card(x)).flatMap((c,face)=>
   c.type==='spell'&&cost(c)<=t.max&&api.canCast(s,t.p,c,'grave',p)?[opt((p===t.p?'自分：':'相手：')+c.name,{uid:x.uid,owner:p,face,serial:x.zoneSerial||0},15+cost(c),x.cardId)]:[]
  )):[]);
 }
 function recoverSameCreature713(s,t){
  const grave=s.players[t.p].grave;
  const selected=grave.find(x=>x.uid===t.rows?.[0]?.uid);
  // The card specifies creatures, so only creature faces supply names (810.3a).
  const name=x=>{
   const face=x&&!x.faceDown&&faces(api.zoneCard(s,t.p,x,'grave')).find(f=>f.type==='creature');
   return face?exactName(creatureFaceName(face)):'';
  };
  const selectedName=name(selected);
  if(!selectedName)return;
  const rows=grave.filter(x=>name(x)===selectedName).map(({uid})=>({uid}));
  moveZoneSelection583(s,t,rows);
 }
 function finishSelect(s,{g585Peek,...t}){
  // Both choices precede the simultaneous return, including when no opponent is selectable.
  if(t.g891BouncePair&&!t.g891OwnStage){
   put(s,{...t,op:'g34_Select',owner:'self',g891OwnStage:true,n:(t.selected?.length||0)+1,optional:true,
    title:'手札に戻す自分のクリーチャーを1体まで選ぶ'});
   return;
  }
  if(t.g869RevealAfterTap){
   const refs=t.rows.flatMap(({p,uid})=>{
    const y=s.players[p].battle.find(x=>x.uid===uid);
    return y?[key(y)]:[];
   });
   const [reveal]=t.after;
   t.after=[{...reveal,defs:[{op:'LockUntap606',spell:true,g869Refs:refs}]}];
  }
  if(t.g829InspectDiscard){
   const uids=(t.rows||[]).map(row=>row.uid);
   if(uids.length)api.discardSelected(s,1-t.p,uids,t.source,t.controller??t.p);
   return;
  }
  if(t.g806MultiUntap){
   const [r]=t.rows;
   const x=r&&s.players[r.p][r.origin].find(y=>y.uid===r.uid);
   if(x&&multicolorUntap806(s,r.p,x,r.origin)&&api.untap(s,r.p,x)){
    const label=x.faceDown?'裏向きのマナ':card(x).name;
    api.log(s,t.p,'untap',card(t.source).name+'で'+label+'をアンタップ',{cardId:x.faceDown?t.source:x.cardId});
   }
   return;
  }

  if(t.g803DeployForOwner){
   const [row]=t.rows;
   if(row)put(s,task('g34_Put',row.p,t.source,{origin:row.origin,target:row.uid,controller:t.p}));
   return;
  }

  if(t.g763TapOrUntap){
   const defs=(t.rows||[]).flatMap(({p,uid})=>{
    const target=s.players[p].battle.find(x=>x.uid===uid);
    return target?[{op:'TapState235',target:{p,uid,incarnation:target.incarnation||0}}]:[];
   });
   start(s,t,defs);
   return;
  }
  if(t.g713SameCreature){recoverSameCreature713(s,t);return;}
  if(t.g671PlayerLockPower)for(const row of t.rows||[]){
   const target=s.players[row.p].battle.find(x=>x.uid===row.uid);
   if(!target||target.sealed)continue;
   (target.powerModifiers??=[]).push({amount:t.g671PlayerLockPower,expires:'end',who:s.active,spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))});
   stopPlayerAttack567(s,{...t,g567PlayerStop:'end'},target);
  }
  if(t.g583Group){moveZoneSelection583(s,t,t.rows||[]);return;}
 if(t.afterBattleSelect||t.g917BounceMatch){
  const moves=(t.rows||[]).filter(r=>r.origin==='battle'&&s.players[r.p].battle.some(x=>x.uid===r.uid))
   .map(r=>({player:r.p,uid:r.uid,to:t.to,controller:t.controller??t.p}));
  // These follow-ups use the selected creatures, including moves changed by replacements (QA 45793, notice 31661).
  if(moves.length){
   move(s,moves);
   start(s,t,t.g917BounceMatch?[{op:'BounceMatch917',n:moves.length}]:t.afterBattleSelect);
  }
  return;
 }
  if(t.g673ShuffleOnMove){
   const rows=t.rows||[];
   if(!rows.length)return;
   const opponent=1-t.p;
   const uids=rows.flatMap(row=>{
    const unit=s.players[row.p].battle.find(x=>x.uid===row.uid);
    return unit?api.allLayers(unit).map(x=>x.uid):[];
   });
   move(s,rows.map(row=>({player:row.p,uid:row.uid,to:'deck',destroy:false,controller:t.controller??t.p})));
   put(s,task('g34_ShuffleOnMove673',t.p,t.source,{opponent,uids}));
   return;
  }
  if(t.g837DeckEnds){
   if(t.rows?.length)put(s,{...t,op:'g34_GraveDeckEnd837'});
   return;
  }
  if(t.g837Reikon){
   const rows=t.rows||[];
   if(rows.length===t.n&&rows.every(row=>s.players[row.p].grave.some(x=>x.uid===row.uid))){
    moveZoneSelection583(s,t,rows);
    // A replacement or prohibition on leaving the graveyard does not cancel reikon (QA 40371).
    start(s,t,t.g837Reikon);
   }
   return;
  }
  if(t.g583OnMove){
   const r=t.rows?.[0],x=r&&s.players[r.p][r.origin].find(y=>y.uid===r.uid);
   const matched=x&&(!t.g654MovedFilter||matches(s,r.p,x,t.g654MovedFilter));
   if(x&&zoneMove(s,r.p,r.origin,r.uid,t.to,t)&&matched)start(s,t,t.g583OnMove);
   return;
  }
  if(t.g553Destinations&&t.rows?.length){put(s,{...t,op:'g34_Destination553',g553Destinations:false});return;}const rows=t.g183Return&&t.to==='deckTop'?[...(t.rows||[])].reverse():t.rows||[];if(t.g899RampTapped){
  let n=0;
  for(const r of rows){
   const x=s.players[r.p].battle.find(y=>y.uid===r.uid);
   if(!x||x.sealed||x.tapped||!api.isCreature(s,x))continue;
   api.tap(s,r.p,x);
   if(x.tapped)n++;
  }
  if(n)start(s,t,[{op:'Ramp',n}]);
  return;
 }if(t.deploy){
  let returnGroup;
  if(t.g785ReturnGroup){
   const delays=s.g537Delays??=[];
   returnGroup=delays.length;
   delays.push({p:t.p,source:t.source,when:'turnEnd',turn:s.turn,defs:[{op:'ReturnGroup785',refs:[]}]});
  }
  if(rows.length>1){s.g34DeployBatch=true;s.players[t.p].g34ManaHeld=rows.filter(r=>r.origin==='mana').map(r=>r.uid);}put(s,...rows.map(r=>({...t,...r,owner:r.p,p:t.p,op:'g34_Put',origin:r.origin,target:r.uid,...(returnGroup===undefined?{}:{g785Group:returnGroup})})),...(t.after?tasks(t.p,t.source,t.after,{uid:t.uid,incarnation:t.incarnation}):[]),task('g34_Custom',t.p,t.source,{name:'finishBatch'}));}else{if(t.g190Freeze)for(const r of rows)freeze(s,t,r.p,s.players[r.p].battle.find(x=>x.uid===r.uid));if(t.g546Force)for(const r of rows){const y=s.players[r.p].battle.find(x=>x.uid===r.uid);if(y)force546(s,t,r.p,y);}if((t.g187OwnPick&&t.tap)||t.g193Tap)for(const r of rows){const x=s.players[r.p].battle.find(x=>x.uid===r.uid);if(x){api.tap(s,r.p,x);if(t.g210TapLock||t.g743NeoLock&&sourceNeo563(s,t))startUntapLock210(t,x);}}if(t.g510Untap)for(const r of rows){const x=s.players[r.p].battle.find(x=>x.uid===r.uid);if(x?.tapped&&api.canUntap(x)){x.tapped=false;combined.untapped(s,r.p,x);}}if(t.g335Grant)for(const r of rows){const x=s.players[r.p].battle.find(x=>x.uid===r.uid);if(x)(x.g34Grants??=[]).push(timedGrant335(s,t,t.g335Grant));}if(t.g210ManaUntap){let n=0;for(const r of rows){const x=s.players[r.p].mana.find(x=>x.uid===r.uid);if(x&&api.canUntap(x)){if(x.tapped)n++;x.tapped=false;}}api.log(s,t.p,'untapMana',card(t.source).name+'：マナを'+n+'枚アンタップ',{cardId:t.source});}const b=rows.filter(r=>r.origin==='battle');for(const r of rows.filter(r=>r.origin!=='battle'))if(t.to)zoneMove(s,r.p,r.origin,r.uid,t.to,t);if(b.length&&t.to)move(s,b.map(r=>({player:r.p,uid:r.uid,to:t.to,destroy:t.to==='grave',controller:t.controller??t.p})));if(t.after)start(s,t,t.after);}}
 // A resolved group effect is a snapshot, not an aura. Match the source creature through its layers for "other".
 function groupPowerRows(s,t){
  const ps=t.owner==='both'?[0,1]:[t.owner==='self'?t.p:1-t.p];
  return ps.flatMap(p=>creatures(s,p).filter(y=>!y.sealed&&matches(s,p,y,t.filter)
   &&(!t.other||!api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))
    ||t.otherUnlessRace&&race(effective(y,s),t.otherUnlessRace))).map(y=>({p,y})));
 }
 function groupPowerScore(s,t){return groupPowerRows(s,t).reduce((n,{p,y})=>{const before=api.power(y,y.uid===s.attack?.attacker,s),gain=t.power>0?Math.min(10,t.power/1000):before+t.power<=0?18+cost(effective(y,s))*3+Math.max(0,before)/2000:Math.min(8,-t.power/1000);return n+(p===t.p?1:-1)*(t.power>0?gain:-gain);},0);}
 // Only the new modal definitions use this evaluation; existing card-specific mode scores stay intact.
 // Score a selected creature from public characteristics; the tap/untap direction is chosen afterwards.
 function tapStateScore235(s,t,p,y,tap){
  if(tap?y.tapped:!y.tapped||!api.canUntap(y))return 0;
  const value=10+cost(effective(y,s))*2+api.power(y,false,s)/3000;
  return (tap?p!==t.p:p===t.p)?value:-value;
 }
 function recoveryScore326(s,t){const rows=list(s,{...t,selected:[]}),returnedMana=rows.filter(r=>r.origin==='mana').length,remaining=s.players[t.p].mana.length-returnedMana;if(!rows.length)return -1;return rows.reduce((n,r)=>n+(r.origin==='grave'?10+Math.min(6,cost(card(r.x))/2):r.x.tapped?2:remaining<3?-8:-3),0);}
 function manaTriggerSpells803(s,p){
  return s.players[p].mana.filter(y=>!y.faceDown).flatMap(y=>faces(api.zoneCard(s,p,y,'mana')).flatMap((c,face)=>
   c.type==='spell'&&(c.trigger||c.triggerPlus||c.superTrigger)?[{y,c,face}]:[]));
 }
 function spellScore555(s,t,c){const n=s.players[t.p].deck?.length??s.players[t.p].deckCount??0,draw={draw2:2,magicDraw:1,ramp1:1,ramp2:2}[c.effect]||0;if(!api.spellIgnored(s,c)&&draw>=n&&draw>0&&!(c.effect==='draw2'&&creatures(s,t.p).some(y=>effective(y,s).shako)))return-1000;return 20+cost(c)+(api.spellIgnored(s,c)?0:modeScore(s,{...t,source:c.id},c.g34Tasks||[]));}
 // Delayed spell effects survive their card leaving the graveyard. Selected refs keep incarnation identity.
 function scheduleUntap562(s,t,defs){const source=faces(card(t.source)).find(c=>c.type==='spell')||card(t.source);(s.g501EndDelays??=[]).push({p:t.p,source:t.source,uid:t.uid,incarnation:t.incarnation||0,ownEnd:!!t.ownEnd,defs:structuredClone(defs),...(!t.creatureSource?{spellCost:cost(source)}:{})});}
 function finishUntap562(s,t){const defs=(t.refs||[]).map(ref=>({op:'AttackUntap408',g399Attacker:ref,g562Creature:true}));if(!defs.length)return;if(t.delay)scheduleUntap562(s,t,t.optionalUntap?defs.map(d=>({op:'Offer',title:'選んだクリーチャーをアンタップする？',defs:[d]})):defs);else start(s,t,defs);}
 function countedPowerDefs561(s,t,d){
  const rows=s.players[t.p][d.zone]||[],source=d.g179Other?sourceHost474(s,t)?.x:null;
  const n=d.zone==='hand'?rows.length:d.zone==='battle'?creatures(s,t.p).filter(y=>y!==source&&!y.sealed&&matches(s,t.p,y,d.filter)).length:
   rows.filter(y=>!d.filter.color||api.manaColors(y.faceDown?{civilizations:[],civ:'ゼロ'}:card(y),s,t.p).includes(d.filter.color)).length;
  return (d.defs||[]).map(def=>def.g561Scale?{...def,power:n*d.amount}:def);
 }
 function lockSpells589(s,t,color){
  const opponent=1-t.p;
  (s.extLimits??=[]).push({
   kind:'g589SpellLock',player:opponent,controller:t.p,expires:'end',who:opponent,
   afterTurns:s.players[opponent].turns,nextOnly:!!t.nextOnly,color:color??null
  });
  api.log(s,t.p,'spellLock',card(t.source).name+'：相手の'+(color?color+'の':'')+'呪文を制限',{cardId:t.source});
 }
 function gravePickRemovalCost598(s,t,n){
  const rows=creatures(s,1-t.p).filter(x=>!x.sealed&&cost(effective(x,s))<=n);
  const legal=new Set(targetOptions(s,t.p,rows).map(o=>o.value));
  return Math.max(-1,...rows.filter(x=>legal.has(x.uid)).map(x=>cost(effective(x,s))));
 }
 function gravePickPlayerScore598(s,t,owner){
  const own=s.players[t.p],grave=s.players[owner].grave;
  const moves=api.canMoveZone(s,owner,'grave'),n=Math.min(t.n??grave.length,grave.length);
  if(t.mode==='draw'&&(own.deck?.length??own.deckCount)<=1&&!(moves&&owner===t.p&&n))return -1000;
  const max=t.mode==='destroy'?gravePickRemovalCost598(s,t,n):-1;
  const removal=max>=0?16+max*2:0;
  return removal+(moves&&owner!==t.p?n*5:0)+(t.mode==='draw'&&n?10:0);
 }
 function finishGravePick598(s,t){
  const owner=t.owner??t.p,grave=s.players[owner].grave;
  const selected=t.selected.filter(uid=>grave.some(x=>x.uid===uid));
  const moved=api.canMoveZone(s,owner,'grave')?selected.map(uid=>remove(grave,uid)):[];
  for(const x of moved)clear(x,'deck');
  if(t.mode==='shuffle'){
   if(selected.length)api.shuffleLibrary(s,owner,moved,t.source);
   return;
  }
  if(t.mode==='shuffleBottom'){
   if(moved.length)api.addZone(s,owner,'deck',...api.shuffled(moved,Math.floor(api.random(s)*4294967296)));
   return;
  }
  api.addZone(s,owner,'deck',...moved);
  if(t.mode==='draw'&&selected.length)start(s,t,[{op:'Draw',n:1}]);
  if(t.mode==='destroy'){
   start(s,t,[{op:'Target',to:'grave',optional:true,filter:{max:selected.length}}]);
   if(moved.length>1)put(s,task('g78_BottomOrder',owner,t.source,{rows:moved.map(x=>({uid:x.uid,label:card(x).name,cardId:x.cardId})),ordered:[],newCards:true,controller:t.p}));
  }
 }
 function scorpionOptions614(s,p){
  return targetOptions(s,p,creatures(s,1-p).filter(x=>!x.sealed&&effective(x,s).blocker));
 }
 function scorpion614(s,t){
  const owner=1-t.p,opp=s.players[owner];
  if(t.blocker===undefined){
   const options=scorpionOptions614(s,t.p);
   if(options.length)choice(s,t,'山札の下に置く相手のブロッカーを1体選ぶ',options);
   else put(s,{...t,blocker:null,selected:[]});
   return;
  }
  const grave=opp.grave.filter(x=>!x.faceDown&&!t.selected.includes(x.uid));
  if(t.selected.length<2&&grave.length){
   choice(s,t,'山札の下に置く相手の墓地のカードを選ぶ（'+t.selected.length+'/2）',grave.map(x=>opt(card(x).name,x.uid,cost(card(x)),x.cardId)));
   return;
  }
  const blocker=opp.battle.find(x=>x.uid===t.blocker);
  const cards=[...(blocker?api.allLayers(blocker):[]),...opp.grave.filter(x=>t.selected.includes(x.uid))];
  const rows=cards.map((x,i)=>({uid:x.uid,label:x.faceDown?'裏向きのカード '+(i+1):card(x).name,cardId:x.faceDown?null:x.cardId}));
  if(rows.length>1)put(s,task('g78_BottomOrder',owner,t.source,{rows,ordered:[],newCards:true,controller:t.p}));
  for(const uid of t.selected)zoneMove(s,owner,'grave',uid,'deck',t);
  if(blocker)move(s,[{player:owner,uid:blocker.uid,to:'deck',controller:t.p}]);
 }
 function costSweepOptions(s,t){
  const rows=creatures(s,1-t.p).filter(y=>!y.sealed&&api.canLeave(s,1-t.p,y));
  return Array.from({length:t.max-t.min+1},(_,i)=>{
   const n=t.min+i;
   const score=rows.filter(y=>cost(effective(y,s))===n).reduce((v,y)=>v+12+n*2+api.power(y,false,s)/3000,0);
   return opt(String(n),n,score);
  });
 }
 function powerSweepOptions696(s,t){
  const scores=new Map();
  for(const p of [0,1])for(const x of creatures(s,p)){
   if(x.sealed)continue;
   const n=Math.max(0,livePower199(s,x,true));
   if(!Number.isInteger(n)||n>t.max)continue;
   const value=api.canLeave(s,p,x)?(p===t.p?-1:1)*(12+cost(effective(x,s))*2+n/3000):0;
   scores.set(n,(scores.get(n)||0)+value);
  }
  const options=[...scores].sort(([a],[b])=>a-b).map(([n,score])=>opt(String(n),n,score));
  // All numbers absent from the board give the same result. Offer one such number.
  let missing=0;
  while(scores.has(missing))missing++;
  if(missing<=t.max)options.push(opt(missing+'（該当なし）',missing,0));
  return options;
 }
 function modeScore(s,t,defs){const own=s.players[t.p],opp=s.players[1-t.p],deckCount=own.deck?.length??own.deckCount??0;let score=0,drainCount=0;for(const d of defs){
  if(d.op==='HatchHunter841'){
   const x=own.grave.find(y=>y.uid===d.target&&(y.zoneSerial||0)===d.serial);
   if(x&&canPut(s,t.p,x,'grave'))score+=8+2*cost(card(x));
  }
  if(card(t.source)?.supportBatch==='phase-627'){
   if(d.op==='ShieldTop'){
    if(api.canAddShield(s,t.p)&&!api.deckLocked(s,t.p))score+=deckCount<=1?-1000:20;
    continue;
   }
   if(d.op==='Stay627'){
    const host=sourceHost474(s,t);
    if(host&&api.canLeave(s,host.p,host.x)){
     const power=api.power(host.x,false,s);
     score+=creatures(s,1-host.p).some(x=>!x.sealed&&api.power(x,false,s)>=power)?28:9;
    }
    continue;
   }
  }
  if(card(t.source)?.supportBatch==='phase-626'){
   if(d.op==='Mill'&&!api.deckLocked(s,t.p)&&deckCount<=d.n)return -1000;
   if(d.op==='Sweep'&&d.filter.element){
    score+=opp.battle.filter(x=>!x.sealed&&matches(s,1-t.p,x,d.filter)).reduce((n,x)=>n+12+cost(effective(x,s))*2,0);
    continue;
   }
  }
  if(card(t.source)?.supportBatch==='phase-608'){
   const shields=typeof own.shields==='number'?own.shields:own.shields.length;
   if(d.op==='ShieldTop'){
    if(api.canAddShield(s,t.p)&&!api.deckLocked(s,t.p))score+=deckCount<=1?-1000:shields<2?25:12;
    continue;
   }
   if(d.op==='ShieldHand'){
    if(shields>0&&!defs.some(d=>d.op==='ShieldTop'&&api.canAddShield(s,t.p)&&!api.deckLocked(s,t.p)))score-=shields<2?24:9;
    continue;
   }
   if(d.op==='Target'&&d.to==='shields'&&!api.canAddShield(s,1-t.p))continue;
  }
  if(['phase-606','phase-607'].includes(card(t.source)?.supportBatch)){
   const enemies=creatures(s,1-t.p).filter(y=>!y.sealed);
   if(d.op==='TapAll'){
    score+=enemies.filter(y=>!y.tapped).length*12;
    continue;
   }
   if(d.op==='LockUntap606'){
    score+=enemies.filter(y=>matches(s,1-t.p,y,d.filter)).length*12;
    continue;
   }
   if(d.op==='Execute'&&d.spellColorsAny){
    if(own.hand.some(y=>faces(card(y)).some(c=>c.type==='spell'&&cost(c)<=d.max&&colors(c).some(color=>d.spellColorsAny.includes(color))&&api.canCast(s,t.p,c,'hand'))))score+=18;
    continue;
   }
   if(d.op==='Select'&&d.g190Freeze==='end'){
    const targets=enemies.filter(y=>!y.tapped&&(s.active!==t.p||effective(y,s).blocker));
    score+=targetOptions(s,t.p,targets).length*12;
    continue;
   }
  }
  if(card(t.source)?.supportBatch==='phase-602'){
   if(d.op==='TapAll'){
    score+=creatures(s,1-t.p).filter(y=>!y.sealed&&!y.tapped).length*11;
    continue;
   }
   if(d.op==='Sequence'&&d.defs[0]?.op==='ShieldTop'){
    if(!api.canAddShield(s,t.p)||api.deckLocked(s,t.p))continue;
    const shields=typeof own.shields==='number'?own.shields:own.shields.length;
    const n=shields<2?2:1;
    if(deckCount<=n)return -1000;
    score+=n*(shields<2?27:shields<4?16:8);
    continue;
   }
  }
  if(card(t.source)?.supportBatch==='phase-603'&&d.op==='ShieldTop'){
   const n=typeof own.shields==='number'?own.shields:own.shields.length;
   if(api.canAddShield(s,t.p)&&!api.deckLocked(s,t.p))score+=deckCount<=1?-1000:n<2?28:12;
   continue;
  }
  if(d.op==='KeepOne604'){
   const count=d.zone==='hand'?opp.hand.length:creatures(s,1-t.p).filter(y=>!y.sealed).length;
   score+=Math.max(0,count-1)*(d.zone==='hand'?10:19);
   continue;
  }
  if(d.op==='PowerSweep696'){score+=Math.max(...powerSweepOptions696(s,{...t,...d}).map(o=>o.score));continue;}
  if(d.op==='CostSweep596'){score+=Math.max(0,...costSweepOptions(s,{...t,...d}).map(o=>o.score));continue;}
  if(d.op==='IfNeo563'){if(sourceNeo563(s,t))score+=modeScore(s,t,d.defs);continue;}
  if(d.op==='EndUntap562'){score+=modeScore(s,t,d.defs);continue;}
  if(d.op==='ChooseUntap562'){score+=creatures(s,t.p).filter(y=>!y.sealed&&y.tapped&&api.canUntap(y)).map(y=>5+Number(!!effective(y,s).blocker)*6).sort((a,b)=>b-a).slice(0,d.n).reduce((a,b)=>a+b,0);continue;}
  if(d.op==='CountPower561'){score+=modeScore(s,t,countedPowerDefs561(s,t,d));continue;}
  if(d.op==='MillRecover545'){score+=deckCount<=2?-1000:(own.hand.length<3?12:8);continue;}
  if(d.op==='Harpoon618'){
   if(opponentAddedShields618(s,t.p))score+=Math.max(0,(opp.shields.length??opp.shields)-3)*22;
   continue;
  }
  if(d.op==='Scorpion614'){
   const options=scorpionOptions614(s,t.p);
   score+=Math.max(0,...options.map(o=>10+o.score))+(api.canMoveZone(s,1-t.p,'grave')?Math.min(2,opp.grave.length)*5:0);
   continue;
  }
  if(d.op==='OverManaBottom590'){score+=creatures(s,1-t.p).filter(y=>!y.sealed&&cost(effective(y,s))>opp.mana.length).length*18;continue;}
  if(d.op==='ChainDestroy838'){score+=Math.max(0,...chainOptions838(s,t.p).map(o=>o.score));continue;}
  if(d.op==='GravePick598'&&d.mode==='shuffleBottom'){score+=api.canMoveZone(s,1-t.p,'grave')?opp.grave.length*4:0;continue;}
  if(d.op==='ElementOrMana796'){score+=elementOrManaOptions796(s,t,d.max).reduce((best,o)=>Math.max(best,o.score),0);continue;}
  if(d.op==='GraveBottom589'){score+=api.canMoveZone(s,1-t.p,'grave')?opp.grave.length*5:0;continue;}
  if(d.op==='RecoverAll326'){score+=recoveryScore326(s,{...t,...d});continue;}
  if(d.op==='Draw'||d.op==='Ramp'){drainCount+=d.n||0;if(drainCount>=deckCount)return d.op==='Draw'&&creatures(s,t.p).some(y=>effective(y,s).shako)?1000:-1000;score+=(d.n||0)*(d.op==='Draw'?(own.hand.length<3?12:8):(own.mana.length<6?16:7));}
  else if(d.op==='Target'){const rows=(d.element?opp.battle:creatures(s,1-t.p)).filter(y=>!y.sealed&&matches(s,1-t.p,y,d.filter)&&(!d.tap||!y.tapped)),legal=new Set(targetOptions(s,t.p,rows).map(o=>o.value));score+=Math.max(0,...rows.filter(y=>legal.has(y.uid)).map(y=>d.tap?8+cost(effective(y,s)):12+cost(effective(y,s))*2+api.power(y,false,s)/3000-(d.to==='mana'?2:0)));}
  else if(d.op==='ManaChoose582'){
   const mine=manaRows582(s,t.p,d).length,theirs=manaRows582(s,1-t.p,d).length;
   if(d.keep)score+=Math.max(0,(d.who==='opponent'?theirs:mine)-d.n)*(d.who==='opponent'?12:-12);
   else if(d.who==='choose')score+=Math.min(d.n,theirs)*12;
   else if(d.who==='each')score+=(Math.min(d.n,theirs)-Math.min(d.n,mine))*12+(theirs>0&&mine>theirs?7:0);
  }
  else if(d.op==='BattleCardMove579')score+=Math.max(0,...cardMoveOptions579(s,{...t,...d}).map(o=>o.score));
  else if(d.op==='Look'&&d.g310Search)score+=own.deck.length>1?(own.hand.length<4?12:8):0;
  else if(card(t.source).supportBatch==='phase-775'&&d.op==='Look'&&d.rest==='top'&&d.stages?.[0]?.to==='hand'&&!api.deckLocked(s,t.p))score+=deckCount<=1?-1000:own.hand.length<4?14:8;
  else if(d.op==='Break497'&&['phase-775','phase-776'].includes(card(t.source)?.supportBatch))score+=Math.min(d.n,opp.shields.length??opp.shields)*12;
  else if(d.op==='GroupGrant364'&&d.grant.poweredBreaker&&d.grant.attackBonus){
   const shields=opp.shields.length??opp.shields;
   const blockers=creatures(s,1-t.p).filter(x=>!x.sealed&&!x.tapped&&effective(x,s).blocker).map(x=>api.power(x,false,s));
   for(const {y} of groupPowerRows(s,{...t,...d})){
    const c=effective(y,s);
    if(y.tapped||c.noAttack||c.noPlayerAttack)continue;
    const before=api.power(y,true,s),after=before+(d.grant.attackBonus||0);
    const native=c.breaker==='∞'?Infinity:Number(c.breaker)||1;
    const breaks=Math.max(native,1+Math.floor(after/6000));
    const current=Math.max(native,c.poweredBreaker?1+Math.floor(before/6000):1);
    const betterBattle=blockers.some(n=>n>=before&&n<after);
    score+=(betterBattle?8:0)+(Math.min(shields,breaks)-Math.min(shields,current))*12+(y.entered===s.turn&&!c.speedAttacker&&!api.isEvolution(y)?15:0);
   }
  }
  else if(d.op==='GroupGrant364'){for(const {y}of groupPowerRows(s,{...t,...d})){const c=effective(y,s);if(d.grant.speedAttacker&&s.active===t.p&&y.entered===s.turn&&!y.tapped&&!c.speedAttacker&&!c.noAttack&&!c.noPlayerAttack)score+=14+cost(c);if(d.grant.slayer&&!c.slayer&&creatures(s,1-t.p).some(z=>!z.sealed))score+=8;if(s.active===t.p&&!y.tapped&&!c.noAttack&&(y.entered<s.turn||c.speedAttacker||c.evolution)){if(d.grant.unblockable&&!c.unblockable&&!c.noPlayerAttack&&creatures(s,1-t.p).some(z=>!z.sealed&&!z.tapped&&effective(z,s).blocker))score+=12+cost(c);if(d.grant.attackUntapped&&!c.attackUntapped&&!c.noCreatureAttack&&creatures(s,1-t.p).some(z=>!z.sealed&&!z.tapped&&!effective(z,s).cannotBeAttacked&&(!effective(z,s).justDiver||!z.justDiverActive)&&(!effective(z,s).flying||c.flying)&&(api.power(y,true,s)>=api.power(z,false,s)||c.slayer)))score+=12+cost(c);}}}
  else if(d.op==='GroupPower')score+=groupPowerScore(s,{...t,...d,...(d.g561DarkMana?{power:s.players[t.p].mana.filter(y=>!y.faceDown&&api.manaColors(card(y),s,t.p).includes('闇')).length*1000}:{})});
  else if(d.op==='Sweep')score+=creatures(s,1-t.p).filter(y=>matches(s,1-t.p,y,d.filter)).reduce((n,y)=>n+12+cost(effective(y,s))*2+api.power(y,false,s)/3000,0);
  else if(d.op==='Discard')score+=d.owner==='self'?-Math.min(d.n||1,own.hand.length)*5:Math.min(d.n||1,opp.hand.length)*9;
  else if(d.op==='HandCycle460'&&d.to==='grave'&&d.mode==='all'){const n=d.fixedDraw??own.hand.length+(d.extra||0);score+=n>=deckCount&&n>0?(creatures(s,t.p).some(y=>effective(y,s).shako)?1000:-1000):own.hand.length?10+(d.extra||0)*10:0;}
  else if(d.op==='Select'&&d.g510Untap){score+=list(s,{...t,...d,selected:[]}).filter(r=>r.x.tapped&&api.canUntap(r.x)).map(r=>selectedBattleScore(s,{...t,...d},r.x,[],d.n)).sort((a,b)=>b-a).slice(0,d.n).reduce((a,b)=>a+b,0);}
  else if(d.op==='Select'&&d.g190Freeze){const rows=list(s,{...t,...d,selected:[]}),legal=new Set(targetOptions(s,t.p,rows.map(r=>r.x)).map(o=>o.value));score+=rows.filter(r=>legal.has(r.x.uid)).map(r=>8+cost(effective(r.x,s))+(effective(r.x,s).blocker?4:0)).sort((a,b)=>b-a).slice(0,d.n).reduce((a,b)=>a+b,0);}
  else if(d.op==='Select'){const rows=list(s,{...t,...d,selected:[]});score+=rows.length?d.to==='hand'?10+Math.max(...rows.map(r=>cost(card(r.x)))):own.mana.length<6?16:7:0;}
 }return score;}
 // Marshall Touch snapshots the selected creature's visible cost before movement.
 const marshalDefs558=(t,n)=>(t.defs||[]).map(d=>d.g558ReturnedCost?{...d,filter:{...d.filter,...(n===Infinity?{}:{max:n})}}:d);
 function marshalRows558(s,t){const rows=creatures(s,t.p).filter(y=>!y.sealed&&!api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))&&(!t.filter||matches(s,t.p,y,t.filter))),legal=new Set(targetOptions(s,t.p,rows).map(o=>o.value));return rows.filter(y=>legal.has(y.uid));}
 function marshalValue558(s,t,y){const c=effective(y,s),defs=marshalDefs558(t,cost(c)),leaves=api.canLeave(s,t.p,y),penalty=leaves?4+Math.min(24,cost(c)*2)+Math.min(8,api.power(y,false,s)/3000):0,projected=leaves?{...s,players:s.players.map((v,p)=>p===t.p?{...v,battle:v.battle.filter(x=>x!==y)}:v)}:s;let score=modeScore(projected,t,defs);for(const d of defs){if(d.op==='ShinkaGrant397'){const host=sourceHost474(projected,t);if(host&&host.p===t.p&&s.active===t.p&&!host.x.tapped&&!effective(host.x,s).noAttack)score+=d.grant?.speedAttacker&&host.x.entered===s.turn?18+cost(effective(host.x,s)):4;}if(d.op==='Sweep'&&d.both)score-=creatures(projected,t.p).filter(x=>!x.sealed&&matches(projected,t.p,x,d.filter)&&api.canLeave(s,t.p,x)&&!hooks.destroySafe409(s,x)).reduce((n,x)=>n+12+cost(effective(x,s))*2+api.power(x,false,s)/3000,0);}return Math.max(-1000,Math.min(1000,score-penalty+(y.tapped?4:0)));}
 // Sacrifice is optional; use only public enemy information to value the payoff.
 function seedReviveValue547(s,t,v,canDie){const d=t.defs?.[0];if(!d||!api.canMoveZone(s,t.p,'grave'))return-1000;const rows=list(s,{...t,...d,selected:[]}).map(r=>r.x);if(canDie&&matches(s,t.p,v,d.filter)&&canPut(s,t.p,v,'grave'))rows.push(v);if(!rows.length)return-1000;return Math.max(...rows.map(y=>{const c=card(y),entry=modeScore(s,{...t,source:y.cardId},c.g34Tasks||[]);return entry<=-900?-1000:10+cost(c)*3+entry;}));}
 function sacrificeValue413(s,t,defs){let score=modeScore(s,t,defs);if(score<=-900)return score;for(const d of defs){if(d.op==='Untap'&&d.g191First)score+=selfUntapValue542(s,t);else if(d.op==='OpponentSelect'){const xs=creatures(s,1-t.p).filter(y=>!y.sealed&&matches(s,1-t.p,y,d.filter));if(xs.length)score+=Math.min(...xs.map(y=>12+cost(effective(y,s))*2+api.power(y,false,s)/3000));}else if(d.op==='Select'&&d.owner==='opponent'&&d.origin==='battle'&&d.to==='grave'&&d.n===1)score+=modeScore(s,t,[{...d,op:'Target'}])-modeScore(s,t,[d]);else if(d.op==='DrawUpTo')score+=Math.min(d.n,Math.max(0,s.players[t.p].deck.length-1))*(s.players[t.p].hand.length<3?12:8);else if(d.op==='Look'&&d.g201Search&&!api.deckLocked(s,t.p)&&s.players[t.p].deck.length>1){const xs=s.players[t.p].deck.filter(y=>matches(s,t.p,y,d.stages[0].filter));if(xs.length)score+=10+Math.min(10,Math.max(...xs.map(y=>cost(card(y)))));}}return score;}
 function doPut(s,t,base=null){const owner=t.owner??t.p,own=s.players[owner],x=own[t.origin]?.find(x=>x.uid===t.target);if(!x||t.g550CostBudget!==undefined&&(x.zoneSerial||0)!==(t.serial550||0))return;if(t.execution&&faces(card(x))[t.face||0]?.type==='spell'){release(s,owner,x.uid);if(!api.canCast(s,t.p,faces(card(x))[t.face||0],t.origin))return;cast(s,t.p,x.uid,!t.payment,base,t.face||0,t.payment||null,t.origin);return;}if(!canPut(s,t.p,x,t.origin,!!t.execution)||card(x).gCastle&&!api.canAddShield(s,t.p))return;own.g34ManaHeld=(own.g34ManaHeld||[]).filter(uid=>uid!==x.uid);if(t.origin==='deck')release(s,owner,x.uid);if(t.execution)cast(s,t.p,x.uid,!t.payment,base,t.face||0,t.payment||null,t.origin,t.reason||'カードの能力');else{remove(own[t.origin],x.uid);if(card(x).gCastle){clear(x,'shields');x.faceUp=true;s.players[t.p].shields.push(x);api.notifyShieldAdded(s,t.p,x);(s.noManaUse??=[false,false])[t.p]=true;return;}clear(x,'battle');enter(s,t.p,x,base,{origin:t.origin,execution:false,tapped:!!t.tapped,...(t.g745Magibomber?{g745Magibomber:true}:{}),...(t.g781HyperEntry?{g781HyperEntry:t.source}:{}),...(t.g785Group===undefined?{}:{g785Group:t.g785Group}),...(t.g771DeploySpeed||t.g774Banky?{g771SpeedSpell:t.source,g774Banky:t.g774Banky}:{}),...(t.g791Grant?{g791Grant:t.g791Grant,g791Spell:t.source,g793FightOnEntry:t.g793FightOnEntry}:{})});if(t.delayed){x.g34Delayed={turn:s.turn,to:t.delayed,source:t.source,controller:t.controller??t.p};if(t.drawOnBottom)x.g35DrawOnBottom=true;}if(t.grant){(x.g34Grants??=[]).push({turn:s.turn,...t.grant});}}}
 // Mana-triggered self buffs and optional hand refills use only public state.
 function spaceScore455(s,t,defs){return defs.reduce((n,d)=>{const own=s.players[t.p];if(d.op==='Sequence')return n+spaceScore455(s,t,d.defs);if(d.op==='NextReduction456')return n+(s.active===t.p?Math.min(20,d.amount*4):0);if(d.op==='DrawUpTo')return n+Math.min(d.n,Math.max(0,own.deck.length-1))*10;if(d.op==='DiscardAll244')return n-own.hand.length*8;if(d.op==='OpponentSelect'){const rows=creatures(s,1-t.p).filter(y=>!y.sealed&&matches(s,1-t.p,y,d.filter));return n+(rows.length?10+Math.min(...rows.map(y=>cost(effective(y,s))*2)):0);}if(d.op==='Target'&&d.owner==='self'){const rows=creatures(s,t.p).filter(y=>!y.sealed&&matches(s,t.p,y,d.filter)),legal=new Set(targetOptions(s,t.p,rows).map(o=>o.value));return n+Math.max(0,...rows.filter(y=>legal.has(y.uid)).map(y=>d.grant?.slayer?8:s.active===t.p&&!y.tapped?8+(d.g455ExtraBreak?6:0):0));}if(d.op==='SelfBoost313'||d.op==='SelfExtraBreak444'){const x=live(s,t);return n+(x&&s.active===t.p&&!x.tapped?8:0);}return n+modeScore(s,t,[d]);},0);}
 // Each player chooses their own card in turn order, before either selected card moves.
 function eachPlayer459(s,t){
  const order=t.order||[s.active,1-s.active],selected=t.selected||[],index=t.index||0;
  if(index<order.length){const p=order[index],rows=list(s,{...t,p,owner:'self',selected:[],g187OwnPick:true,filter:t.origin==='battle'?{creature:true,...t.filter}:t.filter});
   const next={...t,p,order,index,selected,effectPlayer:t.effectPlayer??t.p,controller:t.controller??t.p};
   if(!rows.length){put(s,{...next,index:index+1});return;}
   const title=t.discard?'捨てる自分の手札を1枚選ぶ':t.origin==='battle'?(t.to==='grave'?'破壊する':'マナに置く')+'自分のクリーチャーを1体選ぶ':(t.to==='mana'?'マナに置く':'山札の上に置く')+'自分の手札を1枚選ぶ';
   choice(s,next,title,rows.map(r=>opt(card(r.x).name,{p,uid:r.x.uid,incarnation:r.x.incarnation||0,serial:r.x.zoneSerial||0},-cost(card(r.x)),r.x.cardId)));return;
  }
  const valid=selected.filter(r=>s.players[r.p][t.origin].some(x=>x.uid===r.uid&&(x.incarnation||0)===r.incarnation&&(x.zoneSerial||0)===r.serial));
  if(t.origin==='battle'){move(s,valid.map(r=>({player:r.p,uid:r.uid,to:t.to,destroy:t.to==='grave',controller:t.controller??t.effectPlayer})));return;}
  if(t.discard){for(const r of [...valid].reverse())api.discardSelected(s,r.p,[r.uid],t.source,t.effectPlayer);return;}
  for(const r of valid)zoneMove(s,r.p,t.origin,r.uid,t.to,{...t,g183Return:t.to==='deckTop',g182HandMana:t.origin==='hand'&&t.to==='mana'});
 }
 // These clauses refer to the chosen hand size, even when discarding is replaced (official 31661).
 function handCycle460(s,t){
  const own=s.players[t.p],selected=t.selected||[],ids=t.ids||own.hand.map(x=>x.uid);
  if(t.to==='deck'){
   if(t.order){
    const left=ids.filter(uid=>!selected.includes(uid)&&own.hand.some(x=>x.uid===uid));
    const bounded=t.max!==undefined;
    if(bounded?selected.length<t.max&&left.length:left.length>1){
     choice(s,{...t,ids,selected},'山札の下に置く順序を選ぶ（最初が上）',[
      ...left.map(uid=>{const x=own.hand.find(y=>y.uid===uid);return opt(card(x).name,uid,0,x.cardId);}),
      ...(bounded?[opt('この枚数で確定',null,0)]:[])
     ]);
     return;
    }
    finishBottomCycle460(s,t,bounded?selected:[...selected,...left]);
    return;
   }
   const ps=t.both?[s.active,1-s.active]:[t.p],counts=ps.map(p=>t.fixedDraw??s.players[p].hand.length);
   put(s,task('g34_CycleDrawAll460',t.p,t.source,{ps,counts}));
   for(const p of [...ps].reverse()){const added=[...s.players[p].hand];for(const x of added){remove(s.players[p].hand,x.uid);clear(x,'deck');}api.shuffleLibrary(s,p,added,t.source);}return;
  }
  if(t.optional&&!t.accepted){const n=t.fixedDraw??own.hand.length+(t.extra||0),score=n>=own.deck.length?-1000:10+(t.extra||0)*10;choice(s,t,'手札をすべて捨てて、'+(t.fixedDraw!==undefined?t.fixedDraw:'捨てた枚数'+(t.extra?'＋'+t.extra:''))+'枚引く？',[opt('入れ替える',true,score),skip()]);return;}
  const cap=Math.min(t.max??ids.length,ids.length),available=ids.filter(uid=>!selected.includes(uid)&&own.hand.some(x=>x.uid===uid));
  if(t.mode==='any'&&selected.length<cap&&available.length){choice(s,{...t,ids,selected},'捨てる手札を選ぶ（'+selected.length+'枚選択済み）',[...available.map(uid=>{const x=own.hand.find(y=>y.uid===uid);return opt(card(x).name,uid,own.deck.length<=selected.length+(t.extra||0)+1?-1000:3-cost(card(x)),x.cardId);}),opt('この枚数で確定',null,0)]);return;}
  finishCycle460(s,t,t.mode==='all'?ids:selected);
 }
 function finishBottomCycle460(s,t,ids){
  const moved=ids.filter(uid=>zoneMove(s,t.p,'hand',uid,'deck',t)).length;
  api.draw(s,t.p,moved+(t.extra||0));
 }
 const discardOwner584=t=>t.blind||t.owner==='opponent'?1-t.p:t.p;
 function discardFollow584(s,t,x){
  const owner=discardOwner584(t);
  const discardedColors=t.g914SharedManaColor?
   faces(api.zoneCard(s,owner,x,'hand')).flatMap(colors).filter(c=>civilizations805.includes(c)):null;
  api.discardSelected(s,owner,[x.uid],t.source,t.controller??t.p,null,{...t,op:'g34_AfterHandFollow584',
   matched:matches(s,owner,x,t.filter),...(discardedColors?{discardedColors}:{})});
 }
 function finishCycle460(s,t,ids){const selected=ids.filter(uid=>s.players[t.p].hand.some(x=>x.uid===uid));api.discardSelected(s,t.p,selected,t.source,t.p,null,{op:'g34_CycleDraw460',p:t.p,source:t.source,n:t.fixedDraw??selected.length,extra:t.extra||0});}
 // Reveal complete physical hand cards; twinpacts contribute both civilizations but count once.
 function handReveal462(s,t){const own=s.players[t.p],selected=t.selected||[],shown=own.hand.filter(x=>selected.includes(x.uid)),max=t.max??own.hand.length,rows=own.hand.filter(x=>!selected.includes(x.uid)&&matches(s,t.p,x,t.filter));
  if(selected.length>=max||!rows.length){finishReveal462(s,t,shown);return;}
  const seen=new Set(shown.flatMap(x=>faces(card(x)).flatMap(colors))),ready=t.needColors?.every(c=>seen.has(c));
  const score=x=>{if(t.drawEach||t.rampEach)return shown.length+1>=own.deck.length?-1000:10;if(t.powerEach)return creatures(s,t.p).filter(y=>!y.sealed).length?8:0;if(t.needColors){const added=new Set(faces(card(x)).flatMap(colors));return t.needColors.filter(c=>!seen.has(c)&&added.has(c)).length*20-2;}if(t.defs?.some(d=>d.op==='Draw'||d.op==='Ramp'))return own.deck.length>1?10:-1000;return 5;};
  choice(s,{...t,selected},'効果のために見せる手札を選ぶ（'+selected.length+'枚選択済み）',[...rows.map(x=>opt(card(x).name,x.uid,score(x),x.cardId)),opt(selected.length?'この枚数で確定':'見せずに進む',null,ready?25:0)]);
 }
 function finishReveal462(s,t,shown){if(!shown.length){if(t.elseDefs)start(s,t,t.elseDefs);return;}for(const x of shown)api.log(s,t.p,'reveal',card(t.source).name+'で手札公開：'+card(x).name,{cardId:x.cardId,source:t.source});
  const seen=new Set(shown.flatMap(x=>faces(card(x)).flatMap(colors)));if(t.needColors&&!t.needColors.every(c=>seen.has(c)))return;
  if(t.g853EachDraw){
   const draw=p=>task('g34_DrawUpTo',p,t.source,{n:shown.length,controller:t.p,g853EachDraw:true});
   put(s,draw(t.p),draw(1-t.p));
   return;
  }
  if(t.drawEach)start(s,t,[{op:'Draw',n:shown.length}]);else if(t.rampEach)start(s,t,[{op:'Ramp',n:shown.length,tapped:true}]);else if(t.powerEach)start(s,t,[{op:'GroupPower',owner:'self',filter:{creature:true},power:t.powerEach*shown.length}]);else start(s,t,t.defs);
 }
 const destinationName467={shields:'シールド化する',hand:'手札に加える',mana:'マナゾーンに置く',grave:'墓地に置く',deckTop:'山札の上に置く',deck:'山札の下に置く'};
 function lookDestination467(s,t){const stage=t.stages[t.stage],own=s.players[t.p],y=own.deck.find(x=>x.uid===t.chosen[0]);if(!y){put(s,{...t,op:'g34_LookPick',chosen:[]});return;}choice(s,t,'選んだカードをどこに置く？',stage.g467Destinations.map(to=>opt(destinationName467[to],to,to==='hand'?(own.hand.length<3?20:12):to==='mana'?(own.mana.length<6?18:8):3,t.g467Blind?undefined:y.cardId)));}
 function targetDestination467(s,t){const r=t.target,y=s.players[r.p].battle.find(x=>x.uid===r.uid&&(x.incarnation||0)===r.incarnation&&!x.sealed);if(!y){if(t.after)start(s,t,t.after);return;}const controller=t.g472OwnerDestination?{...t,p:r.p,g472EffectPlayer:t.p}:t;choice(s,controller,'選んだクリーチャーをどこに置く？',t.g467Destinations.map(to=>opt(destinationName467[to],to,to==='grave'?(hooks.destroySafe409(s,y)?-5:30+cost(card(y))):to==='hand'?15:to==='deckTop'?20:10,y.cardId)));}
 function revealDiscard839(s,t){
  const owner=1-t.p,hand=s.players[owner].hand,selected=t.selected||[];
  const remaining=hand.filter(x=>!selected.includes(x.uid));
  const needed=2-selected.length;
  if(remaining.length>needed&&needed){
   choice(s,{...t,selected},'見せる手札を2枚選ぶ（'+selected.length+'枚選択済み）',
    remaining.map(x=>opt(card(x).name,x.uid,-cost(card(x)),x.cardId)),owner);
   return;
  }
  const shown=hand.filter(x=>selected.includes(x.uid)||remaining.length<=needed);
  for(const x of shown)api.log(s,owner,'reveal',card(t.source).name+'で手札公開：'+card(x).name,{cardId:x.cardId,source:t.source});
  if(shown.length===1)api.discardSelected(s,owner,[shown[0].uid],t.source,t.p);
  if(shown.length===2)choice(s,{...t,shown:shown.map(x=>x.uid)},'公開された手札から捨てさせるカードを選ぶ',
   shown.map(x=>opt(card(x).name,x.uid,cost(card(x)),x.cardId)));
 }
 const ownGraveSource839=(own,t)=>own.grave.find(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)&&(y.zoneSerial||0)===t.serial);
 function run(s,t){if(fifteen.run(s,t))return true;if(!t.op.startsWith('g34_'))return false;const own=s.players[t.p],opp=s.players[1-t.p],x=live(s,t);switch(t.op){
 // Evo Charger continues after the physical spell has completed its move to mana.
 case'g34_EvoCharge566':{const hosts=creatures(s,t.p).filter(y=>!y.sealed&&api.isEvolution(y)),rows=own.mana.filter(y=>!y.faceDown&&faces(card(y)).some(c=>c.type==='creature'));if(!api.canMoveZone(s,t.p,'mana')||!hosts.length||!rows.length)break;if(!t.host)choice(s,t,'進化元を追加する自分の進化クリーチャーを選ぶ（任意）',[...hosts.map(y=>opt(card(y).name,{uid:y.uid,incarnation:y.incarnation||0},8,y.cardId)),skip()]);else if(hosts.some(y=>key(y)===key(t.host)))choice(s,t,'進化元に追加するマナのクリーチャーを選ぶ（任意）',[...rows.map(y=>opt(card(y).name,{uid:y.uid,serial:y.zoneSerial||0},6-cost(card(y)),y.cardId)),skip()]);break;}
 case'g34_Bind566':{const caster=t.caster??t.p,stage=t.stage||0;if(stage<2){const chooser=stage?1-caster:caster,rows=creatures(s,chooser).filter(y=>!y.sealed);if(!rows.length)put(s,{...t,p:caster,caster,stage:stage+1});else choice(s,{...t,p:chooser,caster,stage},'攻撃できる自分のクリーチャーを1体選ぶ',rows.map(y=>opt(card(y).name,{uid:y.uid,incarnation:y.incarnation||0},api.power(y,false,s)/1000,y.cardId)));}else{const chosen=t.chosen||[];for(const who of[0,1])for(const y of creatures(s,who))if(!y.sealed&&!chosen.includes(key(y)))(y.g35NoAttack??=[]).push({turn:s.turn,g566SpellCost:cost(card(t.source)),g566Controller:caster},{turn:s.turn+1,g566SpellCost:cost(card(t.source)),g566Controller:caster});}break;}
 case'g34_OpponentChooseAttacker916':{
  const player=1-t.p;
  if(s.active!==player)break;
  const eligible=api.availableAttackers916(s);
  const options=opp.battle.filter(y=>eligible.has(y.uid)).map(y=>
   opt(card(y).name,{uid:y.uid,incarnation:y.incarnation||0},-api.power(y,false,s)/1000,y.cardId));
  choice(s,t,'攻撃できる自分のクリーチャーを1体選ぶ',options,player);
  break;
 }
 case'g34_PowerAttack593':(s.extLimits??=[]).push({kind:'g593AttackPower',player:t.both?null:1-t.p,max:t.max,playerOnly:!!t.playerOnly,expires:'start',who:t.p,spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))});break;
 case'g34_EntryStop593':(s.extLimits??=[]).push({kind:'attack',player:1-t.p,...t.subject,controller:t.p,expires:'end',who:s.active});break;
 case'g34_PlayerGuard750':
  if(s.active===t.p)(s.extLimits??=[]).push({kind:'g750CannotAttackPlayer',player:t.p,turn:s.turn+1,expires:'end',who:1-t.p});
  break;
 case'g34_PlayerStop567':(s.extLimits??=[]).push({kind:'g567PlayerStop',player:t.owner==='self'?t.p:1-t.p,controller:t.p,expires:t.g567PlayerStop,who:t.g567PlayerStop==='start'?t.p:s.active,spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))});break;
 case'g34_Entry468':{const mode=t.mode,host=mode==='protect565'?sourceHost474(s,{uid:t.subject?.uid,incarnation:t.subject?.incarnation})?.x:attackHost408(s,{...t,g399Attacker:t.subject}),y=host&&!host.sealed&&api.isCreature(s,host)?host:null;if(mode==='draw')start(s,t,[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]);else if(mode==='freeze')start(s,t,[{op:'Target',tap:true,lock:true}]);else if(y){if(mode==='fight')put(s,{...t,op:'g34_FightEnemy240',fighter:{uid:y.uid,incarnation:y.incarnation||0},optional:true});else if(mode==='protect565')(s.extLimits??=[]).push({kind:'g521Grant',g565External:true,ref:{uid:y.uid,incarnation:y.incarnation||0},grant:{untargetable:true,cannotBeAttacked:true},expires:'start',who:t.p});else if(mode==='mach')(y.g34Grants??=[]).push(timedGrant335(s,t,{machFighter:true}));else if(mode==='rush')put(s,task('g13_JagaGrant',t.p,t.source,{target:y.uid,targetInc:y.incarnation||0}));}break;}
 case'g34_LookDestination467':lookDestination467(s,t);break;
 case'g34_TargetDestination467':targetDestination467(s,t);break;
 case'g34_NullBreaker471':break;
 case'g34_PayAura560':payAura560(s,t);break;
 case'g34_PayFloor500':payFloor500(s,t);break;
 case'g34_PayCount499':payCount499(s,t);break;
 case'g34_PaySpell485':paySpell485(s,t);break;
 case'g34_RevealPayment470':revealPayment470(s,t);break;
 case'g34_PayOnce464':payOnce464(s,t);break;
 case'g34_HandReveal462':handReveal462(s,t);break;
 case'g34_DrawReveal911':{
  const drawn=t.drawn||[];
  if(t.n>0){
   // Finish each draw, including replacements, before revealing the original draws.
   put(s,{...t,n:t.n-1,drawn});
   api.draw(s,t.p,1,{drawn});
   break;
  }
  const shown=drawn.map(uid=>own.hand.find(y=>y.uid===uid)).filter(Boolean);
  for(const y of shown)api.log(s,t.p,'reveal',card(t.source).name+'で手札公開：'+card(y).name,{cardId:y.cardId,source:t.source});
  if(shown.some(y=>matches(s,t.p,y,{g223Multicolor:true})))api.draw(s,t.p,1);
  break;
 }
 case'g34_PlayersDraw461':{const ps=t.activeOnly?[s.active]:[s.active,1-s.active],controller=t.controller??t.p,group=t.discard?String(s.g461DrawSerial=(s.g461DrawSerial||0)+1):null;if(group)(s.g461DrawGroups??={})[group]={ps,controller,source:t.source,discard:t.discard,drawn:[]};put(s,...ps.map(p=>task('g34_PlayerDraw461',p,t.source,{n:t.n,optional:!!t.optional,upTo:!!t.upTo,discard:t.discard||0,group,controller})),...(group?[task('g34_FinishPlayersDraw461',t.p,t.source,{group,controller})]:[]));break;}
 case'g34_PlayersDiscardDraw461':{const ps=[s.active,1-s.active],by=t.controller??t.p;put(s,task('g34_PlayersDraw461',t.p,t.source,{n:t.n,upTo:true,controller:by}));for(const p of [...ps].reverse())api.discardSelected(s,p,s.players[p].hand.map(x=>x.uid),t.source,by);break;}
 case'g34_PlayerDraw461':{
  if(t.upTo&&t.chosen===undefined){choice(s,t,'カードを'+t.n+'枚まで引く',Array.from({length:t.n+1},(_,n)=>opt(n+'枚引く',n,n+(s.startStep?.player===t.p?1:0)<own.deck.length?n*8:-1000)));break;}
  if(t.optional&&!t.accepted){choice(s,t,'カードを'+t.n+'枚引く？'+(t.discard&&Number.isInteger(t.discard)?'（引いたら手札を'+t.discard+'枚捨てる）':''),[opt('引く',true,own.deck.length>t.n+(s.startStep?.player===t.p?1:0)?10:-1000),skip()]);break;}
  const n=t.chosen??t.n;if(n>0){if(t.discard)put(s,task('g34_AfterPlayerDraw461',t.p,t.source,{before:own.drawsThisTurn||0,discard:t.discard,group:t.group,controller:t.controller??t.p}));api.draw(s,t.p,n);}break;
 }
 case'g34_AfterPlayerDraw461':{
  const drawn=(own.drawsThisTurn||0)-t.before;
  if(drawn<=0)break;
  const g=t.group&&s.g461DrawGroups?.[t.group];
  if(g)g.drawn.push(t.p);
  else put(s,task('discard',t.p,t.source,{n:t.discard==='drawn'?drawn:t.discard,causedBy:t.controller??t.p,selfDiscard:(t.controller??t.p)===t.p}));
  break;
 }
 case'g34_FinishPlayersDraw461':{const g=s.g461DrawGroups?.[t.group];if(g){delete s.g461DrawGroups[t.group];put(s,...g.ps.filter(p=>g.drawn.includes(p)).map(p=>task('discard',p,g.source,{n:g.discard,causedBy:g.controller,selfDiscard:g.controller===p,controller:g.controller})));}break;}
 // Match the chosen physical card before discard replacements, then use the batch's actual result.
 case'g34_DiscardMatch517':if(!own.hand.length)api.draw(s,t.p,1);else choice(s,t,'捨てる手札を1枚選ぶ',own.hand.map(y=>{const n=1+(matches(s,t.p,y,t.filter)?1:0);return opt(card(y).name,y.uid,(own.deck.length<=n?-1000:15+(n-1)*10)-Math.min(30,cost(card(y))),y.cardId);}));break;
 case'g34_HandFollow584':{
  const owner=discardOwner584(t),hand=s.players[owner].hand;
  if(!hand.length||owner!==t.p&&api.handProtected(s,{p:owner,source:t.source,causedBy:t.controller??t.p})){
   start(s,t,t.always||[]);break;
  }
  if(t.blind){discardFollow584(s,t,hand[Math.floor(api.random(s)*hand.length)]);break;}
  choice(s,t,'捨てる手札を1枚選ぶ',[...hand.map(x=>opt(card(x).name,x.uid,12+(matches(s,owner,x,t.filter)?7:0)-Math.min(24,cost(card(x))),x.cardId)),...(t.optional?[skip()]:[])],owner);
  break;
 }
 case'g34_AfterHandFollow584':{
  // A discard replacement does not supply a discarded card (QA45267).
  const matched=t.g914SharedManaColor?t.discarded&&own.mana.some(x=>
   api.manaColors(x.faceDown?{civilizations:[]}:api.zoneCard(s,t.p,x,'mana'),s,t.p)
    .some(c=>t.discardedColors.includes(c))):t.matched;
  start(s,t,[...(t.always||[]),...(t.discarded?(t.success||[]):[]),...(t.discarded&&matched?t.then:[])]);
  break;
 }
 case'g34_DrawAfterDiscard517':api.draw(s,t.p,1+(t.discarded&&t.matches?1:0));break;
 case'g34_HandCycle460':handCycle460(s,t);break;
 case'g34_CycleDrawAll460':for(let i=0;i<t.ps.length&&s.winner===null;i++)if(t.counts[i])api.draw(s,t.ps[i],t.counts[i]);break;
 case'g34_CycleDraw460':if(t.n+t.extra>0)api.draw(s,t.p,t.n+t.extra);break;
 case'g34_EachPlayer459':eachPlayer459(s,t);break;
 case'g34_NextReduction456':(s.extLimits??=[]).push({kind:'g456NextReduction',player:t.p,turn:s.turn,type:t.type,amount:t.amount,optional:!!t.optional,filter:t.filter||{},source:t.source,expires:'end',who:s.active});break;
 case'g34_SpaceCharge454':{const choices=[];for(let mask=1;mask<2**t.rules.length;mask++){const selected=t.rules.flatMap((r,i)=>mask&(2**i)?[i]:[]);choices.push(opt(selected.map(i=>t.rules[i].color).join('・')+'の効果を使う',selected,selected.reduce((v,i)=>v+spaceScore455(s,t,t.rules[i].defs),0)));}choice(s,t,'スペース・チャージ：使う効果を選ぶ（記載順に解決）',[...choices,skip()]);break;}
 case'g34_ManaReveal449':{const c=card(t.source);if(api.spellIgnored(s,c))break;const rows=own.hand.filter(y=>new Set(faces(card(y)).flatMap(colors)).size>1);if(rows.length)choice(s,t,'手札の多色カードを1枚見せて、マナに置いたカードをアンタップする？',[...rows.map(y=>opt(card(y).name,y.uid,10,y.cardId)),skip()]);break;}
 case'g34_EntryCross728':{
  const gears=crossGears728(s,t.p).filter(x=>!t.selected.includes(x.uid));
  choice(s,t,'クロスするギアを選ぶ（選択済み '+t.selected.length+' 枚）',[
   ...gears.map(x=>opt(card(x).name,x.uid,t.selected.length?0:x.crossedTo?3:20,x.cardId)),
   opt('この枚数で出す',null,t.selected.length?10:-5)
  ]);
  break;
 }
 case'g34_EntryTap432':{const y=own.g34Holding?.find(y=>y.uid===t.target);if(y){const defend=card(y).g431AttackMe&&!api.ignored(s,y);choice(s,t,card(y).name+'をタップして出す？',[opt('タップして出す',true,defend?10:0,y.cardId),opt('アンタップして出す',false,defend?0:1,y.cardId)]);}break;}
 case'g34_Yobi398':put(s,task('g19Yobi',t.p,t.source,{max:cost(card(t.source))}));break;
 // Remember the first ramped card's characteristics before replacement or zone clearing.
 case'g34_RampCheck411':{const y=api.takeTop(s,t.p);if(!y){api.deckCheck(s,t.p);break;}const c=api.zoneCard(s,t.p,y),creature=faces(c).some(f=>f.type==='creature'),hit=t.kind==='match'&&(t.filter.g583PrintedMinPower!==undefined?faces(c).some(f=>f.type==='creature'&&(f.power==='∞'||Number(f.power)>=t.filter.g583PrintedMinPower)):matches(s,t.p,y,t.filter)),costs=[...new Set(faces(c).map(cost))].map(n=>n===Infinity?'∞':n),to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';clear(y,to);if(to==='mana'&&t.tapped)y.tapped=true;api.addZone(s,t.p,to,y);if(t.kind==='selfUnlessCreature'&&!creature)start(s,t,[{op:'SelfMana297'}]);else if(hit)start(s,t,[{op:'Ramp',n:1,...(t.tapped?{tapped:true}:{})}]);else if(t.kind==='costSweep')put(s,{...t,op:'g34_RampCost411',costs});api.deckCheck(s,t.p);break;}
 case'g34_RampCost411':{if(t.costs.length===1){start(s,t,[{op:'Sweep',both:true,to:'mana',filter:{creature:true,...(t.costs[0]==='∞'?{}:{max:t.costs[0]})}}]);break;}choice(s,t,'マナに置いたツインパクトのどちらのコストを参照する？',t.costs.map(n=>{const cap=n==='∞'?Infinity:n,score=[t.p,1-t.p].reduce((sum,p)=>sum+creatures(s,p).filter(y=>!y.sealed&&cost(effective(y,s))<=cap).reduce((v,y)=>v+(p===t.p?-1:1)*(5+cost(effective(y,s))*2),0),0);return opt('コスト'+n,n,score);}));break;}
 case'g34_OnlyAttacker677':{
  const player=t.own?t.p:1-t.p;
  const refs=t.own?[key(t)]:t.g399Attacker.refs;
  (s.extLimits??=[]).push({kind:'g677OnlyAttacker',player,refs,controller:t.p,expires:'end',who:s.active});
  break;
 }
 case'g34_OpponentTopGrave866':{
  const ids=look(s,{...t,p:1-t.p,n:2,public:true});
  if(ids.length)choice(s,{...t,ids},'墓地に置く相手の山札のカードを1枚選ぶ',
   ids.map(uid=>{const y=opp.deck.find(x=>x.uid===uid);return opt(card(y).name,uid,10,y.cardId);}));
  break;
 }
 case'g34_Poker763':{
  const opponent=1-t.p,[uid]=look(s,{...t,p:opponent,n:1,public:true});
  const revealed=opp.deck.find(x=>x.uid===uid);
  if(!revealed)break;
  const costs=[...new Set(faces(card(revealed)).map(f=>cost(f)))];
  if(!zoneMove(s,opponent,'deck',uid,'deck')){release(s,opponent,uid);break;}
  if(costs.length===1){
   if(costs[0]>=5)start(s,t,[{op:'AfterAttack542',defs:[{op:'Untap',g191First:true}]}]);
  }else choice(s,t,'公開したカードのどちらのコストを参照する？',
   costs.map(n=>opt('コスト'+(n===Infinity?'∞':n),n>=5,n>=5?20:0,revealed.cardId)));
  break;
 }
 case'g34_AttackerMana762':{
  const player=1-t.p,attacker=attackHost408(s,{...t,p:player});
  if(attacker&&!attacker.sealed&&api.isCreature(s,attacker))
   move(s,[{player,uid:attacker.uid,to:'mana',controller:player}]);
  break;
 }
 case'g34_EntryMach762':{
  const host=sourceHost474(s,t.subject)?.x;
  if(host&&!host.sealed&&api.isCreature(s,host))applyGrant(s,{...t,grant:{machFighter:true}},host);
  break;
 }
 case'g34_AttackEffect409':{if(attackHost408(s,t))(s.extLimits??=[]).push({kind:'g409AttackEffect',player:t.p,ref:t.g399Attacker,effect:t.kind,expires:'start',who:t.p});break;}
 case'g34_AttackHandDeploy798':{
  if(used792(s,t,t))break;
  const host=sourceHost474(s,t.g399Attacker)?.x;
  const ceiling=host?cost(effective(host,s)):t.g399Attacker.cost;
  const filter={creature:true,...(ceiling==='∞'||ceiling===Infinity?{}:{max:ceiling})};
  start(s,t,[{op:'Select',origin:'hand',filter,deploy:true,n:1,optional:true,g792Once:t.g792Once,
   title:'攻撃したクリーチャー以下のコストのクリーチャーを手札から出す？'}]);
  break;
 }
 case'g34_AttackDeploy409':{const host=attackHost408(s,t),budget=host?cost(effective(host,s)):t.g399Attacker?.cost==='∞'?Infinity:t.g399Attacker?.cost;if(budget>0)start(s,t,[{op:'Select',origin:'mana',filter:{creature:true},deploy:true,n:2,optional:true,g409Budget:budget===Infinity?'∞':budget,title:'合計コストが'+(budget===Infinity?'∞':budget)+'未満になるよう2体まで選ぶ'}]);break;}
 case'g34_AttackOtherMana409':{const attacker=attackHost408(s,t),enemies=creatures(s,1-t.p).filter(y=>!y.sealed),rows=creatures(s,t.p).filter(y=>!y.sealed&&y!==attacker);if(rows.length)choice(s,t,t.g399Attacker?'攻撃中のクリーチャー以外をマナに置く？':'マナに置く自分のクリーチャーを1体選ぶ（任意）',[...rows.map(y=>opt(card(y).name,{uid:y.uid,incarnation:y.incarnation||0},enemies.length?Math.min(...enemies.map(z=>cost(effective(z,s))*3))+4-cost(effective(y,s))*2:-10,y.cardId)),skip()]);break;}
 case'g34_AttackEndUntap408':if(attackHost408(s,t))(s.g408EndUntaps??=[]).push({p:t.p,source:t.source,g399Attacker:t.g399Attacker,turn:s.turn});break;
 case'g34_AttackUntap408':{
  const host=t.g764FollowControl&&t.g399Attacker?sourceHost474(s,t.g399Attacker):{p:t.p,x:attackHost408(s,t)},y=host?.x;
  if(y&&(!t.g562Creature||!y.sealed&&api.isCreature(s,y))&&api.canUntap(y)){
   const was=y.tapped;y.tapped=false;if(was)combined.untapped(s,host.p,y);
  }
  break;
 }
 case'g34_TapToUntap748':{
  const source=tapSource748(s,t);
  if(!source)break;
  if(t.otherAlly){
   const hasTappedAlly=creatures(s,t.p).some(ally=>ally!==source&&!ally.sealed&&ally.tapped&&api.canUntap(ally));
   choice(s,t,'このクリーチャーをタップして他の味方をアンタップする？',[opt('タップする',true,hasTappedAlly?20:-10),skip()]);
   break;
  }
  const target=attackHost408(s,t),score=target?.tapped&&api.canUntap(target)&&!target.sealed?20:-10;
  const subject=t.g758Attack?'攻撃クリーチャー':'バトルに勝ったグレートメカオー';
  choice(s,t,'このクリーチャーをタップして'+subject+'をアンタップする？',[opt('タップする',true,score),skip()]);
  break;
 }
 case'g34_AttackFight408':{if(t.g747Once&&parottaUsed747(s,t))break;const y=attackHost408(s,t);if(y&&api.isCreature(s,y)&&!y.sealed)put(s,{...t,op:'g34_FightEnemy240',fighter:{uid:y.uid,incarnation:y.incarnation||0},optional:true});break;}
 case'g34_AttackExtraBreak511':{const ref=t.g399Attacker;if(ref)start(s,{...t,uid:ref.uid,incarnation:ref.incarnation},[{op:'SelfExtraBreak444',amount:t.amount}]);break;}
 case'g34_GuardVision834':
  choice(s,t,'どちらの山札を確認しますか？',[opt('自分の山札',t.p,10),opt('相手の山札',1-t.p,8)]);
  break;
 case'g34_GuardOrder834':{
  const owner=s.players[t.owner],rows=t.ids.map(uid=>owner.deck.find(x=>x.uid===uid)).filter(Boolean);
  if(rows.length>1||rows.length===1&&!t.ordered.length){
   choice(s,t,rows.length===1?'山札のカードを確認する':'山札の上から置く順序を選ぶ',
    rows.map(x=>opt(card(x).name,x.uid,0,x.cardId)));
   break;
  }
  const order=[...t.ordered,...t.ids],selected=new Set(order);
  const byUid=new Map(owner.deck.filter(x=>selected.has(x.uid)).map(x=>[x.uid,x]));
  const sorted=order.flatMap(uid=>byUid.has(uid)?[byUid.get(uid)]:[]);
  let index=0;
  owner.deck=owner.deck.map(x=>selected.has(x.uid)?sorted[index++]:x);
  for(const uid of order)release(s,t.owner,uid);
  break;
 }
 case'g34_HauntedChoice833':
  choice(s,t,'どちらの山札の一番上を確認しますか？',[
   opt('自分の山札',t.p,10),opt('相手の山札',1-t.p,8)
  ]);
  break;
 case'g34_ReturnRecentDragons832':{
  const rows=creatures(s,t.p).filter(x=>!x.sealed&&(x.originalEntryTurn??x.entered)===s.turn&&
   !api.isEvolution(x)&&race(effective(x,s),'アーマード・ドラゴン'));
  if(rows.length)move(s,rows.map(x=>({player:t.p,uid:x.uid,to:'hand',destroy:false,controller:t.p})));
  break;
 }
 case'g34_HandShield832':{
  const opponent=t.owner==='opponent',owner=opponent?1-t.p:t.p;
  const rows=s.players[owner].hand;
  if(rows.length&&(opponent||api.canAddShield(s,owner)))
   choice(s,t,(opponent?'相手':'自分')+'の手札からシールドに置くカードを選ぶ（任意）',[
    ...rows.map(x=>opt(card(x).name,x.uid,opponent?cost(card(x)):5-cost(card(x)),x.cardId)),skip()
   ]);
  break;
 }
 case'g34_Soulburn832':{
  const [uid]=look(s,{...t,n:1,public:true});
  const x=own.deck.find(x=>x.uid===uid);
  if(!x)break;
  const c=card(x),bird=faces(c).some(f=>race(f,'ファイアー・バード'));
  const next={...t,op:'g34_SoulburnDragon832',target:uid,dragon:faces(c).some(f=>race(f,'ドラゴン')),
   sunburst:c.name==='超竜サンバースト・NEX'};
  if(bird&&canPut(s,t.p,x,'deck'))
   choice(s,{...next,op:'g34_SoulburnBird832'},'公開したファイアー・バードを出す？',[opt(c.name,uid,15,c.id),skip()]);
  else put(s,next);
  break;
 }
 case'g34_SoulburnDragon832':{
  const last={...t,op:'g34_SoulburnFinish832'};
  put(s,t.dragon?{...t,op:'g34_Target',to:'grave',filter:{maxPower:4000,g199Power:true}}:null,last);
  break;
 }
 case'g34_SoulburnFinish832':{
  const x=own.deck.find(x=>x.uid===t.target),base=own.battle.find(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)&&!y.sealed);
  if(t.sunburst&&x&&base&&canPut(s,t.p,x,'deck')&&api.evolutionBases(s,t.p,card(x)).includes(base))
   choice(s,t,'ソウルバーン・ドラゴンの上に進化させる？',[opt(card(x).name,base.uid,20,x.cardId),skip()]);
  else release(s,t.p,t.target);
  break;
 }
 case'g34_GhostRecovery878':
 case'g34_DeathRecovery831':{
  const ref=t.g831Subject;
  const subject=own.battle.find(x=>x.uid===ref.uid&&(x.incarnation||0)===ref.incarnation&&!x.sealed);
  const value=subject?cost(effective(subject,s)):t.g831LastCost??ref.cost;
  const limit=value===Infinity?'∞':value;
  if(t.op==='g34_GhostRecovery878')
   start(s,t,[{op:'Select',origin:'grave',n:1,deploy:true,optional:true,filter:{creature:true,race:'ゴースト',exactCost:limit}}]);
  else start(s,t,[{op:'Select',origin:'grave',n:1,to:'hand',optional:true,
   filter:{creature:true,g819CreatureNameIncludes:'死神',belowCost:limit}}]);
  break;
 }
 case'g34_CopyPower765':{
  const recipient=sourceHost474(s,t)?.x;
  if(!recipient||recipient.sealed||!api.isCreature(s,recipient))break;
  const subject=sourceHost474(s,t.g765Subject)?.x;
  const value=subject&&!subject.sealed
   ?api.isCreature(s,subject)?currentPower506(s,subject):0
   :t.g765LastPower;
  const amount=value==='∞'||value===Infinity?'∞':Math.max(0,Number(value)||0);
  if(amount)(recipient.powerModifiers??=[]).push({amount,expires:'start',who:t.p,g694ClearOnSeal:true});
  break;
 }
 case'g34_EntryBoost755':
 case'g34_DefenderBoost694':{
  const subject=t.subject??t.g694Defender;
  if(!subject)break;
  const host=sourceHost474(s,subject);
  if(host&&!host.x.sealed&&api.isCreature(s,host.x)){
   const duration=t.persistent?{}:{expires:'end',who:s.active};
   (host.x.powerModifiers??=[]).push({amount:t.power,...duration,g694ClearOnSeal:true});
  }
  break;
 }
 case'g34_SkipBlockedBattle694':
  if(s.attack?.g484Blocked)s.attack.g694SkipBattle=true;
  break;
 case'g34_AttackGrant399':{const ref=t.g399Attacker,host=ref&&own.battle.find(y=>api.allLayers(y).some(z=>z.uid===ref.uid&&(z.incarnation||0)===ref.incarnation));if(host){if(t.power)(host.powerModifiers??=[]).push({amount:t.power,expires:'end',who:s.active});if(t.grant)(host.g34Grants??=[]).push({turn:s.turn,...t.grant});}break;}
 case'g34_ShinkaWin446':if(own.battle.some(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))))(s.extLimits??=[]).push({kind:'g409AttackEffect',player:t.p,ref:{uid:t.uid,incarnation:t.incarnation||0},effect:'win',expires:'end',who:s.active});break;
 // QA40275: choosing to shield a hand card satisfies 'if you do' even if addition is prohibited.
 case'g34_ShieldExchange446':if(own.hand.length)choice(s,t,'シールドに置く手札を1枚選ぶ'+(t.optional?'（任意）':''),[...own.hand.map(y=>opt(card(y).name,y.uid,faces(card(y)).some(c=>c.trigger)?25:5,y.cardId)),...(t.optional?[skip()]:[])]);else if(!t.optional)put(s,{...t,op:'g34_ShieldHand',g238ShieldHand:true});break;
 case'g34_UseBlocker524':{const host=sourceHost474(s,t);if(host)(host.x.g34Grants??=[]).push({turn:s.turn,blocker:true});break;}
 case'g34_IfNeo563':if(sourceNeo563(s,t))start(s,t,t.defs);break;
 case'g34_IfSource541':{const host=sourceHost474(s,t);if(host&&!host.x.sealed&&(!t.evolution||api.isEvolution(host.x)))start(s,t,t.defs);break;}
 // Shinka creates delayed triggers tied to the physical base, rather than abilities of the current top.
 // Resolve Shinka against the evolved unit currently containing the physical base.
 case'g34_ShinkaHost544':{const host=sourceHost474(s,t);if(t.mode==='belowCost'){const n=host?cost(effective(host.x,s)):t.g399Attacker?.cost;if(n!==null&&n!==undefined)start(s,t,[{op:'Target',to:'grave',filter:{belowCost:n===Infinity?'∞':n}}]);}else if(t.mode==='fight'&&host&&!host.x.sealed&&api.isCreature(s,host.x))put(s,{...t,op:'g34_FightEnemy240',fighter:{uid:host.x.uid,incarnation:host.x.incarnation||0},fighterOwner:host.p,optional:true});break;}
 case'g34_ForceGroup546':force546(s,t,1-t.p);break;
 case'g34_GraveShuffle545':put(s,task('g22Shuffle',t.p,t.source,{optional:t.optional,owner:t.owner}));break;
 case'g34_MillRecover545':{const y=api.takeTop(s,t.p);if(!y){api.deckCheck(s,t.p);break;}clear(y);api.addZone(s,t.p,'grave',y);const matched=matches(s,t.p,y,t.filter);api.deckCheck(s,t.p);if(s.winner!==null)break;if(matched)zoneMove(s,t.p,'grave',y.uid,'hand',t);else start(s,t,t.elseDefs);break;}
 case'g34_CountTarget544':start(s,t,[{...t.def,power:(own[t.zone]?.length||0)*t.amount}]);break;
 case'g34_ShinkaDelay543':if(sourceHost474(s,t)){const r={p:t.p,source:t.source,uid:t.uid,incarnation:t.incarnation||0};if(t.when==='end')(s.g537Delays??=[]).push({...r,when:'turnEnd',turn:s.turn,defs:[{op:'Untap',g191First:true}]});else(s.extLimits??=[]).push({kind:'g543Shinka',...r,when:t.when,expires:'end',who:s.active});}break;
 case'g34_ShinkaGrant397':{const host=t.untilStart?sourceHost474(s,t)?.x:own.battle.find(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)));if(host){if(t.battlePower)(s.extLimits??=[]).push({kind:'g446BattlePower',player:t.p,ref:{uid:t.uid,incarnation:t.incarnation||0},amount:t.battlePower,expires:'end',who:s.active});if(t.power)(host.powerModifiers??=[]).push({amount:t.power,expires:'end',who:s.active});if(t.grant){if(t.untilStart)(s.extLimits??=[]).push({kind:'g521Grant',ref:{uid:t.uid,incarnation:t.incarnation||0},grant:t.grant,expires:'start',who:t.p});else(host.g34Grants??=[]).push({turn:s.turn,...t.grant});}}break;}
 case'g34_RecoverAll326':{const rows=list(s,{...t,selected:[]}),before=new Set(own.hand.map(y=>y.uid));for(const r of rows)zoneMove(s,r.p,r.origin,r.x.uid,'hand',t);const n=rows.filter(r=>own.hand.some(y=>y.uid===r.x.uid)&&!before.has(r.x.uid)).length;api.log(s,t.p,'recover',card(t.source).name+'：条件に合うカード'+n+'枚を手札に戻した',{cardId:t.source});if(t.after)start(s,t,t.after);break;}
 case'g34_BreakDelay484':(s.g484BreakEnds??=[]).push({p:t.p,uid:t.uid,incarnation:t.incarnation||0,source:t.source,turn:s.turn});break;
 case'g34_BreakReturn484':{const host=sourceHost474(s,t);if(host&&!host.x.sealed)start(s,t,[E('SelfHand299')]);break;}
 case'g34_BlockForAttack814':{
  const host=sourceHost474(s,t),attack=s.attackLifecycle;
  if(attack&&s.attack&&host&&!host.x.sealed&&api.isCreature(s,host.x))
   (attack.g814Blockers??=[]).push({uid:t.uid,incarnation:t.incarnation||0});
  break;
 }
 case'g34_SelfGrant754':{const host=sourceHost474(s,t);if(host&&(!t.g770LiveCreature||!host.x.sealed&&api.isCreature(s,host.x)))applyGrant(s,t,host.x);break;}
 case'g34_GraveReturn754':{
  const y=own.grave.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);
  if(!y||!api.canMoveZone(s,t.p,'grave'))break;
  if(t.colors?.length){
   const manaColors=new Set(own.mana.filter(x=>!x.faceDown).flatMap(x=>api.manaColors(api.zoneCard(s,t.p,x,'mana'),s,t.p)));
   if(!t.colors.every(c=>manaColors.has(c)))break;
  }
  start(s,t,[{op:'Offer',title:card(y).name+'を墓地から手札に戻す？',
   score:18,defs:[{op:'SelfGraveHand476',serial:t.serial}]}]);
  break;
 }
 case'g34_SelfHand299':{const host=sourceHost474(s,t);if(host)move(s,[{player:host.p,uid:host.x.uid,to:'hand',controller:t.controller??t.p}]);break;}
 // The death trigger follows its first grave visit, never a later visit by the same physical card.
 case'g34_ScheduleGraveReturn644':
  if((t.anyTurn||s.active===t.p)&&!s.endStep&&(!t.condition||ownCondition(s,t.p,t.condition)))put(s,{...t,op:'g34_Schedule537',when:'turnEnd',defs:[{op:'SelfGraveRevive644',serial:t.serial}]});
  break;
 case'g34_GraveSummonWatch766':{
  const y=own.grave.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);
  if(y&&api.canMoveZone(s,t.p,'grave')&&canPut(s,t.p,y,'grave'))start(s,t,[{
   op:'Offer',title:card(y).name+'を墓地から出す？',defs:[{op:'SelfGraveRevive644',serial:t.serial}]
  }]);
  break;
 }
 case'g34_SelfGraveRevive644':{
  const y=own.grave.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);
  if(y&&api.canMoveZone(s,t.p,'grave')&&canPut(s,t.p,y,'grave'))doPut(s,{...t,owner:t.p,origin:'grave',target:y.uid});
  break;
 }
 case'g34_SelfGraveBottom839':{
  const y=ownGraveSource839(own,t);
  if(y&&api.canMoveZone(s,t.p,'grave'))choice(s,t,'このクリーチャーを墓地から山札の下に置く？',
   [opt('山札の下に置く',true,20,y.cardId),skip()]);
  break;
 }
 case'g34_RevealDiscard839':revealDiscard839(s,t);break;
 case'g34_SelfGraveHand476':{const y=own.grave.find(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)&&(y.zoneSerial||0)===t.serial);if(y)zoneMove(s,t.p,'grave',y.uid,'hand',t);break;}
 case'g34_SelfGraveShield659':{
  const y=own.grave.find(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)&&(y.zoneSerial||0)===t.serial);
  if(y)zoneMove(s,t.p,'grave',y.uid,'shields',{...t,g657FaceUp:true});
  break;
 }
 case'g34_ManaTurn297':(s.extLimits??=[]).push({kind:'g297ManaTurn',player:t.p,controller:t.p,turn:s.turn,who:s.active,expires:'end'});break;
 case'g34_SelfMana297':{
  const host=t.g536Source?sourceHost474(s,t):x?{p:t.p,x}:null;
  if(!host||host.x.sealed&&t.g536Source)break;
  if(t.unlessOtherDragon&&s.players[host.p].battle.some(y=>y.uid!==host.x.uid&&!y.sealed&&race(effective(y,s),'ドラゴン')))break;
  move(s,[{player:host.p,uid:host.x.uid,to:'mana',tapped:!!t.tapped,controller:t.controller??t.p}]);
  break;
 }
 case'g34_BlindReveal803':{
  const owner=t.owner==='opponent'?1-t.p:t.p,hand=s.players[owner].hand;
  if(hand.length)choice(s,t,'相手の手札を裏向きのまま1枚選ぶ',
   hand.map((_,i)=>opt('裏向きの手札 '+(i+1),i,0)),1-owner);
  break;
 }
 case'g34_ManaTriggerCast803':{
  const rows=manaTriggerSpells803(s,t.p);
  if(!t.selected){
   if(rows.length)choice(s,t,'自分のマナからS・トリガー付き呪文を1枚選ぶ',rows.map(({y,c,face})=>
    opt(c.name,{uid:y.uid,face,serial:y.zoneSerial||0},api.canCast(s,t.p,c,'mana')?spellScore555(s,t,c):-1000,y.cardId)));
   break;
  }
  const selected=rows.find(({y,face})=>y.uid===t.selected.uid&&face===t.selected.face&&(y.zoneSerial||0)===t.selected.serial);
  if(selected&&api.canCast(s,t.p,selected.c,'mana'))choice(s,t,selected.c.name+'をマナからコストを支払わずに唱える？',
   [opt('唱える',true,spellScore555(s,t,selected.c),selected.y.cardId),skip()]);
  break;
 }
 case'g34_BlindDiscard773':
 case'g34_BlindHandMana675':
  if(opp.hand.length&&api.canMoveZone(s,1-t.p,'hand')){
   const title=t.op==='g34_BlindDiscard773'?'捨てさせる相手の手札を裏向きのまま1枚選ぶ':'マナに置く相手の手札を裏向きのまま1枚選ぶ';
   choice(s,t,title,opp.hand.map((_,i)=>opt('裏向きの手札 '+(i+1),i,0)));
  }
  break;
 case'g34_StartManaLimit794':put(s,task('g43_LimitMana',t.p,t.source,{max:t.max}));break;
 case'g34_StartManaLock773':
  choice(s,t,'次のターン開始時にアンタップさせない相手のマナを1枚選ぶ',opp.mana.map((y,i)=>
   opt(y.faceDown?'裏向きのマナ '+(i+1):card(y).name,y.uid,y.tapped?10:0,y.faceDown?null:y.cardId)));
  break;
 case'g34_Nocturne732':{
  const names=new Map();
  for(const c of api.allCards().filter(c=>c.type!=='seal'&&c.type!=='unknown'))for(const face of faces(c)){
   const name=creatureFaceName(face);
   if(!names.has(exactName(name)))names.set(exactName(name),opt(name,name,0,c.id));
  }
  const seen=new Set([...opp.battle,...opp.grave.filter(y=>!y.faceDown)].flatMap(y=>faces(card(y)).map(face=>exactName(creatureFaceName(face)))));
  const options=[...names].map(([name,option])=>({...option,score:seen.has(name)?10:0}));
  choice(s,t,'宣言するカード名を選ぶ',options);
  break;
 }
 case'g34_Roulette732':put(s,task('g9Number',t.p,t.source,{family:'roulette732'}));break;
 case'g34_RouletteReveal732':{
  const who=t.opponent?1-t.p:t.p,hand=s.players[who].hand;
  api.log(s,who,'reveal','手札を公開：'+(hand.map(y=>card(y).name).join('・')||'なし'),{cardId:t.source});
  const number=t.number==='∞'?Infinity:t.number;
  const matching=hand.filter(y=>faces(card(y)).some(face=>cost(face)===number)).map(y=>y.uid);
  const next=t.opponent?null:{...t,opponent:true};
  api.discardSelected(s,who,matching,t.source,t.p,null,next);
  break;
 }
 case'g34_Barrage732':{
  if(api.deckLocked(s,t.p))break;
  const ids=[],skipIds=reserved(own),limit=api.lookCount(s,t.p,own.deck.length);
  let threshold;
  for(const y of own.deck){
   if(ids.length===limit)break;
   if(skipIds.has(y.uid))continue;
   ids.push(y.uid);
   api.log(s,t.p,'reveal',card(t.source).name+'で山札から公開：'+card(y).name,{cardId:y.cardId,source:t.source});
   const base=card(y),face=faces(base).find(f=>f.type==='creature');
   if(face){
    threshold=base.g321Katsu?api.revealedPower(y,s):face.power==='∞'?Infinity:Number(face.power);
    break;
   }
  }
  (own.g34Protected??=[]).push(...ids);
  put(s,{...t,op:'g34_Order',ids,rest:'grave'});
  if(threshold!==undefined){
   const victims=[0,1].flatMap(p=>creatures(s,p).filter(y=>!y.sealed&&currentPower506(s,y)<threshold).map(y=>({player:p,uid:y.uid,to:'grave',destroy:true})));
   if(victims.length)move(s,victims);
  }
  break;
 }
 case'g34_Vegas851':{
  const owner=1-t.p;
  const [uid]=look(s,{...t,p:owner,n:1,public:true});
  const index=opp.deck.findIndex(x=>x.uid===uid);
  if(index<0)break;
  const [top]=opp.deck.splice(index,1);
  release(s,owner,uid);
  // Rotate within the same zone, including when this is the library's only card.
  opp.deck.push(top);
  const facesByCost=new Map(faces(api.zoneCard(s,owner,top,'deck')).map(c=>[c.type==='cell'?0:c.cost,c]));
  if(facesByCost.size>1){
   choice(s,{...t,op:'g34_VegasCost851'},'公開したカードのどちらのコストを参照する？',
    [...facesByCost].map(([n,c])=>opt(c.name+'（コスト'+n+'）',n,n==='∞'||n>=5?own.deck.length>3?10:-10:0,top.cardId)));
  }else if([...facesByCost.keys()].some(n=>n==='∞'||n>=5)){
   start(s,t,[{op:'Draw',n:3}]);
  }
  break;
 }
 case'g34_InspectHand':{
  const hand=opp.hand;
  if(!hand.length){api.log(s,t.p,'look',card(t.source).name+'：相手の手札はありません',{cardId:t.source});break;}
  if(t.g904ToShield){
   api.log(s,t.p,'look',card(t.source).name+'で相手の手札を確認',{cardId:t.source});
   const options=hand.filter(y=>api.canAddShield(s,y.cardOwner??1-t.p))
    .map(y=>opt(card(y).name+'をシールドに置く',y.uid,cost(card(y))-2,y.cardId));
   choice(s,{...t,seen:hand.map(y=>y.cardId)},'表向きのシールドに置く相手の手札を1枚まで選ぶ',[...options,opt('確認を終える',null,0)]);
   break;
  }
  if(t.g714ToMana){
   api.log(s,t.p,'look',card(t.source).name+'で相手の手札を確認',{cardId:t.source});
   const options=hand.map(y=>opt(card(y).name+'をマナに置く',y.uid,cost(card(y))-2,y.cardId));
   choice(s,{...t,seen:hand.map(y=>y.cardId)},'マナに置く相手の手札を1枚まで選ぶ',[...options,opt('マナに置かない',null,0)]);
   break;
  }
  const eligible=t.discard?hand.filter(y=>t.g732Name?faces(card(y)).some(face=>exactName(creatureFaceName(face))===t.g732Name):matches(s,1-t.p,y,t.filter)):[];
  const ids=eligible.map(y=>y.uid),seen=hand.map(y=>y.cardId);
  api.log(s,t.p,t.reveal?'reveal':'look',t.reveal?'相手の手札を公開：'+hand.map(y=>card(y).name).join('・'):card(t.source).name+'で相手の手札を確認',{cardId:t.source});
  const chooseTitle=t.g822OpponentDiscardChoice?'相手の手札からカードを1枚指定する':'捨てさせる相手の手札を1枚選ぶ';
  const options=t.chooseOne&&ids.length?eligible.map(y=>opt(card(y).name+(t.g822OpponentDiscardChoice?'を指定する':'を捨てさせる'),y.uid,10+cost(card(y))*3,y.cardId)):
   [opt(t.discard&&!t.chooseOne?'確認して、条件に合う'+ids.length+'枚をすべて捨てさせる':'確認を終える',t.chooseOne?null:true,10)];
  choice(s,{...t,seen,discardIds:ids,discardSeen:hand.map(y=>ids.includes(y.uid))},t.chooseOne&&ids.length?chooseTitle:'相手の手札を確認',options);
  break;
 }
 case'g34_DesignatedDiscard822':{
  const selected=own.hand.find(y=>y.uid===t.target&&(y.zoneSerial||0)===t.serial);
  if(selected)choice(s,t,'指定された手札を捨てる？',[
   opt(card(selected).name+'を捨てる',true,(own.hand.length-1)*8-cost(card(selected)),selected.cardId),
   opt('指定されたカードを残し、残りをすべて捨てる',false,0)]);
  break;
 }
 case'g34_DiscardFor248':{const rows=own.hand.filter(y=>matches(s,t.p,y,t.g488DiscardFilter));if(rows.length)choice(s,t,t.title||(t.g488DiscardFilter?'手札のクリーチャーを1体捨てて能力を使う？':'手札を1枚捨てて能力を使う？'),[...rows.map(y=>opt(card(y).name+'を捨てる',y.uid,discardScore248(s,t,y),y.cardId)),skip()]);break;}
 case'g34_IfHand246':if(own.hand.length<=t.max)start(s,t,t.defs);else if(t.elseDefs)start(s,t,t.elseDefs);break;
 case'g34_IfOwn':if(ownCondition(s,t.p,t.filter,t.uid,t.incarnation??null,t.lastKnownCount))start(s,t,t.defs);else if(t.elseDefs)start(s,t,t.elseDefs);break;
 case'g34_HandCost262':{const n=own.hand.length;start(s,t,t.defs.map(d=>({...d,filter:{...d.filter,...(t.below?{belowCost:n}:{max:n})},...(d.g262Other?{excludeUid:t.uid}:{})})));break;}
 case'g34_Freeze262':for(const y of creatures(s,1-t.p))if(!y.sealed&&matches(s,1-t.p,y,t.filter))freeze(s,t,1-t.p,y);break;
 case'g34_Refill261':if(own.hand.length<=t.max)api.draw(s,t.p,Math.max(0,t.n-own.hand.length));break;
 case'g34_InspectOne258':put(s,task('s6Inspect',t.p,t.source));break;
 case'g34_ChooseRace724':{
  const scores=new Map();
  for(const y of creatures(s,t.p)){
   if(y.sealed)continue;
   for(const name of new Set(exactRaces(effective(y,s))))scores.set(name,(scores.get(name)||0)+1);
  }
  const names=[...new Set([...RECOVERY_RACES,...scores.keys()])];
  choice(s,t,'種族を1つ選ぶ',names.map(name=>opt(name,name,scores.get(name)||0)).sort((a,b)=>b.score-a.score));
  break;
 }
 case'g34_Lengston724':{
  const n=t.g737Race?2:creatures(s,t.p).filter(y=>!y.sealed).length;
  const ids=look(s,{...t,n,public:true});
  if(!api.canMoveZone(s,t.p,'deck')){
   for(const uid of ids)release(s,t.p,uid);
   break;
  }
  const raceName=t.g737Race;
  const eligible=face=>raceName==='ドラゴン'?race(face,raceName):raceName?exactRaces(face).includes(raceName):face.type==='spell';
  const taken=[],rest=[];
  for(const uid of ids){
   const y=own.deck.find(y=>y.uid===uid);
   if(!y)continue;
   if(faces(card(y)).some(eligible)){
    remove(own.deck,uid);
    release(s,t.p,uid);
    clear(y,'hand');
    taken.push(y);
   }else rest.push(uid);
  }
  if(taken.length)api.addZone(s,t.p,'hand',...taken);
  put(s,{...t,op:'g34_Order',ids:rest,rest:raceName?'bottom':'top',g259OrderTop:!raceName,ordered:[]});
  break;
 }
 case'g34_ChooseRaceUntap713':{
  const scores=new Map();
  for(const p of [t.p,1-t.p])for(const y of creatures(s,p)){
   if(!y.tapped||!api.canUntap(y))continue;
   for(const race of new Set(String(effective(y,s).race||'').split('/')))
    scores.set(race,(scores.get(race)||0)+(p===t.p?1:-1));
  }
  const options=RECOVERY_RACES.map(race=>opt(race,race,scores.get(race)||0)).sort((a,b)=>b.score-a.score);
  choice(s,t,'アンタップする種族を1つ選ぶ',options);
  break;
 }
 case'g34_BlockUntapPick715':{
  if(!s.attack||s.attack.stage!=='blockedEffects'||s.attack.blockUid!==t.uid)break;
  const rows=creatures(s,t.p).filter(y=>!y.sealed);
  if(rows.length)choice(s,t,'バトルの後にアンタップする自分のクリーチャーを1体まで選ぶ',[
   ...rows.map(y=>opt(card(y).name,y.uid,y.tapped&&api.canUntap(y)?10:0,y.cardId)),skip()
  ]);
  break;
 }
 case'g34_GroupUntap':
  for(const p of (t.owner==='both'?[t.p,1-t.p]:[t.p]))for(const y of creatures(s,p)){
   if(!y.tapped||y.sealed||!api.canUntap(y))continue;
   if(t.g713ExactRace&&!String(effective(y,s).race||'').split('/').includes(t.g713ExactRace))continue;
   if(t.g593OverMana&&cost(effective(y,s))<=opp.mana.length)continue;
   if(t.g179Other&&api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)))continue;
   if(!matches(s,p,y,t.filter))continue;
   y.tapped=false;
   combined.untapped(s,p,y);
  }
  break;
 case'g34_UntapMana':{
  let n=0;
  for(const y of own.mana){
   if(!y.tapped||!api.canUntap(y)||!matches(s,t.p,y,t.filter))continue;
   if(t.manaColorsAny&&!api.manaColors(y.faceDown?{civilizations:[],civ:'ゼロ'}:card(y),s,t.p).some(c=>t.manaColorsAny.includes(c)))continue;
   y.tapped=false;n++;
  }
  api.log(s,t.p,'untapMana',card(t.source).name+'：マナを'+n+'枚アンタップ',{cardId:t.source});
  break;
 }
 case'g34_DiscardAll244':{if(t.optional&&!t.accepted){const last=t.draw>=own.deck.length,shako=creatures(s,t.p).some(y=>effective(y,s).shako),value=last?(shako?1000:-1000):t.draw*10-own.hand.length*5-own.hand.reduce((n,x)=>n+cost(card(x)),0)/3;choice(s,t,'手札をすべて捨てて'+t.draw+'枚引く？',[opt('すべて捨てて引く',true,value),skip()]);}else put(s,task('discard',t.p,t.source,{causedBy:t.p,selfDiscard:true,n:own.hand.length,all:true}),...(t.draw?[task('draw',t.p,t.source,{n:t.draw})]:[]));break;}
 case'g34_DiscardDraw':{const rows=own.hand.filter(y=>!t.filter||matches(s,t.p,y,t.filter));if(rows.length){const last=t.n>=own.deck.length,win=last&&creatures(s,t.p).some(y=>effective(y,s).shako);choice(s,t,'手札を1枚捨てて'+t.n+'枚引く？',[...rows.map(y=>opt(card(y).name+'を捨てる',y.uid,last?(win?1000:-1000):12+t.n*5-cost(card(y)),y.cardId)),skip()]);}break;}
 case'g34_ResolveSpell207':api.resumeCastSpell(s,t.p,t.uid);break;
 case'g34_GroupLasting412':for(const {p,y}of groupPowerRows(s,t))(s.extLimits??=[]).push({kind:t.destroySafe?'g409AttackEffect':'g412ExtraBreak',player:p,ref:{uid:y.uid,incarnation:y.incarnation||0},source:t.source,...(t.destroySafe?{effect:'destroySafe',expires:t.untilEnd?'end':'start',who:t.untilEnd?s.active:t.p}:{amount:t.extraBreak,expires:'end',who:s.active,...(t.spell?{spellCost:cost(faces(card(t.source)).at(-1))}:{})})});break;
 case'g34_ChainDestroy838':{
  choice(s,t,'破壊する相手のクリーチャーを選ぶ',chainOptions838(s,t.p));
  break;
 }
 case'g34_GroupFreeze':
  for(const {p,y}of groupPowerRows(s,t))freeze(s,t,p,y);
  break;
 case'g34_GroupGrant364':
  for(const {p,y}of groupPowerRows(s,t)){
   if(t.g736ForceAttack)force546(s,{...t,when:'end'},p,y);
   applyGrant(s,t,y);
  }
  break;
 case'g34_CountPower561':start(s,t,countedPowerDefs561(s,t,t));break;
 case'g34_BattleBreak828':
  (s.extLimits??=[]).push({kind:'g828BattleBreak',player:t.p,source:t.source,turn:s.turn,expires:'end',who:s.active});
  break;
 case'g34_BreakDraw913':
  (s.extLimits??=[]).push({kind:'g913BreakDraw',player:t.p,source:t.source,expires:'end',who:s.active});
  break;
 case'g34_FairyManaExchange828':{
  const filter={race:'スノーフェアリー'};
  const fromMana={origin:'mana',to:'hand',filter};
  const rows=list(s,{...t,...fromMana});
  if(!rows.length)break;
  if(!t.accepted){
   choice(s,t,'マナゾーンのスノーフェアリーをすべて手札に戻す？',[opt('すべて戻す',true,10),skip()]);
   break;
  }
  moveZoneSelection583(s,{...t,...fromMana},rows.map(({x})=>x));
  const fromGrave={origin:'grave',to:'mana',filter};
  moveZoneSelection583(s,{...t,...fromGrave},list(s,{...t,...fromGrave}).map(({x})=>x));
  break;
 }
 case'g34_GroupPower':for(const {p,y}of groupPowerRows(s,t))(y.powerModifiers??=[]).push({amount:t.g561DarkMana?0:p===t.p&&t.ownPower!==undefined?t.ownPower:t.power,...(t.g561DarkMana?{g561DarkMana:t.p}:{}),expires:'end',who:s.active,...(t.g561AttackOnly?{attackOnly:true}:{}),...(t.spell?{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{})});break;
 case'g34_SelfExtraBreak444':if(own.battle.some(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))))(s.extLimits??=[]).push({kind:'g412ExtraBreak',player:t.p,ref:{uid:t.uid,incarnation:t.incarnation||0},source:t.source,amount:t.amount,expires:'end',who:s.active});break;
 case'g34_SelfBoost313':{const y=t.g536Source?sourceHost474(s,t)?.x:x;if(y&&(!t.g694ClearOnSeal||!y.sealed&&api.isCreature(s,y))){(y.powerModifiers??=[]).push({amount:t.power,expires:'end',who:s.active,...(t.g694ClearOnSeal?{g694ClearOnSeal:true}:{}),...(t.g337PowerAttacker?{attackOnly:true,grantedAbility:true}:{})});if(t.breaker)(y.g34Grants??=[]).push({turn:s.turn,g313Breaker:t.breaker,...(t.g633DoubleBreaker?{g633DoubleBreaker:true}:{})});}break;}
 case'g34_SelfTap314':if(x)api.tap(s,t.p,x);break;
 case'g34_RevengeDeclare795':{
  const y=revengeCard795(s,t);
  if(y&&(card(y).g795Revenge.opponentDraws===undefined||revengeDraws910(s,t.p,card(y).g795Revenge)))
   choice(s,t,card(y).name+'のリベンジ・チャンスを宣言する？',
    [opt('宣言する',true,revengeReady795(s,t.p,y,t.origin)?25:-5,y.cardId),skip()]);
  break;
 }
 case'g34_RevengeSummon795':{
  const y=revengeCard795(s,t);
  if(y&&revengeReady795(s,t.p,y,t.origin))choice(s,t,card(y).name+'をリベンジ・チャンスで召喚する？',
   [opt('コストを支払わずに召喚する',true,25,y.cardId),skip()]);
  break;
 }
 case'g34_Chance417':{const y=own.hand.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial),c=y&&faces(card(y))[t.face];if(c?.g417Chance&&!api.spellIgnored(s,c)&&api.canCast(s,t.p,c,'hand'))choice(s,t,'アタック・チャンス：'+c.name+'を唱える？',[opt('コストを支払わずに唱える',true,20+modeScore(s,t,c.g34Tasks||[]),y.cardId),skip()]);break;}
 case'g34_SpellFinish416':{const frame=(s.extSpells||[]).find(f=>f.inst.uid===t.uid&&f.caster===t.p&&(!f.virtual||f.shieldCast));if(frame){frame.to=t.to;frame.g416SelfFinish=true;if(frame.shieldCast)frame.inst.finishTo=t.to;}break;}
 case'g34_Judge318':api.singleJudge(s,t.p,t.source,t.uid,{...t,op:'g34_Sequence',defs:t.defs});break;
 case'g34_Thrill443':{const ids=look(s,{...t,n:3,public:true}),n=ids.filter(uid=>{const y=own.deck.find(y=>y.uid===uid);return y&&matches(s,t.p,y,{creature:true,raceAny:t.races});}).length,batch=String(s.g443Serial=(s.g443Serial||0)+1),defs=t.defs.map(d=>d.op==='Look'&&d.g201Search?{op:'ThrillSearch443',batch,ids,search:d}:d);for(const uid of ids)release(s,t.p,uid);put(s,...tasks(t.p,t.source,Array.from({length:n},(_,i)=>({op:'Offer',title:'スリリング・スリー '+(i+1)+'/'+n+'：能力を使う？',defs})),{uid:t.uid,incarnation:t.incarnation}),{...t,op:'g34_Order',g443Root:batch,ids,rest:'bottom',ordered:[]});break;}
 case'g34_ThrillSearch443':{const root=(s.extTasks||[]).find(q=>q.g443Root===t.batch),publicIds=root?.ids.length?t.ids:[];for(const uid of t.ids)release(s,t.p,uid);if(root)root.ids=[];start(s,t,[{...t.search,g443PublicIds:publicIds}]);break;}
 // Count once while resolving; later mana or battlefield changes do not rewrite the boost.
 case'g34_ManaColorBoost515':{const n=manaCivilizationCount(s,t.p);start(s,t,[{op:'Target',owner:'self',power:t.amount*n}]);break;}
 case'g34_CountCost553':{const n=s.players[t.p][t.zone].filter(y=>matches(s,t.p,y,t.filter)).length;start(s,t,[{...t.def,g513CostBudget:n,title:'合計コスト'+n+'以下になるよう2体まで選ぶ'}]);break;}
 case'g34_Destination553':{const xs=t.rows.flatMap(r=>{const y=s.players[r.p].battle.find(y=>y.uid===r.uid);return y?[y]:[];});choice(s,t,'選んだエレメントすべての移動先を選ぶ',[opt('すべてマナゾーンに置く','mana',xs.length*10),opt('すべて破壊する','grave',xs.reduce((n,y)=>n+(hooks.destroySafe409(s,y)?-5:30+cost(card(y))),0))]);break;}
 case'g34_CountOwn538':{const n=creatures(s,t.p).filter(y=>!y.sealed&&matches(s,t.p,y,t.filter)).length;if(!n)break;if(t.mode==='select')start(s,t,[{...t.def,n}]);else if(t.mode==='belowCost')start(s,t,[{...t.def,filter:{...t.def.filter,belowCost:n}}]);else if(t.mode==='repeat')start(s,t,Array.from({length:n},()=>structuredClone(t.def)));else throw Error('未対応のクリーチャー数効果');break;}
 case'g34_CountDraw':{const n=countDraw(s,t.p,t);if(n)start(s,t,[t.optional==='each'?{op:'DrawUpTo',n,g203Draw:true}:t.optional==='amount'?{op:'Draw',n,optional:true}:t.optional==='all'?{op:'Offer',title:'カードを'+n+'枚まとめて引く？',defs:[{op:'Draw',n}]}:{op:'Draw',n}]);break;}
 // Choose the entry order as well as the cards: a newly entered creature may be an evolution base.
 // Keep entry triggers pending until the whole army is placed; never include subsequently recycled cards.
 case'g34_Uncross719':{
  const attached=s.players.flatMap(p=>p.battle.filter(x=>!x.sealed&&card(x).type==='gear'&&x.crossedTo));
  for(const gear of attached)delete gear.crossedTo;
  if(attached.length)api.log(s,t.p,'uncross',`クロスギア${attached.length}枚を外した`,{cardId:t.source});
  break;
 }
 case'g34_OpponentHandArmy716':
  put(s,{...t,op:'g34_HandArmy716',p:1-t.p});
  break;
 case'g34_HandArmy716':{
  const rows=t.n>0?list(s,{...t,origin:'hand',deploy:true,filter:{g228Face:{type:'creature',max:t.max}}}):[];
  if(!rows.length){put(s,task('g34_Custom',t.p,t.source,{name:'finishBatch'}));break;}
  choice(s,t,'自分の手札から出すクリーチャーを選ぶ（あと'+t.n+'体まで）',[
   ...rows.map(({x})=>opt(card(x).name,x.uid,15+cost(card(x)),x.cardId)),opt('ここまでで確定',null,0)
  ]);
  break;
 }
 case'g34_DeploySeries875':{
  const selected=t.selected??[],remaining=t.costs?.length??t.n;
  const filter=t.costs?{...t.filter,any:t.costs.map(exactCost=>({exactCost}))}:t.filter;
  const rows=remaining>0?list(s,{...t,deploy:true,selected,filter}):[];
  if(!rows.length){
   if(selected.length)put(s,task('g34_Custom',t.p,t.source,{name:'finishBatch'}));
   break;
  }
  const zone=t.origin==='mana'?'マナゾーン':'墓地';
  choice(s,{...t,selected},zone+'から出すクリーチャーを選ぶ',[
   ...rows.map(({x})=>opt(card(x).name,{uid:x.uid,cost:cost(api.zoneCard(s,t.p,x,t.origin))},15+cost(card(x)),x.cardId)),
   ...(t.optional&&!selected.length?[skip()]:[])
  ]);
  break;
 }
 case'g34_GraveArmy':{const ids=t.ids??own.grave.map(y=>y.uid),selected=t.selected||[],rows=list(s,{...t,origin:'grave',deploy:true,selected}).filter(r=>ids.includes(r.x.uid));if(selected.length>=t.n||!rows.length){put(s,task('g34_Custom',t.p,t.source,{name:'finishBatch'}));break;}s.g34DeployBatch=true;choice(s,{...t,ids,selected},'墓地から出す闇のクリーチャーを選ぶ（'+selected.length+'/'+t.n+'体）',[...rows.map(({x})=>opt(card(x).name,{uid:x.uid,origin:'grave',p:t.p},15+cost(card(x)),x.cardId)),opt('ここまでで確定',null,0)]);break;}
 // A resolved delayed move follows the same creature through evolution and control changes.
 case'g34_ReturnGroup785':{
  const moves=new Map();
  for(const ref of t.refs){
   const host=sourceHost474(s,ref);
   if(host&&!host.x.sealed)moves.set(host.x.uid,{player:host.p,uid:host.x.uid,to:'hand',controller:t.p});
  }
  if(moves.size)move(s,[...moves.values()]);
  break;
 }
 case'g34_DelayedMove532':{const host=sourceHost474(s,t);if(host&&(!t.g774Banky||!host.x.sealed))move(s,[{player:host.p,uid:host.x.uid,to:t.to,destroy:t.to==='grave',controller:t.controller??t.p}]);break;}
 case'g34_ExactMove':{
  const owner=t.owner??1-t.p;
  const y=s.players[owner].battle.find(y=>{
   if(!t.g403Refs)return y.uid===t.target&&(t.targetIncarnation===undefined||(y.incarnation||0)===t.targetIncarnation);
   const follow=t.followEvolution==='evolutionOnly'?api.isEvolution(y):t.followEvolution;
   const layers=t.filter?.g600OverMana||follow?api.allLayers(y):[y,...(y.godLinks||[])];
   return layers.some(z=>t.g403Refs.some(r=>r.uid===z.uid&&r.incarnation===(z.incarnation||0)));
  });
  if(!y||y.sealed&&(t.filter||t.followEvolution)||t.filter&&!matches(s,owner,y,t.filter))break;
  if(t.tap){api.tap(s,owner,y);break;}
  if(t.optional){
   const label=t.to==='hand'?'手札に戻す':t.to==='mana'?'マナに置く':t.to==='shields'?'シールド化する':'破壊する';
   const score=t.afterAttempt?modeScore(s,t,t.afterAttempt)-cost(card(y))*2-(s.attack?.attacker===y.uid?12:0):
    t.to==='shields'&&!api.canAddShield(s,owner)?-10:20;
   choice(s,{...t,op:'g34_Offer',defs:[{...t,op:'ExactMove',optional:false}]},card(y).name+'を'+label+'？',[opt('実行する',true,score,y.cardId),skip()]);
  }else{
   move(s,[{player:owner,uid:y.uid,to:t.to,destroy:t.to==='grave',controller:t.controller??t.p}]);
   if(t.afterAttempt)start(s,t,t.afterAttempt);
  }
  break;
 }
 case'g34_ShieldPlus414':put(s,{...t,op:'g71_Plus',optional:true});break;
 case'g34_BounceMatch917':{
  const def={op:'Select',origin:'battle',owner:'opponent',to:'hand',n:t.n,filter:{creature:true},
   g173Targets:true,g193Select:true,title:'手札に戻す相手のクリーチャーを'+t.n+'体選ぶ'};
  const eligible=list(s,{...t,...def}).filter(({p,x})=>api.targetable(s,t.p,p,x));
  if(eligible.length>=t.n)start(s,t,[{op:'Offer',title:'相手のクリーチャーを'+t.n+'体手札に戻す？',defs:[def]}]);
  break;
 }
 case'g34_CountTap413':{const n=creatures(s,t.p).filter(y=>!y.sealed).length;if(n)start(s,t,[{op:'Select',owner:'opponent',origin:'battle',n,filter:{creature:true},g173Targets:true,g193Tap:true,g193Select:true,title:'タップする相手のクリーチャーを'+n+'体選ぶ'}]);break;}
 case'g34_ConfirmHandReturn857':
  if(own.hand.some(y=>y.uid===t.returned&&(y.zoneSerial||0)===t.serial))start(s,t,t.defs);
  break;
 case'g34_MarshalTouch558':{const rows=marshalRows558(s,t);if(rows.length)choice(s,t,t.title||'マーシャル・タッチ：戻す自分の他のクリーチャーを1体選ぶ（任意）',[...rows.map(y=>opt(card(y).name,{uid:y.uid,incarnation:y.incarnation||0},marshalValue558(s,t,y),y.cardId)),skip()]);break;}
 case'g34_SacrificeAlly413':{const rows=(t.g547Seed?own.battle.filter(y=>matches(s,t.p,y,{g295Tamaseed:true})):creatures(s,t.p)).filter(y=>!y.sealed&&(!t.other||!api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)))&&(!t.filter||matches(s,t.p,y,t.filter))),legal=new Set(targetOptions(s,t.p,rows).map(o=>o.value)),payoff=sacrificeValue413(s,t,t.defs||[]);if(rows.some(y=>legal.has(y.uid)))choice(s,t,t.g547Seed?'破壊して効果を使う自分のタマシードを1枚選ぶ（任意）':'破壊して効果を使う自分のクリーチャーを1体選ぶ（任意）',[...rows.filter(y=>legal.has(y.uid)).map(y=>{const c=effective(y,s),canDie=api.canLeave(s,t.p,y)&&!hooks.destroySafe409(s,y),penalty=canDie?Math.min(30,6+cost(c)*2+api.power(y,false,s)/2000):0;return opt(card(y).name,{uid:y.uid,incarnation:y.incarnation||0},Math.max(-1000,Math.min(1000,(t.g547Seed&&t.defs?.[0]?.deploy?seedReviveValue547(s,t,y,canDie):payoff)+(canDie?modeScore(s,t,c.g172Death||[]):0)-penalty)),y.cardId);}),skip()]);break;}
 case'g34_SelfSacrifice407':{const owner=s.players.findIndex(p=>p.battle.some(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)))),y=owner>=0?s.players[owner].battle.find(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))):null;if(!y)break;const c=effective(y,s),penalty=api.canLeave(s,owner,y)?Math.min(25,6+cost(c)*2+api.power(y,false,s)/2000):0,score=modeScore(s,t,t.defs||[])+(t.defs||[]).filter(d=>d.op==='Choose').reduce((n,d)=>n+Math.max(0,...d.modes.map(m=>modeScore(s,t,m.defs))),0)+modeScore(s,t,c.g172Death||[])-penalty;choice(s,t,'このクリーチャーを破壊して能力を使う？',[opt('破壊する',true,score,y.cardId),skip()]);break;}
 // Follow the original attacking creature through evolution, but never through
 // leaving and re-entering or a swap with a different creature (QA40660/33625).
 case'g34_MutualDestroy430':{
  const locate=(p,ref)=>ref&&s.players[p].battle.find(y=>api.allLayers(y).some(z=>z.uid===ref.uid&&(z.incarnation||0)===(ref.incarnation||0))),
   opponent=locate(1-t.p,t.g399Attacker),ownSource=locate(t.p,{uid:t.uid,incarnation:t.incarnation||0}),
   rows=[...(opponent?[{player:1-t.p,uid:opponent.uid}]:[]),...(ownSource?[{player:t.p,uid:ownSource.uid}]:[])];
  if(rows.length)move(s,rows.map(r=>({...r,to:'grave',destroy:true,controller:t.controller??t.p})));
  break;
 }
 case'g34_SelfBottom734':{
  const host=sourceHost474(s,t);
  if(!host)break;
  const rows=api.allLayers(host.x).map((y,i)=>({
   uid:y.uid,label:y.faceDown?'裏向きのカード '+(i+1):card(y).name,cardId:y.faceDown?null:y.cardId
  }));
  if(rows.length>1)put(s,task('g78_BottomOrder',host.p,t.source,{rows,ordered:[],newCards:true,controller:t.controller??t.p}));
  move(s,[{player:host.p,uid:host.x.uid,to:'deck',controller:t.controller??t.p}]);
  break;
 }
 case'g34_LowestPower739':put(s,{...t,op:'g61_Bronx'});break;
 case'g34_SelfDestroy':{const host=sourceHost474(s,t);if(host)move(s,[{player:host.p,uid:host.x.uid,to:'grave',destroy:true,controller:t.controller??t.p}]);break;}
 case'g34_IfMana':if(own.mana.filter(y=>{const cs=api.manaColors(y.faceDown?{civilizations:[],civ:'ゼロ'}:card(y),s,t.p);return t.multi?cs.length>1:cs.includes(t.color);}).length>=t.n)start(s,t,t.defs);break;
 case'g34_IfOwnPower':if(creatures(s,t.p).some(y=>api.power(y,y.uid===s.attack?.attacker||y.uid===s.attackLifecycle?.uid&&(y.incarnation||0)===(s.attackLifecycle.incarnation||0),s)>=t.minPower))start(s,t,t.defs);break;
 case'g34_Kourin405':{const r=t.rule;if(r.origin==='deck'&&api.deckLocked(s,t.p))break;put(s,task('g34_Select',t.p,t.source,{uid:t.uid,incarnation:t.incarnation||0,origin:r.origin,g405Search:r.origin==='deck',deploy:true,n:1,optional:true,filter:r.filter,title:({deck:'山札',mana:'マナゾーン',grave:'墓地'}[r.origin])+'から光臨で出すクリーチャーを1体まで選ぶ',...(r.origin==='deck'?{after:[{op:'Shuffle405'}]}:{})}));break;}
 case'g34_Shuffle405':api.shuffleLibrary(s,t.p);api.deckCheck(s,t.p);break;
 case'g34_ShuffleOnMove673':{
  if(s.players[t.opponent].deck.some(x=>t.uids.includes(x.uid)))api.shuffleLibrary(s,t.opponent);
  break;
 }
 case'g34_EndUntap562':scheduleUntap562(s,t,t.defs);break;
 case'g34_ChooseUntap562':{const refs=t.refs||[],rows=creatures(s,t.p).filter(y=>!y.sealed&&!refs.some(r=>r.uid===y.uid&&(y.incarnation||0)===r.incarnation));if(refs.length>=t.n||!rows.length){finishUntap562(s,t);break;}choice(s,t,t.delay?'ターン終了時にアンタップするクリーチャーを選ぶ':'アンタップするクリーチャーを選ぶ',[...targetOptions(s,t.p,rows).map(o=>{const y=rows.find(y=>y.uid===o.value);return{...o,value:{uid:y.uid,incarnation:y.incarnation||0},score:y.tapped&&api.canUntap(y)?10+Number(!!effective(y,s).blocker)*5:0};}),...(t.optional?[skip()]:[])]);break;}
 case'g34_ChooseEndUntap501':{
  const rows=creatures(s,t.p).filter(y=>!y.sealed&&(!t.other||!api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))));
  choice(s,t,t.power?'パワーを+'+t.power+'し、ターン終了時にアンタップするクリーチャーを選ぶ':'ターン終了時にアンタップするクリーチャーを選ぶ',targetOptions(s,t.p,rows).map(o=>{const y=rows.find(y=>y.uid===o.value);return{...o,value:{uid:y.uid,incarnation:y.incarnation||0},score:(api.isEvolution(y)&&own.deck.length>1?25:0)+(effective(y,s).blocker?10:0)+Math.min(20,cost(effective(y,s)))};}));
  break;
 }
 case'g34_ResolveEnd501':if(t.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:t.spellCost,spellSource:t.source}))start(s,t,t.defs);break;
 case'g34_AttackDoubleBreaker807':{
  const host=sourceHost474(s,t)?.x;
  if(host&&s.attackLifecycle&&s.attack?.attacker===host.uid)
   s.attackLifecycle.g807DoubleBreaker={uid:t.uid,incarnation:t.incarnation||0};
  break;
 }
 case'g34_AfterAttack542':if(s.attackLifecycle)(s.attackLifecycle.g542After??=[]).push({p:t.p,source:t.source,uid:t.uid,incarnation:t.incarnation||0,defs:structuredClone(t.defs)});break;
 case'g34_Schedule537':{
  if(t.when==='turnEnd'&&t.spell&&s.endStep)break;
  const spellCost=t.spell?cost(faces(card(t.source)).find(c=>c.type==='spell')||card(t.source)):undefined;
  (s.g537Delays??=[]).push({p:t.p,source:t.source,uid:t.uid,incarnation:t.incarnation||0,turn:s.turn,when:t.when,
   defs:structuredClone(t.defs),...(spellCost!==undefined?{spellCost}:{})});
  break;
 }
 case'g34_ResolveDelay537':if(t.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:t.spellCost,spellSource:t.source}))start(s,t,t.defs);break;
 case'g34_Sequence':start(s,t,t.defs);break;
 case'g34_Magibomber321':{const ids=look(s,{...t,n:1}),rows=[...own.hand.map(y=>({y,origin:'hand'})),...own.deck.filter(y=>ids.includes(y.uid)).map(y=>({y,origin:'deck'}))].filter(({y,origin})=>card(y).type==='creature'&&cost(card(y))<=t.n&&canPut(s,t.p,y,origin));choice(s,{...t,ids},'マジボンバー：手札または山札の上から1体出す？',[...rows.map(({y,origin})=>opt((origin==='hand'?'手札：':'山札：')+card(y).name,{uid:y.uid,origin},own.deck.length<=1&&(origin==='deck'||card(y).exLife)?-1000:20+cost(card(y)),y.cardId)),skip()]);break;}
 case'g34_EntryFight624':{
  const pair=entryFight624(s,t);
  if(pair){
   const [own,enemy]=pair;
   choice(s,t,card(enemy.x).name+'とバトルする？',[opt('バトルする',true,fightScore240(s,own.x,enemy.x),enemy.x.cardId),skip()]);
  }
  break;
 }
 case'g34_FightAttacker798':{
  const ally=fightUnit240(s,t.p,t,true),attacker=fightUnit240(s,1-t.p,t.g399Attacker,true);
  if(ally&&attacker)choice(s,t,'攻撃したクリーチャーとバトルする？',[opt('バトルする',true,fightScore240(s,ally,attacker),ally.cardId),skip()]);
  break;
 }
 case'g34_KatsuFight321':{const b=fightUnit240(s,1-t.p,t.enemy);if(x&&b)choice(s,t,'カツムゲン：無料で出た相手とバトルする？',[opt('バトルする',true,fightScore240(s,x,b),t.source),skip()]);break;}
 case'g34_KatsuLoot321':{if(!own.hand.length)break;const last=own.deck.length<=2,shako=creatures(s,t.p).some(y=>effective(y,s).shako);choice(s,t,'カツムゲン：手札を1枚捨てて2枚引く？',[...own.hand.map(y=>opt(card(y).name,y.uid,last?(shako?1000:-1000):20-cost(card(y))+(card(y).type==='creature'&&api.power(y,false,s)>=6000?15:0),y.cardId)),skip()]);break;}
 case'g34_KatsuDraw321':put(s,task('draw',t.p,t.source,{n:2}),...(t.high&&t.discarded?[{...t,op:'g34_Untap'}]:[]));break;
 case'g34_Next320':{api.shuffleLibrary(s,t.p,[],t.source);const ids=look(s,{...t,n:1,public:true}),y=own.deck.find(x=>x.uid===ids[0]);if(!y){api.deckCheck(s,t.p);break;}const choices=faces(card(y)).flatMap((c,face)=>{if(!api.canCast(s,t.p,c,'deck')||c.type!=='spell'&&!api.canEnter(s,t.p,c,{origin:'deck',execution:true}))return[];const bases=!c.graveEvolution&&(c.evolution||c.neoEvolution)?api.evolutionBases(s,t.p,c):[],options=c.evolution&&!c.graveEvolution?bases:[null,...bases];return options.map(base=>opt('無料で実行：'+c.name+(base?'（'+card(base).name+'に進化）':''),{uid:y.uid,face,baseUid:base?.uid||null},own.deck.length<=1?-1000:25+cost(c),y.cardId));});choice(s,{...t,target:y.uid},'ゴルギーネクスト：公開したカードをどう使う？',[...choices,opt('手札に加える',{to:'hand'},own.deck.length<=1?-1000:10,y.cardId),opt('マナゾーンに置く',{to:'mana'},own.deck.length<=1?-1000:own.mana.length<6?20:5,y.cardId)]);break;}
 case'g34_IfAllMana320':if(own.mana.every(y=>!y.faceDown&&faces(card(y)).some(c=>race(c,'アビス'))))start(s,t,t.defs);break;
 case'g34_Smash320':{const row=smashSource320(s,t),c=faces(card(t.source))[1];if(row&&c&&api.canCast(s,t.p,c,row.origin))choice(s,t,'スマッシュ・バーストで呪文側を唱える？',[opt('「ヤベーのを見たいか？」を唱える',true,own.deck.length<=1?-1000:25,t.source),skip()]);break;}
 case'g34_BattleDeclare588':{
  const cards=t.cards.filter(ref=>own.hand.some(y=>y.uid===ref.uid&&(y.zoneSerial||0)===ref.serial));
  if(cards.length)choice(s,{...t,cards},'バトル勝利で使う手札の能力を宣言（任意）',[
   ...cards.map(ref=>opt(card(ref.cardId).name+'を公開して宣言する',ref.uid,20,ref.cardId)),skip()
  ]);
  break;
 }
 case'g34_BattleDeploy588':{
  const y=own.hand.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);
  if(y)put(s,{...t,op:'g34_Put',origin:'hand',target:y.uid,execution:false});
  break;
 }
 case'g34_Harpoon618':{
  if(opp.shields.length<=3||!opponentAddedShields618(s,t.p))break;
  const kept=t.kept||[],rest=opp.shields.filter(x=>!kept.includes(x.uid));
  if(kept.length===3)finishShieldMove588(s,{...t,selected:rest.map(x=>x.uid)});
  else choice(s,t,'残す相手のシールドを3つ選ぶ（'+kept.length+'/3）',rest.map(x=>opt('シールド '+(opp.shields.indexOf(x)+1),x.uid)));
  break;
 }
 case'g34_Win871':api.finish(s,t.p,card(t.source).name+'：'+(t.reason||'自分の同名クリーチャーが4体揃って勝利'));break;
 case'g34_MeteorReload871':{
  const host=sourceHost474(s,t);
  if(host&&!host.x.sealed&&api.isCreature(s,host.x)){
   const under=(host.x.under||[]).flatMap(api.allLayers);
   for(const y of under)api.moveBattleCard(s,host.p,y.uid,'hand',{controller:t.p});
  }
  const [uid]=look(s,{...t,n:1,public:true}),top=own.deck.find(y=>y.uid===uid);
  if(!top)break;
  if(host&&!host.x.sealed&&api.isCreature(s,host.x)&&faces(card(top)).some(f=>f.type==='creature')){
   const ref={uid:host.x.uid,incarnation:host.x.incarnation||0};
   choice(s,{...t,target:uid,host:ref},'公開したクリーチャーをこのクリーチャーの下に置く？',[
    opt(card(top).name+'を下に置く',true,own.deck.length>1?10:-1000,top.cardId),skip()
   ]);
  }else release(s,t.p,uid);
  break;
 }
 case'g34_StackShieldGrave651':{
  const host=sourceHost474(s,t),under=host&&!host.x.sealed&&api.isCreature(s,host.x)?(host.x.under||[]).flatMap(api.allLayers):[];
  if(under.length)choice(s,t,'下から墓地に置くカードを1枚選ぶ（任意）',[
   ...under.map(y=>opt(y.faceDown?'裏向きのカード':card(y).name,{uid:y.uid,incarnation:y.incarnation||0},10,y.faceDown?undefined:y.cardId)),skip()
  ]);
  break;
 }
 case'g34_ShieldMove685':
 case'g34_ShieldGrave588':{
  const selected=t.selected||[],rows=opp.shields.filter(y=>!selected.includes(y.uid)&&api.shieldCards(y).some(x=>!x.g37ShieldHeld));
  const zone=t.to==='mana'?'マナゾーン':'墓地';
  if(selected.length<t.n&&rows.length)choice(s,t,t.required?zone+'に置く相手のシールドを1つ選ぶ':zone+'に置く相手のシールドを'+t.n+'つまで選ぶ（'+selected.length+'つ選択済み）',[
   ...rows.map(y=>opt('シールド '+(opp.shields.indexOf(y)+1),y.uid,10)),...(t.required?[]:[opt('選択を完了',null,0)])
  ]);else finishShieldMove588(s,t);
  break;
 }
 case'g34_FightPair586':{
  const owners=t.who==='both'?[t.p,1-t.p]:[t.who==='opponent'?1-t.p:t.p],rows=fightPairRows586(s,t,owners);
  const options=rows.flatMap(o=>{
   const ref=o.value,a=fightUnit240(s,ref.player,ref);
   const seconds=fightPairRows586(s,{...t,first:ref,p:t.opponentPicks?1-t.p:t.p},t.opponentPicks?[1-t.p]:owners);
   const scores=seconds.map(r=>fightPairScore586(s,t,a,fightUnit240(s,r.value.player,r.value),ref.player,r.value.player));
   if(t.optional&&!scores.length)return [];
   return [{...o,score:scores.length?(t.opponentPicks?Math.min(...scores):Math.max(...scores)):0}];
  });
  if(options.length)choice(s,t,'バトルする1体目を選ぶ',[...options,...(t.optional?[skip()]:[])]);
  break;
 }
 case'g34_FightPairSecond586':{
  const rows=fightPairRows586(s,t,t.owners),a=fightUnit240(s,t.first.player,t.first);
  if(!rows.length||!a){finishFightPair586(s,t);break;}
  choice(s,t,'バトルする2体目を選ぶ',rows.map(o=>({...o,score:fightPairScore586(s,t,a,fightUnit240(s,o.value.player,o.value),t.first.player,o.value.player)})));
  break;
 }
 case'g34_FightBuff241':{const enemies=fightRows240(s,t.p,1-t.p),allies=fightRows240(s,t.p,t.p);if(allies.length)choice(s,t,'このターン、パワーを+'+t.power+'する自分のクリーチャーを1体選ぶ',allies.map(o=>{const a=own.battle.find(y=>y.uid===o.value),boosted={...a,powerModifiers:[...(a.powerModifiers||[]),{amount:t.power,spellSource:t.spell?t.source:undefined,spellCost:t.spell?cost(card(t.source)):undefined}]},scores=enemies.map(o=>fightScore240(s,boosted,s.players[1-t.p].battle.find(y=>y.uid===o.value)));return{...o,value:{uid:a.uid,incarnation:a.incarnation||0},score:scores.length?Math.max(...scores):5+cost(card(a))};}));break;}
 case'g34_Fight240':{const enemies=fightRows240(s,t.p,1-t.p,t.enemyFilter);if(!enemies.length)break;if(t.self){if(x&&api.isCreature(s,x)&&!x.sealed)put(s,{...t,op:'g34_FightEnemy240',fighter:{uid:x.uid,incarnation:x.incarnation||0}});}else{const allies=fightRows240(s,t.p,t.p).filter(o=>!t.g419FightFilter||matches(s,t.p,own.battle.find(y=>y.uid===o.value),t.g419FightFilter));if(allies.length)choice(s,t,'バトルする自分のクリーチャーを1体選ぶ',[...allies.map(o=>{const a=own.battle.find(y=>y.uid===o.value);return{...o,value:{uid:a.uid,incarnation:a.incarnation||0},score:Math.max(...enemies.map(o=>fightScore240(s,a,s.players[1-t.p].battle.find(y=>y.uid===o.value))))};}),...(t.optional?[skip()]:[])]);}break;}
 case'g34_FightEnemy240':{const a=fightUnit240(s,t.fighterOwner??t.p,t.fighter,t.g745FollowFighter);if(a){const rows=fightRows240(s,t.p,1-t.p,t.enemyFilter).filter(o=>o.value!==a.uid);if(rows.length)choice(s,t,'バトルする相手のクリーチャーを1体選ぶ',[...rows.map(o=>{const b=s.players[1-t.p].battle.find(y=>y.uid===o.value);return{...o,value:{uid:b.uid,incarnation:b.incarnation||0},score:fightScore240(s,a,b)};}),...(t.optional?[skip()]:[])]);}break;}
 case'g34_ChooseCivilization805':{
  const rows=t.target?[]:creatureCivilizations805(s);
  choice(s,t,t.target?'追加する文明を選ぶ':'タップしない単色クリーチャーの文明を選ぶ',civilizations805.map(color=>opt(color,color,
   rows.reduce((score,{p,x,cs})=>!x.tapped&&cs.some(c=>c!==color)?score+(p===t.p?-8:8):score,0))));
  break;
 }
 case'g34_TapAbilityMana804':{
  const host=sourceHost474(s,t),selected=t.selected||[];
  const pool=own.mana.filter(y=>!y.tapped&&!selected.includes(y.uid));
  if(host?.p===t.p&&!host.x.tapped&&!host.x.sealed&&pool.length>=t.n-selected.length){
   choice(s,t,'タップするマナを選ぶ（'+selected.length+'/'+t.n+'枚選択済み）',[
    ...pool.map((y,i)=>opt(y.faceDown?'裏向きのマナ '+(i+1):card(y).name,y.uid,1,y.faceDown?null:y.cardId)),
    opt('能力を使わない',null,0)
   ]);
  }
  break;
 }
 case'g34_TapManaColors698':{
  const selected=t.selected||[],options=manaColorOptions698(s,t);
  const color=t.colors[selected.length];
  if(options.length)choice(s,t,[color].flat().join('または')+'のマナを選ぶ（'+selected.length+'/'+t.colors.length+'枚選択済み）',[...options,skip()]);
  else if(t.elseDefs)start(s,t,t.elseDefs);
  break;
 }
 case'g34_EndDrawDiscard698':{
  const opponent=1-t.p;
  api.discardSelected(s,opponent,s.players[opponent].hand.map(x=>x.uid),t.source,t.p);
  break;
 }
 case'g34_WarpRifle922':{
  const gears=s.players.flatMap(player=>player.battle.filter(y=>!y.sealed&&!y.faceDown&&card(y).type==='gear'));
  const options=targetOptions(s,t.p,gears);
  if(options.length)choice(s,t,'手札に戻すクロスギアを1枚選ぶ',options);
  break;
 }
 case'g34_OpponentBury921':{
  const chooser=1-t.p,shields=s.players[chooser].shields;
  // The opponent chooses their own card, while the spell still causes the destruction.
  const units=creatures(s,chooser).filter(y=>api.targetable(s,chooser,chooser,y))
   .map(y=>opt('クリーチャー：'+card(y).name,{origin:'battle',uid:y.uid},-cost(effective(y,s)),y.cardId));
  const options=[...units,...ownShieldGraveOptions(s,chooser).map(o=>({...o,
   score:shields.length<=1?-25:0,value:{origin:'shields',uid:o.value}}))];
  if(options.length)choice(s,{...t,chooser},'墓地に置く自分のクリーチャーかシールドを選ぶ',options,chooser);
  break;
 }
 case'g34_ShieldGrave':{
  const options=ownShieldGraveOptions(s,t.p);
  if(options.length)choice(s,t,'墓地に置く自分のシールドを1つ選ぶ',t.optional?[...options,skip()]:options);
  break;
 }
 case'g34_OwnShieldGraves697':{
  const most=Math.max(...s.players.map(p=>p.shields.length));
  const owners=t.owners??(t.opponentOnly?[1-t.p]:[s.active,1-s.active].filter(p=>!t.moreOnly||s.players[p].shields.length===most));
  const [owner,...rest]=owners,to=t.to??'grave',zone=to==='mana'?'マナゾーン':'墓地';
  if(owner===undefined){
   for(const {owner,uid} of t.picks||[]){
    const moved=api.moveShield(s,owner,uid,to);
    if(moved.length)api.log(s,owner,to==='mana'?'shieldMana':'shieldGrave',card(t.source).name+'：シールド1つ（カード'+moved.length+'枚）を'+zone+'に置いた',{cardId:t.source});
   }
   break;
  }
  const options=ownShieldGraveOptions(s,owner),next={...t,owners:rest};
  if(options.length)choice(s,{...next,chooser:owner},zone+'に置く自分のシールドを1つ選ぶ',options,owner);
  else put(s,next);
  break;
 }
 case'g34_Break497':{
  const self=t.owner==='self',owner=self?t.p:1-t.p,shields=s.players[owner].shields,chooser=t.ownerChooses?owner:t.p;
  const candidate=t.g747CreatureBreak?sourceHost474(s,t)?.x:null;
  const host=candidate&&!candidate.sealed&&api.isCreature(s,candidate)?candidate:null;
  const triggeredBreaker=t.g830BlockBreaker??t.g828BattleBreaker;
  if(t.g747CreatureBreak&&!host&&!triggeredBreaker)break;
  const c=host&&effective(host,s);
  const n=t.n==='all'?shields.length:Math.min(t.n+(c?.extraBreak||0),shields.length);
  const selected=t.n==='all'?shields.map(y=>y.uid):(t.selected||[]).filter(uid=>shields.some(y=>y.uid===uid));
  if(selected.length<n)choice(s,{...t,selected},
   'ブレイクする'+(chooser===owner?'自分':'相手')+'のシールドを'+n+'つ選ぶ（'+selected.length+'つ選択済み）',
   [...shields.flatMap((y,i)=>selected.includes(y.uid)?[]:[opt('シールド'+(i+1),y.uid,10)]),...(t.optional&&!selected.length?[skip()]:[])],chooser);
  else if(n)api.interruptBreak(s,owner,host?selected.slice(0,n):selected,{...t,op:'g34_AfterBreak278'},
   {player:t.p,sourceUid:host?.uid??t.uid,source:triggeredBreaker?(host?.cardId??triggeredBreaker):t.source,controller:t.p,g278Effect:true,
    ...(triggeredBreaker||t.g909AfterBreak?{incarnation:host?.incarnation??t.incarnation??0}:{}),
    ...(triggeredBreaker&&!host?{g913DepartedBreaker:true}:{}),
    ...(t.g909AfterBreak?{g909RequireBreak:true}:{}),
    ...(host?{incarnation:host.incarnation||0,...(c.g122NoST?{noST:true}:{}),reverse:!!c.reverseBurn,burn:!!c.shieldBurn,...(c.qqLock?{qqBreak:true}:{})}:{})});
  break;
 }
 case'g34_ShieldMana557':if(opp.shields.length)choice(s,t,'マナに置く相手のシールドを1つ選ぶ',opp.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,10)));break;
 case'g34_Break278':{
  const host=t.requiresCreature&&sourceHost474(s,t);
  if(t.requiresCreature&&(!host||!api.isCreature(s,host.x)))break;
  if(opp.shields.length)choice(s,t,'ブレイクする相手のシールドを1つ選ぶ',[...opp.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,10)),...(t.optional?[skip()]:[])]);break;
 }
 case'g34_AfterBreak278':if(t.g909Broke)start(s,t,t.g909AfterBreak);break;
 case'g34_Peek585':{
  if(t.opponentDeckTop){
   const held=reserved(opp),top=opp.deck.find(x=>!held.has(x.uid));
   showPeek585(s,t,top?[{seen:[top],label:'相手の山札の上'}]:[]);
   break;
  }
  const rows=peekRows585(s,t);
  if(t.all){showPeek585(s,t,rows);break;}
  if(!rows.length)break;
  choice(s,t,t.cardOnly?'確認するシールドカードを1枚選ぶ':'確認するシールドを1つ選ぶ',[
   ...rows.map(({x,p,label,seen})=>opt(label+(x.faceUp?'：'+card(x).name:''),{uid:x.uid,player:p,origin:'shields'},t.viewed?.includes(x.uid)?-5:seen.some(y=>!y.faceUp)?5:1,x.faceUp?x.cardId:undefined)),
   ...(t.viewed?.length?[opt('これ以上選ばない',null,0)]:t.optional?[opt('見ない',null,0)]:[])
  ]);
  break;
 }
 case'g34_ShieldHand':put(s,{...t,op:'g55_ShieldHand'});break;
 case'g34_HandShield657':
  if(own.hand.length&&api.canAddShield(s,t.p))choice(s,t,'シールド化する手札を1枚選ぶ（任意）',[
   ...own.hand.map(y=>opt(card(y).name,y.uid,card(y).gCastle||faces(card(y)).some(c=>c.trigger)?12:2,y.cardId)),skip()
  ]);
  break;
 case'g34_ShieldSide657':{
  const y=own.hand.find(y=>y.uid===t.target&&(y.zoneSerial||0)===t.serial);
  if(y&&api.canAddShield(s,t.p))choice(s,t,'シールドを置く向きを選ぶ',[
   opt('表向きで置く',true,card(y).gCastle?10:-2,y.cardId),opt('裏向きで置く',false,1,y.cardId)
  ]);
  break;
 }
 case'g34_LookShield744':{
  // QA47059: there is no referenced card if the look is prohibited.
  const [uid]=look(s,{...t,n:1});
  const y=own.deck.find(x=>x.uid===uid);
  if(!y)break;
  const name=card(y).name;
  choice(s,{...t,target:uid},name+'を新しいシールドに置く',api.canAddShield(s,t.p)?[
   opt('表向きで置く',true,-1,y.cardId),opt('裏向きで置く',false,1,y.cardId)
  ]:[opt('確認',false,0,y.cardId)]);
  break;
 }
 case'g34_ShieldTop':
  if(t.faceUp)put(s,{...t,op:'g33_FaceTop'});
  else api.shieldTop(s,t.p,card(t.source),null,t.g779Simultaneous?{count:t.n}:undefined);
  break;
 case'g34_Ragnarok':{
  const moved=api.moveShields(s,t.p,own.shields.map(api.shieldGroup),'grave');
  const n=moved.filter(x=>own.grave.includes(x)).length+1;
  start(s,t,[{op:'ShieldTop',n,g779Simultaneous:true}]);
  break;
 }
 case'g34_OnShieldMove654':{
  const x=own.shields.find(y=>y.uid===t.placed);
  if(x?.faceUp&&matches(s,t.p,x,t.g654MovedFilter))start(s,t,t.after);
  break;
 }
 case'g34_AfterAttackDestroy':if(s.attackLifecycle)(s.attackLifecycle.g176Deaths??=[]).push({p:t.p,uid:t.uid,incarnation:t.incarnation||0,source:t.source});break;
 case'g34_Offer':{
  if(t.g792Once&&(used792(s,t,t)||!own.deck.length))break;
  if(t.g790CreatureBreak){
   const host=sourceHost474(s,t)?.x;
   if(!host||host.sealed||!api.isCreature(s,host)||!opp.shields.length)break;
  }
  if(card(t.source).supportBatch==='phase-596'){
  const score=modeScore(s,t,t.defs)-(own.shields.length===1?18:5);
  choice(s,t,t.title,[opt('使う',true,score),skip()]);
  break;
 }if(t.g299ShieldHand&&!own.shields.some(x=>api.shieldCards(x).some(y=>!y.g37ShieldHeld)))break;const defs=t.defs||[],refill=t.g292Refill?defs[0]:null,exchange=defs.length===2&&defs[0].op==='Draw'&&defs[1].g183Return,drains=defs.length&&defs.every(d=>['Draw','Ramp','ShieldTop'].includes(d.op)),n=t.g409Namake?(api.deckLocked(s,t.p)?0:Math.min(own.deck.length,api.canAddShield(s,t.p)?2:1)):t.g359RevealAll?(api.deckLocked(s,t.p)?0:api.lookCount(s,t.p,defs[0].n)):t.g356RampReturn?defs[0].n:t.g294MillDraw?defs.reduce((n,d)=>n+(d.n||0),0):refill?(own.hand.length<=refill.max?Math.max(0,refill.n-own.hand.length):0):t.g186GraveMill?defs[0].n:exchange||t.g204DrawDiscard?defs[0].n:drains?defs.reduce((n,d)=>n+(d.n||0),0):0,last=n>0&&n>=own.deck.length,shako=last&&(t.g294MillDraw&&own.deck.length>defs[0].n||refill||exchange||t.g204DrawDiscard||defs.every(d=>d.op==='Draw'))&&creatures(s,t.p).some(y=>effective(y,s).shako);choice(s,t,t.title||'この能力を使う？',[opt('使う',true,last?(shako?1000:-1000):t.g299ShieldHand?(own.shields.length>1&&own.hand.length<4?8:-8):t.g298SelfMana?(own.mana.length<6?18:own.mana.length<9?4:-8)-(x&&api.isEvolution(x)?12:0):t.defs?.length===1&&t.defs[0].op==='MillRecover545'?modeScore(s,t,t.defs):t.defs?.length===1&&t.defs[0].op==='RecoverAll326'?recoveryScore326(s,{...t,...t.defs[0]}):t.score??10),skip()]);break;}
 case'g34_KeepOne604':{
  const p=1-t.p,hand=t.zone==='hand';
  const rows=hand?s.players[p].hand:creatures(s,p).filter(y=>!y.sealed);
  if(rows.length)choice(s,{...t,p,controller:t.controller??t.p},hand?'残す手札を1枚選ぶ':'残すクリーチャーを1体選ぶ',
   rows.map(y=>opt(card(y).name,y.uid,hand?20-Math.min(20,cost(card(y))):cost(effective(y,s))*2+api.power(y,false,s)/2000,y.cardId)));
  break;
 }
 case'g34_ReleaseSelfHyper783':{
  const y=live(s,t);
  if(y)releaseHyper781(s,t.p,y);
  break;
 }
 case'g34_ReleaseAllHyper781':
  for(const y of creatures(s,t.p))if(exactRaces(effective(y,s)).includes('超化獣'))releaseHyper781(s,t.p,y);
  break;
 case'g34_OpponentDeploy779':put(s,{...t,op:'g34_Select',p:1-t.p,controller:t.controller??t.p,
  origin:'hand',deploy:true,n:1,optional:true,filter:{creature:true,max:3}});break;
 case'g34_OpponentOffer777':put(s,{...t,op:'g34_Offer',p:1-t.p});break;
 case'g34_OpponentSelect':{
  const origin=t.origin||'battle',battle=origin==='battle';
  const action=t.tap?'タップする':t.to==='grave'?'破壊する':t.to==='hand'?'手札に戻す':'マナに置く';
  const title=t.title||action+(battle?'自分のクリーチャーを'+(t.n??1)+'体':'自分の'+origin+'のカードを'+(t.n??1)+'枚')+'選ぶ';
  put(s,{...t,op:'g34_Select',p:1-t.p,controller:t.controller??t.p,origin,filter:{...(battle?{creature:true}:{}),...t.filter},g187OwnPick:!t.deploy,title});
  break;
 }
 case'g34_OpponentManaLoss478':put(s,{...t,op:'g34_Select',p:1-t.p,controller:t.controller??t.p,origin:'mana',to:'grave',n:1,g184ManaLoss:true,title:'墓地に置く自分のマナを1枚選ぶ'});break;
 case'g34_CloneCrush697':{
  const copies=graveNameCount698(s,[0,1],card(t.source).name);
  const title='破壊するパワー3000以下の相手クリーチャーを'+(copies?'最大'+(1+copies)+'体選ぶ（1体目は必須）':'1体選ぶ');
  start(s,t,[{op:'Select',owner:'opponent',origin:'battle',to:'grave',filter:t.filter,n:1+copies,
   optional:true,minimum:1,g173Targets:true,g193Select:true,title}]);
  break;
 }
 case'g34_Select':{
  const limit=t.g746OwnManaCost?{filter:{...t.filter,max:own.mana.length}}:{};
  selection(s,{selected:[],rows:[],...t,...limit});
  break;
 }
 case'g34_Put':{const y=s.players[t.owner??t.p][t.origin]?.find(x=>x.uid===t.target);if(!y)break;const c=faces(card(y))[t.face||0];if(t.execution&&c.type==='spell'){doPut(s,t);break;}if(!canPut(s,t.p,y,t.origin,!!t.execution))break;if(c.g213Mars||c.g31Evolution?.minCards){doPut(s,t);break;}if(c.evolution||c.neoEvolution&&!t.noEvolve){
  let bases=api.evolutionBases(s,t.p,c).filter(b=>b.uid!==y.uid&&(!t.g799YobiBases||t.g799YobiBases.includes(b.uid)));
  if(t.g799YobiBases){
   const other=t.rows.find(r=>r.uid!==y.uid&&own.deck.some(x=>x.uid===r.uid&&card(x).evolution));
   const next=other&&own.deck.find(x=>x.uid===other.uid);
   const nextBases=next?api.evolutionBases(s,t.p,card(next)).filter(b=>t.g799YobiBases.includes(b.uid)):[];
   const both=bases.filter(b=>nextBases.some(nextBase=>nextBase.uid!==b.uid));
   if(both.length)bases=both;
  }
  const options=[...(c.neoEvolution?[opt('進化させずに出す',null,1)]:[]),...bases.map(b=>opt(card(b).name,b.uid,10,b.cardId))];
  if(options.length)choice(s,t,'出すクリーチャーの進化元を選ぶ',options);
 }else doPut(s,t);break;}
 case'g34_ManaDown426':{const rows=own.mana.filter(y=>!y.faceDown);if(rows.length)choice(s,t,'裏向きにする自分のマナを1枚選ぶ（任意）',[...rows.map(y=>opt(card(y).name,{uid:y.uid,serial:y.zoneSerial||0},manaDownScore426(s,t,y),y.cardId)),skip()]);break;}
 // A failed deployment must not be confused with a failed printed condition.
 case'g34_RevealTop514':{
  const ids=look(s,{...t,n:1,public:true}),y=own.deck.find(y=>y.uid===ids[0]);
  if(!y){api.deckCheck(s,t.p);break;}
  const filter=t.g746OwnManaCost?{...t.filter,max:own.mana.length}:t.filter;
  const matched=matches(s,t.p,y,filter),to=matched?t.to:t.elseTo;
  const defs=to?[{op:'RevealMove514',target:y.uid,to,...(t.g774Banky?{g774Banky:true}:{})}]:matched?[]:t.elseDefs||[];
  const release={op:'RevealRelease514',ids};
  if(matched&&t.optional&&to==='battle'&&canPut(s,t.p,y,'deck'))
   start(s,t,[{op:'Offer',title:card(y).name+'をバトルゾーンに出す？',score:own.deck.length<=1?-1000:20+Math.min(20,cost(card(y))),defs},release]);
  else if(matched&&t.optional&&to==='shields')
   start(s,t,api.canAddShield(s,t.p)?[{op:'Offer',title:card(y).name+'を裏向きの新しいシールドにする？',score:own.deck.length<=1?-1000:20,defs},release]:[release]);
  else if(!matched&&t.g768OptionalBottom&&defs.length)
   start(s,t,[{op:'Offer',title:'公開したカードを山札の下に置く？',defs},release]);
  else start(s,t,[...defs,release]);
  break;
 }
 case'g34_RevealMove514':if(t.to==='battle')put(s,{...t,op:'g34_Put',origin:'deck'});else zoneMove(s,t.p,'deck',t.target,t.to,t);break;
 case'g34_RevealRelease514':for(const uid of t.ids)release(s,t.p,uid);api.deckCheck(s,t.p);break;
 case'g34_DoubleYobi799':{
  if(api.deckLocked(s,t.p))break;
  const protectedIds=reserved(own),ids=[],hits=[];
  const limit=api.lookCount(s,t.p,own.deck.length);
  for(const y of own.deck){
   if(ids.length===limit||hits.length===2)break;
   if(protectedIds.has(y.uid))continue;
   ids.push(y.uid);
   const c=api.zoneCard(s,t.p,y,'deck');
   if(c.type==='creature'&&cost(c)<(t.max==='∞'?Infinity:t.max))hits.push(y);
  }
  if(!ids.length)break;
  look(s,{...t,n:ids.length,public:true});
  const rows=hits.filter(x=>canPut(s,t.p,x,'deck'))
   .sort((a,b)=>Number(!!card(b).evolution)-Number(!!card(a).evolution))
   .map(x=>({uid:x.uid,p:t.p,origin:'deck'}));
  finishSelect(s,{...t,rows,deploy:true,g799YobiBases:own.battle.map(x=>x.uid),
   after:[{op:'DoubleYobiRest799',ids}]});
  break;
 }
 case'g34_DoubleYobiRest799':{
  const rest=t.ids.map(uid=>{release(s,t.p,uid);return remove(own.deck,uid);}).filter(Boolean);
  for(const y of rest)delete y.g11Sideways;
  if(rest.length)own.deck.push(...api.shuffled(rest,Math.floor(api.random(s)*4294967296)));
  api.deckCheck(s,t.p);
  break;
 }
 case'g34_Clock842':put(s,{...t,op:'g61_Clock',g842FixedOrder:true});break;
 case'g34_TappedPower843':{
  const n=tappedCreatures843(s,t.p);
  put(s,{...t,op:'g34_Target',power:-1000*n,g242PowerMinus:true,title:'パワーを下げる相手のクリーチャーを選ぶ'});
  break;
 }
 case'g34_CheckShield843':{
  const x=own.shields.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);
  if(x&&faces(api.zoneCard(s,t.p,x,'shields')).some(c=>c.type==='creature'&&colors(c).some(q=>q==='闇'||q==='火')))
   start(s,t,[{op:'Draw',n:1,optional:true}]);
  break;
 }
 case'g34_TappedShields842':{
  const n=tappedCreatures843(s,t.p);
  if(n)put(s,{...t,op:'g34_TappedShieldPick842',n,picked:[]});
  break;
 }
 case'g34_TappedShieldPick842':{
  const defender=t.owner==='self'?t.p:1-t.p,shields=s.players[defender].shields;
  const options=shields.flatMap((x,i)=>api.shieldCards(x).some(y=>!y.g37ShieldHeld)
   ?[opt('シールド '+(i+1)+(x.faceUp?'：'+card(x).name:''),x.uid,t.picked.includes(x.uid)?0:10,x.faceUp?x.cardId:undefined)]:[]);
  // Rule 601.1h: a choice for each creature may name the same shield again.
  if(options.length&&t.picked.length<t.n)choice(s,t,(t.owner==='self'?'自分が':'相手が')+'手札に加えるシールドを選ぶ（'+t.picked.length+'/'+t.n+'）',options);
  else if(t.picked.length)api.interruptBreak(s,defender,[...new Set(t.picked)],task('g34_Sequence',t.p,t.source,{defs:[]}),{g842Hand:true,controller:t.p,source:t.source});
  break;
 }
 case'g34_ContinueDeckSpell841':api.resumeCastSpell(s,t.p,t.uid,true);break;
 case'g34_Unryu852':{
  const [uid]=look(s,{...t,n:1}),top=own.deck.find(x=>x.uid===uid);
  if(!top)break;
  release(s,t.p,uid);
  const peek={...t,g585Peek:[{id:top.cardId,label:'自分の山札の上'}]};
  if(card(top).type==='gear'&&canPut(s,t.p,top,'deck')){
   choice(s,{...peek,target:uid},'クロスギアを出して、このクリーチャーをアンタップする？',[
    opt('出してアンタップする',true,own.deck.length>1?18:-1000,top.cardId),skip()
   ]);
  }else choice(s,{...peek,op:'g34_PeekRead585'},'確認したカード',[opt('確認を終える',null,0)]);
  break;
 }
 case'g34_LookSpell841':{
  const [uid]=look(s,{...t,n:1,public:t.g878SpellBlue||t.public}),y=own.deck.find(x=>x.uid===uid);
  if(!y)break;
  release(s,t.p,y.uid);
  const revealedFaces=faces(api.zoneCard(s,t.p,y,'deck'));
  if(t.g878SpellBlue&&!revealedFaces.some(c=>c.type==='spell')){
   zoneMove(s,t.p,'deck',y.uid,'hand');
   api.deckCheck(s,t.p);
   break;
  }
  const options=revealedFaces.flatMap((c,face)=>c.type==='spell'&&api.canCast(s,t.p,c,'deck')
   ?[opt(c.name+'を唱える',{uid,face,serial:y.zoneSerial||0},own.deck.length===1?-1000:spellScore555(s,t,c),y.cardId)]:[]);
  const peek={...t,g585Peek:[{id:y.cardId,label:'自分の山札の上'}]};
  if(options.length)choice(s,peek,'確認したカードの呪文を唱える？',[...options,skip()]);
  else if(!t.g878SpellBlue)choice(s,peek,'確認したカード',[opt('確認を終える',null,0)]);
  break;
 }
 case'g34_MillHatch841':{
  const y=api.takeTop(s,t.p);
  if(y){clear(y,'grave');api.addZone(s,t.p,'grave',y);}
  api.deckCheck(s,t.p);
  if(y&&s.winner===null&&matches(s,t.p,y,t.filter)){
   const hatch={op:'HatchHunter841',target:y.uid,serial:y.zoneSerial||0};
   start(s,t,t.optional?[{op:'SelfSacrifice407',defs:[hatch]}]:[{op:'SelfDestroy'},hatch]);
  }
  break;
 }
 case'g34_HatchHunter841':{
  const y=own.grave.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);
  if(y&&canPut(s,t.p,y,'grave'))put(s,{...t,op:'g34_Put',origin:'grave'});
  break;
 }
 case'g34_LookDeploy530':{
  const ids=look(s,t.g201Search?{...t,n:own.deck.length}:t);
  let eligible=ids;
  if(t.g798DifferentCost!==undefined){
   const costs=new Set(creatures(s,t.p).filter(x=>!x.sealed).map(x=>cost(api.zoneCard(s,t.p,x,'battle'))));
   eligible=own.deck.filter(x=>ids.includes(x.uid)&&matches(s,t.p,x,{creature:true,max:t.g798DifferentCost})&&!costs.has(cost(api.zoneCard(s,t.p,x,'deck')))).map(x=>x.uid);
  }
  const rest=t.g798DifferentCost!==undefined?{op:'Distribute255',ids,rest:'grave'}:{op:'LookRest530',ids,rest:t.rest||'top'};
  const inspection=t.g841DeckPeek?{g585Peek:own.deck.filter(x=>ids.includes(x.uid)).map(x=>({id:x.cardId,label:'自分の山札'}))}:{};
  put(s,{...t,...inspection,op:'g34_Select',origin:'deck',g530Ids:eligible,deploy:true,n:t.limit??'all',optional:!t.g749Required,
   title:t.title||'確認したカードから出すクリーチャーを選ぶ',after:[rest]});
  break;
 }
 case'g34_LookRest530':put(s,{...t,op:'g34_Order',rest:t.rest||'top',g259OrderTop:true,ordered:[]});break;
 case'g34_Marianna728':{
  const ids=look(s,{...t,n:own.deck.length});
  const rows=own.deck.filter(x=>ids.includes(x.uid)).flatMap(x=>faces(card(x)).flatMap((c,face)=>
   c.type==='spell'&&(c.trigger||c.triggerPlus||c.superTrigger)?[opt(c.name,{uid:x.uid,face},cost(c)+1,x.cardId)]:[]));
  if(rows.length)choice(s,{...t,ids},'山札からS・トリガー付きの呪文を選ぶ',[...rows,skip()]);
  else put(s,{...t,op:'g34_Order',ids,rest:'shuffle'});
  break;
 }
 case'g34_MariannaCast728':{
  const x=own.deck.find(x=>x.uid===t.selected.uid),c=x&&faces(card(x))[t.selected.face];
  if(c&&api.canCast(s,t.p,c,'deck'))choice(s,t,c.name+'をコストを支払わずに唱える？',[opt('唱える',true,10,x.cardId),skip()]);
  break;
 }
 case'g34_Batsuda767':{
  const host=sourceHost474(s,t);
  if(host&&!host.x.sealed&&api.isCreature(s,host.x))
   choice(s,t,'このクリーチャーをマナゾーンに置く？',[opt('マナゾーンに置く',true,20,host.x.cardId),skip()]);
  break;
 }
 case'g34_AttackDraw770':
  if(!used(s,'g770AttackDrawUsed',t))
   choice(s,t,'カードを1枚引く？',[opt('引く',true,own.deck.length<=1?-1000:10),skip()]);
  break;
 case'g34_Zentuu767':
  if(!used(s,'g767UnpaidRaidUsed',t))
   choice(s,t,'マジック・メクレイド5する？',[opt('メクレイドする',true,20),skip()]);
  break;
 case'g34_MagicRaid764':case'g34_Raid767':{
  const ids=look(s,{...t,n:3});
  if(ids.length)put(s,{...t,op:'g34_RaidPick',ids,race:t.race??'マジック',max:t.max??8,privateLook:true});
  break;
 }
 case'g34_RaidPick':return raid764.run(s,t);
 case'g34_Look':{if(t.g201Search)t={...t,n:own.deck.length};let ids;if(t.stages?.some(q=>q.g467Destinations&&!q.filter)&&api.deckLocked(s,t.p)){t={...t,g467Blind:true};const skip=reserved(own);ids=own.deck.filter(x=>!skip.has(x.uid)).slice(0,t.n).map(x=>x.uid);(own.g34Protected??=[]).push(...ids);}else ids=look(s,t);put(s,{...t,op:'g34_LookPick',ids,stage:0,chosen:[]});break;}
 case'g34_Distribute255':distribute255(s,t);break;
 case'g34_LookPick':{const xs=t.ids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(Boolean),stages=t.stages||[],stage=stages[t.stage];if(!stage){
   if(t.g791OrderRest)distribute255(s,{...t,ids:[]});
   if(s.winner===null)put(s,{...t,op:t.g255Distribute&&!t.g791OrderRest?'g34_Distribute255':'g34_Order',ids:xs.map(x=>x.uid),ordered:[],after:t.after});
   break;
  }const blocked=stage.g657FaceUp&&stage.to==='shields'&&!api.canAddShield(s,t.p),selected=blocked?[]:t.chosen||[],rows=blocked?[]:xs.filter(y=>!selected.includes(y.uid)&&matches(s,t.p,y,stage.filter));
  if(stage.allMatches&&rows.length){put(s,{...t,chosen:[...selected,...rows.map(y=>y.uid)]});break;}
  if(stage.g424AllOrNone&&rows.length){choice(s,{...t,op:'g34_LookAll424',g424Ids:rows.map(y=>y.uid)},'条件に合うカードをすべて手札に加える？',[opt('すべて手札に加える',true,rows.length>=own.deck.length?-1000:rows.reduce((n,y)=>n+10+cost(card(y)),0),rows[0].cardId),skip()]);break;}if(stage.g467Destinations&&!selected.length&&stage.n===1&&rows.length===1&&!stage.optional){put(s,{...t,chosen:[rows[0].uid]});break;}if(selected.length>=(stage.n==='all'?Infinity:stage.n)||!rows.length){const moved=selected.filter(uid=>own.deck.some(x=>x.uid===uid));if(stage.g467Destinations&&!stage.g467Chosen&&moved.length){put(s,{...t,op:'g34_LookDestination467'});break;}if(t.g255Distribute){put(s,{...t,ids:t.ids.filter(uid=>!moved.includes(uid)),stage:t.stage+1,chosen:[],g255Plans:[...(t.g255Plans||[]),...moved.map(uid=>({uid,to:stage.to}))]});break;}for(const uid of moved){const y=own.deck.find(x=>x.uid===uid);if((stage.reveal||t.g443PublicIds?.includes(uid))&&y)api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(y).name,{cardId:y.cardId});zoneMove(s,t.p,'deck',uid,stage.to,{...t,tapped:stage.tapped,g657FaceUp:stage.g657FaceUp??t.g657FaceUp});}put(s,{...t,ids:t.ids.filter(uid=>!moved.includes(uid)),stage:t.stage+1,chosen:[],moved:(t.moved||0)+moved.length});break;}choice(s,t,stage.title||(stage.g467Destinations?'移動するカードを1枚選ぶ':null)||('山札から'+(stage.n==='all'?'条件に合うカード':stage.n+'枚')+'を'+({hand:'手札',mana:'マナ',grave:'墓地',shields:'シールド'}[stage.to]||stage.to)+'へ'),[...rows.map(y=>opt(t.g467Blind?'山札の上から'+(t.ids.indexOf(y.uid)+1)+'枚目（裏向き）':card(y).name,y.uid,t.g467Blind?0:t.g323Scry?scryScore323(s,t,y):t.g255Search&&stage.optional&&selected.length+1>=own.deck.length?-1000:t.g200Search&&stage.to==='hand'&&selected.length+1>=own.deck.length?-1000:t.g185Search&&stage.to==='hand'&&own.deck.length===1?-1000:stage.to==='grave'||t.g200Search&&stage.to==='deck'?-cost(card(y)):10+cost(card(y)),t.g467Blind?undefined:y.cardId)),...(stage.optional?[skip()]:[])]);break;}
 case'g34_Order':{const ids=t.ids.filter(uid=>own.deck.some(x=>x.uid===uid));if(t.rest==='shuffle'){for(const uid of ids)release(s,t.p,uid);api.shuffleLibrary(s,t.p);if(t.after)start(s,t,t.after);api.deckCheck(s,t.p);break;}if(t.rest==='top'){if(t.g259OrderTop&&ids.length>1){choice(s,{...t,ids},'山札の上から置く順序を選ぶ',ids.map(uid=>opt(card(own.deck.find(x=>x.uid===uid)).name,uid,0,own.deck.find(x=>x.uid===uid).cardId)));break;}const xs=(t.g259OrderTop?[...(t.ordered||[]),...ids]:ids).map(uid=>remove(own.deck,uid)).filter(Boolean);for(const uid of t.g259OrderTop?[...(t.ordered||[]),...ids]:ids)release(s,t.p,uid);own.deck.unshift(...xs);if(t.after)start(s,t,t.after);api.deckCheck(s,t.p);break;}if(t.rest==='grave'||t.rest==='mana'){for(const uid of ids)zoneMove(s,t.p,'deck',uid,t.rest,{...t,tapped:!!t.restTapped});if(t.after)start(s,t,t.after);api.deckCheck(s,t.p);break;}if(ids.length>1)choice(s,{...t,ids},'残りを山札の下に置く順序を選ぶ',ids.map(uid=>{const y=own.deck.find(x=>x.uid===uid);return opt(card(y).name,uid,0,y.cardId);}));else{for(const uid of [...(t.ordered||[]),...ids]){const y=remove(own.deck,uid);release(s,t.p,uid);if(y)own.deck.push(y);}if(t.after)start(s,t,t.after);api.deckCheck(s,t.p);}break;}
 // Movement uses the normal ramp replacements; the second card never repeats the test.
 case'g34_RampMatch516':{const y=api.takeTop(s,t.p);if(!y){api.deckCheck(s,t.p);break;}const dest=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';clear(y,dest);if(dest==='mana')y.tapped=true;api.addZone(s,t.p,dest,y);const matched=matches(s,t.p,y,t.filter);api.deckCheck(s,t.p);if(s.winner===null)start(s,t,[...(matched?[{op:'Ramp',n:1,tapped:true}]:t.elseDraw?[{op:'Draw',n:1}]:[]),...(t.after||[])]);break;}
 case'g34_CreatureCountRamp765':{
  const count=countDraw(s,t.p,{...t,zone:'battle'});
  if(!count)break;
  if(t.optional)start(s,t,[{op:'Ramp',n:count,optional:true,tapped:t.tapped,g809Together:t.g809Together}]);
  else ramp(s,t,count);
  break;
 }
 case'g34_Ramp':if(t.optional)choice(s,t,'山札からマナに置く枚数を選ぶ',Array.from({length:Math.min(t.n,own.deck.length)+1},(_,n)=>opt(n+'枚',n,n<own.deck.length?n*5:-100)));else ramp(s,t,t.n);break;
 case'g34_DrawAfterGear816':
  if(own.grave.some(y=>y.uid===t.target))start(s,t,[{op:'DrawUpTo',n:2}]);
  break;
 case'g34_DrawUpTo':if(t.n>0)choice(s,t,'あと'+t.n+'枚まで引けます。1枚引く？',[opt('1枚引く',true,t.g203Draw&&own.deck.length<=1&&creatures(s,t.p).some(y=>effective(y,s).shako)?1000:own.deck.length>1?10:-100),skip()]);break;
 case'g34_StartDraw729':{
  if(!t.sources.length){api.draw(s,t.p,t.n);break;}
  choice(s,t,card(t.source).name+'でターン開始のドローを1枚増やす？',[
   opt('1枚多く引く',true,own.deck.length>t.n+1?10:-100,t.source),skip()
  ]);
  break;
 }
 case'g34_Draw':
  if(t.optional)choice(s,t,'カードを'+t.n+'枚まで引く',Array.from({length:t.n+1},(_,n)=>opt(n+'枚',n,n<own.deck.length?n*5:-100)));
  else{
   const drawn=api.draw(s,t.owner==='opponent'?1-t.p:t.p,t.n);
   if(t.g818AfterDraw&&drawn>0&&s.winner===null)start(s,t,t.g818AfterDraw);
  }
  break;
 // Use the same physical top-card selector as normal milling.
 case'g34_MillMatch520':{const y=api.takeTop(s,t.p);if(!y){api.deckCheck(s,t.p);break;}clear(y);api.addZone(s,t.p,'grave',y);const matched=matches(s,t.p,y,t.filter);api.deckCheck(s,t.p);if(s.winner!==null||!matched)break;if(t.defs){start(s,t,t.defs);break;}const host=sourceHost474(s,t);if(!host)break;const unit=host.x;if(t.untap){if(api.canUntap(unit)){const was=unit.tapped;unit.tapped=false;if(was)combined.untapped(s,host.p,unit);}}else{if(t.powerAttacker)(unit.powerModifiers??=[]).push({amount:t.powerAttacker,expires:'end',who:s.active,attackOnly:true,grantedAbility:true});if(t.breaker||t.unblockable||t.speedAttacker)(unit.g34Grants??=[]).push({turn:s.turn,...(t.breaker?{g313Breaker:t.breaker}:{}),...(t.unblockable?{unblockable:true}:{}),...(t.speedAttacker?{speedAttacker:true}:{})});}break;}
 case'g34_MillRecover791':{
  const milled=[];
  for(let i=0;i<t.n;i++){
   const y=api.takeTop(s,t.p);
   if(!y)break;
   clear(y,'grave');
   milled.push(y);
  }
  api.addZone(s,t.p,'grave',...milled);
  api.deckCheck(s,t.p);
  if(s.winner===null&&milled.length)start(s,t,[{op:'Select',origin:'grave',to:'hand',n:1,optional:true,
   g530Ids:milled.map(y=>y.uid),title:'今墓地に置いたカードを1枚まで手札に戻す'}]);
  break;
 }
 case'g34_MillExtraBreak745':{
  const first=own.grave.length;
  api.mill(s,t.p,t.n);
  if(s.winner!==null)break;
  const amount=own.grave.slice(first).filter(y=>faces(api.zoneCard(s,t.p,y,'grave'))
   .some(f=>f.type==='creature'&&race(f,t.race))).length;
  if(amount)start(s,t,[{op:'SelfExtraBreak444',amount}]);
  break;
 }
 case'g34_MillTapped782':{
  const n=Math.min(own.deck.length,creatures(s,t.p).filter(y=>!y.sealed&&y.tapped).length);
  if(n)choice(s,t,'山札の上から墓地に置く枚数を選ぶ',
   Array.from({length:n+1},(_,count)=>opt(count+'枚',count,count===own.deck.length?-100:count)));
  break;
 }
 case'g34_Mill':{
  const p=t.owner??t.p,n=t.n==='∞'?s.players[p].deck.length:t.n;
  if(t.optional)choice(s,t,t.n==='∞'?'山札をすべて墓地に置く？':'山札の上'+n+'枚を墓地に置く？',[opt('置く',true,own.deck.length>n?10:-100),skip()]);
  else api.mill(s,p,n);
  break;
 }
 // Count physical mana cards once on resolution, independently of their mana numbers or tapped state.
 case'g34_ManaCostSweep522':
  if(t.g735BelowColorless){
   const n=own.mana.filter(y=>api.manaColors(card(y.faceDown?'face-down-mana':y),s,t.p).length===0).length;
   if(n)start(s,t,[{op:'Sweep',both:true,filter:{creature:true,belowCost:n}}]);
  }else start(s,t,[{op:'Sweep',filter:{creature:true,min:opp.mana.length+1}}]);
  break;
 // Capture the physical mana count before moving a card out of that zone. Execute preserves actual summoning.
 case'g34_ManaCountRamp529':{const n=own.mana.length;if(n)start(s,t,[{op:'Offer',title:'山札から'+n+'枚をまとめてタップしてマナに置く？',defs:[{op:'Ramp',n,tapped:true}]}]);break;}
 case'g34_ManaDeploy523':{const max=own.mana.length;start(s,t,[t.summon?{op:'Execute',origin:'hand',creatureOnly:true,max,optional:t.optional}:{op:'Select',origin:t.origin,n:1,deploy:true,optional:t.optional,filter:{...t.filter,max}}]);break;}
 case'g34_PowerSweep696':choice(s,t,t.max+'以下の数字を選ぶ',powerSweepOptions696(s,t));break;
 case'g34_CostSweep596':choice(s,t,'一掃する相手クリーチャーのコストを選ぶ',costSweepOptions(s,t));break;
 case'g34_Sweep':{
  const players=t.owner==='self'?[t.p]:t.both?[0,1]:[1-t.p];
  const to=t.to||'grave';
  const rows=players.flatMap(p=>s.players[p].battle
   .filter(y=>(!t.g733DrawPerAttempt||!y.sealed&&api.isCreature(s,y))&&matches(s,p,y,t.filter)&&y.uid!==t.excludeUid&&(!t.g179Other||!api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))))
   .map(y=>({player:p,uid:y.uid,to,destroy:to==='grave'&&!t.g815PutInGrave})));
  if(rows.length){
   // The direct destruction attempts count even when replaced (QA34333/34334).
   if(t.g733DrawPerAttempt)start(s,t,[{op:'DrawUpTo',n:rows.length,g203Draw:true}]);
   move(s,rows,t.g865DrawDestroyed?{kind:'g865DrawDestroyed',player:t.p,source:t.source}:null);
  }
  break;
 }
 case'g34_TapState235':{const y=s.players[t.target.p].battle.find(y=>y.uid===t.target.uid&&(y.incarnation||0)===t.target.incarnation);if(y)choice(s,t,'「'+card(y).name+'」をどうする？',[opt('タップする',true,tapStateScore235(s,t,t.target.p,y,true)),opt('アンタップする',false,tapStateScore235(s,t,t.target.p,y,false))]);break;}
 case'g34_ManaChoose582':
  if(t.who==='choose')choice(s,t,'マナからカードを選ぶプレイヤーを決める',[opt('自分',t.p,0),opt('相手',1-t.p,Math.min(t.n,manaRows582(s,1-t.p,t).length)*10)]);
  else if(t.who==='each')manaPlayer582(s,{...t,next:1-s.active},s.active);
  else manaPlayer582(s,t,t.who==='opponent'?1-t.p:t.p);
  break;
 case'g34_ManaPick582':{
  const rows=manaRows582(s,t.p,t),remaining=rows.filter(x=>!t.chosen.includes(x.uid));
  if(t.keep&&rows.length<=t.n)break;
  if(t.chosen.length>=t.n||!remaining.length){finishMana582(s,t,rows);break;}
  const to=t.destinations?.[t.chosen.length]??t.to;
  const purpose=t.keep?'マナに残す':{hand:'手札に戻す',deck:'山札の下に置く',deckTop:'山札の上に置く',grave:'墓地に置く'}[to];
  choice(s,t,purpose+'カードを選ぶ（'+(t.chosen.length+1)+'/'+Math.min(t.n,rows.length)+'）',remaining.map(x=>{
   const index=s.players[t.p].mana.indexOf(x)+1;
   return x.faceDown?opt('裏向きのマナ '+index,x.uid,t.keep?-4:4):opt(card(x).name,x.uid,t.keep?(x.tapped?3:8)+(colors(card(x)).length>1?4:0):x.tapped?8:4,x.cardId);
  }));
  break;
 }
 case'g34_OwnCard581':
  if(t.who==='choose')choice(s,t,'カードを選ぶプレイヤーを決める',[opt('自分',t.p,0),opt('相手',1-t.p,15)]);
  else ownCard581(s,t,t.who==='active'?s.active:1-t.p);
  break;
 case'g34_ManaPair581':{
  const owner=t.owner??t.p,options=cardMoveOptions579(s,{...t,owner,zones:['mana']});
  if(options.length)choice(s,t,(owner===t.p?'自分':'相手')+'の山札の上に置くマナを1枚選ぶ',options);
  else finishManaPair581(s,t);
  break;
 }
 case'g34_ProtectBattleCard580':{
  const owner=1-t.p;
  put(s,{...t,op:'g34_ProtectBattleChoice580',p:owner,owner});
  break;
 }
 case'g34_ProtectBattleChoice580':choice(s,t,'破壊の候補から外す自分のカードを1枚選ぶ',cardMoveOptions579(s,t).map(o=>({...o,score:-o.score})));break;
 case'g34_BattleCardDestination580':choice(s,t,'選ばれたカードをどこへ置く？',[opt('マナゾーンに置く','mana',own.mana.length<6?20:5),opt('手札に戻す','hand',10)]);break;
 case'g34_BattleCardBounce578':
 case'g34_BattleCardMove579':{
  const to=t.to||'hand',options=cardMoveOptions579(s,t);
  if(t.optional&&options.length)options.push(skip());
  const destination=t.ownerChoosesDestination?'手札かマナゾーンに移動する':{hand:'手札に戻す',grave:'墓地に置く',mana:'マナゾーンに置く',deck:'山札の下に置く',deckTop:'山札の上に置く',shields:'シールド化する'}[to];
  choice(s,t,destination+(t.anyOwner?'':'相手の')+'カードを1枚選ぶ',options);
  break;
 }
 case'g34_DiscardCost655':
  if(t.costs.length===1)start(s,t,[destroyBelowCost655(t.costs[0],t.g835Creature)]);
  else if(t.costs.length>1)choice(s,t,'捨てたカードの参照するコストを選ぶ',t.costs.map(n=>opt('コスト '+n,n,n==='∞'?100:n)));
  break;
 case'g34_TargetBelowSource692':{
  const host=sourceHost474(s,t.g828CompareAttacker?t.g399Attacker:t);
  const current=host&&!host.x.sealed&&api.isCreature(s,host.x)?currentPower506(s,host.x):t.g692LastPower;
  if(current===undefined||current===-Infinity||current==='-∞')break;
  if(t.g745Sweep){
   const threshold=current==='∞'?Infinity:current;
   const rows=[t.p,1-t.p].flatMap(p=>creatures(s,p)
    .filter(y=>!y.sealed&&currentPower506(s,y)<threshold)
    .map(y=>({player:p,uid:y.uid,to:'grave',destroy:true})));
   if(rows.length)move(s,rows);
  }else start(s,t,[{op:'Target',to:t.to,optional:t.optional,...(t.anyOwner?{anyOwner:true}:{}),...(t.g179Other?{g179Other:true}:{}),filter:{belowPower:current===Infinity?'∞':current,...(t.g199Power?{g199Power:true}:{})}}]);
  break;
 }
 case'g34_TargetByOwnCount655':
  start(s,t,[{op:'Target',to:t.to,optional:t.optional,filter:{max:creatures(s,t.p).filter(x=>!x.sealed).length}}]);
  break;
 case'g34_ManaExchange753':exchangePick753(s,t);break;
 case'g34_ManaExchangePick753':{
  const options=exchangeMana753(s,t);
  if(options.length)choice(s,t,'同じ持ち主のマナから、コストの小さいエレメントを選ぶ',[...options,skip()]);
  break;
 }
 case'g34_ManaExchangeBase753':{
  const {optional,bases}=api.manaExchangeBases753(s,t);
  if(bases.length)choice(s,t,'入れ替えて出すクリーチャーの進化元を選ぶ',[
   ...bases.map(x=>opt(card(x).name,x.uid,10,x.cardId)),...(optional?[opt('進化させずに出す',null,0)]:[])
  ],t.element.owner);
  else if(optional)api.beginManaExchange753(s,t,null);
  break;
 }
 case'g34_Target':{if(used792(s,t,t))break;const owner=t.owner==='self'?t.p:t.owner??1-t.p,ps=t.anyOwner?[t.p,1-t.p]:[owner],candidates=ps.flatMap(p=>s.players[p].battle.filter(y=>matches(s,p,y,{creature:!t.element,...t.filter})&&(!t.g824Panya||panyaCanReturn(s,y))&&(!t.g593OverMana||cost(effective(y,s))>opp.mana.length)&&(!t.g179Other||!api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)))));const eligible=t.g810Excluded?candidates.filter(y=>!api.allLayers(y).some(z=>t.g810Excluded.includes(key(z)))):candidates;const rows=t.g741MinPower?lowestPower741(s,eligible):eligible;choice(s,t,t.title||'対象を選ぶ',[...targetOptions(s,t.p,rows).map(o=>({...o,score:t.g503Stack?Math.min(api.allLayers(rows.find(y=>y.uid===o.value)).length,Math.max(0,s.players[t.p].deck.length-1))*8:t.g419Boost||t.g465DestroySafe||t.g521UntilStart||t.g797Stay?(s.players[t.p].battle.some(y=>y.uid===o.value)?15+cost(effective(rows.find(y=>y.uid===o.value),s)):-20):t.g242PowerMinus?powerMinusScore242(s,t,rows.find(x=>x.uid===o.value)):t.g235TapOrUntap?(()=>{const y=rows.find(x=>x.uid===o.value),p=s.players.findIndex(p=>p.battle.some(x=>x.uid===o.value));return Math.max(tapStateScore235(s,t,p,y,true),tapStateScore235(s,t,p,y,false));})():t.untap?(()=>{const y=rows.find(x=>x.uid===o.value),own=s.players[t.p].battle.includes(y);return y?.tapped&&api.canUntap(y)?(own?10+Math.abs(o.score):-10-Math.abs(o.score)):0;})():t.g301Grant?((()=>{const y=rows.find(y=>y.uid===o.value);return s.active===t.p&&y.entered===s.turn&&!y.tapped&&!effective(y,s).speedAttacker?25+cost(card(y)):1;})()):t.g177SelfMana||t.g179Return||t.anyOwner&&s.players[t.p].battle.some(x=>x.uid===o.value)?-Math.abs(o.score)-5:o.score,value:{uid:o.value,p:s.players.findIndex(p=>p.battle.some(x=>x.uid===o.value))}})),...(t.optional?[skip()]:[])]);break;}
 case'g34_LockUntap606':{
  const rows=t.g869Refs?opp.battle.filter(y=>api.allLayers(y).some(x=>t.g869Refs.includes(key(x)))):
   creatures(s,1-t.p).filter(y=>!y.sealed&&matches(s,1-t.p,y,t.filter));
  for(const y of rows)startUntapLock210(t,y);
  break;
 }
 case'g34_TapAll':for(const p of t.both?[0,1]:[1-t.p])for(const y of creatures(s,p))if(!t.g218Tap||matches(s,p,y,t.filter))api.tap(s,p,y);break;
 case'g34_Discard':{
  const n=t.g584Count==='faceUpShieldGo'?api.shieldGoCount(s,t.p):
   t.g585ShieldDeficit?Math.max(0,5-own.shields.length):t.g584Count==='ownShields'?own.shields.length:t.g584Count==='opponentShields'?opp.shields.length:t.g756All?opp.hand.length:t.n??1;
  if(n)put(s,task('discard',t.owner==='self'?t.p:t.owner??1-t.p,t.source,{causedBy:t.p,n,random:!!t.random,optional:!!t.optional,selfDiscard:t.owner==='self',...(t.g756All?{all:true}:{}),...(t.g869ReturnOnSpell?{g869ReturnUid:t.uid}:{})}));
  break;
 }
 case'g34_Scorpion614':scorpion614(s,t);break;
 case'g34_OverManaBottom590':{
  const owner=1-t.p;
  const targets=creatures(s,owner).filter(y=>!y.sealed&&cost(effective(y,s))>opp.mana.length);
  const rows=targets.flatMap(api.allLayers).map((y,i)=>({
   uid:y.uid,label:y.faceDown?'裏向きのカード '+(i+1):card(y).name,cardId:y.faceDown?null:y.cardId
  }));
  if(rows.length>1)put(s,task('g78_BottomOrder',owner,t.source,{rows,ordered:[],newCards:true,controller:t.p}));
  if(targets.length)move(s,targets.map(y=>({player:owner,uid:y.uid,to:'deck',controller:t.p})));
  break;
 }
 case'g34_CastCostDeploy595':{
  if(t.g766Below&&used(s,'g766SpellUse',t))break;
  const filter=t.g766Below?{creature:true,belowCost:t.castCost}:{creature:true,nonEvolution:true,exactCost:t.castCost};
  start(s,t,[{op:'Select',origin:'hand',n:1,deploy:true,g195HandDeploy:true,optional:true,filter,
   ...(t.g766Below?{g766SpellUse:true,title:'唱えた呪文よりコストの小さいクリーチャーを出す（任意）'}:{})}]);
  break;
 }
 case'g34_GraveHandMana771':{
  const picks=t.picks||[],origin=graveHandManaOrigins771[picks.length];
  if(!origin){finishGraveHandMana771(s,t);break;}
  const rows=api.canMoveZone(s,t.p,origin)?own[origin]:[];
  if(!rows.length){put(s,{...t,picks:[...picks,null]});break;}
  const score=origin==='grave'&&api.manaRedirect(s,t.p)?-10:20;
  choice(s,t,(origin==='grave'?'墓地':'手札')+'からタップしてマナに置くカードを1枚選ぶ（任意）',[
   ...rows.map(y=>opt(card(y).name,y.uid,score,y.cardId)),skip()
  ]);
  break;
 }
 case'g34_GraveSpell594':choice(s,t,'コスト'+t.max+'以下の呪文をどちらかの墓地から唱える',graveSpellOptions594(s,t));break;
 case'g34_ElementOrMana796':choice(s,t,'山札の下に置くエレメントかマナのカードを選ぶ',elementOrManaOptions796(s,t));break;
 case'g34_GravePick598':{
  if(t.owner===undefined){
   const options=[t.p,1-t.p].filter(p=>s.players[p].grave.length).map(p=>opt(p===t.p?'自分の墓地':'相手の墓地',p,gravePickPlayerScore598(s,t,p)));
   if(options.length)choice(s,t,'山札に戻すカードを選ぶ墓地',t.mode==='destroy'?options:[...options,skip()]);
   else if(t.mode==='destroy')finishGravePick598(s,{...t,selected:[]});
   break;
  }
  const rows=s.players[t.owner].grave.filter(x=>!t.selected.includes(x.uid));
  if(!rows.length||t.n!==undefined&&t.selected.length>=t.n){finishGravePick598(s,t);break;}
  const options=rows.map(x=>opt(card(x).name,x.uid,10+(t.owner===t.p?-1:1)*Math.min(9,cost(card(x))),x.cardId));
  if(t.mode==='shuffleBottom')options.push(opt('選んだ'+t.selected.length+'枚で進む',null,t.owner===t.p?20:0));
  if(t.mode==='destroy'){
   const target=gravePickRemovalCost598(s,t,t.selected.length+rows.length);
   const stop=t.owner===t.p&&t.selected.length>=target?20:0;
   options.push(opt('選んだ'+t.selected.length+'枚で進む',null,stop));
  }
  choice(s,t,t.mode==='draw'?'山札の下に置く順に選ぶ（'+t.selected.length+' / 2）':'山札に戻すカードを選ぶ',options);
  break;
 }
 case'g34_GraveDeckEnd837':{
  const [row]=t.rows;
  choice(s,t,'選んだカードを山札のどちらに置く？',[
   opt('山札の一番上','deckTop',row.p===t.p?15:10),
   opt('山札の一番下','deck',row.p===t.p?10:15)
  ]);
  break;
 }
 case'g34_GraveBottom589':{
  if(t.choosePlayer){
   const size=p=>api.canMoveZone(s,p,'grave')?s.players[p].grave.length:0;
   choice(s,t,'山札の下に戻す墓地を選ぶ',[
    opt('自分の墓地',t.p,size(t.p)&&own.deck.length<6?size(t.p)+15:-1),
    opt('相手の墓地',1-t.p,size(1-t.p)?size(1-t.p)*5:-1),
    skip()
   ]);
   break;
  }
  const owner=t.self?t.p:1-t.p;
  const rows=policyTake(s,owner,'grave',api);
  if(!rows.length)break;
  for(const y of rows)clear(y,'deck');
  api.addZone(s,owner,'deck',...api.shuffled(rows,Math.floor(api.random(s)*4294967296)));
  api.log(s,t.p,'shuffleGrave',(t.self?'自分':'相手')+'の墓地'+rows.length+'枚をシャッフルして山札の下に置いた',{cardId:t.source});
  break;
 }
 case'g34_SpellLock589':{
  if(!t.chooseColor){lockSpells589(s,t);break;}
  const mana=opp.mana.filter(y=>!y.faceDown).map(y=>api.manaColors(card(y),s,1-t.p));
  const spells=opp.grave.flatMap(y=>faces(card(y)).filter(c=>c.type==='spell'));
  choice(s,t,'相手が唱えられなくなる呪文の文明を選ぶ',['光','水','闇','火','自然'].map(color=>
   opt(color,color,mana.filter(cs=>cs.includes(color)).length+3*spells.filter(c=>colors(c).includes(color)).length)
  ));
  break;
 }
 case'g34_TurnBlockBreak712':
  (s.extLimits??=[]).push({kind:'g712BlockBreak',player:t.p,source:t.source,uid:t.uid,incarnation:t.incarnation||0,turn:s.turn,expires:'end',who:s.active});
  break;
 case'g34_TurnAttackDraw613':
  (s.extLimits??=[]).push({kind:'g613AttackDraw',player:t.p,source:t.source,turn:s.turn,expires:'end',who:s.active,
   ...(t.spell===false?{spell:false}:{}),...(t.optional?{optional:true}:{}),...(t.refs?{refs:t.refs,n:t.n}:{})});
  break;
 case'g34_SpellLock489':(s.extLimits??=[]).push({kind:t.max===undefined?'cast':'spellCostLock',player:1-t.p,controller:t.p,expires:t.expires,who:t.expires==='end'?s.active:t.p,...(t.max===undefined?{}:{max:t.max})});break;
 case'g34_AttackCap627':{
  const player=1-t.p;
  const duration=t.max===undefined?{startsPlayer:player,active:false,expires:'end',who:player}:
   {max:t.max,active:true,expires:'start',who:t.p};
  (s.extLimits??=[]).push({kind:'g627AttackCap',player,...duration,
   spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))});
  break;
 }
 case'g34_Stay627':stayUntilStart627(s,t,sourceHost474(s,t)?.x);break;
 case'g34_LockAttacks726':
  for(const player of [0,1])(s.extLimits??=[]).push({kind:'attack',player,controller:t.p,who:s.active,expires:'end'});
  break;
 case'g34_PlayerAttackResponse741':
  (s.extLimits??=[]).push({kind:'g741PlayerAttackResponse',who:t.p,source:t.source,defs:t.defs,expires:'start'});
  break;
 case'g34_Lock':(s.extLimits??=[]).push({...t.limit,player:t.limit.player??(t.g746Self?t.p:1-t.p),who:t.limit.who??t.p,expires:'start'});break;
 case'g34_Untap':{
  if(t.g904Refs){
   for(const p of [0,1]){
    const host=s.players[p].battle.find(y=>api.allLayers(y).some(z=>t.g904Refs.includes(key(z))));
    if(host){api.untap(s,p,host);break;}
   }
   break;
  }
  const owner=t.g191First?s.players.findIndex(p=>p.battle.some(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)))):t.p,y=t.g191First&&owner>=0?s.players[owner].battle.find(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))):t.g404Carrier?own.battle.find(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)):x;if(y&&api.canUntap(y)){const was=y.tapped;y.tapped=false;if(was)combined.untapped(s,owner,y);}break;}
 case'g34_Execute':{const origins=t.zones||[t.origin||'hand'],rows=origins.flatMap(origin=>(!t.g555FinishTo||api.canMoveZone(s,t.p,origin)?own[origin]:[]).flatMap(y=>faces(card(y)).flatMap((c,face)=>matches(s,t.p,{...y,cardId:y.cardId},t.filter)&&(!t.spellOnly||c.type==='spell')&&(!t.g556SpellColor||colors(c).includes(t.g556SpellColor))&&(!t.spellColorsAny||colors(c).some(color=>t.spellColorsAny.includes(color)))&&(!t.creatureOnly||c.type==='creature')&&(!t.nonCreature||c.type!=='creature')&&(t.max===undefined||cost(c)<=t.max)&&(!t.trigger||c.trigger||c.triggerPlus||c.superTrigger)&&api.canCast(s,t.p,c,origin)&&(c.type!=='creature'||api.canEnter(s,t.p,c,{origin,execution:true})&&(!c.evolution||api.evolutionBases(s,t.p,c).length))?[opt((t.zones?.length>1?(origin==='hand'?'手札：':'墓地：'):'')+c.name,{uid:y.uid,face,origin,...(t.g555FinishTo?{serial555:y.zoneSerial||0}:{})},t.g555FinishTo?spellScore555(s,t,c):20+cost(c),y.cardId)]:[])));choice(s,t,t.title||'コストを支払わず実行するカードを選ぶ',[...rows,...(t.optional===false?[]:[t.g408Decline?{...skip(),score:modeScore(s,t,t.g408Decline)}:skip()])]);break;}
 case'g34_Choose':choice(s,t,t.title||'効果を選ぶ',t.modes.flatMap((m,i)=>m.condition&&!ownCondition(s,t.p,m.condition,t.uid,t.incarnation)?[]:[opt(m.label||'効果'+(i+1),i,t.g184Modes?modeScore(s,t,m.defs):m.score??10)]));break;
 case'g34_Custom':custom(s,t);break;
 default:throw Error('未実装の6デッキ効果：'+t.op);
 }return true;}
 function ramp(s,t,n){
  const batch=t.g809Together?[]:null;
  const destTogether=batch?(api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana'):null;
  for(let i=0;i<n;i++){
   const y=api.takeTop(s,t.p);
   if(!y)break;
   const dest=destTogether||(api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana');
   clear(y,dest);
   if(dest==='mana'){
    if(t.faceDown){y.faceDown=true;y.tapped=!!t.tapped;}
    else if(t.tapped)y.tapped=true;
   }
   if(batch){batch.push(y);continue;}
   api.addZone(s,t.p,dest,y);
   if(dest==='mana'&&t.g603Draw&&matches(s,t.p,y,t.g603Draw.filter))start(s,t,[{op:'Draw',n:1,optional:!!t.g603Draw.optional}]);
  }
  if(batch?.length)api.addZone(s,t.p,destTogether,...batch);
  if(t.g871Civilizations&&destTogether==='mana'&&batch.length){
   const placed=batch.map(y=>api.manaColors(api.zoneCard(s,t.p,y,'mana'),s,t.p));
   const light=placed.filter(cs=>cs.includes('光')).length;
   const fire=placed.filter(cs=>cs.includes('火')).length;
   const defs=light?[{op:'Select',owner:'opponent',origin:'battle',n:light,filter:{creature:true},
    g173Targets:true,g193Select:true,g193Tap:true,title:'タップする相手のクリーチャーを'+light+'体選ぶ'}]:[];
   for(let i=0;i<fire;i++)defs.push({op:'Target',owner:'self',power:2000,g337PowerAttacker:true,spell:true,
    title:'パワーアタッカー+2000を与える自分のクリーチャーを選ぶ'});
   if(defs.length)start(s,t,defs);
  }
  if(t.after)start(s,t,t.after);
  api.deckCheck(s,t.p);
 }
 function chosen(s,t,v){if(fifteen.chosen(s,t,v))return true;if(!t.op.startsWith('g34_'))return false;const own=s.players[t.p],x=live(s,t);switch(t.op){
 case'g34_OpponentChooseAttacker916':{
  const player=1-t.p;
  const selected=v&&s.players[player].battle.find(y=>key(y)===key(v));
  if(selected&&s.active===player){
   force546(s,{...t,when:'end'},player,selected);
   applyGrant(s,{...t,grant:{g736ForcedAttack:true}},selected);
  }
  break;
 }
 case'g34_TappedShieldPick842':
  put(s,{...t,picked:[...t.picked,v]});
  break;
 case'g34_Unryu852':if(v){
  const top=own.deck.find(x=>x.uid===t.target);
  if(top&&card(top).type==='gear'&&canPut(s,t.p,top,'deck'))
   start(s,t,[{op:'Put',origin:'deck',target:top.uid},{op:'Untap',g191First:true}]);
 }break;
 case'g34_LookSpell841':{
  const y=v&&own.deck.find(x=>x.uid===v.uid&&(x.zoneSerial||0)===v.serial);
  const c=y&&faces(api.zoneCard(s,t.p,y,'deck'))[v.face];
  if(c?.type==='spell'&&api.canCast(s,t.p,c,'deck'))cast(s,t.p,y.uid,true,null,v.face,null,'deck',t.g878SpellBlue?card(t.source).name:'スーパー・スペル・グレートブルー');
  break;
 }
 case'g34_SelfGraveBottom839':
  if(v&&ownGraveSource839(own,t)&&zoneMove(s,t.p,'grave',t.uid,'deck',t))start(s,t,t.after);
  break;
 case'g34_RevealDiscard839':
  if(t.shown){
   if(t.shown.includes(v))api.discardSelected(s,1-t.p,[v],t.source,t.p);
  }else put(s,{...t,selected:[...t.selected,v]});
  break;
 case'g34_LookDestination467':put(s,{...t,op:'g34_LookPick',stages:t.stages.map((q,i)=>i===t.stage?{...q,to:v,g467Chosen:true}:q)});break;
 case'g34_PowerSweep696':start(s,t,[{op:'Sweep',both:true,to:'grave',filter:{creature:true,...(v>0?{minPower:v}:{}),maxPower:v,g199Power:true}}]);break;
 case'g34_CostSweep596':start(s,t,[{op:'Sweep',to:'grave',filter:{creature:true,min:v,max:v}}]);break;
 case'g34_GraveHandMana771':put(s,{...t,picks:[...(t.picks||[]),v]});break;
 case'g34_GraveSpell594':{
  if(!v||!graveSpellOptions594(s,t).some(({value:r})=>r.owner===v.owner&&r.uid===v.uid&&r.face===v.face&&r.serial===v.serial))break;
  const foreign=v.owner!==t.p,origin=foreign?'g34Holding':'grave',grave=s.players[v.owner].grave;
  const x=foreign?remove(grave,v.uid):grave.find(x=>x.uid===v.uid);
  if(foreign){x.cardOwner=v.owner;x.g5Origin='grave';(own.g34Holding??=[]).push(x);}
  x.finishTo='deck';
  cast(s,t.p,x.uid,true,null,v.face,null,origin,'スーパー・S・トリガー');
  break;
 }
 case'g34_Scorpion614':
  put(s,t.blocker===undefined?{...t,blocker:v,selected:[]}:{...t,selected:[...t.selected,v]});
  break;
 case'g34_ElementOrMana796':if(v){
  const x=s.players[v.p][v.origin].find(x=>x.uid===v.uid&&
   (v.origin==='battle'?x.incarnation||0:x.zoneSerial||0)===v.serial);
  if(x){
   zoneMove(s,v.p,v.origin,x.uid,'deck',{controller:t.p});
   start(s,{...t,p:x.cardOwner??v.p,controller:t.p},[{op:'Ramp',n:1}]);
  }
 }break;
 case'g34_GravePick598':
  if(t.owner===undefined){if(v===0||v===1)put(s,{...t,owner:v,selected:[]});}
  else if(v===null)finishGravePick598(s,t);
  else put(s,{...t,selected:[...t.selected,v]});
  break;
 case'g34_KeepOne604':{
  const hand=t.zone==='hand',rows=hand?own.hand:creatures(s,t.p).filter(y=>!y.sealed);
  if(!rows.some(y=>y.uid===v))break;
  const rest=rows.filter(y=>y.uid!==v);
  if(!rest.length)break;
  if(hand)api.discardSelected(s,t.p,rest.map(y=>y.uid),t.source,t.controller);
  else move(s,rest.map(y=>({player:t.p,uid:y.uid,to:'grave',destroy:true,controller:t.controller})));
  break;
 }
 case'g34_GraveDeckEnd837':{
  const [row]=t.rows;
  if(v==='deckTop'||v==='deck')zoneMove(s,row.p,'grave',row.uid,v,{...t,g183Return:true});
  break;
 }
 case'g34_GraveBottom589':if(v===0||v===1)put(s,{...t,choosePlayer:false,self:v===t.p});break;
 case'g34_ChainDestroy838':{
  const owner=1-t.p,rows=creatures(s,owner).filter(y=>!y.sealed),chosen=rows.find(y=>y.uid===v);
  if(chosen)move(s,chainMatches838(rows,chosen).map(y=>({player:owner,uid:y.uid,to:'grave',destroy:true,controller:t.p})));
  break;
 }
 case'g34_TargetDestination467':{const r=t.target,y=s.players[r.p].battle.find(x=>x.uid===r.uid&&(x.incarnation||0)===r.incarnation&&!x.sealed),controller=t.g472EffectPlayer??t.p;if(y)move(s,[{player:r.p,uid:r.uid,to:v,destroy:v==='grave',controller}]);if(t.after)start(s,{...t,p:controller},t.after);break;}
 case'g34_NullBreaker471':if(s.attack?.attacker===t.uid){s.attack.g471Breaker=v;api.resolveAttack(s,null);}break;
 case'g34_GrantedBreaker633':if(s.attack?.attacker===t.uid){s.attack.g633Breaker=v;api.resolveAttack(s,null);}break;
 case'g34_PayAura560':if(typeof v==='number'){const args=[...t.args],old=args[4];args[4]={...(typeof old==='object'?old:old!==null?{cost:old}:{}),g560Handled:true,g560Amount:v};api.cast(s,t.p,...args);}break;
 case'g34_PayFloor500':if(typeof v==='number'){const args=[...t.args],old=args[4];args[4]={...(typeof old==='object'?old:old!==null?{cost:old}:{}),g500Handled:true,g500Amount:v};api.cast(s,t.p,...args);}break;
 case'g34_PayCount499':if(typeof v==='number'){const args=[...t.args],old=args[4];args[4]={...(typeof old==='object'?old:old!==null?{cost:old}:{}),g499Handled:true,g499Reduction:v};api.cast(s,t.p,...args);}break;
 case'g34_PaySpell485':if(typeof v==='number'){const args=[...t.args],old=args[4];args[4]={...(typeof old==='object'?old:old!==null?{cost:old}:{}),g485Handled:true,g485Amount:v};api.cast(s,t.p,...args);}break;
 case'g34_RevealPayment470':if(typeof v==='string')put(s,{...t,revealed:v});else if(v!==false){const args=[...t.args],old=args[4];args[4]={...(typeof old==='object'?old:old!==null?{cost:old}:{}),g470Handled:true,g470Amount:v??0,...(t.revealed?{g470Revealed:t.revealed}:{})};api.cast(s,t.p,...args);}break;
 case'g34_PayOnce464':if(typeof v==='string')put(s,{...t,selected:[...t.selected,v]});else if(v===null){const args=[...t.args];args[18]=t.selected;api.cast(s,t.p,...args);}break;
 case'g34_HandReveal462':if(v!==null)put(s,{...t,selected:[...t.selected,v]});else finishReveal462(s,t,own.hand.filter(x=>t.selected.includes(x.uid)));break;
 case'g34_PlayerDraw461':if(t.upTo)put(s,{...t,chosen:v});else if(v)put(s,{...t,accepted:true});break;
 case'g34_HandCycle460':
  if(t.optional&&!t.accepted){if(v)put(s,{...t,accepted:true});}
  else if(v!==null)put(s,{...t,selected:[...t.selected,v]});
  else if(t.to==='deck'&&t.order)finishBottomCycle460(s,t,t.selected);
  else finishCycle460(s,t,t.selected);
  break;
 case'g34_EachPlayer459':if(v)put(s,{...t,index:t.index+1,selected:[...t.selected,v]});break;
 case'g34_SpaceCharge454':if(v)start(s,t,t.rules.flatMap((r,i)=>v.includes(i)?r.defs:[]));break;
 case'g34_ManaReveal449':{const c=card(t.source),y=own.hand.find(y=>y.uid===v);if(!y||new Set(faces(card(y)).flatMap(colors)).size<2||api.spellIgnored(s,c))break;api.log(s,t.p,'reveal',c.name+'で公開：'+card(y).name,{cardId:y.cardId});const mana=own.mana.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);if(mana&&api.untap(s,t.p,mana))api.log(s,t.p,'untapMana',c.name+'をアンタップ',{cardId:t.source});break;}
 case'g34_EntryCross728':{
  if(v){put(s,{...t,selected:[...t.selected,v]});break;}
  const x=remove(own.g34Holding||[],t.target);
  if(x){
   enter(s,t.p,x,t.baseUid,{...t.entryOptions,g728CrossIds:t.selected});
   if(own.battle.includes(x))put(s,...(t.afterEntryTasks||[]));
  }
  break;
 }
 case'g34_EntryTap432':{const y=remove(own.g34Holding||[],t.target);if(y){enter(s,t.p,y,t.baseUid,{...t.entryOptions,g432EntryChosen:true,...(v?{tapped:true}:{})});if(own.battle.includes(y))put(s,...(t.afterEntryTasks||[]));}break;}
 case'g34_Magibomber321':{
  const deploy=v&&{...t,op:'g34_Put',origin:v.origin,target:v.uid,execution:false,g745Magibomber:true};
  // QA41150: the looked-at card remains unavailable while a creature enters from hand.
  if(t.g743HoldTop&&v?.origin==='hand')put(s,deploy,task('g34_RevealRelease514',t.p,t.source,{ids:t.ids}));
  else{
   for(const uid of t.ids)release(s,t.p,uid);
   if(deploy)put(s,deploy);
  }
  break;
 }
 case'g34_EntryFight624':{
  const pair=v&&entryFight624(s,t);
  if(pair){
   const [own,enemy]=pair;
   api.battle(s,own.p,own.x,enemy.p,enemy.x,s.attack?.attacker);
  }
  break;
 }
 case'g34_FightAttacker798':if(v){
  const ally=fightUnit240(s,t.p,t,true),attacker=fightUnit240(s,1-t.p,t.g399Attacker,true);
  if(ally&&attacker)api.battle(s,t.p,ally,1-t.p,attacker,s.attack?.attacker);
 }break;
 case'g34_KatsuFight321':{const b=fightUnit240(s,1-t.p,t.enemy);if(v&&x&&b)api.battle(s,t.p,x,1-t.p,b,s.attack?.attacker);break;}
 case'g34_LookShield744':
  release(s,t.p,t.target);
  api.shieldTop(s,t.p,card(t.source),null,{uid:t.target,faceUp:v});
  break;
 case'g34_KatsuLoot321':{const y=own.hand.find(y=>y.uid===v);if(y)api.discardSelected(s,t.p,[y.uid],t.source,t.p,null,{...t,op:'g34_KatsuDraw321',high:card(y).type==='creature'&&api.power(y,false,s)>=6000});break;}
 case'g34_Next320':{const y=own.deck.find(y=>y.uid===t.target);if(!y)break;release(s,t.p,y.uid);if(v.to){zoneMove(s,t.p,'deck',y.uid,v.to,t);api.deckCheck(s,t.p);}else cast(s,t.p,y.uid,true,v.baseUid,v.face,null,'deck','ゴルギーネクスト');break;}
 case'g34_Smash320':if(v&&smashSource320(s,t))api.castBattleSpell(s,t.p,t.uid,t.incarnation,t.source);break;
 case'g34_Poker763':if(v)start(s,t,[{op:'AfterAttack542',defs:[{op:'Untap',g191First:true}]}]);break;
 case'g34_TapState235':{const y=s.players[t.target.p].battle.find(y=>y.uid===t.target.uid&&(y.incarnation||0)===t.target.incarnation);if(y){if(v)api.tap(s,t.target.p,y);else if(y.tapped&&api.canUntap(y)){y.tapped=false;combined.untapped(s,t.target.p,y);}}break;}
 case'g34_SpellLock589':lockSpells589(s,t,v);break;
 case'g34_BattleDeclare588':if(v){
  const ref=t.cards.find(x=>x.uid===v);
  if(!ref)break;
  api.log(s,t.p,'reveal',card(ref.cardId).name+'を公開してバトル勝利時の能力を宣言',{cardId:ref.cardId});
  s.battleResolution.wins.push({player:t.p,uid:ref.uid,source:ref.cardId,task:task('g34_BattleDeploy588',t.p,ref.cardId,{uid:ref.uid,serial:ref.serial,controller:t.p})});
  put(s,{...t,cards:t.cards.filter(x=>x!==ref)});
  break;
 }else break;
 case'g34_Harpoon618':put(s,{...t,kept:[...(t.kept||[]),v]});break;
 case'g34_MeteorReload871':{
  release(s,t.p,t.target);
  if(!v)break;
  const host=sourceHost474(s,t.host);
  if(!host||host.x.sealed||!api.isCreature(s,host.x))break;
  const top=remove(own.deck,t.target);
  if(!top)break;
  clear(top,'under');
  (host.x.under??=[]).push(top);
  api.deckCheck(s,t.p);
  break;
 }
 case'g34_StackShieldGrave651':if(v){
  const host=sourceHost474(s,t);
  if(!host||host.x.sealed||!api.isCreature(s,host.x))break;
  const paid=(host.x.under||[]).flatMap(api.allLayers).find(y=>y.uid===v.uid&&(y.incarnation||0)===v.incarnation);
  if(!paid)break;
  api.moveBattleCard(s,host.p,paid.uid,'grave',{controller:t.p});
  if(s.players[host.p].grave.some(y=>y.uid===paid.uid))put(s,{...t,op:'g34_ShieldGrave588',n:1,required:true});
 }break;
 case'g34_HandShield657':if(v){
  const y=own.hand.find(y=>y.uid===v);
  if(y)put(s,{...t,op:'g34_ShieldSide657',target:v,serial:y.zoneSerial||0});
 }break;
 case'g34_ShieldSide657':{
  const y=own.hand.find(y=>y.uid===t.target&&(y.zoneSerial||0)===t.serial);
  if(y)zoneMove(s,t.p,'hand',y.uid,'shields',{...t,g657FaceUp:v===true});
  break;
 }
 case'g34_ShieldMove685':
 case'g34_ShieldGrave588':if(v)put(s,{...t,selected:[...(t.selected||[]),v]});else finishShieldMove588(s,t);break;
 case'g34_FightPair586':if(v){
  const owners=t.who==='both'?[t.p,1-t.p]:[t.opponentPicks||t.who==='opponent'?1-t.p:t.p];
  put(s,{...t,op:'g34_FightPairSecond586',p:t.opponentPicks?1-t.p:t.p,first:v,owners});
 }break;
 case'g34_FightPairSecond586':if(v)finishFightPair586(s,t,v);break;
 case'g34_FightBuff241':if(v){const a=fightUnit240(s,t.p,v);if(a){(a.powerModifiers??=[]).push({amount:t.power,expires:'end',who:s.active,spellSource:t.spell?t.source:undefined,spellCost:t.spell?cost(card(t.source)):undefined});put(s,{...t,op:'g34_FightEnemy240',fighter:v,optional:t.enemyOptional});}}break;
 case'g34_Fight240':if(v)put(s,{...t,op:'g34_FightEnemy240',fighter:v});break;
 case'g34_TapToUntap748':{
  const source=v&&tapSource748(s,t);
  if(source){
   api.tap(s,t.p,source);
   if(t.otherAlly){
    if(source.tapped)start(s,t,[{op:'Target',owner:'self',g179Other:true,untap:true,title:'アンタップする他の味方を選ぶ'}]);
    break;
   }
   const winner=attackHost408(s,t);
   if(source.tapped&&winner&&!winner.sealed&&api.isCreature(s,winner))api.untap(s,t.p,winner);
  }
  break;
 }
 case'g34_FightEnemy240':if(v){const owner=t.fighterOwner??t.p,a=fightUnit240(s,owner,t.fighter,t.g745FollowFighter),b=fightUnit240(s,1-t.p,v);if(a&&b&&a.uid!==b.uid&&(!t.g747Once||!parottaUsed747(s,t))){if(t.g747Once)(s.once??={})[parottaKey747(t)]=s.turn;api.battle(s,owner,a,1-t.p,b,s.attack?.attacker);}}break;
 case'g34_Peek585':if(v){const row=peekRows585(s,t).find(r=>r.p===v.player&&r.x.uid===v.uid);if(row)showPeek585(s,{...t,viewed:[...(t.viewed||[]),v.uid]},[row]);}break;
 case'g34_PeekRead585':
  if(v&&api.swapShield585(s,t.p,t.shieldUid))api.log(s,t.p,'shieldSwap',card(t.source).name+'：確認したカードと山札の上を入れ替えた',{cardId:t.source});
  if(t.remaining>1){const {g585Peek,shieldUid,...next}=t;put(s,{...next,op:'g34_Peek585',remaining:t.remaining-1});}
  break;
 case'g34_GuardVision834':{
  const ids=look(s,{...t,n:3},v);
  if(ids.length)put(s,{...t,op:'g34_GuardOrder834',owner:v,ids,ordered:[]});
  break;
 }
 case'g34_HauntedChoice833':{
  const deck=s.players[v],held=reserved(deck),top=deck.deck.find(x=>!held.has(x.uid));
  if(!top)break;
  // The restriction applies to the effect's controller, even when looking at another player's library.
  const blind=api.deckLocked(s,t.p),name=blind?'山札の一番上のカード':card(top).name;
  if(!blind&&v===t.p&&api.lookPublic(s,t.p))api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+name,{cardId:top.cardId});
  choice(s,{...t,op:'g34_HauntedMill833',owner:v,target:top.uid},'確認したカードを持ち主の墓地に置きますか？',[
   opt(name+'を墓地に置く',true,v!==t.p?12:deck.deck.length>2?3:-100,blind?null:top.cardId),skip()
  ]);
  break;
 }
 case'g34_HauntedMill833':
  if(v&&zoneMove(s,t.owner,'deck',t.target,'grave',t))api.deckCheck(s,t.owner);
  break;
 case'g34_HandShield832':{
  const owner=t.owner==='opponent'?1-t.p:t.p;
  if(v&&zoneMove(s,owner,'hand',v,'shields',t))
   put(s,{...t,op:'g55_ShieldHand',g238ShieldHand:true,g832ShieldOwner:owner});
  break;
 }
 case'g34_SoulburnBird832':
  put(s,v?{...t,op:'g34_Put',origin:'deck',owner:t.p}:null,{...t,op:'g34_SoulburnDragon832'});
  break;
 case'g34_SoulburnFinish832':
  release(s,t.p,t.target);
  if(v)doPut(s,{...t,origin:'deck'},v);
  break;
 case'g34_ShieldExchange446':{const y=v&&own.hand.find(y=>y.uid===v);if(y)zoneMove(s,t.p,'hand',y.uid,'shields',t);if(!t.optional||y)put(s,{...t,op:'g34_ShieldHand',g238ShieldHand:true});break;}
 case'g34_ChooseCivilization805':
  if(t.target){
   const x=s.players[t.target.p].battle.find(y=>y.uid===t.target.uid&&(y.incarnation||0)===t.target.incarnation);
   if(x&&!x.sealed&&api.isCreature(s,x))(s.extLimits??=[]).push({
    kind:'g805BattleColor',uid:x.uid,incarnation:x.incarnation||0,color:v,turn:s.turn,expires:'end',who:s.active
   });
  }else for(const {p,x,cs} of creatureCivilizations805(s))if(cs.some(c=>c!==v))api.tap(s,p,x);
  break;
 case'g34_TapAbilityMana804':{
  if(!v)break;
  const selected=[...(t.selected||[]),v];
  if(selected.length<t.n){put(s,{...t,selected});break;}
  const host=sourceHost474(s,t),mana=own.mana.filter(y=>!y.tapped&&selected.includes(y.uid));
  if(host?.p!==t.p||host.x.tapped||host.x.sealed||mana.length!==t.n)break;
  for(const y of mana)y.tapped=true;
  api.tap(s,t.p,host.x);
  api.log(s,t.p,'ability',card(t.source).name+'のタップ能力を使った',{cardId:t.source});
  start(s,t,t.defs);
  break;
 }
 case'g34_TapManaColors698':if(v){
  const selected=[...(t.selected||[]),v];
  if(selected.length<t.colors.length){put(s,{...t,selected});break;}
  const paid=selected.map(uid=>own.mana.find(x=>x.uid===uid&&!x.tapped));
  if(paid.every(Boolean)){
   for(const x of paid)x.tapped=true;
   start(s,t,t.defs??[{op:'OwnShieldGraves697',to:'mana'}]);
  }else if(t.elseDefs)start(s,t,t.elseDefs);
 }else if(t.elseDefs)start(s,t,t.elseDefs);
 break;
 case'g34_OwnShieldGraves697':put(s,{...t,picks:[...(t.picks||[]),{owner:t.chooser,uid:v}]});break;
 case'g34_WarpRifle922':{
  const player=s.players.findIndex(side=>side.battle.some(y=>y.uid===v));
  if(player<0)break;
  const gear=s.players[player].battle.find(y=>y.uid===v),ref=gear.crossedTo;
  const rows=[{player,uid:gear.uid,to:'hand',destroy:false,controller:t.p}];
  // Snapshot the cross before the gear leaves. The wearer is not chosen.
  if(ref)for(const p of [0,1]){
   const host=s.players[p].battle.find(y=>y.uid===ref.uid&&(y.incarnation||0)===ref.incarnation&&api.isCreature(s,y));
   if(host){rows.push({player:p,uid:host.uid,to:'hand',destroy:false,controller:t.p});break;}
  }
  move(s,rows);
  break;
 }
 case'g34_OpponentBury921':{
  if(v.origin==='battle')move(s,[{player:t.chooser,uid:v.uid,to:'grave',destroy:true,controller:t.p}]);
  else if(v.origin==='shields'){
   const moved=api.moveShield(s,t.chooser,v.uid,'grave');
   if(moved.length)api.log(s,t.chooser,'shieldGrave',card(t.source).name+'：シールド1つ（カード'+moved.length+'枚）を墓地に置いた',{cardId:t.source});
  }
  break;
 }
 case'g34_ShieldGrave':if(v){
  const moved=api.moveShield(s,t.p,v,'grave');
  api.log(s,t.p,'shieldGrave',card(t.source).name+'：シールド1つ（カード'+moved.length+'枚）を墓地に置いた',{cardId:t.source});
  if(moved.length&&t.then)start(s,t,t.then);
 }break;
 case'g34_BlindReveal803':{
  const owner=t.owner==='opponent'?1-t.p:t.p,y=s.players[owner].hand[v];
  if(y){
   api.log(s,owner,'reveal',card(t.source).name+'で公開：'+card(y).name,{cardId:y.cardId});
   if(t.owner!=='opponent'&&matches(s,t.p,y,{g223Multicolor:true}))start(s,t,[{op:'SelfGrant754',grant:{speedAttacker:true}}]);
  }
  break;
 }
 case'g34_ManaTriggerCast803':
  if(!t.selected){if(v)put(s,{...t,selected:v});break;}
  if(v){
   const row=manaTriggerSpells803(s,t.p).find(({y,face})=>y.uid===t.selected.uid&&face===t.selected.face&&(y.zoneSerial||0)===t.selected.serial);
   if(row&&api.canCast(s,t.p,row.c,'mana'))cast(s,t.p,row.y.uid,true,null,row.face,null,'mana','カードの能力');
  }
  break;
 case'g34_BlindDiscard773':{
  const y=s.players[1-t.p].hand[v];
  if(y)api.discardSelected(s,1-t.p,[y.uid],t.source,t.controller??t.p);
  break;
 }
 case'g34_StartManaLock773':{
  const y=s.players[1-t.p].mana.find(y=>y.uid===v);
  if(y)y.skipUntap=true;
  break;
 }
 case'g34_BlindHandMana675':{
  const y=s.players[1-t.p].hand[v];
  if(y&&zoneMove(s,1-t.p,'hand',y.uid,'mana',{g182HandMana:true})){
   api.log(s,t.p,'handToMana',card(t.source).name+'：'+card(y).name+'を相手のマナゾーンに置いた',{cardId:y.cardId});
  }
  break;
 }
 case'g34_Nocturne732':
  api.log(s,t.p,'declare',v+'を宣言',{cardId:t.source});
  start(s,t,[{op:'InspectHand',discard:true,g223Inspect:true,g732Name:exactName(v)}]);
  break;
 case'g34_DesignatedDiscard822':{
  if(!own.hand.some(y=>y.uid===t.target&&(y.zoneSerial||0)===t.serial))break;
  const ids=v?[t.target]:own.hand.filter(y=>y.uid!==t.target).map(y=>y.uid);
  if(ids.length)api.discardSelected(s,t.p,ids,t.source,t.controller);
  break;
 }
 case'g34_VegasCost851':if(v==='∞'||v>=5)start(s,t,[{op:'Draw',n:3}]);break;
 case'g34_InspectHand':
  if(t.g904ToShield){
   const owner=1-t.p;
   const y=s.players[owner].hand.find(x=>x.uid===v);
   if(y)zoneMove(s,owner,'hand',y.uid,'shields',{g657FaceUp:true,g904ShieldOwner:y.cardOwner??owner});
   break;
  }
  if(t.g714ToMana){
   const opponent=s.players[1-t.p],y=opponent.hand.find(x=>x.uid===v);
   if(y&&zoneMove(s,1-t.p,'hand',y.uid,'mana')&&opponent.mana.includes(y)){
    api.log(s,t.p,'handToMana',card(t.source).name+'：'+card(y).name+'を相手のマナゾーンに置いた',{cardId:y.cardId});
    start(s,t,t.after);
   }
   break;
  }
  if(t.g822OpponentDiscardChoice){
   const y=s.players[1-t.p].hand.find(x=>x.uid===v&&t.discardIds.includes(v));
   if(y)put(s,task('g34_DesignatedDiscard822',1-t.p,t.source,{controller:t.p,target:y.uid,serial:y.zoneSerial||0}));
   break;
  }
  if(t.chooseOne){if(t.discardIds.includes(v))api.discardSelected(s,1-t.p,[v],t.source,t.p);}
  else if(v&&t.discard)api.discardSelected(s,1-t.p,t.discardIds,t.source,t.p);
  if(t.after)start(s,t,t.after);
  break;
 case'g34_DiscardAll244':if(v)put(s,{...t,accepted:true});break;
 case'g34_DiscardFor248':{
  const y=own.hand.find(y=>y.uid===v);
  if(y&&matches(s,t.p,y,t.g488DiscardFilter)){
   const after={...t,op:'g34_Sequence',defs:discardDefs248(s,t,y)};
   // Rule 101.3a: this continuation also follows an attempted discard that was replaced.
   api.discardSelected(s,t.p,[y.uid],t.source,t.p,t.g770DiscardAttempt?null:after,t.g770DiscardAttempt?after:null);
  }
  break;
 }
 case'g34_DiscardCost655':if(t.costs.includes(v))start(s,t,[destroyBelowCost655(v,t.g835Creature)]);break;
 case'g34_DiscardDraw':if(v&&own.hand.some(y=>y.uid===v&&(!t.filter||matches(s,t.p,y,t.filter)))){put(s,task('draw',t.p,t.source,{n:t.n}));api.discardSelected(s,t.p,[v],t.source,t.p);}break;
 case'g34_HandArmy716':
  if(v){
   s.g34DeployBatch=true;
   put(s,{...t,op:'g34_Put',origin:'hand',owner:t.p,target:v,execution:false},{...t,n:t.n-1});
  }else put(s,task('g34_Custom',t.p,t.source,{name:'finishBatch'}));
  break;
 case'g34_DeploySeries875':
  if(v){
   s.g34DeployBatch=true;
   const remaining=t.costs?{costs:t.costs.filter(n=>n!==v.cost)}:{n:t.n-1};
   put(s,{...t,op:'g34_Put',target:v.uid},{...t,...remaining,selected:[...t.selected,v.uid]});
  }
  break;
 case'g34_GraveArmy':if(v)put(s,{...t,op:'g34_Put',origin:'grave',owner:t.p,target:v.uid,execution:false},{...t,selected:[...t.selected,v.uid]});else put(s,task('g34_Custom',t.p,t.source,{name:'finishBatch'}));break;
 case'g34_RampCost411':start(s,t,[{op:'Sweep',both:true,to:'mana',filter:{creature:true,...(v==='∞'?{}:{max:v})}}]);break;
 case'g34_AttackOtherMana409':if(v){const y=own.battle.find(y=>y.uid===v.uid&&(y.incarnation||0)===v.incarnation);if(y&&y!==attackHost408(s,t)){move(s,[{player:t.p,uid:y.uid,to:'mana'}]);start(s,t,[{op:'OpponentSelect',n:1,to:'mana'}]);}}break;
 case'g34_MarshalTouch558':{
  const y=v&&marshalRows558(s,t).find(y=>y.uid===v.uid&&(y.incarnation||0)===v.incarnation);
  if(!y)break;
  const defs=marshalDefs558(t,cost(effective(y,s)));
  if(t.g857ReturnRequired)put(s,{...t,op:'g34_ConfirmHandReturn857',returned:y.uid,serial:(y.zoneSerial||0)+1,defs});
  move(s,[{player:t.p,uid:y.uid,to:'hand',controller:t.controller??t.p}]);
  if(!t.g857ReturnRequired)start(s,t,defs);
  break;
 }
 case'g34_SacrificeAlly413':if(v){const y=own.battle.find(y=>y.uid===v.uid&&(y.incarnation||0)===v.incarnation&&!y.sealed&&(t.g547Seed?matches(s,t.p,y,{g295Tamaseed:true}):api.isCreature(s,y))&&(!t.filter||matches(s,t.p,y,t.filter)));if(y&&(!t.other||!api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)))){move(s,[{player:t.p,uid:y.uid,to:'grave',destroy:true,controller:t.controller??t.p}]);start(s,t,t.defs);}}break;
 case'g34_SelfSacrifice407':if(v){const present=s.players.some(p=>p.battle.some(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))));if(present)start(s,t,[{op:'SelfDestroy'},...(t.defs||[])]);}break;
 case'g34_RevengeDeclare795':if(v){
  const y=revengeCard795(s,t);
  if(y&&s.endStep){
   api.log(s,t.p,'reveal',card(y).name+'のリベンジ・チャンスを宣言',{cardId:y.cardId});
   const entry={player:t.p,uid:y.uid,source:y.cardId,effect:'extended',task:{...t,op:'g34_RevengeSummon795'}};
   if(s.endStep.stage==='resolve')api.enqueue(s,t.p,entry);
   else s.endStep.deferred.push(entry);
  }
 }break;
 case'g34_RevengeSummon795':if(v){
  const y=revengeCard795(s,t);
  if(y&&revengeReady795(s,t.p,y,t.origin))cast(s,t.p,y.uid,true,null,0,null,t.origin||'hand','リベンジ・チャンス');
 }break;
 case'g34_Chance417':if(v){const y=own.hand.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial),c=y&&faces(card(y))[t.face];if(c?.g417Chance&&!api.spellIgnored(s,c)&&api.canCast(s,t.p,c,'hand'))cast(s,t.p,y.uid,true,null,t.face,null,'hand','アタック・チャンス');}break;
 case'g34_FairyManaExchange828':if(v)put(s,{...t,accepted:true});break;
 case'g34_Offer':if(v){
  if(t.g792Once){
   if(used792(s,t,t))break;
   (s.once??={})[onceKey792(t,t)]=s.turn;
  }
  start(s,t,t.defs);
 }break;
 case'g34_Break497':if(v)put(s,{...t,selected:[...(t.selected||[]),v]});break;
 case'g34_ShieldMana557':{
  const opp=s.players[1-t.p];
  if(!opp.shields.some(x=>x.uid===v))break;
  const moved=api.moveShields(s,1-t.p,[v],'mana');
  api.log(s,t.p,'shieldMana',card(t.source).name+'：相手のシールドを1つマナへ置いた（カード'+moved.length+'枚）',{cardId:t.source});
  if(t.g795DeployBelow){
   const movedToMana=moved.filter(y=>opp.mana.includes(y));
   if(movedToMana.length){
    const limit=Math.max(...movedToMana.flatMap(y=>faces(card(y)).map(cost)));
    start(s,t,[{op:'Select',origin:'mana',n:1,deploy:true,optional:true,filter:{creature:true,belowCost:limit===Infinity?'∞':limit}}]);
   }
  }
 }break;
 case'g34_Break278':{
  const host=t.requiresCreature&&sourceHost474(s,t);
  if(t.requiresCreature&&(!host||!api.isCreature(s,host.x)))break;
  if(s.players[1-t.p].shields.some(x=>x.uid===v))api.interruptBreak(s,1-t.p,[v],{...t,op:'g34_AfterBreak278'},
   {player:t.p,sourceUid:host?host.x.uid:t.uid,source:t.source,controller:t.p,g278Effect:true,...(host?{incarnation:host.x.incarnation||0}:{})});
  break;
 }
 case'g34_Destination553':finishSelect(s,{...t,to:v});break;
 case'g34_BlockUntapPick715':{
  const target=v&&creatures(s,t.p).find(y=>y.uid===v&&!y.sealed);
  if(!target||!s.attack||s.attack.blockUid!==t.uid)break;
  const attack=s.attack,previous=attack.g695BlockUntap;
  if(!Array.isArray(previous))attack.g695BlockUntap=previous?[previous]:[];
  attack.g695BlockUntap.push({
   controller:t.p,source:t.source,g695Untap:true,
   g715BlockerRef:{uid:t.uid,incarnation:t.incarnation||0},
   selfRefs:api.allLayers(target).map(({uid,incarnation=0})=>({uid,incarnation}))
  });
  break;
 }
 case'g34_ChooseRace724':{
  const filter={creature:true,g724ExactRace:v};
  // Dragon is a legal declaration and refers to the category (QA42400).
  const chosen=v==='ドラゴン'?{creature:true,race:v}:filter;
  if(t.g735Grant)
   start(s,t,[{op:'GroupGrant364',owner:'both',filter:chosen,spell:!t.g737FromCreature,grant:t.g735Grant,g521UntilStart:t.g521UntilStart}]);
  else if(t.g736ForceAttack)
   start(s,t,[{op:'GroupGrant364',owner:'both',filter:chosen,g736ForceAttack:true,grant:{attackBonus:4000,g736ForcedAttack:true}}]);
  else if(t.g737RevealRace)
   start(s,t,[{op:'Lengston724',g737Race:v}]);
  else if(t.g736HandMana)
   start(s,t,[select('hand','mana','all',chosen,{optional:true,g583Group:true,title:'マナに置く手札を好きな枚数選ぶ'})]);
  else if(t.g725Tribal){
   const group={owner:'self',filter,spell:true};
   start(s,t,[{op:'GroupPower',...group,power:4000},{op:'GroupGrant364',...group,grant:{g725NoBlockMaxPower:5000}}]);
  }else start(s,t,[{op:'CountOwn538',filter,mode:'select',def:t.def}]);
  break;
 }
 case'g34_ChooseRaceUntap713':
  start(s,t,[{op:'Schedule537',when:'turnEnd',defs:[{op:'GroupUntap',owner:'both',g713ExactRace:v,filter:{creature:true}}]}]);
  break;
 case'g34_Select':
  if(v){
   if(t.g766SpellUse)mark(s,'g766SpellUse',t);
   if(t.g792Once)(s.once??={})[onceKey792(t,t)]=s.turn;
   put(s,{...t,selected:[...(t.selected||[]),v.uid],rows:[...(t.rows||[]),v]});
  }else finishSelect(s,t);
  break;
 case'g34_Put':doPut(s,t,v);break;
 case'g34_Marianna728':put(s,{...t,op:'g34_Order',rest:'shuffle',after:v?[{op:'MariannaCast728',selected:v}]:null});break;
 case'g34_MariannaCast728':if(v)cast(s,t.p,t.selected.uid,true,null,t.selected.face,null,'deck','光器マリアンナの能力');break;
 case'g34_Batsuda767':{
  if(!v)break;
  const host=sourceHost474(s,t);
  if(!host||host.x.sealed||!api.isCreature(s,host.x))break;
  // Rule 101.3a: attempting the optional move is enough even if it is replaced.
  put(s,{...t,op:'g34_ExactMove',owner:1-t.p,g403Refs:t.entrants,to:'mana',followEvolution:true});
  move(s,[{player:host.p,uid:host.x.uid,to:'mana',destroy:false,controller:t.p}]);
  break;
 }
 case'g34_AttackDraw770':
  if(v&&!used(s,'g770AttackDrawUsed',t)){
   mark(s,'g770AttackDrawUsed',t);
   api.draw(s,t.p,1);
  }
  break;
 case'g34_Zentuu767':
  if(v&&!used(s,'g767UnpaidRaidUsed',t)){
   mark(s,'g767UnpaidRaidUsed',t);
   put(s,{...t,op:'g34_Raid767',race:'マジック',max:5});
  }
  break;
 case'g34_RaidPick':return raid764.chosen(s,t,v);
 case'g34_OpponentTopGrave866':{
  const opponent=1-t.p;
  zoneMove(s,opponent,'deck',v,'grave');
  for(const uid of t.ids)release(s,opponent,uid);
  api.deckCheck(s,opponent);
  break;
 }
 case'g34_LookAll424':{const chosen=v?t.g424Ids:[];put(s,{...t,op:'g34_LookPick',chosen,stages:t.stages.map((q,i)=>i===t.stage?{...q,n:chosen.length,optional:false,g424AllOrNone:false}:q)});break;}
 case'g34_ManaDown426':{const y=v&&own.mana.find(y=>y.uid===v.uid&&!y.faceDown&&(y.zoneSerial||0)===v.serial);if(y){const name=card(y).name;y.faceDown=true;api.log(s,t.p,'manaFaceDown',card(t.source).name+'：'+name+'をマナゾーンで裏向きにした',{cardId:y.cardId});}break;}
 case'g34_LookPick':if(v)put(s,{...t,chosen:[...(t.chosen||[]),v]});else put(s,{...t,stages:t.stages.map((q,i)=>i===t.stage?{...q,n:(t.chosen||[]).length}:q)});break;
 case'g34_GuardOrder834':
 case'g34_Order':put(s,{...t,ids:t.ids.filter(uid=>uid!==v),ordered:[...(t.ordered||[]),v]});break;
 case'g34_Ramp':ramp(s,t,v);break;
 case'g34_DrawUpTo':if(v){
  const next=t.n>1?{...t,n:t.n-1}:null;
  // Keep the next choice behind any replacement for the current draw.
  if(t.g853EachDraw&&next)put(s,next);
  api.draw(s,t.p,1);
  if(!t.g853EachDraw&&s.winner===null&&next)put(s,next);
 }break;
 case'g34_StartDraw729':{
  const sources=t.sources.slice(1);
  put(s,{...t,source:sources[0]||t.source,sources,n:t.n+Number(!!v)});
  break;
 }
 case'g34_Draw':api.draw(s,t.p,v);break;
 case'g34_HandFollow584':{const x=s.players[discardOwner584(t)].hand.find(y=>y.uid===v);if(x)discardFollow584(s,t,x);break;}
 case'g34_DiscardMatch517':{const y=own.hand.find(y=>y.uid===v);if(y)api.discardSelected(s,t.p,[y.uid],t.source,t.p,null,{op:'g34_DrawAfterDiscard517',p:t.p,source:t.source,matches:matches(s,t.p,y,t.filter)});else api.draw(s,t.p,1);break;}
 case'g34_MillTapped782':{
  if(!v)break;
  const cards=[];
  for(let i=0;i<v;i++){
   const x=api.takeTop(s,t.p);
   if(!x)break;
   clear(x);
   cards.push(x);
  }
  // QA 46570: commit the complete group before notifying graveyard watchers.
  api.addZone(s,t.p,'grave',...cards);
  api.deckCheck(s,t.p);
  break;
 }
 case'g34_Mill':if(v)api.mill(s,t.owner??t.p,t.n==='∞'?s.players[t.owner??t.p].deck.length:t.n);break;
 case'g34_ChooseUntap562':if(v){const y=own.battle.find(y=>y.uid===v.uid&&(y.incarnation||0)===v.incarnation);put(s,{...t,refs:[...(t.refs||[]),...(y?[v]:[])]});}else finishUntap562(s,t);break;
 case'g34_ChooseEndUntap501':if(v){
  const y=own.battle.find(y=>y.uid===v.uid&&(y.incarnation||0)===v.incarnation);
  if(y){
   const source=faces(card(t.source)).find(c=>c.type==='spell')||card(t.source),ref={uid:y.uid,incarnation:y.incarnation||0};
   if(t.power)(y.powerModifiers??=[]).push({amount:t.power,expires:'end',who:s.active,...(!t.creatureSource?{spellSource:t.source,spellCost:cost(source)}:{})});
   scheduleUntap562(s,{...t,ownEnd:!t.thisTurn},[{op:'AttackUntap408',g399Attacker:ref,...(t.creatureSource?{g562Creature:true}:{})}]);
   if(t.evolutionDraw&&api.isEvolution(y))start(s,t,[{op:'Offer',title:'進化クリーチャーを選んだので1枚引く？',defs:[{op:'Draw',n:1}]}]);
  }
 }break;
 case'g34_EvoCharge566':if(v){if(!t.host)put(s,{...t,host:v});else{const host=creatures(s,t.p).find(y=>!y.sealed&&api.isEvolution(y)&&key(y)===key(t.host)),y=own.mana.find(y=>y.uid===v.uid&&(y.zoneSerial||0)===v.serial&&!y.faceDown&&faces(card(y)).some(c=>c.type==='creature'));if(host&&y&&api.canMoveZone(s,t.p,'mana')){remove(own.mana,y.uid);clear(y,'under');(host.under??=[]).push(y);api.log(s,t.p,'evoCharger',card(y).name+'を'+card(host).name+'の進化元に追加',{cardId:y.cardId});}}}break;
 case'g34_Bind566':if(v)put(s,{...t,p:t.caster,stage:t.stage+1,chosen:[...(t.chosen||[]),key(v)]});break;
 case'g34_ManaChoose582':manaPlayer582(s,t,v);break;
 case'g34_ManaPick582':put(s,{...t,chosen:[...t.chosen,v]});break;
 case'g34_OwnCard581':ownCard581(s,t,v);break;
 case'g34_ManaPair581':finishManaPair581(s,t,v);break;
 case'g34_ProtectBattleChoice580':if(v)put(s,{...t,op:'g34_BattleCardMove579',p:1-t.p,to:'grave',excludeUid:v});break;
 case'g34_BattleCardDestination580':api.moveBattleCard(s,t.p,t.target,v,{controller:t.controller});break;
 case'g34_BattleCardBounce578':
 case'g34_BattleCardMove579':if(v){
  const row=cardMoveRows579(s,t).get(v),to=t.to||'hand';
  if(row){
   if(t.ownerChoosesDestination)put(s,{...t,op:'g34_BattleCardDestination580',p:row.p,target:v});
   else moveSelectedCard581(s,t,row,to);
  }
 }break;
 case'g34_ManaExchange753':if(v)put(s,{...t,op:'g34_ManaExchangePick753',element:v});break;
 case'g34_ManaExchangePick753':if(v){
  const next={...t,incoming:v};
  const {bases,optional}=api.manaExchangeBases753(s,next);
  if(bases.length)put(s,{...next,op:'g34_ManaExchangeBase753'});
  else if(optional)api.beginManaExchange753(s,next,null);
 }break;
 case'g34_ManaExchangeBase753':api.beginManaExchange753(s,t,v);break;
 case'g34_Target':
  if(used792(s,t,t))break;
  if(t.g906AttackDraw){
   const y=v&&own.battle.find(x=>x.uid===v.uid);
   if(y)start(s,t,[{op:'TurnAttackDraw613',refs:api.allLayers(y).map(key),n:t.g906AttackDraw}]);
   break;
  }
  if(t.g904FirstAttackUntap){
   const y=v&&own.battle.find(x=>x.uid===v.uid);
   if(y)(s.extLimits??=[]).push({kind:'g543Shinka',when:'firstAttackUntap',p:t.p,source:t.source,
    refs:api.allLayers(y).map(key),spellCost:cost(faces(card(t.source)).at(-1)),expires:'end',who:s.active});
   break;
  }
  if(t.g885FirstTap){
   const y=v&&own.battle.find(x=>x.uid===v.uid);
   if(y)(s.extLimits??=[]).push({kind:'g885FirstTap',ref:{uid:y.uid,incarnation:y.incarnation||0},
    player:t.p,source:t.source,expires:'end',who:s.active});
   break;
  }
  if(t.g882DeployBelowCost){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(!y)break;
   // The chosen creature supplies the cost even if its return is replaced.
   const limit=cost(effective(y,s));
   move(s,[{player:v.p,uid:y.uid,to:'hand',destroy:false,controller:t.p}]);
   start(s,t,[{op:'Select',origin:'hand',n:1,deploy:true,optional:true,
    filter:{creature:true,belowCost:limit===Infinity?'∞':limit}}]);
   break;
  }
  if(t.g882TapBelowPower){
   const y=v&&own.battle.find(x=>x.uid===v.uid);
   if(!y)break;
   api.tap(s,t.p,y);
   const limit=livePower199(s,y,true);
   const filter={belowPower:limit===Infinity?'∞':limit,g199Power:true};
   const targets=creatures(s,1-t.p).filter(x=>!x.sealed&&matches(s,1-t.p,x,filter));
   for(const target of targets)api.tap(s,1-t.p,target);
   break;
  }
  if(t.g850OwnBounceDraw){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(y){
    move(s,[{player:v.p,uid:y.uid,to:'hand',destroy:false,controller:t.p}]);
    if(v.p===t.p)start(s,t,[{op:'Draw',n:1,optional:true}]);
   }
   break;
  }
  if(t.g843ShieldDraw){
   const y=v&&own.battle.find(x=>x.uid===v.uid);
   if(y){
    const serial=(y.zoneSerial||0)+1;
    move(s,[{player:t.p,uid:y.uid,to:'shields',destroy:false,controller:t.p}]);
    put(s,{...t,op:'g34_CheckShield843',target:y.uid,serial});
   }
   break;
  }
  if(t.g826TapAnother){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(y){
    const g810Excluded=api.allLayers(y).map(key);
    api.tap(s,v.p,y);
    start(s,t,[{op:'IfOwn',filter:{g508EvolutionOrLink:true},defs:[
     {op:'Target',tap:true,g810Excluded,title:'タップする別の相手クリーチャーを選ぶ'}
    ]}]);
   }
   break;
  }
  if(t.g816BlockOnly){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid&&!x.sealed);
   if(y)for(const part of [y,...(y.godLinks||[])])
    (s.extLimits??=[]).push({kind:'block',g190Freeze:true,player:v.p,uid:part.uid,incarnation:part.incarnation||0,controller:t.p,expires:'end',who:s.active});
   break;
  }
  if(t.g816GearDraw){
   const y=v&&own.battle.find(x=>x.uid===v.uid&&!x.sealed);
   if(y){
    move(s,[{player:t.p,uid:y.uid,to:'grave',destroy:false,controller:t.p}]);
    start(s,t,[{op:'DrawAfterGear816',target:y.uid}]);
   }
   break;
  }
  if(t.g797Stay){
   stayUntilStart627(s,t,v&&s.players[v.p].battle.find(y=>y.uid===v.uid));
   break;
  }
  if(t.g780ReleaseHyper){
   const y=v&&own.battle.find(y=>y.uid===v.uid);
   if(y)releaseHyper781(s,t.p,y);
   break;
  }
  if(t.g910AnotherIfRace){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(!y)break;
   // Use the selected creature's race and layers before any destruction replacement.
   const another=race(effective(y,s),t.g910AnotherIfRace),g810Excluded=api.allLayers(y).map(key);
   move(s,[{player:v.p,uid:y.uid,to:'grave',destroy:true,controller:t.controller??t.p}]);
   if(another)start(s,t,[{op:'Target',to:'grave',spell:t.spell,optional:true,g810Excluded,
    title:'破壊する別の相手クリーチャーを選ぶ'}]);
   break;
  }
  if(t.g810AnotherWith){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(!y)break;
   const g810Excluded=api.allLayers(y).map(key);
   move(s,[{player:v.p,uid:y.uid,to:'grave',destroy:true,controller:t.controller??t.p}]);
   start(s,t,[{op:'IfOwn',filter:{creature:true,g201ExactName:t.g810AnotherWith},
    defs:[{op:'Target',to:'grave',filter:t.filter,g810Excluded}]}]);
   break;
  }
  if(t.g809RampByCivilizations){
   const y=v&&own.battle.find(y=>y.uid===v.uid);
   if(!y)break;
   // Count the selected creature's last known civilizations, even if destruction is replaced.
   const n=colors(effective(y,s,true)).filter(color=>civilizations805.includes(color)).length;
   move(s,[{player:t.p,uid:y.uid,to:'grave',destroy:true,controller:t.controller??t.p}]);
   if(n)start(s,t,[{op:'Ramp',n,g809Together:true}]);
   break;
  }
  if(t.g786ReviveAtCost){
   const y=v&&s.players[v.p].battle.find(y=>y.uid===v.uid);
   if(!y)break;
   const max=cost(effective(y,s));
   move(s,[{player:v.p,uid:y.uid,to:'grave',destroy:true,controller:t.p}]);
   start(s,t,[{op:'Select',origin:'grave',n:1,deploy:true,optional:!!t.g795OptionalNonEvolution,
    filter:{creature:true,...(max===Infinity?{}:{max}),...(t.g795OptionalNonEvolution?{nonEvolution:true}:{})}}]);
   break;
  }
  if(v){const y=s.players[v.p].battle.find(y=>y.uid===v.uid);if(y){if(t.g792Once)(s.once??={})[onceKey792(t,t)]=s.turn;if(t.g805AddCivilization){put(s,{...t,op:'g34_ChooseCivilization805',target:{...v,incarnation:y.incarnation||0}});break;}if(t.g503Stack){const n=api.allLayers(y).length;const effect=t.g503Stack==='opponentDestroy'?{op:'OpponentSelect',n,to:'grave'}:t.g503Stack==='opponentMinus'?{op:'Target',power:-2000*n,g242PowerMinus:true}:t.g503Stack==='shield'?{op:'ShieldTop',n,g779Simultaneous:true}:{op:t.g503Stack==='draw'?'DrawUpTo':'Ramp',n};start(s,t,[effect,...(t.after||[])]);break;}if(t.g467Destinations){put(s,{...t,op:'g34_TargetDestination467',target:{...v,incarnation:y.incarnation||0}});break;}if(t.g235TapOrUntap){put(s,{...t,op:'g34_TapState235',target:{...v,incarnation:y.incarnation||0}});break;}if(t.g565AttackLock)(y.g35NoAttack??=[]).push({turn:s.turn});if(t.g569WeakerBlock)(s.extLimits??=[]).push({kind:'g569WeakerBlock',ref:{uid:y.uid,incarnation:y.incarnation||0},spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1)),expires:'end',who:s.active});if(t.g567PlayerStop)stopPlayerAttack567(s,t,y);if(t.g190Freeze)freeze(s,t,v.p,y);if(t.g546Force)force546(s,t,v.p,y);if(t.g547OwnerShield)put(s,task('g34_ShieldTop',v.p,t.source,{n:1,controller:t.controller??t.p}));if(t.g631MillCost){const amount=cost(effective(y,s));start(s,t,[{op:'Mill',n:Number.isFinite(amount)?amount:'∞',...(t.g638OptionalMill?{optional:true}:{})}]);}if(t.to)move(s,[{player:v.p,uid:v.uid,to:t.to,destroy:t.to==='grave',tapped:!!t.tapped,...(t.to==='deckTop'?{orderDeckTop:true}:{}),...(t.faceUp?{faceUp:true}:{})}]);if(t.tap)api.tap(s,v.p,y);if(t.g676TapNames)tapNames676(s,y);if(t.g291UntapUntilSelf)(y.tapLocks??=[]).push(t.p);if(t.untap&&api.canUntap(y)){const was=y.tapped;y.tapped=false;if(was)combined.untapped(s,v.p,y);}if(t.lock){if(t.spell)(y.g170StartFreeze??=[]).push({spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))});else y.skipUntap=true;}if(t.power)(y.powerModifiers??=[]).push({amount:t.power,expires:t.g521UntilStart?'start':'end',who:t.g521UntilStart?t.p:s.active,...(t.g337PowerAttacker?{attackOnly:true,grantedAbility:true}:{}),spellSource:t.spell? t.source:undefined,spellCost:t.spell?cost(faces(card(t.source)).at(-1)):undefined});if(t.grant)applyGrant(s,t,y);if(t.g465DestroySafe)(s.extLimits??=[]).push({kind:'g409AttackEffect',player:v.p,ref:{uid:y.uid,incarnation:y.incarnation||0},source:t.source,effect:'destroySafe',expires:t.g465DestroySafe,who:t.g465DestroySafe==='start'?t.p:s.active});if(t.g455ExtraBreak)(s.extLimits??=[]).push({kind:'g412ExtraBreak',player:v.p,ref:{uid:y.uid,incarnation:y.incarnation||0},source:t.source,amount:t.g455ExtraBreak,expires:'end',who:s.active,...(t.spell?{spellCost:cost(faces(card(t.source)).at(-1))}:{})});if(t.g821DrawIfEvolution&&api.isEvolution(y))start(s,t,[{op:'DrawUpTo',n:1}]);if(t.seal)api.seal(s,v.p,[y.uid]);if(t.g587AfterSelection)start(s,t,t.after);}}if(t.after&&!t.g587AfterSelection)start(s,t,t.after);break;
 case'g34_Execute':if(v){const y=own[v.origin].find(x=>x.uid===v.uid);if(t.g555FinishTo&&(!y||(y.zoneSerial||0)!==(v.serial555||0)||!api.canMoveZone(s,t.p,v.origin)))break;const c=faces(card(y))[v.face];if(t.g555FinishTo){if(!c||c.type!=='spell'||cost(c)>t.max||t.spellColorsAny&&!colors(c).some(color=>t.spellColorsAny.includes(color))||t.g556SpellColor&&!colors(c).includes(t.g556SpellColor)||!api.canCast(s,t.p,c,v.origin))break;y.finishTo=t.g555FinishTo;}if(c.evolution||c.neoEvolution)put(s,{...t,op:'g34_Put',target:v.uid,origin:v.origin,execution:true,face:v.face});else cast(s,t.p,v.uid,true,null,v.face,null,v.origin,'カードの能力');}else if(t.g408Decline)start(s,t,t.g408Decline);break;
 case'g34_Choose':put(s,...tasks(t.p,t.source,t.modes[v].defs,{uid:t.uid,incarnation:t.incarnation}),...(t.repeat>1?[{...t,repeat:t.repeat-1}]:[]));break;
 case'g34_Custom':customChosen(s,t,v);break;
 default:throw Error('未実装の6デッキ選択：'+t.op);
 }return true;}
 // Custom continuations are below; generic effects above never lose or clone cards.
  const active=(s,p,role)=>s.players[p].battle.filter(x=>card(x).g34Role===role&&!api.ignored(s,x));
 const tappedCreatures843=(s,p)=>creatures(s,p).filter(x=>!x.sealed&&x.tapped).length;
 const E=(op,more={})=>({op,...more}),C=(name,more={})=>E('Custom',{name,...more});
 const exec=(origin,max,more={})=>E('Execute',{origin,max,...more}),select=(origin,to,n,filter={},more={})=>E('Select',{origin,to,n,filter,...more});
 const buff=(s,x,n)=>{(x.powerModifiers??=[]).push({amount:n,expires:'end',who:s.active});};
 function flushGrave838(s,count){
  if(!count)return;
  for(const p of [0,1])for(const x of s.players[p].battle){
   if(x.sealed||!card(x).g838AnyGrave)continue;
   const defs=effective(x,s).g838AnyGrave;
   if(defs)for(let i=0;i<count;i++)queue(s,p,x,defs);
  }
 }
 function triggerShieldAdded918(s,p,count){
  if(!count)return;
  for(const x of s.players[p].battle){
   if(x.sealed||!card(x).g918ShieldAdded)continue;
   const defs=effective(x,s).g918ShieldAdded;
   if(defs)for(let i=0;i<count;i++)queue(s,p,x,defs);
  }
 }
 const sourceDefs=(s,t,defs)=>start(s,t,defs),queue=(s,p,x,defs,source=x.cardId)=>send(s,p,source===x.cardId?x:{...x,cardId:source},'Sequence',{defs});
 const used=(s,slot,x)=>s[slot]?.[key(x)]===s.turn,mark=(s,slot,x)=>{(s[slot]??={})[key(x)]=s.turn;};
 const onceKey792=(x,d)=>'g792:'+d.g792Once+':'+key(x);
 const used792=(s,x,d)=>!!d?.g792Once&&s.once?.[onceKey792(x,d)]===s.turn;
 const parottaKey747=x=>'parotta:'+key(x),parottaUsed747=(s,x)=>s.once?.[parottaKey747(x)]===s.turn;
 function custom(s,t){const own=s.players[t.p],opp=s.players[1-t.p],x=live(s,t);switch(t.name){
 case'finishBatch':delete s.g34DeployBatch;delete own.g34ManaHeld;break;
 case'endTurn':api.skipTurn(s,t.p,t.source);break;
 case'emrakulMove':api.moveBattleCard(s,t.p,t.target,'grave');break;
 case'engelsTerminal':if(!s.g7TerminalUsed?.[t.p])choice(s,t,'終極宣言を使う？（ゲーム中1回）',[opt('宣言する',true,own.deck.length>4?30:-100),skip()]);break;
 case'extraTurn':if(api.canAddTurn(s,t.p))(s.extraTurns??=[]).push({player:t.p,source:t.source});api.log(s,t.p,'extraTurn','このターンの後、もう一度自分のターンを行う',{cardId:t.source});break;
 case'soilDiscount':(s.g34Discounts??=[]).push({p:t.p,turn:s.turn,amount:8});break;
 case'kusabi12':if(own.mana.length>=12)start(s,t,[select('battle','mana',2,{creature:true},{owner:1-t.p,p:1-t.p,controller:t.p}),select('mana',null,2,{creature:true},{deploy:true,optional:true})]);break;
 case'dollModes':start(s,t,[E('Choose',{modes:[{label:'相手の闇以外の手札をすべて捨てさせる',score:opp.hand.length*4,defs:[C('discardNonDark')]},{label:'闇以外のクリーチャーをすべて破壊',score:[0,1].reduce((n,p)=>n+creatures(s,p).filter(y=>!colors(effective(y,s)).includes('闇')).reduce((n,y)=>n+(p===t.p?-1:1)*(10+Math.min(20,cost(card(y)))*3),0),0),defs:[E('Sweep',{filter:{creature:true,notColor:'闇'},both:true})]},{label:'相手の闇以外のマナは次の自分のターンまでアンタップしない',score:opp.mana.filter(y=>!api.manaColors(card(y),s,1-t.p).includes('闇')).length*3,defs:[C('dollManaLock')]}]})]);break;
 case'dollManaLock':for(const y of opp.mana)if(!api.manaColors(card(y),s,1-t.p).includes('闇'))(y.tapLocks??=[]).push({who:t.p,afterTurns:own.turns});break;
 case'purgeNonDarkMana':for(const p of[0,1])for(const y of [...s.players[p].mana])if(!api.manaColors(card(y),s,p).includes('闇'))zoneMove(s,p,'mana',y.uid,'grave',t);break;
 case'discardNonDark':for(const p of(t.both?[1-s.active,s.active]:[1-t.p])){api.log(s,p,'reveal','手札を公開：'+s.players[p].hand.map(y=>card(y).name).join('・'),{cardId:t.source});api.discardSelected(s,p,s.players[p].hand.filter(y=>!api.manaColors(card(y),s,p).includes('闇')).map(y=>y.uid),t.source,t.p);}break;
 case'baromeaDeploy':start(s,t,[select('mana',null,1,{creature:true,name:'バロム',max:own.mana.length},{deploy:true,optional:false})]);break;
 case'violetDiscard':{const ys=opp.hand;if(!ys.length)break;const y=ys[Math.floor(api.random(s)*ys.length)];put(s,{...t,name:'violetSpell',target:y.uid});api.discardSelected(s,1-t.p,[y.uid],t.source,t.p);break;}
 case'violetSpell':{const y=opp.grave.find(y=>y.uid===t.target);if(y&&faces(card(y)).some(c=>c.type==='spell'&&api.canCast(s,t.p,c,'grave')))choice(s,t,'捨てさせた呪文をコストを支払わず唱える？',[opt('唱える',true,20,y.cardId),skip()]);break;}
 case'sealSelf':if(x)api.seal(s,t.p,[x.uid],t.n);break;
 case'hydro':start(s,t,[select('mana','hand',creatures(s,t.p).filter(y=>colors(effective(y,s)).includes('光')).length,{}, {owner:1-t.p,optional:true}),select('battle','hand',creatures(s,t.p).filter(y=>colors(effective(y,s)).includes('闇')).length,{creature:true},{owner:1-t.p,optional:true})]);break;
 case'tapLockTwo':{const ys=creatures(s,1-t.p).filter(y=>!(t.selected||[]).includes(y.uid));if((t.selected||[]).length>=2||!ys.length)break;choice(s,t,'タップし、次のターンにアンタップしない相手を2体まで選ぶ',[...targetOptions(s,t.p,ys),skip()]);break;}
 case'declareName':{if(!x)break;const cs=api.allCards().filter(c=>c.type==='creature'&&c.g34Role!=='emotional');choice(s,t,'能力を無視するクリーチャーの名前を選ぶ',cs.map(c=>opt(c.name,c.name,s.players[1-t.p].battle.some(y=>card(y).name===c.name)?60:0,c.id)));break;}
 case'shinobiMekraid':{const ids=look(s,{...t,n:3});put(s,{...t,name:'mekraidPick',ids});break;}
 case'mekraidPick':{const rows=t.ids.flatMap(uid=>{const y=own.deck.find(x=>x.uid===uid);return y?faces(card(y)).flatMap((c,face)=>ninja(c)&&cost(c)<=5&&api.canCast(s,t.p,c,'deck')&&(c.type!=='creature'||canPut(s,t.p,y,'deck',true))?[opt(c.name,{uid,face},20+cost(c),y.cardId)]:[]):[];});choice(s,t,'シノビ・メクレイド5：実行するカードを1枚まで選ぶ',[...rows,skip()]);break;}
 case'karenReveal':{const chosen=t.selected||[],rows=own.hand.filter(y=>ninja(card(y))&&!chosen.includes(y.uid));if(!rows.length){karenDone(s,t);break;}choice(s,t,'公開する手札のシノビを選ぶ（好きな枚数）',[...rows.map(y=>opt(card(y).name,y.uid,5,y.cardId)),opt('公開して確定',null,0)]);break;}
 case'forceEnemyAttacks':(s.extLimits??=[]).push({kind:'g34ForceAttack',player:1-t.p,expires:'start',who:t.p});break;
 case'graveCostDestroy':start(s,t,[E('Target',{to:'grave',filter:{max:own.grave.length}})]);break;
 case'reiaiModes':start(s,t,[E('Choose',{repeat:2,modes:[{label:'山札3枚から手札1枚、残りをタップしてマナへ',score:own.deck.length>3?14:-100,defs:[E('Look',{n:3,stages:[{to:'hand',n:1}],rest:'mana',restTapped:true})]},{label:'手札から進化ではないコスト9以下を出す',score:Math.max(-20,...own.hand.filter(y=>card(y).type==='creature'&&!card(y).evolution&&!card(y).sMax&&cost(card(y))<=9&&canPut(s,t.p,y,'hand')).map(y=>12+cost(card(y))*2)),defs:[select('hand',null,1,{creature:true,nonEvolution:true,max:9},{deploy:true,delayed:'grave'})]},{label:'エレメントを2つまで破壊',score:opp.battle.length?12+Math.max(...opp.battle.map(y=>Math.min(20,cost(card(y)))*3)):-20,defs:[C('destroyTwo',{anyOwner:true,element:true,optional:true})]}]})]);break;
 case'muteEnemy':(s.extLimits??=[]).push({kind:'g34Mute',player:1-t.p,expires:'start',who:t.p});break;
 case'reisaiLook':if((t.times||0)<3&&own.deck.length)choice(s,t,'山札の上3枚を分ける（'+((t.times||0)+1)+'/3回）',[opt('能力を使う',true,own.deck.length>3?15:-100),skip()]);break;
 case'lucifer':if(s.active!==t.p)api.skipTurn(s,t.p,t.source);else start(s,t,[select('hand',null,1,{creature:true,color:'光',max:9},{deploy:true,optional:true})]);break;
 case'destroyTwo':{const selected=t.selected||[],ps=t.anyOwner?[t.p,1-t.p]:[1-t.p],rows=ps.flatMap(p=>s.players[p].battle.filter(y=>(t.element||api.isCreature(s,y))&&!selected.includes(y.uid)));if(selected.length>=2||!rows.length){destroySelected(s,t);break;}choice(s,t,'破壊する'+(t.element?'エレメント':'相手クリーチャー')+'を2つ'+(t.optional?'まで':'')+'選ぶ',[...targetOptions(s,t.p,rows).map(o=>({...o,score:s.players[t.p].battle.some(y=>y.uid===o.value)?-Math.min(100,10+cost(card(o.cardId))*3):o.score})),...(t.optional?[opt('選択を確定',null,0)]:[])]);break;}
 case'shieldMandatory':api.shieldTop(s,t.p,card(t.source));break;
 case'shieldOptional':choice(s,t,'山札の上1枚をシールド化する？',[opt('シールド化する',true,own.deck.length>1?10:-100),skip()]);break;
 case'opponentExtreme':{
  const ps=1-t.p;
  const rows=creatures(s,ps).filter(y=>!t.g740Power||!y.sealed&&(!t.untapped||!y.tapped));
  if(!rows.length)break;
  const power=y=>t.g740Power?currentPower506(s,y):api.power(y,false,s);
  const n=Math[t.extreme](...rows.map(power));
  // Compare all eligible creatures first, then check whether the chooser can select the tied extrema.
  const options=rows.filter(y=>power(y)===n&&(!t.g740Power||api.targetable(s,ps,ps,y)))
   .map(y=>opt(card(y).name,y.uid,-cost(card(y)),y.cardId));
  const title='自分の'+(t.untapped?'アンタップしている':'')+'パワーが'+(t.extreme==='min'?'最小':'最大')+'のクリーチャーを選ぶ';
  choice(s,{...t,p:ps,controller:t.p,chooser:ps},title,options);
  break;
 }
 case'cottonRamp':{const y=api.takeTop(s,t.p);if(!y)break;const multi=api.manaColors(card(y),s,t.p).length>1,dest=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';clear(y,dest);y.tapped=dest==='mana';api.addZone(s,t.p,dest,y);if(multi)ramp(s,{...t,tapped:true},1);api.deckCheck(s,t.p);break;}
 case'minogamiBuff':if(x)buff(s,x,5000*(t.moved||0));break;
 case'emrakulSix':{const owner=1-t.p,enemy=s.players[owner],chosen=t.selected||[],rows=[...enemy.battle.flatMap(top=>api.layers(top).filter(y=>!y.faceDown).map(y=>({x:y,origin:'battle'}))),...enemy.mana.filter(y=>!y.faceDown).map(y=>({x:y,origin:'mana'})),...enemy.shields.flatMap(api.shieldCards).filter(y=>y.faceUp).map(y=>({x:y,origin:'shields'}))].filter(r=>!chosen.some(y=>y.uid===r.x.uid));if(chosen.length>=6||!rows.length){const b=chosen.filter(y=>y.origin==='battle');for(const r of chosen.filter(y=>y.origin!=='battle'))if(r.origin==='shields')api.moveShield(s,owner,r.uid,'grave',{cardOnly:true});else zoneMove(s,owner,r.origin,r.uid,'grave',t);if(b.length)put(s,...b.map(r=>task('g34_Custom',owner,t.source,{name:'emrakulMove',target:r.uid}))); break;}choice(s,{...t,p:owner,controller:t.p,chooser:owner},'表向きのカードを合計6枚選ぶ（'+chosen.length+'/6）',rows.map(r=>opt(card(r.x).name,{uid:r.x.uid,origin:r.origin},-cost(card(r.x)),r.x.cardId)));break;}
 case'nameko':start(s,t,[E('ExactMove',{to:'mana',owner:1-t.p,target:t.target,targetIncarnation:t.targetIncarnation,optional:true}),E('Ramp',{n:1,optional:true})]);break;
 case'scarletRevive':{const source=live(s,t),y=own.grave.find(y=>y.uid===t.target);if(!used(s,'g34Scarlet',source||t)&&y&&(t.targetSerial===undefined||(y.zoneSerial||0)===t.targetSerial)&&card(y).type==='creature'&&cost(card(y))<=5&&canPut(s,t.p,y,'grave'))choice(s,t,'墓地に置かれた'+card(y).name+'を出す？',[opt('出す',true,30,y.cardId),skip()]);break;}
 case'souzanStop':if(x&&!used(s,'g34Souzan',x)&&s.attack&&own.hand.length)choice(s,t,'手札を1枚捨て、攻撃を中止する？',[opt('捨てて攻撃を中止',true,40),skip()]);break;
 case'stopAttack':s.attack=null;break;
 case'mantraDefend':{const y=own.shields.flatMap(api.shieldCards).find(y=>y.uid===t.uid&&y.faceUp);if(y)choice(s,t,'マントラ丸を墓地に置いて手札のメカを出す？',[opt('能力を使う',true,own.hand.some(y=>mecha(card(y))&&cost(card(y))<=5)?35:-10),skip()]);break;}
 case'justiceBreak':{const rows=[0,1].flatMap(p=>s.players[p].shields.map(y=>({p,uid:y.uid})));choice(s,t,'ブレイクするシールドを1つまで選ぶ',[...rows.map(r=>opt((r.p===t.p?'自分':'相手')+'のシールド'+(s.players[r.p].shields.findIndex(y=>y.uid===r.uid)+1),r,r.p===t.p?1:20)),skip()]);break;}
 case'happouSummon':{const y=own.hand.find(y=>y.uid===t.uid);if(y&&s.active!==t.p&&own.battle.filter(y=>ninja(effective(y,s))).length>=2&&!own.battle.some(y=>!y.sealed&&card(y).g34Role==='happou')&&api.canCast(s,t.p,card(y),'hand')&&canPut(s,t.p,y,'hand',true))choice(s,t,'ハッポウマントラをコストを支払わず召喚する？',[opt('召喚する',true,30,y.cardId),skip()]);break;}
 case'orbDeploy':start(s,t,[select('hand',null,1,{creature:true,race:'ディスペクター',max:10},{deploy:true,optional:true,delayed:'grave'})]);break;
 case'nightmare':{const y=own.hand.find(y=>y.uid===t.uid);if(y&&s.attack?.target==='player'&&s.active!==t.p&&s.players.some(p=>!p.shields.length)&&!own.battle.some(y=>!y.sealed&&card(y).g34Role==='nightmare'))choice(s,t,'ナイトメアを見せ、山札の一番下を墓地に置く？',[opt('能力を使う',true,40,y.cardId),skip()]);break;}
 case'nightmareBase':{const y=own.grave.find(y=>y.uid===t.target);if(y&&!card(y).evolution&&!card(y).sMax&&demon(card(y))&&canPut(s,t.p,y,'grave')){remove(own.grave,y.uid);clear(y,'battle');enter(s,t.p,y,null,{origin:'grave',execution:false});put(s,{...t,name:'nightmareEvolve'});}break;}
 case'nightmareEvolve':{const y=own.battle.find(y=>y.uid===t.target),z=own.hand.find(y=>y.uid===t.uid);if(y&&z&&api.evolutionBases(s,t.p,card(z)).includes(y)&&canPut(s,t.p,z,'hand')){remove(own.hand,z.uid);clear(z,'battle');enter(s,t.p,z,y.uid,{origin:'hand',execution:false});}break;}
 case'reizuCast':{const y=own.hand.find(y=>y.uid===t.uid);if(y&&api.canPay(s,t.p,{cost:1,civilizations:['火'],fixedPayment:true})&&canPut(s,t.p,y,'hand',true))choice(s,t,'1マナを支払い、バロムレイズを召喚する？',[opt('召喚する',true,40,y.cardId),skip()]);break;}
 case'alternative':alternativePick(s,t);break;
 case'minoLoss':minoLoss(s,t);break;
 default:throw Error('6デッキ効果に対応する処理がありません：'+t.name);
 }}
 function karenDone(s,t){const own=s.players[t.p],n=(t.selected||[]).filter(uid=>own.hand.some(y=>y.uid===uid)).length+own.battle.filter(y=>ninja(effective(y,s))).length;api.log(s,t.p,'reveal','シノビを公開：'+(t.selected||[]).map(uid=>card(own.hand.find(y=>y.uid===uid)).name).join('・'),{cardId:t.source});for(const y of creatures(s,1-t.p))buff(s,y,-1000*n);}
 function destroySelected(s,t){const rows=(t.selected||[]).flatMap(uid=>[0,1].flatMap(p=>s.players[p].battle.some(y=>y.uid===uid)?[{player:p,uid,to:'grave',destroy:true}]:[]));if(rows.length)move(s,rows);}
 function customChosen(s,t,v){const own=s.players[t.p],x=live(s,t);switch(t.name){
 case'engelsTerminal':if(v&&!s.g7TerminalUsed?.[t.p]){(s.g7TerminalUsed??=[false,false])[t.p]=true;start(s,t,[E('Choose',{repeat:4,modes:[{label:'相手1体を破壊し1枚引く',defs:[E('Target',{to:'grave'}),E('Draw',{n:1})]},{label:'シールド化し墓地1枚を手札へ',defs:[C('shieldMandatory'),select('grave','hand',1)]}]})]);}break;
 case'violetSpell':if(v){const y=remove(s.players[1-t.p].grave,t.target),face=faces(card(y)).findIndex(c=>c.type==='spell');clear(y,'hand');y.cardOwner=1-t.p;y.g5Origin='grave';(own.g34Holding??=[]).push(y);cast(s,t.p,y.uid,true,null,face,null,'g34Holding','ヴァイオレットゾーン');}break;
 case'tapLockTwo':if(v){const y=s.players[1-t.p].battle.find(y=>y.uid===v);if(y){api.tap(s,1-t.p,y);y.skipUntap=true;}put(s,{...t,selected:[...(t.selected||[]),v]});}break;
 case'declareName':if(x)x.g34ChosenName=v;break;
 case'mekraidPick':{put(s,{...t,op:'g34_Order',ids:t.ids.filter(uid=>uid!==v?.uid),rest:'bottom',ordered:[]});if(v){release(s,t.p,v.uid);const y=own.deck.find(y=>y.uid===v.uid),c=y&&faces(card(y))[v.face];if(c&&(c.evolution||c.neoEvolution))put(s,{...t,op:'g34_Put',target:v.uid,origin:'deck',execution:true,face:v.face});else if(y)cast(s,t.p,y.uid,true,null,v.face,null,'deck','シノビ・メクレイド');}break;}
 case'karenReveal':if(v)put(s,{...t,selected:[...(t.selected||[]),v]});else karenDone(s,t);break;
 case'reisaiLook':if(v)put(s,...tasks(t.p,t.source,[E('Look',{n:3,stages:[{to:'hand',n:1},{to:'mana',n:1},{to:'grave',n:1}]}),C('reisaiLook',{times:(t.times||0)+1})],{uid:t.uid,incarnation:t.incarnation}));break;
 case'destroyTwo':if(v)put(s,{...t,selected:[...(t.selected||[]),v]});else destroySelected(s,t);break;
 case'shieldOptional':if(v)api.shieldTop(s,t.p,card(t.source));break;
 case'opponentExtreme':if(v)move(s,[{player:t.chooser,uid:v,to:t.to,destroy:t.to==='grave',controller:t.controller}]);break;
 case'emrakulSix':if(v){const controller=t.controller??1-t.p;put(s,{...t,p:controller,selected:[...(t.selected||[]),v]});}break;
 case'scarletRevive':if(v){mark(s,'g34Scarlet',x||t);start(s,t,[E('Put',{origin:'grave',target:t.target})]);}break;
 case'souzanStop':if(v&&x){mark(s,'g34Souzan',x);start(s,t,[E('Discard',{owner:'self',n:1}),C('stopAttack')]);}break;
 case'mantraDefend':if(v){api.moveShield(s,t.p,t.uid,'grave',{cardOnly:true});start(s,t,[select('hand',null,1,{creature:true,race:'メカ',max:5},{deploy:true,optional:true,grant:{blocker:true,slayer:true}})]);}break;
 case'justiceBreak':if(v)api.breakShields(s,v.p,[v.uid]);break;
 case'happouSummon':if(v)cast(s,t.p,t.uid,true,null,0,null,'hand','ハッポウマントラ');break;
 case'nightmare':if(v){api.log(s,t.p,'reveal',card(t.source).name+'を公開',{cardId:t.source});const y=own.deck.at(-1);if(y){zoneMove(s,t.p,'deck',y.uid,'grave',t);put(s,{...t,name:'nightmareBase',target:y.uid});}api.deckCheck(s,t.p);}break;
 case'reizuCast':if(v)start(s,t,[E('Put',{origin:'hand',target:t.uid,execution:true,payment:{cost:1,civilizations:['火'],fixedPayment:true}})]);break;
 case'alternative':alternativeChosen(s,t,v);break;
 case'minoLoss':minoLoss(s,{...t,selected:[...(t.selected||[]),v]});break;
 default:throw Error('6デッキの選択に対応する処理がありません：'+t.name);
 }}
 function minoLoss(s,t){const own=s.players[t.p],selected=t.selected||[];if(selected.length===8){const rows=selected.map(uid=>remove(own.mana,uid)).filter(Boolean);for(const y of rows)clear(y,'deck');own.deck.push(...api.shuffled(rows,Math.floor(api.random(s)*4294967296)));api.completeLossReplacement(s,'始虹帝ミノガミ：マナ8枚をシャッフルして山札の下へ置き敗北を置換');return;}choice(s,t,'敗北のかわりに山札の下へ置くマナを選ぶ（'+selected.length+'/8）',own.mana.filter(y=>!selected.includes(y.uid)).map(y=>opt(card(y).name,y.uid,-cost(card(y)),y.cardId)));}
 function alternativePick(s,t){const own=s.players[t.p],selected=t.selected||[],role=t.role;let rows,title,n;if(role==='sirius'){rows=creatures(s,t.p).filter(y=>angel(effective(y,s))&&!y.tapped);title='タップするエンジェル・コマンド5体';n=5;}else if(role==='zero'&&t.stage!=='destroy'){rows=own.hand.filter(y=>y.uid!==t.uid&&colors(card(y)).includes('闇'));title='捨てる闇の手札3枚';n=3;}else{rows=own.battle.filter(y=>(role==='reiai'||api.isCreature(s,y)&&colors(effective(y,s)).includes('闇'))&&api.canLeave(s,t.p,y));title='破壊する'+(role==='zero'?'闇のクリーチャー3体':'エレメント2つ');n=role==='zero'?3:2;}rows=rows.filter(y=>!selected.includes(y.uid));if(selected.length>=n){if(role==='zero'&&t.stage!=='destroy'){put(s,{...t,stage:'destroy',hand:selected,selected:[]});return;}const spell=own.hand.find(y=>y.uid===t.uid);if(!spell)return;if(role==='sirius')for(const uid of selected){const y=own.battle.find(y=>y.uid===uid);if(y)api.tap(s,t.p,y);}else{if(role==='zero'&&!t.discardPaid){put(s,{...t,discardPaid:true});api.discardSelected(s,t.p,t.hand,t.source,t.p);return;}api.destroyReplacementCards(s,t.p,selected,api.snapshot(s,selected.map(uid=>({player:t.p,uid}))));}const payment=role==='reiai'?{cost:5,civilizations:['光','闇','自然'],fixedPayment:true}:{cost:0,civilizations:[],fixedPayment:true};cast(s,t.p,t.uid,false,null,0,payment,'hand',role==='sirius'?'代替召喚':'代替コスト');return;}if(rows.length<n-selected.length)return;choice(s,t,title+'を選ぶ（'+selected.length+'/'+n+'）',rows.map(y=>opt(card(y).name,y.uid,-cost(card(y)),y.cardId)));}
 function alternativeChosen(s,t,v){put(s,{...t,selected:[...(t.selected||[]),v]});}

 
  const hooks={
 block(s,p,x){
  const blocker=effective(x,s),defs=blocker.g178Block;
  const owner=1-p,a=s.players[owner].battle.find(y=>y.uid===s.attack?.attacker);
  if(defs)queue(s,p,x,defs.flatMap(d=>d.g913BlockedAttacker?
   a?[{...d,subject:{uid:a.uid,incarnation:a.incarnation||0}}]:[]:[d]));
  for(const source of creatures(s,p)){
   if(source.sealed)continue;
   const races=effective(source,s).g700BlockDraw;
   if(races?.some(name=>race(blocker,name)))queue(s,p,source,[{op:'Draw',n:1,optional:true}]);
   if(effective(source,s).g830AllyBlockBreak){
    send(s,p,source,'Break497',{uid:x.uid,incarnation:x.incarnation||0,n:1,g747CreatureBreak:true,g830BlockBreaker:x.cardId});
   }
  }
  const blocked=a&&!a.sealed&&effective(a,s).g559Blocked;
  if(blocked)queue(s,owner,a,blocked);
  if(a&&!a.sealed&&s.attack.g712PlayerTarget&&s.players[p].shields.length&&colors(effective(a,s)).includes('自然')){
   for(const rule of s.extLimits||[]){
    if(rule.kind!=='g712BlockBreak'||rule.player!==owner||rule.turn!==s.turn)continue;
    queue(s,owner,{uid:rule.uid,incarnation:rule.incarnation,cardId:rule.source},[{op:'Break497',n:1}]);
   }
  }
 },
 turnStart(s,p,tappedBefore){if(s.extLimits){s.extLimits=s.extLimits.filter(l=>!(l.kind==='g546Force'&&l.when==='nextOpponent'&&l.activeTurn!==undefined&&l.activeTurn!==s.turn));for(const l of s.extLimits)if(l.kind==='g546Force'&&l.when==='nextOpponent'&&p===1-l.controller&&s.turn>l.turn)l.activeTurn=s.turn;}const delayed537=collect537(s,'nextOwnStart',p),generic=[p,1-p].flatMap(controller=>s.players[controller].battle.filter(x=>!x.sealed&&(api.isCreature(s,x)||effective(x,s).g461TurnPlayer)).flatMap(x=>{const c=effective(x,s),defs=c[controller===p?'g174Start':'g179OpponentStart'];if(c.g754StartTapped&&!tappedBefore?.has(x.uid))return [];return defs?[{player:controller,uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g34_Sequence',controller,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,defs})}]:[];}));const grave=s.players[p].grave.flatMap(x=>{
  const colors=card(x).g754GraveStartColors;
  if(!colors||x.faceDown)return [];
  return [{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g34_GraveReturn754',p,x.cardId,{
   uid:x.uid,incarnation:x.incarnation||0,serial:x.zoneSerial||0,colors
  })}];
 });return [...delayed537,...generic,...grave,...active(s,p,'engels').filter(()=>!s.g7TerminalUsed?.[p]).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Custom',p,x.cardId,{name:'engelsTerminal',uid:x.uid,incarnation:x.incarnation||0})}))];},
 active,
 decorate(s,p,x,c){if(!s||p<0||c.type!=='creature')return c;const d={},own=s.players[p];if(c.g756TurboRush==='unblockable'&&turboReady756(s,p,x))d.unblockable=true;for(const l of s.extLimits||[])if(l.kind==='g521Grant'&&(l.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource}))&&api.allLayers(x).some(y=>y.uid===l.ref.uid&&(y.incarnation||0)===l.ref.incarnation))Object.assign(d,l.grant);if(c.g225AttackRequires&&!attackConditionReading481.has(s)){let ready;attackConditionReading481.add(s);try{ready=attackCondition225(s,p,c.g225AttackRequires,x);}finally{attackConditionReading481.delete(s);}if(!ready)d.noAttack=true;}if(race(c,'コマンド')&&active(s,p,'scarlet').length)d.speedAttacker=true;if(ninja(c)&&active(s,p,'dororon').length)d.blocker=true;if(active(s,p,'fallenMantra').length)d.slayer=true;if(c.g899AttackSlayerMax!==undefined&&s.attack?.attacker===x.uid){
  // QA39683: blocking replaces the creature being attacked for this continuous ability.
  const target=s.players[1-p].battle.find(y=>y.uid===(s.attack.blockUid||s.attack.target));
  if(target&&!target.sealed&&api.isCreature(s,target)&&cost(effective(target,s))<=c.g899AttackSlayerMax){d.g208SlayerCount=(c.g208SlayerCount||Number(!!(c.slayer||d.slayer)))+1;d.slayer=true;}
 }if(angel(c)&&cost(c)<=8&&active(s,p,'sirius').length)Object.assign(d,{cannotBeAttacked:true,unblockable:true,spellUntargetable:true});if(c.g34Role==='emotional'&&own.battle.some(y=>y.uid!==x.uid&&race(card(y),'オラクル')&&!api.ignored(s,y)))d.untargetable=true;if(c.g34Role==='nightmare'&&x.tapped)d.opponentTapEntry=true;if((s.extLimits||[]).some(l=>l.kind==='g34ForceAttack'&&l.player===p)||active(s,0,'baromreizu').length||active(s,1,'baromreizu').length||forceAttack224(s,p)||forced546(s,p,x)||
  c.g845RequiredAttacks&&(s.g481Attackers?.turn!==s.turn||s.g481Attackers.events.filter(e=>e.refs.includes(key(x))).length<c.g845RequiredAttacks))d.mustAttack=true;let slayers=d.g208SlayerCount??(c.g208SlayerCount||Number(!!(c.slayer||d.slayer)));for(const g of x.g34Grants||[])if((g.turn===s.turn||g.g774Permanent)&&(g.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:g.spellCost,spellSource:g.spellSource}))){if(g.slayer)slayers++;const attackBonus=g.attackBonus?(d.attackBonus??c.attackBonus??0)+g.attackBonus:null;Object.assign(d,g);if(attackBonus!==null)d.attackBonus=attackBonus;}if(slayers>1)d.g208SlayerCount=slayers;const boosts=(x.g34Grants||[]).filter(g=>g.turn===s.turn&&g.g313Breaker);if(boosts.length){const counts=[c.breaker,d.breaker,...boosts.map(g=>g.g313Breaker)].filter(Boolean);d.breaker=counts.includes('∞')?'∞':Math.max(...counts);}return Object.keys(d).length?{...c,...d}:c;},
 selectGrantedBreaker633(s,p,x){
  if(s.attack.g633Breaker!==undefined||!s.players[1-p].shields.length)return false;
  const c=effective(x,s),counts=c.g633BreakerChoices;
  if(!counts||counts.length<2)return false;
  const shields=s.players[1-p].shields.length;
  choice(s,task('g34_GrantedBreaker633',p,x.cardId,{uid:x.uid}),'この攻撃で使うブレイカーを選ぶ',
   counts.map(n=>opt(n===2?'W・ブレイカー':n==='∞'?(c.worldBreaker?'ワールド・ブレイカー':'∞ ブレイカー'):n+'枚をブレイクする',
    n,Math.min(n==='∞'?Infinity:n,shields))));
  return true;
 },
 noUntap(s,x){const p=s.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid));return p>=0&&api.isCreature(s,x)&&!mecha(effective(x,s))&&(active(s,0,'shinGod').length||active(s,1,'shinGod').length)>0;},
 countDiscount212(s,p,c){if(c.g212CountDiscount?.minimum===2)return 0;const max=countDiscountMax499(s,p,c);return c.g212CountDiscount?.optional&&c.g499Reduction!==undefined?Math.min(max,Math.max(0,c.g499Reduction)):max;},
 summonAuraDiscount290(s,p,c){
  const r=summonAuras560(s,p,c),selected=c.g560Amount===undefined?r.optional:Math.min(r.optional,Math.max(0,c.g560Amount));
  return {amount:r.mandatory+selected,zeroAmount:Math.min(selected,r.zeroOptional)};
 },
 variants456(s,p,actions){if(!s.extLimits?.some(r=>r.kind==='g456NextReduction'&&r.player===p&&r.turn===s.turn)||creatures(s,1-p).some(y=>effective(y,s).noCostReduction))return actions;const out=[...actions];for(const a of actions){if(a.kind!=='play'||a.freeSummon||a.freeSpell||a.alternative||a.g456Reduction!==undefined)continue;const c=faces(card(a.cardId))[a.face||0],r=reductionRange456(s,p,c);for(let n=r.min;n<r.max;n++){const payment={...c,summonOrigin:a.origin||'hand',g456Reduction:n,...(a.g7Payment?{g7Payment:a.g7Payment}:{}),...(a.snowReducers?{snowReducers:a.snowReducers}:{}),...(a.magicReducers?{magicReducers:a.magicReducers}:{}),...(a.g18Reducers!==undefined?{g18Reducers:a.g18Reducers}:{}),...(a.g26Reducers?{g26Reducers:a.g26Reducers}:{}),...(a.g42Reduction!==undefined?{g42Reduction:a.g42Reduction}:{})};if(api.canPay(s,p,payment))out.push({...a,g456Reduction:n,requiresMethod:true,cost:api.summonCost(s,p,payment),label:c.name+'を次回の軽減'+n+'で使う'});}}return out;},
 variants463(s,p,actions){if(!creatures(s,p).some(y=>!y.sealed&&effective(y,s).g463FirstSummon)||creatures(s,1-p).some(y=>effective(y,s).noCostReduction))return actions;const out=[...actions];for(const a of actions){if(a.kind!=='play'||a.freeSummon||a.freeSpell||a.alternative||a.g463Reduction!==undefined)continue;const c=faces(card(a.cardId))[a.face||0],max=firstSummonMax463(s,p,c);for(let n=0;n<max;n++){const payment={...c,summonOrigin:a.origin||'hand',g463Reduction:n,...Object.fromEntries(['g7Payment','snowReducers','magicReducers','g18Reducers','g26Reducers','g42Reduction','g456Reduction'].filter(k=>a[k]!==undefined).map(k=>[k,a[k]]))};if(api.canPay(s,p,payment))out.push({...a,g463Reduction:n,requiresMethod:true,cost:api.summonCost(s,p,payment),label:c.name+'を最初の召喚の軽減'+n+'で使う'});}}return out;},
 useDiscount468(s,p,c){
  if(c.crossing)return 0;
  const printedCost=cost({...c,cost:c.printedCost??c.cost});
  let discount=0;
  for(const source of creatures(s,p)){
   if(source.sealed)continue;
   const rule=effective(source,s).g468UseReduction;
   if(!rule||rule.min!==undefined&&printedCost<rule.min)continue;
   if(rule.g896LaterSameKind&&!(c.type==='creature'?s.g463Summons?.[p]?.turn===s.turn&&s.g463Summons[p].n>0:c.type==='spell'&&(s.players[p].spellsThisTurn||0)>0))continue;
   if(rule.race&&!race(c,rule.race))continue;
   if(rule.colorsAny&&!rule.colorsAny.some(color=>colors(c).includes(color)))continue;
   discount+=rule.amount;
  }
  return discount;
 },
 untapDiscount472:(s,p,c)=>c.type==='creature'&&!c.crossing&&s.g472Untapped?.turn===s.turn?(c.g472UntapReduction||0)*s.g472Untapped.groups.length:0,
 discarded472(s,p){for(const x of creatures(s,1-p)){const defs=!x.sealed&&effective(x,s).g472OpponentDiscard;if(defs)queue(s,1-p,x,defs);}},
 firstSummonDiscount463,onceDiscount464,spellDiscount467:(s,p,c)=>c.type==='spell'?creatures(s,p).filter(x=>!x.sealed).reduce((n,x)=>n+(effective(x,s).g467SpellReduction||0),0)+spellReduction485(s,p,c):0,
 selectNullBreaker471(s,p,x){const c=effective(x,s);if(!c.g471NullBreaker||s.attack.g471Breaker||!s.players[1-p].shields.length||!c.gBreaker&&c.breaker!=='∞'&&!(c.breaker>0))return false;const n=c.extraBreak||0;choice(s,task('g34_NullBreaker471',p,x.cardId,{uid:x.uid}), 'この攻撃で使うブレイカーを選ぶ',[opt('ヌル・ブレイカー（'+n+'枚ブレイク）','null',0),opt('ほかのブレイカーを使う','normal',20)]);return true;},
 beginPayment560(s,p,c,args){if(args[1]||args[4]?.fixedPayment||args[4]?.g560Handled||!summonAuras560(s,p,c).optional||creatures(s,1-p).some(x=>effective(x,s).noCostReduction))return false;const payment={...c,...(args[4]===null?{}:typeof args[4]==='object'?args[4]:{cost:args[4]}),printedCost:c.cost};put(s,task('g34_PayAura560',p,c.id,{c:payment,args}));return true;},
 beginPayment500(s,p,c,args){if(args[1]||args[4]?.fixedPayment||args[4]?.g500Handled||!floorOptions500(s,p,c)[0]||creatures(s,1-p).some(x=>effective(x,s).noCostReduction))return false;const payment={...c,...(args[4]===null?{}:typeof args[4]==='object'?args[4]:{cost:args[4]}),printedCost:c.cost};put(s,task('g34_PayFloor500',p,c.id,{c:payment,args}));return true;},
 floorCost500(s,p,c,base){if(c.type!=='creature'||c.crossing)return base;const amounts=floorOptions500(s,p,c),aura=c.g500Amount===undefined?amounts[0]:amounts.includes(c.g500Amount)?c.g500Amount:0,n=aura+(c.g212CountDiscount?.minimum===2?countDiscountMax499(s,p,c):0)+(c.g211Sympathy?.minimum===2?sympathyAmount500(s,p,c):0);return n?Math.min(base,Math.max(2,base-n)):base;},
 beginPayment499(s,p,c,args){if(args[1]||args[4]?.fixedPayment||args[4]?.g499Handled||c.type!=='creature'||!c.g212CountDiscount?.optional||!countDiscountMax499(s,p,c)||creatures(s,1-p).some(x=>effective(x,s).noCostReduction))return false;const payment={...c,...(args[4]===null?{}:typeof args[4]==='object'?args[4]:{cost:args[4]}),printedCost:c.cost};put(s,task('g34_PayCount499',p,c.id,{c:payment,args}));return true;},
 beginPayment485(s,p,c,args){if(args[1]||args[4]?.fixedPayment||args[4]?.g485Handled||!spellReductionMax485(s,p,c)||creatures(s,1-p).some(x=>effective(x,s).noCostReduction))return false;const payment={...c,...(args[4]===null?{}:typeof args[4]==='object'?args[4]:{cost:args[4]}),printedCost:c.cost};put(s,task('g34_PaySpell485',p,c.id,{c:payment,args}));return true;},
 beginPayment470(s,p,c,args){if(args[1]||args[4]?.fixedPayment||args[4]?.g470Handled||!c.g470RevealReduction||!revealCards470(s,p,c).length)return false;put(s,task('g34_RevealPayment470',p,c.id,{c,args,revealed:null}));return true;},
 revealDiscount470(s,p,c){if(c.type!=='creature'||c.crossing||!c.g470RevealReduction)return 0;const rows=revealCards470(s,p,c);return c.g470Handled?rows.some(x=>x.uid===c.g470Revealed)?Math.max(0,Math.min(c.g470RevealReduction.amount,c.g470Amount||0)):0:rows.length?c.g470RevealReduction.amount:0;},
 revealCommitted470(s,p,c,payment){if(payment?.g470Revealed){const x=s.players[p].hand.find(x=>x.uid===payment.g470Revealed);if(x)api.log(s,p,'reveal',c.name+'の召喚のため手札を公開：'+card(x).name,{cardId:x.cardId,source:c.id});}},
 beginPayment464(s,p,c,args){if(args[1]||args[4]?.fixedPayment||c.g464Reducers!==undefined||!onceProviders464(s,p,c).length)return false;const payment={...c,...(args[4]===null?{}:typeof args[4]==='object'?args[4]:{cost:args[4]}),printedCost:c.cost};put(s,task('g34_PayOnce464',p,c.id,{c:payment,args,selected:[]}));return true;},
 conditionalDiscount261(s,p,c){return c.g261Discount&&ownCondition(s,p,c.g261Discount.filter)?c.g261Discount.amount:0;},
 sympathyDiscount211:(s,p,c)=>c.g211Sympathy?.minimum===2?0:sympathyAmount500(s,p,c),
 discount(s,p,c){return nextReduction456(s,p,c)+(c.g34Role==='shinGod'?s.players[p].battle.filter(x=>!x.sealed&&mecha(effective(x,s))).length:0)+(c.type==='creature'&&colors(c).includes('自然')&&Number(c.power)>=12000?(s.g34Discounts||[]).filter(x=>x.p===p&&x.turn===s.turn).reduce((n,x)=>n+x.amount,0):0);},
 allowsNonLightSpells687(s,c,pendingBreak){
  if(c.type!=='spell'||colors(c).includes('光'))return true;
  return !s.players.some((_,p)=>{
   const opponent=1-p,shields=s.players[opponent].shields;
   const count=pendingBreak?.defender===opponent?pendingBreak.remaining:
    typeof shields==='number'?shields:shields.length;
   return creatures(s,p).some(x=>!x.sealed&&count<=effective(x,s).g687OnlyLightSpells);
  });
 },
 allowedCast(s,p,c){
  if(c.type==='field'&&creatures(s,1-p).some(x=>!x.sealed&&effective(x,s).g685OpponentFieldLock))return false;
  if(c.type==='spell'&&(s.extLimits||[]).some(l=>l.kind==='g589SpellLock'&&l.player===p&&
   (!l.nextOnly||s.active===p&&s.players[p].turns>l.afterTurns)&&(!l.color||colors(c).includes(l.color))))return false;
  if(c.type==='spell'&&!colors(c).includes('光')&&(active(s,0,'alca').length||active(s,1,'alca').length))return false;if(c.type==='creature'||c.type==='spell'){if(active(s,1-p,'perfect').length&&s.g34Executions?.[p]?.turn===s.turn&&s.g34Executions[p].n>=3)return false;if(!colors(c).includes('光')&&(active(s,0,'alphadios').length||active(s,1,'alphadios').length))return false;}return c.type!=='spell'||!active(s,1-p,'hAlka').some(x=>x.hyperActive&&creatures(s,1-p).some(y=>y.tapped));},
 allowedEntry(s,p,c,options){if(c.type==='creature'&&(s.players[p].enteredThisTurn||0)>=2&&creatures(s,1-p).some(x=>!x.sealed&&effective(x,s).g320Next))return false;if(c.g298NoHandSummon&&options.execution&&options.origin==='hand')return false;if(c.type==='creature'&&s.active===1-p&&colors(c).length===1&&active(s,1-p,'superRoma').length)return false;return !options.execution||c.type!=='creature'||colors(c).includes('光')||!(active(s,0,'alphadios').length||active(s,1,'alphadios').length);},
 canLeave(s,p,x,context={}){
  const c=effective(x,s);
  if(c.g34Role==='engels'&&s.g34ShieldLeftTurn!==s.turn)return false;
  if(c.g34Role==='perfect'&&api.power(x,false,s)>0)return false;
  if(c.g619Stay&&ownCondition(s,p,c.g619Stay,x.uid,x.incarnation||0))return false;
  if((s.extLimits||[]).some(l=>l.kind==='g627Stay'&&api.allLayers(x).some(y=>y.uid===l.ref.uid&&(y.incarnation||0)===l.ref.incarnation)))return false;
  return context.skip577Stay||!c.g577Stay||!stay577(s,p,x,context.battlePower);
 },
 stay577,
 zeroSafe:(s,x)=>!!effective(x,s).g34AlwaysWinAtZero&&api.power(x,false,s)<=0,
 // Resolved continuous effects are independent of the recipient's ignored abilities (QA34228).
 attackEffect409:(s,x,kind)=>(s.extLimits||[]).some(l=>l.kind==='g409AttackEffect'&&l.effect===kind&&s.players[l.player].battle.includes(x)&&api.allLayers(x).some(y=>y.uid===l.ref.uid&&(y.incarnation||0)===l.ref.incarnation)),
 destroySafe409:(s,x)=>!!effective(x,s).g465DestroySafe||hooks.attackEffect409(s,x,'destroySafe'),
 extraBreak557:(s,p,x,c)=>s.players[p].battle.reduce((n,y)=>{
  const r=card(y).g557BreakAura;
  if(!r||y.sealed||r.other&&x.uid===y.uid||r.min!==undefined&&cost(c)<r.min||!api.isCreature(s,y)||api.ignored(s,y))return n;
  return n+((r.multi?colors(c).length>1:race(c,r.race))?r.amount:0);
 },c.g876BreakPerCount?countPower(s,x,c,false,{...c.g207CountPower,amount:1}):0),
 extraBreak412:(s,p,x)=>(s.extLimits||[]).filter(l=>l.kind==='g412ExtraBreak'&&l.player===p&&(l.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.source}))&&api.allLayers(x).some(y=>y.uid===l.ref.uid&&(y.incarnation||0)===l.ref.incarnation)).reduce((n,l)=>n+l.amount,0),
 winBattle(s,x){
  const c=effective(x,s);
  return !!c.g34AlwaysWin||!!c.g587AttackWins&&attacking587(s,x)||!!c.g587UntappedWins&&!x.tapped||
   hooks.attackEffect409(s,x,'win')||hooks.zeroSafe(s,x)||battleAuras466(s,x).some(r=>r.win);
 },
 battlePower446:(s,x)=>(s?.extLimits||[]).filter(l=>l.kind==='g446BattlePower'&&s.players[l.player].battle.includes(x)&&api.allLayers(x).some(y=>y.uid===l.ref.uid&&(y.incarnation||0)===l.ref.incarnation)).reduce((n,l)=>n+l.amount,0),
 battlePower209,
 battleSafe:battleSafe466,
 battleAuraPower466(s,x,c){
  const counted=s&&c.g860BattleCountPower?countPower(s,x,c,false,c.g860BattleCountPower):0;
  return battleAuras466(s,x).reduce((n,r)=>n+(r.power||0),counted);
 },
 // This replacement belongs to its source, so an ignored recipient is still protected.
 deathMana575(s,p,target){
  const moves={untapped:false,tapped:false,optional:false};
  for(const source of creatures(s,p)){
   if(source.sealed)continue;
   const rule=effective(source,s).g575ManaAura;
   if(!rule||rule.other&&source.uid===target.uid)continue;
   if(!(rule.self&&source.uid===target.uid)&&!matches(s,p,target,rule.filter))continue;
   if(api.manaMoveForbidden(s,p))return moves;
   moves[rule.optional?'optional':rule.tapped?'tapped':'untapped']=true;
  }
  return moves;
 },
 destroyToHand390(s,p,x){return !x.sealed&&creatures(s,p).some(y=>{const rule=!y.sealed&&effective(y,s).g390DestroyToHand;return rule&&matches(s,p,x,rule.filter);});},
 destroyToShield877(s,p,x){
  return creatures(s,p).some(source=>{
   if(source.uid===x.uid||source.sealed||!card(source).g877DestroyToShield)return false;
   const filter=effective(source,s).g877DestroyToShield;
   return filter&&matches(s,p,x,filter);
  });
 },
 optionalDestroyToHand720(s,p,x){
  return creatures(s,p).some(source=>{
   const filter=!source.sealed&&effective(source,s).g720OptionalDestroyToHand;
   return filter&&matches(s,p,x,filter);
  });
 },
 noLose(s,p){return(s.extLimits||[]).some(l=>l.kind==='g34NoLose'&&l.player===p)||active(s,p,'valhalla').some(()=>s.players[p].mana.filter(x=>api.manaColors(card(x),s,p).includes('光')).length>=9);},
 lossOptions(s,p){return s.players[p].mana.length>=8?active(s,p,'minogami').map(x=>opt(card(x).name+'：マナ8枚を山札の下に置く',{kind:'g34Mino',uid:x.uid},60,x.cardId)):[];},
 beginLoss(s,p,uid){const x=s.players[p].battle.find(x=>x.uid===uid);if(x)minoLoss(s,{op:'g34_Custom',name:'minoLoss',p,source:x.cardId,uid,selected:[]});},
 muku(s,p,x){return ninja(effective(x,s))?active(s,p,'mukujimmed').filter(y=>!used(s,'g34Muku',y)).map(y=>({uid:y.uid,key:key(y),cardId:y.cardId})):[];},
 useMuku(s,p,k){(s.g34Muku??={})[k]=s.turn;},
 shieldTrigger(s,p,x,c){if(race(c,'ドラゴン')&&s.players[p].battle.some(y=>!y.sealed&&card(y).g794DragonShieldTrigger&&cost(c)<=effective(y,s).g794DragonShieldTrigger))return true;if(c.type==='creature'&&mecha(c)&&cost(c)<=8&&active(s,p,'kuusoku').length)return true;const root=s.players[p].shields.find(r=>api.shieldCards(r).some(y=>y.uid===x.uid)),group=root&&api.shieldGroup(root);
  if(root&&c.g876ShieldTriggerCondition&&ownCondition(s,p,c.g876ShieldTriggerCondition))return true;
  if(root&&c.type==='creature'&&c.g433SeedTrigger&&s.players[p].battle.some(y=>!y.sealed&&matches(s,p,y,{g295Tamaseed:true})))return true;return active(s,p,'fourJustice').length>0&&s.players[p].battle.some(y=>api.layers(y).some(z=>(z.exLifeShieldUids||[z.exLifeShieldUid]).includes(group)));},
 // Mana entry is independent of casting or battlefield entry (QA39403/39404).
 manaAdded449(s,p,cards){
  if(s.active===p)(s.g837ManaAddedTurn??=[null,null])[p]=s.turn;
  const sources=creatures(s,p).flatMap(x=>{
   if(x.sealed)return [];
   const {g454Space:rules,g763MultiManaUntap:untap,g807ManaEntry:defs,g857ManaEntryRace:entryRace}=effective(x,s);
   return rules||untap||defs?[{x,rules:rules||[],untap,defs,entryRace}]:[];
  });
  for(const x of cards){
   if(!x.faceDown&&api.zoneCard(s,p,x).g449ManaReveal)send(s,p,x,'ManaReveal449',{serial:x.zoneSerial||0});
   const manaCard=x.faceDown?{civilizations:[],civ:'ゼロ',manaValue:1}:api.zoneCard(s,p,x,'mana');
   const actual=api.manaColors(manaCard,s,p);
   for(const source of sources){
    if(source.defs&&(!source.entryRace||faces(manaCard).some(c=>race(c,source.entryRace))))queue(s,p,source.x,source.defs);
    const rules=source.rules.filter(r=>r.color==='多色'?actual.length>1:actual.includes(r.color));
    if(rules.length)send(s,p,source.x,'SpaceCharge454',{rules:structuredClone(rules)});
    if(source.untap&&actual.length>1)api.enqueue(s,p,{uid:source.x.uid,incarnation:source.x.incarnation||0,
     source:source.x.cardId,effect:'extended',task:task('g159R_ManaUntap',p,source.x.cardId,{target:x.uid,serial:x.zoneSerial||0})});
   }
  }
 },
 played(s,p,c,x,origin,permit){if(c.type==='creature'){
  useBlockers524(s,p);
  for(const source of s.players[p].battle){
   const watch=card(source).g808SummonWatch&&!source.sealed&&api.isCreature(s,source)&&effective(source,s).g808SummonWatch;
   if(!watch||!useColorsMatch(watch,c))continue;
   // The summon is observed before entry and before incrementing the shared turn counter.
   if(watch.g895FirstSummon&&s.g463Summons?.[p]?.turn===s.turn&&s.g463Summons[p].n>0)continue;
   // A NEO summon counts only when it was declared with an evolution base.
   if(watch.g816Evolution&&!api.isEvolution(x)&&!((c.neoEvolution||c.g48HandEvolution)&&c.g27BaseUid))continue;
   queue(s,p,source,watch.defs);
  }
  if(colors(c).length>1)for(const y of s.players[p].grave)
   if(!y.faceDown&&card(y).g922GraveMultiSummon)send(s,p,y,'GraveReturn754',{serial:y.zoneSerial||0});
 }for(const y of selectedOnce464(s,p,c))y.g464UsedTurn=s.turn;recordSummon463(s,p,c);if(c.type==='creature')consumeReduction456(s,p,c);if(c.type==='creature'&&['mana','grave'].includes(origin)&&typeof permit==='string'&&permit.startsWith('g450:'))((s.g450ZoneUses??=[{},{}])[p]??={})[permit]=s.turn;if(c.type!=='spell')noncreatureUse448(s,p,c);if(c.type==='creature'){countExecution(s,p,c);if(colors(c).includes('自然')&&Number(c.power)>=12000)s.g34Discounts=(s.g34Discounts||[]).filter(y=>y.p!==p||y.turn!==s.turn);}},
 spellCast(s,p,c){
  useBlockers524(s,p);consumeReduction456(s,p,c);noncreatureUse448(s,p,c);countExecution(s,p,c);
  for(const {owner,x,watch}of spellWatches(s,p,c))queue(s,owner,x,watch.defs.map(d=>d.op==='CastCostDeploy595'?{...d,castCost:c.cost}:d));
  for(const x of s.players[p].grave)if(!x.faceDown&&card(x).g847SpellGraveReturn)
   send(s,p,x,'GraveReturn754',{serial:x.zoneSerial||0});
 },
 shieldAdded918(s,p,count=1){
  if(s.g20LeavingUids&&s.leaving){
   const counts=shieldAdds918.get(s.leaving)||[0,0];
   counts[p]+=count;
   shieldAdds918.set(s.leaving,counts);
  }else triggerShieldAdded918(s,p,count);
 },
 flushShieldAdded918(s,batch){
  const counts=shieldAdds918.get(batch);
  if(!counts)return;
  shieldAdds918.delete(batch);
  for(const p of [s.active,1-s.active])triggerShieldAdded918(s,p,counts[p]);
 },
 opponentShieldTrigger699(s,p){
  for(const watcher of creatures(s,1-p)){
   const defs=!watcher.sealed&&effective(watcher,s).g699OpponentShieldTrigger;
   if(defs)queue(s,1-p,watcher,defs);
  }
 },
 observedEntry(s,p,y,options){
  // Graveyard abilities observe the entrant's current power, before any later attachment or entry ability.
  const gravePowerWatchers=s.players[p].grave.filter(x=>!x.faceDown&&card(x).g901GraveEntryPower!==undefined);
  if(gravePowerWatchers.length&&!y.sealed&&api.isCreature(s,y)){
   const enteredPower=api.power(y,false,s);
   for(const x of gravePowerWatchers)if(enteredPower>=card(x).g901GraveEntryPower)
    send(s,p,x,'SelfGraveHand476',{serial:x.zoneSerial||0});
  }
  if(!y.sealed&&!y.faceDown&&hasSoul(card(y),'W')&&api.isCreature(s,y)){
   for(const watcher of s.players[p].battle){
    const defs=card(watcher).g865WSoulEntry;
    if(defs&&watcher.uid!==y.uid&&!watcher.sealed&&!watcher.faceDown&&!api.ignored(s,watcher)&&api.isCreature(s,watcher))queue(s,p,watcher,defs);
   }
  }
  if(!y.sealed&&hasSoul(card(y),'H')&&api.isCreature(s,y))
   (s.g857LightSoulEnteredTurn??=[null,null])[p]=s.turn;
  if(!y.sealed)for(const watcher of creatures(s,1-p)){
   if(watcher.sealed||api.ignored(s,watcher))continue;
   const {g767SecondEnemy,g767UnpaidRaid,g768UnpaidRamp}=effective(watcher,s);
   if(g767SecondEnemy&&api.isCreature(s,y)&&s.players[p].enteredThisTurn>=2)
    send(s,1-p,watcher,'Batsuda767',{entrants:[y,...(y.godLinks||[])].map(x=>({uid:x.uid,incarnation:x.incarnation||0}))});
   if(options.costPaid||options.paidMana)continue;
   if(g767UnpaidRaid&&!used(s,'g767UnpaidRaidUsed',watcher))send(s,1-p,watcher,'Zentuu767');
   if(g768UnpaidRamp)queue(s,1-p,watcher,[{op:'Offer',title:'山札の上から1枚をマナゾーンに置く？',defs:[{op:'Ramp',n:1}]}]);
  }
 },
 entry(s,p,y,options){const c=card(y),creature=api.isCreature(s,y);
  if(options.g785Group!==undefined){
   const delay=s.g537Delays?.[options.g785Group];
   if(delay?.turn===s.turn&&delay.defs[0]?.op==='ReturnGroup785')delay.defs[0].refs.push({uid:y.uid,incarnation:y.incarnation||0});
  }
  if(c.g773RevEntry&&options.revolution&&creature&&!y.sealed&&!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,y))
   queue(s,p,y,c.g773RevEntry);
  if(creature&&!y.sealed&&options.execution===true){
   const enteredCost=cost(effective(y,s));
   if(race(effective(y,s),'ゴースト'))for(const watcher of creatures(s,p)){
    if(watcher.sealed||!card(watcher).g878GhostRecovery||!effective(watcher,s).g878GhostRecovery||
       watcher.uid===y.uid&&(options.selfMuted||api.selfStopped(s,p)))continue;
    send(s,p,watcher,'GhostRecovery878',{g831Subject:{uid:y.uid,incarnation:y.incarnation||0,
     cost:enteredCost===Infinity?'∞':enteredCost}});
   }
   for(const x of s.players[p].grave){
    const min=card(x).g766GraveSummonMin;
    if(min!==undefined&&!x.faceDown&&enteredCost>=min)
     send(s,p,x,'GraveSummonWatch766',{serial:x.zoneSerial||0});
   }
  }
  for(const {x,defs}of seedWatches548(s,p,y,options))queue(s,p,x,defs);
  if(creature&&!y.sealed&&s.players[p].enteredThisTurn===2){
   for(const watcher of creatures(s,p)){
    if(watcher.sealed||api.ignored(s,watcher)||watcher.uid===y.uid&&(options.selfMuted||api.selfStopped(s,p)))continue;
    const defs=effective(watcher,s).g742SecondEntry;
    if(defs)queue(s,p,watcher,defs);
   }
  }
  if(options.g745Magibomber&&creature&&!y.sealed){
   const fighter={uid:y.uid,incarnation:y.incarnation||0};
   for(const watcher of creatures(s,p)){
    if(watcher.sealed||api.ignored(s,watcher)||watcher.uid===y.uid&&(options.selfMuted||api.selfStopped(s,p)))continue;
    if(effective(watcher,s).g745MagibomberFight)
     send(s,p,watcher,'FightEnemy240',{fighter,optional:true,g745FollowFighter:true});
   }
  }
  if(c.g414ShieldPlus&&creature&&!y.sealed&&!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,y))queue(s,p,y,[{op:'ShieldPlus414'}]);
  if(creature&&!y.sealed&&!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,y))for(const {source,grants:g}of effective(y,s).g406Inherited||[])if(g.g34Tasks)queue(s,p,y,g.g34Tasks,source);
  if(creature&&!y.sealed)for(const watcher of creatures(s,1-p)){
   if(watcher.sealed)continue;
   const c=effective(watcher,s);
   if(c.g593EntryStop)send(s,1-p,watcher,'EntryStop593',{subject:{uid:y.uid,incarnation:y.incarnation||0}});
   if(c.g743OpponentEntryTap&&!api.ignored(s,watcher)){
    const refs=[y,...(y.godLinks||[])].map(x=>({uid:x.uid,incarnation:x.incarnation||0}));
    queue(s,1-p,watcher,[{op:'IfOwn',filter:{g265ShieldsMax:2},
     defs:[{op:'ExactMove',owner:p,g403Refs:refs,followEvolution:true,filter:{creature:true},tap:true}]}]);
   }
  }
  if(creature&&!y.sealed&&s.active===p&&!options.costPaid&&!options.paidMana){
   const refs=[y,...(y.godLinks||[])].map(x=>({uid:x.uid,incarnation:x.incarnation||0}));
   for(const watcher of creatures(s,1-p))if(!watcher.sealed&&effective(watcher,s).g598UnpaidBottom)
    queue(s,1-p,watcher,[{op:'ExactMove',to:'deck',owner:p,g403Refs:refs}]);
  }
  // Retain all linked parts so removing one God does not lose the watched unit (QA43748).
  if(creature)for(const watcher of creatures(s,1-p)){
   if(watcher.sealed)continue;
   const {g403Bloom,g600OverManaEntry,g601UnpaidDestroy,g601OffHandMana,g621NonSummon,g624EntryResponse}=effective(watcher,s);
   const bloomDestroys=options.execution===false&&g403Bloom&&(s.active===p||g403Bloom==='eitherTurn');
   const unpaidDestroys=g601UnpaidDestroy&&!options.costPaid&&!options.paidMana;
   const offHand=g601OffHandMana&&options.origin!==undefined&&options.origin!=='hand';
   const nonSummon=options.execution===false?g621NonSummon:null;
   const shieldWithoutMana=g624EntryResponse==='untappedManaShield'&&!options.paidMana&&!y.sealed;
   if(g624EntryResponse==='multicolorFight'&&!y.sealed&&colors(effective(y,s)).length>1)
    queue(s,1-p,watcher,[{op:'EntryFight624',enemy:{uid:y.uid,incarnation:y.incarnation||0}}]);
   if(!bloomDestroys&&!unpaidDestroys&&!offHand&&!g600OverManaEntry&&!nonSummon&&!shieldWithoutMana)continue;
   const exact={op:'ExactMove',owner:p,g403Refs:[y,...(y.godLinks||[])].map(x=>({uid:x.uid,incarnation:x.incarnation||0}))};
   if(bloomDestroys||unpaidDestroys)queue(s,1-p,watcher,[{...exact,to:'grave',target:y.uid,targetIncarnation:y.incarnation||0}]);
   if(offHand)queue(s,1-p,watcher,[{...exact,to:'mana'}]);
   if(shieldWithoutMana)queue(s,1-p,watcher,[{...exact,to:'shields',optional:true,followEvolution:true}]);
   if(nonSummon==='bottom')queue(s,1-p,watcher,[{...exact,to:'deck'}]);
   if(nonSummon==='bounce')queue(s,1-p,watcher,[{...exact,to:'hand',optional:true,followEvolution:'evolutionOnly',filter:{creature:true}}]);
   if(nonSummon==='skip')queue(s,1-p,watcher,[{
    op:'Offer',title:'今のターンの残りを飛ばしますか？',score:s.active===p?50:-10,
    defs:[{op:'Custom',name:'endTurn'}]
   }]);
   // Compare with current mana on resolution, even if the cost was in range when it entered (QA46815).
   if(g600OverManaEntry)queue(s,1-p,watcher,[{...exact,to:'hand',optional:true,filter:{creature:true,g600OverMana:true}}]);
  }
  if(creature&&!y.sealed&&!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,y))for(const rule of[c.g260Self,...(c.g268ManaGrants||[])].filter(Boolean))if((rule.filter?.g466DistinctCosts||rule.filter?.g400Wave||rule.filter?.g334ZoneCount?.atLeastOpponent||rule.filter?.g272ManaCount!==undefined)&&rule.grants.g34Tasks&&ownCondition(s,p,rule.filter,y.uid))queue(s,p,y,rule.grants.g34Tasks);if(creature&&!y.sealed&&!options.costPaid)for(const watcher of creatures(s,1-p))if(!watcher.sealed&&effective(watcher,s).g321Katsu)queue(s,1-p,watcher,[{op:'KatsuFight321',enemy:{uid:y.uid,incarnation:y.incarnation||0}}]);if(c.g320Next&&options.ddd&&!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,y))queue(s,p,y,[{op:'Next320'}]);
  if(!y.sealed)for(const owner of [0,1])for(const x of creatures(s,owner)){
   if(!creature&&!card(x).g314OtherEntry?.g765Element)continue;
   const watch=effective(x,s).g314OtherEntry;
   if(!watch||!creature&&!watch.g765Element||x.sealed||x.uid===y.uid||watch.who!=='both'&&owner!==(watch.who==='opponent'?1-p:p))continue;
   if(watch.entryCount!==undefined&&s.players[p].enteredThisTurn!==watch.entryCount)continue;
   if(watch.minEntryCount!==undefined&&(s.players[p].enteredThisTurn||0)<watch.minEntryCount)continue;
   if(watch.ownTurn&&owner!==s.active||used792(s,x,watch.defs?.[0])||watch.filter&&!matches(s,p,y,watch.filter))continue;
   if(watch.g778OverMana&&cost(effective(y,s))<=s.players[owner].mana.length)continue;
   if(watch.g910HigherPower&&currentPower506(s,y)<=currentPower506(s,x))continue;
   if(watch.g755EntrantPower)send(s,owner,x,'EntryBoost755',{
    subject:{uid:y.uid,incarnation:y.incarnation||0},power:watch.g755EntrantPower
   });
   else if(watch.g762EntrantMach)send(s,owner,x,'EntryMach762',{subject:{uid:y.uid,incarnation:y.incarnation||0}});
   else if(watch.g831DeathRecovery){
    const value=cost(effective(y,s));
    send(s,owner,x,'DeathRecovery831',{g831Subject:{uid:y.uid,incarnation:y.incarnation||0,cost:value===Infinity?'∞':value}});
   }
   else if(watch.g765CopyPower)send(s,owner,x,'CopyPower765',{g765Subject:{uid:y.uid,incarnation:y.incarnation||0}});
   else queue(s,owner,x,watch.defs);
  }
  if(creature&&!y.sealed)for(const x of creatures(s,p)){const watch=effective(x,s).g468EntryWatch;if(!x.sealed&&watch&&(!watch.g565Other||x.uid!==y.uid)&&(!(x.uid===y.uid)||!options.selfMuted&&!api.selfStopped(s,p))&&matches(s,p,y,watch.filter))send(s,p,x,'Entry468',{mode:watch.mode,subject:{uid:y.uid,incarnation:y.incarnation||0}});}if(!y.sealed)for(const x of creatures(s,p)){const watch=effective(x,s).g251EntryDraw,self=x.uid===y.uid;if(!x.sealed&&watch&&(!watch.g895SummonedHand||options.execution===true&&options.origin==='hand')&&(!self||!options.selfMuted&&!api.selfStopped(s,p))&&(self&&watch.selfAlways||matches(s,p,y,watch.filter)))queue(s,p,x,watch.defs);}if(!y.sealed)for(const x of creatures(s,p)){const watch=effective(x,s).g250EntryDraw,self=x.uid===y.uid;if(!x.sealed&&watch&&(self?watch.self&&!options.selfMuted&&!api.selfStopped(s,p):matches(s,p,y,watch.filter)))queue(s,p,x,watch.defs);}if(s.active===p&&!y.sealed)for(const x of creatures(s,p)){const watch=effective(x,s).g249OtherEntry;if(!x.sealed&&x.uid!==y.uid&&watch&&matches(s,p,y,watch.filter))queue(s,p,x,watch.defs);}if(creature){const stopped=options.selfMuted||api.selfStopped(s,p);for(const x of active(s,p,'cabbage'))if(!(stopped&&x.uid===y.uid))queue(s,p,x,[select('mana',null,1,{creature:true,color:'自然',minPower:12000,exactCost:cost(c)-1},{deploy:true,optional:true})]);if(ninja(effective(y,s)))for(const x of active(s,p,'mukujimmed'))if(!(stopped&&x.uid===y.uid))queue(s,p,x,[E('Draw',{n:1,optional:true})]);if(angel(effective(y,s)))for(const x of active(s,p,'everries'))if(!(stopped&&x.uid===y.uid))queue(s,p,x,[E('Draw',{n:1,optional:true})]);for(const x of active(s,1-p,'nameko'))if(!options.paidMana)queue(s,1-p,x,[C('nameko',{target:y.uid,targetIncarnation:y.incarnation||0})]);if(options.execution===false)for(const x of active(s,1-p,'oogumo'))queue(s,1-p,x,[E('ExactMove',{to:'grave',target:y.uid,targetIncarnation:y.incarnation||0})]);}if(options.origin!=='hand')for(const x of s.players[1-p].battle.filter(x=>!api.ignored(s,x)))for(const layer of api.layers(x))if(card(layer).g34SoulDock)queue(s,1-p,x,[E('ExactMove',{to:'grave',target:y.uid,targetIncarnation:y.incarnation||0})]);},
 attack(s,p,x){if(s.g481Attackers?.turn!==s.turn)s.g481Attackers={turn:s.turn,events:[]};const refs=api.allLayers(x).map(key),first=!s.g481Attackers.events.some(e=>e.refs.some(r=>refs.includes(r)));s.g481Attackers.events.push({p,refs,...(s.attack?.target==='player'?{playerTarget:true}:{})});if(s.attackLifecycle){s.attackLifecycle.g543First=first;s.attackLifecycle.g543Refs=refs;}if(first)for(const r of s.extLimits||[]){
  if(r.kind!=='g543Shinka')continue;
  if(r.when==='firstAttack'&&refs.includes(key(r)))api.enqueue(s,r.p,{source:r.source,effect:'extended',
   task:task('g34_ResolveDelay537',r.p,r.source,{uid:r.uid,incarnation:r.incarnation,defs:[{op:'AfterAttack542',defs:[{op:'Untap',g191First:true}]}]})});
  if(r.when==='firstAttackUntap'&&r.refs.some(ref=>refs.includes(ref))&&
   !api.spellIgnored(s,{type:'spell',cost:r.spellCost,spellSource:r.source}))
   api.enqueue(s,r.p,{source:r.source,effect:'extended',
    task:task('g34_ResolveDelay537',r.p,r.source,{spellCost:r.spellCost,defs:[{op:'Untap',g904Refs:refs}]})});
 }const defender=s.attack?.target!=='player'&&s.players[1-p].battle.find(y=>y.uid===s.attack?.target);if(defender){
  const defs=effective(defender,s).g447Attacked;
  if(defs)queue(s,1-p,defender,defs);
  const ref={uid:defender.uid,incarnation:defender.incarnation||0};
  for(const watcher of creatures(s,1-p)){
   const abilities=effective(watcher,s).g694DefenderWatch;
   if(abilities&&!watcher.sealed)send(s,1-p,watcher,'Sequence',{defs:abilities,g694Defender:ref});
  }
 }const c=effective(x,s),own=s.players[p];
 if(c.g781ReleaseAll&&!api.selfStopped(s,p))queue(s,p,x,[E('ReleaseAllHyper781')]);
 if(first&&c.g540FirstAttack&&!api.selfStopped(s,p))queue(s,p,x,c.g540FirstAttack);if(c.g320Jave&&!api.selfStopped(s,p))queue(s,p,x,[{op:'Smash320',serial:x.zoneSerial||0}]);if(c.g34Attack&&!api.selfStopped(s,p)){const defs=c.g34Attack.filter(d=>!d.g764PlayerAttack||s.attack?.target==='player');if(defs.length)queue(s,p,x,defs);}if(c.g756TurboRush==='discard'&&!api.selfStopped(s,p)&&turboReady756(s,p,x))queue(s,p,x,[{op:'Discard',g756All:true}]);if(defender&&c.g691AttackCreature&&!api.selfStopped(s,p)&&(c.g714AttackMinPower===undefined||currentPower506(s,defender)>=c.g714AttackMinPower)&&(!c.g801DefenderFilter||matches(s,1-p,defender,c.g801DefenderFilter)))queue(s,p,x,c.g691AttackCreature);if(!api.selfStopped(s,p))for(const {source,grants:g}of c.g404Inherited||[])if(g.g34Attack)queue(s,p,x,g.g34Attack,source);if(!api.selfStopped(s,p))for(const {source,grants:g}of c.g406Inherited||[])if(g.g34Attack)queue(s,p,x,g.g34Attack,source);if(c.g34Role==='emrakul')queue(s,p,x,[C('emrakulSix')]);if(c.g34Role==='minogami')queue(s,p,x,[E('Offer',{defs:[E('Look',{n:3,public:true,stages:[{to:'mana',n:'all',filter:{twin:true}}],after:[C('minogamiBuff')]})]})]);if(card(x).neoEvolution)for(const y of active(s,p,'grasper'))queue(s,p,y,[select('mana',null,1,{creature:true,belowPower:api.power(x,false,s)},{deploy:true,optional:true})]);if(!api.ignored(s,x))for(const layer of api.layers(x))if(card(layer).g34SoulDiscard)queue(s,p,x,[E('Discard',{n:1,random:true})]);if(ninja(c))for(const y of active(s,p,'happou')){if(s.attack?.target==='player')queue(s,p,y,[E('Discard',{n:1,random:true})]);else(x.g34Grants??=[]).push({turn:s.turn,slayer:true,g34BattleSafe:true});}if(api.isEvolution(x)&&cost(c)>=2)for(const y of own.hand.filter(y=>card(y).g34Role==='baromreizu'))queue(s,p,y,[C('reizuCast')]);},
 attackStart(s,p,x){
  if(s.attack?.target==='player'&&(s.extLimits||[]).some(r=>r.kind==='g712BlockBreak'&&r.player===p&&r.turn===s.turn))s.attack.g712PlayerTarget=true;
  attackWatches252(s,p,x);for(const y of s.players[p].hand)for(const[c,face]of faces(card(y)).map((c,i)=>[c,i])){const w=c.g417Chance;if(w&&!api.spellIgnored(s,c)&&(!w.hyper||hyperMode418(s,x))&&chanceMatches419(s,p,x,w))send(s,p,y,'Chance417',{serial:y.zoneSerial||0,face});}for(const y of active(s,1-p,'souzan'))queue(s,1-p,y,[C('souzanStop')]);{for(const y of s.players[1-p].shields.flatMap(api.shieldCards).filter(y=>y.faceUp&&card(y).g34Role==='mantraCastle'))queue(s,1-p,y,[C('mantraDefend')]);if(s.attack?.target==='player'&&s.players.some(p=>!p.shields.length)&&!s.players[1-p].battle.some(y=>!y.sealed&&card(y).g34Role==='nightmare'))for(const y of s.players[1-p].hand.filter(y=>card(y).g34Role==='nightmare'))queue(s,1-p,y,[C('nightmare')]);}},
 handBattleWins588(s,p,w){
  const own=s.players[p],winner=own.battle.find(x=>x.uid===w.uid);
  if(!winner)return[];
  return own.hand.flatMap(y=>{const filter=card(y).g588HandWin;return filter&&chanceMatches419(s,p,winner,filter)?[{uid:y.uid,cardId:y.cardId,serial:y.zoneSerial||0}]:[];});
 },
 battleBreaks828(s,p,unit,c,ownPower,otherPower){
  if(!(ownPower>otherPower&&ownPower-otherPower>=4000))return [];
  const sources=(s.extLimits||[]).filter(l=>l.kind==='g828BattleBreak'&&l.player===p&&l.turn===s.turn&&
   !api.spellIgnored(s,{type:'spell',spellSource:l.source,cost:cost(card(l.source))})).map(l=>l.source);
  if(c.g828BattleBreak)sources.push(unit.cardId);
  return sources.map(source=>({player:p,uid:unit.uid,source,effect:'extended',
   task:task('g34_Break497',p,source,{uid:unit.uid,incarnation:unit.incarnation||0,n:1,g747CreatureBreak:true,g828BattleBreaker:unit.cardId})}));
 },
 battleWins(s,p,w){const x=s.players[p].battle.find(x=>x.uid===w?.uid),c=x&&effective(x,s),defs=c&&(!c.g588FirstSelfWin||w.g588FirstForUnit)&&c.g189BattleWin?.filter(d=>!d.g752FirstOnly||w.g588FirstForUnit);return [...(defs?.length?[{player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Sequence',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,defs})}]:[]),...winWatches252(s,p,w)];},
 mugenTapped415(s,p,x){const c=effective(x,s);if(!x.sealed&&c.g415MugenTapped)queue(s,p,x,c.g415MugenTapped);},
 tapped(s,p,x){
  if(!x.sealed&&api.isCreature(s,x))for(const y of s.players[p].battle){
   const watcher=card(y);
   if((watcher.g771Wing||watcher.g904AllyTap)&&!y.sealed&&!api.ignored(s,y)&&api.isCreature(s,y)){
    if(watcher.g771Wing)queue(s,p,y,[E('Draw',{n:1,optional:true})]);
    if(watcher.g904AllyTap&&s.players[p].battle.includes(x))send(s,p,y,'ExactMove',{owner:p,to:'grave',optional:true,followEvolution:true,
     g403Refs:api.allLayers(x).map(z=>({uid:z.uid,incarnation:z.incarnation||0})),afterAttempt:[{op:'Draw',n:1}]});
   }
  }
  if(api.isCreature(s,x))for(const y of s.players[1-p].battle){
   const {g678OpponentTap,g681OpponentTapAnyTurn}=card(y);
   if(g678OpponentTap&&(s.active===1-p||g681OpponentTapAnyTurn)&&!y.sealed&&!api.ignored(s,y)&&api.isCreature(s,y))queue(s,1-p,y,g678OpponentTap);
  }
  if(s.extLimits?.some(r=>r.kind==='g885FirstTap')){
   const refs=api.allLayers(x).map(key);
   s.extLimits=s.extLimits.filter(r=>{
    if(r.kind!=='g885FirstTap'||!refs.includes(key(r.ref)))return true;
    api.enqueue(s,r.player,{...r.ref,source:r.source,effect:'extended',
     task:task('g34_Untap',r.player,r.source,{...r.ref,g191First:true})});
    return false;
   });
  }
  const c=effective(x,s),first=!used(s,'g191Tapped',x);mark(s,'g191Tapped',x);if(first&&c.g219FirstTap)queue(s,p,x,c.g219FirstTap);if(first&&c.g191FirstTapUntap)queue(s,p,x,[E('Untap',{g191First:true})]);if(c.g188Tapped)queue(s,p,x,c.g188Tapped);if(c.g34Role==='fourJustice')queue(s,p,x,[C('justiceBreak')]);if(ninja(effective(x,s)))for(const y of active(s,p,'mukade'))if(!used(s,'g34FirstTap',y)){mark(s,'g34FirstTap',y);queue(s,p,y,[E('Draw',{n:1,optional:true})]);}},
 // Capture the creature before shield replacement windows can move it.
 breakerRefs756(s,context){
  if(!context.sourceUid)return null;
  const x=s.players[context.player]?.battle.find(y=>y.uid===context.sourceUid&&
   (context.incarnation===undefined||(y.incarnation||0)===context.incarnation));
  return x&&!x.sealed&&api.isCreature(s,x)?api.allLayers(x).map(key):null;
 },
 recordBreak756(s,context,count){
  const refs=context?.g756Breaker;
  if(!count||!refs)return;
  if(s.g756Breaks?.turn!==s.turn)s.g756Breaks={turn:s.turn,players:[[],[]]};
  const breaks=s.g756Breaks.players[context.player];
  if(!breaks.some(prior=>prior.length===refs.length&&prior.every((r,i)=>r===refs[i])))breaks.push(refs);
 },
 allyBreakDraw779(s,context,count){
  if(!count||!context)return;
  const liveBreaker=context.g756Breaker?.length;
  if(liveBreaker)for(const x of creatures(s,context.player))if(!x.sealed&&effective(x,s).g779AllyBreakDraw)
   queue(s,context.player,x,[E('Offer',{title:'カードを1枚引く？',defs:[E('Draw',{n:1})]})]);
  // A creature can still perform an already-triggered break after leaving (QA35971).
  if(!liveBreaker&&!context.g913DepartedBreaker)return;
  // A simultaneous break is one event; each resolved copy grants its own optional draw (QA35082).
  for(const l of s.extLimits||[])if(l.kind==='g913BreakDraw'&&l.player===context.player&&
   !api.spellIgnored(s,{type:'spell',spellSource:l.source,cost:cost(card(l.source))}))
   queue(s,l.player,{cardId:l.source},[E('Offer',{title:'カードを2枚引く？',defs:[E('Draw',{n:2})]})]);
 },
 // Remember the physical incarnation at the break, then follow later evolution at turn end.
 broken484(s,context,n){
  if(!n||!context||context.reverse||context.burn)return;
  const p=context.player,x=s.players[p]?.battle.find(x=>x.uid===context.sourceUid&&(context.incarnation===undefined||(x.incarnation||0)===context.incarnation));
  if(!x||x.sealed)return;
  const c=effective(x,s);
  if(c.g484BreakEndReturn)queue(s,p,x,[E('BreakDelay484')]);
  if(c.g915AfterSelfBreak&&context.g756Breaker?.length&&!s.endStep)queue(s,p,x,c.g915AfterSelfBreak);
 },
 unblocked482(s,p,x){
  if(x.sealed)return false;
  const playerAttack=s.attack.target==='player';
  const attacker=effective(x,s),defs=playerAttack&&!api.selfStopped(s,p)&&attacker.g482Unblocked;
  if(defs)queue(s,p,x,defs);
  let triggered=!!defs;
  if(!s.attack.g484Blocked)for(const source of creatures(s,p)){
   if(source.sealed)continue;
   const {g701UnblockedMana,g852UnblockedDiscard}=effective(source,s);
   if(playerAttack&&g701UnblockedMana?.some(name=>race(attacker,name))){
    queue(s,p,source,[{op:'OpponentManaLoss478'}]);
    triggered=true;
   }
   if(g852UnblockedDiscard?.some(name=>race(attacker,name))){
    queue(s,p,source,[{op:'Discard',n:1}]);
    triggered=true;
   }
  }
  if(!s.attack.g484Blocked)for(const source of creatures(s,1-p)){
   if(source.sealed)continue;
   const c=effective(source,s);
   const defs=playerAttack&&c.g726DefenderUnblocked?
    [...c.g726DefenderUnblocked,...(c.g870DefenderUnblocked||[])]:c.g870DefenderUnblocked;
   if(!defs?.length)continue;
   queue(s,1-p,source,defs.map(def=>def.g877Attacker?
    {...def,g403Refs:[{uid:x.uid,incarnation:x.incarnation||0}],followEvolution:true}:def));
   triggered=true;
  }
  return triggered;
 },
 untapped(s,p,x,turnStart=false){
  recordUntap472(s,p,x);
  const defs=effective(x,s).g299Untapped;
  if(!x.sealed&&defs)queue(s,p,x,defs);
  if(turnStart&&effective(x,s).g34Role==='kusabi')queue(s,p,x,[E('Ramp',{n:2,optional:true}),C('kusabi12')]);
  if(!x.sealed&&api.isCreature(s,x)&&s.players[p].battle.includes(x))
   for(const owner of [s.active,1-s.active])for(const other of s.players[owner].battle){
    if(other.uid!==x.uid&&card(other).g766OtherUntap&&!other.sealed&&api.isCreature(s,other)&&effective(other,s).g766OtherUntap)
     queue(s,owner,other,[{op:'Untap',g191First:true}]);
   }
 },
 shieldLeft(s,p,shield,group){s.g34ShieldLeftTurn=s.turn;if(s.leaving)(s.g536ShieldDepartures??=[]).push(p);else shieldDeparture536(s,p);if(group==null)return;for(const x of s.players[p].battle){if(!api.layers(x).some(z=>(z.exLifeShieldUids||[z.exLifeShieldUid]).includes(group))||api.ignored(s,x))continue;const role=card(x).g34Role;if(role==='doll')queue(s,p,x,[C('dollModes')]);if(role==='romaion')queue(s,p,x,[exec('hand',8,{spellOnly:true})]);if(role==='godtime')queue(s,p,x,[E('Offer',{defs:[C('endTurn')]})]);}},
 // A departing watcher can only observe its own departure (603.5d).
 flushElementLeaves617(s,watchers=[]){
  for(const y of watchers){
   const live=s.players[y.p].battle.find(x=>key(x)===key(y));
   if(!live)continue;
   if(y.g771Wing){
    if(!live.sealed&&!api.ignored(s,live)&&api.isCreature(s,live))queue(s,y.p,live,[
     E('Offer',{title:'翼速 ザ・ウイングをアンタップする？',defs:[E('Untap',{g191First:true})]})
    ]);
   }else queue(s,y.p,y,[E('Draw',{n:1,optional:true})]);
  }
 },
 flushShield536(s){if(s.leaving)return;const departed=s.g536ShieldDepartures||[];delete s.g536ShieldDepartures;for(const p of departed)shieldDeparture536(s,p);},
 drawn676(s,p,n,before){
  if(!n)return;
  if(before<2&&before+n>=2)for(const y of creatures(s,p)){
   if(!y.sealed&&effective(y,s).g789SecondDraw)queue(s,p,y,[E('Draw',{n:1})]);
  }
  for(const y of s.players[1-p].battle){
   const {g676OppDraw,g678LaterOppDraw}=card(y);
   if(!(g676OppDraw||g678LaterOppDraw)||y.sealed||api.ignored(s,y)||!api.isCreature(s,y))continue;
   if(g676OppDraw)for(let i=0;i<n;i++)queue(s,1-p,y,g676OppDraw);
   if(g678LaterOppDraw&&s.active===p)for(let i=before===0?1:0;i<n;i++)queue(s,1-p,y,g678LaterOppDraw);
  }
 },
 graveAdded(s,p,all){
  if(s.g767GraveEntries?.turn!==s.turn)s.g767GraveEntries={turn:s.turn,counts:[0,0]};
  s.g767GraveEntries.counts[p]+=all.length;
  if(s.g20LeavingUids&&s.leaving)s.leaving.g838GraveCount=(s.leaving.g838GraveCount||0)+all.length;
  else flushGrave838(s,all.length);
  for(const y of all)if(card(y).g590SelfGraveBottom)queue(s,p,y,[{op:'GraveBottom589',self:true}]);
  // Cards with grave-entry abilities trigger from the new zone (QA46841).
  for(const y of all)if(card(y).g675GraveEntry)queue(s,p,y,card(y).g675GraveEntry);
  const graveWatchers=s.players[p].battle.filter(x=>card(x).g677AllyGrave&&!x.sealed&&api.isCreature(s,x)&&!api.ignored(s,x));
  if(graveWatchers.length){
   const newCreatures=all.filter(y=>faces(api.zoneCard(s,p,y,'grave')).some(face=>face.type==='creature'));
   for(const x of graveWatchers)for(const y of newCreatures)if(y.uid!==x.uid)queue(s,p,x,card(x).g677AllyGrave);
  }
  const watchers=s.leaving?.snapshot?.six?.scarlet?.[p]||active(s,p,'scarlet').map(x=>({uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0}));for(const x of watchers)if(!used(s,'g34Scarlet',x))for(const y of all)if(card(y).type==='creature'&&cost(card(y))<=5)queue(s,p,x,[C('scarletRevive',{target:y.uid,targetSerial:y.zoneSerial||0})]);},
 flushGrave838,
 snapshot(s,leaving=[]){return{g838SelfGrave:leaving.flatMap(({player,uid})=>{
  const x=s.players[player]?.battle.find(x=>x.uid===uid);
  return x&&!x.sealed&&card(x).g838AnyGrave&&!api.ignored(s,x)?[key(x)]:[];
 }),leave320:s.players.flatMap((own,p)=>own.battle.map(x=>({p,uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0,creature:!x.sealed&&api.isCreature(s,x),race:effective(x,s).race,watch:!x.sealed&&!!effective(x,s).g320Jave}))),death303:s.players.flatMap((own,p)=>own.battle.map(x=>{const c=effective(x,s);return{p,uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0,creature:api.isCreature(s,x),race:c.race,name:c.name,colors:colors(c),...(hasSoul(card(x),'E')?{g860EvilSoul:true}:{}),...(c.g303DeathWatch?.g862OtherSoul&&leaving.some(row=>row.player===p&&row.uid===x.uid)?{g862OnlySelf:true}:{}),...(c.g891OwnCreatureLeaves&&!x.sealed&&!api.ignored(s,x)?{leaveDraw891:c.g891OwnCreatureLeaves}:{}),
   ...((c.g891OwnCreatureLeaves||c.g303DeathWatch?.g891LookBackSelf)&&leaving.some(row=>row.player===p&&row.uid===x.uid)?{g891OnlySelf:true}:{}),element:!x.sealed&&!x.faceDown,elementDraw:!!c.g617OpponentElementLeaves&&!x.sealed&&!x.faceDown&&!api.ignored(s,x),...(c.g693OtherCreatureGraveDraw&&!x.sealed&&!x.faceDown&&!api.ignored(s,x)&&api.isCreature(s,x)?{graveDraw:true}:{}),watch:!x.sealed&&!api.ignored(s,x)&&(!c.g303DeathWatch?.g725RemainInBattle||!leaving.some(row=>row.player===p&&row.uid===x.uid))?c.g303DeathWatch:undefined};})),selfLeaves:s.players.flatMap((own,p)=>own.battle.flatMap(x=>{const c=effective(x,s);return c.g172Death||c.g172Leave?[{p,uid:x.uid,incarnation:x.incarnation||0,g172Death:c.g172Death,...(c.g172Death?.some(d=>d.g901Untapped)?{g901WasTapped:!!x.tapped}:{}),...(c.g172Death?.some(d=>d.op==='CrossedDeathDraw728')?{crossedCount728:crossedCount728(s,x)}:{}),g172Leave:c.g172Leave,g601OpponentLeave:c.g601OpponentLeave}]:[];})),scarlet:[0,1].map(p=>active(s,p,'scarlet').map(x=>({uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0}))),dororon:[0,1].map(p=>active(s,p,'dororon').map(x=>({uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0})))};},
 leaving(s,p,x,snapshot,to,destroy){
  // An ability that sees its own move to the graveyard looks back only for its own card.
  const graveDefs=card(x).g838AnyGrave;
  if(to==='grave'&&graveDefs&&(snapshot?.g838SelfGrave?.includes(key(x))??!api.ignored(s,x)))queue(s,p,x,graveDefs);
  const before=snapshot?.death303;
  const victim=before?.find(y=>y.p===p&&y.element&&key(y)===key(x));
  if(victim){
   // A source leaving in the same batch sees its own departure only (QA33591).
   if(victim.creature)for(const watcher of before)
    if(watcher.p===p&&watcher.leaveDraw891&&(!watcher.g891OnlySelf||key(watcher)===key(victim)))
     queue(s,p,watcher,watcher.leaveDraw891);
   const watchers=before.filter(y=>y.p!==p&&y.elementDraw||
    to==='grave'&&victim.creature&&y.graveDraw&&key(y)!==key(victim));
   if(victim.creature)for(const y of before){
    if(y.p===p&&key(y)!==key(victim)&&card(y.cardId).g771Wing)watchers.push({...y,g771Wing:true});
   }
   if(watchers.length){
    if(s.leaving)(s.leaving.g617Draws??=[]).push(...watchers);
    else hooks.flushElementLeaves617(s,watchers);
   }
  }
  const victim320=snapshot?.leave320?.find(y=>y.p===p&&key(y)===key(x));if(victim320?.creature&&String(victim320.race).includes('アビス'))for(const watcher of snapshot.leave320.filter(y=>y.p===p&&y.watch)){if(!used(s,'g320JaveUsed',watcher)){mark(s,'g320JaveUsed',watcher);queue(s,p,watcher,[{op:'Discard',n:1}]);}}const prior=snapshot?.selfLeaves?snapshot.selfLeaves.find(y=>y.p===p&&key(y)===key(x)):effective(x,s);if(prior?.g172Leave&&(!prior.g601OpponentLeave||s.active!==p))queue(s,p,x,prior.g172Leave);if(to==='grave'&&destroy){const death=snapshot?.death303,victim=death?.find(y=>y.p===p&&key(y)===key(x));const firstCreatureDeath=victim?.creature&&s.g612CreatureDeathTurn!==s.turn;if(firstCreatureDeath)s.g612CreatureDeathTurn=s.turn;if(victim?.creature)for(const watcher of death.filter(y=>y.watch&&(!y.watch.firstCreatureDeath||firstCreatureDeath)&&(y.watch.both||y.p===(y.watch.opponent?1-p:p)))){const self=key(watcher)===key(victim);
   // Rule 603.5d: a source that leaves in this batch can see only itself.
   if(watcher.g891OnlySelf&&!self)continue;
   const otherSoul=watcher.watch.g862OtherSoul;
   if(otherSoul&&!self&&(watcher.g862OnlySelf||!hasSoul(card(victim.cardId),otherSoul)))continue;
   if((!self||watcher.watch.self)&&((self&&!watcher.watch.selfFilter)||!watcher.watch.race||String(victim.race||'').includes(watcher.watch.race))&&(!watcher.watch.name||String(victim.name||'').includes(watcher.watch.name))&&(!watcher.watch.colorsAny||watcher.watch.colorsAny.some(c=>(victim.colors||[]).includes(c)))&&(!watcher.watch.g860EvilSoul||victim.g860EvilSoul)&&(!watcher.watch.ownTurn||s.active===watcher.p)&&(!watcher.watch.opponentTurn||s.active!==watcher.p))queue(s,watcher.p,watcher,watcher.watch.defs);}if(prior?.g172Death){
   const defs=prior.g172Death
    .filter(d=>!d.g901Untapped||!(prior.g901WasTapped??x.tapped))
    .filter(d=>d.op!=='ScheduleGraveReturn644'||d.anyTurn||s.active===p)
    .flatMap(d=>{
     if(d.op==='CrossedDeathDraw728'){
      const n=prior.crossedCount728;
      return n?[{op:'Offer',title:'カードを'+n+'枚引く？',defs:[{op:'Draw',n}]}]:[];
     }
     return [['SelfGraveHand476','ScheduleGraveReturn644','SelfGraveShield659','SelfGraveBottom839'].includes(d.op)||d.g901Untapped?{...d,serial:(x.zoneSerial||0)+1}:d];
    });
   if(defs.length)queue(s,p,x,defs);
  }if(effective(x,s).g34Role==='dragonOrb')queue(s,p,x,[C('orbDeploy')]);if(ninja(effective(x,s)))for(const y of(snapshot?.dororon?.[p]||active(s,p,'dororon')))queue(s,p,y,[E('Draw',{n:1,optional:true})]);}},
 revengeEnd795(s){
  const active=s.active;
  const declarations=[active,1-active].flatMap(p=>s.players[p].hand.flatMap(y=>{
   const filter=card(y).g795Revenge;
   if(!filter||api.handAbilityIgnored(s,y))return [];
   const declaration=revengeDeclare795(p,y);
   if(filter.opponentDraws===undefined)return [declaration];
   return p===active&&revengeDraws910(s,p,filter)?[declaration]:[];
  }));
  const top=api.peekTop(s,active),filter=top&&card(top).g795Revenge;
  if(filter?.opponentDraws!==undefined&&revengeDraws910(s,active,filter))
   declarations.push(revengeDeclare795(active,top,'deck'));
  if(declarations.length)put(s,...declarations);
 },
 revengeNonActive910(s){
  const end=s.endStep;
  if(end?.stage!=='resolve'||end.g910RevengeChecked||s.decision||s.extTasks?.length||s.triggers||s.leaving||s.battleResolution)return false;
  // The non-turn player declares only after the turn player's pending effects (rule 511).
  end.g910RevengeChecked=true;
  const p=1-s.active,ready=s.players[p].hand.flatMap(y=>{
   const filter=card(y).g795Revenge;
   return filter?.opponentDraws!==undefined&&revengeDraws910(s,p,filter)&&!api.handAbilityIgnored(s,y)?[revengeDeclare795(p,y)]:[];
  });
  if(ready.length)put(s,...ready);
  return !!ready.length;
 },
 end(s){if(s.extLimits)s.extLimits=s.extLimits.filter(l=>!(l.kind==='g546Force'&&l.when==='nextOpponent'&&s.active===1-l.controller&&s.turn>l.turn));const out=collect537(s,'turnEnd',s.active);const remaining501=[];for(const r of s.g501EndDelays||[])if(!r.ownEnd||r.p===s.active)out.push({player:r.p,source:r.source,effect:'extended',task:task('g34_ResolveEnd501',r.p,r.source,{...r})});else remaining501.push(r);s.g501EndDelays=remaining501;for(const t of s.g484BreakEnds||[])if(t.turn===s.turn)out.push({player:t.p,source:t.source,uid:t.uid,effect:'extended',task:task('g34_Sequence',t.p,t.source,{uid:t.uid,incarnation:t.incarnation,defs:[E('BreakReturn484')]})});s.g484BreakEnds=[];for(const t of s.g408EndUntaps||[])if(t.turn===s.turn)out.push({player:t.p,source:t.source,uid:t.g399Attacker.uid,effect:'extended',task:task('g34_AttackUntap408',t.p,t.source,{g399Attacker:t.g399Attacker})});s.g408EndUntaps=[];for(const p of[0,1]){const add=(x,defs,source=x.cardId)=>out.push({player:p,uid:x.uid,source,effect:'extended',task:task('g34_Sequence',p,source,{uid:x.uid,incarnation:x.incarnation||0,defs})});for(const x of s.players[p].battle){if(x.g34Delayed?.turn===s.turn){const d=x.g34Delayed,controller=d.controller??p,source=d.source||x.cardId;out.push({player:controller,uid:x.uid,source,effect:'extended',task:task('g34_DelayedMove532',controller,source,{uid:x.uid,incarnation:x.incarnation||0,to:d.to})});}if(api.ignored(s,x))continue;const r=card(x).g34Role;if(!x.sealed&&effective(x,s).g474AnyEnd)add(x,effective(x,s).g474AnyEnd);
  const manaLeftEnd=card(x).g811ManaLeftEnd;
  if(manaLeftEnd&&s.g47ManaLeft?.[p]===s.turn)add(x,manaLeftEnd);
  const ownShieldBreakEnd=card(x).g861OwnShieldBreakEnd;
  if(ownShieldBreakEnd&&!x.sealed&&!x.faceDown&&api.isCreature(s,x)&&(s.players[p].brokenThisTurn||0)>=ownShieldBreakEnd)
   add(x,[E('ShieldTop',{n:1})]);
  const breakThreshold=card(x).g769ShieldBreakRaid;
  if(s.active===p&&!x.sealed&&breakThreshold&&effective(x,s).g769ShieldBreakRaid&&
   s.players.reduce((n,who)=>n+(who.brokenThisTurn||0),0)>=breakThreshold)
   add(x,[E('Raid767',{race:'アーマード',max:8})]);
  if(!x.sealed&&effective(x,s).g764MondoEnd&&s.g37Spells?.[p]?.turn===s.turn&&s.g37Spells[p].n>0&&
   s.g463Summons?.[p]?.turn===s.turn&&s.g463Summons[p].n>0)add(x,[E('MagicRaid764')]);
  if(s.active===p&&!x.sealed&&card(x).g767GraveRaid&&api.isCreature(s,x)&&effective(x,s).g767GraveRaid&&
   s.g767GraveEntries?.turn===s.turn&&s.g767GraveEntries.counts[1-p]>=2)
   add(x,[E('Raid767',{race:'アビス',max:5})]);
  const drawLimit=card(x).g698EndDrawDiscard&&!x.sealed&&effective(x,s).g698EndDrawDiscard;if(drawLimit&&(s.players[1-p].drawsThisTurn||0)>=drawLimit)add(x,[E('EndDrawDiscard698')]);if(p!==s.active&&!x.sealed&&effective(x,s).g565OpponentEnd)add(x,effective(x,s).g565OpponentEnd);if(s.active===p){if(effective(x,s).g174End)add(x,effective(x,s).g174End);if(x.tapped&&api.isCreature(s,x)&&effective(x,s).g405Kourin)add(x,[E('Kourin405',{rule:effective(x,s).g405Kourin})]);for(const {source,grants:g}of effective(x,s).g404Inherited||[]){if(g.g174End)add(x,g.g174End,source);if(g.g166EndUntap)add(x,[E('Untap',{g404Carrier:true})],source);}for(const {source,grants:g}of effective(x,s).g406Inherited||[])if(g.g174End)add(x,g.g174End,source);if(r==='musasabi')add(x,[E('Untap')]);if(r==='fourJustice')add(x,[E('Untap'),E('Draw',{n:1,optional:true})]);if(r==='superRoma')add(x,[select('mana','hand',1)]);if(r==='nameko'&&s.players[p].mana.length>=8)add(x,[select('mana','hand',1,{}, {optional:true})]);}}if(p!==s.active){for(const x of s.players[p].hand.filter(x=>card(x).g34Role==='happou'))add(x,[C('happouSummon')]);for(const x of s.players[p].shields.flatMap(api.shieldCards).filter(x=>x.faceUp&&card(x).g34Role==='mantraCastle'))add(x,[E('Draw',{n:1,optional:true})]);}}return out;},
 attackEnd(s,a,x){
  if(s.g481Attackers?.turn===s.turn&&s.g481Attackers.events.length===1)for(const p of [s.active,1-s.active])for(const watcher of creatures(s,p)){
   const defs=!watcher.sealed&&effective(watcher,s).g897FirstAttackEnd;
   if(defs)queue(s,p,watcher,defs);
  }
  for(const watcher of s.players[a.player].battle){
   if(card(watcher).g774AllyAttackEnd&&!watcher.sealed&&!api.ignored(s,watcher)&&api.isCreature(s,watcher))
    queue(s,a.player,watcher,[E('Draw',{n:1,optional:true})]);
  }
  const endRefs=[...(a.g543Refs||[]),...(x?api.allLayers(x).map(key):[])];if(a.g543First)for(const r of s.extLimits||[])if(r.kind==='g543Shinka'&&r.when==='firstAttackEnd'&&endRefs.includes(key(r)))api.enqueue(s,r.p,{source:r.source,effect:'extended',task:task('g34_ResolveDelay537',r.p,r.source,{uid:r.uid,incarnation:r.incarnation,defs:[{op:'Untap',g191First:true}]})});for(const r of a.g542After||[])api.enqueue(s,r.p,{source:r.source,effect:'extended',task:task('g34_ResolveDelay537',r.p,r.source,{uid:r.uid,incarnation:r.incarnation,defs:r.defs})});for(const t of a.g176Deaths||[]){const y=s.players[t.p].battle.find(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===t.incarnation));if(y)api.enqueue(s,t.p,{uid:y.uid,source:t.source,effect:'extended',task:task('g34_ExactMove',t.p,t.source,{owner:t.p,target:y.uid,targetIncarnation:y.incarnation||0,to:'grave'})});}if(!x)return;if(!x.sealed&&effective(x,s).g474AttackEnd)queue(s,a.player,x,effective(x,s).g474AttackEnd);if(effective(x,s).g34Role==='revvo'&&x.entered===s.turn&&s.players[a.player].shields.length<=2)queue(s,a.player,x,[E('Lock',{limit:{kind:'g34NoLose',player:a.player,expires:'start',who:a.player}})]);if(!colors(effective(x,s)).includes('闇')&&(active(s,0,'baromreizu').length||active(s,1,'baromreizu').length)){for(const p of[0,1])for(const watcher of active(s,p,'baromreizu'))queue(s,p,watcher,[E('ExactMove',{owner:a.player,to:'grave',target:x.uid,targetIncarnation:x.incarnation||0})]);}},
 expire(s,when,p){if(when==='start')for(const own of s.players)for(const x of [...own.mana,...own.battle])if(x.tapLocks)x.tapLocks=x.tapLocks.filter(l=>typeof l!=='object'||l.who!==p||s.players[p].turns<l.afterTurns);if(when==='end'){s.g34Discounts=(s.g34Discounts||[]).filter(x=>x.turn!==s.turn);s.g484BreakEnds=(s.g484BreakEnds||[]).filter(x=>x.turn!==s.turn);}},
 inherit(s,base,x){if(used(s,'g191Tapped',base))mark(s,'g191Tapped',x);if(base.g34Grants)(x.g34Grants??=[]).push(...structuredClone(base.g34Grants));if(base.g34Delayed)x.g34Delayed=structuredClone(base.g34Delayed);},
 selected447(s,p,a,d){if(a.kind==='attack')return;const v=a.kind==='extended'?d?.choices?.[a.choice]?.value:null,ids=new Set([...(a.targets||[]).map(x=>x.uid),...(['effect','fight','dragonTap'].includes(a.kind)?[a.target||a.uid]:[]),...(typeof v==='string'?[v]:v?.uid?[v.uid]:[])]);for(const x of s.players[1-p].battle)if(ids.has(x.uid)){const defs=effective(x,s).g447Selected;if(defs)queue(s,1-p,x,defs);}},
 // This trigger originates outside the battlefield, so battlefield-only ability suppression does not apply.
 gsRevealed545(s,p,source,uid){const defs=card(source)?.g545GS;if(defs)api.enqueue(s,p,{source,effect:'extended',task:task('g34_ResolveDelay537',p,source,{uid,defs:structuredClone(defs)})});},
 evolutionBase397(s,p,x){if(x.sealed||!s.players[p].battle.includes(x)||api.ignored(s,x))return;const defs=effective(x,s).g397Shinka;if(defs){if(defs.some(d=>d.op==='ShinkaHost544'&&d.mode==='belowCost'))send(s,p,x,'Sequence',{defs,g399Attacker:{uid:x.uid,incarnation:x.incarnation||0,cost:null}});else queue(s,p,x,defs);}},
 forced546,jokerCount539,gravePermits294,manaPermits297,protects608,
 permitLabel450(s,p,permit){if(typeof permit!=='string'||!permit.startsWith('g450:'))return'';const i=s.players[p].battle.findIndex(y=>permit==='g450:'+y.uid+'@'+(y.incarnation||0));return i<0?'':'（場'+(i+1)+' '+effective(s.players[p].battle[i],s).name+'の能力）';},
 crewBreak444(s,p,x,c){const rule=c.g444Crew,f=rule.filter;return 1+s.players[p].battle.filter(y=>!y.sealed&&api.isCreature(s,y)&&(!rule.other||y.uid!==x.uid)).filter(y=>{const d=effective(y,s,true);return(!f.race||race(d,f.race))&&(!f.multi||colors(d).length>1)&&(!f.blocker||d.blocker);}).length;},
 tapScore439(s,p,x,sourceDefs=null){
  const activeDefs=defs=>defs.flatMap(d=>d.op==='IfOwn'?activeDefs(ownCondition(s,p,d.filter,x.uid)?d.defs:d.elseDefs||[]):[d]),defs=activeDefs(sourceDefs||effective(x,s).g439Tap||[]),own=s.players[p],opp=s.players[1-p],t=task('g34_Sequence',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0});
  let score=modeScore(s,t,defs.filter(d=>!(d.op==='Target'&&d.owner==='self')))-2;
  for(const d of defs){
   if(d.op==='Look'&&!api.deckLocked(s,p)&&(own.deck?.length??own.deckCount)>1)score+=d.g201Search?10:d.g259OrderTop?4:0;
   if(d.op==='OpponentSelect'){const rows=creatures(s,1-p).filter(y=>!y.sealed&&matches(s,1-p,y,d.filter));if(rows.length)score+=8+Math.min(...rows.map(y=>cost(effective(y,s))*2));}
   if(d.op==='SelfDestroy')score-=8+cost(effective(x,s))*2;
   if(d.op==='Sweep'&&d.both)score-=creatures(s,p).filter(y=>!y.sealed&&matches(s,p,y,d.filter)).reduce((n,y)=>n+12+cost(effective(y,s))*2+api.power(y,false,s)/3000,0);
   if(d.op==='Target'&&d.owner==='self')score+=Math.max(0,...creatures(s,p).filter(y=>y.uid!==x.uid&&!y.tapped&&!y.sealed&&matches(s,p,y,d.filter)).map(y=>{const c=effective(y,s),ready=!c.noAttack&&(y.entered<s.turn||c.speedAttacker||api.isEvolution(y));return ready&&(d.power||d.grant?.slayer&&!c.slayer&&creatures(s,1-p).some(z=>!z.sealed)||d.grant?.unblockable&&!c.unblockable&&opp.battle.some(z=>!z.tapped&&!z.sealed&&effective(z,s).blocker))?8+cost(c):0;}));
  }
  return score;
 },
 mainActions(s,p){const own=s.players[p],out=[];
  // Alternative payment changes neither printed civilizations nor zone permissions.
  for(const origin of['hand','mana','grave'])for(const x of own[origin]){
   const c=api.zoneCard(s,p,x,origin),r=c.g568Alt;if(x.faceDown||!hasAltPayment568(s,p,origin,r)||!api.canMoveZone(s,p,origin)||!api.canCast(s,p,c,origin)||c.type==='creature'&&!api.canEnter(s,p,c,{origin,execution:true}))continue;
   for(const permit of new Set(api.costAltPermits568(s,p,x,c,origin)))for(const base of[c.neoEvolution?null:undefined,...(c.neoEvolution?api.evolutionBases(s,p,c):[])])for(const snowReducers of[undefined,...api.snowVariants(s,p,c)]){
    const payment={...c,...(origin==='mana'?{civilizations:api.manaColors(c,s,p)}:{}),cost:r.cost,printedCost:c.cost,g568PaymentColors:r.paymentColors,g27BaseUid:base?.uid??null,summonOrigin:origin,executionUid:x.uid,...(snowReducers?{snowReducers}:{})};
    if(api.canPay(s,p,payment))out.push({kind:'play',alternative:'sixPhoto',role:'paidAlt568',uid:x.uid,cardId:x.cardId,origin,manaPermit:permit,baseUid:base?.uid??null,...(snowReducers?{snowReducers}:{}),cost:api.summonCost(s,p,payment),label:c.name+(r.condition||r.handOnly?'を条件付きの別コストで':'を別コストで')+(origin==='hand'?'':origin==='mana'?'マナから':'墓地から')+(c.type==='spell'?'唱える':'召喚')+(base?'・'+card(base).name+'の上にNEO進化':c.neoEvolution?'・進化させず':'')});
   }
  }

  for(const x of own.mana)for(const[face,c]of faces(card(x)).entries()){
   const permits=manaPermits297(s,p,x,c);
   if(!permits.length||!api.canCast(s,p,c,'mana')||!api.canEnter(s,p,c,{origin:'mana',execution:true})||c.evolution&&!api.evolutionBases(s,p,c).length)continue;
   if(c.gZeroFour&&creatures(s,p).length>=4&&!creatures(s,p).some(y=>y.cardId===x.cardId))out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,origin:'mana',manaPermit:permits[0],cost:0,freeSummon:'G・ゼロ',label:c.name+'をマナからG・ゼロで召喚する'});
   for(const permit of permits)for(const snowReducers of[undefined,...api.snowVariants(s,p,c)]){if(c.manaSummon&&snowReducers===undefined)continue;const payment={...c,summonOrigin:'mana',executionUid:x.uid,...(snowReducers?{snowReducers}:{})};if(api.canPay(s,p,payment))out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,origin:'mana',manaPermit:permit,...(snowReducers?{snowReducers}:{}),cost:api.summonCost(s,p,payment),label:c.name+'をマナから召喚する'+(snowReducers?'・軽減の使用先を選ぶ':'')});}
  }
  for(const x of own.mana){const c=card(x);if(x.faceDown||!c.g296ManaBirth||!api.canCast(s,p,c,'mana')||!api.canEnter(s,p,c,{origin:'mana',execution:true}))continue;for(const snowReducers of[undefined,...api.snowVariants(s,p,c)]){const payment={...c,cost:c.g296ManaBirth,printedCost:c.cost,summonOrigin:'mana',executionUid:x.uid,...(snowReducers?{snowReducers}:{})};if(api.canPay(s,p,payment))out.push({kind:'play',alternative:'sixPhoto',role:'manaBirth296',uid:x.uid,cardId:x.cardId,origin:'mana',...(snowReducers?{snowReducers}:{}),cost:api.summonCost(s,p,payment),label:c.name+'をマナ爆誕で召喚（'+api.summonCost(s,p,payment)+'マナ）'+(snowReducers?'・軽減の使用先を選ぶ':'')});}}

  for(const x of own.grave)for(const[face,c]of faces(card(x)).entries()){
   const permits=gravePermits294(s,p,x,c),payment={...c,summonOrigin:'grave',executionUid:x.uid};
   if(!permits.length||!api.canCast(s,p,c,'grave')||!api.canEnter(s,p,c,{origin:'grave',execution:true})||c.evolution&&!api.evolutionBases(s,p,c).length||!api.canPay(s,p,payment))continue;
   for(const permit of permits)out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,origin:'grave',manaPermit:permit,cost:api.summonCost(s,p,payment),label:c.name+'を墓地から召喚する'});
  }
for(const x of own.hand){const c=card(x),r=c.g34Role;if(!api.canCast(s,p,c,'hand')||c.type==='creature'&&!api.canEnter(s,p,c,{origin:'hand',execution:true}))continue;let okay=false;if(r==='sirius')okay=creatures(s,p).filter(y=>angel(effective(y,s))&&!y.tapped&&api.canUntap(y)).length>=5;if(r==='zero')okay=own.hand.filter(y=>y!==x&&colors(card(y)).includes('闇')).length>=3&&creatures(s,p).filter(y=>colors(effective(y,s)).includes('闇')&&api.canLeave(s,p,y)).length>=3;if(r==='reiai')okay=own.battle.filter(y=>api.canLeave(s,p,y)).length>=2&&api.canPay(s,p,{cost:5,civilizations:['光','闇','自然'],fixedPayment:true});if(okay)out.push({kind:'play',alternative:'sixPhoto',uid:x.uid,cardId:x.cardId,role:r,label:c.name+'を代替コストで使う',cost:r==='reiai'?5:0});}return out;},
 alternative(s,p,a){if(a.role==='paidAlt568'){const origin=a.origin||'hand',x=s.players[p][origin].find(x=>x.uid===a.uid),c=x&&api.zoneCard(s,p,x,origin),r=c?.g568Alt;if(!hasAltPayment568(s,p,origin,r)||!api.costAltPermits568(s,p,x,c,origin).includes(a.manaPermit))throw Error('別コストの使用条件を満たしていません');cast(s,p,a.uid,false,a.baseUid??null,0,{cost:r.cost,g568PaymentColors:r.paymentColors,...(r.entry?{g777AltEntry:true}:{}),...(origin==='mana'?{civilizations:api.manaColors(c,s,p)}:{})},origin,'条件付き別コスト',false,a.manaPermit,a.snowReducers??null);return;}if(a.role==='recycle416'){const c=card(a.cardId);if(c.g416RecycleCost)cast(s,p,a.uid,false,null,a.face||0,{cost:c.g416RecycleCost,g40PayNormally:true},'grave','リサイクル',true);return;}if(a.role==='manaBirth296'){cast(s,p,a.uid,false,null,0,{cost:card(a.cardId).g296ManaBirth},'mana','マナ爆誕',false,null,a.snowReducers??null);return;}put(s,task('g34_Custom',p,a.cardId,{name:'alternative',uid:a.uid,role:a.role,selected:[]}));},
 };
 function hasAltPayment568(s,p,origin,r){
  return !!r&&(!r.handOnly||origin==='hand'&&s.players[p].hand.length===1)&&(!r.condition||ownCondition(s,p,r.condition));
 }
 function noncreatureUse448(s,p,c){if(c.type==='creature')return;const prev=s.g448NoncreatureUses?.[p];(s.g448NoncreatureUses??=[null,null])[p]={turn:s.turn,n:prev?.turn===s.turn?prev.n+1:1};}
 function countExecution(s,p,c){const prev=s.g34Executions?.[p];(s.g34Executions??=[null,null])[p]={turn:s.turn,n:prev?.turn===s.turn?prev.n+1:1};if(s.active===p&&cost(c)<=9)for(const x of active(s,1-p,'dokindante'))queue(s,1-p,x,[E('Draw',{n:1,optional:true}),exec('hand',9,{spellOnly:true})]);}

 const fifteen=createFifteenPhotoRules({...api,start,tasks,send,key,live,matches,canPut,notifyUntapped:(s,p,x)=>combined.untapped(s,p,x)});
 const combined={...hooks};
 for(const k of ['entry','attack','attackStart','tapped','untapped','shieldLeft','graveAdded','played','spellCast','leaving','attackEnd','expire','inherit']){const a=hooks[k],b=fifteen[k];if(b)combined[k]=(...args)=>{a?.(...args);b(...args);};}
 for(const k of ['turnStart','end','mainActions'])combined[k]=(...args)=>[...(hooks[k]?.(...args)||[]),...(fifteen[k]?.(...args)||[])];
 for(const k of ['allowedCast','canLeave'])combined[k]=(...args)=>(hooks[k]?.(...args)??true)&&(fifteen[k]?.(...args)??true);
 for(const k of ['shieldTrigger','noLose'])combined[k]=(...args)=>!!hooks[k]?.(...args)||!!fifteen[k]?.(...args);
 combined.decorate=(s,p,x,c)=>fifteen.decorate(s,p,x,hooks.decorate(s,p,x,c));
 combined.discount=(...args)=>hooks.discount(...args)+fifteen.discount(...args);
 combined.snapshot=(s,leaving)=>({...hooks.snapshot(s,leaving),fifteen:fifteen.snapshot(s)});
 combined.leaving=(s,p,x,snapshot,to,destroy)=>{hooks.leaving(s,p,x,snapshot,to,destroy);fifteen.leaving(s,p,x,snapshot?.fifteen,to,destroy);};
 return{...combined,fifteen, hyperEntry781(s,p,x,source){
  releaseHyper781(s,p,x);
  applyGrant(s,{p,source,spell:true,g521UntilStart:true,grant:{blocker:true}},x);
 }, deploymentGrant791(s,p,x,grant,source,fight){
  applyGrant(s,{p,source,grant,g521UntilStart:true,spell:true},x);
  if(fight)put(s,task('g34_FightEnemy240',p,source,{fighter:{uid:x.uid,incarnation:x.incarnation||0},optional:true}));
 }, deploymentSpeed771(s,p,x,source,returnAtOpponentStart){
  applyGrant(s,{p,source,spell:true,grant:{speedAttacker:true,...(returnAtOpponentStart?{g774Permanent:true}:{})}},x);
  if(returnAtOpponentStart)(s.g537Delays??=[]).push({
   p,who:1-p,source,spellCost:cost(faces(card(source)).at(-1)),uid:x.uid,incarnation:x.incarnation||0,
   turn:s.turn,when:'nextOwnStart',defs:[E('DelayedMove532',{to:'hand',g774Banky:true})]
  });
 }, afterSpell566(s,f){if(f.spell?.g566EvoCharger&&!api.spellIgnored(s,f.spell))put(s,task('g34_EvoCharge566',f.caster??f.owner,f.spell.id,{}));},
weakerBlock569(s,a,b){const p=s.players.findIndex(own=>own.battle.includes(a));if(p<0)return false;const fromSpell=(s.extLimits||[]).some(l=>l.kind==='g569WeakerBlock'&&api.allLayers(a).some(y=>key(y)===key(l.ref))&&!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource})),fromAura=creatures(s,p).some(x=>{if(x.sealed||api.ignored(s,x))return false;const r=effective(x,s).g569Aura;return r&&matches(s,p,a,r.filter)&&(!r.mana||s.players[p].mana.filter(y=>api.manaColors(y.faceDown?{civilizations:[],civ:'ゼロ'}:card(y),s,p).includes(r.mana.color)).length>=r.mana.n);});return (fromSpell||fromAura)&&api.power(b,false,s)<api.power(a,true,s);},
attackPower593(s,p,x,playerOnly){
 const locks=(s.extLimits||[]).filter(l=>l.kind==='g593AttackPower'&&l.playerOnly===playerOnly&&(l.player===null||l.player===p)&&!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource}));
 return locks.length>0&&!creatures(s,p).some(y=>effective(y,s).ignoreAttackLocks)&&api.power(x,false,s)<=Math.max(...locks.map(l=>l.max));
},
playerStop567(s,p,x){if(playerStopReading567.has(s))return false;const locks=(s.extLimits||[]).filter(l=>l.kind==='g567PlayerStop'&&(l.ref?api.allLayers(x).some(y=>key(y)===key(l.ref)):l.player===p)&&(l.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource})));if(!locks.length)return false;playerStopReading567.add(s);try{return locks.some(l=>l.controller===p||!creatures(s,p).some(y=>effective(y,s).ignoreAttackLocks));}finally{playerStopReading567.delete(s);}},
protected565:(s,x)=>(s.extLimits||[]).some(l=>l.kind==='g521Grant'&&l.g565External&&api.allLayers(x).some(y=>y.uid===l.ref.uid&&(y.incarnation||0)===l.ref.incarnation)),run,chosen,matches,hasSoul,ownCondition,canPut,countDraw,modeScore,recoveryScore326,spellWatches,attackDraws613,seedWatches548,entryPlan549,auraPower,countPower,grantAuras,send,tasks,start,race,mecha,ninja,angel,demon,key,live,
 crossEntry728(s,p,x,baseUid,entryOptions){
  if(entryOptions.g728CrossIds||!crossGears728(s,p).length)return false;
  (s.players[p].g34Holding??=[]).push(x);
  put(s,task('g34_EntryCross728',p,x.cardId,{target:x.uid,baseUid,entryOptions:structuredClone(entryOptions),selected:[]}));
  return true;
 },
 optionalEntry432(s,p,x,baseUid,entryOptions,forcedTapped){
  if(!card(x.cardId).g432EntryTap||entryOptions.g432EntryChosen||forcedTapped)return false;
  // This is an entering-state choice, before battlefield-only ability ignoring.
  (s.players[p].g34Holding??=[]).push(x);
  put(s,task('g34_EntryTap432',p,x.cardId,{target:x.uid,baseUid,entryOptions:structuredClone(entryOptions)}));
  return true;
 },
 effect(s,p,c,uid,entry){if(c.effect!=='sixPhoto')return false;start(s,{p,source:c.id,uid,incarnation:entry?.incarnation??(s.players[p].battle.find(x=>x.uid===uid)?.incarnation||0)},c.g437Super?[...(c.g34Tasks||[]),...(entry?.super?c.g437Super:[])]:entry?.plus&&c.g34Plus?(c.g451PlusAfter?[...(c.g34Tasks||[]),...c.g34Plus]:[...c.g34Plus,...(c.g34Tasks||[])]):c.g34Tasks);return true;},
 };
}
