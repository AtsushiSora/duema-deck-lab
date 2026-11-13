import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DVO='dm26rp1-036',AWA='dm26rp2-044',SKILL='dm26rp2-016';
const N='dm01-108',FIRE='dm01-097',BIG='dm01-001',HAND='dm01-027',WATER='dm01-083';
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

test('three canonical definitions preserve official text, stats, images and copy limits',()=>{
 const m=read('tools/support-phase-1145.json'),r=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[DVO,AWA,SKILL]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1145}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(r.get(row.id).id,row.id);
  assert.equal(r.byName.get(nameKey(row.name)).id,row.id);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
});

test('Neo Dvorzak may deploy each copy already in the grave when a qualifying allied creature dies',()=>{
 const s=field(),first=add(s,0,'grave',DVO),second=add(s,0,'grave',DVO),victim=add(s,0,'battle','dm01-036');
 s.active=1;
 play(s,add(s,1,'hand',HAND));
 act(s,'effect',a=>a.targets[0].uid===victim.uid);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.uid===first.uid);
 pick(s,true);pick(s,null);
 assert.ok(s.players[0].battle.includes(first)&&s.players[0].grave.includes(second));
 assert.ok(e.effectiveCard(first,s).blocker&&!first.tapped);
});

test('Neo Dvorzak does not trigger for a cheap or opposing casualty, or its simultaneous destruction (QA 34315)',()=>{
 for(const [id,owner] of [[N,0],[BIG,1]]){
  const s=field(),source=add(s,0,'grave',DVO),victim=add(s,owner,'battle',id);
  s.active=1-owner;
  play(s,add(s,s.active,'hand',HAND));
  act(s,'effect',a=>a.targets[0].uid===victim.uid);
  assert.equal(s.decision,null);
  assert.ok(s.players[0].grave.includes(source));
 }
 const s=field(),source=add(s,0,'battle',DVO),victim=add(s,0,'battle',BIG);
 s.active=1;
 play(s,add(s,1,'hand','dm26ex1-N011'));
 assert.equal(s.decision,null);
 assert.ok(s.players[0].grave.includes(source)&&s.players[0].grave.includes(victim));
});

test('Neo Dvorzak can summon from an actual broken shield via S Trigger',()=>{
 const s=field();
 give(s,0,'shields',[DVO]);
 const [source]=s.players[0].shields;
 const attacker=add(s,1,'battle',N);
 s.active=1;
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.uid===source.uid);
 assert.ok(s.players[0].battle.includes(source));
 assert.equal(e.effectiveCard(source,s).blocker,true);
});

test('Neo Dvorzak only watches actual destruction, including a Psychic returning to the extra zone',()=>{
 for(const [id,replaced] of [['dm26rp2-023',true],['dm36-047',false]]){
  const s=field(),own=s.players[0],source=add(s,0,'grave',DVO),victim=add(s,0,'battle',id);
  s.format='advance';
  s.active=1;
  play(s,add(s,1,'hand',HAND));
  act(s,'effect',a=>a.targets[0].uid===victim.uid);
  if(replaced){
   act(s,'replaceEscape');
   assert.equal(s.decision,null);
   assert.ok(own.grave.includes(source)&&own.battle.includes(victim));
  }else{
   assert.ok(own.extra.includes(victim));
   pick(s,true);
   assert.ok(own.battle.includes(source));
  }
 }
});

test('Awaza Khan can enter tapped or untapped, and applies Mana Armament only at three nature cards',()=>{
 for(const tapped of [true,false]){
  const s=field(),source=add(s,0,'hand',AWA);
  give(s,0,'mana',[N,N,N,FIRE,FIRE,FIRE]);
  play(s,source);
  assert.equal(s.decision.task.op,'g34_EntryTap432');
  pick(s,tapped);
  assert.equal(source.tapped,tapped);
  assert.equal(e.power(source,false,s),9000);
  assert.equal(e.effectiveCard(source,s).breaker,2);
  s.players[0].mana[0].faceDown=true;
  assert.equal(e.power(source,false,s),5000);
  assert.equal(e.effectiveCard(source,s).breaker??1,1);
 }
});

test('Awaza Khan uses the optional tap on S Trigger and constrains the target of a legal attack (QA 40270)',()=>{
 const s=field();
 give(s,0,'shields',[AWA,N]);
 const [source]=s.players[0].shields;
 const attacker=add(s,1,'battle',N),second=add(s,1,'battle',N);
 s.active=1;attack(s,attacker.uid);act(s,'noBlock');
 if(legal(s,'breakShields').length)act(s,'breakShields',a=>a.shields.includes(source.uid));
 act(s,'useTrigger',a=>a.uid===source.uid);
 assert.equal(s.decision.task.op,'g34_EntryTap432');
 pick(s,true);
 assert.ok(s.players[0].battle.includes(source)&&source.tapped);
 assert.deepEqual(legal(s,'attack').filter(a=>a.uid===second.uid).map(a=>a.target),[source.uid]);
 assert.ok(legal(s,'endTurn').length);
 source.tapped=false;
 assert.ok(legal(s,'attack').some(a=>a.uid===second.uid&&a.target==='player'));
});

test('Kachisugiru Skill makes the opponent choose three cards before discarding any',()=>{
 const s=field(),source=add(s,0,'hand',SKILL);
 give(s,1,'hand',[FIRE,BIG,N,WATER]);
 const [a,b,c,keep]=s.players[1].hand;
 play(s,source);
 assert.equal(e.effectiveCard(source,s).breaker,2);
 assert.ok(e.effectiveCard(source,s).blocker);
 assert.equal(s.decision.player,1);
 pick(s,a.uid);pick(s,b.uid);
 assert.equal(s.players[1].grave.length,0);
 pick(s,c.uid);
 assert.deepEqual(s.players[1].grave,[a,b,c]);
 assert.deepEqual(s.players[1].hand,[keep]);
});

test('Kachisugiru Skill may decline the judge, loses normally, and wins ties to return tapped',()=>{
 for(const mode of ['decline','loss','tie']){
  const s=field(),own=s.players[0],source=add(s,0,'battle',SKILL);
  give(s,0,'deck',[mode==='tie'?HAND:N,N,N]);give(s,1,'deck',[mode==='tie'?HAND:BIG,N,N]);
  const [ownTop]=own.deck,[theirTop]=s.players[1].deck;
  s.active=1;
  play(s,add(s,1,'hand',HAND));
  act(s,'effect',a=>a.targets[0].uid===source.uid);
  assert.equal(s.decision.task.name,'startPowerJudge');
  pick(s,mode==='decline'?null:true);
  if(mode!=='decline'){
   assert.equal(own.deck.at(-1),ownTop);
   assert.equal(s.players[1].deck.at(-1),theirTop);
  }
  assert.equal(own.battle.includes(source),mode==='tie');
  assert.equal(own.grave.includes(source),mode!=='tie');
  if(mode==='tie')assert.ok(source.tapped);
 }
});
