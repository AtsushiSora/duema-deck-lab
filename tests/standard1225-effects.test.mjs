import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ZEN='dm22rp1-3A',CHRISTO='dm22rp2-005',LIANG='dm22rp1-007';
const WATER='dm01-083',GREEN='dm01-108',DARK='dm01-090',FIRE='dm01-097',IZ='dm22rp1-035',BAU='dm22rp1-4A';
const FORCE='dm22rp1-6A',TIME='dmbd16-009',FRIZZ='dm22rp1-034',CHARGER='dm22ex1-030',HAND='dm01-027';
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
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v||s.decision.choices[a.choice].value?.uid===v);
const options=s=>s.decision?.choices?.map(({value})=>value?.uid??value)??[];
const finish=s=>{if(s.decision?.type==='block')act(s,'noBlock');drain(s);};
const end=s=>{s.phase='attack';act(s,'endTurn');};

test('nine official prints resolve to the three existing canonical IDs and preserve their images',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const m=read('support-phase-1225.json'),refs=read('image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ZEN,CHRISTO,LIANG]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dm22rp1-S3','dm22rp1-5B','dmart13-003','dm22rp2-9A','dm22rp2x-9A','dm22rp2x-005']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1225}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
 }
});

test('Drache may draw exactly three and discard exactly two while still a Tamaseed',()=>{
 for(const accept of [false,true]){
  const s=field();
  cast(s,ZEN);
  const x=s.players[0].battle[0];
  assert.equal(e.isCreature(s,x),false);
  pick(s,accept?true:null);drain(s);
  assert.equal(s.players[0].deck.length,accept?22:25);
  assert.equal(s.players[0].hand.length,accept?1:0);
  assert.equal(s.players[0].grave.length,accept?2:0);
  for(let i=0;i<3;i++)add(s,0,'battle',WATER);
  assert.equal(e.isCreature(s,x),true);
  assert.equal(e.effectiveCard(x,s).breaker,2);
  assert.equal(e.effectiveCard(x,s).blocker,true);
 }
});

test('Drache selects exactly one mode and can use a Tamaseed/creature from the grave for free',()=>{
 const s=field(),x=add(s,0,'battle',ZEN),seed=add(s,0,'grave',BAU),spell=add(s,0,'grave',FRIZZ);
 add(s,0,'grave',WATER);const high=add(s,0,'grave','dmrp22-024');
 for(let i=0;i<3;i++)add(s,0,'battle',WATER);
 attack(s,x.uid);assert.deepEqual(options(s),[0,1]);pick(s,0);
 assert.ok(e.card(high).cost>5);
 assert.deepEqual(options(s),[seed.uid]);pick(s,seed.uid);pick(s,null);finish(s);
 assert.ok(has(s,0,'battle',seed));assert.ok(has(s,0,'grave',spell));
 assert.equal(s.players[0].mana.some(y=>y.tapped),false);
});

test('Drache recasts only an eligible spell and Charger has priority over the bottom replacement',()=>{
 for(const charger of [false,true]){
  const s=field(),x=add(s,0,'battle',ZEN),spell=add(s,0,'grave',charger?CHARGER:FRIZZ);
  add(s,0,'grave',IZ);add(s,0,'grave',HAND);
  for(let i=0;i<3;i++)add(s,0,'battle',WATER);
  attack(s,x.uid);pick(s,1);assert.deepEqual(options(s),[spell.uid]);pick(s,spell.uid);finish(s);
  if(charger)assert.ok(has(s,0,'mana',spell));
  else assert.equal(s.players[0].deck.at(-1).uid,spell.uid);
  assert.equal(s.players[0].mana.some(y=>y.tapped),false);
 }
});

test('Christo draws before choosing a deploy, then requires an eligible unit to attack and destroys it afterwards',()=>{
 const s=field(),x=add(s,0,'battle',CHRISTO);
 const entrant=inst(FIRE);s.players[0].deck.unshift(entrant);
 const high=add(s,0,'hand',CHRISTO);
 assert.equal(e.effectiveCard(x,s).speedAttacker,true);
 attack(s,x.uid);assert.deepEqual(options(s),[entrant.uid,null]);
 pick(s,entrant.uid);finish(s);
 assert.ok(has(s,0,'battle',entrant));assert.ok(has(s,0,'hand',high));
 assert.equal(e.effectiveCard(entrant,s).speedAttacker,true);
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='endTurn'),false);
 attack(s,entrant.uid);finish(s);
 assert.ok(has(s,0,'grave',entrant));
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='endTurn'),true);
});

test('Christo does not destroy the deployed unit if it never attacks',()=>{
 const s=field(),x=add(s,0,'battle',CHRISTO),body=add(s,0,'hand',FIRE);
 attack(s,x.uid);pick(s,body.uid);finish(s);
 body.tapped=true;
 end(s);drain(s);
 assert.ok(has(s,0,'battle',body));
 assert.equal(e.effectiveCard(body,s).speedAttacker,undefined);
});

test('Christo can recover Force Dragon destroyed as a Tamaseed on the opponent turn (QA42502)',()=>{
 const s=field(1),x=add(s,0,'battle',FORCE);
 add(s,0,'battle',CHRISTO);
 const ancient=add(s,0,'grave',FORCE),spell=add(s,1,'hand',TIME);
 assert.equal(e.isCreature(s,x),false);
 act(s,'play',a=>a.uid===spell.uid&&a.face===1);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
 assert.ok(has(s,0,'grave',x));
 end(s);assert.equal(s.decision?.player,0);
 assert.deepEqual(options(s),[x.uid,null]);pick(s,x.uid);drain(s);
 assert.ok(has(s,0,'hand',x));assert.ok(has(s,0,'grave',ancient));
});

test('Liang sends selected opposing creatures of total cost at most five to their owners’ mana',()=>{
 const s=field(),one=add(s,1,'battle',FIRE,{cardOwner:0}),two=add(s,1,'battle',DARK);
 const three=add(s,1,'battle',GREEN),seed=add(s,1,'battle',IZ);
 cast(s,LIANG);
 assert.equal(options(s).includes(seed.uid),false);
 pick(s,one.uid);pick(s,two.uid);
 assert.ok(has(s,0,'mana',one));assert.ok(has(s,1,'mana',two));
 assert.ok(has(s,1,'battle',three));assert.ok(has(s,1,'battle',seed));
});

test('Liang needs three nature elements and exchanges exactly two mana for the top two',()=>{
 for(const [count,accept] of [[2,false],[3,false],[3,true]]){
  const s=field(),x=add(s,0,'battle',LIANG);
  add(s,0,'battle',GREEN);
  if(count===3)add(s,0,'battle',GREEN);
  const first=s.players[0].mana[0],second=s.players[0].mana[1];
  const top=s.players[0].deck.slice(0,2);
  attack(s,x.uid);
  if(count===3){pick(s,first.uid);pick(s,accept?second.uid:null);}
  finish(s);
  assert.equal(has(s,0,'hand',first),accept);assert.equal(has(s,0,'hand',second),accept);
  assert.equal(top.every(y=>has(s,0,'mana',y)),accept);
  assert.equal(s.players[0].mana.length,50);
 }
});
