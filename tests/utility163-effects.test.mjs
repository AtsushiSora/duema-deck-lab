import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {UTILITY163_DECKS} from '../tools/fixtures/utility163.mjs';
const J='dmsd21-011',S='dm26ex4-074',D='dm14-004',C='dmrp18-079',H='dmx15-030',K='dmr18-050',N='dm01-108',F='dm01-097',W='dm01-083',FAST='dmbd15-be5';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const cast=(s,id,face=0)=>{s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id&&(a.face||0)===face);};
function pick(s,value){const a=e.getLegalActions(s).find(a=>a.kind==='extended'&&(typeof value==='function'?value(s.decision.choices[a.choice].value):s.decision.choices[a.choice].value===value||s.decision.choices[a.choice].value?.uid===value));assert.ok(a,JSON.stringify(s.decision));e.step(s,a);}
const boil=(s,uid)=>act(s,'effect',a=>a.targets.some(t=>t.uid===uid));
const attack=(s,uid)=>{s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target==='player');};

test('six complete official definitions and seven faces have artwork, limits and two supported forty-card decks',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-163.json',import.meta.url))),r=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,6);assert.equal(m.cards.flatMap(c=>c.faces).length,7);for(const row of m.cards){assert.ok(r.get(row.id).supported);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[row.id],row.image);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(e.card(row.id).supportBatch,'phase-163');}for(const deck of UTILITY163_DECKS){assert.equal(deck.cards.reduce((n,c)=>n+c.count,0),40);assert.deepEqual(e.validateDeck(deck),[]);assert.equal(r.coverage(deck).unsupported,0);}
});

test('Jenny seed randomly discards exactly one opposing hand card without exposing the rest',()=>{
 const s=setup();give(s,1,'hand',[N,W,F]);const ids=s.players[1].hand.map(x=>x.uid);cast(s,J);drain(s);assert.equal(s.players[1].hand.length,2);assert.equal(s.players[1].grave.length,1);assert.ok(ids.includes(s.players[1].grave[0].uid));assert.equal(s.decision,null);assert.equal(e.isCreature(s,s.players[0].battle[0]),false);assert.ok(!s.log.some(x=>x.type==='reveal'&&ids.some(uid=>x.uid===uid)));assert.equal(e.card(J).shinkalize,true);
});

test('Jenny seed still triggers against Genmu or GG, and empty opposing hands resolve safely',()=>{
 for(const stopper of[GEN,GG]){const s=setup();give(s,1,'battle',[stopper]);if(stopper===GG)s.players[1].battle[0].under=[inst(N)];give(s,1,'hand',[N]);cast(s,J);drain(s);assert.equal(s.players[1].hand.length,0);assert.equal(s.players[1].grave.length,1);}
 const s=setup();cast(s,J);drain(s);assert.equal(s.decision,null);assert.ok(s.players[0].battle.some(x=>x.cardId===J));
});

test('Jenny Shinkalize is a legal dark evolution base but is not an attacking or blocking creature',()=>{
 const s=setup();give(s,0,'battle',[J]);const base=s.players[0].battle[0];const dark=data.cards.find(c=>c.evolution&&e.evolutionBases(s,0,c).some(x=>x.uid===base.uid));assert.ok(dark);assert.ok(e.evolutionBases(s,0,e.card(dark.id)).some(x=>x.uid===base.uid));s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===base.uid));
});

test('Surfer face may bounce either side, including itself, with a real optional skip',()=>{
 for(const owner of[0,1]){const s=setup();give(s,owner,'battle',[N]);const uid=s.players[owner].battle[0].uid;cast(s,S);assert.equal(s.decision.type,'effect');act(s,'effect',a=>a.targets.some(t=>t.uid===uid));drain(s);assert.ok(s.players[owner].hand.some(x=>x.uid===uid));}
 const s=setup();cast(s,S);const uid=s.players[0].battle[0].uid;assert.ok(e.getLegalActions(s).some(a=>a.kind==='skipEffect'));act(s,'effect',a=>a.targets.some(t=>t.uid===uid));drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===uid));
});

test('Surfer shield trigger summons without mana and returns an opposing creature',()=>{
 const s=setup();give(s,0,'battle',[FAST]);give(s,1,'shields',[S]);give(s,1,'mana',[]);const uid=s.players[0].battle[0].uid;s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');assert.equal(s.decision.player,1);act(s,'effect',a=>a.targets.some(t=>t.uid===uid));drain(s);assert.ok(s.players[1].battle.some(x=>x.cardId===S));assert.ok(s.players[0].hand.some(x=>x.uid===uid));assert.equal(s.players[1].mana.length,0);
});

test('Boil destroys a cost-two seed or creature, rejects cost-three cards, then puts the physical twinpact in mana',()=>{
 for(const target of[J,N]){const s=setup();give(s,1,'battle',[target,D]);const uid=s.players[1].battle[0].uid;cast(s,S,1);const spell=s.extSpells[0].inst.uid,before=physical(s);assert.ok(s.decision.targets.some(x=>x.uid===uid));assert.ok(!s.decision.targets.some(x=>x.cardId===D));boil(s,uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));const mana=s.players[0].mana.find(x=>x.uid===spell);assert.ok(mana);assert.equal(mana.tapped,true,'a blue/fire twinpact enters mana tapped');assert.deepEqual(e.manaColors(e.card(S),s,0).sort(),['水','火']);assert.deepEqual(physical(s),before);}
});

test('Boil still charges with no legal target, but Genmu ignores both its removal and charger ability',()=>{
 const s=setup();give(s,1,'battle',[D]);cast(s,S,1);drain(s);assert.ok(s.players[0].mana.some(x=>x.cardId===S));assert.equal(s.players[1].battle.length,1);
 const t=setup();give(t,1,'battle',[GEN,N]);cast(t,S,1);drain(t);assert.ok(t.players[0].grave.some(x=>x.cardId===S));assert.ok(!t.players[0].mana.some(x=>x.cardId===S));assert.ok(t.players[1].battle.some(x=>x.cardId===N));
});

test('Boil respects Just Diver targeting and destruction protection',()=>{
 const s=setup();give(s,1,'battle',[N]);s.players[1].battle[0].justDiverActive=true;s.players[1].battle[0].g34Grants=[{turn:s.turn,justDiver:true}];cast(s,S,1);drain(s);assert.equal(s.players[1].battle.length,1);
 const t=setup();give(t,1,'battle',[N]);const x=t.players[1].battle[0];x.g26Stay=true;cast(t,S,1);boil(t,x.uid);drain(t);assert.ok(t.players[1].battle.some(y=>y.uid===x.uid));assert.ok(t.players[0].mana.some(y=>y.cardId===S));
});

test('Boil selects one card from an evolution stack, including an underlying twinpact with a cheap spell face',()=>{
 for(const targetTop of[false,true]){const s=setup();give(s,1,'battle',['dm32-080']);const top=s.players[1].battle[0],base=inst(W);top.under=[base];cast(s,S,1);boil(s,targetTop?top.uid:base.uid);drain(s);if(targetTop){assert.ok(s.players[1].grave.some(x=>x.uid===top.uid));assert.ok(s.players[1].battle.some(x=>x.uid===base.uid));}else{assert.ok(s.players[1].grave.some(x=>x.uid===base.uid));assert.ok(s.players[1].battle.some(x=>x.uid===top.uid));}}
 const s=setup();give(s,1,'battle',[K]);const top=s.players[1].battle[0],under=inst('dm26ex4-013');top.under=[under];cast(s,S,1);assert.ok(!s.decision,'neither cost-three top nor cost-four spell side qualifies');
 const t=setup();give(t,1,'battle',[K]);const parent=t.players[1].battle[0],twin=inst('dmbd16-009');parent.under=[twin];cast(t,S,1);boil(t,twin.uid);drain(t);assert.ok(t.players[1].grave.some(x=>x.uid===twin.uid));assert.ok(t.players[1].battle.some(x=>x.uid===parent.uid));
});

test('Boil can destroy a low-cost non-creature card without destroying another battlefield body',()=>{
 const g=data.cards.find(c=>['gear','field'].includes(c.type)&&c.cost<=2);assert.ok(g);const s=setup();give(s,1,'battle',[g.id,K]);const uid=s.players[1].battle[0].uid;cast(s,S,1);boil(s,uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));assert.ok(s.players[1].battle.some(x=>x.cardId===K));
});

test('Dione blocks both players new speed attackers while allowing older ones, and stops being a lock when removed',()=>{
 const s=setup();give(s,0,'battle',[D,FAST]);give(s,1,'battle',[FAST]);for(const p of[0,1]){s.active=p;s.phase='attack';const x=s.players[p].battle.find(x=>x.cardId===FAST);x.entered=s.turn;assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));assert.equal(e.attackLocked(s,p,x),true);x.entered=0;assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));x.entered=s.turn;}
 s.players[0].grave.push(s.players[0].battle.shift());assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===s.players[1].battle[0].uid));
});

test('Dione sees granted speed, preserves ordinary summoning sickness, and Genmu removes the global restriction',()=>{
 const s=setup();give(s,0,'battle',[D,N]);const x=s.players[0].battle[1];x.entered=s.turn;x.g34Grants=[{turn:s.turn,speedAttacker:true}];s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));s.players[0].grave.push(s.players[0].battle.shift());assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));const u=setup();give(u,0,'battle',[D,FAST]);u.players[0].battle[1].entered=u.turn;give(u,1,'battle',[GEN]);u.phase='attack';assert.ok(e.getLegalActions(u).some(a=>a.kind==='attack'&&a.uid===u.players[0].battle[1].uid));
 const t=setup();give(t,0,'battle',[D,W]);t.players[0].battle[1].entered=t.turn;t.phase='attack';assert.ok(!e.getLegalActions(t).some(a=>a.kind==='attack'));
});

test('Dione cannot attack and can block',()=>{
 const s=setup();give(s,0,'battle',[D]);s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));s.active=1;give(s,1,'battle',[FAST]);s.phase='attack';act(s,'attack',a=>a.target==='player');assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===s.players[0].battle[0].uid));
});

test('Critical Love makes each owner choose one own creature, continuing when the caster has no creature',()=>{
 for(const self of[true,false]){const s=setup();if(self)give(s,0,'battle',[N,F]);give(s,1,'battle',[N,F]);const mine=s.players[0].battle[0]?.uid,enemy=s.players[1].battle[1].uid;cast(s,C);if(self){assert.equal(s.decision.player,0);pick(s,mine);}assert.equal(s.decision.player,1);pick(s,enemy);drain(s);if(self)assert.ok(s.players[0].grave.some(x=>x.uid===mine));assert.ok(s.players[1].grave.some(x=>x.uid===enemy));}
});

test('Critical Love permits self-selection of protected creatures and continues even if self-destruction was prevented',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[N]);s.players[0].battle[0].g26Stay=true;s.players[1].battle[0].justDiverActive=true;s.players[1].battle[0].g34Grants=[{turn:s.turn,justDiver:true}];const enemy=s.players[1].battle[0].uid;cast(s,C);pick(s,s.players[0].battle[0].uid);assert.equal(s.decision.player,1);pick(s,enemy);drain(s);assert.equal(s.players[0].battle.length,1);assert.equal(s.players[1].battle.length,0);
});

test('Critical Love can be a free shield trigger and its pending opposing choice survives JSON serialization',()=>{
 let s=setup();give(s,0,'battle',[FAST]);give(s,1,'battle',[W]);give(s,1,'shields',[C]);s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');assert.equal(s.decision.player,1);pick(s,s.players[1].battle[0].uid);s=JSON.parse(JSON.stringify(s));assert.equal(s.decision.player,0);pick(s,s.players[0].battle[0].uid);drain(s);assert.equal(s.players[0].battle.length,0);assert.equal(s.players[1].battle.length,0);
});

test('Hormone ramps exactly the top physical card, with normal multi-color tapping and Genmu suppression',()=>{
 for(const muted of[false,true]){const s=setup();give(s,0,'deck',[S,N,N]);const uid=s.players[0].deck[0].uid;if(muted)give(s,1,'battle',[GEN]);cast(s,H);drain(s);assert.equal(s.players[0].mana.some(x=>x.uid===uid),!muted);if(!muted)assert.ok(s.players[0].mana.find(x=>x.uid===uid).tapped);}
});

test('Koikoi evolves over water and invades a non-Command water attacker, preserving the underlying UID',()=>{
 let s=setup();give(s,0,'battle',[W]);give(s,0,'hand',[K]);const base=s.players[0].battle[0].uid;attack(s,base);assert.equal(s.decision.task.op,'g23_Declare');pick(s,true);assert.equal(s.decision.task.op,'g23_Invade');s=JSON.parse(JSON.stringify(s));pick(s,true);drain(s);const x=s.players[0].battle.find(x=>x.cardId===K);assert.ok(x);assert.equal(x.under[0].uid,base);assert.ok(x.tapped);
 const t=setup();give(t,0,'battle',[F]);give(t,0,'hand',[K]);attack(t,t.players[0].battle[0].uid);assert.notEqual(t.decision?.task?.op,'g23_Declare');
});

test('ordinary Command-only invasion is not widened by Koikoi support, and Koikoi can also evolve by paying mana',()=>{
 const red=data.cards.find(c=>c.invasion?.colors?.includes('火')&&!c.invasion.anyCreature&&!c.invasion.evolution);assert.ok(red);const s=setup();give(s,0,'battle',[F]);give(s,0,'hand',[red.id]);attack(s,s.players[0].battle[0].uid);assert.notEqual(s.decision?.task?.op,'g23_Declare');
 const t=setup();give(t,0,'battle',[W]);const base=t.players[0].battle[0].uid;cast(t,K);act(t,'evolve',a=>a.baseUid===base);drain(t);assert.ok(t.players[0].battle.some(x=>x.cardId===K&&x.under[0].uid===base));
});

test('CPU chooses legal effects in two full forty-card games and conserves eighty physical cards across a saved continuation',()=>{
 for(const [i,deck] of UTILITY163_DECKS.entries()){let s=e.createGame([deck,PRESETS[0]],{seed:163401+i,first:i,maxTurns:70,maxActions:1800}),saved=false;const ids=physical(s);while(s.winner===null){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);assert.equal(new Set(ids).size,80);if(!saved&&s.actions>=20){const t=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(t),e.getLegalActions(s));s=t;saved=true;}}assert.ok(saved);assert.ok([0,1].includes(s.winner));}
});
