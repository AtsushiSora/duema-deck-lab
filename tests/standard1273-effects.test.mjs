import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const HUNGRY='dmr05-s07',VEIL='dm22ex2-044',PAINT='dmex03-010',PRINT='dm23ex3-TF06';
const UNKNOWN='dm26rp2-004',WATER='dm01-083',NATURE='dm01-108',ENERGY='dm06-085';
const DARK='dm01-090',BOUNCE='dmrp20-036',AMO='dmrp19-s10',SHAKO='dmrp03-s03';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(24).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>options(s)[a.choice]===v);
function finish(s){if(s.decision?.type==='block')act(s,'noBlock');drain(s);}

const pass=s=>{s.phase='attack';act(s,'endTurn');};

const replacement=(s,replace)=>act(s,'replaceDraw',a=>a.replace===replace);
const discard=(s,uid)=>act(s,'discardDraw',a=>a.uid===uid);
const manaSummon=(s,x)=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.origin==='mana'&&a.uid===x.uid);

test('four official prints resolve to three battle IDs',()=>{
 const m=read('tools/support-phase-1273.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalog=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[HUNGRY,VEIL,PAINT]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[PRINT,HUNGRY]]);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row,c=e.card(canonicalId);
  const detail={id,status:'complete',faces:row.faces};
  if(id===canonicalId)assert.deepEqual(row.faces,details.cards.find(x=>x.id===id).faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1273}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:1272}));
  const altered=structuredClone(detail);altered.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1273}));
  assert.deepEqual(catalog.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.ok(refs.some(ref=>ref.id===id&&ref.canonicalId===canonicalId&&ref.image===image));
 }
});

test('Elegance offers one mana card per opposing actual draw',()=>{
 const s=field(),x=add(s,1,'battle',HUNGRY),own=s.players[1];
 const [top]=own.deck;
 cast(s,ENERGY);
 act(s,'orderEffect',a=>a.uid===x.uid);
 pick(s,1);pick(s,0);
 assert.ok(has(s,1,'mana',top));
 assert.equal(own.deck.length,23);
 assert.equal(s.decision,null);
});

test('Elegance lets Unknown creatures repeatedly summon from mana and pay with themselves (QA36581)',()=>{
 let s=field();add(s,0,'battle',HUNGRY);
 const ordinary=add(s,0,'mana',WATER),first=add(s,0,'mana',UNKNOWN),second=add(s,0,'mana',UNKNOWN);
 assert.ok(!manaSummon(s,ordinary));
 const action=manaSummon(s,first);
 assert.ok(action);
 e.step(s,action,{manualMana:true});
 s=JSON.parse(JSON.stringify(s));
 act(s,'selectMana',a=>a.uid===first.uid);
 const extra=s.players[0].mana.filter(x=>x.uid!==first.uid&&x.uid!==second.uid).slice(0,s.decision.cost-1);
 for(const x of extra)act(s,'selectMana',a=>a.uid===x.uid);
 act(s,'confirmMana');drain(s);
 assert.ok(has(s,0,'battle',first));
 assert.ok(manaSummon(s,second));
});

test('Elegance loses its mana permission when its ability is ignored or its source leaves',()=>{
 for(const mode of ['sealed','gone']){
  const s=field(),source=add(s,0,'battle',HUNGRY),x=add(s,0,'mana',UNKNOWN);
  assert.ok(manaSummon(s,x));
  if(mode==='sealed')source.sealed=true;else s.players[0].battle=[];
  assert.ok(!manaSummon(s,x));
 }
});

for(const replace of [true,false])test('Veil can choose its first draw only, even in a multi-draw effect '+replace,()=>{
 let s=field(),x=add(s,0,'battle',VEIL),held=add(s,0,'hand',WATER);
 assert.equal(e.effectiveCard(x,s).blocker,true);
 cast(s,ENERGY);
 assert.equal(s.decision.source,VEIL);
 assert.match(s.decision.title,/バビロン・ヴェイル/);
 replacement(s,replace);
 if(replace){
  s=JSON.parse(JSON.stringify(s));discard(s,held.uid);
  assert.ok(has(s,0,'grave',held));
 }
 assert.equal(s.players[0].drawsThisTurn,replace?3:2);
 assert.equal(s.players[0].hand.length,3);
 cast(s,ENERGY);assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,5);
});

test('Veil can replace the first draw on the opposing turn, then the next turn resets the count',()=>{
 const s=field();add(s,0,'battle',VEIL);
 cast(s,ENERGY);replacement(s,false);
 pass(s);
 // The second player attacks, and a Shield Trigger makes the first player draw.
 act(s,'skipCharge');const attacker=add(s,1,'battle',WATER);
 give(s,0,'shields',['dm01-052']);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');
 if(s.decision?.type==='draw')act(s,'draw',a=>a.n===2);
 assert.equal(s.decision?.type,'drawReplacement');
 replacement(s,false);drain(s);
 assert.ok(s.players[0].drawsThisTurn>0);
 pass(s);
 assert.equal(s.decision?.type,'drawReplacement');
 replacement(s,false);drain(s);
});

test('Veil makes the opponent choose one discard for each actual draw after the first',()=>{
 const s=field();add(s,1,'battle',VEIL);add(s,1,'battle',AMO);
 cast(s,ENERGY);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.decision,null);
 s.players[1].battle=s.players[1].battle.filter(x=>x.cardId!==AMO);
 const kept=s.players[0].hand[0];
 cast(s,ENERGY);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect');
 assert.equal(s.decision.player,0);
 const [a,b]=s.players[0].hand.slice(1);
 pick(s,a.uid);pick(s,b.uid);
 assert.ok(has(s,0,'hand',kept)&&has(s,0,'grave',a)&&has(s,0,'grave',b));
});

test('Veil’s replacement can win when the second card is the last card (QA44088)',()=>{
 const s=field();add(s,0,'battle',VEIL);add(s,0,'battle',SHAKO);
 give(s,0,'deck',[WATER,NATURE]);
 cast(s,'dm36-086');replacement(s,true);
 assert.equal(s.winner,0);
});

test('Painty can enter with or without NEO evolution and weakens all other creatures on both sides',()=>{
 for(const evolve of [true,false]){
  const s=field(),base=add(s,0,'battle',DARK),ally=add(s,0,'battle',WATER),enemy=add(s,1,'battle',WATER);
  const paint=add(s,0,'hand',PAINT);
  act(s,'play',a=>a.uid===paint.uid&&!a.alternative);
  if(s.decision?.type==='evolution')act(s,'evolve',a=>evolve?a.baseUid===base.uid:a.baseUid==null);
  assert.equal(e.isEvolution(paint),evolve);
  assert.equal(e.power(paint,false,s),13000);
  assert.ok(has(s,0,'grave',ally)&&has(s,1,'grave',enemy));
  assert.equal(paint.under?.some(y=>y.uid===base.uid)??false,evolve);
 }
});

test('Painty gives one independently optional blind discard per shield broken',()=>{
 const s=field(),x=add(s,0,'battle',PAINT);
 const first=add(s,1,'hand',WATER),second=add(s,1,'hand',DARK);
 give(s,1,'shields',[NATURE,NATURE,NATURE]);
 attack(s,x.uid);act(s,'noBlock');
 act(s,'orderEffect');pick(s,true);
 assert.equal(s.decision.player,0);
 assert.ok(s.decision.choices.every(option=>option.cardId===undefined));
 pick(s,1);
 act(s,'orderEffect');pick(s,null);
 pick(s,true);pick(s,0);
 assert.ok(has(s,1,'grave',first)&&has(s,1,'grave',second));
 assert.equal(s.players[1].hand.length,3);
});

test('Painty cannot use Break Bonus after leaving to a Shield Trigger (QA31809)',()=>{
 const s=field(),x=add(s,0,'battle',PAINT);
 give(s,1,'shields',[BOUNCE,NATURE,NATURE]);
 attack(s,x.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===BOUNCE);drain(s);
 assert.ok(has(s,0,'hand',x));
 assert.equal(s.players[1].hand.length,2);
});
