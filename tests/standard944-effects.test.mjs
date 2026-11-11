import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LA='dm20-039',REN='dm22-047',CRAWLER='dm29-040',CURSE='dm36-027';
const PLAIN='dm01-108',TYLER='dm01-098',OTHER_BLOCKER='dm22-038',GEAR='dm14-110';
const DRAGON='dm36-087',TWIN_DRAGON='dm22ex1-030',SPELL='dm01-027',EX='dmsd18-008';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const ids=rows=>rows.map(x=>x.uid);
const has=(s,p,z,x)=>ids(s.players[p][z]).includes(x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,x)=>act(s,'extended',a=>values(s)[a.choice]===(x?.uid??x));
const legal=(s,k,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===k&&pred(a));
const restore=s=>JSON.parse(JSON.stringify(s));

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(18).fill(PLAIN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 944 enables four verified printings at their existing IDs',()=>{
 const m=read('tools/support-phase-944.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[LA,REN,CRAWLER,CURSE]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id}=row,d=details.cards.find(x=>x.id===id),f=row.faces[0],c=e.card(id);
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:944}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:944}));
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [id===REN?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-944');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const cards=[LA,REN,CRAWLER,CURSE,PLAIN,TYLER,OTHER_BLOCKER,DRAGON,TWIN_DRAGON,SPELL].map(id=>({id,count:4}));
 const resolved=cat.resolveRows(cards);
 assert.deepEqual(resolved.map(x=>x.id),cards.map(x=>x.id));
 assert.deepEqual(e.validateDeck({name:'攻撃宣言と墓地回収',cards:resolved}),[]);
 assert.equal(cat.coverage({cards}).unsupported,0);
});

for(const [id,buff,power,mayBlock] of [[PLAIN,0,2000,false],[PLAIN,1000,3000,true],[TYLER,0,3000,true],[TYLER,-1000,2000,false]])
 test('La Boul checks current attacking power '+id+' '+buff,()=>{
  const s=field(),a=put(s,0,'battle',id,{buff}),la=put(s,1,'battle',LA),other=put(s,1,'battle',OTHER_BLOCKER);
  la.g34Grants=[{turn:s.turn,blocker:true}];
  attack(s,a.uid);
  assert.equal(e.power(a,true,s),power);
  assert.equal(legal(s,'block',x=>x.uid===la.uid),mayBlock);
  assert.ok(legal(s,'block',x=>x.uid===other.uid));
  if(mayBlock){act(s,'block',x=>x.uid===la.uid);drain(s);assert.ok(has(s,0,'grave',a));}
 });

test('La Boul can attack a tapped creature but cannot attack the opponent',()=>{
 const s=field(),la=put(s,0,'battle',LA),target=put(s,1,'battle',PLAIN,{tapped:true});
 put(s,1,'battle',PLAIN);
 s.phase='attack';
 assert.deepEqual(e.getLegalActions(s).filter(x=>x.kind==='attack'&&x.uid===la.uid).map(x=>x.target),[target.uid]);
 attack(s,la.uid,target.uid);
 drain(s);
 assert.ok(has(s,1,'grave',target));
});

test('Renryujin requires the first creature, never recovers from the other graveyard, and stops for a non-Dragon',()=>{
 const s=field(),plain=put(s,0,'grave',PLAIN),dragon=put(s,0,'grave',DRAGON);
 const spell=put(s,0,'grave',SPELL),gear=put(s,0,'grave',GEAR),enemy=put(s,1,'grave',DRAGON);
 play(s,REN);
 assert.deepEqual(values(s),[plain.uid,dragon.uid]);
 pick(s,plain);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'hand',plain));
 assert.ok([dragon,spell,gear].every(x=>has(s,0,'grave',x)));
 assert.ok(has(s,1,'grave',enemy));
});

for(const take of [true,false])test('Renryujin recognizes the Dragon creature face; the second recovery is optional and final '+take,()=>{
 let s=field();
 const twin=put(s,0,'grave',TWIN_DRAGON),dragon=put(s,0,'grave',DRAGON),plain=put(s,0,'grave',PLAIN);
 play(s,REN);pick(s,twin);
 assert.ok(has(s,0,'hand',twin));
 assert.deepEqual(values(s),[dragon.uid,plain.uid,null]);
 s=restore(s);
 pick(s,take?dragon:null);
 assert.equal(s.decision,null);
 assert.equal(has(s,0,'hand',dragon),take);
 assert.ok(has(s,0,'grave',plain));
});

test('Renryujin works as a shield trigger without mana and resolves with no eligible creature',()=>{
 const s=field(1),a=put(s,1,'battle',PLAIN),spell=put(s,0,'grave',SPELL);
 give(s,0,'mana',[]);give(s,0,'shields',[REN,PLAIN]);
 const trigger=s.players[0].shields[0];
 attack(s,a.uid);act(s,'noBlock');
 if(legal(s,'breakShields'))act(s,'breakShields',x=>x.shields.includes(trigger.uid));
 act(s,'useTrigger',x=>x.cardId===REN);
 assert.ok(has(s,0,'grave',trigger)&&has(s,0,'grave',spell));
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.decision,null);
});

test('Crawler ignores its own entry and gear; an allied creature grants Blocker until that turn ends',()=>{
 const s=field(),x=play(s,CRAWLER);
 assert.ok(!e.effectiveCard(x,s).blocker);
 play(s,GEAR);
 assert.ok(!e.effectiveCard(x,s).blocker);
 play(s,PLAIN);
 assert.equal(e.effectiveCard(x,s).blocker,true);
 s.phase='attack';act(s,'endTurn');
 assert.equal(s.active,1);
 assert.ok(!e.effectiveCard(x,s).blocker);
});

test('Crawler gains Blocker when an opposing creature enters and can defend that turn',()=>{
 const s=field(1),x=put(s,0,'battle',CRAWLER),a=put(s,1,'battle',PLAIN);
 assert.ok(!e.effectiveCard(x,s).blocker);
 play(s,PLAIN);
 attack(s,a.uid);
 act(s,'block',y=>y.uid===x.uid);drain(s);
 assert.ok(has(s,1,'grave',a));
 assert.ok(has(s,0,'battle',x)&&x.tapped);
});

for(const crawlerFirst of [true,false])test('Crawler sees only creatures that enter after it during a multi-creature effect '+crawlerFirst,()=>{
 const s=field(),x=put(s,1,'hand',CRAWLER),other=put(s,1,'hand',PLAIN);
 play(s,'dm09-s05');
 for(const unit of crawlerFirst?[x,other]:[other,x])pick(s,unit);
 drain(s);
 assert.ok(has(s,1,'battle',x)&&has(s,1,'battle',other));
 assert.equal(!!e.effectiveCard(x,s).blocker,crawlerFirst);
});

for(const creatureTarget of [false,true])test('Curse Guy destroys itself first and ends the attack before the block step '+creatureTarget,()=>{
 const s=field(1),a=put(s,1,'battle',PLAIN,{justDiverActive:true}),x=put(s,0,'battle',CURSE,{tapped:creatureTarget});
 const blocker=put(s,0,'battle',OTHER_BLOCKER);
 attack(s,a.uid,creatureTarget?x.uid:'player');
 drain(s);
 assert.ok(has(s,0,'grave',x)&&has(s,1,'grave',a));
 assert.equal(s.attack,null);
 assert.equal(blocker.tapped,false);
 assert.equal(s.players[0].shields.length,5);
 assert.equal(s.log.some(x=>['block','battle','break'].includes(x.type)),false);
});

test('Every Curse Guy still destroys itself when one has already destroyed the attacker',()=>{
 let s=field(1);
 const a=put(s,1,'battle',PLAIN),x=put(s,0,'battle',CURSE),y=put(s,0,'battle',CURSE);
 attack(s,a.uid);
 assert.equal(s.decision.type,'effectOrder');
 s=restore(s);
 drain(s);
 assert.deepEqual(new Set(ids(s.players[0].grave)),new Set([x.uid,y.uid]));
 assert.ok(has(s,1,'grave',a));
 assert.equal(s.attack,null);
});

test('Curse Guy destroys the attacker even when its own destruction is replaced',()=>{
 const s=field(1),a=put(s,1,'battle',PLAIN),shield=s.players[0].shields[0];
 const x=put(s,0,'battle',CURSE,{g34Grants:[{turn:s.turn,exLife:true}],exLifeShieldUid:shield.uid,exLifeShieldUids:[shield.uid]});
 attack(s,a.uid);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'grave',shield)&&has(s,1,'grave',a));
 assert.equal(s.attack,null);
});

test('Curse Guy does not trigger for allied attacks',()=>{
 const s=field(),x=put(s,0,'battle',CURSE),ally=put(s,0,'battle',PLAIN);
 attack(s,ally.uid);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'battle',ally));
 assert.equal(s.players[1].shields.length,4);
});

test('An opposing destruction replacement can preserve the attack after Curse Guy destroys itself',()=>{
 const s=field(1),x=put(s,0,'battle',CURSE),a=put(s,1,'battle',EX),shield=s.players[1].shields[0];
 a.exLifeShieldUid=shield.uid;a.exLifeShieldUids=[shield.uid];
 attack(s,a.uid);drain(s);
 assert.ok(has(s,0,'grave',x)&&has(s,1,'battle',a)&&has(s,1,'grave',shield));
 assert.equal(s.players[0].shields.length,3);
});

test('Curse Guy follows the original attacker through invasion evolution',()=>{
 let s=field(),a=put(s,0,'battle','dmr18-022'),x=put(s,1,'battle',CURSE),invader=put(s,0,'hand','dmr17-l02');
 attack(s,a.uid);
 assert.equal(s.decision.task.op,'g23_Declare');
 pick(s,true);
 assert.equal(s.decision.task.op,'g23_Invade');
 s=restore(s);
 pick(s,true);drain(s);
 assert.ok(has(s,0,'grave',a)&&has(s,0,'grave',invader)&&has(s,1,'grave',x));
});

test('Curse Guy does not destroy the new attacker after revolution change',()=>{
 const s=field(),a=put(s,0,'battle','dmr23-072'),x=put(s,1,'battle',CURSE),replacement=put(s,0,'hand','dmr21-l02');
 attack(s,a.uid);
 assert.equal(s.decision.task.op,'revDeclare');
 pick(s,true);pick(s,a);
 assert.equal(s.decision.task.op,'g3_FinalSelect');
 pick(s,null);drain(s);
 assert.ok(has(s,1,'grave',x)&&has(s,0,'hand',a)&&has(s,0,'battle',replacement));
});
