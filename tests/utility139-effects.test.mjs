import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';
import {UTILITY139_DECKS} from '../tools/fixtures/utility139.mjs';
const H='dmr19-078',D='dmrp01-072',W='dmrp06-072',N='dm01-108',GEN='dmrp15-km1';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-139.json',import.meta.url))),physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const options=s=>e.getLegalActions(s).map(a=>({...a,...(a.kind==='extended'?s.decision.choices[a.choice]:{})}));
function pick(s,uid){const o=options(s).find(a=>a.value?.uid===uid);assert.ok(o,JSON.stringify(s.decision));e.step(s,e.getLegalActions(s).find(a=>a.id===o.id));}
const withPower=(s,p,n)=>{const x=inst(N);x.powerModifiers=[{amount:n-e.card(N).power}];s.players[p].battle.push(x);return x;};

test('three new names match official faces, actual images and unrestricted four-copy limits',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(manifest.cards.length,3);assert.ok(manifest.regulationVerification.allThreeUnrestricted);
 for(const r of manifest.cards){assert.deepEqual(r.faces,details.cards.find(c=>c.id===r.id).faces);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(r.id).supportBatch,'phase-139');assert.equal(e.card(r.id).limit,4);assert.equal(e.card(r.id).cost,r.faces[0].cost);assert.equal(CARD_IMAGES[r.id],r.image);assert.ok(registry.get(r.id).supported);}
 for(const d of UTILITY139_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(registry.coverage(d).unsupported,0);assert.equal(d.cards.reduce((n,c)=>n+c.count,0),40);}
});

test('Howeiru pays four mana and draws exactly three physical cards with no optional choice',()=>{
 const s=setup();give(s,0,'deck',[N,N,N,N,N]);give(s,0,'hand',[D]);const ids=s.players[0].deck.slice(0,3).map(x=>x.uid),before=physical(s);act(s,'play',a=>a.cardId===D);
 assert.equal(s.decision,null);assert.deepEqual(s.players[0].hand.map(x=>x.uid),ids);assert.equal(s.players[0].deck.length,2);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);assert.ok(s.players[0].grave.some(x=>x.cardId===D));assert.deepEqual(physical(s),before);
});

test('mandatory drawing the last card loses normally but a living Shako replaces it with a win',()=>{
 for(const shako of [false,true]){const s=setup();give(s,0,'deck',[N,N,N]);if(shako)give(s,0,'battle',['dmrp03-s03']);cast(s,D);assert.equal(s.winner,shako?0:1);}
});

test('Harite and Water Clock use current power, include the boundary and exclude own creatures and larger targets',()=>{
 for(const [id,max,to] of [[H,6000,'grave'],[W,3000,'hand']]){
  const s=setup(),own=withPower(s,0,1000),ok=withPower(s,1,max),large=withPower(s,1,max+1);cast(s,id);
  const physicalBefore=physical(s);assert.equal(s.decision.task.op,'g34_Target');assert.equal(s.decision.player,0);
  assert.deepEqual(options(s).map(a=>a.value?.uid),[ok.uid]);assert.ok(!options(s).some(a=>a.value?.uid===own.uid||a.value?.uid===large.uid));
  const saved=JSON.parse(JSON.stringify(s));pick(saved,ok.uid);assert.ok(saved.players[1][to].some(x=>x.uid===ok.uid));assert.ok(saved.players[1].battle.some(x=>x.uid===large.uid));assert.ok(saved.players[0].battle.some(x=>x.uid===own.uid));assert.deepEqual(physical(saved),physicalBefore);
 }
});

test('removal with no eligible target resolves without a pending choice',()=>{
 for(const [id,max] of [[H,6000],[W,3000]]){const s=setup(),x=withPower(s,1,max+1);cast(s,id);assert.equal(s.decision,null);assert.ok(s.players[1].battle.some(y=>y.uid===x.uid));assert.ok(s.players[0].grave.some(y=>y.cardId===id));}
});

test('Just Diver cannot be selected and a destruction replacement still returns the target to hand',()=>{
 const s=setup();give(s,1,'battle',['dm23rp3-013']);s.players[1].battle[0].justDiverActive=true;cast(s,W);assert.equal(s.decision,null);assert.equal(s.players[1].battle.length,1);
 const t=setup();give(t,1,'battle',['dm31-041']);const uid=t.players[1].battle[0].uid;cast(t,H);pick(t,uid);drain(t);assert.ok(t.players[1].hand.some(x=>x.uid===uid));assert.equal(t.players[1].grave.length,0);
});

test('both defensive spells can be used as zero-mana shield triggers to stop a later attack',()=>{
 for(const id of [H,W]){const s=setup();give(s,0,'mana',[]);give(s,0,'shields',[id]);give(s,1,'battle',[N,N]);s.active=1;s.phase='attack';const attacker=s.players[1].battle[0],target=s.players[1].battle[1];act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===id);pick(s,target.uid);drain(s);assert.ok(!s.players[1].battle.some(x=>x.uid===target.uid));assert.equal(s.players[0].mana.length,0);assert.equal(s.players[0].shields.length,0);assert.ok(s.players[0].grave.some(x=>x.cardId===id));}
});

test('Genmu ignores all three low-cost spell effects without moving their targets or drawing',()=>{
 for(const id of [H,D,W]){const s=setup();give(s,1,'battle',[GEN,N]);const n=s.players[0].deck.length;cast(s,id);assert.equal(s.decision,null);assert.equal(s.players[0].deck.length,n);assert.ok(s.players[1].battle.some(x=>x.cardId===N));}
});

test('CPU values useful targets and draw, avoids empty removal and deadly draw',()=>{
 const score=(s,id)=>{give(s,0,'hand',[id]);return e.rankHeuristicActions(s).find(x=>x.a.kind==='play'&&x.a.cardId===id).value;};
 for(const id of [H,W]){const s=setup(),t=setup();withPower(s,1,2000);assert.ok(score(s,id)>score(t,id));}
 const s=setup(),t=setup();give(t,0,'deck',[N,N,N]);assert.ok(score(s,D)>0);assert.ok(score(t,D)<0);give(t,0,'battle',['dmrp03-s03']);assert.ok(score(t,D)>0);
});
