import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-716.json',import.meta.url)));

test('Phase 716 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:716}));
  assert.throws(()=>standardCardSpec(detail,{phase:715}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:716}));
 }
 for(const row of printAliases){
  const canonical=cards.find(x=>x.id===row.canonicalId);
  assert.equal(row.name,canonical.name);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:716}),canonical.spec);
  assert.ok(row.verification.facesMatched);
  assert.match(row.image,/^https:\/\/dm\.takaratomy\.co\.jp\/.*\.jpg$/);
  assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[canonical.id]);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
});

const SASHA='dm08-006',GIANT='dm09-s05',CRUISER='dm05-s03';
const FIRE='dm01-097',LIGHT='dm01-075',NATURE='dm01-108',SPELL='dm01-052',MURU='dm26-021';
const DRAGON='dm06-s08',HULCUS='dm01-080',LANCER='dm02-024',SHIELD_REPLACEMENT='dmrp17-s07';
const restore=s=>JSON.parse(JSON.stringify(s));
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const field=()=>Object.assign(setup(),{active:0,phase:'attack'});
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===(value?.uid??value);
});
const options=s=>s.decision.choices.map(c=>c.value);
function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
const isBlockOption=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===x.uid);

test('Sasha blocks Dragons only and gains power just for an actual battle against a Dragon',()=>{
 const s=field(),dragon=put(s,0,DRAGON,{powerModifiers:[{amount:5000}]}),sasha=put(s,1,SASHA);
 assert.equal(e.power(sasha,false,s),9500);
 assert.equal(e.matchupPower(sasha,dragon,false,s),15500);
 attack(s,dragon.uid);
 assert.equal(isBlockOption(s,sasha),true);
 act(s,'block',a=>a.uid===sasha.uid);
 drain(s);
 assert.ok(find(s,0,'grave',dragon));
 assert.equal(e.power(sasha,false,s),9500);
});

test('Sasha remains a blocker for effects and can independently gain ordinary Blocker',()=>{
 for(const ordinary of [false,true]){
  const s=field(),nonDragon=put(s,0,FIRE),sasha=put(s,1,SASHA);
  if(ordinary)sasha.g19Blocker=s.turn;
  assert.equal(e.effectiveCard(sasha,s).blocker,true);
  assert.equal(e.matchupPower(sasha,nonDragon,false,s),9500);
  attack(s,nonDragon.uid);
  assert.equal(isBlockOption(s,sasha),ordinary);
 }
 const s=field(),sasha=put(s,0,SASHA);
 put(s,0,MURU);
 assert.equal(e.power(sasha,false,s),12500);
});

test('Sasha also gets its battle power while attacking a Dragon, and retains W Breaker',()=>{
 const s=field(),sasha=put(s,0,SASHA),dragon=put(s,1,DRAGON,{tapped:true,powerModifiers:[{amount:5000}]});
 attack(s,sasha.uid,dragon.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(find(s,1,'grave',dragon));
 assert.ok(find(s,0,'battle',sasha));
 const next=field(),b=put(next,0,SASHA);
 give(next,1,'shields',[FIRE,NATURE]);
 attack(next,b.uid);
 act(next,'noBlock');
 drain(next);
 assert.equal(next.players[1].shields.length,0);
});

test('Giant lets the opponent put Hulcus down, evolve Lancer on it, then draw (QA 35160)',()=>{
 let s=field();
 give(s,1,'hand',[LANCER,HULCUS,SPELL]);
 give(s,1,'mana',[]);
 const [evo,base,spell]=s.players[1].hand,deck=s.players[1].deck.length;
 play(s,GIANT);
 assert.equal(s.decision.player,1);
 assert.deepEqual(options(s),[base.uid,null]);
 pick(s,base);
 assert.ok(find(s,1,'battle',base));
 assert.equal(s.players[1].deck.length,deck);
 assert.deepEqual(options(s),[evo.uid,null]);
 s=restore(s);
 pick(s,evo);
 pick(s,base);
 assert.deepEqual(find(s,1,'battle',evo).under.map(y=>y.uid),[base.uid]);
 assert.equal(s.decision.type,'draw');
 assert.equal(s.players[1].deck.length,deck);
 act(s,'draw',a=>a.n===1);
 drain(s);
 assert.equal(s.players[1].deck.length,deck-1);
 assert.ok(find(s,1,'hand',spell));
 assert.equal(s.players[1].mana.length,0);
});

test('Giant permits zero or one, and deploying twice never opens a third choice',()=>{
 for(const count of [0,1,2]){
  const s=field();
  give(s,1,'hand',[LIGHT,NATURE,FIRE]);
  const hand=[...s.players[1].hand];
  play(s,GIANT);
  for(let i=0;i<count;i++)pick(s,hand[i]);
  if(count<2)pick(s,null);
  assert.equal(s.decision,null);
  assert.equal(s.players[1].battle.length,count);
  assert.equal(s.players[1].hand.length,3-count);
  assert.equal(s.g34DeployBatch,undefined);
 }
});

test('Giant keeps T Breaker and applies the opponent’s entry restrictions',()=>{
 const s=field();
 put(s,0,'dm26rp1-S008');
 give(s,1,'hand',[FIRE]);
 play(s,GIANT);
 assert.equal(s.players[1].battle.length,0);
 assert.equal(s.decision,null);
 const t=field(),x=put(t,0,GIANT);
 give(t,1,'shields',[FIRE,NATURE,LIGHT]);
 attack(t,x.uid);
 act(t,'noBlock');
 drain(t);
 assert.equal(t.players[1].shields.length,0);
});

test('Cruiser destroys its other creatures as a group while keeping itself and opposing creatures',()=>{
 const s=field(),old=put(s,0,CRUISER),ally=put(s,0,FIRE),enemy=put(s,1,LIGHT);
 const x=play(s,CRUISER);
 drain(s);
 assert.deepEqual(s.players[0].battle.map(y=>y.uid),[x.uid]);
 assert.deepEqual(s.players[0].grave.map(y=>y.uid),[old.uid,ally.uid]);
 assert.ok(find(s,1,'battle',enemy));
});

test('Cruiser uses normal destruction replacement and retains T Breaker',()=>{
 const s=field(),protectedUnit=put(s,0,SHIELD_REPLACEMENT),other=put(s,0,FIRE);
 const shield=s.players[0].shields[0];
 protectedUnit.exLifeShieldUid=shield.uid;
 play(s,CRUISER);
 drain(s);
 assert.ok(find(s,0,'battle',protectedUnit));
 assert.ok(find(s,0,'grave',other));
 assert.ok(find(s,0,'grave',shield));
 const t=field(),x=put(t,0,CRUISER);
 give(t,1,'shields',[FIRE,NATURE,LIGHT]);
 attack(t,x.uid);
 act(t,'noBlock');
 drain(t);
 assert.equal(t.players[1].shields.length,0);
});
