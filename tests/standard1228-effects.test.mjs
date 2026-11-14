import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SM='dm23rp1-038',TRI='dm23rp1-010',TIDE='dm23rp1-026',FAIRY='dm23rp1-007',FINE='dm23sd1-012';
const LIGHT='dm01-075',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108',WATER='dm01-083';
const LOW='dm23rp2-054',SHIN='dm24rp3-055',ABYSS='dm23rp3-OR1',APUL='dmrp22-042';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1]){give(s,p,'grave',[]);give(s,p,'deck',Array(20).fill(NATURE));}
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const choices=s=>s.decision?.choices?.map(({value})=>value?.uid??value)??[];
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}

test('ten official images and full text resolve to four new IDs and the existing Piyocchi ID',()=>{
 const m=read('tools/support-phase-1228.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[SM,TRI,TIDE,FAIRY]);
 assert.equal(m.printAliases.length,6);
 assert.equal(m.printAliases.find(x=>x.id==='dm23rp1-19A').canonicalId,FINE);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1228}),row.spec);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
 }
});

for(const blocked of [false,true])test('Sumonmar Mekraids after attempting to return four grave cards, locked='+blocked+' (QA43074)',()=>{
 const s=field();
 const rows=[LIGHT,DARK,WATER,NATURE].map(id=>add(s,0,'grave',id));
 const abyss=inst(ABYSS);
 s.players[0].deck.unshift(abyss);
 if(blocked)add(s,1,'battle',APUL);
 cast(s,SM);pick(s,0);
 for(const x of [rows[2],rows[0],rows[3],rows[1]])pick(s,x.uid);
 assert.equal(s.decision?.task?.op,'g34_RaidPick');
 assert.equal(s.decision.task.max,8);
 assert.ok(choices(s).includes(abyss.uid));
 for(const x of rows)assert.equal(has(s,0,'grave',x),blocked);
 if(!blocked)assert.deepEqual(s.players[0].deck.slice(-4).map(x=>x.uid),[rows[2],rows[0],rows[3],rows[1]].map(x=>x.uid));
 pick(s,null);drain(s);
});

test('Sumonmar can decline the four-card move or mill four as its other mode',()=>{
 for(const mode of ['tooFew','decline','mill']){
  const s=field(),n=mode==='tooFew'?3:4;
  give(s,0,'grave',Array(n).fill(DARK));
  const cards=s.players[0].grave.slice(),top=s.players[0].deck.slice(0,4);
  cast(s,SM);pick(s,mode==='mill'?1:0);
  if(mode==='decline'){pick(s,cards[0].uid);pick(s,null);}
  assert.ok(!s.decision);
  assert.equal(s.players[0].grave.length,n+(mode==='mill'?4:0));
  assert.ok(cards.every(x=>has(s,0,'grave',x)));
  assert.ok(top.every(x=>has(s,0,mode==='mill'?'grave':'deck',x)));
 }
});

test('Tri-Shelby uses its shield trigger, taps itself, and can use only a small Mecha',()=>{
 const s=field(1),enemy=add(s,1,'battle',FIRE);
 give(s,0,'mana',[]);give(s,0,'shields',[TRI,NATURE]);
 const [tri,shield]=s.players[0].shields,mecha=inst(LOW);
 s.players[0].deck.unshift(mecha,inst(TRI),inst(WATER));
 s.phase='attack';act(s,'attack',a=>a.uid===enemy.uid&&a.shield===tri.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===tri.uid);
 assert.equal(e.effectiveCard(tri,s).blocker,true);
 assert.ok(!tri.tapped);pick(s,tri.uid);assert.ok(tri.tapped);
 assert.deepEqual(choices(s),[mecha.uid,null]);
 pick(s,mecha.uid);drain(s);
 assert.ok(has(s,0,'battle',tri)&&has(s,0,'battle',mecha)&&has(s,0,'shields',shield));
});

test('Tri-Shelby can decline, and an already tapped Mecha still permits the Mekraid attempt',()=>{
 for(const accept of [false,true]){
  const s=field(),ally=add(s,0,'battle',SHIN,{tapped:true}),opponent=add(s,1,'battle',LOW);
  const top=inst(LOW);s.players[0].deck.unshift(top);
  cast(s,TRI);assert.ok(choices(s).includes(ally.uid)&&!choices(s).includes(opponent.uid));
  pick(s,accept?ally.uid:null);
  if(accept){assert.equal(s.decision.task.op,'g34_RaidPick');assert.ok(choices(s).includes(top.uid));}
  else assert.ok(!s.decision&&s.players[0].deck[0]===top);
 }
});

test('Tidal & Burn has its printed combat traits and its controller chooses after either player casts',()=>{
 const s=field();
 cast(s,TIDE);
 const tide=s.players[0].battle.find(x=>x.cardId===TIDE);
 assert.ok(tide.justDiverActive&&e.effectiveCard(tide,s).speedAttacker);
 assert.equal(e.effectiveCard(tide,s).breaker,2);
 for(const who of [0,1]){
  s.active=who;s.phase='main';const n=s.players[0].hand.length;
  cast(s,'dm36-086');
  assert.equal(s.decision?.player,0);assert.deepEqual(choices(s),[0,1]);
  pick(s,0);assert.equal(s.players[0].hand.length,n+1+Number(who===0));
 }
});

test('Tidal & Burn itself breaks shields and applies its extra break (QA43337 with Gaigensui)',()=>{
 const s=field(),tide=add(s,0,'battle',TIDE);
 cast(s,'dmr13-007');drain(s);
 assert.equal(e.effectiveCard(tide,s).extraBreak,1);
 const [one,two,...rest]=s.players[1].shields;
 cast(s,'dm36-086');pick(s,1);pick(s,one.uid);
 assert.equal(s.players[1].shields.length,5);
 pick(s,two.uid);drain(s);
 assert.deepEqual(s.players[1].shields.map(x=>x.uid),rest.map(x=>x.uid));
 assert.ok(has(s,1,'hand',one)&&has(s,1,'hand',two));
});

test('Fairy uses Mach Fighter on entry and can double current power for this turn',()=>{
 const s=field(),enemy=add(s,1,'battle',FIRE),ally=add(s,0,'battle','dm01-029');
 cast(s,FAIRY);
 const fairy=s.players[0].battle.find(x=>x.cardId===FAIRY);
 assert.ok(!e.getLegalActions({...s,phase:'attack'}).some(a=>a.uid===fairy.uid&&a.target==='player'));
 attack(s,fairy.uid,enemy.uid);pick(s,0);pick(s,ally.uid);drain(s);
 assert.ok(has(s,1,'grave',enemy));
 assert.equal(e.power(ally,false,s),18000);
 assert.equal(e.effectiveCard(ally,s).breaker,4);
 end(s);assert.equal(e.power(ally,false,s),9000);
 assert.equal(!!e.effectiveCard(ally,s).poweredBreaker,false);
});

test('Fairy can ramp or put a small creature from mana without summoning it',()=>{
 for(const mode of [1,2]){
  const s=field(),fairy=add(s,0,'battle',FAIRY),ally=add(s,0,'mana',DARK),big=add(s,0,'mana','dm01-029');
  const top=s.players[0].deck[0];
  attack(s,fairy.uid);pick(s,mode);
  if(mode===2){
   assert.ok(choices(s).includes(ally.uid)&&!choices(s).includes(big.uid)&&!choices(s).includes(null));
   pick(s,ally.uid);assert.ok(has(s,0,'battle',ally));assert.equal(ally.summonedTurn,undefined);
  }else assert.ok(has(s,0,'mana',top));
  drain(s);
 }
});
