import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-783.json',import.meta.url)));
const EINE="dm24rp2-015",RAMAR="dm24rp2-032",BIG="dm24rp2-027";
const BODY="dm01-108",FIRE="dm01-097",SPELL="dm01-110";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 783 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:783}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:783}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:783}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const activate=(s,x,donor)=>{act(s,'hyper',a=>a.uid===x.uid);pick(s,donor.uid);};
const end=s=>{s.phase='attack';act(s,'endTurn');};
const finishAttack=s=>{
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
};

test('Eine releases itself when summoned without paying the Hyper cost and cannot release again until next own turn',()=>{
 const s=setup(),eine=put(s,0,'hand',EINE),ally=put(s,0,'battle',BODY);
 play(s,eine);
 assert.equal(e.power(eine,false,s),8000);
 assert.equal(e.effectiveCard(eine,s).breaker,2);
 assert.equal(e.effectiveCard(eine,s).blocker,true);
 assert.equal(ally.tapped,false);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='hyper'&&a.uid===eine.uid));
 end(s);
 assert.equal(e.power(eine,false,s),8000);
 end(s);
 assert.equal(e.power(eine,false,s),4000);
 assert.equal(e.effectiveCard(eine,s).breaker,undefined);
 act(s,'skipCharge');
 activate(s,eine,ally);
 assert.equal(ally.tapped,true);
 assert.equal(e.power(eine,false,s),8000);
});

test('Eine releases on a shield trigger during the enemy turn and expires before its first own main step',()=>{
 const s=setup(),attacker=put(s,1,'battle',FIRE);
 s.active=1;
 give(s,0,'shields',[EINE]);
 attack(s,attacker.uid);
 finishAttack(s);
 act(s,'useTrigger');
 const eine=s.players[0].battle.find(x=>x.cardId===EINE);
 assert.ok(eine);
 assert.equal(e.power(eine,false,s),8000);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 end(s);
 assert.equal(e.power(eine,false,s),4000);
});

test('Eine cannot resolve a new entry ability under Genmu’s suppression',()=>{
 const s=setup(),eine=put(s,0,'hand',EINE);
 put(s,1,'battle','dmrp15-km1');
 play(s,eine);
 assert.equal(eine.hyperActive,undefined);
 assert.equal(e.power(eine,false,s),4000);
});

test('Ramar draws both cards before the player must choose a card from the entire hand to discard',()=>{
 const s=setup(),ramar=put(s,0,'hand',RAMAR),old=put(s,0,'hand',BODY);
 give(s,0,'deck',[FIRE,SPELL,BODY]);
 const [first,second,remaining]=s.players[0].deck;
 play(s,ramar);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[old.uid,first.uid,second.uid]);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[remaining.uid]);
 const saved=restore(s);
 assert.deepEqual(saved.decision.choices.map(x=>x.value),[old.uid,first.uid,second.uid]);
 pick(saved,second.uid);
 assert.ok(has(saved,0,'grave',second));
 assert.deepEqual(saved.players[0].hand.map(x=>x.uid),[old.uid,first.uid]);
 assert.equal(e.power(ramar,false,s),4000);
});

test('Ramar only reduces its controller’s creature summons in Hyper Mode, floors at one and pays the discounted cost',()=>{
 const s=setup(),ramar=put(s,0,'battle',RAMAR),ally=put(s,0,'battle',FIRE);
 const target=put(s,0,'hand',BODY),printed=e.card(BODY),spell=e.card(SPELL);
 assert.equal(e.summonCost(s,0,printed),printed.cost);
 activate(s,ramar,ally);
 assert.equal(e.power(ramar,false,s),9000);
 assert.equal(e.effectiveCard(ramar,s).breaker,2);
 assert.equal(e.summonCost(s,0,{...printed,cost:1}),1);
 assert.equal(e.summonCost(s,0,spell),spell.cost);
 assert.equal(e.summonCost(s,1,printed),printed.cost);
 assert.equal(e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===target.uid).cost,printed.cost-1);
 play(s,target);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,printed.cost-1);
 end(s);
 assert.equal(e.summonCost(s,0,printed),printed.cost-1);
 end(s);
 assert.equal(e.summonCost(s,0,printed),printed.cost);
});

test('Bigguttino counts its own tapped creatures at attack and can stop after seeing the first card across a save',()=>{
 let s=setup();
 const big=put(s,0,'battle',BIG),donor=put(s,0,'battle',BODY),ally=put(s,0,'battle',FIRE);
 const seed=put(s,0,'battle','dmsd20-016'),enemy=put(s,1,'battle',FIRE),sealed=put(s,0,'battle',BODY);
 put(s,0,'battle',BODY);
 sealed.sealed=true;
 s.players[0].seals=[{...inst(BODY),faceDown:true,sealOf:sealed.uid}];
 ally.tapped=seed.tapped=enemy.tapped=sealed.tapped=true;
 assert.equal(e.isCreature(s,seed),false);
 const deck=s.players[0].deck.map(x=>x.uid);
 activate(s,big,donor);
 assert.equal(e.effectiveCard(big,s).breaker,2);
 assert.equal(e.effectiveCard(big,s).blocker,true);
 attack(s,big.uid);
 assert.equal(big.tapped,true);
 assert.equal(s.decision.task.op,'g34_DrawUpTo');
 assert.equal(s.decision.task.n,3);
 assert.ok(s.decision.choices.every(x=>!x.cardId));
 pick(s,true);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),deck.slice(0,1));
 assert.equal(s.decision.task.n,2);
 s=restore(s);
 pick(s,null);
 finishAttack(s);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),deck.slice(0,1));
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),deck.slice(1));
});

test('Bigguttino can decline the first draw or draw the last card, and never draws on a normal-mode attack',()=>{
 for(const mode of ['normal','decline','last']){
  const s=setup(),big=put(s,0,'battle',BIG),ally=put(s,0,'battle',BODY);
  give(s,0,'deck',[SPELL]);
  const [last]=s.players[0].deck;
  if(mode!=='normal')activate(s,big,ally);
  else assert.equal(e.power(big,false,s),3500);
  attack(s,big.uid);
  if(mode!=='normal')pick(s,mode==='last'?true:null);
  else assert.notEqual(s.decision?.task?.op,'g34_DrawUpTo');
  finishAttack(s);
  assert.equal(s.winner,mode==='last'?1:null);
  assert.equal(has(s,0,'hand',last),mode==='last');
 }
});
