import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LIRIN='dmex12-052',PRELUDE='dmx13-018',ACID='dmex17-004',TITANIS='dm25ex2-079',KERNEL='dm25ex2-081';
const SMITH='dmx13-026',POKUCHIN='dmex02-009',RA='dmrp01-058',YATTARE='dmsd01-012';
const FAIRY='dm06-108',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const choices=s=>s.decision?.choices?.map(x=>x.value)??[];
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>x.uid===y.uid);
const pick=(s,value)=>act(s,'extended',a=>(choices(s)[a.choice]?.uid??choices(s)[a.choice])===value);

function table(){
 const s=setup();
 s.turn=3;
 return s;
}

function add(s,p,zone,id,props={}){
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
}

function play(s,id,match=()=>true){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&match(a));
 return x;
}

test('four names and the Lirin reprint resolve to their verified canonical definitions',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1114.json',import.meta.url)));
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const row of manifest.cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1114}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1114}));
 }
 for(const row of manifest.printAliases){
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1114}),row.spec);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===row.canonicalId&&x.image===row.image));
 }
});

test('two Preludes and Acid Sympathy follow QA 40363 with actual Acid',()=>{
 const s=table();
 play(s,PRELUDE);
 assert.equal(e.summonCost(s,0,e.card(ACID)),2);
 play(s,PRELUDE);
 assert.equal(e.summonCost(s,0,e.card(ACID)),0);
 add(s,0,'battle',RA);
 assert.equal(e.summonCost(s,0,e.card(ACID)),1);
 const acid=play(s,ACID,a=>a.cost===1);
 assert.ok(has(s,0,'battle',acid));
});

test('Lirin spell may summon at zero for Pokuchin, while the creature face gives a floor of one',()=>{
 for(const aura of [false,true]){
  const s=table();
  add(s,1,'battle',POKUCHIN);
  if(aura)play(s,LIRIN,a=>!a.face);
  play(s,LIRIN,a=>a.face===1&&a.cost===3);
  const smith=play(s,SMITH,a=>a.cost===(aura?1:0));
  drain(s);
  assert.equal(has(s,0,'battle',smith),aura);
  if(!aura)assert.equal(s.players[0].deck.at(-1).uid,smith.uid);
 }
});

test('Lirin gives each mana Snow Fairy all five civilizations and one payable mana',()=>{
 const s=table();
 give(s,0,'mana',[FAIRY,FIRE]);
 const [fairy,plain]=s.players[0].mana;
 const lirin=add(s,0,'battle',LIRIN);
 const water=add(s,0,'hand',WATER);
 assert.deepEqual(new Set(e.manaColors(e.card(fairy),s,0)),new Set(['光','水','闇','火','自然']));
 assert.deepEqual(e.manaColors(e.card(plain),s,0),['火']);
 const tooExpensive=add(s,0,'hand',SMITH);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===tooExpensive.uid&&a.kind==='play'));
 act(s,'play',a=>a.uid===water.uid&&a.cost===2);
 assert.ok(fairy.tapped&&plain.tapped);
 lirin.sealed=true;
 assert.deepEqual(e.manaColors(e.card(fairy),s,0),['自然']);
});

test('Acid destroys up to two own creatures and deploys eligible cards from hand and library',()=>{
 const s=table();
 add(s,0,'battle',ACID);
 const first=add(s,0,'battle',FIRE),second=add(s,0,'battle',NATURE);
 const hand=add(s,0,'hand',YATTARE),invalid=add(s,0,'hand',WATER);
 give(s,0,'deck',[RA,FIRE,PRELUDE,WATER,NATURE,DARK]);
 const deck=s.players[0].deck[0],rng=s.rng;
 act(s,'toAttack');
 act(s,'endTurn');
 pick(s,first.uid);
 pick(s,second.uid);
 assert.ok(has(s,0,'grave',first)&&has(s,0,'grave',second));
 assert.ok(!choices(s).some(x=>x?.uid===invalid.uid));
 assert.ok(s.log.some(x=>x.type==='look'&&x.cardId===ACID));
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===ACID));
 pick(s,hand.uid);
 pick(s,deck.uid);
 assert.ok(has(s,0,'battle',hand)&&has(s,0,'battle',deck));
 assert.notEqual(s.rng,rng);
});

test('Acid counts a destruction attempt prevented by an existing cannot-leave ability',()=>{
 const s=table();
 add(s,0,'battle',ACID);
 const protectedCard=add(s,0,'battle','dm23rp4-OR1');
 const replacement=add(s,0,'hand',RA);
 act(s,'toAttack');
 act(s,'endTurn');
 pick(s,protectedCard.uid);
 pick(s,null);
 assert.ok(has(s,0,'battle',protectedCard));
 pick(s,replacement.uid);
 assert.ok(has(s,0,'battle',replacement));
});

test('Acid has opponent-turn choice protection and remains attackable',()=>{
 const s=table(),acid=add(s,0,'battle',ACID,{tapped:true});
 assert.equal(!!e.effectiveCard(acid,s).untargetable,false);
 s.active=1;
 assert.equal(e.effectiveCard(acid,s).untargetable,true);
 const attacker=add(s,1,'battle',FIRE);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===acid.uid));
});

test('Kernel freezes the selected creature and its protection lasts until the next own turn',()=>{
 const s=table(),target=add(s,1,'battle',FIRE);
 const kernel=play(s,KERNEL,a=>!a.face);
 assert.ok(e.card(kernel).trigger&&e.card(kernel).blocker);
 pick(s,target.uid);
 const limits=()=>s.extLimits.filter(x=>x.uid===target.uid).map(x=>x.kind);
 assert.deepEqual(limits(),['attack','block']);
 for(let i=0;i<2;i++){
  act(s,'toAttack');
  act(s,'endTurn');
  drain(s);
  if(!i)assert.deepEqual(limits(),['attack','block']);
  if(s.phase==='charge')act(s,'skipCharge');
 }
 assert.deepEqual(limits(),[]);
});

test('Silent Jealousy permits optional Titanis replacement before retrieving a shield without its trigger',()=>{
 for(const accept of [true,false]){
  const s=table();
  const titanis=add(s,1,'hand',TITANIS);
  give(s,1,'deck',[FIRE,NATURE,WATER,DARK]);
  const [fire,nature]=s.players[1].deck;
  const shield=add(s,0,'shields',KERNEL);
  play(s,KERNEL,a=>a.face===1);
  assert.equal(s.decision?.player,1);
  pick(s,accept);
  assert.equal(has(s,1,'battle',titanis),accept);
  assert.equal(has(s,1,'grave',titanis),!accept);
  pick(s,shield.uid);
  assert.ok(has(s,0,'hand',shield));
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===shield.uid));
  if(accept){
   assert.ok(has(s,1,'mana',fire)&&has(s,1,'mana',nature));
   pick(s,fire.uid);
   pick(s,nature.uid);
   assert.ok(has(s,1,'hand',fire)&&has(s,1,'hand',nature));
  }
 }
});
