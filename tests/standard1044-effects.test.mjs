import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,data,details,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const TELEPORT='dm23ex2-066',BACKDOOR='dm23rp1-055',WHIRL='dm24rp2-033';
const NATURE='dm01-108',DEMON='dm01-027',VINE='dm23rp1-074',QQX='dmrp07-m01';
const MECHA='dmr08-042',SEED='dmrp22-048',BIG='dm05-021',ONIKAMASU='dmrp01-041';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const ids=rows=>rows.map(x=>x.uid);
const physical=s=>ids(e.physicalCards(s)).sort();
const restore=s=>decodeBattleData(encodeBattleData(s));
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function add(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}

test('Three official cards keep their IDs, images and stats with three checked print aliases',()=>{
 const m=read('tools/support-phase-1044.json'),catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[TELEPORT,BACKDOOR,WHIRL]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dm24ex4-081',TELEPORT],['dm24ex4-PR041',TELEPORT],['dm25ex1-076',BACKDOOR]
 ]);
 assert.deepEqual(catalogue.resolveRows([TELEPORT,'dm24ex4-081','dm24ex4-PR041'].map(id=>({id,count:1}))),[{id:TELEPORT,count:3}]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],base=m.cards.find(x=>x.id===id);
  assert.ok(row.verification.facesMatched&&catalogue.get(row.id).supported);
  assert.equal(catalogue.get(row.id).id,id);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations.filter(color=>color!=='無色'),1,m.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[id],base.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1044}),base.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

test('Teleport privately checks exactly five, moves one physical card to public extra and bottoms the rest in order',()=>{
 let s=field(),spell=add(s,0,'hand',TELEPORT);
 give(s,0,'deck',[MECHA,DEMON,VINE,BACKDOOR,NATURE,SEED,...Array(6).fill(NATURE)]);
 const [first,second,third,fourth,fifth,...rest]=s.players[0].deck,all=physical(s);
 play(s,spell);
 assert.deepEqual(choices(s),ids([first,second,third,fourth,fifth]));
 assert.ok(!s.log.some(x=>x.kind==='reveal'&&x.cardId===TELEPORT));
 assert.ok(!e.observation(s,1).players[0].extra.length);
 s=restore(s);
 pick(s,second.uid);
 assert.deepEqual(ids(e.observation(s,1).players[0].extra),[second.uid]);
 assert.ok(!has(s,0,'mana',spell));
 assert.deepEqual(choices(s),ids([first,third,fourth,fifth]));
 for(const x of [fifth,first,fourth])pick(s,x.uid);
 assert.deepEqual(ids(s.players[0].deck),ids([...rest,fifth,first,fourth,third]));
 assert.ok(has(s,0,'mana',spell));
 assert.ok(!s.players[0].mana.find(x=>x.uid===spell.uid).tapped);
 assert.deepEqual(physical(s),all);
});

test('QQX blocks Teleport inspection and placement while Charger still sends the spell to mana',()=>{
 const s=field(),spell=add(s,0,'hand',TELEPORT);
 add(s,1,'battle',QQX);
 const before=ids(s.players[0].deck);
 play(s,spell);
 assert.equal(s.decision,null);
 assert.deepEqual(ids(s.players[0].deck),before);
 assert.equal(s.players[0].extra.length,0);
 assert.ok(has(s,0,'mana',spell));
});

test('Curve limits Teleport inspection to one card',()=>{
 const s=field(),spell=add(s,0,'hand',TELEPORT),top=s.players[0].deck[0];
 add(s,1,'battle','dmrp22-030');
 play(s,spell);
 assert.deepEqual(choices(s),[top.uid]);
 pick(s,top.uid);
 assert.deepEqual(ids(s.players[0].extra),[top.uid]);
 assert.ok(has(s,0,'mana',spell));
});

test('Backdoor may tap a Mecha seed, then execute a low-cost Mecha for free and bottom the rest privately',()=>{
 let s=field();
 const spell=add(s,0,'hand',BACKDOOR),seed=add(s,0,'battle',SEED),old=add(s,0,'battle',MECHA,{tapped:true});
 add(s,0,'battle',NATURE);
 const sealed=add(s,0,'battle',MECHA,{sealed:true});
 s.players[0].seals=[Object.assign(inst(NATURE),{sealOf:sealed.uid})];
 add(s,1,'battle',MECHA);
 give(s,0,'deck',[MECHA,BIG,NATURE,...Array(9).fill(NATURE)]);
 const [hit,big,nature,...rest]=s.players[0].deck,all=physical(s);
 play(s,spell);
 assert.deepEqual(new Set(choices(s)),new Set([seed.uid,old.uid,null]));
 pick(s,seed.uid);
 assert.ok(seed.tapped);
 assert.equal(s.decision.task.op,'g34_RaidPick');
 assert.deepEqual(choices(s),[hit.uid,null]);
 s=restore(s);
 pick(s,hit.uid);
 pick(s,nature.uid);
 assert.ok(has(s,0,'battle',hit)&&has(s,0,'grave',spell));
 assert.deepEqual(ids(s.players[0].deck),ids([...rest,nature,big]));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 assert.deepEqual(physical(s),all);
});

test('Backdoor excludes a Mecha field and retains its optional first action',()=>{
 const fixture={...e.card(MECHA),id:'phase1044-mecha-field',name:'Mecha field fixture',type:'field'};
 e.setCards([...data.cards,fixture]);
 try{
  const s=field(),spell=add(s,0,'hand',BACKDOOR),mecha=add(s,0,'battle',MECHA);
  const fieldCard=add(s,0,'battle',fixture.id),before=ids(s.players[0].deck);
  play(s,spell);
  assert.deepEqual(choices(s),[mecha.uid,null]);
  pick(s,null);
  assert.equal(s.decision,null);
  assert.ok(!mecha.tapped&&!fieldCard.tapped);
  assert.deepEqual(ids(s.players[0].deck),before);
 }finally{
  e.setCards(data.cards);
 }
});

test('Backdoor follows the attempt to tap an already tapped Mecha and may decline the Mekraid card',()=>{
 const s=field(),spell=add(s,0,'hand',BACKDOOR),mecha=add(s,0,'battle',MECHA,{tapped:true});
 give(s,0,'deck',[MECHA,NATURE,BIG,...Array(9).fill(NATURE)]);
 const [first,second,third,...rest]=s.players[0].deck;
 play(s,spell);
 pick(s,mecha.uid);
 assert.deepEqual(choices(s),[first.uid,null]);
 pick(s,null);
 pick(s,third.uid);
 pick(s,first.uid);
 assert.deepEqual(ids(s.players[0].deck),ids([...rest,third,first,second]));
 assert.ok(has(s,0,'grave',spell));
});

for(const spellId of [DEMON,VINE])test('Whirlpool draws opposing targeted removal when it is eligible '+spellId,()=>{
 const s=field(),spell=add(s,0,'hand',spellId);
 const whirl=add(s,1,'battle',WHIRL),other=add(s,1,'battle',NATURE);
 add(s,1,'battle',ONIKAMASU);
 play(s,spell);
 const options=e.getLegalActions(s);
 if(s.decision.type==='extended'){
  assert.deepEqual(choices(s),[whirl.uid]);
  pick(s,whirl.uid);
 }else{
  assert.equal(options.length,1);
  assert.deepEqual(options[0].targets.map(x=>x.uid),[whirl.uid]);
  act(s,'effect');
 }
 assert.ok(!has(s,1,'battle',whirl)&&has(s,1,'battle',other));
});

test('Whirlpool leaves player attacks available and redirects only legal creature attacks',()=>{
 const s=field(),attacker=add(s,0,'battle',NATURE);
 const whirl=add(s,1,'battle',WHIRL,{tapped:true}),other=add(s,1,'battle',NATURE,{tapped:true});
 s.phase='attack';
 const targets=()=>e.getLegalActions(s).filter(x=>x.kind==='attack'&&x.uid===attacker.uid).map(x=>x.target);
 assert.deepEqual(new Set(targets()),new Set(['player',whirl.uid]));
 assert.ok(e.getLegalActions(s).some(x=>x.kind==='endTurn'));
 whirl.tapped=false;
 assert.deepEqual(new Set(targets()),new Set(['player',other.uid]));
 whirl.tapped=true;
 whirl.sealed=true;
 assert.deepEqual(new Set(targets()),new Set(['player',other.uid]));
});

test('The unconditional attack lure still limits player attacks with Whirlpool present',()=>{
 const s=field(),attacker=add(s,0,'battle',NATURE);
 const whirl=add(s,1,'battle',WHIRL,{tapped:true}),lure=add(s,1,'battle','dmrp05-026',{tapped:true});
 s.phase='attack';
 const targets=e.getLegalActions(s).filter(x=>x.kind==='attack'&&x.uid===attacker.uid).map(x=>x.target);
 assert.deepEqual(new Set(targets),new Set([whirl.uid,lure.uid]));
});
