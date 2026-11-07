import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-601.json',import.meta.url)));
const BIUO='dmr21-025', JEALOUSY='dmr04-023', WHITE='dmr21-020', ENTERTAINER='promoy11-070', BUNKER='dm24rp1-048';
const MONO='dm01-083', MULTI='dmrp13-090', HUNTER='dmr04-048', BOUNCE='dm01-086';
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(MONO));
 return s;
}

function place(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}

function play(s,id){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

function deploy(s,p,id,origin){
 const x=place(s,p,origin,id);
 s.extTasks=[{op:'putCreature',p,source:BUNKER,uid:x.uid,origin}];
 act(s,'toAttack');
 return x;
}

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:601}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:600}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('T・ビウオ returns a creature that is not multicolored and has Slayer',()=>{
 const s=field(),mono=place(s,1,'battle',MONO),multi=place(s,1,'battle',MULTI),zero=place(s,1,'battle','dm24bd2-010');
 assert.equal(e.civilizations(e.card(multi.cardId)).length,2);
 const fish=play(s,BIUO);
 assert.deepEqual(new Set(values(s)),new Set([mono.uid,zero.uid]));
 pick(s,zero.uid);
 assert.ok(has(s,1,'hand',zero)&&has(s,1,'battle',multi));
 assert.equal(e.effectiveCard(fish,s).slayer,true);
});

test('ヨロレヒ taps with a Light Hunter even when there is no eligible creature to destroy',()=>{
 for(const hunter of [false,true]){
  const s=field(),multi=place(s,1,'battle',MULTI);
  if(hunter)place(s,0,'battle',HUNTER);
  play(s,JEALOUSY);
  if(hunter)pick(s,multi.uid);
  assert.equal(s.decision,null);
  assert.equal(multi.tapped,hunter);
  assert.ok(has(s,1,'battle',multi));
 }
});

test('ホワイトクライ returns non-multicolored creatures on both sides after it leaves',()=>{
 const s=field(1),white=place(s,0,'battle',WHITE);
 const own=place(s,0,'battle',MONO),enemy=place(s,1,'battle',MONO),multi=place(s,1,'battle',MULTI);
 play(s,BOUNCE);
 act(s,'effect',a=>a.targets.some(x=>x.uid===white.uid));
 assert.ok(has(s,0,'hand',white)&&has(s,0,'hand',own)&&has(s,1,'hand',enemy));
 assert.ok(has(s,1,'battle',multi));
});

test('エンターテイナー punishes free placement and S・トリガー on either turn',()=>{
 const s=field(),watcher=place(s,1,'battle',ENTERTAINER);
 const summon=play(s,MONO),free=deploy(s,0,MONO,'hand');
 assert.ok(has(s,0,'battle',summon)&&has(s,0,'grave',free));
 assert.ok(!e.effectiveCard(watcher,s).cannotBeAttacked);
 const ally=place(s,1,'battle',MONO);
 assert.ok(e.effectiveCard(watcher,s).cannotBeAttacked);
 s.active=1;
 give(s,0,'shields',[BIUO]);
 attack(s,ally.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 drain(s);
 assert.ok(s.players[0].grave.some(x=>x.cardId===BIUO));
});

test('バンカー checks the origin independently of whether the opponent paid mana',()=>{
 for(const origin of ['hand','grave','mana','deck']){
  const s=field();
  place(s,1,'battle',BUNKER);
  const entrant=deploy(s,0,MONO,origin);
  assert.equal(has(s,0,'battle',entrant),origin==='hand');
  assert.equal(has(s,0,'mana',entrant),origin!=='hand');
 }
 const paid=field(),summon=place(paid,0,'grave','dm25rp1-063');
 place(paid,1,'battle',BUNKER);
 act(paid,'play',a=>a.uid===summon.uid&&a.origin==='grave');
 act(paid,'evolve',a=>!a.baseUid);
 assert.ok(has(paid,0,'mana',summon));
 assert.equal(paid.players[0].mana.filter(x=>x.tapped).length,5);
});

test('バンカー ramps twice and may recover one card only on the opponent turn',()=>{
 for(const own of [0,1]){
  const s=field(0),bunker=place(s,own,'battle',BUNKER),before=s.players[own].mana.length;
  const top=s.players[own].deck[0],second=s.players[own].deck[1];
  play(s,BOUNCE);
  act(s,'effect',a=>a.targets.some(x=>x.uid===bunker.uid));
  if(own===1){
   assert.equal(s.players[own].mana.length,before+2);
   pick(s,top.uid);
   assert.ok(has(s,own,'hand',top)&&has(s,own,'mana',second));
  }else assert.equal(s.players[own].mana.length,before);
  assert.equal(s.decision,null);
 }
});
