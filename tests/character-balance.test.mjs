import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {e,setup,give,act,drain} from './target-fixture.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const characters=[...read('dist/hero-decks.json').heroes,...read('dist/rival-decks.json').rivals],record=read('tools/character-balance-0.146.0.json');
const challenge=(s,id)=>{s.active=1;s.challenge={heroId:id,seat:1,signature:characters.find(h=>h.id===id).signature};return s;};
const selected=s=>s.decision.choices[e.chooseAI(s).choice];
test('eight themed decks retain their signatures with only two to six physical replacements',()=>{
 assert.equal(characters.length,8);
 for(const h of characters){const change=record.changes.find(x=>x.id===h.id);assert.deepEqual(h.cards,change.after);assert.deepEqual(e.validateDeck(h),[]);assert.equal(h.cards.reduce((n,x)=>n+x.count,0),40);
  const before=new Map(change.before.map(x=>[x.id,x.count])),added=h.cards.reduce((n,x)=>n+Math.max(0,x.count-(before.get(x.id)||0)),0);assert.ok(added>=2&&added<=6,h.id);assert.ok(h.signature.every(id=>h.cards.some(x=>x.id===id)&&change.before.some(x=>x.id===id)));
 }
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../dist/hero-draw.js',import.meta.url))).digest('hex'),record.openingAndDrawPolicySha256);
 for(const row of record.cards){assert.ok(row.verification.facesMatched);assert.equal(record.regulationVerification.limits[row.id],4);}
});
test('dragon characters keep the sole early twinpact ramp instead of charging it',()=>{
 for(const id of ['shobu','katta','kaiza']){const s=challenge(setup(),id);s.phase='charge';s.turn=1;give(s,1,'mana',[]);give(s,1,'hand',['dmbd16-008','dmc27-004','dm23rp4-OR2','dm23rp4-OR2','dm01-108']);
  const a=e.chooseAI(s);assert.equal(a.kind,'charge');assert.notEqual(a.cardId,'dmbd16-008',id);
 }
});
test('Hakuoh deploys Lodriess before Wellkius through the same gate and gains entry draws',()=>{
 const s=challenge(setup(),'hakuoh');give(s,1,'hand',['dm16-007','dmrp09-s03','dmc52-003']);give(s,1,'deck',Array(20).fill('dm01-108'));const n=s.players[1].deck.length;
 act(s,'play',a=>a.cardId==='dm16-007');assert.equal(selected(s).cardId,'dmc52-003');e.step(s,e.chooseAI(s));assert.equal(selected(s).cardId,'dmrp09-s03');e.step(s,e.chooseAI(s));drain(s);
 assert.deepEqual(s.players[1].battle.map(x=>x.cardId),['dmc52-003','dmrp09-s03']);assert.ok(s.players[1].deck.length<=n-3);
});
test('a single gate slot prefers a deployment chain over a larger plain blocker',()=>{
 const s=challenge(setup(),'hakuoh');give(s,1,'hand',['dm24rp1-012','dmrp09-s03','dmrp05-002','dmc52-003']);
 act(s,'play',a=>a.cardId==='dm24rp1-012');assert.equal(s.decision.task.op,'g20Select');assert.equal(selected(s).cardId,'dmrp09-s03');
});
test('duplicate draw engines do not displace a Wellkius deployment chain',()=>{
 const s=challenge(setup(),'hakuoh');give(s,1,'battle',['dmc52-003']);give(s,1,'hand',['dm16-007','dmc52-003','dmrp09-s03','dm24rp1-012']);
 act(s,'play',a=>a.cardId==='dm16-007');assert.equal(selected(s).cardId,'dmrp09-s03');
});
test('Win revives Jashin before a same-cost Abyss to open grave summons',()=>{
 const s=challenge(setup(),'win');give(s,1,'grave',['dm24rp3-020','dm22rp1-1B']);give(s,1,'hand',['dm22rp1-017']);give(s,1,'deck',Array(12).fill('dm01-108'));
 act(s,'play',a=>a.cardId==='dm22rp1-017');assert.equal(s.decision.task.op,'g34_Select');assert.equal(selected(s).cardId,'dm22rp1-1B');e.step(s,e.chooseAI(s));drain(s);assert.ok(s.players[1].battle.some(x=>x.cardId==='dm22rp1-1B'));
});
test('Joe discards Helt to copy useful draw with Joragon, preserving the finisher',()=>{
 const s=challenge(setup(),'joe');give(s,1,'battle',['dmrp05-m02','dmsd01-012','dmsd01-004']);give(s,1,'hand',['dm24bd2-010','dm24bd2-001']);give(s,1,'deck',Array(20).fill('dm01-108'));s.phase='attack';
 act(s,'attack',a=>a.uid===s.players[1].battle[0].uid&&a.target==='player');
 for(let n=0;s.decision?.task?.op!=='discard'&&n<20;n++){assert.ok(s.decision);e.step(s,e.chooseAI(s));}
 assert.equal(s.decision.task.op,'discard');assert.equal(selected(s).cardId,'dm24bd2-010');const before=s.players[1].deck.length;e.step(s,e.chooseAI(s));
 for(let n=0;s.decision&&s.decision.type!=='block'&&n<30;n++)e.step(s,e.chooseAI(s));
 assert.ok(s.players[1].grave.some(x=>x.cardId==='dm24bd2-010'));assert.ok(s.players[1].hand.some(x=>x.cardId==='dm24bd2-001'));assert.equal(s.players[1].deck.length,before-3);
});
test('Kira uses Dragon Sign for Savak removal when an enemy threat is public',()=>{
 const s=challenge(setup(),'kira');give(s,0,'battle',['dmc27-004']);give(s,1,'hand',['dmr13-016','dmex12-s04','dmrp04s-m02']);
 act(s,'play',a=>a.cardId==='dmr13-016');assert.equal(s.decision.task.op,'g2_Sign');assert.equal(selected(s).cardId,'dmrp04s-m02');
});
test('normal match gate selection retains its existing cost policy',()=>{
 const s=setup();give(s,0,'hand',['dm16-007','dmrp09-s03','dmc52-003']);act(s,'play',a=>a.cardId==='dm16-007');assert.equal(selected(s).cardId,'dmrp09-s03');
});
