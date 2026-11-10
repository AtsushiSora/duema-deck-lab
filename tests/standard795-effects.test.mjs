import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-795.json',import.meta.url)));
const STELLA="dm24ex4-017",WORLD="dm24ex4-022",ETS="dm24rp4-006";
const SMALL="dm01-108",LEAP="dm24ex4-053",CYCLE="dm22ex1-018",CHARGER="dmd04-005",BOL="dm06-s08";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 795 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:795}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:795}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:795}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const play=(s,x,filter=a=>!a.alternative)=>act(s,'play',a=>a.uid===x.uid&&filter(a));
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const taskIs=(s,op)=>assert.equal(s.decision?.task?.op,op,JSON.stringify(s.decision));
const end=s=>{s.phase='attack';act(s,'endTurn');};

test('インターステラ can cast 水/闇 from hand or grave and recast the same spell from 超次元 on attack',()=>{
 let s=setup();
 const x=put(s,0,'hand',STELLA),spell=put(s,0,'hand',LEAP);
 const grave=put(s,0,'grave',CHARGER),fire=put(s,0,'hand','dm24ex4-051');
 const opposing=put(s,1,'grave',LEAP);
 play(s,x);
 taskIs(s,'g34_Execute');
 assert.deepEqual(new Set(choices(s)),new Set([spell.uid,grave.uid,null]));
 assert.ok(e.effectiveCard(x,s).blocker&&x.justDiverActive);
 assert.equal(e.effectiveCard(x,s).breaker,2);
 pick(s,spell.uid);
 assert.ok(has(s,0,'extra',spell)&&has(s,1,'grave',opposing)&&has(s,0,'hand',fire));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,7);
 s=restore(s);
 s.players[0].battle.find(y=>y.uid===x.uid).entered=s.turn-1;
 attack(s,x.uid);
 taskIs(s,'g34_Execute');
 pick(s,spell.uid);
 assert.equal(s.players[0].deck.at(-1).uid,spell.uid);
 assert.ok(!has(s,0,'extra',spell));
});

test('インターステラ may decline either ability and attack can cast any spell cost or color',()=>{
 for(const cast of [false,true]){
  const s=setup(),x=put(s,0,'hand',STELLA),hand=put(s,0,'hand',LEAP),extra=put(s,0,'extra','dm26rp1-075');
  play(s,x);
  pick(s,null);
  assert.ok(has(s,0,'hand',hand));
  x.entered=s.turn-1;
  attack(s,x.uid);
  assert.ok(choices(s).includes(extra.uid));
  pick(s,cast?extra.uid:null);
  if(cast&&s.decision?.type==='extended')e.step(s,e.chooseAI(s));
  if(cast)assert.equal(s.players[0].deck.at(-1).uid,extra.uid);
  else assert.ok(has(s,0,'extra',extra));
 }
});

test('インターステラ lets Charger take precedence and offers either destination with Cyclepedia',()=>{
 for(const to of ['mana','extra','deck']){
  let s=setup(),x=put(s,0,'hand',STELLA),spell=put(s,0,'grave',to==='mana'?CHARGER:LEAP);
  put(s,0,'battle',CYCLE);
  play(s,x);
  pick(s,spell.uid);
  if(to!=='mana'){
   taskIs(s,'g795SpellDestination');
   s=restore(s);
   assert.deepEqual(choices(s),['extra','deck']);
   pick(s,to);
  }
  assert.ok(has(s,0,to,spell),JSON.stringify(s.decision));
  assert.equal(e.physicalCards(s).filter(y=>y.uid===spell.uid).length,1);
 }
});

test('地雷冥土 declares at either turn end and freely summons at each qualifying threshold',()=>{
 for(const [turn,id,power] of [[0,ETS,undefined],[1,SMALL,15000],[1,SMALL,14999]]){
  let s=setup();s.active=turn;
  const x=put(s,0,'hand',WORLD),enemy=put(s,1,'battle',id);
  if(power)enemy.powerModifiers=[{amount:power-e.power(enemy,false,s),expires:'end',who:turn}];
  end(s);
  taskIs(s,'g34_RevengeDeclare795');
  assert.equal(s.decision.player,0);
  pick(s,true);
  s=restore(s);
  if(power===14999){assert.ok(has(s,0,'hand',x));assert.ok(!s.decision);continue;}
  taskIs(s,'g34_RevengeSummon795');
  pick(s,true);
  assert.ok(has(s,0,'battle',x));
  assert.equal(s.players[0].battle.find(y=>y.uid===x.uid).summonedTurn,s.turn-1);
  assert.ok(s.players[0].mana.every(y=>!y.tapped));
 }
});

test('地雷冥土 destroys the attacking Slayer on tap before battle, then may revive a qualifying non-evolution',()=>{
 for(const revive of [true,false]){
  const s=setup();s.active=1;
  const x=put(s,0,'battle',WORLD),slayer=put(s,1,'battle','dmrp22-033');
  const cheap=put(s,0,'grave',SMALL),costly=put(s,0,'grave',BOL),evolution=put(s,0,'grave','dm10-017');
  const shields=s.players[0].shields.length;
  attack(s,slayer.uid);
  act(s,'block',a=>a.uid===x.uid);
  taskIs(s,'g34_Target');
  pick(s,slayer.uid);
  assert.ok(has(s,1,'grave',slayer));
  assert.deepEqual(choices(s),[cheap.uid,null]);
  pick(s,revive?cheap.uid:null);
  assert.ok(has(s,0,'battle',x)&&has(s,0,'grave',costly)&&has(s,0,'grave',evolution));
  assert.equal(has(s,0,'battle',cheap),revive);
  assert.equal(s.players[0].shields.length,shields);
 }
});

test('エツナブ uses Hyper Energy and the highest eligible cost of cards actually sent from a shield stack',()=>{
 const s=setup(),x=put(s,0,'hand',ETS),a=put(s,0,'battle',SMALL),b=put(s,0,'battle','dm01-087');
 const duplicate=put(s,0,'battle',SMALL);
 const shield=put(s,1,'shields',SMALL),attached=inst('dm24bd5-010');
 shield.shieldStack=[attached];
 give(s,0,'mana',Array(7).fill('dm01-110'));
 const eligible=put(s,0,'mana','dmr23-051'),equal=put(s,0,'mana','dm24ex4-085');
 play(s,x,a=>a.alternative==='hyperEnergy');
 pick(s,a.uid);
 assert.ok(!choices(s).includes(duplicate.uid));
 pick(s,b.uid);
 pick(s,false);
 taskIs(s,'g34_ShieldMana557');
 pick(s,shield.uid);
 assert.ok(has(s,1,'mana',shield)&&has(s,1,'mana',attached));
 assert.ok(choices(s).includes(eligible.uid)&&!choices(s).includes(equal.uid));
 pick(s,eligible.uid);
 assert.ok(has(s,0,'battle',eligible)&&has(s,0,'mana',equal));
 assert.ok(a.tapped&&b.tapped&&!duplicate.tapped);
 assert.equal(e.effectiveCard(x,s).breaker,3);
 assert.equal(e.effectiveCard(x,s).machFighter,true);
});

test('エツナブ cannot deploy if the moved shield was redirected away from mana',()=>{
 const s=setup(),x=put(s,0,'hand',ETS),shield=put(s,1,'shields',BOL);
 put(s,0,'battle','dmrp22-033');
 s.active=1;
 s.extTasks=[{op:'g34_Put',p:0,source:ETS,origin:'hand',target:x.uid}];
 act(s,'toAttack');
 pick(s,shield.uid);
 assert.ok(has(s,1,'grave',shield));
 assert.ok(!s.decision);
});

test('地雷冥土 uses the selected creature’s cost even when destruction is replaced',()=>{
 const s=setup(),x=put(s,0,'battle',WORLD),protectedCard=put(s,1,'battle','dm01-087'),revival=put(s,0,'grave','dm01-087');
 protectedCard.g34Grants=[{turn:s.turn,g465DestroySafe:true}];
 attack(s,x.uid);
 taskIs(s,'g34_Target');
 pick(s,protectedCard.uid);
 assert.ok(has(s,1,'battle',protectedCard));
 assert.deepEqual(choices(s),[revival.uid,null]);
 pick(s,revival.uid);
 assert.ok(has(s,0,'battle',revival));
});

test('エツナブ may decline deployment after a valid shield move and can use Mach Fighter that turn',()=>{
 const s=setup(),x=put(s,0,'hand',ETS),shield=put(s,1,'shields',BOL),enemy=put(s,1,'battle',SMALL);
 play(s,x);
 pick(s,shield.uid);
 taskIs(s,'g34_Select');
 pick(s,null);
 assert.ok(has(s,1,'mana',shield));
 attack(s,x.uid,enemy.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.ok(has(s,1,'grave',enemy));
});
