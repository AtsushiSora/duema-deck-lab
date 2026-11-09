import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-740.json',import.meta.url)));

test('Phase 740 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:740}));
  assert.throws(()=>standardCardSpec(detail,{phase:739}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:740}));
 }
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of printAliases){
  const original=cards.find(c=>c.id===row.canonicalId);
  const stats=faces=>faces.map(({abilityText,...face})=>face);
  assert.deepEqual(stats(row.faces),stats(original.faces));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:740}),original.spec);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
 }
});

const MASK='dmsp01-007',TORCH='dm22rp1-005',WIND='dm24rp3-022';
const LOW='dm01-083',MED='dm01-108',BOUNDARY='dm01-087',HIGH='dm08-049',DARK='dm36-087',SEED='dmrp21-062';
const field=(active=0)=>Object.assign(setup(),{active});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const options=s=>s.decision.choices.map(o=>o.value);
const pick=(s,x)=>act(s,'extended',a=>s.decision.choices[a.choice].value===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function play(s,id){
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function entry(s,civil){
 const entry=s.decision.type==='entryOrder';
 const queue=entry?s.triggers.entries:s.pendingEffects;
 act(s,entry?'orderEntry':'orderEffect',a=>queue.some(e=>e.effectId===a.effectId&&(e.label==='シビルカウント3')===civil));
}

test('Mask uses current power and gives the opponent the choice among tied minima after restore',()=>{
 let s=field();
 const own=put(s,0,LOW),buffed=put(s,1,LOW,{powerModifiers:[{amount:2000}]}),a=put(s,1,MED),b=put(s,1,MED);
 play(s,MASK);
 assert.equal(s.decision.player,1);
 assert.deepEqual(options(s),[a.uid,b.uid]);
 s=restore(s);
 pick(s,b);
 assert.ok(has(s,1,'grave',b)&&has(s,1,'battle',a)&&has(s,1,'battle',buffed)&&has(s,0,'battle',own));
});

test('Mask can be summoned for free from a broken shield and can destroy the attacker',()=>{
 const s=field(1),attacker=put(s,1,LOW),other=put(s,1,HIGH);
 give(s,0,'shields',[MASK]);
 give(s,0,'mana',[]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.player,1);
 assert.deepEqual(options(s),[attacker.uid]);
 pick(s,attacker);
 assert.ok(has(s,1,'grave',attacker)&&has(s,1,'battle',other));
 assert.equal(s.metrics[0].triggers,1);
 assert.ok(s.players[0].battle.some(x=>x.cardId===MASK));
});

test('The opponent can choose their own creature with protection from enemy choices',()=>{
 const s=field(),oni=put(s,1,'dmrp01-041'),high=put(s,1,HIGH);
 play(s,MASK);
 assert.deepEqual(options(s),[oni.uid]);
 pick(s,oni);
 assert.ok(has(s,1,'grave',oni)&&has(s,1,'battle',high));
});

test('Torch counts itself and a darkness tamaseed and recalculates highest after lowest resolves',()=>{
 const s=field();
 put(s,0,DARK);put(s,0,SEED);
 const low=put(s,1,LOW),a=put(s,1,HIGH),b=put(s,1,HIGH);
 play(s,TORCH);
 entry(s,false);
 assert.deepEqual(options(s),[low.uid]);
 pick(s,low);
 assert.deepEqual(options(s),[a.uid,b.uid]);
 pick(s,b);
 assert.ok(has(s,1,'grave',low)&&has(s,1,'grave',b)&&has(s,1,'battle',a));
});

test('Torch resolves either entry effect first and a failed Civil Count leaves the highest intact',()=>{
 const s=field();
 put(s,0,DARK);put(s,0,'dmsd20-008');
 const low=put(s,1,LOW),high=put(s,1,HIGH);
 play(s,TORCH);
 entry(s,true);
 assert.deepEqual(options(s),[low.uid]);
 pick(s,low);
 assert.ok(has(s,1,'grave',low)&&has(s,1,'battle',high));
});

test('Torch summoned by shield trigger can resolve Civil Count first against tied creatures',()=>{
 const s=field(1),attacker=put(s,1,HIGH),other=put(s,1,HIGH);
 put(s,0,DARK);put(s,0,SEED);
 give(s,0,'shields',[TORCH]);
 give(s,0,'mana',[]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 entry(s,true);
 assert.deepEqual(options(s),[attacker.uid,other.uid]);
 pick(s,other);
 assert.deepEqual(options(s),[attacker.uid]);
 pick(s,attacker);
 assert.ok(has(s,1,'grave',attacker)&&has(s,1,'grave',other));
 assert.equal(s.metrics[0].triggers,1);
});

test('Torch can block without dying to its own ability and dies after its own shield break',()=>{
 const defending=field(1),blocker=put(defending,0,TORCH),attacker=put(defending,1,LOW);
 attack(defending,attacker.uid);
 act(defending,'block');
 drain(defending);
 assert.ok(has(defending,0,'battle',blocker)&&has(defending,1,'grave',attacker));
 const s=field(),torch=put(s,0,TORCH);
 attack(s,torch.uid);
 assert.ok(has(s,0,'battle',torch));
 assert.equal(s.players[1].shields.length,5);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 assert.ok(has(s,0,'grave',torch));
});

test('Wind sweeps enemy power 3000 or lower including unselectable creatures',()=>{
 const s=field(),own=put(s,0,LOW),small=put(s,1,LOW,{g34Grants:[{turn:s.turn,untargetable:true}]}),boundary=put(s,1,BOUNDARY),high=put(s,1,HIGH);
 play(s,WIND);
 assert.ok(has(s,1,'grave',small)&&has(s,1,'grave',boundary)&&has(s,1,'battle',high)&&has(s,0,'battle',own));
});

for(const targetPlayer of [true,false])test('Wind triggers once for an attack on '+(targetPlayer?'the player':'a defending creature'),()=>{
 const s=field(1),wind=put(s,0,WIND,{tapped:true}),attacker=put(s,1,LOW);
 const alreadyTapped=put(s,1,LOW,{tapped:true}),a=put(s,1,MED),b=put(s,1,MED),high=put(s,1,HIGH);
 attack(s,attacker.uid,targetPlayer?'player':wind.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(options(s),[a.uid,b.uid]);
 pick(s,b);
 assert.ok(has(s,1,'grave',b)&&has(s,1,'battle',a)&&has(s,1,'battle',alreadyTapped)&&has(s,1,'battle',high));
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s,0,'battle',wind)&&has(s,1,'battle',a));
 assert.equal(has(s,1,'grave',attacker),!targetPlayer);
});

test('Wind summoned as a trigger does not retroactively trigger for the same attack',()=>{
 const s=field(1),attacker=put(s,1,HIGH),other=put(s,1,HIGH),small=put(s,1,LOW);
 give(s,0,'shields',[WIND,MED]);
 give(s,0,'mana',[]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',other)&&has(s,1,'grave',small));
 assert.ok(s.players[0].battle.some(x=>x.cardId===WIND));
});
