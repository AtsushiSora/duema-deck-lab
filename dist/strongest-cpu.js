import {card,playFaces,civilizations,validateDeck,manaPayment,manaValue} from './engine.js';
import {ONLINE_COMPATIBILITY} from './online-compatibility.js?v=0.481.0';
export const STRONGEST_BUILD_VERSION=1;
const finite=n=>Number.isFinite(Number(n))?Number(n):30;
const rowsSignature=rows=>{const counts=new Map();for(const r of rows||[])counts.set(r.id,(counts.get(r.id)||0)+r.count);return JSON.stringify([...counts].sort(([a],[b])=>a.localeCompare(b)));};
export function strongestDeckKey(deck){return JSON.stringify([STRONGEST_BUILD_VERSION,ONLINE_COMPATIBILITY.engineVersion,ONLINE_COMPATIBILITY.rulesHash,deck?.format||'original',deck?.historicalId||'',rowsSignature(deck?.cards)]);}
const rampEffects=new Set(['ramp1','ramp2','dragonRamp2','ramp2Return1','dogiRamp','girlsRupia']);
const removalEffects=new Set(['destroy','destroySmall','destroyUntapped','destroy6000','bounce','bounceSmall','vtBounce','superheroSweep','tapAll','abyssMakua']);
const features=c=>{const faces=playFaces(c),text=String(c.text||'');return {faces,colors:[...new Set(faces.flatMap(civilizations))],cost:Math.min(...faces.map(f=>finite(f.cost))),bodyCost:Math.min(...faces.filter(f=>f.type==='creature').map(f=>finite(f.cost))),body:faces.some(f=>f.type==='creature'),attacker:faces.some(f=>f.type==='creature'&&!f.noAttack&&!f.noPlayerAttack),fast:faces.some(f=>f.speedAttacker||f.invasion||f.rev),block:faces.some(f=>f.blocker||f.slayer),trigger:faces.some(f=>f.trigger||f.gStrike),ramp:faces.some(f=>rampEffects.has(f.effect)),removal:faces.some(f=>removalEffects.has(f.effect)),grave:/墓地から|墓地にある|墓地の.*召喚/.test(text)||!!c.graveSummon||!!c.mugenCrime,spell:faces.some(f=>f.type==='spell'),cheat:/コストを支払わず|召喚せず/.test(text)||!!c.rev||!!c.invasion||!!c.mugenCrime,graveHate:/相手の墓地.*(?:山札|マナ)|墓地.*置くかわり/.test(text)||!!c.graveGate,cheatHate:!!(c.tokoshie||c.oniBounce||c.noNonsummonEntry||c.handEntryOnly||c.entryGate),spellHate:!!(c.spellLockMaxCost||c.travelSpellLock||c.shiroLock||c.g32Dolf||c.genmu),draw:faces.some(f=>/draw|search/i.test(f.effect||'')),race:String(c.race||'')};};
export function analyzeStrongestTarget(deck){
 const counts={cheap:0,fast:0,spell:0,grave:0,cheat:0,large:0,body:0},costs=new Map();let cost=0;
 for(const r of deck.cards){const f=features(card(r.id));cost+=f.cost*r.count;for(const key of ['fast','spell','grave','cheat','body'])if(f[key]&&(key!=='fast'||f.bodyCost<=5))counts[key]+=r.count;if(f.body&&f.bodyCost<=3)counts.cheap+=r.count;if(f.body&&f.bodyCost>=7)counts.large+=r.count;const n=Math.min(20,f.cost);costs.set(n,(costs.get(n)||0)+r.count);}
 const weights={rush:Math.min(1,(counts.cheap+counts.fast)/22),spells:counts.spell/40,grave:Math.min(1,counts.grave/12),cheat:Math.min(1,counts.cheat/12),large:Math.min(1,counts.large/16)};
 const labels={rush:'序盤の攻めへの防御・除去',spells:'呪文中心の展開を妨害',grave:'墓地利用を抑える',cheat:'踏み倒し・特殊な登場を牽制',large:'大型が並ぶ前の攻めと除去'};
 const priorities=Object.entries(weights).sort((a,b)=>b[1]-a[1]);return {counts,weights,averageCost:cost/40,priorities:priorities.filter(([,n])=>n>=.2).slice(0,3).map(([key])=>labels[key]),main:priorities[0][0],commonCost:[...costs].sort((a,b)=>b[1]-a[1])[0]?.[0]||0};
}
const learningKeys=['rush','spells','grave','cheat','large'];
const bounded=(value,max=1000)=>Number.isFinite(value)?Math.max(0,Math.min(max,value)):0;
export function normalizeStrongestLearning(value,target){
 const key=strongestDeckKey(target),valid=value?.key===key,rows=new Set((target?.cards||[]).map(r=>r.id));
 return {key,revision:valid?Math.floor(bounded(value.revision,1000000)):0,losses:valid?Math.floor(bounded(value.losses)):0,weights:Object.fromEntries(learningKeys.map(k=>[k,valid?bounded(value.weights?.[k],2):0])),threats:valid&&Array.isArray(value.threats)?value.threats.filter(x=>rows.has(x?.id)&&bounded(x.score)>0).slice(0,12).map(x=>({id:x.id,score:bounded(x.score,100)})):[],failed:valid&&Array.isArray(value.failed)?value.failed.filter(x=>typeof x?.signature==='string'&&x.signature.length<=4000&&bounded(x.losses)>0).slice(0,8).map(x=>({signature:x.signature,losses:Math.ceil(bounded(x.losses,100))})):[],games:valid&&Array.isArray(value.games)?value.games.filter(x=>typeof x==='string'&&x.length<=128).slice(-32):[]};
}
// Learn only from cards actually played/attacked with and public turn counts.
// Hidden hands, shields and deck order are never inspected or retained.
export function learnStrongestDefeat(previous,battle){
 const target=battle?.decks?.[0],s=battle?.state,game=battle?.manualGame;
 if(!target||!battle.strongestCPU||s?.winner!==0||!game||battle.strongestCPU.key!==strongestDeckKey(target))return previous;
 const old=normalizeStrongestLearning(previous,target);if(old.games.includes(game))return previous;
 const ids=new Map();for(const r of target.cards)for(const face of playFaces(card(r.id)))ids.set(face.id,r.id);
 const played=new Map(),attacks=new Map();for(const [id,n]of Object.entries(s.metrics?.[0]?.played||{})){const base=ids.get(id)||id;if(target.cards.some(r=>r.id===base))played.set(base,(played.get(base)||0)+bounded(n,20));}
 for(const event of s.log||[]){if(event.player!==0)continue;const id=ids.get(event.cardId)||event.cardId;if(!target.cards.some(r=>r.id===id))continue;if(event.type==='attack')attacks.set(id,(attacks.get(id)||0)+1);else if(['play','trigger','gaiaSummon','enter'].includes(event.type)&&!played.has(id))played.set(id,1);}
 const signals=Object.fromEntries(learningKeys.map(k=>[k,0])),threats=new Map(old.threats.map(x=>[x.id,x.score*.7]));let total=0;
 for(const id of new Set([...played.keys(),...attacks.keys()])){const score=Math.min(12,(played.get(id)||0)+(attacks.get(id)||0)*2),f=features(card(id));total+=score;threats.set(id,Math.min(100,(threats.get(id)||0)+score));if(f.body&&(f.bodyCost<=3||f.fast))signals.rush+=score;if(f.spell)signals.spells+=score;if(f.grave)signals.grave+=score;if(f.cheat)signals.cheat+=score;if(f.body&&f.bodyCost>=7)signals.large+=score;}
 const turns=s.metrics?.[0]?.turns||0;if(turns>0&&turns<=4&&(s.metrics?.[0]?.breaks||attacks.size))signals.rush+=Math.max(1,total)*.5;
 const weights=Object.fromEntries(learningKeys.map(k=>[k,Math.min(2,old.weights[k]*.65+(signals[k]/Math.max(1,total))*.7)]));
 const signature=rowsSignature(battle.strongestCPU.deck.cards),failed=old.failed.find(x=>x.signature===signature);
 return {key:old.key,revision:old.revision+1,losses:Math.min(1000,old.losses+1),weights,threats:[...threats].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12).map(([id,score])=>({id,score})),failed:[{signature,losses:Math.min(100,(failed?.losses||0)+1)},...old.failed.filter(x=>x.signature!==signature)].slice(0,8),games:[...old.games,game].slice(-32)};
}

function utility(c,f,profile){
 const w=profile.weights;let v=6+(f.body?Math.min(8,finite(c.power)/1500):0)+(f.attacker?4:0)+(f.cost<=3?5:0)+(f.draw?6:0)+(f.ramp?7:0)+(f.trigger?4:0)+(f.fast?5:0)+(f.removal?5:0);
 v+=(f.block?13:0)*w.rush+(f.trigger?16:0)*w.rush+(f.removal?9:0)*Math.max(w.rush,w.large)+(f.spellHate?35:0)*w.spells+(f.cheatHate?35:0)*w.cheat+(f.graveHate?32:0)*w.grave+(f.fast?9:0)*w.large;
 if(c.effect==='magicNumberLock')v+=8+profile.weights.spells*15;if(f.cost>7)v-=Math.min(18,(f.cost-7)*4);if(!f.attacker&&f.body)v-=4;
 return v;
}
const countRows=rows=>new Map(rows.map(r=>[r.id,r.count]));
const asRows=map=>[...map].filter(([,n])=>n>0).map(([id,count])=>({id,count})).sort((a,b)=>a.id.localeCompare(b.id));
function structuralScore(rows,info,utilities,base){
 let score=0,early=0,attackers=0,high=0,ramp=0,overlap=0;const colors=new Map(),races=new Map();
 for(const {id,count}of rows){const f=info.get(id);score+=(utilities.get(id)||0)*count;if(f.cost<=3)early+=count;if(f.attacker)attackers+=count;if(f.bodyCost>=6&&f.body||!f.body&&f.cost>=6)high+=count;if(f.ramp)ramp+=count;overlap+=Math.min(base.counts.get(id)||0,count);for(const color of f.colors)colors.set(color,(colors.get(color)||0)+count);for(const race of base.races)if(f.race.includes(race))races.set(race,(races.get(race)||0)+count);}
 if(overlap<28||attackers<Math.min(8,base.attackers)||high<Math.min(4,base.high))return -Infinity;
 score-=Math.max(0,12-early)*14+Math.max(0,high-12)*8+Math.max(0,ramp-12)*5;
 for(const color of base.colors)score-=Math.max(0,Math.min(8,base.sources.get(color)||0)-(colors.get(color)||0))*12;
 for(const race of base.races)score-=Math.max(0,(base.raceCounts.get(race)||0)-4-(races.get(race)||0))*7;
 return score;
}
export function buildStrongestCPU(target,seeds,implemented,{onProgress=()=>{},learning=null,previousBuild=null}={}){
 const errors=validateDeck(target);if(errors.length)throw Error(errors[0]);const feedback=normalizeStrongestLearning(learning,target),profile=analyzeStrongestTarget(target);
 for(const k of learningKeys)profile.weights[k]=Math.min(3,profile.weights[k]+feedback.weights[k]*Math.min(1.5,.5+feedback.losses*.1));
 const info=new Map(implemented.map(c=>[c.id,features(c)])),utilities=new Map(implemented.map(c=>[c.id,utility(c,info.get(c.id),profile)])),failed=new Map(feedback.failed.map(x=>[x.signature,x.losses]));
 const scoreDeck=(rows,base)=>structuralScore(rows,info,utilities,base)-Math.min(240,(failed.get(rowsSignature(rows))||0)*80);
 if(validStrongestBuild(previousBuild,target))seeds=[{...previousBuild.deck,name:'前回の対策デッキ'},...seeds];
 const seen=new Set(),valid=[];
 for(const d of seeds){const rows=asRows(countRows(d.cards||[])),plain={cards:rows,format:'original'},sig=rowsSignature(rows);if(seen.has(sig)||validateDeck(plain).length)continue;seen.add(sig);
  const counts=countRows(rows),colors=[...new Set(rows.flatMap(r=>info.get(r.id).colors))],sources=new Map(colors.map(color=>[color,rows.reduce((n,r)=>n+(info.get(r.id).colors.includes(color)?r.count:0),0)])),raceCounts=new Map();for(const r of rows)for(const race of ['ドラゴン','アビス','ジョーカーズ','コマンド','魔導具','メタリカ','ジャイアント','ファイアー・バード'])if(info.get(r.id).race.includes(race))raceCounts.set(race,(raceCounts.get(race)||0)+r.count);
  const base={counts,colors,sources,raceCounts,races:[...raceCounts].filter(([,n])=>n>=16).map(([race])=>race),attackers:rows.reduce((n,r)=>n+(info.get(r.id).attacker?r.count:0),0),high:rows.reduce((n,r)=>n+((info.get(r.id).body&&info.get(r.id).bodyCost>=6||!info.get(r.id).body&&info.get(r.id).cost>=6)?r.count:0),0)};
  valid.push({rows,base,name:d.name,score:scoreDeck(rows,base)});
 }
 if(!valid.length)throw Error('対策構築の基になる対応済みデッキがありません');
 const trusted=new Set(valid.flatMap(d=>d.rows.map(r=>r.id))),ranked=valid.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,8);let best=null;
 ranked.forEach((seed,index)=>{
  const colors=new Set(seed.base.colors),pool=implemented.filter(c=>{const f=info.get(c.id);return (c.limit??4)>0&&f.cost<=8&&f.colors.every(k=>colors.has(k))&&(trusted.has(c.id)||f.cheatHate||f.spellHate||f.graveHate)&&(!c.evolution&&!c.manaEvolution&&!c.graveEvolution||seed.base.counts.has(c.id));}).sort((a,b)=>(utilities.get(b.id)-utilities.get(a.id))||a.id.localeCompare(b.id)).slice(0,28);
  let rows=seed.rows,score=seed.score;
  for(let round=0;round<6;round++){let chosen=null;
   const removable=[...rows].sort((a,b)=>utilities.get(a.id)-utilities.get(b.id)).slice(0,12);
   for(const add of pool)for(const remove of removable){if(add.id===remove.id)continue;const current=countRows(rows),amount=Math.min(2,remove.count,Math.min(4,add.limit??4)-(current.get(add.id)||0));if(amount<1)continue;current.set(remove.id,remove.count-amount);current.set(add.id,(current.get(add.id)||0)+amount);const next=asRows(current),value=scoreDeck(next,seed.base);if(value>score+.01&&(!chosen||value>chosen.score)){if(validateDeck({cards:next,format:'original'}).length)continue;chosen={rows:next,score:value};}}
   if(!chosen)break;({rows,score}=chosen);
  }
  const repeated=failed.has(rowsSignature(rows));if(!best||best.repeated&&!repeated||best.repeated===repeated&&score>best.score)best={rows,score,repeated,baseName:seed.name};onProgress({completed:index+1,total:ranked.length});
 });
 const deck={id:'strongest-cpu',name:'最強CPU・専用対策デッキ',format:'original',cards:best.rows};if(validateDeck(deck).length)throw Error('対策デッキの40枚を確認できませんでした');
 return {version:STRONGEST_BUILD_VERSION,key:strongestDeckKey(target),learningRevision:feedback.revision,deck,profile,baseName:best.baseName,notes:profile.priorities.length?profile.priorities:['序盤の安定性と対応力を重視'],created:new Date().toISOString()};
}
export function validStrongestBuild(build,target,learning){try{return (learning===undefined||(build?.learningRevision||0)===normalizeStrongestLearning(learning,target).revision)&&build?.version===STRONGEST_BUILD_VERSION&&Array.isArray(build.notes)&&build.notes.length<=3&&build.notes.every(x=>typeof x==='string')&&build.key===strongestDeckKey(target)&&build.deck.format==='original'&&!build.deck.historicalId&&!validateDeck(build.deck).length&&build.deck.cards.reduce((n,r)=>n+r.count,0)===40;}catch{return false;}}
// This policy sees CPU cards only. It never reads the human hand, shields or order.
export function arrangeStrongestCPU(s){
 const own=s.players[1],pool=[...own.hand,...own.deck].sort((a,b)=>a.cardId.localeCompare(b.cardId)||a.uid.localeCompare(b.uid)),info=new Map(pool.map(x=>[x.cardId,features(card(x))]));
 const quality=hand=>{let v=0;const counts=new Map();for(const x of hand)counts.set(x.cardId,(counts.get(x.cardId)||0)+1);for(const x of hand){const f=info.get(x.cardId);v+=(f.cost<=3?10:0)+(f.ramp?14:0)+(f.body&&f.cost>=4&&f.cost<=6?8:0)-(f.cost>=7?9:0)-(counts.get(x.cardId)-1)*4;for(const face of playFaces(card(x)).filter(c=>finite(c.cost)<=3)){const others=hand.filter(y=>y!==x);if(others.some(a=>others.some(b=>a!==b&&civilizations(card(b)).length<=1&&manaPayment([a,b],face))))v+=20+(f.ramp?12:0);}}return v;};
 let beam=[{hand:[],last:-1,score:0}];for(let depth=0;depth<5;depth++){const next=[];for(const row of beam){const seen=new Set();for(let i=row.last+1;i<pool.length;i++){const x=pool[i];if(seen.has(x.cardId)||pool.length-i<5-depth)continue;seen.add(x.cardId);const hand=[...row.hand,x];next.push({hand,last:i,score:quality(hand)});}}beam=next.sort((a,b)=>b.score-a.score||a.last-b.last).slice(0,24);}
 const hand=beam[0]?.hand||pool.slice(0,5),chosen=new Set(hand.map(x=>x.uid)),rest=pool.filter(x=>!chosen.has(x.uid)),seen=new Map(hand.map(x=>[x.cardId,1])),order=[];let hasRamp=hand.some(x=>info.get(x.cardId).ramp);
 for(let turn=2;rest.length;turn++){const score=x=>{const f=info.get(x.cardId),n=Math.min(turn+1,9);return 30-Math.abs(f.cost-n)*5+(f.ramp&&!hasRamp&&turn<=4?24:0)+(f.attacker?5:0)+(f.draw?4:0)-(seen.get(x.cardId)||0)*8+(turn<=4&&f.colors.length===1?4:0);};rest.sort((a,b)=>score(b)-score(a)||a.cardId.localeCompare(b.cardId)||a.uid.localeCompare(b.uid));const x=rest.shift();order.push(x);seen.set(x.cardId,(seen.get(x.cardId)||0)+1);hasRamp||=info.get(x.cardId).ramp;}
 own.hand=hand;own.deck=order;
 return {opening:hand.map(x=>x.cardId),order:order.map(x=>x.cardId)};
}
