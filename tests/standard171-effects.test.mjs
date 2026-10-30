import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,PRESETS,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {creatureStatusModel} from '../dist/battle-insights.js';
import {STANDARD171_DECKS} from '../tools/fixtures/standard171.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-171.json',import.meta.url)));
const N='dm01-108',F='dm01-097',H='dmr03-020',BIG='dm22rp2-041',ORACLE='dmd12-013';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,uid){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===uid);}
function play(s,id){const x=inst(id);s.players[0].hand.push(x);const before=physical(s);act(s,'play',a=>a.uid===x.uid&&!a.alternative);if(e.card(id).neoEvolution)act(s,'evolve',a=>!a.baseUid);if(s.decision?.type==='evolution')act(s,'evolve');return{uid:x.uid,before};}

test('33 official definitions match complete faces, images and limits in four legal forty-card decks',()=>{
 const registry=createCatalogue(snapshot,data.cards,details),coverage=new Set(STANDARD171_DECKS.flatMap(d=>d.cards.map(c=>c.id)));
 assert.equal(m.cards.length,33);
 for(const c of m.cards){assert.ok(coverage.has(c.id));assert.equal(e.card(c.id).supportBatch,'phase-171');assert.deepEqual(c.faces,details.cards.find(d=>d.id===c.id).faces);assert.deepEqual(c.spec,standardCardSpec(details.cards.find(d=>d.id===c.id),{phase:171}));assert.ok(c.verification.facesMatched);assert.match(c.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(c.id).limit,m.regulationVerification.limits[c.id]);assert.equal(CARD_IMAGES[c.id],c.image);assert.ok(registry.get(c.id).supported);}
 for(const d of STANDARD171_DECKS){assert.equal(d.cards.reduce((n,c)=>n+c.count,0),40);assert.deepEqual(e.validateDeck(d),[]);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of m.cards)test('full execution and saved continuation preserve every physical card: '+row.name,()=>{
 let s=setup();give(s,0,'battle',[H,F]);give(s,1,'battle',[N,BIG]);const a=play(s,row.id);s=JSON.parse(JSON.stringify(s));drain(s);assert.equal(s.winner,null);assert.equal(s.decision,null);assert.deepEqual(physical(s),a.before);assert.ok(s.players[0][e.card(row.id).type==='spell'?'grave':'battle'].some(x=>x.uid===a.uid));
});
test('new grammar rejects incomplete or changed conditions and preserves previous batch definitions',()=>{
 for(const c of m.cards){const r=structuredClone(details.cards.find(d=>d.id===c.id));assert.throws(()=>standardCardSpec(r,{phase:170}));r.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(r,{phase:171}));}
 const d=structuredClone(details.cards.find(d=>d.id===ORACLE));for(const text of['相手のコスト３以下のエレメントを１つ破壊する。','相手のコスト３以上のクリーチャーを１体破壊する。','相手のタップしているクリーチャーを２体破壊する。','相手のパワー3000以上のクリーチャーを１体破壊してもよい。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:171}));}
 for(const phase of[165,166,168,169,170])for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(d=>d.id===row.id),{phase}),row.spec);
});
test('every constant battle bonus changes attack and defense results exactly once while normal power stays unchanged',()=>{
 for(const row of m.cards.filter(c=>c.spec.g38BattleBonus))for(const defending of[false,true]){
  const s=setup();give(s,0,'battle',[defending?N:row.id]);give(s,1,'battle',[defending?row.id:N]);const p=defending?1:0,x=s.players[p].battle[0],y=s.players[1-p].battle[0],base=e.power(x,false,s),bonus=row.spec.g38BattleBonus;
  y.powerModifiers=[{amount:base+bonus-1000-e.power(y,false,s)}];s.players[1].battle[0].tapped=true;
  assert.equal(e.power(x,false,s),base);assert.equal(e.matchupPower(x,y,false,s),base+bonus);assert.ok(creatureStatusModel(s,p,x.uid).effects.some(x=>x.name.includes('バトル中のパワー')));
  const ids=physical(s);s.phase='attack';act(s,'attack',a=>a.target===s.players[1].battle[0].uid);drain(s);
  assert.ok(s.players[p].battle.some(z=>z.uid===x.uid));assert.ok(s.players[1-p].grave.some(z=>z.uid===y.uid));assert.deepEqual(physical(s),ids);
 }
});
test('battle bonuses do not rescue a creature from normal-power removal and are suppressed with ignored abilities',()=>{
 for(const row of m.cards.filter(c=>c.spec.g38BattleBonus)){
  const s=setup();give(s,1,'battle',[row.id]);const x=s.players[1].battle[0],base=e.power(x,false,s);x.g35Ignored=s.turn;assert.equal(e.matchupPower(x,null,false,s),base);assert.ok(!creatureStatusModel(s,1,x.uid).effects.some(x=>x.name.includes('バトル中のパワー')));delete x.g35Ignored;
  give(s,0,'battle',[GEN]);assert.equal(e.matchupPower(x,null,false,s),base+(e.card(row.id).cost<=5?0:row.spec.g38BattleBonus));
 }
 const s=setup();give(s,1,'battle',['dmrp07-046']);const uid=s.players[1].battle[0].uid;assert.equal(e.power(s.players[1].battle[0],false,s),e.card('dmrp07-046').power);play(s,'dmrp17-043');pick(s,uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));
});
test('both entry battles use their battle-only bonus against the chosen opponent',()=>{
 for(const row of m.cards.filter(c=>c.spec.effect==='fightOptional')){const s=setup();give(s,1,'battle',[N]);const y=s.players[1].battle[0];y.powerModifiers=[{amount:e.card(row.id).power+row.spec.g38BattleBonus-1000-e.power(y,false,s)}];const uid=y.uid,x=play(s,row.id);act(s,'fight',a=>a.target===uid);drain(s);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.ok(s.players[1].grave.some(y=>y.uid===uid));assert.deepEqual(physical(s),x.before);}
});
test('player-only attackers cannot select creatures and ignored restrictions disappear from legal actions and status',()=>{
 for(const row of m.cards.filter(c=>c.spec.noCreatureAttack)){const s=setup();give(s,0,'battle',[row.id]);give(s,1,'battle',[N]);s.players[1].battle[0].tapped=true;const x=s.players[0].battle[0];s.phase='attack';let actions=e.getLegalActions(s).filter(a=>a.kind==='attack');assert.ok(actions.some(a=>a.target==='player'));assert.ok(actions.every(a=>a.target==='player'));assert.ok(creatureStatusModel(s,0,x.uid).effects.some(x=>x.name==='クリーチャーには攻撃できない'));x.g35Ignored=s.turn;actions=e.getLegalActions(s).filter(a=>a.kind==='attack');assert.ok(actions.some(a=>a.target===s.players[1].battle[0].uid));assert.ok(!creatureStatusModel(s,0,x.uid).effects.some(x=>x.name==='クリーチャーには攻撃できない'));}
});
test('all optional removal effects allow a genuine decline and enforce current power and targetability',()=>{
 for(const row of m.cards.filter(c=>c.spec.g34Tasks?.some(t=>t.optional&&t.to)))for(const accept of[false,true]){
  const s=setup();give(s,1,'battle',[N,BIG,'dmrp22-053']);s.players[1].battle[2].justDiverActive=true;const uid=s.players[1].battle[0].uid,task=row.spec.g34Tasks[0],a=play(s,row.id),values=s.decision.choices.map(c=>c.value?.uid??c.value);assert.ok(values.includes(null));assert.ok(values.includes(uid));assert.ok(!values.includes(s.players[1].battle[2].uid));if(task.filter?.maxPower)assert.ok(!values.includes(s.players[1].battle[1].uid));pick(s,accept?uid:null);drain(s);assert.equal(s.players[1][task.to].some(x=>x.uid===uid),accept);assert.equal(s.players[1].battle.some(x=>x.uid===uid),!accept);assert.deepEqual(physical(s),a.before);
 }
});
test('every cost ceiling excludes more expensive cards and protected enemies, including evolution summons',()=>{
 for(const row of m.cards.filter(c=>c.spec.g34Tasks?.some(t=>t.filter?.max!==undefined))){const s=setup();give(s,0,'battle',[H,F]);give(s,1,'battle',[N,BIG,'dmrp22-053']);s.players[1].battle[2].justDiverActive=true;const uid=s.players[1].battle[0].uid,x=play(s,row.id);assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[uid]);pick(s,uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));assert.deepEqual(physical(s),x.before);}
});
test('Oracle Jewel destroys an untapped target before tapping all remaining opponents, and taps even with no legal destruction target',()=>{
 for(const emptySelection of[false,true]){const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[N,BIG,'dmrp22-053']);s.players[1].battle[2].justDiverActive=true;const target=s.players[1].battle[0].uid;for(const x of s.players[1].battle)x.tapped=emptySelection;const a=play(s,ORACLE);if(!emptySelection){assert.ok(!s.players[1].battle[1].tapped);pick(s,target);}drain(s);assert.equal(s.players[1].grave.some(x=>x.uid===target),!emptySelection);assert.ok(s.players[1].battle.every(x=>x.tapped));assert.ok(!s.players[0].battle[0].tapped);assert.deepEqual(physical(s),a.before);}
});
test('CPU uses winning battle bonuses for attacks, blocks and Guardman redirection',()=>{
 const s=setup();give(s,0,'battle',['dmrp07-046']);give(s,1,'battle',[N]);const enemy=s.players[1].battle[0];enemy.tapped=true;enemy.powerModifiers=[{amount:3000}];s.phase='attack';assert.equal(e.chooseAI(s).target,enemy.uid);
 for(const guarding of[false,true]){const t=setup();give(t,0,'battle',[BIG]);give(t,1,'battle',guarding?['dmrp07-046',N]:['dmrp07-046']);const attacker=t.players[0].battle[0],defender=t.players[1].battle[0];attacker.powerModifiers=[{amount:-4000}];if(!guarding)defender.g34Grants=[{turn:t.turn,blocker:true}];if(guarding)t.players[1].battle[1].tapped=true;t.phase='attack';act(t,'attack',a=>a.target===(guarding?t.players[1].battle[1].uid:'player'));const a=e.chooseAI(t);assert.equal(a.kind,guarding?'guardman':'block');assert.equal(a.uid,defender.uid);e.step(t,a);drain(t);assert.ok(t.players[1].battle.some(x=>x.uid===defender.uid));assert.ok(t.players[0].grave.some(x=>x.uid===attacker.uid));}
});
test('shield triggers execute for their defender without mana and preserve every card',()=>{
 for(const row of m.cards.filter(c=>c.spec.trigger)){const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[N]);give(s,1,'shields',[row.id]);give(s,1,'mana',[]);const before=physical(s);s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');drain(s);assert.equal(s.metrics[1].triggers,1);assert.equal(s.players[1].mana.length,0);assert.deepEqual(physical(s),before);}
});
test('four CPU fixture matches finish with eighty physical cards conserved across save and resume',()=>{
 for(const[i,d]of STANDARD171_DECKS.entries()){let s=e.createGame([d,PRESETS[i%PRESETS.length]],{seed:17101+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
