import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {randomBytes} from 'node:crypto';
import {e,setup,inst,give,act,attack,cast,drain,data,snapshot,details,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {createCatalogue,nameKey} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {sealRoom,openRoom,projectRoom} from '../server/duel-core.mjs';
const J='dmrp14-km2',N='dm01-108',F='dm01-097',W='dm01-083',MAX='dmrp14-024',DEMON='dm01-027',MUTE='dmrp16-s01';
const add=(s,p,z,id,props={})=>{const x={...inst(id),...props};s.players[p][z].push(x);return x;};
const pick=(s,uid)=>act(s,'extended',a=>(s.decision.choices[a.choice]?.value?.uid??s.decision.choices[a.choice]?.value)===uid);
function field(){const s=setup();s.active=0;s.turn=5;return s;}
function breakTwo(ids=[J,F],props={}){const s=field();s.active=1;give(s,0,'shields',ids);s.players[0].shields[0].faceUp=true;Object.assign(s.players[0].shields[0],props);const attacker=data.cards.find(c=>c.type==='creature'&&c.breaker===2&&!c.effect&&!c.evolution);give(s,1,'battle',[attacker.id]);attack(s);act(s,'noBlock');return s;}
function useAll(s){for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<100);e.step(s,e.getLegalActions(s).find(a=>a.kind==='useTrigger')||e.chooseAI(s));}}
test('phase1761 preserves canonical ID and full official first/reprint faces, image, restriction and saved-deck resolution',()=>{
 const m=JSON.parse(fs.readFileSync('tools/support-phase-1761.json')),cat=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,1);assert.equal(m.printAliases.length,1);
 for(const r of [...m.cards,...m.printAliases]){assert.deepEqual(standardCardSpec(r,{phase:1761}),r.spec);const bad=structuredClone(r);bad.faces[0].abilityText+='X';assert.throws(()=>standardCardSpec(bad,{phase:1761}));assert.ok(r.verification.facesMatched);assert.equal(m.regulationVerification.limits[r.id],4);assert.equal(r.id===J?CARD_IMAGES[r.id]:JSON.parse(fs.readFileSync("tools/image-reference-prints.json")).prints.find(x=>x.id===r.id).image,r.image);assert.equal(cat.get(r.id).id,J);assert.deepEqual(cat.resolveRows([{id:r.id,count:1}]),[{id:J,count:1}]);}
 assert.equal(data.cards.filter(c=>nameKey(c.name)===nameKey('「正義帝」')).length,1);assert.equal(e.card(J).cost,8);assert.equal(e.card(J).power,13000);assert.equal(e.card(J).manaValue,1);assert.deepEqual(e.card(J).civilizations,['光','水']);assert.equal(e.card(J).race,'メタリカ/チーム銀河');assert.equal(e.card(J).breaker,3);assert.notEqual(e.card('dm22ex1-016').id,J);
});
test('normal summon pays eight, Galaxyshield pays six in both civilizations and creates a face-up shield without entering',()=>{
 for(const kind of ['play','galaxyShield']){const s=field();give(s,0,'hand',[J]);act(s,kind,a=>a.cardId===J);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,kind==='play'?8:6);assert.equal(s.players[0].battle.length,kind==='play'?1:0);assert.equal(s.players[0].shields.filter(x=>x.cardId===J&&x.faceUp).length,kind==='play'?0:1);assert.equal(s.players[0].hand.length,0);assert.equal(s.decision,null);}
 for(const ids of [Array(10).fill(N),Array(5).fill(W).concat([F])]){const s=field();give(s,0,'hand',[J]);give(s,0,'mana',ids);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='galaxyShield'));}
});
test('face-up Galaxyshield summons at own turn start as paid and survives JSON restoration without charging more mana',()=>{
 const s=field();s.active=1;s.phase='attack';const x=add(s,0,'shields',J,{faceUp:true});const before=s.players[0].mana.filter(x=>x.tapped).length;act(s,'endTurn');const copy=JSON.parse(JSON.stringify(s));drain(copy);assert.ok(copy.players[0].battle.some(y=>y.uid===x.uid));assert.ok(!copy.players[0].shields.some(y=>y.uid===x.uid));assert.equal(copy.players[0].mana.filter(x=>x.tapped).length,before);
});
test('face-down and muted Galaxyshield do not summon at own turn start',()=>{
 for(const mute of [false,true]){const s=field();s.active=1;s.phase='attack';const x=add(s,0,'shields',J,{faceUp:mute});if(mute)give(s,1,'battle',[MUTE]);act(s,'endTurn');drain(s);assert.ok(s.players[0].shields.some(y=>y.uid===x.uid));assert.ok(!s.players[0].battle.some(y=>y.uid===x.uid));}
});
for(const ids of [[J,F],[J,W],[J,DEMON]])test('QA33599 simultaneous break grants both exact cards even after source leaves '+ids[1],()=>{
 const s=breakTwo(ids),uids=s.players[0].hand.map(x=>x.uid);assert.equal(s.players[0].shields.length,0);assert.equal(uids.length,2);assert.ok(s.triggers);assert.deepEqual(Object.keys(s.triggers.eligibleFaces).sort(),uids.slice().sort());useAll(s);assert.ok(s.players[0].battle.some(x=>x.cardId===J));assert.ok(!s.players[0].hand.some(x=>uids.includes(x.uid)));
});
test('QA33600 Justice itself gets a free S-trigger summon without a battlefield source or mana',()=>{
 const s=field();s.active=1;give(s,0,'mana',[]);give(s,0,'shields',[J]);s.players[0].shields[0].faceUp=true;give(s,1,'battle',[N]);attack(s);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===J);drain(s);assert.ok(s.players[0].battle.some(x=>x.cardId===J));assert.equal(s.players[0].mana.length,0);
});
test('one stacked shield grants S-trigger to every physical card including its face-up source',()=>{
 const s=field();s.active=1;give(s,0,'shields',[N]);const root=s.players[0].shields[0];root.shieldStack=[{...inst(J),faceUp:true},inst(F)];const uids=[root.uid,...root.shieldStack.map(x=>x.uid)];give(s,1,'battle',[N]);attack(s);act(s,'noBlock');assert.deepEqual(Object.keys(s.triggers.eligibleFaces).sort(),uids.sort());useAll(s);assert.equal(s.players[0].battle.length,3);
});
test('opponent-turn non-break recovery grants a free trigger without counting as a break',()=>{
 const s=field();s.active=1;give(s,0,'shields',[J,F]);s.players[0].shields[0].faceUp=true;const target=s.players[0].shields[0];s.extTasks=[{op:'g55_ShieldHand',p:0,source:J}];act(s,'toAttack');pick(s,target.uid);act(s,'useTrigger',a=>a.uid===target.uid);drain(s);assert.ok(s.players[0].battle.some(x=>x.uid===target.uid));assert.equal(s.players[0].brokenThisTurn||0,0);
});
test('simultaneous non-break recovery snapshots every physical card before the shield source leaves',()=>{
 const s=field();s.active=1;give(s,0,'shields',[J,F]);s.players[0].shields[0].faceUp=true;const ids=s.players[0].shields.map(x=>x.uid);s.extTasks=[{op:'g55_ShieldHand',p:0,source:J,g535Count:'all'}];act(s,'toAttack');assert.deepEqual(Object.keys(s.triggers.eligibleFaces).sort(),ids.sort());useAll(s);assert.equal(s.players[0].battle.length,2);assert.equal(s.players[0].brokenThisTurn||0,0);
});
test('a later break cannot inherit the grant after Justice has left the shield zone',()=>{
 const s=field();s.active=1;give(s,0,'shields',[J,F]);const [j,f]=s.players[0].shields;j.faceUp=true;s.extTasks=[{op:'g55_ShieldHand',p:0,source:J}];act(s,'toAttack');pick(s,j.uid);act(s,'skipTrigger');drain(s);give(s,1,'battle',[N]);attack(s);act(s,'noBlock');assert.ok(s.players[0].hand.some(x=>x.uid===f.uid));assert.ok(!s.triggers);assert.equal(s.players[0].battle.length,0);
});
test('grant requires opponent turn and a face-up source in own shields',()=>{
 for(const position of ['faceDown','battle','opponent']){const s=field();s.active=1;give(s,0,'shields',[F]);if(position==='faceDown')add(s,0,'shields',J);if(position==='battle')add(s,0,'battle',J);if(position==='opponent')add(s,1,'shields',J,{faceUp:true});give(s,1,'battle',[N]);attack(s);act(s,'noBlock');if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(s.players[0].shields[0].uid));assert.ok(!s.triggers);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'));}
 const own=field();give(own,0,'shields',[J]);own.players[0].shields[0].faceUp=true;own.extTasks=[{op:'g55_ShieldHand',p:0,source:J}];act(own,'toAttack');pick(own,own.players[0].shields[0].uid);assert.ok(!own.triggers);assert.equal(own.players[0].battle.length,0);
});
test('shield mute and no-S-trigger recovery override the new grant',()=>{
 const s=field();s.active=1;give(s,0,'shields',[J]);s.players[0].shields[0].faceUp=true;give(s,1,'battle',[MUTE,N]);attack(s,s.players[1].battle[1].uid);act(s,'noBlock');assert.ok(!s.triggers);
 for(const target of [J,F]){const own=field();own.active=1;give(own,0,'shields',[J,F]);own.players[0].shields[0].faceUp=true;const x=own.players[0].shields.find(x=>x.cardId===target);own.extTasks=[{op:'g40_ShieldOne',p:0,source:J}];act(own,'toAttack');pick(own,x.uid);drain(own);assert.ok(own.players[0].hand.some(y=>y.uid===x.uid));assert.equal(own.players[0].battle.length,0);assert.ok(!own.triggers);}
});
test('battlefield aura includes Justice and allies, never opposing creatures, and does not prevent spell targeting',()=>{
 const s=field();give(s,0,'battle',[J,N]);give(s,1,'battle',[N]);for(const x of s.players[0].battle){assert.equal(e.effectiveCard(x,s).unblockable,true);assert.equal(e.effectiveCard(x,s).cannotBeAttacked,true);x.tapped=true;}assert.ok(!e.effectiveCard(s.players[1].battle[0],s).cannotBeAttacked);s.active=1;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&s.players[0].battle.some(x=>x.uid===a.target)));s.phase='main';cast(s,DEMON);assert.deepEqual(new Set(s.decision.targets.map(x=>x.uid)),new Set(s.players[0].battle.map(x=>x.uid)));act(s,'effect',a=>a.targets.some(t=>t.uid===s.players[0].battle[0].uid));drain(s);assert.ok(!e.effectiveCard(s.players[0].battle[0],s).unblockable);
});
for(const disabled of ['sealed','faceDown','g35Ignored'])test('aura stops when its source is inactive: '+disabled,()=>{const s=field();give(s,0,'battle',[J,N]);const [j,n]=s.players[0].battle;j[disabled]=disabled==='g35Ignored'?s.turn:true;assert.ok(!e.effectiveCard(n,s).unblockable);assert.ok(!e.effectiveCard(n,s).cannotBeAttacked);});
test('Justice and allies cannot be blocked, retain their attack choice, and Justice actually breaks three shields',()=>{
 const s=field();give(s,0,'battle',[J,N]);const blocker=data.cards.find(c=>c.blocker&&c.type==='creature'&&c.cost===1);give(s,1,'battle',[blocker.id]);attack(s,s.players[0].battle[0].uid);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));if(s.decision?.type==='block')act(s,'noBlock');assert.equal(s.decision?.count,3);if(s.decision?.type==='breakChoice')act(s,'breakShields');drain(s);assert.equal(s.players[1].shields.length,2);assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===s.players[0].battle[1].uid));assert.ok(!s.players[1].battle[0].tapped);
});
test('QA33605 one multicolor Justice enables both Galaxy MAX modes',()=>{
 const s=field();give(s,0,'battle',[J]);give(s,1,'battle',[N]);give(s,0,'hand',[MAX,F]);act(s,'play',a=>a.cardId===MAX);assert.ok(s.decision.choices.some(c=>c.label.includes('両方')||c.label.includes('両')),JSON.stringify(s.decision));
 const both=e.getLegalActions(s).find(a=>/両/.test(s.decision.choices[a.choice]?.label));assert.ok(both);e.step(s,both);drain(s);assert.ok(s.players[0].shields.some(x=>x.cardId===F&&x.faceUp));assert.equal(s.players[1].battle.length,0);assert.equal(s.players[1].hand.length,1);
});
test('pending simultaneous grant survives encrypted room save and both player projections without exposing hidden cards',()=>{
 const s=breakTwo(),key=randomBytes(32).toString('base64'),room={schemaVersion:1,hostUid:'host',guestUid:'guest',profiles:[{name:'host'},{name:'guest'}],code:'1234567890ABCDEF',phase:'playing',revision:1,engineVersion:e.ENGINE_VERSION,expiresAt:Date.now()+60000,updatedAt:Date.now(),events:[],game:s},copy=openRoom(sealRoom(room,key),key);assert.deepEqual(copy.game.triggers.eligibleFaces,s.triggers.eligibleFaces);
 for(const uid of ['host','guest']){const v=projectRoom(copy,{uid});assert.equal(v.game.players[1-v.seat].hand.length,0);assert.ok(!JSON.stringify(v).includes(JSON.stringify(copy.game.players[1-v.seat].deck[0].uid)));}useAll(copy.game);assert.equal(copy.game.players[0].battle.length,2);
 const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id:J,count:1});assert.deepEqual(e.validateDeck(deck),[]);
});
