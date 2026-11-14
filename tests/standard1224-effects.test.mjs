import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const IZAQ='dm22rp1-035',LACRIMA='dm22rp1-002',BAU='dm22rp1-4A';
const WATER='dm01-083',FIRE='dm01-097',DARK='dm01-090',GREEN='dm01-108';
const FRIZZ='dm22rp1-034',SPARK='dm25-007',LIONEL='dmrp21-1A',LONG_SEED='dmsd20-008';
const field=(active=0)=>{
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(GREEN));
 return s;
};
const add=(s,p,zone,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v||
 s.decision.choices[a.choice].value?.uid===v);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const freezes=(s,x)=>(s.extLimits??[]).filter(l=>l.g190Freeze&&l.uid===x.uid).map(l=>l.kind).sort();
const castFace=(s,id,face)=>{const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);};

test('seven official prints resolve to three original IDs and preserve the card images',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const m=read('support-phase-1224.json'),refs=read('image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[IZAQ,LACRIMA,BAU]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['promoy21-045','dm22rp1-S4','dm22rp1-6B','dm23sp1-006']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1224}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race??'',c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
 }
});

test('iZaq enters via S-Trigger and freezes attack and block until its controller starts a turn',()=>{
 const s=field(1),attacker=add(s,1,'battle',FIRE),other=add(s,1,'battle',DARK);
 give(s,0,'shields',[IZAQ]);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===IZAQ);
 pick(s,other.uid);drain(s);
 assert.deepEqual(freezes(s,other),['attack','block']);
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===other.uid),false);
 assert.equal(s.players[0].battle[0].cardId,IZAQ);
 end(s);drain(s);
 assert.equal(s.active,0);
 assert.deepEqual(freezes(s,other),[]);
});

test('iZaq ignores its own use and each copy observes its own first qualifying use',()=>{
 const s=field(),first=add(s,1,'battle',FIRE),second=add(s,1,'battle',DARK),third=add(s,1,'battle',GREEN);
 cast(s,IZAQ);pick(s,first.uid);
 const original=s.players[0].battle[0];
 assert.equal(s.decision,null);
 cast(s,IZAQ);
 assert.equal(s.decision?.type,'effectOrder');
 const newCopy=s.players[0].battle.find(x=>x.uid!==original.uid);
 for(const [source,victim] of [[original,second],[newCopy,first]]){
  if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.uid===source.uid);
  assert.equal(s.decision?.task?.uid,source.uid);
  pick(s,victim.uid);
 }
 cast(s,SPARK);
 assert.equal(s.decision,null);
 assert.deepEqual(freezes(s,second),['attack','block']);
 assert.deepEqual(freezes(s,third),[]);
});

test('a spell used before iZaq enters still consumes that turn’s first qualifying use',()=>{
 const s=field(),enemy=add(s,1,'battle',FIRE);
 cast(s,SPARK);
 cast(s,IZAQ);pick(s,enemy.uid);
 cast(s,SPARK);
 assert.equal(s.decision,null);
 assert.equal(freezes(s,enemy).length,2);
});

test('iZaq uses the owner of a stolen spell, while Lacrima uses the actual caster',()=>{
 const s=field();
 const own=add(s,0,'battle',WATER),enemy=add(s,1,'battle',FIRE);
 add(s,0,'battle',IZAQ);add(s,1,'battle',IZAQ);
 const active=add(s,0,'hand',LACRIMA),inactive=add(s,1,'hand',LACRIMA);
 const spell=add(s,0,'hand',SPARK,{cardOwner:1});
 act(s,'play',a=>a.uid===spell.uid);
 assert.equal(s.decision?.player,1);
 pick(s,own.uid);assert.equal(s.decision,null);
 assert.deepEqual(freezes(s,enemy),[]);
 end(s);assert.equal(s.decision?.player,0);pick(s,true);drain(s);
 assert.ok(has(s,0,'battle',active));
 assert.ok(has(s,1,'hand',inactive));
 assert.ok(has(s,1,'grave',spell));
});

test('Lacrima uses the printed cost of a played seed and can decline before resolving end effects',()=>{
 for(const accept of [false,true]){
  const s=field(),x=add(s,0,'hand',LACRIMA);
  cast(s,BAU);pick(s,null);
  assert.equal(s.players[0].battle.find(y=>y.cardId===BAU)?.cardId,BAU);
  const high=add(s,0,'hand',LONG_SEED);
  act(s,'play',a=>a.uid===high.uid);drain(s);
  const tapped=s.players[0].mana.filter(y=>y.tapped).length;
  end(s);
  assert.equal(s.decision?.task?.op,'g34_LacrimaDeclare1224');
  pick(s,accept?true:null);drain(s);
  assert.ok(has(s,0,accept?'battle':'hand',x));
  assert.equal(s.players[0].mana.filter(y=>y.tapped).length,tapped);
  if(accept){
   assert.ok(x.justDiverActive);
   assert.equal(e.effectiveCard(x,s).blocker,true);
  }
 }
});

test('Lacrima does not count low-cost spells or a five-cost seed placed by Lionel (QA42046)',()=>{
 for(const direct of [false,true]){
  const s=field(),x=add(s,0,'hand',LACRIMA);
  if(direct){
   add(s,0,'battle','dm01-075');
   const seed=add(s,0,'hand',LONG_SEED);
   cast(s,LIONEL);drain(s);
   assert.ok(has(s,0,'battle',seed));
  }else{
   cast(s,FRIZZ);drain(s);
  }
  end(s);drain(s);
  assert.ok(has(s,0,'hand',x));
 }
});

test('Lacrima declares during the opposing end step after a five-cost S-Trigger',()=>{
 const s=field(1),x=add(s,0,'hand',LACRIMA),enemy=add(s,1,'battle',FIRE);
 give(s,0,'shields',[SPARK]);
 attack(s,enemy.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===SPARK);drain(s);
 end(s);
 assert.equal(s.decision?.player,0);
 assert.equal(s.decision?.task?.op,'g34_LacrimaDeclare1224');
 pick(s,true);drain(s);
 assert.ok(has(s,0,'battle',x));
 assert.equal(s.active,0);
});

test('Lacrima can choose to draw exactly two cards only with three eligible water elements',()=>{
 for(const [count,accept] of [[2,false],[3,false],[3,true]]){
  const s=field(),x=add(s,0,'battle',LACRIMA);
  add(s,0,'battle',IZAQ);
  if(count===3)add(s,0,'battle',WATER);
  else add(s,0,'battle',WATER,{faceDown:true});
  attack(s,x.uid);
  if(count===3)pick(s,accept?true:null);
  else assert.equal(s.decision?.type,'block');
  assert.equal(s.players[0].hand.length,accept?2:0);
 }
});

test('Bauwauja may mill four as a seed and becomes a blocker and triple breaker at four dark elements',()=>{
 for(const accept of [false,true]){
  const s=field(),enemy=add(s,1,'battle',DARK);
  cast(s,BAU);pick(s,accept?true:null);
  const x=s.players[0].battle[0];
  assert.equal(s.players[0].grave.length,accept?4:0);
  assert.equal(e.isCreature(s,x),false);
  assert.equal(e.effectiveCard(x,s).power,0);
  for(let n=0;n<3;n++)add(s,0,'battle',DARK);
  assert.equal(e.isCreature(s,x),true);
  assert.equal(e.effectiveCard(x,s).blocker,true);
  assert.equal(e.effectiveCard(x,s).breaker,3);
  x.entered=-1;x.summonedTurn=-1;
  attack(s,x.uid);pick(s,enemy.uid);drain(s);
  assert.ok(has(s,1,'grave',enemy));
  assert.equal(s.players[1].shields.length,2);
 }
});

test('Bauwauja stays through own-turn non-destruction in both forms but permits destruction',()=>{
 const BOUNCE='dm24ex4-065',DESTROY='dmr22-037';
 for(const count of [0,3]){
  const s=field(),x=add(s,0,'battle',BAU);
  for(let n=0;n<count;n++)add(s,0,'battle',DARK);
  castFace(s,BOUNCE,1);pick(s,x.uid);drain(s);
  assert.ok(has(s,0,'battle',x));
  end(s);drain(s);
  s.phase='main';
  cast(s,DESTROY);pick(s,x.uid);
  assert.ok(has(s,0,'grave',x));

  const otherTurn=field(1),y=add(otherTurn,0,'battle',BAU);
  for(let n=0;n<count;n++)add(otherTurn,0,'battle',DARK);
  castFace(otherTurn,BOUNCE,1);pick(otherTurn,y.uid);drain(otherTurn);
  assert.ok(has(otherTurn,0,'hand',y));
 }
});
