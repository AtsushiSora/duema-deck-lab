import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const MASA='dmd03-001',GLEN='dmd03-002',EATER='dmr03-024';
const DEMON='dm01-027',BOUNCE='dm01-086',RAKUJO='dmr15-041',SLAYER='dm01-088',HALL='dmc65-005';
const BIG='dm01-s08',BASIC='dm01-108';
function field(){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards:[{id:MASA,count:2},{id:GLEN,count:2}]}));
 const s=e.createGame(decks,{seed:1355});
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',['dm01-075','dm01-083','dm01-090','dm01-097','dm01-108'].flatMap(id=>Array(6).fill(id)));
  give(s,p,'shields',Array(5).fill(BASIC));
 }
 return s;
}
function add(s,p,id,options={}){
 const x=Object.assign(inst(id),options);
 s.players[p].battle.push(x);
 return x;
}
function placePsychic(s,p,id,options={}){
 const own=s.players[p],i=own.extra.findIndex(x=>x.cardId===id);
 assert.ok(i>=0);
 const [x]=own.extra.splice(i,1);
 own.battle.push(Object.assign(x,options));
 return x;
}
function pick(s,uid){
 act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===uid);
}
function nextOwnTurn(s,p){
 s.active=1-p;
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.active,p);
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

test('the four verified Psychic prints resolve to two physical card IDs with both faces',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1355.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const {prints}=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 assert.deepEqual(m.cards.map(x=>x.id),[MASA,GLEN]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dmx22b-120','dmx22b-121']);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,name,image,source,canonicalId=id,spec,verification}=row;
  assert.match(verification.backImageSha256,/^[a-f0-9]{64}$/);
  assert.equal(catalogue.get(id).id,canonicalId);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).length,1);
  assert.deepEqual(spec,standardCardSpec(details.cards.find(x=>x.id===canonicalId),{phase:1355}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(e.card(canonicalId)[key],value);
  assert.equal(e.card(canonicalId).limit,4);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId,name,image,source});
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
 }
});

test('Psychic Eater lets the opponent choose the real Glen-Oh and it survives the destruction (QA 36427)',()=>{
 const s=field(),glen=placePsychic(s,0,GLEN),masa=placePsychic(s,0,MASA);
 const eater=add(s,1,EATER);
 cast(s,BOUNCE);
 act(s,'effect',a=>a.targets.some(x=>x.uid===eater.uid));
 assert.equal(s.decision.player,0);
 assert.deepEqual(new Set(s.decision.choices.map(c=>c.value?.uid??c.value)),new Set([glen.uid,masa.uid]));
 pick(s,glen.uid);
 drain(s);
 assert.ok(has(s,0,'battle',glen));
 assert.ok(!has(s,0,'extra',glen));
 assert.ok(has(s,1,'hand',eater));
});

test('the actual Mushahole deploys Glen-Oh and Demon Hand can select it (QA 36426)',()=>{
 const s=field();
 cast(s,HALL);
 const x=s.players[0].extra.find(x=>x.cardId===GLEN);
 pick(s,x.uid);
 drain(s);
 assert.ok(has(s,0,'battle',x));
 s.active=1;
 cast(s,DEMON);
 act(s,'effect',a=>a.targets[0].uid===x.uid);
 drain(s);
 assert.ok(has(s,0,'battle',x));
 assert.equal(e.effectiveCard(x,s).breaker,2);
});

test('a losing Glen-Oh returns to its extra zone and a winning Glen-Oh survives Slayer (QA 36428)',()=>{
 for(const lose of [true,false]){
  const s=field(),glen=placePsychic(s,0,GLEN);
  const opponent=add(s,1,lose?BIG:SLAYER,{tapped:true,...(lose?{powerModifiers:[{amount:20000}]}:{})});
  attack(s,glen.uid,opponent.uid);
  act(s,'noBlock');
  drain(s);
  assert.equal(has(s,0,'extra',glen),lose);
  assert.equal(has(s,0,'battle',glen),!lose);
  assert.equal(has(s,1,'grave',opponent),!lose);
 }
});

test('turn-start awakening must link one eligible Glen-Oh and keeps physical card counts and modifiers',()=>{
 const s=field(),masa=placePsychic(s,0,MASA),glen=placePsychic(s,0,GLEN,{powerModifiers:[{amount:2000}]});
 const other=placePsychic(s,0,GLEN);
 assert.equal(e.power(masa,false,s),3000);
 const physical=e.physicalCards(s).length;
 nextOwnTurn(s,0);
 assert.equal(s.decision.task.op,'g34_PsychicLink1355');
 pick(s,glen.uid);
 assert.equal(e.card(masa).name,'爆裂ダッシュ！グレンセーバー政');
 assert.equal(e.costValue(e.card(masa)),15);
 assert.equal(e.power(masa,false,s),14000);
 assert.equal(e.effectiveCard(masa,s).breaker,3);
 assert.equal(e.physicalCards(s).length,physical);
 assert.ok(has(s,0,'battle',other));
 assert.ok(!has(s,0,'battle',glen));
 assert.ok(e.observation(s,1).players[0].battle.some(x=>x.psychicLinks?.some(y=>y.uid===glen.uid)));
});

test('link release chooses either physical cell after a creature bounce or Rakujou card choice (806.1c)',()=>{
 for(const spell of [BOUNCE,RAKUJO]){
  for(const returning of [MASA,GLEN]){
   const s=field(),masa=placePsychic(s,0,MASA,{powerModifiers:[{amount:1000}]}),glen=placePsychic(s,0,GLEN);
   nextOwnTurn(s,0);
   masa.tapped=true;
   s.active=1;s.phase='main';
   cast(s,spell);
   if(spell===BOUNCE)act(s,'effect',a=>a.targets[0].uid===masa.uid);
   else pick(s,glen.uid);
   assert.equal(s.decision.type,'psychicUnlink');
   assert.equal(s.decision.player,0);
   const out=returning===MASA?masa:glen,remaining=out===glen?masa:glen;
   const restored=JSON.parse(JSON.stringify(s));
   for(const board of [s,restored]){
    act(board,'psychicUnlink',a=>a.uid===out.uid);
    drain(board);
    const survivor=board.players[0].battle.find(x=>x.uid===remaining.uid);
    assert.ok(survivor);
    assert.ok(survivor.tapped);
    assert.equal(e.power(survivor,false,board),e.card(remaining.cardId).power+1000);
    assert.equal(e.card(survivor).name,e.card(remaining.cardId).name);
    assert.ok(has(board,0,'extra',out));
    assert.ok(!has(board,0,'hand',out));
   }
  }
 }
});

test('the linked pair are separate cells under an evolution and do not relink when it leaves (QA 48139)',()=>{
 const evolution='dmx04-013',s=field(),masa=placePsychic(s,0,MASA),glen=placePsychic(s,0,GLEN);
 nextOwnTurn(s,0);
 s.phase='main';
 cast(s,evolution);
 act(s,'evolve',a=>a.baseUid===masa.uid);
 assert.equal(s.decision.task.op,'g34_PsychicBaseOrder1355');
 pick(s,glen.uid);
 drain(s);
 const top=s.players[0].battle.find(x=>x.cardId===evolution);
 assert.deepEqual(top.under.map(x=>[x.uid,e.card(x).type]),[[glen.uid,'cell'],[masa.uid,'cell']]);
 assert.ok(!top.under.some(x=>x.psychicLinks));
 s.active=1;s.phase='main';
 cast(s,RAKUJO);
 pick(s,top.uid);
 drain(s);
 assert.ok(has(s,0,'extra',masa));
 assert.ok(has(s,0,'extra',glen));
 assert.ok(has(s,0,'hand',top));
 assert.equal(s.players[0].battle.length,0);
});
