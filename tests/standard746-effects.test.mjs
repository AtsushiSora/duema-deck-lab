import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-746.json',import.meta.url)));

test('Phase 746 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:746}));
  assert.throws(()=>standardCardSpec(detail,{phase:745}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:746}));
 }
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of printAliases){
  const original=cards.find(c=>c.id===row.canonicalId);
  const stats=faces=>faces.map(({abilityText,...face})=>face);
  assert.deepEqual(stats(row.faces),stats(original.faces));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:746}),original.spec);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
 }
});

const BAD='dm22ex1-031',MU='dmrp08-001',RYU='dmbd09-004';
const HEAVY='dmrp03-s07',NEZ='dmsp01-005',MED='dm01-108',LOW='dm01-083';
const JOKER6='dmrp07-079',JOKER7='dmrp07-001',JOKER_SPELL='dmsd01-011',FIRE='dm01-097';
const SLAYER='dm01-088',MASTER='dmrp02-m02',NON_JOCKEY_BAD='dm26ex4-098';
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,predicate)=>act(s,'extended',a=>predicate(s.decision.choices[a.choice].value));
const select=(s,x)=>pick(s,v=>v?.uid===x.uid);
const skip=s=>pick(s,v=>v===null);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(MED));
 return s;
}
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function play(s,id,discounted=false){
 const x=inst(id);
 s.phase='main';
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&(discounted?a.alternative==='bad':!a.alternative));
 return x;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Badlammer wins its entry battle, draws first and deploys only a B・A・D Beat Jockey',()=>{
 let s=field(),enemy=put(s,1,MED);
 give(s,0,'deck',[HEAVY,MED,MED]);
 give(s,0,'hand',[MED,MASTER,NON_JOCKEY_BAD]);
 const drawn=s.players[0].deck[0];
 const bad=play(s,BAD,true);
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,6);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 select(s,enemy);
 assert.ok(inZone(s,1,'grave',enemy));
 assert.ok(inZone(s,0,'hand',drawn));
 assert.deepEqual(s.decision.choices.flatMap(o=>o.value?[o.value.uid]:[]),[drawn.uid]);
 s=restore(s);select(s,drawn);drain(s);
 assert.ok(inZone(s,0,'battle',drawn));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,6);
 assert.ok(e.getLegalActions({...s,phase:'attack'}).some(a=>a.kind==='attack'&&a.uid===drawn.uid));
 end(s);
 assert.ok(inZone(s,0,'grave',drawn));
 assert.ok(inZone(s,0,'grave',bad));
});

test('Badlammer can decline its entry fight, and a tied fight produces no victory reward',()=>{
 for(const decline of [true,false]){
  const s=field(),enemy=put(s,1,MED,{powerModifiers:[{amount:6000}]});
  const top=s.players[0].deck[0],bad=play(s,BAD);
  assert.equal(s.players[0].mana.filter(y=>y.tapped).length,8);
  if(decline)skip(s);
  else select(s,enemy);
  drain(s);
  assert.equal(s.players[0].deck[0].uid,top.uid);
  assert.equal(inZone(s,0,'battle',bad),decline);
  assert.equal(inZone(s,1,'battle',enemy),decline);
 }
});

test('Badlammer finishes its victory ability before the opposing Slayer and may decline deployment',()=>{
 const s=field(),slayer=put(s,1,SLAYER);
 give(s,0,'deck',[NEZ,MED,MED]);
 const drawn=s.players[0].deck[0],bad=play(s,BAD);
 select(s,slayer);
 assert.ok(inZone(s,0,'battle',bad));
 assert.ok(inZone(s,0,'hand',drawn));
 skip(s);drain(s);
 assert.ok(inZone(s,0,'grave',bad));
 assert.ok(inZone(s,0,'hand',drawn));
});

test('Mu counts mana cards, offers only eligible face-up Joker creatures and deploys without paying',()=>{
 let s=field(),mu=put(s,0,MU),enemy=put(s,1,MED,{tapped:true});
 give(s,0,'mana',[JOKER6,JOKER7,JOKER_SPELL,MED,JOKER6,FIRE]);
 const [eligible,tooBig,spell,,hidden]=s.players[0].mana;
 hidden.faceDown=true;
 const drawn=s.players[0].deck[0];
 attack(s,mu.uid,enemy.uid);act(s,'noBlock');
 assert.ok(inZone(s,0,'hand',drawn));
 assert.deepEqual(s.decision.choices.flatMap(o=>o.value?[o.value.uid]:[]),[eligible.uid]);
 s=restore(s);select(s,eligible);drain(s);
 assert.ok(inZone(s,0,'battle',eligible));
 for(const x of [tooBig,spell,hidden])assert.ok(inZone(s,0,'mana',x));
 assert.equal(s.players[0].mana.some(y=>y.tapped),false);
 end(s);
 assert.ok(inZone(s,0,'battle',eligible));
});

test('Mu can decline the mana deployment while keeping its victory draw',()=>{
 const s=field(1),mu=put(s,0,MU,{tapped:true});
 const enemy=put(s,1,MED);
 s.players[0].mana.push(inst(JOKER6));
 const drawn=s.players[0].deck[0];
 attack(s,enemy.uid,mu.uid);act(s,'noBlock');
 assert.equal(s.decision.player,0);
 skip(s);drain(s);
 assert.ok(inZone(s,0,'hand',drawn));
 assert.ok(s.players[0].mana.some(y=>y.cardId===JOKER6));
});

test('Ryusei immediately attacks an untapped creature and keeps protection through source departure and save',()=>{
 let s=field(),enemy=put(s,1,SLAYER),direct=put(s,1,MED);
 give(s,0,'shields',[]);
 const ryu=play(s,RYU);
 attack(s,ryu.uid,enemy.uid);drain(s);
 assert.ok(inZone(s,0,'grave',ryu));
 assert.ok(s.extLimits.some(x=>x.kind==='g34NoLose'&&x.player===0&&x.who===0));
 s=restore(s);end(s);
 attack(s,direct.uid);drain(s);
 assert.equal(s.winner,null);
 assert.ok(s.log.some(x=>x.type==='lossPrevented'&&x.player===0));
 end(s);
 assert.equal(s.active,0);
 assert.ok(!s.extLimits.some(x=>x.kind==='g34NoLose'));
});

test('Ryusei uses T-Breaker and does not grant protection on a nonbattle attack',()=>{
 const s=field(),ryu=play(s,RYU);
 attack(s,ryu.uid);drain(s);
 assert.equal(s.players[1].shields.length,2);
 assert.ok(!s.extLimits?.some(x=>x.kind==='g34NoLose'));
});

test('Ryusei stops a deck-out during protection and normal defeat resumes when it expires',()=>{
 const s=field(),ryu=put(s,0,RYU),enemy=put(s,1,LOW,{tapped:true});
 attack(s,ryu.uid,enemy.uid);drain(s);end(s);
 give(s,0,'deck',[LOW]);
 s.phase='main';
 s.extTasks=[{op:'g34_Mill',p:0,source:RYU,n:1}];
 act(s,'toAttack');drain(s);
 assert.equal(s.players[0].deck.length,0);
 assert.equal(s.winner,null);
 end(s);
 assert.equal(s.winner,1);
});
