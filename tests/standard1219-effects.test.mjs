import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DRIVER='dm22rp1-025',PROMO='promoy21-041',FROG='dm23rp3-034',ECK='dm23rp3-027';
const GREEN='dm01-108',LIGHT='dm01-075',DARK='dm01-090',FIRE='dm01-097';
const JASHIN='dm22sd1-001',SEED='dmrp22-049',TRIGGER_CREATURE='dm04-042';
const field=(active=0)=>{
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(GREEN));
 return s;
};
const add=(s,p,id,zone='battle',props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
const play=(s,id,face=0)=>{
 const x=add(s,s.active,id,'hand');
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
};
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>s.decision?.type==='effect'?
 act(s,'effect',a=>a.targets?.some(t=>t.uid===value)):
 act(s,'extended',a=>values(s)[a.choice]===value);
const end=s=>{s.phase='attack';act(s,'endTurn');if(s.phase==='charge')act(s,'skipCharge');};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const chooseDraw=(s,n)=>{
 assert.equal(s.decision.task.op,'g34_Draw');
 assert.deepEqual(values(s),[0,1]);
 pick(s,n);
};
const mega=(s,uid,origin)=>{
 assert.equal(s.decision.task.op,'g21Mega');
 assert.equal(s.decision.task.uid,uid);
 assert.equal(s.decision.task.origin,origin);
};

test('three distinct official card names and the Driver promo resolve to the original IDs',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const manifest=read('support-phase-1219.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[DRIVER,FROG,ECK]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[[PROMO,DRIVER]]);
 assert.deepEqual(catalogue.resolveRows([{id:PROMO,count:2}]),[{id:DRIVER,count:2}]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,card=e.card(id),[front,back]=row.faces;
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1219}),row.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.equal(catalogue.get(id).supported,true);
  assert.deepEqual([card.cost,card.race,card.civilizations,card.power,card.manaValue,card.limit],
   [front.cost,front.race,front.civilizations,Number(front.powerText),1,manifest.regulationVerification.limits[row.id]]);
  if(back){
   const f=e.playFaces(card)[1];
   assert.deepEqual([f.name,f.cost,f.race,f.civilizations],[back.name,back.cost,back.race,back.civilizations]);
   assert.equal(card.megaLastBurst,true);
  }
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
 }
});

test('Driver counts only the first creature and the first other Tamaseed independently, even if the draw is declined',()=>{
 const s=field();
 play(s,DRIVER);
 assert.equal(s.decision,null);
 const top=s.players[0].deck[0];
 play(s,LIGHT);chooseDraw(s,0);
 play(s,DARK);
 assert.equal(s.decision,null);
 play(s,SEED);chooseDraw(s,1);
 assert.ok(has(s,0,'hand',top));
 play(s,SEED);
 assert.equal(s.decision,null);
});

test('a later Driver does not recapture earlier entries, and two Drivers individually exclude themselves',()=>{
 const s=field();
 play(s,SEED);
 play(s,LIGHT);
 play(s,DRIVER);
 play(s,DARK);
 play(s,SEED);
 assert.equal(s.decision,null);

 const other=field();
 const first=play(other,DRIVER),second=play(other,DRIVER);
 assert.equal(other.decision.task.uid,first.uid);
 chooseDraw(other,1);
 play(other,SEED);
 assert.equal(other.decision,null);
 end(other);end(other);
 play(other,SEED);
 assert.equal(other.decision.type,'effectOrder');
 act(other,'orderEffect');
 const one=other.decision.task.uid;
 chooseDraw(other,1);
 assert.deepEqual(new Set([one,other.decision.task.uid]),new Set([first.uid,second.uid]));
 chooseDraw(other,1);
});

test('a dual-type entrant triggers both Driver abilities only if already a creature as it enters',()=>{
 for(const isCreature of [false,true]){
  let s=field();
  play(s,DRIVER);
  if(isCreature)for(let i=0;i<3;i++)add(s,0,DARK);
  s=JSON.parse(JSON.stringify(s));
  const before=s.players[0].deck.length,entrant=play(s,JASHIN);
  assert.equal(e.isCreature(s,entrant),isCreature);
  if(isCreature){
   assert.ok(['effectOrder','entryOrder'].includes(s.decision.type));
   const kind=s.decision.type==='entryOrder'?'orderEntry':'orderEffect';
   act(s,kind);
  }
  chooseDraw(s,1);
  if(isCreature)chooseDraw(s,1);
  assert.equal(s.players[0].deck.length,before-1-Number(isCreature));
 }
});

test('Driver sees the first friendly Tamaseed and creature on the opponent turn, even after a previous turn draw',()=>{
 const s=field();
 play(s,DRIVER);
 play(s,LIGHT);chooseDraw(s,1);
 end(s);
 play(s,DARK);
 assert.equal(s.decision,null);
 const before=s.players[0].hand.length;
 give(s,0,'shields',[SEED,TRIGGER_CREATURE]);
 for(const id of [SEED,TRIGGER_CREATURE]){
  const attacker=add(s,1,FIRE);
  attack(s,attacker.uid);act(s,'noBlock');
  if(s.decision?.type==='shieldGuard')act(s,'finishShieldGuards');
  act(s,'useTrigger',a=>a.cardId===id);
  assert.equal(s.decision.task.source,DRIVER);
  chooseDraw(s,1);
 }
 assert.equal(s.players[0].enteredThisTurn,1);
 assert.equal(s.players[0].hand.length,before+2);
});

test('Frog can block and Mega Last Burst casts from hand, mana or grave but never from a shield',()=>{
 const block=field(1),small=add(block,1,'dm01-083'),blocker=add(block,0,FROG);
 attack(block,small.uid);
 act(block,'block',a=>a.uid===blocker.uid);
 drain(block);
 assert.ok(blocker.tapped&&has(block,0,'battle',blocker)&&has(block,1,'grave',small));

 for(const [origin,removal] of [['hand','dm01-086'],['mana','dmc27-055'],['grave','dm01-027'],['shields','dm22rp1-030']]){
  let s=field(1);
  const frog=add(s,0,FROG);
  const discard=add(s,1,GREEN,'hand');
  play(s,removal);pick(s,frog.uid);
  assert.ok(has(s,0,origin,frog));
  if(origin==='shields'){assert.equal(s.decision,null);continue;}
  mega(s,frog.uid,origin);
  s=JSON.parse(JSON.stringify(s));
  pick(s,true);
  assert.equal(s.decision.task.op,'g34_BlindDiscard773');
  pick(s,0);
  assert.ok(has(s,0,'grave',frog)&&has(s,1,'grave',discard));
 }
});

test('Mekayose gives the caster only opaque positions and discards the chosen card, including when paid from hand',()=>{
 for(const position of [0,1]){
  const s=field();
  give(s,1,'hand',[FIRE,DARK]);
  const other=s.players[1].hand.slice();
  play(s,FROG,1);
  assert.equal(s.decision.player,0);
  assert.deepEqual(values(s),[0,1]);
  assert.ok(s.decision.choices.every(c=>!c.cardId&&/^裏向きの手札 /.test(c.label)));
  assert.deepEqual(e.observation(s,0).players[1].hand,[{hidden:true},{hidden:true}]);
  pick(s,position);
  assert.ok(has(s,1,'grave',other[position])&&has(s,1,'hand',other[1-position]));
 }
});

test('Warning Shot locks only the selected creature at its next start, and draws even with no target',()=>{
 for(const targeted of [true,false]){
  const s=field(),target=targeted?add(s,1,FIRE,'battle',{tapped:true}):null;
  const another=targeted?add(s,1,DARK):null;
  const top=s.players[0].deck[0];
  play(s,ECK,1);
  if(target){
   assert.deepEqual(new Set(values(s)),new Set([target.uid,another.uid]));
   pick(s,target.uid);
   assert.ok(target.tapped&&e.skipsStartUntap(s,target)&&!another.tapped);
   end(s);
   assert.ok(target.tapped&&!e.skipsStartUntap(s,target));
   end(s);end(s);
   assert.equal(target.tapped,false);
  }
  assert.ok(has(s,0,'hand',top));
 }
});

test('Eckhart can decline the free spell or keep its lock across the caster start on the opponent turn',()=>{
 for(const cast of [false,true]){
  const s=field(1),eck=add(s,0,ECK),target=add(s,1,DARK);
  const top=s.players[0].deck[0];
  play(s,'dm01-027');pick(s,eck.uid);
  mega(s,eck.uid,'grave');
  pick(s,cast?true:null);
  if(cast){
   pick(s,target.uid);
   assert.ok(target.tapped&&e.skipsStartUntap(s,target)&&has(s,0,'hand',top));
   end(s);
   assert.ok(e.skipsStartUntap(s,target));
   end(s);
   assert.ok(target.tapped&&!e.skipsStartUntap(s,target));
  }else assert.ok(has(s,0,'grave',eck)&&!target.tapped&&!has(s,0,'hand',top));
 }
});
