import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-815.json',import.meta.url)));
const MOMONGA="dm27-029",ZEMEKIS="dm32-013",MAGNUS="dm31-049";
const NATURE="dm01-108",WATER="dm01-083",LIGHT="dm01-075",FIRE="dm01-097",SPELL="dm01-027",GEAR="dm14-110";
const COURTNEY="dm13-015",QX="dmrp07-m01",TSU="dmrp22-030",TWIN="dm23ex2-005";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 815 definitions preserve their canonical saved deck IDs',()=>{
 assert.equal(cards.length,3);
 assert.deepEqual(printAliases,[]);
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:815}));
  assert.throws(()=>standardCardSpec(detail,{phase:814}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:815}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);

function trigger(s,p,source){
 const attacker=put(s,1-p,'battle',NATURE);
 s.active=1-p;
 s.players[p].shields=[source];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
}

for(const accept of [true,false])test('Momonga searches by distinct mana civilizations and always shuffles: '+accept,()=>{
 let s=setup();
 const [multicolor,,,hidden]=give(s,1,'mana',['dmrp13-090',FIRE,NATURE,WATER]);
 multicolor.tapped=true;
 hidden.faceDown=true;
 const [hit,high,twin,spell,zero]=give(s,1,'deck',['dmrp13-090','dm01-036',TWIN,SPELL,'dmex08-174']);
 const momonga=inst(MOMONGA);
 trigger(s,1,momonga);
 assert.deepEqual(s.decision.choices.map(x=>x.value),[hit.uid,zero.uid,null]);
 assert.ok(s.players[1].mana.every(x=>x===multicolor?x.tapped:!x.tapped));
 const rng=s.rng;
 s=JSON.parse(JSON.stringify(s));
 pick(s,accept?hit.uid:null);
 assert.ok(has(s,1,'battle',momonga));
 assert.equal(has(s,1,'hand',hit),accept);
 assert.ok([high,twin,spell,zero].every(x=>has(s,1,'deck',x)));
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===hit.cardId)===accept);
 assert.notEqual(s.rng,rng);
 assert.deepEqual(s.players[1].g34Protected,[]);
});

test('Momonga counts zero for empty mana and includes active Courtney grants',()=>{
 for(const mode of ['empty','hidden','courtney','ignored']){
  const s=setup(),[hit,zero]=give(s,1,'deck',['dm01-036','dmex08-174',SPELL]);
  if(mode==='empty')give(s,1,'mana',[]);
  else give(s,1,'mana',[FIRE])[0].faceDown=true;
  if(mode==='courtney'||mode==='ignored'){
   const courtney=put(s,1,'battle',COURTNEY);
   if(mode==='ignored')courtney.g35Ignored=s.turn;
  }
  trigger(s,1,inst(MOMONGA));
  assert.deepEqual(s.decision.choices.map(x=>x.value),mode==='courtney'?[hit.uid,zero.uid,null]:[zero.uid,null]);
  pick(s,mode==='courtney'?hit.uid:zero.uid);
  assert.ok(has(s,1,'hand',mode==='courtney'?hit:zero));
 }
});

test('Momonga obeys effects that restrict or prevent looking and shuffling',()=>{
 for(const watcher of [TSU,QX]){
  const s=setup(),[top,next]=give(s,0,'deck',[WATER,LIGHT,SPELL]);
  put(s,1,'battle',watcher);
  const rng=s.rng;
  play(s,put(s,0,'hand',MOMONGA));
  if(watcher===TSU){
   assert.deepEqual(s.decision.choices.map(x=>x.value),[top.uid,null]);
   pick(s,top.uid);
   assert.ok(has(s,0,'hand',top));
   assert.ok(has(s,0,'deck',next));
   assert.notEqual(s.rng,rng);
  }else{
   assert.equal(s.decision,null);
   assert.deepEqual(s.players[0].deck.slice(0,2).map(x=>x.uid),[top.uid,next.uid]);
   assert.equal(s.rng,rng);
  }
 }
});

test('Zemekis puts independent and crossed gear into the respective graveyards without choosing',()=>{
 const s=setup(),ally=put(s,0,'battle',NATURE),opponent=put(s,1,'battle',NATURE);
 const free=put(s,0,'battle',GEAR),crossed=put(s,1,'battle',GEAR),sealed=put(s,1,'battle',GEAR);
 crossed.crossedTo={uid:opponent.uid,incarnation:0};
 crossed.untargetable=true;
 const seal=put(s,1,'seals',WATER);
 seal.sealOf=sealed.uid;
 sealed.sealed=true;
 const covered=inst(GEAR);
 ally.under=[covered];
 const source=put(s,0,'hand',ZEMEKIS);
 play(s,source);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',free)&&has(s,1,'grave',crossed));
 assert.deepEqual(s.players[0].battle.map(x=>x.uid),[ally.uid,source.uid]);
 assert.deepEqual(s.players[1].battle.map(x=>x.uid),[opponent.uid,sealed.uid]);
 assert.equal(ally.under[0].uid,covered.uid);
 assert.ok(has(s,1,'seals',seal));
 assert.ok(!s.players[1].grave.find(x=>x.uid===crossed.uid).crossedTo);
});

test('Magnus grants speed only while an eligible spell is in its own graveyard',()=>{
 const s=setup(),source=put(s,0,'hand',MAGNUS),enemy=put(s,1,'battle',NATURE);
 give(s,1,'grave',[SPELL]);
 const [hidden]=give(s,0,'grave',[SPELL,WATER]);
 hidden.faceDown=true;
 play(s,source);
 act(s,'toAttack');
 const actions=()=>[...new Set(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===source.uid).map(a=>a.target))];
 assert.deepEqual(actions(),[]);
 const twin=put(s,0,'grave',TWIN);
 assert.deepEqual(actions(),['player']);
 enemy.tapped=true;
 assert.deepEqual(actions().sort(),[enemy.uid,'player'].sort());
 s.players[0].grave=s.players[0].grave.filter(x=>x!==twin);
 assert.deepEqual(actions(),[]);
 hidden.faceDown=false;
 assert.ok(actions().includes('player'));
 source.g35Ignored=s.turn;
 assert.deepEqual(actions(),[]);
});
