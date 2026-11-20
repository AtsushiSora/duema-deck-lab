import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {standardCardSpec} from '../tools/standard-card-spec.mjs';
const V='dm26rp2-011',R='dm24ex1-058',N='dm01-108',W='dm01-083',X='dmrp20-009',ONE='dm25rp2-012';
const field=()=>{const s=setup();for(const p of [0,1]){give(s,p,'deck',Array(30).fill(N));give(s,p,'grave',[]);}return s;};
const add=(s,p,z,id,props={})=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const settle=s=>{for(let n=0;n<30&&['effectOrder','entryOrder'].includes(s.decision?.type);n++)e.step(s,e.chooseAI(s));};
const pick=(s,v)=>{settle(s);return act(s,'extended',a=>{const value=s.decision.choices[a.choice]?.value;return (value?.uid??value)===v;});};
const modes=(s,...values)=>{for(const v of values){assert.equal(s.decision.task.op,'g34_Choose');pick(s,v);}};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);const physical=s=>{const ids=e.physicalCards(s).map(x=>x.uid).sort();assert.equal(ids.length,new Set(ids).size);return ids;};
const end=s=>{s.phase='attack';act(s,'endTurn');};
function revive(s,id=N){const x=add(s,s.active,'grave',id);cast(s,'dm19-027');pick(s,x.uid);return x;}
test('five requested canonical IDs remain unique; two new definitions and secret print match the entire official text',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1372.json',import.meta.url)));const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1372}),row.spec);const bad=structuredClone(row);bad.status='complete';bad.faces[0].abilityText+='未照合';assert.throws(()=>standardCardSpec(bad,{phase:1372}));assert.equal(cat.get(row.id).id,row.canonicalId??row.id);assert.equal(e.card(row.canonicalId??row.id).limit,4);}
 for(const row of m.requested)assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).length,1);
 for(const row of m.cards)assert.equal(CARD_IMAGES[row.id],row.image);
 assert.deepEqual(cat.resolveRows([{id:'dm26rp2-SEC015',count:1},{id:V,count:1}]),[{id:V,count:2}]);
});
test('Victory selects both modes before resolving, destroys two real targets at current power <=8000',()=>{const s=field(),a=add(s,1,'battle',N),b=add(s,1,'battle',W),above=add(s,1,'battle','dm01-s01');const before=physical(s);cast(s,V);pick(s,1);assert.ok(has(s,1,'battle',a));pick(s,1);pick(s,a.uid);pick(s,b.uid);drain(s);assert.ok(has(s,1,'grave',a)&&has(s,1,'grave',b)&&has(s,1,'battle',above));assert.equal(physical(s).length,before.length+1);});
test('Victory doubles the same creature twice, grants a real powered breaker, and clears both changes at turn end',()=>{const s=field(),x=add(s,0,'battle',N);cast(s,V);modes(s,2,2);pick(s,x.uid);pick(s,x.uid);drain(s);assert.equal(e.power(x,false,s),8000);assert.ok(e.effectiveCard(x,s).poweredBreaker);const clone=JSON.parse(JSON.stringify(s));assert.equal(e.power(clone.players[0].battle[0],false,clone),8000);attack(s,x.uid);act(s,'noBlock');act(s,'breakShields');drain(s);assert.equal(s.players[1].shields.length,3);end(s);assert.equal(e.power(x,false,s),2000);assert.ok(!e.effectiveCard(x,s).poweredBreaker);});
test('Victory applies two exact printed-cost spell prohibitions through the next opposing turn, with save restore',()=>{let s=field();cast(s,V);modes(s,0,0);pick(s,6);pick(s,'∞');drain(s);s=JSON.parse(JSON.stringify(s));assert.equal(e.canCastSpell(s,1,e.card('dm01-027')),false);assert.equal(e.canCastSpell(s,1,e.card(W)),true);assert.equal(e.canCastSpell(s,1,{type:'spell',cost:'∞',civilizations:['水']}),false);end(s);assert.equal(e.canCastSpell(s,1,e.card('dm01-027')),false);end(s);assert.equal(e.canCastSpell(s,1,e.card('dm01-027')),true);});
for(const [id,power,ok] of [[X,8000,true],[X,7999,false],[N,9000,true],['dm01-075',9000,false]])test('Attack Chance requires an allowed civilization AND current power: '+id+' '+power,()=>{const s=field(),x=add(s,0,'battle',id,{powerModifiers:[{amount:power-e.card(id).power}]});give(s,0,'hand',[V]);give(s,0,'mana',[]);attack(s,x.uid);settle(s);assert.equal(s.decision?.task?.op==='g34_Chance417',ok);if(ok){pick(s,true);modes(s,0,0);pick(s,2);pick(s,3);drain(s);assert.ok(s.players[0].grave.some(x=>x.cardId===V));assert.equal(s.players[0].mana.length,0);}});
test('Rokka sees free entry on the opponent turn; the opponent chooses and may sacrifice a different element',()=>{const s=field();add(s,1,'battle',R);const other=add(s,0,'battle','dmrp08-005');const x=revive(s);assert.equal(s.decision.player,0);assert.equal(s.decision.task.controller,1);pick(s,other.uid);drain(s);assert.ok(has(s,0,'grave',other)&&has(s,0,'battle',x));});
test('Rokka observes zero-mana spell execution, lets the caster sacrifice an element, and ignores normal payment',()=>{const s=field();add(s,1,'battle',R);const target=add(s,0,'battle',N);cast(s,W);assert.ok(has(s,0,'battle',target));give(s,0,'mana',[]);give(s,0,'battle',[N,W,W,W,W]);const victim=s.players[0].battle[0];cast(s,'dm22rp2-014');assert.equal(s.decision.player,0);pick(s,victim.uid);drain(s);assert.ok(has(s,0,'grave',victim));});
test('Rokka does not trigger on its owner turn, including an opposing free spell',()=>{const s=field();add(s,0,'battle',R);const x=revive(s);drain(s);assert.ok(has(s,0,'battle',x));assert.ok(!s.players[0].grave.some(x=>x.cardId===N));});
test('each Rokka triggers separately and face-down watchers do not trigger',()=>{for(const mute of [false,true]){const s=field();const r1=add(s,1,'battle',R,mute?{faceDown:true}:{}),r2=add(s,1,'battle',R,mute?{faceDown:true}:{});const a=add(s,0,'battle',N),b=add(s,0,'battle',W);revive(s);if(mute){drain(s);assert.ok(has(s,0,'battle',a)&&has(s,0,'battle',b));}else{pick(s,a.uid);pick(s,b.uid);drain(s);assert.ok(has(s,0,'grave',a)&&has(s,0,'grave',b));}assert.ok(has(s,1,'battle',r1)&&has(s,1,'battle',r2));}});
test('Rokka can choose an attached aura as an element; free aura entry triggers but paid entry does not',()=>{for(const paid of [false,true]){const s=field();s.format='advance';add(s,1,'battle',R);const host=add(s,0,'battle','dmrp09-m01');const aura=add(s,0,'hand','dmrp11-s06');if(!paid)give(s,0,'mana',[]);if(paid)act(s,'play',a=>a.uid===aura.uid);else { // A real shield trigger grants the free execution through Benzo.
 give(s,0,'shields',['dmrp11-s06']);s.players[0].hand=s.players[0].hand.filter(x=>x.uid!==aura.uid);const b=add(s,0,'hand','dm22ex1-061');give(s,0,'mana',Array(10).fill('dm01-075'));act(s,'play',a=>a.uid===b.uid&&a.face===1);const shield=s.players[0].shields[0];pick(s,shield.uid);act(s,'useTrigger',a=>a.uid===shield.uid);
 }
 assert.equal(s.decision.type,'aura1352');act(s,'attachAura1352',a=>a.uid===host.uid);if(paid){drain(s);assert.ok(!s.decision?.task?.g1372OpponentSacrifice);}else{ // The aura's own entry selection can precede the Rokka response.
 for(let i=0;i<20&&s.decision&&!s.decision.task?.g1372OpponentSacrifice;i++)e.step(s,e.chooseAI(s));assert.ok(s.decision?.task?.g1372OpponentSacrifice);const attached=s.players[0].battle.find(x=>x.cardId==='dmrp11-s06');pick(s,attached.uid);drain(s);assert.ok(has(s,0,'grave',attached));}
 physical(s);
}});
for(const removeFairy of [false,true])test('QA48933: two Attack Chances are declared, and the second rechecks One Note after the first: '+removeFairy,()=>{
 const s=field(),attacker=add(s,0,'battle',N,{powerModifiers:[{amount:6000}]}),fairy=add(s,1,'battle',ONE);give(s,0,'hand',[V,V]);give(s,0,'mana',[]);const spells=[...s.players[0].hand];attack(s,attacker.uid);settle(s);assert.equal(s.decision.task.op,'g34_Chance417');pick(s,true);
 modes(s,removeFairy?1:0,removeFairy?1:0);if(removeFairy)pick(s,fairy.uid);else{pick(s,3);pick(s,4);}
 settle(s);if(removeFairy){assert.equal(s.decision.task.op,'g34_Chance417');pick(s,true);modes(s,2,2);pick(s,attacker.uid);pick(s,attacker.uid);}drain(s);
 assert.equal(spells.filter(x=>has(s,0,'grave',x)).length,removeFairy?2:1);assert.equal(spells.filter(x=>has(s,0,'hand',x)).length,removeFairy?0:1);
});
test('Rokka rejects a creature protected from the opposing effect even when its own player chooses',()=>{
 const s=field();add(s,1,'battle',R);const protectedUnit=add(s,0,'battle',W,{justDiverActive:true});const x=revive(s);assert.ok(!s.decision.choices.some(o=>o.value?.uid===protectedUnit.uid));pick(s,x.uid);drain(s);assert.ok(has(s,0,'battle',protectedUnit));
});
test('Rokka ignores an opposing shield-trigger spell during the Rokka owner turn',()=>{
 const s=field();add(s,0,'battle',R);const attacker=add(s,0,'battle',N),victim=add(s,1,'battle',W);give(s,1,'shields',['dm01-027']);attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');drain(s);assert.ok(has(s,1,'battle',victim));
});
for(const id of ['dmrp08-005','dm22ex1-086','dm14-110'])test('Rokka observes a free noncreature element entry: '+id,()=>{
 const s=field();add(s,1,'battle',R);give(s,0,'shields',[id]);const shield=s.players[0].shields[0];const b=add(s,0,'hand','dm22ex1-061');act(s,'play',a=>a.uid===b.uid&&a.face===1);pick(s,shield.uid);act(s,'useTrigger',a=>a.uid===shield.uid);
 assert.equal(s.decision.type,'effectOrder');assert.equal(s.pendingEffects.filter(x=>x.source===R).length,2);settle(s);pick(s,shield.uid);drain(s);assert.ok(has(s,0,'grave',shield));physical(s);
});
test('Rokka is ignored under the real Genmu effect and does not react to an unpaid spell',()=>{
 const s=field();add(s,1,'battle',R);add(s,1,'battle','dmrp15-km1');give(s,0,'mana',[]);give(s,0,'battle',[N,W,W,W,W]);const before=s.players[0].battle.map(x=>x.uid);cast(s,'dm22rp2-014');drain(s);assert.deepEqual(s.players[0].battle.map(x=>x.uid),before);
});

test('Rokka uses its real G Strike from a shield without being cast or tapping the chosen attacker',()=>{
 const s=field();s.active=1;const attacker=add(s,1,'battle',N),later=add(s,1,'battle',W);give(s,0,'shields',[R]);give(s,0,'mana',[]);const before=physical(s);attack(s,attacker.uid);act(s,'noBlock');pick(s,true);assert.equal(s.decision.task.op,'gsTarget');pick(s,later.uid);drain(s);assert.ok(e.attackLocked(s,1,later));assert.equal(later.tapped,false);assert.ok(s.players[0].hand.some(x=>x.cardId===R));assert.deepEqual(physical(s),before);
});
