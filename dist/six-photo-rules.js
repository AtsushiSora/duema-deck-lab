import {beginElementEntryBatch,endElementEntryBatch,elementEntrySourceEstablished} from './element-entry-batch.js';
import {hasKingMasterRarity1697} from './king-master-cards.js';
import {hasVictoryRarity1686} from './victory-cards.js';
import {overdrivePayment1439} from './overdrive1439-rules.js?v=0.722.3';
import {createFifteenPhotoRules} from './fifteen-photo-rules.js?v=0.722.19';
import {createChampionRaid} from './champion-raid-helpers.js';
import {policyLook,policyTake} from './champion-zone-policy.js';
import {RECOVERY_RACES} from './utility-recovery-races.js?v=0.119.0';
import {hasCopiedRole393} from './requested393-joker-rules.js?v=0.722.6';
import {afterEntry} from './entry-followup.js?v=0.722.3';
import {hasKnightMagic} from './utility-knight-rules.js?v=0.124.0';
// Six photographed deck lists: serializable effects, physical cards and explicit choices.
export function createSixPhotoRules(api){
 const{card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,enter,cast,move,targetOptions}=api;
 const raid764=createChampionRaid(api,'g34_');
 const attackConditionReading481=new WeakSet(),playerStopReading567=new WeakSet();
 const shieldAdds918=new WeakMap();
 const shieldAdds1737=new WeakMap();
 const secondManaAdds1205=new WeakMap();
 const civilizations805=['光','水','闇','火','自然'];
 function manaColorMatchCount1054(rows,colors){
  const assigned=new Map();
  function assign(color,seen){
   return rows.some(({x,civilizations})=>{
    if(!civilizations.includes(color)||seen.has(x.uid))return false;
    seen.add(x.uid);
    if(assigned.has(x.uid)&&!assign(assigned.get(x.uid),seen))return false;
    assigned.set(x.uid,color);
    return true;
   });
  }
  return colors.filter(color=>assign(color,new Set())).length;
 }
 function creatureCivilizations805(s){
  return [0,1].flatMap(p=>creatures(s,p).filter(x=>!x.sealed).map(x=>({
   p,x,cs:colors(effective(x,s,true)).filter(c=>civilizations805.includes(c))
  })));
 }
 const exactRaces=c=>String(c.race||'').split('/').filter(Boolean);
 // Assign a different complete printed tribe to each card; substrings are not tribes (QA45077).
 function distinctRaces1830(rows){
  const assigned=new Map();
  function assign(i,seen){
   for(const race of exactRaces(card(rows[i]))){
    if(seen.has(race))continue;
    seen.add(race);
    if(!assigned.has(race)||assign(assigned.get(race),seen)){assigned.set(race,i);return true;}
   }
   return false;
  }
  return rows.every((_,i)=>assign(i,new Set()));
 }
 const sharesRace=(a,b)=>exactRaces(a).some(name=>exactRaces(b).includes(name));
 const goatRaceReading=new WeakSet(),civilAuraReading=new WeakSet();
 // Soul marks are printed characteristics and remain when abilities are ignored.
 const hasSoul=(c,soul)=>c.g558Souls?.includes(soul)||c.text?.includes('【'+soul+'・ソウル】');
 const race=(c,q)=>String(c.race).includes(q),mecha=c=>race(c,'メカ'),ninja=c=>race(c,'シノビ'),demon=c=>race(c,'デーモン・コマンド'),angel=c=>race(c,'エンジェル・コマンド');
 // A restricted origin permission belongs to one incarnation of its provider.
 function zonePermits450(s,p,x,c,origin){if(s.active!==p||c.type!=='creature'||origin==='mana'&&x.faceDown||!api.canMoveZone(s,p,origin))return[];return s.players[p].battle.filter(y=>api.isCreature(s,y)||card(y).type==='seed'&&card(y).g450ZoneSummon?.emptyHand).flatMap(y=>{const r=!y.sealed&&!y.faceDown&&effective(y,s).g450ZoneSummon,k='g450:'+y.uid+'@'+(y.incarnation||0);return r&&r.origin===origin&&(!r.emptyHand||s.players[p].hand.length===0)&&(!r.entryTurn||(y.originalEntryTurn??y.entered)===s.turn)&&(r.unlimited||s.g450ZoneUses?.[p]?.[k]!==s.turn)&&(r.anyShieldsMax===undefined||s.players.some(w=>w.shields.length<=r.anyShieldsMax))&&(!r.filter.evolution||api.isEvolution(x)||!!c.g48HandEvolution)&&matches(s,p,x,r.filter.evolution?{...r.filter,evolution:false}:r.filter)?[k]:[];});}
 // Count visible Joker cards in both zones; a twinpact is one mana card.
 function jokerCount539(s,p){return s.players[p].battle.filter(y=>!y.sealed&&!y.faceDown&&race(effective(y,s),'ジョーカーズ')).length+s.players[p].mana.filter(y=>!y.faceDown&&faces(card(y)).some(c=>race(c,'ジョーカーズ'))).length;}
 const graveAuraUse1816=(s,p,x)=>(s.extLimits||[]).some(l=>l.kind==='g1816AuraGraveUse'&&l.player===p&&
  l.refs.some(r=>r.uid===x.uid&&r.serial===(x.zoneSerial||0))&&
  !api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource}));
 const gravePermits294=(s,p,x,c=card(x))=>c.type==='aura'?(s.active===p&&!x.faceDown&&(c.g1436ZoneUse==='grave'||graveAuraUse1816(s,p,x))&&!api.handAbilityIgnored(s,x)&&api.canMoveZone(s,p,'grave')?['g1436:grave']:[]):s.active!==p||c.type!=='creature'||!api.canMoveZone(s,p,'grave')?[]:[
  ...(!x.faceDown&&c.g978SelfGraveSummon&&(c.g978SelfGraveSummon===true||ownCondition(s,p,c.g978SelfGraveSummon))?['g978:self']:[]),
  ...creatures(s,p).filter(y=>{const rule=effective(y,s).g294GraveAura;return !y.sealed&&rule&&(rule.race?race(c,rule.race):colors(c).includes('闇')&&(api.isEvolution(x)||!!c.g48HandEvolution));}).slice(0,1).map(y=>'g294:'+y.uid+'@'+(y.incarnation||0)),
  ...zonePermits450(s,p,x,c,'grave')
 ];
 // Mana characteristics include both twinpact faces and live Courtney effects.
 const manaPermits297=(s,p,x,c=card(x))=>c.type==='aura'?(s.active===p&&!x.faceDown&&c.g1436ZoneUse==='mana'&&s.players[p].mana.includes(x)&&!api.handAbilityIgnored(s,x)&&api.canMoveZone(s,p,'mana')?['g1436:mana']:[]):s.active!==p||x.faceDown||!s.players[p].mana.includes(x)||c.type!=='creature'||!api.canMoveZone(s,p,'mana')?[]:[
  ...(c.g297SelfManaSummon&&ownCondition(s,p,c.g297SelfManaSummon)?['g297:self']:[]),
  ...(s.extLimits||[]).filter(l=>l.kind==='g1288ManaSummon'&&!l.used&&l.player===p&&l.turn===s.turn&&
   l.refs.some(ref=>ref.uid===x.uid&&ref.serial===(x.zoneSerial||0))&&!spellGrantIgnored(s,l)).map(l=>l.permit),
  ...((s.extLimits||[]).some(l=>l.kind==='g297ManaTurn'&&l.player===p&&l.turn===s.turn)?['g297:turn']:
  creatures(s,p).filter(y=>{
   const rule=effective(y,s).g297ManaAura;
   if(y.sealed||!rule)return false;
   if(rule.race)return race(c,rule.race);
   if(rule.exactCost!==undefined)return cost(c)===rule.exactCost;
   const cs=api.manaColors(card(x),s,p);
   return rule.colorless?cs.length===0:cs.length>1;
  }).slice(0,1).map(y=>'g297:'+y.uid+'@'+(y.incarnation||0))),...zonePermits450(s,p,x,c,'mana'),...(c.g539SelfMana&&jokerCount539(s,p)>=c.g539SelfMana?['g539:self']:[])];
 const crossGears728=(s,p)=>s.players[p].battle.filter(x=>!x.sealed&&card(x).type==='gear');
 const crossedCount728=(s,x)=>s.players.reduce((n,_,p)=>n+crossGears728(s,p).filter(g=>g.crossedTo?.uid===x.uid&&g.crossedTo.incarnation===(x.incarnation||0)).length,0);
 const crossedGearRefs929=(s,p,host)=>crossGears728(s,p)
  .filter(g=>!g.faceDown&&g.crossedTo?.uid===host.uid&&g.crossedTo.incarnation===(host.incarnation||0))
  .map(g=>({uid:g.uid,incarnation:g.incarnation||0}));
 const remainingGears929=(s,t)=>crossGears728(s,t.p)
  .filter(g=>!g.faceDown&&t.gears.some(ref=>ref.uid===g.uid&&ref.incarnation===(g.incarnation||0)));
 function creatureBreakCount1342(s,p,x,n){
  if(!x||x.sealed||x.faceDown||!api.isCreature(s,x)||!s.players[p].battle.includes(x))return n;
  const reductions=s.players[1-p].battle.reduce((count,y)=>{
   if(y.sealed||y.faceDown||!api.isCreature(s,y)||api.ignored(s,y))return count;
   return count+(x.tapped&&card(y).g1342Kabord?1:0)+(effective(y,s).g1599BreakReduction||0);
  },0);
  return Math.max(0,n-reductions);
 }
 const key=x=>x.uid+'@'+(x.incarnation||0),live=(s,t)=>s.players[t.creatureOrigin??t.p].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===(t.incarnation||0));
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
  return rows.flatMap(x=>{
   const w=!x.sealed&&effective(x,s).g548SeedEntry,self=x.uid===y.uid;
   if(!w||self&&selfMuted||!(self&&w.selfAlways||matches(s,p,y,w.filter)))return [];
   const defs=w.captureSeed?w.defs.map(d=>({...d,seed:{uid:y.uid,incarnation:y.incarnation||0}})):w.defs;
   return [{x,defs}];
  });
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
    if(r.defs[0]?.op==='ReturnGroup785'&&!r.defs[0].refs.length)continue;
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
 function spellGrantIgnored(s,l){
  return l.spellCost!==undefined&&api.spellIgnored(s,{type:'spell',spellSource:l.source,cost:l.spellCost});
 }
 function stayUntilStart627(s,t,x){
  if(x&&!x.sealed)(s.extLimits??=[]).push({kind:'g627Stay',ref:{uid:x.uid,incarnation:x.incarnation||0},
   expires:'start',who:t.p,...(t.destroyOnly?{destroyOnly:true}:{}),...(t.spell?{source:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{})});
 }
 function namedLock1643(s,p,names){return (s.extLimits||[]).some(l=>l.kind==='g1643NamedCreatureLock'&&l.player===p&&l.names.some(n=>names.includes(n))&&!api.spellIgnored(s,{type:'spell',spellSource:l.spellSource,cost:l.spellCost}));}
 function nextOpponentStay1643(s,p){return (s.extLimits||[]).some(l=>l.kind==='g1643NextOpponentStay'&&l.player===p&&s.active===l.who&&s.players[l.who].turns>l.afterTurns&&!api.spellIgnored(s,{type:'spell',spellSource:l.spellSource,cost:l.spellCost}));}
 function sourceHost474(s,t){if(!t)return null;for(const p of[0,1]){const x=s.players[p].battle.find(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)));if(x)return{p,x};}return null;}
 function manaEvolution1701(s,p,host,y,max){
  if(!host||!s.players[p].battle.includes(host)||host.sealed||host.faceDown||!api.isCreature(s,host)||y.faceDown||!api.canMoveZone(s,p,'mana'))return false;
  const c=api.zoneCard(s,p,y,'mana');
  if(c.type!=='creature'||cost(c)>max||c.manaEvolution||c.graveEvolution||c.ultraEvolution||!api.canEnter(s,p,c,{origin:'mana',execution:false}))return false;
  const multi=c.g31Evolution;
  // The effect specifies this one creature as the entire base. GV/V and
  // grave/deck evolution cannot add different creatures to that base.
  if(multi){
   if(multi.zone!=='battle'&&!multi.zones?.includes('battle')||multi.conditions?.length!==1||multi.minCards&&api.allLayers(host).length<multi.minCards)return false;
   return api.matchesEvolution(host,multi.conditions[0],s);
  }
  const condition=c.evolution||c.neoEvolution;
  return !!condition&&api.matchesEvolution(host,condition,s);
 }
 function queenCandidate1701(x){const all=faces(card(x));return all.every(c=>c.type!=='creature')&&all.some(c=>cost(c)<=6);}
 function entryFight624(s,t){
  const own=sourceHost474(s,t),enemy=sourceHost474(s,t.enemy);
  return own&&enemy&&own.p!==enemy.p&&[own.x,enemy.x].every(x=>!x.sealed&&api.isCreature(s,x))?[own,enemy]:null;
 }
 // Public history counts creatures, not repeated untaps. Evolution keeps a creature's identity.
 function recordUntap472(s,p,x){if(x.sealed||!api.isCreature(s,x)||!s.players[p].battle.includes(x))return;const refs=api.allLayers(x).map(key),h=s.g472Untapped?.turn===s.turn?s.g472Untapped:(s.g472Untapped={turn:s.turn,groups:[]}),seen=h.groups.filter(xs=>xs.some(k=>refs.includes(k)));if(seen.length){for(const xs of seen)for(const k of refs)if(!xs.includes(k))xs.push(k);}else h.groups.push(refs);}
 // These resolved reductions expire on the next matching use, including free uses.
 function reductionMatches456(c,r){const f=r.filter||{};return !c.crossing&&(!r.type||c.type===r.type)&&(!f.race||race(c,f.race))&&(!f.color||colors(c).includes(f.color))&&(!f.g756Colorless||colors(c).length===0)&&(f.minPower===undefined||c.power==='∞'||Number(c.power)>=f.minPower);}
 const reductions456=(s,p,c)=>(s.extLimits||[]).filter(r=>r.kind==='g456NextReduction'&&r.player===p&&r.turn===s.turn&&reductionMatches456(c,r));
 function reductionRange456(s,p,c){
  let min=0,max=0,zero=0;
  for(const r of reductions456(s,p,c)){
   if(!r.optional)min+=r.amount;
   if(r.g1113ZeroFloor)zero+=r.amount;
   max+=r.amount;
  }
  return {min,max,zero};
 }
 function nextReduction456(s,p,c){
  const {min,max,zero}=reductionRange456(s,p,c);
  const amount=c.g456Reduction===undefined?max:Math.min(max,Math.max(min,c.g456Reduction));
  return {amount,zeroAmount:Math.min(zero,amount-min)};
 }
 function consumeReduction456(s,p,c){if(!s.extLimits?.some(r=>r.kind==='g456NextReduction'))return;s.extLimits=(s.extLimits||[]).filter(r=>!(r.kind==='g456NextReduction'&&r.player===p&&r.turn===s.turn&&reductionMatches456(c,r)));}
 // New optional auras choose their combined reduction independently for each summon.
 function summonAuras560(s,p,c){const out={mandatory:0,optional:0,zeroMandatory:0,zeroOptional:0};if(c.type!=='creature'||c.crossing)return out;const fits=f=>
  (!f.g990PrintedNoAbilities||matches(s,p,{cardId:c.id,uid:c.executionUid},{g990PrintedNoAbilities:true}))&&(!f.g1123ManaBirthFromMana||c.summonOrigin==='mana'&&c.g296ManaBirth!==undefined&&cost(c)>0)&&(!f.g836NameIds||f.g836NameIds.includes(c.id)||c.g1059DoubleCross)&&(!f.g832NameIncludes||exactName(creatureFaceName(c)).includes(f.g832NameIncludes))&&(!f.g756Colorless||colors(c).length===0)&&(!f.any||f.any.some(fits))&&(!f.race||race(c,f.race))&&(!f.raceAny||f.raceAny.some(q=>race(c,q)))&&(!f.color||colors(c).includes(f.color))&&(!f.evolution||api.isEvolution({cardId:c.id})||!!c.neoEvolution&&!!c.g27BaseUid)&&(f.minPower===undefined||c.power==='∞'||Number(c.power)>=f.minPower)&&(f.min===undefined||cost({...c,cost:c.printedCost??c.cost})>=f.min)&&(f.max===undefined||cost({...c,cost:c.printedCost??c.cost})<=f.max);
  for(const who of[p,1-p])for(const x of s.players[who].battle){if(x.sealed)continue;const d=effective(x,s);for(const r of[...(d.g290SummonAura?[d.g290SummonAura]:[]),...(d.g349SummonAuras||[])]){if(!api.isCreature(s,x)&&!(r.g560Element&&d.type==='seed')&&!(r.g560D2Field&&d.type==='field'&&d.d2Field)&&!(r.g1480Fortress&&d.type==='field'&&d.dragheart)&&!(r.g1635Lunar&&d.type==='field'&&d.g1635Lunar)&&!(r.g1789Dragonic&&d.type==='field'&&d.g1789Dragonic)||who!==p&&!r.both)continue;const match=r.filter?fits(r.filter):r.neo?!!c.neoEvolution:r.color?colors(c).includes(r.color):race(c,r.race);if(!match)continue;let state=s;if(r.g560InUse&&who===p&&(c.summonOrigin||'hand')==='hand'){const uid=c.executionUid??s.players[p].hand.find(y=>y.cardId===c.id)?.uid;state={...s,players:s.players.map((v,q)=>q===p?{...v,hand:v.hand.filter(y=>y.uid!==uid)}:v)};}if(r.condition&&!ownCondition(state,who,r.condition))continue;
   const count=r.g912CountRace?creatures(s,who).filter(y=>!y.sealed&&race(effective(y,s),r.g912CountRace)).length:1;
   const amount=r.amount*count;
   out[r.g560Optional?'optional':'mandatory']+=amount;
   if(r.g756ZeroFloor)out[r.g560Optional?'zeroOptional':'zeroMandatory']+=amount;
  }}
  return out;
 }
 function payAura560(s,t){const max=summonAuras560(s,t.p,t.c).optional,choices=[];for(let amount=max;amount>=0;amount--){const c={...t.c,g560Handled:true,g560Amount:amount};if(api.canPay(s,t.p,c)){const n=api.summonCost(s,t.p,c);choices.push(opt((amount?amount+'軽減する':'軽減しない')+'（'+n+'マナ）',amount,100-n*5,t.source));}}choice(s,t,'召喚コストの軽減量を選ぶ',[...choices,opt('召喚をやめる',false,-1000)]);}
 // Count all summons, including ones before an aura entered, using the executed face's colors.
 function recordSummon463(s,p,c){
  if(c.type!=='creature')return;
  const prev=s.g463Summons?.[p],r=prev?.turn===s.turn?prev:{turn:s.turn,n:0,colors:{}};
  r.n++;
  if(cost(c)>=8)r.costEightOrMore=true;
  for(const color of new Set(colors(c)))r.colors[color]=(r.colors[color]||0)+1;
  (s.g463Summons??=[null,null])[p]=r;
 }
 function firstSummonMax463(s,p,c,mandatoryOnly=false){if(c.type!=='creature'||c.crossing)return 0;const history=s.g463Summons?.[p],seen=history?.turn===s.turn?history:null;return creatures(s,p).filter(x=>!x.sealed).reduce((n,x)=>{const r=effective(x,s).g463FirstSummon;return n+(r&&(!mandatoryOnly||r.mandatory)&&(!r.colors.length?!seen?.n:r.colors.some(q=>colors(c).includes(q))&&!r.colors.some(q=>seen?.colors[q]))?r.amount:0);},0);}
 function firstSummonDiscount463(s,p,c){const max=firstSummonMax463(s,p,c);return c.g463Reduction===undefined?max:Math.min(max,Math.max(firstSummonMax463(s,p,c,true),c.g463Reduction));}
 const discardCount1235=(s,p)=>s.g1235Discards?.[p]?.turn===s.turn?s.g1235Discards[p].n:0;
 function firstDiscardOptions1268(s,t){
  const grave=s.players[t.p].grave;
  if(!api.canMoveZone(s,t.p,'grave'))return [];
  return t.refs.flatMap(ref=>{
   const x=grave.find(y=>y.uid===ref.uid&&(y.zoneSerial||0)===ref.serial&&!y.faceDown);
   if(!x)return [];
   return faces(card(x)).flatMap((face,index)=>{
    if(cost(face)>5)return [];
    if(face.type==='spell'&&api.canCast(s,t.p,face,'grave'))
     return [opt(face.name+'を唱える',{uid:x.uid,face:index,type:'spell'},20+cost(face),x.cardId)];
    if(face.type==='creature'&&canPut(s,t.p,x,'grave'))
     return [opt(face.name+'を出す',{uid:x.uid,face:index,type:'creature'},20+cost(face),x.cardId)];
    return [];
   });
  });
 }
 // A card being used from its counted zone is held aside before computing its cost.
 function countDiscountMax499(s,p,c){
  const t=c.g212CountDiscount;
  if(!t)return 0;
  if(t.fixed!==undefined)return t.fixed;
  const owner=t.owner==='opponent'?1-p:p;
  if(t.g753AllMana)return s.players[owner].mana.length*t.amount;
  if(t.zone==='draws')return(s.players[owner].drawsThisTurn||0)*t.amount;
  if(t.zone==='discards')return discardCount1235(s,owner)*t.amount;
  if(t.zone==='summonsOrSpells'){
   const summon=s.g463Summons?.[owner],spell=s.g37Spells?.[owner];
   return ((summon?.turn===s.turn?summon.n:0)+(spell?.turn===s.turn?spell.n:0))*t.amount;
  }
  if(t.zone==='spellsOrTamaseeds'){
   const use=s.g1224Uses?.[owner];
   return (use?.turn===s.turn?use.ownUses||0:0)*t.amount;
  }
  if(t.zone==='shields'){const shields=s.players[owner].shields;return(typeof shields==='number'?shields:shields.length)*t.amount;}
  const count=owner=>(t.zones??[t.zone]).reduce((total,zone)=>total+(s.players[owner][zone]||[]).filter(x=>
   !x.faceDown&&!((t.excludeExecutingCard||t.optional||t.minimum===2||t.minimum===0)&&owner===p&&c.summonOrigin===zone&&x.uid===c.executionUid)&&
   (zone!=='battle'||!x.sealed&&(t.g557Elements?['creature','seed','gear','field','aura'].includes(api.zoneCard(s,owner,x).type):api.isCreature(s,x)))&&
   matches(s,owner,x,t.filter)).length,0);
  return Math.min(t.max??Infinity,(t.owner==='both'?count(p)+count(1-p):count(owner))*t.amount);
 }
 function payCount499(s,t){const choices=[],max=countDiscountMax499(s,t.p,t.c);for(let amount=max;amount>=0;amount--){if(t.c.g212CountDiscount.fullOrNone&&amount!==0&&amount!==max)continue;const c={...t.c,g499Handled:true,g499Reduction:amount};if(api.canPay(s,t.p,c)){const n=api.summonCost(s,t.p,c);choices.push(opt((amount?amount+'軽減する':'軽減しない')+'（'+n+'マナ）',amount,100-n*5,t.source));}}choice(s,t,t.c.type==='spell'?'呪文の軽減量を選ぶ':'召喚の軽減量を選ぶ',[...choices,opt(t.c.type==='spell'?'唱えるのをやめる':'召喚をやめる',false,-1000)]);}
 // Apply higher floors before the independent one-mana-floor reductions.
 function sympathyAmount500(s,p,c){
  const r=c.g211Sympathy;
  if(!r)return 0;
  if(r.zone==='shields')return s.players[p].shields.flatMap(api.shieldCards).filter(x=>x.faceUp).length*r.amount;
  if(r.g1632SameRace)return creatures(s,p).filter(x=>!x.sealed&&!x.faceDown&&sharesRace(effective(x,s,true),c)).length*r.amount;
  return s.players[p].battle.filter(x=>!x.sealed&&(r.filter.seed?(card(x).type==='seed'||card(x).natureAce4):
   (r.elements?!x.faceDown:api.isCreature(s,x))&&matches(s,p,x,r.filter))).length*r.amount;
 }
 function floorOptions500(s,p,c){let sums=new Set([0]);if(c.type!=='creature'||c.crossing)return[0];for(const x of creatures(s,p)){const r=!x.sealed&&effective(x,s).g500SummonAura;if(!r||r.filter.race&&!race(c,r.filter.race)||r.filter.multi&&colors(c).length<2)continue;const amounts=r.exact?[0,r.amount]:Array.from({length:r.amount+1},(_,i)=>i);sums=new Set([...sums].flatMap(n=>amounts.map(m=>n+m)));}return[...sums].sort((a,b)=>b-a);}
 function payFloor500(s,t){const choices=[];for(const amount of floorOptions500(s,t.p,t.c)){const c={...t.c,g500Handled:true,g500Amount:amount};if(api.canPay(s,t.p,c)){const n=api.summonCost(s,t.p,c);choices.push(opt((amount?amount+'軽減する':'軽減しない')+'（'+n+'マナ）',amount,100-n*5,t.source));}}choice(s,t,'最低2マナの軽減量を選ぶ',[...choices,opt('召喚をやめる',false,-1000)]);}
 // Optional continuous spell reductions are chosen for each paid cast, including zero use.
 function spellReductionMax485(s,p,c){
  if(!['spell','aura'].includes(c.type)||c.crossing)return 0;
  const self=c.type==='spell'&&c.g985SpellReduction;
  const ownReduction=self&&ownCondition(s,p,self.filter)?self.amount:0;
  return creatures(s,p).filter(x=>!x.sealed).reduce((n,x)=>{
   const source=effective(x,s),shared=source.g1517SpellAuraReduction||0;
   if(c.type==='aura')return n+shared;
   const r=source.g485SpellReduction;
   if(typeof r==='number')return n+r+shared;
   if(!r||r.color&&!colors(c).includes(r.color)||r.knightMagic&&!hasKnightMagic(c))return n+shared;
   return n+shared+(r.g1470BattleCount?creatures(s,p).filter(y=>!y.sealed&&matches(s,p,y,r.g1470BattleCount)).length:r.amount);
  },ownReduction);
 }
 function spellReduction485(s,p,c){const max=spellReductionMax485(s,p,c);return c.g485Amount===undefined?max:Math.max(0,Math.min(max,c.g485Amount));}
 function overdrive1439(s,t){
  const old=t.args[4],base={...t.c,...(typeof old==='object'?old:old!==null?{cost:old}:{}),printedCost:t.c.cost},choices=[];
  for(let mask=0;mask<(1<<t.c.g1439ODrive.options.length);mask++){
   const payment={...base,...overdrivePayment1439(base,mask)};
   if(!api.canPay(s,t.p,payment))continue;
   const colors=payment.g1439TextColors.join('・');
   choices.push(opt((mask?'O・ドライブ '+colors:'追加で支払わない')+'（'+api.summonCost(s,t.p,payment)+'マナ）',mask,mask?20:0,t.source));
  }
  choice(s,t,'O・ドライブの追加コストを選ぶ',[...choices,opt('使用をやめる',false,-1000)]);
 }
 function paySpell485(s,t){const max=spellReductionMax485(s,t.p,t.c),choices=[];for(let amount=max;amount>=0;amount--){const c={...t.c,g485Handled:true,g485Amount:amount};if(api.canPay(s,t.p,c)){const n=api.summonCost(s,t.p,c);choices.push(opt((amount?amount+'軽減する':'軽減しない')+'（'+n+'マナ）',amount,100-n*5,t.source));}}choice(s,t,t.c.type==='aura'?'オーラの軽減を使う量を選ぶ':'呪文の軽減を使う量を選ぶ',[...choices,opt('唱えるのをやめる',false,-1000)]);}
 // The card being summoned is in use, so a different physical hand card must be revealed.
 function revealCards470(s,p,c){const rule=c.g470RevealReduction;if(!rule)return[];const source=c.executionUid??((c.summonOrigin||'hand')==='hand'?s.players[p].hand.find(x=>x.cardId===c.id)?.uid:null);return s.players[p].hand.filter(x=>x.uid!==source&&(rule.evolution?api.isEvolution(x)||faces(card(x)).some(f=>f.evolution||f.g48HandEvolution||f.sMax):faces(card(x)).some(f=>cost(f)>=rule.min)));}
 function revealPayment470(s,t){const payment={...t.c,...(typeof t.args[4]==='object'?t.args[4]:t.args[4]!==null?{cost:t.args[4]}:{}),printedCost:t.c.cost},rows=revealCards470(s,t.p,payment),selected=rows.find(x=>x.uid===t.revealed);if(selected){const rule=payment.g470RevealReduction,n=creatures(s,1-t.p).some(x=>effective(x,s).noCostReduction)?0:rule.amount,amounts=rule.exact?[n]:Array.from({length:n+1},(_,i)=>n-i);choice(s,t,rule.exact?'手札を見せて召喚する？':'軽減する量を選ぶ',amounts.filter(amount=>api.canPay(s,t.p,{...payment,g470Handled:true,g470Revealed:selected.uid,g470Amount:amount})).map(amount=>{const c={...payment,g470Handled:true,g470Revealed:selected.uid,g470Amount:amount};return opt(amount+'軽減して召喚（'+api.summonCost(s,t.p,c)+'マナ）',amount,amount*10+5,selected.cardId);}).concat([opt('召喚をやめる',false,-1000)]));return;}const plain={...payment,g470Handled:true,g470Amount:0};choice(s,{...t,revealed:null},payment.g470RevealReduction.evolution?'進化クリーチャーを手札から1体見せる？':'コスト7以上の手札を1枚見せる？',[...rows.map(x=>opt(card(x).name,x.uid,20,x.cardId)),...(api.canPay(s,t.p,plain)?[opt('見せずに召喚する（'+api.summonCost(s,t.p,plain)+'マナ）',null,0)]:[]),opt('召喚をやめる',false,-1000)]);}
 // Optional reductions can be saved for a later execution. Each psychic face has its own ability.
 const onceTurnField464=(x,r)=>r.execution&&x.g1085Awakened?'g464BackUsedTurn':'g464UsedTurn';
 function onceProviders464(s,p,c){
  if(c.crossing||creatures(s,1-p).some(x=>effective(x,s).noCostReduction))return[];
  return creatures(s,p).filter(x=>{
   const r=!x.sealed&&effective(x,s).g464OnceSummon;
   return r&&(r.execution||c.type==='creature')&&x[onceTurnField464(x,r)]!==s.turn&&
    (!r.race||race(c,r.race))&&(!r.colors||r.colors.some(q=>colors(c).includes(q)))&&
    (!r.nameIncludes||exactName(c.name||'').includes(r.nameIncludes));
  });
 }
 function selectedOnce464(s,p,c){return onceProviders464(s,p,c).filter(x=>c.g464Reducers===undefined||c.g464Reducers.includes(key(x)));}
 function onceDiscount464(s,p,c){
  let summon=0,execution=0;
  for(const x of selectedOnce464(s,p,c)){
   const rule=effective(x,s).g464OnceSummon;
   if(rule.execution)execution+=rule.amount;
   else summon+=rule.amount;
  }
  return {summon,execution};
 }
 function consumeOnce464(s,p,c,execution){
  if(execution&&c.g464Reducers===undefined)return;
  for(const x of selectedOnce464(s,p,c)){
   const rule=effective(x,s).g464OnceSummon;
   if(!!rule.execution===execution)x[onceTurnField464(x,rule)]=s.turn;
  }
 }
 function payOnce464(s,t){
  const rows=onceProviders464(s,t.p,t.c),selected=t.selected.filter(k=>rows.some(x=>key(x)===k));
  const payment={...t.c,g464Reducers:selected},n=api.summonCost(s,t.p,payment),options=[];
  for(const x of rows){
   if(selected.includes(key(x)))continue;
   const cheaper=api.summonCost(s,t.p,{...payment,g464Reducers:[...selected,key(x)]})<n;
   if(cheaper||!effective(x,s).g464OnceSummon.execution)options.push(opt(card(x).name+'の軽減を使う',key(x),cheaper?20:-5,x.cardId));
  }
  const action={creature:'召喚する',spell:'唱える',gear:'ジェネレートする'}[t.c.type]||'実行する';
  const cancel={creature:'召喚を',spell:'唱えるのを',gear:'ジェネレートを'}[t.c.type]||'実行を';
  if(api.canPay(s,t.p,payment))options.push(opt('この軽減で'+action,null,5));
  options.push(opt(cancel+'やめる',false,-1000));
  choice(s,{...t,selected},'今回使う軽減を選ぶ（支払うコスト：'+n+'）',options);
 }
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
 const battleNames676=(s,x)=>{
  const p=s.players.findIndex(owner=>owner.battle.includes(x));
  const identity=p<0?card(x):api.zoneCard(s,p,x,'battle');
  const parts=x.godLinks?.length?[x,...x.godLinks].map(y=>creatureFaceName(card(y.cardId))):[creatureFaceName(identity)];
  return [...parts,...(identity.additionalNames||[])].map(exactName);
 };
 const attackNames1081=(s,x)=>battleNames676(s,x);
 function chainMatches838(s,rows,chosen){
  const names=new Set(battleNames676(s,chosen));
  return [chosen,...rows.filter(y=>y!==chosen&&battleNames676(s,y).some(name=>names.has(name)))];
 }
 function chainOptions838(s,p){
  const rows=creatures(s,1-p).filter(y=>!y.sealed);
  return targetOptions(s,p,rows).map(o=>({...o,score:chainMatches838(s,rows,rows.find(y=>y.uid===o.value))
   .reduce((n,y)=>n+10+cost(effective(y,s))*2+api.power(y,false,s)/3000,0)}));
 }
 function tapNames676(s,target){
  const names=new Set(battleNames676(s,target));
  const rows=[0,1].flatMap(p=>creatures(s,p).filter(y=>!y.sealed&&battleNames676(s,y).some(n=>names.has(n))).map(y=>[p,y]));
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
 // Attack-start hand triggers run before this attack is added to g481Attackers.
 function chanceMatches419(s,p,x,w){if(w.g1679LaterAttack&&(s.g481Attackers?.turn!==s.turn||s.g481Attackers.events.filter(e=>e.p===p).length<1))return false;const name=creatureFaceName(effective(x,s));return(!w.name||name.includes(w.name))&&(!w.g201ExactName||exactName(name)===exactName(w.g201ExactName))&&matches(s,p,x,{...w,g199Power:true});}
 function graveCreatureName614(s,p,c){
  const name=exactName(creatureFaceName(c));
  return s.players[p].grave.some(x=>!x.faceDown&&faces(api.zoneCard(s,p,x,'grave')).some(f=>f.type==='creature'&&exactName(creatureFaceName(f))===name));
 }
 // Smash Burst follows the same physical card through its first zone change (QA48746).
 function smashSource320(s,t){for(const origin of['battle','hand','grave','mana','deck','extra']){const xs=origin==='battle'?s.players[t.p].battle.flatMap(api.allLayers):s.players[t.p][origin],x=xs.find(x=>x.uid===t.uid);if(x&&(origin==='battle'?(x.incarnation||0)===(t.incarnation||0):(x.zoneSerial||0)===(t.serial||0)+1))return{origin,x};}return null;}
 function friendBurstCandidates(s,t){
  const host=sourceHost474(s,t)?.x;
  return creatures(s,t.p).filter(y=>y.uid!==host?.uid&&y.uid!==t.uid&&!y.tapped&&!y.sealed&&!y.faceDown&&
   race(effective(y,s,true),t.race));
 }
 const send=(s,p,x,op,more={},deferred)=>{
  const source=x.g1357Copies?.at(-1)?.definition.id??x.cardId;
  api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source,effect:'extended',
   task:task('g34_'+op,p,source,{uid:x.uid,incarnation:x.incarnation||0,...more})},deferred);
 };
 function applyParityCombat1565(s,t,parity){const player=1-t.p,refs=creatures(s,player).filter(x=>!x.sealed).flatMap(x=>api.allLayers(x).map(y=>({uid:y.uid,incarnation:y.incarnation||0})));if(refs.length)api.lock(s,t.p,{kind:'g1315ParityCombat',player,refs,parity,...(t.untilEnd?{expires:'end',who:s.active}:{})});}
 function bioKScore(s,p,source){
  const {recovery,effect}=card(source).g953BioK??{};
  const own=s.players[p],opp=s.players[1-p];
  if(effect?.op==='AttackGrant399'){
   const attacker=own.battle.find(x=>x.uid===s.attack?.attacker);
   const breaker=attacker&&effective(attacker,s).breaker;
   return attacker&&opp.shields.length>1&&(breaker??1)<2&&breaker!=='∞'?6:-5;
  }
  if(effect?.g506PowerBudget!==undefined){
   const rows=creatures(s,1-p).filter(x=>!x.sealed&&fitsPower506(s,effect,x));
   return targetOptions(s,p,rows).length?6:-5;
  }
  return (recovery?own.grave.some(x=>matches(s,p,x,recovery.filter)):own.deck.length>2)?6:-5;
 }
 function declareHandBio(s,t){
  const rows=s.players[t.p].hand.filter(x=>t.ids.includes(x.uid)),remaining=rows.filter(x=>!t.selected.includes(x.uid));
  const keyword=t.battle?'バイオ・T':'バイオ・K';
  if(remaining.length&&!t.done){
   choice(s,t,'使用を宣言する'+keyword+'を選ぶ',[
    ...remaining.map(x=>opt(card(x).name,x.uid,t.battle?6:bioKScore(s,t.p,x),x.cardId)),
    opt('宣言を確定',null,0)
   ]);
   return;
  }
  const declared=t.battle?t.selected.map(uid=>rows.find(x=>x.uid===uid)).filter(Boolean):
   rows.filter(x=>t.selected.includes(x.uid));
  for(const source of declared){
   api.log(s,t.p,'reveal',card(source).name+'の'+keyword+'を宣言',{cardId:source.cardId});
   if(!t.battle)send(s,t.p,source,'BioK951',{serial:source.zoneSerial||0,
    ...(card(source).g953BioK?.effect?.op==='BioKAttackerSearch1081'?{g399Attacker:t.g399Attacker}:{})});
  }
  if(t.battle)put(s,...declared.map(x=>task('g34_BioT952',t.p,x.cardId,{
   uid:x.uid,serial:x.zoneSerial||0,attacker:t.battle.attacker,...(card(x).g952BioT?.bounceBattle?{defender:t.battle.defender}:{})
  })),task('g34_BioBattle952',t.p,t.source,t.battle));
 }
 const bioBattleUnit=(s,ref)=>s.players[ref.p].battle.find(x=>
  x.uid===ref.uid&&(x.incarnation||0)===ref.incarnation&&!x.sealed&&api.isCreature(s,x));
 const tasks=(p,source,defs,more={})=>(defs||[]).map(d=>{
  const op=/^(?:g35_|g393[CDJP]_|g9Number$)/.test(d.op)?d.op:'g34_'+d.op;
  return task(op,p,source,{...more,...d,op,p:d.p??p,source});
 });
 const start=(s,t,defs)=>put(s,...tasks(t.p,t.source,defs,{uid:t.uid,incarnation:t.incarnation||0,controller:t.controller??t.p,moved:t.moved||0,...(t.g1772CarrierCost!==undefined?{g1772CarrierCost:t.g1772CarrierCost}:{}),...(t.g1771HostCost!==undefined?{g1771HostCost:t.g1771HostCost}:{}),...(t.lastKnownCount!==undefined?{lastKnownCount:t.lastKnownCount}:{}),...(t.g692LastPower!==undefined?{g692LastPower:t.g692LastPower}:{}),...(t.g1184LastRaces!==undefined?{g1184LastRaces:t.g1184LastRaces}:{}),...(t.g1059LastEvolution!==undefined?{g1059LastEvolution:t.g1059LastEvolution}:{}),...(t.g1064LastTapped!==undefined?{g1064LastTapped:t.g1064LastTapped}:{}),...(t.g694Defender?{g694Defender:t.g694Defender}:{}),...(t.g399Attacker?{g399Attacker:t.g399Attacker}:{})}));
 function auraHost1808(s,t){
  const ref=t.host;if(!ref)return null;
  return s.players[t.p].battle.find(x=>!x.sealed&&!x.faceDown&&api.isCreature(s,x)&&
   [...api.allLayers(x),...(x.g47ElementRefs||[])].some(r=>r.uid===ref.uid&&(r.incarnation||0)===(ref.incarnation||0)));
 }
 // Delayed effects retain the attacking creature, independently of the watcher.
 const attackHost408=(s,t)=>t.g399Attacker&&s.players[t.p].battle.find(y=>api.allLayers(y).some(z=>z.uid===t.g399Attacker.uid&&(z.incarnation||0)===t.g399Attacker.incarnation));
 function tapSource748(s,t){
  const host=sourceHost474(s,t);
  return host?.p===t.p&&!host.x.tapped&&!host.x.sealed&&api.isCreature(s,host.x)?host.x:null;
 }
 // Hand-evolution GV is an evolution card even before its bases are attached; NEO requires a base.
 const livePower199=(s,x,inCombat)=>api.power(x,!!inCombat&&(x.uid===s.attack?.attacker||x.uid===s.attackLifecycle?.uid&&(x.incarnation||0)===(s.attackLifecycle.incarnation||0)),s);
 const evolutionOrLinkedGod=(x,c)=>api.isEvolution(x)||!!(x.godLinks?.length&&race(c,'ゴッド'));
 const physicalVictory1686=x=>[x,...(x.godLinks||[])].some(y=>hasVictoryRarity1686(card({...y,godLinks:null,g1357Copies:null,g393JCopies:null}).name));
 const cJoe1704=x=>card(x).joeDiscount!==undefined;
 function matches(s,p,x,f={}){
  if(f.g1704Joe&&!cJoe1704(x))return false;
  if(f.g1686Victory&&!physicalVictory1686(x))return false;
  if(f.g939ShieldForce&&(api.ignored(s,x)||!effective(x,s).g1304ShieldForce&&!effective(x,s).g1486ShieldForce&&!hasCopiedRole393(card(x),'g35Role','galaxy')))return false;
  if(f.g951ManaCivilizationCost&&cost(effective(x,s))>manaCivilizationCount(s,p))return false;
  const c=api.zoneCard(s,p,x),d=s.players[p].battle.includes(x)?effective(x,s):c;
  if(f.g1826Element&&!['creature','seed','field','gear','aura','weapon','duelist'].includes(d.type))return false;
  if(f.g1813LinkedGod&&(!x.godLinks?.length||!race(d,'ゴッド')))return false;
  if(f.g1705CreatureNameIncludes&&!faces(c).some(face=>face.type==='creature'&&[face.name,...(face.g1705RubyNameParts||[])].some(name=>name.includes(f.g1705CreatureNameIncludes))))return false;
  if(f.g1705ExactBattleName&&!battleNames676(s,x).includes(exactName(f.g1705ExactBattleName)))return false;
  if(f.g1490Exile&&!c.g1490Exile)return false;
  if(f.g1579AnyFaceTrigger&&!faces(c).some(face=>face.trigger||face.triggerPlus||face.superTrigger))return false;
  if(f.g1537LinkedGod&&(!race(d,'ゴッド')||!x.godLinks?.length))return false;
  if(f.g1535Duelist&&!c.g1367Duelist&&c.type!=='duelist')return false;
  if(f.g1535Duelmate&&!d.g1367Duelmate)return false;
  if(f.multicolor&&colors(d).length<2)return false;
  if(f.g1321ManaCivilizations){
   const present=new Set(s.players[p].mana.flatMap(y=>
    api.manaColors(card(y),s,p)));
   if(!colors(c).every(color=>present.has(color)))return false;
  }
  if(f.g990PrintedNoAbilities){
   const printed=card(x).text;
   if(typeof printed!=='string')return false;
   const abilities=printed.split(/【呪文(?:面|側)】/,1)[0].trim();
   const legacyMana=f.g1113LegacyManaText&&colors(card(x)).length>1&&
    /^(?:このカードを)?マナゾーンに置く時、?(?:このカードは)?タップして置く。?$/.test(abilities.normalize('NFKC'));
   if(abilities&&abilities!=='能力なし'&&!legacyMana)return false;
  }
  // Match the printed evolution requirement, not the searched card's own race.
  if(f.g1679DragonEvolution){const hasDragon=r=>!!r&&(String(r.race||r.category||'').includes('ドラゴン')||(r.any||[]).some(hasDragon));if(![c.evolution,c.neoEvolution,...(c.g31Evolution?.conditions||[])].some(hasDragon))return false;}
  if(f.g1264RevealedMin!==undefined&&api.revealedPower(x,s)<f.g1264RevealedMin)return false;
  if(f.g1264RevealedMax!==undefined&&api.revealedPower(x,s)>f.g1264RevealedMax)return false;
  if(f.g717Silent&&!d.g496Silent)return false;
  if(f.g1236AnyFaceMax!==undefined&&!faces(c).some(face=>cost(face)<=f.g1236AnyFaceMax))return false;
  const exactCost=f.manaCostOffset===undefined?f.g1134AnyFaceCost:s.players[p].mana.length+f.manaCostOffset;
  if(exactCost!==undefined&&!faces(c).some(face=>cost(face)===(exactCost==='∞'?Infinity:exactCost)))return false;
  if(f.g1697KingMaster&&!hasKingMasterRarity1697(c.name))return false;if(f.g1451Dragheart&&!c.dragheart)return false;if(f.g1428Gr!==undefined&&!!c.gr!==f.g1428Gr)return false;if(f.g1085Psychic!==undefined&&!!c.psychic!==f.g1085Psychic)return false;if(f.g853Soul&&!hasSoul(c,f.g853Soul))return false;if(f.g508EvolutionOrLink&&!evolutionOrLinkedGod(x,c))return false;const faceMax=f.g228Face?.g815ManaCivilCost?manaCivilizationCount(s,p):f.g228Face?.max;return (!f.g784ShieldTrigger||d.trigger||d.triggerPlus||d.superTrigger)&&(!f.g746Bad||!!d.bad)&&(!f.g724ExactRace||exactRaces(d).includes(f.g724ExactRace))&&(!f.g819CreatureNameIncludes||battleNames676(s,x).some(name=>name.includes(f.g819CreatureNameIncludes)))&&(!f.g819AnyFaceRace||faces(c).some(face=>exactRaces(face).includes(f.g819AnyFaceRace)))&&(!f.g670Guardman||d.guardman)&&(!f.g661ShieldGo||d.shieldGo)&&(!f.g614GraveCreatureName||graveCreatureName614(s,p,d))&&(!f.g600OverMana||cost(d)>s.players[p].mana.length)&&(!f.g596EnteredThisTurn||(x.originalEntryTurn??x.entered)===s.turn)&&(!f.g587PowerEnding500||currentPower506(s,x)%1000===500)&&(!f.faceUp||!x.faceDown)&&(!f.g556Neo||!!c.neoEvolution)&&(!f.g539JokerCard||faces(c).some(c=>race(c,'ジョーカーズ')))&&(!f.g415Mugen||faces(c).some(c=>c.mugenCrime>0))&&(!f.g412ExceptName||faces(c).every(face=>String(face.name||'').normalize('NFKC').replace(/\s/g,'')!==f.g412ExceptName.normalize('NFKC').replace(/\s/g,'')))&&(!f.g295Tamaseed||c.type==='seed'||!!c.seedCreature||!!c.natureAce4)&&(!f.g228Face||faces(c).some(face=>face.type===f.g228Face.type&&(!f.g228Face.shieldTrigger||face.trigger||face.triggerPlus||face.superTrigger)&&(!f.g228Face.multicolor||colors(face).length>1)&&(!f.g228Face.color||colors(face).includes(f.g228Face.color))&&(!f.g228Face.exceptColor||!colors(face).includes(f.g228Face.exceptColor))&&(!f.g228Face.colorsAll||f.g228Face.colorsAll.every(color=>colors(face).includes(color)))&&(!f.g228Face.raceAll||f.g228Face.raceAll.every(q=>race(face,q)))&&(!f.g228Face.d2||face.d2Field===true)&&(!f.g228Face.nameAny||f.g228Face.nameAny.some(name=>face.name.includes(name)))&&(f.g228Face.min===undefined||cost(face)>=f.g228Face.min)&&(faceMax===undefined||cost(face)<=faceMax)&&(f.g228Face.minPower===undefined||face.power==='∞'||Number(face.power)>=f.g228Face.minPower)&&(f.g228Face.maxPower===undefined||Number(face.power)<=f.g228Face.maxPower)))&&(!f.g584MonoCard||new Set(faces(c).flatMap(colors)).size<=1)&&(!f.g223Multicolor||new Set(faces(c).flatMap(colors)).size>1)&&(!f.g220NameAny||f.g220NameAny.some(q=>faces(c).some(c=>c.name.includes(q))))&&(!f.g218Colored||colors(d).length>0)&&(!f.g217Colorless||faces(c).some(c=>colors(c).length===0))&&(!f.g217SpellColor||faces(c).some(c=>c.type==='spell'&&colors(c).includes(f.g217SpellColor)))&&(!f.g201Gear||c.type==='gear')&&(!f.g201ExactName||faces(c).some(y=>String(y.name||'').normalize('NFKC').replace(/\s/g,'')===f.g201ExactName.normalize('NFKC').replace(/\s/g,'')))&&(!f.g200Colorless||faces(c).every(c=>colors(c).length===0))&&(!f.anyFaceColor||faces(c).some(c=>colors(c).includes(f.anyFaceColor)))&&(f.anyFaceMinCost===undefined||faces(c).some(c=>cost(c)>=f.anyFaceMinCost))&&(!f.colorsAll||f.colorsAll.every(q=>colors(d).includes(q)))&&(!f.any||f.any.some(q=>matches(s,p,x,q)))&&(!f.seed||c.type==='seed')&&(!f.creature||d.type==='creature')&&(!f.nonCreature||faces(c).every(face=>face.type!=='creature'))&&(!f.nonCreatureElement||!api.isCreature(s,x))&&(!f.element||['creature','seed','gear','field','duelist','aura'].includes(c.type))&&(!f.nonEvolution||!api.isEvolution(x)&&!c.g48HandEvolution)&&(!f.evolution||api.isEvolution(x))&&(!f.blocker||api.matchesEvolution(x,{blocker:true},s))&&(!f.noColor||colors(d).length===0)&&(!f.creatureOrSeed||['creature','seed'].includes(c.type))&&(f.belowCost===undefined||cost(d)<(f.belowCost==='∞'?Infinity:f.belowCost))&&(!f.notRace||!race(d,f.notRace))&&(!f.race||race(d,f.race))&&(!f.raceAny||f.raceAny.some(q=>race(d,q)))&&(!f.name||c.name.includes(f.name))&&(!f.exactId||c.id===f.exactId)&&(!f.exactUid||x.uid===f.exactUid)&&(f.exactCost===undefined||cost(c)===(f.exactCost==='∞'?Infinity:f.exactCost))&&(f.belowPower===undefined||livePower199(s,x,f.g199Power)<(f.belowPower==='∞'?Infinity:f.belowPower))&&(!f.color||colors(d).includes(f.color))&&(!f.notColor||!colors(d).includes(f.notColor))&&(!f.multi||colors(d).length>1)&&(!f.g510NonMulticolor||colors(d).length<=1)&&(!f.anyFaceRace||faces(c).some(c=>race(c,f.anyFaceRace)))&&(!f.spell||faces(c).some(c=>c.type==='spell'))&&(!f.aura||c.type==='aura')&&(!f.twin||!!c.spellFace)&&(f.min===undefined||cost(d)>=f.min)&&(f.max===undefined||cost(d)<=f.max)&&(f.minPower===undefined||livePower199(s,x,f.g199Power)>=f.minPower)&&(f.maxPower===undefined||livePower199(s,x,f.g199Power)<=f.maxPower)&&(!f.untapped||!x.tapped)&&(!f.tapped||x.tapped);}
 function panyaCanReturn(s,x){
  const linked=x.godLinks||[];
  const evolution=[x,...linked].some(api.isEvolution);
  return !evolution||!linked.length&&race(effective(x,s),'ゴッド');
 }
 // Effect battles use the normal battle pipeline; choices retain physical incarnation.
 const fightSpellCost241=t=>t.spell?cost(faces(card(t.source)).at(-1)):undefined;
 const fightRows240=(s,p,owner,filter)=>targetOptions(s,p,creatures(s,owner).filter(x=>!x.sealed&&(!filter||matches(s,owner,x,filter))));
 const fightUnit240=(s,p,r,followEvolution=false)=>r&&creatures(s,p).find(x=>!x.sealed&&
  (followEvolution?api.allLayers(x):[x]).some(y=>y.uid===r.uid&&(y.incarnation||0)===r.incarnation));
 function fightAttacker240(s,t){
  if(t.g998EntryFight){
   const host=sourceHost474(s,t.fighter??t);
   return host&&!host.x.sealed&&api.isCreature(s,host.x)?host:null;
  }
  const p=t.fighterOwner??t.p,x=fightUnit240(s,p,t.fighter,t.g745FollowFighter);
  return x?{p,x}:null;
 }
 function cardMoveRows579(s,t){
  const rows=new Map();
  const zones=t.zones||['battle'];
  for(const p of t.anyOwner?[t.p,1-t.p]:[t.owner==='self'?t.p:t.owner??1-t.p]){
   const own=s.players[p],side=t.anyOwner?(p===t.p?'自分の':'相手の'):'';
   for(const origin of zones.filter(z=>z!=='battle'&&(z!=='hand'||p===t.p)&&(t.g970AfterMove||api.canMoveZone(s,p,z)))){
    const prefix=side+({mana:'マナ',grave:'墓地',hand:'手札'}[origin]||'手札')+'：';
    for(const [i,x] of own[origin].entries()){
     if(t.filter&&!matches(s,p,x,t.filter))continue;
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
     const physical=api.physicalBattleFace1355(top,x);
     const cell=physical.type==='cell'&&(physical.psychic||physical.g1367Duelmate);
     if(t.filter&&!matches(s,p,cell?{...x,psychicLinks:null,psychicCell:true}:x,t.filter))continue;
     if(t.g813NonEvolution&&!x.faceDown&&api.isEvolution(x))continue;
     const sealIndex=own.seals?.indexOf(x)??-1;
     const below=index>0&&!top.godLinks?.includes(x)&&!top.psychicLinks?.includes(x);
     if(linked&&!below&&!api.targetable(s,t.p,p,top))continue;
     if(t.nonCreature&&!cell&&!x.faceDown&&(below?faces(card(x)).some(c=>c.type==='creature'):api.isCreature(s,top)))continue;
     if(definition){
      const costs=x.faceDown||cell?[0]:below?faces(card(x)).map(cost):[cost(linked?card(x):definition)];
      if(!costs.some(n=>n>=(t.min??0)&&n<=(t.max??Infinity)))continue;
     }
     const name=x.faceDown?'裏向きのカード '+index:cell?card(x.cardId).name+(physical.g1367Duelmate?'（デュエルメイト・セル）':'（サイキック・セル）'):card(x).name;
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
   const {x,label,p,origin}=rows.get(o.value),score=x.faceDown?8:o.score;
   let value=p===t.p?-score:score;
   if(t.g970AfterMove){
    const returnsToDeck=t.to==='deck'&&origin==='grave'&&api.canMoveZone(s,p,origin);
    const followState=returnsToDeck?{...s,players:s.players.map((owner,i)=>i===p?
     {...owner,deck:[...owner.deck,x]}:owner)}:s;
    const followValue=modeScore(followState,t,t.g970AfterMove);
    const cost=origin==='grave'||!api.canMoveZone(s,p,origin)?0:origin==='mana'?5:score;
    value=followValue>=900||followValue<=-900?followValue:followValue-cost;
   }
   return opt(label,x.uid,value,x.faceDown?null:o.cardId);
  });
 }
 function moveSelectedCard581(s,t,row,to){
  const {p,x,origin}=row;
  if(origin==='battle')api.moveBattleCard(s,p,x.uid,to,{destroy:to==='grave'&&!t.g815PutInGrave,controller:t.controller??t.p,
   ...(t.toOwnerGrave?{destinationOwner:x.cardOwner??p,toOwnerGrave:true}:{}),...(t.toOwnerDeck?{destinationOwner:x.cardOwner??p,toOwnerDeck:true}:{}),...(t.toOwnerHand?{destinationOwner:x.cardOwner??p,toOwnerHand:true}:{})});
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
  if(rule.onlyCreature)return ownCondition(s,p,{g479OnlyCreature:true},x.uid,x.incarnation||0);
  if(rule.untapped)return !x.tapped;
  if(rule.anyPower)return true;
  const attacking=x.uid===s.attack?.attacker||x.uid===s.attackLifecycle?.uid&&(x.incarnation||0)===(s.attackLifecycle.incarnation||0);
  if((battlePower??api.power(x,attacking,s))<=0)return false;
  return !rule.lightMana||s.players[p].mana.filter(y=>!y.faceDown&&api.manaColors(api.zoneCard(s,p,y,'mana'),s,p).includes('光')).length>=rule.lightMana;
 }
 function allyStay1246(s,p,x,battlePower){
  if(s.active!==p||s.players[1-p].shields.length>2||x.sealed||!api.isCreature(s,x))return false;
  const source=s.players[p].battle.some(y=>!y.sealed&&!y.faceDown&&card(y).g1246AllyStay&&effective(y,s).g1246AllyStay);
  return source&&(battlePower??currentPower506(s,x))>0;
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
 function powerMinusScore242(s,t,y){
  const attacking=y.uid===s.attack?.attacker||y.uid===s.attackLifecycle?.uid&&(y.incarnation||0)===(s.attackLifecycle.incarnation||0);
  const before=api.power(y,attacking,s);
  const modifier={amount:t.power,spellSource:t.spell?t.source:undefined,spellCost:t.spell?cost(faces(card(t.source)).at(-1)):undefined};
  const after=api.power({...y,powerModifiers:[...(y.powerModifiers||[]),modifier]},attacking,s);
  if(after>=before)return -5;
  const targetCost=cost(card(y)),scoreCost=targetCost===Infinity?30:targetCost;
  const powerPoints=before===Infinity?30:before/1000;
  if(after<=0&&!effective(y,s).g34AlwaysWinAtZero)return 40+scoreCost*4+powerPoints;
  const reductionPoints=t.power==='-infinity'?powerPoints:Math.min(-t.power,before)/1000;
  return 5+reductionPoints+scoreCost;
 }
 function discardColors248(x){return new Set(faces(card(x)).flatMap(colors)).size;}
 function selfUntapValue542(s,t){const host=sourceHost474(s,t);if(!host||host.p!==t.p||s.active!==t.p||!api.isCreature(s,host.x)||!host.x.tapped||!api.canUntap(host.x)||effective(host.x,s).noAttack)return -100;const c=effective(host.x,s);return 24+Math.min(12,api.power(host.x,true,s)/3000)+Math.max(0,(Number(c.breaker)||1)-1)*5;}
 function tapForUntapScore987(s,t,y){
  if(y.sealed||y.tapped)return -100;
  return selfUntapValue542(s,t)-Math.min(20,cost(effective(y,s))*2);
 }
 function discardCosts655(s,p,x,creatureOnly){
  const options=faces(api.zoneCard(s,p,x,'hand')).filter(c=>!creatureOnly||c.type==='creature');
  return [...new Set(options.map(c=>cost(c)===Infinity?'∞':cost(c)))];
 }
 const discardCostFilter655=(limit,inclusive)=>inclusive?(limit==='∞'?{}:{max:limit}):{belowCost:limit};
 const destroyBelowCost655=(limit,{g835Creature,inclusive,to='grave',toOwnerDeck})=>({op:'Target',element:!g835Creature,to,filter:discardCostFilter655(limit,inclusive),...(toOwnerDeck?{toOwnerDeck:true}:{})});
 function discardDefs248(s,t,y){
  return t.defs.map(d=>d.g1703DiscardPower?{...d,filter:{...d.filter,...(card(y).power==='∞'?{}:{maxPower:card(y).power})}}:d.op==='DrawColors248'?{op:'Draw',n:discardColors248(y)}:
   d.op==='DiscardCost655'?{...d,costs:discardCosts655(s,t.p,y,d.g835Creature&&!d.g1048AnyDiscardedFace)}:
   d.op==='DiscardPower1282'?{...d,power:card(y).power==='∞'?'-infinity':-card(y).power}:d);
 }
 function discardScore248(s,t,y){const own=s.players[t.p],enemy=creatures(s,1-t.p).filter(x=>!x.sealed),d=t.defs[0];
  if(d.op==='DiscardPower1282'){
   const [effect]=discardDefs248(s,t,y),rows=targetOptions(s,t.p,enemy);
   if(!rows.length)return -100;
   const scores=rows.map(r=>powerMinusScore242(s,{...t,...effect},enemy.find(x=>x.uid===r.value)));
   return Math.min(100,Math.max(...scores))-cost(card(y));
  }
  if(d.op==='Raid767')return own.deck.length>1&&!api.deckLocked(s,t.p)?10-cost(card(y)):-100;
  if(d.op==='Clock842')return own.deck.length>1&&!api.deckLocked(s,t.p)?5-Math.min(cost(card(y)),8):-100;
  if(d.op==='ShieldTop')return api.canAddShield(s,t.p)&&own.deck.length>1?12-cost(card(y)):-100;
  if(d.op==='SelfGrant754'&&d.grant.speedAttacker){
   const host=sourceHost474(s,t)?.x;
   const c=host&&effective(host,s);
   return host&&s.active===t.p&&host.entered===s.turn&&!host.tapped&&!c.speedAttacker&&!c.noAttack?12-cost(card(y)):-100;
  }
  if(d.op==='DiscardCost655'){const costs=discardCosts655(s,t.p,y,d.g835Creature&&!d.g1048AnyDiscardedFace),rows=targetOptions(s,t.p,s.players[1-t.p].battle.filter(x=>costs.some(max=>matches(s,1-t.p,x,{belowCost:max,creature:d.g835Creature}))));return rows.length?22+Math.max(...rows.map(x=>x.score))-cost(card(y)):-100;}if(d.op==='Draw')return modeScore(s,t,[d])-cost(card(y));if(d.op==='Untap'&&d.g191First)return selfUntapValue542(s,t)-cost(card(y));if(d.op==='SelfBoost313'){const x=own.battle.find(x=>x.uid===t.uid);if(!x)return -100;const c=effective(x,s),victim=enemy.find(z=>z.uid===s.attack?.target),before=api.power(x,true,s),battle=victim&&before<api.power(victim,false,s)&&before+d.power>=api.power(victim,false,s)?18:0,breaks=s.attack?.target==='player'&&s.players[1-t.p].shields.length>1&&Number(c.breaker||1)<(d.breaker||1)?12:0;return battle+breaks-cost(card(y));}if(d.op==='DrawColors248'){const n=discardColors248(y);if(n>=own.deck.length&&n)return creatures(s,t.p).some(x=>effective(x,s).shako)?1000:-1000;return(n?12+n*5:-10)-cost(card(y));}if(d.op==='Select'&&d.origin==='grave'&&d.to==='hand'){const rows=[...own.grave,y].filter(x=>matches(s,t.p,x,d.filter));return rows.length?Math.max(...rows.map(x=>cost(card(x))-cost(card(y))+(x.uid===y.uid?-10:4))):-100;}if(d.op==='Look'&&d.g201Search){if(api.deckLocked(s,t.p)||own.deck.length<=1)return -100;const f=d.stages[0].filter;return(own.deck.some(x=>matches(s,t.p,x,f))?14:-10)-cost(card(y));}if(d.op==='Discard')return(s.players[1-t.p].hand.length?12:-10)-cost(card(y));if(d.op==='OpponentSelect')return(enemy.length?10+Math.min(...enemy.map(x=>cost(card(x))*4+api.power(x,false,s)/2000)):-10)-cost(card(y));if(d.op==='Target'){const rows=targetOptions(s,t.p,enemy.filter(x=>matches(s,1-t.p,x,d.filter)));return(rows.length?Math.max(...rows.map(r=>{const x=enemy.find(x=>x.uid===r.value);return d.power?powerMinusScore242(s,{...t,...d},x):10+cost(card(x))*4;})):-10)-cost(card(y));}return -100;}
 // A tamaseed/creature is one element, even while it has both card types.
 const manaCondition267=(s,p,f)=>s.players[p].mana.filter(y=>{if(f.filter)return matches(s,p,y,f.filter);const cs=api.manaColors(card(y),s,p);return f.multi?cs.length>1:cs.includes(f.color);}).length>=f.n;
 function manaCivilizationCount(s,p){
  const colors=s.players[p].mana.flatMap(y=>api.manaColors(card(y),s,p,true));
  return new Set(colors.filter(q=>['光','水','闇','火','自然'].includes(q))).size;
 }
 const neoState563=(s,p,x)=>!!x&&!x.sealed&&api.isCreature(s,x)&&!!api.zoneCard(s,p,x,'battle').neoEvolution&&api.isEvolution(x);
 const sourceNeo563=(s,t)=>{const host=sourceHost474(s,t);return host?neoState563(s,host.p,host.x):!!s.g563LastNeo?.[t.uid+'@'+(t.incarnation||0)];};
 function protects608(s,p,x){
  if(!api.isCreature(s,x))return false;
  return creatures(s,p).some(y=>{
   const filter=!y.sealed&&effective(y,s).g608Protect;
   return filter&&(!filter.g334Other||y.uid!==x.uid)&&
    (!filter.condition||ownCondition(s,p,filter.condition,y.uid,y.incarnation||0))&&matches(s,p,x,filter);
  });
 }
 const ownCondition=(s,p,f,sourceUid=null,sourceIncarnation=null,lastKnownCount=0)=>{
  if(f.g1823FireEntries!==undefined)return s.players[p].g1823FireEntries?.turn===s.turn&&s.players[p].g1823FireEntries.n>=f.g1823FireEntries;
  if(f.g1733DestroyedRace)return s.g393DDestroyed?.turn===s.turn&&!!s.g393DDestroyed.racesByPlayer?.[p]?.some(r=>r.includes(f.g1733DestroyedRace));
  if(f.g1731OpponentAttacking)return !!s.attack&&s.players[1-p].battle.some(x=>x.uid===s.attack.attacker&&!x.sealed&&api.isCreature(s,x));
  if(f.g1629OwnTurn)return s.active===p;
  if(f.g1564Opponent)return s.players[1-p].battle.some(x=>!x.sealed&&!x.faceDown&&matches(s,1-p,x,f.g1564Opponent));
  if(f.g1486ShieldForce){const x=s.players[p].battle.find(x=>x.uid===sourceUid&&(sourceIncarnation===null||(x.incarnation||0)===sourceIncarnation));return !!x&&!!api.findShield(s.players[p],x.g35ShieldForce);}
  if(f.g1485BattleName){const r=f.g1485BattleName,found=s.players[p].battle.some(x=>!x.sealed&&!x.faceDown&&battleNames676(s,x).includes(exactName(r.name)));return r.absent?!found:found;}
  if(f.g1484ZoneCount){const r=f.g1484ZoneCount,who=r.opponent?1-p:p,n=s.players[who][r.zone].filter(y=>matches(s,who,y,r.filter)).length;return(r.min===undefined||n>=r.min)&&(r.max===undefined||n<=r.max);}
  if(f.g1475Attacking){const a=s.attack||s.attackLifecycle;return !!a&&s.players[p].battle.some(x=>api.allLayers(x).some(y=>y.uid===sourceUid&&(sourceIncarnation===null||(y.incarnation||0)===sourceIncarnation))&&(x.uid===(a.attacker??a.uid)));}
  if(f.g1473RepeatedUnitAttack){const host=s.players[p].battle.find(x=>api.allLayers(x).some(y=>y.uid===sourceUid&&(sourceIncarnation===null||(y.incarnation||0)===sourceIncarnation)));if(!host||s.g481Attackers?.turn!==s.turn)return false;const refs=api.allLayers(host).map(key);return s.g481Attackers.events.filter(e=>e.p===p&&e.refs.some(r=>refs.includes(r))).length>1;}
  if(f.g1471GrCount!==undefined)return creatures(s,p).filter(x=>!x.sealed&&!x.faceDown&&api.zoneCard(s,p,x,'battle').gr).length>=f.g1471GrCount;
  if(f.g1465ManaRace)return s.players[p].mana.some(x=>!x.faceDown&&faces(card(x)).some(c=>race(c,f.g1465ManaRace)));
  if(f.g1455FirstUnitAttack){const host=s.players[p].battle.find(x=>api.allLayers(x).some(y=>y.uid===sourceUid&&(sourceIncarnation===null||(y.incarnation||0)===sourceIncarnation)));if(!host||s.g481Attackers?.turn!==s.turn)return false;const refs=api.allLayers(host).map(key);return s.g481Attackers.events.filter(e=>e.p===p&&e.refs.some(r=>refs.includes(r))).length===1;}

  if(f.g1445HostAuras){const r=f.g1445HostAuras,host=s.players[p].battle.flatMap(y=>api.allLayers(y)).find(y=>y.uid===sourceUid&&(sourceIncarnation===null||(y.incarnation||0)===sourceIncarnation));if(!host)return false;const n=api.attachedAuras1352(s,p,host).length;return(r.min===undefined||n>=r.min)&&(r.max===undefined||n<=r.max);}

  if(f.g1179OpponentMoreHand)return s.players[1-p].hand.length>s.players[p].hand.length;
  if(f.g1176MoreCreatures)
   return creatures(s,p).filter(x=>!x.sealed).length>creatures(s,1-p).filter(x=>!x.sealed).length;
  if(f.g1166SameCreatureNames){
   const counts=new Map();
   for(const x of creatures(s,p).filter(x=>!x.sealed&&!x.faceDown))for(const name of new Set(battleNames676(s,x))){
    const n=(counts.get(name)||0)+1;
    if(n>=f.g1166SameCreatureNames)return true;
    counts.set(name,n);
   }
   return false;
  }
  if(f.g962TurboRush){
   const source=s.players[p].battle.find(x=>x.uid===sourceUid&&!x.sealed);
   return !!source&&turboReady756(s,p,source);
  }
  if(f.g1086SpellsMin!==undefined)return (s.players[p].spellsThisTurn||0)>=f.g1086SpellsMin;
  if(f.g1064ManaColors)return f.g1064ManaColors.every(color=>manaCondition267(s,p,{color,n:1}));
  if(f.g1064NoElements)return !s.players[p].battle.some(x=>!x.sealed&&!x.faceDown);
  if(f.g951AnyHandMin!==undefined)return s.players.some(player=>player.hand.length>=f.g951AnyHandMin);
  if(f.g876SummonNumber!==undefined){
   const history=s.g463Summons?.[p];
   return (history?.turn===s.turn?history.n:0)+1===f.g876SummonNumber;
  }
  if(f.g881HighestPower){
   const powers=s.players.map((_,who)=>creatures(s,who).filter(x=>!x.sealed).map(x=>api.power(x,false,s)));
   const highest=Math.max(...powers.flat());
   if(f.g1040Ties)return powers[p].includes(highest);
   const ownHighest=powers[p].filter(n=>n===highest).length;
   return (f.g1178OwnTies?ownHighest>0:ownHighest===1)&&!powers[1-p].includes(highest);
  }
  if(f.g1040FaceDownManaBelow!==undefined)return s.players[p].mana.filter(x=>x.faceDown).length<f.g1040FaceDownManaBelow;
  if(f.g837NoManaAdded)return s.g837ManaAddedTurn?.[p]!==s.turn;
  if(f.g1037OpponentDiscarded)return !!s.players[1-p].discardedThisTurn;
  if(f.g1037SpellCast)return (s.players[p].spellsThisTurn||0)>0;
  if(f.g936NoDreamOrVehicleEntry)return s.g936DreamOrVehicleEntryTurn!==s.turn;
  if(f.g834AnyEmptyHand)return s.players.some(player=>player.hand.length===0);
  if(f.g811ManaLeft)return s.g47ManaLeft?.[p]===s.turn;
  if(f.g792AbsentAlly)return !s.players[p].battle.some(x=>!x.sealed&&!x.faceDown&&api.isCreature(s,x)&&effective(x,s).name===f.g792AbsentAlly);
  if(f.g1121ExtraHasNoFireCreature)return !(s.players[p].extra||[]).some(x=>
   !x.faceDown&&faces(api.zoneCard(s,p,x,'extra')).some(c=>c.type==='creature'&&colors(c).includes('火')));
  if(f.g791ExtraSpell)return (s.players[p].extra||[]).some(x=>!x.faceDown&&faces(card(x)).some(c=>c.type==='spell'));
  if(f.g790MinDraws!==undefined)return (s.players[p].drawsThisTurn||0)>=f.g790MinDraws;
  if(f.g857LightSoulEntered)return s.g857LightSoulEnteredTurn?.[p]===s.turn;
  if(f.g1278BlockerEntered)return s.players[p].blockerEnteredTurn===s.turn;
  if(f.g1279CreatureLeft)return s.players[p].creatureLeftTurn===s.turn;
  if(f.g722CrossedAny)return [p,1-p].some(owner=>ownCondition(s,owner,{g442CrossedAlly:true}));
  if(f.g666FaceUpShieldGo)return api.shieldGoCount(s,p)>0;
  if(f.g757FaceUpShield)return s.players[p].shields.some(group=>api.shieldCards(group).some(x=>x.faceUp));
  if(f.g650SourceCards){
   const host=sourceHost474(s,{uid:sourceUid,incarnation:sourceIncarnation});
   const count=host&&!host.x.sealed?(api.isCreature(s,host.x)?api.allLayers(host.x).length:0):lastKnownCount;
   return count>=f.g650SourceCards;
  }
  if(f.g688DistinctCreaturePair){
   const [first,second]=f.g688DistinctCreaturePair;
   const allies=creatures(s,p).filter(x=>!x.sealed);
   const candidates=allies.filter(x=>colors(effective(x,s)).includes(first));
   return allies.some(x=>colors(effective(x,s)).includes(second)&&candidates.some(y=>y.uid!==x.uid));
  }
  if(f.g1242NoEnemyCreatures)return !creatures(s,1-p).some(x=>!x.sealed);
  if(f.g1291AnyEmptyCreatureField)return [p,1-p].some(owner=>!creatures(s,owner).some(x=>!x.sealed&&!x.faceDown));
  if(f.g985NoUntappedOpponent)return !creatures(s,1-p).some(x=>!x.sealed&&!x.tapped);
  if(f.g1050OpponentDestroyed!==undefined)return s.g393DDestroyed?.turn===s.turn&&
   (s.g393DDestroyed.byPlayer?.[1-p]||0)>=f.g1050OpponentDestroyed;
  if(f.g1114OpponentTurn)return s.active!==p;
  if(f.g687CreatureCountAtLeastShields){
   const shields=s.players[p].shields;
   return creatures(s,p).filter(x=>!x.sealed).length>=(typeof shields==='number'?shields:shields.length);
  }
  if(f.g1197ManaCount){
   const {min,filter}=f.g1197ManaCount;
   return s.players[p].mana.filter(x=>matches(s,p,x,filter)).length>=min;
  }
  if(f.g1133ManaTwin)return s.players[p].mana.some(y=>!y.faceDown&&api.zoneCard(s,p,y,'mana').spellFace);
  if(f.all)return f.all.every(filter=>ownCondition(s,p,filter,sourceUid,sourceIncarnation,lastKnownCount));if(f.g805NoOpponentMulti)return !s.players[1-p].battle.some(x=>!x.sealed&&!x.faceDown&&colors(effective(x,s,true)).length>1);if(f.g603AttackThisTurn)return !!s.attack||s.g481Attackers?.turn===s.turn&&s.g481Attackers.events.length>0||!!s.g23Attacks?.some(a=>a?.turn===s.turn);if(f.g590AnyEmptyShields)return s.players.some(x=>(x.shields?.length??x.shields)===0);if(f.g590SourceTapped)return s.players[p].battle.some(x=>x.tapped&&api.allLayers(x).some(y=>y.uid===sourceUid&&(sourceIncarnation===null||(y.incarnation||0)===sourceIncarnation)));if(f.g580LaterAttack)return s.g23Attacks?.[p]?.turn===s.turn&&s.g23Attacks[p].count>1;if(f.g580D2Field)return s.players[p].battle.some(x=>!x.sealed&&!x.faceDown&&card(x).d2Field);if(f.g568ManaColors)return f.g568ManaColors.every(color=>s.players[p].mana.some(y=>api.manaColors(card(y),s,p).includes(color)));if(f.g567NoTappedMana)return s.players[p].mana.every(y=>!y.tapped);if(f.g565NoAttacks)return s.g481Attackers?.turn!==s.turn||!s.g481Attackers.events.length;if(f.g565FaceUpShields)return Array.isArray(s.players[p].shields)&&s.players[p].shields.flatMap(api.shieldCards).some(x=>x.faceUp);if(f.g563Neo)return neoState563(s,p,s.players[p].battle.find(x=>x.uid===sourceUid&&(sourceIncarnation===null||(x.incarnation||0)===sourceIncarnation)));if(f.g541CreaturesAtLeastShields){const shields=s.players[p].shields;return creatures(s,p).filter(x=>!x.sealed).length>=(typeof shields==='number'?shields:shields.length);}if(f.g539Jokers!==undefined)return jokerCount539(s,p)>=f.g539Jokers;if(f.g508EvolutionOrLink)return creatures(s,p).some(x=>!x.sealed&&evolutionOrLinkedGod(x,api.zoneCard(s,p,x)));if(f.g501TotalCreaturesMax!==undefined)return[0,1].reduce((n,who)=>n+creatures(s,who).filter(x=>!x.sealed).length,0)<=f.g501TotalCreaturesMax;if(f.g479OnlyCreature){const rows=creatures(s,p).filter(x=>!x.sealed);return rows.length===1&&api.layers(rows[0]).some(x=>x.uid===sourceUid&&(sourceIncarnation===null||(x.incarnation||0)===sourceIncarnation));}if(f.g466DistinctCosts)return new Set(s.players[p].battle.filter(x=>!x.sealed&&!x.faceDown).map(x=>api.zoneCard(s,p,x,'battle')).filter(c=>['creature','seed','gear','field','aura'].includes(c.type)).map(cost)).size>=f.g466DistinctCosts;if(f.g465OwnTurn&&s.active!==p)return false;if(f.g465OpponentShieldsMax!==undefined){const shields=s.players[1-p].shields;return(typeof shields==='number'?shields:shields.length)<=f.g465OpponentShieldsMax;}if(f.g458Defending)return !!s.attack&&(s.attack.blockUid||s.attack.target)===sourceUid;if(f.g448Spells)return(s.g37Spells?.[p]?.turn===s.turn?s.g37Spells[p].n:0)>=f.g448Spells;if(f.g448NoncreatureUses)return(s.g448NoncreatureUses?.[p]?.turn===s.turn?s.g448NoncreatureUses[p].n:0)>=f.g448NoncreatureUses;if(f.g448Draws)return(s.players[p].drawsThisTurn||0)>=f.g448Draws;if(f.g448NoName){const norm=v=>String(v||'').normalize('NFKC').replace(/\s/g,'');return !s.players[p].battle.some(x=>!x.sealed&&api.isCreature(s,x)&&norm(effective(x,s).name)===norm(f.g448NoName));}if(f.g448OpponentOverMana)return s.players[1-p].battle.some(x=>!x.sealed&&api.isCreature(s,x)&&cost(effective(x,s))>s.players[1-p].mana.length);if(f.g442CrossedAlly)return s.players.some(own=>own.battle.some(g=>!g.sealed&&card(g).type==='gear'&&g.crossedTo&&s.players[p].battle.some(y=>!y.sealed&&api.isCreature(s,y)&&y.uid===g.crossedTo.uid&&(y.incarnation||0)===g.crossedTo.incarnation)));if(f.g436Crossed){const source=s.players[p].battle.find(x=>x.uid===sourceUid);return !!source&&s.players.some(own=>own.battle.some(g=>!g.sealed&&card(g).type==='gear'&&g.crossedTo?.uid===sourceUid&&g.crossedTo.incarnation===(source.incarnation||0)));}if(f.g413MoreCreatures){const who=f.g413MoreCreatures==='opponent'?1-p:p;return creatures(s,who).filter(y=>!y.sealed).length>creatures(s,1-who).filter(y=>!y.sealed).length;}if(f.g411ManaRace){const r=f.g411ManaRace;return s.players[p].mana.filter(y=>!y.faceDown&&api.manaColors(card(y),s,p).includes(r.color)&&faces(api.zoneCard(s,p,y,'mana')).some(c=>c.type==='creature'&&race(c,r.race))).length>=r.n;}if(f.g400Wave)return [0,1].reduce((n,who)=>n+s.players[who].battle.filter(y=>!y.sealed&&api.isCreature(s,y)&&!api.ignored(s,y)&&api.zoneCard(s,who,y).g400Wave).length,0)>=f.g400Wave;if(f.g370BattleCount){const c=f.g370BattleCount,rows=(c.sumBoth?[p,1-p]:[p]).flatMap(who=>c.g557Elements
  ?s.players[who].battle.filter(x=>exchangeElement753(api.zoneCard(s,who,x,'battle'))):creatures(s,who));
  const n=rows.filter(x=>!x.sealed&&(!c.other||!api.allLayers(x).some(y=>
   y.uid===sourceUid&&(sourceIncarnation===null||(y.incarnation||0)===sourceIncarnation)))&&matches(s,p,x,c.filter)).length;return(c.min===undefined||n>=c.min)&&(c.max===undefined||n<=c.max);}if(f.g334ZoneCount){
   const c=f.g334ZoneCount;
   // These two shield-total conditions are the existing Oni Time tests (QA 33474).
   if(c.zone==='shields'&&c.sumBoth&&c.max===6)return api.oniTime1303(s,p);
   if(c.zone==='shields'&&c.sumBoth&&c.min===7)return !api.oniTime1303(s,p);
   const size=who=>(c.zones??[c.zone]).reduce((sum,zone)=>{const rows=s.players[who][zone];return sum+(typeof rows==='number'?rows:(rows||[]).length);},0),n=c.sumBoth?size(p)+size(1-p):size(c.opponent?1-p:p);return c.atLeastOpponent?n>=size(1-p):c.moreThanOpponent?n>size(1-p):c.lessThanOpponent?n<size(1-p):(c.min===undefined||n>=c.min)&&(c.max===undefined||n<=c.max);}if(f.g286FaceDownMana!==undefined)return s.players[p].mana.filter(y=>y.faceDown).length>=f.g286FaceDownMana;if(f.g285AllManaTapped)return s.players[p].mana.every(y=>y.tapped);if(f.g282AllMana)return s.players[p].mana.every(y=>{const cs=api.manaColors(card(y),s,p).filter(c=>['光','水','闇','火','自然'].includes(c));return cs.includes(f.g282AllMana.color)||!!f.g282AllMana.colorless&&cs.length===0;});if(f.g273Grave)return s.players[p].grave.filter(y=>matches(s,p,y,f.g273Grave.filter)).length>=f.g273Grave.n;if(f.g272ManaCount!==undefined)return s.players[p].mana.length>=f.g272ManaCount;if(f.g267Mana)return manaCondition267(s,p,f.g267Mana);if(f.g265ShieldsMax!==undefined){const shields=s.players[p].shields;return(typeof shields==='number'?shields:shields.length)<=f.g265ShieldsMax;}const rows=(f.g334Both?[p,1-p]:[p]).flatMap(who=>s.players[who].battle.filter(x=>!x.sealed&&(!f.g334Other||x.uid!==sourceUid||sourceIncarnation!==null&&(x.incarnation||0)!==sourceIncarnation)&&matches(s,who,x,f.seed&&(card(x).seedCreature||card(x).natureAce4)?{...f,seed:false}:f)));return f.g258Civil?rows.length>=f.g258Civil:rows.length>0;};
 const canPut=(s,p,x,origin,execution=false)=>(['creature','seed','field','gear','aura','duelist'].includes(card(x).type)||card(x).gCastle)&&(!execution||api.canCast(s,p,card(x),origin))&&api.canEnter(s,p,card(x),{origin,execution})&&(!card(x).evolution||api.evolutionBases(s,p,card(x),card(x).g31Evolution?.minCards?{origin,execution,exclude:x.uid}:undefined).some(y=>y.uid!==x.uid));
 const countBattleCivilizations=(s,rows)=>new Set(rows.filter(y=>!y.sealed&&!y.faceDown)
  .flatMap(y=>colors(effective(y,s,true))).filter(q=>['光','水','闇','火','自然'].includes(q))).size;
 function battleColorDefs1630(s,t){
  const n=countBattleCivilizations(s,s.players[t.p].battle);
  return t.mode==='minus'?[{op:'Target',power:-2000*n,g242PowerMinus:true}]:
   [{op:'Select',owner:'opponent',origin:'battle',n,filter:{creature:true},
    g173Targets:true,g193Select:true,g193Tap:true,title:'タップする相手のクリーチャーを'+n+'体選ぶ'}];
 }
 const countDraw=(s,p,t)=>{const owner=t.owner==='opponent'?1-p:p;
  if(t.g1606FaceUpShieldCards)return s.players[owner].shields.flatMap(api.shieldCards).filter(x=>x.faceUp).length;
  if(t.g1606ManaCivilizations)return manaCivilizationCount(s,p);
  if(t.g1143FaceUpShields)
   return s.players[owner].shields.filter(group=>api.shieldCards(group).some(x=>x.faceUp)).length;
  if(t.g1041ColorlessMana)return s.players[p].mana.filter(x=>{
   const mana=api.zoneCard(s,p,x,'mana');
   return api.manaColors(mana,s,p).length===0;
  }).length;
  if(t.g1040EqualizeHands)return Math.max(0,s.players[1-p].hand.length-s.players[p].hand.length);
  if(t.g777DistinctCreatureCosts)return new Set(creatures(s,owner).filter(x=>!x.sealed&&!x.faceDown).map(x=>cost(api.zoneCard(s,owner,x,'battle')))).size;
  if(t.g641Civilizations)return countBattleCivilizations(s,s.players[owner].battle);
  const owners=t.owner==='both'&&t.zone==='battle'?[0,1]:[owner];
  return owners.reduce((total,who)=>{
   const rows=t.zone==='battle'?(t.g262Elements?s.players[who].battle:creatures(s,who)).filter(y=>!y.sealed):s.players[who][t.zone]||[];
   return total+rows.filter(y=>(!t.g329Other||y.uid!==t.uid||(y.incarnation||0)!==(t.incarnation||0))&&matches(s,who,y,t.filter)).length;
  },0);
 };
 function returnBases939(s,t){
  const host=s.players[t.owner].battle.find(x=>x.uid===t.target&&!x.sealed);
  if(!host)return;
  const cards=(host.under||[]).flatMap(api.allLayers);
  const selected=t.selected||[];
  const remaining=cards.filter(x=>!selected.includes(x.uid));
  if(!t.confirmed&&remaining.length&&api.stratoReplacements(s,t.owner).length){
   choice(s,t,'かわりにマナへ置く進化元を選ぶ（'+selected.length+'枚）',[
    ...remaining.map(x=>opt(x.faceDown?'裏向きの進化元':card(x).name,x.uid,10,x.faceDown?null:x.cardId)),
    opt(selected.length?'この枚数で確定':'置換を使わない',null,0)
   ],1-t.owner);
   return;
  }
  for(const x of cards)api.moveBattleCard(s,t.owner,x.uid,selected.includes(x.uid)?'mana':'hand',{
   controller:t.p,destinationOwner:x.cardOwner??t.owner
  });
 }
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
  for(const l of s.extLimits||[]){
   if(!['g1123TurnNamedAttack','turnAttackWatch'].includes(l.kind)||l.player!==p||l.turn!==s.turn||
    api.spellIgnored(s,{type:'spell',spellSource:l.source,cost:l.spellCost}))continue;
   if(l.name!==undefined&&!battleNames676(s,attacker).some(name=>name.includes(l.name))||
    l.filter&&!matches(s,p,attacker,l.filter))continue;
   api.enqueue(s,p,{source:l.source,effect:'extended',task:task('g34_ResolveDelay537',p,l.source,
    {spellCost:l.spellCost,defs:l.defs,...(l.filter?{g399Attacker:{uid:attacker.uid,incarnation:attacker.incarnation||0}}:{})})});
  }
  for(const l of s.extLimits||[]){
   if(l.kind!=='g1257BladeCircle'||!l.active||l.spent||l.who!==p||
    colors(effective(attacker,s)).includes('光')||
    api.spellIgnored(s,{type:'spell',spellSource:l.source,cost:l.spellCost}))continue;
   l.spent=true;
   const controller=1-p;
   api.enqueue(s,controller,{source:l.source,effect:'extended',task:task('g34_ResolveDelay537',controller,l.source,{
    spellCost:l.spellCost,defs:[{op:'DestroyAttacker944'}],
    g399Attacker:{uid:attacker.uid,incarnation:attacker.incarnation||0}
   })});
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
  const dragonAttack=race(effective(attacker,s,true),'ドラゴン');
  const firstAbyss=race(effective(attacker,s,true),'アビス')&&
   (s.g481Attackers?.turn!==s.turn||!s.g481Attackers.events.some(e=>e.p===p&&e.g1236Abyss));
  const firstDragon=dragonAttack&&(s.g481Attackers?.turn!==s.turn||
   !s.g481Attackers.events.some(e=>e.p===p&&e.g1222Dragon));
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
    if((watch.who==='both'||(watch.who==='self'?owner===p:owner!==p))&&!(x.uid===attacker.uid&&(watch.other||api.selfStopped(s,p)))&&(!watch.first||first)&&(!watch.g768AttackNumber||watch.g768AttackNumber===number)&&(!watch.g764FirstCostSix||firstCostSix)&&(!watch.g1222FirstDragon||firstDragon)&&(!watch.g1236FirstAbyss||firstAbyss)&&(!watch.entryTurn||attacker.entered===s.turn)&&(!watch.playerAttack||s.attack?.target==='player')&&(!watch.g799FirstPlayer||firstPlayer)&&(!watch.defs.some(d=>d.g747Once)||!parottaUsed747(s,x))&&!used792(s,x,watch.defs[0])&&matches(s,p,attacker,watch.filter)){
     if(watch.defs.some(d=>d.g1197Attacker)&&s.attack)s.attack.g1197Watched=true;
     if(watch.g399Attacker)send(s,owner,x,'Sequence',{defs:watch.defs,g399Attacker:{uid:attacker.uid,incarnation:attacker.incarnation||0,...(watch.g677Layers?{refs:api.allLayers(attacker).map(key)}:{}),...(watch.defs.some(d=>d.op==='AttackDeploy409'||d.op==='AttackHandDeploy798'||d.op==='AttackGraveDeploy1652')?{cost:cost(effective(attacker,s))===Infinity?'∞':cost(effective(attacker,s))}: {})}});else queue(s,owner,x,watch.defs);}
   }
  }
 }
 function rondoWins946(s,winner,result){
  if(!winner)return [];
  return (s.extLimits||[]).flatMap(rule=>{
   if(rule.kind!=='g946BattleWinUntap'||rule.turn!==s.turn||!rule.g962EveryWin&&!result.g588FirstForUnit||
    !api.allLayers(winner).some(layer=>key(layer)===key(rule.ref)))return [];
   const {source,controller,ref}=rule,spellCost=cost(faces(card(source)).find(c=>c.type==='spell')??card(source));
   if(api.spellIgnored(s,{type:'spell',cost:spellCost,spellSource:source}))return [];
   return [{player:controller,uid:ref.uid,source,effect:'extended',
    task:task('g34_RondoUntap946',controller,source,{...ref,spellCost,...(rule.g962EveryWin?{g962EveryWin:true}:{})})}];
  });
 }
 function boomerangWins1645(s,winner){
  if(!winner)return [];
  return (s.extLimits||[]).flatMap(rule=>{
   if(rule.kind!=='g1645Boomerang'||rule.turn!==s.turn||!api.allLayers(winner).some(y=>key(y)===key(rule.ref))||api.spellIgnored(s,{type:'spell',spellSource:rule.source,cost:cost(card(rule.source))}))return [];
   return [{player:rule.controller,uid:rule.spellRef.uid,source:rule.source,effect:'extended',task:task('g34_SelfGraveHand476',rule.controller,rule.source,{...rule.spellRef})}];
  });
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
 function exLifeGraveOptions1267(s,t){
  // The physical source may now be an evolution base (QA40839).
  const host=sourceHost474(s,t);
  if(!host||host.p!==t.p||host.x.sealed)return [];
  const groups=new Set(api.allLayers(host.x).flatMap(x=>[x.exLifeShieldUid,...(x.exLifeShieldUids||[])]).filter(Boolean));
  return ownShieldGraveOptions(s,t.p).filter(o=>{
   const root=api.findShield(s.players[t.p],o.value);
   return groups.has(api.shieldGroup(root))&&api.shieldCards(root).every(x=>!x.g37ShieldHeld);
  }).map(o=>({...o,score:s.players[1-t.p].shields.length?20:4}));
 }
 function d2Locked1188(s,p){
  return (s.extLimits||[]).some(l=>l.kind==='g1188D2Lock'&&l.player===p&&
   !api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource}));
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
 function shieldMoveDone1352(s,t,kind,owner,moved){
  const own=s.players[owner];
  if(kind==='ragnarok'){
   start(s,t,[{op:'ShieldTop',n:moved.filter(x=>own.grave.includes(x)).length+1,g779Simultaneous:true}]);
  }else if(kind==='cycle1737'){
   const bottom=moved.filter(x=>own.deck.includes(x));
   const known=new Map(t.g1737ShieldLabels||[]);
   const order=bottom.length>1?[task('g78_BottomOrder',owner,t.source,{
    rows:bottom.map((x,i)=>({uid:x.uid,label:known.get(x.uid)||'裏向きのカード '+(i+1),cardId:known.has(x.uid)?x.cardId:null})),
    ordered:[],newCards:true,controller:t.p})]:[];
   // The next instruction still happens when a shield movement is replaced.
   put(s,...order,task('g34_ShieldTop',owner,t.source,{n:1}));
  }else if(kind==='shuffle'){
   if(moved.length){
    const added=moved.map(y=>remove(own.deck,y.uid)).filter(Boolean);
    api.shuffleLibrary(s,owner,added,t.source);
    api.log(s,t.p,'shieldShuffle',card(t.source).name+'：シールド1つを持ち主の山札に戻した',{cardId:t.source});
    start(s,t,[{op:'Schedule537',when:'turnEnd',defs:[{op:'ShieldTop',p:owner,n:1}]}]);
   }
  }else if(kind==='replace'){
   if(moved.length)start(s,t,[{op:'ShieldTop',p:owner,n:1}]);
  }else if(kind==='ownGrave'){
   api.log(s,t.p,'shieldGrave',card(t.source).name+'：シールド1つ（カード'+moved.length+'枚）を墓地に置いた',{cardId:t.source});
   // QA39424: attempting the shield move satisfies the follow-up even when replaced.
   if(t.then)start(s,t,t.then);
  }else if(kind==='mana'){
   api.log(s,t.p,'shieldMana',card(t.source).name+'：相手のシールドを1つマナへ置いた（カード'+moved.length+'枚）',{cardId:t.source});
   const mana=t.g795DeployBelow&&moved.filter(y=>own.mana.includes(y));
   if(mana?.length){
    const limit=Math.max(...mana.flatMap(y=>faces(card(y)).map(cost)));
    start(s,t,[{op:'Select',origin:'mana',n:1,deploy:true,optional:true,filter:{creature:true,belowCost:limit===Infinity?'∞':limit}}]);
   }
  }
 }
 function finishOrDeferShield1352(s,t,kind,owner,moved){
  if(!api.deferShieldMove1352(s,{...t,op:'g34_ShieldMoveDone1352',kind1352:kind,owner1352:owner}))
   shieldMoveDone1352(s,t,kind,owner,moved);
 }
 function finishShieldMove588(s,t){
  if(!t.selected?.length||t.optionalExact&&t.selected.length!==t.n)return;
  const owner=t.owner==='self'?t.p:1-t.p;
  const to=t.to==='mana'?'mana':'grave',zone=to==='mana'?'マナゾーン':'墓地';
  const moved=api.moveShields(s,owner,t.selected,to,t.toOwnerGrave?{toOwnerGrave:true}:undefined);
  if(moved.length)api.log(s,t.p,to==='mana'?'shieldMana':'shieldGrave',card(t.source).name+'：'+(owner===t.p?'自分':'相手')+'のシールドからカード'+moved.length+'枚を'+zone+'に置いた',{cardId:t.source});
  if(t.afterAttempt)start(s,t,t.afterAttempt);
 }
 function winWatches252(s,p,w){const winner=s.players[p].battle.find(x=>x.uid===w?.uid);if(!winner)return[];return watchSources252(s,p).flatMap(x=>{const watch=effective(x,s).g252WinWatch;return watch&&(!watch.ownTurn||s.active===p)&&(!watch.attacking||w.g1642AttackBattleWin)&&(!watch.first||w.g587First)&&(!watch.other||x.uid!==winner.uid)&&matches(s,p,winner,watch.filter)?[{player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Sequence',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,defs:watch.defs,...(watch.winner?{g399Attacker:{uid:winner.uid,incarnation:winner.incarnation||0,...(watch.g1669WinnerBreak?{source:winner.cardId}:{})}}:{})})}]:[];});}
 // Use events come from actual summons and spell casts, not arbitrary battlefield entries.
 function useBlockers524(s,caster){for(const x of creatures(s,1-caster))if(!x.sealed&&effective(x,s).g524OpponentUseBlocker)queue(s,1-caster,x,[{op:'UseBlocker524'}]);}
 const useColorsMatch=(watch,c)=>(!watch.color||colors(c).includes(watch.color))&&
  (!watch.colorsAny||watch.colorsAny.some(color=>colors(c).includes(color)))&&
  (!watch.colorsAll||watch.colorsAll.every(color=>colors(c).includes(color)))&&(!watch.multicolor||colors(c).length>1);
 const spellWatches=(s,caster,c,origin='hand')=>[s.active,1-s.active].flatMap(owner=>
  s.players[owner].battle.flatMap(x=>{
   if(x.sealed||!card(x).g204SpellWatch?.g1189Tamaseed&&!api.isCreature(s,x))return [];
   const watch=effective(x,s).g204SpellWatch;
   if(!watch||(watch.who!=='both'&&owner!==(watch.who==='self'?caster:1-caster)))return [];
   return (!watch.ownTurn||s.active===owner)&&(!watch.opponentTurn||s.active!==owner)&&(!watch.origin||watch.origin===origin)&&
    useColorsMatch(watch,c)&&(!watch.race||race(c,watch.race))&&
    (!watch.g1252NameIncludes||exactName(c.name).includes(exactName(watch.g1252NameIncludes)))&&
    (!watch.g766Once||!used(s,'g766SpellUse',x))&&!watchUsed792(s,x,watch)?[{owner,x,watch}]:[];
  }));
 // Use the already decorated target stats and suppress breaker calculation on sources to avoid power recursion.
 function auraPower(s,x,c){
  const owner=s.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid));
  if(owner<0||x.sealed||c.type!=='creature')return 0;
  const fits=f=>(!f.g1503NonGR||!c.gr)&&(!f.g1490Exile||!!c.g1490Exile)&&(!f.speedAttacker||!!c.speedAttacker)&&(!f.g1428Gr||!!c.gr)&&(!f.g856Souls||f.g856Souls.some(soul=>hasSoul(card(x),soul)))&&
   (!f.creature||c.type==='creature')&&(!f.g1451Dragheart||c.dragheart)&&(f.g1085Psychic===undefined||!!c.psychic===f.g1085Psychic)&&
   (!f.color||colors(c).includes(f.color))&&(!f.race||race(c,f.race))&&
   (!f.raceAny||f.raceAny.some(q=>race(c,q)))&&
   (!f.g220NameAny||f.g220NameAny.some(q=>String(c.name).normalize('NFKC').includes(q.normalize('NFKC'))))&&
   (!f.any||f.any.some(fits))&&(!f.evolution||api.isEvolution(x))&&(f.min===undefined||cost(c)>=f.min)&&
   (!f.tapped||x.tapped)&&(!f.g436Crossed||ownCondition(s,owner,{g436Crossed:true},x.uid));
  let bonus=0;
  for(const sourceOwner of [0,1])for(const source of s.players[sourceOwner].battle){
   const raw=api.zoneCard(s,sourceOwner,source);
   if(source.sealed||source.faceDown||(!raw.g205Aura&&!raw.g260Self?.grants?.g205Aura&&
    !raw.g268ManaGrants?.some(r=>r.grants?.g205Aura))||
    !api.isCreature(s,source)&&raw.type!=='seed'&&!(raw.type==='field'&&(raw.d2Field||raw.g1458FieldAura)))continue;
   const auras=effective(source,s,true).g205Aura;
   if(!auras)continue;
   for(const aura of Array.isArray(auras)?auras:[auras]){
    if(aura.sourceTapped!==undefined&&aura.sourceTapped!==!!source.tapped||
     !aura.both&&owner!==(aura.opponent?1-sourceOwner:sourceOwner)||aura.other&&source.uid===x.uid||
     aura.turn==='own'&&s.active!==sourceOwner||aura.turn==='opponent'&&s.active===sourceOwner||
     !fits(aura.filter))continue;
    bonus+=aura.power;
   }
  }
  return bonus;
 }
 // Counting characteristics must not calculate power/breakers on the counted cards.
 function countPower(s,x,c,attacking=false,t=c.g207CountPower){if(!t)return 0;const owner=s.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid));
  if(!t||owner<0||x.sealed||c.type!=='creature'||t.evolution&&!api.isEvolution(x)||t.attackOnly&&!attacking||t.turn==='own'&&s.active!==owner||t.turn==='opponent'&&s.active===owner)return 0;
  const owners=t.both?[0,1]:[t.opponent?1-owner:owner];
  if(t.zone==='under')return t.amount*(x.under||[]).flatMap(api.allLayers).length;
  if(t.graveName)return t.amount*graveNameCount698(s,owners,t.graveName);
  if(t.zone==='shields')return t.amount*owners.reduce((n,p)=>n+(typeof s.players[p].shields==='number'?s.players[p].shields:t.g333ShieldCards?s.players[p].shields.reduce((n,x)=>n+api.shieldCards(x).length,0):s.players[p].shields.length),0);
  const rows=owners.flatMap(p=>(s.players[p][t.zone]||[]).map(y=>({p,y}))).filter(({y})=>!t.other||y.uid!==x.uid);
  if(t.manaColor)return t.amount*rows.filter(({p,y})=>api.manaColors(card(y),s,p,true).includes(t.manaColor)).length;
  if(t.g925DistinctRaces)return t.amount*new Set(rows.flatMap(({y})=>
   !y.sealed&&!y.faceDown&&api.isCreature(s,y)?exactRaces(effective(y,s,true)):[])).size;
  if(t.civilizations){
   if(t.g561Battle)return t.amount*countBattleCivilizations(s,rows.map(({y})=>y));
   return t.amount*new Set(rows.flatMap(({p,y})=>api.manaColors(card(y),s,p,true)).filter(q=>['光','水','闇','火','自然'].includes(q))).size;
  }
  const {g876BattleName,g1116NameIncludes,noColor,...f}=t.filter||{};
  const fits=({p,y})=>{
   if(t.zone==='battle'&&(y.sealed||y.faceDown||!t.g561Elements&&!api.isCreature(s,y)))return false;
   if(f.g1085Psychic&&!api.zoneCard(s,p,y,t.zone).psychic)return false;
   if(f.g1428Gr!==undefined&&!!api.zoneCard(s,p,y,t.zone).gr!==f.g1428Gr)return false;
   if(t.g1011CountColor&&!(t.zone==='battle'?[api.zoneCard(s,p,y,t.zone)]:faces(api.zoneCard(s,p,y,t.zone))).some(face=>colors(face).includes(t.g1011CountColor)))return false;
   if(g876BattleName&&!battleNames676(s,y).includes(exactName(g876BattleName)))return false;
   if(g1116NameIncludes){
    if(y.faceDown)return false;
    const named=api.zoneCard(s,p,y,t.zone);
    const names=faces(named).flatMap(face=>[face.name,...(face.additionalNames||[])]);
    // QA 48124 includes the printed reading of BOLSHA9-銅鑼-5.
    if(named.g1117NameReading)names.push(named.g1117NameReading);
    if(!names.some(name=>exactName(name).includes(exactName(g1116NameIncludes))))return false;
   }
   if(f.g228Face&&(y.faceDown||!matches(s,p,y,{g228Face:f.g228Face})))return false;
   if(noColor&&colors(api.zoneCard(s,p,y,t.zone)).length)return false;
   if(f.g853Soul&&!hasSoul(card(y),f.g853Soul))return false;
   if(f.gear&&api.zoneCard(s,p,y,t.zone).type!=='gear')return false;
   if(!Object.keys(f).length)return true;
   const d=t.zone==='battle'?effective(y,s,true):card(y),printed=t.zone==='battle'?[d]:faces(d);
   return (!f.g561CreatureRace||printed.some(d=>d.type==='creature'&&race(d,f.g561CreatureRace)))&&(!f.seed||(()=>{const raw=api.zoneCard(s,p,y,'battle');return raw.type==='seed'||!!raw.seedCreature||!!raw.natureAce4;})())&&(!f.creature||printed.some(d=>d.type==='creature'))&&(!f.multi||printed.some(d=>colors(d).length>1))&&(!f.spell||printed.some(d=>d.type==='spell'))&&(!f.color||printed.some(d=>colors(d).includes(f.color)))&&(!f.colorsAny||printed.some(d=>f.colorsAny.some(q=>colors(d).includes(q))))&&(!f.race||printed.some(d=>race(d,f.race)))&&(!f.evolution||api.isEvolution(y)||d.g48HandEvolution)&&(!f.blocker||d.blocker)&&(!f.tapped||y.tapped)&&(!f.untapped||!y.tapped);
  };
  return t.amount*rows.filter(fits).length;
 }
 // Only identity-based filters are accepted. Source abilities are read without
 // recursively decorating other aura recipients; ignored recipients never reach this hook.
 function grantAuras(s,owner,x,c,racesOnly=false){
  if(c.type!=='creature')return c;
  const fits=f=>(!f.g1686Victory||physicalVictory1686(x))&&(!f.g1503NonGR||!c.gr)&&(!f.g1490Exile||!!c.g1490Exile)&&(!f.speedAttacker||!!c.speedAttacker)&&(!f.g1428Gr||!!c.gr)&&(!f.g856Souls||f.g856Souls.some(soul=>hasSoul(card(x),soul)))&&(f.g562MaxCost===undefined||cost(c)<=f.g562MaxCost)&&(!f.g717Silent||!!c.g496Silent)&&(!f.multi||colors(c).length>1)&&(!f.tapped||x.tapped)&&(!f.untapped||!x.tapped)&&(!f.g227NameIncludes||String(c.name).normalize('NFKC').includes(f.g227NameIncludes))&&(!f.g819CreatureNameIncludes||battleNames676(s,x).some(name=>name.includes(f.g819CreatureNameIncludes)))&&(!f.color||colors(c).includes(f.color))&&(!f.colorsAny||f.colorsAny.some(q=>colors(c).includes(q)))&&(!f.g724ExactRace||exactRaces(c).includes(f.g724ExactRace))&&(!f.race||race(c,f.race))&&(!f.raceAny||f.raceAny.some(q=>race(c,q)))&&(!f.raceAll||f.raceAll.every(q=>race(c,q)))&&(!f.notRace||!race(c,f.notRace))&&(!f.evolution||api.isEvolution(x))&&(f.min===undefined||cost(c)>=f.min);
  let out=c,slayers=c.g208SlayerCount||Number(!!c.slayer);
  for(const p of [0,1])for(const source of s.players[p].battle){
   const sourceCard=card(source),auras=sourceCard.g208Auras;
   if(!auras||source.sealed||source.faceDown||api.ignored(s,source))continue;
   if(!api.isCreature(s,source)&&sourceCard.type!=='seed'&&!(sourceCard.type==='field'&&(sourceCard.d2Field||sourceCard.g1458FieldAura)))continue;
   for(const aura of auras){
    if(aura.opponentTurn&&s.active===p||(!aura.both&&(aura.opponentsOnly?owner===p:owner!==p))||aura.other&&source.uid===x.uid||!fits(aura.filter))continue;
    const condition=aura.g557Condition;
    if(condition?.g258Civil){
     // A creature's speed grant cannot change the civilization or type of counted cards.
     if(civilAuraReading.has(s))continue;
     let ready;
     civilAuraReading.add(s);
     try{ready=ownCondition(s,p,condition,source.uid);}finally{civilAuraReading.delete(s);}
     if(!ready)continue;
    }else if(condition&&!ownCondition(s,p,condition,source.uid))continue;
    for(const [key,rawValue]of Object.entries(aura.grants)){const value=key==='attackBonus'&&aura.g1813GraveFireAttackBonus?rawValue+countPower(s,source,sourceCard,false,{zone:'grave',amount:aura.g1813GraveFireAttackBonus,filter:{color:'火'}}):rawValue;if(racesOnly&&key!=='raceAdd')continue;if(out===c)out={...c};if(key==='slayer'){out.slayer=true;slayers++;}else if(key==='breaker')out.breaker=out.breaker==='∞'||value==='∞'?'∞':Math.max(Number(out.breaker)||1,value);else if(key==='attackBonus')out.attackBonus=(out.attackBonus||0)+value;else if(key==='extraBreak')out.extraBreak=(out.extraBreak||0)+value;else if(key==='raceAdd')out.race=[...new Set([...String(out.race||'').split('/').filter(Boolean),...value])].join('/');else out[key]=value;}
   }
  }
  if(!racesOnly&&!goatRaceReading.has(s)){
   const goats=s.players[owner].battle.filter(y=>card(y).g1079Goat&&!y.sealed&&api.isCreature(s,y)&&!api.ignored(s,y));
   if(goats.length){
    // The aura changes Slayer only. Read the sources' current races without reapplying it.
    goatRaceReading.add(s);
    try{
     for(const y of goats)if(sharesRace(out,y.uid===x.uid?out:effective(y,s,true))){
      if(out===c)out={...c};
      out.slayer=true;
      slayers++;
     }
    }finally{goatRaceReading.delete(s);}
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
  if(t.perCard)return t.amount*api.allLayers(x).length;
  return t.amount*(t.graveFire?s.players[p].grave.filter(z=>faces(card(z)).some(f=>colors(f).includes('火'))).length:1);
 }
 // Source-owned battle effects are read only for the actual battle or its public preview.
 function battleAuras466(s,x){
  if(!s)return[];
  const p=s.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid));
  if(p<0)return[];
  return s.players[p].battle.flatMap(source=>{
   if(source.sealed)return[];
   const printed=card(source);
   if(!api.isCreature(s,source)&&!(printed.type==='field'&&printed.d2Field&&printed.g466BattleAura))return[];
   const r=effective(source,s).g466BattleAura;
   return r&&(!r.other||source.uid!==x.uid)&&(!r.sourceTapped||source.tapped)&&
    (!r.condition||ownCondition(s,p,r.condition,source.uid))&&matches(s,p,x,r.filter)?[r]:[];
  });
 }
 function blockProtected1201(s,x){
  const ref=s.attackLifecycle?.g1201Blocker;
  if(!ref||x.sealed||!api.isCreature(s,x))return false;
  if(key(x)===key(ref)&&card(x).g1238SelfBlockProtection&&!api.ignored(s,x))return true;
  return api.allLayers(x).some(y=>key(y)===key(ref))&&
   s.players[ref.p].battle.some(y=>card(y).g1201ProtectBlockers&&!y.faceDown&&!y.sealed&&
    api.isCreature(s,y)&&!api.ignored(s,y));
 }
 function battleSafe466(s,x,y,opponentPower){const c=effective(x,s);return !!c.g34BattleSafe||!!(c.g1697FireBattleSafe&&y&&colors(effective(y,s)).includes('火'))||hooks.destroySafe409(s,x)||!!(c.g466BattleSafe&&y&&opponentPower<=c.g466BattleSafe.maxOpponentPower)||!!(y&&effective(y,s).g466ProtectOpponent)||battleAuras466(s,x).some(r=>r.protect);}
 const reserved=own=>new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
 function look(s,t,owner=t.p){
  if(!t.g1826PublicReveal&&api.deckLocked(s,t.p))return [];
  const own=s.players[owner],held=reserved(own),ownLibrary=owner===t.p;
  const size=t.manaCountFilter?countDraw(s,t.p,{zone:'mana',filter:t.manaCountFilter}):t.n??3;
  const n=ownLibrary&&!t.g1826PublicReveal?api.lookCount(s,t.p,size):size;
  const replaced=ownLibrary&&api.lookPublic(s,t.p);
  const publicLook=t.public||replaced;
  const fromBottom=t.fromBottom&&!replaced;
  const available=own.deck.filter(x=>!held.has(x.uid));
  let rows=fromBottom?available.slice(Math.max(0,available.length-n)):available.slice(0,n);
  if(t.g1603UntilFilter){const stop=rows.findIndex(x=>matches(s,owner,x,t.g1603UntilFilter));if(stop>=0)rows=rows.slice(0,stop+1);}
  if(t.g1794UntilName){const stop=rows.findIndex(x=>faces(card(x)).some(face=>[creatureFaceName(face),...(face.additionalNames||[])].some(name=>exactName(name)===t.g1794UntilName)));if(stop>=0)rows=rows.slice(0,stop+1);}
  if(t.g1013ThroughNonMulti){
   const stop=rows.findIndex(x=>new Set(faces(card(x)).flatMap(colors)).size<2);
   if(stop>=0)rows=rows.slice(0,stop+1);
  }
  api.freshDeckLook1365(s,owner,rows);
  const ids=rows.map(x=>x.uid);
  (own.g34Protected??=[]).push(...ids);
  api.log(s,t.p,publicLook?'reveal':'look',card(t.source).name+'：山札の'+(fromBottom?'下':'上')+ids.length+'枚'+
   (publicLook?'を公開：'+rows.map(x=>card(x).name).join('・'):'を確認'),{cardId:t.source});
  return ids;
 }
 // QA44370 includes Dragon fields and seeds, and excludes Dragon spells.
 const dragonElement1248=c=>['creature','seed','field','gear','aura','duelist'].includes(c.type)&&race(c,'ドラゴン');
 const deckPeek841=(own,ids)=>({g585Peek:own.deck.filter(x=>ids.includes(x.uid))
  .map(x=>({id:x.cardId,label:'自分の山札'}))});
 function turnManaDown(s,t,ref){
  const y=s.players[ref.p].mana.find(y=>y.uid===ref.uid&&!y.faceDown&&(y.zoneSerial||0)===ref.serial);
  if(!y)return;
  y.faceDown=true;
  api.log(s,t.p,'manaFaceDown',card(t.source).name+'：'+card(y).name+'をマナゾーンで裏向きにした',{cardId:y.cardId});
 }
 function manaDownScore426(s,t,y){
  const own=s.players[t.p],remaining=new Set([...own.mana.filter(x=>x.uid!==y.uid).flatMap(x=>api.manaColors(card(x),s,t.p)),...api.manaColors({civilizations:[],civ:'ゼロ'},s,t.p)]),lost=api.manaColors(card(y),s,t.p).filter(c=>!remaining.has(c)),rows=[...own.hand,...own.battle,...own.grave].map(card),synergy=rows.some(c=>c.g260Self?.filter?.g286FaceDownMana!==undefined||c.g261Discount?.filter?.g286FaceDownMana!==undefined||c.g34Tasks?.some(d=>d.filter?.g286FaceDownMana!==undefined)),zero=(card(y).manaValue??(colors(card(y)).length===5?0:1))===0&&!(s.g35ZeroMana||[]).some(r=>r.p===t.p);
  return(zero?10:synergy?12:0)-lost.length*30+(synergy&&y.tapped?1:0);
 }
 const release=(s,p,uid)=>{for(const k of['g34Protected','g35Protected'])s.players[p][k]=(s.players[p][k]||[]).filter(x=>x!==uid);};
 function zoneMove(s,p,from,uid,to,t={}){if(!api.canMoveZone(s,p,from)||from==='hand'&&to==='mana'&&!api.canHandMana(s,p))return;const shieldOwner=t.g904ShieldOwner??p;if(to==='shields'&&!api.canAddShield(s,shieldOwner)){if(from==='deck')release(s,p,uid);return;}const own=s.players[p];if(from==='battle'){move(s,[{player:p,uid,to,destroy:to==='grave',controller:t.controller??p}]);return;}if(from==='mana'&&to==='grave')api.markCarolFromMana(s,p,own.mana.find(x=>x.uid===uid));const x=remove(own[from],uid);if(!x)return;if(from==='deck')release(s,p,uid);let dest=to;if(from==='deck'&&['mana','shields'].includes(to)&&api.deckRedirect(s,p))dest='grave';if(to==='mana'&&!(from==='hand'&&t.g182HandMana)&&api.manaRedirect(s,p))dest='grave';if(from==='deck')dest=api.deckDestination1365(s,p,to,dest);clear(x,dest);if(dest==='shields'&&t.g657FaceUp)x.faceUp=true;if(dest==='mana'){if(t.faceDown){x.faceDown=true;x.tapped=!!t.tapped;}else if(t.tapped)x.tapped=true;}if(t.g183Return&&dest==='deckTop')own.deck.unshift(x);else api.addZone(s,dest==='shields'?shieldOwner:dest==='hand'&&t.toOwnerHand?(x.cardOwner??p):p,dest,x);if(from==='hand'&&dest==='mana')api.handMana(s,p,x);if(dest==='shields')api.notifyShieldAdded(s,shieldOwner,x);return dest!=='grave'||own.grave.includes(x);}
 const attacking587=(s,x)=>x.uid===s.attack?.attacker||x.uid===s.attackLifecycle?.uid&&(x.incarnation||0)===(s.attackLifecycle.incarnation||0);
 const currentPower506=(s,x)=>api.power(x,attacking587(s,x),s);
 function lowestPower741(s,rows,extreme='min'){
  const eligible=rows.filter(y=>!y.sealed);
  const power=Math[extreme](...eligible.map(y=>currentPower506(s,y)));
  return eligible.filter(y=>currentPower506(s,y)===power);
 }
 function fitsPower506(s,t,x){
  if(t.g506PowerBudget===undefined||t.g506PowerBudget==='∞'&&!t.g1226StrictPower)return true;
  const used=(t.rows||[]).reduce((n,r)=>{
   const y=s.players[r.p].battle.find(y=>y.uid===r.uid);
   return n+(y?currentPower506(s,y):0);
  },0);
  const total=used+currentPower506(s,x);
  if(t.g1226StrictPower)return total<(t.g506PowerBudget==='∞'?Infinity:t.g506PowerBudget);
  return total<=t.g506PowerBudget;
 }
 // Use effective costs, snapshot all targets before moving them, and allow equality at the cap.
 function fitsCost513(s,t,x){if(t.g513CostBudget===undefined)return true;const used=(t.rows||[]).reduce((n,r)=>{const y=s.players[r.p][r.origin].find(y=>y.uid===r.uid);return n+(y?cost(effective(y,s)):0);},0);const p=s.players.findIndex(own=>own.battle.some(y=>y.uid===x.uid));return p>=0&&used+cost(effective(x,s))<=t.g513CostBudget;}
 // An extra-zone choice may use either eligible face of the same physical card.
 // Setting the visible face on entry does not mark the creature as having awakened this turn.
 const psychicBack1104=x=>({...x,g1085Awakened:true});
 function extraFaces1104(x,t,origin){
  const back=origin==='extra'&&card(x.cardId).g1085Back;
  return back&&(t.g1104PsychicFaces||t.deploy&&(back.g464OnceSummon?.execution||card(x.cardId).g1349PsychicInvasion))?[x,psychicBack1104(x)]:[x];
 }
 const selectionKey1104=x=>key(x)+(x.g1085Awakened?':back':':front');
 const spent550=t=>(t.rows||[]).reduce((n,r)=>n+(r.cost550||0),0);
 function fitsCost550(s,t,x,p,origin){return t.g550CostBudget===undefined||spent550(t)+cost(api.zoneCard(s,p,x,origin))<=t.g550CostBudget;}
 function deploymentState550(s,t){if(t.g550CostBudget===undefined&&!t.g1669CostSlots||!t.rows?.length)return s;const future=t.rows.flatMap(r=>{const x=s.players[r.p][r.origin].find(y=>y.uid===r.uid&&(y.zoneSerial||0)===(r.serial550??r.serial1669??0));return x?[r.g1104Back?psychicBack1104(x):x]:[];});return{...s,players:s.players.map((own,p)=>p===t.p?{...own,battle:[...own.battle,...future]}:own)};}
 function deployValue550(s,p,x){const c=card(x),n=s.players[p].deck?.length??s.players[p].deckCount??0,draw=c.effect==='draw2'?2:c.effect==='magicDraw'?1:0,entry=modeScore(s,{p,source:c.id},c.g34Tasks||[]);if(entry<=-900||draw>=n&&draw>0)return-1000;return 12+Math.min(30,cost(c)*2)+(c.type==='creature'?Math.min(10,(Number(c.power)||0)/3000):0)+entry+draw*10;}
 // QA36572: select exactly the printed total, while permitting an evolution
 // whose base is selected first. Speculation changes neither zones nor state.
 function exactBudgetChoices1735(s,t){
  const memo=new Map();
  const append=(next,r)=>({...next,selected:[...(next.selected||[]),r.x.uid],rows:[...(next.rows||[]),
   {uid:r.x.uid,p:r.p,origin:r.origin,cost550:cost(api.zoneCard(s,r.p,r.x,r.origin)),serial550:r.x.zoneSerial||0}]});
  function completes(next){
   const left=next.g550CostBudget-spent550(next);
   if(left===0)return true;
   const key=(next.selected||[]).slice().sort().join('|');
   if(memo.has(key))return memo.get(key);
   // A cost-only upper bound includes evolutions not yet able to enter. It
   // rejects impossible sums without exploring every ordering of identical costs.
   const sums=new Set([0]);
   for(const r of list(s,{...next,deploy:false})){
    const n=cost(api.zoneCard(s,r.p,r.x,r.origin));
    for(const sum of [...sums])if(sum+n<=left)sums.add(sum+n);
   }
   if(!sums.has(left)){memo.set(key,false);return false;}
   const possible=list(s,next).some(r=>completes(append(next,r)));
   memo.set(key,possible);return possible;
  }
  return list(s,t).filter(r=>completes(append(t,r)));
 }
 function budgetScores550(s,t,rows,n){
  const cap=t.g550CostBudget-spent550(t);
  const slots=Math.min(rows.length,n-(t.selected?.length||0),t.origin==='deck'?Math.max(0,s.players[t.p].deck.length-1-(t.selected?.length||0)):Infinity);
  const items=rows.map(r=>({...r,cost:cost(api.zoneCard(s,r.p,r.x,r.origin)),value:deployValue550(s,t.p,r.x)}));
  const groups=new Map();
  for(const item of items){
   const faces=groups.get(item.x.uid)||[];
   faces.push(item);
   groups.set(item.x.uid,faces);
  }
  function best(excludedUid,budget,count){
   const dp=new Map([['0:0',0]]);
   let score=0;
   for(const [uid,faces] of groups){
    if(uid===excludedUid)continue;
    const previous=[...dp];
    for(const face of faces){
     if(face.value<=0)continue;
     for(const [k,value] of previous){
      const [spent,picked]=k.split(':').map(Number);
      if(spent+face.cost>budget||picked+1>count)continue;
      const nextKey=(spent+face.cost)+':'+(picked+1),next=value+face.value;
      if(next>(dp.get(nextKey)??-Infinity))dp.set(nextKey,next);
      score=Math.max(score,next);
     }
    }
   }
   return score;
  }
  return new Map(items.map(x=>[selectionKey1104(x.x),slots<=0||x.value<=0?-1000:x.value+best(x.x.uid,cap-x.cost,slots-1)]));
 }
 function multicolorUntap806(s,p,x,origin){
  if(x.sealed||x.faceDown&&origin!=='mana')return false;
  const cs=origin==='mana'?api.manaColors(api.zoneCard(s,p,x,'mana'),s,p):colors(effective(x,s,true));
  return cs.filter(color=>color!=='ゼロ').length>1;
 }
 // Restrict deployment to the recorded grave visit or the matching creature face in mana.
 function matchesDeathDeployment960(t,x){
  if(t.g960FormerBases){
   return (!t.deploy||!card(x).gCastle)&&t.g960FormerBases.some(ref=>ref.uid===x.uid&&ref.serial===(x.zoneSerial||0));
  }
  if(!t.g960DeathNames)return true;
  const c=card(x);
  return !x.faceDown&&c.type==='creature'&&t.g960DeathNames.includes(exactName(creatureFaceName(c)));
 }
 // Cost slots are a multiset captured before any of the chosen creatures enter.
 const costKey1669=n=>n===Infinity?'∞':n;
 function fitsCostSlots1669(s,t,p,x,origin){
  if(!t.g1669CostSlots)return true;
  const value=costKey1669(cost(api.zoneCard(s,p,x,origin)));
  return t.g1669CostSlots.filter(n=>n===value).length>(t.rows||[]).filter(r=>r.cost1669===value).length;
 }
 // The D2 controller decides whether the player who used the card draws.
 function alchemistUse1670(s,player){
  for(const owner of [s.active,1-s.active])for(const x of s.players[owner].battle)
   if(!x.sealed&&!x.faceDown&&card(x).g1670Alchemist&&effective(x,s).g1670Alchemist)
    queue(s,owner,x,[{op:'AlchemistDraw1670',drawPlayer:player}]);
 }
 // Linked Gods are one creature before departure. A chosen part retains that
 // creature's last-known characteristics even when it is not the stored root.
 const deathVictim1674=(rows,p,x)=>rows?.find(y=>y.p===p&&(key(y)===key(x)||y.g1674GodParts?.some(ref=>key(ref)===key(x))));
 function manaCivilizations1672(s,p,c){
  const available=new Set(s.players[p].mana.filter(x=>!x.faceDown)
   .flatMap(x=>api.manaColors(api.zoneCard(s,p,x,'mana'),s,p)));
  return colors(c).every(color=>available.has(color));
 }
 function haridelSelection1675(s,t){
  return {...t,origin:'grave',deploy:true,filter:{creature:true},
   g960FormerBases:s.g1672Destroyed?.turn===s.turn?s.g1672Destroyed.cards[t.p]:[]};
 }
 function dSwitchScore1669(s,t){
  const own=s.players[t.p];
  if(t.defs[0]?.op==='HaridelReturn1675')return list(s,haridelSelection1675(s,t)).length?20:-1;
  if(t.defs[0]?.g1675ExtraSummon)return list(s,{...t,...t.defs[0],deploy:true,execution:true,
   g1104PsychicFaces:true,filter:{...t.defs[0].filter,max:t.defs[0].max}}).length?20:-1;
  if(t.defs[0]?.op==='Select'&&t.defs[0].to==='shields')return own.hand.length?10:-1;
  if(t.defs[0]?.op==='GroupUntap'&&t.defs[1]?.op==='GroupGrant364')return creatures(s,t.p).some(x=>!x.sealed)?10:-1;
  if(t.defs[0]?.op==='GroupUntap')return creatures(s,t.p).some(x=>x.tapped&&api.canUntap(x))?15:-1;
  if(t.defs[0]?.op==='FunkyMinus1674')return own.grave.some(y=>!y.faceDown&&api.zoneCard(s,t.p,y,'grave').type==='creature')&&creatures(s,1-t.p).some(y=>!y.sealed)?20:-1;
  if(t.defs[0]?.op==='Put')return list(s,{...t,...t.defs[0],deploy:true}).length?20:-1;
  if(t.defs[0]?.op==='FionaAttackPreference1673')return creatures(s,1-t.p).some(x=>!x.sealed)&&creatures(s,t.p).some(x=>x.tapped)?10:-1;
  if(t.defs[0]?.op==='TapAll')return creatures(s,1-t.p).some(x=>!x.tapped)?15:-1;
  if(t.defs[0]?.op==='BritishReturn1672')return s.g1672Destroyed?.turn===s.turn&&own.grave.some(x=>
   s.g1672Destroyed.cards[t.p].some(r=>r.uid===x.uid&&r.serial===(x.zoneSerial||0)))?15:-1;
  if(t.defs[0]?.op==='LauncherRamp1672')return own.deck.length>1?12:-1000;
  if(t.defs[0]?.op==='Execute'){
   const d=t.defs[0];
   if(d.g1672ManaCivilizations)return own.hand.some(x=>faces(card(x)).some(c=>c.type!=='creature'&&cost(c)<=d.max&&
    manaCivilizations1672(s,t.p,c)&&api.canCast(s,t.p,c,'hand')&&api.canExecuteUnpaid(s,t.p,c)))?20:-1;
   return own.hand.some(x=>faces(card(x)).some(c=>c.type==='spell'&&cost(c)<=d.max&&colors(c).includes(d.g556SpellColor)&&
    api.canCast(s,t.p,c,'hand')&&api.canExecuteUnpaid(s,t.p,c)))?20:-1;
  }
  if(t.defs[0]?.op==='TenderBlock1670')return creatures(s,1-t.p).some(x=>!x.sealed&&effective(x,s).blocker)?12:-1;
  if(t.defs[0]?.op==='AlchemistShuffle1670')return own.deck.length+own.hand.length+own.grave.length<=5?-1000:own.hand.length<4?20:-1;
  if(t.defs[0]?.op==='HandCycle460')return own.hand.some(x=>matches(s,t.p,x,t.defs[0].filter))&&creatures(s,1-t.p).some(x=>!x.sealed)?15:-1;
  if(t.defs[0]?.op==='WalsraDeploy1669'){
   const slots=creatures(s,t.p).filter(x=>!x.sealed&&!x.faceDown).map(x=>costKey1669(cost(effective(x,s))));
   return list(s,{p:t.p,origin:'hand',deploy:true,filter:{creature:true},g1669CostSlots:slots}).length?20:-1;
  }
  if(t.defs[0]?.op==='ManaDeploy523')return list(s,{p:t.p,origin:'mana',deploy:true,filter:{creature:true,max:own.mana.length}}).length?20:-1;
  return creatures(s,1-t.p).some(x=>!x.sealed&&!x.tapped)&&creatures(s,t.p).some(x=>!x.sealed)?10:-1;
 }
 function list(s,t){if(t.g1779PhysicalOwnCards){const p=t.owner??t.p;return [...cardMoveRows579(s,{...t,p,owner:p,zones:['hand','battle']}).values()].filter(r=>!(t.selected||[]).includes(r.x.uid)&&api.targetable(s,p,p,r.x));}const p=t.owner==='self'?t.p:t.owner==='opponent'?1-t.p:t.owner??t.p,own=s.players[p];return(t.zones||[t.origin||'hand']).flatMap(origin=>((t.g210ManaUntap||t.g806MultiUntap||t.g803DeployForOwner||t.g837Reikon||t.g1009AfterMoveAttempt||t.g1011ChooseBeforeMove||api.canMoveZone(s,p,origin))?own[origin]||[]:[]).flatMap(x=>extraFaces1104(x,t,origin)).filter(x=>(t.g1121RepeatTarget||!(t.selected||[]).includes(x.uid))&&(!t.g187OwnPick||!x.sealed)&&(!t.g186Other||x.uid!==t.uid)&&(!t.g179Other||!api.allLayers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)))&&(!t.g899RampTapped||!api.allLayers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)))&&(origin!=='battle'||!t.g1654CreatureOrMana||api.isCreature(s,x))&&matches(s,p,x,t.filter)&&matchesDeathDeployment960(t,x)&&fitsCostSlots1669(s,t,p,x,origin)&&(!t.g1593DistinctNames||!(t.selected||[]).some(uid=>{const selected=own[origin]?.find(y=>y.uid===uid);return selected&&creatureFaceName(card(selected))===creatureFaceName(card(x));}))&&(!t.g806MultiUntap||multicolorUntap806(s,p,x,origin))).filter(x=>t.g409Budget===undefined||!x.faceDown&&(t.rows||[]).reduce((n,r)=>n+cost(card(s.players[r.p][r.origin].find(y=>y.uid===r.uid))),0)+cost(api.zoneCard(s,p,x))<(t.g409Budget==='∞'?Infinity:t.g409Budget)).filter(x=>(!t.g530Ids||t.g1633ExtraOrigins?.includes(origin)||t.g1114HandAndDeck&&origin==='hand'||t.g530Ids.includes(x.uid))&&fitsPower506(s,t,x)&&fitsCost513(s,t,x)&&fitsCost550(s,t,x,p,origin)).filter(x=>!t.deploy||canPut(deploymentState550(s,t),p,x,origin,!!t.execution)).filter(x=>origin!=='battle'||(t.implicitBattleSelection&&!x.sealed)||t.g1046NoChoiceProtection&&!externalProtection565(s,x).g1082ChoiceProtected||!api.targetable||api.targetable(s,t.p,p,x)).map(x=>({x,origin,p})));}
 function scryScore323(s,t,x){const c=card(x),magi=card(t.source).g34Attack?.find(d=>d.op==='Magibomber321');return api.isCreature(s,x)&&cost(c)<=(magi?.n||0)||cost(c)<=s.players[t.p].mana.length+1?-5:5;}
 function selectedBattleScore(s,t,x,candidates,n){
  if(t.g1121RepeatTarget&&t.selected.includes(x.uid))return -20;
  if(t.anyOwner&&t.to==='hand'&&(s.players[t.p].battle.includes(x)||!api.canLeave(s,1-t.p,x)))return -10;
  if(t.g190Freeze==='end'&&(x.tapped||s.active===t.p&&!effective(x,s).blocker))return -1;if(t.g510Untap)return x.tapped&&api.canUntap(x)?15+Math.min(20,cost(effective(x,s)))*2:-10;if(t.g506PowerBudget!==undefined)return 15+Math.min(20,cost(effective(x,s)))*2+Math.min(20,Math.max(0,currentPower506(s,x)/3000));if(t.g193Tap&&!t.g210TapLock&&!(t.g743NeoLock&&sourceNeo563(s,t))&&x.tapped){const forced=candidates.filter(r=>effective(r.x,s).forceTarget).length;return effective(x,s).forceTarget&&n-(t.selected?.length||0)>forced&&candidates.some(r=>!r.x.tapped)?1:-10;}return 15+cost(effective(x,s))*2+api.power(x,false,s)/3000-(t.to==='mana'?3:0);}
 function secondDestroy1163(s,t,excludeUid){
  start(s,t,[{op:'IfOwn',filter:t.g1163SecondDestroy,defs:[{op:'Target',to:'grave',excludeUid}]}]);
 }
 function attackCondition225(s,p,rule,x){
  const own=s.players[p],bodies=()=>own.battle.filter(y=>!y.sealed&&api.isCreature(s,y));
  switch(rule.kind){
   case'distinctCosts':return ownCondition(s,p,{g466DistinctCosts:rule.min},x?.uid);
   case'noOtherUntapped':return![0,1].some(who=>creatures(s,who).some(y=>!y.sealed&&y.uid!==x?.uid&&!y.tapped));
   case'entries':return(own.enteredThisTurn||0)>=rule.min;
   case'ownBattleWin':return s.g587BattleWins?.turn===s.turn&&s.g587BattleWins.players[p];
   case'creatureDeath':return s.g612CreatureDeathTurn===s.turn;
   case'tyrannoDrake925':return s.g481Attackers?.turn===s.turn&&
    s.g481Attackers.events.some(e=>e.p===p&&e.tyrannoDrake925);
   case'spells':return(s.g37Spells?.[p]?.turn===s.turn?s.g37Spells[p].n:0)>=rule.min;
   case'draws':return(own.drawsThisTurn||0)>=rule.min;
   case'noncreatureUses':return(s.g448NoncreatureUses?.[p]?.turn===s.turn?s.g448NoncreatureUses[p].n:0)>=rule.min;
   case'opponentCreatures':return creatures(s,1-p).filter(y=>!y.sealed).length>=rule.min;
   case'selfEvolution':return !!x&&api.isEvolution(x);
   case'stackCards':return !!x&&api.allLayers(x).length>=rule.min;
   case'ally':return bodies().some(y=>(!rule.other||y.uid!==x?.uid)&&matches(s,p,y,rule.filter));
   case'otherAttack':{
    const refs=new Set(x?api.allLayers(x).map(y=>y.uid+'@'+(y.incarnation||0)):[]);
    if(s.g481Attackers?.turn!==s.turn)return false;
    const events=s.g481Attackers.events.filter(event=>(!rule.own||event.p===p)&&(!rule.color||event.g1699Colors?.includes(rule.color))&&!event.refs.some(ref=>refs.has(ref)));
    // Count distinct attacking creatures, rather than repeated attacks by one creature.
    return rule.min>1?new Set(events.map(event=>event.refs[0])).size>=rule.min:events.length>0;
   }
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
 function force546(s,t,p,y=null){if(y?.sealed)return;const when=t.g546Force||t.when,refs=y?api.allLayers(y).map(z=>({uid:z.uid,incarnation:z.incarnation||0})):null;(s.extLimits??=[]).push({kind:'g546Force',controller:t.p,player:p,when,turn:s.turn,...(t.g1106NoTapInstead?{g1106NoTapInstead:true}:{}),...(t.g996ForceOnce?{once:true}:{}),...(refs?{refs}:{}),expires:when==='nextOpponent'?'manual546':when==='untilOwnStart'?'start':'end',who:when==='untilOwnStart'?t.p:s.active,...(t.spell?{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{})});}
 function hasForce546(s,p,x,onlyTapRestriction=false){
  const refs=api.allLayers(x).map(key);
  return (s.extLimits||[]).some(l=>l.kind==='g546Force'&&(!onlyTapRestriction||l.g1106NoTapInstead)&&(l.refs?l.refs.some(r=>refs.includes(key(r))):l.player===p)&&(!l.once||s.g481Attackers?.turn!==s.turn||!s.g481Attackers.events.some(e=>e.refs.some(r=>refs.includes(r))))&&(l.when!=='nextOpponent'||s.active===1-l.controller&&s.turn>l.turn)&&(l.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource})));
 }
 function forced546(s,p,x){if(x.sealed)return false;if(forceAttack224(s,p)||hasForce546(s,p,x))return true;return s.g481Attackers?.turn===s.turn&&s.players[p].battle.some(y=>y.uid!==x.uid&&!y.sealed&&card(y).g546AttackForceOthers&&!api.ignored(s,y)&&s.g481Attackers.events.some(e=>api.allLayers(y).some(z=>e.refs.includes(key(z)))));}
 function forceAttack224(s,p){return [0,1].some(owner=>s.players[owner].battle.some(y=>{const rule=card(y).g224ForceAttack;return rule&&!y.sealed&&api.isCreature(s,y)&&!api.ignored(s,y)&&(rule.owner==='both'||p!==owner)&&(!rule.tapped||y.tapped)&&(!rule.opponentTurn||s.active!==owner);}));}
 // All assignments are chosen before any card moves. Remove the inspected set
 // together, then publish every destination before queued zone triggers resolve.
 function distribute255(s,t){
  if(!api.canMoveZone(s,t.p,'deck')){for(const uid of[...(t.g255Plans||[]).map(r=>r.uid),...t.ids])release(s,t.p,uid);return;}
  const own=s.players[t.p],rest=['grave','mana'].includes(t.rest)?t.rest:'deck';
  const plans=[...(t.g255Plans||[]),...t.ids.map(uid=>({uid,to:rest}))];
  const host=plans.some(r=>r.to==='under')?sourceHost474(s,t):null;
  const rows=plans.flatMap(r=>{
   release(s,t.p,r.uid);
   if(r.to==='shields'&&!api.canAddShield(s,t.p))return [];
   if(r.to==='under'&&(!host||host.x.sealed||!api.isCreature(s,host.x)))return [];
   const x=remove(own.deck,r.uid);
   if(!x)return [];
   const redirect=r.to==='mana'&&(api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p))||
    ['shields','under'].includes(r.to)&&api.deckRedirect(s);
   const to=api.deckDestination1365(s,t.p,r.to,redirect?'grave':r.to);
   clear(x,to);
   if(to==='mana'&&(r.tapped||r.tapMulticolor&&api.manaColors(card(x)).length>1))x.tapped=true;
   return [{...r,to,x}];
  });
  for(const r of rows.filter(r=>r.to==='deck'))own.deck.push(r.x);
  for(const {x,reveal} of rows)if(reveal)api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(x).name,{cardId:x.cardId});
  for(const {x,to} of rows)if(to==='under')(host.x.under??=[]).push(x);
  for(const zone of['hand','mana','grave','shields','deckShuffle1365','graveReplacement1365']){
   const xs=rows.filter(r=>r.to===zone).map(r=>r.x);
   if(xs.length)api.addZone(s,t.p,zone,...xs);
   if(zone==='shields')for(const x of xs)api.notifyShieldAdded(s,t.p,x);
  }
  if(t.g1165ManaFinishColor&&rows.some(({to,x})=>to==='mana'&&own.mana.includes(x)&&
   !x.faceDown&&api.manaColors(api.zoneCard(s,t.p,x,'mana'),s,t.p).includes(t.g1165ManaFinishColor)))
   start(s,t,[{op:'SpellFinish416',to:'hand'}]);
  api.deckCheck(s,t.p);
 }
 function ponyShieldCards949(root){
  return api.shieldCards(root).filter(x=>!x.g37ShieldHeld&&
   !(x.faceUp&&card(x).type==='castle'&&!card(x).gCastle));
 }
 function peekPonyShield949(s,t,selected){
  const {uid,cardId}=selected,c=card(selected);
  const deploy=c.type==='creature'&&!api.isEvolution(selected)&&api.canEnter(s,t.p,c,{origin:'shields',execution:false});
  api.log(s,t.p,'look',card(t.source).name+'でシールドカードを確認（内容は非公開）',{cardId:t.source});
  choice(s,{...t,op:'g34_PonyDeploy949',selected:uid,g585Peek:[{id:cardId,label:'相手が選んだ自分のシールドカード'}]},
   deploy?'確認したカードをバトルゾーンに出しますか？':'選ばれたシールドカードを確認',
   [...(deploy?[opt('バトルゾーンに出す',true,c.shieldGo&&selected.faceUp?-10:20)]:[]),
    opt(deploy?'シールドに残す':'確認を終える',null,0)]);
 }
 function peekRows585(s,t){
  const owners=t.who==='both'?[t.p,1-t.p]:[t.who==='self'?t.p:1-t.p];
  return owners.flatMap(p=>s.players[p].shields.flatMap((root,i)=>{
   const group=api.shieldCards(root).filter(x=>{
    if(t.g1166RevealShield||t.g1262GroupSwap)return !x.faceUp||card(x).type!=='castle'||card(x).gCastle;
    return !t.g962ShieldContents||!x.faceUp||!card(x).gCastle;
   });
   const label=(p===t.p?'自分':'相手')+'のシールド '+(i+1);
   if(t.cardOnly)return group.map((x,j)=>({x,p,seen:[x],label:label+' のカード '+(j+1)}));
   return [{x:root,p,seen:group,label}];
  }));
 }
 function showPeek585(s,t,rows){
  const seen=rows.flatMap(r=>r.seen.map(x=>({id:x.cardId,label:r.label})));
  if(t.hand)seen.push(...s.players[1-t.p].hand.map(x=>({id:x.cardId,label:'相手の手札'})));
  if(!seen.length)return;
  const uid=t.swap||t.g1262GroupSwap||t.g1682MiniRobo?rows[0]?.x.uid:null;
  const swap=uid&&(t.g1262GroupSwap?api.canSwapShieldGroup1262(s,t.p,uid):api.canSwapShield585(s,t.p,uid));
  const zone=t.opponentDeckTop?(t.hand?'相手の山札の上と手札':'相手の山札の上'):t.hand?'手札とシールド':'シールド';
  api.log(s,t.p,'look',card(t.source).name+'で'+zone+'を確認（内容は非公開）',{cardId:t.source});
  if(t.g1682MiniRobo){
   choice(s,{...t,op:'g34_PeekRead585',g585Peek:seen,shieldUid:uid,shieldOwner:rows[0].p},
    '確認したシールドを持ち主の山札の一番下に置かせますか？',
    [opt('山札の下に置かせ、新しいシールドを追加する',true,seen.some(r=>faces(card(r.id)).some(c=>c.trigger))?10:0),opt('確認を終える',null,1)]);
   return;
  }
  if(t.g1166RevealShield){
   const cards=rows[0].seen;
   choice(s,{...t,op:'g34_PeekRead585',g585Peek:seen,g1166ShieldCards:cards.map(x=>x.uid)},
    '確認したシールドカードをすべて表向きにしますか？',
    [opt('すべて表向きにする',true,0),opt('確認を終える',null,1)]);
   return;
  }
  choice(s,{...t,op:'g34_PeekRead585',g585Peek:seen,shieldUid:uid},swap?'確認したカードを山札の上のカードと入れ替えますか？':'確認したカード',[
   ...(swap?[opt('入れ替える',true,seen.some(r=>faces(card(r.id)).some(c=>c.trigger))?-10:6)]:[]),
   opt(swap?'入れ替えずに確認を終える':'確認を終える',null,0)
  ]);
 }
 function contractScore583(own,x,selected){
  if(selected+1>=own.deck.length)return -1000;
  return own.hand.length+selected<4&&(own.mana.length-selected>3||x.tapped)?8:0;
 }
 const exchangeElement753=c=>['creature','seed','field','gear','aura','duelist'].includes(c.type);
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
 function psychicLinkChoices1358(s,p,host,{partner,partners}){
  if(!host||!card(host.cardId).g1355LinkedFace)return [];
  let groups=[[]];
  for(const id of partners??[partner]){
   const matches=api.psychicLinkPartners1355(s,p,host,id);
   groups=groups.flatMap(group=>matches.filter(x=>!group.includes(x)).map(x=>[...group,x]));
  }
  return groups;
 }
 function dragheartOptions1361(s,t){
  const own=s.players[t.p];
  const mana=t.weaponOnly?new Set(own.mana.flatMap(x=>x.faceDown?[]:api.manaColors(card(x),s,t.p))):null;
  return own.extra.flatMap(x=>card(x).g1824DoubleFortress?[x,{...x,dragheartFlipped:true}]:[x]).filter(x=>{
   const c=api.zoneCard(s,t.p,x,'extra');
   if(!c.dragheart)return false;
   if(t.options)return t.options.some(r=>cost(c)<=r.max&&(!r.color||colors(c).includes(r.color)));
   if(t.max!==undefined)return cost(c)<=t.max;
   return t.weaponOnly?c.type==='weapon'&&cost(c)<=(t.weaponMax??4)&&colors(c).some(color=>mana.has(color)):
    cost(c)<=3||cost(c)<=5&&colors(c).includes('光');
  }).filter(x=>api.canEnter(s,t.p,api.zoneCard(s,t.p,x,'extra'),{origin:'extra',execution:false}));
 }
 function selection(s,t){
  let candidates=t.anyOwner?[...list(s,{...t,owner:'opponent'}),...list(s,{...t,owner:'self'})]:list(s,t);
  if(t.g1735ExactBudget)candidates=exactBudgetChoices1735(s,t);
  if(t.g1111DistinctNames){
   const chosen=new Set(t.rows.map(row=>row.g1111Name));
   candidates=candidates.filter(({x})=>!chosen.has(exactName(card(x).name)));
  }
  if(t.excludeUid)candidates=candidates.filter(({x})=>x.uid!==t.excludeUid);
  if(t.g984OnePerSide&&t.rows.length)candidates=candidates.filter(r=>r.p!==t.rows[0].p);
  if((t.g837Reikon||t.exactOptional)&&t.selected.length+candidates.length<t.n)return;
  if(t.g779DistinctTapState&&t.selected.length){
   const first=s.players[t.rows[0].p].battle.find(x=>x.uid===t.selected[0]);
   if(first)candidates=candidates.filter(({x})=>!!x.tapped!==!!first.tapped);
  }
  if(t.g626DistinctEvolution&&t.selected.length){
   const first=s.players[t.p].grave.find(x=>x.uid===t.selected[0]);
   if(first)candidates=candidates.filter(r=>api.isEvolution(r.x)!==api.isEvolution(first));
  }
  if(t.g1316DeployPair&&t.rows.length){
   const {p,origin,uid}=t.rows[0],first=s.players[p][origin].find(x=>x.uid===uid);
   const [seed,demon]=t.g1316DeployPair;
   candidates=first?candidates.filter(r=>matches(s,p,first,seed)&&matches(s,r.p,r.x,demon)||
    matches(s,p,first,demon)&&matches(s,r.p,r.x,seed)):[];
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
  const targets=t.g984OnePerSide?[t.p,1-t.p].flatMap(p=>targetOptions(s,t.p,candidates.filter(r=>r.p===p).map(r=>r.x)))
   :t.g173Targets?targetOptions(s,t.p,candidates.map(r=>r.x)):null;
  const eligible=targets&&new Set(targets.map(o=>o.value)),rows=eligible?candidates.filter(r=>eligible.has(r.x.uid)):candidates,n=t.n==='all'?Infinity:t.n??1;
  if(!rows.length&&t.g585Peek?.length&&!t.selected.length){
   choice(s,t,'確認したカード',[opt('確認を終える',null,0)]);
   return;
  }
  if((t.selected?.length||0)>=n||!rows.length){if(t.selected?.length||t.g891BouncePair&&!t.g891OwnStage)finishSelect(s,t);else if(t.after)start(s,t,t.after);return;}const scores550=t.g550CostBudget===undefined?null:budgetScores550(s,t,rows,n);choice(s,t,t.title||('カードを'+n+'枚'+(t.optional?'まで':'')+'選ぶ'),[...rows.map(({x,origin,p})=>opt((t.anyOwner?(p===t.p?'自分：':'相手：'):'')+(t.zones?.length>1?({mana:'マナ：',grave:'墓地：',hand:'手札：',...(t.g1114HandAndDeck?{deck:'山札：'}:{})}[origin]||''):'')+(x.faceDown?'裏向きのカード':card(x).name)+((t.g210ManaUntap||t.g806MultiUntap)?(x.tapped?(api.canUntap(x)?'（タップ中）':'（タップ中・アンタップ不可）'):'（アンタップ）'):''),{uid:x.uid,origin,p,...(t.g1669CostSlots?{cost1669:costKey1669(cost(api.zoneCard(s,p,x,origin))),serial1669:x.zoneSerial||0}:{}),...(origin==='extra'&&x.g1085Awakened?{g1104Back:true}:{}),...(scores550?{cost550:cost(api.zoneCard(s,p,x,origin)),serial550:x.zoneSerial||0}:{})},scores550?scores550.get(selectionKey1104(x)):t.g583DrawMoved?contractScore583(s.players[p],x,t.selected.length):t.g405Search&&origin==='deck'&&s.players[t.p].deck.length<=1?-1000:(t.g210ManaUntap||t.g806MultiUntap)?(x.tapped&&api.canUntap(x)?25:-1):x.faceDown?15:t.g530Ids&&origin==='deck'&&(t.selected?.length||0)+1>=s.players[t.p].deck.length?-1000:t.score??(t.g899RampTapped?(s.players[t.p].deck.length>t.selected.length+1?12:-1000):t.g193Select?selectedBattleScore(s,t,x,candidates,n):t.g187OwnPick?-cost(card(x))-api.power(x,false,s)/10000:t.g182HandMana||t.g183Return||t.g184ManaLoss?15-cost(card(x)):t.to==='grave'?-cost(card(x)):15+cost(card(x))),x.faceDown?null:x.cardId)),...(t.optional&&(!t.g1735ExactBudget||spent550(t)===t.g550CostBudget)&&t.selected.length>=(t.minimum??0)&&(!t.g626DistinctEvolution||!t.selected.length)?[opt(t.exactOptional?'使わない':t.g837Reikon&&n>1?'返霊を使わない':t.g626DistinctEvolution?'戻さない':'ここまでで確定',null,0)]:[])]);}
 function freeze(s,t,p,y){
  if(!y||y.sealed)return;
  const ref={uid:y.uid,incarnation:y.incarnation||0},end=t.g190Freeze==='end';
  for(const kind of ['attack','block'])(s.extLimits??=[]).push({
   kind,g190Freeze:true,player:p,...(t.g1411MaxCost===undefined?{}:{g1411MaxCost:t.g1411MaxCost}),...(t.g1058FollowUnit?{ref,g1058FollowUnit:true}:ref),
   controller:t.controller??t.p,expires:end?'end':'start',
   who:end?s.active:t.g190Freeze==='opponent'?1-t.p:t.p,
   ...(t.spell?{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{})
  });
 }
 function stopPlayerAttack567(s,t,y){
  (s.extLimits??=[]).push({kind:'g567PlayerStop',ref:{uid:y.uid,incarnation:y.incarnation||0},controller:t.p,expires:t.g567PlayerStop,who:t.g567PlayerStop==='start'?t.p:s.active,...(t.spell===false?{}:{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))})});
 }
 function startUntapLock210(t,y){if(t.spell)(y.g170StartFreeze??=[]).push({spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))});else y.skipUntap=true;}
 const timedGrant335=(s,t,grant)=>({turn:s.turn,...grant,...(t.spell?{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{})});
 // Evolution and reconstruction inherit grants. Leaving the battlefield clears them.
 function attachedUnit1269(s,t,kind){
  const mark=key(t)+':'+kind;
  for(const p of [t.p,1-t.p]){
   const x=s.players[p].battle.find(y=>y.g34Grants?.some(g=>g.turn===s.turn&&g.g1269Attachment===mark));
   if(x)return {p,x};
  }
  return null;
 }
 function releaseHyper781(s,p,y){
  if(y.sealed||y.hyperActive||!card(y).hyper)return;
  y.hyperActive=true;
  y.hyperResolved=true;
  api.log(s,p,'hyper',card(y).name+'のハイパーモードを解放',{cardId:y.cardId});
 }
 function summonTapDonors1293(s,p){
  return creatures(s,p).filter(x=>!x.tapped&&!x.sealed&&!x.faceDown);
 }
 function projectSummonTap1293(s,p,uid){
  if(!uid)return s;
  return {...s,players:s.players.map((player,who)=>who===p?{...player,
   battle:player.battle.map(x=>x.uid===uid?{...x,tapped:true}:x)}:player)};
 }
 function externalProtection565(s,x){
  const protection={};
  for(const l of s.extLimits||[])
   if(l.kind==='g521Grant'&&l.g565External&&l.active!==false&&
      (l.startsPlayer===undefined&&!l.g1106ExternalUntilEnd&&!l.grant.g736ForcedAttack||l.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource}))&&
      api.allLayers(x).some(y=>y.uid===l.ref.uid&&(y.incarnation||0)===l.ref.incarnation))
    Object.assign(protection,l.grant);
  return protection;
 }
 function applyGrant(s,t,y){
  if(t.g521UntilStart||t.g521NextOpponentTurn||t.g1106ExternalUntilEnd||t.g1146UntilLeave)(s.extLimits??=[]).push({
   kind:'g521Grant',ref:{uid:y.uid,incarnation:y.incarnation||0},grant:t.grant,
   ...(t.g521NextOpponentTurn?{startsPlayer:1-t.p,active:false,expires:'end',who:1-t.p}:
    t.g1106ExternalUntilEnd?{g1106ExternalUntilEnd:true,expires:'end',who:s.active}:
    t.g1146UntilLeave?{}:{expires:'start',who:t.p}),
   ...(t.g565External?{g565External:true}:{}),
   ...(t.g1058FollowUnit?{g1058FollowUnit:true}:{}),
   ...(t.spell?{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{})
  });
  else(y.g34Grants??=[]).push(timedGrant335(s,t,t.grant));
 }
 // Publish the complete movement before its zone triggers or matching draw.
 function moveZoneSelection583(s,t,rows,owner=t.p){
  if(!api.canMoveZone(s,owner,t.origin)||t.origin==='hand'&&t.to==='mana'&&!api.canHandMana(s,owner))return [];
  const dest=t.to==='mana'&&t.origin!=='hand'&&api.manaRedirect(s,owner)?'grave':t.to;
  if(dest===t.origin||dest==='shields'&&!api.canAddShield(s,owner))return [];
  const origin=s.players[owner][t.origin],moved=rows.map(r=>remove(origin,r.uid)).filter(Boolean);
  for(const x of moved){clear(x,dest);if(dest==='shields'&&t.g657FaceUp)x.faceUp=true;if(dest==='mana'&&t.faceDown){x.faceDown=true;x.tapped=!!t.tapped;}}
  if(t.toOwnerGrave&&dest==='grave'){
   for(const p of [s.active,1-s.active])api.addZone(s,p,dest,...moved.filter(x=>(x.cardOwner??owner)===p));
  }else api.addZone(s,owner,dest,...moved);
  if(t.origin==='hand'&&dest==='mana')for(const x of moved)api.handMana(s,owner,x);
  if(dest==='shields')for(const x of moved)api.notifyShieldAdded(s,owner,x);
  if(t.g583DrawMoved&&moved.length)start(s,t,[{op:'Draw',n:moved.length}]);
  return moved;
 }
 const graveHandManaOrigins771=['grave','hand'];
 function finishGraveHandMana771(s,t){
  const own=s.players[t.p];
  const moved=graveHandManaOrigins771.map((origin,i)=>{
   if(!t.picks[i]||!api.canMoveZone(s,t.p,origin)||origin==='hand'&&!api.canHandMana(s,t.p)||origin==='grave'&&api.manaRedirect(s,t.p))return null;
   return remove(own[origin],t.picks[i]);
  });
  for(const x of moved.filter(Boolean)){clear(x,'mana');x.tapped=true;}
  api.addZone(s,t.p,'mana',...moved.filter(Boolean));
  if(moved[1])api.handMana(s,t.p,moved[1]);
 }
 function graveSpellOptions594(s,t){
  return s.players.flatMap((owner,p)=>(!t.g1353DLSys||p!==t.p)&&api.canMoveZone(s,p,'grave')?owner.grave.flatMap(x=>faces(card(x)).flatMap((c,face)=>
   c.type==='spell'&&(t.g1353DLSys||cost(c)<=t.max)&&api.canExecuteUnpaid(s,t.p,c)&&api.canCast(s,t.p,c,'grave',p)?[opt((p===t.p?'自分：':'相手：')+c.name,{uid:x.uid,owner:p,face,serial:x.zoneSerial||0},15+cost(c),x.cardId)]:[]
  )):[]);
 }
 function adamSeeds1341(s,t){
  const own=s.players[t.p],x=own.hand.find(x=>x.uid===t.uid);
  if(!x||!api.canEnter(s,t.p,card(x),{origin:'hand',execution:false}))return [];
  return own.battle.filter(y=>!y.tapped&&!y.sealed&&!y.faceDown&&matches(s,t.p,y,{g295Tamaseed:true})&&
   (api.isCreature(s,y)||effective(y,s).shinkalize));
 }
 function clanSpellOptions1338(s,t,host){
  if(!host||host.sealed)return [];
  const mana=new Set(s.players[t.p].mana.filter(x=>!x.faceDown)
   .flatMap(x=>faces(api.zoneCard(s,t.p,x,'mana')).flatMap(colors)));
  return (host.under||[]).flatMap(x=>x.faceDown||x.sealed?[]:faces(card(x)).flatMap((c,face)=>
   c.type==='spell'&&colors(c).some(color=>mana.has(color))&&api.canExecuteUnpaid(s,t.p,c)&&api.canCast(s,t.p,c,'battle')
    ?[opt(c.name,{uid:x.uid,face},15+cost(c),x.cardId)]:[]));
 }
 function graveAuras1354(s,t){
  if(!api.auraHost1352(s,t.p,t.host)||!api.canMoveZone(s,t.p,'grave'))return [];
  return s.players[t.p].grave.filter(y=>{
   const c=card(y);
   return !y.faceDown&&c.type==='aura'&&cost(c)<=t.max&&
    api.canEnter(s,t.p,c,{origin:'grave',execution:false,auraHost:t.host});
  });
 }
 function kariyaSpellOptions1337(s,t){
  if(!api.canMoveZone(s,t.p,'grave'))return [];
  return s.players[t.p].grave.flatMap(x=>{
   if(x.faceDown||t.picks?.some(pick=>pick.uid===x.uid))return [];
   return faces(api.zoneCard(s,t.p,x,'grave')).flatMap((c,face)=>
    c.type==='spell'&&cost(c)<=3?[opt(c.name,{uid:x.uid,face},15+cost(c),x.cardId)]:[]);
  });
 }
 function reserveKariyaSpells1337(s,t){
  const own=s.players[t.p];
  // All choices become pending before the first spell resolves (QA42076).
  for(const {uid} of t.picks||[]){
   const x=remove(own.grave,uid);
   x.g5Origin='grave';
   x.g1337GraveHeld=true;
   (own.g34Holding??=[]).push(x);
  }
  put(s,...(t.picks||[]).map(({uid,face})=>({...t,op:'g34_KariyaCast1337',uid,face})));
 }
 function recastHandSpell1245(s,t){
  if(!api.canMoveZone(s,t.p,'grave'))return null;
  const x=s.players[t.p].grave.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);
  const c=x&&faces(api.zoneCard(s,t.p,x,'grave'))[t.face];
  return c?.type==='spell'&&api.canCast(s,t.p,c,'grave')?{x,c}:null;
 }
 function topCreatureOrSpell1251(s,t,y){
  return faces(api.zoneCard(s,t.p,y,'deck')).flatMap((c,face)=>{
   if(t.execution&&!api.canExecuteUnpaid(s,t.p,c))return [];
   if(c.type==='spell'&&api.canCast(s,t.p,c,'deck'))return [{c,face}];
   if(c.type==='creature'&&canPut(s,t.p,y,'deck',!!t.execution))return [{c,face}];
   return [];
  });
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
 function romanoSpells1120(s,t){
  return t.recovered.flatMap(({uid,serial})=>{
   const x=s.players[t.p].hand.find(y=>y.uid===uid&&(y.zoneSerial||0)===serial);
   return x?faces(card(x)).flatMap((c,face)=>hasKnightMagic(c)&&api.canCast(s,t.p,c,'hand')?
    [opt(c.name,{uid,face,serial},20+cost(c),x.cardId)]:[]):[];
  });
 }
 function finishSelect(s,{g585Peek,...t}){
  if(t.g1779PhysicalOwnCards){
   const owner=t.owner??t.p,rows=t.rows||[],hand=rows.filter(r=>r.origin==='hand').map(r=>r.uid);
   if(hand.length)api.discardSelected(s,owner,hand,t.source,t.controller??t.p);
   const battlefield=rows.filter(r=>r.origin==='battle').map(r=>({player:r.p,uid:r.uid}));
   if(battlefield.length)api.moveBattleCardSweep(s,battlefield,t.controller??t.p);
   return;
  }
  if(t.g1564SelectedPower!==undefined){for(const r of t.rows||[]){const y=s.players[r.p].battle.find(x=>x.uid===r.uid&&!x.sealed&&api.isCreature(s,x));if(y)(y.powerModifiers??=[]).push({amount:t.g1564SelectedPower,expires:'end',who:s.active,...(t.spell?{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{})});}api.powerCleanup(s);return;}
  if(t.g1255HasteEntrant){
   const [selected]=t.rows||[];
   if(!selected||!s.players[t.p].grave.some(x=>x.uid===selected.uid))return;
   // A prohibited graveyard move still satisfies this attempt (QA 43359).
   zoneMove(s,t.p,'grave',selected.uid,'deck',t);
   const host=sourceHost474(s,t.g1255HasteEntrant);
   if(host)applyGrant(s,{...t,grant:{speedAttacker:true}},host.x);
   return;
  }
  if(t.g1735ExactBudget&&spent550(t)!==t.g550CostBudget)return;
  if(t.exactOptional&&(t.rows?.length||0)!==t.n)return;
  if(t.g1795DiscardTurn){
   const ids=(t.rows||[]).map(r=>r.uid);
   if(ids.length!==10||new Set(ids).size!==10||!ids.every(uid=>s.players[t.p].hand.some(x=>x.uid===uid))||api.handProtected(s,{p:t.p,source:t.source,causedBy:t.p}))return;
   // QA39663: attempting the complete optional discard satisfies "if you do", even if replaced.
   api.discardSelected(s,t.p,ids,t.source,t.p,null,null,
    task('g34_ExtraTurn1795',t.p,t.source,{attempted:ids.length,g1528AllowZero:true}));
   return;
  }
  if(t.g1225ManaExchange){
   moveZoneSelection583(s,t,t.rows);
   start(s,t,[{op:'Ramp',n:2,g809Together:true}]);
   return;
  }
  if(t.g1136Split){
   const rows=t.rows||[];
   if(rows.length===2){
    choice(s,{...t,op:'g34_Assign1136'},'マナゾーンに置くエレメントを選ぶ',
     rows.map(r=>{const y=s.players[r.p].battle.find(y=>y.uid===r.uid);return opt(card(y).name,r.uid,-cost(card(y)),y.cardId);}));
   }else if(rows.length)start(s,t,[{op:'SplitMove1136',target:rows[0],to:'mana'}]);
   return;
  }
  if(t.g1120Romano){
   const moved=moveZoneSelection583(s,t,t.rows);
   if(!moved.length)return;
   if(t.g1120Romano==='charge')start(s,t,[{op:'Select',origin:'mana',to:'hand',n:moved.length,optional:true,
    g1120Romano:'recover',filter:{faceUp:true,g228Face:{type:'spell'}},
    title:'手札に戻すマナゾーンの呪文を'+moved.length+'枚まで選ぶ'}]);
   else start(s,t,[{op:'RomanoCast1120',recovered:moved.map(x=>({uid:x.uid,serial:x.zoneSerial||0}))}]);
   return;
  }
  if(t.g972DeployMatching){
   const [row]=t.rows;
   const x=row&&s.players[row.p].grave.find(y=>y.uid===row.uid);
   if(x&&matches(s,row.p,x,t.g972DeployMatching))put(s,{...t,op:'g34_Put',target:x.uid});
   else if(x)zoneMove(s,row.p,'grave',x.uid,'hand',t);
   return;
  }
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
  if(t.g671PlayerLockPower||t.g567PlayerStop)for(const row of t.rows){
   const target=s.players[row.p].battle.find(x=>x.uid===row.uid);
   if(!target||target.sealed)continue;
   if(t.g671PlayerLockPower)(target.powerModifiers??=[]).push({amount:t.g671PlayerLockPower,expires:'end',who:s.active,
    spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))});
   stopPlayerAttack567(s,{...t,g567PlayerStop:t.g567PlayerStop??'end'},target);
  }
  if(t.g961TrapCommune){
   const targets=(t.rows||[]).filter(r=>creatures(s,t.p).some(x=>x.uid===r.uid&&!x.sealed&&matches(s,t.p,x,t.filter)));
   if(!targets.length)return;
   // The same spell counts attempted destructions, before replacement effects are applied.
   start(s,t,[{op:'Select',owner:'opponent',origin:'battle',to:'grave',n:targets.length,optional:true,
    filter:{creature:true},g173Targets:true,g193Select:true,title:'破壊する相手のクリーチャーを'+targets.length+'体まで選ぶ'}]);
   move(s,targets.map(({uid})=>({player:t.p,uid,to:'grave',destroy:true,controller:t.controller??t.p})));
   return;
  }
  if(t.g583Group){
   const owner=t.owner==='opponent'?1-t.p:t.p;
   const rows=(t.rows||[]).filter(r=>!t.g960FormerBases||
    s.players[owner][t.origin].some(x=>x.uid===r.uid&&matchesDeathDeployment960(t,x)));
   moveZoneSelection583(s,t,rows,owner);
   return;
  }
 if(t.g1114AcidDeploy){
  const moves=t.rows.filter(r=>s.players[r.p].battle.some(x=>x.uid===r.uid&&!x.sealed&&api.isCreature(s,x)))
   .map(r=>({player:r.p,uid:r.uid,to:'grave',destroy:true,controller:t.controller??t.p}));
  if(!moves.length)return;
  // Rule 101.3a and notice 31661 count attempted destructions in the same effect.
  put(s,{...t,op:'g34_AcidDeploy1114',n:moves.length});
  move(s,moves);
  return;
 }
 if(t.g995DrawPerDestroyAttempt){
  const targets=(t.rows||[]).filter(r=>creatures(s,r.p).some(x=>x.uid===r.uid&&!x.sealed));
  if(targets.length){
   // The same effect counts destruction attempts even if the move is replaced.
   start(s,t,[{op:'Draw',n:targets.length*t.g995DrawPerDestroyAttempt}]);
   move(s,targets.map(r=>({player:r.p,uid:r.uid,to:'grave',destroy:true,controller:t.controller??t.p})));
  }
  return;
 }
 if(t.afterBattleSelect||t.g917BounceMatch){
  const moves=(t.rows||[]).filter(r=>r.origin==='battle'&&s.players[r.p].battle.some(x=>x.uid===r.uid))
   .map(r=>({player:r.p,uid:r.uid,to:t.to,controller:t.controller??t.p,...(t.toOwnerHand?{toOwnerHand:true}:{})}));
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
  if(t.g1060AttachBase||t.g1128AttachMana){
   const host=sourceHost474(s,t.g1132EntryTarget??t),row=t.rows?.[0],origin=t.g1128AttachMana?'mana':'grave';
   if(!row||!host||host.x.sealed||!api.isCreature(s,host.x)||!api.canMoveZone(s,t.p,origin))return;
   const base=remove(s.players[t.p][origin],row.uid);
   if(base){clear(base,'under');(host.x.under??=[]).push(base);}
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
  if(t.g1009AfterMoveAttempt){
   const [row]=t.rows||[];
   if(row&&s.players[row.p][row.origin].some(x=>x.uid===row.uid)){
    moveZoneSelection583(s,t,[row],row.p);
    start(s,t,t.g1009AfterMoveAttempt);
   }
   return;
  }
  if(t.g583OnMove){
   const r=t.rows?.[0],x=r&&s.players[r.p][r.origin].find(y=>y.uid===r.uid);
   const matched=x&&(!t.g654MovedFilter||matches(s,r.p,x,t.g654MovedFilter));
   if(x&&zoneMove(s,r.p,r.origin,r.uid,t.to,t)&&matched)start(s,t,t.g583OnMove);
   return;
  }
  if(t.g1247SplitDeck){
   if(t.rows?.length)put(s,{...t,op:'g34_SplitDeck1247'});
   return;
  }
  if(t.g1680Hell){
   // QA39991 counts destruction attempts, including replaced destruction.
   // Freeze the chosen count before simultaneous leaving/replacement choices.
   const n=(t.rows||[]).filter(r=>s.players[r.p].battle.some(x=>x.uid===r.uid)).length;
   if(n)t.after=[...(t.after||[]),{op:'ShieldMove685',n,to:'grave',toOwnerGrave:true,required:true,spell:t.spell}];
  }
  if(t.g553Destinations&&t.rows?.length){put(s,{...t,op:'g34_Destination553',destinations:t.g553Destinations,g553Destinations:false});return;}const rows=t.g183Return&&t.to==='deckTop'?[...(t.rows||[])].reverse():t.rows||[];if(t.g899RampTapped){
  let n=0;
  for(const r of rows){
   const x=s.players[r.p].battle.find(y=>y.uid===r.uid);
   if(!x||x.sealed||x.tapped||!api.isCreature(s,x))continue;
   api.tap(s,r.p,x);
   if(x.tapped)n++;
  }
  if(n)start(s,t,t.g1793TapCount?[{op:'Select',owner:'opponent',origin:'battle',n,filter:{creature:true},g173Targets:true,g193Select:true,g193Tap:true,title:'タップする相手のクリーチャーを'+n+'体選ぶ'}]:[{op:'Ramp',n}]);
  return;
 }if(t.deploy){
  if(t.g1117ShowTime){
   // A selected card counts even if its entry is replaced (QA 34332).
   const highest=Math.max(0,...rows.map(({uid})=>cost(card(s.players[t.p].hand.find(x=>x.uid===uid)))));
   t.after=[{...t.after[0],min:highest===Infinity?'∞':highest}];
  }
  if(t.g1063RecoverRemaining){
   const selected=new Set(rows.map(row=>row.uid));
   t.after=[{op:'Select',origin:'grave',to:'hand',n:'all',optional:true,g583Group:true,
    g960FormerBases:t.g960FormerBases.filter(ref=>!selected.has(ref.uid)),
    title:'墓地にある残りの進化元から、手札に戻すカードを選ぶ'}];
  }
  let returnGroup;
  if(t.g785ReturnGroup&&rows.length){
   const delays=s.g537Delays??=[];
   const nextOpponentStart=t.g785ReturnGroup==='graveAtOpponentStart';
   returnGroup=delays.length;
   delays.push({
    p:t.p,source:t.source,turn:s.turn,
    ...(nextOpponentStart?{when:'nextOwnStart',who:1-t.p}:{when:'turnEnd'}),
    defs:[{op:'ReturnGroup785',refs:[],...(nextOpponentStart||t.g785ReturnGroup==='grave'?{to:'grave'}:{})}]
   });
  }
  if(t.g1173FightAfterDeploy){
   const [row]=rows;
   if(!row)return;
   const x=s.players[row.p][row.origin].find(y=>y.uid===row.uid);
   if(x)put(s,{...t,...row,owner:row.p,p:t.p,op:'g34_Put',target:x.uid},
    {...t,op:'g34_FightEnemy240',optional:true,fighter:{uid:x.uid,incarnation:(x.incarnation||0)+1}});
   return;
  }
  if(t.g1316AmbitionRevive){
   const [row]=rows;
   const x=row&&s.players[row.p][row.origin].find(y=>y.uid===row.uid);
   if(x)put(s,{...t,...row,owner:row.p,p:t.p,op:'g34_Put',target:x.uid},
    {...t,op:'g34_AmbitionAfterPut1316',target:x.uid,beforeEntry:x.incarnation||0});
   else start(s,t,t.after);
   return;
  }
  if(t.g1640CrossToSource){
   const row=rows[0],gear=row&&s.players[row.p][row.origin].find(y=>y.uid===row.uid);
   if(gear)put(s,{...t,...row,owner:row.p,p:t.p,op:'g34_Put',target:row.uid},
    {...t,op:'g34_CrossDeployed1640',gear:row.uid,gearInc:(gear.incarnation||0)+1});
   return;
  }
  if(t.g1106OnDeploy){
   const [row]=rows;
   if(!row)return;
   const x=s.players[row.p][row.origin].find(y=>y.uid===row.uid);
   if(!x)return;
   const selected=row.g1104Back?psychicBack1104(x):x;
   put(s,{...t,...row,owner:row.p,p:t.p,op:'g34_Put',target:row.uid},
    {...t,op:'g34_DeployColors1106',target:row.uid,beforeEntry:x.incarnation||0,selectedColors:colors(card(selected))});
   return;
  }
  if(rows.length>1){beginElementEntryBatch(s,'g34DeployBatch');s.players[t.p].g34ManaHeld=rows.filter(r=>r.origin==='mana').map(r=>r.uid);}put(s,...rows.map(r=>({...t,...r,owner:r.p,p:t.p,op:'g34_Put',origin:r.origin,target:r.uid,...(returnGroup===undefined?{}:{g785Group:returnGroup})})),...(t.after?tasks(t.p,t.source,t.after,{uid:t.uid,incarnation:t.incarnation}):[]),task('g34_Custom',t.p,t.source,{name:'finishBatch'}));}else{if(t.g190Freeze)for(const r of rows)freeze(s,t,r.p,s.players[r.p].battle.find(x=>x.uid===r.uid));if(t.g546Force)for(const r of rows){const y=s.players[r.p].battle.find(x=>x.uid===r.uid);if(y)force546(s,t,r.p,y);}if((t.g187OwnPick&&t.tap)||t.g193Tap){
  const targets=rows.flatMap(({p,uid})=>{
   const x=s.players[p].battle.find(x=>x.uid===uid);
   return x?[{p,x}]:[];
  });
  for(const {p,x} of targets){
   api.tap(s,p,x);
   if(t.g1116CreatureUntapLock)(s.extLimits??=[]).push({kind:'g1116CreatureUntapLock',ref:key(x),who:t.p,expires:'start',spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))});
   if(t.g210TapLock||t.g743NeoLock&&sourceNeo563(s,t))startUntapLock210(t,x);
  }
  if(t.g210TapLockIf&&ownCondition(s,t.p,t.g210TapLockIf))
   for(const {x} of targets)startUntapLock210(t,x);
 }if(t.g510Untap)for(const r of rows){const x=s.players[r.p].battle.find(x=>x.uid===r.uid);if(x?.tapped&&api.canUntap(x)){x.tapped=false;combined.untapped(s,r.p,x);}}if(t.g335Grant)for(const r of rows){const x=s.players[r.p].battle.find(x=>x.uid===r.uid);if(x)(x.g34Grants??=[]).push(timedGrant335(s,t,t.g335Grant));}if(t.g210ManaUntap){let n=0;for(const r of rows){const x=s.players[r.p].mana.find(x=>x.uid===r.uid);if(x&&api.canUntap(x)){if(x.tapped)n++;x.tapped=false;}}api.log(s,t.p,'untapMana',card(t.source).name+'：マナを'+n+'枚アンタップ',{cardId:t.source});}const b=rows.filter(r=>r.origin==='battle');for(const r of rows.filter(r=>r.origin!=='battle'))if(t.to)zoneMove(s,r.p,r.origin,r.uid,t.to,t);if(b.length&&t.to)move(s,b.map(r=>({player:r.p,uid:r.uid,to:t.to,destroy:t.to==='grave',
  controller:t.controller??t.p,...(t.toOwnerHand?{toOwnerHand:true}:{}),...(t.toOwnerMana?{toOwnerMana:true}:{}),...(t.toOwnerShields?{toOwnerShields:true}:{}),...(t.to==='mana'&&t.g1540ManaTapped?{tapped:true}:{})})));
 if(t.after)start(s,t,t.after);}}
 // A resolved group effect is a snapshot, not an aura. Match the source creature through its layers for "other".
 function groupPowerRows(s,t){
  const ps=t.owner==='both'?[0,1]:[t.owner==='self'?t.p:1-t.p];
  return ps.flatMap(p=>creatures(s,p).filter(y=>!y.sealed&&y.uid!==t.excludeUid&&matches(s,p,y,t.filter)
   &&(!t.other||!api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))
    ||t.otherUnlessRace&&race(effective(y,s),t.otherUnlessRace))).map(y=>({p,y})));
 }
 function otherTargetPower1040(s,t,selected){
  const {filter,power}=t.g1040OtherPower;
  start(s,t,[{op:'IfOwn',filter,defs:[{op:'GroupPower',owner:'opponent',power,excludeUid:selected?.uid,spell:t.spell}]}]);
 }
 function groupPowerAmount(s,t){
  if(t.g1233PerDiscard)return t.power*t.n;
  if(!t.perManaColor)return t.power;
  const count=s.players[t.p].mana.filter(x=>!x.faceDown&&api.manaColors(card(x),s,t.p).includes(t.perManaColor)).length;
  return t.power*count;
 }
 function grantBattlePower446(s,t,y,amount,duration={expires:'end',who:s.active}){
  (s.extLimits??=[]).push({kind:'g446BattlePower',ref:{uid:y.uid,incarnation:y.incarnation||0},amount,...duration,
   ...(t.g1058FollowUnit?{g1058FollowUnit:true}:{}),
   ...(t.spell?{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{})});
 }
 function keepTypes1285(s,t){
  const picked=t.picked??[],step=t.step??0;
  const creature={creature:true},seed={g295Tamaseed:true};
  if(step===4){
   start(s,t,[{op:'Sweep',both:true,to:'grave',filter:{any:[creature,seed]},excludeUids:picked}]);
   return;
  }
  const p=step<2?t.p:1-t.p,isSeed=step%2===1,filter=isSeed?seed:creature;
  const rows=s.players[p].battle.filter(y=>!y.sealed&&!y.faceDown&&!picked.includes(y.uid)&&
   matches(s,p,y,filter)&&api.targetable(s,p,p,y));
  if(rows.length)choice(s,{...t,picked,step},isSeed?'残す自分のタマシードを1枚選ぶ':'残す自分のクリーチャーを1体選ぶ',
   rows.map(y=>opt(card(y).name,y.uid,10+cost(effective(y,s)),y.cardId)),p);
  else put(s,{...t,step:step+1});
 }
 function groupPowerScore(s,t){return groupPowerRows(s,t).reduce((n,{p,y})=>{const before=api.power(y,y.uid===s.attack?.attacker,s),gain=t.power>0?Math.min(10,t.power/1000):before+t.power<=0?18+cost(effective(y,s))*3+Math.max(0,before)/2000:Math.min(8,-t.power/1000);return n+(p===t.p?1:-1)*(t.power>0?gain:-gain);},0);}
 // Only the new modal definitions use this evaluation; existing card-specific mode scores stay intact.
 // Score a selected creature from public characteristics; the tap/untap direction is chosen afterwards.
 function hasteScore927(s,x){
  if(x.tapped||x.entered!==s.turn||api.isEvolution(x))return 0;
  const c=effective(x,s);
  return c.speedAttacker||c.noAttack?0:20+cost(c);
 }
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
 function finishUntap562(s,t){
  const defs=(t.refs||[]).map(ref=>({op:'AttackUntap408',g399Attacker:ref,g562Creature:true,
   ...(t.g981UntapTogether?{g764FollowControl:true}:{})}));
  if(!defs.length)return;
  if(t.g981UntapTogether){
   scheduleUntap562(s,t,[{op:'Offer',title:'選んだクリーチャーをまとめてアンタップする？',defs}]);
   return;
  }
  if(t.delay)scheduleUntap562(s,t,t.optionalUntap?defs.map(d=>({op:'Offer',title:'選んだクリーチャーをアンタップする？',defs:[d]})):defs);
  else start(s,t,defs);
 }
 function countedPowerDefs561(s,t,d){
  const rows=s.players[t.p][d.zone]||[],source=d.g179Other?sourceHost474(s,t)?.x:null;
  const n=d.zone==='hand'?rows.length:d.zone==='battle'?creatures(s,t.p).filter(y=>y!==source&&!y.sealed&&matches(s,t.p,y,d.filter)).length:
   rows.filter(y=>d.filter.g228Face?matches(s,t.p,y,d.filter):
    !d.filter.color||api.manaColors(card(y),s,t.p).includes(d.filter.color)).length;
  return (d.defs||[]).map(def=>def.g561Scale?{...def,power:n*d.amount}:def);
 }
 function lockSpells589(s,t,color){
  const opponent=1-t.p;
  (s.extLimits??=[]).push({
   kind:'g589SpellLock',player:opponent,controller:t.p,expires:'end',who:opponent,
   afterTurns:s.players[opponent].turns,nextOnly:!!t.nextOnly,color:color??null,
   ...(t.g937Summon?{g937Summon:true}:{})
  });
  const action=t.g937Summon?'召喚と呪文':(color?color+'の':'')+'呪文';
  api.log(s,t.p,'spellLock',card(t.source).name+'：相手の'+action+'を制限',{cardId:t.source});
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
   // QA 36097 requires the shuffle even when the selected player returns nothing.
   if(t.g1109RequiredShuffle||(t.upTo?moved.length:selected.length))api.shuffleLibrary(s,owner,moved,t.source);
   return;
  }
  if(t.mode==='shuffleBottom'){
   if(moved.length)api.addZone(s,owner,'deck',...api.shuffled(moved,Math.floor(api.random(s)*4294967296)));
   return;
  }
  api.addZone(s,owner,'deck',...moved);
  if(t.g1828OwnerOrder){
   const bottom=moved.filter(x=>s.players[owner].deck.includes(x));
   if(bottom.length>1)put(s,task('g78_BottomOrder',owner,t.source,{
    rows:bottom.map(x=>({uid:x.uid,label:card(x).name,cardId:x.cardId})),
    ordered:[],newCards:true,controller:t.p}));
  }
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
 function birdTarget935(s,t){
  const owner=1-t.p;
  return t.target&&creatures(s,owner).find(x=>x.uid===t.target.uid&&(x.incarnation||0)===t.target.incarnation);
 }
 function destroyBelowCost935(s,t,threshold){
  const target=birdTarget935(s,t),owner=1-t.p;
  if(target&&cost(api.zoneCard(s,owner,target,'battle'))<(threshold==='∞'?Infinity:threshold))
   move(s,[{player:owner,uid:target.uid,to:'grave',destroy:true,controller:t.p}]);
 }
 function gearSweepRows928(s,threshold){
  return s.players.flatMap(({battle},player)=>battle
   .filter(x=>!x.sealed&&!x.faceDown&&card(x).type==='gear'&&cost(effective(x,s))<(threshold==='∞'?Infinity:threshold))
   .map(x=>({player,uid:x.uid,to:'grave',destroy:false})));
 }
 function sweepGears928(s,t,threshold){
  const rows=gearSweepRows928(s,threshold);
  if(rows.length)move(s,rows.map(row=>({...row,controller:t.controller??t.p})));
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
  if(d.op==='BattleColors1630'){score+=modeScore(s,t,battleColorDefs1630(s,{...t,...d}));continue;}
  if(d.op==='HatchHunter841'){
   const x=own.grave.find(y=>y.uid===d.target&&(y.zoneSerial||0)===d.serial);
   if(x&&canPut(s,t.p,x,'grave'))score+=8+2*cost(card(x));
  }
  if(d.op==='RecastAfterSacrifice1250'){
   const row=recastHandSpell1245(s,{...d,p:t.p});
   if(row)score+=spellScore555(s,t,row.c);
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
  if(d.op==='IfNeo563'){if(sourceNeo563(s,t)!==!!d.g1059Negate)score+=modeScore(s,t,d.defs);continue;}
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
  else if(d.op==='ShieldMove685'&&d.to==='grave'){
   const target=d.owner==='self'?own:opp;
   const available=Array.isArray(target.shields)?target.shields.filter(y=>d.optionalExact?api.shieldCards(y).every(x=>!x.g37ShieldHeld):api.shieldCards(y).some(x=>!x.g37ShieldHeld)).length:Number(target.shields)||0;
   const amount=d.optionalExact&&available<d.n?0:d.n==='all'?available:Math.min(available,Number(d.n)||1);
   score+=amount*(d.owner==='self'?-12:18);
  }
  else if(d.op==='ManaChoose582'){
   const mine=manaRows582(s,t.p,d).length,theirs=manaRows582(s,1-t.p,d).length;
   if(d.keep)score+=Math.max(0,(d.who==='opponent'?theirs:mine)-d.n)*(d.who==='opponent'?12:-12);
   else if(d.who==='choose')score+=Math.min(d.n,theirs)*12;
   else if(d.who==='each')score+=(Math.min(d.n,theirs)-Math.min(d.n,mine))*12+(theirs>0&&mine>theirs?7:0);
  }
  else if(d.op==='Select'&&d.deploy&&d.origin==='extra')score+=Math.max(0,...list(s,{...t,...d}).map(({x})=>deployValue550(s,t.p,x)));
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
  else if(d.op==='GroupPower'){
   const group={...t,...d};
   const power=d.g561DarkMana?groupPowerAmount(s,{...group,power:1000,perManaColor:'闇'}):groupPowerAmount(s,group);
   score+=groupPowerScore(s,{...group,power});
  }
  else if(d.op==='Sweep')score+=creatures(s,1-t.p).filter(y=>matches(s,1-t.p,y,d.filter)).reduce((n,y)=>n+12+cost(effective(y,s))*2+api.power(y,false,s)/3000,0);
  else if(d.op==='LockUntap606'&&d.zone==='mana')score+=opp.mana.length*5;
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
 const putSource1294=(s,t)=>t.g1651Held?(s.players[t.owner??t.p].g34Holding||[]).find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.g1651Serial):t.g1294FaceUpShield?s.players[t.p].shields.flatMap(api.shieldCards)
  .find(x=>x.uid===t.target&&x.faceUp&&!x.g37ShieldHeld):s.players[t.owner??t.p][t.origin]?.find(x=>x.uid===t.target);
 function hasBouncer1294(s,p){
  return s.active===p&&s.players[p].battle.some(y=>!y.faceDown&&card(y).g1294Bouncer&&api.isCreature(s,y)&&!api.ignored(s,y));
 }
 function bouncerProtects1294(s,x){
  return hasBouncer1294(s,s.active)&&s.players[s.active].battle.includes(x)&&
   api.isCreature(s,x)&&race(effective(x,s),'ビートジョッキー');
 }
 function doPut(s,t,base=null){const owner=t.owner??t.p,own=s.players[owner],x=putSource1294(s,t);if(!x||t.g1651Held&&!api.canMoveZone(s,t.p,'grave')||!matchesDeathDeployment960(t,x)||t.g550CostBudget!==undefined&&(x.zoneSerial||0)!==(t.serial550||0))return;if(t.g1321Teleport?api.needsZoneMana1359(s,t.p,faces(card(x))[t.face||0]):t.execution&&!t.payment&&
 !api.canExecuteUnpaid(s,t.p,faces(card(x))[t.face||0])){release(s,owner,x.uid);return;}if(t.execution&&faces(card(x))[t.face||0]?.type==='spell'){release(s,owner,x.uid);if(!api.canCast(s,t.p,faces(card(x))[t.face||0],t.origin))return;cast(s,t.p,x.uid,!t.payment,base,t.face||0,t.payment||null,t.origin);return;}const selected=t.g1104Back?psychicBack1104(x):x;if(!canPut(s,t.p,selected,t.origin,!!t.execution)||card(x).gCastle&&!api.canAddShield(s,t.p))return;own.g34ManaHeld=(own.g34ManaHeld||[]).filter(uid=>uid!==x.uid);if(t.origin==='deck')release(s,owner,x.uid);if(t.g1321Teleport){
  cast(s,t.p,x.uid,true,base,t.face||0,{g1321PsychicBack:!!t.g1104Back},t.origin,'跳次元召喚');
 }else if(t.execution)cast(s,t.p,x.uid,!t.payment,base,t.face||0,t.g1675ExtraSummon&&t.g1104Back?{...t.payment,g1321PsychicBack:true}:t.payment||null,t.origin,t.reason||'カードの能力',false,t.g1087Grant?'g1087Sign:'+t.source:null);else{if(t.g1294FaceUpShield){if(!api.removeShieldCard(s,t.p,x.uid))return;}else remove(t.g1651Held?own.g34Holding:own[t.origin],x.uid);if(card(x).gCastle){clear(x,'shields');x.faceUp=true;if(api.replaceShieldCards1781(s,t.p,[x]).length)s.players[t.p].shields.push(x);api.notifyShieldAdded(s,t.p,x,{fortified1746:true});(s.noManaUse??=[false,false])[t.p]=true;return;}const originState1693={serial:x.zoneSerial,tapped:x.tapped};clear(x,'battle');if(t.g1104Back)x.g1085Awakened=true;enter(s,t.p,x,base,{origin:t.origin,originState1693,execution:false,tapped:!!t.tapped,...(t.g1684IgnoreEntry?{ignoreEntry:true}:{}),...(t.g745Magibomber?{g745Magibomber:true}:{}),...(t.g781HyperEntry?{g781HyperEntry:t.source}:{}),...(t.g785Group===undefined?{}:{g785Group:t.g785Group}),...(t.g1082Dragon?{g1082Dragon:t.source}:{}),...(t.g1084SealedEntry?{g1084SealedEntry:true}:{}),...(t.g771DeploySpeed||t.g774Banky?{g771SpeedSpell:t.source,g774Banky:t.g774Banky,g1317SpeedFromCreature:t.g1317SpeedFromCreature}:{}),...(t.g791Grant?{g791Grant:t.g791Grant,g791Spell:t.source,g793FightOnEntry:t.g793FightOnEntry}:{})});
  if(t.g1225ChristoDeploy)afterEntry(s,t.p,x,task('g34_ChristoGrant1225',t.p,t.source,{
   uid:x.uid,incarnation:x.incarnation||0,controller:t.controller??t.p
  }),put);
  if(t.tapAfterEntry)afterEntry(s,t.p,x,task('g34_Offer',t.p,t.source,{
   uid:x.uid,incarnation:x.incarnation||0,controller:t.controller??t.p,
   title:card(x).name+'をタップする？',defs:[{op:'SelfTap314',g536Source:true}]
  }),put);
  if(t.delayed){x.g34Delayed={turn:s.turn,to:t.delayed,source:t.source,controller:t.controller??t.p,...(t.g1704DelayedDraw?{g1704DelayedDraw:true}:{})};if(t.drawOnBottom)x.g35DrawOnBottom=true;}if(t.grant){(x.g34Grants??=[]).push({turn:s.turn,...t.grant});}}}
 // Mana-triggered self buffs and optional hand refills use only public state.
 function spaceScore455(s,t,defs){return defs.reduce((n,d)=>{const own=s.players[t.p];if(d.op==='Sequence')return n+spaceScore455(s,t,d.defs);if(d.op==='NextReduction456')return n+(s.active===t.p?Math.min(20,d.amount*4):0);if(d.op==='DrawUpTo')return n+Math.min(d.n,Math.max(0,own.deck.length-1))*10;if(d.op==='DiscardAll244')return n-own.hand.length*8;if(d.op==='OpponentSelect'){const rows=creatures(s,1-t.p).filter(y=>!y.sealed&&matches(s,1-t.p,y,d.filter));return n+(rows.length?10+Math.min(...rows.map(y=>cost(effective(y,s))*2)):0);}if(d.op==='Target'&&d.owner==='self'){const rows=creatures(s,t.p).filter(y=>!y.sealed&&matches(s,t.p,y,d.filter)),legal=new Set(targetOptions(s,t.p,rows).map(o=>o.value));return n+Math.max(0,...rows.filter(y=>legal.has(y.uid)).map(y=>d.grant?.slayer?8:s.active===t.p&&!y.tapped?8+(d.g455ExtraBreak?6:0):0));}if(d.op==='SelfBoost313'||d.op==='SelfExtraBreak444'){const x=live(s,t);return n+(x&&s.active===t.p&&!x.tapped?8:0);}return n+modeScore(s,t,[d]);},0);}
 // Each player chooses their own card in turn order, before either selected card moves.
 function eachPlayer459(s,t){
  const order=t.order||[s.active,1-s.active],selected=t.selected||[],index=t.index||0;
  if(index<order.length){
   const p=order[index],filter=t.origin==='battle'&&!t.element?{creature:true,...t.filter}:t.filter;
   if(t.g1519EachN&&selected.filter(r=>r.p===p).length>=t.g1519EachN){put(s,{...t,order,index:index+1});return;}
   const rows=list(s,{...t,p,owner:'self',selected:t.g1519EachN?selected.filter(r=>r.p===p).map(r=>r.uid):[],g187OwnPick:true,filter});
   const next={...t,p,order,index,selected,effectPlayer:t.effectPlayer??t.p,controller:t.controller??t.p};
   if(!rows.length){put(s,{...next,index:index+1});return;}
   const title=t.element?'破壊する自分のエレメントを1つ選ぶ':
    t.keep?'残す自分のクリーチャーを1体選ぶ':t.discard?'捨てる自分の手札を1枚選ぶ':t.origin==='battle'?(t.to==='grave'?'破壊する':'マナに置く')+'自分のクリーチャーを1体選ぶ':(t.to==='mana'?'マナに置く':'山札の上に置く')+'自分の手札を1枚選ぶ';
   choice(s,next,title,[...rows.map(r=>opt(card(r.x).name,{p,uid:r.x.uid,incarnation:r.x.incarnation||0,serial:r.x.zoneSerial||0},(t.keep?1:-1)*cost(card(r.x)),r.x.cardId)),...(t.optional?[skip()]:[])]);return;
  }
  const valid=selected.filter(r=>s.players[r.p][t.origin].some(x=>x.uid===r.uid&&(x.incarnation||0)===r.incarnation&&(x.zoneSerial||0)===r.serial));
  if(t.origin==='battle'){
   const affected=t.keep?order.flatMap(p=>creatures(s,p).filter(x=>!x.sealed&&!valid.some(r=>r.p===p&&r.uid===x.uid))
    .map(x=>({p,uid:x.uid}))):valid;
   move(s,affected.map(r=>({player:r.p,uid:r.uid,to:t.to,destroy:t.to==='grave',controller:t.controller??t.effectPlayer})));
   return;
  }
  if(t.discard){for(const r of [...valid].reverse())api.discardSelected(s,r.p,[r.uid],t.source,t.effectPlayer);return;}
  for(const r of valid)zoneMove(s,r.p,t.origin,r.uid,t.to,{...t,g183Return:t.to==='deckTop',g182HandMana:t.origin==='hand'&&t.to==='mana'});
 }
 // These clauses refer to the chosen hand size, even when discarding is replaced (official 31661).
 function handCycle460(s,t){
  const own=s.players[t.p],selected=t.selected||[];
  const ids=t.ids||own.hand.filter(x=>!t.filter||matches(s,t.p,x,t.filter)).map(x=>x.uid);
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
  if(t.mode==='any'&&selected.length<cap&&available.length){
   const eligible=t.afterDiscardSelect?list(s,{...t.afterDiscardSelect,p:t.p}).length:0;
   choice(s,{...t,ids,selected},'捨てる手札を選ぶ（'+selected.length+'枚選択済み）',[
    ...available.map(uid=>{
     const x=own.hand.find(y=>y.uid===uid),price=cost(card(x));
     const score=t.afterDiscardSelect?(selected.length<eligible?12-price:-10):
      own.deck.length<=selected.length+(t.extra||0)+1?-1000:3-price;
     return opt(card(x).name,uid,score,x.cardId);
    }),opt('この枚数で確定',null,0)
   ]);
   return;
  }
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
 function finishCycle460(s,t,ids){
  const selected=ids.filter(uid=>s.players[t.p].hand.some(x=>x.uid===uid));
  if(t.afterDiscardSelect){
   if(selected.length)api.discardSelected(s,t.p,selected,t.source,t.p,null,null,
    task(t.afterDiscardSelect.g1670VictimChooses?'g34_VenomicDestroy1670':'g34_Select',t.p,t.source,t.afterDiscardSelect));
   return;
  }
  api.discardSelected(s,t.p,selected,t.source,t.p,null,{op:'g34_CycleDraw460',p:t.p,source:t.source,
   n:t.fixedDraw??selected.length,extra:t.extra||0,
   ...(t.g1223PowerPerDiscard?{uid:t.uid,incarnation:t.incarnation,g1223PowerPerDiscard:t.g1223PowerPerDiscard}:{})});
 }
 // Reveal complete physical hand cards; twinpacts contribute both civilizations but count once.
 function handReveal462(s,t){const own=s.players[t.p],selected=t.selected||[],shown=own.hand.filter(x=>selected.includes(x.uid)),max=t.max??own.hand.length,rows=own.hand.filter(x=>!selected.includes(x.uid)&&matches(s,t.p,x,t.filter));
  if(selected.length>=max||!rows.length){finishReveal462(s,t,shown);return;}
  const seen=new Set(shown.flatMap(x=>faces(card(x)).flatMap(colors))),ready=t.needColors?.every(c=>seen.has(c));
  const score=x=>{if(t.g1111CostDraw){const viable=faces(card(x)).map(cost).filter(n=>n<own.deck.length);return viable.length?Math.max(...viable):-1000;}if(t.drawEach||t.rampEach)return shown.length+1>=own.deck.length?-1000:10;if(t.powerEach)return creatures(s,t.p).filter(y=>!y.sealed).length?8:0;if(t.needColors){const added=new Set(faces(card(x)).flatMap(colors));return t.needColors.filter(c=>!seen.has(c)&&added.has(c)).length*20-2;}if(t.defs?.some(d=>d.op==='Draw'||d.op==='Ramp'))return own.deck.length>1?10:-1000;return 5;};
  const allowDecline=!t.g1111CostDraw||t.optional;
  choice(s,{...t,selected},'効果のために見せる手札を選ぶ（'+selected.length+'枚選択済み）',[...rows.map(x=>opt(card(x).name,x.uid,score(x),x.cardId)),...(allowDecline?[opt(selected.length?'この枚数で確定':'見せずに進む',null,ready?25:0)]:[])]);
 }
 function finishReveal462(s,t,shown){if(!shown.length){if(t.elseDefs)start(s,t,t.elseDefs);return;}for(const x of shown)api.log(s,t.p,'reveal',card(t.source).name+'で手札公開：'+card(x).name,{cardId:x.cardId,source:t.source});
  if(t.g1111CostDraw){
   const [x]=shown,deckSize=s.players[t.p].deck.length;
   const options=[...new Map(faces(card(x)).map(face=>[face.type==='cell'?0:face.cost,face]))];
   if(options.length===1){drawPrintedCost1111(s,t,options[0][0]);return;}
   choice(s,{...t,op:'g34_RevealedCostDraw1111'},'公開したカードのどちらのコストを参照する？',
    options.map(([n,face])=>opt(face.name+'（コスト'+n+'）',n,n==='∞'||n>=deckSize?-1000:n,x.cardId)));
   return;
  }
  const seen=new Set(shown.flatMap(x=>faces(card(x)).flatMap(colors)));if(t.needColors&&!t.needColors.every(c=>seen.has(c)))return;
  if(t.g853EachDraw){
   const draw=p=>task('g34_DrawUpTo',p,t.source,{n:shown.length,controller:t.p,g853EachDraw:true});
   put(s,draw(t.p),draw(1-t.p));
   return;
  }
  if(t.drawEach)start(s,t,[{op:'Draw',n:shown.length}]);else if(t.rampEach)start(s,t,[{op:'Ramp',n:shown.length,tapped:true}]);else if(t.powerEach)start(s,t,[{op:'GroupPower',owner:'self',filter:{creature:true},power:t.powerEach*shown.length}]);else start(s,t,t.defs);
 }
 function drawPrintedCost1111(s,t,n){
  if(n==='∞'||n>0)api.draw(s,t.p,n);
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
 function chanceCard417(s,t){
  const origin=t.origin??'hand';
  const y=origin==='deck'?api.visionTop(s,t.p):(s.players[t.p][origin]||[]).find(v=>v.uid===t.uid);
  if(y?.uid!==t.uid||(y.zoneSerial||0)!==t.serial)return null;
  const c=faces(card(y))[t.face];
  if(origin==='grave'&&(!c?.g417Chance?.g1548ChanceR||!api.canMoveZone(s,t.p,'grave')))return null;
  return c?.g417Chance&&!api.spellIgnored(s,c)&&api.canCast(s,t.p,c,origin)?c:null;
 }
 function run(s,t){if(fifteen.run(s,t))return true;if(!t.op.startsWith('g34_'))return false;const own=s.players[t.p],opp=s.players[1-t.p],x=live(s,t);switch(t.op){
 case'g34_ChooseWeaponHost1361':{
  const options=targetOptions(s,t.p,creatures(s,t.p));
  if(options.length)choice(s,t,'ウエポンを装備する自分のクリーチャーを選ぶ',options);
  break;
 }
 case'g34_DeployWeapons1742':{
  const host=sourceHost474(s,t)?.x;
  if(!host||host.sealed||!api.isCreature(s,host))break;
  const selected=t.selected||[],rows=own.extra.filter(y=>!selected.includes(y.uid)&&card(y).dragheart&&card(y).type==='weapon'&&cost(card(y))<=t.max&&api.canEnter(s,t.p,card(y),{origin:'extra',execution:false}));
  if(!t.done&&selected.length<t.n&&rows.length){
   choice(s,t,'装備して出すウエポンを選ぶ（'+selected.length+'/'+t.n+'枚）',[...rows.map(y=>opt(card(y).name,y.uid,20,y.cardId)),skip()]);break;
  }
  const weapons=selected.map(uid=>own.extra.find(y=>y.uid===uid)).filter(Boolean);
  for(const y of weapons){remove(own.extra,y.uid);y.weaponTo={uid:host.uid,incarnation:host.incarnation||0};own.hasWeapons1361=true;enter(s,t.p,y,null,{origin:'extra',execution:false,effectController:t.controller??t.p});}
  break;
 }
 case'g34_DeployDragheart1361':{
  const options=dragheartOptions1361(s,t).map(y=>opt(card(y).name,y.dragheartFlipped?{uid:y.uid,back:true}:y.uid,20,y.cardId));
  if(options.length)choice(s,t,'超次元ゾーンから出すドラグハートを選ぶ',options);
  break;
 }
 case'g34_UltoRelease1361':if(x)api.dragonRelease1361(s,t.p,x);break;
 case'g34_GodWall1485':{
  choice(s,t,'とどまる効果を与える自分のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,t.p)));break;
 }
 case'g34_FortressRelease1480':if(x)api.dragonRelease1361(s,t.p,x,{fortress:true});break;
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
 case'g34_PowerAttack593':{
  const lock={kind:'g593AttackPower',player:t.both?null:1-t.p,max:t.max,playerOnly:!!t.playerOnly,expires:'start',who:t.p};
  if(t.g1063SourcePower){
   lock.ref={uid:t.uid,incarnation:t.incarnation};
  }else{
   lock.spellSource=t.source;
   lock.spellCost=cost(faces(card(t.source)).at(-1));
  }
  (s.extLimits??=[]).push(lock);
  break;
 }
 case'g34_EntryStop593':(s.extLimits??=[]).push({kind:'attack',player:1-t.p,...t.subject,controller:t.p,expires:'end',who:s.active});break;
 case'g34_PlayerGuard750':
  if(s.active===t.p)(s.extLimits??=[]).push({kind:'g750CannotAttackPlayer',player:t.p,turn:s.turn+1,expires:'end',who:1-t.p});
  break;
 case'g34_PlayerStop567':(s.extLimits??=[]).push({kind:'g567PlayerStop',player:t.owner==='self'?t.p:1-t.p,controller:t.p,expires:t.g567PlayerStop,who:t.g567PlayerStop==='start'?t.p:s.active,spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))});break;
 case'g34_Entry468':{
  if(t.mode==='mandatoryFight'||t.mode==='optionalFight'){
   put(s,{...t,op:'g34_FightEnemy240',fighter:t.subject,g998EntryFight:true,...(t.mode==='optionalFight'?{optional:true}:{})});
   break;
  }
  if(t.mode==='ukonSakon1146'){
   const host=sourceHost474(s,t.subject);
   const once={g792Once:'ukonSakon1146'};
   if(host&&!host.x.sealed&&api.isCreature(s,host.x)&&!used792(s,t,once))
    choice(s,{...t,...once,op:'g34_UkonSakon1146'},card(host.x).name+'にパワー+4000、スピードアタッカー、パワード・ブレイカーを与える？',
     [opt('与える',true,20,host.x.cardId),skip()]);
   break;
  }
  if(t.mode==='graveBase1132'){
   start(s,t,[{op:'Mill',n:2,optional:true,g1042Together:true},{
    op:'Select',origin:'grave',n:1,optional:true,filter:{faceUp:true,g228Face:{type:'creature'}},
    g1060AttachBase:true,g1132EntryTarget:t.subject,title:'出たクリーチャーの下に置く墓地のクリーチャーを選ぶ（任意）'
   }]);
   break;
  }
  if(t.mode==='manaBase'){
   start(s,t,[{op:'Select',origin:'mana',n:1,optional:true,filter:{creature:true,faceUp:true},
    g1128AttachMana:true,g1132EntryTarget:t.subject,title:'出たNEOクリーチャーの下に置くマナのクリーチャーを選ぶ（任意）'
   }]);
   break;
  }
  const mode=t.mode,host=['protect565','protectAll'].includes(mode)?sourceHost474(s,{uid:t.subject?.uid,incarnation:t.subject?.incarnation})?.x:attackHost408(s,{...t,g399Attacker:t.subject}),y=host&&!host.sealed&&api.isCreature(s,host)?host:null;if(mode==='draw')start(s,t,[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]);else if(mode==='freeze')start(s,t,[{op:'Target',tap:true,lock:true}]);else if(y){if(mode==='protectAll')applyGrant(s,{...t,g521UntilStart:true,g565External:true,grant:{g1082ChoiceProtected:true}},y);
 else if(mode==='fight')put(s,{...t,op:'g34_FightEnemy240',fighter:{uid:y.uid,incarnation:y.incarnation||0},optional:true});else if(mode==='protect565')(s.extLimits??=[]).push({kind:'g521Grant',g565External:true,ref:{uid:y.uid,incarnation:y.incarnation||0},grant:{untargetable:true,cannotBeAttacked:true},expires:'start',who:t.p});else if(mode==='mach')(y.g34Grants??=[]).push(timedGrant335(s,t,{machFighter:true}));else if(mode==='rush')put(s,task('g13_JagaGrant',t.p,t.source,{target:y.uid,targetInc:y.incarnation||0}));}break;}
 case'g34_LookDestination467':lookDestination467(s,t);break;
 case'g34_RomanoCast1120':{
  const options=romanoSpells1120(s,t);
  if(options.length)choice(s,t,'戻したナイト・マジック呪文を1枚、コストを支払わずに唱える（任意）',[...options,skip()]);
  break;
 }
 case'g34_TargetDestination467':targetDestination467(s,t);break;
 case'g34_NullBreaker471':break;
 case'g34_PayAura560':payAura560(s,t);break;
 case'g34_DestroySummon1148':{
  const origin=t.origin,p=t.p,cardInZone=own[origin].find(y=>y.uid===t.uid);
  const c=cardInZone&&api.zoneCard(s,p,cardInZone,origin);
  const rule=c?.g1148DestroySummon;
  if(!rule)break;
  if(t.payment){
   cast(s,p,t.uid,false,null,0,t.payment,origin,'破壊を伴う召喚',false,t.permit);
   break;
  }
  const plan=destroySummon1148(s,p,cardInZone,origin);
  if(!plan||!plan.permits.includes(t.permit))break;
  const remaining=plan.rows.filter(y=>!t.selected.includes(y.uid));
  if(t.selected.length===rule.count){
   put(s,{...t,payment:{...plan.payment,cost:plan.amount,fixedPayment:true}});
   move(s,t.selected.map(uid=>({player:p,uid,to:'grave',destroy:true,toOwnerGrave:true,controller:p,
    ...(!rule.reduction?{replacement:true}:{}),...(rule.g1202Unreplaceable?{selfDeath:true}:{})})));
  }else if(remaining.length>=rule.count-t.selected.length){
   choice(s,t,'召喚のため破壊する自分のクリーチャーを選ぶ（'+t.selected.length+'/'+rule.count+'）',
    [...remaining.map(y=>opt(card(y).name,y.uid,-cost(effective(y,s)),y.cardId)),opt('召喚をやめる',null,-1000)]);
  }
  break;
 }
 case'g34_PayFloor500':payFloor500(s,t);break;
 case'g34_PayCount499':payCount499(s,t);break;
 case'g34_SeedDefense1201':{
  const source=own.hand.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);
  if(!source)break;
  const eligible=own.battle.filter(y=>!y.tapped&&!y.faceDown&&!y.sealed&&matches(s,t.p,y,{g295Tamaseed:true}));
  const selected=t.selected,light=y=>colors(effective(y,s)).includes('光');
  const paid=selected.map(uid=>eligible.find(y=>y.uid===uid));
  if(eligible.length<3||!eligible.some(light)||paid.some(y=>!y))break;
  if(paid.length===3){
   if(!paid.some(light))break;
   for(const y of paid)api.tap(s,t.p,y,t.p);
   if(paid.every(y=>y.tapped))put(s,{...t,op:'g34_SeedDefenseEnter1201'});
   break;
  }
  const requireLight=paid.length===2&&!paid.some(light);
  choice(s,t,'サッヴァーク-MAX：光を含むタマシード3枚をタップする（'+paid.length+'/3）',[
   ...eligible.filter(y=>!selected.includes(y.uid)&&(!requireLight||light(y))).map(y=>opt(card(y).name,y.uid,20,y.cardId)),
   skip()
  ]);
  break;
 }
 case'g34_SeedDefenseEnter1201':{
  const source=own.hand.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);
  if(source&&canPut(s,t.p,source,'hand'))doPut(s,{...t,origin:'hand',target:t.uid});
  break;
 }
 case'g34_TapCast976':{
  const source=own[t.origin].find(x=>x.uid===t.uid),c=source&&api.zoneCard(s,t.p,source,t.origin);
  if(!c?.g976TapCast||api.spellIgnored(s,c)||!api.canMoveZone(s,t.p,t.origin)||
     !api.canCast(s,t.p,c,t.origin,source.cardOwner??t.p)||
     !api.costAltPermits568(s,t.p,source,c,t.origin).includes(t.permit))break;
  const payment=tapCastCost976(c),eligible=tapCastElements976(s,t.p,payment),selected=t.selected;
  if(eligible.length<payment.count||selected.some(uid=>!eligible.some(x=>x.uid===uid)))break;
  if(selected.length===payment.count){
   cast(s,t.p,t.uid,false,null,0,{cost:0,g568PaymentColors:[],fixedPayment:true,g40PayNormally:true,g976TapPayment:selected},
    t.origin,'代替コスト',false,t.permit);
   break;
  }
  choice(s,t,payment.label+'タップする（'+selected.length+'/'+payment.count+'）',
   [...eligible.filter(x=>!selected.includes(x.uid)).map(x=>opt(card(x).name,x.uid,14-cost(card(x)),x.cardId)),skip()]);
  break;
 }
 case'g34_ODrive1439':overdrive1439(s,t);break;
 case'g34_PaySpell485':paySpell485(s,t);break;
 case'g34_RevealPayment470':revealPayment470(s,t);break;
 case'g34_PayOnce464':payOnce464(s,t);break;
 case'g34_ShangAttack1603':{
  const ref=t.g399Attacker;if(ref)start(s,{...t,uid:ref.uid,incarnation:ref.incarnation},[{op:'SelfSacrifice407',defs:[{op:'ShangReveal1603'}]}]);
  break;
 }
 case'g34_ShangReveal1603':{
  const filter={creature:true,raceAny:['アンノウン','ゼニス']},ids=look(s,{...t,n:own.deck.length,public:true,g1603UntilFilter:filter}),last=ids.at(-1);
  const found=last&&own.deck.find(x=>x.uid===last);
  if(found&&matches(s,t.p,found,filter))release(s,t.p,last);
  start(s,t,[...(found&&matches(s,t.p,found,filter)?[{op:'Put',origin:'deck',target:last}]:[]),{op:'RevealRelease514',ids},{op:'Shuffle405'}]);
  break;
 }
 case'g34_WeddingHands1603':{
  const n=t.n??creatures(s,t.p).filter(x=>!x.sealed&&!x.faceDown&&colors(effective(x,s)).length===0).length;
  if(n>0&&opp.hand.length)choice(s,{...t,n},'自身の手札からシールド化するカードを1枚選ぶ（残り'+n+'枚）',opp.hand.map(x=>opt(card(x).name,x.uid,0,x.cardId)),1-t.p);
  break;
 }
 case'g34_NoLoseTurn1602':
  for(const player of[0,1])(s.extLimits??=[]).push({kind:'g34NoLose',player,who:s.active,expires:'end'});
  break;
 case'g34_NothingZero1602':{
  const ids=look(s,{...t,n:3,public:true});
  const count=ids.filter(uid=>{const y=own.deck.find(x=>x.uid===uid);return y&&faces(api.zoneCard(s,t.p,y,'deck')).every(c=>colors(c).length===0);}).length;
  put(s,{...t,op:'g34_NothingTarget1602',ids,count},{...t,op:'g34_ReturnTopBottom1602',ids,top:[],bottom:[]});
  break;
 }
 case'g34_NothingTarget1602':{
  if(!t.count)break;
  const rows=creatures(s,t.p).filter(y=>!y.sealed);
  if(rows.length)choice(s,t,'シールドの追加ブレイクを与える自分のクリーチャーを1体選ぶ',targetOptions(s,t.p,rows));
  break;
 }
 case'g34_ReturnTopBottom1602':{
  const ids=t.ids.filter(uid=>own.deck.some(x=>x.uid===uid));
  if(!ids.length){start(s,t,[{op:'Order',ids:[],ordered:t.top,rest:'top',g259OrderTop:true},{op:'Order',ids:[],ordered:t.bottom,rest:'bottom'}]);break;}
  choice(s,{...t,ids},'公開したカードを山札の上・下に置く（先に選んだ順）',ids.flatMap(uid=>{
   const y=own.deck.find(x=>x.uid===uid);return['top','bottom'].map(to=>opt(card(y).name+'を山札の'+(to==='top'?'上':'下')+'へ',{uid,to},0,y.cardId));
  }));
  break;
 }
 case'g34_BattleLoot1601':
  start(s,t,[{op:'Offer',title:'カードを2枚引いてから手札を1枚捨てる？',g204DrawDiscard:true,defs:[
   {op:'Draw',n:2},{op:'BattleLootDiscard1601',fighter:t.fighter,battleToken:t.battleToken}]}]);
  break;
 case'g34_BattleLootDiscard1601':
  if(own.hand.length)choice(s,t,'捨てる手札を1枚選ぶ',own.hand.map(y=>opt(card(y).name,y.uid,-cost(card(y)),y.cardId)));
  break;
 case'g34_BattleLootPower1601':{
  const fighter=own.battle.find(x=>x.uid===t.fighter.uid&&(x.incarnation||0)===(t.fighter.incarnation||0));
  if(fighter)(fighter.powerModifiers??=[]).push({amount:5000,g1237BattleToken:t.battleToken});
  break;
 }
 case'g34_BattleHandPower1600':{
  if(!own.hand.length)break;
  if(!t.declared){choice(s,t,'相手に自分の手札を裏向きのまま1枚選んで見せる？',
   [opt('1枚選んで見せる',true,5),skip()]);break;}
  const slots=api.shuffled(own.hand.map(x=>x.uid),Math.floor(api.random(s)*4294967296));
  choice(s,{...t,slots},'相手の手札を裏向きのまま1枚選ぶ',slots.map((uid,i)=>opt('裏向きの手札 '+(i+1),i,0)),1-t.p);
  break;
 }
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
  if(t.g970RevealDraw){
   const y=shown.find(y=>matches(s,t.p,y,t.g970RevealDraw));
   if(!y)break;
   api.log(s,t.p,'reveal',card(t.source).name+'で手札公開：'+card(y).name,{cardId:y.cardId,source:t.source});
   const host=sourceHost474(s,t);
   if(host?.x.tapped&&api.isCreature(s,host.x)&&api.canUntap(host.x))
    start(s,t,[{op:'Offer',title:'このクリーチャーをアンタップする？',defs:[{op:'Untap',g191First:true}]}]);
   break;
  }
  for(const y of shown)api.log(s,t.p,'reveal',card(t.source).name+'で手札公開：'+card(y).name,{cardId:y.cardId,source:t.source});
  if(shown.some(y=>matches(s,t.p,y,{g223Multicolor:true})))api.draw(s,t.p,1);
  break;
 }
 case'g34_PlayersDraw461':{const ps=t.activeOnly?[s.active]:[s.active,1-s.active],controller=t.controller??t.p,group=t.discard?String(s.g461DrawSerial=(s.g461DrawSerial||0)+1):null;if(group)(s.g461DrawGroups??={})[group]={ps,controller,source:t.source,discard:t.discard,drawn:[]};put(s,...ps.map(p=>task('g34_PlayerDraw461',p,t.source,{n:t.n,optional:!!t.optional,upTo:!!t.upTo,discard:t.discard||0,group,controller})),...(group?[task('g34_FinishPlayersDraw461',t.p,t.source,{group,controller})]:[]));break;}
 case'g34_PlayersDiscardDraw461':{
  const by=t.controller??t.p;
  if(t.n)put(s,task('g34_PlayersDraw461',t.p,t.source,{n:t.n,upTo:true,controller:by}));
  for(const p of [1-s.active,s.active])api.discardSelected(s,p,s.players[p].hand.map(x=>x.uid),t.source,by);
  break;
 }
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
 case'g34_CycleDraw460':{
  const n=t.n+t.extra,power=(t.g1223PowerPerDiscard||0)*(t.actualDiscards||0);
  if(power)start(s,t,[{op:'SelfBoost313',power,g536Source:true,g694ClearOnSeal:true}]);
  if(n>0)api.draw(s,t.p,n);
  break;
 }
 case'g34_EachPlayer459':eachPlayer459(s,t);break;
 case'g34_NextReduction456':(s.extLimits??=[]).push({kind:'g456NextReduction',player:t.p,turn:s.turn,type:t.type,amount:t.amount,optional:!!t.optional,filter:t.filter||{},source:t.source,expires:'end',who:s.active,...(t.g1113ZeroFloor?{g1113ZeroFloor:true}:{}),...(t.g1305Speed?{g1305Speed:true}:{})});break;
 case'g34_SpaceCharge454':{
  if(t.rules.length===1&&t.rules[0].g792Once){start(s,t,t.rules[0].defs);break;}
  const choices=[];for(let mask=1;mask<2**t.rules.length;mask++){const selected=t.rules.flatMap((r,i)=>mask&(2**i)?[i]:[]);choices.push(opt(selected.map(i=>t.rules[i].color).join('・')+'の効果を使う',selected,selected.reduce((v,i)=>v+spaceScore455(s,t,t.rules[i].defs),0)));}choice(s,t,'スペース・チャージ：使う効果を選ぶ（記載順に解決）',[...choices,skip()]);break;}
 case'g34_ManaReveal449':{const c=card(t.source);if(api.spellIgnored(s,c))break;const rows=own.hand.filter(y=>new Set(faces(card(y)).flatMap(colors)).size>1);if(rows.length)choice(s,t,'手札の多色カードを1枚見せて、マナに置いたカードをアンタップする？',[...rows.map(y=>opt(card(y).name,y.uid,10,y.cardId)),skip()]);break;}
 case'g34_EntryCross728':{
  const gears=crossGears728(s,t.p).filter(x=>!t.selected.includes(x.uid));
  choice(s,t,'クロスするギアを選ぶ（選択済み '+t.selected.length+' 枚）',[
   ...gears.map(x=>opt(card(x).name,x.uid,t.selected.length?0:x.crossedTo?3:20,x.cardId)),
   opt('この枚数で出す',null,t.selected.length?10:-5)
  ]);
  break;
 }
 case'g34_EntryShieldForce1304':{
  if(own.g34Holding?.some(y=>y.uid===t.target))choice(s,t,'シールド・フォースに使うシールドを選ぶ',[
   ...own.shields.map((x,i)=>opt('シールド '+(i+1),api.shieldGroup(x),10)),skip()]);
  break;
 }
 case'g34_EntryTap432':{const y=own.g34Holding?.find(y=>y.uid===t.target);if(y){const defend=card(y).g431AttackMe&&!api.ignored(s,y);choice(s,t,card(y).name+'をタップして出す？',[opt('タップして出す',true,defend?10:0,y.cardId),opt('アンタップして出す',false,defend?0:1,y.cardId)]);}break;}
 case'g34_Yobi398':put(s,task('g19Yobi',t.p,t.source,{max:cost(card(t.source))}));break;
 // Remember the first ramped card's characteristics before replacement or zone clearing.
 case'g34_RampCheck411':{const y=api.takeTop(s,t.p);if(!y){api.deckCheck(s,t.p);break;}const c=api.zoneCard(s,t.p,y),creature=faces(c).some(f=>f.type==='creature'),hit=t.kind==='match'&&(t.filter.g583PrintedMinPower!==undefined?faces(c).some(f=>f.type==='creature'&&(f.power==='∞'||Number(f.power)>=t.filter.g583PrintedMinPower)):matches(s,t.p,y,t.filter)),costs=[...new Set(faces(c).map(cost))].map(n=>n===Infinity?'∞':n),to=api.deckDestination1365(s,t.p,'mana',api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana');clear(y,to);if(to==='mana'&&t.tapped)y.tapped=true;api.addZone(s,t.p,to,y);if(api.deckWasShuffled1365(s,y)){api.deckCheck(s,t.p);break;}if(t.kind==='selfUnlessCreature'&&!creature)start(s,t,[{op:'SelfMana297'}]);else if(hit)start(s,t,[{op:'Ramp',n:1,...(t.tapped?{tapped:true}:{})}]);else if(t.kind==='costSweep')put(s,{...t,op:'g34_RampCost411',costs});api.deckCheck(s,t.p);break;}
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
 case'g34_DestroyAttacker944':{
  const player=1-t.p,attacker=attackHost408(s,{...t,p:player});
  if(attacker&&!attacker.sealed&&api.isCreature(s,attacker)&&(t.maxPower===undefined||livePower199(s,attacker,true)<=t.maxPower))
   move(s,[{player,uid:attacker.uid,to:'grave',destroy:true,controller:t.controller??t.p}]);
  break;
 }
 case'g34_RondoUntap946':{
  const host=sourceHost474(s,t);
  if(host?.x.tapped&&api.isCreature(s,host.x)&&api.canUntap(host.x)&&
   !api.spellIgnored(s,{type:'spell',cost:t.spellCost,spellSource:t.source})){
   const untap={op:'Untap',g191First:true};
   start(s,t,t.g962EveryWin?[untap]:[{op:'Offer',title:card(host.x).name+'をアンタップする？',
    score:selfUntapValue542(s,t),defs:[untap]}]);
  }
  break;
 }
 case'g34_AttackerMana762':{
  const player=1-t.p,attacker=attackHost408(s,{...t,p:player});
  if(attacker&&!attacker.sealed&&api.isCreature(s,attacker))
   move(s,[{player,uid:attacker.uid,to:'mana',controller:player}]);
  break;
 }
 case'g34_ExtraTurn1795':
  if(t.attempted===10&&api.canAddTurn(s,t.p)){(s.extraTurns??=[]).push({player:t.p,source:t.source});api.log(s,t.p,'extraTurn','このターンの後、もう一度自分のターンを行う',{cardId:t.source});}
  break;
 case'g34_OpponentExtra1746':{const opponent=1-t.p;if(api.canAddTurn(s,opponent)){(s.extraTurns??=[]).push({player:opponent,source:t.source});api.log(s,opponent,'extraTurn','正体不明の効果で相手が追加ターンを得る',{cardId:t.source});}break;}
 case'g34_DogiradisFinal1744':{
  if(s.finalUsed?.[t.p])break;
  (s.finalUsed??=[false,false])[t.p]=true;(s.finalHistory??=[false,false])[t.p]=true;
  start(s,t,[{op:'Execute',zones:['hand','mana'],spellOnly:true,max:6,optional:true,
   filter:{g228Face:{type:'spell',multicolor:true,max:6}}}]);break;
 }
 case'g34_ReturnCastSpell1744':{
  if(used792(s,t,t)||!t.refs.some(r=>api.canMoveZone(s,r.owner,'grave')&&s.players[r.owner].grave.some(y=>y.uid===r.uid&&(y.zoneSerial||0)===r.serial&&(y.incarnation||0)===r.incarnation)))break;
  choice(s,t,t.spellName+'を墓地から手札に戻す？',[opt('手札に戻す',true,20),skip()]);break;
 }
 case'g34_RaceRecovery1741':{
  const copiedSelf=t.g1741EntrySelf&&card(t.source).copyOf;
  const ref=copiedSelf?t:t.g1741Subject;
  const host=sourceHost474(s,ref)?.x;
  const races=host?exactRaces(effective(host,s)):copiedSelf?exactRaces(card(t.source)):t.g1741Races;
  if(races?.length)start(s,t,[{op:'Select',origin:'grave',to:'hand',n:1,optional:true,
   filter:{creature:true,any:races.map(g724ExactRace=>({g724ExactRace}))}}]);
  break;
 }
 case'g34_EntryMach762':{
  const host=sourceHost474(s,t.subject)?.x;
  if(host&&!host.sealed&&api.isCreature(s,host))applyGrant(s,{...t,grant:t.g1740Haste?{speedAttacker:true}:{machFighter:true}},host);
  break;
 }
 case'g34_EntryHasteDestroy1770':{
  const host=sourceHost474(s,t.subject)?.x;
  if(!host||host.sealed||!api.isCreature(s,host))break;
  applyGrant(s,{...t,g1146UntilLeave:true,g1058FollowUnit:true,grant:{speedAttacker:true}},host);
  host.g34Delayed={turn:s.turn,to:'grave',source:t.source,controller:t.p};
  break;
 }
 case'g34_AttackEffect409':{if(attackHost408(s,t))(s.extLimits??=[]).push({kind:'g409AttackEffect',player:t.p,ref:t.g399Attacker,effect:t.kind,expires:'start',who:t.p});break;}
 case'g34_SelfHandEvolution1577':{
  const host=sourceHost474(s,t)?.x;
  if(!host||host.sealed||!own.battle.includes(host)||!api.isCreature(s,host))break;
  const rows=own.hand.filter(y=>{const c=card(y);return (c.evolution||c.neoEvolution)&&cost(c)<=t.max&&(!t.filter||matches(s,t.p,y,t.filter))&&canPut(s,t.p,y,'hand')&&api.evolutionBases(s,t.p,c).some(z=>z.uid===host.uid);});
  if(rows.length)choice(s,t,'このクリーチャーの上に進化させる手札のクリーチャーを選ぶ（任意）',[...rows.map(y=>opt(card(y).name,{uid:y.uid,serial:y.zoneSerial||0},20+cost(card(y)),y.cardId)),skip()]);
  break;
 }
 case'g34_GoukenEvolution1362':{
  const ids=look(s,{...t,n:t.allDeck?own.deck.length:7});
  const host=sourceHost474(s,t)?.x;
  const rows=host&&own.battle.includes(host)&&api.isCreature(s,host)?own.deck.filter(x=>
   ids.includes(x.uid)&&(t.anyCard||card(x).type==='creature')&&card(x).name.includes(t.nameIncludes||'ケンゲキオージャ')&&
   canPut(s,t.p,x,'deck')):[];
  if(rows.length)choice(s,{...t,...deckPeek841(own,ids),ids},t.allDeck?'このクリーチャーの上に重ねる'+t.nameIncludes+'を選ぶ':'ゴウケンオーの上に重ねるケンゲキオージャを選ぶ',[
   ...rows.map(x=>opt(card(x).name,x.uid,30,x.cardId)),skip()
  ]);
  else{
   for(const uid of ids)release(s,t.p,uid);
   api.shuffleLibrary(s,t.p,[],t.source);
  }
  break;
 }
 case'g34_GoukenShuffle1362':
  for(const uid of t.ids)release(s,t.p,uid);
  api.shuffleLibrary(s,t.p,[],t.source);
  break;
 case'g34_AttackLookDeploy1317':{
  const host=sourceHost474(s,t.g399Attacker)?.x;
  const ceiling=host?cost(effective(host,s)):t.g399Attacker.cost;
  const filter={creature:true,...(ceiling==='∞'||ceiling===Infinity?{}:{max:ceiling})};
  start(s,t,[{op:'LookDeploy530',n:2,limit:1,rest:'bottom',filter,g841DeckPeek:true,
   g771DeploySpeed:true,g1317SpeedFromCreature:card(t.source).type==='creature'}]);
  break;
 }
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
 case'g34_JudgeUntap969':{
  const host=sourceHost474(s,t.g399Attacker);
  if(host?.x.tapped&&!host.x.sealed&&api.isCreature(s,host.x)&&api.canUntap(host.x))
   start(s,t,[{op:'Offer',title:'攻撃クリーチャーをアンタップする？',defs:[
    {op:'AttackUntap408',g399Attacker:t.g399Attacker,g562Creature:true,g764FollowControl:true}
   ]}]);
  break;
 }
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
 case'g34_FirstAttackBreak1158':{
  const host=sourceHost474(s,t);
  if(host)(s.extLimits??=[]).push({kind:'g412ExtraBreak',player:host.p,ref:{uid:t.uid,incarnation:t.incarnation},
   source:t.source,amount:1,g969FollowControl:true,g1158FirstAttackBreak:true});
  break;
 }
 case'g34_AttackExtraBreak511':{
  const ref=t.g399Attacker;
  if(ref)start(s,{...t,uid:ref.uid,incarnation:ref.incarnation},[
   {op:'SelfExtraBreak444',amount:t.amount,...(t.g969FollowControl?{g969FollowControl:true}:{})}
  ]);
  break;
 }
 case'g34_UnblockedExtraBreak1076':
  if(s.attack?.stage==='unblocked482')s.attack.g1076ExtraBreaks=(s.attack.g1076ExtraBreaks||0)+t.amount;
  break;
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
 case'g34_ManaEntryResponse1268':
 case'g34_HandEntryResponse1261':
 case'g34_GhostRecovery878':
 case'g34_DeathRecovery831':{
  const ref=t.g831Subject;
  const denebia=t.op==='g34_HandEntryResponse1261',manaResponse=t.op==='g34_ManaEntryResponse1268';
  const subject=manaResponse?sourceHost474(s,ref)?.x:
   (denebia?s.players[1-t.p]:own).battle.find(x=>x.uid===ref.uid&&(x.incarnation||0)===ref.incarnation&&!x.sealed);
  const value=subject&&!subject.sealed&&(!manaResponse||api.isCreature(s,subject))?cost(effective(subject,s)):t.g831LastCost??ref.cost;
  const limit=value===Infinity?'∞':value;
  if(denebia)start(s,t,[{op:'Select',origin:'hand',n:1,deploy:true,optional:true,filter:{
   color:'光',...(limit==='∞'?{}:{max:limit}),any:[{creature:true},{g295Tamaseed:true}]
  }}]);
  else if(manaResponse)start(s,t,[{op:'Select',origin:'mana',n:1,deploy:true,optional:true,filter:{
   g228Face:{type:'creature',color:'自然',...(limit==='∞'?{}:{max:limit})}
  }}]);
  else if(t.op==='g34_GhostRecovery878')
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
 case'g34_BlockedPowerModes1314':
  start(s,t,[{op:'Choose',modes:[
   {label:'相手のクリーチャー1体のパワーを−1000',score:5,
    defs:[{op:'Target',power:-1000,g242PowerMinus:true}]},
   {label:'ブロックしたクリーチャーのパワーを−2000',score:10,
    defs:[{op:'EntryBoost755',subject:t.subject,power:-2000}]}
  ]}]);
  break;
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
 case'g34_WaveDraw1555':{
  const counts=[0,1].map(p=>creatures(s,p).filter(y=>!y.sealed&&!y.faceDown&&effective(y,s).g400Wave).length);
  put(s,...[s.active,1-s.active].filter(p=>counts[p]).map(p=>task('draw',p,t.source,{n:counts[p],controller:t.p})));
  break;
 }
 case'g34_JupiterDeploy1554':{
  const host=sourceHost474(s,t)?.x;
  const rows=host&&!host.sealed?api.layers(host).slice(1).filter(y=>{
   if(y.faceDown)return true;
   const c=card(y.cardId);
   return !c.evolution&&['creature','seed','gear','field','aura','duelist'].includes(c.type)&&api.canEnter(s,t.p,c,{origin:'battle',execution:false});
  }):[];
  if(rows.length)choice(s,t,'進化元の進化クリーチャーではないカードを1枚出す？',[
   ...rows.map((y,i)=>opt(y.faceDown?'裏向きの進化元 '+(i+1):card(y).name,y.uid,10,y.faceDown?null:y.cardId)),skip()]);
  break;
 }
 case'g34_SelfAttackedEnd1552':{const host=sourceHost474(s,t);if(host&&s.g481Attackers?.turn===s.turn){const refs=new Set(api.allLayers(host.x).map(y=>key(y)));if(s.g481Attackers.events.some(e=>e.p===t.p&&e.refs.some(ref=>refs.has(ref))))start(s,t,[{op:'SelfDestroy'}]);}break;}
 case'g34_IfNeo563':if(sourceNeo563(s,t)!==!!t.g1059Negate)start(s,t,t.defs);break;
 case'g34_IfSource541':{
  const host=sourceHost474(s,t);
  if(t.g1059NonEvolution||t.g1071Evolution){
   const evolved=host&&!host.x.sealed?api.isEvolution(host.x):t.g1059LastEvolution;
   if(evolved===!!t.g1071Evolution)start(s,t,t.defs);
  }else if(t.g1064Tapped){
   const tapped=host&&!host.x.sealed?host.x.tapped:t.g1064LastTapped;
   if(tapped)start(s,t,t.defs);
  }else if(host&&!host.x.sealed&&(!t.evolution||api.isEvolution(host.x)))start(s,t,t.defs);
  break;
 }
 // Shinka creates delayed triggers tied to the physical base, rather than abilities of the current top.
 // Resolve Shinka against the evolved unit currently containing the physical base.
 case'g34_ShinkaHost544':{const host=sourceHost474(s,t);if(t.mode==='belowCost'){const n=host?cost(effective(host.x,s)):t.g399Attacker?.cost;if(n!==null&&n!==undefined)start(s,t,[{op:'Target',to:'grave',filter:{belowCost:n===Infinity?'∞':n}}]);}else if(t.mode==='fight'&&host&&!host.x.sealed&&api.isCreature(s,host.x))put(s,{...t,op:'g34_FightEnemy240',fighter:{uid:host.x.uid,incarnation:host.x.incarnation||0},fighterOwner:host.p,optional:true});break;}
 case'g34_ForceGroup546':
  if(t.snapshot)for(const {p,y} of groupPowerRows(s,t))force546(s,t,p,y);
  else force546(s,t,1-t.p);
  break;
 case'g34_YurufuwaDeclare1293':{
  const [row,...remaining]=t.rows;
  if(!row){put(s,t.follow);break;}
  const next={...t,rows:remaining,declaring:row};
  const y=s.players[t.p].hand.find(x=>x.uid===row.uid&&(x.zoneSerial||0)===row.serial);
  if(!y||api.handAbilityIgnored(s,y)){put(s,next);break;}
  choice(s,next,card(row.source).name+'の能力を使用宣言しますか？',[
   opt('使用宣言する',true,15,row.source),skip()
  ]);
  break;
 }
 case'g34_YurufuwaDeploy1293':{
  const y=own.hand.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);
  if(y)start(s,t,[{op:'Put',origin:'hand',target:y.uid,execution:false}]);
  break;
 }
 case'g34_BarbatChessTerminal1292':
  if(!s.g7TerminalUsed?.[t.p])choice(s,t,'終極宣言を使う？（ゲーム中1回）',[
   opt('終極宣言する',true,creatures(s,1-t.p).some(y=>effective(y,s).noCostReduction)?-10:25),skip()
  ]);
  break;
 // Resolve the source move first, including any departure replacement. The rest
 // of the reset still resolves when the source has already left the battlefield.
 case'g34_PacificReset1614':{
  put(s,{...t,op:'g34_PacificShuffle1614'});
  const host=sourceHost474(s,t);
  if(host)move(s,[{player:host.p,uid:host.x.uid,to:'deck',destroy:false,g731Shuffling:true,g1614DeferShuffle:true,controller:t.p}]);
  break;
 }
 case'g34_PacificShuffle1614':{
  const rows=[...own.hand.splice(0),...(api.canMoveZone(s,t.p,'grave')?own.grave.splice(0):[])];
  for(const y of rows)clear(y,'deck');
  api.shuffleLibrary(s,t.p,rows,t.source);
  start(s,t,[{op:'Draw',n:3}]);
  break;
 }
 case'g34_GraveShuffle545':put(s,task('g22Shuffle',t.p,t.source,
  {optional:t.optional,owner:t.owner,creaturesThenDraw:t.creaturesThenDraw}));break;
 case'g34_MillRecover545':{const y=api.takeTop(s,t.p);if(!y){api.deckCheck(s,t.p);break;}clear(y);api.addZone(s,t.p,'grave',y);const matched=!api.deckWasShuffled1365(s,y)&&matches(s,t.p,y,t.filter);api.deckCheck(s,t.p);if(s.winner!==null)break;if(matched)zoneMove(s,t.p,'grave',y.uid,'hand',t);else start(s,t,t.elseDefs);break;}
 case'g34_CountTarget544':start(s,t,[{...t.def,power:(own[t.zone]?.length||0)*t.amount}]);break;
 case'g34_ShinkaDelay543':if(sourceHost474(s,t)){const r={p:t.p,source:t.source,uid:t.uid,incarnation:t.incarnation||0};if(t.when==='end')(s.g537Delays??=[]).push({...r,when:'turnEnd',turn:s.turn,defs:[{op:'Untap',g191First:true}]});else(s.extLimits??=[]).push({kind:'g543Shinka',...r,when:t.when,expires:'end',who:s.active});}break;
 case'g34_ShinkaGrant397':{const host=t.untilStart?sourceHost474(s,t)?.x:own.battle.find(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)));if(host){if(t.battlePower)(s.extLimits??=[]).push({kind:'g446BattlePower',player:t.p,ref:{uid:t.uid,incarnation:t.incarnation||0},amount:t.battlePower,expires:'end',who:s.active});if(t.power)(host.powerModifiers??=[]).push({amount:t.power,expires:'end',who:s.active});if(t.grant){if(t.g1058FollowUnit)applyGrant(s,{...t,g521UntilStart:true},host);else if(t.untilStart)(s.extLimits??=[]).push({kind:'g521Grant',ref:{uid:t.uid,incarnation:t.incarnation||0},grant:t.grant,expires:'start',who:t.p});else(host.g34Grants??=[]).push({turn:s.turn,...t.grant});}}break;}
 case'g34_RecoverAll326':{const rows=list(s,{...t,selected:[]}),before=new Set(own.hand.map(y=>y.uid));for(const r of rows)zoneMove(s,r.p,r.origin,r.x.uid,'hand',t);const n=rows.filter(r=>own.hand.some(y=>y.uid===r.x.uid)&&!before.has(r.x.uid)).length;api.log(s,t.p,'recover',card(t.source).name+'：条件に合うカード'+n+'枚を手札に戻した',{cardId:t.source});if(t.after)start(s,t,t.after);break;}
 case'g34_BreakDelay484':(s.g484BreakEnds??=[]).push({p:t.p,uid:t.uid,incarnation:t.incarnation||0,source:t.source,turn:s.turn});break;
 case'g34_BreakReturn484':{const host=sourceHost474(s,t);if(host&&!host.x.sealed)start(s,t,[E('SelfHand299')]);break;}
 case'g34_BlockForAttack814':{
  const host=sourceHost474(s,t),attack=s.attackLifecycle;
  if(attack&&s.attack&&host&&!host.x.sealed&&api.isCreature(s,host.x))
   (attack.g814Blockers??=[]).push({uid:t.uid,incarnation:t.incarnation||0});
  break;
 }
 case'g34_KizunaPlus1544':{
  const host=sourceHost474(s,t)?.x,below=host&&!host.sealed?api.layers(host).slice(1):[];
  if(below?.length)choice(s,t,'キズナプラス：下のカード1枚を墓地に置く？',
   [...below.map(y=>opt(y.faceDown?'裏向きの進化元':card(y).name,y.uid,20,y.faceDown?null:y.cardId)),skip()]);
  break;
 }
 case'g34_KizunaPlusOther1544':{
  if(t.g1544Others.length)choice(s,t,'他の自分のクリーチャーのP能力を選ぶ',
   t.g1544Others.map(y=>opt(card(y).name,y.uid,10,y.cardId)));
  else for(const y of t.g1544Self)queue(s,t.p,y,y.defs);
  break;
 }
 case'g34_KizunaComp1543':{
  const rows=t.g1543Rows??creatures(s,t.p).filter(y=>!y.sealed&&!y.faceDown&&effective(y,s).g1540P?.length)
   .map(y=>({uid:y.uid,incarnation:y.incarnation||0,cardId:y.cardId,defs:structuredClone(effective(y,s).g1540P)}));
  const selected=t.g1543Selected??[],remaining=rows.filter(y=>!selected.includes(y.uid));
  if(remaining.length)choice(s,{...t,g1543Rows:rows,g1543Selected:selected},'使うP能力を持つ自分のクリーチャーを選ぶ（選択済み '+selected.length+'体）',
   [...remaining.map(y=>opt(card(y).name,y.uid,10,y.cardId)),opt('選択を終えてP能力を使う',null,0)]);
  else for(const y of rows.filter(y=>selected.includes(y.uid)))queue(s,t.p,y,y.defs);
  break;
 }
 case'g34_Kizuna1540':{
  const rows=creatures(s,t.p).filter(y=>!y.sealed&&!y.faceDown&&effective(y,s).g1540P?.length);
  if(rows.length)choice(s,t,'使うP能力を持つ自分のクリーチャーを選ぶ',rows.map(y=>opt(card(y).name,{uid:y.uid,incarnation:y.incarnation||0},10,y.cardId)));
  break;
 }
 case'g34_SelfGrant754':{const host=sourceHost474(s,t);if(host&&(!t.g770LiveCreature||!host.x.sealed&&api.isCreature(s,host.x)))applyGrant(s,t,host.x);break;}
 case'g34_Dangan1639':{
  const host=sourceHost474(s,t);
  if(!host||host.x.sealed||!api.isCreature(s,host.x))break;
  const n=own.battle.filter(y=>y.uid!==host.x.uid&&!y.sealed&&!y.faceDown&&race(effective(y,s,true),'ジョーカーズ')).length;
  start(s,t,[{op:'SelfGrant754',grant:{entryPlayerAttack:true}},...(n?[{op:'SelfExtraBreak444',amount:n,g969FollowControl:true}]:[])]);
  break;
 }
 case'g34_CrossDeployed1640':{
  const host=sourceHost474(s,t),gear=own.battle.find(y=>y.uid===t.gear&&(y.incarnation||0)===t.gearInc&&card(y).type==='gear'&&!y.sealed&&!y.faceDown);
  if(gear&&host&&host.p===t.p&&!host.x.sealed&&api.isCreature(s,host.x))api.crossGearGroup(s,t.p,host.x,[gear.uid]);
  break;
 }
 case'g34_GraveReturn754':{
  const y=own.grave.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);
  if(!y)break;
  if(t.condition?.g1167ShieldForReturn){
   start(s,t,[{op:'ShieldGrave',optional:true,then:[{op:'SelfGraveHand476',serial:t.serial}]}]);
   break;
  }
  if(!api.canMoveZone(s,t.p,'grave')||t.condition&&!ownCondition(s,t.p,t.condition))break;
  if(t.deploy&&t.condition?.g1242Mandatory){
   doPut(s,{...t,owner:t.p,origin:'grave',target:y.uid});
   break;
  }
  if(t.condition?.g1050MandatoryGraveReturn){zoneMove(s,t.p,'grave',y.uid,'hand',t);break;}
  if(t.deploy&&!canPut(s,t.p,y,'grave'))break;
  if(t.colors?.length){
   const manaColors=new Set(own.mana.filter(x=>!x.faceDown).flatMap(x=>api.manaColors(api.zoneCard(s,t.p,x,'mana'),s,t.p)));
   if(!t.colors.every(c=>manaColors.has(c)))break;
  }
  start(s,t,[{op:'Offer',title:card(y).name+(t.deploy?'を墓地からバトルゾーンに出す？':'を墓地から手札に戻す？'),
   score:18,defs:[{op:t.deploy?'SelfGraveRevive644':'SelfGraveHand476',serial:t.serial,...(t.tapped?{tapped:true}:{}),
    ...(t.g1069AllowEvolution?{g1069AllowEvolution:true}:{})}]}]);
  break;
 }
 case'g34_SelfExtra1121':{
  const host=sourceHost474(s,t);
  if(host)move(s,[{player:host.p,uid:host.x.uid,to:'extra',destroy:false,toOwnerExtra:true,controller:t.p}]);
  break;
 }
 case'g34_SelfHand299':{
  const host=sourceHost474(s,t);
  if(!host)break;
  if(t.optional||t.afterAttempt){
   if(!host.x.sealed)start(s,t,[{op:'ExactMove',owner:host.p,target:host.x.uid,targetIncarnation:host.x.incarnation||0,
    to:'hand',toOwnerHand:true,optional:t.optional,afterAttempt:t.afterAttempt}]);
  }else move(s,[{player:host.p,uid:host.x.uid,to:'hand',controller:t.controller??t.p,...(t.toOwnerHand?{toOwnerHand:true}:{})}]);
  break;
 }
 // The death trigger follows its first grave visit, never a later visit by the same physical card.
 case'g34_ScheduleGraveReturn644':
  if((t.anyTurn||s.active===t.p)&&(t.nextOpponent||!s.endStep)&&(!t.condition||ownCondition(s,t.p,t.condition)))
   put(s,{...t,op:'g34_Schedule537',when:t.nextOpponent?'nextOwnStart':'turnEnd',...(t.nextOpponent?{who:1-t.p}:{}),
    defs:[{op:'SelfGraveRevive644',serial:t.serial}]});
  break;
 case'g34_ManaSummonWatch975':
 case'g34_GraveSummonWatch766':{
  const origin=t.op==='g34_ManaSummonWatch975'?'mana':'grave';
  const y=own[origin].find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);
  if(y&&api.canMoveZone(s,t.p,origin)&&canPut(s,t.p,y,origin))start(s,t,[{
   op:'Offer',title:card(y).name+(origin==='mana'?'をマナから出す？':'を墓地から出す？'),
   defs:[{op:origin==='mana'?'SelfManaDeploy975':'SelfGraveRevive644',serial:t.serial}]
  }]);
  break;
 }
 case'g34_SelfManaDeploy975':
 case'g34_SelfGraveRevive644':{
  const origin=t.op==='g34_SelfManaDeploy975'?'mana':'grave';
  const y=own[origin].find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);
  if(y&&api.canMoveZone(s,t.p,origin)&&canPut(s,t.p,y,origin)){
   const deployment={...t,owner:t.p,origin,target:y.uid};
   if(t.g1069AllowEvolution)put(s,{...deployment,op:'g34_Put'});
   else doPut(s,deployment);
  }
  break;
 }
 case'g34_SelfGraveBottom839':{
  const y=ownGraveSource839(own,t);
  if(y&&api.canMoveZone(s,t.p,'grave'))choice(s,t,'このクリーチャーを墓地から山札の'+(t.g1615Top?'上':'下')+'に置く？',
   [opt('山札の'+(t.g1615Top?'上':'下')+'に置く',true,20,y.cardId),skip()]);
  break;
 }
 case'g34_RevealDiscard839':revealDiscard839(s,t);break;
 case'g34_GraveDiscardReturn1284':{
  const y=own.grave.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);
  if(y&&api.canMoveZone(s,t.p,'grave'))start(s,t,[{op:'Offer',title:card(y).name+'を墓地から手札に戻す？',
   defs:[{op:'SelfGraveHand476',serial:t.serial}]}]);
  break;
 }
 case'g34_SelfGraveHand476':{
  const y=own.grave.find(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)&&(y.zoneSerial||0)===t.serial);
  if(y&&(!t.condition||ownCondition(s,t.p,t.condition)))zoneMove(s,t.p,'grave',y.uid,'hand',t);
  break;
 }
 case'g34_SelfGraveShield659':{
  const y=own.grave.find(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)&&(y.zoneSerial||0)===t.serial);
  if(y)zoneMove(s,t.p,'grave',y.uid,'shields',{...t,g657FaceUp:!t.g1714FaceDown});
  break;
 }
 case'g34_HippoMana1124':{
  const rows=api.canMoveZone(s,t.p,'mana')?own.mana.filter(y=>
   !y.faceDown&&api.manaColors(card(y),s,t.p).includes('自然')):[];
  if(rows.length)choice(s,t,'墓地に置く自然のマナを1枚選ぶ',
   rows.map(y=>opt(card(y).name,y.uid,10-cost(card(y)),y.cardId)));
  else start(s,t,[{op:'SelfDestroy'}]);
  break;
 }
 case'g34_ManaSummon1288':{
  // The permission applies only to the creatures in mana when the spell resolves (QA 43048).
  const refs=own.mana.filter(x=>!x.faceDown&&faces(card(x)).some(c=>c.type==='creature'))
   .map(x=>({uid:x.uid,serial:x.zoneSerial||0}));
  if(refs.length){
   const limits=s.extLimits??=[];
   const permit='g1288:'+t.p+':'+limits.filter(l=>l.kind==='g1288ManaSummon'&&l.player===t.p).length;
   limits.push({kind:'g1288ManaSummon',player:t.p,turn:s.turn,expires:'end',who:s.active,permit,refs,
    source:t.source,spellCost:cost(faces(card(t.source)).at(-1))});
  }
  break;
 }
 case'g34_ManaTurn297':(s.extLimits??=[]).push({kind:'g297ManaTurn',player:t.p,controller:t.p,turn:s.turn,who:s.active,expires:'end'});break;
 case'g34_SelfManaFollow1468':{
  if(sourceHost474(s,t))choice(s,t,'このクリーチャーをマナに置く？',[opt('マナに置く',true,10),skip()]);break;
 }
 case'g34_SelfMana297':{
  const host=t.g536Source?sourceHost474(s,t):x?{p:t.p,x}:null;
  if(!host||host.x.sealed&&t.g536Source)break;
  if(t.unlessOtherDragon&&s.players[host.p].battle.some(y=>y.uid!==host.x.uid&&!y.sealed&&race(effective(y,s),'ドラゴン')))break;
  move(s,[{player:host.p,uid:host.x.uid,to:'mana',tapped:!!t.tapped,controller:t.controller??t.p}]);
  break;
 }
 case'g34_BlindReveal803':{
  const owner=t.owner==='opponent'?1-t.p:t.p,hand=s.players[owner].hand;
  if(!hand.length)break;
  // Even an already revealed hand is chosen blind for Blue Mojito (QA 36354).
  const slots=t.g1309BounceDeploy||api.handHasPublicCards(s,owner)?api.shuffled(hand.map(x=>x.uid),Math.floor(api.random(s)*4294967296)):null;
  choice(s,slots?{...t,slots}:t,'相手の手札を裏向きのまま1枚選ぶ',
   hand.map((_,i)=>opt('裏向きの手札 '+(i+1),i,0)),1-owner);
  break;
 }
 case'g34_OwnSealGrave1156':{
  const seals=own.seals??[],selected=t.selected??[];
  const remaining=seals.filter(y=>!selected.includes(y.uid));
  const needed=Math.min(t.n,seals.length)-selected.length;
  if(needed<=0||remaining.length===needed){
   api.moveSealsToGrave1156(s,t.p,[...selected,...remaining.slice(0,Math.max(0,needed)).map(y=>y.uid)]);
  }else choice(s,t,'墓地に置く自分の封印をあと'+needed+'つ選ぶ',remaining.map(y=>{
   const host=own.battle.find(x=>x.uid===y.sealOf);
   return opt((host?card(host).name+'の':'')+'封印 '+(seals.indexOf(y)+1),y.uid,host?cost(card(host)):0);
  }));
  break;
 }
 case'g34_BlindHandBottom1154':{
  if(!own.hand.length||!api.canMoveZone(s,t.p,'hand'))break;
  const slots=t.slots??api.shuffled(own.hand.map(x=>x.uid),Math.floor(api.random(s)*4294967296));
  const selected=t.selected??[],count=Math.min(t.n,slots.length);
  const remaining=slots.filter(uid=>!selected.includes(uid));
  const needed=count-selected.length;
  if(needed===0||remaining.length===needed){
   put(s,{...t,op:'g34_HandBottomOrder1154',remaining:[...selected,...remaining.slice(0,needed)],ordered:[]});
   break;
  }
  choice(s,{...t,slots,selected},'山札の下に置く相手の手札を裏向きのまま'+count+'枚選ぶ',
   slots.flatMap((uid,i)=>selected.includes(uid)?[]:[opt('裏向きの手札 '+(i+1),i,0)]),1-t.p);
  break;
 }
 case'g34_HandBottomDraw1169':
  put(s,{...t,op:'g34_HandBottomOrder1154',remaining:own.hand.map(x=>x.uid),ordered:[],drawAfterBottom:own.hand.length+2});
  break;
 case'g34_HandBottomOrder1154':{
  const rows=t.remaining.map(uid=>own.hand.find(x=>x.uid===uid)).filter(Boolean);
  if(rows.length>1){
   choice(s,t,'山札の下に置く順序を選ぶ',rows.map(y=>opt(card(y).name,y.uid,0,y.cardId)));
   break;
  }
  for(const uid of [...t.ordered,...rows.map(y=>y.uid)])zoneMove(s,t.p,'hand',uid,'deck',t);
  if(t.drawAfterBottom)api.draw(s,t.p,t.drawAfterBottom);
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
   const count=Math.min(t.n??1,opp.hand.length),selected=t.selected??[];
   if(t.op==='g34_BlindDiscard773'&&t.n>1&&count===1){
    api.discardSelected(s,1-t.p,[opp.hand[0].uid],t.source,t.controller??t.p);
    break;
   }
   const title=t.op==='g34_BlindDiscard773'?'捨てさせる相手の手札を裏向きのまま'+count+'枚選ぶ':'マナに置く相手の手札を裏向きのまま1枚選ぶ';
   const slots=t.slots??(api.handHasPublicCards(s,1-t.p)?
    api.shuffled(opp.hand.map(x=>x.uid),Math.floor(api.random(s)*4294967296)):null);
   choice(s,slots?{...t,slots}:t,title,opp.hand.flatMap((_,i)=>selected.includes(i)?[]:[opt('裏向きの手札 '+(i+1),i,0)]));
  }
  break;
 case'g34_StartManaLimit794':put(s,task('g43_LimitMana',t.p,t.source,{max:t.max}));break;
 case'g34_StartManaLock773':
  choice(s,t,'次のターン開始時にアンタップさせない相手のマナを1枚選ぶ',opp.mana.map((y,i)=>
   opt(y.faceDown?'裏向きのマナ '+(i+1):card(y).name,y.uid,y.tapped?10:0,y.faceDown?null:y.cardId)));
  break;
 case'g34_ManaColorsLock1054':{
  const p=1-t.p,selected=t.selected||[],pending=t.remainingColors||civilizations805;
  const rows=opp.mana.flatMap((x,i)=>selected.includes(x.uid)?[]:[{x,i,civilizations:
   api.manaColors(api.zoneCard(s,p,x,'mana'),s,p)}]);
  const first=pending.findIndex(color=>rows.some(row=>row.civilizations.includes(color)));
  if(first<0){
   for(const x of opp.mana)if(selected.includes(x.uid)){
    x.tapped=true;
    startUntapLock210(t,x);
   }
   break;
  }
  const [color,...rest]=pending.slice(first);
  // Each physical card can fill one slot. Keep choices that allow the full number of assignments.
  const needed=manaColorMatchCount1054(rows,[color,...rest])-1;
  const eligible=rows.filter(row=>row.civilizations.includes(color)&&
   manaColorMatchCount1054(rows.filter(other=>other!==row),rest)===needed);
  choice(s,{...t,remainingColors:rest},'タップする相手の'+color+'のマナを1枚選ぶ',
   eligible.map(({x,i})=>opt(x.faceDown?'裏向きのマナ '+(i+1):card(x).name,x.uid,
    x.skipUntap?0:x.tapped?8:16,x.faceDown?null:x.cardId)));
  break;
 }
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
 case'g34_DeclareSearchCost1134':
  put(s,task('g9Number',t.p,t.source,{family:'searchCost1134',minNumber:t.min}));
  break;
 case'g34_SearchCost1134':
  start(s,t,[{op:'Look',n:3,public:true,rest:'bottom',stages:[{n:1,to:'hand',filter:{g1134AnyFaceCost:t.number}}]}]);
  break;
 case'g34_Roulette732':put(s,task('g9Number',t.p,t.source,{family:'roulette732'}));break;
 case'g34_DeclareBlindDiscardCost1249':
  put(s,task('g9Number',t.p,t.source,{family:'blindDiscardCost1249'}));
  break;
 case'g34_CheckBlindDiscardCost1249':{
  if(!t.discarded)break;
  const costs=[...new Set(faces(card(t.cardId)).map(c=>cost(c)===Infinity?'∞':cost(c)))];
  if(costs.length===1){
   if(costs[0]===t.number)api.draw(s,t.p,1);
  }else choice(s,t,'捨てられたカードの参照するコストを選ぶ',costs.map(n=>
   opt('コスト '+n,n,n===t.number?10:0,t.cardId)));
  break;
 }
 case'g34_DeclareHandCost1109':
  put(s,task('g9Number',t.p,t.source,{family:'handCost1109'}));
  break;
 case'g34_InspectHandCost1109':{
  if(!opp.hand.length)break;
  const number=t.number==='∞'?Infinity:t.number;
  const seen=opp.hand.map(x=>{
   const matching=faces(card(x)).some(face=>cost(face)===number);
   return {id:x.cardId,label:matching?'宣言したコストと一致':'宣言したコストと不一致',matching};
  });
  const count=seen.filter(row=>row.matching).length;
  api.log(s,t.p,'look',card(t.source).name+'で相手の手札を確認（内容は非公開）',{cardId:t.source});
  choice(s,{...t,count,g585Peek:seen.map(({id,label})=>({id,label}))},'相手の手札を確認',[
   opt('確認を終える',true,0)
  ]);
  break;
 }
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
  if(t.g1465ToBottom){api.log(s,t.p,'look',card(t.source).name+'で相手の手札を確認',{cardId:t.source});choice(s,t,'相手の手札から山札の下に置くカードを選ぶ',hand.map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)));break;}
  if(t.g1684JustIdea){
   api.log(s,t.p,'look',card(t.source).name+'で相手の手札を確認',{cardId:t.source});
   const rows=hand.map(y=>({y,eligible:faces(card(y)).some(c=>c.type==='creature')}));
   const g585Peek=rows.map(({y,eligible})=>({id:y.cardId,label:eligible?'選択可能':'選択不可'}));
   choice(s,{...t,g585Peek},'相手の手札から出すクリーチャーを1体まで選ぶ',[
    ...rows.filter(r=>r.eligible).map(({y})=>opt(card(y).name,y.uid,own.deck.length>5?25-cost(card(y)):-1000,y.cardId)),
    opt('出さない',null,0)
   ]);
   break;
  }
  if(t.g1324ChooseCreature){
   api.log(s,t.p,'look',card(t.source).name+'で相手の手札を確認',{cardId:t.source});
   const rows=hand.map(y=>({y,eligible:faces(card(y)).some(c=>c.type==='creature')}));
   const options=rows.filter(row=>row.eligible).map(({y})=>opt(card(y).name,y.uid,10-cost(card(y)),y.cardId));
   const g585Peek=rows.map(({y,eligible})=>({id:y.cardId,label:eligible?'選択可能':'選択不可'}));
   choice(s,{...t,g585Peek},'相手の手札からクリーチャーを指定する',
    options.length?options:[opt('確認を終える',null,0)]);
   break;
  }
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
 case'g34_OpponentDiscardOrDraw1012':{
  if(!opp.hand.length||api.handProtected(s,{p:1-t.p,source:t.source,causedBy:t.p})){
   put(s,{...t,op:'g34_DrawUnlessDiscarded1012'});
  }else{
   choice(s,t,'自分の手札を1枚捨てる？',[
    ...opp.hand.map(y=>opt(card(y).name+'を捨てる',y.uid,15-Math.min(20,cost(card(y))),y.cardId)),skip()
   ],1-t.p);
  }
  break;
 }
 case'g34_DrawUnlessDiscarded1012':
  if(!t.discarded)start(s,t,[{op:'Offer',title:'カードを2枚引く？',defs:[{op:'Draw',n:2}]}]);
  break;
 case'g34_DiscardFor248':{
  const selected=t.selected??[],remaining=(t.n??1)-selected.length;
  const rows=own.hand.filter(y=>!selected.includes(y.uid)&&matches(s,t.p,y,t.g488DiscardFilter));
  if(rows.length>=remaining)choice(s,t,t.title||(t.g488DiscardFilter?'手札のクリーチャーを1体捨てて能力を使う？':'手札を1枚捨てて能力を使う？'),
   [...rows.map(y=>opt(card(y).name+'を捨てる',y.uid,discardScore248(s,t,y),y.cardId)),...(t.required?[]:[skip()])]);
  break;
 }
 case'g34_DiscardPower1282':
  start(s,t,[{op:'Target',spell:t.spell,title:'相手のクリーチャーを1体選ぶ',
   ...(t.discarded?{power:t.power,g242PowerMinus:true}:{})}]);
  break;
 case'g34_IfHand246':if(own.hand.length<=t.max)start(s,t,t.defs);else if(t.elseDefs)start(s,t,t.elseDefs);break;
 case'g34_NextCreatureGrant1218':
  (s.extLimits??=[]).push({kind:'g1218NextCreatureGrant',player:t.p,source:t.source,
   turn:s.turn,who:s.active,expires:'end',grant:t.grant});
  break;
 case'g34_OniClock1303':(s.g1303OniClock??=[null,null])[t.p]=s.turn;break;
 case'g34_IfOwn':if(ownCondition(s,t.p,t.filter,t.uid,t.incarnation??null,t.lastKnownCount))start(s,t,t.defs);else if(t.elseDefs)start(s,t,t.elseDefs);break;
 case'g34_Pradox1089':{
  const ids=look(s,{...t,n:5}),peek=deckPeek841(own,ids);
  choice(s,{...t,ids,g585Peek:peek},'文明を1つ選ぶ',
   civilizations805.map(c=>opt(c,c,own.deck.some(y=>ids.includes(y.uid)&&matches(s,t.p,y,{creature:true,color:c,max:10}))?10:0)));
  break;
 }
 case'g34_PradoxRest1089':{
  const host=sourceHost474(s,t),ids=t.ids.filter(uid=>own.deck.some(x=>x.uid===uid));
  if(host&&api.allLayers(host.x).some(x=>key(x)===key(t)&&x.summonedTurn===s.turn))
   put(s,{...t,ids,op:'g34_PradoxRemaining1089',remaining:civilizations805.filter(c=>c!==t.color)});
  else put(s,{...t,ids,op:'g34_Order',rest:'bottom',ordered:[]});
  break;
 }
 case'g34_PradoxRemaining1089':{
  const ids=t.ids.filter(uid=>own.deck.some(x=>x.uid===uid)),rows=own.deck.flatMap(y=>ids.includes(y.uid)&&canPut(s,t.p,y,'deck')?
   t.remaining.filter(c=>matches(s,t.p,y,{creature:true,color:c,max:10})).map(c=>opt(card(y).name+'（'+c+'）',{uid:y.uid,color:c},10+cost(card(y)),y.cardId)) : []);
  if(rows.length)choice(s,{...t,ids},'残りの文明につき1体まで出す？',[...rows,skip()]);
  else put(s,{...t,ids,op:'g34_Order',rest:'bottom',ordered:[]});
  break;
 }
 case'g34_BorrowMizuhanome1089':{
  const enemy=1-t.p,deck=s.players[enemy].deck;
  let found;
  for(const x of deck.filter(x=>!reserved(s.players[enemy]).has(x.uid)).slice(0,api.lookCount(s,enemy,deck.length))){
   const c=faces(card(x)).find(face=>face.type==='creature');
   api.log(s,enemy,'reveal',card(t.source).name+'：山札から'+card(x).name+'を公開',{cardId:x.cardId});
   if(c){found={x,c};break;}
  }
  let entries=[];
  if(found&&zoneMove(s,enemy,'deck',found.x.uid,'grave',t)){
   const text=String(found.c.text||'').split(/【呪文(?:面|側)】/,1)[0];
   const literal=text.split('\n').filter(line=>line.normalize('NFKC').replace(/^\s*■?\s*/,'').startsWith('このクリーチャーが出た時')).length;
   if(literal)entries=api.entryAbilities(s,t.p,found.x.cardId,{uid:t.uid,incarnation:t.incarnation||0,source:t.source,literal});
  }
  api.shuffleLibrary(s,enemy);
  api.deckCheck(s,enemy);
  if(entries.length&&s.winner===null&&!s.lossEvent)choice(s,{...t,entries},'墓地に置いたクリーチャーの「出た時」の能力を使う？',[
   opt(card(found.x).name+'の能力を使う',true,20,found.x.cardId),skip()
  ]);
  break;
 }
 case'g34_Fukafuchi1088':{
  const id='g1088Fukafuchi:'+key(t);
  if(s.once?.[id]===s.turn)break;
  (s.once??={})[id]=s.turn;
  start(s,t,[{op:'HandCost262',defs:[{op:'Select',origin:'hand',n:1,deploy:true,optional:true,
   filter:{race:'ロスト・クルセイダー',color:'水'},title:'手札の枚数以下の水のロスト・クルセイダーを1つ出す？'}]}]);
  break;
 }
 case'g34_GraveBase1126':{
  const host=sourceHost474(s,t.entrant);
  const base=own.grave.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);
  if(host&&host.p===t.p&&!host.x.sealed&&api.isCreature(s,host.x)&&base&&api.canMoveZone(s,t.p,'grave'))
   choice(s,t,'～脅威の盾～を登場したクリーチャーの下に置く？',
    [opt('下に置く',true,12,base.cardId),skip()]);
  break;
 }
 case'g34_DrawThenDestroy1126':{
  const host=sourceHost474(s,t)?.x;
  const n=host&&!host.sealed?api.allLayers(host).length:t.lastKnownCount??1;
  start(s,t,[{op:'Draw',n},{op:'SelfDestroy'}]);
  break;
 }
 case'g34_CastBattleTwin1175':{
  const rows=creatures(s,t.p).flatMap(y=>{
   const spell=faces(card(y))[1];
   return !y.sealed&&spell?.type==='spell'&&api.canCast(s,t.p,spell,'battle')?
    [opt(spell.name+'を唱える',{uid:y.uid,incarnation:y.incarnation||0},spellScore555(s,t,spell),y.cardId)]:[];
  });
  if(rows.length)choice(s,t,'場に置いたまま唱えるツインパクトの呪文側を選ぶ（任意）',[...rows,skip()]);
  break;
 }
 case'g34_CrystalManaDown1175':{
  const mana=own.mana.find(y=>y.uid===t.target&&!y.faceDown&&(y.zoneSerial||0)===t.serial);
  if(mana&&!used792(s,t,t))choice(s,t,card(mana).name+'をマナゾーンで裏向きにする？',
   [opt('裏向きにする',true,manaDownScore426(s,t,mana),mana.cardId),skip()]);
  break;
 }
 case'g34_FunkyMinus1674':{
  const n=own.grave.filter(y=>!y.faceDown&&api.zoneCard(s,t.p,y,'grave').type==='creature').length;
  if(n)start(s,t,[{op:'GroupPower',owner:'opponent',filter:{creature:true},power:-1000*n}]);
  break;
 }
 case'g34_FionaAttackPreference1673':{
  const refs=creatures(s,1-t.p).filter(y=>!y.sealed&&!y.faceDown).flatMap(api.allLayers).map(key);
  if(refs.length)(s.extLimits??=[]).push({kind:'g1673PreferCreature',player:1-t.p,refs,turn:s.turn,expires:'end',who:s.active});
  break;
 }
 case'g34_HaridelReturn1675':{
  const selection=haridelSelection1675(s,t);
  if(list(s,selection).length)choice(s,t,'このターン破壊された自分のクリーチャーをすべて戻すか選ぶ',[
   opt('すべて戻す',true,20),skip()
  ]);
  break;
 }
 case'g34_BritishReturn1672':{
  const history=s.g1672Destroyed;
  if(history?.turn===s.turn)start(s,t,[{op:'Select',origin:'grave',to:'hand',g1009SelectAll:true,
   filter:{creature:true},g960FormerBases:history.cards[t.p]}]);
  break;
 }
 case'g34_LauncherVictim1672':
  start(s,{...t,p:1-t.p,controller:t.controller??t.p},[{op:'Select',origin:'battle',to:'mana',n:1,
   filter:{creature:true,untapped:true},g187OwnPick:true,toOwnerMana:true,
   title:'マナゾーンに置く自分のアンタップしているクリーチャーを1体選ぶ'}]);
  break;
 case'g34_LauncherRamp1672':{
  const y=api.takeTop(s,t.p);
  if(!y){api.deckCheck(s,t.p);break;}
  const c=api.zoneCard(s,t.p,y),qualifies=c.type==='creature'&&cost(c)<opp.mana.length;
  const dest=api.deckDestination1365(s,t.p,'mana',api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana');
  clear(y,dest);api.addZone(s,t.p,dest,y);
  if(qualifies&&!api.deckWasShuffled1365(s,y)&&own[dest]?.some(x=>x.uid===y.uid)&&api.canMoveZone(s,t.p,dest)&&canPut(s,t.p,y,dest))
   start(s,t,[{op:'Put',origin:dest,target:y.uid}]);
  api.deckCheck(s,t.p);
  break;
 }
 case'g34_TenderBlock1670':
  for(const y of creatures(s,1-t.p))if(!y.sealed&&!y.faceDown)(s.extLimits??=[]).push({
   kind:'block',g190Freeze:true,player:1-t.p,ref:{uid:y.uid,incarnation:y.incarnation||0},g1058FollowUnit:true,
   expires:'end',who:s.active,controller:t.p
  });
  break;
 case'g34_ZeroResume1686':api.resumeZero1686(s,t.defender,t.uids,t.context);break;
 case'g34_GaiaResume1685':api.resumeBreak1685(s,t.p,t.uids,t.context);break;
 case'g34_GaiaSpawn1685':{
  const rows=own.extra.filter(x=>card(x).psychic&&race(card(x),'ハンター')&&t.costs.includes(cost(card(x))===Infinity?'∞':cost(card(x)))&&canPut(s,t.p,x,'extra'));
  if(rows.length)choice(s,t,'墓地に置いたカードと同じコストのハンター・サイキックを1体出す',rows.map(x=>opt(card(x).name,x.uid,15+cost(card(x)),x.cardId)));
  break;
 }
 case'g34_WorldReset1684':{
  const order=[s.active,1-s.active];
  // Finish both shuffles (including Q.Q.QX. insertion choices) before either draw.
  start(s,t,[...order.map(p=>({op:'AlchemistShuffle1670',p,g1684NoDraw:true})),
   ...order.map(p=>({op:'Draw',p,n:5}))]);
  break;
 }
 case'g34_AlchemistShuffle1670':{
  const added=['grave','hand'].flatMap(origin=>policyTake(s,t.p,origin,api));
  for(const x of added)clear(x,'deck');
  // Insertions under Q.Q.QX. must finish before drawing from the rebuilt library.
  if(!t.g1684NoDraw)start(s,t,[{op:'Draw',n:5}]);
  api.shuffleLibrary(s,t.p,added,t.source);
  api.log(s,t.p,'shuffleGrave',card(t.source).name+'：自分の墓地と手札を山札に戻してシャッフルした',{cardId:t.source});
  break;
 }
 case'g34_AlchemistDraw1670':{
  const who=t.drawPlayer,count=s.players[who].deck?.length??s.players[who].deckCount??0;
  choice(s,t,(who===t.p?'自分':'相手')+'にカードを1枚引かせる？',[
   opt('1枚引かせる',true,who===t.p?(count>1?10:-1000):(count<=1?1000:-4)),skip()
  ]);
  break;
 }
 case'g34_VenomicDestroy1670':
  if(t.n>0)start(s,{...t,p:1-t.p,controller:t.controller??t.p},[{op:'Select',origin:'battle',to:'grave',n:t.n,
   filter:{creature:true},g187OwnPick:true,title:'破壊する自分のクリーチャーを'+t.n+'体選ぶ'}]);
  break;
 case'g34_DSwitch1669':{
  const field=live(s,t);
  if(field&&!field.sealed&&!field.faceDown&&!field.g1175DSwitched&&!d2Locked1188(s,t.p))
   choice(s,t,'Dスイッチを使う？',[opt('Dスイッチを使う',true,dSwitchScore1669(s,t)),skip()]);
  break;
 }
 case'g34_ArenaAttackable1669':{
  const refs=creatures(s,1-t.p).filter(x=>!x.sealed&&!x.faceDown).flatMap(api.allLayers).map(key);
  if(refs.length)(s.extLimits??=[]).push({kind:'g924AttackableUntapped',refs,turn:s.turn,expires:'end',who:s.active,spell:false});
  break;
 }
 case'g34_WinnerBreak1669':{
  const ref=t.g399Attacker,winner=sourceHost474(s,ref);
  if(ref&&(!winner||winner.p===t.p&&!winner.x.sealed&&api.isCreature(s,winner.x)))
   put(s,{...t,op:'g34_Break497',uid:winner?.x.uid??ref.uid,incarnation:winner?.x.incarnation??ref.incarnation??0,
    n:1,optional:true,g747CreatureBreak:true,g828BattleBreaker:winner?.x.cardId??ref.source});
  break;
 }
 case'g34_WalsraDeploy1669':{
  const slots=creatures(s,t.p).filter(x=>!x.sealed&&!x.faceDown).map(x=>costKey1669(cost(effective(x,s))));
  if(slots.length)start(s,t,[{op:'Select',origin:'hand',n:slots.length,deploy:true,optional:false,filter:{creature:true},g1669CostSlots:slots,
   title:'自分の各クリーチャーと同じコストのクリーチャーを手札から選ぶ'}]);
  break;
 }
 case'g34_CrystalSwitch1175':{
  const field=live(s,t);
  if(field&&!field.sealed&&!field.g1175DSwitched&&!d2Locked1188(s,t.p))choice(s,t,'Dスイッチ：裏向きのマナをすべてアンタップする？',
   [opt('Dスイッチを使う',true,own.mana.filter(y=>y.faceDown&&y.tapped&&api.canUntap(y)).length*6),skip()]);
  break;
 }
 case'g34_TwinInPlace1088':{
  const host=sourceHost474(s,t.subject);
  if(host&&host.p===t.p)api.castBattleSpell(s,t.p,t.subject.uid,t.subject.incarnation,t.subject.source,{label:'SC龍飛→SC風流'});
  break;
 }
 case'g34_ManaReveal1087':{
  const x=own.mana.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);
  const rows=own.hand.filter(y=>faces(card(y)).some(c=>race(c,t.race)));
  if(x&&rows.length)choice(s,t,t.race+'を1枚見せ、このカードをアンタップする？',
   [...rows.map(y=>opt(card(y).name,y.uid,10,y.cardId)),skip()]);
  break;
 }
 case'g34_ExileBoardAndGrave1087':{
  for(const p of [0,1])if(api.canMoveZone(s,p,'grave'))for(const x of [...s.players[p].grave])
   zoneMove(s,p,'grave',x.uid,'extra',t);
  move(s,[0,1].flatMap(player=>[...(s.players[player].seals||[]),...s.players[player].battle]
   .map(x=>({player,uid:x.uid,to:'extra',destroy:false,toOwnerExtra:true}))));
  break;
 }
 case'g34_DiscardSummon1791':{
  const x=own[t.origin].find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial),plan=x&&discardSummon1791(s,t.p,x,t.origin,t.selected);
  if(!plan||!plan.permits.includes(t.permit??null))break;
  if(t.selected.length===plan.rule.colors.length){
   put(s,{...t,op:'g34_FinishDiscardSummon1791'});
   api.discardAlternative1791(s,t.p,t.selected,t.source);break;
  }
  choice(s,t,'代替コストとして捨てる'+discardSlotLabel1791(plan.rule.colors[t.selected.length])+'の手札を選ぶ（'+t.selected.length+'/'+plan.rule.colors.length+'）',[
   ...plan.rows.map(y=>opt(card(y).name,y.uid,15-cost(card(y)),y.cardId)),opt('召喚を取りやめる',null,-100)]);break;
 }
 case'g34_FinishDiscardSummon1791':{
  const x=own[t.origin].find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial),c=x&&api.zoneCard(s,t.p,x,t.origin);
  if(c&&api.canCast(s,t.p,c,t.origin)&&api.canEnter(s,t.p,c,{origin:t.origin,execution:true})&&api.canExecuteUnpaid(s,t.p,c)&&api.costAltPermits568(s,t.p,x,c,t.origin).includes(t.permit??null))
   cast(s,t.p,t.uid,true,null,0,null,t.origin,'手札を捨てる代替コスト',false,t.permit??null);
  break;
 }
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
  for(const p of (t.owner==='both'?[t.p,1-t.p]:[t.p]))for(const y of (t.creaturesOrSeeds?s.players[p].battle:creatures(s,p))){
   if(!y.tapped||y.sealed||!api.canUntap(y))continue;
   if(t.g713ExactRace&&!String(effective(y,s).race||'').split('/').includes(t.g713ExactRace))continue;
   if(t.g593OverMana&&cost(effective(y,s))<=opp.mana.length)continue;
   if(t.g179Other&&api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)))continue;
   if(!matches(s,p,y,t.filter))continue;
   y.tapped=false;
   combined.untapped(s,p,y);
  }
  break;
 case'g34_FirstMultiManaDraw1160':{
  const mana=own.mana.find(y=>y.uid===t.target&&(y.zoneSerial||0)===t.serial);
  if(mana&&api.canUntapMana(s,mana))mana.tapped=false;
  api.draw(s,t.p,1);
  break;
 }
 case'g34_UntapMana':{
  let n=0;
  for(const y of own.mana){
   if(!y.tapped||!api.canUntapMana(s,y)||t.g1175FaceDownOnly&&!y.faceDown||!matches(s,t.p,y,t.filter))continue;
   if(t.manaColorsAny&&!api.manaColors(card(y),s,t.p).some(c=>t.manaColorsAny.includes(c)))continue;
   y.tapped=false;n++;
  }
  api.log(s,t.p,'untapMana',card(t.source).name+'：マナを'+n+'枚アンタップ',{cardId:t.source});
  break;
 }
 case'g34_OpponentDiscardAllDraw1265':{
  const opponent=1-t.p,ids=opp.hand.map(y=>y.uid),n=ids.length;
  if(!n||api.handProtected(s,{p:opponent,causedBy:t.p}))break;
  // QA40653: count cards instructed to be discarded, including a replaced discard.
  start(s,t,[{op:'Offer',title:'カードを'+n+'枚引く？',defs:[{op:'Draw',n}]}]);
  api.discardSelected(s,opponent,ids,t.source,t.p);
  break;
 }
 case'g34_DiscardAll244':{if(t.optional&&!t.accepted){const last=t.draw>=own.deck.length,shako=creatures(s,t.p).some(y=>effective(y,s).shako),value=last?(shako?1000:-1000):t.draw*10-own.hand.length*5-own.hand.reduce((n,x)=>n+cost(card(x)),0)/3;choice(s,t,'手札をすべて捨てて'+t.draw+'枚引く？',[opt('すべて捨てて引く',true,value),skip()]);}else put(s,task('discard',t.p,t.source,{causedBy:t.p,selfDiscard:true,n:own.hand.length,all:true}),...(t.draw?[task('draw',t.p,t.source,{n:t.draw})]:[]));break;}
 case'g34_DiscardDraw':{const rows=own.hand.filter(y=>!t.filter||matches(s,t.p,y,t.filter));if(rows.length){const last=t.n>=own.deck.length,win=last&&creatures(s,t.p).some(y=>effective(y,s).shako);choice(s,t,'手札を1枚捨てて'+t.n+'枚引く？',[...rows.map(y=>opt(card(y).name+'を捨てる',y.uid,last?(win?1000:-1000):12+t.n*5-cost(card(y)),y.cardId)),skip()]);}break;}
 case'g34_DeclareCast1293':api.continueCast1293(s,t.p,t.uid);break;
 case'g34_ResolveSpell207':api.resumeCastSpell(s,t.p,t.uid);break;
 case'g34_BlockUntapTurn989':
  (s.extLimits??=[]).push({kind:'g989BlockUntap',player:t.p,source:t.source,expires:'end',who:s.active});
  break;
 case'g34_BlockPowerTurn1154':
  (s.extLimits??=[]).push({kind:'g1154BlockPower',player:t.p,source:t.source,power:t.power,expires:'end',who:s.active});
  break;
 case'g34_GroupLasting412':for(const {p,y}of groupPowerRows(s,t))(s.extLimits??=[]).push({kind:t.destroySafe?'g409AttackEffect':'g412ExtraBreak',player:p,ref:{uid:y.uid,incarnation:y.incarnation||0},source:t.source,...(t.destroySafe?{effect:'destroySafe',expires:t.untilEnd?'end':'start',who:t.untilEnd?s.active:t.p}:{amount:t.extraBreak,expires:'end',who:s.active,...(t.g969FollowControl?{g969FollowControl:true}:{}),...(t.spell?{spellCost:cost(faces(card(t.source)).at(-1))}:{})})});break;
 case'g34_ChainDestroy838':{
  choice(s,t,'破壊する相手のクリーチャーを選ぶ',chainOptions838(s,t.p));
  break;
 }
 case'g34_HellReikon1271':{
  const source=live(s,t);
  if(t.repeat&&(!source||source.sealed||!effective(source,s).g1271HellReikon||
    !targetOptions(s,t.p,creatures(s,1-t.p)).length))break;
  start(s,t,[{op:'Select',origin:'grave',to:'deck',n:4,optional:true,
   g837Reikon:[{op:'HellReikonDestroy1271'}],title:'地獄返霊4：山札の下に置く順に墓地のカードを4枚選ぶ'}]);
  break;
 }
 case'g34_HellReikonDestroy1271':
  choice(s,t,'地獄返霊で破壊する相手のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));
  break;
 case'g34_GroupFreeze':
  for(const {p,y}of groupPowerRows(s,t))freeze(s,t,p,y);
  break;
 case'g34_TapHighest1349':{
  const player=1-t.p,rows=creatures(s,player);
  const powers=rows.map(x=>api.power(x,x.uid===s.attack?.attacker,s));
  const highest=Math.max(...powers);
  for(const [index,x] of rows.entries())if(powers[index]===highest){
   api.tap(s,player,x);
   x.skipUntap=true;
  }
  break;
 }
 case'g34_GroupGrant364':
  for(const {p,y}of groupPowerRows(s,t)){
   if(t.g736ForceAttack)force546(s,{...t,when:'end'},p,y);
   applyGrant(s,t,y);
  }
  break;
 case'g34_CreatureAttackTarget1021':{
  const player=1-t.p;
  (s.extLimits??=[]).push({kind:'g1021CreatureAttackTarget',player,
   ...(t.untilStart?{active:true,expires:'start',who:t.p}:{startsPlayer:player,active:false,expires:'end',who:player}),
   spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))});
  break;
 }
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
 case'g34_TabulaPower1605':{
  const n=own.mana.filter(y=>y.faceDown).length;
  if(n)start(s,t,[{op:'GroupPower',owner:'both',filter:{creature:true,g218Colored:true},power:-2000*n}]);
  break;
 }
 case'g34_GroupPower':{
  const duration={expires:t.g521UntilStart?'start':'end',who:t.g521UntilStart?t.p:s.active};
  const spell=t.spell?{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{};
  const power=groupPowerAmount(s,t);
  for(const {p,y} of groupPowerRows(s,t)){
   const amount=t.g561DarkMana?0:p===t.p&&t.ownPower!==undefined?t.ownPower:power;
   if(t.g446BattleOnly){
    grantBattlePower446(s,t,y,amount,duration);
   }else{
    (y.powerModifiers??=[]).push({amount,...duration,...spell,
     ...(t.g561DarkMana?{g561DarkMana:t.p}:{}),...(t.g561AttackOnly?{attackOnly:true}:{})});
   }
   if(t.g947BlockBreak)(y.g34Grants??=[]).push(timedGrant335(s,t,{g947BlockBreak:true}));
  }
  break;
 }
 case'g34_DeathStats969':{
  const host=sourceHost474(s,t);
  if(host&&!host.x.sealed&&api.isCreature(s,host.x))start(s,t,[
   {op:'SelfBoost313',power:4000,g536Source:true},
   {op:'SelfExtraBreak444',amount:1,g969FollowControl:true}
  ]);
  break;
 }
 case'g34_SelfExtraBreak444':if(t.g969FollowControl?sourceHost474(s,t):own.battle.some(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))))(s.extLimits??=[]).push({kind:'g412ExtraBreak',player:t.p,ref:{uid:t.uid,incarnation:t.incarnation||0},source:t.source,amount:t.amount,expires:'end',who:s.active,...(t.g969FollowControl?{g969FollowControl:true}:{})});break;
 case'g34_MultiplyPower1147':{
  const y=sourceHost474(s,t)?.x;
  if(y&&!y.sealed)(y.powerModifiers??=[]).push({amount:0,multiplier:t.multiplier,expires:'end',who:s.active});
  break;
 }
 case'g34_SelfBoost313':{const y=t.g536Source?sourceHost474(s,t)?.x:x;if(y&&(!t.g694ClearOnSeal||!y.sealed&&api.isCreature(s,y))){(y.powerModifiers??=[]).push({amount:t.power,...(t.g1645PowerMultiplier?{multiplier:t.g1645PowerMultiplier}:{}),...(t.g1258UntilStart?{expires:'start',who:t.p}:{expires:'end',who:s.active}),...(t.g694ClearOnSeal?{g694ClearOnSeal:true}:{}),...(t.g337PowerAttacker?{attackOnly:true,grantedAbility:true}:{})});if(t.breaker)(y.g34Grants??=[]).push({turn:s.turn,g313Breaker:t.breaker,...(t.g633DoubleBreaker?{g633DoubleBreaker:true}:{})});}break;}
 case'g34_SelfTap314':{
  const host=t.g536Source?sourceHost474(s,t):x?{p:t.p,x}:null;
  if(host)api.tap(s,host.p,host.x);
  break;
 }
 case'g34_GraveUse1226':{
  const options=own.grave.flatMap(y=>y.faceDown?[]:faces(card(y)).flatMap((c,face)=>
   graveFace1226(c)?[opt(c.name,{uid:y.uid,serial:y.zoneSerial||0,face},10,y.cardId)]:[]));
  if(options.length)choice(s,t,'このターン墓地から使えるようにする呪文かタマシードを選ぶ',options);
  break;
 }
 case'g34_DragonEntryPower1226':{
  const host=sourceHost474(s,t.g1226Dragon);
  const power=host?!host.x.sealed&&api.isCreature(s,host.x)&&race(effective(host.x,s,true),'ドラゴン')?
   currentPower506(s,host.x):0:t.g1226LastDragonPower;
  if(!(power>0)&&power!=='∞')break;
  const budget=power===Infinity?'∞':power;
  start(s,t,[{op:'Select',owner:'opponent',origin:'battle',n:'all',optional:true,to:'grave',
   filter:{creature:true},g173Targets:true,g193Select:true,g506PowerBudget:budget,g1226StrictPower:true,
   title:'合計パワーが'+budget+'未満になるよう相手のクリーチャーを選ぶ'}]);
  break;
 }
 case'g34_ChristoGrant1225':{
  const host=sourceHost474(s,t);
  if(!host||host.x.sealed)break;
  const grant={speedAttacker:true,g1225DestroyAfterAttack:key(t),g1225ChristoSource:t.source};
  applyGrant(s,{...t,grant},host.x);
  force546(s,{...t,when:'turn'},host.p,host.x);
  break;
 }
 case'g34_BabelRevive1263':{
  const {uid,serial}=t.victim;
  // The initial sacrifice must actually destroy this creature. A replacement
  // that saves it or moves it elsewhere still allows the preceding draw.
  const destroyed=s.g1225Destroyed;
  if(destroyed?.turn!==s.turn||!destroyed.cards[t.p].some(x=>x.uid===uid&&x.serial===serial))break;
  const y=own.grave.find(x=>x.uid===uid&&(x.zoneSerial||0)===serial);
  if(y&&api.canMoveZone(s,t.p,'grave'))
   start(s,t,[{op:'Put',origin:'grave',target:uid,execution:false,g960FormerBases:[t.victim]}]);
  break;
 }
 case'g34_DragonDestroyedReturn1225':{
  const history=s.g1225Destroyed;
  if(history?.turn!==s.turn)break;
  const refs=history.cards[t.p];
  start(s,t,[{op:'Select',origin:'grave',to:'hand',n:1,optional:true,
   filter:{anyFaceRace:'ドラゴン'},g960FormerBases:refs,title:'このターンに破壊されたドラゴンを1体戻す'}]);
  break;
 }
 case'g34_AidoruDeclare1256':{
  const y=aidoruHand1256(s,t);
  if(y&&!api.handAbilityIgnored(s,y))choice(s,t,card(y).name+'の能力を宣言する？',
   [opt('宣言する',true,aidoruOnField1256(s,t.p)?-5:22,y.cardId),skip()]);
  break;
 }
 case'g34_AidoruDeploy1256':{
  const y=aidoruHand1256(s,t);
  if(y&&!aidoruOnField1256(s,t.p)&&canPut(s,t.p,y,'hand'))
   doPut(s,{...t,origin:'hand',target:y.uid});
  break;
 }
 case'g34_LacrimaDeclare1224':{
  const y=lacrimaHand1224(s,t);
  if(y)choice(s,t,card(y).name+'のターン終了時の能力を宣言する？',
   [opt('宣言する',true,(t.g1240Fish&&!fishEndReady1240(s,t.p)||
    t.g1313ShieldHand&&!shieldHandEndReady1313(s,t))?-5:25,y.cardId),skip()]);
  break;
 }
 case'g34_LacrimaDeploy1224':{
  const y=lacrimaHand1224(s,t);
  if(y&&(!t.g1240Fish||fishEndReady1240(s,t.p))&&(!t.g1313ShieldHand||shieldHandEndReady1313(s,t)))
   doPut(s,{...t,origin:'hand',target:y.uid});
  break;
 }
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
 case'g34_Chance417':{const c=chanceCard417(s,t);if(c)choice(s,t,(c.g417Chance.label||'アタック・チャンス')+'：'+c.name+'を唱える？',[opt('コストを支払わずに唱える',true,20+modeScore(s,t,c.g34Tasks||[]),t.source),skip()]);break;}
 case'g34_SelfSpellMana1647':api.moveSpellMana1647(s,t.p,t.uid);break;
 case'g34_HandManaStop1647':(s.extLimits??=[]).push({kind:'g1647HandManaStop',player:1-t.p,expires:'start',who:t.p,spellSource:t.source,spellCost:cost(card(t.source))});break;
 case'g34_SpellFinish416':{const frame=(s.extSpells||[]).find(f=>f.inst.uid===t.uid&&f.caster===t.p&&(!f.virtual||f.shieldCast));if(frame){frame.to=t.to;frame.g416SelfFinish=true;if(frame.shieldCast)frame.inst.finishTo=t.to;}break;}
 case'g34_NemeBreak1698':{
  choice(s,t,'ネメス・テーベ：はじめてのブレイクを置換するシールドを1つ選ぶ',[...t.uids.filter(uid=>api.findShield(own,uid)).map(uid=>opt('このシールドを残して1つ追加する',uid,20)),skip()]);
  break;
 }
 case'g34_BlockJudgeBounce1697':{
  if(t.subject)api.singleJudge(s,t.p,t.source,t.uid,{...t,op:'g34_Sequence',defs:[{op:'ExactMove',owner:1-t.p,to:'hand',toOwnerHand:true,optional:true,filter:{creature:true},g403Refs:[t.subject],followEvolution:true}]});
  break;
 }
 case'g34_Judge318':api.singleJudge(s,t.p,t.source,t.uid,{...t,op:'g34_Sequence',defs:t.defs});break;
 case'g34_Thrill443':{const ids=look(s,{...t,n:3,public:true}),n=ids.filter(uid=>{const y=own.deck.find(y=>y.uid===uid);return y&&matches(s,t.p,y,{creature:true,raceAny:t.races});}).length,batch=String(s.g443Serial=(s.g443Serial||0)+1),defs=t.defs.map(d=>d.op==='Look'&&d.g201Search?{op:'ThrillSearch443',batch,ids,search:d}:d);for(const uid of ids)release(s,t.p,uid);put(s,...tasks(t.p,t.source,Array.from({length:n},(_,i)=>({op:'Offer',title:'スリリング・スリー '+(i+1)+'/'+n+'：能力を使う？',defs})),{uid:t.uid,incarnation:t.incarnation}),{...t,op:'g34_Order',g443Root:batch,ids,rest:'bottom',ordered:[]});break;}
 case'g34_ThrillSearch443':{const root=(s.extTasks||[]).find(q=>q.g443Root===t.batch),publicIds=root?.ids.length?t.ids:[];for(const uid of t.ids)release(s,t.p,uid);if(root)root.ids=[];start(s,t,[{...t.search,g443PublicIds:publicIds}]);break;}
 // Count once while resolving; later mana or battlefield changes do not rewrite the boost.
 case'g34_ManaColorBoost515':{const n=manaCivilizationCount(s,t.p);start(s,t,[{op:'Target',owner:'self',power:t.amount*n}]);break;}
 case'g34_CountCost553':{
  const n=s.players[t.p][t.zone].filter(y=>matches(s,t.p,y,t.filter)).length;
  start(s,t,[t.g1626TargetCost?{...t.def,filter:{...t.def.filter,max:n}}:
   {...t.def,g513CostBudget:n,title:'合計コスト'+n+'以下になるよう2体まで選ぶ'}]);break;
 }
 case'g34_SplitDeck1247':{
  const count=t.rows.length;
  choice(s,t,'先に選んだカードから何枚を山札の上に置く？',Array.from({length:count+1},(_,n)=>
   opt('上に'+n+'枚・下に'+(count-n)+'枚',n,0)));
  break;
 }
 case'g34_Destination553':{
  if(Array.isArray(t.destinations)){
   choice(s,t,'選んだカードの移動先を選ぶ',t.destinations.map(to=>opt(destinationName467[to],to,0)));
   break;
  }
  const xs=t.rows.flatMap(r=>{const y=s.players[r.p].battle.find(y=>y.uid===r.uid);return y?[y]:[];});choice(s,t,'選んだエレメントすべての移動先を選ぶ',[opt('すべてマナゾーンに置く','mana',xs.length*10),opt('すべて破壊する','grave',xs.reduce((n,y)=>n+(hooks.destroySafe409(s,y)?-5:30+cost(card(y))),0))]);break;
 }
 case'g34_CountOwn538':{
  const n=countDraw(s,t.p,{zone:'battle',filter:t.filter,g262Elements:t.g262Elements});
  if(t.mode==='maxCost')start(s,t,[{...t.def,max:n}]);
  else if(!n)break;
  else if(t.mode==='select')start(s,t,[{...t.def,n}]);
  else if(t.mode==='choose')start(s,t,[{...t.def,g1045Preselect:n}]);
  else if(t.mode==='belowCost')start(s,t,[{...t.def,filter:{...t.def.filter,belowCost:n}}]);
  else if(t.mode==='repeat')start(s,t,Array.from({length:n},()=>structuredClone(t.def)));
  else throw Error('未対応のクリーチャー数効果');
  break;
 }
 case'g34_OpponentBlindOwn1610':
  put(s,task('g34_BlindDiscard773',1-t.p,t.source,{controller:t.controller??t.p,n:2}));
  break;
 case'g34_PrayerPlayer1609':
  choice(s,t,'カードを3枚引き、手札を2枚捨てるプレイヤーを選ぶ',[
   opt('自分',t.p,10),opt('相手',1-t.p,0)
  ]);break;
 case'g34_Oboro1608':{
  const left=t.left??manaCivilizationCount(s,t.p),drawn=t.drawn??[];
  if(left>0)choice(s,{...t,left,drawn},'カードをあと'+left+'枚まで引けます。1枚引く？',[opt('1枚引く',true,own.deck.length>1?10:-100),skip()]);
  else if(drawn.length)start(s,t,[{op:'Select',origin:'hand',to:'deck',n:drawn.length,title:'引いた枚数の手札を山札の下に置く順に選ぶ'}]);
  break;
 }
 case'g34_FreezeOpponent1608':
  for(const kind of['attack','block'])(s.extLimits??=[]).push({kind,player:1-t.p,expires:'end',who:s.active});
  break;
 case'g34_ManaEntryGrave1632':{const y=own.mana.find(y=>y.uid===t.target&&(y.zoneSerial||0)===t.serial);if(y)zoneMove(s,t.p,'mana',y.uid,'grave',t);break;}
 case'g34_LifeCharger1631':(s.extLimits??=[]).push({kind:'g1631LifeCharger',player:t.p,expires:'end',who:s.active,spellSource:t.source,spellCost:cost(card(t.source))});break;
 case'g34_BattleColors1630':start(s,t,battleColorDefs1630(s,t));break;
 case'g34_EachPlayerCreatureDraw1738':
  put(s,...[t.p,1-t.p].map(p=>task('g34_DrawUpTo',p,t.source,{n:creatures(s,p).filter(x=>!x.sealed).length,g203Draw:true,controller:t.p})));
  break;
 case'g34_CountDraw':{const n=countDraw(s,t.p,t);if(n)start(s,t,[t.optional==='each'?{op:'DrawUpTo',n,g203Draw:true,...(t.after?{after:t.after}:{})}:t.optional==='amount'?{op:'Draw',n,optional:true}:t.optional==='all'?{op:'Offer',title:'カードを'+n+'枚まとめて引く？',defs:[{op:'Draw',n}]}:{op:'Draw',n}]);break;}
 case'g34_DrawAgainstHand1086':{
  const drawn=api.draw(s,t.p,opp.hand.length);
  if(drawn>1&&s.winner===null)start(s,t,[{op:'Discard',owner:'self',n:drawn-1}]);
  break;
 }
 case'g34_CountBlindDiscard983':{
  const n=countDraw(s,t.p,t);
  if(n)start(s,t,[{op:'BlindDiscard773',n}]);
  break;
 }
 case'g34_CountMill967':{
  const n=countDraw(s,t.p,t);
  if(n&&t.optional)start(s,t,[{op:'Mill',n,optional:true,g1042Together:t.g1042Together}]);
  else if(n)api.mill(s,t.p,n,{together:t.g1042Together});
  break;
 }
 case'g34_MillToGrave1300':{
  const n=t.total-own.grave.length;
  if(n>0)start(s,t,[{op:'Mill',n,optional:true,g1042Together:true}]);
  break;
 }
 case'g34_DoubleEntry1300':
  (s.extLimits??=[]).push({kind:'g1300DoubleEntry',player:t.p,who:s.active,expires:'end'});
  break;
 case'g34_CountDestroy1202':{
  const n=countDraw(s,t.p,t);
  if(n)start(s,t,[{op:'Select',owner:'opponent',origin:'battle',to:'grave',n,filter:{creature:true,...t.targetFilter},
   g173Targets:true,g193Select:true,title:'同時に破壊する相手のクリーチャーを'+n+'体選ぶ'}]);
  break;
 }
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
 case'g34_GraveArmy':{const ids=t.ids??own.grave.map(y=>y.uid),selected=t.selected||[],rows=list(s,{...t,origin:'grave',deploy:true,selected}).filter(r=>ids.includes(r.x.uid));if(selected.length>=t.n||!rows.length){put(s,task('g34_Custom',t.p,t.source,{name:'finishBatch'}));break;}beginElementEntryBatch(s,'g34DeployBatch');choice(s,{...t,ids,selected},t.title||'墓地から出す闇のクリーチャーを選ぶ（'+selected.length+'/'+t.n+'体）',[...rows.map(({x})=>opt(card(x).name,{uid:x.uid,origin:'grave',p:t.p},15+cost(card(x)),x.cardId)),...(t.g1675All?[]:[opt('ここまでで確定',null,0)])]);break;}
 // A resolved delayed move follows the same creature through evolution and control changes.
 case'g34_ReturnGroup785':{
  const moves=new Map();
  for(const ref of t.refs){
   const host=sourceHost474(s,ref);
   if(host&&!host.x.sealed)moves.set(host.x.uid,{player:host.p,uid:host.x.uid,to:t.to||'hand',destroy:t.to==='grave',controller:t.p,...(t.toOwnerHand?{toOwnerHand:true}:{})});
  }
  if(moves.size)move(s,[...moves.values()]);
  break;
 }
 case'g34_DelayedMove532':{
  const host=sourceHost474(s,t);
  if(host&&(!t.g774Banky||!host.x.sealed)){
   if(t.g1704DelayedDraw&&!host.x.g35DrawOnBottom){
    host.x.g35DrawOnBottom={g1704Controller:t.p};
    put(s,task('g34_ClearDelayedDraw1704',t.p,t.source,{owner:host.p,target:host.x.uid,targetIncarnation:host.x.incarnation||0}));
   }
   move(s,[{player:host.p,uid:host.x.uid,to:t.to,destroy:t.to==='grave',controller:t.controller??t.p,...(t.g1704DelayedDraw?{toOwnerDeck:true}:{}),...(t.toOwnerGrave?{toOwnerGrave:true}:{})}]);
  }
  break;
 }
 case'g34_ClearDelayedDraw1704':{
  const y=s.players[t.owner].battle.find(y=>y.uid===t.target&&(y.incarnation||0)===t.targetIncarnation);
  if(y)delete y.g35DrawOnBottom;
  break;
 }
 case'g34_OpponentBattleWin986':{
  const source=sourceHost474(s,t);
  const tapped=source&&!source.x.sealed?source.x.tapped:t.lastTapped;
  if(!tapped)break;
  const winner=sourceHost474(s,t.winner);
  if(winner&&!winner.x.sealed&&api.isCreature(s,winner.x))
   move(s,[{player:winner.p,uid:winner.x.uid,to:'mana',controller:t.p}]);
  break;
 }
 case'g34_SplitMove1136':{
  const {p,uid}=t.target;
  move(s,[{player:p,uid,to:t.to,destroy:false,controller:t.controller??t.p,
   ...(t.to==='mana'?{toOwnerMana:true}:{toOwnerShields:true})}]);
  break;
 }
 case'g34_BlockedPairBounce1318':{
  const rows=[t.subject,t].flatMap(ref=>{
   const host=sourceHost474(s,ref);
   return host&&api.isCreature(s,host.x)?[{player:host.p,uid:host.x.uid,to:'hand',toOwnerHand:true,
    controller:t.controller??t.p}]:[];
  });
  if(rows.length)move(s,rows);
  break;
 }
 case'g34_ExactMove':{
  const owner=t.owner??1-t.p;
  const y=s.players[owner].battle.find(y=>{
   if(!t.g403Refs)return y.uid===t.target&&(t.targetIncarnation===undefined||(y.incarnation||0)===t.targetIncarnation);
   const follow=t.followEvolution==='evolutionOnly'?api.isEvolution(y):t.followEvolution;
   const layers=t.filter?.g600OverMana||follow?api.allLayers(y):[y,...(y.godLinks||[]),...(y.psychicLinks||[])];
   return layers.some(z=>t.g403Refs.some(r=>r.uid===z.uid&&r.incarnation===(z.incarnation||0)));
  });
  if(!y||y.sealed&&!t.g1082Dragon&&(t.filter||t.followEvolution)||t.filter&&!matches(s,owner,y,t.filter))break;
  if(t.tap){api.tap(s,owner,y);break;}
  if(t.optional){
   const label=t.to==='hand'?'手札に戻す':t.to==='mana'?'マナに置く':t.to==='shields'?'シールド化する':'破壊する';
   const score=t.afterAttempt?modeScore(s,t,t.afterAttempt)-cost(card(y))*2-(s.attack?.attacker===y.uid?12:0):
    t.to==='shields'&&!api.canAddShield(s,owner)?-10:20;
   choice(s,{...t,op:'g34_Offer',defs:[{...t,op:'ExactMove',optional:false}]},card(y).name+'を'+label+'？',[opt('実行する',true,score,y.cardId),skip()]);
  }else{
   move(s,[{player:owner,uid:y.uid,to:t.to,destroy:t.to==='grave',controller:t.g1088OwnerMoves?owner:t.controller??t.p,
    ...(t.toOwnerHand?{toOwnerHand:true}:{}),...(t.toOwnerMana?{toOwnerMana:true}:{}),...(t.toOwnerExtra?{toOwnerExtra:true}:{}),...(t.g1088OwnerMoves?{toOwnerDeck:true,g1089OrderDeck:true}:{})}]);
   if(t.afterAttempt)start(s,t,t.afterAttempt);
  }
  break;
 }
 case'g34_BushidoDestroyHost1312':{
  const host=sourceHost474(s,t.g399Attacker);
  if(host&&!host.x.sealed&&api.isCreature(s,host.x))
   move(s,[{player:host.p,uid:host.x.uid,to:'grave',destroy:true,controller:t.p,g1312Bushido:true}]);
  break;
 }
 case'g34_ShieldPlus414':put(s,{...t,op:'g71_Plus',optional:true});break;
 case'g34_MedusaCross929':{
  if(!remainingGears929(s,t).length)break;
  const hosts=creatures(s,t.p).filter(x=>!x.sealed&&x.uid!==t.uid);
  if(hosts.length)choice(s,t,'残ったクロスギアをまとめてクロスするクリーチャーを選ぶ（任意）',
   [...hosts.map(x=>opt(card(x).name,{uid:x.uid,incarnation:x.incarnation||0},10+cost(card(x)),x.cardId)),skip()]);
  break;
 }
 case'g34_GigazandaSearch929':{
  if(t.chooseOwner&&t.deckOwner===undefined){choice(s,t,'確認する山札を選ぶ',[opt('自分の山札',{owner:t.p},10),opt('相手の山札',{owner:1-t.p},10)]);break;}
  const owner=t.deckOwner??1-t.p,ids=t.ids??look(s,{...t,n:s.players[owner].deck.length},owner),chosen=t.chosen??[];
  const rows=s.players[owner].deck.filter(x=>ids.includes(x.uid)&&!chosen.includes(x.uid));
  if(chosen.length>=(t.n??1)||!rows.length){for(const uid of ids)release(s,owner,uid);for(const uid of chosen)zoneMove(s,owner,'deck',uid,'grave',t);api.shuffleLibrary(s,owner);api.deckCheck(s,owner);break;}
  choice(s,{...t,ids,chosen,deckOwner:owner},'山札から墓地に置くカードを選ぶ（任意）',[...rows.map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),...(!t.exact||!chosen.length?[skip()]:[])]);break;
 }
 case'g34_BazagaCross1707':put(s,{...t,op:'g18_SelfCross1707'});break;
 case'g34_FreeCross927':put(s,{...t,op:'g18_ChooseFreeCross927'});break;
 case'g34_DestroyPerAlly927':{
  const n=creatures(s,t.p).filter(x=>!x.sealed&&matches(s,t.p,x,{raceAny:t.raceAny})).length;
  if(n)start(s,t,[{op:'Select',origin:'battle',owner:'opponent',to:'grave',n,
   filter:{creature:true},g173Targets:true,g193Select:true,title:'追加で破壊する相手クリーチャーを'+n+'体選ぶ'}]);
  break;
 }
 case'g34_BouncePerSourceCard1060':{
  // The first trigger can refer to the stack created by the second trigger (QA 47901).
  const host=sourceHost474(s,t)?.x;
  const total=host&&!host.sealed?api.allLayers(host).length:t.lastKnownCount??1,n=Math.max(0,total-(t.g1796UnderCount?1:0));
  if(n)start(s,t,[{op:'Select',origin:'battle',owner:'opponent',to:'hand',toOwnerHand:true,n,
   ...(t.anyOwner?{anyOwner:true}:{}),...(t.optional?{optional:true}:{}),filter:{creature:true},g173Targets:true,g193Select:true,title:'持ち主の手札に戻す'+(t.anyOwner?'':'相手の')+'クリーチャーを'+n+'体'+(t.optional?'まで':'')+'選ぶ'}]);
  break;
 }
 case'g34_ManaBase1128':{
  const host=sourceHost474(s,t);
  if(host&&!host.x.sealed&&api.isCreature(s,host.x))start(s,t,[{op:'Select',origin:'mana',
   n:1,g1128AttachMana:true,title:'このクリーチャーの下に置くマナのカードを1枚選ぶ'}]);
  break;
 }
 case'g34_GraveBase1060':{
  const host=sourceHost474(s,t);
  if(host&&!host.x.sealed&&api.isCreature(s,host.x))start(s,t,[{op:'Select',origin:'grave',
   n:1,optional:true,filter:{creatureOrSeed:true,faceUp:true},g1060AttachBase:true,
   title:'このクリーチャーの下に置く墓地のクリーチャーかタマシードを選ぶ'}]);
  break;
 }
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
 case'g34_Reload940':{
  const y=own.hand.find(y=>y.uid===t.target&&(y.zoneSerial||0)===t.serial);
  if(y&&canPut(s,t.p,y,'hand'))start(s,t,[{op:'Offer',title:card(y).name+'をもう一度出す？',
   score:20,defs:[{op:'Put',origin:'hand',target:y.uid,execution:false}]}]);
  break;
 }
 case'g34_MarshalTouch558':{const rows=marshalRows558(s,t);if(rows.length)choice(s,t,t.title||'マーシャル・タッチ：戻す自分の他のクリーチャーを1体選ぶ（任意）',[...rows.map(y=>opt(card(y).name,{uid:y.uid,incarnation:y.incarnation||0},marshalValue558(s,t,y),y.cardId)),skip()]);break;}
 case'g34_SacrificeAlly413':{
  const source=t.g1200GraveStart?own.grave.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial):null;
  if(t.g1200GraveStart&&!source)break;
  const selected=t.selected??[];
  const rows=(t.g547Seed?own.battle.filter(y=>matches(s,t.p,y,{g295Tamaseed:true})):creatures(s,t.p))
   .filter(y=>!y.sealed&&(!t.other||!api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)))&&
    (!t.filter||matches(s,t.p,y,t.filter))&&!selected.some(z=>z.uid===y.uid));
  const legal=new Set(targetOptions(s,t.p,rows).map(o=>o.value)),remaining=(t.n??1)-selected.length;
  if(legal.size<remaining)break;
  const payoff=source&&t.n>1
   ?(api.canMoveZone(s,t.p,'grave')&&canPut(s,t.p,source,'grave')?(10+cost(card(source))*3)/t.n:-1000)
   :sacrificeValue413(s,t,t.defs||[]);
  const options=rows.filter(y=>legal.has(y.uid)).map(y=>{
   const c=effective(y,s),canDie=api.canLeave(s,t.p,y)&&!hooks.destroySafe409(s,y);
   const penalty=canDie?Math.min(30,6+cost(c)*2+api.power(y,false,s)/2000):0;
   const value=(t.g547Seed&&t.defs?.[0]?.deploy?seedReviveValue547(s,t,y,canDie):payoff)+(canDie?modeScore(s,t,c.g172Death||[]):0)-penalty;
   return opt(card(y).name,{uid:y.uid,incarnation:y.incarnation||0},Math.max(-1000,Math.min(1000,value)),y.cardId);
  });
  if(options.length){
   const title=t.g547Seed?'破壊して効果を使う自分のタマシードを1枚選ぶ':'破壊して効果を使う自分のクリーチャーを1体選ぶ';
   const prompt=t.n>1?'破壊する自分のクリーチャーを'+t.n+'体選ぶ（'+(selected.length+1)+'体目）':title;
   choice(s,t,prompt+(t.mandatory?'':'（任意）'),t.mandatory?options:[...options,skip()]);
  }
  break;
 }
 case'g34_SelfSacrifice407':{
  const host=t.g1281SelfSeed?sourceHost474(s,t):null;
  if(t.g1281SelfSeed){
   if(host?.x.uid===t.uid&&!host.x.sealed&&!host.x.faceDown&&matches(s,host.p,host.x,{g295Tamaseed:true}))
    choice(s,t,'このタマシードを破壊して能力を使う？',[opt('破壊する',true,10,host.x.cardId),skip()]);
   break;
  }
  const owner=s.players.findIndex(p=>p.battle.some(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)))),y=owner>=0?s.players[owner].battle.find(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))):null;if(!y)break;const c=effective(y,s),penalty=api.canLeave(s,owner,y)?Math.min(25,6+cost(c)*2+api.power(y,false,s)/2000):0,score=modeScore(s,t,t.defs||[])+(t.defs||[]).filter(d=>d.op==='Choose').reduce((n,d)=>n+Math.max(0,...d.modes.map(m=>modeScore(s,t,m.defs))),0)+modeScore(s,t,c.g172Death||[])-penalty;choice(s,t,'このクリーチャーを破壊して能力を使う？',[opt('破壊する',true,score,y.cardId),skip()]);break;}
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
  if(t.g1776Shuffle)put(s,task('g34_ShuffleOnMove673',t.p,t.source,{opponent:host.p,uids:rows.map(r=>r.uid)}));
  else if(rows.length>1)put(s,task('g78_BottomOrder',host.p,t.source,{rows,ordered:[],newCards:true,controller:t.controller??t.p}));
  move(s,[{player:host.p,uid:host.x.uid,to:'deck',controller:t.controller??t.p}]);
  break;
 }
 case'g34_DestroyLowestEnemy945':{
  const player=1-t.p;
  const lowest=lowestPower741(s,creatures(s,player));
  // Only a tie requires choosing a creature (official QA 34883 and 35761).
  if(lowest.length===1){
   move(s,[{player,uid:lowest[0].uid,to:'grave',destroy:true,controller:t.controller??t.p}]);
  }else if(lowest.length>1){
   start(s,t,[{op:'Target',to:'grave',g741MinPower:true,
    title:'破壊する最小パワーの相手クリーチャーを1体選ぶ'}]);
  }
  break;
 }
 case'g34_LowestPower739':put(s,{...t,op:'g61_Bronx'});break;
 case'g34_SelfDestroy':{const host=sourceHost474(s,t);if(host)move(s,[{player:host.p,uid:host.x.uid,to:'grave',destroy:true,controller:t.controller??t.p}]);break;}
 case'g34_IfMana':if(own.mana.filter(y=>{const cs=api.manaColors(card(y),s,t.p);return t.multi?cs.length>1:cs.includes(t.color);}).length>=t.n)start(s,t,t.defs);break;
 case'g34_IfOwnPower':if(creatures(s,t.p).some(y=>api.power(y,y.uid===s.attack?.attacker||y.uid===s.attackLifecycle?.uid&&(y.incarnation||0)===(s.attackLifecycle.incarnation||0),s)>=t.minPower))start(s,t,t.defs);break;
 case'g34_Kourin405':{const r=t.rule;if(r.origin==='deck'&&api.deckLocked(s,t.p))break;put(s,task('g34_Select',t.p,t.source,{uid:t.uid,incarnation:t.incarnation||0,origin:r.origin,g405Search:r.origin==='deck',deploy:true,n:1,optional:true,filter:r.filter,title:({deck:'山札',mana:'マナゾーン',grave:'墓地'}[r.origin])+'から光臨で出すクリーチャーを1体まで選ぶ',...(r.origin==='deck'?{after:[{op:'Shuffle405'}]}:{})}));break;}
 case'g34_SabakiDeclared1348':{
  const window=s.triggers;
  const y=own.hand.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.targetSerial);
  if(window?.player!==t.p||!y)break;
  (window.g1348SabakiDeclared??={})[y.uid]=t.targetSerial;
  if(!window.declared.includes(y.uid))window.declared.push(y.uid);
  api.log(s,t.p,'triggerDeclare',card(y).name+'のサバキZを宣言',{cardId:y.cardId});
  break;
 }
 case'g34_AllDelete1347':api.allDelete1347(s,t.p,t.source);break;
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
  if(t.when==='turnEnd'&&(t.spell||t.g1201BeforeEnd)&&s.endStep)break;
  const spellCost=t.spell?cost(faces(card(t.source)).find(c=>c.type==='spell')||card(t.source)):undefined;
  (s.g537Delays??=[]).push({p:t.p,source:t.source,uid:t.uid,incarnation:t.incarnation||0,turn:s.turn,when:t.when,
   defs:structuredClone(t.defs),...(t.who!==undefined?{who:t.who}:{}),...(spellCost!==undefined?{spellCost}:{})});
  break;
 }
 case'g34_ResolveDelay537':if(t.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:t.spellCost,spellSource:t.source}))start(s,t,t.defs);break;
 case'g34_AttachedMove1269':{
  const host=attachedUnit1269(s,t,'end');
  if(host&&!host.x.sealed&&api.isCreature(s,host.x))move(s,[{
   player:host.p,uid:host.x.uid,to:t.to,destroy:t.to==='grave',toOwnerHand:t.to==='hand',controller:t.p
  }]);
  break;
 }
 case'g34_AttackLock1269':{
  const host=sourceHost474(s,t);
  if(!host||host.x.sealed||!api.isCreature(s,host.x))break;
  applyGrant(s,{...t,grant:{attackUnredirectable:true,g1269Attachment:key(t)+':attack'}},host.x);
  start(s,t,[{op:'AfterAttack542',defs:[{op:'AttachedUntap1269'}]}]);
  break;
 }
 case'g34_AttachedUntap1269':{
  const host=attachedUnit1269(s,t,'attack');
  if(host&&!host.x.sealed&&api.isCreature(s,host.x))api.untap(s,host.p,host.x);
  break;
 }
 case'g34_BreakOrder1136':{
  if(t.sources.length===1){
   const [r]=t.sources;
   put(s,...Array.from({length:r.count},()=>tasks(t.p,r.source,r.defs)).flat(),t.after);
  }else choice(s,t,'ブレイク前に解決する能力を選ぶ',
   t.sources.map((r,i)=>opt(card(r.source).name+'（残り'+r.count+'回）',i,10,r.source)));
  break;
 }
 case'g34_BorrowCondition1370':{
  const ready=t.condition==='zeroShields'?s.players.some(o=>!o.shields.length):
   t.condition==='kumitate'?own.battle.filter(x=>!x.sealed&&['creature','seed'].includes(effective(x,s).type)&&colors(effective(x,s)).includes('火')).length>=3:false;
  if(ready)put(s,t.task);break;
 }
 case'g34_BorrowAttack1370':{
  const choices=creatures(s,t.p).filter(x=>!x.sealed&&!x.faceDown).flatMap(x=>api.attackAbilities(s,t.p,x,t).map((entry,index)=>opt(card(x).name+'：'+entry.label,{uid:x.uid,incarnation:x.incarnation||0,index},20,x.cardId)));
  choice(s,t,'使う攻撃時能力を１つ選ぶ',choices);break;
 }
 case'g34_Sequence':start(s,t,t.defs);break;
 case'g34_PsychicBaseOrder1355':{
  const x=s.players[t.controller].battle.find(x=>x.uid===t.host);
  const selected=t.selected||[],parts=[x,...x.psychicLinks].filter(y=>!selected.includes(y.uid));
  choice(s,t,selected.length?'その下に置くサイキック・セルを選ぶ':'進化元の一番上に置くサイキック・セルを選ぶ',
   parts.map(y=>opt(card(y.cardId).name,y.uid,0,y.cardId)));
  break;
 }
 case'g34_PsychicLink1355':{
  const host=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);
  const groups=psychicLinkChoices1358(s,t.p,host,t);
  if(groups.length===1)api.linkPsychic1355(s,t.p,host,...groups[0]);
  else if(groups.length>1)choice(s,t,'覚醒リンクするサイキック・クリーチャーを選ぶ',
   groups.map(group=>opt(group.map(x=>card(x).name).join('と'),
    t.partners?group.map(x=>x.uid):group[0].uid,group.reduce((n,x)=>n+(x.tapped?-5:5),0),group[0].cardId)));
  break;
 }
 case'g34_Awaken1095':{
  const x=own.battle.find(y=>y.uid===t.uid&&(y.incarnation||0)===t.incarnation&&!y.sealed);
  if(!x||x.g1085Awakened&&!t.loop)break;
  // Named loop faces do not toggle again when another queued trigger already reached that face.
  if(t.g1730Face!==undefined&&!!x.g1085Awakened===t.g1730Face)break;
  if(t.loop){api.awakenPsychic(s,t.p,x,true);break;}
  if(t.g1102DirectAwaken){api.awakenPsychic(s,t.p,x);break;}
  if(t.g1096OtherEntries!==undefined){
   const selfEntered=x.g1096CountedEntryTurn===s.turn?1:0;
   if((own.enteredThisTurn||0)-selfEntered>=t.g1096OtherEntries)api.awakenPsychic(s,t.p,x);
   break;
  }
  // The other Psychic may already have left the battle zone.
  for(let i=s.log.length-1;i>=0&&s.log[i].turn===s.turn;i--){
   const event=s.log[i];
   if(event.type==='awaken'&&event.player===t.p&&event.uid!==x.uid){
    api.awakenPsychic(s,t.p,x);
    break;
   }
  }
  break;
 }

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
 case'g34_FriendBurst1210':{
  const candidates=friendBurstCandidates(s,t);
  if(!candidates.length)break;
  const source=card(t.source),spell=faces(card(source.referenceId??t.source))[1];
  const drawCount=(spell?.g34Tasks??[]).filter(d=>d.op==='Draw').reduce((n,d)=>n+d.n,0);
  const score=drawCount>=own.deck.length?-1000:drawCount*9;
  choice(s,t,t.race+'・フレンド・バースト：タップするクリーチャーを選ぶ',
   [...candidates.map(y=>opt(card(y).name,y.uid,score-cost(card(y)),y.cardId)),skip()]);
  break;
 }
 case'g34_Smash320':{const row=smashSource320(s,t),c=faces(card(t.source))[1];if(row&&(!t.battleOnly||row.origin==='battle')&&c&&api.canCast(s,t.p,c,row.origin))choice(s,t,t.battleOnly?'呪文側を唱える？':'スマッシュ・バーストで呪文側を唱える？',[opt(c.name+'を唱える',true,own.deck.length<=1?-1000:25,t.source),skip()]);break;}
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
 case'g34_ReturnBases939':returnBases939(s,t);break;
 case'g34_FairyManaReturn1780':{
  const own=s.players[t.p],rows=own.mana.filter(x=>!x.faceDown&&matches(s,t.p,x,{anyFaceRace:'スノーフェアリー'})).map(x=>({p:t.p,origin:'mana',uid:x.uid}));
  const moved=moveZoneSelection583(s,{...t,origin:'mana',to:'hand'},rows);
  const n=moved.filter(x=>own.hand.includes(x)).length;
  if(n)start(s,t,[{op:'Ramp',n,tapped:true,g809Together:true}]);
  break;
 }
 case'g34_OwnCards1779':put(s,{...t,op:'g34_Select',p:1-t.p,owner:1-t.p,controller:t.controller??t.p,
  g1779PhysicalOwnCards:true,n:t.n,selected:[],rows:[],to:'grave',filter:{},
  title:'手札または場から墓地に置く自分のカードを'+t.n+'枚選ぶ'});break;
 case'g34_Lose1779':api.finish(s,1-t.p,card(t.source).name+'：指定されたターンの終わりに敗北','loss');break;
 case'g34_Lose975':api.finish(s,1-t.p,card(t.source).name+'：自分のクリーチャーがこのクリーチャーだけなので敗北','loss');break;
 case'g34_Win871':api.finish(s,t.p,card(t.source).name+'：'+(t.reason||'自分の同名クリーチャーが4体揃って勝利'));break;
 case'g34_DeckBase1067':{
  const host=sourceHost474(s,t);
  if(!host||host.x.sealed||!api.isCreature(s,host.x))break;
  const top=api.takeTop(s,t.p);
  if(!top)break;
  // Rule 101.3: the known top position still identifies the card if revealing is prohibited.
  if(!api.deckLocked(s,t.p))
   api.log(s,t.p,'reveal',card(t.source).name+'：山札の上を公開：'+card(top).name,{cardId:top.cardId});
  if(api.deckRedirect(s)){
   clear(top,'grave');
   api.addZone(s,t.p,'grave',top);
  }else{
   clear(top,'under');
   (host.x.under??=[]).push(top);
  }
  api.deckCheck(s,t.p);
  break;
 }
 case'g34_TimeChanger1276':{
  if(!t.host){
   const hosts=creatures(s,t.p).filter(y=>api.isEvolution(y));
   if(hosts.length&&!api.deckLocked(s,t.p))
    choice(s,t,'山札からカードを重ねる進化クリーチャーを選ぶ',
     [...targetOptions(s,t.p,hosts).map(o=>({...o,value:{uid:o.value,incarnation:own.battle.find(y=>y.uid===o.value).incarnation||0}})),skip()]);
   break;
  }
  const host=own.battle.find(y=>key(y)===key(t.host)&&!y.sealed&&api.isCreature(s,y)&&api.isEvolution(y));
  if(!host)break;
  const selected=t.selected||[];
  const pool=t.ids?own.deck.filter(y=>t.ids.includes(y.uid)):policyLook(s,t.p,own.deck.length,own.deck,api)
   .filter(y=>faces(api.zoneCard(s,t.p,y,'deck')).some(c=>c.type==='creature'));
  const remaining=pool.filter(y=>!selected.includes(y.uid));
  if(selected.length<2&&remaining.length){
   choice(s,{...t,ids:pool.map(y=>y.uid),selected},'進化クリーチャーの下に置くクリーチャーを2体選ぶ',
    remaining.map(y=>opt(card(y).name,y.uid,10,y.cardId)));
   break;
  }
  if(card(host).g50Kingdom)host.g50KingdomCount=api.allLayers(host).length;
  for(const uid of selected){
   const y=remove(own.deck,uid);
   if(!y)continue;
   api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(y).name,{cardId:y.cardId});
   clear(y,'under');
   (host.under??=[]).push(y);
  }
  api.shuffleLibrary(s,t.p);
  api.deckCheck(s,t.p);
  break;
 }
 case'g34_DokindamSwitch1276':
  if(x&&!x.sealed&&!x.g1175DSwitched&&effective(x,s).g1276DokindamArea&&!d2Locked1188(s,t.p))
   choice(s,t,'Dスイッチを使う？',[opt('Dスイッチを使う',true,own.seals?.length?25:0),skip()]);
  break;
 case'g34_DokindamUnseal1276':{
  const selected=t.selected||[];
  const seals=(own.seals||[]).filter(y=>!selected.includes(y.uid));
  if(selected.length<6&&seals.length){
   const options=seals.map(y=>opt('封印 '+((own.seals||[]).indexOf(y)+1),y.uid,8));
   choice(s,{...t,selected},'墓地に置く自分の封印を6枚まで選ぶ',[...options,opt('選択を終える',null,0)]);
  }else api.moveSealsToGrave1156(s,t.p,selected);
  break;
 }
 case'g34_TransferBases1132':{
  const source=sourceHost474(s,t);
  const host=t.destination&&sourceHost474(s,t.destination);
  if(!source||source.p!==t.p||source.x.sealed||!api.isCreature(s,source.x))break;
  const bases=(source.x.under||[]).flatMap(api.allLayers);
  if(!bases.length)break;
  if(!t.destination){
   const rows=creatures(s,t.p).filter(y=>!y.sealed&&y!==source.x&&(card(y).neoEvolution||api.isEvolution(y)));
   if(rows.length)choice(s,t,'カードを重ねる他のNEOまたは進化クリーチャーを選ぶ（任意）',[
    ...rows.map(y=>opt(card(y).name,{uid:y.uid,incarnation:y.incarnation||0},10,y.cardId)),skip()
   ]);
   break;
  }
  if(!host||host.p!==t.p||host.x.sealed||host.x===source.x||!api.isCreature(s,host.x))break;
  const selected=t.selected||[],rows=bases.filter(y=>!selected.includes(y.uid));
  if(!rows.length){api.transferBattleBases(s,t.p,source.x,host.x,selected);break;}
  choice(s,t,'移すカードを上から順に選ぶ（好きな数）',[
   ...rows.map(y=>opt(y.faceDown?'裏向きのカード':card(y).name,y.uid,10,y.faceDown?undefined:y.cardId)),
   opt(selected.length?'この順序で置く':'移さない',null,0)
  ]);
  break;
 }
 case'g34_ManaBaseOrHand1132':{
  if(!api.canMoveZone(s,t.p,'mana'))break;
  const host=sourceHost474(s,t.g399Attacker);
  const under=host&&!host.x.sealed&&api.isCreature(s,host.x);
  const rows=own.mana.filter(y=>!y.faceDown&&faces(api.zoneCard(s,t.p,y,'mana')).some(c=>c.type==='creature'));
  if(rows.length)choice(s,t,'マナゾーンのクリーチャー1体と移動先を選ぶ',rows.flatMap(y=>[
   ...(under?[opt(card(y).name+'を攻撃したクリーチャーの下に置く',{uid:y.uid,to:'under'},15,y.cardId)]:[]),
   opt(card(y).name+'を手札に加える',{uid:y.uid,to:'hand'},12,y.cardId)
  ]));
  break;
 }
 case'g34_HandUnder1131':{
  const host=sourceHost474(s,t),origin=t.origin??'hand';
  const rows=api.canMoveZone(s,t.p,origin)?own[origin].filter(y=>matches(s,t.p,y,t.filter)):[];
  if(host&&!host.x.sealed&&api.isCreature(s,host.x)&&rows.length)
   choice(s,t,'このクリーチャーの下に表向きで置く'+({mana:'マナ',grave:'墓地',hand:'手札'}[origin]||origin)+'を1枚選ぶ（任意）',[
    ...rows.map(y=>opt(y.faceDown?'裏向きのカード':card(y).name,y.uid,y.faceDown?15:15-cost(card(y)),y.faceDown?undefined:y.cardId)),skip()
   ]);
  break;
 }
 case'g34_ManaStart1131':{
  const y=own.mana.find(x=>x.uid===t.uid&&!x.faceDown&&(x.zoneSerial||0)===t.serial);
  if(y&&own.mana.length>=card(y).g1131ManaStart&&api.canMoveZone(s,t.p,'mana')&&canPut(s,t.p,y,'mana'))
   choice(s,t,card(y).name+'をマナゾーンから出す？',[opt('出す',true,20,y.cardId),skip()]);
  break;
 }
 case'g34_StackDestroyed1130':{
  const host=sourceHost474(s,t),victim=own.grave.find(y=>y.uid===t.victim.uid&&(y.zoneSerial||0)===t.victim.serial);
  if(host&&!host.x.sealed&&api.isCreature(s,host.x)&&victim&&api.canMoveZone(s,t.p,'grave'))
   choice(s,t,card(victim).name+'をこのクリーチャーの下に置く？',[
    opt('下に置く',true,15,victim.cardId),skip()
   ]);
  break;
 }
 case'g34_ShieldPlusCost1804':{
  const paid=api.physicalCards(s).find(x=>x.uid===t.paidUid);
  if(!paid)break;
  const costs=[...new Set(faces(card(paid)).map(c=>cost(c)).filter(n=>n>=0))];
  if(costs.length>1)choice(s,t,'シールド・プラスで参照するコストを選ぶ',costs.map(n=>opt(String(n===Infinity?'∞':n),n===Infinity?'∞':n,n===Infinity?10:n)));
  else if(costs[0]>0)put(s,{...t,op:'g71_Plus',n:Math.min(costs[0],own.deck.length),g1804ExactPlus:true});
  break;
 }
 case'g34_FaceUpGrave1805':{
  const owner=1-t.p,enemy=s.players[owner],selected=t.selected||[];
  const rows=[...enemy.battle.flatMap(top=>api.layers(top).filter(x=>!x.faceDown).map(x=>({x,origin:'battle'}))),
   ...(api.canMoveZone(s,owner,'mana')?enemy.mana.filter(x=>!x.faceDown).map(x=>({x,origin:'mana'})):[])].filter(r=>!selected.some(x=>x.uid===r.x.uid));
  if(selected.length>=(t.n??3)||!rows.length){api.moveFaceUpGrave1805(s,owner,selected);break;}
  choice(s,t,'場・マナの表向きのカードを合計'+(t.n??3)+'枚選ぶ（'+selected.length+'枚選択済み）',
   rows.map(({x,origin})=>opt((origin==='battle'?'場：':'マナ：')+card(x).name,{uid:x.uid,origin,serial:x.zoneSerial||0},-cost(card(x)),x.cardId)),owner);
  break;
 }
 case'g34_BattleManaReturn1802':api.returnBattleAndMana1802(s,t.p);break;
 case'g34_MeteorSources1796':{
  const host=sourceHost474(s,t),picked=t.picked||[],n=t.n??1;
  const under=host&&!host.x.sealed&&api.isCreature(s,host.x)?(host.x.under||[]).flatMap(api.allLayers):[];
  if(under.length<n||picked.some(uid=>!under.some(x=>x.uid===uid))||t.to==='shields'&&!api.canAddShield(s,t.p))break;
  if(picked.length===n){put(s,{...t,op:'g34_MeteorReplace1796',host:{uid:host.x.uid,incarnation:host.x.incarnation||0},plans:[]});break;}
  choice(s,t,'メテオバーン：下のカード'+n+'枚を選ぶ（'+picked.length+'枚選択済み）',[
   ...under.filter(x=>!picked.includes(x.uid)).map(x=>opt(x.faceDown?'裏向きの進化元':card(x).name,x.uid,30,x.faceDown?undefined:x.cardId)),skip()
  ]);
  break;
 }
 case'g34_MeteorReplace1796':{
  const plans=t.plans||[],uid=t.picked[plans.length];
  if(uid===undefined){
   if(api.moveMeteorSources1796(s,t.p,t.host,plans,t.p)){
    start(s,t,t.g1804ShieldPlus?[{op:'ShieldPlusCost1804',paidUid:t.picked[0]}]:t.defs||[]);
    // A constant forbidden-zone loss must precede the queued victory (QA41756).
    api.powerCleanup(s);
   }
   break;
  }
  const replacements=t.to==='grave'?api.stratoReplacements(s,t.p):[];
  if(replacements.length)choice(s,t,'進化元を墓地に置くかわりにマナに置く？',[
   ...replacements.map(r=>opt(card(r.cardId).name+'を使う',true,10,r.cardId)),skip()
  ],1-t.p);
  else put(s,{...t,plans:[...plans,{uid,to:t.to}]});
  break;
 }
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
 case'g34_StackHand936':
 case'g34_StackShieldGrave651':{
  const host=sourceHost474(s,t),under=host&&!host.x.sealed&&api.isCreature(s,host.x)?(host.x.under||[]).flatMap(api.allLayers):[];
  const destination=t.op==='g34_StackHand936'?'手札に加える':'墓地に置く';
  if(under.length)choice(s,t,'下から'+destination+'カードを1枚選ぶ（任意）',[
   ...under.map(y=>opt(y.faceDown?'裏向きのカード':card(y).name,{uid:y.uid,incarnation:y.incarnation||0},10,y.faceDown?undefined:y.cardId)),skip()
  ]);
  break;
 }
 case'g34_ShieldMove685':
 case'g34_ShieldGrave588':{
  const target=t.owner==='self'?own:opp,side=t.owner==='self'?'自分':'相手';
  if(t.n==='all')t={...t,n:target.shields.length,required:true};
  const selected=t.selected||[],rows=target.shields.filter(y=>!selected.includes(y.uid)&&
   (t.optionalExact?api.shieldCards(y).every(x=>!x.g37ShieldHeld):api.shieldCards(y).some(x=>!x.g37ShieldHeld)));
  if(t.optionalExact&&selected.length+rows.length<t.n)break;
  const zone=t.to==='mana'?'マナゾーン':'墓地';
  if(selected.length<t.n&&rows.length)choice(s,t,t.optionalExact?zone+'に置く'+side+'のシールドを選ぶ（'+(selected.length+1)+'/'+t.n+'・任意）':t.required?
   zone+'に置く'+side+'のシールドを'+(t.n===1?'1つ選ぶ':'選ぶ（'+selected.length+'つ選択済み、最大'+t.n+'つ）'):
   zone+'に置く'+side+'のシールドを'+t.n+'つまで選ぶ（'+selected.length+'つ選択済み）',[
   ...rows.map(y=>opt('シールド '+(target.shields.indexOf(y)+1),y.uid,10)),...(t.required?[]:[opt(t.optionalExact?'シールドを置かない':'選択を完了',null,0)])
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
 case'g34_FightBuff241':{const enemies=fightRows240(s,t.p,1-t.p),allies=fightRows240(s,t.p,t.p);if(allies.length)choice(s,t,'このターン、パワーを+'+t.power+'する自分のクリーチャーを1体選ぶ',allies.map(o=>{const a=own.battle.find(y=>y.uid===o.value),boosted={...a,powerModifiers:[...(a.powerModifiers||[]),{amount:t.power,spellSource:t.spell?t.source:undefined,spellCost:fightSpellCost241(t)}]},scores=enemies.map(o=>fightScore240(s,boosted,s.players[1-t.p].battle.find(y=>y.uid===o.value)));return{...o,value:{uid:a.uid,incarnation:a.incarnation||0},score:scores.length?Math.max(...scores):5+cost(card(a))};}));break;}
 case'g34_Fight240':{
  const enemies=fightRows240(s,t.p,1-t.p,t.enemyFilter);
  if(!enemies.length&&!t.g1233ReleaseHyper)break;
  if(t.self){
   if(x&&api.isCreature(s,x)&&!x.sealed)
    put(s,{...t,op:'g34_FightEnemy240',fighter:{uid:x.uid,incarnation:x.incarnation||0},fighterOwner:t.creatureOrigin??t.p});
   break;
  }
  const allies=fightRows240(s,t.p,t.p).flatMap(o=>{
   const ally=own.battle.find(y=>y.uid===o.value);
   if(t.g419FightFilter&&!matches(s,t.p,ally,t.g419FightFilter))return [];
   const battle=enemies.length
    ?Math.max(...enemies.map(o=>fightScore240(s,ally,opp.battle.find(y=>y.uid===o.value)))):0;
   const release=t.g1233ReleaseHyper&&card(ally).hyper&&!ally.hyperActive&&
    exactRaces(effective(ally,s)).includes('超化獣')?20:0;
   return [{...o,value:{uid:ally.uid,incarnation:ally.incarnation||0},score:battle+release}];
  });
  if(allies.length)choice(s,t,t.g1233ReleaseHyper?'自分のクリーチャーを1体選ぶ':'バトルする自分のクリーチャーを1体選ぶ',
   [...allies,...(t.optional?[skip()]:[])]);
  break;
 }
 case'g34_FightEnemy240':{
  if(used792(s,t,t))break;
  const a=fightAttacker240(s,t)?.x;
  if(!a&&!t.g998EntryFight)break;
  const rows=fightRows240(s,t.p,1-t.p,t.enemyFilter).filter(o=>o.value!==a?.uid);
  if(rows.length)choice(s,t,'バトルする相手のクリーチャーを1体選ぶ',[
   ...rows.map(o=>{const b=s.players[1-t.p].battle.find(y=>y.uid===o.value);
    return {...o,value:{uid:b.uid,incarnation:b.incarnation||0},score:a?fightScore240(s,a,b):-1};}),
   ...(t.optional?[skip()]:[])
  ]);
  break;
 }
 case'g34_ChooseCivilization805':{
  if(t.g1660Harmony){choice(s,t,'攻撃を止める文明を選ぶ',civilizations805.map(color=>opt(color,color,creatures(s,1-t.p).filter(y=>colors(effective(y,s)).includes(color)).length*10)));break;}
  if(t.g1642OpponentReveal){
   choice(s,t,'相手が手札に加えられる文明を選ぶ',civilizations805.map(color=>opt(color,color,0)),1-t.p);
   break;
  }
  if(t.g1078Discard){
   choice(s,t,'捨てさせる手札の文明を選ぶ',civilizations805.map(color=>opt(color,color,0)));
   break;
  }
  if(t.g924DepthReveal){
   choice(s,t,'水以外の文明を選ぶ',civilizations805.filter(color=>color!=='水').map(color=>opt(color,color,0)));
   break;
  }
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
 case'g34_DefendMana947':{
  if(!s.attack)break;
  const attacker=1-t.p,n=civilizations805.length-manaCivilizationCount(s,attacker);
  if(n)put(s,{...t,op:'g34_TapManaColors698',p:attacker,controller:t.p,n,defs:[],elseDefs:[C('stopAttack')]});
  break;
 }
 case'g34_TapToStopAttack979':
  if(tapSource748(s,t))choice(s,t,'このクリーチャーをタップして攻撃を中止する？',
   [opt('タップする',true,s.attack?40:-5,t.source),skip()]);
  break;
 case'g34_TapManaColors698':{
  const selected=t.selected||[],n=t.n??t.colors.length;
  const pool=t.colors?null:own.mana.filter(x=>!x.tapped&&!selected.includes(x.uid));
  const options=pool?(pool.length<n-selected.length?[]:pool.map((x,i)=>
   opt(x.faceDown?'裏向きのマナ '+(i+1):card(x).name,x.uid,6,x.faceDown?undefined:x.cardId))):manaColorOptions698(s,t);
  const title=t.colors?[t.colors[selected.length]].flat().join('または')+'のマナを選ぶ':'攻撃を続けるためにタップするマナを選ぶ';
  if(options.length)choice(s,t,title+'（'+selected.length+'/'+n+'枚選択済み）',[...options,skip()]);
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
  const chooser=1-t.p,shields=s.players[chooser].shields,zone=t.to==='mana'?'マナゾーン':'墓地';
  // The opponent chooses their own card, while the ability still causes the movement.
  const units=creatures(s,chooser).filter(y=>api.targetable(s,chooser,chooser,y))
   .map(y=>opt('クリーチャー：'+card(y).name,{origin:'battle',uid:y.uid},-cost(effective(y,s)),y.cardId));
  const options=[...units,...ownShieldGraveOptions(s,chooser).map(o=>({...o,
   score:shields.length<=1?-25:0,value:{origin:'shields',uid:o.value}}))];
  if(options.length)choice(s,{...t,chooser},zone+'に置く自分のクリーチャーかシールドを選ぶ',options,chooser);
  break;
 }
 case'g34_ExLifeGrave1267':{
  const options=exLifeGraveOptions1267(s,t);
  if(options.length)choice(s,t,'このクリーチャーのEXライフシールドを墓地に置く？',[...options,skip()]);
  break;
 }
 case'g34_ShieldGrave':{
  const options=t.cardOnly?own.shields.flatMap((root,i)=>api.shieldCards(root).flatMap((y,j)=>
   y.g37ShieldHeld?[]:[opt('シールド '+(i+1)+' のカード '+(j+1),y.uid,10)])):ownShieldGraveOptions(s,t.p);
  if(options.length)choice(s,t,t.cardOnly?'墓地に置く自分のシールドのカードを1枚選ぶ':'墓地に置く自分のシールドを1つ選ぶ',t.optional?[...options,skip()]:options);
  break;
 }
 case'g34_OwnShieldGraves697':{
  const most=Math.max(...s.players.map(p=>p.shields.length));
  const owners=t.owners??(t.opponentOnly?[1-t.p]:[s.active,1-s.active].filter(p=>!t.moreOnly||s.players[p].shields.length===most));
  const [owner,...rest]=owners,to=t.to??'grave',zone=to==='mana'?'マナゾーン':'墓地';
  if(owner===undefined){
   const picks=t.picks||[],refill=t.g1793RefillOwners??(t.g1793OptionalCaster?picks.map(r=>r.owner):[]);
   for(const [i,{owner,uid}] of picks.entries()){
    const moved=api.moveShield(s,owner,uid,to);
    if(api.deferShieldMove1352(s,{...t,op:'g34_OwnShieldGravesDone1352',picks:picks.slice(i+1),owner1352:owner,...(t.g1793OptionalCaster?{g1793RefillOwners:refill}:{})}))return true;
    if(moved.length)api.log(s,owner,to==='mana'?'shieldMana':'shieldGrave',card(t.source).name+'：シールド1つ（カード'+moved.length+'枚）を'+zone+'に置いた',{cardId:t.source});
   }
   if(t.g1793OptionalCaster)start(s,t,refill.map(p=>({op:'ShieldTop',p,n:1})));
   break;
  }
  const options=ownShieldGraveOptions(s,owner),next={...t,owners:rest};
  if(options.length)choice(s,{...next,chooser:owner},zone+'に置く'+(t.g1793OptionalCaster?(owner===t.p?'自分の':'相手の'):'自分の')+'シールドを1つ選ぶ',t.g1793OptionalCaster?[...options,skip()]:options,t.g1793OptionalCaster?t.p:owner);
  else put(s,next);
  break;
 }
 case'g34_OwnShieldGravesDone1352':{
  const to=t.to??'grave',mana=to==='mana';
  if(t.g1352Moved.length)api.log(s,t.owner1352,mana?'shieldMana':'shieldGrave',card(t.source).name+'：シールド1つ（カード'+t.g1352Moved.length+'枚）を'+(mana?'マナゾーン':'墓地')+'に置いた',{cardId:t.source});
  put(s,{...t,op:'g34_OwnShieldGraves697'});
  break;
 }
 case'g34_CastCostSpell1656':start(s,t,[{op:'Execute',origin:'hand',spellOnly:true,g1656BelowCastCost:t.castCost,title:'唱えた呪文よりコストの小さい呪文を手札から唱える（任意）'}]);break;
 case'g34_DrillBow1656':{const rows=s.players[1-t.p].battle.filter(y=>!y.sealed&&!y.faceDown&&card(y).type==='gear');choice(s,t,'墓地に置く相手のクロスギアを1枚選ぶ',targetOptions(s,t.p,rows));break;}
 case'g34_DrillAfter1656':{const {p,uid,incarnation}=t.host,y=s.players[p].battle.find(y=>y.uid===uid&&(y.incarnation||0)===incarnation);if(y&&!y.sealed&&api.isCreature(s,y)&&currentPower506(s,y)<=2000)move(s,[{player:p,uid,to:'grave',destroy:true,controller:t.p}]);break;}
 case'g34_ManaBudgetDeploy1655':{start(s,t,[manaBudgetDeploy1655(s,t.p)]);break;}
 case'g34_TakuyaPenalty1654':{start(s,{...t,p:t.affected,controller:t.controller??t.p},[{op:'Select',zones:['battle','mana'],to:'grave',n:1,g187OwnPick:true,g1654CreatureOrMana:true,title:'墓地に置く自分のクリーチャー1体かマナ1枚を選ぶ'}]);break;}
 case'g34_ManaArrival1653':{const p=t.affected;start(s,{...t,p,controller:t.controller??t.p},[{op:'Select',origin:'mana',to:t.mode==='jet'?'deck':'grave',n:1,g187OwnPick:true,title:t.mode==='jet'?'山札の下に置く自分のマナを1枚選ぶ':'墓地に置く自分のマナを1枚選ぶ'}]);break;}
 case'g34_Prison1652':{
  const rows=targetOptions(s,t.p,creatures(s,1-t.p).filter(y=>!y.sealed));
  if(rows.length)choice(s,t,'手札に戻す相手のクリーチャーを1体選ぶ',rows);
  else put(s,{...t,op:'g34_PrisonDiscard1652',names:[]});
  break;
 }
 case'g34_PrisonDiscard1652':{
  const p=1-t.p,y=s.players[p].hand[Math.floor(api.random(s)*s.players[p].hand.length)];
  if(!y)break;
  const names=faces(api.zoneCard(s,p,y,'hand')).flatMap(c=>[...String(c.name||'').split(/\s*[/／]\s*/),...(c.additionalNames||[])]).map(exactName);
  api.discardSelected(s,p,[y.uid],t.source,t.controller??t.p,null,{...t,op:'g34_PrisonFinish1652',matched:names.some(n=>t.names.includes(n))});
  break;
 }
 case'g34_PrisonFinish1652':if(t.discarded&&t.matched)start(s,t,[{op:'ShieldGrave588',n:1,required:true}]);break;
 case'g34_AttackGraveDeploy1652':{
  const host=sourceHost474(s,t.g399Attacker)?.x,ceiling=host?cost(effective(host,s)):t.g399Attacker.cost;
  if(ceiling!==undefined)start(s,t,[{op:'Select',origin:'grave',n:1,optional:true,deploy:true,
   filter:{creatureOrSeed:true,belowCost:ceiling},title:'最初の攻撃：よりコストが小さいクリーチャーかタマシードを墓地から出す？'}]);
  break;
 }
 case'g34_NightmareBoth1651':{
  // Rule 409.1f: remove the entire simultaneous group from both graves before any entry.
  const refs=[];for(const p of[s.active,1-s.active])if(api.canMoveZone(s,p,'grave'))for(const y of [...s.players[p].grave]){
   const c=card(y),fits=t.g1652Ancient?c.g400Wave||race(c,'サバイバー')||race(c,'ダイナモ'):['ナイトメア','デスパペット','デビルマスク','ゴースト'].some(r=>race(c,r));if(c.type!=='creature'||!fits)continue;
   refs.push({p,uid:y.uid,serial:y.zoneSerial||0});remove(s.players[p].grave,y.uid);y.g5Origin='grave';(s.players[p].g34Holding??=[]).push(y);
  }
  if(refs.length){beginElementEntryBatch(s,'g34DeployBatch');put(s,{...t,op:'g34_NightmareOrder1651',refs,remaining:refs,order:[s.active,1-s.active],index:0});}
  break;
 }
 case'g34_NightmareOrder1651':{
  const p=t.order[t.index];if(p===undefined){
   // Rule 409.2: a held card that cannot enter returns without a new zone-change event.
   for(const r of t.refs){const own=s.players[r.p],y=(own.g34Holding||[]).find(y=>y.uid===r.uid&&(y.zoneSerial||0)===r.serial);if(y){remove(own.g34Holding,y.uid);delete y.g5Origin;own.grave.push(y);}}
   endElementEntryBatch(s,'g34DeployBatch');break;
  }
  const rows=t.remaining.filter(r=>r.p===p).flatMap(r=>{const y=(s.players[p].g34Holding||[]).find(y=>y.uid===r.uid&&(y.zoneSerial||0)===r.serial);return y?[{r,y}]:[];});
  if(rows.length)choice(s,t,'墓地から出す自分のクリーチャーの順序を選ぶ',rows.map(({r,y})=>opt(card(y).name,r,10+cost(card(y)),y.cardId)),p);
  else put(s,{...t,index:t.index+1});
  break;
 }
 case'g34_NightmareRelease1651':{const own=s.players[t.owner1651],y=(own.g34Holding||[]).find(y=>y.uid===t.target&&(y.zoneSerial||0)===t.serial);if(y){remove(own.g34Holding,y.uid);delete y.g5Origin;own.grave.push(y);}break;}
 case'g34_DestroyDefender1650':{
  const r=t.defender1650,y=r&&s.players[r.p].battle.find(y=>y.uid===r.uid&&(y.incarnation||0)===r.incarnation);
  if(y)move(s,[{player:r.p,uid:y.uid,to:'grave',destroy:true,controller:t.controller??t.p}]);
  break;
 }
 case'g34_SoupTarget1650':{
  const n=countDraw(s,t.p,{zone:'battle',filter:{creature:true,g1428Gr:true}});
  start(s,t,[{op:'BattleCardMove579',to:'grave',g815PutInGrave:true,filter:{max:n}}]);
  break;
 }
 case'g34_NsyPeek1650':{
  const ids=look(s,{...t,n:1}),y=own.deck.find(y=>y.uid===ids[0]);
  if(!y)break;
  start(s,t,[{op:'Execute',origin:'deck',g1578Exact:{uid:y.uid,serial:y.zoneSerial||0},
   g1650VividOnly:true,g408Decline:[{op:'NsyHand1650',target:y.uid,serial:y.zoneSerial||0}]}]);
  break;
 }
 case'g34_NsyHand1650':{
  const y=own.deck.find(y=>y.uid===t.target&&(y.zoneSerial||0)===t.serial);
  if(y)zoneMove(s,t.p,'deck',y.uid,'hand',t);
  release(s,t.p,t.target);
  break;
 }
 case'g34_GetFuture1649':
  if(own.hand.length)choice(s,t,'捨てる手札を1枚選ぶ',own.hand.map(y=>opt(card(y).name,y.uid,-cost(card(y)),y.cardId)));
  else start(s,t,[{op:'Draw',n:1}]);
  break;
 case'g34_GetFutureFinish1649':
  start(s,t,[{op:'Draw',n:1},...(t.discarded?[{op:'DiscardCost655',costs:t.costs,
   g835Creature:true,inclusive:true}]:[])]);
  break;
 case'g34_MarshalExchange1648':{
  const selected=t.selected||[],rows=own.hand.filter(y=>!selected.some(r=>r.uid===y.uid)),max=t.max==='all'?Infinity:t.max;
  if(!t.done&&selected.length<max&&rows.length){
   choice(s,{...t,selected},'シールド化する手札を'+(t.max==='all'?'好きな枚数':t.max+'枚まで')+'選ぶ（'+selected.length+'枚選択済み）',[
    ...rows.map(y=>opt(card(y).name,{uid:y.uid,serial:y.zoneSerial||0},faces(card(y)).some(c=>c.trigger||c.triggerPlus||c.superTrigger)?25:2,y.cardId)),
    opt('この'+selected.length+'枚で確定',null,selected.length?5:0)
   ]);
   break;
  }
  // The attempted count is retained even when placement is prohibited (QA45904).
  const attempted=selected.filter(r=>own.hand.some(y=>y.uid===r.uid&&(y.zoneSerial||0)===r.serial));
  for(const r of attempted)zoneMove(s,t.p,'hand',r.uid,'shields',t);
  if(attempted.length)start(s,t,[{op:'Break497',owner:'self',n:attempted.length,
   ...(t.creatureBreak?{g747CreatureBreak:true,g913DepartedBreaker:true}:{})}]);
  break;
 }
 case'g34_FirstDrawHandMana1648':
  if(api.canHandMana(s,t.player))start(s,{...t,p:t.player},[{op:'Select',origin:'hand',to:'mana',n:1,optional:true,
   title:'最初のドロー：自分の手札を1枚、マナゾーンに置く？'}]);
  break;
 case'g34_BreakEither1612':{
  const rows=[t.p,1-t.p].flatMap(p=>s.players[p].shields.map((x,i)=>opt((p===t.p?'自分':'相手')+'のシールド'+(i+1),{p,uid:x.uid},p===t.p?-5:10)));
  if(rows.length)choice(s,t,'ブレイクするシールドを選ぶ',rows);break;
 }
 case'g34_Break497':{
  const self=t.owner==='self',owner=self?t.p:1-t.p,shields=s.players[owner].shields;
  let chooser=t.ownerChooses?owner:t.p;
  const candidate=t.g747CreatureBreak?sourceHost474(s,t)?.x:null;
  const host=candidate&&!candidate.sealed&&api.isCreature(s,candidate)?candidate:null;
  const triggeredBreaker=t.g830BlockBreaker??t.g828BattleBreaker??(t.g913DepartedBreaker?t.source:undefined);
  if(t.g747CreatureBreak&&!host&&!triggeredBreaker)break;
  const c=host&&effective(host,s);
  if(c?.g977CannotBreak)break;
  const keeping=t.keep!==undefined;
  if(!keeping&&(host||triggeredBreaker)&&hooks.defenderShieldChoice1659(s,owner,{player:t.p,burn:c?.shieldBurn,reverse:c?.reverseBurn,qqBreak:c?.qqLock,g1577BottomBurn:c?.g1577BottomBurn}))chooser=owner;
  if(keeping&&shields.length<=t.keep)break;
  const printed=keeping?shields.length-t.keep:t.n==='all'?shields.length:t.n+(t.g1084FixedBreak?0:c?.extraBreak||0);
  const cap=t.g1342AlreadyCounted?printed:creatureBreakCount1342(s,t.p,host,printed);
  const n=keeping?shields.length-cap:Math.min(cap,shields.length);
  const selected=t.n==='all'&&!keeping&&n===shields.length?shields.map(y=>y.uid):(t.selected||[]).filter(uid=>shields.some(y=>y.uid===uid));
  if(selected.length<n){
   const action=keeping?'残す':'ブレイクする';
   choice(s,{...t,selected},
   action+(chooser===owner?'自分':'相手')+'のシールドを'+n+'つ選ぶ（'+selected.length+'つ選択済み）',
   [...shields.flatMap((y,i)=>selected.includes(y.uid)?[]:[opt('シールド'+(i+1),y.uid,10)]),...(t.optional&&(!selected.length||t.g1781UpTo)?[skip()]:[])],chooser);
   break;
  }
  const broken=keeping?shields.filter(y=>!selected.includes(y.uid)).map(y=>y.uid):host?selected.slice(0,n):selected;
  if(n&&broken.length)api.interruptBreak(s,owner,broken,{...t,op:'g34_AfterBreak278'},
   {player:t.p,sourceUid:host?.uid??t.uid,source:triggeredBreaker?(host?.cardId??triggeredBreaker):t.source,controller:t.p,g278Effect:true,
    ...(triggeredBreaker||t.g909AfterBreak?{incarnation:host?.incarnation??t.incarnation??0}:{}),
    ...(triggeredBreaker&&!host?{g913DepartedBreaker:true}:{}),
    ...(t.g909AfterBreak?{g909RequireBreak:true}:{}),
    ...(host?{incarnation:host.incarnation||0,...(c.g122NoST?{noST:true}:{}),reverse:!!c.reverseBurn,burn:!!c.shieldBurn,...(c.g1577BottomBurn?{g1577BottomBurn:true}:{}),...(c.qqLock?{qqBreak:true}:{})}:{})});
  break;
 }
 case'g34_ShieldCardManaDeploy1317':{
  const rows=peekRows585(s,{...t,who:'self',cardOnly:true}).filter(({x})=>!x.g37ShieldHeld);
  if(rows.length)choice(s,t,'マナに置く自分のシールドカードを1枚選ぶ',rows.map(({x,label})=>
   opt(label,x.uid,1,x.faceUp?x.cardId:undefined)));
  break;
 }
 case'g34_ShieldToMana980':{
  if(used792(s,t,t))break;
  const options=(t.ownOnly?[t.p]:[t.p,1-t.p]).flatMap(owner=>ownShieldGraveOptions(s,owner).map(o=>({
   ...o,label:(owner===t.p?'自分の':'相手の')+o.label,value:{owner,uid:o.value},
   score:owner===t.p?(own.shields.length>=3&&own.mana.length<7?7:-10):(opp.shields.length===1?14:3)
  })));
  if(options.length)choice(s,t,'マナに置くシールドを1つ選ぶ'+(t.required?'':'（任意）'),t.required?options:[...options,skip()]);
  break;
 }
 case'g34_ShuffleOwnShields1301':{
  if(!own.shields.length)break;
  const slots=own.shields.map(api.shieldCards),groups=own.shields.map(api.shieldGroup);
  const shuffled=api.shuffled(slots.flat(),Math.floor(api.random(s)*4294967296));
  for(const y of shuffled){delete y.faceUp;delete y.shieldCardOnly;delete y.shieldStack;delete y.shieldGroup;}
  const replacements=new Map(),forceReplacements=new Map();
  let offset=0;
  own.shields=slots.map((slot,i)=>{
   const [root,...stack]=shuffled.slice(offset,offset+slot.length);
   offset+=slot.length;
   if(stack.length)root.shieldStack=stack;
   replacements.set(groups[i],root.uid);
   for(const y of slot)forceReplacements.set(y.uid,root.uid);
   return root;
  });
  // EX Life and Shield Force keep their original shield positions (QA 39544, 37439).
  if(own.g1336ExLifeGroups)own.g1336ExLifeGroups=own.g1336ExLifeGroups.map(uid=>replacements.get(uid)??uid);
  for(const y of own.battle.flatMap(api.allLayers)){
   if(replacements.has(y.exLifeShieldUid))y.exLifeShieldUid=replacements.get(y.exLifeShieldUid);
   if(y.exLifeShieldUids)y.exLifeShieldUids=y.exLifeShieldUids.map(uid=>replacements.get(uid)??uid);
   const forceGroup=replacements.get(y.g35ShieldForce)??forceReplacements.get(y.g35ShieldForce);
   if(forceGroup)y.g35ShieldForce=forceGroup;
  }
  api.log(s,t.p,'shieldShuffle',card(t.source).name+'：自分のシールドを裏向きにしてシャッフルした',{cardId:t.source});
  break;
 }
 case'g34_ShieldShuffle1018':{
  const options=[t.p,1-t.p].flatMap(owner=>ownShieldGraveOptions(s,owner).map(o=>({
   ...o,label:(owner===t.p?'自分の':'相手の')+o.label,value:{owner,uid:o.value},
   score:owner===t.p?1:10
  })));
  if(options.length)choice(s,t,'山札に戻すシールドを1つ選ぶ',options);
  break;
 }
 case'g34_ShieldCycle1737':{
  const owners=t.owner==='opponent'?[1-t.p]:[t.p,1-t.p];
  const options=owners.flatMap(owner=>ownShieldGraveOptions(s,owner).map(o=>({
   ...o,label:(owner===t.p?'自分の':'相手の')+o.label,value:{owner,uid:o.value},score:owner===t.p?1:10
  })));
  if(options.length)choice(s,t,'山札の一番下に置き、新しいシールドと入れ替える',[...options,...(t.optional?[skip()]:[])]);
  else if(t.owner==='opponent'&&!t.optional)start(s,t,[{op:'ShieldTop',n:1,opponent:true}]);
  break;
 }
 case'g34_ShieldGraveReplace1109':{
  const options=[t.p,1-t.p].flatMap(owner=>ownShieldGraveOptions(s,owner).map(o=>({
   ...o,label:(owner===t.p?'自分の':'相手の')+o.label,value:{owner,uid:o.value},score:owner===t.p?0:10
  })));
  choice(s,t,'墓地に置くシールドを1つ選ぶ',options);
  break;
 }
 case'g34_ShieldMana557':if(opp.shields.length)choice(s,t,'マナに置く相手のシールドを1つ選ぶ',opp.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,10)));break;
 case'g34_Break278':{
  const host=t.requiresCreature&&sourceHost474(s,t);
  if(t.requiresCreature&&(!host||!api.isCreature(s,host.x)||effective(host.x,s).g977CannotBreak||!creatureBreakCount1342(s,t.p,host.x,1)))break;
  if(opp.shields.length)choice(s,t,'ブレイクする相手のシールドを1つ選ぶ',[...opp.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,10)),...(t.optional?[skip()]:[])]);break;
 }
 case'g34_AfterBreak278':if(t.g909Broke)start(s,t,t.g909AfterBreak);break;
 case'g34_OpponentPickShield949':{
  const choices=own.shields.flatMap((root,i)=>ponyShieldCards949(root).length?
   [opt('相手のシールド '+(i+1),root.uid,0)]:[]);
  if(choices.length)choice(s,t,'相手のシールドを1つ選ぶ',choices,1-t.p);
  break;
 }
 case'g34_PonyShieldCard949':{
  const root=api.findShield(own,t.group),cards=ponyShieldCards949(root);
  if(cards.length===1)peekPonyShield949(s,t,cards[0]);
  else if(cards.length)choice(s,t,'そのシールドからカードを1枚選ぶ',
   cards.map((x,i)=>opt('シールドのカード '+(i+1),x.uid,0)),1-t.p);
  break;
 }
 case'g34_ExposeTrigger1162':{
  const rows=peekRows585(s,{...t,who:'opponent',cardOnly:true}).filter(r=>!r.x.g37ShieldHeld);
  if(rows.length)choice(s,t,'表向きにする相手のシールドカードを1枚選ぶ',rows.map(({x,label})=>
   opt(label,x.uid,x.faceUp?0:5,x.faceUp?x.cardId:undefined)));
  break;
 }
 case'g34_RecycleMana1162':
  if(api.canMoveZone(s,t.p,'mana')&&own.mana.length)
   choice(s,t,'墓地に置いてからマナに戻すカードを1枚選ぶ（任意）',[
    ...own.mana.map((y,i)=>opt(y.faceDown?'裏向きのマナ '+(i+1):card(y).name,y.uid,y.tapped?10:-2,
     y.faceDown?undefined:y.cardId)),skip()
   ]);
  break;
 case'g34_InvasionZeroDeclare1315':{
  const x=own.hand.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);
  if(x&&!api.handAbilityIgnored(s,x))choice(s,t,'侵略ZEROの使用を宣言する？',[opt('宣言する',true,10,x.cardId),skip()]);
  break;
 }
 case'g34_ParityCombatLock1315':
  if(t.parity===0||t.parity===1){applyParityCombat1565(s,t,t.parity);break;}
  choice(s,t,'攻撃もブロックもできなくなるコストを選ぶ',[opt('奇数',1,10),opt('偶数',0,10)]);
  break;
 case'g34_FlipShields949':{
  const options=peekRows585(s,{...t,who:t.who??'both'});
  const rows=t.cardOnly?options.filter(r=>!r.x.g37ShieldHeld):options,selected=t.selected||[];
  const n=Math.min(t.n??creatures(s,t.p).length,rows.length);
  if(!n)break;
  if(t.done||selected.length>=n){
   for(const row of rows.filter(r=>selected.includes(r.x.uid))){
    for(const shield of row.seen){
     if(shield.faceUp)continue;
     shield.faceUp=true;
     api.log(s,t.p,'reveal',row.label+'：'+card(shield).name+'を表向きにした',{cardId:shield.cardId});
    }
   }
   break;
  }
  const title=t.mandatory?'表向きにするシールドを選ぶ':
   '表向きにするシールドを'+n+'つまで選ぶ（'+selected.length+'つ選択済み）';
  choice(s,{...t,n,selected},title,[
   ...rows.filter(r=>!selected.includes(r.x.uid)).map(r=>opt(r.label,r.x.uid,r.seen.some(x=>!x.faceUp)?5:0)),
   ...(t.mandatory?[]:[selected.length?opt('ここまでで確定',null,0):skip()])
  ]);
  break;
 }
 case'g34_BioK951':{
  const source=own.hand.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);
  if(!source||api.handAbilityIgnored(s,source))break;
  choice(s,t,'バイオ・Kでこのカードを捨てる？',[
   opt('捨てる',true,bioKScore(s,t.p,source),t.source),skip()
  ]);
  break;
 }
 case'g34_BioT952':{
  const source=own.hand.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);
  if(!source||!bioBattleUnit(s,t.attacker)||api.handAbilityIgnored(s,source))break;
  choice(s,t,'バイオ・Tでこのカードを捨てる？',[opt('捨てる',true,6,t.source),skip()]);
  break;
 }
 case'g34_BioPower952':{
  const attacker=bioBattleUnit(s,t.attacker),rule=card(t.source).g952BioT;
  if(rule.bounceBattle){const defender=t.defender&&bioBattleUnit(s,t.defender);const rows=[...(attacker?[{player:t.attacker.p,uid:attacker.uid,to:'hand',destroy:false,controller:t.p}]:[]),...(defender?[{player:t.defender.p,uid:defender.uid,to:'hand',destroy:false,controller:t.p}]:[])];if(rows.length)move(s,rows);break;}
  if(!attacker)break;
  if(rule.attackBonus)(attacker.g34Grants??=[]).push({turn:s.turn,attackBonus:rule.attackBonus});
  else if(rule.slayer)(attacker.g34Grants??=[]).push({turn:s.turn,slayer:true});
  else{
   const power=rule.power??own.hand.length*1000;
   if(power)buff(s,attacker,power);
   if(rule.untapAtEnd)scheduleUntap562(s,{...t,uid:attacker.uid,incarnation:t.attacker.incarnation,creatureSource:true},[
    {op:'AttackUntap408',g399Attacker:t.attacker,g764FollowControl:true,g562Creature:true}
   ]);
  }
  break;
 }
 case'g34_BioBattle952':{
  const attacker=bioBattleUnit(s,t.attacker),defender=bioBattleUnit(s,t.defender);
  if(attacker&&defender)api.battle(s,t.p,attacker,t.defender.p,defender,attacker.uid,true,t.blockUntap);
  break;
 }
 case'g34_ShinobiSearch950':{
  const ids=t.ids??look(s,{...t,n:own.deck.length}),selected=t.selected??[];
  const rows=own.deck.filter(x=>ids.includes(x.uid)&&matches(s,t.p,x,{g228Face:{type:'creature',raceAll:['シノビ']}}));
  const shown=rows.filter(x=>selected.includes(x.uid));
  if(t.g950Revealed){
   choice(s,t,'公開したシノビから手札に加える1体を選ぶ',
    shown.map(x=>opt(card(x).name,x.uid,own.deck.length>1?10+cost(card(x)):-1000,x.cardId)));
   break;
  }
  const remaining=rows.filter(x=>!selected.includes(x.uid));
  if(t.done||selected.length>=3||!remaining.length){
   for(const x of shown)api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(x).name,{cardId:x.cardId});
   put(s,shown.length?{...t,ids,selected,g950Revealed:true}:{...t,op:'g34_Order',ids,rest:'shuffle'});
   break;
  }
  choice(s,{...t,ids,selected},'相手に見せるシノビを3体まで選ぶ（'+selected.length+'体選択済み）',[
   ...remaining.map(x=>opt(card(x).name,x.uid,own.deck.length>1?10+cost(card(x)):-1000,x.cardId)),
   opt('ここまでで確定',null,0)
  ]);
  break;
 }
 case'g34_Peek585':{
  if(t.opponentDeckTop){
   const held=reserved(opp),top=opp.deck.find(x=>!held.has(x.uid));
   showPeek585(s,t,top?[{seen:[top],label:'相手の山札の上'}]:[]);
   break;
  }
  const rows=peekRows585(s,t);
  if(t.all){showPeek585(s,t,rows);break;}
  if(!rows.length){
   if(t.g1262GroupSwap&&api.canSwapShieldGroup1262(s,t.p,null))
    choice(s,{...t,op:'g34_PeekRead585',shieldUid:null},'山札の上から新しいシールドを追加しますか？',[opt('追加する',true,8),skip()]);
   break;
  }
  if(t.g1078Exact){
   const selected=t.selected||[],count=Math.min(t.n,rows.length);
   if(selected.length===count){showPeek585(s,t,rows.filter(({x})=>selected.includes(x.uid)));break;}
   choice(s,t,'確認するシールドを'+count+'つ選ぶ（'+selected.length+'つ選択済み）',[
    ...rows.filter(({x})=>!selected.includes(x.uid)).map(({x,label})=>
     opt(label+(x.faceUp?'：'+card(x).name:''),x.uid,x.faceUp?1:5,x.faceUp?x.cardId:undefined)),
    ...(!selected.length?[opt('見ない',null,0)]:[])
   ]);
   break;
  }
  choice(s,t,t.cardOnly?'確認するシールドカードを1枚選ぶ':'確認するシールドを1つ選ぶ',[
   ...rows.map(({x,p,label,seen})=>opt(label+(x.faceUp?'：'+card(x).name:''),{uid:x.uid,player:p,origin:'shields'},t.viewed?.includes(x.uid)?-5:seen.some(y=>!y.faceUp)?5:1,x.faceUp?x.cardId:undefined)),
   ...(t.viewed?.length?[opt('これ以上選ばない',null,0)]:t.optional?[opt('見ない',null,0)]:[])
  ]);
  break;
 }
 case'g34_MiniOrder1682':{
  const root=api.findShield(s.players[t.shieldOwner],t.shieldUid);
  if(!root)break;
  const cards=api.shieldCards(root),ordered=t.ordered||[],order=[s.active,1-s.active];
  const chooser=order.find(p=>cards.filter(x=>(x.cardOwner??t.shieldOwner)===p).some(x=>!ordered.includes(x.uid)));
  if(chooser===undefined){
   const {g585Peek,...next}=t,follow={...next,op:'g34_ShieldTop',p:t.shieldOwner,n:1};
   api.moveShields(s,t.shieldOwner,[t.shieldUid],'deck',{toOwnerDeck:true,g1659DeckOrder:ordered});
   if(!api.deferShieldMove1352(s,follow))put(s,follow);
   break;
  }
  const remaining=cards.filter(x=>(x.cardOwner??t.shieldOwner)===chooser&&!ordered.includes(x.uid));
  if(remaining.length===1){put(s,{...t,ordered:[...ordered,remaining[0].uid]});break;}
  choice(s,{...t,g585Peek:remaining.map(x=>({id:x.cardId,label:'自分の山札の下に置くカード'}))},
   '自分の山札の下に置くカードを上から順に選ぶ',remaining.map(x=>opt(card(x).name,x.uid,0,x.cardId)),chooser);
  break;
 }
 case'g34_OrderShield1262':{
  const root=api.findShield(own,t.shieldUid);
  const remaining=api.shieldCards(root).filter(x=>!api.shieldLeavesToGrave(s,t.p,x)&&!t.ordered.includes(x.uid));
  if(remaining.length<=1){
   if(api.finishShieldGroupSwap1262(s,t.p,t.shieldUid,[...t.ordered,...remaining.map(x=>x.uid)]))
    api.log(s,t.p,'shieldSwap',card(t.source).name+'：確認したシールドを山札の上に移した（内容は非公開）',{cardId:t.source});
   break;
  }
  choice(s,{...t,g585Peek:remaining.map(x=>({id:x.cardId,label:'山札の上に置く順番'}))},
   '山札の上から置く順番を選ぶ',remaining.map(x=>opt(card(x).name,x.uid,0,x.cardId)));
  break;
 }
 case'g34_CrestDeploy1030':{
  const candidates=list(s,{...t,origin:'hand',deploy:true,filter:{creature:true,color:'光',max:5}});
  if(!candidates.length){api.draw(s,t.p,1);break;}
  choice(s,t,'光のコスト5以下のクリーチャーを出すか、1枚引く',[
   ...candidates.map(({x})=>opt(card(x).name+'を出す',x.uid,12+cost(card(x)),x.cardId)),
   opt('カードを1枚引く',null,8)
  ]);
  break;
 }
 case'g34_DeployColors1106':{
  // A destination replacement does not increment the selected card's battlefield incarnation.
  const placed=api.physicalCards(s).find(x=>x.uid===t.target);
  if(!placed||(placed.incarnation||0)<=t.beforeEntry)break;
  const entered=own.battle.find(x=>x.uid===t.target);
  const civilizations=entered?colors(effective(entered,s)):t.selectedColors;
  start(s,t,t.g1106OnDeploy.flatMap(({color,def})=>civilizations.includes(color)?[def]:[]));
  break;
 }
 case'g34_CrestDeployResult1030':{
  // An entry replacement leaves the physical card's battlefield incarnation unchanged.
  const placed=api.physicalCards(s).find(x=>x.uid===t.target);
  if((placed?.incarnation||0)===t.beforeEntry)api.draw(s,t.p,1);
  break;
 }
 case'g34_AmbitionAfterPut1316':{
  const placed=t.target&&api.physicalCards(s).find(x=>x.uid===t.target);
  if(!placed||(placed.incarnation||0)<=t.beforeEntry)
   start(s,t,[{op:'Offer',title:'カードを2枚引く？',defs:[{op:'Draw',n:2}]}]);
  break;
 }
 case'g34_ShieldHandEntry1031':{
  const source=own.hand.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);
  if(source&&!api.handAbilityIgnored(s,source)&&canPut(s,t.p,source,'hand'))
   choice(s,t,card(source).name+'を手札から出す？',[opt('出す',true,20,source.cardId),skip()]);
  break;
 }
 case'g34_DestroyStay1193':
  (s.extLimits??=[]).push({kind:'g1193DestroyStay',player:t.p,expires:'end',who:s.active,
   spellSource:t.source,spellCost:cost(card(t.source))});
  break;
 case'g34_ShieldTrigger1193':
  if(own.shields.length)choice(s,t,'S・トリガーを与えるシールドを1つ選ぶ',
   own.shields.map((x,i)=>opt('シールド'+(i+1),api.shieldGroup(x),10)));
  break;
 case'g34_ShieldHand':put(s,{...t,op:'g55_ShieldHand',...(t.owner==='opponent'?{g832ShieldOwner:1-t.p}:{})});break;
 case'g34_HandShield657':
  if(own.hand.length&&(t.afterAttempt||api.canAddShield(s,t.p)))choice(s,t,'シールド化する手札を1枚選ぶ（任意）',[
   ...own.hand.map(y=>opt(card(y).name,y.uid,card(y).gCastle||faces(card(y)).some(c=>c.trigger)?12:2,y.cardId)),skip()
  ]);
  break;
 case'g34_ShieldSide657':{
  const y=own.hand.find(y=>y.uid===t.target&&(y.zoneSerial||0)===t.serial);
  if(y&&(t.afterAttempt||api.canAddShield(s,t.p)))choice(s,t,'シールドを置く向きを選ぶ',[
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
 case'g34_InfinityTop1248':{
  const [uid]=look(s,{...t,n:1,public:true}),y=own.deck.find(x=>x.uid===uid);
  if(!y)break;
  const c=api.zoneCard(s,t.p,y,'deck');
  if(dragonElement1248(c)&&(!t.g1819ManaMaximum||cost(c)<=own.mana.length)){
   release(s,t.p,uid);
   put(s,{...t,op:'g34_Put',origin:'deck',target:uid,
    ...(t.g1819ManaMaximum?{g1660PublicPeek:[{id:y.cardId,label:'公開した山札'}]}:{})});
  }else{
   zoneMove(s,t.p,'deck',uid,'mana',{tapped:true});
   api.deckCheck(s,t.p);
  }
  break;
 }
 case'g34_DragonWorldMill1250':{
  const y=api.takeTop(s,t.p);
  const printed=y&&api.zoneCard(s,t.p,y,'deck');
  const hit=printed&&!api.isEvolution(y)&&race(printed,'ドラゴン');
  if(y){clear(y,'grave');api.addZone(s,t.p,'grave',y);}
  api.deckCheck(s,t.p);
  const host=hit&&sourceHost474(s,t);
  if(s.winner===null&&host&&host.x.uid===t.uid&&!host.x.sealed){
   start(s,t,[{op:'ExactMove',owner:host.p,target:t.uid,targetIncarnation:t.incarnation,optional:true,to:'grave',
    afterAttempt:[{op:'HatchHunter841',target:y.uid,serial:y.zoneSerial||0}]}]);
  }
  break;
 }
 case'g34_TopDestination1244':{
  const [uid]=look(s,{...t,n:1}),y=own.deck.find(x=>x.uid===uid);
  if(!y)break;
  release(s,t.p,uid);
  const shield=api.canAddShield(s,t.p),manaScore=own.deck.length>1&&!api.deckRedirect(s,t.p)?12:0;
  choice(s,{...t,target:uid,serial:y.zoneSerial||0,...deckPeek841(own,[uid])},'確認したカードを置く場所を選ぶ',[
   opt('マナゾーンに置く','mana',manaScore,y.cardId),
   opt('裏向きの新しいシールドにする','shields',shield?(own.shields.length<3&&own.deck.length>1?18:8):-10,y.cardId)
  ]);
  break;
 }
 case'g34_ShieldTop':
  if(t.opponent){put(s,{...t,p:1-t.p,opponent:false,controller:t.controller??t.p});break;}
  if(t.g1233Look){
   const [uid]=look(s,{...t,n:1});
   if(uid)choice(s,{...t,target:uid,...deckPeek841(own,[uid])},'山札の上から1枚目を確認',
    [opt('確認を終える',true,0)]);
   break;
  }
  if(t.faceUp)put(s,{...t,op:'g33_FaceTop'});
  else api.shieldTop(s,t.p,card(t.source),null,t.g779Simultaneous?{count:t.n}:t.stackNext?{stackNext:true}:undefined);
  break;
 case'g34_ShieldMoveDone1352':{
  const byUid=new Map(api.physicalCards(s).map(x=>[x.uid,x]));
  shieldMoveDone1352(s,t,t.kind1352,t.owner1352,t.g1352Moved.map(uid=>byUid.get(uid)).filter(Boolean));
  break;
 }
 case'g34_Ragnarok':{
  const moved=api.moveShields(s,t.p,own.shields.map(api.shieldGroup),'grave');
  finishOrDeferShield1352(s,t,'ragnarok',t.p,moved);
  break;
 }
 case'g34_OnShieldMove654':{
  const x=own.shields.find(y=>y.uid===t.placed);
  if(x?.faceUp&&matches(s,t.p,x,t.g654MovedFilter))start(s,t,t.after);
  break;
 }
 case'g34_AfterAttackDestroy':{
  const a=s.attackLifecycle;
  if(!a)break;
  if(t.g1197Attacker){
   if(!a.g1197Swapped)(a.g1197Deaths??=[]).push({p:t.p,source:t.source});
  }
  else (a.g176Deaths??=[]).push({p:t.p,uid:t.uid,incarnation:t.incarnation||0,source:t.source});
  break;
 }
 case'g34_DestroyAfterAttack1197':{
  const host=t.targets.map(ref=>sourceHost474(s,ref)).find(Boolean);
  if(host&&!host.x.sealed&&api.isCreature(s,host.x))
   move(s,[{player:host.p,uid:host.x.uid,to:'grave',controller:t.p,...(t.g1270Destroy?{destroy:true}:{})}]);
  break;
 }
 case'g34_Offer':{
  if(t.g1067DeckBase){
   const host=sourceHost474(s,t);
   if(!host||host.x.sealed||!api.isCreature(s,host.x)||!own.deck.length)break;
   choice(s,t,t.title,[opt('下に置く',true,own.deck.length>1&&!api.deckRedirect(s)?10:-1000),skip()]);
   break;
  }
  if(t.g1042LookFirst&&(!own.deck.length||api.deckLocked(s,t.p)))break;
  if(t.g792Once&&(used792(s,t,t)||!own.deck.length&&!t.g1645NoDeckRequirement))break;
  if(t.g790CreatureBreak){
   const host=sourceHost474(s,t)?.x;
   if(!host||host.sealed||!api.isCreature(s,host)||!opp.shields.length)break;
  }
  if(card(t.source).supportBatch==='phase-596'){
  const score=modeScore(s,t,t.defs)-(own.shields.length===1?18:5);
  choice(s,t,t.title,[opt('使う',true,score),skip()]);
  break;
 }if(t.g299ShieldHand&&!own.shields.some(x=>api.shieldCards(x).some(y=>!y.g37ShieldHeld)))break;const defs=t.defs||[],refill=t.g292Refill?defs[0]:null,exchange=defs.length===2&&defs[0].op==='Draw'&&defs[1].g183Return,drains=defs.length&&defs.every(d=>['Draw','Ramp','ShieldTop'].includes(d.op)),n=t.g409Namake?(api.deckLocked(s,t.p)?0:Math.min(own.deck.length,api.canAddShield(s,t.p)?2:1)):t.g359RevealAll?(api.deckLocked(s,t.p)?0:api.lookCount(s,t.p,defs[0].n)):t.g356RampReturn?defs[0].n:t.g294MillDraw?defs.reduce((n,d)=>n+(d.n||0),0):refill?(own.hand.length<=refill.max?Math.max(0,refill.n-own.hand.length):0):t.g186GraveMill?defs[0].n:exchange||t.g204DrawDiscard?defs[0].n:drains?defs.reduce((n,d)=>n+(d.n||0),0):0,last=n>0&&n>=own.deck.length,shako=last&&(t.g294MillDraw&&own.deck.length>defs[0].n||refill||exchange||t.g204DrawDiscard||defs.every(d=>d.op==='Draw'))&&creatures(s,t.p).some(y=>effective(y,s).shako);choice(s,t,t.title||'この能力を使う？',[opt('使う',true,last?(shako?1000:-1000):t.g299ShieldHand?(own.shields.length>1&&own.hand.length<4?8:-8):t.g298SelfMana?(own.mana.length<6?18:own.mana.length<9?4:-8)-(x&&api.isEvolution(x)?12:0):t.defs?.length===1&&t.defs[0].op==='MillRecover545'?modeScore(s,t,t.defs):t.defs?.length===1&&t.defs[0].op==='RecoverAll326'?recoveryScore326(s,{...t,...t.defs[0]}):t.score??10),skip()]);break;}
 case'g34_FlyHands1698':{
  // Snapshot both complete hands before publishing either simultaneous movement.
  const hands=s.players.map(p=>p.hand.slice());
  for(const p of[s.active,1-s.active])moveZoneSelection583(s,{...t,origin:'hand',to:'mana',faceDown:true},hands[p],p);
  break;
 }
 case'g34_HandAllToMana':{
  moveZoneSelection583(s,{...t,origin:'hand',to:'mana'},own.hand.slice());
  // The chosen move attempts every card, including an empty hand (rule 101.3a).
  start(s,t,t.after);
  break;
 }
 case'g34_KeepTypes1285':keepTypes1285(s,t);break;
 case'g34_KeepHand1516':{
  const keeper=t.keeper??1-t.p,hand=s.players[keeper].hand,selected=t.selected||[],keep=t.keep??2,controller=t.controller??t.p;
  if(hand.length<=keep)break;
  if(selected.length>=keep){api.discardSelected(s,keeper,hand.filter(y=>!selected.includes(y.uid)).map(y=>y.uid),t.source,controller);break;}
  choice(s,{...t,p:keeper,keeper,controller,selected},'残す自分の手札を'+keep+'枚選ぶ',hand.filter(y=>!selected.includes(y.uid)).map(y=>opt(card(y).name,y.uid,20-Math.min(20,cost(card(y))),y.cardId)));break;
 }
 case'g34_KeepOne604':{
  const p=t.owner==='self'?t.p:1-t.p,hand=t.zone==='hand';
  const rows=hand?s.players[p].hand:creatures(s,p).filter(y=>!y.sealed);
  const eligible=t.to==='mana'?rows.filter(y=>api.targetable(s,p,p,y)):rows;
  choice(s,{...t,p,controller:t.controller??t.p},hand?'残す手札を1枚選ぶ':'残すクリーチャーを1体選ぶ',
   eligible.map(y=>opt(card(y).name,y.uid,hand?20-Math.min(20,cost(card(y))):cost(effective(y,s))*2+api.power(y,false,s)/2000,y.cardId)));
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
 case'g34_ShowTime1117':
  put(s,{...t,op:'g34_Select',p:1-t.p,controller:t.controller??t.p,
   origin:'hand',deploy:true,n:'all',optional:true,g1117ShowTime:true,
   filter:{creature:true,nonEvolution:true},title:'手札から出す進化ではないクリーチャーを選ぶ',
   after:[{op:'ShowTimeSummon1117',p:t.p,min:0}]});
  break;
 case'g34_ShowTimeSummon1117':
  start(s,t,[{op:'Execute',origin:'hand',creatureOnly:true,
   filter:t.min==='∞'?{exactCost:'∞'}:{min:t.min},
   title:'コストを支払わずに召喚する自分のクリーチャーを選ぶ'}]);
  break;
 case'g34_OpponentDeploy779':put(s,{...t,op:'g34_Select',p:1-t.p,controller:t.controller??t.p,
  origin:'hand',deploy:true,n:1,optional:true,filter:{creature:true,max:3}});break;
 case'g34_OpponentOffer777':put(s,{...t,op:'g34_Offer',p:1-t.p});break;
 case'g34_GraveRecoverOffer1011':{
  const recovery={op:'Select',origin:'grave',to:'hand',n:2,g583Group:true,g1011ChooseBeforeMove:true,
   filter:{g228Face:{type:'creature'}},title:'墓地から手札に戻す自分のクリーチャーを2体選ぶ'};
  // The condition counts the choices. A graveyard lock can prevent the later movement.
  const available=list(s,{...recovery,p:1-t.p});
  if(available.length<recovery.n)start(s,t,[{op:'Draw',n:2}]);
  else choice(s,{...t,recovery},'自分の墓地のクリーチャー2体を選んで手札に戻す？',[
   opt('2体選ぶ',true,10),opt('選ばない',null,0)
  ],1-t.p);
  break;
 }
 case'g34_OfferBoth992':{
  const offer={...t,op:'g34_Offer',p:s.active};
  put(s,offer,{...offer,p:1-s.active});
  break;
 }
 case'g34_OpponentDestination1506':{const rows=targetOptions(s,1-t.p,creatures(s,1-t.p).filter(x=>!x.sealed));if(rows.length)choice(s,t,'マナゾーンまたは手札に戻される自分のクリーチャーを選ぶ',rows.map(o=>{const y=s.players[1-t.p].battle.find(x=>x.uid===o.value);return{...o,value:{uid:y.uid,incarnation:y.incarnation||0}};}),1-t.p);break;}
 case'g34_PlayersMana1830':{
  // Native per-player selection preserves APNAP order and one simultaneous movement batch.
  start(s,t,[{op:'EachPlayer459',origin:'battle',to:'mana',g1519EachN:2}]);
  break;
 }
 case'g34_ViscaMana1832':
  // Rule405.5 lets the choosing owner inspect their own facedown mana; other seats get no choices.
  if(api.canMoveZone(s,t.p,'mana')&&own.mana.length)choice(s,t,'墓地に置く自分のマナを1枚選ぶ',own.mana.map(x=>opt((x.faceDown?'裏向きのマナ：':'')+card(x.cardId).name,x.uid,(faces(card(x.cardId)).some(c=>race(c,'スノーフェアリー'))?10:0)-cost(card(x.cardId)),x.cardId)));
  break;
 case'g34_RegisterReturn1832':{
  const ref={uid:t.target,incarnation:t.targetIncarnation};
  if(sourceHost474(s,ref))(s.g537Delays??=[]).push({p:t.p,source:t.source,turn:s.turn,when:'turnEnd',defs:[{op:'ReturnGroup785',refs:[ref],toOwnerHand:true}]});
  break;
 }
 case'g34_FullDuel1830':
  start(s,t,[{op:'ShieldTop',n:Math.max(0,5-own.shields.length),g779Simultaneous:true},{op:'ProtectShields1830'}].filter(d=>d.op!=='ShieldTop'||d.n));
  break;
 case'g34_ProtectShields1830':
  (s.extLimits??=[]).push({kind:'g1830NoShieldBreak',player:t.p,expires:'start',who:t.p});
  break;
 case'g34_OpponentSelect':{
  const origin=t.origin||'battle',battle=origin==='battle';
  if(battle&&t.g741MinPower)t={...t,g530Ids:lowestPower741(s,creatures(s,1-t.p).filter(x=>matches(s,1-t.p,x,t.filter))).map(x=>x.uid)};
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
  if(t.g1770OwnElementCount){
   const n=own.battle.filter(x=>!x.sealed&&!x.faceDown&&matches(s,t.p,x,t.g1770OwnElementCount)).length;
   if(!n)break;
   t={...t,n};
  }
  if(api.implicitChoice1369(t))t={...t,implicitSelection:true,implicitBattleSelection:true};
  if(t.g1132EntryTarget){
   const host=sourceHost474(s,t.g1132EntryTarget);
   if(!host||host.x.sealed||!api.isCreature(s,host.x))break;
  }
  if(t.g926OwnCreatureColor&&t.n===undefined){
   const n=creatures(s,t.p).filter(x=>!x.sealed&&!x.faceDown&&colors(effective(x,s)).includes(t.g926OwnCreatureColor)).length;
   if(!n)break;
   t={...t,n,title:'相手のマナから墓地に置くカードを'+n+'枚まで選ぶ'};
  }
  if(t.g1009SelectAll){
   const rows=list(s,t).map(({x,p})=>({uid:x.uid,p}));
   if(rows.length)moveZoneSelection583(s,t,rows);
   break;
  }
  const limit=t.g746OwnManaCost?{filter:{...t.filter,max:own.mana.length}}:{};
  selection(s,{selected:[],rows:[],...t,...limit});
  break;
 }
 case'g34_FaceUpShieldPut1294':{
  const options=own.shields.flatMap(api.shieldCards).filter(x=>{
   const c=card(x);
   return x.faceUp&&!x.g37ShieldHeld&&c.type==='creature'&&cost(c)<=t.max&&canPut(s,t.p,x,'shields');
  }).map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId));
  if(options.length)choice(s,t,'表向きのシールドから出すクリーチャーを1体まで選ぶ',[...options,skip()]);
  break;
 }
 case'g34_GyouRevive1364':{
  const owner=1-t.p;
  const rows=api.canMoveZone(s,owner,'grave')?opp.grave.filter(y=>card(y).type==='creature'&&
   canPut(s,owner,y,'grave')):[];
  if(rows.length)choice(s,t,'相手がタップして出す、相手の墓地のクリーチャーを1体選ぶ',[
   ...rows.map(y=>opt(card(y).name,{uid:y.uid,serial:y.zoneSerial||0},cost(card(y)),y.cardId)),skip()
  ]);
  break;
 }
 case'g34_Put':{const y=putSource1294(s,t);if(!y||t.g1651Held&&!api.canMoveZone(s,t.p,'grave')||!matchesDeathDeployment960(t,y))break;const selected=t.g1104Back?psychicBack1104(y):y,c=faces(card(selected))[t.face||0];if(t.execution&&c.type==='spell'){doPut(s,t);break;}if(!canPut(s,t.p,selected,t.origin,!!t.execution))break;if(c.g213Mars||c.g31Evolution?.minCards){doPut(s,t);break;}if(c.evolution||c.neoEvolution&&!t.noEvolve){
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
 case'g34_ManaDownUpTo1604':{
  const remaining=t.remaining??[0,1],p=remaining[0],selected=t.selected??[],chosen=t.chosen??[];
  if(p===undefined){for(const ref of selected)turnManaDown(s,t,ref);break;}
  const rows=s.players[p].mana.filter(y=>!chosen.some(ref=>ref.uid===y.uid));
  if(chosen.length>=t.n||!rows.length){put(s,{...t,remaining:remaining.slice(1),selected:[...selected,...chosen],chosen:[]});break;}
  choice(s,t,(p===t.p?'自分':'相手')+'のマナを'+t.n+'枚まで選んで裏向きにする',[
   ...rows.map(y=>opt(y.faceDown?'裏向きのマナ '+(s.players[p].mana.indexOf(y)+1):card(y).name,
    {p,uid:y.uid,serial:y.zoneSerial||0},y.faceDown?0:10,y.faceDown?null:y.cardId)),skip()
  ]);break;
 }
 case'g34_ManaDown426':{
  const rows=own.mana.filter(y=>!y.faceDown);
  if(rows.length)choice(s,t,'裏向きにする自分のマナを1枚選ぶ'+(t.required?'':'（任意）'),[
   ...rows.map(y=>opt(card(y).name,{uid:y.uid,serial:y.zoneSerial||0},manaDownScore426(s,t,y),y.cardId)),
   ...(t.required?[]:[skip()])
  ]);
  break;
 }
 case'g34_ManaDownEach1041':{
  const remaining=t.remaining??[s.active,1-s.active],p=remaining[0],selected=t.selected??[];
  if(p===undefined){
   if(selected.some(ref=>s.players[ref.p].mana.some(y=>y.uid===ref.uid&&!y.faceDown)))
    choice(s,t,'選ばれたマナをすべて裏向きにする？',[opt('裏向きにする',true,10),skip()]);
   break;
  }
  const rows=s.players[p].mana;
  if(rows.length)choice(s,t,'自分のマナを1枚選ぶ',rows.map((y,i)=>opt(
   y.faceDown?'裏向きのマナ '+(i+1):card(y).name,{p,uid:y.uid,serial:y.zoneSerial||0},
   y.faceDown?12:y.tapped?5:0,y.faceDown?null:y.cardId
  )),p);
  else put(s,{...t,remaining:remaining.slice(1)});
  break;
 }
 // A failed deployment must not be confused with a failed printed condition.
 case'g34_RevealTop514':{
  if((t.g1010DestroyBelowPower||t.g1014BlindBottom)&&api.deckLocked(s,t.p)){
   // QA 31654: a fixed top card still moves when it cannot be revealed.
   const held=reserved(own),top=own.deck.find(y=>!held.has(y.uid));
   if(top)zoneMove(s,t.p,'deck',top.uid,t.g1014BlindBottom?'deck':'hand',t);
   api.deckCheck(s,t.p);
   break;
  }
  const ids=look(s,{...t,n:1,public:true}),y=own.deck.find(y=>y.uid===ids[0]);
  if(!y){api.deckCheck(s,t.p);break;}
  if(t.g1010DestroyBelowPower){
   const creature=faces(api.zoneCard(s,t.p,y,'deck')).find(face=>face.type==='creature');
   const power=creature&&api.revealedPower(y,s);
   const moved=zoneMove(s,t.p,'deck',y.uid,'hand',t);
   if(!moved)release(s,t.p,y.uid);
   api.deckCheck(s,t.p);
   if(moved&&creature&&s.winner===null)start(s,t,[{op:'Target',to:'grave',
    filter:{belowPower:power===Infinity?'∞':power,g199Power:true},
    title:'公開したクリーチャーよりパワーが小さい相手を1体破壊する'}]);
   break;
  }
  const attacker=t.g1222LiveAttackCost&&own.battle.find(x=>x.uid===s.attack?.attacker&&!x.sealed&&api.isCreature(s,x));
  const filter=attacker?{...t.filter,exactCost:cost(effective(attacker,s))}:
   t.g746OwnManaCost?{...t.filter,max:own.mana.length}:t.filter;
  const matched=(!t.g1222LiveAttackCost||attacker)&&matches(s,t.p,y,filter),to=matched?t.to:t.elseTo;
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
 case'g34_MinogamiReveal1309':{
  const ids=look(s,{...t,n:1,public:true}),top=own.deck.find(y=>y.uid===ids[0]);
  if(!top){api.deckCheck(s,t.p);break;}
  const releaseDef={op:'RevealRelease514',ids};
  const eligible=!api.isEvolution(top)&&race(api.zoneCard(s,t.p,top,'deck'),'レクスターズ')&&canPut(s,t.p,top,'deck');
  const deploy={op:'MinogamiDeploy1309',target:top.uid,revealed:t.uid,handSerial:t.handSerial};
  start(s,t,eligible?[{op:'Offer',title:card(top).name+'をバトルゾーンに出す？',
   score:own.deck.length<=1?-1000:20+cost(card(top)),defs:[deploy]},releaseDef]:[releaseDef]);
  break;
 }
 case'g34_MinogamiDeploy1309':{
  const base=own.deck.find(y=>y.uid===t.target);
  if(!base||!canPut(s,t.p,base,'deck'))break;
  doPut(s,{...t,origin:'deck'});
  afterEntry(s,t.p,base,task('g34_MinogamiEvolve1309',t.p,t.source,{
   target:base.uid,targetIncarnation:base.incarnation||0,revealed:t.revealed,handSerial:t.handSerial
  }),put);
  break;
 }
 case'g34_MinogamiEvolve1309':{
  const base=own.battle.find(y=>y.uid===t.target&&(y.incarnation||0)===t.targetIncarnation&&!y.sealed);
  const minogami=own.hand.find(y=>y.uid===t.revealed&&(y.zoneSerial||0)===t.handSerial);
  if(base&&minogami&&canPut(s,t.p,minogami,'hand')&&api.evolutionBases(s,t.p,card(minogami)).includes(base))
   doPut(s,{...t,target:minogami.uid,origin:'hand'},base.uid);
  break;
 }
 case'g34_MojitoDeploy1309':{
  const revealed=own.hand.find(y=>y.uid===t.revealed.uid&&(y.zoneSerial||0)===t.revealed.serial);
  if(revealed&&s.players.some(player=>player.hand.some(y=>y.uid===t.returned.uid&&
   (y.zoneSerial||0)!==t.returned.serial)))doPut(s,{...t,target:revealed.uid,origin:'hand',noEvolve:true});
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
 case'g34_CountPowerMinus1123':{
  const power=-(t.base+t.per*countDraw(s,t.p,t));
  start(s,t,[{op:'Target',power,g242PowerMinus:true,title:'パワーを下げる相手のクリーチャーを選ぶ'}]);
  break;
 }
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
 case'g34_ShieldTriggerUntap1015':
 case'g34_ShieldHandFollow1017':{
  const untap=t.op==='g34_ShieldTriggerUntap1015';
  const score=untap?(x?.tapped&&api.canUntap(x)&&own.shields.length>1?12:-2):own.shields.length>1?10:-2;
  const options=own.shields.flatMap((shield,i)=>{
   const rows=api.shieldCards(shield).filter(y=>!y.g37ShieldHeld);
   if(t.cardOnly)return rows.map((y,j)=>opt('シールド '+(i+1)+' のカード '+(j+1)+(y.faceUp?'：'+card(y).name:''),y.uid,score,y.faceUp?y.cardId:undefined));
   return rows.length?[opt('シールド '+(i+1)+(shield.faceUp?'：'+card(shield).name:''),shield.uid,score,shield.faceUp?shield.cardId:undefined)]:[];
  });
  const title=t.cardOnly?'手札に加える自分のシールドゾーンのカードを1枚選ぶ（任意）':'手札に加える自分のシールドを選ぶ';
  if(options.length)choice(s,t,title+(t.noST?'（S・トリガーは使えません）':''),
   untap||t.optional?[...options,skip()]:options);
  else if(t.optional)start(s,t,t.defs);
  break;
 }
 case'g34_JesterShields1125':{
  const defender=1-t.p;
  const options=opp.shields.flatMap((y,i)=>!t.picked.includes(y.uid)&&api.shieldCards(y).some(x=>!x.g37ShieldHeld)?
   [opt('シールド '+(i+1)+(y.faceUp?'：'+card(y).name:''),y.uid,opp.shields.length-t.picked.length>1?10:-10,
    y.faceUp?y.cardId:undefined)]:[]);
  if(!t.done&&t.picked.length<3&&options.length)
   choice(s,t,'手札に加える自分のシールドを3つまで選ぶ',[...options,
    opt(t.picked.length?'選んだシールドをまとめて手札に加える':'シールドを加えない',null,0)],defender);
  else if(t.picked.length){
   const follow=task('g34_JesterBottom1125',t.p,t.source,{n:0});
   follow.n=api.interruptBreak(s,defender,t.picked,follow,
    {g842Hand:true,g1125CountShields:true,controller:t.p,source:t.source});
  }
  break;
 }
 case'g34_JesterBottom1125':
  if(t.n)start(s,t,[{op:'Select',origin:'hand',to:'deck',n:t.n,title:'山札の一番下に置く自分の手札を選ぶ'}]);
  break;
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
 case'g34_LookBlocker1243':{
  const [uid]=look(s,{...t,n:1}),y=own.deck.find(x=>x.uid===uid);
  if(!y)break;
  release(s,t.p,uid);
  const c=api.zoneCard(s,t.p,y,'deck');
  if(c.type==='creature'&&c.blocker&&canPut(s,t.p,y,'deck')){
   choice(s,{...t,target:uid,serial:y.zoneSerial||0,...deckPeek841(own,[uid])},
    '確認したブロッカーを出す？',[opt('出す',true,own.deck.length>1?20:-1000,y.cardId),opt('手札に加える',false,5,y.cardId)]);
  }else{
   zoneMove(s,t.p,'deck',uid,'hand');
   api.deckCheck(s,t.p);
  }
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
  const qualifies=c=>c.type==='spell'&&(t.g1242MaxCost===undefined||cost(c)<=t.g1242MaxCost);
  if(t.g1243UnmatchedGrave&&!revealedFaces.some(qualifies)){
   zoneMove(s,t.p,'deck',uid,'grave');
   api.deckCheck(s,t.p);
   break;
  }
  const options=revealedFaces.flatMap((c,face)=>qualifies(c)&&api.canCast(s,t.p,c,'deck')
   ?[opt(c.name+'を唱える',{uid,face,serial:y.zoneSerial||0},own.deck.length===1?-1000:spellScore555(s,t,c),y.cardId)]:[]);
  const peek={...t,g585Peek:[{id:y.cardId,label:'自分の山札の上'}]};
  if(options.length)choice(s,peek,'確認したカードの呪文を唱える？',[...options,skip()]);
  else if(!t.g878SpellBlue)choice(s,peek,'確認したカード',[opt('確認を終える',null,0)]);
  break;
 }
 case'g34_RevealTopCreatureOrSpell1251':{
  const [uid]=look(s,{...t,n:1,public:true}),y=own.deck.find(x=>x.uid===uid);
  if(!y)break;
  release(s,t.p,uid);
  const options=topCreatureOrSpell1251(s,t,y).map(({c,face})=>opt(c.name+(c.type==='spell'?'を唱える':'を出す'),
   face,own.deck.length===1?-1000:c.type==='spell'?spellScore555(s,t,c):12+cost(c),y.cardId));
  if(options.length)choice(s,{...t,target:uid,serial:y.zoneSerial||0},'公開したカードを使う？',[...options,skip()]);
  break;
 }
 case'g34_MillHatch841':{
  const y=api.takeTop(s,t.p);
  if(y){clear(y,'grave');api.addZone(s,t.p,'grave',y);}
  api.deckCheck(s,t.p);
  if(y&&s.winner===null&&!api.deckWasShuffled1365(s,y)&&matches(s,t.p,y,t.filter)){
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
 case'g34_RoyalDevolve1705':{
  const rows=[s.active,1-s.active].flatMap(p=>creatures(s,p).filter(y=>!y.sealed&&!y.faceDown&&api.isEvolution(y))
   .map(y=>({player:p,uid:y.uid,to:'mana',cardOnly:true,toOwnerMana:true,controller:t.p})));
  if(rows.length)move(s,rows);
  break;
 }
 case'g34_BishamonCost1704':{
  const selected=t.selected||[],rows=own.grave.filter(y=>!selected.some(r=>r.uid===y.uid));
  if(selected.length===2){
   for(const r of selected)if(own.grave.some(y=>y.uid===r.uid&&(y.zoneSerial||0)===r.serial))zoneMove(s,t.p,'grave',r.uid,'deck',t);
   break;
  }
  if(selected.length+rows.length<2){start(s,t,[{op:'SelfDestroy'}]);break;}
  choice(s,{...t,selected},'山札の下に置く墓地のカードを2枚選ぶ（選ばなければこのクリーチャーを破壊）',[
   ...rows.map(y=>opt(card(y).name,{uid:y.uid,serial:y.zoneSerial||0},10-cost(card(y)),y.cardId)),skip()
  ]);
  break;
 }
 case'g34_BothShieldTop1703':
  start(s,t,[s.active,1-s.active].map(p=>({op:'ShieldTop',p,n:t.n,g779Simultaneous:true})));
  break;
 case'g34_SpikeModes1702':
  start(s,t,creatures(s,t.p).filter(y=>!y.sealed&&!y.faceDown).map(y=>({op:'SpikeMode1702',target:y.uid,targetIncarnation:y.incarnation||0})));
  break;
 case'g34_SpikeMode1702':{
  const y=own.battle.find(y=>y.uid===t.target&&(y.incarnation||0)===t.targetIncarnation&&!y.sealed&&api.isCreature(s,y));
  if(y)choice(s,t,card(y).name+'が得る能力を選ぶ',[opt('パワー+5000・シールドをさらに1つブレイク',0,10,y.cardId),opt('パワー+2000・アンタップしているクリーチャーを攻撃できる',1,8,y.cardId)]);
  break;
 }
 case'g34_QueenSearch1701':{
  const ids=look(s,{...t,n:own.deck.length}),rows=own.deck.filter(y=>ids.includes(y.uid)&&queenCandidate1701(y));
  if(ids.length)choice(s,{...t,...deckPeek841(own,ids),ids},'山札から手札に加えて使うコスト6以下のクリーチャーではないカードを選ぶ（任意）',[
   ...rows.map(y=>opt(card(y).name,y.uid,15+Math.max(...faces(card(y)).map(cost)),y.cardId)),skip()
  ]);
  else{api.shuffleLibrary(s,t.p,[],t.source);api.deckCheck(s,t.p);}
  break;
 }
 case'g34_SelfManaEvolution1701':{
  const host=sourceHost474(s,t)?.x,rows=own.mana.filter(y=>manaEvolution1701(s,t.p,host,y,t.max));
  if(rows.length)choice(s,t,'攻撃中のこのクリーチャーの上に進化させるマナのクリーチャーを選ぶ（任意）',[
   ...rows.map(y=>opt(card(y).name,{uid:y.uid,serial:y.zoneSerial||0},20+cost(card(y)),y.cardId)),skip()
  ]);
  break;
 }
 case'g34_OrochiReveal1817':{
  const ids=look(s,{...t,n:own.deck.length,public:true,g1603UntilFilter:{creature:true,nonEvolution:true}}),last=ids.at(-1),
   found=last&&own.deck.find(x=>x.uid===last&&card(x).type==='creature'&&!card(x).evolution);
  const g1660PublicPeek=own.deck.filter(x=>ids.includes(x.uid)).map(x=>({id:x.cardId,label:'公開した山札'}));
  if(found)release(s,t.p,found.uid);
  start(s,t,[...(found?[{op:'Put',origin:'deck',target:found.uid,execution:false,g1660PublicPeek}]:[]),
   {op:'LookRest530',ids:ids.filter(uid=>uid!==found?.uid),rest:'bottom',g1660PublicPeek}]);
  break;
 }
 case'g34_AuraGraveUse1816':
  (s.extLimits??=[]).push({kind:'g1816AuraGraveUse',player:t.p,expires:'end',who:s.active,
   refs:own.grave.filter(x=>card(x).type==='aura').map(x=>({uid:x.uid,serial:x.zoneSerial||0})),
   spellCost:cost(faces(card(t.source)).at(-1)),spellSource:t.source});
  break;
 case'g34_RabbitDraw1816':if(t.creature)api.draw(s,t.p,1);break;
 case'g34_PrinceDestroy1815':{
  const host=sourceHost474(s,t.g1815Subject);
  if(!host||host.p!==t.p||host.x.sealed||!api.isCreature(s,host.x))break;
  start(s,t,[{op:'ExactMove',owner:t.p,target:host.x.uid,targetIncarnation:host.x.incarnation||0,
   to:'grave',optional:true,afterAttempt:[{op:'PrinceReveal1815',g1815Colors:colors(effective(host.x,s,true))}]}]);
  break;
 }
 case'g34_PrinceReveal1815':{
  const [uid]=look(s,{...t,n:1,public:true}),y=own.deck.find(x=>x.uid===uid);
  if(!y)break;
  release(s,t.p,uid);
  const c=card(y);
  if(c.type==='creature'&&colors(c).some(color=>t.g1815Colors.includes(color)))
   start(s,t,[{op:'Put',origin:'deck',target:uid,execution:false}]);
  else zoneMove(s,t.p,'deck',uid,'hand',t);
  api.deckCheck(s,t.p);
  break;
 }
 case'g34_SearchCast1641':{
  const ids=look(s,{...t,n:own.deck.length}),options=ids.flatMap(uid=>{
   const y=own.deck.find(y=>y.uid===uid);
   return faces(card(y)).flatMap((c,face)=>c.type===t.kind&&cost(c)<=4&&api.canExecuteUnpaid(s,t.p,c)&&api.canCast(s,t.p,c,'deck')&&
    (c.type==='spell'||api.canEnter(s,t.p,c,{origin:'deck',execution:true}))?
    [opt(c.name,{uid,face},cost(c)+10,y.cardId)]:[]);
  });
  if(ids.length)choice(s,{...t,...deckPeek841(own,ids),ids},t.kind==='spell'?'山札から唱えるコスト4以下の呪文を選ぶ（任意）':'山札からジェネレートするコスト4以下のクロスギアを選ぶ（任意）',[...options,skip()]);
  break;
 }
 case'g34_SearchZones1633':{
  const ids=look(s,{...t,n:own.deck.length});
  put(s,{...t,...deckPeek841(own,ids),op:'g34_Select',deploy:true,optional:true,
   selected:[],rows:[],g530Ids:ids,g1633ExtraOrigins:t.zones.filter(z=>z!=='deck'),
   after:[{op:'LookRest530',ids,rest:'shuffle'}]});
  break;
 }
 case'g34_AcidDeploy1114':{
  const ids=look(s,{...t,n:own.deck.length});
  const {g1114AcidDeploy,...next}=t;
  put(s,{...next,...deckPeek841(own,ids),op:'g34_Select',zones:['hand','deck'],deploy:true,optional:true,
   selected:[],rows:[],g530Ids:ids,g1114HandAndDeck:true,filter:{creature:true,max:7,noColor:true},
   title:'手札または山札から出す、コスト7以下の無色クリーチャーを選ぶ',
   after:[{op:'LookRest530',ids,rest:'shuffle'}]});
  break;
 }
 case'g34_RevealDeployOrGrave1285':{
  const [uid]=look(s,{...t,n:1,public:true});
  const top=own.deck.find(x=>x.uid===uid);
  if(!top)break;
  release(s,t.p,uid);
  if(matches(s,t.p,top,t.filter))put(s,{...t,op:'g34_Put',origin:'deck',target:uid});
  else{zoneMove(s,t.p,'deck',uid,'grave',t);api.deckCheck(s,t.p);}
  break;
 }
 case'g34_LookDeploy530':{
  const ids=look(s,t.g201Search?{...t,n:own.deck.length}:t);
  let eligible=ids;
  if(t.g798DifferentCost!==undefined){
   const costs=new Set(creatures(s,t.p).filter(x=>!x.sealed).map(x=>cost(api.zoneCard(s,t.p,x,'battle'))));
   eligible=own.deck.filter(x=>ids.includes(x.uid)&&matches(s,t.p,x,{creature:true,max:t.g798DifferentCost})&&!costs.has(cost(api.zoneCard(s,t.p,x,'deck')))).map(x=>x.uid);
  }
  const rest=t.g798DifferentCost!==undefined?{op:'Distribute255',ids,rest:'grave'}:{op:'LookRest530',ids,rest:t.rest||'top',...(t.restTapped?{restTapped:true}:{})};
  const inspection=t.g1660PublicReveal?{g1660PublicPeek:own.deck.filter(x=>ids.includes(x.uid)).map(x=>({id:x.cardId,label:'公開した山札'}))}:t.g841DeckPeek?deckPeek841(own,ids):{};
  put(s,{...t,...inspection,op:'g34_Select',origin:'deck',g530Ids:eligible,deploy:true,n:t.limit??'all',optional:!t.g749Required,
   title:t.title||'確認したカードから出すクリーチャーを選ぶ',after:[rest]});
  break;
 }
 case'g34_LookRest530':
  if(t.rest==='shields'){
   // Only inspected cards still in the library can become shields (QA 47059).
   for(const uid of t.ids){
    release(s,t.p,uid);
    if(own.deck.some(x=>x.uid===uid))api.shieldTop(s,t.p,card(t.source),null,{uid});
   }
  }else put(s,{...t,op:'g34_Order',rest:t.rest||'top',g259OrderTop:true,ordered:[]});
  break;
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
 case'g34_DoubleRaid1206':{
  const ids=look(s,{...t,n:6});
  if(ids.length)put(s,{...t,op:'g34_DoubleRaidPick',ids,selected:[],...deckPeek841(own,ids)});
  break;
 }
 case'g34_DoubleRaidPick':raid764.doubleSelect(s,t);break;
 case'g34_DoubleRaidUse':raid764.doubleUse(s,t);break;
 case'g34_RaidPick':return raid764.run(s,t);
 case'g34_Psychedelica997':{
  const ids=look(s,t),options=own.deck.filter(y=>ids.includes(y.uid)).flatMap(y=>
   faces(card(y)).flatMap((face,i)=>face.type==='spell'?[opt(face.name,{uid:y.uid,face:i},-cost(face),y.cardId)]:[]));
  if(options.length)choice(s,{...t,op:'g34_PsychedelicaPick997',p:1-t.p,deckOwner:t.p,ids},
   '相手が唱える公開された呪文を1枚選ぶ',options);
  else put(s,{...t,op:'g34_Order',ids,rest:'bottom',ordered:[]});
  break;
 }
 case'g34_PsychedelicaCast997':{
  const {uid,face}=t.selected,y=own.deck.find(x=>x.uid===uid),spell=y&&faces(card(y))[face];
  release(s,t.p,uid);
  if(spell?.type==='spell'&&api.canCast(s,t.p,spell,'deck'))
   cast(s,t.p,uid,true,null,face,null,'deck','スペルサイケデリカ');
  break;
 }
 case'g34_Ryuo996':{
  const ids=look(s,t),eligible=own.deck.filter(y=>ids.includes(y.uid)&&matches(s,t.p,y,{g228Face:{type:'creature',color:'火'}}));
  if(eligible.length)choice(s,{...t,ids},'公開する火のクリーチャーを1体選ぶ',
   eligible.map(y=>opt(card(y).name,y.uid,10+cost(card(y)),y.cardId)));
  else put(s,{...t,op:'g34_Order',ids,rest:'shuffle'});
  break;
 }
 case'g34_RyuoFinish996':{
  if(t.revealed&&ownCondition(s,t.p,{g267Mana:{color:'火',n:5}}))
   zoneMove(s,t.p,'deck',t.revealed,'hand',t);
  put(s,{...t,op:'g34_Order',rest:'shuffle'});
  break;
 }
 case'g34_RevealToMana1013':{
  const ids=look(s,{...t,n:own.deck.length,public:true,g1013ThroughNonMulti:true});
  if(!ids.length)break;
  for(const uid of ids)release(s,t.p,uid);
  moveZoneSelection583(s,{...t,origin:'deck',to:api.deckDestination1365(s,t.p,'mana',api.deckRedirect(s,t.p)?'grave':'mana')},ids.map(uid=>({uid})));
  api.deckCheck(s,t.p);
  break;
 }
 case'g34_NeoWave1726':{
  const ids=look(s,{...t,n:3,public:true});
  const refs=own.deck.filter(x=>ids.includes(x.uid)).map(x=>({uid:x.uid,serial:x.zoneSerial||0}));
  put(s,{...t,op:'g34_Execute',origin:'deck',spellOnly:true,trigger:true,optional:true,g1616Refs:refs,g1726WaveRefs:refs,g1726Prior:s.effectSerial||0,
   g1660PublicPeek:own.deck.filter(x=>ids.includes(x.uid)).map(x=>({id:x.cardId,label:'公開した山札'})),
   g408Decline:[{op:'NeoWaveRest1726',refs}],title:'公開したS・トリガー呪文を1枚ずつ唱える（任意）'});
  break;
 }
 case'g34_NeoWaveRest1726':{
  const ids=t.refs.filter(r=>own.deck.some(x=>x.uid===r.uid&&(x.zoneSerial||0)===r.serial)).map(r=>r.uid);
  for(const r of t.refs)if(!ids.includes(r.uid))release(s,t.p,r.uid);
  put(s,{...t,op:'g34_Order',ids,rest:'bottom',ordered:[]});break;
 }
 case'g34_DrumSpirit1718':{
  const host=sourceHost474(s,t)?.x;
  const names=host&&!host.sealed&&api.isCreature(s,host)?battleNames676(s,host):t.g399Attacker?.g1081Names||[];
  start(s,t,[{op:'LookDeploy530',g201Search:true,g841DeckPeek:true,limit:1,rest:'shuffle',
   ...(t.tapped?{tapped:true}:{}),filter:{creature:true,...(t.g1726Copy?{}:{nonEvolution:true}),any:names.map(g201ExactName=>({g201ExactName}))}}]);
  break;
 }
 case'g34_BioKAttackerSearch1081':{
  const attacker=own.battle.find(y=>y.uid===s.attack?.attacker&&!y.sealed);
  const names=attacker?attackNames1081(s,attacker):t.g399Attacker?.g1081Names||[];
  start(s,t,[{op:'Look',g201Search:true,g841DeckPeek:true,rest:'shuffle',stages:[
   {n:1,to:'hand',reveal:true,filter:{creature:true,any:names.map(name=>({g201ExactName:name}))},g1081ConfirmEmpty:true}
  ]}]);
  break;
 }
 case'g34_PaidTop1164':{
  const ids=look(s,{...t,n:1});
  const top=own.deck.find(y=>y.uid===ids[0]);
  if(!top)break;
  const options=faces(card(top)).flatMap((face,i)=>{
   if(!['spell','creature'].includes(face.type)||!api.canCast(s,t.p,face,'deck'))return [];
   const creature=face.type==='creature';
   if(creature&&!api.canEnter(s,t.p,face,{origin:'deck',execution:true}))return [];
   const bases=creature&&(face.evolution||face.neoEvolution)
    ?api.evolutionBases(s,t.p,face,{origin:'deck',execution:true,exclude:top.uid}):[];
   const targets=!creature||!face.evolution||face.neoEvolution?[null,...bases]:bases;
   return targets.filter(base=>api.canPay(s,t.p,{...face,executionUid:top.uid,summonOrigin:'deck',g27BaseUid:base?.uid??null}))
    .map(base=>opt(face.name+(base?'を'+card(base).name+'に重ねる':creature?'を召喚する':'を唱える'),
     {face:i,baseUid:base?.uid??null},own.deck.length<=1?-100:10,top.cardId));
  });
  choice(s,{...t,...deckPeek841(own,ids),target:top.uid},'山札の上のカードをコストを支払って使う？',[...options,skip()]);
  break;
 }
 case'g34_SearchSharedRaceEvolution1184':{
  const host=sourceHost474(s,t);
  const races=host&&!host.x.sealed?exactRaces(effective(host.x,s)):t.g1184LastRaces??exactRaces(card(t.source));
  start(s,t,[{op:'Look',g201Search:true,g841DeckPeek:true,rest:'shuffle',stages:[
   {n:1,to:'hand',reveal:true,optional:true,g1081ConfirmEmpty:true,
    filter:{creature:true,evolution:true,any:races.map(g724ExactRace=>({g724ExactRace}))}}
  ]}]);
  break;
 }
 case'g34_LookSameCosts1622':{
  const ids=look(s,{...t,n:t.n??3}),rows=own.deck.filter(y=>ids.includes(y.uid));
  if(!rows.length)break;
  const costs=rows.map(y=>new Set(faces(api.zoneCard(s,t.p,y,'deck')).map(c=>cost(c))));
  const same=[...costs[0]].some(n=>costs.every(set=>set.has(n)));
  if(same)choice(s,{...t,...deckPeek841(own,ids),ids},'確認したカードを公開し、すべて手札に加える？',[
   opt('公開してすべて手札へ',true,rows.length>=own.deck.length?-1000:rows.length*12),skip()
  ]);
  else put(s,{...t,...deckPeek841(own,ids),op:'g34_Order',ids,rest:'top',g259OrderTop:true,ordered:[]});
  break;
 }
 case'g34_Look':{if(t.g201Search)t={...t,n:own.deck.length};let ids;if(!t.g467RequireLook&&t.stages?.some(q=>q.g467Destinations&&!q.filter)&&api.deckLocked(s,t.p)){t={...t,g467Blind:true};const skip=reserved(own);ids=own.deck.filter(x=>!skip.has(x.uid)).slice(0,t.n).map(x=>x.uid);(own.g34Protected??=[]).push(...ids);}else ids=look(s,t);
  if(t.g1164Miss&&ids.length&&!own.deck.some(y=>ids.includes(y.uid)&&matches(s,t.p,y,t.stages[0].filter)))
   t={...t,after:t.g1164Miss};
  const inspection=t.g1660PublicReveal?{g1660PublicPeek:own.deck.filter(x=>ids.includes(x.uid)).map(x=>({id:x.cardId,label:'公開した山札'}))}:t.g841DeckPeek?deckPeek841(own,ids):{};
  put(s,{...t,...inspection,op:'g34_LookPick',ids,stage:0,chosen:[]});
  break;
 }
 case'g34_RevealSplit1257':{
  const ids=look(s,{...t,public:true});
  if(ids.length)put(s,{...t,op:'g34_SplitPile1257',ids,first:[]});
  break;
 }
 case'g34_SplitPile1257':{
  const rows=t.ids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(Boolean);
  const remaining=rows.filter(x=>!t.first.includes(x.uid));
  const goal=Math.floor(rows.length/2);
  if(!remaining.length){put(s,{...t,op:'g34_ChoosePile1257'});break;}
  choice(s,t,'束Aに入れるカードを選ぶ（'+t.first.length+'枚）。残りは束Bになる',[
   ...remaining.map(x=>opt(card(x).name+'を束Aへ',x.uid,t.first.length<goal?10:-5,x.cardId)),
   opt('2つの束を確定',null,t.first.length>=goal?10:0)
  ],1-t.p);
  break;
 }
 case'g34_ChoosePile1257':{
  const rows=t.ids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(Boolean);
  const piles=[rows.filter(x=>t.first.includes(x.uid)),rows.filter(x=>!t.first.includes(x.uid))];
  choice(s,t,'手札に加える束を選ぶ。もう一方は墓地へ',piles.map((xs,i)=>
   opt('束'+(i?'B':'A')+'：'+(xs.map(x=>card(x).name).join('・')||'0枚'),i,xs.length*10,xs[0]?.cardId)));
  break;
 }
 case'g34_Distribute255':distribute255(s,t);break;
 case'g34_LookPick':{const xs=t.ids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(Boolean),stages=t.stages||[],stage=stages[t.stage];
  if(t.g940SplitTop){
   const ordered=t.chosen||[],remaining=xs.filter(y=>!ordered.includes(y.uid));
   if(!remaining.length||ordered.length===stage.n){
    put(s,{...t,op:'g34_Order',ids:[],ordered,rest:'top',g259OrderTop:true,
     after:[{op:'Order',ids:remaining.map(y=>y.uid),rest:'bottom',ordered:[]}]});
    break;
   }
  }
  if(!stage){
   if(t.rest==='keep'){
    for(const uid of t.ids)release(s,t.p,uid);
    if(t.after)start(s,t,t.after);
    api.deckCheck(s,t.p);
    break;
   }
   if(t.rest==='topAndBottom'){
    const ids=xs.map(x=>x.uid);
    for(const uid of ids)release(s,t.p,uid);
    (own.g33Protected??=[]).push(...ids);
    put(s,{...t,op:'g33_Order',ids,top:[],bottom:[]});
    break;
   }
   if(t.g791OrderRest)distribute255(s,{...t,ids:[]});
   if(s.winner===null)put(s,{...t,op:t.g255Distribute&&!t.g791OrderRest?'g34_Distribute255':'g34_Order',ids:xs.map(x=>x.uid),ordered:[],after:t.after});
   break;
  }
  const underHost=stage.g1801Under?sourceHost474(s,t):null;
  const blocked=stage.g657FaceUp&&stage.to==='shields'&&!api.canAddShield(s,t.p)||stage.g1801Under&&
   (!underHost||underHost.x.sealed||!api.isCreature(s,underHost.x)||!api.canMoveZone(s,t.p,'deck'));
  const selected=blocked?[]:t.chosen||[];
  let rows=blocked?[]:xs.filter(y=>!selected.includes(y.uid)&&matches(s,t.p,y,stage.filter));
  if(stage.g1830DistinctRaces)rows=rows.filter(y=>distinctRaces1830([...xs.filter(x=>selected.includes(x.uid)),y]));
  if(stage.g1658DistinctNames&&selected.length){
   const names=new Set(xs.filter(y=>selected.includes(y.uid)).map(y=>exactName(creatureFaceName(card(y)))));
   rows=rows.filter(y=>!names.has(exactName(creatureFaceName(card(y)))));
  }
  if(t.g1658SoulTop&&(selected.length>=stage.n||!rows.length)){
   const top=selected.map(uid=>remove(own.deck,uid)).filter(Boolean);
   for(const y of top)api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(y).name,{cardId:y.cardId});
   for(const uid of t.ids)release(s,t.p,uid);
   api.shuffleLibrary(s,t.p);
   for(const y of top)delete y.g11Sideways;
   own.deck.push(...top);
   put(s,{...t,op:'g34_Order',ids:top.map(y=>y.uid),rest:'top',g259OrderTop:true,ordered:[]});
   break;
  }
  if(stage.g994DistinctCreatureCosts&&selected.length){
   const creatureCost=y=>cost(faces(card(y)).find(face=>face.type==='creature'));
   const selectedCosts=new Set(xs.filter(y=>selected.includes(y.uid)).map(creatureCost));
   rows=rows.filter(y=>!selectedCosts.has(creatureCost(y)));
  }
  if(stage.g1081ConfirmEmpty&&stage.n!==0&&!rows.length&&!selected.length&&t.g585Peek?.length){
   choice(s,t,'確認した山札をシャッフルする',[opt('確認を終える',null,0)]);
   break;
  }
  if(stage.optional&&stage.n!==0&&!rows.length&&!selected.length&&xs.length===1&&t.g585Peek?.length){
   choice(s,t,'確認したカード',[opt('確認を終える',null,0)]);
   break;
  }
  if(t.g1163TopAfterShuffle&&(selected.length>=stage.n||!rows.length)){
   const cardOnTop=selected.length?remove(own.deck,selected[0]):null;
   if(cardOnTop)api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(cardOnTop).name,{cardId:cardOnTop.cardId});
   for(const uid of t.ids)release(s,t.p,uid);
   api.shuffleLibrary(s,t.p);
   if(cardOnTop){delete cardOnTop.g11Sideways;own.deck.unshift(cardOnTop);}
   api.deckCheck(s,t.p);
   break;
  }
  if(stage.allMatches&&rows.length){put(s,{...t,chosen:[...selected,...rows.map(y=>y.uid)]});break;}
  if(stage.g424AllOrNone&&rows.length){choice(s,{...t,op:'g34_LookAll424',g424Ids:rows.map(y=>y.uid)},'条件に合うカードをすべて手札に加える？',[opt('すべて手札に加える',true,rows.length>=own.deck.length?-1000:rows.reduce((n,y)=>n+10+cost(card(y)),0),rows[0].cardId),skip()]);break;}if(stage.g467Destinations&&!selected.length&&stage.n===1&&rows.length===1&&!stage.optional){put(s,{...t,chosen:[rows[0].uid]});break;}if(selected.length>=(stage.n==='all'?Infinity:stage.n)||!rows.length){const moved=selected.filter(uid=>own.deck.some(x=>x.uid===uid));if(stage.g467Destinations&&!stage.g467Chosen&&moved.length){put(s,{...t,op:'g34_LookDestination467'});break;}if(t.g255Distribute){put(s,{...t,ids:t.ids.filter(uid=>!moved.includes(uid)),stage:t.stage+1,chosen:[],g255Plans:[...(t.g255Plans||[]),...moved.map(uid=>({uid,to:stage.to,...(stage.reveal?{reveal:true}:{}),...(stage.tapped?{tapped:true}:{}),...(stage.tapMulticolor?{tapMulticolor:true}:{})}))]});break;}let after=t.after;
   for(const uid of moved){
    const y=own.deck.find(x=>x.uid===uid),follow=stage.g1265RevealedPowerAfterOrder;
    // The power is read while the card is revealed in the library, before its move.
    const powerMatches=follow&&y&&api.revealedPower(y,s)>=follow.min;
    if((stage.reveal||t.g443PublicIds?.includes(uid))&&y)api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(y).name,{cardId:y.cardId});
    let transferred;
    if(stage.g1801Under){
     const destination=api.deckDestination1365(s,t.p,'under');
     const selectedCard=remove(own.deck,uid);
     release(s,t.p,uid);
     if(selectedCard){
      if(destination!=='under')api.addAfterDeckReplacement1365(s,t.p,destination,selectedCard);
      else{clear(selectedCard,'under');(underHost.x.under??=[]).push(selectedCard);transferred=true;}
     }
    }else transferred=zoneMove(s,t.p,'deck',uid,stage.to,{...t,tapped:stage.tapped||stage.tapMulticolor&&api.manaColors(card(y)).length>1,g657FaceUp:stage.g657FaceUp??t.g657FaceUp});
    if(powerMatches&&transferred&&own[stage.to].some(x=>x.uid===uid))after=[...(after||[]),...follow.defs];
   }
   put(s,{...t,ids:t.ids.filter(uid=>!moved.includes(uid)),stage:t.stage+1,chosen:[],...(after!==t.after?{after}:{}),moved:(t.moved||0)+moved.length});break;
  }
  choice(s,t,stage.title||(stage.g467Destinations?'移動するカードを1枚選ぶ':null)||('山札から'+(stage.n==='all'?'条件に合うカード':stage.n+'枚')+'を'+({hand:'手札',mana:'マナ',grave:'墓地',shields:'シールド'}[stage.to]||stage.to)+'へ'),[...rows.map(y=>opt(t.g467Blind?'山札の上から'+(t.ids.indexOf(y.uid)+1)+'枚目（裏向き）':card(y).name,y.uid,t.g467Blind?0:stage.g1660OpponentChooses?-10-cost(card(y)):t.g323Scry?scryScore323(s,t,y):t.g255Search&&stage.optional&&selected.length+1>=own.deck.length?-1000:t.g200Search&&stage.to==='hand'&&selected.length+1>=own.deck.length?-1000:t.g185Search&&stage.to==='hand'&&own.deck.length===1?-1000:stage.to==='grave'||t.g200Search&&stage.to==='deck'?-cost(card(y)):10+cost(card(y)),t.g467Blind?undefined:y.cardId)),...(stage.optional?[skip()]:[])],stage.g1660OpponentChooses?1-t.p:t.p);break;}
 case'g34_Order':{const ids=t.ids.filter(uid=>own.deck.some(x=>x.uid===uid));if(t.rest==='randomBottom1520'){const rest=ids.map(uid=>{release(s,t.p,uid);return remove(own.deck,uid);}).filter(Boolean);for(const y of rest)delete y.g11Sideways;if(rest.length)own.deck.push(...api.shuffled(rest,Math.floor(api.random(s)*4294967296)));if(t.after)start(s,t,t.after);api.deckCheck(s,t.p);break;}if(t.rest==='shuffle'){for(const uid of ids)release(s,t.p,uid);api.shuffleLibrary(s,t.p);if(t.after)start(s,t,t.after);api.deckCheck(s,t.p);break;}if(t.rest==='top'){if(t.g259OrderTop&&ids.length>1){choice(s,{...t,ids},'山札の上から置く順序を選ぶ',ids.map(uid=>opt(card(own.deck.find(x=>x.uid===uid)).name,uid,0,own.deck.find(x=>x.uid===uid).cardId)));break;}const xs=(t.g259OrderTop?[...(t.ordered||[]),...ids]:ids).map(uid=>remove(own.deck,uid)).filter(Boolean);for(const uid of t.g259OrderTop?[...(t.ordered||[]),...ids]:ids)release(s,t.p,uid);own.deck.unshift(...xs);if(t.after)start(s,t,t.after);api.deckCheck(s,t.p);break;}if(t.rest==='grave'||t.rest==='mana'||t.rest==='hand'){for(const uid of ids)zoneMove(s,t.p,'deck',uid,t.rest,{...t,tapped:!!t.restTapped});if(t.after)start(s,t,t.after);api.deckCheck(s,t.p);break;}if(ids.length>1)choice(s,{...t,ids},'残りを山札の下に置く順序を選ぶ',ids.map(uid=>{const y=own.deck.find(x=>x.uid===uid);return opt(card(y).name,uid,0,y.cardId);}));else{for(const uid of [...(t.ordered||[]),...ids]){const y=remove(own.deck,uid);release(s,t.p,uid);if(y)own.deck.push(y);}if(t.after)start(s,t,t.after);api.deckCheck(s,t.p);}break;}
 // Movement uses the normal ramp replacements; the second card never repeats the test.
 case'g34_RampMatch516':{const y=api.takeTop(s,t.p);if(!y){api.deckCheck(s,t.p);break;}const dest=api.deckDestination1365(s,t.p,'mana',api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana');clear(y,dest);if(dest==='mana')y.tapped=true;api.addZone(s,t.p,dest,y);const matched=!api.deckWasShuffled1365(s,y)&&matches(s,t.p,y,t.filter);api.deckCheck(s,t.p);if(s.winner===null)start(s,t,[...(matched?[{op:'Ramp',n:1,tapped:true}]:t.elseDraw?[{op:'Draw',n:1}]:[]),...(t.after||[])]);break;}
 case'g34_CreatureCountRamp765':{
  const count=countDraw(s,t.p,{...t,zone:'battle'});
  if(!count)break;
  if(t.optional)start(s,t,[{op:'Ramp',n:count,optional:true,tapped:t.tapped,g809Together:t.g809Together}]);
  else ramp(s,t,count);
  break;
 }
 case'g34_EachManaDeploy1589':
  put(s,...[t.p,1-t.p].map(player=>task('g34_Select',player,t.source,{
   origin:'mana',n:1,deploy:true,filter:{creature:true},
   controller:t.controller??t.p
  })));
  break;
 case'g34_BlackSlayer1683':
  (s.extLimits??=[]).push({kind:'g1683BlackSlayer',player:t.p,source:t.source,expires:'end',who:s.active});
  break;
 case'g34_Roto1683':{
  const p=1-t.p;
  put(s,{...t,p,controller:t.controller??t.p,op:'g34_RotoReveal1683'});break;
 }
 case'g34_GyurumReveal1701':
 case'g34_RotoReveal1683':{
  const gyurum=t.op==='g34_GyurumReveal1701';
  const filter={creature:true,...(!gyurum?{nonEvolution:true}:{})},ids=look(s,{...t,n:own.deck.length,public:true,g1603UntilFilter:filter}),last=ids.at(-1),found=own.deck.find(x=>x.uid===last);
  const hit=found&&matches(s,t.p,found,filter);
  if(hit)release(s,t.p,last);
  start(s,t,[...(hit?[{op:'Put',origin:'deck',target:last,noEvolve:!gyurum}]:[]),
   {op:'Order',ids:ids.filter(uid=>!hit||uid!==last),rest:'bottom',ordered:[]}]);
  break;
 }
 case'g34_Patrol1683':
  choice(s,t,'シールドを山札に戻して置き直すプレイヤーを選ぶ',[
   opt('自分',t.p,own.shields.length?0:1),opt('相手',1-t.p,opp.shields.length?0:1)]);break;
 case'g34_PatrolMove1683':{
  const target=s.players[t.owner],follow={...t,op:'g34_PatrolRefill1683',count:target.shields.length};
  api.moveShields(s,t.owner,target.shields.map(api.shieldGroup),'deck');
  if(!api.deferShieldMove1352(s,follow))put(s,follow);
  break;
 }
 case'g34_PatrolRefill1683':
  api.shuffleLibrary(s,t.owner,[],t.source);
  if(t.count)api.shieldTop(s,t.owner,card(t.source),null,{count:t.count});
  break;
 case'g34_DisMin1682':{
  const order=[s.active,1-s.active],chosen=t.chosen||[];
  if(chosen.length<order.length){
   const p=order[chosen.length];
   choice(s,t,'山札の上から1枚をタップしてマナに置きますか？',
    [...(api.hasAvailableDeckCard(s,p)?[opt('マナに置く',true,s.players[p].deck.length>1?5:-100)]:[]),opt('置かない',false,0)],p);
   break;
  }
  // QA44371: decide in turn order before moving either player's card.
  // Snapshot replacement destinations before this simultaneous movement.
  const rows=order.flatMap((p,i)=>chosen[i]?[{p,dest:api.deckDestination1365(s,p,'mana',api.deckRedirect(s,p)||api.manaRedirect(s,p)?'grave':'mana')}]:[]);
  for(const row of rows)row.x=api.takeTop(s,row.p);
  for(const {p,dest,x} of rows){if(!x)continue;clear(x,dest);if(dest==='mana')x.tapped=true;api.addZone(s,p,dest,x);}
  const opponentPlaced=rows.some(({p,dest,x})=>p!==t.p&&x&&dest==='mana'&&!api.deckWasShuffled1365(s,x)&&s.players[p].mana.some(y=>y.uid===x.uid));
  if(opponentPlaced)start(s,t,[{op:'Ramp',n:1,tapped:true}]);
  for(const {p,x} of rows)if(x)api.deckCheck(s,p);
  break;
 }
 case'g34_EachRamp1532':
  put(s,...[s.active,1-s.active].map(p=>({...t,op:'g34_Ramp',p,controller:t.controller??t.p})));
  break;
 case'g34_Ramp':
  if(t.optional)choice(s,t,'山札からマナに置く枚数を選ぶ',Array.from({length:Math.min(t.n,own.deck.length)+1},(_,n)=>opt(n+'枚',n,n<own.deck.length?n*5:-100)));
  else if(t.g1152CreatureCivilizations){
   const n=new Set(creatureCivilizations805(s).filter(row=>row.p===t.p).flatMap(row=>row.cs)).size;
   if(n)ramp(s,t,n);
  }else ramp(s,t,t.g935ManaCivilizations?manaCivilizationCount(s,t.p):t.n);
  break;
 case'g34_DrawAfterGear816':
  if(own.grave.some(y=>y.uid===t.target))start(s,t,[{op:'DrawUpTo',n:2}]);
  break;
 case'g34_DrawUpTo':if(t.n>0)choice(s,t,'あと'+t.n+'枚まで引けます。1枚引く？',[opt('1枚引く',true,t.g203Draw&&own.deck.length<=1&&creatures(s,t.p).some(y=>effective(y,s).shako)?1000:own.deck.length>1?10:-100),skip()]);break;
 case'g34_StartDraw729':{
  if(!t.sources.length){api.draw(s,t.p,t.n,t.drawOptions??{turnDraw:true});break;}
  const c=card(t.source);
  if(c.g948StartDrawMax){
   const options=Array.from({length:c.g948StartDrawMax+1},(_,n)=>
    opt(n+'枚多く引く',n,n===0?0:own.deck.length>t.n+n?10*n:-100,c.id));
   choice(s,t,c.name+'でターン開始のドローを何枚増やす？',options);
   break;
  }
  choice(s,t,c.name+'でターン開始のドローを1枚増やす？',[
   opt('1枚多く引く',true,own.deck.length>t.n+1?10:-100,t.source),skip()
  ]);
  break;
 }
 case'g34_DrawThenTop933':
  if(t.n>0){
   // Preserve only actual draws, after replacements have finished.
   put(s,{...t,n:t.n-1});
   api.draw(s,t.p,1,{drawn:t.drawn});
  }else if(t.drawn.length)put(s,{...t,op:'g52_TopHand',n:t.drawn.length,selected:[]});
  break;
 case'g34_WinOpponentGrave1530':if(s.players[1-t.p].grave.filter(x=>faces(api.zoneCard(s,1-t.p,x,'grave')).some(c=>c.type==='creature')).length>=t.n)api.finish(s,t.p,card(t.source).name+'：相手の墓地にクリーチャーが'+t.n+'体以上');break;
 case'g34_SelfSpellPut1529':{const i=(s.extSpells||[]).findIndex(f=>f.inst.uid===t.uid);if(i<0)break;const frame=s.extSpells[i];
  // Rule 409.1c: a resolving spell still belongs to the zone it was cast from.
  const origin=frame.spell?.summonOrigin||frame.origin||'hand';
  if(frame.virtual||!api.canEnter(s,t.p,card(frame.inst),{origin,execution:false}))break;s.extSpells.splice(i,1);enter(s,t.p,frame.inst,null,{origin,execution:false});if(t.delayed&&s.players[t.p].battle.some(x=>x.uid===frame.inst.uid))frame.inst.g34Delayed={turn:s.turn,to:t.delayed,source:t.source,controller:t.p};break;}
 case'g34_OjiCycle1528':api.discardSelected(s,t.p,own.hand.map(x=>x.uid),t.source,t.p,null,null,{...t,op:'g34_DrawAfterOji1528',g1528AllowZero:true});break;
 case'g34_BelowManaBounce1569':start(s,t,[{op:'Sweep',both:true,to:'hand',toOwnerHand:true,filter:{creature:true,belowCost:own.mana.length}}]);break;
 case'g34_DoubleShields1568':start(s,t,[{op:'ShieldTop',n:own.shields.length,g779Simultaneous:true}]);break;
 case'g34_HyackmeDiscard1568':api.discardSelected(s,t.p,own.hand.map(x=>x.uid),t.source,t.p,null,{...t,op:'g34_HyackmeAfter1568'});break;
 case'g34_HyackmeAfter1568':if(!t.discarded)start(s,t,[{op:'SelfDestroy'}]);break;
 case'g34_DrawAfterOji1528':start(s,t,[{op:'Draw',n:t.n+1}]);break;
 case'g34_DrawDiscardCount1235':{
  const n=discardCount1235(s,t.p);
  if(n)start(s,t,[{op:'Offer',title:'カードを'+n+'枚引く？',defs:[{op:'Draw',n}]}]);
  break;
 }
 case'g34_Fortune1694':{const ids=look(s,{...t,n:3,public:true});put(s,{...t,op:'g34_FortunePick1694',ids,selected:[],used:[]});break;}
 case'g34_FortunePick1694':{
  const rows=t.ids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(y=>y&&!t.selected.includes(y.uid));
  const options=rows.flatMap(y=>[...new Set(faces(card(y)).map(c=>c.type).concat(card(y).seedCreature||card(y).natureAce4?['seed']:[]))].filter(type=>!t.used.includes(type)).map(type=>opt(card(y).name+'（'+({creature:'クリーチャー',spell:'呪文',seed:'タマシード',field:'フィールド',gear:'クロスギア',aura:'オレガ・オーラ',duelist:'デュエリスト',land:'土地'}[type]||type)+'）',{uid:y.uid,type},15,y.cardId)));
  if(options.length)choice(s,t,'異なるカードタイプのカードを手札に加える（任意）',[...options,skip()]);
  else put(s,{...t,op:'g34_FortuneFinish1694'});break;
 }
 case'g34_FortuneFinish1694':{
  for(const uid of t.selected)zoneMove(s,t.p,'deck',uid,'hand',t);
  put(s,{...t,op:'g34_LookPick',ids:t.ids.filter(uid=>!t.selected.includes(uid)),stage:0,stages:[],rest:'bottom'});break;
 }
 case'g34_Jakon1694':{
  const selected=t.selected||[],rows=creatures(s,t.p).filter(y=>!y.sealed&&!y.faceDown&&!selected.some(r=>r.uid===y.uid));
  const options=targetOptions(s,t.p,rows).map(o=>({...o,value:{uid:o.value,incarnation:rows.find(y=>y.uid===o.value).incarnation||0}}));
  if(options.length)choice(s,{...t,selected},'同時に破壊する自分のクリーチャーを選ぶ（任意）',[...options,skip()]);
  else put(s,{...t,selected,op:'g34_JakonFinish1694'});break;
 }
 case'g34_JakonFinish1694':{
  const rows=t.selected.map(r=>own.battle.find(y=>y.uid===r.uid&&(y.incarnation||0)===r.incarnation&&!y.sealed&&api.isCreature(s,y))).filter(Boolean);
  if(rows.length)move(s,rows.map(y=>({player:t.p,uid:y.uid,to:'grave',destroy:true,controller:t.p})),{kind:'g865DrawDestroyed',player:t.p,source:t.source,drawMultiplier:2});break;
 }
 case'g34_SelfSpellShield1692':api.moveSpellShield1692(s,t.p,t.uid);break;
 case'g34_TuneAgain1692':choice(s,t,'持ち主の手札に戻すバトルゾーンのカードを1枚選ぶ',cardMoveOptions579(s,{...t,anyOwner:true,to:'hand'}));break;
 case'g34_TuneFollow1692':{
  const y=own.hand.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);
  if(y&&card(y).type==='creature'&&!api.isEvolution(y)&&colors(card(y)).includes('水')&&race(card(y),'ソニック・コマンド')&&canPut(s,t.p,y,'hand'))start(s,t,[{op:'Select',origin:'hand',n:1,deploy:true,optional:true,filter:{exactId:y.cardId},g530Ids:[y.uid]}]);
  break;
 }
 case'g34_Texas1692':choice(s,t,'山札の上に置いて戻す自分の非進化クリーチャーを1体選ぶ',targetOptions(s,t.p,creatures(s,t.p).filter(y=>!y.sealed&&!api.isEvolution(y))));break;
 case'g34_TexasAfter1692':{
  const y=own.deck[0];if(!y||y.uid!==t.target||(y.zoneSerial||0)!==t.serial)break;
  y.faceUp=true;api.log(s,t.p,'reveal',card(t.source).name+'で'+card(y).name+'を表向きの山札上に置いた',{cardId:y.cardId});
  start(s,t,[{op:'Put',origin:'deck',target:y.uid},{op:'TexasBreak1692',target:y.uid,expectedIncarnation:t.expectedIncarnation}]);break;
 }
 case'g34_TexasBreak1692':{
  const y=own.battle.find(x=>x.uid===t.target&&(x.incarnation||0)===t.expectedIncarnation&&!x.sealed&&api.isCreature(s,x));
  if(y)start(s,{...t,uid:y.uid,incarnation:y.incarnation||0,source:y.cardId},[{op:'Break497',n:1,g747CreatureBreak:true,g913DepartedBreaker:true}]);break;
 }
 case'g34_GigaReveal1691':{
  const ids=look(s,{...t,n:1,public:true}),y=own.deck.find(x=>ids.includes(x.uid));
  if(!y)break;
  if(!faces(card(y)).some(c=>c.d2Field||race(c,'イニシャルズ')||race(c,'ソニック・コマンド'))){release(s,t.p,y.uid);break;}
  const next={...t,op:'g34_GigaMove1691',target:y.uid};
  if(ownCondition(s,t.p,{g580D2Field:true})&&canPut(s,t.p,y,'deck'))choice(s,next,'公開したカードをバトルゾーンに出しますか？',[opt('バトルゾーンに出す',true,25,y.cardId),opt('手札に加える',false,5,y.cardId)]);
  else start(s,t,[{op:'Select',origin:'deck',to:'hand',n:1,optional:false,g530Ids:[y.uid]}]);
  break;
 }
 case'g34_FinaleBreak1690':{
  const selected=t.selected||[],rows=own.shields.filter(x=>!selected.includes(x.uid));
  if(rows.length)choice(s,{...t,selected},'ブレイクする自分のシールドを好きな数選ぶ（'+selected.length+'つ選択済み）',[...rows.map((x,i)=>opt('シールド '+(own.shields.indexOf(x)+1),x.uid,rows.length>2?5:-5)),skip()]);
  else if(selected.length)start(s,t,[{op:'Break497',owner:'self',n:selected.length,selected,g747CreatureBreak:true,g913DepartedBreaker:true}]);
  break;
 }
 case'g34_DrawAfterDiscard1689':api.draw(s,t.p,t.n+1);break;
 case'g34_SealAll1689':api.resolveForbiddenSeal(s,t.p);break;
 case'g34_Draw':
  if(used792(s,t,t))break;
  if(t.optional)choice(s,t,'カードを'+t.n+'枚まで引く',Array.from({length:t.n+1},(_,n)=>opt(n+'枚',n,n<own.deck.length?n*5:-100)));
  else{
   const drawn=api.draw(s,t.owner==='opponent'?1-t.p:t.p,t.n);
   if(t.g818AfterDraw&&drawn>0&&s.winner===null)start(s,t,t.g818AfterDraw);
  }
  break;
 // Use the same physical top-card selector as normal milling.
 case'g34_MillMatch520':{const y=api.takeTop(s,t.p);if(!y){api.deckCheck(s,t.p);break;}clear(y);api.addZone(s,t.p,'grave',y);const matched=!api.deckWasShuffled1365(s,y)&&matches(s,t.p,y,t.filter);api.deckCheck(s,t.p);if(s.winner!==null||!matched)break;if(t.defs){start(s,t,t.defs);break;}const host=sourceHost474(s,t);if(!host)break;const unit=host.x;if(t.untap){if(api.canUntap(unit)){const was=unit.tapped;unit.tapped=false;if(was)combined.untapped(s,host.p,unit);}}else{if(t.powerAttacker)(unit.powerModifiers??=[]).push({amount:t.powerAttacker,expires:'end',who:s.active,attackOnly:true,grantedAbility:true});if(t.breaker||t.unblockable||t.speedAttacker)(unit.g34Grants??=[]).push({turn:s.turn,...(t.breaker?{g313Breaker:t.breaker}:{}),...(t.unblockable?{unblockable:true}:{}),...(t.speedAttacker?{speedAttacker:true}:{})});}break;}
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
  if(amount)start(s,t,[{op:'SelfExtraBreak444',amount,...(t.g969FollowControl?{g969FollowControl:true}:{})}]);
  break;
 }
 case'g34_MillTapped782':{
  const n=Math.min(own.deck.length,creatures(s,t.p).filter(y=>!y.sealed&&y.tapped).length);
  if(n)choice(s,t,'山札の上から墓地に置く枚数を選ぶ',
   Array.from({length:n+1},(_,count)=>opt(count+'枚',count,count===own.deck.length?-100:count)));
  break;
 }
 case'g34_MillPerDragon1201':{
  const moved=api.mill(s,t.p,t.n,{together:true});
  if(s.winner!==null)break;
  const n=moved.filter(y=>own.grave.includes(y)&&matches(s,t.p,y,{anyFaceRace:'ドラゴン'})).length;
  if(n)start(s,t,[{op:'Select',origin:'battle',owner:'opponent',to:'grave',n,
   g173Targets:true,g193Select:true,filter:{creature:true},title:'同時に破壊する相手のクリーチャーを'+n+'体選ぶ'}]);
  break;
 }
 case'g34_MillTrigger1143':{
  const n=Math.min(own.deck.length,t.n);
  if(n)choice(s,t,'山札の上から墓地に置く枚数を選ぶ',
   Array.from({length:n+1},(_,count)=>opt(count+'枚',count,count===own.deck.length?-100:count)));
  break;
 }
 case'g34_MillThenDestroyByCost':{
  const top=api.takeTop(s,t.p);
  if(top){
   const costs=[...new Set(faces(card(top)).map(face=>cost(face)===Infinity?'∞':cost(face)))];
   clear(top,'grave');
   api.addZone(s,t.p,'grave',top);
   if(!api.deckWasShuffled1365(s,top))put(s,{...t,op:'g34_MilledCost',costs});
  }
  api.deckCheck(s,t.p);
  break;
 }
 case'g34_MilledCost':{
  if(t.costs.length===1)start(s,t,[{...t.target,filter:t.costs[0]==='∞'?{}:{max:t.costs[0]}}]);
  else choice(s,t,'墓地に置こうとしたカードのコストを選ぶ',t.costs.map(n=>opt('コスト'+n,n,n==='∞'?100:n)));
  break;
 }
 case'g34_EachMill1534':
  put(s,...[s.active,1-s.active].map(p=>({...t,op:'g34_Mill',p,controller:t.controller??t.p})));
  break;
 case'g34_NexusMill1820':{
  const moved=api.mill(s,t.p,4,{together:true})||[];
  if(s.winner!==null)break;
  const rows=moved.filter(y=>own.grave.includes(y)),refs=rows.map(y=>({uid:y.uid,serial:y.zoneSerial||0}));
  // Rule 202.7: each physical twinpact can supply either one of its two names.
  const names=rows.map(y=>[...new Set(faces(card(y)).map(c=>exactName(creatureFaceName(c))))]);
  const distinct=(i,used)=>i===names.length||names[i].some(name=>!used.includes(name)&&distinct(i+1,[...used,name]));
  const recover={op:'NexusRecover1820',refs};
  if(distinct(0,[]))start(s,t,[{op:'Execute',origin:'grave',max:7,optional:true,g1616Refs:refs,g408Decline:[recover]}]);
  else start(s,t,[recover]);
  break;
 }
 case'g34_NexusRecover1820':{
  const rows=api.canMoveZone(s,t.p,'grave')?t.refs.flatMap(r=>{
   const y=own.grave.find(y=>y.uid===r.uid&&(y.zoneSerial||0)===r.serial);
   return y?[opt(card(y).name,r,10+cost(card(y)),y.cardId)]:[];
  }):[];
  if(rows.length)choice(s,{...t,op:'g34_MillSequence1616',g1785PureRecovery:true},'今墓地に置いたカードを1枚まで手札に戻す',[...rows,skip()]);
  break;
 }
 case'g34_MillSequence1616':{
  const moved=api.mill(s,t.p,t.n,{together:true})||[];
  const refs=moved.filter(y=>own.grave.includes(y)).map(y=>({uid:y.uid,serial:y.zoneSerial||0}));
  if(s.winner!==null)break;
  if(t.recover){
   const options=api.canMoveZone(s,t.p,'grave')?refs.filter(r=>{const y=own.grave.find(y=>y.uid===r.uid&&(y.zoneSerial||0)===r.serial);return y&&matches(s,t.p,y,t.filter);}).map(r=>{const y=own.grave.find(y=>y.uid===r.uid);return opt(card(y).name,r,10+cost(card(y)),y.cardId);}):[];
   choice(s,{...t,refs},t.g1785PureRecovery?'今墓地に置いたカードから手札に戻すカードを1枚まで選ぶ':'今墓地に置いたカードを選び「このカード、気にいったぜ！」と言う？',[...options,skip()]);
  }else start(s,t,[{op:'Execute',origin:'grave',spellOnly:true,optional:true,g1616Refs:refs,
   ...(t.max!==undefined?{max:t.max}:{}),...(t.spellColorsAny?{spellColorsAny:t.spellColorsAny}:{}),...(t.filter?{filter:t.filter}:{})}]);
  break;
 }
 case'g34_PsychicMill1734':{
  if(!t.accepted){
   choice(s,t,'山札の上2枚を墓地に置き、各カードのコスト以下のサイキックを出す？',[
    opt('2枚を墓地に置く',true,own.deck.length>2?15:-1000),skip()]);
   break;
  }
  const moved=api.mill(s,t.p,2,{together:true})||[];
  if(s.winner!==null)break;
  const caps=moved.filter(y=>own.grave.includes(y)).map(y=>Math.max(0,...faces(card(y)).map(cost)));
  start(s,t,caps.map(max=>({op:'Select',origin:'extra',deploy:true,n:1,optional:true,g1104PsychicFaces:true,
   filter:{creature:true,g1085Psychic:true,max:max===Infinity?'∞':max},
   title:'墓地に置いたカードのコスト'+(max===Infinity?'∞':max)+'以下のサイキックを1体まで出す'})));
  break;
 }
 case'g34_MillSpell1578':{
  const moved=api.mill(s,t.p,1,{together:true}),y=moved?.[0];
  if(s.winner===null&&y&&own.grave.includes(y)&&faces(card(y)).some(c=>c.type==='spell'))
   start(s,t,[{op:'Execute',origin:'grave',spellOnly:true,optional:true,g1578Exact:{uid:y.uid,serial:y.zoneSerial||0}}]);
  break;
 }
 case'g34_MillHostCost1771':{
  const host=sourceHost474(s,t)?.x;
  const n=host?cost(effective(host,s)):t.g1771HostCost??cost(card(t.source));
  start(s,t,[{op:'Mill',n:n===Infinity?'∞':n,optional:!!t.optional}]);
  break;
 }
 case'g34_MillKeep1826':api.mill(s,t.p,Math.max(0,own.deck.length-t.keep),{together:true});break;
 case'g34_Mill':{
  const p=t.opponent?1-t.p:t.owner??t.p,n=t.n==='∞'?s.players[p].deck.length:t.n;
  if(t.optional)choice(s,t,t.n==='∞'?'山札をすべて墓地に置く？':'山札の上'+n+'枚を墓地に置く？',[opt('置く',true,own.deck.length>n?10:-100),skip()]);
  else{
   const moved=api.mill(s,p,n,{together:t.g1042Together});
   if(t.afterAllMoved&&s.winner===null&&moved?.length===n&&
      moved.every(y=>s.players[p].grave.includes(y)&&matches(s,p,y,t.movedFilter)))
    start(s,t,t.afterAllMoved);
  }
  break;
 }
 // Count physical mana cards once on resolution, independently of their mana numbers or tapped state.
 case'g34_ManaCostSweep522':
  if(t.g735BelowColorless){
   const n=own.mana.filter(y=>api.manaColors(card(y.faceDown?'face-down-mana':y),s,t.p).length===0).length;
   if(n)start(s,t,[{op:'Sweep',both:true,filter:{creature:true,belowCost:n}}]);
  }else start(s,t,[{op:'Sweep',filter:{creature:true,min:opp.mana.length+1},...(t.g1528ToBottom?{to:'deck',toOwnerDeck:true,g994OrderBottom:true}:{})}]);
  break;
 // Capture the physical mana count before moving a card out of that zone. Execute preserves actual summoning.
 case'g34_ManaCountRamp529':{const n=own.mana.length;if(n)start(s,t,[{op:'Offer',title:'山札から'+n+'枚をまとめてタップしてマナに置く？',defs:[{op:'Ramp',n,tapped:true}]}]);break;}
 case'g34_ManaDeploy523':{const max=own.mana.length;start(s,t,[t.summon?{op:'Execute',origin:'hand',creatureOnly:true,max,optional:t.optional}:{op:'Select',origin:t.origin,n:1,deploy:true,optional:t.optional,filter:{...t.filter,max}}]);break;}
 case'g34_PowerSweep696':choice(s,t,t.max+'以下の数字を選ぶ',powerSweepOptions696(s,t));break;
 case'g34_ScrewRocket931':{
  const metamorph=own.mana.length>=7;
  start(s,t,[{op:'Select',owner:'opponent',origin:'battle',to:'grave',n:metamorph?2:1,optional:metamorph,
   filter:{g201Gear:true,faceUp:true},g173Targets:true,g193Select:true,
   title:metamorph?'墓地に置く相手のクロスギアを2枚まで選ぶ':'墓地に置く相手のクロスギアを1枚選ぶ'}]);
  break;
 }
 case'g34_TreasureChance930':{
  const y=api.takeTop(s,t.p);
  if(y){
   clear(y,'grave');
   api.addZone(s,t.p,'grave',y);
  }
  api.deckCheck(s,t.p);
  if(s.winner!==null||!y||!own.grave.includes(y))break;
  const definition=api.zoneCard(s,t.p,y,'grave');
  const creature=faces(definition).find(face=>face.type==='creature');
  if(creature)start(s,t,[{op:'Target',to:'grave',spell:true,filter:{belowPower:creature.power,g199Power:true},
   title:'墓地に置いたカードよりパワーが小さい相手クリーチャーを1体破壊する'}]);
  else if(definition.type==='gear')start(s,t,[{op:'Select',origin:'grave',n:1,deploy:true,optional:true,
   g530Ids:[y.uid],filter:{g201Gear:true},title:'墓地に置いたクロスギアを出す（任意）'}]);
  break;
 }
 case'g34_BirdTarget935':{
  const options=targetOptions(s,t.p,creatures(s,1-t.p));
  if(options.length)choice(s,t,'コストを比べる相手のクリーチャーを選ぶ',options);
  else put(s,{...t,op:'g34_BirdMill935'});
  break;
 }
 case'g34_BirdMill935':{
  const top=api.takeTop(s,t.p);
  if(top){
   clear(top,'grave');
   api.addZone(s,t.p,'grave',top);
   if(t.target){
    const costs=[...new Set(faces(api.zoneCard(s,t.p,top,'grave')).map(cost))].map(n=>n===Infinity?'∞':n);
    put(s,{...t,op:'g34_BirdCompare935',costs});
   }
  }
  api.deckCheck(s,t.p);
  break;
 }
 case'g34_BirdCompare935':{
  if(!birdTarget935(s,t))break;
  if(t.costs.length===1)destroyBelowCost935(s,t,t.costs[0]);
  else choice(s,t,'墓地に置いたカードのどちらのコストを参照する？',t.costs.map(n=>
   opt('コスト'+n,n,n==='∞'?100:Math.min(n,99))));
  break;
 }
 case'g34_LionessMill928':{
  const y=api.takeTop(s,t.p);
  if(y){
   clear(y,'grave');
   api.addZone(s,t.p,'grave',y);
   const costs=[...new Set(faces(api.zoneCard(s,t.p,y,'grave')).map(cost))].map(n=>n===Infinity?'∞':n);
   start(s,t,[{op:'LionessSweep928',costs}]);
  }
  api.deckCheck(s,t.p);
  break;
 }
 case'g34_LionessSweep928':{
  if(t.costs.length===1)sweepGears928(s,t,t.costs[0]);
  else choice(s,t,'墓地に置いたカードのどちらのコストを参照する？',t.costs.map(n=>
   opt('コスト'+n,n,gearSweepRows928(s,n).reduce((score,{player,uid})=>
    score+(player===t.p?-1:1)*(5+cost(card(s.players[player].battle.find(x=>x.uid===uid)))),0))));
  break;
 }
 case'g34_CostSweep596':choice(s,t,'一掃する相手クリーチャーのコストを選ぶ',costSweepOptions(s,t));break;
 case'g34_DestroyDuplicateNames1184':{
  const rows=[0,1].flatMap(player=>creatures(s,player)
   .filter(x=>!x.sealed&&!x.faceDown)
   .map(x=>({player,uid:x.uid,names:[...new Set(battleNames676(s,x))]})));
  const counts=new Map();
  for(const {names} of rows)for(const name of names)counts.set(name,(counts.get(name)||0)+1);
  const moves=rows.filter(({names})=>names.some(name=>counts.get(name)>1))
   .map(({player,uid})=>({player,uid,to:'grave',destroy:true}));
  if(moves.length)move(s,moves);
  break;
 }
 case'g34_Monument1681':{
  const elements=[0,1].flatMap(p=>s.players[p].battle.filter(x=>!x.sealed&&!x.faceDown&&
   exchangeElement753(api.zoneCard(s,p,x,'battle'))).map(x=>({p,x})));
  // The entry source counts; evolution bases, seals and linked parts do not.
  if(elements.length>=6)move(s,elements.filter(({x})=>!api.isEvolution(x)&&
   !api.allLayers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)))
   .map(({p,x})=>({player:p,uid:x.uid,to:'grave',destroy:true,controller:t.p})));
  break;
 }
 case'g34_Sweep':{
  const players=t.owner==='self'?[t.p]:t.both?[0,1]:[1-t.p];
  const to=t.to||'grave',cardSweep=to==='grave'&&t.filter?.notColor==='闇'&&card(t.source).g34ElementSweep;
  if(cardSweep){
   // Snapshot every physical target before seals are removed (QA42659/42660).
   const targets=players.flatMap(p=>s.players[p].battle.flatMap(top=>{
    const view=top.sealed?{...top,sealed:false}:top;
    if(top.sealed&&api.isCreature(s,view))return [];
    return api.allLayers(top).filter(x=>{
     const physical=x===top?{...view,godLinks:null,psychicLinks:null,
      ...(top.psychicLinks?.length?{psychicCell:true}:{})}:x;
     const definition=x===top&&!top.godLinks?.length&&!top.psychicLinks?.length?
      effective(view,s):api.zoneCard(s,p,physical,'battle');
     const roots=[top,...(top.godLinks||[]),...(top.psychicLinks||[])];
     return (roots.includes(x)?[definition]:faces(definition)).some(c=>!colors(c).includes('闇'));
    }).map(x=>({player:p,uid:x.uid}));
   }));
   for(const p of players)api.moveSealsToGrave1156(s,p,(s.players[p].seals||[]).map(x=>x.uid));
   api.moveBattleCardSweep(s,targets,t.controller??t.p);
   break;
  }
  const rows=players.flatMap(p=>s.players[p].battle
   .filter(y=>(!t.g733DrawPerAttempt||!y.sealed&&api.isCreature(s,y))&&(!t.g1660CreatureOnly||!y.sealed&&api.isCreature(s,y))&&matches(s,p,y,t.filter)&&y.uid!==t.excludeUid&&!t.excludeUids?.includes(y.uid)
    &&(!t.g179Other||!api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)))
    &&(!t.g994ExcludeRaces||!y.sealed&&!t.g994ExcludeRaces.some(r=>race(effective(y,s),r)))
    &&(!t.g1041Colored||!y.sealed&&!y.faceDown&&colors(effective(y,s)).length>0))
   .map(y=>({player:p,uid:y.uid,to,destroy:to==='grave'&&!t.g815PutInGrave,
    ...(t.toOwnerHand?{toOwnerHand:true}:{}),
    ...(t.toOwnerShields?{toOwnerShields:true}:{}),
    ...(t.toOwnerDeck?{toOwnerDeck:true}:{}),
    ...(t.g1803GroupedTop?{g1803GroupedTop:true}:{}),
    ...(t.toOwnerMana?{toOwnerMana:true}:{}),...(to==='mana'&&t.tapped?{tapped:true}:{}),
    ...(t.g1117ShieldDraw?{faceUp:true,toOwnerShields:true}:{})})));
  if(rows.length){
   if(t.g994OrderBottom){
    const orders=[s.active,1-s.active].flatMap(p=>{
     const moved=rows.flatMap(row=>api.allLayers(s.players[row.player].battle.find(y=>y.uid===row.uid))
      .filter(y=>(t.toOwnerDeck?y.cardOwner??row.player:row.player)===p)).map((y,i)=>({
       uid:y.uid,label:y.faceDown?'裏向きのカード '+(i+1):card(y).name,cardId:y.faceDown?null:y.cardId
      }));
     return moved.length>1?[task('g78_BottomOrder',p,t.source,{rows:moved,ordered:[],newCards:true,controller:t.controller??t.p,
      ...(t.toOwnerDeck?{g1041Chooser:1-t.p}:{})})]:[];
    });
    put(s,...orders);
   }
   // The direct destruction attempts count even when replaced (QA34333/34334).
   if(t.g733DrawPerAttempt)start(s,t,[{op:'DrawUpTo',n:rows.length,g203Draw:true}]);
   if(t.g1011BreakPerAttempt)start(s,t,[{op:'Break497',n:rows.length,g747CreatureBreak:true,g913DepartedBreaker:true}]);
   if(t.g1117ShieldDraw){
    const uids=rows.flatMap(({player,uid})=>
     api.allLayers(s.players[player].battle.find(y=>y.uid===uid)).map(x=>x.uid));
    put(s,{...t,op:'g34_DrawShielded1117',uids});
   }
   move(s,rows,t.g865DrawDestroyed?{kind:'g865DrawDestroyed',player:t.p,source:t.source}:null);
  }
  break;
 }
 case'g34_DrawShielded1117':{
  const shielded=new Set(t.uids);
  const n=s.players.flatMap(p=>p.shields.flatMap(api.shieldCards)).filter(x=>shielded.has(x.uid)).length;
  if(n)api.draw(s,t.p,n);
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
  if(t.g1526All){finishMana582(s,{...t,chosen:rows.map(x=>x.uid)},rows);break;}
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
  choice(s,t,t.title||destination+(t.anyOwner?'':'相手の')+'カードを1枚選ぶ',options);
  break;
 }
 case'g34_DiscardCost655':
  if(t.costs.length===1)start(s,t,[destroyBelowCost655(t.costs[0],t)]);
  else if(t.costs.length>1)choice(s,t,'捨てたカードの参照するコストを選ぶ',t.costs.map(n=>opt('コスト '+n,n,n==='∞'?100:n)));
  break;
 case'g34_TargetBelowSource692':{
  const host=sourceHost474(s,t.g828CompareAttacker?t.g399Attacker:t);
  const current=host&&!host.x.sealed&&api.isCreature(s,host.x)?currentPower506(s,host.x):t.g692LastPower;
  if(current===undefined||current===-Infinity||current==='-∞')break;
  if(t.g1144Total){
   const budget=current===Infinity?'∞':current;
   start(s,t,[{op:'Select',origin:'battle',owner:'opponent',n:'all',to:t.to,optional:true,
    g173Targets:true,g193Select:true,filter:{creature:true},g506PowerBudget:budget,
    title:'合計パワー'+budget+'以下になるよう相手のクリーチャーを選ぶ'}]);
  }else if(t.g745Sweep||t.g993OpponentSweepInclusive){
   const threshold=current==='∞'?Infinity:current;
   const owners=t.g993OpponentSweepInclusive||t.g745Sweep==='opponent'?[1-t.p]:[t.p,1-t.p];
   const rows=owners.flatMap(p=>creatures(s,p)
    .filter(y=>!y.sealed&&(t.g993OpponentSweepInclusive||t.g1718SweepInclusive?currentPower506(s,y)<=threshold:currentPower506(s,y)<threshold))
    .map(y=>({player:p,uid:y.uid,to:'grave',destroy:true})));
   if(rows.length)move(s,rows);
  }else{
   const filter={belowPower:current===Infinity?'∞':current,...(t.g199Power?{g199Power:true}:{})};
   if(t.n>1)start(s,t,[{op:'Select',origin:'battle',owner:'opponent',n:t.n,to:t.to,optional:t.optional,
    g173Targets:true,g193Select:true,filter:{creature:true,...filter},
    title:'パワーが小さい相手のクリーチャーを'+t.n+'体まで選ぶ'}]);
   else start(s,t,[{op:'Target',to:t.to,optional:t.optional,...(t.anyOwner?{anyOwner:true}:{}),
    ...(t.g179Other?{g179Other:true}:{}),...(t.g1312Bushido?{g1312Bushido:true}:{}),filter}]);
  }
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
 case'g34_CopyOnEntry1357':{
  const options=targetOptions(s,t.p,creatures(s,1-t.p));
  if(options.length)choice(s,t,'出る時にコピーする相手のクリーチャーを選ぶ',[...options,skip()]);
  else copyOnEntry1357(s,t,null);
  break;
 }
 case'g34_Target':{
  if(t.g1357Become&&!sourceHost474(s,t)?.x)break;
  if(t.g1150AttachGrave&&(!own.grave.length||!api.canMoveZone(s,t.p,'grave')))break;
  if(t.g1086BelowGrave)t={...t,filter:{...t.filter,belowCost:own.grave.length}};
  if(used792(s,t,t))break;
  if(t.to==='grave'&&t.filter?.maxPower===6000&&t.owner!=='self'&&!t.anyOwner&&
     card(t.source).type==='creature'&&
     s.players[t.p].battle.some(x=>card(x).g1083Yamato&&effective(x,s).g1083Yamato)){
   const host=sourceHost474(s,t)?.x;
   const name=exactName('ボルメテウス・武者・ドラゴン');
   if(host?battleNames676(s,host).includes(name):exactName(card(t.source).name)===name)
    t={...t,filter:{...t.filter,maxPower:12000}};
  }const owner=t.owner==='self'?t.p:t.owner??1-t.p,ps=t.anyOwner?[t.p,1-t.p]:[owner],candidates=ps.flatMap(p=>s.players[p].battle.filter(y=>y.uid!==t.excludeUid&&matches(s,p,y,{creature:!t.element,...t.filter})&&(!t.g824Panya||panyaCanReturn(s,y))&&(!t.g593OverMana||cost(effective(y,s))>opp.mana.length)&&(!t.g179Other||!api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)))));const eligible=t.g810Excluded?candidates.filter(y=>!api.allLayers(y).some(z=>t.g810Excluded.includes(key(z)))):candidates;const rows=t.g741MinPower||t.g1778MaxPower?lowestPower741(s,eligible,t.g1778MaxPower?'max':'min'):eligible;
  // An instruction to act on one's own card can omit 「選ぶ」 (QA 45224).
  const moveForRaid=t.owner==='self'&&t.g587AfterSelection&&t.after?.[0]?.op==='Raid767';
  const options=t.g1044ImplicitTap||t.implicitSelection
   ?rows.filter(y=>!y.sealed).map(y=>{
    const c=card(y);
    const score=moveForRaid?(own.deck.length>1&&!api.deckLocked(s,t.p)?16-cost(c)+(y.tapped?3:0):-1):y.tapped?5:10;
    return opt(c.name,y.uid,score,y.cardId);
   })
   :targetOptions(s,t.g1372OpponentSacrifice?t.controller:t.p,rows);
  if(!options.length&&t.g1163SecondDestroy){secondDestroy1163(s,t);break;}
  if(!options.length&&t.g1040OtherPower){otherTargetPower1040(s,t);break;}
  if(!options.length&&t.g1041AfterNoTarget){start(s,t,t.after);break;}
  if(!options.length&&t.elseDefs){start(s,t,t.elseDefs);break;}
  choice(s,t,t.title||'対象を選ぶ',[...options.map(o=>({...o,score:t.g987AfterNewTap?tapForUntapScore987(s,t,rows.find(y=>y.uid===o.value)):t.g503Stack?Math.min(api.allLayers(rows.find(y=>y.uid===o.value)).length,Math.max(0,s.players[t.p].deck.length-1))*8:t.g419Boost||t.g465DestroySafe||t.g521UntilStart||t.g797Stay?(s.players[t.p].battle.some(y=>y.uid===o.value)?15+cost(effective(rows.find(y=>y.uid===o.value),s)):-20):t.g242PowerMinus?powerMinusScore242(s,t,rows.find(x=>x.uid===o.value)):t.g235TapOrUntap?(()=>{const y=rows.find(x=>x.uid===o.value),p=s.players.findIndex(p=>p.battle.some(x=>x.uid===o.value));return Math.max(tapStateScore235(s,t,p,y,true),tapStateScore235(s,t,p,y,false));})():t.untap?(()=>{const y=rows.find(x=>x.uid===o.value),own=s.players[t.p].battle.includes(y);return y?.tapped&&api.canUntap(y)?(own?10+Math.abs(o.score):-10-Math.abs(o.score)):0;})():t.g301Grant?((()=>{const y=rows.find(y=>y.uid===o.value);return s.active===t.p&&y.entered===s.turn&&!y.tapped&&!effective(y,s).speedAttacker?25+cost(card(y)):1;})()):t.g927HasteScore?hasteScore927(s,rows.find(y=>y.uid===o.value)):t.g177SelfMana||t.g179Return||t.anyOwner&&s.players[t.p].battle.some(x=>x.uid===o.value)?-Math.abs(o.score)-5:o.score,value:{uid:o.value,p:s.players.findIndex(p=>p.battle.some(x=>x.uid===o.value))}})),...(t.optional?[skip()]:[])]);break;}
 case'g34_LockUntap606':{
  const rows=t.zone==='mana'?opp.mana:t.g869Refs?opp.battle.filter(y=>api.allLayers(y).some(x=>t.g869Refs.includes(key(x)))):
   creatures(s,1-t.p).filter(y=>!y.sealed&&matches(s,1-t.p,y,t.filter));
  for(const y of rows){
   if(t.g1019Tap){
    if(t.zone==='mana')y.tapped=true;
    else api.tap(s,1-t.p,y);
   }
   if(!t.g1054OwnTurnLock||s.active===t.p)startUntapLock210(t,y);
  }
  break;
 }
 case'g34_TapAll':{
  for(const p of t.both?[0,1]:[1-t.p]){
   const matchesTap=y=>!t.g218Tap||matches(s,p,y,t.filter);
   const rows=creatures(s,p);
   if(t.g1108Snapshot){
    // Fix eligibility before tapping can change the power of other creatures.
    for(const y of rows.filter(matchesTap))api.tap(s,p,y);
   }else for(const y of rows)if(matchesTap(y))api.tap(s,p,y);
  }
  break;
 }
 case'g34_PlayersDiscard1178':{
  const picks=t.picks??[];
  if(picks.length===2){put(s,{...t,op:'g34_PlayersDiscardResult1178',index:0,n:0});break;}
  const p=picks.length===0?s.active:1-s.active;
  const hand=api.handProtected(s,{p,causedBy:t.p,source:t.source})?[]:s.players[p].hand;
  if(!hand.length){put(s,{...t,picks:[...picks,{p,uid:null}]});break;}
  choice(s,t,'捨てる自分の手札を1枚選ぶ',hand.map(x=>opt(card(x).name,x.uid,-cost(card(x)),x.cardId)),p);
  break;
 }
 case'g34_PlayersDiscardResult1178':{
  const n=t.n+Number(!!t.discarded),pick=t.picks[t.index];
  if(pick){
   api.discardSelected(s,pick.p,pick.uid?[pick.uid]:[],t.source,t.p,null,{...t,index:t.index+1,n});
  }else if(n)put(s,{...t,op:'g34_DrawUpTo',n,g853EachDraw:true});
  break;
 }
 case'g34_Discard':{
  const owner=t.owner==='self'?t.p:t.owner??1-t.p;
  if(t.g1308DiscardElse&&(!s.players[owner].hand.length||
   api.handProtected(s,{p:owner,source:t.source,causedBy:t.p}))){
   start(s,t,t.g1308DiscardElse);
   break;
  }
  const n=t.g584Count==='faceUpShieldGo'?api.shieldGoCount(s,t.p):
   t.g585ShieldDeficit?Math.max(0,5-own.shields.length):t.g584Count==='ownShields'?own.shields.length:t.g584Count==='opponentShields'?opp.shields.length:
   (t.g756All||t.g1233AnyDiscard)?s.players[owner].hand.length:t.n??1;
  const after=t.afterDiscardCount&&{...t.afterDiscardCount,p:t.p,source:t.source,controller:t.controller??t.p};
  if(n)put(s,task('discard',owner,t.source,{causedBy:t.p,n,random:!!t.random,optional:!!t.optional,selfDiscard:t.owner==='self',...(t.g756All?{all:true}:{}),...(t.g869ReturnOnSpell?{g869ReturnUid:t.uid}:{}),...(after?{afterDiscardCount:after}:{})}));
  break;
 }
 case'g34_Maximilian1118':{
  const sources=t.sources??creatures(s,t.p).filter(x=>!x.sealed&&effective(x,s).g1118Maximilian)
   .map(x=>x.cardId);
  if(!sources.length)break;
  const [source,...remaining]=sources;
  choice(s,{...t,sources:remaining},card(source).name+'：ナイト呪文の効果をもう一度使う？',
   [opt('もう一度使う',true,t.spell.g70Effect==='Open'&&own.deck.length<=1?-10:10,source),skip()]);
  break;
 }
 case'g34_KnightMagic1118':
  if(countDraw(s,t.p,{zone:'battle',g262Elements:true,filter:{race:'ナイト',faceUp:true}}))
   choice(s,t,'ナイト・マジック：効果をもう一度使う？',
    [opt('もう一度使う',true,modeScore(s,t,t.defs)),skip()]);
  break;
 case'g34_KingKnightMagic1115':{
  const count=countDraw(s,t.p,{zone:'battle',g262Elements:true,filter:{race:'ナイト',faceUp:true}});
  if(!count)break;
  const score=modeScore(s,t,t.defs);
  choice(s,t,'キング・ナイト・マジック：効果を追加で使う回数',
   Array.from({length:count+1},(_,n)=>opt(n+'回',n,Math.min(n,opp.battle.length+opp.hand.length)*score)));
  break;
 }
 case'g34_Repeat1052':start(s,t,Array.from({length:t.n},()=>t.def));break;
 case'g34_AndroBounce1253':
 case'g34_DiscardCountBounce1254':{
  // Fix the distinct targets before applying their movement replacements (QA 32491).
  const blockersOnly=t.op==='g34_AndroBounce1253';
  start(s,t,[{op:'Select',origin:'battle',anyOwner:true,n:t.n,to:'hand',toOwnerHand:true,
   filter:{creature:true,...(blockersOnly?{blocker:true}:{})},g173Targets:true,g193Select:true,
   title:blockersOnly?'持ち主の手札に戻すブロッカーを選ぶ':'持ち主の手札に戻すクリーチャーを選ぶ'}]);
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
  const below=t.below||t.g766Below;
  const filter=t.g966Light?{g228Face:{type:'creature',color:'光',max:t.castCost}}:
   below?{creature:true,belowCost:t.castCost}:{creature:true,nonEvolution:true,exactCost:t.castCost};
  start(s,t,[{op:'Select',origin:'hand',n:1,deploy:true,g195HandDeploy:true,optional:true,filter,
   ...(below?{title:'唱えた呪文よりコストの小さいクリーチャーを出す（任意）'}:{}),
   ...(t.g766Below?{g766SpellUse:true}:{}),
   ...(t.g966Light?{title:'唱えた呪文のコスト以下の光のクリーチャーを出す（任意）'}:{})}]);
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
 case'g34_AdamReturn1341':{
  const x=live(s,t);
  if(x&&!x.sealed)choice(s,t,'このクリーチャーを手札に戻す？',[opt('手札に戻す',true,12,x.cardId),skip()]);
  break;
 }
 case'g34_AdamPlace1341':{
  const rows=adamSeeds1341(s,t);
  if(rows.length)choice(s,t,'重ねるアンタップ状態のタマシードを選ぶ',[
   ...rows.map(x=>opt(card(x).name,x.uid,12,x.cardId)),skip()
  ]);
  break;
 }
 case'g34_FinalSeed1340':{
  const host=live(s,t),x=live(s,{...t,...t.seed});
  if(host&&!host.sealed&&x&&x!==host&&!x.sealed&&matches(s,t.p,x,{g295Tamaseed:true}))
   choice(s,t,'出たタマシードをこのクリーチャーの下に置く？',[opt('下に置く',true,15,x.cardId),skip()]);
  break;
 }
 case'g34_FinalTurn1340':{
  const host=live(s,t),picked=t.picked||[];
  const cards=host&&!host.sealed?(host.under||[]).flatMap(api.allLayers):[];
  if(cards.length<6||!picked.every(uid=>cards.some(x=>x.uid===uid)))break;
  if(picked.length===6){
   const order=api.shuffled(picked,Math.floor(api.random(s)*4294967296));
   for(const uid of order)api.moveBattleCard(s,t.p,uid,'deck',{controller:t.p});
   if(api.canAddTurn(s,t.p)){
    (s.extraTurns??=[]).push({player:t.p,source:t.source});
    api.log(s,t.p,'extraTurn','このターンの後、もう一度自分のターンを行う',{cardId:t.source});
   }
  }else choice(s,t,'山札の下に置くカードを6枚選ぶ（'+picked.length+'枚選択済み）',[
   ...cards.filter(x=>!picked.includes(x.uid)).map(x=>opt(x.faceDown?'裏向きのカード':card(x).name,x.uid,12,x.faceDown?undefined:x.cardId)),skip()
  ]);
  break;
 }
 case'g34_JokerSweep1538':
  start(s,t,[{op:'Sweep',both:true,to:'grave',filter:{creature:true,max:jokerCount539(s,t.p)},spell:true}]);
  break;
 case'g34_LightShieldTrigger1538':
  (s.extLimits??=[]).push({kind:'g1538LightShieldTriggers',player:t.p,expires:'start',who:t.p,spellSource:t.source,spellCost:cost(card(t.source))});
  break;
 case'g34_SuperPlus1659':
  if(api.canAddShield(s,t.p)&&own.shields.length)choice(s,t,'スーパー・シールド・プラスですべてのシールドに1枚ずつ重ねますか？',[opt('重ねる',true,own.deck.length>own.shields.length?10:-1000),skip()]);break;
 case'g34_SuperPlusOrder1659':{
  const rows=own.shields.filter(x=>!t.ordered.includes(api.shieldGroup(x)));
  if(rows.length<=1){put(s,{...t,op:'g34_SuperPlusPut1659',ordered:[...t.ordered,...rows.map(api.shieldGroup)]});break;}
  choice(s,t,'山札の上から順に重ねるシールドを選ぶ',rows.map((x,i)=>opt('自分のシールド '+(own.shields.indexOf(x)+1),api.shieldGroup(x),0)));break;
 }
 case'g34_SuperPlusPut1659':{
  const placements=t.ordered.map(group=>({group,x:api.takeTop(s,t.p)})).filter(r=>r.x),placed=[];
  const redirect=s.players.some(p=>p.battle.some(x=>effective(x,s).deckRedirect));
  for(const {group,x}of placements){
   if(redirect){clear(x,'grave');api.addZone(s,t.p,'grave',x);}
   else{clear(x,'shields');if(api.addShieldCard(s,t.p,group,x,{faceUp:false}))placed.push(group);}
  }
  api.log(s,t.p,'shieldPlus',card(t.source).name+'：各シールドに1枚ずつ裏向きで重ねる',{cardId:t.source});
  api.deckCheck(s,t.p);
  if(s.winner===null)put(s,...placed.map(group=>task('g34_AlPlus1659',t.p,t.source,{group})));break;
 }
 case'g34_Poker1659':
  api.log(s,t.p,'look',card(t.source).name+'で自分のシールドを確認（内容は非公開）',{cardId:t.source});
  put(s,{...t,op:'g34_PokerPick1659',picked:[]});break;
 case'g34_PokerPick1659':{
  const rows=own.shields.filter(root=>!api.shieldCards(root).some(x=>x.g37ShieldHeld));
  const seen=rows.flatMap((root,i)=>api.shieldCards(root).map(x=>({id:x.cardId,label:'自分のシールド '+(i+1)})));
  choice(s,{...t,g585Peek:seen},'山札の下に置く自分のシールドを好きな数選ぶ（'+t.picked.length+'つ選択済み）',[
   ...rows.flatMap((root,i)=>t.picked.includes(api.shieldGroup(root))?[]:[opt('シールド '+(i+1)+'（カード'+api.shieldCards(root).length+'枚）',api.shieldGroup(root),0)]),
   opt('選択を終える',null,1)]);break;
 }
 case'g34_PokerOrder1659':{
  const cards=t.picked.flatMap(uid=>api.shieldCards(api.findShield(own,uid))),remaining=cards.filter(x=>!t.ordered.includes(x.uid));
  if(remaining.length<=1){put(s,{...t,op:'g34_PokerCommit1659',ordered:[...t.ordered,...remaining.map(x=>x.uid)]});break;}
  choice(s,{...t,g585Peek:cards.map(x=>({id:x.cardId,label:'山札の下に置くカード'}))},'山札の下に置くカードを上から順に選ぶ',remaining.map(x=>opt(card(x).name,x.uid,0,x.cardId)));break;
 }
 case'g34_PokerCommit1659':{
  const follow={...t,op:'g34_PokerRefill1659',count:t.picked.length};
  api.moveShields(s,t.p,t.picked,'deck',{g1659DeckOrder:t.ordered});
  if(!api.deferShieldMove1352(s,follow))put(s,follow);break;
 }
 case'g34_PokerRefill1659':if(t.count)start(s,t,[{op:'ShieldTop',n:t.count,g779Simultaneous:true}]);break;
 case'g34_DefenderBreak1659':{
  const rows=own.shields.filter(x=>!t.selected.includes(api.shieldGroup(x))),n=Math.min(t.n,own.shields.length);
  if(t.selected.length>=n||!rows.length){api.breakShields(s,t.p,t.selected);break;}
  if(n-t.selected.length===rows.length){api.breakShields(s,t.p,[...t.selected,...rows.map(api.shieldGroup)]);break;}
  choice(s,t,'自分でブレイクされるシールドを選ぶ（'+t.selected.length+'/'+n+'）',rows.map((x,i)=>opt('自分のシールド '+(own.shields.indexOf(x)+1),api.shieldGroup(x),0)));break;
 }
 case'g34_AlPlus1659':{
  const watcher=creatures(s,t.p).find(x=>!x.sealed&&!x.faceDown&&effective(x,s).g1659PlusPeek);
  if(watcher&&api.findShield(own,t.group))choice(s,{...t,source:watcher.cardId},'シールド・プラスしたシールドを確認しますか？',[opt('確認する',true,1),skip()]);break;
 }
 case'g34_BeastCharge1658':{
  const n=s.g1658CreatureBreaks?.turn===s.turn?s.g1658CreatureBreaks.players[t.p]:0;
  start(s,t,[{op:'Look',g201Search:true,g841DeckPeek:true,n:'all',rest:'shuffle',
   stages:[{n,to:'hand',optional:true,reveal:true,filter:{creature:true}}]}]);
  break;
 }
 case'g34_StarMemory1657':{
  // QA38617: capture the existing shield cards, not future shields or later visits.
  (s.extLimits??=[]).push({kind:'g1193ShieldTrigger',player:t.p,expires:'end',who:t.p,
   refs:own.shields.flatMap(api.shieldCards).map(x=>({uid:x.uid,serial:x.zoneSerial||0})),
   spellSource:t.source,spellCost:cost(card(t.source))});
  break;
 }
 case'g34_BenzoSide1339':{
  (s.extLimits??=[]).push({kind:'g1339ShieldTriggers',expires:'start',who:t.p,controller:t.p});
  const frame=s.extSpells?.find(f=>f.inst.uid===t.uid);
  if(frame&&s.active===t.p)frame.g1339Creature=true;
  break;
 }
 case'g34_ClanReveal1338':{
  api.shuffleLibrary(s,t.p,[],t.source);
  const ids=look(s,{...t,n:3,public:true});
  const host=sourceHost474(s,t)?.x,milled=[];
  for(const uid of ids){
   const y=own.deck.find(x=>x.uid===uid);
   release(s,t.p,uid);
   if(!y)continue;
   if(faces(api.zoneCard(s,t.p,y,'deck')).some(c=>c.type==='spell')){
    if(!host||host.sealed)continue;
    remove(own.deck,uid);
    clear(y,'battle');
    y.entered=s.turn;
    (host.under??=[]).push(y);
   }else{
    remove(own.deck,uid);
    clear(y,'grave');
    milled.push(y);
   }
  }
  api.addZone(s,t.p,'grave',...milled);
  api.deckCheck(s,t.p);
  break;
 }
 case'g34_ClanAttack1338':{
  const options=clanSpellOptions1338(s,t,sourceHost474(s,t)?.x);
  if(options.length)choice(s,t,'このクリーチャーの下から呪文を1枚唱える',[...options,skip()]);
  break;
 }
 case'g34_KariyaSelect1337':{
  const rows=t.picks?.length===3?[]:kariyaSpellOptions1337(s,t);
  if(rows.length)choice(s,t,'唱える順に墓地からコスト3以下の呪文を選ぶ（3枚まで）',[...rows,skip()]);
  else reserveKariyaSpells1337(s,t);
  break;
 }
 case'g34_KariyaCast1337':{
  const x=own.g34Holding?.find(x=>x.uid===t.uid);
  if(!x)break;
  const c=faces(api.zoneCard(s,t.p,x,'grave'))[t.face];
  if(!api.canCast(s,t.p,c,'grave')||!api.canExecuteUnpaid(s,t.p,c)){
   remove(own.g34Holding,x.uid);
   delete x.g5Origin;
   delete x.g1337GraveHeld;
   own.grave.push(x);
   break;
  }
  x.finishTo='deck';
  cast(s,t.p,x.uid,true,null,t.face,null,'g34Holding',card(t.source).name);
  break;
 }
 case'g34_GraveSpell594':{
  const rows=graveSpellOptions594(s,t);
  if(!t.g1353DLSys)choice(s,t,'コスト'+t.max+'以下の呪文をどちらかの墓地から唱える',[...rows,...(t.optional?[skip()]:[])]);
  else if(rows.length)choice(s,t,'DL-Sys：相手の墓地の呪文を唱える？',[...rows,skip()]);
  else put(s,{...t,op:'g34_AuraReattach1353'});
  break;
 }
 case'g34_NonSummonShuffle1452':{const host=sourceHost474(s,t);if(host&&host.x.summonedTurn!==s.turn)move(s,[{player:host.p,uid:host.x.uid,to:'deckShuffle1365',controller:t.p}]);break;}
 case'g34_TopZoneLook1450':{
  if(!t.zone){
   choice(s,t,'確認する山札を選ぶ',[opt('山札の上を見る','deck',0),opt('超GRの上を見る','gr',0)]);break;
  }
  if(t.zone==='deck'&&api.deckLocked(s,t.p))break;
  const rows=own[t.zone]||[],y=rows[0];if(!y)break;
  choice(s,{...t,target:y.uid,serial:y.zoneSerial||0,op:'g34_TopZoneBottom1450'},card(t.source).name+'：'+card(y).name+'を一番下に置く？',[
   opt('一番下に置く',true,0,y.cardId),opt('上に残す',false,0,y.cardId)]);
  break;
 }
 case'g34_OrderGR1450':{
  const ids=t.ids||own.gr.slice(0,3).map(x=>({uid:x.uid,serial:x.zoneSerial||0})),selected=t.selected||[],left=ids.filter(r=>!selected.includes(r.uid)&&own.gr.some(x=>x.uid===r.uid&&(x.zoneSerial||0)===r.serial));
  if(left.length<=1){const order=[...selected,...left.map(r=>r.uid)],byId=new Map(own.gr.map(x=>[x.uid,x]));own.gr=[...order.map(id=>byId.get(id)).filter(Boolean),...own.gr.filter(x=>!order.includes(x.uid))];break;}
  choice(s,{...t,ids,selected},'超GRの上から置く順序を選ぶ',left.map(r=>{const x=own.gr.find(y=>y.uid===r.uid);return opt(card(x).name,x.uid,0,x.cardId);}));break;
 }
 case'g34_AuraIf1444':{
  const host=own.battle.flatMap(y=>api.allLayers(y)).find(y=>y.uid===t.host?.uid&&(y.incarnation||0)===(t.host.incarnation||0));
  if(host&&api.attachedAuras1352(s,t.p,host).length>=t.min)start(s,t,t.defs);
  break;
 }
 case'g34_AuraMinus1808':{
  const host=auraHost1808(s,t),n=host?api.attachedAuras1352(s,t.p,host).length:t.g1808AuraCount??0;
  start(s,t,[{op:'Target',power:-3000*n,g242PowerMinus:true}]);break;
 }
 case'g34_AuraBreakEnd1812':{
  if(!t.n)break;
  if(t.mode==='jude')start(s,t,[{op:'LookDeploy530',n:t.n,public:true,g1660PublicReveal:true,g749Required:true,
   filter:{aura:true,max:6},rest:'bottom',title:'公開したコスト6以下のオーラをすべて出す'}]);
  else start(s,t,[{op:'Discard',n:t.n},{op:'Mill',n:t.n,opponent:true}]);
  break;
 }
 case'g34_PokopySearch1812':{
  if(!t.firstAttach)break;
  const filter={aura:true,g201ExactName:card(t.source).g1812FirstAttachName};
  start(s,t,[{op:'Choose',g184Modes:true,modes:[
   {label:'手札から出す（山札は見ない）',defs:[{op:'Select',origin:'hand',n:1,deploy:true,optional:true,filter}]},
   {label:'山札から探す',defs:[{op:'SearchZones1633',zones:['deck'],n:1,filter}]},
   {label:'手札と山札から探す',defs:[{op:'SearchZones1633',zones:['hand','deck'],n:1,filter,g1114HandAndDeck:true}]}
  ]}]);
  break;
 }
 case'g34_AuraDestroyCount1810':{
  const host=auraHost1808(s,t),n=host?api.attachedAuras1352(s,t.p,host).length:t.g1808AuraCount??0;
  if(n)start(s,t,[{op:'Select',owner:'opponent',origin:'battle',n,to:'grave',filter:{creature:true},g173Targets:true,g193Select:true}]);
  break;
 }
 case'g34_AuraDeathDrawDiscard1810':{
  const n=t.auras?.length||0;
  // QA38570: draw all cards first, then the opponent discards the full amount.
  if(n)start(s,t,[{op:'Draw',n},{op:'Discard',n}]);
  break;
 }
 case'g34_AuraSelfGrave1809':{
  // Move only the exact source Aura, even if it became an underlying card while waiting.
  const host=sourceHost474(s,t),a=host&&api.allLayers(host.x).find(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0));
  if(a&&card(a).type==='aura')api.moveBattleCard(s,host.p,a.uid,'grave',{destroy:false,controller:t.p});
  break;
 }
 case'g34_AuraHostPower1808':{
  const host=auraHost1808(s,t);if(host)buff(s,host,t.power);break;
 }
 case'g34_AuraGrPerCount1808':{
  const host=auraHost1808(s,t),n=host?api.attachedAuras1352(s,t.p,host).length:t.g1808AuraCount??0;
  start(s,t,Array.from({length:n},()=>({op:'AuraGr1353'})));break;
 }
 case'g34_AuraCountDraw1431':{
  const host=own.battle.find(x=>!x.sealed&&api.isCreature(s,x)&&api.allLayers(x).some(y=>y.uid===t.host?.uid&&(y.incarnation||0)===t.host.incarnation));
  const n=host?own.battle.filter(x=>card(x).type==='aura'&&x.auraTo1352?.uid===host.uid&&x.auraTo1352.incarnation===(host.incarnation||0)).length:0;
  if(n)start(s,t,[{op:'Draw',n}]);break;
 }
 case'g34_SelfGraveMana1431':{
  const y=own.grave.find(x=>x.uid===t.uid&&(x.incarnation||0)===(t.incarnation||0)&&(x.zoneSerial||0)===t.serial);
  if(y)zoneMove(s,t.p,'grave',y.uid,'mana',t);break;
 }
 case'g34_HandAura1437':{
  const x=own.hand.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial&&card(x).g1437HandAttach);
  const host=own.battle.find(x=>!x.sealed&&api.isCreature(s,x)&&api.allLayers(x).some(y=>y.uid===t.host.uid&&(y.incarnation||0)===t.host.incarnation));
  if(x&&host)choice(s,t,'手札のオーラを攻撃中のクリーチャーに付ける？',[opt('付ける',true,25),skip()]);break;
 }
 case'g34_ManaAura1437':{
  const host=api.auraHost1352(s,t.p,t.host);
  const rows=host&&api.canMoveZone(s,t.p,'mana')?own.mana.filter(x=>!x.faceDown&&card(x).type==='aura'&&cost(card(x))<=t.max&&api.canEnter(s,t.p,card(x),{origin:'mana',execution:false,auraHost:t.host})):[];
  if(rows.length)choice(s,t,'このクリーチャーに付けるマナのオーラを選ぶ',[...rows.map(x=>opt(card(x).name,{uid:x.uid,serial:x.zoneSerial||0},10+cost(card(x)),x.cardId)),skip()]);break;
 }
 case'g34_SetPower1470':
  for(const y of creatures(s,1-t.p).filter(y=>!y.sealed&&matches(s,1-t.p,y,t.filter)))
   (y.powerModifiers??=[]).push({fixedPower:t.value,expires:'end',who:s.active});break;
 case'g34_CountGR1464':{
  const n=t.difference?Math.max(0,creatures(s,1-t.p).length-creatures(s,t.p).length):countDraw(s,t.p,{zone:'battle',filter:t.filter});
  start(s,t,Array.from({length:Math.min(n,s.players[t.p].gr.length)},()=>({op:'AuraGr1353',tapped:!!t.tapped})));break;
 }
 case'g34_TapPerGR1464':{
  const n=countDraw(s,t.p,{zone:'battle',filter:{creature:true,g1428Gr:true}});
  if(n)start(s,t,[{op:'Select',origin:'battle',owner:'opponent',n,g173Targets:true,g193Tap:true,filter:{creature:true}}]);break;
 }
 case'g34_GrThen1668':{
  const top=own.gr?.[0];if(!top){if(t.mode==='fight')start(s,t,[{op:'FightEnemy240',fighter:null,g998EntryFight:true,optional:true}]);break;}
  const grRef={uid:top.uid,incarnation:(top.incarnation||0)+1};
  start(s,t,[{op:'AuraGr1353',g1668Receipt:grRef},{op:'GrFollow1668',grRef,mode:t.mode,arrived:false}]);break;
 }
 case'g34_GrFollow1668':{
  const host=t.arrived&&sourceHost474(s,t.grRef),live=host&&!host.x.sealed&&api.isCreature(s,host.x);
  if(t.mode==='fight'){
   start(s,t,[{op:'FightEnemy240',fighter:t.grRef,g998EntryFight:true,optional:true}]);
  }else{
   if(!t.arrived)break;
   const n=live?currentPower506(s,host.x):t.grLastPower;
   if(n!==undefined&&n!=='-∞'&&n!==-Infinity)start(s,t,[{op:'Target',anyOwner:true,optional:true,to:'hand',filter:{creature:true,...(n==='∞'||n===Infinity?{}:{maxPower:n,g199Power:true})}}]);
  }
  break;
 }
 case'g34_GrSummon1498':api.grSummon(s,t.p,{g1498Grant:{grant:t.grant,spell:!!t.spell||card(t.source).type==='spell',permanent:!!t.permanent,untilStart:!!t.untilStart,delayed:t.delayed,source:t.source,controller:t.controller??t.p}});break;
 case'g34_AuraGr1353':api.grSummon(s,t.p,{tapped:!!t.tapped,...(t.g1668Receipt?{g1668Receipt:t.g1668Receipt}:{})});break;
 case'g34_SelfAura1460':{
  const host=sourceHost474(s,t);
  if(host)put(s,{...t,op:'g34_AuraFromGrave1354',host:{uid:host.x.uid,incarnation:host.x.incarnation||0}});break;
 }
 case'g34_AuraHostGrant1460':{
  const host=api.auraHost1352(s,t.p,t.host);if(host)applyGrant(s,t,host);break;
 }
 case'g34_AuraHostUntap1472':{
  const host=api.auraHost1352(s,t.p,t.host);if(host)api.untap(s,t.p,host);break;
 }
 case'g34_AuraGraveReturn1460':{
  for(const ref of t.auras||[]){const x=own.grave.find(x=>x.uid===ref.uid&&(x.zoneSerial||0)===ref.serial);if(x)zoneMove(s,t.p,'grave',x.uid,t.to,t);}break;
 }
 case'g34_AuraFromGrave1354':{
  const rows=graveAuras1354(s,t);
  if(rows.length)choice(s,t,'このクリーチャーに付ける墓地のオーラを選ぶ',rows.map(x=>
   opt(card(x).name,{uid:x.uid,serial:x.zoneSerial||0},10+cost(card(x)),x.cardId)));
  break;
 }
 case'g34_AuraReattach1353':{
  const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation&&x.auraTo1352);
  const targets=x?api.auraTargets1352(s,t.p).filter(y=>y.uid!==x.auraTo1352.uid):[];
  if(targets.length)choice(s,t,'DL-Sys：別のGRクリーチャーに付ける？',[...targetOptions(s,t.p,targets),skip()]);
  break;
 }
 case'g34_RecastHandSpell1245':{
  if(t.g1250Sacrifice){
   const host=sourceHost474(s,t);
   if(host&&!host.x.sealed&&api.isCreature(s,host.x))start(s,t,[{op:'SelfSacrifice407',defs:[
    {op:'RecastAfterSacrifice1250',target:t.target,serial:t.serial,face:t.face}
   ]}]);
   break;
  }
  const row=recastHandSpell1245(s,t);
  if(row)choice(s,t,'墓地から同じ呪文をもう一度唱える？',[
   opt(row.c.name+'を唱える',true,spellScore555(s,t,row.c),row.x.cardId),skip()
  ]);
  break;
 }
 case'g34_RecastFromGrave1245':
 case'g34_RecastAfterSacrifice1250':{
  const row=recastHandSpell1245(s,t);
  if(row)cast(s,t.p,row.x.uid,true,null,t.face,null,'grave',card(t.source).name);
  break;
 }
 case'g34_ElementOrMana796':choice(s,t,'山札の下に置くエレメントかマナのカードを選ぶ',elementOrManaOptions796(s,t));break;
 // Choose exactly four before moving anything; the chosen grave's owner orders them.
 case'g34_DiasGrave1821':{
  if(t.owner===undefined){
   const rows=[t.p,1-t.p].filter(p=>s.players[p].grave.length>=4);
   if(rows.length)choice(s,t,'山札の下に戻す4枚を選ぶ墓地',[...rows.map(p=>opt(p===t.p?'自分の墓地':'相手の墓地',p,p===t.p?4:10)),skip()]);
   break;
  }
  const selected=t.selected||[],grave=s.players[t.owner].grave;
  if(selected.some(r=>!grave.some(x=>x.uid===r.uid&&(x.zoneSerial||0)===r.serial)))break;
  if(selected.length===4){
   const moved=[];
   for(const r of selected){const x=grave.find(x=>x.uid===r.uid);if(zoneMove(s,t.owner,'grave',r.uid,'deck',t))moved.push(x);}
   put(s,task('g34_BattleCardMove579',1-t.p,t.source,{owner:'self',zones:['battle','hand'],to:'deck',toOwnerDeck:true,controller:t.p,title:'山札の下に置く自分のカードを1枚選ぶ'}));
   if(moved.length>1)put(s,task('g78_BottomOrder',t.owner,t.source,{rows:moved.map(x=>({uid:x.uid,label:card(x).name,cardId:x.cardId})),ordered:[],newCards:true,controller:t.p}));
   break;
  }
  const rows=grave.filter(x=>!selected.some(r=>r.uid===x.uid));
  if(rows.length>=4-selected.length)choice(s,t,'山札の下に戻すカードを4枚選ぶ（'+selected.length+'/4）',[...rows.map(x=>opt(card(x).name,x.uid,10,x.cardId)),skip()]);
  break;
 }
 case'g34_LibraryWindow1829':{
  const rows=api.librarySources1829(s,t.p);
  if(rows.length)choice(s,t,'通常のドローの前にLibrary of Alexandriaを使う？',[
   ...rows.map(x=>opt(card(x).name+'をタップして1枚引く',x.uid,own.deck.length>2?15:-1000,x.cardId)),
   opt('使わず通常のドローへ進む',null,0)
  ]);
  break;
 }
 case'g34_GravePick598':{
  if(t.g1828OpponentGrave&&t.owner===undefined)t={...t,owner:1-t.p};
  if(t.owner===undefined){
   const options=[t.p,1-t.p].filter(p=>t.g1109RequiredShuffle||s.players[p].grave.length&&(!t.upTo||api.canMoveZone(s,p,'grave')))
    .map(p=>opt(p===t.p?'自分の墓地':'相手の墓地',p,gravePickPlayerScore598(s,t,p)));
   if(options.length)choice(s,t,'山札に戻すカードを選ぶ墓地',t.mode==='destroy'||t.g1109RequiredShuffle?options:[...options,skip()]);
   else if(t.mode==='destroy')finishGravePick598(s,{...t,selected:[]});
   break;
  }
  const rows=t.g1109RequiredShuffle&&!api.canMoveZone(s,t.owner,'grave')?[]:
   s.players[t.owner].grave.filter(x=>!t.selected.includes(x.uid));
  if(!rows.length||t.n!==undefined&&t.selected.length>=t.n){finishGravePick598(s,t);break;}
  const options=rows.map(x=>opt(card(x).name,x.uid,10+(t.owner===t.p?-1:1)*Math.min(9,cost(card(x))),x.cardId));
  if(t.upTo)options.push(opt('選んだ'+t.selected.length+'枚で進む',null,0));
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
    ...(!t.g1137DestroyAfter?[skip()]:[])
   ]);
   break;
  }
  const owner=t.self?t.p:1-t.p;
  const rows=policyTake(s,owner,'grave',api);
  if(rows.length){
   for(const y of rows)clear(y,'deck');
   api.addZone(s,owner,'deck',...api.shuffled(rows,Math.floor(api.random(s)*4294967296)));
   api.log(s,t.p,'shuffleGrave',(t.self?'自分':'相手')+'の墓地'+rows.length+'枚をシャッフルして山札の下に置いた',{cardId:t.source});
  }
  if(t.g1137DestroyAfter)start(s,t,[{op:'Target',to:'grave',optional:true,
   filter:{creature:true,max:rows.length},title:'山札の下に置いた枚数以下のコストを持つ相手クリーチャーを破壊する？'}]);
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
  (s.extLimits??=[]).push({kind:'g712BlockBreak',player:t.p,source:t.source,uid:t.uid,incarnation:t.incarnation||0,
   turn:s.turn,expires:'end',who:s.active,...(t.allCreatures?{allCreatures:true}:{}),
   ...(t.spell?{spellCost:cost(card(t.source))}:{})});
  break;
 case'g34_TurnNamedAttack1123':
  (s.extLimits??=[]).push({kind:'g1123TurnNamedAttack',player:t.p,source:t.source,spellCost:cost(card(t.source)),
   turn:s.turn,expires:'end',who:s.active,name:exactName(t.name),defs:t.defs});
  break;
 case'g34_BladeCircle1257':{
  const who=1-t.p;
  (s.extLimits??=[]).push({kind:'g1257BladeCircle',source:t.source,spellCost:cost(card(t.source)),
   who,startsPlayer:who,active:false,expires:'end'});
  break;
 }
 case'g34_TurnAttackWatch':
  (s.extLimits??=[]).push({kind:'turnAttackWatch',player:t.p,source:t.source,spellCost:cost(card(t.source)),
   turn:s.turn,expires:'end',who:s.active,filter:t.filter,defs:t.defs});
  break;
 case'g34_TurnAttackDraw613':
  (s.extLimits??=[]).push({kind:'g613AttackDraw',player:t.p,source:t.source,turn:s.turn,expires:'end',who:s.active,
   ...(t.spell===false?{spell:false}:{}),...(t.optional?{optional:true}:{}),...(t.refs?{refs:t.refs,n:t.n}:{})});
  break;
 case'g34_SpellLock489':
  if(t.ownTurn&&s.active!==t.p)break;
  (s.extLimits??=[]).push({kind:t.max===undefined?'cast':'spellCostLock',player:t.owner==='self'?t.p:1-t.p,controller:t.p,expires:t.expires,who:t.expires==='end'?s.active:t.p,...(t.max===undefined?{}:{max:t.max})});break;
 case'g34_AttackCap627':{
  const player=1-t.p;
  if(t.g1071NextTurn){
   (s.extLimits??=[]).push({kind:'g627AttackCap',player,active:true,turn:s.turn+1});
   break;
  }
  const duration=t.max===undefined?{startsPlayer:player,active:false,expires:'end',who:player}:
   {max:t.max,active:true,expires:'start',who:t.p};
  (s.extLimits??=[]).push({kind:'g627AttackCap',player,...duration,
   spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))});
  break;
 }
 case'g34_NextOpponentStay1643':
  (s.extLimits??=[]).push({kind:'g1643NextOpponentStay',player:t.p,who:1-t.p,afterTurns:s.players[1-t.p].turns,expires:'end',spellSource:t.source,spellCost:cost(card(t.source))});
  break;
 case'g34_GroupStay627':
  for(const {y} of t.g262Elements?s.players[t.p].battle.filter(y=>!y.sealed&&!y.faceDown&&matches(s,t.p,y,t.filter)).map(y=>({y})):groupPowerRows(s,t))stayUntilStart627(s,t,y);
  break;
 case'g34_Stay627':stayUntilStart627(s,t,sourceHost474(s,t)?.x);break;
 case'g34_LockAttacks726':
  for(const player of [0,1])(s.extLimits??=[]).push({kind:'attack',player,controller:t.p,who:s.active,expires:'end'});
  break;
 case'g34_PlayerAttackResponse741':
  (s.extLimits??=[]).push({kind:'g741PlayerAttackResponse',who:t.p,source:t.source,defs:t.defs,expires:'start'});
  break;
 case'g34_Lock':(s.extLimits??=[]).push({...t.limit,player:t.limit.player??(t.g746Self?t.p:1-t.p),who:t.limit.who??(t.g1740UntilEnd?s.active:t.p),expires:t.g1740UntilEnd?'end':'start',
  ...(t.spell?{spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))}:{})});break;
 case'g34_UntapTeam934':{
  const source=t.g179Other?sourceHost474(s,t)?.x:null;
  for(const ally of creatures(s,t.p))if(ally!==source)api.untap(s,t.p,ally);
  break;
 }
 case'g34_Untap':{
  if(t.g904Refs){
   for(const p of [0,1]){
    const host=s.players[p].battle.find(y=>api.allLayers(y).some(z=>t.g904Refs.includes(key(z))));
    if(host){api.untap(s,p,host);break;}
   }
   break;
  }
  const owner=t.g191First?s.players.findIndex(p=>p.battle.some(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)))):t.p,y=t.g191First&&owner>=0?s.players[owner].battle.find(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))):t.g404Carrier?own.battle.find(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)):x;if(y&&api.canUntap(y)){const was=y.tapped;y.tapped=false;if(was)combined.untapped(s,owner,y);}break;}
 case'g34_FirstDiscardUse1268':{
  const rows=firstDiscardOptions1268(s,t);
  if(!rows.length)break;
  if(!rows.some(r=>r.value.type==='spell'))rows.push(opt('呪文を唱える効果を選ぶ',null,0));
  if(!rows.some(r=>r.value?.type==='creature'))rows.push(opt('クリーチャーを出す効果を選ぶ',null,0));
  choice(s,t,'このターン最初に捨てたカードを使う効果を選ぶ',rows);
  break;
 }
 case'g34_Execute':{
  if(t.g1164Opponent){
   put(s,{...t,p:1-t.p,g1164Opponent:false,g1164MustDeclineWhenUnavailable:true});
   break;
  }
  const max=t.g1139HandSizeMax?own.hand.length:t.max,origins=t.zones||[t.origin||'hand'];
  const rows=origins.flatMap(origin=>{
   if((t.g555FinishTo||t.g1225SeedOnly)&&!api.canMoveZone(s,t.p,origin))return [];
   return own[origin].flatMap(original=>extraFaces1104(original,{g1104PsychicFaces:t.g1675ExtraSummon},origin).flatMap(y=>{
    if(t.g1578Exact&&(y.uid!==t.g1578Exact.uid||(y.zoneSerial||0)!==t.g1578Exact.serial))return [];
    if(t.g1616Refs&&!t.g1616Refs.some(r=>r.uid===y.uid&&r.serial===(y.zoneSerial||0)))return [];
    if(!matches(s,t.p,{...y,cardId:y.cardId},t.filter))return [];
    return faces(card(y)).flatMap((c,face)=>{
     const type=c.type;
     if(!api.canExecuteUnpaid(s,t.p,c)||t.g1672ManaCivilizations&&!manaCivilizations1672(s,t.p,c))return [];
     if(t.g1656BelowCastCost!==undefined&&cost(c)>=(t.g1656BelowCastCost==='∞'?Infinity:t.g1656BelowCastCost))return [];
     if(t.g1650VividOnly&&c.g1335VividDraw===undefined)return [];
     if(t.g1568KnightMagic&&!hasKnightMagic(c))return [];
     if(t.g1324ExecuteRace&&!race(c,t.g1324ExecuteRace)&&!(type==='spell'&&cost(c)<=t.g1324SpellMax))return [];
     if(t.spellOnly&&type!=='spell'||t.g1225SeedOnly&&!(type==='seed'||c.seedCreature||c.natureAce4)||t.g985FaceNameIncludes&&!c.name.includes(t.g985FaceNameIncludes)||
        t.g556SpellColor&&!colors(c).includes(t.g556SpellColor)||
        t.spellColorsAny&&!t.spellColorsAny.some(color=>colors(c).includes(color))||
        t.creatureOnly&&type!=='creature'||t.nonCreature&&type==='creature'||
        t.element&&!['creature','seed','gear','field','duelist'].includes(type)||
        max!==undefined&&cost(c)>max||t.trigger&&!(c.trigger||c.triggerPlus||c.superTrigger)||
        !api.canCast(s,t.p,c,origin)||['creature','aura'].includes(type)&&(!api.canEnter(s,t.p,c,{origin,execution:true})||
        c.evolution&&!api.evolutionBases(s,t.p,c).length))return [];
     const prefix=t.zones?.length>1?(({hand:'手札：',mana:'マナ：',grave:'墓地：',extra:'超次元ゾーン：'})[origin]||''):'';
     const value={uid:y.uid,face,origin,...(t.g1675ExtraSummon?{serial1675:original.zoneSerial||0,...(y!==original?{g1104Back:true}:{})}:{}),...(t.g555FinishTo?{serial555:y.zoneSerial||0}:{})};
     return [opt(prefix+c.name,value,t.g555FinishTo?spellScore555(s,t,c):20+cost(c),y.cardId)];
    });
   }));
  });
  if(!rows.length&&t.g1244NoEmptyOffer)break;
  if(!rows.length&&t.g1164MustDeclineWhenUnavailable){start(s,t,t.g408Decline);break;}
  if(t.optional!==false)rows.push(t.g408Decline?{...skip(),score:modeScore(s,t,t.g408Decline)}:skip());
  choice(s,t,t.title||'コストを支払わず実行するカードを選ぶ',rows);
  break;
 }
 case'g34_Choose':{
  const title=t.g1045Preselect?'効果を選ぶ（'+((t.modeSelections?.length||0)+1)+'/'+t.g1045Preselect+'）':'効果を選ぶ';
  const chooser=t.opponentChooses?1-t.p:t.p,sign=t.opponentChooses?-1:1;
  const host=t.g1071Evolution?sourceHost474(s,t):null;
  const evolved=host&&!host.x.sealed?api.isEvolution(host.x):t.g1059LastEvolution;
  const options=t.modes.flatMap((m,i)=>m.requiresEvolution&&!evolved||
   m.condition&&!ownCondition(s,t.p,m.condition,t.uid,t.incarnation)||
   t.g1612DistinctModes&&t.modeSelections?.includes(i)||
   t.modesOncePerTurn&&used792(s,t,modeUse1170(t,i))
   ?[]:[opt(m.label||'効果'+(i+1),i,t.g184Modes?sign*modeScore(s,t,m.defs):m.score??10)]);
  choice(s,t,t.title||title,options,chooser);
  break;
 }
 case'g34_Custom':custom(s,t);break;
 default:throw Error('未実装の6デッキ効果：'+t.op);
 }return true;}
 function ramp(s,t,n){
  const batch=t.g809Together?[]:null;
  const destTogether=batch?(api.deckDestination1365(s,t.p,'mana',api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana')):null;
  for(let i=0;i<n;i++){
   const y=api.takeTop(s,t.p);
   if(!y)break;
   const dest=destTogether||(api.deckDestination1365(s,t.p,'mana',api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana'));
   clear(y,dest);
   if(dest==='mana'){
    if(t.faceDown){y.faceDown=true;y.tapped=!!t.tapped;}
    else if(t.tapped)y.tapped=true;
   }
   if(batch){batch.push(y);continue;}
   api.addZone(s,t.p,dest,y);
   if(dest==='mana'&&t.g603Draw&&matches(s,t.p,y,t.g603Draw.filter))start(s,t,[{op:'Draw',n:1,optional:!!t.g603Draw.optional}]);
   if(t.g1673DreamStop&&dest==='mana'&&!api.deckWasShuffled1365(s,y)&&
      s.players[t.p].mana.some(x=>x.uid===y.uid)&&race(api.zoneCard(s,t.p,y,'mana'),'ドリームメイト')){
    s.attack=null;api.log(s,t.p,'stopAttack',card(t.source).name+'で攻撃を中止',{cardId:t.source});
   }
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
 case'g34_JupiterDeploy1554':{
  const host=sourceHost474(s,t)?.x;
  if(v&&host&&!host.sealed)api.deployUnder1554(s,t.p,{uid:host.uid,incarnation:host.incarnation||0},v);
  break;
 }
 case'g34_KizunaPlus1544':{
  if(v==null)break;
  const host=sourceHost474(s,t)?.x,below=host&&api.layers(host).slice(1).find(y=>y.uid===v);
  if(!host||host.sealed||!below||!api.canMoveZone(s,t.p,'battle'))break;
  const snapshot=y=>({uid:y.uid,incarnation:y.incarnation||0,cardId:y.cardId,
   ...(y.g1357Copies?{g1357Copies:structuredClone(y.g1357Copies)}:{}),defs:structuredClone(effective(y,s).g1540P||[])});
  const ownP=snapshot(host),others=creatures(s,t.p).filter(y=>y.uid!==host.uid&&!y.sealed&&!y.faceDown&&effective(y,s).g1540P?.length).map(snapshot);
  api.moveBattleCard(s,t.p,v,'grave',{controller:t.p});
  if(own.grave.some(y=>y.uid===v))put(s,{...t,op:'g34_KizunaPlusOther1544',g1544Self:ownP.defs.length?[ownP]:[],g1544Others:others});
  break;
 }
 case'g34_KizunaPlusOther1544':{
  const other=t.g1544Others.find(y=>y.uid===v);
  for(const y of [...t.g1544Self,...(other?[other]:[])])queue(s,t.p,y,y.defs);
  break;
 }
 case'g34_KizunaComp1543':{
  if(v!=null){if(t.g1543Rows.some(y=>y.uid===v)&&!t.g1543Selected.includes(v))put(s,{...t,g1543Selected:[...t.g1543Selected,v]});}
  else for(const y of t.g1543Rows.filter(y=>t.g1543Selected.includes(y.uid)))queue(s,t.p,y,y.defs);
  break;
 }
 case'g34_Kizuna1540':{
  const y=own.battle.find(y=>y.uid===v.uid&&(y.incarnation||0)===v.incarnation&&!y.sealed&&!y.faceDown&&api.isCreature(s,y));
  const defs=y&&effective(y,s).g1540P;
  if(defs?.length)queue(s,t.p,y,defs);
  break;
 }
 case'g34_ChooseWeaponHost1361':{
  const host=creatures(s,t.p).find(y=>y.uid===v);
  if(host)put(s,{...t,op:'g34_DeployDragheart1361',uid:host.uid,incarnation:host.incarnation||0,weaponOnly:true});
  break;
 }
 case'g34_GodWall1485':{
  const y=own.battle.find(x=>x.uid===v);if(y)(s.extLimits??=[]).push({kind:'g627Stay',ref:{uid:y.uid,incarnation:y.incarnation||0},destroyOnly:!race(effective(y,s),'ゴッド'),expires:'start',who:t.p,source:t.source,spellCost:cost(card(t.source))});break;
 }
 case'g34_DeployWeapons1742':put(s,{...t,...(v?{selected:[...(t.selected||[]),v]}:{done:true})});break;
 case'g34_DeployDragheart1361':{
  const selected=dragheartOptions1361(s,t).find(y=>y.uid===(v?.uid??v)&&!!y.dragheartFlipped===!!v?.back);
  if(!selected)break;
  const y=remove(own.extra,selected.uid);
  if(selected.dragheartFlipped)y.dragheartFlipped=true;
  if(card(y).type==='weapon'){
   y.weaponTo={uid:t.uid,incarnation:t.incarnation||0};
   own.hasWeapons1361=true;
  }
  enter(s,t.p,y,null,{origin:'extra',execution:false,effectController:t.controller??t.p});
  break;
 }
 case'g34_YurufuwaDeclare1293':{
  const row=t.declaring;
  if(v){
   api.log(s,t.p,'reveal',card(row.source).name+'の能力を使用宣言',{cardId:row.source});
   api.enqueue(s,t.p,{source:row.source,uid:row.uid,effect:'extended',
    task:task('g34_YurufuwaDeploy1293',t.p,row.source,row)});
  }
  put(s,t);
  break;
 }
 case'g34_BarbatChessTerminal1292':
  if(v&&!s.g7TerminalUsed?.[t.p]){
   (s.g7TerminalUsed??=[false,false])[t.p]=true;
   api.log(s,t.p,'ability',card(t.source).name+'：終極宣言を使用',{cardId:t.source});
   // The declaration consumes its use even when Diamond Star nullifies the next ability (QA 44206).
   if(!creatures(s,1-t.p).some(y=>effective(y,s).noCostReduction))
    (s.extLimits??=[]).push({kind:'g1292MagicTerminal',player:t.p,source:t.source,expires:'end',who:t.p});
  }
  break;
 case'g34_UkonSakon1146':{
  if(!v||used792(s,t,t))break;
  const host=sourceHost474(s,t.subject);
  if(!host||host.x.sealed||!api.isCreature(s,host.x))break;
  (s.once??={})[onceKey792(t,t)]=s.turn;
  (host.x.powerModifiers??=[]).push({amount:4000});
  applyGrant(s,{...t,g1146UntilLeave:true,grant:{speedAttacker:true,poweredBreaker:true}},host.x);
  break;
 }
 case'g34_OpponentChooseAttacker916':{
  const player=1-t.p;
  const selected=v&&s.players[player].battle.find(y=>key(y)===key(v));
  if(selected&&s.active===player){
   force546(s,{...t,when:'end'},player,selected);
   applyGrant(s,{...t,grant:{g736ForcedAttack:true}},selected);
  }
  break;
 }
 case'g34_JesterShields1125':
  put(s,{...t,picked:v?[...t.picked,v]:t.picked,done:!v});
  break;
 case'g34_CastBattleTwin1175':{
  const unit=v&&live(s,{...t,...v});
  if(unit&&!unit.sealed&&api.isCreature(s,unit))
   api.castBattleSpell(s,t.p,v.uid,v.incarnation,unit.cardId,{label:card(t.source).name+'の能力'});
  break;
 }
 case'g34_CrystalManaDown1175':if(v&&!used792(s,t,t)){
  const mana=own.mana.find(y=>y.uid===t.target&&!y.faceDown&&(y.zoneSerial||0)===t.serial);
  if(mana){
   (s.once??={})[onceKey792(t,t)]=s.turn;
   turnManaDown(s,t,{p:t.p,uid:mana.uid,serial:t.serial});
  }
 }break;
 case'g34_AlchemistDraw1670':if(v)api.draw(s,t.drawPlayer,1);break;
 case'g34_DSwitch1669':if(v&&x&&!x.sealed&&!x.faceDown&&!x.g1175DSwitched&&!d2Locked1188(s,t.p)){
  x.g1175DSwitched=true;
  api.log(s,t.p,'dSwitch',card(t.source).name+'のDスイッチを使う',{cardId:t.source});
  start(s,t,t.defs);
 }break;
 case'g34_CrystalSwitch1175':if(v&&x&&!x.sealed&&!x.g1175DSwitched&&!d2Locked1188(s,t.p)){
  x.g1175DSwitched=true;
  api.log(s,t.p,'dSwitch',card(t.source).name+'のDスイッチを使う',{cardId:t.source});
  start(s,t,[{op:'UntapMana',g1175FaceDownOnly:true}]);
 }break;
 case'g34_ShieldTriggerUntap1015':
  if(v)api.interruptBreak(s,t.p,[v],{...t,op:'g34_Untap',g191First:true},
   {g842Hand:true,controller:t.p,source:t.source});
  break;
 case'g34_ShieldHandFollow1017':{
  if(!v){if(t.optional)start(s,t,t.defs);break;}
  const follow={...t,op:'g34_Sequence'};
  const moved=api.interruptBreak(s,t.p,[v],follow,{g842Hand:true,controller:t.p,source:t.source,noST:t.noST,cardOnly:t.cardOnly});
  if(t.requireHand&&!moved)follow.defs=[];
  break;
 }
 case'g34_ShieldShuffle1018':{
  const {owner,uid}=v,moved=api.moveShield(s,owner,uid,'deck');
  finishOrDeferShield1352(s,t,'shuffle',owner,moved);
  break;
 }
 case'g34_ShieldCycle1737':{
  if(!v)break;
  const {owner,uid}=v,root=api.findShield(s.players[owner],uid);
  if(!root)break;
  const labels=api.shieldCards(root).filter(x=>x.faceUp).map(x=>[x.uid,card(x).name]);
  const next={...t,g1737ShieldLabels:labels},moved=api.moveShield(s,owner,uid,'deck');
  finishOrDeferShield1352(s,next,'cycle1737',owner,moved);
  break;
 }
 case'g34_ShieldGraveReplace1109':{
  const {owner,uid}=v,moved=api.moveShield(s,owner,uid,'grave');
  finishOrDeferShield1352(s,t,'replace',owner,moved);
  break;
 }
 case'g34_TappedShieldPick842':
  put(s,{...t,picked:[...t.picked,v]});
  break;
 case'g34_TopDestination1244':{
  const y=own.deck.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);
  if(!y)break;
  if(v==='shields')api.shieldTop(s,t.p,card(t.source),null,{uid:y.uid});
  else{
   zoneMove(s,t.p,'deck',y.uid,'mana');
   api.deckCheck(s,t.p);
  }
  break;
 }
 case'g34_ShieldTop':
  if(!t.g1233Look)return false;
  release(s,t.p,t.target);
  if(v)api.shieldTop(s,t.p,card(t.source),null,{uid:t.target});
  break;
 case'g34_Unryu852':if(v){
  const top=own.deck.find(x=>x.uid===t.target);
  if(top&&card(top).type==='gear'&&canPut(s,t.p,top,'deck'))
   start(s,t,[{op:'Put',origin:'deck',target:top.uid},{op:'Untap',g191First:true}]);
 }break;
 case'g34_LookBlocker1243':{
  const y=own.deck.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);
  if(!y)break;
  // Once the player chooses to put it out, an entry replacement does not grant the hand fallback.
  if(v)put(s,task('g34_Put',t.p,t.source,{origin:'deck',target:y.uid}));
  else{
   zoneMove(s,t.p,'deck',y.uid,'hand');
   api.deckCheck(s,t.p);
  }
  break;
 }
 case'g34_LookSpell841':{
  const y=v&&own.deck.find(x=>x.uid===v.uid&&(x.zoneSerial||0)===v.serial);
  const c=y&&faces(api.zoneCard(s,t.p,y,'deck'))[v.face];
  if(c?.type==='spell'&&(t.g1242MaxCost===undefined||cost(c)<=t.g1242MaxCost)&&api.canCast(s,t.p,c,'deck'))
   cast(s,t.p,y.uid,true,null,v.face,null,'deck',t.g878SpellBlue||t.g1242MaxCost!==undefined?card(t.source).name:'スーパー・スペル・グレートブルー');
  break;
 }
 case'g34_RevealTopCreatureOrSpell1251':{
  if(v===null)break;
  const y=own.deck.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);
  const selected=y&&topCreatureOrSpell1251(s,t,y).find(x=>x.face===v);
  if(selected?.c.type==='spell')cast(s,t.p,y.uid,true,null,v,null,'deck',card(t.source).name);
  else if(selected)put(s,{...t,op:'g34_Put',origin:'deck',target:y.uid,face:v},
   {...t,op:'g34_RevealRelease514',ids:[]});
  break;
 }
 case'g34_SelfGraveBottom839':
  if(v&&ownGraveSource839(own,t)&&zoneMove(s,t.p,'grave',t.uid,t.g1615Top?'deckTop':'deck',{...t,g183Return:!!t.g1615Top}))start(s,t,t.after);
  break;
 case'g34_RevealDiscard839':
  if(t.shown){
   if(t.shown.includes(v))api.discardSelected(s,1-t.p,[v],t.source,t.p);
  }else put(s,{...t,selected:[...t.selected,v]});
  break;
 case'g34_ReturnBases939':
  put(s,v?{...t,selected:[...(t.selected||[]),v]}:{...t,confirmed:true});
  break;
 case'g34_BreakOrder1136':{
  const r=t.sources[v],sources=t.sources.map((x,i)=>i===v?{...x,count:x.count-1}:x).filter(x=>x.count);
  put(s,...tasks(t.p,r.source,r.defs),{...t,sources});
  break;
 }
 case'g34_Assign1136':{
  const mana=t.rows.find(r=>r.uid===v),shield=t.rows.find(r=>r.uid!==v);
  start(s,t,[{op:'SplitMove1136',target:mana,to:'mana'},{op:'SplitMove1136',target:shield,to:'shields'}]);
  break;
 }
 case'g34_PaidTop1164':{
  release(s,t.p,t.target);
  if(v&&own.deck.some(y=>y.uid===t.target))
   cast(s,t.p,t.target,false,v.baseUid,v.face,null,'deck','ハタモチ・チュリス');
  break;
 }
 case'g34_LookDestination467':put(s,{...t,op:'g34_LookPick',stages:t.stages.map((q,i)=>i===t.stage?{...q,to:v,g467Chosen:true}:q)});break;
 case'g34_PowerSweep696':start(s,t,[{op:'Sweep',both:true,to:'grave',filter:{creature:true,...(v>0?{minPower:v}:{}),maxPower:v,g199Power:true}}]);break;
 case'g34_CostSweep596':start(s,t,[{op:'Sweep',to:'grave',filter:{creature:true,min:v,max:v}}]);break;
 case'g34_GraveHandMana771':put(s,{...t,picks:[...(t.picks||[]),v]});break;
 case'g34_AdamReturn1341':{
  const x=v&&live(s,t);
  if(x&&!x.sealed){
   put(s,{...t,op:'g34_AdamPlace1341'});
   move(s,[{player:t.p,uid:x.uid,to:'hand',destroy:false,controller:t.p}]);
  }
  break;
 }
 case'g34_AdamPlace1341':{
  const seed=v&&adamSeeds1341(s,t).find(x=>x.uid===v);
  if(seed){
   const x=remove(own.hand,t.uid);
   enter(s,t.p,x,seed.uid,{origin:'hand',execution:false,g31Force:true});
  }
  break;
 }
 case'g34_FinalSeed1340':
  if(v)put(s,task('g47_AttachOrder',t.p,t.source,{host:{uid:t.uid,incarnation:t.incarnation||0},targetRef:t.seed,ordered:[]}));
  break;
 case'g34_FinalTurn1340':
  if(v)put(s,{...t,picked:[...(t.picked||[]),v]});
  break;
 case'g34_ClanAttack1338':{
  const host=sourceHost474(s,t)?.x;
  if(!v||!clanSpellOptions1338(s,t,host).some(({value})=>value.uid===v.uid&&value.face===v.face))break;
  const x=remove(host.under,v.uid);
  x.g5Origin='battle';
  x.tapped=host.tapped;
  (own.g34Holding??=[]).push(x);
  api.underCardsLeft(s,t.p,host,1);
  cast(s,t.p,x.uid,true,null,v.face,null,'g34Holding',card(t.source).name);
  break;
 }
 case'g34_KariyaSelect1337':
  if(v)put(s,{...t,picks:[...(t.picks||[]),v]});
  else reserveKariyaSpells1337(s,t);
  break;
 case'g34_GraveSpell594':{
  if(t.g1353DLSys)put(s,{...t,op:'g34_AuraReattach1353'});
  if(!v||!graveSpellOptions594(s,t).some(({value:r})=>r.owner===v.owner&&r.uid===v.uid&&r.face===v.face&&r.serial===v.serial))break;
  const foreign=v.owner!==t.p,origin=foreign?'g34Holding':'grave',grave=s.players[v.owner].grave;
  const x=foreign?remove(grave,v.uid):grave.find(x=>x.uid===v.uid);
  if(foreign){x.cardOwner=v.owner;x.g5Origin='grave';(own.g34Holding??=[]).push(x);}
  x.finishTo='deck';
  cast(s,t.p,x.uid,true,null,v.face,null,origin,t.castLabel||(t.g1353DLSys?'DL-Sys':'スーパー・S・トリガー'));
  break;
 }
 case'g34_AuraReattach1353':{
  const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation&&x.auraTo1352);
  const host=x&&api.auraTargets1352(s,t.p).find(y=>y.uid===v&&y.uid!==x.auraTo1352.uid);
  if(host)api.attachAura1352(s,t.p,x,host,'battle');
  break;
 }
 case'g34_HandAura1437':{
  const x=v&&own.hand.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial&&card(x).g1437HandAttach);
  const host=own.battle.find(x=>!x.sealed&&api.isCreature(s,x)&&api.allLayers(x).some(y=>y.uid===t.host.uid&&(y.incarnation||0)===t.host.incarnation));
  if(x&&host){remove(own.hand,x.uid);clear(x,'battle');api.attachAura1352(s,t.p,x,host,'hand');}break;
 }
 case'g34_ManaAura1437':{
  const x=v&&own.mana.find(x=>x.uid===v.uid&&(x.zoneSerial||0)===v.serial&&!x.faceDown&&card(x).type==='aura'&&cost(card(x))<=t.max);
  const host=api.auraHost1352(s,t.p,t.host);
  if(x&&host&&api.canMoveZone(s,t.p,'mana')&&api.canEnter(s,t.p,card(x),{origin:'mana',execution:false,auraHost:t.host})){remove(own.mana,x.uid);clear(x,'battle');api.attachAura1352(s,t.p,x,host,'mana');}break;
 }
 case'g34_AuraFromGrave1354':{
  const aura=v&&graveAuras1354(s,t).find(x=>x.uid===v.uid&&(x.zoneSerial||0)===v.serial);
  if(!aura)break;
  const host=api.auraHost1352(s,t.p,t.host);
  remove(own.grave,aura.uid);
  clear(aura,'battle');
  api.attachAura1352(s,t.p,aura,host,'grave');
  break;
 }
 case'g34_RecastHandSpell1245':{
  const row=v&&recastHandSpell1245(s,t);
  if(row)cast(s,t.p,row.x.uid,true,null,t.face,null,'grave',card(t.source).name);
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
 case'g34_DiasGrave1821':
  if(t.owner===undefined){if(v===0||v===1)put(s,{...t,owner:v,selected:[]});}
  else if(v){const x=s.players[t.owner].grave.find(x=>x.uid===v);if(x&&!t.selected.some(r=>r.uid===v))put(s,{...t,selected:[...t.selected,{uid:v,serial:x.zoneSerial||0}]});}
  break;
 case'g34_LibraryWindow1829':
  if(v)api.activateLibrary1829(s,t.p,v);
  else if(s.startStep)s.startStep.libraryDeclined1829=true;
  break;
 case'g34_GravePick598':
  if(t.owner===undefined){if(v===0||v===1)put(s,{...t,owner:v,selected:[]});}
  else if(v===null)finishGravePick598(s,t);
  else put(s,{...t,selected:[...t.selected,v]});
  break;
 case'g34_KeepTypes1285':put(s,{...t,step:t.step+1,picked:[...t.picked,v]});break;
 case'g34_KeepHand1516':if(v&&!t.selected.includes(v))put(s,{...t,selected:[...t.selected,v]});break;
 case'g34_KeepOne604':{
  const hand=t.zone==='hand',to=t.to||'grave',rows=hand?own.hand:creatures(s,t.p).filter(y=>!y.sealed);
  if(!rows.some(y=>y.uid===v))break;
  const rest=rows.filter(y=>y.uid!==v);
  if(!rest.length)break;
  if(hand)api.discardSelected(s,t.p,rest.map(y=>y.uid),t.source,t.controller);
  else move(s,rest.map(y=>({player:t.p,uid:y.uid,to,destroy:to==='grave',controller:t.controller})));
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
  if(chosen)move(s,chainMatches838(s,rows,chosen).map(y=>({player:owner,uid:y.uid,to:'grave',destroy:true,controller:t.p})));
  break;
 }
 case'g34_HellReikonDestroy1271':
  if(v)move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}],{
   kind:'g1271HellReikon',p:t.p,source:t.source,uid:t.uid,incarnation:t.incarnation||0
  });
  break;
 case'g34_RomanoCast1120':
  if(v&&romanoSpells1120(s,t).some(o=>o.value.uid===v.uid&&o.value.face===v.face&&o.value.serial===v.serial))
   cast(s,t.p,v.uid,true,null,v.face,null,'hand',card(t.source).name);
  break;
 case'g34_TargetDestination467':{
  if(t.g1165DestinationEffects){
   const {p,uid,incarnation}=t.target;
   const y=s.players[p].battle.find(x=>x.uid===uid&&(x.incarnation||0)===incarnation&&!x.sealed);
   if(y){
    const moveToOwner=v==='hand'?{toOwnerHand:true}:{toOwnerShields:true};
    move(s,[{player:p,uid,to:v,destroy:false,controller:t.p,...moveToOwner}]);
    start(s,{...t,p:t.g472EffectPlayer},t.g1165DestinationEffects[v]);
   }
   break;
  }
  const r=t.target,y=s.players[r.p].battle.find(x=>x.uid===r.uid&&(x.incarnation||0)===r.incarnation&&!x.sealed),controller=t.g1089OrderDeck&&!t.g1221SpellMove?r.p:t.g472EffectPlayer??t.p;if(y)move(s,[{player:r.p,uid:r.uid,to:v,destroy:v==='grave',controller,...(t.g1089OrderDeck?{g1089OrderDeck:true,toOwnerDeck:true,orderDeckTop:true}:{}),...(t.g1129OwnerDestinations?{toOwnerHand:true,toOwnerMana:true,toOwnerShields:true}:{})}]);if(t.after)start(s,{...t,p:controller},t.after);break;}
 case'g34_NullBreaker471':if(s.attack?.attacker===t.uid){s.attack.g471Breaker=v;api.resolveAttack(s,null);}break;
 case'g34_GrantedBreaker633':if(s.attack?.attacker===t.uid){s.attack.g633Breaker=v;api.resolveAttack(s,null);}break;
 case'g34_HippoMana1124':{
  const moved=v&&moveZoneSelection583(s,{...t,origin:'mana',to:'grave'},[{uid:v}]);
  if(!moved?.length)start(s,t,[{op:'SelfDestroy'}]);
  break;
 }
 case'g34_PayAura560':if(typeof v==='number'){const args=[...t.args],old=args[4];args[4]={...(typeof old==='object'?old:old!==null?{cost:old}:{}),g560Handled:true,g560Amount:v};api.cast(s,t.p,...args);}break;
 case'g34_DestroySummon1148':if(v)put(s,{...t,selected:[...t.selected,v]});break;
 case'g34_PayFloor500':if(typeof v==='number'){const args=[...t.args],old=args[4];args[4]={...(typeof old==='object'?old:old!==null?{cost:old}:{}),g500Handled:true,g500Amount:v};api.cast(s,t.p,...args);}break;
 case'g34_PayCount499':if(typeof v==='number'){const args=[...t.args],old=args[4];args[4]={...(typeof old==='object'?old:old!==null?{cost:old}:{}),g499Handled:true,g499Reduction:v};api.cast(s,t.p,...args);}break;
 case'g34_SeedDefense1201':
 case'g34_TapCast976':if(v)put(s,{...t,selected:[...t.selected,v]});break;
 case'g34_ODrive1439':if(typeof v==='number'){const args=[...t.args],old=args[4];args[4]={...(typeof old==='object'?old:old!==null?{cost:old}:{}),...overdrivePayment1439({...t.c,...(typeof old==='object'?old:old!==null?{cost:old}:{})},v)};api.cast(s,t.p,...args);}break;
 case'g34_TopZoneLook1450':if(v==='deck'||v==='gr')put(s,{...t,zone:v});break;
 case'g34_TopZoneBottom1450':if(v===true){const rows=own[t.zone],y=rows[0];if(y?.uid===t.target&&(y.zoneSerial||0)===t.serial){rows.shift();rows.push(y);}}break;
 case'g34_OrderGR1450':if(typeof v==='string')put(s,{...t,selected:[...(t.selected||[]),v]});break;
 case'g34_PaySpell485':if(typeof v==='number'){const args=[...t.args],old=args[4];args[4]={...(typeof old==='object'?old:old!==null?{cost:old}:{}),g485Handled:true,g485Amount:v};api.cast(s,t.p,...args);}break;
 case'g34_RevealPayment470':if(typeof v==='string')put(s,{...t,revealed:v});else if(v!==false){const args=[...t.args],old=args[4];args[4]={...(typeof old==='object'?old:old!==null?{cost:old}:{}),g470Handled:true,g470Amount:v??0,...(t.revealed?{g470Revealed:t.revealed}:{})};api.cast(s,t.p,...args);}break;
 case'g34_PayOnce464':if(typeof v==='string')put(s,{...t,selected:[...t.selected,v]});else if(v===null){
  if(t.after)put(s,{...t.after,g464Reducers:t.selected});
  else{const args=[...t.args];args[18]=t.selected;api.cast(s,t.p,...args);}
 }break;
 case'g34_WeddingHands1603':{
  const x=s.players[1-t.p].hand.find(x=>x.uid===v);if(x)zoneMove(s,1-t.p,'hand',v,'shields',{...t,g904ShieldOwner:x.cardOwner??1-t.p});
  if(t.n>1)put(s,{...t,n:t.n-1});
  break;
 }
 case'g34_NothingTarget1602':{
  const x=own.battle.find(x=>x.uid===v&&!x.sealed&&api.isCreature(s,x));
  if(x)(s.extLimits??=[]).push({kind:'g412ExtraBreak',player:t.p,ref:{uid:x.uid,incarnation:x.incarnation||0},amount:t.count,expires:'end',who:s.active,source:t.source,spellSource:t.source,spellCost:cost(card(t.source))});
  break;
 }
 case'g34_ReturnTopBottom1602':{
  if(t.ids.includes(v.uid)&&['top','bottom'].includes(v.to))put(s,{...t,ids:t.ids.filter(uid=>uid!==v.uid),[v.to]:[...(t[v.to]||[]),v.uid]});
  break;
 }
 case'g34_BattleLootDiscard1601':{
  const selected=own.hand.find(x=>x.uid===v);if(!selected)break;
  const creature=faces(card(selected)).some(c=>c.type==='creature');
  api.discardSelected(s,t.p,[v],t.source,t.p,creature?{...t,op:'g34_BattleLootPower1601'}:null);
  break;
 }
 case'g34_BattleHandPower1600':{
  if(!t.declared){if(v)put(s,{...t,declared:true});break;}
  const shown=own.hand.find(x=>x.uid===t.slots[v]);if(!shown)break;
  api.log(s,t.p,'reveal',card(t.source).name+'で手札公開：'+card(shown).name,{cardId:shown.cardId,source:t.source});
  const face=faces(card(shown)).find(c=>c.type==='creature'),host=sourceHost474(s,t);
  if(face&&host){const amount=face.power==='∞'?'∞':Number(face.power)||0;(host.x.powerModifiers??=[]).push({amount,expires:'end',who:s.active});}
  break;
 }
 case'g34_HandReveal462':if(v!==null)put(s,{...t,selected:[...t.selected,v]});else finishReveal462(s,t,own.hand.filter(x=>t.selected.includes(x.uid)));break;
 case'g34_RevealedCostDraw1111':drawPrintedCost1111(s,t,v);break;
 case'g34_PlayerDraw461':if(t.upTo)put(s,{...t,chosen:v});else if(v)put(s,{...t,accepted:true});break;
 case'g34_HandCycle460':
  if(t.optional&&!t.accepted){if(v)put(s,{...t,accepted:true});}
  else if(v!==null)put(s,{...t,selected:[...t.selected,v]});
  else if(t.to==='deck'&&t.order)finishBottomCycle460(s,t,t.selected);
  else finishCycle460(s,t,t.selected);
  break;
 case'g34_EachPlayer459':if(v)put(s,{...t,index:t.index+(t.g1519EachN?0:1),selected:[...t.selected,v]});else if(t.optional)put(s,{...t,index:t.index+1});break;
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
 case'g34_EntryShieldForce1304':{
  const y=remove(own.g34Holding||[],t.target);
  if(y){
   if(v&&api.findShield(own,v))y.g35ShieldForce=v;
   enter(s,t.p,y,t.baseUid,{...t.entryOptions,g1304ShieldChosen:true});
   if(own.battle.includes(y))put(s,...(t.afterEntryTasks||[]));
  }
  break;
 }
 case'g34_EntryTap432':{const y=remove(own.g34Holding||[],t.target);if(y){enter(s,t.p,y,t.baseUid,{...t.entryOptions,g432EntryChosen:true,...(v?{tapped:true}:{})});if(own.battle.includes(y))put(s,...(t.afterEntryTasks||[]));}break;}
 case'g34_Magibomber321':{
  const deploy=v&&{...t,op:'g34_Put',origin:v.origin,target:v.uid,execution:false,g745Magibomber:true};
  // QA41150: the looked-at card remains unavailable while a creature enters from hand.
  if(t.ids.length&&v?.origin==='hand')put(s,deploy,task('g34_RevealRelease514',t.p,t.source,{ids:t.ids}));
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
 case'g34_TapToStopAttack979':{
  const source=v&&tapSource748(s,t);
  if(source){
   api.tap(s,t.p,source);
   start(s,t,[C('stopAttack')]);
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
 case'g34_FriendBurst1210':{
  const y=v&&friendBurstCandidates(s,t).find(y=>y.uid===v);
  if(y){
   api.tap(s,t.p,y);
   // QA45088 and QA44115: the tap resolves even if the source has left or has no spell face.
   api.castBattleSpell(s,t.p,t.uid,t.incarnation,card(t.source).referenceId??t.source,t.race+'・フレンド・バースト');
  }
  break;
 }
 case'g34_Smash320':if(v&&smashSource320(s,t)&&(!t.battleOnly||smashSource320(s,t).origin==='battle'))api.castBattleSpell(s,t.p,t.uid,t.incarnation,t.source);break;
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
 case'g34_TimeChanger1276':if(v)put(s,t.host?{...t,selected:[...t.selected,v]}:{...t,host:v});break;
 case'g34_DokindamSwitch1276':if(v&&x&&!x.sealed&&!x.g1175DSwitched&&effective(x,s).g1276DokindamArea&&!d2Locked1188(s,t.p)){
  x.g1175DSwitched=true;
  put(s,{...t,op:'g34_DokindamUnseal1276',selected:[]});
 }break;
 case'g34_DokindamUnseal1276':
  if(v)put(s,{...t,selected:[...t.selected,v]});
  else api.moveSealsToGrave1156(s,t.p,t.selected);
  break;
 case'g34_TransferBases1132':
  if(v)put(s,t.destination?{...t,selected:[...(t.selected||[]),v]}:{...t,destination:v,selected:[]});
  else if(t.selected?.length){
   const source=sourceHost474(s,t),host=sourceHost474(s,t.destination);
   if(source&&host)api.transferBattleBases(s,t.p,source.x,host.x,t.selected);
  }
  break;
 case'g34_ManaBaseOrHand1132':if(v){
  if(v.to==='hand'){zoneMove(s,t.p,'mana',v.uid,'hand',t);break;}
  const host=sourceHost474(s,t.g399Attacker);
  if(!host||host.x.sealed||!api.isCreature(s,host.x)||!api.canMoveZone(s,t.p,'mana'))break;
  const y=remove(own.mana,v.uid);
  if(y){
   clear(y,'under');
   (host.x.under??=[]).push(y);
  }
 }break;
 case'g34_ShieldPlusCost1804':{const n=v==='∞'?own.deck.length:Number(v);if(n>0)put(s,{...t,op:'g71_Plus',n:Math.min(n,own.deck.length),g1804ExactPlus:true});break;}
 case'g34_FaceUpGrave1805':if(v)put(s,{...t,selected:[...(t.selected||[]),v]});break;
 case'g34_HandUnder1131':if(v){
  const host=sourceHost474(s,t),origin=t.origin??'hand';
  if(!host||host.x.sealed||!api.isCreature(s,host.x)||!api.canMoveZone(s,t.p,origin))break;
  const candidate=own[origin].find(y=>y.uid===v);
  if(!candidate||!matches(s,t.p,candidate,t.filter))break;
  const y=remove(own[origin],v);
  if(y){
   clear(y,'under');
   (host.x.under??=[]).push(y);
  }
 }break;
 case'g34_ManaStart1131':if(v&&own.mana.some(x=>x.uid===t.uid&&!x.faceDown&&(x.zoneSerial||0)===t.serial)&&api.canMoveZone(s,t.p,'mana'))
  put(s,{...t,op:'g34_Put',origin:'mana',target:t.uid});
  break;
 case'g34_StackDestroyed1130':if(v){
  const host=sourceHost474(s,t),victim=own.grave.find(y=>y.uid===t.victim.uid&&(y.zoneSerial||0)===t.victim.serial);
  if(host&&!host.x.sealed&&api.isCreature(s,host.x)&&victim&&api.canMoveZone(s,t.p,'grave')){
   remove(own.grave,victim.uid);
   clear(victim,'under');
   (host.x.under??=[]).push(victim);
  }
 }break;
 case'g34_MeteorSources1796':if(v)put(s,{...t,picked:[...(t.picked||[]),v]});break;
 case'g34_MeteorReplace1796':put(s,{...t,plans:[...t.plans,{uid:t.picked[t.plans.length],to:v?'mana':t.to}]});break;
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
 case'g34_StackHand936':
 case'g34_StackShieldGrave651':if(v){
  const host=sourceHost474(s,t);
  if(!host||host.x.sealed||!api.isCreature(s,host.x))break;
  const paid=(host.x.under||[]).flatMap(api.allLayers).find(y=>y.uid===v.uid&&(y.incarnation||0)===v.incarnation);
  if(!paid)break;
  if(t.op==='g34_StackHand936'){
   api.moveBattleCard(s,host.p,paid.uid,'hand',{controller:t.p});
   break;
  }
  api.moveBattleCard(s,host.p,paid.uid,'grave',{controller:t.p});
  if(s.players[host.p].grave.some(y=>y.uid===paid.uid))put(s,{...t,op:'g34_ShieldGrave588',n:1,required:true});
 }break;
 case'g34_HandShield657':if(v){
  const y=own.hand.find(y=>y.uid===v);
  if(y)put(s,{...t,op:'g34_ShieldSide657',target:v,serial:y.zoneSerial||0});
 }break;
 case'g34_ShieldSide657':{
  const y=own.hand.find(y=>y.uid===t.target&&(y.zoneSerial||0)===t.serial);
  if(y){
   zoneMove(s,t.p,'hand',y.uid,'shields',{...t,g657FaceUp:v===true});
   if(t.afterAttempt)start(s,t,t.afterAttempt);
  }
  break;
 }
 case'g34_ShieldMove685':
 case'g34_ShieldGrave588':if(v)put(s,{...t,selected:[...(t.selected||[]),v]});else finishShieldMove588(s,t);break;
 case'g34_FightPair586':if(v){
  const owners=t.who==='both'?[t.p,1-t.p]:[t.opponentPicks||t.who==='opponent'?1-t.p:t.p];
  put(s,{...t,op:'g34_FightPairSecond586',p:t.opponentPicks?1-t.p:t.p,first:v,owners});
 }break;
 case'g34_FightPairSecond586':if(v)finishFightPair586(s,t,v);break;
 case'g34_FightBuff241':if(v){const a=fightUnit240(s,t.p,v);if(a){(a.powerModifiers??=[]).push({amount:t.power,expires:'end',who:s.active,spellSource:t.spell?t.source:undefined,spellCost:fightSpellCost241(t)});put(s,{...t,op:'g34_FightEnemy240',fighter:v,optional:t.enemyOptional});}}break;
 case'g34_Fight240':if(v){
  if(t.g1233ReleaseHyper){
   const ally=fightUnit240(s,t.p,v);
   if(ally&&exactRaces(effective(ally,s)).includes('超化獣'))releaseHyper781(s,t.p,ally);
  }
  put(s,{...t,op:'g34_FightEnemy240',fighter:v,optional:t.g1233ReleaseHyper||t.optional});
 }break;
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
 case'g34_FightEnemy240':if(v&&!used792(s,t,t)){if(t.g792Once)(s.once??={})[onceKey792(t,t)]=s.turn;const attacker=fightAttacker240(s,t),a=attacker?.x,b=fightUnit240(s,1-t.p,v);if(a&&b&&a.uid!==b.uid&&(!t.g747Once||!parottaUsed747(s,t))){if(t.g747Once)(s.once??={})[parottaKey747(t)]=s.turn;api.battle(s,attacker.p,a,1-t.p,b,s.attack?.attacker);}}break;
 case'g34_OpponentPickShield949':put(s,{...t,op:'g34_PonyShieldCard949',group:v});break;
 case'g34_PonyShieldCard949':{
  const selected=ponyShieldCards949(api.findShield(own,t.group)).find(x=>x.uid===v);
  if(selected)peekPonyShield949(s,t,selected);
  break;
 }
 case'g34_PonyDeploy949':{
  if(!v)break;
  const selected=ponyShieldCards949(api.findShield(own,t.group)).find(x=>x.uid===t.selected);
  const options={origin:'shields',execution:false};
  if(!selected)break;
  const c=card(selected);
  if(c.type!=='creature'||api.isEvolution(selected)||!api.canEnter(s,t.p,c,options))break;
  if(api.shieldLeavesToGrave(s,t.p,selected)||api.shieldStaySource1352(s,t.p)){api.moveShield(s,t.p,selected.uid,'grave',{cardOnly:true});break;}
  const entrant=api.removeShieldCard(s,t.p,selected.uid);
  if(entrant){clear(entrant,'battle');enter(s,t.p,entrant,null,options);}
  break;
 }
 case'g34_ExposeTrigger1162':{
  const p=1-t.p,selected=s.players[p].shields.flatMap(api.shieldCards).find(y=>y.uid===v&&!y.g37ShieldHeld);
  if(!selected)break;
  selected.faceUp=true;
  api.log(s,t.p,'reveal',card(t.source).name+'：'+card(selected).name+'を表向きにした',{cardId:selected.cardId});
  if(api.shieldHasTrigger1162(s,p,selected))api.moveShield(s,p,selected.uid,'grave',{cardOnly:true,toOwnerGrave:true});
  break;
 }
 case'g34_RecycleMana1162':{
  const mana=own.mana.find(y=>y.uid===v);
  if(!mana)break;
  const serial=(mana.zoneSerial||0)+1;
  if(zoneMove(s,t.p,'mana',v,'grave',t)&&own.grave.some(y=>y.uid===v&&(y.zoneSerial||0)===serial))
   zoneMove(s,t.p,'grave',v,'mana',t);
  break;
 }
 case'g34_InvasionZeroDeclare1315':
  if(v){
   api.log(s,t.p,'reveal',card(t.source).name+'の侵略ZEROを使用宣言',{cardId:t.source});
   api.enqueue(s,t.p,{uid:t.uid,source:t.source,effect:'extended',task:{...t,op:'invasionZero1315'}});
  }
  break;
 case'g34_ParityCombatLock1315':{
  applyParityCombat1565(s,t,v);
  break;
 }
 case'g34_FlipShields949':
  if(v)put(s,{...t,selected:[...t.selected,v]});
  else if(t.selected.length)put(s,{...t,done:true});
  break;
 case'g34_BioK951':{
  const rule=card(t.source).g953BioK;
  if(v&&own.hand.some(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial)){
   const effect=rule?.effect??rule?.recovery??{op:'DrawUpTo',n:2,g203Draw:true};
   const attacker=effect.op==='AttackGrant399'&&own.battle.find(x=>x.uid===s.attack?.attacker);
   const context=attacker?{g399Attacker:{uid:attacker.uid,incarnation:attacker.incarnation||0}}:
    t.g399Attacker?{g399Attacker:t.g399Attacker}:{};
   api.discardSelected(s,t.p,[t.uid],t.source,t.p,tasks(t.p,t.source,[effect],context)[0]);
  }
  break;
 }
 case'g34_BioKDeclare951':
  declareHandBio(s,v?{...t,selected:[...t.selected,v]}:{...t,done:true});
  break;
 case'g34_BioT952':
  if(v&&own.hand.some(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial))
   api.discardSelected(s,t.p,[t.uid],t.source,t.p,task('g34_BioPower952',t.p,t.source,{attacker:t.attacker,...(t.defender?{defender:t.defender}:{})}));
  break;
 case'g34_ShinobiSearch950':
  if(t.g950Revealed){
   if(t.selected.includes(v))zoneMove(s,t.p,'deck',v,'hand');
   put(s,{...t,op:'g34_Order',rest:'shuffle'});
  }else put(s,v?{...t,selected:[...t.selected,v]}:{...t,done:true});
  break;
 case'g34_Peek585':
  if(v&&t.g1078Exact)put(s,{...t,selected:[...(t.selected||[]),v]});
  else if(v){const row=peekRows585(s,t).find(r=>r.p===v.player&&r.x.uid===v.uid);if(row)showPeek585(s,{...t,viewed:[...(t.viewed||[]),v.uid]},[row]);}
  break;
 case'g34_PeekRead585':
  if(t.g1682MiniRobo){if(v)put(s,{...t,op:'g34_MiniOrder1682',ordered:[]});break;}
  if(t.g1166RevealShield){
   if(v){
    const cards=own.shields.flatMap(api.shieldCards).filter(x=>t.g1166ShieldCards.includes(x.uid));
    for(const x of cards)x.faceUp=true;
    if(cards.length)api.log(s,t.p,'reveal',card(t.source).name+'でシールドを公開：'+cards.map(x=>card(x).name).join('、'),{cardId:t.source});
   }
   break;
  }
  if(v&&t.g1262GroupSwap){
   const {g585Peek,...next}=t;
   if(api.beginShieldGroupSwap1262(s,t.p,t.shieldUid,t.source)&&t.shieldUid!=null)put(s,{...next,op:'g34_OrderShield1262',ordered:[]});
   break;
  }
  if(v&&api.swapShield585(s,t.p,t.shieldUid))api.log(s,t.p,'shieldSwap',card(t.source).name+'：確認したカードと山札の上を入れ替えた',{cardId:t.source});
  if(t.remaining>1){const {g585Peek,shieldUid,...next}=t;put(s,{...next,op:'g34_Peek585',remaining:t.remaining-1});}
  break;
 case'g34_Patrol1683':put(s,{...t,op:'g34_PatrolMove1683',owner:v});break;
 case'g34_DisMin1682':put(s,{...t,chosen:[...(t.chosen||[]),!!v]});break;
 case'g34_MiniOrder1682':put(s,{...t,ordered:[...(t.ordered||[]),v]});break;
 case'g34_OrderShield1262':
  if(v){const {g585Peek,...next}=t;put(s,{...next,ordered:[...t.ordered,v]});}
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
 case'g34_MedusaCross929':{
  const host=v&&creatures(s,t.p).find(x=>!x.sealed&&x.uid===v.uid&&(x.incarnation||0)===v.incarnation);
  if(host)api.crossGearGroup(s,t.p,host,remainingGears929(s,t)
   .filter(g=>g.crossedTo?.uid!==host.uid||g.crossedTo.incarnation!==(host.incarnation||0)).map(g=>g.uid));
  break;
 }
 case'g34_GigazandaSearch929':{
  if(v&&typeof v==='object'&&v.owner!==undefined){put(s,{...t,deckOwner:v.owner});break;}
  if(v&&t.ids.includes(v)&&!t.chosen.includes(v)){put(s,{...t,chosen:[...t.chosen,v]});break;}
  for(const uid of t.ids)release(s,t.deckOwner,uid);
  for(const uid of t.chosen)zoneMove(s,t.deckOwner,'deck',uid,'grave',t);
  api.shuffleLibrary(s,t.deckOwner);api.deckCheck(s,t.deckOwner);break;
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
  if(t.g1660Harmony){(s.extLimits??=[]).push({kind:'g567PlayerStop',player:1-t.p,controller:t.p,g1660Color:v,expires:'start',who:t.p,spellSource:t.source,spellCost:cost(card(t.source))});break;}
  if(t.g1642OpponentReveal){
   start(s,t,[{op:'Look',n:6,public:true,rest:'bottom',stages:[{n:'all',optional:true,to:'hand',filter:{anyFaceColor:v}}]}]);
   break;
  }
  if(t.g1078Discard){
   const owner=1-t.p,hand=s.players[owner].hand;
   api.log(s,owner,'reveal','手札を公開：'+(hand.map(y=>card(y).name).join('・')||'なし'),{cardId:t.source});
   const ids=hand.filter(y=>faces(api.zoneCard(s,owner,y,'hand')).some(face=>colors(face).includes(v))).map(y=>y.uid);
   if(ids.length)api.discardSelected(s,owner,ids,t.source,t.p,null,null,
    task('g34_Peek585',t.p,t.source,{who:'self',g1078Exact:true}));
   break;
  }
  if(t.g924DepthReveal){
   start(s,t,[{op:'Look',n:2,public:true,rest:'bottom',
    stages:[{n:'all',allMatches:true,to:'hand',filter:{anyFaceColor:v}}]}]);
   break;
  }
  if(t.target){
   const x=s.players[t.target.p].battle.find(y=>y.uid===t.target.uid&&(y.incarnation||0)===t.target.incarnation);
   if(x&&!x.sealed&&api.isCreature(s,x))(s.extLimits??=[]).push({
    kind:'g805BattleColor',uid:x.uid,incarnation:x.incarnation||0,color:v,turn:s.turn,expires:'end',who:s.active,
    g1363ColorOrder:s.g1363ColorOrder=(s.g1363ColorOrder||0)+1
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
  if(selected.length<(t.n??t.colors.length)){put(s,{...t,selected});break;}
  const paid=selected.map(uid=>own.mana.find(x=>x.uid===uid&&!x.tapped));
  if(paid.every(Boolean)){
   for(const x of paid)x.tapped=true;
   start(s,t,t.defs??[{op:'OwnShieldGraves697',to:'mana'}]);
  }else if(t.elseDefs)start(s,t,t.elseDefs);
 }else if(t.elseDefs)start(s,t,t.elseDefs);
 break;
 case'g34_OwnShieldGraves697':put(s,{...t,picks:[...(t.picks||[]),...(v?[{owner:t.chooser,uid:v}]:[])]});break;
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
  const to=t.to??'grave',mana=to==='mana';
  if(v.origin==='battle')move(s,[{player:t.chooser,uid:v.uid,to,destroy:!mana,controller:t.p,...(mana?{toOwnerMana:true}:{})}]);
  else if(v.origin==='shields'){
   const moved=api.moveShield(s,t.chooser,v.uid,to,{toOwnerMana:mana});
   if(moved.length)api.log(s,t.chooser,mana?'shieldMana':'shieldGrave',
    card(t.source).name+'：シールド1つ（カード'+moved.length+'枚）を'+(mana?'マナゾーン':'墓地')+'に置いた',{cardId:t.source});
  }
  break;
 }
 case'g34_ExLifeGrave1267':
  if(v&&exLifeGraveOptions1267(s,t).some(o=>o.value===v)){
   // QA40665: attempting the move is enough even when it is replaced.
   api.moveShield(s,t.p,v,'grave');
   start(s,t,t.then);
  }
  break;
 case'g34_ShieldGrave':if(v){
  const moved=api.moveShield(s,t.p,v,'grave',{cardOnly:!!t.cardOnly});
  finishOrDeferShield1352(s,t,'ownGrave',t.p,moved);
 }break;
 case'g34_BlindReveal803':{
  const owner=t.owner==='opponent'?1-t.p:t.p,hand=s.players[owner].hand;
  const y=t.slots?hand.find(x=>x.uid===t.slots[v]):hand[v];
  if(y){
   if(t.g1568Discard){api.discardSelected(s,owner,[y.uid],t.source,t.controller??t.p);break;}
   if(t.g1267Execute){
    start(s,t,[{op:'Execute',origin:'hand',filter:{exactUid:y.uid},g1244NoEmptyOffer:true}]);
    break;
   }
   api.log(s,owner,'reveal',card(t.source).name+'で公開：'+card(y).name,{cardId:y.cardId});
   if(t.g1309BounceDeploy){
    if(card(y).type==='creature'&&!api.isEvolution(y))
     start(s,t,[{op:'Target',owner:'self',to:'hand',optional:true,
      g1309Revealed:{uid:y.uid,serial:y.zoneSerial||0},
      title:'手札に戻す自分のクリーチャーを1体選ぶ（任意）'}]);
   }else if(t.g1010Deploy){
    if(card(y).type==='creature'&&canPut(s,t.p,y,'hand'))start(s,t,[{op:'Offer',
     title:card(y).name+'をバトルゾーンに出す？',score:deployValue550(s,t.p,y),
     defs:[{op:'Put',origin:'hand',target:y.uid}]}]);
   }else if(t.owner!=='opponent'&&matches(s,t.p,y,{g223Multicolor:true}))start(s,t,[{op:'SelfGrant754',grant:{speedAttacker:true}}]);
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
 case'g34_Maximilian1118':
  if(t.sources.length)put(s,t);
  if(v)api.resolveEffect(s,t.p,t.spell,t.uid,{...t.entry,g1118KnightBodyOnly:true});
  break;
 case'g34_KnightMagic1118':
  if(v)start(s,t,t.defs);
  break;
 case'g34_KingKnightMagic1115':
  start(s,t,Array.from({length:v},()=>t.defs).flat());
  break;
 case'g34_CheckBlindDiscardCost1249':
  if(v===t.number)api.draw(s,t.p,1);
  break;
 case'g34_BlindDiscard773':{
  const hand=s.players[1-t.p].hand,selected=[...(t.selected??[]),v];
  if(selected.length<Math.min(t.n??1,hand.length)){
   put(s,{...t,selected});
  }else{
   const ids=selected.map(i=>t.slots?.[i]??hand[i]?.uid).filter(uid=>hand.some(x=>x.uid===uid));
   if(ids.length){
    const after=t.g1816DrawIfCreature?task('g34_RabbitDraw1816',t.p,t.source,{
     creature:card(hand.find(x=>x.uid===ids[0])).type==='creature'
    }):t.g1249DeclaredCost===undefined?null:task('g34_CheckBlindDiscardCost1249',t.p,t.source,{
     cardId:hand.find(x=>x.uid===ids[0]).cardId,number:t.g1249DeclaredCost
    });
    api.discardSelected(s,1-t.p,ids,t.source,t.controller??t.p,null,after);
   }
  }
  break;
 }
 case'g34_OwnSealGrave1156':put(s,{...t,selected:[...(t.selected??[]),v]});break;
 case'g34_BlindHandBottom1154':
  put(s,{...t,selected:[...t.selected,t.slots[v]]});
  break;
 case'g34_HandBottomOrder1154':
  put(s,{...t,remaining:t.remaining.filter(uid=>uid!==v),ordered:[...t.ordered,v]});
  break;
 case'g34_StartManaLock773':{
  const y=s.players[1-t.p].mana.find(y=>y.uid===v);
  if(y)y.skipUntap=true;
  break;
 }
 case'g34_ManaColorsLock1054':put(s,{...t,selected:[...(t.selected||[]),v]});break;
 case'g34_BlindHandMana675':{
  const hand=s.players[1-t.p].hand,y=t.slots?hand.find(x=>x.uid===t.slots[v]):hand[v];
  if(y&&zoneMove(s,1-t.p,'hand',y.uid,'mana',{g182HandMana:true})){
   api.log(s,t.p,'handToMana',card(t.source).name+'：'+card(y).name+'を相手のマナゾーンに置いた',{cardId:y.cardId});
  }
  break;
 }
 case'g34_Nocturne732':
  api.log(s,t.p,'declare',v+'を宣言',{cardId:t.source});
  if(t.g1794Miracle)start(s,t,[{op:'Look',g201Search:true,public:true,g1660PublicReveal:true,g1794UntilName:exactName(v),rest:'keep',stages:[{n:'all',to:'hand',allMatches:true}]}]);
  else start(s,t,[{op:'InspectHand',discard:true,g223Inspect:true,g732Name:exactName(v)}]);
  break;
 case'g34_DesignatedDiscard822':{
  if(!own.hand.some(y=>y.uid===t.target&&(y.zoneSerial||0)===t.serial))break;
  const ids=v?[t.target]:own.hand.filter(y=>y.uid!==t.target).map(y=>y.uid);
  if(ids.length)api.discardSelected(s,t.p,ids,t.source,t.controller);
  break;
 }
 case'g34_VegasCost851':if(v==='∞'||v>=5)start(s,t,[{op:'Draw',n:3}]);break;
 case'g34_GaiaSpawn1685':{
  const y=own.extra.find(x=>x.uid===v);
  if(y&&card(y).psychic&&race(card(y),'ハンター')&&t.costs.includes(cost(card(y))===Infinity?'∞':cost(card(y))))doPut(s,{...t,origin:'extra',target:v});
  break;
 }
 case'g34_InspectHandCost1109':
  if(t.count)start(s,t,[{op:'DrawUpTo',n:t.count,g203Draw:true,g853EachDraw:true}]);
  break;
 case'g34_InspectHand':
  if(t.g1465ToBottom){if(v)zoneMove(s,1-t.p,'hand',v,'deck',t);break;}
  if(t.g1684JustIdea){
   const owner=1-t.p,y=s.players[owner].hand.find(y=>y.uid===v);
   if(y&&faces(card(y)).some(c=>c.type==='creature'))
    start(s,t,[{op:'Put',p:owner,origin:'hand',target:y.uid,g1684IgnoreEntry:true},{op:'Draw',n:5}]);
   break;
  }
  if(t.g1324ChooseCreature){
   if(v)start(s,{...t,p:1-t.p},[{op:'Select',origin:'hand',deploy:true,n:1,optional:true,
    filter:{creature:true,exactUid:v},title:'指定されたクリーチャーを出す？'}]);
   break;
  }
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
 case'g34_OpponentDiscardOrDraw1012':{
  const after={...t,op:'g34_DrawUnlessDiscarded1012'};
  if(v&&s.players[1-t.p].hand.some(y=>y.uid===v))api.discardSelected(s,1-t.p,[v],t.source,t.p,null,after);
  else put(s,after);
  break;
 }
 case'g34_DiscardFor248':{
  const y=own.hand.find(y=>y.uid===v);
  if(y&&matches(s,t.p,y,t.g488DiscardFilter)){
   const selected=[...(t.selected??[]),y.uid];
   if(selected.length<(t.n??1)){
    put(s,{...t,selected});
    break;
   }
   const after={...t,op:'g34_Sequence',defs:discardDefs248(s,t,y)};
   if(after.defs[0].op==='DiscardPower1282'){
    // Still choose a creature after the attempt, but use power only after an actual discard (QA 42487).
    api.discardSelected(s,t.p,selected,t.source,t.p,null,{...after,...after.defs[0],op:'g34_DiscardPower1282'});
    break;
   }
   // Rule 101.3a: this continuation also follows an attempted discard that was replaced.
   api.discardSelected(s,t.p,selected,t.source,t.p,t.g770DiscardAttempt?null:after,t.g770DiscardAttempt?after:null);
  }
  break;
 }
 case'g34_DiscardSummon1791':if(v)put(s,{...t,selected:[...t.selected,v]});break;
 case'g34_DiscardCost655':if(t.costs.includes(v))start(s,t,[destroyBelowCost655(v,t)]);break;
 case'g34_DiscardDraw':if(v&&own.hand.some(y=>y.uid===v&&(!t.filter||matches(s,t.p,y,t.filter)))){put(s,task('draw',t.p,t.source,{n:t.n}));api.discardSelected(s,t.p,[v],t.source,t.p);}break;
 case'g34_HandArmy716':
  if(v){
   beginElementEntryBatch(s,'g34DeployBatch');
   put(s,{...t,op:'g34_Put',origin:'hand',owner:t.p,target:v,execution:false},{...t,n:t.n-1});
  }else put(s,task('g34_Custom',t.p,t.source,{name:'finishBatch'}));
  break;
 case'g34_DeploySeries875':
  if(v){
   beginElementEntryBatch(s,'g34DeployBatch');
   const remaining=t.costs?{costs:t.costs.filter(n=>n!==v.cost)}:{n:t.n-1};
   put(s,{...t,op:'g34_Put',target:v.uid},{...t,...remaining,selected:[...t.selected,v.uid]});
  }
  break;
 case'g34_GraveArmy':if(v)put(s,{...t,op:'g34_Put',origin:'grave',owner:t.p,target:v.uid,execution:false},{...t,selected:[...t.selected,v.uid]});else put(s,task('g34_Custom',t.p,t.source,{name:'finishBatch'}));break;
 case'g34_BirdTarget935':{
  const target=s.players[1-t.p].battle.find(x=>x.uid===v);
  put(s,{...t,op:'g34_BirdMill935',...(target?{target:{uid:target.uid,incarnation:target.incarnation||0}}:{})});
  break;
 }
 case'g34_BirdCompare935':destroyBelowCost935(s,t,v);break;
 case'g34_LionessSweep928':sweepGears928(s,t,v);break;
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
 case'g34_DrillBow1656':{const p=1-t.p,gear=s.players[p].battle.find(y=>y.uid===v&&!y.sealed&&!y.faceDown&&card(y).type==='gear');if(!gear)break;const host=gear.crossedTo&&s.players[p].battle.find(y=>y.uid===gear.crossedTo.uid&&(y.incarnation||0)===gear.crossedTo.incarnation&&!y.sealed&&api.isCreature(s,y));if(host)put(s,{...t,op:'g34_DrillAfter1656',host:{p,uid:host.uid,incarnation:host.incarnation||0}});move(s,[{player:p,uid:gear.uid,to:'grave',destroy:false,controller:t.p,toOwnerGrave:true}]);break;}
 case'g34_SacrificeAlly413':{
  if(!v||t.g1200GraveStart&&!own.grave.some(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial))break;
  const selected=[...(t.selected??[]),v],targets=selected.map(ref=>own.battle.find(y=>
   y.uid===ref.uid&&(y.incarnation||0)===ref.incarnation&&!y.sealed&&
   (t.g547Seed?matches(s,t.p,y,{g295Tamaseed:true}):api.isCreature(s,y))&&
   (!t.filter||matches(s,t.p,y,t.filter))&&
   (!t.other||!api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0)))));
  if(targets.some(y=>!y)||new Set(targets).size!==targets.length)break;
  if(selected.length<(t.n??1)){put(s,{...t,selected});break;}
  // Rule 101.3a checks the attempt, including when a destruction is replaced.
  const chosen=targets[0],victim=t.g1263Babel&&exactRaces(effective(chosen,s)).includes('ディスタス')?
   {uid:chosen.uid,serial:(chosen.zoneSerial||0)+1}:null;
  move(s,targets.map(y=>({player:t.p,uid:y.uid,to:'grave',destroy:true,controller:t.controller??t.p})));
  start(s,t,victim?[...t.defs,{op:'BabelRevive1263',victim}]:t.defs);
  break;
 }
 case'g34_GraveBase1126':if(v){
  const host=sourceHost474(s,t.entrant);
  const base=own.grave.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);
  if(host&&host.p===t.p&&!host.x.sealed&&api.isCreature(s,host.x)&&base&&api.canMoveZone(s,t.p,'grave')){
   remove(own.grave,base.uid);
   clear(base,'under');
   (host.x.under??=[]).push(base);
  }
 }break;
 case'g34_SelfManaFollow1468':if(v&&sourceHost474(s,t))start(s,t,[{op:'SelfMana297',g536Source:true},...t.defs]);break;
 case'g34_SelfSacrifice407':if(v){const present=s.players.some(p=>p.battle.some(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===(t.incarnation||0))));if(present)start(s,t,[{op:'SelfDestroy'},...(t.defs||[])]);}break;
 case'g34_GraveUse1226':if(v){
  const y=own.grave.find(x=>x.uid===v.uid&&(x.zoneSerial||0)===v.serial&&!x.faceDown);
  if(y&&graveFace1226(faces(card(y))[v.face])){
   if(s.g1226GraveUse?.turn!==s.turn)s.g1226GraveUse={turn:s.turn,permits:[[],[]]};
   const permits=s.g1226GraveUse.permits[t.p];
   if(!permits.some(r=>r.uid===v.uid&&r.serial===v.serial&&r.face===v.face))permits.push(v);
  }
 }break;
 case'g34_AidoruDeclare1256':if(v){
  const y=aidoruHand1256(s,t);
  if(y&&!api.handAbilityIgnored(s,y)){
   api.log(s,t.p,'reveal',card(y).name+'の能力を宣言',{cardId:y.cardId});
   send(s,t.p,y,'AidoruDeploy1256',{serial:t.serial});
  }
 }break;
 case'g34_LacrimaDeclare1224':if(v){
  const y=lacrimaHand1224(s,t);
  if(y&&s.endStep){
   api.log(s,t.p,'reveal',card(y).name+'のターン終了時の能力を宣言',{cardId:y.cardId});
   const entry={player:t.p,uid:y.uid,source:y.cardId,effect:'extended',task:{...t,op:'g34_LacrimaDeploy1224'}};
   if(s.endStep.stage==='resolve')api.enqueue(s,t.p,entry);
   else s.endStep.deferred.push(entry);
  }
 }break;
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
 case'g34_Chance417':if(v&&chanceCard417(s,t)){
  const c=chanceCard417(s,t),origin=t.origin??'hand';
  if(c.g417Chance.g1548ChanceR)s.players[t.p][origin].find(y=>y.uid===t.uid).finishTo='deck';
  cast(s,t.p,t.uid,true,null,t.face,null,origin,c.g417Chance.g1548ChanceR?'アタック・チャンスR':c.g417Chance.label||'アタック・チャンス');
 }break;
 case'g34_FairyManaExchange828':if(v)put(s,{...t,accepted:true});break;
 case'g34_HaridelReturn1675':if(v){const selection=haridelSelection1675(s,t),refs=selection.g960FormerBases;start(s,t,[{op:'GraveArmy',filter:{creature:true},ids:refs.map(r=>r.uid),n:refs.length,g960FormerBases:refs,g1675All:true,title:'戻すクリーチャーの順番を選ぶ（すべて戻す）'}]);}break;
 case'g34_NemeBreak1698':{
  const uids=t.uids.filter(uid=>uid!==v);
  if(v)api.shieldTop(s,t.p,card(t.source),null,{count:1,replacement:true});
  s.breakContext={...t.context,g1698NemeOffered:true};
  if(s.winner===null&&uids.length)api.breakShields(s,t.p,uids);else s.breakContext=null;
  break;
 }
 case'g34_ReturnCastSpell1744':if(v&&!used792(s,t,t)){
  (s.once??={})[onceKey792(t,t)]=s.turn;
  for(const r of t.refs){const y=s.players[r.owner].grave.find(y=>y.uid===r.uid&&(y.zoneSerial||0)===r.serial&&(y.incarnation||0)===r.incarnation);if(y)zoneMove(s,r.owner,'grave',y.uid,'hand',t);}
 }break;
 case'g34_Offer':if(v){
  if(t.g792Once){
   if(used792(s,t,t))break;
   (s.once??={})[onceKey792(t,t)]=s.turn;
  }
  start(s,t,t.defs);
 }break;
 case'g34_GraveRecoverOffer1011':
  if(v)start(s,{...t,p:1-t.p},[t.recovery]);
  else start(s,t,[{op:'Draw',n:2}]);
  break;
 case'g34_BreakEither1612':if(v)start(s,t,[{op:'Break497',n:1,owner:v.p===t.p?'self':undefined,selected:[v.uid],...(t.g1645CreatureBreak?{g747CreatureBreak:true,g913DepartedBreaker:true}:{})}]);break;
 case'g34_Prison1652':{const y=s.players[1-t.p].battle.find(y=>y.uid===v);if(y){put(s,{...t,op:'g34_PrisonDiscard1652',names:battleNames676(s,y)});move(s,[{player:1-t.p,uid:y.uid,to:'hand',destroy:false,controller:t.controller??t.p}]);}break;}
 case'g34_NightmareOrder1651':if(v&&t.remaining.some(r=>r.uid===v.uid&&r.p===v.p&&r.serial===v.serial))put(s,{...t,p:v.p,op:'g34_Put',origin:'grave',target:v.uid,g1651Held:true,g1651Serial:v.serial,execution:false},{...t,op:'g34_NightmareRelease1651',owner1651:v.p,target:v.uid,serial:v.serial},{...t,remaining:t.remaining.filter(r=>r.uid!==v.uid)});break;
 case'g34_GetFuture1649':{
  const y=own.hand.find(y=>y.uid===v);
  if(y)api.discardSelected(s,t.p,[y.uid],t.source,t.p,null,
   {...t,op:'g34_GetFutureFinish1649',costs:discardCosts655(s,t.p,y,false)});
  break;
 }
 case'g34_MarshalExchange1648':
  if(v){const y=own.hand.find(y=>y.uid===v.uid&&(y.zoneSerial||0)===v.serial);if(y)put(s,{...t,selected:[...(t.selected||[]),v]});}
  else put(s,{...t,done:true});
  break;
 case'g34_FortunePick1694':
  if(v){const y=own.deck.find(y=>y.uid===v.uid);if(y&&!t.selected.includes(v.uid)&&!t.used.includes(v.type)&&[...faces(card(y)).map(c=>c.type),...(card(y).seedCreature||card(y).natureAce4?['seed']:[])].includes(v.type))put(s,{...t,selected:[...t.selected,v.uid],used:[...t.used,v.type]});}
  else put(s,{...t,op:'g34_FortuneFinish1694'});break;
 case'g34_Jakon1694':if(v)put(s,{...t,selected:[...t.selected,v]});else put(s,{...t,op:'g34_JakonFinish1694'});break;
 case'g34_TuneAgain1692':{
  const row=cardMoveRows579(s,{...t,anyOwner:true,to:'hand'}).get(v);if(!row)break;
  put(s,{...t,op:'g34_TuneFollow1692',target:row.x.uid,serial:(row.x.zoneSerial||0)+1});
  api.moveBattleCard(s,row.p,row.x.uid,'hand',{controller:t.p,destinationOwner:row.x.cardOwner??row.p,toOwnerHand:true});break;
 }
 case'g34_Texas1692':{
  const y=own.battle.find(x=>x.uid===v&&!x.sealed&&api.isCreature(s,x)&&!api.isEvolution(x));if(!y)break;
  put(s,{...t,op:'g34_TexasAfter1692',target:y.uid,serial:(y.zoneSerial||0)+1,expectedIncarnation:(y.incarnation||0)+1});
  move(s,[{player:t.p,uid:y.uid,to:'deckTop',destroy:false,controller:t.p}]);break;
 }
 case'g34_GigaMove1691':start(s,t,[{op:'Select',origin:'deck',...(v?{deploy:true}:{to:'hand'}),n:1,optional:false,g530Ids:[t.target]}]);break;
 case'g34_FinaleBreak1690':if(v)put(s,{...t,selected:[...(t.selected||[]),v]});else if(t.selected?.length)start(s,t,[{op:'Break497',owner:'self',n:t.selected.length,selected:t.selected,g747CreatureBreak:true,g913DepartedBreaker:true}]);break;
 case'g34_Break497':if(v)put(s,{...t,selected:[...(t.selected||[]),v]});else if(t.g1781UpTo)put(s,{...t,n:(t.selected||[]).length,optional:false,g1342AlreadyCounted:true});break;
 case'g34_ShieldCardManaDeploy1317':
  // An attempted move still satisfies the continuation under a replacement (QA 42955).
  if(api.moveShield(s,t.p,v,'mana',{cardOnly:true}).length)
   start(s,t,[{op:'Select',origin:'mana',n:1,deploy:true,
    filter:{faceUp:true,creature:true,evolution:true,race:'デモニオ',max:own.mana.length},
    title:'マナから出す進化デモニオを1体選ぶ'}]);
  break;
 case'g34_ShieldToMana980':
  if(v&&!used792(s,t,t)){
   if(t.g792Once)(s.once??={})[onceKey792(t,t)]=s.turn;
   api.moveShield(s,v.owner,v.uid,'mana');
  }
  break;
 case'g34_ShieldMana557':{
  if(!s.players[1-t.p].shields.some(x=>x.uid===v))break;
  const moved=api.moveShields(s,1-t.p,[v],'mana');
  finishOrDeferShield1352(s,t,'mana',1-t.p,moved);
  break;
 }
 case'g34_Break278':{
  const host=t.requiresCreature&&sourceHost474(s,t);
  if(t.requiresCreature&&(!host||!api.isCreature(s,host.x)||effective(host.x,s).g977CannotBreak||!creatureBreakCount1342(s,t.p,host.x,1)))break;
  if(s.players[1-t.p].shields.some(x=>x.uid===v))api.interruptBreak(s,1-t.p,[v],{...t,op:'g34_AfterBreak278'},
   {player:t.p,sourceUid:host?host.x.uid:t.uid,source:t.source,controller:t.p,g278Effect:true,...(host?{incarnation:host.x.incarnation||0}:{})});
  break;
 }
 case'g34_SplitDeck1247':{
  if(api.handIsPublic(s,t.p)){
   const ids=t.rows.flatMap(r=>{
    const y=s.players[r.p].hand.find(x=>x.uid===r.uid);
    return y&&r.origin==='hand'?[y.cardId]:[];
   }).sort();
   if(ids.length)api.log(s,t.p,'g1333PublicHandReturn',
    '山札に戻したカード：'+ids.map(id=>card(id).name).join('、'),{cardIds:ids});
  }
  const top=t.rows.slice(0,v).reverse(),bottom=t.rows.slice(v);
  for(const r of top)zoneMove(s,r.p,r.origin,r.uid,'deckTop',t);
  for(const r of bottom)zoneMove(s,r.p,r.origin,r.uid,'deck',t);
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
 case'g34_SuperPlus1659':if(v)put(s,{...t,op:'g34_SuperPlusOrder1659',ordered:[]});break;
 case'g34_SuperPlusOrder1659':put(s,{...t,ordered:[...t.ordered,v]});break;
 case'g34_PokerPick1659':if(v)put(s,{...t,picked:[...t.picked,v]});else put(s,{...t,op:'g34_PokerOrder1659',ordered:[]});break;
 case'g34_PokerOrder1659':put(s,{...t,ordered:[...t.ordered,v]});break;
 case'g34_DefenderBreak1659':put(s,{...t,selected:[...t.selected,v]});break;
 case'g34_AlPlus1659':if(v){const root=api.findShield(own,t.group);if(root)showPeek585(s,t,[{x:root,p:t.p,seen:api.shieldCards(root),label:'シールド・プラスした自分のシールド'}]);}break;
 case'g34_ChooseRace724':{
  const filter={creature:true,g724ExactRace:v};
  // Dragon is a legal declaration and refers to the category (QA42400).
  const chosen=v==='ドラゴン'?{creature:true,race:v}:filter;
  if(t.g1660Illusion)
   start(s,t,[{op:'GroupGrant364',owner:'self',filter:{creature:true},spell:true,grant:{raceAdd:[v]}}]);
  else if(t.g1658SoulCall)
   start(s,t,[{op:'Look',g201Search:true,g841DeckPeek:true,n:'all',rest:'shuffle',g1658SoulTop:true,
    stages:[{n:3,to:'deckTop',optional:!api.lookPublic(s,t.p),reveal:true,g1658DistinctNames:true,filter:chosen}]}]);
  else if(t.g1657Pokira)
   (s.extLimits??=[]).push({kind:'g1657RaceGraveHand',player:t.p,filter:chosen,expires:'end',who:s.active});
  else if(t.g961TrapCommune)
   start(s,t,[{op:'Select',origin:'battle',to:'grave',n:'all',optional:true,filter:chosen,g173Targets:true,
    g187OwnPick:true,g961TrapCommune:true,title:'破壊する自分の'+v+'を好きな数選ぶ'}]);
  else if(t.g735Grant)
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
 case'g34_GyouRevive1364':{
  const owner=1-t.p;
  if(v&&s.players[owner].grave.some(y=>y.uid===v.uid&&(y.zoneSerial||0)===v.serial))
   put(s,{...t,p:owner,op:'g34_Put',origin:'grave',target:v.uid,tapped:true});
  break;
 }
 case'g34_OpponentDestination1506':if(v)put(s,{...t,op:'g34_TargetDestination467',target:{p:1-t.p,uid:v.uid,incarnation:v.incarnation},g467Destinations:['mana','hand'],g1129OwnerDestinations:true});break;
 case'g34_Select':
  if(v){
   if(t.g766SpellUse)mark(s,'g766SpellUse',t);
   if(t.g792Once)(s.once??={})[onceKey792(t,t)]=s.turn;
   const x=t.g1111DistinctNames&&own.extra.find(y=>y.uid===v.uid);
   const row=x?{...v,g1111Name:exactName(card(v.g1104Back?psychicBack1104(x):x).name)}:v;
   put(s,{...t,selected:[...(t.selected||[]),v.uid],rows:[...(t.rows||[]),row]});
  }else finishSelect(s,t);
  break;
 case'g34_CrestDeploy1030':{
  const target=own.hand.find(x=>x.uid===v);
  if(!target){api.draw(s,t.p,1);break;}
  put(s,{...t,op:'g34_Put',origin:'hand',target:target.uid},
   {...t,op:'g34_CrestDeployResult1030',target:target.uid,beforeEntry:target.incarnation||0});
  break;
 }
 case'g34_ShieldTrigger1193':{
  const root=api.findShield(own,v);
  if(root)(s.extLimits??=[]).push({kind:'g1193ShieldTrigger',player:t.p,expires:'start',who:t.p,
   refs:api.shieldCards(root).map(x=>({uid:x.uid,serial:x.zoneSerial||0})),
   spellSource:t.source,spellCost:cost(card(t.source))});
  break;
 }
 case'g34_ShieldHandEntry1031':
  if(v)put(s,{...t,op:'g34_Put',origin:'hand',target:t.uid});
  break;
 case'g34_FaceUpShieldPut1294':
  if(v){
   const deploy={op:'Put',origin:'shields',target:v,g1294FaceUpShield:true};
   const chosen=putSource1294(s,{...deploy,p:t.p});
   if(chosen&&(api.shieldLeavesToGrave(s,t.p,chosen)||api.shieldStaySource1352(s,t.p)))api.moveShield(s,t.p,v,'grave',{cardOnly:true});
   else if(chosen)start(s,t,[deploy]);
  }
  break;
 case'g34_SelfHandEvolution1577':{
  const host=sourceHost474(s,t)?.x,y=v&&own.hand.find(x=>x.uid===v.uid&&(x.zoneSerial||0)===v.serial),c=y&&card(y);
  if(host&&!host.sealed&&own.battle.includes(host)&&api.isCreature(s,host)&&(c?.evolution||c?.neoEvolution)&&cost(c)<=t.max&&(!t.filter||matches(s,t.p,y,t.filter))&&api.evolutionBases(s,t.p,c).some(z=>z.uid===host.uid))doPut(s,{...t,op:'g34_Put',target:y.uid,origin:'hand'},host.uid);
  break;
 }
 case'g34_GoukenEvolution1362':{
  const host=sourceHost474(s,t)?.x;
  put(s,{...t,op:'g34_GoukenShuffle1362'});
  if(v&&host&&!host.sealed&&own.battle.includes(host)&&api.isCreature(s,host)){
   release(s,t.p,v);
   const x=remove(own.deck,v);
   if(x)enter(s,t.p,x,host.uid,{origin:'deck',execution:false,g31Force:true});
  }
  break;
 }
 case'g34_CrimsonPeek1705':
  api.resumeCrimson1705(s,t.defender,t.uids,t.context);
  break;
 case'g34_BishamonCost1704':
  if(v)put(s,{...t,selected:[...t.selected,v]});else start(s,t,[{op:'SelfDestroy'}]);
  break;
 case'g34_SpikeMode1702':{
  const y=own.battle.find(y=>y.uid===t.target&&(y.incarnation||0)===t.targetIncarnation&&!y.sealed&&api.isCreature(s,y));
  if(y){
   (y.powerModifiers??=[]).push({amount:v===0?5000:2000,grantedAbility:true,expires:'end',who:s.active});
   applyGrant(s,{...t,grant:v===0?{g1702ExtraBreak:1}:{attackUntapped:true}},y);
  }
  break;
 }
 case'g34_QueenSearch1701':{
  const y=v&&own.deck.find(y=>y.uid===v&&t.ids.includes(y.uid)),valid=y&&queenCandidate1701(y);
  if(valid){
   api.log(s,t.p,'reveal',card(t.source).name+'：'+card(y).name+'を公開して手札に加える',{cardId:y.cardId});
   zoneMove(s,t.p,'deck',y.uid,'hand',t);
  }
  for(const uid of t.ids||[])release(s,t.p,uid);
  api.shuffleLibrary(s,t.p,[],t.source);
  if(valid&&own.hand.includes(y))start(s,t,[{op:'Execute',origin:'hand',optional:false,g1578Exact:{uid:y.uid,serial:y.zoneSerial||0}}]);
  else api.deckCheck(s,t.p);
  break;
 }
 case'g34_SelfManaEvolution1701':{
  const host=sourceHost474(s,t)?.x,y=v&&own.mana.find(y=>y.uid===v.uid&&(y.zoneSerial||0)===v.serial);
  if(y&&manaEvolution1701(s,t.p,host,y,t.max)){
   remove(own.mana,y.uid);clear(y,'battle');
   enter(s,t.p,y,host.uid,{origin:'mana',execution:false,g31Force:true});
  }
  break;
 }
 case'g34_SearchCast1641':{
  const y=v&&own.deck.find(y=>y.uid===v.uid),c=y&&faces(card(y))[v.face||0];
  const allowed=c&&c.type===t.kind&&cost(c)<=4&&api.canExecuteUnpaid(s,t.p,c)&&api.canCast(s,t.p,c,'deck')&&
   (c.type==='spell'||api.canEnter(s,t.p,c,{origin:'deck',execution:true}));
  for(const uid of t.ids||[])release(s,t.p,uid);
  if(allowed){
   remove(own.deck,y.uid);
   api.shuffleLibrary(s,t.p,[],t.source);
   own.deck.push(y);
   cast(s,t.p,y.uid,true,null,v.face||0,null,'deck',card(t.source).name+'の能力');
  }else{api.shuffleLibrary(s,t.p,[],t.source);api.deckCheck(s,t.p);}
  break;
 }
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
 case'g34_DoubleRaidPick':raid764.doubleChosen(s,t,v);break;
 case'g34_DoubleRaidUse':raid764.doubleUseChosen(s,t,v);break;
 case'g34_RaidPick':return raid764.chosen(s,t,v);
 case'g34_OpponentTopGrave866':{
  const opponent=1-t.p;
  zoneMove(s,opponent,'deck',v,'grave');
  for(const uid of t.ids)release(s,opponent,uid);
  api.deckCheck(s,opponent);
  break;
 }
 case'g34_LookSameCosts1622':
  if(v)put(s,{...t,op:'g34_LookPick',stage:0,chosen:t.ids,
   stages:[{n:'all',to:'hand',reveal:true}],rest:'keep'});
  else for(const uid of t.ids)release(s,t.p,uid);
  break;
 case'g34_LookAll424':{const chosen=v?t.g424Ids:[];put(s,{...t,op:'g34_LookPick',chosen,stages:t.stages.map((q,i)=>i===t.stage?{...q,n:chosen.length,optional:false,g424AllOrNone:false}:q)});break;}
 case'g34_ManaDownUpTo1604':{
  const remaining=t.remaining??[0,1],chosen=t.chosen??[],selected=t.selected??[];
  put(s,v?{...t,chosen:[...chosen,v]}:{...t,remaining:remaining.slice(1),selected:[...selected,...chosen],chosen:[]});break;
 }
 case'g34_ManaDown426':if(v)turnManaDown(s,t,{...v,p:t.p});break;
 case'g34_ManaDownEach1041':
  if(v===true)for(const ref of t.selected)turnManaDown(s,t,ref);
  else if(v)put(s,{...t,remaining:(t.remaining??[s.active,1-s.active]).slice(1),selected:[...(t.selected??[]),v]});
  break;
 case'g34_PsychedelicaPick997':
  put(s,{...t,op:'g34_Order',p:t.deckOwner,ids:t.ids.filter(uid=>uid!==v.uid),rest:'bottom',ordered:[],
   after:[{op:'PsychedelicaCast997',selected:v}]});
  break;
 case'g34_Ryuo996':{
  const y=own.deck.find(y=>y.uid===v&&t.ids.includes(v));
  put(s,{...t,op:'g34_RyuoFinish996',revealed:y?.uid});
  if(y){
   api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(y).name,{cardId:y.cardId});
   const power=api.revealedPower(y,s);
   start(s,t,[{op:'Target',to:'grave',optional:true,
    filter:power===Infinity?{creature:true}:{creature:true,maxPower:power,g199Power:true},
    title:'公開したクリーチャーのパワー以下の相手を1体破壊する（任意）'}]);
  }
  break;
 }
 case'g34_SplitPile1257':
  put(s,v===null?{...t,op:'g34_ChoosePile1257'}:{...t,first:[...t.first,v]});
  break;
 case'g34_ChoosePile1257':{
  const g255Plans=t.ids.filter(uid=>t.first.includes(uid)===(v===0)).map(uid=>({uid,to:'hand'}));
  distribute255(s,{...t,g255Plans,ids:t.ids.filter(uid=>!g255Plans.some(r=>r.uid===uid)),rest:'grave'});
  break;
 }
 case'g34_LookPick':if(v)put(s,{...t,chosen:[...(t.chosen||[]),v]});else put(s,{...t,stages:t.stages.map((q,i)=>i===t.stage?{...q,n:(t.chosen||[]).length}:q)});break;
 case'g34_GuardOrder834':
 case'g34_Order':put(s,{...t,ids:t.ids.filter(uid=>uid!==v),ordered:[...(t.ordered||[]),v]});break;
 case'g34_Ramp':ramp(s,t,v);break;
 case'g34_Pradox1089':put(s,{...t,op:'g34_Select',origin:'deck',g530Ids:t.ids,deploy:true,n:1,optional:true,
  filter:{creature:true,color:v,max:10},after:[{op:'PradoxRest1089',ids:t.ids,color:v}],
  title:'選んだ文明のコスト10以下のクリーチャーを1体まで出す'});break;
 case'g34_PradoxRemaining1089':
  if(v)put(s,{...t,op:'g34_Put',origin:'deck',target:v.uid,execution:false},
   {...t,ids:t.ids.filter(uid=>uid!==v.uid),remaining:t.remaining.filter(c=>c!==v.color)});
  else put(s,{...t,op:'g34_Order',rest:'bottom',ordered:[]});
  break;
 case'g34_BorrowMizuhanome1089':if(v)for(const e of t.entries)api.enqueue(s,t.p,e);break;
 case'g34_ManaReveal1087':if(v){
  const x=own.mana.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial),y=own.hand.find(x=>x.uid===v);
  if(x&&y&&faces(card(y)).some(c=>race(c,t.race))){
   api.log(s,t.p,'reveal',card(t.source).name+'：手札から'+card(y).name+'を公開',{cardId:y.cardId});
   api.untap(s,t.p,x);
  }
 }break;
 case'g34_PrayerPlayer1609':
  put(s,task('g34_Sequence',v,t.source,{controller:t.controller??t.p,defs:[{op:'Draw',n:3},{op:'Discard',owner:'self',n:2}]}));
  break;
 case'g34_Oboro1608':
  put(s,{...t,left:v?t.left-1:0});
  if(v)api.draw(s,t.p,1,{drawn:t.drawn});
  break;
 case'g34_DrawUpTo':if(t.after){
  if(v){
   if(t.n>1)put(s,{...t,n:t.n-1,drawStarted:true});
   else start(s,t,t.after);
   api.draw(s,t.p,1);
  }else if(t.drawStarted)start(s,t,t.after);
 }else if(v){
  const next=t.n>1?{...t,n:t.n-1}:null;
  // Keep the next choice behind any replacement for the current draw.
  if(t.g853EachDraw&&next)put(s,next);
  api.draw(s,t.p,1);
  if(!t.g853EachDraw&&s.winner===null&&next)put(s,next);
 }break;
 case'g34_StartDraw729':{
  const sources=t.sources.slice(1);
  const keys=t.g1178Keys;
  if(v&&keys)(s.once??={})[keys[0]]=s.turn;
  put(s,{...t,source:sources[0]||t.source,sources,n:t.n==='∞'?t.n:t.n+Number(v||0),
   ...(keys?{g1178Keys:keys.slice(1)}:{})});
  break;
 }
 case'g34_Draw':
  if(v&&t.g792Once)(s.once??={})[onceKey792(t,t)]=s.turn;
  if(t.g933TopSame){if(v)put(s,{...t,op:'g34_DrawThenTop933',n:v,drawn:[]});}
  else if(t.g970RevealDraw){if(v)put(s,{...t,op:'g34_DrawReveal911',n:v,drawn:[]});}
  else api.draw(s,t.p,v);
  break;
 case'g34_HandFollow584':{const x=s.players[discardOwner584(t)].hand.find(y=>y.uid===v);if(x)discardFollow584(s,t,x);break;}
 case'g34_PlayersDiscard1178':{
  const picks=t.picks??[],p=picks.length===0?s.active:1-s.active;
  put(s,{...t,picks:[...picks,{p,uid:v}]});
  break;
 }
 case'g34_SabakiPay1348':{
  const y=v&&own.hand.find(x=>x.uid===t.target);
  if(y&&own.hand.some(x=>x.uid===t.payment)&&api.canCast(s,t.p,card(y),'hand'))
   api.discardSelected(s,t.p,[t.payment],t.source,t.p,{...t,op:'g34_SabakiDeclared1348'});
  break;
 }
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
 case'g34_MillTrigger1143':{
  if(!v)break;
  const moved=api.mill(s,t.p,v,{together:true});
  if(s.winner!==null)break;
  const n=moved.filter(y=>own.grave.includes(y)&&faces(card(y)).some(f=>f.trigger||f.triggerPlus||f.superTrigger)).length;
  if(n)start(s,t,[{op:'Select',origin:'battle',owner:'opponent',to:'grave',n,optional:true,
   g173Targets:true,g193Select:true,filter:{creature:true},title:'破壊する相手のクリーチャーを'+n+'体まで選ぶ'}]);
  break;
 }
 case'g34_MilledCost':
  if(t.costs.includes(v))start(s,t,[{...t.target,filter:v==='∞'?{}:{max:v}}]);
  break;
 case'g34_PsychicMill1734':if(v)put(s,{...t,accepted:true});break;
 case'g34_Mill':if(v){const p=t.opponent?1-t.p:t.owner??t.p;api.mill(s,p,t.n==='∞'?s.players[p].deck.length:t.n,{together:t.g1042Together});}break;
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
 case'g34_PsychicBaseOrder1355':{
  const host=s.players[t.controller].battle.find(x=>x.uid===t.host),selected=[...(t.selected||[]),v];
  const rest=[host,...host.psychicLinks].filter(x=>!selected.includes(x.uid));
  if(rest.length>1){put(s,{...t,selected});break;}
  const x=remove(s.players[t.controller].g34Holding||[],t.target);
  if(x){
   enter(s,t.controller,x,t.baseUid,{...t.entryOptions,psychicBaseOrder:{
    ...t.entryOptions.psychicBaseOrder,[t.host]:[...selected,...rest.map(x=>x.uid)]
   }});
   if(s.players[t.controller].battle.includes(x))put(s,...(t.afterEntryTasks||[]));
  }
  break;
 }
 case'g34_PsychicLink1355':{
  const host=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);
  const uids=t.partners?v:[v];
  const group=psychicLinkChoices1358(s,t.p,host,t).find(xs=>xs.every((x,i)=>x.uid===uids[i]));
  if(group)api.linkPsychic1355(s,t.p,host,...group);
  break;
 }
 case'g34_BattleCardDestination580':api.moveBattleCard(s,t.p,t.target,v,{controller:t.controller});break;
 case'g34_BattleCardBounce578':
 case'g34_BattleCardMove579':if(v){
  const row=cardMoveRows579(s,t).get(v),to=t.to||'hand';
  if(row){
   if(t.ownerChoosesDestination)put(s,{...t,op:'g34_BattleCardDestination580',p:row.p,target:v});
   else{
    // Rule 101.3a: a chosen move still counts if prevented or replaced.
    moveSelectedCard581(s,t,row,to);
    if(t.g970AfterMove)start(s,t,t.g970AfterMove);
   }
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
 case'g34_CopyOnEntry1357':copyOnEntry1357(s,t,v);break;
 case'g34_BorrowAttack1370':{
  const host=own.battle.find(x=>x.uid===v.uid&&(x.incarnation||0)===v.incarnation&&!x.sealed&&!x.faceDown);
  const entry=host&&api.attackAbilities(s,t.p,host,t)[v.index];
  if(entry){api.log(s,t.p,'borrowAttack',card(t.source).name+'で'+card(host).name+'の攻撃時能力を１つ使う',{cardId:t.source});api.resolveBorrowedAttack1370(s,entry);}break;
 }
 case'g34_SpellManaFinish1647':{
  const f=s.extSpells?.find(f=>f.inst.uid===t.uid);
  if(f){f.g1647ManaDecided=true;if(v===true){f.to='mana';f.g1647ExternalFinish=true;}}
  put(s,t.resume);break;
 }
 case'g34_OwnerDeckChoice1784':{
  const target=s.players[t.owner].battle.find(y=>y.uid===t.target&&(y.incarnation||0)===t.targetIncarnation);
  if(target&&!target.sealed&&api.isCreature(s,target)&&['deckTop','deck'].includes(v))
   move(s,[{player:t.owner,uid:target.uid,to:v,destroy:false,controller:t.owner,toOwnerDeck:true,g1089OrderDeck:true,orderDeckTop:true}]);
  break;
 }
 case'g34_Target':
  if(t.g1818DeathDraw){
   const y=v&&own.battle.find(x=>x.uid===v.uid);
   if(y)(s.extLimits??=[]).push({kind:'g1818DeathDraw',player:t.p,source:t.source,
    ref:{uid:y.uid,incarnation:y.incarnation||0},n:t.g1818DeathDraw,turn:s.turn,expires:'end',who:s.active});
  }
  if(t.g1827OwnerAfter){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(y){const owner=y.cardOwner??v.p;
    move(s,[{player:v.p,uid:y.uid,to:t.to,destroy:t.to==='grave',controller:t.p,
     ...(t.to==='deck'?{toOwnerDeck:true,g731Shuffling:!!t.g1739Shuffle}:{toOwnerGrave:true})}]);
    if(!t.g1827OwnerAfter.some(d=>d.op==='Select'&&d.origin==='deck')||!api.deckLocked(s,owner))
     start(s,{...t,p:owner},t.g1827OwnerAfter);
   }
   break;
  }
  if(t.g1826Transmute){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(y){const owner=y.cardOwner??v.p;
    move(s,[{player:v.p,uid:y.uid,to:'deck',toOwnerDeck:true,g731Shuffling:true,destroy:false,controller:t.p}]);
    start(s,{...t,p:owner},[{op:'RevealTop514',g1826PublicReveal:true,filter:{g1826Element:true},to:'battle',elseTo:'deck'}]);
   }
   break;
  }
  if(t.g1817Orochi){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(y){const owner=y.cardOwner??v.p;
    move(s,[{player:v.p,uid:y.uid,to:'deck',toOwnerDeck:true,destroy:false,controller:t.p}]);
    start(s,{...t,p:owner},[{op:'OrochiReveal1817'}]);
   }
   break;
  }
  if(used792(s,t,t))break;
  if(t.g1784OwnerDeckChoice){
   const target=v&&s.players[v.p].battle.find(y=>y.uid===v.uid);
   if(target)choice(s,{...t,op:'g34_OwnerDeckChoice1784',target:v.uid,owner:v.p,targetIncarnation:target.incarnation||0},
    '選ばれたクリーチャーを置く場所を選ぶ',[opt('自分の山札の上','deckTop',12),opt('自分の山札の下','deck',10)],v.p);
   break;
  }
  if(t.g1736MuteUntilStart){
   const target=v&&s.players[v.p].battle.find(y=>y.uid===v.uid&&!y.sealed&&api.isCreature(s,y));
   if(target)(s.extLimits??=[]).push({kind:'g34Mute',player:v.p,expires:'start',who:t.p,
    g1736TargetRef:{uid:target.uid,incarnation:target.incarnation||0}});
   break;
  }
  if(t.g1357Become){
   const host=sourceHost474(s,t)?.x;
   const target=v&&s.players[v.p].battle.find(y=>y.uid===v.uid);
   if(host&&target&&!host.sealed&&api.isCreature(s,host))api.copyCreature1357(s,t.p,host,target,t.g1357EndThisTurn);
   break;
  }
  if(!v&&t.elseDefs){start(s,t,t.elseDefs);break;}
  if(t.g1309Revealed){
   const returned=v&&own.battle.find(y=>y.uid===v.uid);
   if(returned){
    put(s,task('g34_MojitoDeploy1309',t.p,t.source,{
     revealed:t.g1309Revealed,returned:{uid:returned.uid,serial:returned.zoneSerial||0}
    }));
    move(s,[{player:t.p,uid:returned.uid,to:'hand',toOwnerHand:true,controller:t.p}]);
   }
   break;
  }
  if(t.g1150AttachGrave){
   const host=v&&own.battle.find(y=>y.uid===v.uid&&!y.sealed&&matches(s,t.p,y,{creature:true,...t.filter}));
   if(host)start(s,t,[{op:'Select',origin:'grave',n:1,g1060AttachBase:true,
    g1132EntryTarget:{uid:host.uid,incarnation:host.incarnation||0},
    title:'選んだクリーチャーの下に置く自分の墓地のカードを1枚選ぶ'}]);
   break;
  }
  if(t.g1260PairedCombatLock){
   const source=sourceHost474(s,t)?.x,target=v&&s.players[v.p].battle.find(y=>y.uid===v.uid);
   if(!source||!target||source===target||source.sealed||target.sealed)break;
   (s.extLimits??=[]).push({kind:'g1260PairedCombatLock',refs:[source,target].map(y=>
    ({uid:y.uid,incarnation:y.incarnation||0}))});
   break;
  }
  if(t.g959MoveTop){
   if(v)api.moveBattleCard(s,v.p,v.uid,t.to,{controller:t.controller??t.p});
   break;
  }
  if(t.g1645Boomerang&&v){
   const target=own.battle.find(y=>y.uid===v.uid),frame=s.extSpells?.find(f=>f.inst.uid===t.uid&&f.caster===t.p&&!f.virtual);
   if(target&&frame)(s.extLimits??=[]).push({kind:'g1645Boomerang',source:t.source,controller:t.p,ref:{uid:target.uid,incarnation:target.incarnation||0},spellRef:{uid:t.uid,incarnation:frame.inst.incarnation||0,serial:(frame.inst.zoneSerial||0)+1},turn:s.turn,expires:'end',who:s.active});
  }
  if(t.g1694Fruit&&v){
   const y=own.battle.find(y=>y.uid===v.uid);
   if(y)(s.extLimits??=[]).push({kind:'g1694Fruit',player:t.p,ref:{uid:y.uid,incarnation:y.incarnation||0},source:t.source,spellCost:cost(card(t.source)),turn:s.turn,expires:'end',who:s.active});
  }
  if(t.g946BattleWinUntap&&v){
   const target=own.battle.find(y=>y.uid===v.uid);
   if(target)(s.extLimits??=[]).push({kind:'g946BattleWinUntap',source:t.source,controller:t.p,
    ref:{uid:target.uid,incarnation:target.incarnation||0},turn:s.turn,expires:'end',who:s.active,
    ...(t.g962EveryWin?{g962EveryWin:true}:{})});
  }
  if(t.g940Reload){
   const y=v&&own.battle.find(y=>y.uid===v.uid);
   if(y){
    put(s,{...t,op:'g34_Reload940',target:y.uid,serial:(y.zoneSerial||0)+1});
    move(s,[{player:t.p,uid:y.uid,to:'hand',controller:t.p}]);
   }
   break;
  }
  if(t.g939ReturnBases){
   if(v)put(s,{...t,op:'g34_ReturnBases939',owner:v.p,target:v.uid});
   break;
  }
  if(t.g971AttackTarget){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid&&!x.tapped&&api.isCreature(s,x));
   if(y)(s.extLimits??=[]).push({kind:'g971AttackTarget',player:t.p,refs:api.allLayers(y).map(key),
    ...(t.includeSource?{}:{except:key(t)}),turn:s.turn,expires:'end',who:s.active});
   break;
  }
  if(t.g924AttackableUntapped){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(y)(s.extLimits??=[]).push({kind:'g924AttackableUntapped',refs:api.allLayers(y).map(key),
    spellSource:t.source,spellCost:cost(card(t.source)),turn:s.turn,expires:'end',who:s.active});
   break;
  }
  if(t.g906AttackDraw){
   const y=v&&own.battle.find(x=>x.uid===v.uid);
   if(y)start(s,t,[{op:'TurnAttackDraw613',refs:api.allLayers(y).map(key),n:t.g906AttackDraw}]);
   break;
  }
  if(t.g1307NextAttackUntap){
   const y=v&&own.battle.find(x=>x.uid===v.uid);
   if(y)(s.extLimits??=[]).push({kind:'g543Shinka',when:'nextAttackEnd',p:t.p,source:t.source,
    refs:api.allLayers(y).map(key),expires:'end',who:s.active});
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
   if(y&&(!t.g983FirstTapThisTurn||!y.tapped&&!used(s,'g191Tapped',y)))
    (s.extLimits??=[]).push({kind:'g885FirstTap',ref:{uid:y.uid,incarnation:y.incarnation||0},
     player:t.p,source:t.source,expires:'end',who:s.active,
     ...(t.g983FirstTapThisTurn?{spellCost:cost(faces(card(t.source)).at(-1))}:{})});
   break;
  }
  if(t.g1312Bushido){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(!y)break;
   move(s,[{player:v.p,uid:y.uid,to:'grave',destroy:true,controller:t.p,g1312Bushido:true}]);
   start(s,t,[{op:'BushidoDestroyHost1312'}]);
   break;
  }
  if(t.g1316Ambition){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(!y){start(s,t,t.elseDefs);break;}
   const limit=cost(effective(y,s));
   move(s,[{player:v.p,uid:y.uid,to:'grave',destroy:true,controller:t.p}]);
   start(s,t,[{op:'Select',origin:'grave',n:1,deploy:true,optional:true,g236GraveDeploy:true,
    filter:{race:'ゴッド',belowCost:limit===Infinity?'∞':limit},g1316AmbitionRevive:true,after:t.elseDefs,
    title:'選んだクリーチャーよりコストが小さいゴッドを墓地から1つまで選ぶ'}]);
   break;
  }
  if(t.g882DeployBelowCost){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(!y)break;
   // The chosen creature supplies the cost even if its return is replaced.
   const limit=cost(effective(y,s));
   const fromGrave=t.g882DeployBelowCost==='grave';
   move(s,[{player:v.p,uid:y.uid,to:'hand',destroy:false,controller:t.p,...(t.toOwnerHand?{toOwnerHand:true}:{})}]);
   start(s,t,[{op:'Select',origin:fromGrave?'grave':'hand',n:1,deploy:true,optional:!fromGrave,
    ...(fromGrave?{g236GraveDeploy:true}:{}),filter:{creature:true,belowCost:limit===Infinity?'∞':limit}}]);
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
  if(t.g1330ExtraCostLock){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(!y)break;
   // The selected cost applies even when the move is replaced (QA 38620).
   const selected=cost(effective(y,s));
   move(s,[{player:v.p,uid:y.uid,to:'extra',destroy:false,toOwnerExtra:true,controller:t.p}]);
   start(s,t,[{op:'Lock',spell:true,limit:{kind:'g1330ExactEntry',cost:selected===Infinity?'∞':selected}}]);
   break;
  }
  if(t.g1121ExtraOwnerDraw){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(y){
    const owner=y.cardOwner??v.p;
    move(s,[{player:v.p,uid:y.uid,to:'extra',destroy:false,toOwnerExtra:true,controller:t.p}]);
    start(s,{...t,p:owner},[{op:'Draw',n:1}]);
   }
   break;
  }
  if(t.g810AnotherWith||t.g810AnotherIfOwn){
   const y=v&&s.players[v.p].battle.find(x=>x.uid===v.uid);
   if(!y)break;
   const g810Excluded=api.allLayers(y).map(key);
   move(s,[{player:v.p,uid:y.uid,to:'grave',destroy:true,controller:t.controller??t.p}]);
   const filter=t.g810AnotherIfOwn||{creature:true,g201ExactName:t.g810AnotherWith};
   start(s,t,[{op:'IfOwn',filter,
    defs:[{op:'Target',to:'grave',filter:t.filter,g810Excluded,
     ...(t.g810AnotherIfOwn?{title:'破壊する別の相手クリーチャーを選ぶ'}:{})}]}]);
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
  if(t.g1301ManaDeploy){
   const y=v&&own.battle.find(x=>x.uid===v.uid);
   if(!y)break;
   // The selected creature supplies the cost even if its move is replaced (QA 42017).
   const limit=cost(effective(y,s));
   move(s,[{player:t.p,uid:y.uid,to:'mana',toOwnerMana:true,tapped:true,controller:t.p}]);
   start(s,t,[{op:'Select',origin:'mana',n:1,deploy:true,
    filter:{creature:true,faceUp:true,belowCost:limit===Infinity?'∞':limit}}]);
   break;
  }
  if(t.g1626ForceAgain){
   const y=v&&own.battle.find(y=>y.uid===v.uid);if(!y)break;
   // The same physical top card (or departing God part), never its evolution bases or a namesake.
   const refs=[y,...(y.godLinks||[])].map(x=>({uid:x.uid,serial:(x.zoneSerial||0)+1}));
   move(s,[{player:t.p,uid:y.uid,to:'grave',destroy:true,controller:t.p}]);
   start(s,t,[{op:'Select',origin:'grave',n:1,deploy:true,filter:{creature:true},g960FormerBases:refs}]);
   break;
  }
  if(t.g786ReviveAtCost){
   const y=v&&s.players[v.p].battle.find(y=>y.uid===v.uid);
   if(!y)break;
   const max=cost(effective(y,s));
   move(s,[{player:v.p,uid:y.uid,to:'grave',destroy:true,controller:t.p}]);
   const limit=max===Infinity?Infinity:max+(t.g1625HandUpgrade?1:0);
   const bound=t.g1325StrictlyLower?{belowCost:limit===Infinity?'∞':limit}:limit===Infinity?{}:{max:limit};
   start(s,t,[{op:'Select',origin:t.g1625HandUpgrade?'hand':'grave',n:1,deploy:true,
    optional:!!(t.g795OptionalNonEvolution||t.g1325StrictlyLower||t.g1625HandUpgrade),
    filter:{creature:true,...bound,...(t.g1625HandUpgrade?{raceAny:['ファイアー・バード','ドラゴン']}:{}) ,
     ...(t.g795OptionalNonEvolution?{nonEvolution:true}:{})}}]);
   break;
  }
  if(v){const y=s.players[v.p].battle.find(y=>y.uid===v.uid);if(y){if(t.g1458DrawCost){start(s,t,[{op:'Draw',n:cost(effective(y,s))}]);break;}if(t.g627StayTarget)stayUntilStart627(s,t,y);if(t.g792Once)(s.once??={})[onceKey792(t,t)]=s.turn;if(t.g805AddCivilization){put(s,{...t,op:'g34_ChooseCivilization805',target:{...v,incarnation:y.incarnation||0}});break;}if(t.g503Stack){const n=api.allLayers(y).length;const effect=t.g503Stack==='opponentDestroy'?{op:'OpponentSelect',n,to:'grave'}:t.g503Stack==='opponentMinus'?{op:'Target',power:-2000*n,g242PowerMinus:true}:t.g503Stack==='shield'?{op:'ShieldTop',n,g779Simultaneous:true}:{op:t.g503Stack==='draw'?'DrawUpTo':'Ramp',n};start(s,t,[effect,...(t.after||[])]);break;}if(t.g467Destinations){put(s,{...t,op:'g34_TargetDestination467',target:{...v,incarnation:y.incarnation||0}});break;}if(t.g235TapOrUntap){put(s,{...t,op:'g34_TapState235',target:{...v,incarnation:y.incarnation||0}});break;}if(t.g565AttackLock)(y.g35NoAttack??=[]).push({turn:s.turn});if(t.g569WeakerBlock)(s.extLimits??=[]).push({kind:'g569WeakerBlock',ref:{uid:y.uid,incarnation:y.incarnation||0},spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1)),expires:'end',who:s.active});if(t.g567PlayerStop)stopPlayerAttack567(s,t,y);if(t.g190Freeze)freeze(s,t,v.p,y);if(t.g546Force)force546(s,t,v.p,y);if(t.g1438ExtraBreak)(s.extLimits??=[]).push({kind:'g412ExtraBreak',player:v.p,ref:{uid:y.uid,incarnation:y.incarnation||0},amount:t.g1438ExtraBreak,expires:'end',who:s.active});if(t.g547OwnerShield)put(s,task('g34_ShieldTop',v.p,t.source,{n:1,controller:t.controller??t.p}));if(t.g631MillCost){const amount=cost(effective(y,s));start(s,t,[{op:'Mill',n:Number.isFinite(amount)?amount:'∞',...(t.g638OptionalMill?{optional:true}:{}),...(t.g1253MillTogether?{g1042Together:true}:{})}]);}if(t.g1643NameLock)(s.extLimits??=[]).push({kind:'g1643NamedCreatureLock',player:v.p,names:battleNames676(s,y),expires:'start',who:t.p,spellSource:t.source,spellCost:cost(card(t.source))});if(t.to)move(s,[{player:v.p,uid:v.uid,to:t.to,destroy:t.to==='grave',tapped:!!t.tapped,...(t.g1739Shuffle?{g731Shuffling:true}:{}),...(t.moveByTargetController?{controller:v.p}:{}),...(t.g1133AlreadyReplaced?{replacement:true}:{}),...(t.toOwnerMana?{toOwnerMana:true}:{}),...(t.toOwnerShields?{toOwnerShields:true}:{}),...(t.toOwnerHand?{toOwnerHand:true}:{}),...(t.toOwnerDeck?{toOwnerDeck:true}:{}),...(t.toOwnerExtra?{toOwnerExtra:true}:{}),...(t.toOwnerGrave?{toOwnerGrave:true}:{}),...(t.to==='deckTop'?{orderDeckTop:true}:{}),...(t.faceUp?{faceUp:true}:{})}]);const wasTapped=y.tapped;if(t.tap)api.tap(s,v.p,y);const newlyTapped=!wasTapped&&y.tapped;
   if(t.g988Lure)(s.g42Lures??=[]).push({p:t.p,uid:y.uid,incarnation:y.incarnation||0,source:t.source,cost:cost(card(t.source))});
   if(t.g1257NoAttackUntilStart)(s.extLimits??=[]).push({kind:'g1257AttackCreatureLock',
    g1058FollowUnit:true,ref:{uid:y.uid,incarnation:y.incarnation||0},expires:'start',who:t.p,
    ...(t.g1356NoBlock?{block:true}:{})});
   if(t.g1116CreatureUntapLock)(s.extLimits??=[]).push({
    kind:'g1116CreatureUntapLock',ref:key(y),who:t.p,expires:'start',
    spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))
   });
   if(t.g1671NirvanaLock)(s.extLimits??=[]).push({kind:'g1671NirvanaLock',
    ref:{uid:y.uid,incarnation:y.incarnation||0},host:key(t),g1058FollowUnit:true});
   if(t.g1198UntapLock)(s.extLimits??=[]).push({kind:'g1198CreatureUntapLock',ref:key(y),host:key(t),...(t.g1580HostTapped?{g1580HostTapped:true}:{})});
   if(t.g446BattleOnly)grantBattlePower446(s,t,y,t.g446BattleOnly);
   if(t.powerMultiplier)(y.powerModifiers??=[]).push({amount:0,multiplier:t.powerMultiplier,expires:'end',who:s.active});
   if(t.g1526BounceNames){const names=new Set(battleNames676(s,y)),rows=[0,1].flatMap(p=>creatures(s,p).filter(z=>!z.sealed&&battleNames676(s,z).some(n=>names.has(n))).map(z=>({player:p,uid:z.uid,to:'hand',toOwnerHand:true,destroy:false,controller:t.p})));move(s,rows);break;}if(t.g676TapNames)tapNames676(s,y);if(t.g291UntapUntilSelf)(y.tapLocks??=[]).push(t.p);if(t.untap&&api.canUntap(y)){const was=y.tapped;y.tapped=false;if(was)combined.untapped(s,v.p,y);}if(t.lock){if(t.spell)(y.g170StartFreeze??=[]).push({spellSource:t.source,spellCost:cost(faces(card(t.source)).at(-1))});else y.skipUntap=true;}if(t.g1111PowerZero){
    (y.powerModifiers??=[]).push({fixedPower:0,expires:'end',who:s.active,spellSource:t.source,spellCost:cost(card(t.source))});
    api.powerCleanup(s);
   }
   if(t.g1543FirstEnd)(s.extLimits??=[]).push({kind:'g543Shinka',when:'firstAttackEnd',p:t.p,source:t.source,uid:y.uid,incarnation:y.incarnation||0,expires:'end',who:s.active});if(t.power)(y.powerModifiers??=[]).push({amount:t.power,...(t.g1111PowerUntilLeave?{}:{expires:t.g521UntilStart?'start':'end',who:t.g521UntilStart?t.p:s.active}),...(t.g337PowerAttacker?{attackOnly:true,grantedAbility:true}:{}),spellSource:t.spell? t.source:undefined,spellCost:t.spell?cost(faces(card(t.source)).at(-1)):undefined});if(t.grant)applyGrant(s,t,y);if(t.g465DestroySafe)(s.extLimits??=[]).push({kind:'g409AttackEffect',player:v.p,ref:{uid:y.uid,incarnation:y.incarnation||0},source:t.source,effect:'destroySafe',expires:t.g465DestroySafe,who:t.g465DestroySafe==='start'?t.p:s.active});if(t.g455ExtraBreak)(s.extLimits??=[]).push({kind:'g412ExtraBreak',player:v.p,ref:{uid:y.uid,incarnation:y.incarnation||0},source:t.source,amount:t.g455ExtraBreak,expires:'end',who:s.active,...(t.g969FollowControl?{g969FollowControl:true}:{}),...(t.spell?{spellCost:cost(faces(card(t.source)).at(-1))}:{})});if(t.g821DrawIfEvolution&&api.isEvolution(y))start(s,t,[{op:'DrawUpTo',n:1}]);if(t.seal)api.seal(s,v.p,[y.uid]);if(t.g587AfterSelection&&(!t.g987AfterNewTap||newlyTapped))start(s,t,t.after);}}if(t.after&&!t.g587AfterSelection)start(s,t,t.after);
  if(t.g1163SecondDestroy)secondDestroy1163(s,t,v?.uid);
  if(t.g1040OtherPower)otherTargetPower1040(s,t,v);
  if(t.g1005ManaArmedFollowup&&v)start(s,t,[{
   op:'IfOwn',filter:{g267Mana:{n:4,multi:true}},
   defs:[{op:'Select',...t.g1005ManaArmedFollowup,excludeUid:v.uid}]
  }]);
  if(t.g984TapIfMore&&v){
   const count=p=>creatures(s,p).filter(y=>!y.sealed).length;
   if(count(t.p)>count(1-t.p))start(s,t,[{op:'Target',tap:true,excludeUid:v.uid,
    title:'追加でタップする相手のクリーチャーを1体選ぶ'}]);
  }
  break;
 case'g34_MillSequence1616':
  if(v){const y=own.grave.find(y=>y.uid===v.uid&&(y.zoneSerial||0)===v.serial);if(y&&t.refs?.some(r=>r.uid===v.uid&&r.serial===v.serial)&&matches(s,t.p,y,t.filter)&&api.canMoveZone(s,t.p,'grave'))zoneMove(s,t.p,'grave',y.uid,'hand',t);}
  else if(!t.g1785PureRecovery)start(s,t,[{op:'SpellFinish416',to:'hand'}]);
  break;
 case'g34_Execute':if(v){const y=own[v.origin].find(x=>x.uid===v.uid);if(t.g1675ExtraSummon&&(!y||(y.zoneSerial||0)!==v.serial1675||!api.canMoveZone(s,t.p,v.origin)))break;if(t.g1616Refs&&(!y||!t.g1616Refs.some(r=>r.uid===y.uid&&r.serial===(y.zoneSerial||0))))break;if(t.g555FinishTo&&(!y||(y.zoneSerial||0)!==(v.serial555||0)||!api.canMoveZone(s,t.p,v.origin)))break;if(t.g1650VividOnly&&(!y||y.uid!==t.g1578Exact.uid||(y.zoneSerial||0)!==t.g1578Exact.serial)){release(s,t.p,t.g1578Exact.uid);break;}const c=faces(card(t.g1675ExtraSummon&&v.g1104Back?psychicBack1104(y):y))[v.face];if(!c||!api.canExecuteUnpaid(s,t.p,c))break;if(t.g1675ExtraSummon&&(c.type!=='creature'||cost(c)>t.max||!matches(s,t.p,v.g1104Back?psychicBack1104(y):y,t.filter)||!api.canCast(s,t.p,c,v.origin)||!api.canEnter(s,t.p,c,{origin:v.origin,execution:true})))break;if(t.g1672ManaCivilizations&&(c.type==='creature'||cost(c)>t.max||!manaCivilizations1672(s,t.p,c)||!api.canCast(s,t.p,c,v.origin)))break;if(t.g1650VividOnly){if(c.g1335VividDraw===undefined||y.uid!==t.g1578Exact.uid||(y.zoneSerial||0)!==t.g1578Exact.serial)break;release(s,t.p,y.uid);}if(t.g555FinishTo){if(!c||c.type!=='spell'||cost(c)>t.max||t.spellColorsAny&&!colors(c).some(color=>t.spellColorsAny.includes(color))||t.g556SpellColor&&!colors(c).includes(t.g556SpellColor)||!api.canCast(s,t.p,c,v.origin))break;y.finishTo=t.g555FinishTo;}if(t.g1726WaveRefs){release(s,t.p,v.uid);api.enqueue(s,t.p,{source:t.source,effect:'extended',g1726Continue:true,g1726Prior:t.g1726Prior,task:{...t,g1616Refs:t.g1616Refs.filter(r=>r.uid!==v.uid)}});}if(t.g1832ReturnHand)put(s,{...t,op:'g34_RegisterReturn1832',target:y.uid,targetIncarnation:(y.incarnation||0)+1});if(c.evolution||c.neoEvolution)put(s,{...t,op:'g34_Put',target:v.uid,origin:v.origin,execution:true,face:v.face,...(t.g1675ExtraSummon?{g1104Back:!!v.g1104Back}:{})});else cast(s,t.p,v.uid,true,null,v.face,t.g1675ExtraSummon&&v.g1104Back?{g1321PsychicBack:true}:null,v.origin,'カードの能力');}else if(t.g408Decline)start(s,t,t.g408Decline);break;
 case'g34_ViscaMana1832':{
  const x=own.mana.find(x=>x.uid===v);
  if(!x)break;
  const serial=(x.zoneSerial||0)+1;
  if(zoneMove(s,t.p,'mana',x.uid,'grave',t)){
   const arrived=own.grave.find(y=>y.uid===x.uid&&(y.zoneSerial||0)===serial);
   if(arrived&&faces(card(arrived)).some(c=>race(c,'スノーフェアリー')))zoneMove(s,t.p,'grave',x.uid,'hand',t);
  }
  break;
 }
 case'g34_FirstDiscardUse1268':
  if(v&&firstDiscardOptions1268(s,t).some(o=>o.value.uid===v.uid&&o.value.face===v.face)){
   if(v.type==='spell')cast(s,t.p,v.uid,true,null,v.face,null,'grave','カードの能力');
   else put(s,{...t,op:'g34_Put',target:v.uid,origin:'grave',face:v.face});
  }
  break;
 case'g34_Choose':{
  if(t.modesOncePerTurn)(s.once??={})[onceKey792(t,modeUse1170(t,v))]=s.turn;
  if(t.g1045Preselect){
   // Choose all modes before resolution and apply them in printed order (QA 40186).
   const modeSelections=[...(t.modeSelections||[]),v];
   if(modeSelections.length<t.g1045Preselect)put(s,{...t,modeSelections});
   else start(s,t,modeSelections.sort((a,b)=>a-b).flatMap(i=>t.modes[i].defs));
  }else put(s,...tasks(t.p,t.source,t.modes[v].defs,{uid:t.uid,incarnation:t.incarnation}),...(t.repeat>1?[{...t,repeat:t.repeat-1}]:[]));
  break;
 }
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
  for(const x of s.players[p].hand){
   if(card(x).g1031ShieldHandEntry&&!api.handAbilityIgnored(s,x))
    for(let i=0;i<count;i++)send(s,p,x,'ShieldHandEntry1031',{serial:x.zoneSerial||0});
  }
  for(const x of s.players[p].battle){
   if(x.sealed||!card(x).g918ShieldAdded)continue;
   const defs=effective(x,s).g918ShieldAdded;
   if(defs)for(let i=0;i<count;i++)queue(s,p,x,defs);
  }
 }
 function shieldObservers1737(s){
  return s.players.flatMap((own,p)=>own.battle.flatMap(x=>{
   if(x.sealed||x.faceDown||!api.isCreature(s,x))return [];
   const defs=effective(x,s).g1737OpponentShieldAdded;
   return defs?[{p,uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0,defs}]:[];
  }));
 }
 function triggerEnemyShieldAdded1737(s,p,count){
  for(const r of shieldObservers1737(s))if(r.p!==p)
   for(let i=0;i<count;i++)queue(s,r.p,r,r.defs);
 }
 function triggerSecondMana1205(s,p){
  for(const x of s.players[p].battle){
   if(x.sealed||x.faceDown||!card(x).g1205SecondMana)continue;
   const defs=effective(x,s).g1205SecondMana;
   if(defs)queue(s,p,x,defs);
  }
 }
 const sourceDefs=(s,t,defs)=>start(s,t,defs);
 function manaBudgetDeploy1655(s,p){return {op:'Select',origin:'extra',n:2,deploy:true,optional:true,g1104PsychicFaces:true,g550CostBudget:s.players[p].mana.length,filter:{g1085Psychic:true,color:'自然'},title:'マナ枚数以下の合計コストになるよう自然のサイキックを2体まで選ぶ'};}
 function secondManaPenalty1654(s,events){
  for(const {p,ordinal} of events)if(ordinal>=2)for(const source of creatures(s,1-p))
   if(!source.sealed&&!source.faceDown&&effective(source,s).g1654SecondManaPenalty)send(s,1-p,source,'TakuyaPenalty1654',{affected:p,controller:1-p});
 }
 function manaWatch1653(s,events){
  for(const owner of[s.active,1-s.active])for(const source of s.players[owner].battle){
   if(source.sealed||source.faceDown||!api.isCreature(s,source))continue;const mode=effective(source,s).g1653ManaWatch;if(!mode)continue;
   for(const e of events){
    const nonHand=e.zone!=='hand';let affected;
    if(mode==='jet'&&e.p===1-owner&&['deck','grave'].includes(e.zone))affected=1-owner;
    if(mode==='magnet'&&!(e.zone==='hand'&&e.p===e.cardOwner))affected=e.cardOwner;
    if(mode==='azami'&&e.destination===1-owner&&nonHand){queue(s,owner,source,[{op:'Offer',title:'相手のマナ追加：山札の上から1枚をマナに置く？',defs:[{op:'Ramp',n:1}]}]);continue;}
    if(affected!==undefined)send(s,owner,source,'ManaArrival1653',{affected,mode,controller:owner});
   }
  }
 }
 function queue(s,p,x,defs,source=x.cardId,elementOrigin1411){
  const more={defs,...(elementOrigin1411===undefined?{}:{elementOrigin1411})};
  if(defs?.some(d=>d.op==='MillHostCost1771')){
   const n=cost(effective(x,s));more.g1771HostCost=n===Infinity?'∞':n;
  }
  if(defs?.some(d=>d.op==='AttackLookDeploy1317')){
   const currentCost=cost(effective(x,s));
   more.g399Attacker={uid:x.uid,incarnation:x.incarnation||0,cost:currentCost===Infinity?'∞':currentCost};
  }
  send(s,p,source===x.cardId?x:{...x,cardId:source,g1357Copies:undefined},'Sequence',more);
 }
 function copyOnEntry1357(s,t,uid){
  const x=remove(s.players[t.p].g34Holding||[],t.held);
  if(x){
   enter(s,t.p,x,t.baseUid,{...t.entryOptions,g1357BecomeTarget:uid??null});
   if(s.players[t.p].battle.includes(x))put(s,...(t.afterEntryTasks||[]));
  }
 }
 const graveFace1226=c=>c&&(c.type==='spell'||c.type==='seed'||c.seedCreature||c.natureAce4);
 function graveActions1226(s,p){
  if(s.g1226GraveUse?.turn!==s.turn||!api.canMoveZone(s,p,'grave'))return [];
  return s.g1226GraveUse.permits[p].flatMap(({uid,serial,face})=>{
   const x=s.players[p].grave.find(y=>y.uid===uid&&(y.zoneSerial||0)===serial&&!y.faceDown);
   if(!x)return [];
   const c=faces(card(x))[face],payment={...c,summonOrigin:'grave',executionUid:uid};
   if(!graveFace1226(c)||!api.canCast(s,p,c,'grave',x.cardOwner??p)||!api.canPay(s,p,payment)||
      c.type!=='spell'&&!canPut(s,p,x,'grave',true))return [];
   return [{kind:'play',uid,cardId:x.cardId,face,origin:'grave',manaPermit:'g1226GraveUse',
    cost:api.freeSpell(s,p,c)?0:api.summonCost(s,p,payment),label:c.name+'を墓地から使う'}];
  });
 }
 function gravePermits1226(s,p,x,c){
  if(x.faceDown||!graveFace1226(c)||s.g1226GraveUse?.turn!==s.turn)return [];
  return s.g1226GraveUse.permits[p].some(({uid,serial,face})=>
   uid===x.uid&&(x.zoneSerial||0)===serial&&faces(card(x))[face]?.name===c.name&&
   faces(card(x))[face]?.type===c.type)?['g1226GraveUse']:[];
 }
 function consumeGraveUse1226(s,p,x){
  if(s.g1226GraveUse?.turn===s.turn)
   s.g1226GraveUse.permits[p]=s.g1226GraveUse.permits[p].filter(r=>r.uid!==x.uid);
 }
 function blockerAura1226(s,p){
  let bonus=0;
  for(const source of s.players[p].battle){
   const condition=card(source).g1226BlockerAura;
   if(!condition||source.sealed||source.faceDown||api.ignored(s,source)||!api.isCreature(s,source))continue;
   // The aura changes power and attacks, never the condition's type or civilization.
   if(civilAuraReading.has(s))continue;
   civilAuraReading.add(s);
   try{if(ownCondition(s,p,condition,source.uid))bonus+=6000;}finally{civilAuraReading.delete(s);}
  }
  return bonus;
 }
 function firstSummonOrSpell1247(s,previousCount){
  // The caller runs before recording a summon or after recording a spell.
  const count=[0,1].reduce((total,p)=>{
   const summon=s.g463Summons?.[p],spell=s.g37Spells?.[p];
   return total+(summon?.turn===s.turn?summon.n:0)+(spell?.turn===s.turn?spell.n:0);
  },0);
  if(count!==previousCount)return;
  for(const p of [s.active,1-s.active])for(const x of s.players[p].battle){
   if(x.sealed||x.faceDown||!card(x).g1247FirstSummonOrSpell||!api.isCreature(s,x))continue;
   const defs=effective(x,s).g1247FirstSummonOrSpell;
   if(defs)queue(s,p,x,defs);
  }
 }
 function qualifyingUse1224(s,p,c,seedUid=null,owner=p){
  const history=s.g1224Uses??=[null,null];
  for(const player of [p,owner])if(history[player]?.turn!==s.turn)
   history[player]={turn:s.turn,seen:false,firstSeed:null,distinct:false,maxCost:0};
  const caster=history[p];
  caster.maxCost=Math.max(caster.maxCost,cost(c));
  const use=history[owner],first=!use.seen;
  // 「自分の」 refers to ownership (QA 32503), even when someone else casts it.
  use.ownUses=(use.ownUses||0)+1;
  if(first){use.seen=true;use.firstSeed=seedUid;}
  // For the first seed itself, the first different seed or spell is its first qualifying use.
  if(first||!use.distinct&&seedUid!==use.firstSeed){
   for(const x of s.players[owner].battle){
    if(x.faceDown||x.uid===seedUid||!card(x).g1224FirstUse||!first&&x.uid!==use.firstSeed)continue;
    const defs=effective(x,s).g1224FirstUse;
    if(defs)queue(s,owner,x,defs);
   }
   if(!first)use.distinct=true;
  }
 }
 function aidoruHand1256(s,t){
  return s.players[t.p].hand.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial&&card(y).g1256HandEvolutionDeath);
 }
 function aidoruOnField1256(s,p){
  return s.players[p].battle.some(y=>!y.sealed&&!y.faceDown&&battleNames676(s,y).includes('U・S・A・AIDORU'));
 }
 function lacrimaHand1224(s,t){
  return s.players[t.p].hand.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial&&!api.handAbilityIgnored(s,x));
 }
 // Declared before resolving effects, but the printed entry conditions apply at resolution (QA46517).
 function fishEndReady1240(s,p){
  return p===s.active&&s.g1240FishEntry?.[p]!==s.turn&&creatures(s,p).filter(x=>!x.sealed&&x.tapped).length>=3;
 }
 function shieldHandEndReady1313(s,t){
  return s.g1313ShieldHand?.turn===s.turn&&s.g1313ShieldHand.count>=t.g1313ShieldHand;
 }
 function declareLacrima1224(s,p){
  const use=s.g1224Uses?.[p];
  if(use?.turn!==s.turn&&p!==s.active)return false;
  const ready=s.players[p].hand.flatMap(x=>{
   const c=card(x),fish=p===s.active&&c.g1240HandEnd,shieldHand=p===s.active&&c.g1313ShieldHandEnd;
   if(!(fish||shieldHand||use?.turn===s.turn&&c.g1224HandEnd&&use.maxCost>=c.g1224HandEnd)||api.handAbilityIgnored(s,x))return [];
   return [task('g34_LacrimaDeclare1224',p,x.cardId,{uid:x.uid,serial:x.zoneSerial||0,
    ...(fish?{g1240Fish:true}:{}),...(shieldHand?{g1313ShieldHand:shieldHand}:{})})];
  });
  if(ready.length)put(s,...ready);
  return ready.length>0;
 }
 const used=(s,slot,x)=>s[slot]?.[key(x)]===s.turn,mark=(s,slot,x)=>{(s[slot]??={})[key(x)]=s.turn;};
 const onceKey792=(x,d)=>'g792:'+d.g792Once+':'+key(x);
 const used792=(s,x,d)=>!!d?.g792Once&&s.once?.[onceKey792(x,d)]===s.turn;
 const watchUsed792=(s,x,watch)=>watch.defs.length===1&&used792(s,x,watch.defs[0]);
 function queueEntryWatch251(s,p,x,y,options){
  const watch=effective(x,s).g251EntryDraw,self=x.uid===y.uid;
  if(x.sealed||!watch||watchUsed792(s,x,watch)||
   watch.g895SummonedHand&&!(options.execution===true&&options.origin==='hand'))return;
  if(watch.g1198EntryScope){
   // GG suppresses creature-entry triggers; Kinari only suppresses the entrant's abilities.
   if(api.isCreature(s,y)&&(api.selfStopped(s,p)||self&&options.selfMuted))return;
  }else if(self&&(options.selfMuted||api.selfStopped(s,p)))return;
  if(!((self&&watch.selfAlways)||matches(s,p,y,watch.filter)))return;
  const defs=watch.g1255TrackEntrant
   ?watch.defs.map(def=>({...def,g1255HasteEntrant:{uid:y.uid,incarnation:y.incarnation||0}}))
   :watch.defs;
  queue(s,p,x,defs);
 }
 const modeUse1170=(t,i)=>({g792Once:'mode:'+t.source+':'+i});
 const parottaKey747=x=>'parotta:'+key(x),parottaUsed747=(s,x)=>s.once?.[parottaKey747(x)]===s.turn;
 function custom(s,t){const own=s.players[t.p],opp=s.players[1-t.p],x=live(s,t);switch(t.name){
 case'finishBatch':endElementEntryBatch(s,'g34DeployBatch');delete own.g34ManaHeld;break;
 case'endTurn':if(!t.ownTurnOnly||s.active===t.p)api.skipTurn(s,t.p,t.source);break;
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
 case'violetSpell':{const y=opp.grave.find(y=>y.uid===t.target);if(y&&faces(card(y)).some(c=>c.type==='spell'&&api.canExecuteUnpaid(s,t.p,c)&&api.canCast(s,t.p,c,'grave')))choice(s,t,'捨てさせた呪文をコストを支払わず唱える？',[opt('唱える',true,20,y.cardId),skip()]);break;}
 case'sealSelf':if(x)api.seal(s,t.p,[x.uid],t.n);break;
 case'hydro':start(s,t,[select('mana','hand',creatures(s,t.p).filter(y=>colors(effective(y,s)).includes('光')).length,{}, {owner:1-t.p,optional:true}),select('battle','hand',creatures(s,t.p).filter(y=>colors(effective(y,s)).includes('闇')).length,{creature:true},{owner:1-t.p,optional:true})]);break;
 case'tapLockTwo':{const ys=creatures(s,1-t.p).filter(y=>!(t.selected||[]).includes(y.uid));if((t.selected||[]).length>=2||!ys.length)break;choice(s,t,'タップし、次のターンにアンタップしない相手を2体まで選ぶ',[...targetOptions(s,t.p,ys),skip()]);break;}
 case'declareName':{if(!x)break;const cs=api.allCards().filter(c=>c.type==='creature'&&c.g34Role!=='emotional');choice(s,t,'能力を無視するクリーチャーの名前を選ぶ',cs.map(c=>opt(c.name,c.name,s.players[1-t.p].battle.some(y=>card(y).name===c.name)?60:0,c.id)));break;}
 case'shinobiMekraid':{const ids=look(s,{...t,n:3});put(s,{...t,name:'mekraidPick',ids});break;}
 case'mekraidPick':{const rows=t.ids.flatMap(uid=>{const y=own.deck.find(x=>x.uid===uid);return y?faces(card(y)).flatMap((c,face)=>ninja(c)&&cost(c)<=5&&api.canCast(s,t.p,c,'deck')&&(c.type!=='creature'||canPut(s,t.p,y,'deck',true))?[opt(c.name,{uid,face},20+cost(c),y.cardId)]:[]):[];});choice(s,t,'シノビ・メクレイド5：実行するカードを1枚まで選ぶ',[...rows,skip()]);break;}
 case'karenReveal':{const chosen=t.selected||[],rows=api.handIsPublic(s,t.p)?[]:own.hand.filter(y=>ninja(card(y))&&!chosen.includes(y.uid));if(!rows.length){karenDone(s,t);break;}choice(s,t,'公開する手札のシノビを選ぶ（好きな枚数）',[...rows.map(y=>opt(card(y).name,y.uid,5,y.cardId)),opt('公開して確定',null,0)]);break;}
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
 case'cottonRamp':{const y=api.takeTop(s,t.p);if(!y)break;const multi=api.manaColors(card(y),s,t.p).length>1,dest=api.deckDestination1365(s,t.p,'mana',api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana');clear(y,dest);y.tapped=dest==='mana';api.addZone(s,t.p,dest,y);if(multi&&!api.deckWasShuffled1365(s,y))ramp(s,{...t,tapped:true},1);api.deckCheck(s,t.p);break;}
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

 
 function hasExemptingAlly1266(s,p,def){
  return def.g1266UnlessAllyRace&&s.players[p].battle.some(x=>!x.sealed&&!x.faceDown&&
   exactRaces(effective(x,s)).includes(def.g1266UnlessAllyRace));
 }
  const hooks={
 firstBlock1216(s,p,x){
  const blockHistory=s.g1216BlockHistory?.turn===s.turn?s.g1216BlockHistory:
   (s.g1216BlockHistory={turn:s.turn,refs:[]});
  const refs=api.allLayers(x).map(key),defs=effective(x,s).g1216FirstBlock;
  const triggered=defs&&!refs.some(ref=>blockHistory.refs.includes(ref));
  for(const ref of refs)if(!blockHistory.refs.includes(ref))blockHistory.refs.push(ref);
  if(triggered)queue(s,p,x,defs);
  return !!triggered;
 },
 block(s,p,x){
  const blocker=effective(x,s),defs=blocker.g178Block;
  const owner=1-p,a=s.players[owner].battle.find(y=>y.uid===s.attack?.attacker);
  const triggers=defs?.flatMap(d=>{
   if(hasExemptingAlly1266(s,p,d))return [];
   if(!d.g913BlockedAttacker)return [d];
   if(!a)return [];
   const ref={uid:a.uid,incarnation:a.incarnation||0};
   return [d.op==='ExactMove'?{...d,owner,g403Refs:[ref]}:{...d,subject:ref}];
  });
  if(triggers?.length)queue(s,p,x,triggers);
  for(const source of creatures(s,p)){
   if(source.sealed)continue;
   const races=effective(source,s).g700BlockDraw;
   if(races?.some(name=>race(blocker,name)))queue(s,p,source,[{op:'Draw',n:1,optional:true}]);
   if(effective(source,s).g830AllyBlockBreak){
    send(s,p,source,'Break497',{uid:x.uid,incarnation:x.incarnation||0,n:1,g747CreatureBreak:true,g830BlockBreaker:x.cardId});
   }
  }
  for(const player of [owner,p])for(const source of s.players[player].battle){
   if(!card(source).g946BlockWatch||source.sealed||!api.isCreature(s,source))continue;
   const watch=effective(source,s).g946BlockWatch;
   if(Array.isArray(watch))queue(s,player,source,watch);
   else if(watch&&player===p&&matches(s,p,x,watch.filter))queue(s,player,source,watch.defs);
  }
  if(a&&!a.sealed&&api.isCreature(s,a))for(const source of s.players[owner].battle){
   if(source.sealed||source.faceDown||!effective(source,s).g1619PeachCastle)continue;
   send(s,owner,source,'Break497',{uid:a.uid,incarnation:a.incarnation||0,n:1,
    g747CreatureBreak:true,g830BlockBreaker:a.cardId});
  }
  if(a&&!a.sealed&&api.isCreature(s,a))for(const source of creatures(s,owner)){
   const c=effective(source,s),requiredRace=c.g1825BlockedRace;
   if(!source.sealed&&!source.faceDown&&requiredRace&&race(effective(a,s,true),requiredRace))
    send(s,owner,source,'Break497',{uid:a.uid,incarnation:a.incarnation||0,n:c.g1825BlockedBreak,
     g747CreatureBreak:true,g830BlockBreaker:a.cardId});
  }
  const attacker=a&&!a.sealed&&effective(a,s);
  const blocked=attacker?.g559Blocked;
  if(attacker?.g756TurboRush==='blockedBreak'&&s.attack.target==='player'&&s.players[p].shields.length&&turboReady756(s,owner,a))
   send(s,owner,a,'Break497',{n:1,g747CreatureBreak:true,g830BlockBreaker:a.cardId});
  if(blocked)queue(s,owner,a,blocked);
  if(a&&!a.sealed)for(const rule of s.extLimits||[]){
   if(rule.kind==='g989BlockUntap'&&rule.player===owner)
    send(s,owner,{uid:a.uid,incarnation:a.incarnation||0,cardId:rule.source},'Untap',{g191First:true});
   if(rule.kind==='g1154BlockPower'&&rule.player===owner)
    send(s,owner,{uid:a.uid,incarnation:a.incarnation||0,cardId:rule.source},'SelfBoost313',{power:rule.power,g536Source:true});
  }
  if(a&&s.attack.g947PlayerTarget&&!api.ignored(s,a)){
   for(const grant of a.g34Grants||[]){
    if(grant.g947BlockBreak&&grant.turn===s.turn&&
     !api.spellIgnored(s,{type:'spell',cost:grant.spellCost,spellSource:grant.spellSource}))
     send(s,owner,a,'Break497',{n:1,g747CreatureBreak:true,g830BlockBreaker:a.cardId});
   }
  }
  if(a&&!a.sealed&&s.attack.g712PlayerTarget&&s.players[p].shields.length){
   for(const rule of s.extLimits||[]){
    if(rule.kind!=='g712BlockBreak'||rule.player!==owner||rule.turn!==s.turn)continue;
     if(!rule.allCreatures&&!colors(effective(a,s)).includes('自然'))continue;
     if(rule.spellCost!==undefined&&api.spellIgnored(s,{type:'spell',cost:rule.spellCost,spellSource:rule.source}))continue;
    queue(s,owner,{uid:rule.uid,incarnation:rule.incarnation,cardId:rule.source},[{op:'Break497',n:1}]);
   }
  }
 },
 crossExtraBreak948(s,p,x){
  if(x.sealed)return 0;
  const sources=s.players[p].battle.filter(y=>card(y).g948CrossExtraBreak&&y.tapped&&
   !api.ignored(s,y)&&api.isCreature(s,y));
  return sources.length&&ownCondition(s,p,{g436Crossed:true},x.uid)?sources.length:0;
 },
 turnDrawn947(s,p,count){
  for(const controller of [p,1-p])for(const source of s.players[controller].battle){
   if(!card(source).g947StartDrawMana||!api.isCreature(s,source)||!effective(source,s).g947StartDrawMana)continue;
   for(let i=0;i<count;i++)send(s,controller,source,'Select',{p,controller,origin:'hand',to:'mana',n:1,optional:true,
    title:'マナゾーンに置く自分の手札を1枚選ぶ（任意）'});
  }
 },
 turnStart(s,p,tappedBefore){if(s.extLimits){s.extLimits=s.extLimits.filter(l=>!(l.kind==='g546Force'&&l.when==='nextOpponent'&&l.activeTurn!==undefined&&l.activeTurn!==s.turn));for(const l of s.extLimits)if(l.kind==='g546Force'&&l.when==='nextOpponent'&&p===1-l.controller&&s.turn>l.turn)l.activeTurn=s.turn;}const delayed537=collect537(s,'nextOwnStart',p),generic=[p,1-p].flatMap(controller=>s.players[controller].battle.filter(x=>!x.sealed&&(api.isCreature(s,x)||card(x).type==='aura'||card(x).type==='field'&&(card(x).dragheart||effective(x,s).g1651BounceStopRace||effective(x,s).g1669D2Start)||effective(x,s).g461TurnPlayer)).flatMap(x=>{const c=effective(x,s),defs=c[controller===p?'g174Start':'g179OpponentStart'];if(defs?.[0]?.op==='PsychicLink1355'&&!psychicLinkChoices1358(s,controller,x,defs[0]).length)return [];if(c.g754StartTapped&&!(controller===p?tappedBefore?.has(x.uid):x.tapped))return [];const abilities=[...(defs?[{defs}]:[]),...(controller===p?c.g1730OwnStartAbilities||[]:[])];
 return abilities.map(({defs,label})=>({player:controller,uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',...(label?{label}:{}),task:task('g34_Sequence',controller,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,defs})}));}));const grave=s.players[p].grave.flatMap(x=>{
  const c=card(x),colors=c.g754GraveStartColors;
  if(x.faceDown)return [];
  if(c.g1628GraveStartShield){
   return [{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',
    task:task('g34_ShieldGrave',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,
     optional:true,then:[{op:'SelfGraveRevive644',serial:x.zoneSerial||0}]})}];
  }
  if(c.g1200GraveStartSacrifice){
   const serial=x.zoneSerial||0;
   return [{uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_SacrificeAlly413',p,x.cardId,{
    uid:x.uid,incarnation:x.incarnation||0,serial,g1200GraveStart:true,...(c.g1200GraveStartSacrifice>1?{n:c.g1200GraveStartSacrifice}:{}),
    defs:[{op:'SelfGraveRevive644',serial}]
   })}];
  }
  if(!colors)return [];
  return [{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g34_GraveReturn754',p,x.cardId,{
   uid:x.uid,incarnation:x.incarnation||0,serial:x.zoneSerial||0,colors
  })}];
 });
 const mana=s.players[p].mana.flatMap(x=>!x.faceDown&&card(x).g1131ManaStart?[{
  uid:x.uid,source:x.cardId,effect:'extended',
  task:task('g34_ManaStart1131',p,x.cardId,{uid:x.uid,serial:x.zoneSerial||0})
 }]:[]);
 const dokindam=s.players[p].battle.filter(x=>!x.sealed&&!x.g1175DSwitched&&card(x).g1276DokindamArea&&effective(x,s).g1276DokindamArea)
  .map(x=>({uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',
   task:task('g34_DokindamSwitch1276',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}));
 return [...delayed537,...generic,...grave,...mana,...dokindam,...active(s,p,'engels').filter(()=>!s.g7TerminalUsed?.[p]).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Custom',p,x.cardId,{name:'engelsTerminal',uid:x.uid,incarnation:x.incarnation||0})}))];},
 active,
 decoyProtected1256(s,owner,x){
  const own=s.players[owner];
  if(!own.battle.some(y=>card(y).g1256Decoy)||!api.isCreature(s,x))return false;
  if(battleNames676(s,x).includes('アクア特攻兵デコイ'))return false;
  // The restriction remains even if the selecting effect cannot choose the Decoy (QA 37289).
  return own.battle.some(y=>{
   if(y.sealed||y.faceDown||!card(y).g1256Decoy||!api.isCreature(s,y))return false;
   const rule=effective(y,s).g1256Decoy;
   return !!rule&&manaCondition267(s,owner,rule);
  });
 },
 decorate(s,p,x,c){if(!s||p<0||c.type!=='creature')return c;const d={},own=s.players[p];if(c.g756TurboRush==='unblockable'&&turboReady756(s,p,x))d.unblockable=true;for(const l of s.extLimits||[])if(l.kind==='g521Grant'&&l.active!==false&&(l.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource}))&&api.allLayers(x).some(y=>y.uid===l.ref.uid&&(y.incarnation||0)===l.ref.incarnation))Object.assign(d,l.grant);if(c.g225AttackRequires&&!attackConditionReading481.has(s)){let ready;attackConditionReading481.add(s);try{ready=attackCondition225(s,p,c.g225AttackRequires,x);}finally{attackConditionReading481.delete(s);}if(!ready)d.noAttack=true;}if(race(c,'コマンド')&&active(s,p,'scarlet').length)d.speedAttacker=true;if(ninja(c)&&active(s,p,'dororon').length)d.blocker=true;if(active(s,p,'fallenMantra').length)d.slayer=true;if(c.g899AttackSlayerMax!==undefined&&s.attack?.attacker===x.uid){
  // QA39683: blocking replaces the creature being attacked for this continuous ability.
  const target=s.players[1-p].battle.find(y=>y.uid===(s.attack.blockUid||s.attack.target));
  if(target&&!target.sealed&&api.isCreature(s,target)&&cost(effective(target,s))<=c.g899AttackSlayerMax){d.g208SlayerCount=(c.g208SlayerCount||Number(!!(c.slayer||d.slayer)))+1;d.slayer=true;}
 }if(angel(c)&&cost(c)<=8&&active(s,p,'sirius').length)Object.assign(d,{cannotBeAttacked:true,unblockable:true,spellUntargetable:true});if(c.g34Role==='emotional'&&own.battle.some(y=>y.uid!==x.uid&&race(card(y),'オラクル')&&!api.ignored(s,y)))d.untargetable=true;if(c.g34Role==='nightmare'&&x.tapped)d.opponentTapEntry=true;if((s.extLimits||[]).some(l=>l.kind==='g34ForceAttack'&&l.player===p)||active(s,0,'baromreizu').length||active(s,1,'baromreizu').length||forceAttack224(s,p)||forced546(s,p,x)||
  c.g845RequiredAttacks&&(s.g481Attackers?.turn!==s.turn||s.g481Attackers.events.filter(e=>e.refs.includes(key(x))).length<c.g845RequiredAttacks))d.mustAttack=true;if(c.g736AttackInstead&&hasForce546(s,p,x,true))d.g736ForcedAttack=true;let slayers=d.g208SlayerCount??(c.g208SlayerCount||Number(!!(c.slayer||d.slayer)));for(const g of x.g34Grants||[])if((g.turn===s.turn||g.g774Permanent)&&(g.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:g.spellCost,spellSource:g.spellSource}))){if(g.slayer)slayers++;const attackBonus=g.attackBonus?(d.attackBonus??c.attackBonus??0)+g.attackBonus:null;Object.assign(d,g);if(attackBonus!==null)d.attackBonus=attackBonus;if(g.g1702ExtraBreak)d.extraBreak=(d.extraBreak??c.extraBreak??0)+g.g1702ExtraBreak;}if(slayers>1)d.g208SlayerCount=slayers;
 // A granted J-change is an additional triggered ability, retaining printed and copied changes.
 const changes1646=(x.g34Grants||[]).filter(g=>(g.turn===s.turn||g.g774Permanent)&&
  (g.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:g.spellCost,spellSource:g.spellSource})))
  .flatMap(g=>g.g1646JChange?[{mana:g.g1646JChange}]:[]);
 if(changes1646.length)d.g393CChangeCopies=[...(d.g393CChangeCopies||c.g393CChangeCopies||[]),...changes1646];
 const boosts=(x.g34Grants||[]).filter(g=>g.turn===s.turn&&g.g313Breaker&&
  (g.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:g.spellCost,spellSource:g.spellSource})));if(boosts.length){const counts=[c.breaker,d.breaker,...boosts.map(g=>g.g313Breaker)].filter(Boolean);d.breaker=counts.includes('∞')?'∞':Math.max(...counts);}return Object.keys(d).length?{...c,...d}:c;},
 spellManaFinish1647(s,t,f){
  if(f.virtual&&!f.shieldCast||f.g1647ManaDecided||f.g1647EarlyMoved||f.spell?.g44ManaSpell&&f.spell?.summonOrigin==='mana'||
   f.spell?.summonOrigin==='hand'&&!api.canHandMana(s,f.caster)||
   !creatures(s,f.caster).some(x=>!x.sealed&&!x.faceDown&&effective(x,s).g1647SpellMana))return false;
  choice(s,task('g34_SpellManaFinish1647',f.caster,f.spell.id,{uid:f.inst.uid,resume:t}),
   'ブロッケン・ヴォーン：唱え終えた呪文をマナゾーンに置く？',[
    opt('マナゾーンに置く',true,15,f.inst.cardId),opt('元の移動先に置く',null,0,f.inst.cardId)]);
  return true;
 },
 selectGrantedBreaker633(s,p,x){
  if(s.attack.g633Breaker!==undefined||!s.players[1-p].shields.length)return false;
  const c=effective(x,s),counts=c.g633BreakerChoices;
  if(!counts||counts.length<2)return false;
  const shields=s.players[1-p].shields.length;
  choice(s,task('g34_GrantedBreaker633',p,x.cardId,{uid:x.uid}),'この攻撃で使うブレイカーを選ぶ',
   counts.map(n=>opt(n==='world'?(c.g1135DragonWorld?'ドラゴン・ワールド・ブレイカー':'ワールド・ブレイカー'):n==='g'?'G・ブレイカー（攻撃の後、自分も全ブレイク）':
    n===2?'W・ブレイカー':n==='∞'?(c.worldBreaker&&!c.g1816InfinityBreaker?'ワールド・ブレイカー':'∞ ブレイカー'):n+'枚をブレイクする',
    n,n==='g'?shields-1:Math.min(n==='∞'||n==='world'?Infinity:n,shields))));
  return true;
 },
 noUntap(s,x){
  const p=s.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid));
  if(p<0||!api.isCreature(s,x))return false;
  if(s.extLimits?.some(l=>l.kind==='g1116CreatureUntapLock'&&api.allLayers(x).some(y=>key(y)===l.ref)&&
   !api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource})))return true;
  // This resolved duration ends only when that exact D2 field leaves the battlefield.
  if(s.extLimits?.some(l=>l.kind==='g1671NirvanaLock'&&api.allLayers(x).some(y=>key(y)===key(l.ref))&&
   s.players.some(owner=>owner.battle.some(host=>key(host)===l.host&&card(host).d2Field))))return true;
  if(s.extLimits?.some(l=>l.kind==='g1198CreatureUntapLock'&&api.allLayers(x).some(y=>key(y)===l.ref)&&
   s.players.some(owner=>owner.battle.some(host=>key(host)===l.host&&!host.sealed&&!host.faceDown&&(!l.g1580HostTapped||host.tapped)&&
    card(host).g34Tasks?.some(d=>d.g1198UntapLock)&&!api.ignored(s,host)&&api.isCreature(s,host)))))return true;
  const c=effective(x,s);
  return c.g1561UntapRequires&&!ownCondition(s,p,c.g1561UntapRequires,x.uid,x.incarnation||0)||s.players[p].grave.length<(c.g1016UntapMinGrave??0)||
   !mecha(c)&&(active(s,0,'shinGod').length||active(s,1,'shinGod').length)>0;
 },
 countDiscount212(s,p,c){if(c.g212CountDiscount?.minimum===2)return 0;const max=countDiscountMax499(s,p,c);return c.g212CountDiscount?.optional&&c.g499Reduction!==undefined?Math.min(max,Math.max(0,c.g499Reduction)):max;},
 summonAuraDiscount290(s,p,c){
  const r=summonAuras560(s,p,c),selected=c.g560Amount===undefined?r.optional:Math.min(r.optional,Math.max(0,c.g560Amount));
  return {amount:r.mandatory+selected,zeroAmount:r.zeroMandatory+Math.min(selected,r.zeroOptional)};
 },
 variants456(s,p,actions){if(!s.extLimits?.some(r=>r.kind==='g456NextReduction'&&r.player===p&&r.turn===s.turn)||creatures(s,1-p).some(y=>effective(y,s).noCostReduction))return actions;const out=[...actions];for(const a of actions){if(a.kind!=='play'||a.freeSummon||a.freeSpell||a.alternative&&a.alternative!=='vividDraw1335'||a.g456Reduction!==undefined)continue;const face=faces(card(a.cardId))[a.face||0],c=a.alternative==='vividDraw1335'?{...face,cost:face.g1335VividDraw,printedCost:face.cost}:face,r=reductionRange456(s,p,c);for(let n=r.min;n<r.max;n++){const payment={...c,summonOrigin:a.origin||'hand',g456Reduction:n,...(a.g7Payment?{g7Payment:a.g7Payment}:{}),...(a.snowReducers?{snowReducers:a.snowReducers}:{}),...(a.magicReducers?{magicReducers:a.magicReducers}:{}),...(a.g18Reducers!==undefined?{g18Reducers:a.g18Reducers}:{}),...(a.g26Reducers?{g26Reducers:a.g26Reducers}:{}),...(a.g42Reduction!==undefined?{g42Reduction:a.g42Reduction}:{})};if(api.canPay(s,p,payment))out.push({...a,g456Reduction:n,requiresMethod:true,cost:api.summonCost(s,p,payment),label:a.alternative?a.label+'（次回の軽減'+n+'）':c.name+'を次回の軽減'+n+'で使う'});}}return out;},
 variants463(s,p,actions){if(!creatures(s,p).some(y=>!y.sealed&&effective(y,s).g463FirstSummon)||creatures(s,1-p).some(y=>effective(y,s).noCostReduction))return actions;const out=[...actions];for(const a of actions){if(a.kind!=='play'||a.freeSummon||a.freeSpell||a.alternative&&a.alternative!=='vividDraw1335'||a.g463Reduction!==undefined)continue;const face=faces(card(a.cardId))[a.face||0],c=a.alternative==='vividDraw1335'?{...face,cost:face.g1335VividDraw,printedCost:face.cost}:face,max=firstSummonMax463(s,p,c);for(let n=firstSummonMax463(s,p,c,true);n<max;n++){const payment={...c,summonOrigin:a.origin||'hand',g463Reduction:n,...Object.fromEntries(['g7Payment','snowReducers','magicReducers','g18Reducers','g26Reducers','g42Reduction','g456Reduction'].filter(k=>a[k]!==undefined).map(k=>[k,a[k]]))};if(api.canPay(s,p,payment))out.push({...a,g463Reduction:n,requiresMethod:true,cost:api.summonCost(s,p,payment),label:a.alternative?a.label+'（最初の召喚の軽減'+n+'）':c.name+'を最初の召喚の軽減'+n+'で使う'});}}return out;},
 useDiscount468(s,p,c,zeroOnly=false){
  if(c.crossing)return 0;
  const printedCost=cost({...c,cost:c.printedCost??c.cost});
  let discount=!zeroOnly&&race(c,'マジック')&&magicTerminal1292(s,p)?4:0;
  for(const source of creatures(s,p)){
   if(source.sealed)continue;
   const rule=effective(source,s).g468UseReduction;
   if(!rule||zeroOnly&&!rule.g756ZeroFloor||rule.min!==undefined&&printedCost<rule.min)continue;
   if(rule.g756Colorless&&colors(c).length)continue;
   if(rule.g1282Tamaseed&&c.type!=='seed'&&!c.seedCreature&&!c.natureAce4)continue;
   if(rule.g896LaterSameKind&&!(c.type==='creature'?s.g463Summons?.[p]?.turn===s.turn&&s.g463Summons[p].n>0:c.type==='spell'&&(s.players[p].spellsThisTurn||0)>0))continue;
   if(rule.race&&!race(c,rule.race))continue;
   if(rule.colorsAny&&!rule.colorsAny.some(color=>colors(c).includes(color)))continue;
   if(rule.nameIncludes&&!exactName(creatureFaceName(c)).includes(rule.nameIncludes))continue;
   discount+=rule.amount;
   if(rule.faceUpShieldBonus&&ownCondition(s,p,{g757FaceUpShield:true}))discount+=rule.faceUpShieldBonus;
  }
  return discount;
 },
 untapDiscount472:(s,p,c)=>c.type==='creature'&&!c.crossing&&s.g472Untapped?.turn===s.turn?(c.g472UntapReduction||0)*s.g472Untapped.groups.length:0,
 discarded472(s,p){
  // This hook runs only for physical hand cards actually discarded after replacements.
  const n=discardCount1235(s,p);
  (s.g1235Discards??=[null,null])[p]={turn:s.turn,n:n+1};
  for(const x of creatures(s,p)){const defs=!x.sealed&&effective(x,s).g1500SelfDiscard;if(defs)queue(s,p,x,defs);}
  for(const x of creatures(s,1-p)){const defs=!x.sealed&&effective(x,s).g472OpponentDiscard;if(defs)queue(s,1-p,x,defs);}},
 firstOpponentDiscard1037(s,p){
  for(const x of creatures(s,1-p)){
   if(x.sealed||!card(x).g1037FirstOpponentDiscard)continue;
   const defs=effective(x,s).g1037FirstOpponentDiscard;
   if(defs)queue(s,1-p,x,defs);
  }
 },
 firstSummonDiscount463,onceDiscount464,
 consumeExecution464:(s,p,c)=>consumeOnce464(s,p,c,true),
 offerExecution464(s,p,c,after,view=s){
  if(c.g464Reducers!==undefined||!onceProviders464(view,p,c).some(x=>effective(x,s).g464OnceSummon.execution))return false;
  if(api.summonCost(view,p,c)===api.summonCost(view,p,{...c,g464Reducers:[]}))return false;
  put(s,task('g34_PayOnce464',p,c.id,{c,after,selected:[]}));
  return true;
 },
 spellDiscount467(s,p,c){
  if(c.type==='aura')return spellReduction485(s,p,c);
  if(c.type!=='spell')return 0;
  return creatures(s,p).filter(x=>!x.sealed).reduce((n,x)=>{
   const reduction=effective(x,s).g467SpellReduction;
   if(reduction?.g1783BattleCards)return n+s.players[p].battle.filter(y=>!y.sealed&&!y.faceDown&&matches(s,p,y,reduction.g1783BattleCards)).length*reduction.amount;
   return n+(typeof reduction==='number'?reduction:reduction&&colors(c).includes(reduction.color)?reduction.amount:0);
  },spellReduction485(s,p,c));
 },
 selectNullBreaker471(s,p,x){const c=effective(x,s);if(!c.g471NullBreaker||s.attack.g471Breaker||!s.players[1-p].shields.length||!c.gBreaker&&c.breaker!=='∞'&&!(c.breaker>0))return false;const n=(c.extraBreak||0)+(s.attack.g1076ExtraBreaks||0);choice(s,task('g34_NullBreaker471',p,x.cardId,{uid:x.uid}), 'この攻撃で使うブレイカーを選ぶ',[opt('ヌル・ブレイカー（'+n+'枚ブレイク）','null',0),opt('ほかのブレイカーを使う','normal',20)]);return true;},
 beginPayment560(s,p,c,args){
  const alternative=args[4];
  if(args[1]||alternative?.fixedPayment||alternative?.g560Handled)return false;
  const payment={...c,...(alternative===null?{}:typeof alternative==='object'?alternative:{cost:alternative}),printedCost:c.cost};
  if(!summonAuras560(s,p,payment).optional||creatures(s,1-p).some(x=>effective(x,s).noCostReduction))return false;
  put(s,task('g34_PayAura560',p,c.id,{c:payment,args}));
  return true;
 },
 beginPayment500(s,p,c,args){if(args[1]||args[4]?.fixedPayment||args[4]?.g500Handled||!floorOptions500(s,p,c)[0]||creatures(s,1-p).some(x=>effective(x,s).noCostReduction))return false;const payment={...c,...(args[4]===null?{}:typeof args[4]==='object'?args[4]:{cost:args[4]}),printedCost:c.cost};put(s,task('g34_PayFloor500',p,c.id,{c:payment,args}));return true;},
 floorCost500(s,p,c,base){if(c.type!=='creature'||c.crossing)return base;const minimum=c.g211Sympathy?.minimum;if(minimum>=3)base=Math.min(base,Math.max(minimum,base-sympathyAmount500(s,p,c)));const amounts=floorOptions500(s,p,c),aura=c.g500Amount===undefined?amounts[0]:amounts.includes(c.g500Amount)?c.g500Amount:0,n=aura+(c.g212CountDiscount?.minimum===2?countDiscountMax499(s,p,c):0)+(c.g211Sympathy?.minimum===2?sympathyAmount500(s,p,c):0);return n?Math.min(base,Math.max(2,base-n)):base;},
 beginPayment499(s,p,c,args){if(args[1]||args[4]?.fixedPayment||args[4]?.g499Handled||c.type!=='creature'&&!c.g1537OptionalSpellDiscount||!c.g212CountDiscount?.optional||!countDiscountMax499(s,p,c)||creatures(s,1-p).some(x=>effective(x,s).noCostReduction))return false;const payment={...c,...(args[4]===null?{}:typeof args[4]==='object'?args[4]:{cost:args[4]}),printedCost:c.cost};put(s,task('g34_PayCount499',p,c.id,{c:payment,args}));return true;},
 beginOverdrive1439(s,p,c,args){if(args[1]||args[4]?.g1439Handled||!c.g1439ODrive)return false;put(s,task('g34_ODrive1439',p,c.id,{c,args}));return true;},
 beginPayment485(s,p,c,args){if(args[1]||args[4]?.fixedPayment||args[4]?.g485Handled||!spellReductionMax485(s,p,c)||creatures(s,1-p).some(x=>effective(x,s).noCostReduction))return false;const payment={...c,...(args[4]===null?{}:typeof args[4]==='object'?args[4]:{cost:args[4]}),printedCost:c.cost};put(s,task('g34_PaySpell485',p,c.id,{c:payment,args}));return true;},
 beginPayment470(s,p,c,args){if(args[1]||args[4]?.fixedPayment||args[4]?.g470Handled||!c.g470RevealReduction||!revealCards470(s,p,c).length)return false;put(s,task('g34_RevealPayment470',p,c.id,{c,args,revealed:null}));return true;},
 revealDiscount470(s,p,c){if(c.type!=='creature'||c.crossing||!c.g470RevealReduction)return 0;const rows=revealCards470(s,p,c);return c.g470Handled?rows.some(x=>x.uid===c.g470Revealed)?Math.max(0,Math.min(c.g470RevealReduction.amount,c.g470Amount||0)):0:rows.length?c.g470RevealReduction.amount:0;},
 revealCommitted470(s,p,c,payment){if(payment?.g470Revealed){const x=s.players[p].hand.find(x=>x.uid===payment.g470Revealed);if(x)api.log(s,p,'reveal',c.name+'の召喚のため手札を公開：'+card(x).name,{cardId:x.cardId,source:c.id});}},
 beginPayment464(s,p,c,args){
  if(args[1]||args[4]?.fixedPayment||c.g464Reducers!==undefined)return false;
  const payment={...c,...(args[4]===null?{}:typeof args[4]==='object'?args[4]:{cost:args[4]}),printedCost:c.cost};
  const rows=onceProviders464(s,p,payment);
  if(!rows.length)return false;
  if(rows.every(x=>effective(x,s).g464OnceSummon.execution)&&
   api.summonCost(s,p,payment)===api.summonCost(s,p,{...payment,g464Reducers:[]}))return false;
  put(s,task('g34_PayOnce464',p,c.id,{c:payment,args,selected:[]}));
  return true;
 },
 conditionalDiscount261(s,p,c){return c.g261Discount&&ownCondition(s,p,c.g261Discount.filter)?c.g261Discount.amount:0;},
 sympathyDiscount211:(s,p,c)=>c.g211Sympathy?.minimum>=2?0:sympathyAmount500(s,p,c),
 discount(s,p,c){const next=nextReduction456(s,p,c);return {...next,amount:next.amount+(c.g34Role==='shinGod'?s.players[p].battle.filter(x=>!x.sealed&&mecha(effective(x,s))).length:0)+(c.type==='creature'&&colors(c).includes('自然')&&Number(c.power)>=12000?(s.g34Discounts||[]).filter(x=>x.p===p&&x.turn===s.turn).reduce((n,x)=>n+x.amount,0):0)};},
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
  if(c.type==='creature'&&race(c,'ゼニス')&&s.players.some(own=>own.battle.some(x=>!x.sealed&&api.isCreature(s,x)&&effective(x,s).g1535ZenithSummonLock)))return false;
  if(c.type==='spell'&&(s.extLimits||[]).some(l=>l.kind==='g1372ExactSpellLock'&&l.player===p&&cost(c)===(l.cost==='∞'?Infinity:l.cost)))return false;
  if(c.type==='field'&&c.d2Field&&d2Locked1188(s,p))return false;
  const opponent=s.players[1-p];
  const handSize=opponent.hand?.length??opponent.handCount??0;
  if(c.type==='spell'&&cost(c)<opponent.mana.filter(x=>x.faceDown).length&&opponent.battle.some(x=>!x.sealed&&!x.faceDown&&api.isCreature(s,x)&&effective(x,s).g1698FlySpellLock))return false;
  if(c.type==='spell'&&cost(c)<handSize&&opponent.battle.some(x=>
   card(x).g1307HandSpellLock&&!x.sealed&&!x.faceDown&&api.isCreature(s,x)&&!api.ignored(s,x)))return false;
  if(c.type==='spell'&&s.players[1-p].battle.some(x=>{
   const requiredRace=!x.sealed&&card(x).g982SpellLockUnlessRace&&effective(x,s).g982SpellLockUnlessRace;
   return requiredRace&&api.isCreature(s,x)&&!creatures(s,p).some(y=>
    !y.sealed&&!y.faceDown&&race(effective(y,s),requiredRace));
  }))return false;
  if(c.type==='field'&&creatures(s,1-p).some(x=>!x.sealed&&effective(x,s).g685OpponentFieldLock))return false;
  if(c.type==='spell'&&s.players.some(owner=>owner.battle.some(x=>x.tapped&&!x.sealed&&
   card(x).g924TappedSpellLock&&effective(x,s).g924TappedSpellLock)))return false;
  if((c.type==='spell'||c.type==='creature')&&(s.extLimits||[]).some(l=>l.kind==='g589SpellLock'&&l.player===p&&
   (c.type==='spell'||l.g937Summon)&&
   (!l.nextOnly||s.active===p&&s.players[p].turns>l.afterTurns)&&(!l.color||colors(c).includes(l.color))))return false;
  if(c.type==='spell'&&!colors(c).includes('光')&&(active(s,0,'alca').length||active(s,1,'alca').length))return false;if(c.type==='creature'||c.type==='spell'){if(active(s,1-p,'perfect').length&&s.g34Executions?.[p]?.turn===s.turn&&s.g34Executions[p].n>=3)return false;if(!colors(c).includes('光')&&(active(s,0,'alphadios').length||active(s,1,'alphadios').length))return false;}return c.type!=='spell'||!active(s,1-p,'hAlka').some(x=>x.hyperActive&&creatures(s,1-p).some(y=>y.tapped));},
 allowedEntry(s,p,c,options){if(['creature','seed','gear','field','aura','weapon','duelist'].includes(c.type)&&options.origin!=='hand'&&options.origin!=='battle'&&[0,1].some(q=>s.players[q].battle.some(x=>!x.sealed&&!x.faceDown&&elementEntrySourceEstablished(s,x)&&effective(x,s).g1821ElementHandOnly)))return false;if(c.type==='creature'&&(s.players[p].enteredThisTurn||0)>=2&&creatures(s,1-p).some(x=>!x.sealed&&effective(x,s).g320Next))return false;if(c.g298NoHandSummon&&options.execution&&options.origin==='hand')return false;if(c.type==='creature'&&s.active===1-p&&colors(c).length===1&&active(s,1-p,'superRoma').length)return false;return !options.execution||c.type!=='creature'||colors(c).includes('光')||!(active(s,0,'alphadios').length||active(s,1,'alphadios').length);},
 battleNames1664:battleNames676,
 namedEntryLocked1643:(s,p,c)=>namedLock1643(s,p,[exactName(creatureFaceName(c))]),
 giantForcedBlock1825(s,p,a){return !!a&&!a.sealed&&creatures(s,p).some(x=>!x.sealed&&!x.faceDown&&card(x).g1825MustBlockRace&&!api.ignored(s,x)&&race(effective(a,s,true),card(x).g1825MustBlockRace));},
 namedCombatLocked1643:(s,p,x)=>creatures(s,1-p).some(y=>!y.sealed&&!y.faceDown&&y.tapped&&card(y).g1822TappedCombatLock&&!api.ignored(s,y))||!!card(x).psychic&&creatures(s,1-p).some(y=>!y.sealed&&!y.faceDown&&effective(y,s).g1734PsychicCombatLock)||namedLock1643(s,p,battleNames676(s,x)),
 canLeave(s,p,x,context={}){
  const c=effective(x,s);
  if(c.g1780ExceptBattleLoss&&!context.battleLoss)return false;
  if(context.to==='hand'&&!x.sealed&&api.isCreature(s,x)&&s.players[p].battle.some(y=>!y.sealed&&!y.faceDown&&effective(y,s).g1651BounceStopRace&&race(c,effective(y,s).g1651BounceStopRace)))return false;
  if(!x.sealed&&api.isCreature(s,x)&&nextOpponentStay1643(s,p))return false;
  if(c.g1304ShieldForceActive&&!context.skip577Stay&&!context.replacement)return false;
  if((s.extLimits||[]).some(l=>l.kind==='g1087ElementsStay'&&l.player===p)&&!x.sealed)return false;
  if(context.destroy===false&&(c.g1324NonDestructionStay||s.active===p&&c.g1224OwnNonDestructionStay))return false;
  if(context.destroy===false&&api.isCreature(s,x)&&s.players[p].battle.some(y=>{
   const source=card(y);
   const protects=source.g1087RaceStay&&race(c,source.g1087RaceStay)||
    source.g1150OtherNonDestructionStay&&y.uid!==x.uid;
   return protects&&!api.ignored(s,y)&&api.isCreature(s,y);
  }))return false;
  if(c.g34Role==='engels'&&s.g34ShieldLeftTurn!==s.turn)return false;
  if(c.g34Role==='perfect'&&api.power(x,false,s)>0)return false;
  if(c.g619Stay&&ownCondition(s,p,c.g619Stay,x.uid,x.incarnation||0))return false;
  if(c.g1135CrossedStay&&crossedCount728(s,x)>=c.g1135CrossedStay)return false;
  if(!x.sealed&&c.neoEvolution&&api.isEvolution(x)&&api.allLayers(x).length>=3&&
   s.players[p].battle.some(y=>!y.sealed&&card(y).g1132NeoStay&&effective(y,s).g1132NeoStay)&&
   (context.battlePower??currentPower506(s,x))>0)return false;
  if((s.extLimits||[]).some(l=>l.kind==='g627Stay'&&(!l.destroyOnly||context.destroy!==false)&&!spellGrantIgnored(s,l)&&api.allLayers(x).some(y=>y.uid===l.ref.uid&&(y.incarnation||0)===l.ref.incarnation)))return false;
  return context.skip577Stay||!(c.g577Stay&&stay577(s,p,x,context.battlePower)||allyStay1246(s,p,x,context.battlePower));
 },
 stay577,allyStay1246,
 zeroSafe:(s,x)=>!!effective(x,s).g34AlwaysWinAtZero&&api.power(x,false,s)<=0,
 // The permission comes from the allied Dragon, even if the attacker is ignored (QA39131).
 dragonAttackUntapped967:(s,p,x,c)=>race(c,'ドラゴン')&&s.players[p].battle.some(source=>
  source.uid!==x.uid&&card(source).g967DragonAttackUntapped&&!api.ignored(s,source)&&api.isCreature(s,source)),
 allyAttackUntapped1195:(s,p)=>creatures(s,p).some(source=>!source.sealed&&!source.faceDown&&
  card(source).g1195AllyAttackUntapped&&!api.ignored(s,source)),
 attackTargets971(s,p,attacker){
  const limits=(s.extLimits||[]).filter(l=>l.kind==='g971AttackTarget'&&l.player===p&&l.turn===s.turn);
  if(!limits.length)return [];
  const refs=api.allLayers(attacker).map(key);
  // Check current attackers so the permission also covers creatures that enter later.
  return s.players[1-p].battle.filter(x=>!x.sealed&&api.isCreature(s,x)&&limits.some(l=>
   !refs.includes(l.except)&&api.allLayers(x).some(y=>l.refs.includes(key(y))))).map(x=>x.uid);
 },
 attackableUntapped:(s,x,attacker)=>attacker.g926AttackCrossed&&crossedCount728(s,x)>0||
  s.players.some(owner=>owner.battle.some(y=>!y.sealed&&card(y).g925MulticolorAttackable&&
  effective(y,s).g925MulticolorAttackable))&&colors(effective(x,s)).length>1||
  (s.extLimits||[]).some(l=>l.kind==='g924AttackableUntapped'&&l.turn===s.turn&&
  api.allLayers(x).some(y=>l.refs.includes(key(y)))&&(l.spell===false||!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource}))),
 // Resolved continuous effects are independent of the recipient's ignored abilities (QA34228).
 attackEffect409:(s,x,kind)=>(s.extLimits||[]).some(l=>l.kind==='g409AttackEffect'&&l.effect===kind&&s.players[l.player].battle.includes(x)&&api.allLayers(x).some(y=>y.uid===l.ref.uid&&(y.incarnation||0)===l.ref.incarnation)),
 destroySafe409:(s,x)=>!x.sealed&&!!effective(x,s).g1691OniOwnDestroySafe&&s.players[s.active].battle.includes(x)&&api.oniTime1303(s,s.active)||bouncerProtects1294(s,x)||blockProtected1201(s,x)||!!effective(x,s).g465DestroySafe||api.isCreature(s,x)&&!!externalProtection565(s,x).g465DestroySafe||hooks.attackEffect409(s,x,'destroySafe'),
 extraBreak557:(s,p,x,c)=>[...s.players[p].battle,...s.players[1-p].battle.filter(y=>card(y).g557BreakAura?.both)].reduce((n,y)=>{
  const r=card(y).g557BreakAura;
  if(!r||y.sealed||r.other&&x.uid===y.uid||r.min!==undefined&&cost(c)<r.min||!api.isCreature(s,y)||api.ignored(s,y))return n;
  if(r.tapped&&!y.tapped||r.shieldsMax!==undefined&&!ownCondition(s,p,{g265ShieldsMax:r.shieldsMax}))return n;
  if(r.multi&&colors(c).length<=1||r.race&&!race(c,r.race))return n;
  // A printed Soul icon remains even when the creature's abilities are ignored.
  if(r.soul&&!hasSoul(c,r.soul)&&!hasSoul(card(x),r.soul))return n;
  return n+(r.g1470BattleCount?creatures(s,p).filter(y=>!y.sealed&&matches(s,p,y,r.g1470BattleCount)).length:r.amount);
 },c.g876BreakPerCount?countPower(s,x,c,false,{...c.g207CountPower,attackOnly:false,amount:1}):0),
 countBattleCivilizations,
 manaCivilizationCount,
 extraBreak412:(s,p,x)=>(s.extLimits||[]).filter(l=>l.kind==='g412ExtraBreak'&&(l.g969FollowControl||l.player===p)&&(l.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.source}))&&api.allLayers(x).some(y=>y.uid===l.ref.uid&&(y.incarnation||0)===l.ref.incarnation)).reduce((n,l)=>n+l.amount,0),
 winBattle(s,x){
  const c=effective(x,s);
  return !!c.g34AlwaysWin||!!c.g587AttackWins&&attacking587(s,x)||!!c.g587UntappedWins&&!x.tapped||
   hooks.attackEffect409(s,x,'win')||hooks.zeroSafe(s,x)||battleAuras466(s,x).some(r=>r.win);
 },
 battlePower446:(s,x)=>(s?.extLimits||[]).filter(l=>l.kind==='g446BattlePower'&&
  (l.player===undefined||s.players[l.player].battle.includes(x))&&
  (l.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource}))&&
  api.allLayers(x).some(y=>y.uid===l.ref.uid&&(y.incarnation||0)===l.ref.incarnation)).reduce((n,l)=>n+l.amount,0),
 battlePower209,
 battleSafe:battleSafe466,
 battleAuraPower466(s,x,c){
  const counted=s&&c.g860BattleCountPower?countPower(s,x,c,false,c.g860BattleCountPower):0;
  return battleAuras466(s,x).reduce((n,r)=>n+(r.power||0),counted);
 },
 // This replacement belongs to its source, so an ignored recipient is still protected.
 deathMana575(s,p,target){
  const moves={untapped:api.isCreature(s,target)&&(s.extLimits||[]).some(l=>l.kind==='g1631LifeCharger'&&l.player===p&&!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource}))&&!api.manaMoveForbidden(s,p),tapped:false,optional:false};
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
 graveToHand1657(s,p,x){
  return !x.sealed&&!x.faceDown&&api.isCreature(s,x)&&(s.extLimits||[]).some(l=>
   l.kind==='g1657RaceGraveHand'&&l.player===p&&matches(s,p,x,l.filter));
 },
 destroyToHand390(s,p,x){
  if(x.sealed||x.faceDown)return false;
  let found=false;
  for(const y of creatures(s,p)){
   const rule=!y.sealed&&!y.faceDown&&effective(y,s).g390DestroyToHand;
   if(!rule||rule.condition&&!ownCondition(s,p,rule.condition))continue;
   if(!(rule.self&&y.uid===x.uid)&&(rule.onlySelf||!matches(s,p,x,rule.filter)))continue;
   if(rule.toOwner)return 'owner';
   found=true;
  }
  return found;
 },
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
   return filter&&(!filter.g1631Other||source.uid!==x.uid)&&matches(s,p,x,filter);
  });
 },
 noLose(s,p){
  return creatures(s,p).some(x=>x.tapped&&!x.sealed&&effective(x,s).g1468TappedNoLose)||hasBouncer1294(s,p)||(s.extLimits||[]).some(l=>l.kind==='g34NoLose'&&l.player===p)||
   active(s,p,'valhalla').some(()=>s.players[p].mana.filter(x=>api.manaColors(card(x),s,p).includes('光')).length>=9)||
   creatures(s,1-p).some(x=>!x.sealed&&effective(x,s).g995OpponentCannotLose);
 },
 stackLossSources1137(s,p){
  return creatures(s,p).filter(x=>{
   if(!api.isEvolution(x)||![x,...(x.godLinks||[])].some(y=>y.under?.length))return false;
   const c=effective(x,s);
   return c.g1137StackLoss||c.g404Inherited?.some(r=>r.grants.g1137StackLoss);
  });
 },
 lossOptions(s,p){return s.players[p].mana.length>=8?active(s,p,'minogami').map(x=>opt(card(x).name+'：マナ8枚を山札の下に置く',{kind:'g34Mino',uid:x.uid},60,x.cardId)):[];},
 beginLoss(s,p,uid){const x=s.players[p].battle.find(x=>x.uid===uid);if(x)minoLoss(s,{op:'g34_Custom',name:'minoLoss',p,source:x.cardId,uid,selected:[]});},
 muku(s,p,x){return ninja(effective(x,s))?active(s,p,'mukujimmed').filter(y=>!used(s,'g34Muku',y)).map(y=>({uid:y.uid,key:key(y),cardId:y.cardId})):[];},
 useMuku(s,p,k){(s.g34Muku??={})[k]=s.turn;},
 destroyStay1193:(s,p)=>(s.extLimits||[]).some(l=>l.kind==='g1193DestroyStay'&&l.player===p&&
  !api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource})),
 shieldTrigger(s,p,x,c){
  if(s.players[p].battle.some(y=>{if(y.sealed||y.faceDown||s.g20LeavingUids?.includes(y.uid)||!api.isCreature(s,y))return false;const r=effective(y,s).g1557ShieldTrigger;return !!r&&(!r.condition||ownCondition(s,p,r.condition,y.uid))&&(!r.creature||c.type==='creature')&&(!r.blocker||c.blocker)&&(!r.civs||r.civs.some(color=>colors(c).includes(color)))&&(!r.nameIncludes||String(c.name).includes(r.nameIncludes))&&(!r.race||race(c,r.race))&&(r.max===undefined||cost(c)<=r.max);}))return true;
  if(colors(c).includes('光')&&(s.extLimits||[]).some(l=>l.kind==='g1538LightShieldTriggers'&&l.player===p&&!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource})))return true;
  if(c.type==='creature'&&colors(c).includes('光')&&s.players[p].battle.some(y=>{
   if(y.sealed||y.faceDown||!card(y).g1266LightCreatureShieldTrigger||s.g20LeavingUids?.includes(y.uid))return false;
   const max=effective(y,s).g1266LightCreatureShieldTrigger;
   return max!==undefined&&cost(c)<=max;
  }))return true;
  if((s.extLimits||[]).some(l=>l.kind==='g1193ShieldTrigger'&&l.player===p&&
   l.refs.some(r=>r.uid===x.uid&&r.serial===(x.zoneSerial||0))&&
   !api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource})))return true;
  if(race(c,'ドラゴン')&&s.players[p].battle.some(y=>!y.sealed&&card(y).g794DragonShieldTrigger&&cost(c)<=effective(y,s).g794DragonShieldTrigger))return true;if(c.type==='creature'&&mecha(c)&&cost(c)<=8&&active(s,p,'kuusoku').length)return true;const root=s.players[p].shields.find(r=>api.shieldCards(r).some(y=>y.uid===x.uid)),group=root&&api.shieldGroup(root);
  if(root&&c.g876ShieldTriggerCondition&&ownCondition(s,p,c.g876ShieldTriggerCondition))return true;
  if(root&&c.type==='creature'&&c.g433SeedTrigger&&s.players[p].battle.some(y=>!y.sealed&&matches(s,p,y,{g295Tamaseed:true})))return true;return active(s,p,'fourJustice').length>0&&s.players[p].battle.some(y=>api.layers(y).some(z=>(z.exLifeShieldUids||[z.exLifeShieldUid]).includes(group)));},
 // Mana entry is independent of casting or battlefield entry (QA39403/39404).
 manaAdded1653(s,p,cards,origins){const events=cards.flatMap((x,i)=>{const o=origins?.[i];return o?.zone&&!(o.zone==='mana'&&o.p===p)?[{...o,destination:p,cardOwner:x.cardOwner??o.p??p}]:[];});if(s.leaving&&s.g20LeavingUids)(s.leaving.g1653ManaArrivals??=[]).push(...events);else manaWatch1653(s,events);},
 flushMana1653(s,batch){manaWatch1653(s,batch.g1653ManaArrivals||[]);secondManaPenalty1654(s,batch.g1654ManaArrivals||[]);},
 manaAdded449(s,p,cards){
  if(s.g1205ManaPlacements?.turn!==s.turn)s.g1205ManaPlacements={turn:s.turn,counts:[0,0]};
  const counts=s.g1205ManaPlacements.counts,before=counts[p];
  counts[p]+=cards.length;
  const events1654=cards.map((_,i)=>({p,ordinal:before+i+1}));
  if(s.g20LeavingUids&&s.leaving)(s.leaving.g1654ManaArrivals??=[]).push(...events1654);else secondManaPenalty1654(s,events1654);
  if(before<2&&counts[p]>=2){
   // Zone-entry triggers see the board after the entire simultaneous move (2026-07-09 ruling).
   if(s.g20LeavingUids&&s.leaving){
    const seats=secondManaAdds1205.get(s.leaving)||[];
    seats.push(p);
    secondManaAdds1205.set(s.leaving,seats);
   }else triggerSecondMana1205(s,p);
  }
  const firstOwnPlacement=s.active===p&&s.g837ManaAddedTurn?.[p]!==s.turn;
  if(s.active===p)(s.g837ManaAddedTurn??=[null,null])[p]=s.turn;
  const firstMulti=s.g1160FirstMultiManaTurn?.[p]!==s.turn;
  const sources=creatures(s,p).flatMap(x=>{
   if(x.sealed)return [];
   const {g1632ManaEntryGrave:manaEntryGrave,g454Space:rules,g763MultiManaUntap:untap,g807ManaEntry:defs,g857ManaEntryRace:entryRace,
    g1160FirstMultiManaDraw:firstMultiDraw,g1162FirstManaRecycle:recycle,g1168ManaEntryMulti:entryMulti,
    g1182FirstMultiManaUntap:firstMultiUntap,g1520TwinMana:twinOnly,g1520TwinManaUntap:twinUntap,g1770ManaUntapRace:raceUntap}=effective(x,s);
   return manaEntryGrave||rules||untap||defs||firstMultiDraw||recycle||firstMultiUntap||twinUntap||raceUntap
    ?[{x,manaEntryGrave,rules:rules||[],untap,defs:s.g20LeavingUids?.includes(x.uid)&&twinOnly?undefined:defs,entryRace,firstMultiDraw,recycle,entryMulti,firstMultiUntap,twinOnly,twinUntap:!s.g20LeavingUids?.includes(x.uid)&&twinUntap,raceUntap:!s.g20LeavingUids?.includes(x.uid)&&raceUntap}]:[];
  });
  const crystalSources=s.players[p].battle.filter(x=>!x.sealed&&card(x).g1175CrystalField&&effective(x,s).g1175CrystalField);
  for(const x of cards){
   for(const field of crystalSources){
    const g792Once='crystalMana';
    if(!used792(s,field,{g792Once}))send(s,p,field,'CrystalManaDown1175',{g792Once,target:x.uid,serial:x.zoneSerial||0});
   }
   if(!x.faceDown&&api.zoneCard(s,p,x).g449ManaReveal)send(s,p,x,'ManaReveal449',{serial:x.zoneSerial||0});
   const manaCard=x.faceDown?{civilizations:[],civ:'ゼロ',manaValue:1}:api.zoneCard(s,p,x,'mana');
   const actual=api.manaColors(manaCard,s,p);
   if(manaCard.spellFace){const prior=s.leaving?.snapshot?.six?.selfLeaves?.find(y=>y.p===p&&y.uid===x.uid);if(prior?.g1520TwinMana&&prior.g807ManaEntry)queue(s,p,prior,prior.g807ManaEntry,prior.cardId,p);if(prior?.g1520TwinManaUntap)api.enqueue(s,p,{uid:prior.uid,incarnation:prior.incarnation,source:prior.cardId,effect:'extended',task:task('g159R_ManaUntap',p,prior.cardId,{target:x.uid,serial:x.zoneSerial||0})});}
   const priorRaceUntap=s.leaving?.snapshot?.six?.selfLeaves?.find(y=>y.p===p&&y.uid===x.uid&&y.g1770ManaUntapRace);
   if(priorRaceUntap&&faces(manaCard).some(c=>race(c,priorRaceUntap.g1770ManaUntapRace)))api.enqueue(s,p,{uid:priorRaceUntap.uid,incarnation:priorRaceUntap.incarnation,source:priorRaceUntap.cardId,effect:'extended',task:task('g159R_ManaUntap',p,priorRaceUntap.cardId,{target:x.uid,serial:x.zoneSerial||0})});

   // Each qualifying card in a simultaneous first placement triggers (QA48286).
   if(firstMulti&&actual.length>1)(s.g1160FirstMultiManaTurn??=[null,null])[p]=s.turn;
   for(const source of sources){
    if(source.raceUntap&&faces(manaCard).some(c=>race(c,source.raceUntap)))api.enqueue(s,p,{uid:source.x.uid,incarnation:source.x.incarnation||0,source:source.x.cardId,effect:'extended',task:task('g159R_ManaUntap',p,source.x.cardId,{target:x.uid,serial:x.zoneSerial||0})});
    if(source.manaEntryGrave)send(s,p,source.x,'ManaEntryGrave1632',{target:x.uid,serial:x.zoneSerial||0});
    if(source.twinUntap&&manaCard.spellFace)api.enqueue(s,p,{uid:source.x.uid,incarnation:source.x.incarnation||0,source:source.x.cardId,effect:'extended',task:task('g159R_ManaUntap',p,source.x.cardId,{target:x.uid,serial:x.zoneSerial||0})});
    if(firstMulti&&source.firstMultiDraw&&actual.length>1)
     send(s,p,source.x,'FirstMultiManaDraw1160',{target:x.uid,serial:x.zoneSerial||0});
    if(firstOwnPlacement&&source.recycle)send(s,p,source.x,'RecycleMana1162');
    if(source.defs&&(!source.twinOnly||!!manaCard.spellFace)&&(!source.entryMulti||actual.length>1)&&(!source.entryRace||faces(manaCard).some(c=>race(c,source.entryRace))))
     queue(s,p,source.x,source.defs);
    const rules=source.rules.filter(r=>(r.color==='多色'?actual.length>1:actual.includes(r.color))&&
     (!r.g792Once||!used792(s,source.x,r)));
    if(rules.length)send(s,p,source.x,'SpaceCharge454',{rules:structuredClone(rules)});
    if((source.untap||firstMulti&&source.firstMultiUntap)&&actual.length>1)api.enqueue(s,p,{uid:source.x.uid,incarnation:source.x.incarnation||0,
     source:source.x.cardId,effect:'extended',task:task('g159R_ManaUntap',p,source.x.cardId,{target:x.uid,serial:x.zoneSerial||0})});
   }
  }
 },
 alchemistSummoned1670(s,p){alchemistUse1670(s,p);},
 played(s,p,c,x,origin,permit){
  if(c.type==='spell'&&origin==='grave'&&typeof permit==='string'&&permit.startsWith('g1792:')){((s.g450ZoneUses??=[{},{}])[p]??={})[permit]=s.turn;x.finishTo='deck';}

  if(c.type!=='spell')terminalUse1292(s,p,c);
  const seed=c.type==='seed'||c.seedCreature||c.natureAce4;
  if(seed)qualifyingUse1224(s,p,c,x.uid,x.cardOwner??p);
  if(seed)for(const source of s.players[p].battle){
   const printed=card(source);
   if(source.sealed||source.uid===x.uid||!printed.g1177TamaseedUse||
    !printed.g204SpellWatch?.g1189Tamaseed&&!api.isCreature(s,source))continue;
   const defs=effective(source,s).g1177TamaseedUse;
   if(defs)queue(s,p,source,defs);
  }
  if(c.type==='creature'){
  firstSummonOrSpell1247(s,0);
  useBlockers524(s,p);
  for(const controller of[p,1-p])for(const source of s.players[controller].battle){
   const watch=card(source).g808SummonWatch&&!source.sealed&&api.isCreature(s,source)&&effective(source,s).g808SummonWatch;
   if(!watch||controller!==(watch.who==='opponent'?1-p:p)||!useColorsMatch(watch,c))continue;
   // The summon is observed before entry and before incrementing the shared turn counter.
   if(watch.g895FirstSummon&&s.g463Summons?.[p]?.turn===s.turn&&s.g463Summons[p].n>0)continue;
   if(watch.g1268FirstEight&&(cost(c)<8||s.g463Summons?.[p]?.turn===s.turn&&s.g463Summons[p].costEightOrMore))continue;
   // A NEO summon counts only when it was declared with an evolution base.
   if(watch.g816Evolution&&!api.isEvolution(x)&&!((c.neoEvolution||c.g48HandEvolution)&&c.g27BaseUid))continue;
   queue(s,controller,source,watch.defs);
  }
  if(colors(c).length>1)for(const y of s.players[p].grave)
   if(!y.faceDown&&card(y).g922GraveMultiSummon)send(s,p,y,'GraveReturn754',{serial:y.zoneSerial||0});
 }
 if(c.type==='creature'&&origin==='mana'&&typeof permit==='string'&&permit.startsWith('g1288:')){
  const granted=s.extLimits?.find(l=>l.kind==='g1288ManaSummon'&&l.permit===permit);
  if(granted)granted.used=true;
 }
 consumeOnce464(s,p,c,false);recordSummon463(s,p,c);if(c.type!=='spell')consumeReduction456(s,p,c);if(c.type==='creature'&&['mana','grave'].includes(origin)&&typeof permit==='string'&&permit.startsWith('g450:'))((s.g450ZoneUses??=[{},{}])[p]??={})[permit]=s.turn;if(c.type!=='spell')noncreatureUse448(s,p,c);if(c.type==='creature'){countExecution(s,p,c);if(colors(c).includes('自然')&&Number(c.power)>=12000)s.g34Discounts=(s.g34Discounts||[]).filter(y=>y.p!==p||y.turn!==s.turn);}},
 scheduleAltEnd1221(s,p,c,inst){
  if(s.endStep||!c.g568Alt?.end)return;
  (s.g537Delays??=[]).push({p,source:c.id,when:'turnEnd',turn:s.turn,
   g1221PendingUid:inst.uid,defs:structuredClone(c.g568Alt.end)});
 },
 judgeWon969(s,p,deferred){
  const wins=s.g969FirstJudgeWins??=[null,null];
  if(wins[p]===s.turn)return;
  // A win outside an attack still uses up the first win of the turn.
  wins[p]=s.turn;
  const attacker=s.players[p].battle.find(x=>x.uid===s.attack?.attacker&&!x.sealed);
  if(!attacker||!api.isCreature(s,attacker))return;
  const ref={uid:attacker.uid,incarnation:attacker.incarnation||0};
  for(const source of s.players[p].battle)
   if(card(source).g969FirstJudgeUntap&&!api.ignored(s,source)&&api.isCreature(s,source))
    send(s,p,source,'JudgeUntap969',{g399Attacker:ref},deferred);
 },
 declareYurufuwa1293(s,owner,c,follow){
  if(!colors(c).includes('水')&&!race(c,'マジック'))return false;
  const seen=s.g1293FirstWaterMagic??=[null,null];
  if(seen[owner]===s.turn)return false;
  seen[owner]=s.turn;
  const rows=s.players[owner].hand.filter(x=>card(x).g1293Yurufuwa&&!api.handAbilityIgnored(s,x))
   .map(x=>({source:x.cardId,uid:x.uid,serial:x.zoneSerial||0}));
  if(!rows.length)return false;
  put(s,task('g34_YurufuwaDeclare1293',owner,rows[0].source,{rows,follow}));
  return true;
 },
 spellCast(s,p,c,origin,owner,inst,face){
  alchemistUse1670(s,p);
  terminalUse1292(s,p,c);
  firstSummonOrSpell1247(s,1);
  qualifyingUse1224(s,p,c,null,owner);
  useBlockers524(s,p);consumeReduction456(s,p,c);noncreatureUse448(s,p,c,owner??p);countExecution(s,p,c);
  // Capture the cast before it resolves, and require its first physical grave arrival.
  if(inst&&origin==='hand'&&owner===p)for(const x of creatures(s,p)){
   if(x.sealed||!card(x).g1245HandSpellRecast&&!card(x).g1250RecastSacrifice)continue;
   const watcher=effective(x,s);
   if(watcher.g1245HandSpellRecast||watcher.g1250RecastSacrifice)
    send(s,p,x,'RecastHandSpell1245',{target:inst.uid,serial:(inst.zoneSerial||0)+1,face,
     ...(watcher.g1250RecastSacrifice?{g1250Sacrifice:true}:{})});
  }
  if(inst&&colors(c).length>1)for(const x of creatures(s,p)){
   if(x.sealed||!effective(x,s).g1744CastRecovery)continue;
   const once={g792Once:'dogiradisReturn1744'};if(used792(s,x,once))continue;
   const refs=api.allLayers(inst).map(y=>({uid:y.uid,owner:y.cardOwner??owner??p,incarnation:y.incarnation||0,serial:(y.zoneSerial||0)+1}));
   send(s,p,x,'ReturnCastSpell1744',{...once,refs,spellName:c.name});
  }
  // The shared spell count has already recorded this cast, including free casts.
  const firstSpell=s.g37Spells?.[p]?.turn===s.turn&&s.g37Spells[p].n===1;
  for(const {owner,x,watch}of spellWatches(s,p,c,origin))
   if(!watch.g965FirstSpell||firstSpell)
    queue(s,owner,x,watch.defs.map(d=>['CastCostDeploy595','CastCostSpell1656'].includes(d.op)?{...d,castCost:c.cost}:d));
  if(race(c,'魔導具'))magicToolUse976(s,p);
  for(const x of s.players[p].grave)if(!x.faceDown&&card(x).g847SpellGraveReturn)
   send(s,p,x,'GraveReturn754',{serial:x.zoneSerial||0});
 },
 shieldAdded918(s,p,count=1){
  if(s.g1204ShieldPlacements?.turn!==s.turn)s.g1204ShieldPlacements={turn:s.turn,counts:[0,0]};
  s.g1204ShieldPlacements.counts[p]+=count;
  if(s.g20LeavingUids&&s.leaving){
   const counts=shieldAdds918.get(s.leaving)||[0,0];
   counts[p]+=count;
   shieldAdds918.set(s.leaving,counts);
  }else triggerShieldAdded918(s,p,count);
 },
 shieldAdded1737(s,p){
  if(s.g20LeavingUids&&s.leaving){
   const counts=shieldAdds1737.get(s.leaving)||[0,0];
   counts[p]++;
   shieldAdds1737.set(s.leaving,counts);
  }else triggerEnemyShieldAdded1737(s,p,1);
 },
 flushShieldAdded918(s,batch){
  const other=shieldAdds1737.get(batch);
  if(other){
   shieldAdds1737.delete(batch);
   for(const p of [s.active,1-s.active])triggerEnemyShieldAdded1737(s,p,other[p]);
  }
  const counts=shieldAdds918.get(batch);
  if(!counts)return;
  shieldAdds918.delete(batch);
  for(const p of [s.active,1-s.active])triggerShieldAdded918(s,p,counts[p]);
 },
 flushSecondMana1205(s,batch){
  const seats=secondManaAdds1205.get(batch);
  if(!seats)return;
  secondManaAdds1205.delete(batch);
  for(const p of seats)triggerSecondMana1205(s,p);
 },
 opponentShieldTrigger699(s,p){
  for(const watcher of creatures(s,1-p)){
   const defs=!watcher.sealed&&effective(watcher,s).g699OpponentShieldTrigger;
   if(defs)queue(s,1-p,watcher,defs);
  }
 },
 handMana1087(s,p,x){
  const race=card(x).g1087ManaReveal;
  if(race)send(s,p,x,'ManaReveal1087',{serial:x.zoneSerial||0,race});
 },
 lostSignGrant1087(s,p,x,source){
  (x.g34Grants??=[]).push({turn:s.turn,blocker:true,spellCost:cost(card(source)),spellSource:source});
  (s.g537Delays??=[]).push({p,source,uid:x.uid,incarnation:x.incarnation||0,turn:s.turn,when:'nextOwnStart',
   defs:[{op:'DelayedMove532',to:'hand',g774Banky:true}]});
 },
 rigel1358(s,p,source){
  api.enqueue(s,p,{uid:source.uid,incarnation:source.incarnation||0,source:source.cardId,effect:'extended',
   task:task('g34_Target',1-p,source.cardId,{owner:'self',to:'grave',controller:p,
    title:'ザビ・リゲル：破壊する自分のクリーチャーを1体選ぶ'})});
 },
 unpaidExecution1358(s,p){
  for(const x of creatures(s,1-p)){
   if(card(x).g1358Hydra&&effective(x,s).g1358Hydra)
    queue(s,1-p,x,[{op:'OpponentManaLoss478'}]);
  }
 },
 rokka1372(s,executor,paidMana=false){
  if(paidMana||s.active!==executor)return;
  const controller=1-executor;
  for(const x of creatures(s,controller))if(!x.sealed&&!x.faceDown&&effective(x,s).g1372Rokka)
   api.enqueue(s,controller,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',
    task:task('g34_Target',executor,x.cardId,{owner:'self',element:true,to:'grave',controller,g1372OpponentSacrifice:true,
     title:'ロッカ・マグナム：破壊する自分のエレメントを1つ選ぶ'})});
 },
 magnum1087(s,executor){
  for(const p of [s.active,1-s.active])for(const x of s.players[p].battle){
   if(card(x).g1087Magnum&&api.isCreature(s,x)&&!api.ignored(s,x))
    api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',
     task:task('g34_Target',executor,x.cardId,{owner:'self',to:'grave',controller:p,title:'百発人形マグナム：破壊する自分のクリーチャーを1体選ぶ'})});
  }
 },
 triggerCardUsed1242(s,p,c,granted=false){
  if(!granted&&!c.trigger&&!c.triggerPlus&&!c.superTrigger)return;
  for(const x of s.players[1-p].battle)
   if(!x.sealed&&card(x).g1242TriggerUseWatch&&api.isCreature(s,x)&&effective(x,s).g1242TriggerUseWatch)
    queue(s,1-p,x,[{op:'SelfDestroy'}]);
 },
 execution1088(s,p){
  const enemy=1-p;
  for(const x of creatures(s,enemy)){
   if(api.ignored(s,x))continue;
   const kind=card(x).g1088ExecuteWatch;
   if(kind==='platinum')queue(s,enemy,x,[{op:'Draw',n:1,optional:true}]);
   if(kind==='fukafuchi'&&s.active===p&&s.once?.['g1088Fukafuchi:'+key(x)]!==s.turn)
    send(s,enemy,x,'Fukafuchi1088');
  }
 },
 twinFinish1088(s,p){return creatures(s,p).some(x=>card(x).g1088Twin&&!api.ignored(s,x));},
 observedEntry(s,p,y,options){
  const c=card(y),eventType=c.type;
  if(!y.sealed&&!y.faceDown&&api.isCreature(s,y)&&colors(effective(y,s,true)).includes('火')){const old=s.players[p].g1823FireEntries;s.players[p].g1823FireEntries={turn:s.turn,n:(old?.turn===s.turn?old.n:0)+1};}
  if(!y.sealed&&!y.faceDown&&api.isCreature(s,y)&&api.isEvolution(y)&&s.g1635EvolutionEntries?.[p]?.turn!==s.turn)
   (s.g1635EvolutionEntries??=[null,null])[p]={turn:s.turn,uid:y.uid,incarnation:y.incarnation||0};
  if(!options.ignoreEntry&&!y.sealed&&!y.faceDown&&['creature','seed','gear','field','duelist'].includes(eventType))hooks.rokka1372(s,p,options.paidMana);
  if(!options.ignoreEntry&&options.execution===false&&options.origin==='hand'&&(y.cardOwner??p)===p&&
     !y.sealed&&!y.faceDown&&api.isCreature(s,y)){
   for(const watcher of creatures(s,1-p)){
    if(!card(watcher).g1261HandEntryWatch||api.ignored(s,watcher))continue;
    const entrantCost=cost(effective(y,s,true));
    send(s,1-p,watcher,'HandEntryResponse1261',{g831Subject:{
     uid:y.uid,incarnation:y.incarnation||0,cost:entrantCost===Infinity?'∞':entrantCost
    }});
   }
  }
  if(options.g1221AltEnd){
   const delayed=s.g537Delays?.find(row=>row.turn===s.turn&&row.g1221PendingUid===y.uid);
   if(delayed){
    delete delayed.g1221PendingUid;
    delayed.uid=y.uid;
    delayed.incarnation=y.incarnation||0;
    if(c.g568Alt?.g1269Reduction)
     (y.g34Grants??=[]).push({turn:s.turn,g1269Attachment:key(y)+':end'});
   }
  }
  if(!y.sealed&&!y.faceDown){
   const own=s.players[p],firstCreature=own.enteredThisTurn===1&&api.isCreature(s,y);
   const seed=c.type==='seed'||c.seedCreature||c.natureAce4;
   const history=own.g1219SeedEntries?.turn===s.turn?own.g1219SeedEntries.keys:[];
   if(seed&&!history.length&&!options.ignoreEntry&&!options.allEntryMuted)for(const watcher of own.battle){
    if(watcher.sealed||watcher.faceDown||!card(watcher).g1283FirstSeed)continue;
    const mode=effective(watcher,s).g1283FirstSeed;
    if(mode)send(s,p,watcher,'Choose',{title:card(watcher).name+'：効果を選ぶ',
     modes:mode.modes,g184Modes:mode.g184Modes});
   }
   if(!options.ignoreEntry&&(firstCreature||seed&&history.length<2))for(const watcher of own.battle){
    if(watcher.sealed||watcher.faceDown||!card(watcher).g1219FirstEntryDraw||!effective(watcher,s).g1219FirstEntryDraw)continue;
    if(firstCreature)send(s,p,watcher,'Draw',{n:1,optional:true});
    // The first other Tamaseed may be the second overall if this source entered first.
    if(seed&&watcher.uid!==y.uid&&history.every(previous=>previous===key(watcher)))
     send(s,p,watcher,'Draw',{n:1,optional:true});
   }
   if(seed&&history.length<2)own.g1219SeedEntries={turn:s.turn,keys:[...history,key(y)]};
  }
  if(s.extLimits?.some(l=>l.kind==='g1218NextCreatureGrant'&&l.player===p&&l.turn===s.turn)&&
     !y.sealed&&!y.faceDown&&api.isCreature(s,y)){
   s.extLimits=s.extLimits.filter(l=>{
    if(l.kind!=='g1218NextCreatureGrant'||l.player!==p||l.turn!==s.turn)return true;
    applyGrant(s,{p,source:l.source,spell:true,grant:l.grant},y);
    return false;
   });
  }
  if(!options.ignoreEntry&&!y.sealed&&!y.faceDown&&(c.neoEvolution||api.isEvolution(y))&&api.isCreature(s,y)){
   const entrant={uid:y.uid,incarnation:y.incarnation||0};
   for(const x of s.players[p].grave)if(!x.faceDown&&card(x).g1126GraveBase)
    send(s,p,x,'GraveBase1126',{serial:x.zoneSerial||0,entrant});
  }
  if(!options.ignoreEntry&&options.execution&&options.origin==='hand'&&eventType==='creature'&&c.spellFace&&cost(c)>=cost(c.spellFace)){
   for(const x of creatures(s,p))if(card(x).g1088Twin&&!api.ignored(s,x))
    send(s,p,x,'TwinInPlace1088',{subject:{uid:y.uid,incarnation:y.incarnation||0,source:y.cardId}});
  }
  if(s.active===p&&!options.ignoreEntry&&!options.costPaid&&!options.paidMana&&!y.sealed&&!y.faceDown&&
     (eventType==='creature'||eventType==='seed'||c.seedCreature||c.natureAce4||api.isCreature(s,y))){
   for(const watcher of s.players[1-p].battle){
    const defs=card(watcher).g1281UnpaidEntry;
    if(defs&&!watcher.sealed&&!watcher.faceDown&&!api.ignored(s,watcher))
     send(s,1-p,watcher,'SelfSacrifice407',{g1281SelfSeed:true,defs});
   }
  }
  if(!options.ignoreEntry&&!options.paidMana&&['creature','gear'].includes(eventType))hooks.magnum1087(s,p);
  const trackRace=s.g936DreamOrVehicleEntryTurn!==s.turn;
  const trackBlocker=s.players[p].blockerEnteredTurn!==s.turn;
  if(p===s.active&&(trackRace||trackBlocker)&&!y.sealed&&api.isCreature(s,y)){
   const entered=effective(y,s,true);
   if(trackRace&&(race(entered,'ドリームメイト')||race(entered,'ビークル・ビー')))s.g936DreamOrVehicleEntryTurn=s.turn;
   if(trackBlocker&&!y.faceDown&&entered.blocker)s.players[p].blockerEnteredTurn=s.turn;
  }
  // Graveyard abilities observe the entrant's current power, before any later attachment or entry ability.
  const gravePowerWatchers=s.players[p].grave.filter(x=>!x.faceDown&&card(x).g901GraveEntryPower!==undefined);
  if(!options.ignoreEntry&&gravePowerWatchers.length&&!y.sealed&&api.isCreature(s,y)){
   const enteredPower=api.power(y,false,s);
   for(const x of gravePowerWatchers)if(enteredPower>=card(x).g901GraveEntryPower)
    send(s,p,x,'SelfGraveHand476',{serial:x.zoneSerial||0});
  }
  if(!options.ignoreEntry&&!y.sealed&&!y.faceDown){
   const graveRaceWatchers=s.players[p].grave.filter(x=>!x.faceDown&&card(x).g966GraveEntryRace);
   if(graveRaceWatchers.length){
    const entrant=effective(y,s,true);
    for(const x of graveRaceWatchers){
     const watcher=card(x);
     if(race(entrant,watcher.g966GraveEntryRace)&&
      (!watcher.g1198GraveEntryCreature||api.isCreature(s,y)&&!api.selfStopped(s,p)))
      send(s,p,x,'GraveReturn754',{serial:x.zoneSerial||0});
    }
   }
  }
  if(!options.ignoreEntry&&!y.sealed&&!y.faceDown&&hasSoul(card(y),'W')&&api.isCreature(s,y)){
   for(const watcher of s.players[p].battle){
    const defs=card(watcher).g865WSoulEntry;
    if(defs&&watcher.uid!==y.uid&&!watcher.sealed&&!watcher.faceDown&&!api.ignored(s,watcher)&&api.isCreature(s,watcher))queue(s,p,watcher,defs);
   }
  }
  if(!y.sealed&&hasSoul(card(y),'H')&&api.isCreature(s,y))
   (s.g857LightSoulEnteredTurn??=[null,null])[p]=s.turn;
  if(!options.ignoreEntry&&!y.sealed)for(const watcher of creatures(s,1-p)){
   if(watcher.sealed||api.ignored(s,watcher))continue;
   const {g767SecondEnemy,g767UnpaidRaid,g768UnpaidRamp,g1346UnpaidMana}=effective(watcher,s);
   if(g767SecondEnemy&&api.isCreature(s,y)&&s.players[p].enteredThisTurn>=2)
    send(s,1-p,watcher,'Batsuda767',{entrants:[y,...(y.godLinks||[])].map(x=>({uid:x.uid,incarnation:x.incarnation||0}))});
   if(options.costPaid||options.paidMana)continue;
   if(g1346UnpaidMana&&api.isCreature(s,y)){
    const refs=[y,...(y.godLinks||[])].map(x=>({uid:x.uid,incarnation:x.incarnation||0}));
    queue(s,1-p,watcher,[{op:'ExactMove',owner:p,g403Refs:refs,to:'mana',toOwnerMana:true}]);
   }
   if(g767UnpaidRaid&&!used(s,'g767UnpaidRaidUsed',watcher))send(s,1-p,watcher,'Zentuu767');
   if(g768UnpaidRamp)queue(s,1-p,watcher,[{op:'Offer',title:'山札の上から1枚をマナゾーンに置く？',defs:[{op:'Ramp',n:1}]}]);
  }
 },
 entry(s,p,y,options){const c=card(y),creature=api.isCreature(s,y);
  if(creature&&!y.sealed&&options.execution===true)for(const watcher of creatures(s,p)){
   if(watcher.uid!==y.uid&&!watcher.sealed&&!watcher.faceDown&&
      effective(watcher,s).g1815PrinceSummon)
    send(s,p,watcher,'PrinceDestroy1815',{g1815Subject:{uid:y.uid,incarnation:y.incarnation||0}});
  }
  if(creature&&!y.sealed)for(const limit of s.extLimits||[])if(limit.kind==='g1804EntryDestroy'&&limit.player===p){
   queue(s,limit.who,{cardId:limit.source},[{op:'ExactMove',owner:p,to:'grave',
    g403Refs:api.allLayers(y).map(x=>({uid:x.uid,incarnation:x.incarnation||0})),followEvolution:true}]);
  }

  if(c.g1698SummonEntry&&creature&&!y.sealed&&options.execution===true&&!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,y))queue(s,p,y,effective(y,s).g1698SummonEntry);
  if(creature&&!y.sealed&&cost(effective(y,s))>s.players[p].mana.length){
   for(const limit of s.extLimits||[])if(limit.kind==='g1597OverManaBottom'&&limit.player===p&&!api.spellIgnored(s,{type:'spell',cost:limit.spellCost,spellSource:limit.spellSource})){
    const actor=limit.who;
    queue(s,actor,{cardId:limit.spellSource},[{op:'ExactMove',owner:p,to:'deck',target:y.uid,targetIncarnation:y.incarnation||0,
     g403Refs:api.allLayers(y).map(x=>({uid:x.uid,incarnation:x.incarnation||0})),followEvolution:true}]);
   }
  }
  if(creature&&!y.sealed&&race(effective(y,s),'ゼニス'))for(const field of s.players[p].battle){
   if(!field.sealed&&!field.g1175DSwitched&&card(field).g1175CrystalField&&effective(field,s).g1175CrystalField)
    send(s,p,field,'CrystalSwitch1175');
  }
  if(creature&&!y.sealed&&options.execution===true){
   const commandDragon=race(effective(y,s,true),'コマンド・ドラゴン');
   for(const watcher of creatures(s,p)){
    if(watcher.sealed||!(card(watcher).g997SummonEntry||card(watcher).g1244SummonEntry))continue;
    if(watcher===y&&(options.selfMuted||api.selfStopped(s,p)))continue;
    const {g997SummonEntry,g1244SummonEntry}=effective(watcher,s);
    if(g997SummonEntry&&(watcher===y||commandDragon))queue(s,p,watcher,g997SummonEntry);
    if(g1244SummonEntry){
     const firstEntryCall=effective(watcher,s).g1689FirstEntrySpell;
     const summonFilter=effective(watcher,s).g1690SummonEntryFilter;
     if((firstEntryCall||summonFilter)&&(options.selfMuted||options.allEntryMuted))continue;
     if(summonFilter&&!matches(s,p,y,summonFilter))continue;
     if(!firstEntryCall||s.players[p].enteredThisTurn===1)queue(s,p,watcher,firstEntryCall?g1244SummonEntry.map(d=>({...d,max:cost(effective(y,s))})):g1244SummonEntry);
    }
   }
  }
  if(!y.sealed&&!y.faceDown&&race(effective(y,s,true),'ドラゴン')){
   const fighter={uid:y.uid,incarnation:y.incarnation||0};
   for(const watcher of creatures(s,p))
    if(!watcher.sealed&&card(watcher).g1226DragonEntryPower&&effective(watcher,s).g1226DragonEntryPower&&
       (watcher.uid!==y.uid||!options.selfMuted&&!api.selfStopped(s,p)))
     send(s,p,watcher,'DragonEntryPower1226',{g1226Dragon:fighter});
   for(const watcher of creatures(s,p))
    if(watcher.uid!==y.uid&&!watcher.sealed&&effective(watcher,s).g998DragonEntryFight)
     send(s,p,watcher,'FightEnemy240',{fighter,optional:true,g998EntryFight:true});
  }
  if(options.g785Group!==undefined){
   const delay=s.g537Delays?.[options.g785Group];
   if(delay?.turn===s.turn&&delay.defs[0]?.op==='ReturnGroup785')delay.defs[0].refs.push({uid:y.uid,incarnation:y.incarnation||0});
  }
  if(c.g773RevEntry&&options.revolution&&creature&&!y.sealed&&!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,y))
   queue(s,p,y,c.g773RevEntry);
  if(creature&&!y.sealed&&options.execution===true){
   const entrant=effective(y,s),enteredCost=cost(entrant);
   if(race(entrant,'魔導具'))magicToolUse976(s,p);
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
   const manaWatchers=s.players[p].mana.filter(x=>!x.faceDown&&card(x).g975ManaSummonMinPower!==undefined);
   if(manaWatchers.length){
    const enteredPower=api.power(y,false,s);
    for(const x of manaWatchers)
     if(enteredPower>=card(x).g975ManaSummonMinPower)
      send(s,p,x,'ManaSummonWatch975',{serial:x.zoneSerial||0});
   }
  }
  if(!y.sealed&&!y.faceDown&&matches(s,p,y,{g295Tamaseed:true})){
   const seedColors=colors(effective(y,s,true));
   for(const x of s.players[p].grave){
    if(!x.faceDown&&seedColors.includes(card(x).g978GraveSeedWatch))
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
   if(c.g1697OffHandEntryShield&&options.origin!==undefined&&options.origin!=='hand'&&cost(effective(y,s))<=4)queue(s,1-p,watcher,[{op:'Offer',title:'相手の手札以外からの登場：シールドを1つ追加する？',defs:[{op:'ShieldTop',n:1}]}]);
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
  // Watch actual mana taps, for either player, including this source's own free entry.
  if(creature&&!y.sealed&&!options.paidMana)for(const owner of [s.active,1-s.active])
   for(const watcher of creatures(s,owner)){
    if(watcher.sealed||!card(watcher).g1622UnpaidEntryDestroy||!effective(watcher,s).g1622UnpaidEntryDestroy)continue;
    queue(s,owner,watcher,[{op:'ExactMove',owner:p,to:'grave',filter:{creature:true},
     g403Refs:[y,...(y.godLinks||[])].map(x=>({uid:x.uid,incarnation:x.incarnation||0})),
     followEvolution:'evolutionOnly',target:y.uid,targetIncarnation:y.incarnation||0}]);
   }
  // Retain all linked parts so removing one God does not lose the watched unit (QA43748).
  if(creature)for(const watcher of creatures(s,1-p)){
   if(watcher.sealed)continue;
   const {g403Bloom,g600OverManaEntry,g601UnpaidDestroy,g601OffHandMana,g621NonSummon,g624EntryResponse,g1112UnpaidBounce,g1161OffHandDestroy}=effective(watcher,s);
   const bloomDestroys=options.execution===false&&g403Bloom&&(s.active===p||g403Bloom==='eitherTurn');
   const unpaidDestroys=g601UnpaidDestroy&&(g601UnpaidDestroy!=='opponentTurn'||s.active===p)&&
    !options.costPaid&&!options.paidMana;
   const untappedManaDestroys=g624EntryResponse==='opponentTurnUntappedManaDestroy'&&s.active===p&&!options.paidMana&&!y.sealed;
   const offHand=options.origin!==undefined&&options.origin!=='hand';
   const offHandMana=g601OffHandMana&&offHand,offHandDestroy=g1161OffHandDestroy&&offHand;
   const nonSummon=options.execution===false?g621NonSummon:null;
   const shieldWithoutMana=g624EntryResponse==='untappedManaShield'&&!options.paidMana&&!y.sealed;
   const unpaidBounce=g1112UnpaidBounce&&s.active===p&&!y.sealed&&!options.costPaid&&!options.paidMana;
   if(!y.sealed&&(g624EntryResponse==='opponentTurnNonSummonFight'&&s.active===p&&options.execution===false||
      g624EntryResponse==='multicolorFight'&&colors(effective(y,s)).length>1||
      g624EntryResponse==='outsideHandFight'&&options.origin!==undefined&&options.origin!=='hand'))
    queue(s,1-p,watcher,[{op:'EntryFight624',enemy:{uid:y.uid,incarnation:y.incarnation||0}}]);
   if(!bloomDestroys&&!unpaidDestroys&&!untappedManaDestroys&&!offHandMana&&!offHandDestroy&&!g600OverManaEntry&&!nonSummon&&!shieldWithoutMana&&!unpaidBounce)continue;
   const exact={op:'ExactMove',owner:p,g403Refs:[y,...(y.godLinks||[])].map(x=>({uid:x.uid,incarnation:x.incarnation||0}))};
   if(bloomDestroys||unpaidDestroys||untappedManaDestroys)queue(s,1-p,watcher,[{...exact,to:'grave',target:y.uid,targetIncarnation:y.incarnation||0}]);
   if(offHandMana)queue(s,1-p,watcher,[{...exact,to:'mana'}]);
   if(offHandDestroy)queue(s,1-p,watcher,[{...exact,to:'grave',followEvolution:'evolutionOnly',filter:{creature:true}}]);
   if(shieldWithoutMana)queue(s,1-p,watcher,[{...exact,to:'shields',optional:true,followEvolution:true}]);
   if(nonSummon==='bottom')queue(s,1-p,watcher,[{...exact,to:'deck'}]);
   if(nonSummon==='bounce')queue(s,1-p,watcher,[{...exact,to:'hand',optional:true,followEvolution:'evolutionOnly',filter:{creature:true}}]);
   if(unpaidBounce)queue(s,1-p,watcher,[{...exact,to:'hand',toOwnerHand:true,optional:true,followEvolution:'evolutionOnly',filter:{creature:true}}]);
   if(nonSummon==='skip')queue(s,1-p,watcher,[{
    op:'Offer',title:'今のターンの残りを飛ばしますか？',score:s.active===p?50:-10,
    defs:[{op:'Custom',name:'endTurn'}]
   }]);
   // Compare with current mana on resolution, even if the cost was in range when it entered (QA46815).
   if(g600OverManaEntry)queue(s,1-p,watcher,[{...exact,to:'hand',optional:true,filter:{creature:true,g600OverMana:true}}]);
  }
  if(creature&&!y.sealed&&!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,y))for(const rule of[c.g260Self,...(c.g268ManaGrants||[])].filter(Boolean))if((rule.filter?.g466DistinctCosts||rule.filter?.g400Wave||rule.filter?.g334ZoneCount?.atLeastOpponent||rule.filter?.g272ManaCount!==undefined)&&rule.grants.g34Tasks&&ownCondition(s,p,rule.filter,y.uid))queue(s,p,y,rule.grants.g34Tasks);if(creature&&!y.sealed&&!options.costPaid)for(const watcher of creatures(s,1-p))if(!watcher.sealed&&effective(watcher,s).g321Katsu)queue(s,1-p,watcher,[{op:'KatsuFight321',enemy:{uid:y.uid,incarnation:y.incarnation||0}}]);if(c.g320Next&&options.ddd&&!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,y))queue(s,p,y,[{op:'Next320'}]);
  if(!y.sealed)for(const owner of [0,1])for(const x of s.players[owner].battle.filter(x=>api.isCreature(s,x)||!x.sealed&&((card(x).g1613D2PrintedEntry&&card(x).d2Field)||card(x).g1635Lunar)&&card(x).type==='field')){
   if(!creature&&!card(x).g314OtherEntry?.g765Element)continue;
   const watch=effective(x,s).g314OtherEntry;
   if(!watch||!creature&&!watch.g765Element||x.sealed||x.uid===y.uid&&
    (!watch.g1324IncludeSelf||options.selfMuted||api.selfStopped(s,p))||watch.who!=='both'&&owner!==(watch.who==='opponent'?1-p:p))continue;
   if(watch.g1635FirstEvolution){const first=s.g1635EvolutionEntries?.[p];if(first?.turn!==s.turn||first.uid!==y.uid||first.incarnation!==(y.incarnation||0))continue;}
   if(watch.g1175OutsideHand&&(!options.origin||options.origin==='hand'))continue;
   if(watch.entryCount!==undefined&&s.players[p].enteredThisTurn!==watch.entryCount)continue;
   if(watch.minEntryCount!==undefined&&(s.players[p].enteredThisTurn||0)<watch.minEntryCount)continue;
   if(watch.ownTurn&&owner!==s.active||used792(s,x,watch.defs?.[0])||watch.filter&&!matches(s,p,y,watch.filter))continue;
   if(watch.g778OverMana&&cost(effective(y,s))<=s.players[owner].mana.length||watch.g1088EntrantOverMana&&cost(effective(y,s))<=s.players[p].mana.length)continue;
   if(watch.g910HigherPower&&currentPower506(s,y)<=currentPower506(s,x))continue;
   if(watch.g1533RaceRecovery){
    const races=exactRaces(effective(y,s));
    if(races.length)queue(s,owner,x,[{op:'RaceRecovery1741',g1741Subject:{uid:y.uid,incarnation:y.incarnation||0},g1741Races:races,g1741EntrySelf:x.uid===y.uid}]);
   }
   else if(watch.g1632DestroyEntrant)queue(s,owner,x,[{op:'ExactMove',owner:p,to:'grave',target:y.uid,targetIncarnation:y.incarnation||0,g403Refs:api.allLayers(y).map(z=>({uid:z.uid,incarnation:z.incarnation||0})),followEvolution:true}]);
   else if(watch.g1770HasteDestroy)queue(s,owner,x,[{op:'Offer',defs:[{op:'EntryHasteDestroy1770',subject:{uid:y.uid,incarnation:y.incarnation||0}}]}]);
   else if(watch.g1740EntrantHaste)queue(s,owner,x,[{op:'ShieldGrave',optional:true,then:[{op:'EntryMach762',subject:{uid:y.uid,incarnation:y.incarnation||0},g1740Haste:true}]}]);
   else if(watch.g755EntrantPower)send(s,owner,x,'EntryBoost755',{
    subject:{uid:y.uid,incarnation:y.incarnation||0},power:watch.g755EntrantPower
   });
   else if(watch.g762EntrantMach)send(s,owner,x,'EntryMach762',{subject:{uid:y.uid,incarnation:y.incarnation||0}});
   else if(watch.g831DeathRecovery||watch.g1268ManaDeploy){
    const value=cost(effective(y,s));
    send(s,owner,x,watch.g1268ManaDeploy?'ManaEntryResponse1268':'DeathRecovery831',{
     g831Subject:{uid:y.uid,incarnation:y.incarnation||0,cost:value===Infinity?'∞':value}
    });
   }
   else if(watch.g1534EntrantDestroy)send(s,owner,x,'ExactMove',{owner:p,target:y.uid,targetIncarnation:y.incarnation||0,to:'grave'});
   else if(watch.g1088Bottom)send(s,owner,x,'ExactMove',{
    target:y.uid,targetIncarnation:y.incarnation||0,to:'deck',g1088OwnerMoves:true,
    // The creature remains the same when an evolution is placed on it (QA40249).
    ...(watch.g1275FollowEntrant?{g403Refs:[{uid:y.uid,incarnation:y.incarnation||0}],followEvolution:'evolutionOnly',
     filter:{creature:true}}:{})
   });
   else if(watch.g765CopyPower)send(s,owner,x,'CopyPower765',{g765Subject:{uid:y.uid,incarnation:y.incarnation||0}});
   else queue(s,owner,x,watch.defs);
  }
  if(creature&&!y.sealed)for(const x of creatures(s,p)){const watch=effective(x,s).g468EntryWatch;if(!x.sealed&&watch&&(!watch.g565Other||x.uid!==y.uid)&&(!(x.uid===y.uid)||!options.selfMuted&&!api.selfStopped(s,p))&&matches(s,p,y,watch.filter))send(s,p,x,'Entry468',{mode:watch.mode,subject:{uid:y.uid,incarnation:y.incarnation||0}});}if(!y.sealed)for(const x of s.players[p].battle)if(api.isCreature(s,x)||card(x).g251EntryDraw?.g1202Field)queueEntryWatch251(s,p,x,y,options);if(!y.sealed)for(const x of creatures(s,p)){const watch=effective(x,s).g250EntryDraw,self=x.uid===y.uid;if(!x.sealed&&watch&&(self?watch.self&&!options.selfMuted&&!api.selfStopped(s,p):matches(s,p,y,watch.filter)))queue(s,p,x,watch.defs);}if(s.active===p&&!y.sealed)for(const x of creatures(s,p)){const watch=effective(x,s).g249OtherEntry;if(!x.sealed&&x.uid!==y.uid&&watch&&matches(s,p,y,watch.filter))queue(s,p,x,watch.defs);}if(creature){const stopped=options.selfMuted||api.selfStopped(s,p);for(const x of active(s,p,'cabbage'))if(!(stopped&&x.uid===y.uid))queue(s,p,x,[select('mana',null,1,{creature:true,color:'自然',minPower:12000,exactCost:cost(c)-1},{deploy:true,optional:true})]);if(ninja(effective(y,s)))for(const x of active(s,p,'mukujimmed'))if(!(stopped&&x.uid===y.uid))queue(s,p,x,[E('Draw',{n:1,optional:true})]);if(angel(effective(y,s)))for(const x of active(s,p,'everries'))if(!(stopped&&x.uid===y.uid))queue(s,p,x,[E('Draw',{n:1,optional:true})]);for(const x of active(s,1-p,'nameko'))if(!options.paidMana)queue(s,1-p,x,[C('nameko',{target:y.uid,targetIncarnation:y.incarnation||0})]);if(options.execution===false)for(const x of active(s,1-p,'oogumo'))queue(s,1-p,x,[E('ExactMove',{to:'grave',target:y.uid,targetIncarnation:y.incarnation||0})]);}if(options.origin!=='hand')for(const x of s.players[1-p].battle.filter(x=>!api.ignored(s,x)))for(const layer of api.layers(x))if(card(layer).g34SoulDock)queue(s,1-p,x,[E('ExactMove',{to:'grave',target:y.uid,targetIncarnation:y.incarnation||0})]);},
 attack(s,p,x){
  if(s.attackLifecycle&&x.g34Grants?.some(g=>g.turn===s.turn&&g.g1225DestroyAfterAttack))
   s.attackLifecycle.g1225AttackDeaths=x.g34Grants.filter(g=>g.turn===s.turn&&g.g1225DestroyAfterAttack)
    .map(g=>g.g1225DestroyAfterAttack);
  if(s.g481Attackers?.turn!==s.turn)s.g481Attackers={turn:s.turn,events:[]};const refs=api.allLayers(x).map(key),first=!s.g481Attackers.events.some(e=>e.refs.some(r=>refs.includes(r)));s.g481Attackers.events.push({p,refs,...(s.players[1-p].battle.some(y=>y.uid===s.attack?.target&&!y.sealed&&race(effective(y,s,true),'ゴッド'))?{g1723GodTarget:true}:{}),g1699Colors:colors(effective(x,s,true)),...(race(effective(x,s,true),'ドラゴン')?{g1222Dragon:true}:{}),...(race(effective(x,s,true),'アビス')?{g1236Abyss:true}:{}),...(race(effective(x,s,true),'ティラノ・ドレイク')?{tyrannoDrake925:true}:{}),...(s.attack?.target==='player'?{playerTarget:true}:{})});if(s.g481Attackers.events.length===1){
  const attacker={uid:x.uid,incarnation:x.incarnation||0};
  for(const owner of [p,1-p])for(const watcher of s.players[owner].battle){
   if(!watcher.sealed&&!watcher.faceDown&&card(watcher).g1158FirstAttackBreak&&
      effective(watcher,s).g1158FirstAttackBreak&&api.isCreature(s,watcher)&&
      (watcher.uid!==x.uid||!api.selfStopped(s,p)))send(s,owner,watcher,'FirstAttackBreak1158',attacker);
  }
 }if(s.attackLifecycle){s.attackLifecycle.g543First=first;s.attackLifecycle.g543Refs=refs;}if(first)for(const r of s.extLimits||[]){
  if(r.kind!=='g543Shinka')continue;
  if(r.when==='firstAttack'&&refs.includes(key(r)))api.enqueue(s,r.p,{source:r.source,effect:'extended',
   task:task('g34_ResolveDelay537',r.p,r.source,{uid:r.uid,incarnation:r.incarnation,defs:[{op:'AfterAttack542',defs:[{op:'Untap',g191First:true}]}]})});
  if(r.when==='firstAttackUntap'&&r.refs.some(ref=>refs.includes(ref))&&
   !api.spellIgnored(s,{type:'spell',cost:r.spellCost,spellSource:r.source}))
   api.enqueue(s,r.p,{source:r.source,effect:'extended',
    task:task('g34_ResolveDelay537',r.p,r.source,{spellCost:r.spellCost,defs:[{op:'Untap',g904Refs:refs}]})});
 }
 if(s.attackLifecycle&&s.extLimits?.some(r=>r.kind==='g543Shinka'&&r.when==='nextAttackEnd')){
  s.extLimits=s.extLimits.filter(r=>{
   if(r.kind!=='g543Shinka'||r.when!=='nextAttackEnd'||!r.refs.some(ref=>refs.includes(ref)))return true;
   (s.attackLifecycle.g542After??=[]).push({p:r.p,source:r.source,defs:[{op:'Untap',g904Refs:refs}]});
   return false;
  });
 }
 const defender=s.attack?.target!=='player'&&s.players[1-p].battle.find(y=>y.uid===s.attack?.target);if(defender){
  const defs=effective(defender,s).g447Attacked;
  if(defs)queue(s,1-p,defender,defs);
  const ref={uid:defender.uid,incarnation:defender.incarnation||0};
  for(const watcher of creatures(s,1-p)){
   const abilities=effective(watcher,s).g694DefenderWatch;
   if(abilities&&!watcher.sealed)send(s,1-p,watcher,'Sequence',{defs:abilities,g694Defender:ref});
  }
 }const c=effective(x,s),own=s.players[p];
 if(!api.ignored(s,x)&&!api.selfStopped(s,p))for(const grant of x.g34Grants||[])if(grant.turn===s.turn&&grant.g1501AttackRamp)queue(s,p,x,[{op:'Ramp',n:1}]);
 if(c.g1269TeamAttack&&!api.selfStopped(s,p)){
  const attacks=s.g481Attackers.events.filter(event=>event.p===p).length;
  for(const {min,def} of c.g1269TeamAttack)
   if(attacks>=min)queue(s,p,x,[def]);
 }
 // Each live grant triggers independently. Revolution 0 checks shields on resolution (rule 603.4).
 if(c.g1049RevolutionUntap&&!api.selfStopped(s,p))for(const g of x.g34Grants||[]){
  if(g.g1049RevolutionUntap&&g.turn===s.turn)
   queue(s,p,x,[{op:'IfOwn',filter:{g265ShieldsMax:0},defs:[{op:'Untap',g191First:true}]}]);
 }
 if(c.g781ReleaseAll&&!api.selfStopped(s,p))queue(s,p,x,[E('ReleaseAllHyper781')]);
 if(first&&c.g540FirstAttack&&(!c.g540FirstAttackCondition||ownCondition(s,p,c.g540FirstAttackCondition,x.uid))&&!api.selfStopped(s,p))queue(s,p,x,c.g540FirstAttack);if((c.g320Jave||c.g1318Smash)&&!api.selfStopped(s,p))queue(s,p,x,[{op:'Smash320',serial:x.zoneSerial||0}]);
 if(!api.selfStopped(s,p))for(const defs of c.g1547ExtraAttacks||[])queue(s,p,x,defs);
 if(c.g34Attack&&!api.selfStopped(s,p)){
  // Attack trigger conditions are checked before any attack effects resolve (QA 42519).
  const defs=c.g34Attack.filter(d=>
   (!d.g764PlayerAttack||s.attack?.target==='player')&&
   !hasExemptingAlly1266(s,p,d)&&
   (!d.g1286TriggerCondition||ownCondition(s,p,d.g1286TriggerCondition,x.uid)));
  if(defs.length)queue(s,p,x,defs);
 }
 if(c.g756TurboRush==='discard'&&!api.selfStopped(s,p)&&turboReady756(s,p,x))queue(s,p,x,[{op:'Discard',g756All:true}]);if(defender&&c.g691AttackCreature&&!api.selfStopped(s,p)&&(c.g714AttackMinPower===undefined||currentPower506(s,defender)>=c.g714AttackMinPower)&&(!c.g801DefenderFilter||matches(s,1-p,defender,c.g801DefenderFilter)))queue(s,p,x,c.g691AttackCreature.map(d=>d.op==='DestroyDefender1650'?{...d,defender1650:{p:1-p,uid:defender.uid,incarnation:defender.incarnation||0}}:d));if(!api.selfStopped(s,p))for(const {source,grants:g}of c.g404Inherited||[])if(g.g34Attack)queue(s,p,x,g.g34Attack,source);if(!api.selfStopped(s,p))for(const {source,grants:g}of c.g406Inherited||[])if(g.g34Attack)queue(s,p,x,g.g34Attack,source);if(c.g34Role==='emrakul')queue(s,p,x,[C('emrakulSix')]);if(c.g34Role==='minogami')queue(s,p,x,[E('Offer',{defs:[E('Look',{n:3,public:true,stages:[{to:'mana',n:'all',filter:{twin:true}}],after:[C('minogamiBuff')]})]})]);if(card(x).neoEvolution)for(const y of active(s,p,'grasper'))queue(s,p,y,[select('mana',null,1,{creature:true,belowPower:api.power(x,false,s)},{deploy:true,optional:true})]);if(!api.ignored(s,x))for(const layer of api.layers(x))if(card(layer).g34SoulDiscard)queue(s,p,x,[E('Discard',{n:1,random:true})]);if(ninja(c))for(const y of active(s,p,'happou')){if(s.attack?.target==='player')queue(s,p,y,[E('Discard',{n:1,random:true})]);else(x.g34Grants??=[]).push({turn:s.turn,slayer:true,g34BattleSafe:true});}if(api.isEvolution(x)&&cost(c)>=2)for(const y of own.hand.filter(y=>card(y).g34Role==='baromreizu'))queue(s,p,y,[C('reizuCast')]);},
 attackStart(s,p,x){
  if(s.attack?.target==='player'){
   if((s.extLimits||[]).some(r=>r.kind==='g712BlockBreak'&&r.player===p&&r.turn===s.turn))s.attack.g712PlayerTarget=true;
   if(s.players[p].battle.some(y=>y.g34Grants?.some(g=>g.g947BlockBreak&&g.turn===s.turn)))s.attack.g947PlayerTarget=true;
   for(const defender of s.players[1-p].battle){
    if(card(defender).g947DefendMana&&api.isCreature(s,defender)&&effective(defender,s).g947DefendMana)
     send(s,1-p,defender,'DefendMana947');
   }
  }
  for(const y of s.players[1-p].hand)if(card(y).g1201SeedDefense&&!api.handAbilityIgnored(s,y))
   send(s,1-p,y,'SeedDefense1201',{serial:y.zoneSerial||0,selected:[]});
  if(hyperMode418(s,x))for(const y of s.players[p].grave)
   if(!y.faceDown&&card(y).g1234HyperGraveAttack)
    send(s,p,y,'GraveSummonWatch766',{serial:y.zoneSerial||0});
  for(const y of s.players[p].grave)if(!y.faceDown&&card(y).g1615RevengeTop&&!api.handAbilityIgnored(s,y))
   send(s,p,y,'SelfGraveBottom839',{serial:y.zoneSerial||0,g1615Top:true});
  attackWatches252(s,p,x);
  const top=api.visionTop(s,p);
  for(const y of [...s.players[p].hand,...(top?[top]:[])])for(const [face,c] of faces(card(y)).entries()){
   const w=c.g417Chance;
   if(w&&!api.spellIgnored(s,c)&&(!w.hyper||hyperMode418(s,x))&&chanceMatches419(s,p,x,w))
    send(s,p,y,'Chance417',{serial:y.zoneSerial||0,face,...(y===top?{origin:'deck'}:{})});
  }
  if(api.canMoveZone(s,p,'grave'))for(const y of s.players[p].grave)for(const [face,c]of faces(card(y)).entries()){
   const w=c.g417Chance;
   if(w?.g1548ChanceR&&!api.spellIgnored(s,c)&&chanceMatches419(s,p,x,w))
    send(s,p,y,'Chance417',{serial:y.zoneSerial||0,face,origin:'grave'});
  }
  for(const y of active(s,1-p,'souzan'))queue(s,1-p,y,[C('souzanStop')]);{for(const y of s.players[1-p].shields.flatMap(api.shieldCards).filter(y=>y.faceUp&&card(y).g34Role==='mantraCastle'))queue(s,1-p,y,[C('mantraDefend')]);if(s.attack?.target==='player'&&s.players.some(p=>!p.shields.length)&&!s.players[1-p].battle.some(y=>!y.sealed&&card(y).g34Role==='nightmare'))for(const y of s.players[1-p].hand.filter(y=>card(y).g34Role==='nightmare'))queue(s,1-p,y,[C('nightmare')]);}},
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
 opponentBattleWins986(s,p,winner){
  const owner=1-p,ref={uid:winner.uid,incarnation:winner.incarnation||0};
  // The losing watcher can leave with the battle result, before its triggered ability resolves.
  return creatures(s,owner).filter(x=>!x.sealed&&effective(x,s).g986OpponentBattleWin).map(x=>({
   player:owner,uid:x.uid,source:x.cardId,onOpponentWin:true,
   task:task('g34_OpponentBattleWin986',owner,x.cardId,{
    uid:x.uid,incarnation:x.incarnation||0,winner:ref,lastTapped:!!x.tapped
   })
  }));
 },
 battleWins(s,p,w){
  const x=s.players[p].battle.find(x=>x.uid===w?.uid),c=x&&effective(x,s);
  const defs=c&&(!c.g588FirstSelfWin||w.g588FirstForUnit)&&c.g189BattleWin?.filter(d=>!d.g752FirstOnly||w.g588FirstForUnit);
  return [...(defs?.length?[{player:p,uid:x.uid,source:x.cardId,effect:'extended',
   task:task('g34_Sequence',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,defs})}]:[]),
   ...winWatches252(s,p,w),...rondoWins946(s,x,w),...boomerangWins1645(s,x)];
 },
 mugenTapped415(s,p,x){const c=effective(x,s);if(!x.sealed&&c.g415MugenTapped)queue(s,p,x,c.g415MugenTapped);},
 tapped(s,p,x){
  if(!x.sealed&&!x.faceDown&&api.isCreature(s,x)&&s.players[p].battle.includes(x)){
   for(const limit of s.extLimits||[])if(limit.kind==='g1597TapDraw'&&limit.player===p&&!api.spellIgnored(s,{type:'spell',cost:limit.spellCost,spellSource:limit.spellSource}))
    queue(s,p,{cardId:limit.spellSource},[{op:'Draw',n:1,optional:true}]);
  }
  if(!x.sealed&&api.isCreature(s,x))for(const y of s.players[p].battle){
   const watcher=card(y);
   if(watcher.g1217AllyTapDraw&&!x.faceDown&&s.players[p].battle.includes(x)&&
      !y.sealed&&!y.faceDown&&api.isCreature(s,y)&&effective(y,s).g1217AllyTapDraw){
    // A declined draw leaves the once-per-turn ability available for a later tap.
    const draw={op:'Draw',n:1,optional:true,g792Once:'allyTapDraw'};
    if(!used792(s,y,draw))queue(s,p,y,[draw]);
   }
   if((watcher.g771Wing||watcher.g904AllyTap)&&!y.sealed&&!api.ignored(s,y)&&api.isCreature(s,y)){
    if(watcher.g771Wing)queue(s,p,y,[E('Draw',{n:1,optional:true})]);
    if(watcher.g904AllyTap&&s.players[p].battle.includes(x))send(s,p,y,'ExactMove',{owner:p,to:'grave',optional:true,followEvolution:true,
     g403Refs:api.allLayers(x).map(z=>({uid:z.uid,incarnation:z.incarnation||0})),afterAttempt:[{op:'Draw',n:1}]});
   }
  }
  if(api.isCreature(s,x)){
   const history=s.g1131CreatureTapTurns??=[null,null];
   const actualCreatureTap=!x.sealed&&!x.faceDown&&s.players[p].battle.includes(x);
   const first=actualCreatureTap&&history[p]!==s.turn;
   if(actualCreatureTap)history[p]=s.turn;
   for(const y of s.players[1-p].battle){
    if(y.sealed||api.ignored(s,y)||!api.isCreature(s,y))continue;
    const {g678OpponentTap,g681OpponentTapAnyTurn,g1131FirstOpponentTap}=card(y);
    if(g678OpponentTap&&(s.active===1-p||g681OpponentTapAnyTurn))queue(s,1-p,y,g678OpponentTap);
    if(first&&g1131FirstOpponentTap)queue(s,1-p,y,g1131FirstOpponentTap);
   }
  }
  if(s.extLimits?.some(r=>r.kind==='g885FirstTap')){
   const refs=api.allLayers(x).map(key);
   s.extLimits=s.extLimits.filter(r=>{
    if(r.kind!=='g885FirstTap'||!refs.includes(key(r.ref)))return true;
    const untap={op:'Untap',g191First:true};
    if(r.spellCost!==undefined){
     if(api.spellIgnored(s,{type:'spell',cost:r.spellCost,spellSource:r.source}))return false;
     api.enqueue(s,r.player,{...r.ref,source:r.source,effect:'extended',
      task:task('g34_ResolveDelay537',r.player,r.source,{...r.ref,spellCost:r.spellCost,defs:[untap]})});
    }else api.enqueue(s,r.player,{...r.ref,source:r.source,effect:'extended',
     task:task('g34_Untap',r.player,r.source,{...r.ref,g191First:true})});
    return false;
   });
  }
  const c=effective(x,s),first=!used(s,'g191Tapped',x);mark(s,'g191Tapped',x);if(first&&c.g219FirstTap)queue(s,p,x,c.g219FirstTap);if(first&&c.g191FirstTapUntap)queue(s,p,x,[E('Untap',{g191First:true})]);if(c.g188Tapped)queue(s,p,x,c.g188Tapped);if(c.g34Role==='fourJustice')queue(s,p,x,[C('justiceBreak')]);if(ninja(effective(x,s)))for(const y of active(s,p,'mukade'))if(!used(s,'g34FirstTap',y)){mark(s,'g34FirstTap',y);queue(s,p,y,[E('Draw',{n:1,optional:true})]);}},
 beforeBreak1136(s,defender,uids){
  const context=s.breakContext;
  if(!context||context.g1136Prepared)return false;
  const p=context.player,x=s.players[p].battle.find(y=>y.uid===context.sourceUid&&
   (context.incarnation===undefined||(y.incarnation||0)===context.incarnation));
  if(!x||x.sealed)return false;
  const c=effective(x,s);
  const sources=[...(c.g1136BeforeBreak?[{source:x.cardId,defs:c.g1136BeforeBreak}]:[]),
   ...(c.g404Inherited||[]).filter(r=>r.grants.g1136BeforeBreak)
    .map(r=>({source:r.source,defs:r.grants.g1136BeforeBreak}))];
  if(!sources.length)return false;
  context.g1136Prepared=true;
  const after=task('g19BeforeCommit',p,x.cardId,{defender,uids:[...uids],context:structuredClone(context)});
  put(s,task('g34_BreakOrder1136',p,x.cardId,{sources:sources.map(r=>({...r,count:uids.length})),after}));
  return true;
 },
 // Capture the creature before shield replacement windows can move it.
 breakerRefs756(s,context){
  if(!context.sourceUid)return null;
  const x=s.players[context.player]?.battle.find(y=>y.uid===context.sourceUid&&
   (context.incarnation===undefined||(y.incarnation||0)===context.incarnation));
  return x&&!x.sealed&&api.isCreature(s,x)?api.allLayers(x).map(key):null;
 },
 defenderShieldChoice1659(s,p,context){
  return context?.player===1-p&&(s.active===p||!context.burn&&!context.reverse&&!context.qqBreak&&!context.g1577BottomBurn)&&
   creatures(s,p).some(x=>!x.sealed&&!x.faceDown&&effective(x,s).g1659ShieldChoose);
 },
 recordBeastBreak1658(s,context,defender,count){
  const p=context?.player;
  if(!count||!context?.g756Breaker?.length||defender!==1-p)return;
  if(s.g1658CreatureBreaks?.turn!==s.turn)s.g1658CreatureBreaks={turn:s.turn,players:[0,0]};
  s.g1658CreatureBreaks.players[p]+=count;
 },
 recordBreak756(s,context,count){
  const refs=context?.g756Breaker;
  if(!count||!refs)return;
  const attack=s.attackLifecycle;
  if(attack?.player===context.player&&refs.includes(key(attack))){
   attack.g1075BrokeShield=true;
   attack.g1812BrokenShields=(attack.g1812BrokenShields||0)+count;
   const x=s.players[attack.player].battle.find(x=>key(x)===key(attack));
   if(x&&card(x).g1271BreakBonus){
    const counts=(attack.g1271BreakCounts??={});
    counts[key(attack)]=(counts[key(attack)]||0)+count;
   }
  }
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
 shieldRetaliate1236(s,defender,context,count){
  if(!count||context?.player!==1-defender||
   !(context.g756Breaker?.length||context.g913DepartedBreaker))return;
  // One simultaneous break is one event, even when it breaks several shields.
  for(const x of creatures(s,defender))if(!x.sealed&&effective(x,s).g1818Makibishi)
   queue(s,defender,x,[{op:'OpponentSelect',n:1,to:'grave',filter:{creature:true,untapped:true}}]);
  for(const l of s.extLimits||[])if(l.kind==='g1236ShieldRetaliate'&&l.who===defender&&
   !api.spellIgnored(s,{type:'spell',spellSource:l.spellSource,cost:l.spellCost}))
   api.enqueue(s,defender,{source:l.spellSource,effect:'extended',
    task:task('g34_ShieldGrave588',defender,l.spellSource,{n:1,required:true})});
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
 attackNames1081,
 unblocked482(s,p,x){
  if(x.sealed)return false;
  const playerAttack=s.attack.target==='player';
  const attacker=effective(x,s),defs=!api.selfStopped(s,p)&&
   ((!s.attack.g484Blocked&&attacker.g482AnyUnblocked)||(playerAttack&&attacker.g482Unblocked));
  if(defs)queue(s,p,x,defs);
  let triggered=!!defs;
  if(playerAttack&&!s.attack.g484Blocked){
   const ids=s.players[p].hand.filter(y=>{
    const c=card(y),requiredRace=c.g953BioK?.race??(c.g951BioK?'グレートメカオー':null);
    return requiredRace&&race(attacker,requiredRace)&&!api.handAbilityIgnored(s,y);
   }).map(y=>y.uid);
   if(ids.length){
    const readsName=s.players[p].hand.some(y=>ids.includes(y.uid)&&card(y).g953BioK?.effect?.op==='BioKAttackerSearch1081');
    declareHandBio(s,task('g34_BioKDeclare951',p,x.cardId,{ids,selected:[],...(readsName?{
     g399Attacker:{uid:x.uid,incarnation:x.incarnation||0,g1081Names:attackNames1081(s,x)}
    }:{})}));
    triggered=true;
   }
  }
  if(!s.attack.g484Blocked)for(const source of creatures(s,p)){
   if(source.sealed)continue;
   const current=effective(source,s);
   const {g701UnblockedMana,g852UnblockedDiscard,g1076UnblockedWatch:watch}=current;
   if(playerAttack&&current.g1079Tauros&&source.uid!==x.uid&&sharesRace(attacker,current)){
    const part=[source,...(source.godLinks||[])].find(y=>card(y.cardId).g1079Tauros);
    queue(s,p,source,[{op:'AttackExtraBreak511',amount:1,g969FollowControl:true,
     g399Attacker:{uid:x.uid,incarnation:x.incarnation||0}}],part?.cardId??source.cardId);
    triggered=true;
   }
   if(playerAttack&&watch&&(!watch.self||source.uid===x.uid)&&(!watch.other||source.uid!==x.uid)&&
    (!watch.race||race(attacker,watch.race))&&
    (watch.minPower===undefined||api.power(x,true,s)>=watch.minPower)){
    queue(s,p,source,watch.defs);
    triggered=true;
   }
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
 declareBioT952(s,p,attacker,other,defender,blockUntap){
  const c=effective(attacker,s);
  const ids=s.players[p].hand.filter(x=>{
   const rule=card(x).g952BioT;
   return rule&&race(c,rule.race)&&!api.handAbilityIgnored(s,x);
  }).map(x=>x.uid);
  if(!ids.length)return false;
  const ref=(p,x)=>({p,uid:x.uid,incarnation:x.incarnation||0});
  declareHandBio(s,task('g34_BioKDeclare951',p,attacker.cardId,{ids,selected:[],battle:{
   attacker:ref(p,attacker),defender:ref(other,defender),...(blockUntap?{blockUntap}:{})
  }}));
  return true;
 },
 untapped(s,p,x,turnStart=false){
  recordUntap472(s,p,x);
  if(turnStart&&!x.sealed&&!x.faceDown&&api.isCreature(s,x)){
   if(s.g1285StartUntap?.turn!==s.turn)s.g1285StartUntap={turn:s.turn,player:p,count:0};
   s.g1285StartUntap.count++;
  }
  const defs=effective(x,s).g299Untapped;
  if(!x.sealed&&defs)queue(s,p,x,defs);
  if(turnStart&&effective(x,s).g34Role==='kusabi')queue(s,p,x,[E('Ramp',{n:2,optional:true}),C('kusabi12')]);
  if(!x.sealed&&api.isCreature(s,x)&&s.players[p].battle.includes(x))
   for(const owner of [s.active,1-s.active])for(const other of s.players[owner].battle){
    if(other.uid!==x.uid&&card(other).g766OtherUntap&&!other.sealed&&api.isCreature(s,other)&&effective(other,s).g766OtherUntap)
     queue(s,owner,other,[{op:'Untap',g191First:true}]);
   }
 },
 shieldLeft(s,p,shield,group){s.g34ShieldLeftTurn=s.turn;if(s.leaving)(s.g536ShieldDepartures??=[]).push(p);else shieldDeparture536(s,p);if(group==null)return;for(const x of s.players[p].battle){if(!api.layers(x).some(z=>(z.exLifeShieldUids||[z.exLifeShieldUid]).includes(group))||api.ignored(s,x))continue;const role=card(x).g34Role;if(role==='doll')queue(s,p,x,[C('dollModes')]);if(role==='romaion')queue(s,p,x,[exec('hand',8,{spellOnly:true})]);if(role==='godtime')queue(s,p,x,[E('Offer',{defs:[C('endTurn')]})]);
  const defs=effective(x,s).g1133ExLifeLeft;
  if(defs)queue(s,p,x,defs);
 }},

 // A departing watcher can only observe its own departure (603.5d).
 flushElementLeaves617(s,watchers=[]){
  for(const y of watchers){
   const live=s.players[y.p].battle.find(x=>key(x)===key(y));
   if(!live)continue;
   if(y.g771Wing){
    if(!live.sealed&&!api.ignored(s,live)&&api.isCreature(s,live))queue(s,y.p,live,[
     E('Offer',{title:'翼速 ザ・ウイングをアンタップする？',defs:[E('Untap',{g191First:true})]})
    ]);
   }else queue(s,y.p,y,y.g1139OtherCreatureLeaves||y.opponentCreatureLeaves||[E('Draw',{n:1,optional:true})]);
  }
 },
 flushShield536(s){if(s.leaving)return;const departed=s.g536ShieldDepartures||[];delete s.g536ShieldDepartures;for(const p of departed)shieldDeparture536(s,p);},
 ownShieldBroken1012(s,p,count){
  for(const x of creatures(s,p)){
   const c=!x.sealed&&effective(x,s),defs=c&&(c.g1703OwnShieldBreak||(x.tapped&&c.g1012OwnShieldBreakTapped));
   if(defs)for(let i=0;i<count;i++)queue(s,p,x,defs);
  }
 },
 drawn676(s,p,n,before,turnDraw){
  if(!n)return;
  if(before===0&&s.active===p)for(const owner of [p,1-p])for(const source of s.players[owner].battle){
   const c=effective(source,s);
   if(!source.sealed&&!source.faceDown&&!source.g1175DSwitched&&c.g1673FirstDraw&&
      (c.g1673FirstDraw==='both'||owner===p))
    queue(s,owner,source,[{op:'DSwitch1669',defs:c.g1673DrawSwitch}]);
  }
  if(before===0&&s.active===p)for(const owner of [0,1])for(const source of s.players[owner].battle){
   if(source.sealed||source.faceDown||api.ignored(s,source)||!effective(source,s).g1648FirstOwnDrawMana)continue;
   // The ability belongs to the seed's controller, but the player who drew chooses their hand card.
   queue(s,owner,source,[{op:'FirstDrawHandMana1648',player:p}]);
  }
  for(const source of creatures(s,p)){const defs=!source.sealed&&effective(source,s).g1528OwnDraw;if(defs)for(let i=0;i<n;i++)queue(s,p,source,defs);}
  if(n>Number(turnDraw))for(const source of creatures(s,p)){
   if(!card(source).g1154EffectDraw||api.ignored(s,source))continue;
   for(let i=Number(turnDraw);i<n;i++)queue(s,p,source,card(source).g1154EffectDraw);
  }
  if(before===0&&s.active===p)for(const source of creatures(s,p)){
   if(!source.sealed&&effective(source,s).g951FirstOwnDraw)queue(s,p,source,[E('Draw',{n:1,optional:true})]);
  }
  if(before<2&&before+n>=2)for(const y of creatures(s,p)){
   if(!y.sealed&&effective(y,s).g789SecondDraw)queue(s,p,y,[E('Draw',{n:1})]);
  }
  for(const y of s.players[1-p].battle){
   const {g676OppDraw,g678LaterOppDraw,g1272MirrorDraw,g1272AsteriaDraw}=card(y);
   if(!(g676OppDraw||g678LaterOppDraw||g1272MirrorDraw||g1272AsteriaDraw)||
    y.sealed||api.ignored(s,y)||!api.isCreature(s,y))continue;
   if(g676OppDraw)for(let i=0;i<n;i++)queue(s,1-p,y,g676OppDraw);
   if(g678LaterOppDraw&&s.active===p)for(let i=before===0?1:0;i<n;i++)queue(s,1-p,y,g678LaterOppDraw);
   if(g1272MirrorDraw)queue(s,1-p,y,[{op:'Offer',title:'カードを'+n+'枚引く？',defs:[{op:'Draw',n}]}]);
   // Asteria excludes the first draw of the active player, even before the turn draw (QA 35248).
   if(g1272AsteriaDraw)for(let i=s.active===p&&before===0?1:0;i<n;i++)
    queue(s,1-p,y,[{op:'Draw',n:1}]);
  }
 },
 battleCardDestroyed1126(s,p,x,defs){queue(s,p,x,defs);},
 sealDrawWatchers1156(s,p){
  return s.players[p].battle.filter(source=>!source.sealed&&!source.faceDown&&
   card(source).g1156SealDraw&&effective(source,s).g1156SealDraw&&api.isCreature(s,source));
 },
 sealGrave1140(s,p,x,drawWatchers){
  for(const source of drawWatchers)send(s,p,source,'Draw',{n:1,optional:true});
  for(const source of s.players[p].battle){
   if(source.sealed||source.faceDown||!api.isCreature(s,source)||!effective(source,s).g1140SealGrave)continue;
   send(s,p,source,'GraveReturn754',{uid:x.uid,incarnation:x.incarnation||0,serial:x.zoneSerial||0});
  }
 },
 battleGrave1122(s,p,x){queue(s,p,x,card(x.cardId).g1122BattleGrave);},
 graveAdded(s,p,all){
  if(s.g767GraveEntries?.turn!==s.turn)s.g767GraveEntries={turn:s.turn,counts:[0,0]};
  s.g767GraveEntries.counts[p]+=all.length;
  if(s.g20LeavingUids&&s.leaving)s.leaving.g838GraveCount=(s.leaving.g838GraveCount||0)+all.length;
  else flushGrave838(s,all.length);
  for(const x of s.players[1-p].battle){
   if(x.sealed||x.faceDown||s.g20LeavingUids?.includes(x.uid)||!card(x).g1276OpponentGrave||!api.isCreature(s,x))continue;
   const defs=effective(x,s).g1276OpponentGrave;
   if(defs)for(const y of all)queue(s,1-p,x,defs);
  }
  const copies=y=>api.doubledGraveArrival1345(p,y)?2:1;
  for(const y of all)if(card(y).g590SelfGraveBottom)
   for(let i=0;i<copies(y);i++)queue(s,p,y,[{op:'GraveBottom589',self:true}]);
  // Cards with grave-entry abilities trigger from the new zone (QA46841).
  for(const y of all){
   const defs=card(y).g675GraveEntry;
   if(defs)for(let i=0;i<copies(y);i++)queue(s,p,y,defs.map(d=>d.op==='SelfGraveHand476'?{...d,serial:y.zoneSerial||0}:d));
  }
  const graveWatchers=s.players[p].battle.filter(x=>card(x).g677AllyGrave&&!x.sealed&&!x.faceDown&&
   !s.g20LeavingUids?.includes(x.uid)&&api.isCreature(s,x)&&!api.ignored(s,x));
  if(graveWatchers.length){
   const newCreatures=all.filter(y=>faces(api.zoneCard(s,p,y,'grave')).some(face=>face.type==='creature'));
   for(const x of graveWatchers)for(const y of newCreatures)if(y.uid!==x.uid)
    for(let i=0;i<copies(y);i++)queue(s,p,x,card(x).g677AllyGrave);
  }
  const watchers=s.leaving?.snapshot?.six?.scarlet?.[p]||active(s,p,'scarlet').map(x=>({uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0}));for(const x of watchers)if(!used(s,'g34Scarlet',x))for(const y of all)if(card(y).type==='creature'&&cost(card(y))<=5)queue(s,p,x,[C('scarletRevive',{target:y.uid,targetSerial:y.zoneSerial||0})]);},
 flushGrave838,
 snapshot(s,leaving=[]){
  const g1256HandEvolutionWatch=s.players.map(own=>own.hand.filter(x=>card(x).g1256HandEvolutionDeath&&
   !api.handAbilityIgnored(s,x)).map(x=>({uid:x.uid,serial:x.zoneSerial||0})));
  const snapshot={
  g1818DeathDraw:(s.extLimits||[]).filter(l=>l.kind==='g1818DeathDraw'&&l.turn===s.turn).flatMap(l=>{
   const host=sourceHost474(s,l.ref);
   return host&&!host.x.sealed&&api.isCreature(s,host.x)?[{...l,target:{p:host.p,uid:host.x.uid,incarnation:host.x.incarnation||0}}]:[];
  }),
  g1460AuraDeaths:s.players.flatMap((own,p)=>own.battle.flatMap(a=>{
   const defs=card(a).g1460HostDeath,host=a.auraTo1352;
   return defs&&host&&!a.sealed&&!api.ignored(s,a)?[{p,uid:a.uid,incarnation:a.incarnation||0,cardId:a.cardId,host:{...host},defs,
    auras:own.battle.filter(x=>x.auraTo1352?.uid===host.uid&&x.auraTo1352.incarnation===host.incarnation).map(x=>({uid:x.uid,serial:(x.zoneSerial||0)+1}))}]:[];
  })),
  ...(g1256HandEvolutionWatch.some(x=>x.length)?{g1256HandEvolutionWatch}:{}),
  g1745DragonGrave:s.players.map(own=>own.grave.filter(x=>!x.faceDown&&card(x).g1745GraveDragon).map(x=>({uid:x.uid,serial:x.zoneSerial||0}))),
  g1145GraveWatch:s.players.map(own=>own.grave.flatMap(x=>{
   const minCost=card(x).g1145GraveDeathMinCost;
   return !x.faceDown&&minCost!==undefined?[{uid:x.uid,serial:x.zoneSerial||0,minCost}]:[];
  })),
  g838SelfGrave:leaving.flatMap(({player,uid})=>{
  const x=s.players[player]?.battle.find(x=>x.uid===uid);
  if(!x)return [];
  const related=[x,...s.players[player].battle.filter(a=>a.auraTo1352?.uid===x.uid&&a.auraTo1352.incarnation===(x.incarnation||0))];
  return related.filter(y=>!y.sealed&&card(y).g838AnyGrave&&!api.ignored(s,y)).map(key);
 }),g1672CreatureRefs:s.players.flatMap((own,p)=>own.battle
  .filter(x=>!x.sealed&&!x.faceDown&&api.isCreature(s,x))
  .flatMap(x=>[x,...(x.godLinks||[])].map(y=>({p,uid:y.uid,incarnation:y.incarnation||0})))),leave320:s.players.flatMap((own,p)=>own.battle.map(x=>({p,uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0,creature:!x.sealed&&api.isCreature(s,x),race:effective(x,s).race,watch:!x.sealed&&!!effective(x,s).g320Jave}))),death303:s.players.flatMap((own,p)=>own.battle.map(x=>{const c=effective(x,s);return{p,uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0,creature:api.isCreature(s,x),race:c.race,name:c.name,colors:colors(c),g1469Blocker:!!c.blocker,g1674GodParts:(x.godLinks||[]).map(y=>({uid:y.uid,incarnation:y.incarnation||0})),
   ...(race(c,'ドリームメイト')?{deathNames960:battleNames676(s,x)}:{}),...(hasSoul(card(x),'E')?{g860EvilSoul:true}:{}),...(c.g303DeathWatch?.g862OtherSoul&&leaving.some(row=>row.player===p&&row.uid===x.uid)?{g862OnlySelf:true}:{}),...(c.g891OwnCreatureLeaves&&!x.sealed&&!api.ignored(s,x)?{leaveDraw891:c.g891OwnCreatureLeaves,...(c.g1676BounceLeaves?{g1676BounceLeaves:true}:{})}:{}),
   ...(c.g965OtherOwnLeave?{g965OtherOwnLeave:true}:{}),
   ...(g1256HandEvolutionWatch[p].length&&api.isEvolution(x)?{g1256Evolution:true}:{}),
   ...(c.g1248DragonLeaves?{g1248DragonLeaves:true}:{}),
   ...(dragonElement1248(c)?{g1248DragonElement:true}:{}),
   ...(!x.sealed&&c.type==='creature'&&{g1145Cost:cost(c)===Infinity?'∞':cost(c)}),
   ...(!x.sealed&&!x.faceDown&&c.g1124Jingi?{jingi:c.g1124Jingi}:{}),
   ...((c.g891OwnCreatureLeaves||c.g303DeathWatch?.g891LookBackSelf)&&leaving.some(row=>row.player===p&&row.uid===x.uid)?{g891OnlySelf:true}:{}),element:!x.sealed&&!x.faceDown,...(!x.sealed&&!x.faceDown&&c.g1284BattleRevival?{g1284BattleRevival:true}:{}),...(!x.sealed&&!x.faceDown&&c.g1139OtherCreatureLeaves?{g1139OtherCreatureLeaves:c.g1139OtherCreatureLeaves}:{}),elementDraw:!!c.g617OpponentElementLeaves&&!x.sealed&&!x.faceDown&&!api.ignored(s,x),...(c.g1009OpponentCreatureLeaves&&!x.sealed&&!x.faceDown?{opponentCreatureLeaves:c.g1009OpponentCreatureLeaves}:{}),...(c.g693OtherCreatureGraveDraw&&!x.sealed&&!x.faceDown&&!api.ignored(s,x)&&api.isCreature(s,x)?{graveDraw:true}:{}),watch:!x.sealed&&!api.ignored(s,x)&&(!c.g303DeathWatch?.g725RemainInBattle||!leaving.some(row=>row.player===p&&row.uid===x.uid))?c.g303DeathWatch:undefined};})),selfLeaves:s.players.flatMap((own,p)=>own.battle.flatMap(x=>{const c=effective(x,s),sharedDeaths1556=(c.g406Inherited||[]).flatMap(({grants:g})=>g.g172Death?[structuredClone(g.g172Death)]:[]);return c.g172Death||c.g172Leave||c.g1520TwinMana||c.g1520TwinManaUntap||c.g1770ManaUntapRace||sharedDeaths1556.length?[{p,uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0,...(sharedDeaths1556.length?{g1556SurvivorDeaths:sharedDeaths1556}:{}),g1520TwinMana:c.g1520TwinMana,g1520TwinManaUntap:c.g1520TwinManaUntap,g1770ManaUntapRace:c.g1770ManaUntapRace,g807ManaEntry:c.g807ManaEntry,g172Death:c.g172Death,
   ...(c.g172Death?.some(d=>d.g960FormerBases)?{formerBases960:(x.under||[]).flatMap(api.allLayers)
    .map(y=>({uid:y.uid,serial:(y.zoneSerial||0)+1}))}:{}),...(c.g172Death?.some(d=>d.g901Untapped||d.g1012Tapped)?{g901WasTapped:!!x.tapped}:{}),...(c.g172Death?.some(d=>d.op==='CrossedDeathDraw728')?{crossedCount728:crossedCount728(s,x)}:{}),...(c.g172Death?.some(d=>d.op==='MedusaCross929')?{crossedGearRefs929:crossedGearRefs929(s,p,x)}:{}),g172Leave:c.g172Leave,g601OpponentLeave:c.g601OpponentLeave}]:[];})),scarlet:[0,1].map(p=>active(s,p,'scarlet').map(x=>({uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0}))),dororon:[0,1].map(p=>active(s,p,'dororon').map(x=>({uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0})))};
  if(snapshot.death303.some(row=>row.watch?.defs.some(d=>d.g1192VictimPower))){
   // Capture power before any of the simultaneous departures remove a continuous effect.
   for(const victim of snapshot.death303){
    if(!victim.creature||!victim.element)continue;
    const x=s.players[victim.p].battle.find(x=>x.uid===victim.uid);
    const battle=s.leaving?.rows.find(row=>row.player===victim.p&&row.uid===victim.uid&&row.plan?.kind==='leave');
    const power=battle?.battlePower??currentPower506(s,x);
    victim.g1192Power=power===Infinity?'∞':power===-Infinity?'-∞':power;
   }
  }
  return snapshot;
 },
 leaving(s,p,x,snapshot,to,destroy){
  // Leave-triggered abilities originate in battle even after the source has moved.
  const queueBattle=(s,owner,source,defs,id=source.cardId)=>queue(s,owner,source,defs,id,owner);
  // An ability that sees its own move to the graveyard looks back only for its own card.
  const graveDefs=card(x).g838AnyGrave;
  if(to==='grave'&&graveDefs&&(snapshot?.g838SelfGrave?.includes(key(x))??!api.ignored(s,x)))queueBattle(s,p,x,graveDefs.map(d=>d.op==='SelfGraveMana1431'?{...d,serial:(x.zoneSerial||0)+1}:d));
  if(to==='grave'&&destroy){
   // This is a delayed effect, independent of either creature's current abilities.
   for(const l of snapshot?.g1818DeathDraw||[])if(l.target.p===p&&l.target.uid===x.uid&&l.target.incarnation===(x.incarnation||0))
    queueBattle(s,l.player,{cardId:l.source},[{op:'Draw',n:l.n}]);
   for(const aura of snapshot?.g1460AuraDeaths||[])if(aura.p===p&&aura.host.uid===x.uid&&aura.host.incarnation===(x.incarnation||0))
    queueBattle(s,p,aura,aura.defs.map(d=>['AuraGraveReturn1460','AuraDeathDrawDiscard1810'].includes(d.op)?{...d,auras:aura.auras}:d));
   if(s.g1225Destroyed?.turn!==s.turn)s.g1225Destroyed={turn:s.turn,cards:[[],[]]};
   s.g1225Destroyed.cards[p].push({uid:x.uid,serial:(x.zoneSerial||0)+1});
  }
  const before=snapshot?.death303;
  const candidate=deathVictim1674(before,p,x),victim=candidate?.element?candidate:null;
  if(to==='grave'&&destroy&&snapshot?.g1672CreatureRefs?.some(ref=>ref.p===p&&key(ref)===key(x))){
   if(s.g1672Destroyed?.turn!==s.turn)s.g1672Destroyed={turn:s.turn,cards:[[],[]]};
   s.g1672Destroyed.cards[p].push({uid:x.uid,serial:(x.zoneSerial||0)+1});
  }
  // Attached Auras move with an actually destroyed host (310.8a / 701.6a).
  const destroyedAura1745=!destroy&&card(x).type==='aura'&&x.auraTo1352&&s.leaving?.rows.some(row=>
   row.player===p&&row.uid===x.auraTo1352.uid&&row.to==='grave'&&row.destroy!==false&&row.plan.kind==='leave');
  if(to==='grave'&&(destroy||destroyedAura1745)&&victim?.g1248DragonElement&&victim.name!=='黒神龍グールジェネレイド')for(const ref of snapshot?.g1745DragonGrave?.[p]||[]){
   const source=s.players[p].grave.find(y=>y.uid===ref.uid&&(y.zoneSerial||0)===ref.serial);
   if(source)send(s,p,source,'GraveSummonWatch766',{serial:ref.serial});
  }
  if(victim){
   // Battle-result destruction is finalized before victory effects and Slayer (Q&A 42495–42496).
   if(to==='grave'&&destroy&&victim.creature&&
      (s.leaving?.after?.kind==='battleResult'||s.battleResolution?.g1237Compare)){
    for(const source of before.filter(source=>source.p===p&&source.g1284BattleRevival))
     (s.g537Delays??=[]).push({p,source:source.cardId,uid:x.uid,incarnation:x.incarnation||0,when:'turnEnd',turn:s.turn,
      defs:[{op:'SelfGraveRevive644',serial:(x.zoneSerial||0)+1,g1069AllowEvolution:true}]});
   }
   if(victim.creature)s.players[p].creatureLeftTurn=s.turn;
   if(to==='grave'&&destroy&&victim.creature&&victim.g1256Evolution){
    // The hand card must already be present when the destruction occurs (QA 39985).
    const declarations=snapshot.g1256HandEvolutionWatch[p].flatMap(ref=>{
     const y=aidoruHand1256(s,{...ref,p});
     return y?[task('g34_AidoruDeclare1256',p,y.cardId,{...ref,controller:p})]:[];
    });
    if(declarations.length)put(s,...declarations);
   }
   if(to==='grave'&&destroy&&victim.creature)for(const {uid,serial,minCost} of snapshot.g1145GraveWatch?.[p]||[]){
    if(victim.g1145Cost!=='∞'&&!(victim.g1145Cost>=minCost))continue;
    const source=s.players[p].grave.find(y=>y.uid===uid&&(y.zoneSerial||0)===serial);
    if(source)send(s,p,source,'GraveSummonWatch766',{serial});
   }
   if(victim.creature)for(const watcher of before)
    if(watcher.p===p&&watcher.jingi&&key(watcher)!==key(victim))
     queueBattle(s,p,watcher,watcher.jingi);
   // A source leaving in the same batch sees its own departure only (QA33591).
   if(victim.creature||victim.g1248DragonElement)for(const watcher of before)
    if(watcher.p===p&&watcher.leaveDraw891&&(!watcher.g1676BounceLeaves||to==='hand')&&(watcher.g1248DragonLeaves?victim.g1248DragonElement:victim.creature)&&!watchUsed792(s,watcher,{defs:watcher.leaveDraw891})&&
     (!(watcher.g891OnlySelf||watcher.leaveDraw891[0]?.g792Once&&s.g20LeavingUids?.includes(watcher.uid))||key(watcher)===key(victim))&&
     (!watcher.g965OtherOwnLeave||s.active===p&&key(watcher)!==key(victim)))
     {const defs=watcher.leaveDraw891;
      if(!defs.some(d=>d.g1633ColorlessVictimCost)||!victim.colors.length&&victim.g1145Cost!==undefined)
       queueBattle(s,p,watcher,defs.map(d=>d.g1633ColorlessVictimCost?{...d,filter:{...d.filter,exactCost:victim.g1145Cost}}:d));
     }
   const watchers=before.filter(y=>y.p!==p&&(y.elementDraw||victim.creature&&y.opponentCreatureLeaves)||
    to==='grave'&&victim.creature&&y.graveDraw&&key(y)!==key(victim));
   if(victim.creature)for(const y of before){
    if(y.p===p&&key(y)!==key(victim)&&card(y.cardId).g771Wing)watchers.push({...y,g771Wing:true});
   }
   if(victim.creature)watchers.push(...before.filter(y=>y.g1139OtherCreatureLeaves&&key(y)!==key(victim)&&
    !s.g20LeavingUids?.includes(y.uid)));
   if(watchers.length){
    if(s.leaving)(s.leaving.g617Draws??=[]).push(...watchers);
    else hooks.flushElementLeaves617(s,watchers);
   }
  }
  const victim320=snapshot?.leave320?.find(y=>y.p===p&&key(y)===key(x));if(victim320?.creature&&String(victim320.race).includes('アビス'))for(const watcher of snapshot.leave320.filter(y=>y.p===p&&y.watch)){if(!used(s,'g320JaveUsed',watcher)){mark(s,'g320JaveUsed',watcher);queueBattle(s,p,watcher,[{op:'Discard',n:1}]);}}const prior=snapshot?.selfLeaves?snapshot.selfLeaves.find(y=>y.p===p&&key(y)===key(x)):effective(x,s);if(prior?.g172Leave&&(!prior.g601OpponentLeave||s.active!==p))queueBattle(s,p,x,prior.g172Leave);if(to==='grave'&&destroy){const death=snapshot?.death303,victim=deathVictim1674(death,p,x);const firstCreatureDeath=victim?.creature&&s.g612CreatureDeathTurn!==s.turn;if(firstCreatureDeath)s.g612CreatureDeathTurn=s.turn;if(victim)for(const watcher of death.filter(y=>y.watch&&
   (victim.creature||victim.element&&y.watch.g1311Element)&&(!y.watch.firstCreatureDeath||firstCreatureDeath)&&(!y.watch.g1733FirstForPlayer||s.g393DDestroyed?.turn===s.turn&&s.g393DDestroyed.byPlayer?.[p]===1)&&
   (y.watch.both||y.p===(y.watch.opponent?1-p:p)))){const self=key(watcher)===key(victim);
   // Rule 603.5d: a source that leaves in this batch can see only itself.
   if(watcher.g891OnlySelf&&!self)continue;
   if(watcher.watch.defs.some(d=>d.g1192VictimPower)&&(victim.g1192Power===undefined||victim.g1192Power==='-∞'))continue;
   const otherSoul=watcher.watch.g862OtherSoul;
   if(otherSoul&&!self&&(watcher.g862OnlySelf||!hasSoul(card(victim.cardId),otherSoul)))continue;
   const {race:requiredRace,raceAny}=watcher.watch;
   const victimRace=String(victim.race||'');
   const raceMatches=(!requiredRace||victimRace.includes(requiredRace))&&(!raceAny||victimRace.split('/').some(r=>raceAny.includes(r)));
   if((!watcher.watch.g1518NonGR||self||!card(victim.cardId).gr)&&(!watcher.watch.g1469Blocker||victim.g1469Blocker)&&(!self||watcher.watch.self)&&((self&&!watcher.watch.selfFilter)||raceMatches)&&(!watcher.watch.name||String(victim.name||'').includes(watcher.watch.name))&&(!watcher.watch.colorsAny||watcher.watch.colorsAny.some(c=>(victim.colors||[]).includes(c)))&&(!watcher.watch.g860EvilSoul||victim.g860EvilSoul)&&(!watcher.watch.ownTurn||s.active===watcher.p)&&(!watcher.watch.opponentTurn||s.active!==watcher.p)){
    if(watcher.watch.defs.some(d=>d.g1654VictimCostPlusOne)&&!Number.isFinite(victim.g1145Cost))continue;
   const defs=watcher.watch.defs.map(d=>{
     if(d.g960DeathNames)return {...d,g960DeathNames:victim.deathNames960??[]};
     if(d.g1192VictimPower)return {...d,filter:{belowPower:victim.g1192Power,g199Power:true}};
     if(d.g1654VictimCostPlusOne)return {...d,filter:{...d.filter,exactCost:victim.g1145Cost+1}};
     if(d.g1634VictimCost)return {...d,filter:{...d.filter,belowCost:victim.g1145Cost}};
     if(d.op==='StackDestroyed1130')return {...d,victim:{uid:x.uid,serial:(x.zoneSerial||0)+1}};
     return d;
    });
    queueBattle(s,watcher.p,watcher,defs);
   }
  }if(prior?.g172Death){
   const defs=prior.g172Death
    .filter(d=>!d.g934OpponentTurn||s.active!==p)
    .filter(d=>!d.g901Untapped||!(prior.g901WasTapped??x.tapped))
    .filter(d=>!d.g1012Tapped||(prior.g901WasTapped??x.tapped))
    .filter(d=>!d.g1063Evolved||api.isEvolution(x))
    .filter(d=>!d.g1161DuringBattle||s.leaving?.after?.kind==='battleResult')
    .filter(d=>d.op!=='ScheduleGraveReturn644'||d.anyTurn||s.active===p)
    .flatMap(d=>{
     if(d.name==='startPowerJudge')return [{...d,defs:d.defs.map(def=>def.op==='SelfGraveRevive644'?
      {...def,serial:(x.zoneSerial||0)+1}:def)}];
     if(d.g960FormerBases){
      const refs=prior.formerBases960??[];
      return refs.length?[{...d,g960FormerBases:refs}]:[];
     }
     if(d.op==='MedusaCross929'){
      const gears=prior.crossedGearRefs929??[];
      return gears.length?[{...d,gears}]:[];
     }
     if(d.op==='CrossedDeathDraw728'){
      const n=prior.crossedCount728;
      return n?[{op:'Offer',title:'カードを'+n+'枚引く？',defs:[{op:'Draw',n}]}]:[];
     }
     return [['SelfGraveHand476','ScheduleGraveReturn644','SelfGraveShield659','SelfGraveBottom839','GraveReturn754','SelfGraveMana1431'].includes(d.op)||d.g901Untapped||d.g1063Evolved?{...d,serial:(x.zoneSerial||0)+1}:d];
    });
   if(defs.length)queueBattle(s,p,x,defs);
  }for(const defs of prior?.g1556SurvivorDeaths||[])queueBattle(s,p,x,defs.map(d=>d.op==='SelfGraveMana1431'?{...d,serial:(x.zoneSerial||0)+1}:d));
  if(effective(x,s).g34Role==='dragonOrb')queueBattle(s,p,x,[C('orbDeploy')]);if(ninja(effective(x,s)))for(const y of(snapshot?.dororon?.[p]||active(s,p,'dororon')))queueBattle(s,p,y,[E('Draw',{n:1,optional:true})]);}},
 invasionZeroNonActive1315(s){
  const end=s.endStep;
  if(end?.stage!=='resolve'||end.g1315InvasionZeroChecked||s.decision||s.extTasks?.length||s.triggers||
   s.leaving||s.battleResolution||s.judge||s.attack||s.pendingEffects?.some(entry=>entry.player===s.active))return false;
  end.g1315InvasionZeroChecked=true;
  if(s.g1315UnpaidEntryTurns?.[s.active]!==s.turn)return false;
  const p=1-s.active;
  const declarations=s.players[p].hand.filter(x=>card(x).g1315InvasionZero&&!api.handAbilityIgnored(s,x))
   .map(x=>task('g34_InvasionZeroDeclare1315',p,x.cardId,{uid:x.uid,serial:x.zoneSerial||0}));
  if(!declarations.length)return false;
  put(s,...declarations);
  return true;
 },
 lacrimaActive1224:s=>declareLacrima1224(s,s.active),
 lacrimaNonActive1224(s){
  const end=s.endStep;
  if(end?.stage!=='resolve'||end.g1224LacrimaChecked||s.decision||s.extTasks?.length||s.triggers||s.leaving||s.battleResolution)return false;
  end.g1224LacrimaChecked=true;
  return declareLacrima1224(s,1-s.active);
 },
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
 end(s){if(s.extLimits)s.extLimits=s.extLimits.filter(l=>!(l.kind==='g546Force'&&l.when==='nextOpponent'&&s.active===1-l.controller&&s.turn>l.turn));const out=[...collect537(s,'turnEnd',s.active),...collect537(s,'nextOwnEnd',s.active)];
  for(const x of s.players[s.active].grave){
   const {g971GraveEnd,g971GraveDeployEnd}=card(x);
   const condition=!x.faceDown&&(g971GraveDeployEnd||g971GraveEnd);
   if(condition)out.push({player:s.active,uid:x.uid,source:x.cardId,effect:'extended',
    task:task('g34_GraveReturn754',s.active,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,serial:x.zoneSerial||0,condition,
     ...(g971GraveDeployEnd?{deploy:true}:{})})});
  }
  const remaining501=[];for(const r of s.g501EndDelays||[])if(!r.ownEnd||r.p===s.active)out.push({player:r.p,source:r.source,effect:'extended',task:task('g34_ResolveEnd501',r.p,r.source,{...r})});else remaining501.push(r);s.g501EndDelays=remaining501;for(const t of s.g484BreakEnds||[])if(t.turn===s.turn)out.push({player:t.p,source:t.source,uid:t.uid,effect:'extended',task:task('g34_Sequence',t.p,t.source,{uid:t.uid,incarnation:t.incarnation,defs:[E('BreakReturn484')]})});s.g484BreakEnds=[];for(const t of s.g408EndUntaps||[])if(t.turn===s.turn)out.push({player:t.p,source:t.source,uid:t.g399Attacker.uid,effect:'extended',task:task('g34_AttackUntap408',t.p,t.source,{g399Attacker:t.g399Attacker})});s.g408EndUntaps=[];for(const p of[0,1]){const add=(x,defs,source=x.cardId)=>out.push({player:p,uid:x.uid,source,effect:'extended',task:task('g34_Sequence',p,source,{uid:x.uid,incarnation:x.incarnation||0,defs})});for(const x of s.players[p].battle){if(x.g34Delayed?.turn===s.turn){const d=x.g34Delayed,controller=d.controller??p,source=d.source||x.cardId;out.push({player:controller,uid:x.uid,source,effect:'extended',task:task('g34_DelayedMove532',controller,source,{uid:x.uid,incarnation:x.incarnation||0,to:d.to,...(d.g1704DelayedDraw?{g1704DelayedDraw:true}:{})})});}if(api.ignored(s,x))continue;const r=card(x).g34Role;if(!x.sealed&&effective(x,s).g474AnyEnd)add(x,effective(x,s).g474AnyEnd);
  // Rule 603.4 checks the host's tapped state when the end-step ability resolves.
  if(p===s.active&&(card(x).weaponBlocker||card(x).g1475TappedRelease))add(x,[E('UltoRelease1361')]);
  const manaLeftEnd=card(x).g811ManaLeftEnd;
  if(manaLeftEnd&&s.g47ManaLeft?.[p]===s.turn)add(x,manaLeftEnd);
  if(card(x).g1032ShieldAddedEnd&&!x.sealed&&s.g159ShieldAddedTurns?.[p]===s.turn){
   const defs=effective(x,s).g1032ShieldAddedEnd;
   if(defs)add(x,defs);
  }
  if(card(x).g1204ShieldPlacementEnd&&api.isCreature(s,x)&&s.g1204ShieldPlacements?.turn===s.turn){
   const end=effective(x,s).g1204ShieldPlacementEnd;
   if(end&&s.g1204ShieldPlacements.counts[p]>=end.min)add(x,end.defs);
  }
  if(card(x).g1036ShieldLeftEnd&&!x.sealed&&s.g1036ShieldGroupLeftTurns?.[p]===s.turn){
   const defs=effective(x,s).g1036ShieldLeftEnd;
   if(defs)add(x,defs);
  }
  const conditionalEnd=card(x).g1037ConditionalAnyEnd;
  if(conditionalEnd&&!x.sealed&&(!conditionalEnd.filter||ownCondition(s,p,conditionalEnd.filter,x.uid))){
   const end=effective(x,s).g1037ConditionalAnyEnd;
   if(end)add(x,end.defs);
  }
  const ownShieldBreakEnd=card(x).g861OwnShieldBreakEnd;
  if(ownShieldBreakEnd&&!x.sealed&&!x.faceDown&&api.isCreature(s,x)&&(s.players[p].brokenThisTurn||0)>=ownShieldBreakEnd)
   add(x,[E('ShieldTop',{n:1})]);
  if(p===s.active&&!x.sealed&&(card(x).g1075SelfBreakEnd||card(x).g1159SelfBreakEndReturn)&&
   s.g756Breaks?.turn===s.turn&&s.g756Breaks.players.some(breaks=>breaks.some(refs=>refs.includes(key(x))))){
   const current=effective(x,s);
   if(current.g1075SelfBreakEnd)add(x,[E('ShieldTop',{n:1})]);
   if(current.g1159SelfBreakEndReturn)add(x,[E('SelfHand299')]);
  }
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
 // These effects wait through all end-of-attack work, including Kirifuda Dash (QA49406).
 advanceAfterAttack1197(s){
  if(!s.g1197AfterAttack?.length||s.attackLifecycle||s.attack||s.decision||s.pendingEffects?.length||
   s.extTasks?.length||s.triggers||s.judge||s.leaving||s.battleResolution||s.attackDeclarations||
   s.g19BreakSequence||s.g19Interrupt||s.breakContext||s.winner!==null)return;
  const rows=s.g1197AfterAttack;
  delete s.g1197AfterAttack;
  for(const {p,source,targets} of rows)api.enqueue(s,p,{
   source,effect:'extended',task:task('g34_DestroyAfterAttack1197',p,source,{targets})
  });
 },
 hellReikonAgain1271(s,t){
  const x=live(s,t);
  if(x&&!x.sealed&&effective(x,s).g1271HellReikon)
   queue(s,t.p,x,[{op:'HellReikon1271',repeat:true}]);
 },
 attackEnd(s,a,x){
  if(x&&!x.sealed&&api.isCreature(s,x)){
   const targets=api.allLayers(x).map(layer=>({uid:layer.uid,incarnation:layer.incarnation||0}));
   // The watcher and current attacker are determined at attack end, after any Revolution Change.
   for(const p of [s.active,1-s.active])for(const watcher of creatures(s,p))
    if(card(watcher).g1270DestroyAttacker&&!watcher.sealed&&!api.ignored(s,watcher))
     queue(s,p,watcher,[{op:'DestroyAfterAttack1197',targets,g1270Destroy:true}]);
  }
  if(x&&(a.g1197Deaths?.length||a.g1225AttackDeaths?.length)){
   const targets=api.allLayers(x).map(layer=>({uid:layer.uid,incarnation:layer.incarnation||0}));
   const delayed=(a.g1197Deaths||[]).map(r=>({...r,targets}));
   const startedWith=new Set(a.g1225AttackDeaths);
   const continuing=new Map((x.g34Grants||[]).filter(g=>g.turn===s.turn&&startedWith.has(g.g1225DestroyAfterAttack))
    .map(g=>[g.g1225DestroyAfterAttack,g.g1225ChristoSource]));
   for(const source of continuing.values())delayed.push({p:a.player,source,targets});
   if(delayed.length)s.g1197AfterAttack=delayed;
  }
  if(s.g481Attackers?.turn===s.turn&&s.g481Attackers.events.length===1)for(const p of [s.active,1-s.active])for(const watcher of creatures(s,p)){
   const defs=!watcher.sealed&&effective(watcher,s).g897FirstAttackEnd;
   if(defs)queue(s,p,watcher,defs);
  }
  for(const watcher of s.players[a.player].battle){
   if(card(watcher).g774AllyAttackEnd&&!watcher.sealed&&!api.ignored(s,watcher)&&api.isCreature(s,watcher))
    queue(s,a.player,watcher,[E('Draw',{n:1,optional:true})]);
  }
  const endRefs=[...(a.g543Refs||[]),...(x?api.allLayers(x).map(key):[])];if(a.g543First)for(const r of s.extLimits||[])if(r.kind==='g543Shinka'&&r.when==='firstAttackEnd'&&endRefs.includes(key(r)))api.enqueue(s,r.p,{source:r.source,effect:'extended',task:task('g34_ResolveDelay537',r.p,r.source,{uid:r.uid,incarnation:r.incarnation,defs:[{op:'Untap',g191First:true}]})});for(const r of a.g542After||[])api.enqueue(s,r.p,{source:r.source,effect:'extended',task:task('g34_ResolveDelay537',r.p,r.source,{uid:r.uid,incarnation:r.incarnation,defs:r.defs})});for(const t of a.g176Deaths||[]){const y=s.players[t.p].battle.find(y=>api.allLayers(y).some(z=>z.uid===t.uid&&(z.incarnation||0)===t.incarnation));if(y)api.enqueue(s,t.p,{uid:y.uid,source:t.source,effect:'extended',task:task('g34_ExactMove',t.p,t.source,{owner:t.p,target:y.uid,targetIncarnation:y.incarnation||0,to:'grave'})});}if(!x)return;
  const endCard=effective(x,s);
  if(a.g543First&&!x.sealed&&api.isCreature(s,x))for(const watcher of creatures(s,a.player)){
   const watchedRace=effective(watcher,s).g1324FirstAttackUntapRace;
   if(watchedRace&&race(endCard,watchedRace))
    queue(s,a.player,watcher,[{op:'Untap',g904Refs:endRefs}]);
  }
  // Decide the number at attack end, then resolve each optional use independently (QA 37698).
  const breaks=a.g1271BreakCounts?.[key(x)]||0;
  if(!x.sealed&&endCard.g1271BreakBonus)for(let i=0;i<breaks;i++)
   queue(s,a.player,x,[{op:'Offer',title:'ブレイク・ボーナスを使う？',defs:[endCard.g1271BreakBonus]}]);
  if(!x.sealed&&endCard.g474AttackEnd&&(!endCard.g1020FirstOwnAttack||a.g543First)&&
   (!endCard.g1075AttackEndRequiresBreak||a.g1075BrokeShield))
   queue(s,a.player,x,endCard.g474AttackEnd);
  for(const {source,grants}of endCard.g404Inherited||[])
   if(grants.g474AttackEnd)queue(s,a.player,x,grants.g474AttackEnd,source);
  if(endCard.g34Role==='revvo'&&x.entered===s.turn&&s.players[a.player].shields.length<=2)queue(s,a.player,x,[E('Lock',{limit:{kind:'g34NoLose',player:a.player,expires:'start',who:a.player}})]);if(!colors(effective(x,s)).includes('闇')&&(active(s,0,'baromreizu').length||active(s,1,'baromreizu').length)){for(const p of[0,1])for(const watcher of active(s,p,'baromreizu'))queue(s,p,watcher,[E('ExactMove',{owner:a.player,to:'grave',target:x.uid,targetIncarnation:x.incarnation||0})]);}},
 expire(s,when,p){if(when==='start')for(const own of s.players)for(const x of [...own.mana,...own.battle])if(x.tapLocks)x.tapLocks=x.tapLocks.filter(l=>typeof l!=='object'||l.who!==p||s.players[p].turns<l.afterTurns);if(when==='end'){s.g34Discounts=(s.g34Discounts||[]).filter(x=>x.turn!==s.turn);s.g484BreakEnds=(s.g484BreakEnds||[]).filter(x=>x.turn!==s.turn);}},
 inherit(s,base,x){if(used(s,'g191Tapped',base))mark(s,'g191Tapped',x);if(base.g34Grants)(x.g34Grants??=[]).push(...structuredClone(base.g34Grants));if(base.g34Delayed)x.g34Delayed=structuredClone(base.g34Delayed);},
 selected447(s,p,a,d){
  if(a.kind==='attack')return;
  const v=a.kind==='extended'?d?.choices?.[a.choice]?.value:null;
  const ids=new Set([...(a.targets||[]).map(x=>x.uid),
   ...(['effect','fight','dragonTap'].includes(a.kind)?[a.target||a.uid]:[]),
   ...(typeof v==='string'?[v]:v?.uid?[v.uid]:[])]);
  for(const x of s.players[1-p].battle)if(ids.has(x.uid)&&!x.sealed){
   const c=effective(x,s);
   if(c.g447Selected)queue(s,1-p,x,c.g447Selected);
   for(const {source,grants} of c.g404Inherited||[])
    if(grants.g447Selected)queue(s,1-p,x,grants.g447Selected,source);
  }
 },
 // This trigger originates outside the battlefield, so battlefield-only ability suppression does not apply.
 gsRevealed545(s,p,source,uid){
  const defs=card(source)?.g545GS;
  if(!defs)return;
  const revealed=s.players[p].hand.find(y=>y.uid===uid);
  const queued=defs.map(d=>d.op==='MinogamiReveal1309'?{...d,handSerial:revealed?(revealed.zoneSerial||0):null}:d);
  api.enqueue(s,p,{source,effect:'extended',task:task('g34_ResolveDelay537',p,source,{uid,defs:structuredClone(queued)})});
 },
 evolutionBase397(s,p,x){
  if(x.sealed||!s.players[p].battle.includes(x)||api.ignored(s,x))return;
  const c=effective(x,s),defs=c.g397Shinka;
  if(defs?.some(d=>d.op==='ShinkaHost544'&&d.mode==='belowCost'))send(s,p,x,'Sequence',{defs,g399Attacker:{uid:x.uid,incarnation:x.incarnation||0,cost:null}});
  else if(defs)queue(s,p,x,defs);
  for(const {source,grants}of c.g404Inherited||[])
   if(grants.g397Shinka)queue(s,p,x,grants.g397Shinka,source);
 },
 spellChoiceProtected1674(s,chooser,owner,x){
  return chooser!==owner&&api.isSpellChoice(s)&&!x.sealed&&!x.faceDown&&api.isCreature(s,x)&&
   s.players[owner].battle.some(field=>!field.sealed&&!field.faceDown&&effective(field,s).g1674SpellProtection);
 },
 forced546,jokerCount539,gravePermits294,manaPermits297,protects608,gravePermits1226,consumeGraveUse1226,blockerAura1226,
 permitLabel450(s,p,permit){
  if(typeof permit!=='string')return '';
  if(permit.startsWith('g1288:')){
   const grant=s.extLimits?.find(l=>l.kind==='g1288ManaSummon'&&l.permit===permit);
   return grant?'（'+faces(card(grant.source)).at(-1).name+'・'+(Number(permit.split(':').at(-1))+1)+'回目の発動）':'';
  }
  if(!permit.startsWith('g450:'))return '';
  const i=s.players[p].battle.findIndex(y=>permit==='g450:'+y.uid+'@'+(y.incarnation||0));
  return i<0?'':'（場'+(i+1)+' '+effective(s.players[p].battle[i],s).name+'の能力）';
 },
 crewBreak444(s,p,x,c){const rule=c.g444Crew,f=rule.filter;return 1+s.players[p].battle.filter(y=>!y.sealed&&api.isCreature(s,y)&&(!rule.other||y.uid!==x.uid)).filter(y=>{const d=effective(y,s,true);return(!f.race||race(d,f.race))&&(!f.multi||colors(d).length>1)&&(!f.blocker||d.blocker);}).length;},
 tapScore439(s,p,x,sourceDefs=null){
  const activeDefs=defs=>defs.flatMap(d=>d.op==='IfOwn'?activeDefs(ownCondition(s,p,d.filter,x.uid)?d.defs:d.elseDefs||[]):[d]),defs=activeDefs(sourceDefs||effective(x,s).g439Tap||[]),own=s.players[p],opp=s.players[1-p],t=task('g34_Sequence',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0});
  let score=modeScore(s,t,defs.map(d=>d.op==='ManaBudgetDeploy1655'?manaBudgetDeploy1655(s,p):d).filter(d=>!(d.op==='Target'&&d.owner==='self')))-2;
  for(const d of defs){
   if(d.op==='Look'&&!api.deckLocked(s,p)&&(own.deck?.length??own.deckCount)>1)score+=d.g201Search?10:d.g259OrderTop?4:0;
   if(d.op==='OpponentSelect'){const rows=creatures(s,1-p).filter(y=>!y.sealed&&matches(s,1-p,y,d.filter));if(rows.length)score+=8+Math.min(...rows.map(y=>cost(effective(y,s))*2));}
   if(d.op==='SelfDestroy')score-=8+cost(effective(x,s))*2;
   if(d.op==='Sweep'&&d.both)score-=creatures(s,p).filter(y=>!y.sealed&&matches(s,p,y,d.filter)).reduce((n,y)=>n+12+cost(effective(y,s))*2+api.power(y,false,s)/3000,0);
   if(d.op==='Target'&&d.owner==='self')score+=Math.max(0,...creatures(s,p).filter(y=>y.uid!==x.uid&&!y.tapped&&!y.sealed&&matches(s,p,y,d.filter)).map(y=>{const c=effective(y,s),ready=!c.noAttack&&(y.entered<s.turn||c.speedAttacker||api.isEvolution(y));if(d.g927HasteScore)return hasteScore927(s,y);return ready&&(d.power||d.grant?.slayer&&!c.slayer&&creatures(s,1-p).some(z=>!z.sealed)||d.grant?.unblockable&&!c.unblockable&&opp.battle.some(z=>!z.tapped&&!z.sealed&&effective(z,s).blocker))?8+cost(c):0;}));
  }
  return score;
 },
 summonTapDonors1293,projectSummonTap1293,
 mainActions(s,p){const own=s.players[p],out=graveActions1226(s,p);
  if(creatures(s,p).some(source=>!source.sealed&&!source.faceDown&&effective(source,s).g1792GraveSpell))
  for(const x of own.grave)for(const [face,c]of faces(api.zoneCard(s,p,x,'grave')).entries()){
   const permits=graveSpellPermits1792(s,p,x,c),payment={...c,summonOrigin:'grave',executionUid:x.uid};
   if(!permits.length||!api.canCast(s,p,c,'grave')||!api.canPay(s,p,payment))continue;
   for(const permit of permits)out.push({kind:'play',uid:x.uid,cardId:x.cardId,origin:'grave',face,manaPermit:permit,cost:api.summonCost(s,p,payment),label:c.name+'を墓地から唱える（メルカジーク・1ターンに1度）'});
  }

  for(const origin of ['hand','mana','grave'])for(const x of own[origin]){
   if(!card(x).g1791DiscardSummon)continue;
   const plan=discardSummon1791(s,p,x,origin);if(!plan)continue;
   for(const permit of plan.permits)out.push({kind:'play',alternative:'sixPhoto',role:'discardSummon1791',uid:x.uid,cardId:x.cardId,origin,manaPermit:permit,cost:0,label:plan.c.name+'を手札'+plan.rule.colors.length+'枚を捨てて召喚する'});
  }
  for(const origin of ['hand','mana','grave'])for(const x of own[origin]){
   if(x.faceDown||!card(x).g1293SummonTap)continue;
   const c=api.zoneCard(s,p,x,origin);
   if(api.handAbilityIgnored(s,x)||!api.canCast(s,p,c,origin)||!api.canEnter(s,p,c,{origin,execution:true}))continue;
   const permits=api.costAltPermits568(s,p,x,c,origin);
   if(!permits.length||creatures(s,1-p).some(y=>effective(y,s).noCostReduction))continue;
   for(const donor of summonTapDonors1293(s,p)){
    const view=projectSummonTap1293(s,p,donor.uid);
    const payment={...c,g39Reduction:c.g1293SummonTap,summonOrigin:origin,executionUid:x.uid};
    if(!api.canPay(view,p,payment))continue;
    for(const permit of permits)out.push({kind:'play',alternative:'sixPhoto',role:'summonTap1293',
     uid:x.uid,cardId:x.cardId,origin,manaPermit:permit,tapUid:donor.uid,cost:api.summonCost(view,p,payment),
     label:c.name+'を召喚（'+card(donor).name+'をタップして2軽減）'});
   }
  }
  if(own.hand.length>=13)for(const source of creatures(s,p)){
   const permit='g1088Platinum:'+key(source);
   if(api.ignored(s,source)||!card(source).g1088Platinum||s.once?.[permit]===s.turn)continue;
   for(const x of own.hand)for(const [face,c] of faces(card(x)).entries())
    if(colors(c).includes('水')&&api.canCast(s,p,c,'hand')&&
     (c.type==='spell'||api.canEnter(s,p,c,{origin:'hand',execution:true}))&&(!c.evolution||api.evolutionBases(s,p,c).length))
     out.push({kind:'play',uid:x.uid,face,cardId:x.cardId,origin:'hand',cost:0,manaPermit:permit,
      freeSummon:'アルケミック・プラチナム',label:c.name+'をアルケミック・プラチナムで実行'});
  }
  for(const origin of ['hand','mana','grave'])for(const x of own[origin]){
   if(x.faceDown||!card(x).g1148DestroySummon)continue;
   const plan=destroySummon1148(s,p,x,origin);
   if(!plan)continue;
   const {c,rule,amount,permits}=plan;
   const zone=origin==='grave'?'墓地から':origin==='mana'?'マナから':'';
   for(const permit of permits)out.push({kind:'play',alternative:'sixPhoto',role:'destroySummon1148',
    uid:x.uid,cardId:x.cardId,origin,manaPermit:permit,cost:amount,
    label:c.name+'を'+zone+'召喚（自分の'+rule.count+'体を破壊'+(amount?'・'+amount+'マナ':'')+'）'});
  }
  // Alternative payment changes neither printed civilizations nor zone permissions.
  for(const origin of['hand','mana','grave'])for(const x of own[origin]){
   const c=api.zoneCard(s,p,x,origin),payment=tapCastCost976(c);
   if(!x.faceDown&&payment&&!api.spellIgnored(s,c)&&api.canMoveZone(s,p,origin)&&
      api.canCast(s,p,c,origin,x.cardOwner??p)&&tapCastElements976(s,p,payment).length>=payment.count)
    for(const permit of new Set(api.costAltPermits568(s,p,x,c,origin)))
     out.push({kind:'play',alternative:'sixPhoto',role:'tapCast976',uid:x.uid,cardId:x.cardId,origin,manaPermit:permit,cost:0,
      label:c.name+'：'+payment.label+'タップして唱える'});
  }
  for(const origin of['hand','mana','grave'])for(const x of own[origin]){
   const c=api.zoneCard(s,p,x,origin),r=c.g568Alt;if(x.faceDown||!hasAltPayment568(s,p,origin,r)||!api.canMoveZone(s,p,origin)||!api.canCast(s,p,c,origin)||c.type==='creature'&&!api.canEnter(s,p,c,{origin,execution:true}))continue;
   if(r.g1269Reduction){
    for(const permit of new Set(api.costAltPermits568(s,p,x,c,origin)))for(const base of api.evolutionBases(s,p,c))
     for(const snowReducers of [undefined,...api.snowVariants(s,p,c)]){
      const payment={...c,g1269Reduction:r.g1269Reduction,g27BaseUid:base.uid,summonOrigin:origin,
       executionUid:x.uid,...(snowReducers?{snowReducers}:{})};
      if(api.canPay(s,p,payment))out.push({kind:'play',alternative:'sixPhoto',role:'paidAlt568',uid:x.uid,
       cardId:x.cardId,origin,manaPermit:permit,baseUid:base.uid,...(snowReducers?{snowReducers}:{}),
       cost:api.summonCost(s,p,payment),label:c.name+'を2軽減し、'+card(base).name+'の上に進化させる'});
     }
    continue;
   }
   for(const permit of new Set(api.costAltPermits568(s,p,x,c,origin)))for(const base of[c.neoEvolution?null:undefined,...(c.neoEvolution||c.evolution?api.evolutionBases(s,p,c):[])].filter(base=>!c.evolution||base))for(const snowReducers of[undefined,...api.snowVariants(s,p,c)]){
    const payment={...c,...(origin==='mana'?{civilizations:api.manaColors(c,s,p)}:{}),cost:r.cost,printedCost:c.cost,g568PaymentColors:r.paymentColors,...(r.spell?{g40PayNormally:true}:{}),g27BaseUid:base?.uid??null,summonOrigin:origin,executionUid:x.uid,...(snowReducers?{snowReducers}:{})};
    if(api.canPay(s,p,payment))out.push({kind:'play',alternative:'sixPhoto',role:'paidAlt568',uid:x.uid,cardId:x.cardId,origin,manaPermit:permit,baseUid:base?.uid??null,...(snowReducers?{snowReducers}:{}),cost:api.summonCost(s,p,payment),label:c.name+(r.condition||r.handOnly?'を条件付きの別コストで':'を別コストで')+(origin==='hand'?'':origin==='mana'?'マナから':'墓地から')+(c.type==='spell'?'唱える':'召喚')+(base?'・'+card(base).name+'の上に'+(c.neoEvolution?'NEO':'')+'進化':c.neoEvolution?'・進化させず':'')});
   }
  }

  for(const x of own.mana)for(const[face,c]of faces(card(x)).entries()){
   const permits=manaPermits297(s,p,x,c);
   if(!permits.length||!api.canCast(s,p,c,'mana')||!api.canEnter(s,p,c,{origin:'mana',execution:true})||c.evolution&&!api.evolutionBases(s,p,c).length)continue;
   if(c.gZeroFour&&creatures(s,p).length>=4&&!creatures(s,p).some(y=>y.cardId===x.cardId)){
    const native=permits.find(permit=>!permit.startsWith('g1288:'));
    // The parenthetical reminder does not rule out G-Zero (QA 40933).
    for(const permit of (native?[native]:permits))
     out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,origin:'mana',manaPermit:permit,cost:0,freeSummon:'G・ゼロ',
      label:c.name+'をマナからG・ゼロで召喚する'});
   }
   for(const permit of permits)for(const snowReducers of[undefined,...api.snowVariants(s,p,c)]){if(c.manaSummon&&snowReducers===undefined)continue;const payment={...c,summonOrigin:'mana',executionUid:x.uid,...(snowReducers?{snowReducers}:{})};if(api.canPay(s,p,payment))out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,origin:'mana',manaPermit:permit,...(snowReducers?{snowReducers}:{}),cost:api.summonCost(s,p,payment),label:c.name+'をマナから召喚する'+(snowReducers?'・軽減の使用先を選ぶ':'')});}
  }
  for(const x of own.mana){const c=card(x);if(x.faceDown||c.g296ManaBirth===undefined||!api.canCast(s,p,c,'mana')||!api.canEnter(s,p,c,{origin:'mana',execution:true}))continue;
   // Evolution Mana Birth must carry the chosen base through payment and entry.
   const bases=c.evolution?api.evolutionBases(s,p,c).filter(y=>y.uid!==x.uid):[null];
   for(const base of bases){
   const evolution=base?{baseUid:base.uid}:{},baseLabel=base?'・'+card(base).name+'の上に進化':'';
   if(c.g296ManaBirth===0){
    out.push({kind:'play',alternative:'sixPhoto',role:'manaBirth296',uid:x.uid,cardId:x.cardId,origin:'mana',...evolution,cost:0,
     label:c.name+'をマナ爆誕（0マナ）で召喚'+baseLabel});
    continue;
   }
   for(const snowReducers of[undefined,...api.snowVariants(s,p,c)]){const payment={...c,cost:c.g296ManaBirth,printedCost:c.cost,summonOrigin:'mana',executionUid:x.uid,...(base?{g27BaseUid:base.uid}:{}),...(snowReducers?{snowReducers}:{})};if(api.canPay(s,p,payment))out.push({kind:'play',alternative:'sixPhoto',role:'manaBirth296',uid:x.uid,cardId:x.cardId,origin:'mana',...evolution,...(snowReducers?{snowReducers}:{}),cost:api.summonCost(s,p,payment),label:c.name+'をマナ爆誕で召喚（'+api.summonCost(s,p,payment)+'マナ）'+baseLabel+(snowReducers?'・軽減の使用先を選ぶ':'')});}}}

  for(const x of own.grave)for(const[face,c]of faces(card(x)).entries()){
   const permits=gravePermits294(s,p,x,c),payment={...c,summonOrigin:'grave',executionUid:x.uid};
   if(!permits.length||!api.canCast(s,p,c,'grave')||!api.canEnter(s,p,c,{origin:'grave',execution:true})||c.evolution&&!api.evolutionBases(s,p,c).length||!api.canPay(s,p,payment))continue;
   for(const permit of permits)out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,origin:'grave',manaPermit:permit,cost:api.summonCost(s,p,payment),label:c.name+'を墓地から召喚する'});
  }
for(const x of own.hand){const c=card(x),r=c.g34Role;if(!api.canCast(s,p,c,'hand')||c.type==='creature'&&!api.canEnter(s,p,c,{origin:'hand',execution:true}))continue;let okay=false;if(r==='sirius')okay=creatures(s,p).filter(y=>angel(effective(y,s))&&!y.tapped&&api.canUntap(y)).length>=5;if(r==='zero')okay=own.hand.filter(y=>y!==x&&colors(card(y)).includes('闇')).length>=3&&creatures(s,p).filter(y=>colors(effective(y,s)).includes('闇')&&api.canLeave(s,p,y)).length>=3;if(r==='reiai')okay=own.battle.filter(y=>api.canLeave(s,p,y)).length>=2&&api.canPay(s,p,{...c,cost:5,civilizations:['光','闇','自然'],fixedPayment:true});if(okay)out.push({kind:'play',alternative:'sixPhoto',uid:x.uid,cardId:x.cardId,role:r,label:c.name+'を代替コストで使う',cost:r==='reiai'?5:0});}return out;},
 alternative(s,p,a){
  if(a.role==='discardSummon1791'){put(s,task('g34_DiscardSummon1791',p,a.cardId,{uid:a.uid,serial:s.players[p][a.origin].find(x=>x.uid===a.uid)?.zoneSerial||0,origin:a.origin,permit:a.manaPermit,selected:[]}));return;}
  if(a.role==='summonTap1293'){
   cast(s,p,a.uid,false,null,0,{g39Reduction:card(a.cardId).g1293SummonTap,g976TapPayment:[a.tapUid]},
    a.origin,'召喚時のコスト軽減',false,a.manaPermit);
   return;
  }
  if(a.role==='destroySummon1148'){
   put(s,task('g34_DestroySummon1148',p,a.cardId,{uid:a.uid,origin:a.origin,permit:a.manaPermit??null,selected:[]}));
   return;
  }
  if(a.role==='tapCast976'){
   put(s,task('g34_TapCast976',p,a.cardId,{uid:a.uid,origin:a.origin,permit:a.manaPermit??null,selected:[]}));
   return;
  }
  if(a.role==='paidAlt568'){
   const origin=a.origin||'hand',x=s.players[p][origin].find(x=>x.uid===a.uid),c=x&&api.zoneCard(s,p,x,origin),r=c?.g568Alt;
   if(!hasAltPayment568(s,p,origin,r)||!api.costAltPermits568(s,p,x,c,origin).includes(a.manaPermit))
    throw Error('別コストの使用条件を満たしていません');
   const payment={...(r.g1269Reduction?{g1269Reduction:r.g1269Reduction}:{cost:r.cost,g568PaymentColors:r.paymentColors}),
    ...(r.g1117MoveToExtra?{g1117MoveToExtra:true}:{}),
    ...(r.end?{g1221AltEnd:true}:{}),
    ...(r.entry?{g777AltEntry:true}:{}),...(r.spell?{g1023PaidAltSpell:true,g40PayNormally:true}:{}),
    ...(origin==='mana'?{civilizations:api.manaColors(c,s,p)}:{})};
   cast(s,p,a.uid,false,a.baseUid??null,0,payment,origin,'条件付き別コスト',false,a.manaPermit,a.snowReducers??null);
   return;
  }
  if(a.role==='recycle416'){const c=card(a.cardId);if(c.g416RecycleCost)cast(s,p,a.uid,false,null,a.face||0,{cost:c.g416RecycleCost,g40PayNormally:true},'grave','リサイクル',true);return;}if(a.role==='manaBirth296'){
   const amount=card(a.cardId).g296ManaBirth;
   cast(s,p,a.uid,amount===0,a.baseUid??null,0,amount===0?null:{cost:amount},'mana','マナ爆誕',false,null,a.snowReducers??null);
   return;
  }put(s,task('g34_Custom',p,a.cardId,{name:'alternative',uid:a.uid,role:a.role,selected:[]}));},
 };
 // Keep the ordinary spell payment and face selection; only zone permission and
 // the resulting finish destination are granted by each live source.
 function graveSpellPermits1792(s,p,x,c){
  if(s.active!==p||c.type!=='spell'||x.faceDown||!api.canMoveZone(s,p,'grave'))return [];
  return creatures(s,p).flatMap(source=>{
   const permit='g1792:'+key(source);
   return !source.sealed&&!source.faceDown&&effective(source,s).g1792GraveSpell&&s.g450ZoneUses?.[p]?.[permit]!==s.turn?[permit]:[];
  });
 }
 function discardSlotLabel1791(slot){return typeof slot==='string'?slot:slot.colorsAny.join('または')+(slot.creature?'のクリーチャー':'');}
 // Reserve all distinct hand cards before paying. A replacement cost cannot
 // itself be replaced (QA45791), and every remaining slot must be completable.
 function discardSummon1791(s,p,x,origin,selected=[]){
  const c=api.zoneCard(s,p,x,origin),rule=c.g1791DiscardSummon,own=s.players[p];
  if(!rule||x.faceDown||api.handAbilityIgnored(s,x)||own.mana.length<(rule.minMana||0)||
     !api.canMoveZone(s,p,origin)||!api.canCast(s,p,c,origin)||
     !api.canEnter(s,p,c,{origin,execution:true})||!api.canExecuteUnpaid(s,p,c))return null;
  const permits=[...new Set(api.costAltPermits568(s,p,x,c,origin))];if(!permits.length)return null;
  const hand=own.hand.filter(y=>y.uid!==x.uid),matches=(y,slot)=>{const c=api.zoneCard(s,p,y,'hand');return typeof slot==='string'?colors(c).includes(slot):faces(c).some(f=>(!slot.creature||f.type==='creature')&&(f.civilizations||String(f.civ).split('/')).some(color=>slot.colorsAny.includes(color)));};
  if(selected.length>rule.colors.length||new Set(selected).size!==selected.length||selected.some((uid,i)=>!hand.some(y=>y.uid===uid&&matches(y,rule.colors[i]))))return null;
  const complete=(i,used)=>i===rule.colors.length||hand.some(y=>!used.includes(y.uid)&&matches(y,rule.colors[i])&&complete(i+1,[...used,y.uid]));
  if(!complete(selected.length,selected))return null;
  const rows=selected.length===rule.colors.length?[]:hand.filter(y=>!selected.includes(y.uid)&&matches(y,rule.colors[selected.length])&&complete(selected.length+1,[...selected,y.uid]));
  return {c,rule,permits,rows};
 }
 function tapCastCost976(c){
  const rule=c.g976TapCast;
  if(!rule)return null;
  const {color,type,count=2,filter}=typeof rule==='string'?{color:rule,type:'creature'}:rule;
  const label=(color||filter?.race||'自分')+(type==='seed'?'のタマシードを'+count+'枚':'のクリーチャーを'+count+'体');
  return {color,type,count,label,...(filter?{filter}:{})};
 }
 function tapCastElements976(s,p,{color,type,filter}){
  const eligible=type==='seed'?s.players[p].battle.filter(x=>{
   const raw=api.zoneCard(s,p,x,'battle');
   return raw.type==='seed'||raw.seedCreature||raw.natureAce4;
  }):creatures(s,p);
  return eligible.filter(x=>!x.sealed&&!x.faceDown&&!x.tapped&&(!color||colors(effective(x,s,true)).includes(color))&&(!filter||matches(s,p,x,filter)));
 }
 function destroySummon1148(s,p,x,origin){
  const c=api.zoneCard(s,p,x,origin),rule=c.g1148DestroySummon,own=s.players[p];
  if(!rule||rule.origin&&rule.origin!==origin||own.shields.length<(rule.minShields??0)||
   !api.canCast(s,p,c,origin)||!api.canEnter(s,p,c,{origin,execution:true}))return null;
  const permits=rule.origin===origin?[null]:[...new Set(api.costAltPermits568(s,p,x,c,origin))];
  if(!permits.length||rule.reduction&&creatures(s,1-p).some(y=>!y.sealed&&effective(y,s).noCostReduction))return null;
  const rows=creatures(s,p).filter(y=>!y.sealed&&(rule.reduction||
   api.canLeave(s,p,y,{destroy:true})&&!hooks.destroySafe409(s,y)&&!hooks.zeroSafe(s,y)&&
   !(effective(y,s).caddy&&api.manaMoveForbidden(s,p))));
  if(rows.length<rule.count)return null;
  const payment=rule.reduction?{g39Reduction:rule.reduction}:rule.cost===0?
   {cost:0,g568PaymentColors:[],fixedPayment:true}:{cost:rule.cost,g568PaymentColors:['闇']};
  const quote={...c,...payment,printedCost:c.cost,summonOrigin:origin,executionUid:x.uid};
   const amount=api.summonCost(s,p,quote);
  if(api.zeroManaCost1358(quote,amount)&&!api.canExecuteUnpaid(s,p,c)||!api.canPay(s,p,quote))return null;
  return {c,rule,rows,permits,payment,amount};
 }
 function hasAltPayment568(s,p,origin,r){
  return !!r&&(!r.g1269Reduction||!creatures(s,1-p).some(x=>effective(x,s).noCostReduction))&&
   (!r.origin||origin===r.origin)&&(!r.handOnly||origin==='hand'&&s.players[p].hand.length===1)&&(!r.condition||ownCondition(s,p,r.condition));
 }
 function magicToolUse976(s,p){
  for(const x of s.players[p].grave)
   if(!x.faceDown&&card(x).g976MagicToolUse)
    send(s,p,x,'GraveSummonWatch766',{serial:x.zoneSerial||0});
 }
 function noncreatureUse448(s,p,c,watchOwner=p){if(c.type==='creature')return;if(c.type==='spell'||c.type==='aura')for(const x of creatures(s,watchOwner)){const defs=!x.sealed&&effective(x,s).g1517SpellAuraWatch;if(defs)queue(s,watchOwner,x,defs);}const prev=s.g448NoncreatureUses?.[p];(s.g448NoncreatureUses??=[null,null])[p]={turn:s.turn,n:prev?.turn===s.turn?prev.n+1:1};}
 const magicTerminal1292=(s,p)=>s.extLimits?.find(l=>l.kind==='g1292MagicTerminal'&&l.player===p);
 function terminalUse1292(s,p,c){
  const rule=magicTerminal1292(s,p);
  if(rule&&race(c,'マジック'))api.enqueue(s,p,{source:rule.source,effect:'extended',
   task:task('g34_Draw',p,rule.source,{n:1,optional:true})});
 }
 function countExecution(s,p,c){const prev=s.g34Executions?.[p];(s.g34Executions??=[null,null])[p]={turn:s.turn,n:prev?.turn===s.turn?prev.n+1:1};if(s.active===p&&cost(c)<=9)for(const x of active(s,1-p,'dokindante'))queue(s,1-p,x,[E('Draw',{n:1,optional:true}),exec('hand',9,{spellOnly:true})]);}

 const fifteen=createFifteenPhotoRules({...api,start,tasks,send,key,live,matches,canPut,notifyUntapped:(s,p,x)=>combined.untapped(s,p,x)});
 const combined={...hooks};
 for(const k of ['entry','attack','attackStart','tapped','untapped','shieldLeft','graveAdded','played','spellCast','leaving','attackEnd','expire','inherit']){const a=hooks[k],b=fifteen[k];if(b)combined[k]=(...args)=>{a?.(...args);b(...args);};}
 for(const k of ['turnStart','end','mainActions'])combined[k]=(...args)=>[...(hooks[k]?.(...args)||[]),...(fifteen[k]?.(...args)||[])];
 for(const k of ['allowedCast','canLeave'])combined[k]=(...args)=>(hooks[k]?.(...args)??true)&&(fifteen[k]?.(...args)??true);
 for(const k of ['shieldTrigger','noLose'])combined[k]=(...args)=>!!hooks[k]?.(...args)||!!fifteen[k]?.(...args);
 combined.decorate=(s,p,x,c)=>fifteen.decorate(s,p,x,hooks.decorate(s,p,x,c));
 combined.discount=(...args)=>{
  const discount=hooks.discount(...args);
  return {amount:discount.amount+fifteen.discount(...args),zeroAmount:discount.zeroAmount};
 };
 combined.snapshot=(s,leaving)=>({...hooks.snapshot(s,leaving),fifteen:fifteen.snapshot(s)});
 combined.leaving=(s,p,x,snapshot,to,destroy)=>{hooks.leaving(s,p,x,snapshot,to,destroy);fifteen.leaving(s,p,x,snapshot?.fifteen,to,destroy);};
 return{...combined,fifteen,turboReady756, hyperEntry781(s,p,x,source){
  releaseHyper781(s,p,x);
  applyGrant(s,{p,source,spell:true,g521UntilStart:true,grant:{blocker:true}},x);
 }, deploymentGrant791(s,p,x,grant,source,fight){
  applyGrant(s,{p,source,grant,g521UntilStart:true,spell:true},x);
  if(fight)put(s,task('g34_FightEnemy240',p,source,{fighter:{uid:x.uid,incarnation:x.incarnation||0},optional:true}));
 }, deploymentSpeed771(s,p,x,source,returnAtOpponentStart,fromCreature){
  applyGrant(s,{p,source,spell:!fromCreature,grant:{speedAttacker:true,...(returnAtOpponentStart?{g774Permanent:true}:{})}},x);
  if(returnAtOpponentStart)(s.g537Delays??=[]).push({
   p,who:1-p,source,spellCost:cost(faces(card(source)).at(-1)),uid:x.uid,incarnation:x.incarnation||0,
   turn:s.turn,when:'nextOwnStart',defs:[E('DelayedMove532',{to:'hand',g774Banky:true})]
  });
 }, afterSpell566(s,f){
  const p=f.caster??f.owner,spell=f.spell;
  if(!f.virtual&&spell?.g1489SuperRecast&&spell.superTriggerActive&&spell.summonOrigin==='hand'&&f.owner===p&&f.to==='grave'&&!api.spellIgnored(s,spell))
   put(s,task('g34_RecastHandSpell1245',p,spell.id,{target:f.inst.uid,serial:f.inst.zoneSerial||0,face:0}));
  if(spell?.g566EvoCharger&&!api.spellIgnored(s,spell))put(s,task('g34_EvoCharge566',p,spell.id,{}));
  if(!f.virtual&&spell?.g1284CivilRecast&&spell.summonOrigin==='hand'&&f.owner===p&&f.to==='grave'&&
     !api.spellIgnored(s,spell)&&ownCondition(s,p,spell.g1284CivilRecast))
   put(s,task('g34_RecastFromGrave1245',p,spell.id,{target:f.inst.uid,serial:f.inst.zoneSerial||0,face:0}));
 },
weakerBlock569(s,a,b){const p=s.players.findIndex(own=>own.battle.includes(a));if(p<0)return false;const fromSpell=(s.extLimits||[]).some(l=>l.kind==='g569WeakerBlock'&&api.allLayers(a).some(y=>key(y)===key(l.ref))&&!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource})),fromAura=creatures(s,p).some(x=>{if(x.sealed||api.ignored(s,x))return false;const r=effective(x,s).g569Aura;return r&&matches(s,p,a,r.filter)&&(!r.mana||s.players[p].mana.filter(y=>api.manaColors(card(y),s,p).includes(r.mana.color)).length>=r.mana.n);});return (fromSpell||fromAura)&&api.power(b,false,s)<api.power(a,true,s);},
attackPower593(s,p,x,playerOnly){
 const locks=(s.extLimits||[]).filter(l=>l.kind==='g593AttackPower'&&l.playerOnly===playerOnly&&
  (l.player===null||l.player===p)&&(l.ref||!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource})));
 const powerLimitKey=playerOnly?'g1607OpponentPlayerPowerMax':'g1067OpponentAttackPowerMax';
 const sources=s.players[1-p].battle.filter(y=>!y.sealed&&card(y)[powerLimitKey]!==undefined&&api.isCreature(s,y));
 if(!locks.length&&!sources.length||creatures(s,p).some(y=>effective(y,s).ignoreAttackLocks))return false;
 const attackerPower=api.power(x,false,s);
 if(sources.some(y=>attackerPower<=effective(y,s)[powerLimitKey]))return true;
 return locks.some(l=>{
  if(!l.ref)return attackerPower<=l.max;
  const host=sourceHost474(s,l.ref)?.x;
  // This resolved restriction requires a live power to compare (QA43081).
  return !!host&&!host.sealed&&api.isCreature(s,host)&&attackerPower<api.power(host,false,s);
 });
},
playerStop567(s,p,x){if(playerStopReading567.has(s))return false;const locks=(s.extLimits||[]).filter(l=>l.kind==='g567PlayerStop'&&(l.ref?api.allLayers(x).some(y=>key(y)===key(l.ref)):l.player===p)&&(l.spellCost===undefined||!api.spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource})));if(!locks.length)return false;playerStopReading567.add(s);try{return locks.some(l=>(!l.g1660Color||colors(effective(x,s)).includes(l.g1660Color))&&(l.controller===p||!creatures(s,p).some(y=>effective(y,s).ignoreAttackLocks)));}finally{playerStopReading567.delete(s);}},
externalProtection565,
 manaValue1282(s,p){
  return s.players[p].battle.some(x=>{
   const condition=card(x).g1282ManaValue;
   return condition&&!x.sealed&&!x.faceDown&&api.isCreature(s,x)&&!api.ignored(s,x)&&ownCondition(s,p,condition,x.uid);
  });
 },
 civilProtection1280(s,p,x){
  if(x.sealed||x.faceDown||!s.players[p].battle.some(y=>y!==x&&card(y).g1280CivilProtection))return false;
  if(!api.isCreature(s,x)&&!matches(s,p,x,{g295Tamaseed:true}))return false;
  return s.players[p].battle.some(y=>{
   const filter=card(y).g1280CivilProtection;
   return y!==x&&filter&&!y.sealed&&!y.faceDown&&api.isCreature(s,y)&&!api.ignored(s,y)&&
    ownCondition(s,p,filter,y.uid);
  });
 },
 blockBreakSpellProtection1280(s,p,owner,x){
  return p!==owner&&api.isSpellChoice(s)&&api.isCreature(s,x)&&s.extLimits?.some(rule=>
   rule.kind==='g712BlockBreak'&&rule.allCreatures&&rule.player===owner&&rule.turn===s.turn&&
   !api.spellIgnored(s,{type:'spell',cost:rule.spellCost,spellSource:rule.source}));
 },
 kachuaDragon(s,p,host,{g1082Dragon:source,g31Partner}){
  const linked=[host,...(host.godLinks||[])].map(x=>({uid:x.uid,incarnation:x.incarnation||0}));
  if(g31Partner)for(const delay of s.g537Delays||[]){
   const effect=delay.defs[0];
   if(effect?.g1082Dragon&&effect.g403Refs.some(ref=>linked.some(x=>key(x)===key(ref))))
    effect.g403Refs=linked;
  }
  if(!source)return;
  applyGrant(s,{p,source,grant:{speedAttacker:true}},host);
  (s.g537Delays??=[]).push({p,source,when:'turnEnd',turn:s.turn,
   defs:[{op:'ExactMove',owner:p,to:'grave',g403Refs:linked,followEvolution:true,g1082Dragon:true}]});
 },run,chosen,creatureBreakCount1342,matches,hasSoul,ownCondition,canPut,countDraw,modeScore,recoveryScore326,spellWatches,attackDraws613,seedWatches548,entryPlan549,auraPower,countPower,grantAuras,send,tasks,start,race,mecha,ninja,angel,demon,key,live,
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
 reductionSpeedSources1305:(s,p,c)=>reductions456(s,p,c).filter(r=>r.g1305Speed).map(r=>r.source),
 entryShieldForce1304(s,p,x,baseUid,entryOptions){
  const own=s.players[p];
  if(!own.shields.length)return false;
  (own.g34Holding??=[]).push(x);
  put(s,task('g34_EntryShieldForce1304',p,x.cardId,{target:x.uid,baseUid,entryOptions:structuredClone(entryOptions)}));
  return true;
 },
 effect(s,p,c,uid,entry){
  if(c.effect!=='sixPhoto')return false;
  const incarnation=entry?.incarnation??(s.players[p].battle.find(x=>x.uid===uid)?.incarnation||0);
  const defs=c.g437Super?[...(c.g34Tasks||[]),...(entry?.super?c.g437Super:[])]:entry?.plus&&c.g34Plus?
   (c.g451PlusAfter?[...(c.g34Tasks||[]),...c.g34Plus]:[...c.g34Plus,...(c.g34Tasks||[])]):c.g34Tasks;
  const body=entry?.g1118KnightBodyOnly?defs?.filter(d=>d.op!=='KnightMagic1118'&&d.op!=='KingKnightMagic1115'):defs;
  start(s,{p,source:c.id,uid,incarnation,g692LastPower:entry?.g692LastPower,g1184LastRaces:entry?.g1184LastRaces},body?.map(def=>def.op==='BouncePerSourceCard1060'?
   {...def,lastKnownCount:entry?.lastKnownCount}:def));
  return true;
 },
 };
}
