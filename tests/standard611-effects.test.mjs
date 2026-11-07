import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,inst,give,act} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-611.json',import.meta.url)));
const GRINGLE='dmrp05-035', HELL='dmr17-044', DENKA='dmrp06-020', DOKEI='dmrp12-006';
const VEHICLE='dm01-083', EVO='dm14-s03';
function place(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
function attackPlayer(s,attacker){
 s.phase='attack';
 act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');
 if(s.decision?.type==='block')act(s,'noBlock');
}

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:611}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:610}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Gringle shields each card of an untapped evolution stack face down',()=>{
 const s=setup(),enemy=place(s,1,'battle',EVO),other=place(s,1,'battle',VEHICLE);
 const under=inst(VEHICLE);
 enemy.under=[under];
 other.tapped=true;
 const before=s.players[1].shields.length,spell=place(s,0,'hand',GRINGLE);
 act(s,'play',a=>a.uid===spell.uid);
 assert.deepEqual(s.decision.choices.map(o=>o.value.uid),[enemy.uid]);
 pick(s,enemy.uid);
 assert.ok(s.players[1].battle.includes(other));
 assert.equal(s.players[1].shields.length,before+2);
 for(const card of [enemy,under]){
  assert.ok(s.players[1].shields.includes(card));
  assert.ok(!card.faceUp);
 }
});

test('Hellmission saves a shield, then destroys an untapped enemy without targeting the attacker',()=>{
 const s=setup(),attacker=place(s,0,'battle',VEHICLE),enemy=place(s,0,'battle',VEHICLE),hell=place(s,1,'battle',HELL);
 const before=s.players[1].shields.length;
 attackPlayer(s,attacker);
 act(s,'saveShield',a=>a.uid===hell.uid);
 assert.ok(s.players[1].grave.includes(hell));
 assert.equal(s.players[1].shields.length,before);
 assert.deepEqual(s.decision.choices.map(o=>o.value.uid),[enemy.uid]);
 pick(s,enemy.uid);
 assert.ok(s.players[0].grave.includes(enemy));
 assert.ok(s.players[0].battle.includes(attacker));
});

test('Denka makes the opponent choose one discard when summoned',()=>{
 const s=setup(),enemy=place(s,1,'hand',VEHICLE),body=place(s,0,'hand',DENKA);
 act(s,'play',a=>a.uid===body.uid&&a.face===0);
 assert.equal(s.decision.player,1);
 pick(s,enemy.uid);
 assert.ok(s.players[0].battle.includes(body));
 assert.ok(s.players[1].grave.includes(enemy));
});

test('both Twinpact spell faces trigger from shields and only target untapped creatures',()=>{
 for(const [id,destination] of [[DENKA,'grave'],[DOKEI,'mana']]){
  const s=setup(),attacker=place(s,0,'battle',VEHICLE),enemy=place(s,0,'battle',VEHICLE);
  give(s,1,'shields',[id]);
  const spell=s.players[1].shields[0];
  attackPlayer(s,attacker);
  const use=e.chooseAI(s);
  assert.equal(use.kind,'useTrigger');
  assert.equal(use.face,1);
  e.step(s,use);
  assert.deepEqual(s.decision.choices.map(o=>o.value.uid),[enemy.uid]);
  pick(s,enemy.uid);
  assert.ok(s.players[0][destination].includes(enemy));
  assert.ok(s.players[0].battle.includes(attacker));
  assert.ok(s.players[1].grave.includes(spell));
 }
});

test('Dokeidaimos can be paid for and summoned from the grave and makes the opponent discard two',()=>{
 const s=setup(),body=place(s,0,'grave',DOKEI);
 give(s,1,'hand',Array(3).fill(VEHICLE));
 const [first,second]=s.players[1].hand;
 const untapped=()=>s.players[0].mana.filter(x=>!x.tapped).length;
 const before=untapped();
 act(s,'play',a=>a.uid===body.uid&&a.origin==='grave');
 assert.equal(untapped(),before-7);
 assert.equal(s.decision.player,1);
 pick(s,first.uid);pick(s,second.uid);
 assert.ok(s.players[0].battle.includes(body));
 assert.equal(s.players[1].hand.length,1);
});
