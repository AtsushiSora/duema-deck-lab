import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-797.json',import.meta.url)));
const SHADOW="dm24rp4-038",EN="dm24rp4-013",WON="dm24rp4-012";
const SMALL="dm01-108",GUARD="dm01-084",BOL="dm06-s08",SEED="dmrp22-076",DONOR="dmrp19-028",DISPECTOR="dmrp18-km3";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 797 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:797}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:797}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:797}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const spent=s=>s.players[0].mana.filter(x=>x.tapped).length;
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const attemptMove=(s,owner,x,to)=>{
 s.phase='main';
 (s.extTasks??=[]).push({op:'g34_ExactMove',p:s.active,source:EN,owner,target:x.uid,to});
 act(s,'toAttack');
 drain(s);
};

for(const id of [SHADOW,EN,WON])test(e.card(id).name+' can use Hyper Energy with different donor costs',()=>{
 const s=setup(),x=put(s,0,'hand',id),a=put(s,0,'battle',SMALL),duplicate=put(s,0,'battle',SMALL),b=put(s,0,'battle',GUARD);
 act(s,'play',y=>y.uid===x.uid&&y.alternative==='hyperEnergy');
 pick(s,a.uid);
 assert.ok(!choices(s).includes(duplicate.uid));
 pick(s,b.uid);
 pick(s,false);
 assert.equal(spent(s),Math.max(1,e.card(id).cost-4));
 assert.ok(a.tapped&&b.tapped&&!duplicate.tapped);
 if(id!==WON)pick(s,null);
 assert.ok(has(s,0,id===SHADOW?'grave':'battle',x));
});

test('Shadow can decline the mill without targeting, even when the opponent has creatures',()=>{
 const s=setup(),spell=put(s,0,'hand',SHADOW),enemy=put(s,1,'battle',BOL),before=s.players[0].deck.map(x=>x.uid);
 play(s,spell);
 pick(s,null);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),before);
 assert.equal(e.power(enemy,false,s),7000);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),[spell.uid]);
});

for(const prior of [1,2])test('Shadow counts '+prior+' existing grave cards plus the five milled cards',()=>{
 const s=setup(),spell=put(s,0,'hand',SHADOW),enemy=put(s,1,'battle',BOL),other=put(s,1,'battle',BOL);
 const own=put(s,0,'battle',SMALL),seed=put(s,1,'battle',SEED);
 const top=s.players[0].deck.slice(0,5).map(x=>x.uid);
 give(s,0,'grave',[SHADOW,SEED].slice(0,prior));
 play(s,spell);
 pick(s,true);
 assert.deepEqual(s.players[0].grave.slice(-5).map(x=>x.uid),top);
 assert.equal(s.players[0].grave.length,5+prior);
 assert.deepEqual(choices(s),[enemy.uid,other.uid]);
 assert.ok(!choices(s).includes(own.uid)&&!choices(s).includes(seed.uid));
 pick(s,enemy.uid);
 assert.ok(has(s,0,'grave',spell));
 assert.equal(e.power(other,false,s),7000);
 if(prior===2)assert.ok(has(s,1,'grave',enemy));
 else{
  assert.ok(has(s,1,'battle',enemy));
  assert.equal(e.power(enemy,false,s),1000);
  end(s);
  assert.equal(e.power(enemy,false,s),7000);
 }
});

test('Shadow ends the game if its optional mill exhausts the deck',()=>{
 const s=setup(),spell=put(s,0,'hand',SHADOW),enemy=put(s,1,'battle',BOL);
 s.players[0].deck.length=5;
 play(s,spell);
 pick(s,true);
 assert.equal(s.winner,1);
 assert.equal(s.players[0].deck.length,0);
 assert.ok(has(s,1,'battle',enemy));
});

test('En protects only the chosen other creature from all ordinary moves through the opponent turn',()=>{
 const s=setup(),en=put(s,0,'hand',EN),ally=put(s,0,'battle',SMALL),other=put(s,0,'battle',SMALL),seed=put(s,0,'battle',SEED);
 play(s,en);
 assert.deepEqual(choices(s),[ally.uid,other.uid,null]);
 pick(s,ally.uid);
 attemptMove(s,0,other,'hand');
 assert.ok(has(s,0,'hand',other));
 attemptMove(s,0,en,'hand');
 assert.ok(has(s,0,'hand',en));
 attemptMove(s,0,ally,'grave');
 assert.ok(has(s,0,'battle',ally));
 end(s);
 for(const zone of ['grave','hand','mana','deck','shields']){
  attemptMove(s,0,ally,zone);
  assert.ok(has(s,0,'battle',ally),zone);
 }
 assert.ok(has(s,0,'battle',seed));
 end(s);
 attemptMove(s,0,ally,'hand');
 assert.ok(has(s,0,'hand',ally));
});

test('En may decline on entry and protect a target on attack from power-based destruction',()=>{
 const s=setup(),en=put(s,0,'hand',EN),ally=put(s,0,'battle',SMALL);
 play(s,en);
 pick(s,null);
 assert.equal(s.decision,null);
 end(s);
 end(s);
 attack(s,en.uid);
 assert.deepEqual(choices(s),[ally.uid,null]);
 pick(s,ally.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 end(s);
 const spell=put(s,1,'hand',SHADOW);
 s.phase='main';
 play(s,spell);
 pick(s,true);
 pick(s,ally.uid);
 assert.ok(e.power(ally,false,s)<=0);
 assert.ok(has(s,0,'battle',ally));
 end(s);
 assert.equal(e.power(ally,false,s),2000);
 assert.ok(has(s,0,'battle',ally));
});

test('En keeps a selected Sasage donor on the battlefield while its reduction applies once (QA46627)',()=>{
 const s=setup(),en=put(s,0,'hand',EN),donor=put(s,0,'battle',DONOR),recipient=put(s,0,'hand',DISPECTOR);
 play(s,en);
 pick(s,donor.uid);
 const prior=spent(s);
 const actions=e.getLegalActions(s).filter(a=>a.uid===recipient.uid&&a.alternative==='sasage');
 assert.deepEqual(actions.map(a=>a.sasage),[[donor.uid]]);
 assert.equal(actions[0].cost,e.card(recipient).cost-e.card(donor).sasage);
 act(s,'play',a=>a.id===actions[0].id);
 drain(s);
 assert.equal(spent(s)-prior,actions[0].cost);
 assert.ok(has(s,0,'battle',donor)&&has(s,0,'battle',recipient));
});

test('Won counts other tapped allied creatures and uses Powered Breaker at that turn’s power',()=>{
 const s=setup(),won=put(s,0,'battle',WON),a=put(s,0,'battle',SMALL),b=put(s,0,'battle',SMALL);
 const seed=put(s,0,'battle',SEED),enemy=put(s,1,'battle',BOL);
 a.tapped=b.tapped=seed.tapped=enemy.tapped=true;
 const untapped=put(s,0,'battle',SMALL);
 assert.equal(e.power(won,false,s),6000);
 attack(s,won.uid);
 assert.equal(e.power(won,true,s),12000);
 assert.equal(e.power(untapped,false,s),2000);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 end(s);
 assert.equal(e.power(won,false,s),6000);
});

test('Won gets its own boost on blocking and wins against a larger attacker',()=>{
 const s=setup(),won=put(s,0,'battle',WON),ally=put(s,0,'battle',SMALL),attacker=put(s,1,'battle',BOL);
 ally.tapped=true;
 s.active=1;
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===won.uid);
 drain(s);
 assert.equal(e.power(won,false,s),9000);
 assert.ok(has(s,1,'grave',attacker));
 assert.ok(has(s,0,'battle',won));
 end(s);
 assert.equal(e.power(won,false,s),6000);
});

test('Won locks in the count on each tap, including successive taps in one turn',()=>{
 const s=setup(),won=put(s,0,'battle',WON),ally=put(s,0,'battle',SMALL),other=put(s,0,'battle',SMALL);
 const tap=x=>{
  s.phase='main';
  (s.extTasks??=[]).push({op:'g34_ExactMove',p:0,source:EN,owner:0,target:x.uid,tap:true});
  act(s,'toAttack');
  drain(s);
 };
 tap(ally);
 tap(won);
 assert.equal(e.power(won,false,s),9000);
 tap(other);
 assert.equal(e.power(won,false,s),9000);
 won.tapped=false;
 tap(won);
 assert.equal(e.power(won,false,s),15000);
 end(s);
 assert.equal(e.power(won,false,s),6000);
});
