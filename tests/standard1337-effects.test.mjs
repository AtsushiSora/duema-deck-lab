import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const KARIYA='dmrp11-s04',REPRINT='dm23ex2-ChoG009',SONG='dm22rp1-014',SPIRAL='dm01-086';
const EXTRA='dm37-042',JOURNEY='dmex12-s03',WORLD='dmrp08-005',MADO='dmex08-293';
const FIRE='dm01-097',GREEN='dm01-108',HAND='dm01-027';
const read=name=>JSON.parse(readFileSync(new URL('../tools/'+name,import.meta.url)));
const add=(s,p,z,id)=>{const x=inst(id);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=(s,a)=>s.decision.choices[a.choice].value;
const pick=(s,uid)=>act(s,'extended',a=>(value(s,a)?.uid??value(s,a))===uid);
const available=s=>s.decision?.choices?.map(({value})=>value?.uid??value)??[];
const playKariya=s=>{
 const x=add(s,0,'hand',KARIYA);
 act(s,'play',a=>a.uid===x.uid&&a.face===0);
 return x;
};
const finishTurn=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

test('both official printings resolve to the original ID under the same one-copy limit',()=>{
 const manifest=read('support-phase-1337.json'),registry=createCatalogue(snapshot,data.cards,details);
 const c=e.card(KARIYA);
 assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit,c.breaker],[14,10500,'ムートピア',['水'],1,1,2]);
 assert.deepEqual([c.spellFace.cost,c.spellFace.civilizations,c.spellFace.trigger],[3,['光'],true]);
 for(const print of [...manifest.cards,...manifest.printAliases]){
  assert.deepEqual(registry.resolveRows([{id:print.id,count:1}]),[{id:KARIYA,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(print.name)).map(x=>x.id),[KARIYA]);
  assert.equal(manifest.regulationVerification.limits[print.id],1);
  assert.equal(read('image-reference-prints.json').prints.find(x=>x.id===print.id).image,print.image);
 }
 assert.deepEqual(manifest.printAliases.map(x=>x.id),[REPRINT]);
 const deck=count=>({cards:[{id:KARIYA,count},{id:GREEN,count:40-count}]});
 assert.ok(!e.validateDeck(deck(1)).some(message=>message.includes(c.name)));
 assert.ok(e.validateDeck(deck(2)).some(message=>message===c.name+'は1枚までです'));
 assert.equal(CARD_IMAGES[KARIYA],manifest.cards[0].image);
});

test('Kariya counts each own grave card with a spell face once and pays at least one mana',()=>{
 const s=setup(),c=e.card(KARIYA);
 give(s,0,'grave',[FIRE,KARIYA,SPIRAL,HAND]);give(s,1,'grave',[SPIRAL,EXTRA]);
 assert.equal(e.summonCost(s,0,c),11);
 give(s,0,'grave',Array(15).fill(SPIRAL));assert.equal(e.summonCost(s,0,c),1);
 const x=add(s,0,'hand',KARIYA);
 assert.equal(e.getLegalActions(s).find(a=>a.uid===x.uid&&a.face===0).cost,1);
 act(s,'play',a=>a.uid===x.uid&&a.face===0);
 pick(s,null);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 assert.equal(s.players[0].grave.length,15);
});

test('the Song lets the actual Kariya use only Hermit Circle from the grave (QA42147)',()=>{
 const s=setup(),twin=add(s,0,'grave',KARIYA),target=add(s,1,'battle',FIRE);
 cast(s,SONG);pick(s,twin.uid);
 const actions=e.getLegalActions(s).filter(a=>a.uid===twin.uid&&a.origin==='grave');
 assert.deepEqual(actions.map(a=>[a.face,a.cost]),[[1,3]]);
 act(s,'play',a=>a.uid===twin.uid&&a.origin==='grave');pick(s,target.uid);
 assert.equal(target.tapped,true);
 assert.ok(has(s,0,'grave',twin));
 assert.equal(e.getLegalActions(s).some(a=>a.uid===twin.uid&&a.origin==='grave'),false);
 finishTurn(s);assert.equal(target.tapped,true);finishTurn(s);finishTurn(s);assert.equal(target.tapped,false);
});

test('the first Extra Hole cannot choose either of the other two reserved spells (QA42076)',()=>{
 let s=setup();
 const extra=add(s,0,'grave',EXTRA),twin=add(s,0,'grave',KARIYA),third=add(s,0,'grave',MADO);
 const bystander=add(s,0,'grave',GREEN),expensive=add(s,0,'grave',HAND);
 const target=add(s,1,'battle',FIRE);
 playKariya(s);
 assert.deepEqual(available(s),[extra.uid,twin.uid,third.uid,null]);
 pick(s,extra.uid);pick(s,twin.uid);pick(s,third.uid);
 assert.equal(s.decision.task.op,'g34_GravePick598');
 pick(s,0);
 assert.ok(available(s).includes(bystander.uid)&&available(s).includes(expensive.uid));
 for(const x of [extra,twin,third]){
  assert.ok(!available(s).includes(x.uid));
  assert.equal(e.physicalCards(s).filter(y=>y.uid===x.uid).length,1);
 }
 s=JSON.parse(JSON.stringify(s));
 pick(s,bystander.uid);pick(s,null);
 for(let n=0;s.decision&&s.decision.task?.source!==KARIYA&&n<10;n++)e.step(s,e.chooseAI(s));
 pick(s,target.uid);drain(s);
 assert.ok(has(s,0,'grave',expensive));
 assert.deepEqual(s.players[0].deck.slice(-3).map(x=>x.uid),[extra.uid,twin.uid,third.uid]);
 assert.equal(s.players[1].battle[0].tapped,true);
});

test('the next two spells recheck the cast lock after returning J no Tabiji (QA40163)',()=>{
 for(const removeRestriction of [false,true]){
  const s=setup(),spiral=add(s,0,'grave',SPIRAL),second=add(s,0,'grave',MADO),third=add(s,0,'grave',MADO);
  const journey=add(s,1,'battle',JOURNEY),other=add(s,1,'battle',FIRE);
  playKariya(s);
  pick(s,spiral.uid);pick(s,second.uid);pick(s,third.uid);
  act(s,'effect',a=>a.targets?.some(({uid})=>uid===(removeRestriction?journey.uid:other.uid)));
  drain(s);
  for(const x of [second,third])assert.ok(has(s,0,removeRestriction?'deck':'grave',x));
 }
});

test('New World offers its alternative destination for a Kariya spell (QA40428)',()=>{
 for(const store of [false,true]){
  const s=setup(),field=add(s,0,'battle',WORLD),mado=add(s,0,'grave',MADO);
  playKariya(s);pick(s,mado.uid);
  assert.equal(s.decision.task.op,'g4_Store');
  const option=s.decision.choices.findIndex(({value})=>Boolean(value)===store);
  act(s,'extended',a=>a.choice===option);drain(s);
  if(store)assert.deepEqual(field.under.map(x=>x.uid),[mado.uid]);
  else assert.ok(has(s,0,'deck',mado));
 }
});

test('only the spell face can be declared when Kariya is broken as a shield',()=>{
 const s=setup();
 const twin=inst(KARIYA);
 s.players[1].shields=[twin];
 const attacker=add(s,0,'battle',FIRE);
 attack(s,attacker.uid);act(s,'noBlock');
 const triggers=e.getLegalActions(s).filter(a=>a.kind==='useTrigger'&&a.uid===twin.uid);
 assert.ok(triggers.length);
 assert.deepEqual(triggers.map(a=>a.face),[1]);
 act(s,'useTrigger',a=>a.uid===twin.uid);drain(s);
 assert.equal(attacker.tapped,true);
 assert.ok(!has(s,1,'battle',twin));
});
