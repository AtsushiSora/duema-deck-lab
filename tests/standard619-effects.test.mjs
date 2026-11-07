import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,inst,give,act,attack,drain,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-619.json',import.meta.url)));
const OSONIS='dmrp22-009', CHIZEN='dm22rp2-009', ELLIE='dm25rp2-017';
const LIGHT='dm01-075', WATER='dm01-083', DARK='dm01-090', FIRE='dm01-097', NATURE='dm01-108';
const TWIN='dmex12-074', RAINBOW='dmr23-068', SEED='dmsd20-016', LIGHT_SEED='dm25rp4-013';
const GEAR='dm14-110', SEED_CREATURE='dm22rp2-S8', HAND='dm01-027';

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(WATER));
 return s;
}
function put(s,p,id){
 const x=inst(id);s.players[p].battle.push(x);return x;
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const tapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
const cost=(s,p,id)=>e.summonCost(s,p,e.card(id));
const plays=s=>e.getLegalActions(s).filter(a=>a.kind==='play'&&!a.alternative);

for(const row of cards)test(row.name+' matches the official face and strict compiler',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:619}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:618}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Osonis taxes multicolored uses, and each Twinpact face uses its own civilizations',()=>{
 const s=field();
 put(s,1,OSONIS);give(s,0,'hand',[TWIN,RAINBOW]);
 const twin=e.playFaces(e.card(TWIN));
 assert.deepEqual(plays(s).filter(a=>a.cardId===TWIN).map(a=>a.cost),twin.map(face=>face.cost));
 assert.equal(plays(s).find(a=>a.cardId===RAINBOW).cost,5);
 assert.equal(cost(s,1,RAINBOW),3);
 put(s,1,OSONIS);
 assert.equal(cost(s,0,RAINBOW),7);
});

test('Chizen and Ellie stack on spells and standalone Tamaseeds, while Ellie also taxes gear generation',()=>{
 const s=field();
 put(s,1,OSONIS);put(s,1,CHIZEN);put(s,1,ELLIE);
 for(const [id,added] of [[RAINBOW,4],[SEED,2],[GEAR,1],[WATER,0],[SEED_CREATURE,0]]){
  assert.equal(cost(s,0,id),e.card(id).cost+added,e.card(id).name);
  assert.equal(cost(s,1,id),e.card(id).cost,e.card(id).name);
 }
 assert.equal(e.summonCost(s,0,{...e.card(GEAR),crossing:true}),1);
 put(s,0,GEN);
 for(const id of [RAINBOW,SEED,GEAR])assert.equal(cost(s,0,id),e.card(id).cost);
});

test('taxed main phase execution requires the extra mana and retains its payment on resume',()=>{
 let s=field();
 put(s,1,CHIZEN);put(s,1,ELLIE);give(s,0,'hand',[SEED]);
 give(s,0,'mana',[NATURE,NATURE]);
 assert.equal(plays(s).length,0);
 s.players[0].mana.push(inst(NATURE));
 const [a]=plays(s),before=physical(s);
 assert.equal(a.cost,3);
 e.step(s,a,{manualMana:true});
 assert.equal(s.decision.type,'manaPayment');
 assert.equal(s.decision.cost,3);
 s=JSON.parse(JSON.stringify(s));
 for(const mana of s.decision.pool)act(s,'selectMana',a=>a.uid===mana.uid);
 act(s,'confirmMana');
 drain(s);
 assert.equal(tapped(s,0),3);
 assert.ok(s.players[0].battle.some(x=>x.uid===a.uid));
 assert.deepEqual(physical(s),before);
});

test('a multicolored shield trigger remains free through all three taxes',()=>{
 const s=field(1),attacker=put(s,1,FIRE);
 for(const id of [OSONIS,CHIZEN,ELLIE])put(s,1,id);
 give(s,0,'shields',[RAINBOW]);give(s,0,'mana',[]);
 const before=physical(s);
 attack(s,attacker.uid);act(s,'noBlock');
 assert.equal(s.decision.type,'trigger');
 act(s,'useTrigger');drain(s);
 assert.ok(s.players[0].grave.some(x=>x.cardId===RAINBOW));
 assert.equal(tapped(s,0),0);
 assert.deepEqual(physical(s),before);
});

test('Chizen stays with three light creatures or Tamaseeds and can leave when that count drops',()=>{
 const s=field(),chizen=put(s,1,CHIZEN),light=put(s,1,LIGHT);
 put(s,1,LIGHT_SEED);
 const destroy=x=>{
  give(s,0,'hand',[HAND]);act(s,'play',a=>a.cardId===HAND);
  act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));drain(s);
 };
 destroy(chizen);
 assert.ok(s.players[1].battle.includes(chizen));
 destroy(light);
 assert.ok(s.players[1].grave.includes(light));
 destroy(chizen);
 assert.ok(s.players[1].grave.includes(chizen));
});

test('Chizen can stay at zero power until its Civil Count stops applying',()=>{
 const s=field(),chizen=put(s,1,CHIZEN),light=put(s,1,LIGHT);
 put(s,1,LIGHT_SEED);
 give(s,0,'hand',['dmr07-029',HAND]);
 act(s,'play',a=>a.cardId==='dmr07-029');
 act(s,'extended',a=>s.decision.choices[a.choice].value.uid===chizen.uid);
 assert.equal(e.power(chizen,false,s),0);
 assert.ok(s.players[1].battle.includes(chizen));
 act(s,'play',a=>a.cardId===HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===light.uid));drain(s);
 assert.ok(s.players[1].grave.includes(chizen));
});

test('Ellie offers three G-NEO civilizations and keeps taxing after its base leaves in its place',()=>{
 const s=field(),base=put(s,0,WATER);
 const fire=put(s,0,FIRE),dark=put(s,0,DARK);
 put(s,0,LIGHT);put(s,0,NATURE);
 give(s,0,'hand',[ELLIE]);
 const [a]=plays(s),before=physical(s);
 e.step(s,a);
 const choices=e.getLegalActions(s).filter(a=>a.kind==='evolve');
 assert.deepEqual(choices.map(a=>a.baseUid),[undefined,base.uid,fire.uid,dark.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 const ellie=s.players[0].battle.find(x=>x.uid===a.uid);
 assert.ok(e.isEvolution(ellie));
 assert.ok(e.effectiveCard(ellie,s).slayer);
 s.active=1;
 s.phase='main';
 give(s,1,'hand',[HAND]);act(s,'play',a=>a.cardId===HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===ellie.uid));drain(s);
 assert.ok(s.players[0].battle.includes(ellie));
 assert.ok(s.players[0].grave.includes(base));
 assert.ok(!e.isEvolution(ellie));
 assert.equal(cost(s,1,HAND),e.card(HAND).cost+1);
 assert.deepEqual(physical(s).filter(uid=>before.includes(uid)),before);
});
