import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-688.json',import.meta.url)));

test('Phase 688 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:688}));
  assert.throws(()=>standardCardSpec(detail,{phase:687}));
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
  if(row.currentPrint){
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:688}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const ARMS='dm25-054',SOFT='dm30-017',KISEL='dm36-107';
const SMALL='dm01-108',FIRE='dm01-097',LIGHT='dm01-075',BOTH='dmr04-048',GYM='dmr21-047';
const field=(p=0)=>Object.assign(setup(),{active:p});
const put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const play=(s,id)=>{s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id);};
const power=(s,x)=>e.power(x,false,s);
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};
const has=(s,p,z,uid)=>s.players[p][z].some(x=>x.uid===uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

test('Senka needs two distinct friendly creatures even when one has both civilizations (QA 35554)',()=>{
 const s=field();
 play(s,ARMS);
 const arms=s.players[0].battle[0],base=power(s,arms);
 put(s,1,FIRE);
 put(s,0,BOTH);
 assert.equal(power(s,arms),base);
 put(s,0,LIGHT);
 assert.equal(power(s,arms),base+5000);
 s.players[0].battle.pop();
 put(s,0,FIRE);
 assert.equal(power(s,arms),base+5000);
 s.players[0].battle[1].sealed=true;
 assert.equal(power(s,arms),base);
});

test('Senka gains exactly 5000 from separate light and fire allies and loses it when the ability is ignored',()=>{
 let s=field(1);
 play(s,ARMS);
 const arms=s.players[1].battle[0],base=power(s,arms);
 put(s,1,LIGHT);
 put(s,1,FIRE);
 put(s,1,BOTH);
 assert.equal(power(s,arms),base+5000);
 assert.equal(e.power(arms,true,s),base+5000);
 s=JSON.parse(JSON.stringify(s));
 const restored=s.players[1].battle[0];
 assert.equal(power(s,restored),base+5000);
 restored.g35Ignored=s.turn;
 assert.equal(power(s,restored),base);
});

test('Softknuckle destroys itself before the attack reaches battle or a shield',()=>{
 const s=field(1),target=put(s,0,SOFT),attacker=put(s,1,SMALL);
 target.tapped=true;
 const all=physical(s);
 attack(s,attacker.uid,target.uid);
 noBlock(s);
 assert.ok(has(s,0,'grave',target.uid));
 assert.ok(has(s,1,'battle',attacker.uid));
 assert.ok(attacker.tapped);
 assert.equal(s.players[0].shields.length,5);
 assert.equal(s.attack,null);
 assert.deepEqual(physical(s),all);
});

test('Softknuckle stays in play when a different target is attacked and when its ability is ignored',()=>{
 const s=field(),attacker=put(s,0,SMALL),target=put(s,1,SOFT);
 attack(s,attacker.uid);
 noBlock(s);
 assert.ok(has(s,1,'battle',target.uid));
 assert.equal(s.players[1].shields.length,4);
 attacker.tapped=false;
 target.tapped=true;
 target.g35Ignored=s.turn;
 attack(s,attacker.uid,target.uid);
 noBlock(s);
 assert.ok(has(s,1,'battle',target.uid));
 assert.ok(has(s,0,'grave',attacker.uid));
});

for(const p of [0,1])test('Kisel moves to its own mana only after an opponent creature enters '+p,()=>{
 let s=field(p);
 play(s,KISEL);
 const k=s.players[p].battle[0];
 play(s,SMALL);
 s.active=1-p;
 play(s,GYM);
 assert.ok(has(s,p,'battle',k.uid));
 s=JSON.parse(JSON.stringify(s));
 const before=s.players[p].mana.length;
 s.players[1-p].hand.push(inst(SMALL));
 const all=physical(s);
 act(s,'play',a=>a.cardId===SMALL);
 assert.equal(s.players[p].mana.length,before+1);
 assert.ok(s.players[p].mana.some(x=>x.uid===k.uid&&!x.tapped));
 assert.ok(!has(s,p,'battle',k.uid));
 assert.deepEqual(physical(s),all);
});
