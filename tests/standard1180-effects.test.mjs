import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const {cards,regulationVerification}=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-1180.json',import.meta.url)));
const MEPHISTO='dmrp20-089',GEORGE='dmrp21-035',BINTA='dmex11-013';
const MONO='dm01-075',MULTI='dm24ex2-019',TWIN='dm24bd4-007',DIS='dmrp19-036';
const SEED='dm22ex1-086',SEED_CREATURE='dm22sd1-001',ATTACKER='dm08-049';
const add=(s,p,zone,id)=>{const x=inst(id);s.players[p][zone].push(x);return x;};
const play=(s,x,filter=()=>true)=>act(s,'play',a=>a.uid===x.uid&&filter(a));
const values=s=>(s.decision?.choices||[]).map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const field=()=>{
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(MONO));
 return s;
};
const top=(s,p,id)=>{const x=inst(id);s.players[p].deck.unshift(x);return x;};

test('verified prints use one canonical ID each and BINTA displays the official correction',()=>{
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id);
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1180}),row.spec);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(c.limit,regulationVerification.limits[row.id]);
  assert.equal(c.cost,row.faces[0].cost);
  assert.equal(c.power,Number(row.faces[0].powerText));
  assert.equal(c.manaValue,1);
  assert.equal(c.race,row.faces[0].race);
  assert.deepEqual(c.civilizations,row.faces[0].civilizations);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
  const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(bad,{phase:1180}));
 }
 assert.match(cat.get(BINTA).faces[0].abilityText,/このクリーチャーがバトルゾーンに出た時/);
 assert.equal(e.card(BINTA).abilityErrata.source,'https://dm.takaratomy.co.jp/rule/rulechange/31600/');
});

for(const id of [MONO,MULTI,TWIN]){
 test('Mephisto reveals exactly the top card and charges only a multicolored card '+id,()=>{
  const s=field(),p=s.active,x=top(s,p,id),source=add(s,p,'hand',MEPHISTO);
  const count=s.players[p].mana.length;
  play(s,source);drain(s);
  const reveal=s.log.filter(l=>l.type==='reveal');
  assert.equal(reveal.length,1);
  assert.ok(Object.values(reveal[0]).some(v=>typeof v==='string'&&v.includes(e.card(id).name)));
  if(id===MONO){
   assert.equal(s.players[p].deck[0].uid,x.uid);
   assert.equal(s.players[p].mana.length,count);
  }else{
   assert.ok(s.players[p].mana.includes(x));
   assert.equal(s.players[p].mana.length,count+1);
   assert.equal(x.tapped,true);
  }
 });
}

test('Mephisto grants optional Sasage one and is destroyed to give the discount',()=>{
 const s=field(),p=s.active,x=add(s,p,'hand',MEPHISTO);
 play(s,x);drain(s);
 const dis=add(s,p,'hand',DIS),before=s.players[p].mana.filter(y=>y.tapped).length;
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===dis.uid&&!a.alternative&&a.cost===5));
 play(s,dis,a=>a.alternative==='sasage'&&a.sasage.includes(x.uid)&&a.cost===4);
 drain(s);
 assert.ok(s.players[p].grave.includes(x)&&s.players[p].battle.includes(dis));
 assert.equal(s.players[p].mana.filter(y=>y.tapped).length-before,4);
});

for(const accept of [true,false]){
 test('George may mill two cards when its own tamaseed enters '+accept,()=>{
  const s=field(),p=s.active;
  add(s,p,'battle',GEORGE);
  const seed=add(s,p,'hand',SEED),before=s.players[p].deck.map(x=>x.uid);
  play(s,seed);
  assert.equal(s.decision.source,GEORGE);
  pick(s,accept?true:null);
  assert.deepEqual(s.players[p].deck.map(x=>x.uid),before.slice(accept?2:0));
  assert.equal(s.players[p].grave.length,accept?2:0);
 });
}

test('George watches an own tamaseed/creature and gives no prompt for plain creatures or opposing seeds',()=>{
 const s=field(),p=s.active;
 add(s,p,'battle',GEORGE);
 play(s,add(s,p,'hand',MONO));
 assert.equal(s.decision,null);
 play(s,add(s,p,'hand',SEED_CREATURE));
 assert.equal(s.decision.source,GEORGE);
 pick(s,null);
 s.active=1-p;s.phase='main';
 play(s,add(s,1-p,'hand',SEED));
 assert.equal(s.decision,null);
});

test('George is unable to attack but can block to protect its controller',()=>{
 const s=field(),p=s.active,g=add(s,p,'battle',GEORGE),enemy=add(s,1-p,'battle',ATTACKER);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===g.uid));
 s.active=1-p;attack(s,enemy.uid);
 act(s,'block',a=>a.uid===g.uid);
 drain(s);
 assert.ok(s.players[p].grave.includes(g));
 assert.equal(s.players[p].shields.length,5);
});

test('ignoring George prevents the seed trigger',()=>{
 const s=field(),p=s.active;
 add(s,p,'battle',GEORGE);add(s,1-p,'battle',GEN);
 play(s,add(s,p,'hand',SEED));
 assert.equal(s.decision,null);
 assert.equal(s.players[p].grave.length,0);
});

test('BINTA includes itself in the creature count and leaves noncreatures and costlier creatures alone',()=>{
 const s=field(),p=s.active,x=add(s,p,'hand',BINTA);
 add(s,p,'battle',MONO);add(s,p,'battle',SEED);
 const target=add(s,1-p,'battle',MONO),high=add(s,1-p,'battle',ATTACKER),seed=add(s,1-p,'battle','dmsd20-015');
 assert.equal(e.card(seed).cost,2);
 play(s,x);
 assert.deepEqual(values(s),[target.uid]);
 pick(s,target.uid);drain(s);
 assert.ok(s.players[1-p].grave.includes(target));
 assert.ok(s.players[1-p].battle.includes(high)&&s.players[1-p].battle.includes(seed));
});

test('BINTA can destroy the 1-cost attacker after entering as an S Trigger with no mana',()=>{
 const s=field(),p=s.active,x=add(s,p,'battle','dm01-100');
 const q=1-p;
 give(s,q,'shields',[BINTA,MONO,MONO,MONO,MONO]);
 give(s,q,'mana',[]);
 const shield=s.players[q].shields[0];
 assert.equal(e.card(x).cost,1);
 attack(s,x.uid);act(s,'noBlock');act(s,'useTrigger');
 assert.ok(s.players[q].battle.includes(shield));
 assert.deepEqual(values(s),[x.uid]);
 pick(s,x.uid);drain(s);
 assert.ok(s.players[p].grave.includes(x));
 assert.equal(s.players[q].mana.length,0);
});

test('BINTA leaves the board alone when no legal creature can be targeted',()=>{
 const s=field(),p=s.active,x=add(s,p,'hand',BINTA),enemy=add(s,1-p,'battle',MONO);
 add(s,p,'battle',SEED);
 play(s,x);
 assert.equal(s.decision,null);
 assert.ok(s.players[1-p].battle.includes(enemy));
});
