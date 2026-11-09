import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-695.json',import.meta.url)));

test('Phase 695 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:695}));
  assert.throws(()=>standardCardSpec(detail,{phase:694}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:695}));
 }
});

const SOL='dm08-038',KUKAI='dm08-001',BAILE='dm05-001',BASE='dm05-021';
const BODY='dm01-108',PEACAP='dm06-032',SLAYER='dm01-088',SPARK='dm01-015',HAMMER='dm01-101',GUARD='dm26rp3-010';
const put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const play=(s,id)=>{const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid);return x;};
const block=(s,x)=>act(s,'block',a=>a.uid===x.uid);
const pick=(s,uid)=>act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===uid);
const find=(s,p,z,uid)=>s.players[p][z].find(x=>x.uid===uid);

test('La Baile reprints share the canonical card rules, limits and identity',()=>{
 assert.deepEqual(printAliases.map(x=>x.id),['dm18-001','dmc37-008']);
 for(const row of printAliases){
  assert.equal(row.canonicalId,BAILE);
  assert.equal(row.name,e.card(BAILE).name);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:695}),cards.find(x=>x.id===BAILE).spec);
  assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[BAILE]);
  assert.ok(row.verification.facesMatched);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
});

for(const owner of [0,1])test('Sol boosts for both players’ spells, stacks and expires at turn end '+owner,()=>{
 const s=setup(),sol=put(s,owner,SOL);
 const caster=s.active;
 assert.equal(e.power(sol,false,s),1000);
 play(s,BODY);
 assert.equal(e.power(sol,false,s),1000);
 play(s,SPARK);
 play(s,SPARK);
 assert.equal(e.power(sol,false,s),7000);
 s.phase='attack';act(s,'endTurn');
 assert.equal(s.active,1-caster);
 assert.equal(e.power(sol,false,s),1000);
 s.phase='main';
 play(s,SPARK);
 assert.equal(e.power(sol,false,s),4000);
});

test('Sol remains within Crimson Hammer range until that spell has resolved',()=>{
 const s=setup(),sol=put(s,1,SOL),other=put(s,0,SOL);
 play(s,HAMMER);
 assert.equal(s.decision.type,'effect');
 assert.equal(e.power(sol,false,s),1000);
 act(s,'effect',a=>a.targets?.[0]?.uid===sol.uid);
 assert.ok(find(s,1,'grave',sol.uid));
 assert.equal(e.power(other,false,s),4000);
});

test('Kukai evolves only from an own Mecha Thunder and can only attack creatures',()=>{
 const s=setup(),nonBase=put(s,0,BODY),enemy=put(s,1,BASE);
 const kukai=inst(KUKAI);s.players[0].hand.push(kukai);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===kukai.uid));
 const ownBase=put(s,0,BASE);
 act(s,'play',a=>a.uid===kukai.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[ownBase.uid]);
 act(s,'evolve',a=>a.baseUid===ownBase.uid);
 assert.ok(find(s,0,'battle',kukai.uid).under.some(x=>x.uid===ownBase.uid));
 s.phase='attack';enemy.tapped=true;
 const targets=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===kukai.uid).map(a=>a.target);
 assert.deepEqual(targets,[enemy.uid]);
 assert.ok(find(s,0,'battle',nonBase.uid));
});

for(const id of [KUKAI,BAILE])test(id+' survives a block battle and is ready to block again',()=>{
 const s=setup(),first=put(s,0,BODY),second=put(s,0,BODY),defender=put(s,1,id);
 for(const attacker of [first,second]){
  attack(s,attacker.uid);
  block(s,defender);
  assert.ok(find(s,0,'grave',attacker.uid));
  assert.equal(find(s,1,'battle',defender.uid).tapped,false);
  assert.equal(s.players[1].shields.length,5);
 }
 assert.deepEqual(s.log.filter(x=>['battle','afterBattle'].includes(x.type)).map(x=>x.type),['battle','afterBattle','battle','afterBattle']);
});

test('A non-blocking creature battle or a blocked attack with no battle cannot untap La Baile',()=>{
 const s=setup(),attacker=put(s,0,BODY),defender=put(s,1,BAILE);
 defender.tapped=true;
 attack(s,attacker.uid,defender.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.ok(find(s,0,'grave',attacker.uid));
 assert.equal(defender.tapped,true);
 const t=setup(),peacap=put(t,0,PEACAP),baile=put(t,1,BAILE);
 attack(t,peacap.uid);
 block(t,baile);
 assert.equal(baile.tapped,true);
 assert.ok(!t.log.some(x=>['battle','afterBattle'].includes(x.type)));
 assert.equal(t.players[1].shields.length,5);
});

test('Attacking Slayer is processed before the defending La Baile can untap',()=>{
 const s=setup(),slayer=put(s,0,SLAYER),baile=put(s,1,BAILE);
 attack(s,slayer.uid);
 block(s,baile);
 assert.ok(find(s,0,'grave',slayer.uid));
 assert.ok(find(s,1,'grave',baile.uid));
 assert.ok(!s.log.some(x=>x.type==='afterBattle'&&x.cardId===BAILE));
});

test('La Baile waits for the battle result and resumes its untap from JSON',()=>{
 let s=setup();
 const attacker=put(s,0,BODY),baile=put(s,1,BAILE);
 baile.g34Grants=[{turn:s.turn,battleWinDraw:true}];
 attack(s,attacker.uid);
 block(s,baile);
 assert.equal(s.decision.type,'draw');
 assert.equal(baile.tapped,true);
 assert.ok(find(s,0,'grave',attacker.uid));
 s=JSON.parse(JSON.stringify(s));
 act(s,'draw');
 assert.equal(find(s,1,'battle',baile.uid).tapped,false);
});

test('Replacing the battle after a block retains La Baile’s delayed untap across JSON',()=>{
 let s=setup();
 const attacker=put(s,0,BODY),baile=put(s,1,BAILE),guard=put(s,1,GUARD);
 attack(s,attacker.uid);
 block(s,baile);
 assert.equal(s.decision.task.op,'g393SG_Battle');
 assert.equal(baile.tapped,true);
 s=JSON.parse(JSON.stringify(s));
 pick(s,guard.uid);
 assert.ok(find(s,0,'grave',attacker.uid));
 assert.equal(find(s,1,'battle',guard.uid).tapped,true);
 assert.equal(find(s,1,'battle',baile.uid).tapped,false);
});
