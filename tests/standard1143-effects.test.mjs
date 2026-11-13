import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MIC='dm26rp2-022',BOSS='dm26rp2-023',BEN='dm26rp1-003',DECISION='dm26rp1-011';
const N='dm01-108',LIGHT='dm01-075',WATER='dm01-083',FIRE='dm01-097',BIG='dm01-001',HAND='dm01-027';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(12).fill(N));give(s,p,'grave',[]);}
 return s;
}
function add(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const choice=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choice(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);

test('three canonical cards and four official printings use the verified rules and card data',()=>{
 const m=read('tools/support-phase-1143.json'),r=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[MIC,BOSS,BEN]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['promoy25-045',MIC]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],canonical=m.cards.find(x=>x.id===id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1143}),canonical.spec);
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(r.get(row.id).id,id);
  assert.equal(r.byName.get(nameKey(row.name)).id,id);
  assert.equal(CARD_IMAGES[id],canonical.image);
  assert.ok(read('tools/image-reference-prints.json').prints.some(x=>x.id===row.id&&x.image===row.image));
 }
});

test('Michelangelo counts shield groups after optional face-up placement (QA 48944)',()=>{
 for(const addShield of [true,null]){
  const s=field(),own=s.players[0],mic=add(s,0,'hand',MIC),top=own.deck[0];
  const [mixed,up]=own.shields;
  mixed.shieldStack=[Object.assign(inst(N),{faceUp:true})];
  up.faceUp=true;
  up.shieldStack=[Object.assign(inst(N),{faceUp:true})];
  play(s,mic);
  assert.ok(e.effectiveCard(mic,s).blocker);
  assert.equal(e.effectiveCard(mic,s).breaker,2);
  assert.equal(s.decision.task.op,'g34_Offer');
  pick(s,addShield);
  assert.equal(own.shields.includes(top),!!addShield);
  if(addShield)assert.equal(top.faceUp,true);
  const count=addShield?3:2;
  assert.equal(s.decision.task.n,count);
  for(let i=0;i<count;i++)pick(s,true);
  assert.equal(own.hand.length,count);
  assert.equal(s.decision,null);
 }
});

test('both Revolution Changes use the correct civilization and current power',()=>{
 for(const [id,color] of [[MIC,WATER],[BOSS,N]])for(const [source,power,eligible] of [[LIGHT,4000,true],[color,4000,true],[color,3999,false],[FIRE,5000,false]]){
  const s=field(),x=add(s,0,'battle',source,{powerModifiers:[{amount:power-e.card(source).power}]}),
   incoming=add(s,0,'hand',id),target=add(s,1,'battle',N,{tapped:true});
  attack(s,x.uid,target.uid);
  assert.equal(s.decision?.task?.op==='revDeclare',eligible);
  if(!eligible)continue;
  pick(s,true);pick(s,x.uid);
  if(id===MIC)pick(s,null);
  assert.ok(s.players[0].battle.includes(incoming)&&s.players[0].hand.includes(x));
 }
});

test('Bosskatsu reductions stack for its controller and floor creature payment at one',()=>{
 const s=field(),own=s.players[0],spell=add(s,0,'hand',HAND),big=add(s,0,'hand',BIG),small=add(s,0,'hand',N);
 add(s,1,'battle',BOSS);
 assert.equal(e.summonCost(s,0,e.card(big)),6);
 add(s,0,'battle',BOSS);
 assert.equal(e.summonCost(s,0,e.card(big)),4);
 add(s,0,'battle',BOSS);
 assert.equal(e.summonCost(s,0,e.card(big)),2);
 assert.equal(e.summonCost(s,0,e.card(spell)),6);
 play(s,small);
 assert.ok(own.battle.includes(small));
 assert.equal(own.mana.filter(x=>x.tapped).length,1);
});

test('Bosskatsu uses G Strike from a broken shield',()=>{
 const s=field();give(s,0,'shields',[BOSS]);
 const x=add(s,1,'battle',N);s.active=1;
 attack(s,x.uid);act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);pick(s,x.uid);
 assert.ok(e.attackLocked(s,1,x));
});

test('Bosskatsu Escape can save it from destruction without using the returned S Trigger',()=>{
 const s=field(),boss=add(s,0,'battle',BOSS);
 give(s,0,'shields',[HAND]);
 const [shield]=s.players[0].shields;
 s.active=1;
 play(s,add(s,1,'hand',HAND));
 act(s,'effect',a=>a.targets[0]?.uid===boss.uid);
 act(s,'replaceEscape',a=>a.shield===shield.uid);
 assert.ok(s.players[0].battle.includes(boss)&&s.players[0].hand.includes(shield));
 assert.equal(s.decision,null);
});

test('Benzolus mills up to three, counting printed S Triggers but not the conditional Decision (QA 48494)',()=>{
 for(const count of [0,1,2,3]){
  const s=field();
  give(s,0,'deck',[DECISION,HAND,HAND,N,N]);
  const own=s.players[0],cards=own.deck.slice(0,3),ben=add(s,0,'hand',BEN);
  const victims=Array.from({length:3},()=>add(s,1,'battle',N));
  play(s,ben);
  assert.equal(e.power(ben,false,s),5000);
  assert.deepEqual(s.decision.choices.map(c=>c.value),[0,1,2,3]);
  pick(s,count);
  assert.deepEqual(own.grave,cards.slice(0,count));
  if(count<=1)assert.equal(s.decision,null);
  else{
   assert.equal(s.decision.task.n,count-1);
   for(const x of victims.slice(0,count-1))pick(s,x.uid);
  }
  assert.deepEqual(s.players[1].grave,victims.slice(0,Math.max(0,count-1)));
  assert.equal(s.decision,null);
 }
});

test('Benzolus can decline its destruction choices and still retains the cards it milled',()=>{
 const s=field(),own=s.players[0];
 give(s,0,'deck',[HAND,N,N,N]);
 const top=own.deck[0],victim=add(s,1,'battle',N);
 play(s,add(s,0,'hand',BEN));pick(s,1);pick(s,null);
 assert.deepEqual(own.grave,[top]);
 assert.ok(s.players[1].battle.includes(victim));
});

test('each Benzolus grants one paid creature summon from the grave on its controller turn',()=>{
 const s=field(),own=s.players[0];
 const first=add(s,0,'battle',BEN),second=add(s,0,'battle',BEN);
 const a=add(s,0,'grave',N),b=add(s,0,'grave',N),c=add(s,0,'grave',N),spell=add(s,0,'grave',HAND);
 const permits=x=>legal(s,'play').filter(a=>a.uid===x.uid&&a.origin==='grave'&&a.manaPermit?.startsWith('g450:'));
 const permit=x=>'g450:'+x.uid+'@'+(x.incarnation||0);
 assert.deepEqual(new Set(permits(a).map(x=>x.manaPermit)),new Set([permit(first),permit(second)]));
 assert.equal(permits(spell).length,0);
 act(s,'play',x=>x.uid===a.uid&&x.manaPermit===permit(first));
 assert.deepEqual(permits(b).map(x=>x.manaPermit),[permit(second)]);
 act(s,'play',x=>x.uid===b.uid&&x.manaPermit===permit(second));
 assert.equal(own.mana.filter(x=>x.tapped).length,4);
 assert.equal(permits(c).length,0);
 s.active=1;s.turn++;
 assert.equal(permits(c).length,0);
 s.active=0;s.turn++;
 assert.equal(permits(c).length,2);
});

test('Benzolus can enter from a broken shield and resolve its entry ability',()=>{
 const s=field();
 give(s,0,'shields',[BEN]);
 const [ben]=s.players[0].shields;
 const x=add(s,1,'battle',N);s.active=1;
 attack(s,x.uid);act(s,'noBlock');
 assert.equal(s.decision.type,'trigger');
 act(s,'useTrigger',a=>a.uid===ben.uid);
 assert.equal(s.decision.task.op,'g34_MillTrigger1143');
 pick(s,0);
 assert.ok(s.players[0].battle.includes(ben));
});
