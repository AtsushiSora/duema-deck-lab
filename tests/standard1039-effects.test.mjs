import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const TOBAR='dm23ex3-043',MILK='dm23ex3-015',HARA='dm23ex3-052',AKA='dm23ex3-035',AMDO='dm23ex3-074';
const N='dm01-108',W='dm01-083',D='dm01-090',F='dm01-097',STRONG='dm01-107',SEED='dmrp22-056';
const SPARK='dm01-015',RAMP='dm01-106',BIRD='dmex18-029',COLORLESS='dmrp07-001',COURTNEY='dm13-015';

function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const play=(s,x,face=0)=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&(a.face||0)===face);
const cast=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
const restore=s=>decodeBattleData(encodeBattleData(s));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function deploy(s,p,x){
 s.extTasks=[{op:'putCreature',p,source:TOBAR,uid:x.uid,origin:'hand'}];
 act(s,'toAttack');
}

test('five official definitions preserve each canonical ID, both face stats, art, and limits',()=>{
 const read=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url)));
 const m=read('tools/support-phase-1039.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[TOBAR,MILK,HARA,AKA,AMDO]);
 for(const row of m.cards){
  const c=e.card(row.id),front=row.faces[0];
  assert.equal(registry.get(row.id).supported,true);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [front.cost,Number(front.powerText),front.race,front.civilizations.filter(x=>x!=='無色'),1,m.regulationVerification.limits[row.id]]);
  if(row.faces.length===2){
   const back=row.faces[1];
   assert.deepEqual([c.spellFace.name,c.spellFace.cost,e.civilizations(c.spellFace),c.spellFace.race],
    [back.name,back.cost,back.civilizations,back.race]);
  }
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  assert.deepEqual(standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:1039}),row.spec);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
});

test('Tobar pays seven with three crystals and one Fire mana, and can decline its battle',()=>{
 const s=setup(),tobar=add(s,0,'hand',TOBAR);
 give(s,0,'mana',[W,N,N,N]);
 for(const x of s.players[0].mana.slice(1))x.faceDown=true;
 assert.equal(play(s,tobar),undefined);
 const fire=add(s,0,'mana',F);
 const [water,...crystals]=s.players[0].mana.slice(0,4);
 assert.deepEqual(e.paymentPool(s,0,[],e.card(TOBAR)).map(x=>x.paymentValue),[undefined,2,2,2,undefined]);
 assert.equal(play(s,tobar).cost,7);
 cast(s,tobar);
 assert.ok(fire.tapped&&crystals.every(x=>x.tapped)&&!water.tapped);
 assert.ok(crystals.every(x=>e.card(x).manaValue===1));
 assert.equal(s.decision,null);
 const next=setup();
 add(next,1,'battle',N);
 cast(next,add(next,0,'hand',TOBAR));
 assert.ok(values(next).includes(null));
 pick(next,null);
 assert.equal(next.decision,null);
});

test('Tobar can trigger from shield for free, then make two opposing creatures battle',()=>{
 let s=setup();
 give(s,0,'shields',[TOBAR,N]);
 const tobar=s.players[0].shields[0],attacker=add(s,1,'battle',N),smaller=add(s,1,'battle',W),all=physical(s);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===TOBAR);
 assert.ok(has(s,0,'battle',tobar));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 pick(s,smaller.uid);
 assert.ok(!values(s).includes(smaller.uid));
 s=restore(s);
 pick(s,attacker.uid);
 drain(s);
 assert.ok(has(s,1,'grave',smaller)&&has(s,1,'battle',attacker));
 assert.deepEqual(physical(s),all);
});

for(const mana of [1,2])test('Milk compares the opposing mana count after the entrant ramps '+mana,()=>{
 const s=setup(),milk=add(s,0,'hand',MILK),entrant=add(s,1,'hand',RAMP);
 cast(s,milk);
 s.active=1;
 give(s,1,'mana',Array(mana).fill(N));
 deploy(s,1,entrant);
 assert.equal(s.players[1].mana.length,mana+1);
 if(mana===1){
  assert.equal(s.decision.player,0);
  pick(s,true);
 }
 assert.equal(s.decision,null);
 assert.equal(has(s,1,'hand',entrant),mana===1);
});

test('Milk may return the tracked entrant even when it cannot be chosen, or decline',()=>{
 const s=setup(),milk=add(s,0,'hand',MILK),entrant=add(s,1,'hand','dmrp01-041');
 cast(s,milk);
 give(s,1,'mana',[W]);
 deploy(s,1,entrant);
 assert.match(s.decision.title,/手札に戻す/);
 const loaded=restore(s);
 pick(loaded,true);
 assert.ok(has(loaded,1,'hand',entrant));
 pick(s,null);
 assert.ok(has(s,1,'battle',entrant));
});

test('Relief Crystal Charger can return a cost-two noncreature and adds itself face-down to mana',()=>{
 let s=setup();
 const milk=add(s,0,'hand',MILK),seed=add(s,1,'battle',SEED),small=add(s,1,'battle',N),large=add(s,1,'battle',RAMP);
 cast(s,milk,1);
 assert.deepEqual(new Set(values(s)),new Set([seed.uid,small.uid]));
 s=restore(s);
 pick(s,seed.uid);
 assert.ok(has(s,1,'hand',seed)&&has(s,1,'battle',large));
 const placed=s.players[0].mana.find(x=>x.uid===milk.uid);
 assert.ok(placed.faceDown&&!placed.tapped);
 assert.equal(e.card(placed).manaValue,1);
 assert.ok(!has(s,0,'grave',milk));
});

test('Relief Crystal Charger moves to mana with no eligible opposing element',()=>{
 const s=setup(),milk=add(s,0,'hand',MILK);
 add(s,1,'battle',RAMP);
 cast(s,milk,1);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].mana.find(x=>x.uid===milk.uid).faceDown);
});

test('Hara and Mitta requires two colorless mana cards and excludes a Mana Bird from payment',()=>{
 let s=setup();
 give(s,0,'mana',[N,AMDO,COLORLESS]);
 const [nature,twin,zero]=s.players[0].mana,hara=add(s,0,'hand',HARA),bird=add(s,0,'battle',BIRD);
 assert.equal(play(s,hara),undefined);
 twin.faceDown=true;
 e.step(s,play(s,hara),{manualMana:true});
 assert.equal(s.decision.type,'manaPayment');
 assert.deepEqual(s.decision.pool.map(x=>x.uid),[twin.uid,zero.uid]);
 assert.equal(s.decision.pool.some(x=>x.uid===bird.uid||x.uid===nature.uid),false);
 s=restore(s);
 for(const x of [twin,zero])act(s,'selectMana',a=>a.uid===x.uid);
 act(s,'confirmMana');
 assert.ok(has(s,0,'battle',hara));
 assert.equal(e.effectiveCard(s.players[0].battle.find(x=>x.uid===hara.uid),s).breaker,2);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
});

test('Hara and Mitta does not use cards that currently have all civilizations',()=>{
 const s=setup(),hara=add(s,0,'hand',HARA),courtney=add(s,0,'battle',COURTNEY);
 give(s,0,'mana',[COLORLESS,COLORLESS]);
 assert.equal(play(s,hara),undefined);
 courtney.sealed=true;
 cast(s,hara);
 assert.ok(has(s,0,'battle',hara));
});

test('Akadashi can block but cannot attack a player or a tapped creature',()=>{
 const s=setup(),aka=add(s,0,'hand',AKA),enemy=add(s,1,'battle',W,{tapped:true});
 cast(s,aka);
 assert.equal(e.effectiveCard(aka,s).blocker,true);
 act(s,'toAttack');
 s.turn++;
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===aka.uid));
 s.active=1;
 enemy.tapped=false;
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===aka.uid);
 drain(s);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'battle',aka));
});

test('Good Stock draws two, discards one chosen card, then offers a mana flip',()=>{
 let s=setup();
 give(s,0,'deck',[N,W,N,N,N]);
 const [keep,discard]=s.players[0].deck,spell=add(s,0,'hand',AKA),mana=s.players[0].mana.at(-1),all=physical(s);
 cast(s,spell,1);
 assert.ok(has(s,0,'hand',keep)&&has(s,0,'hand',discard));
 assert.ok(values(s).includes(discard.uid));
 s=restore(s);
 pick(s,discard.uid);
 assert.equal(s.decision.task.op,'g34_ManaDown426');
 pick(s,mana.uid);
 assert.ok(s.players[0].mana.find(x=>x.uid===mana.uid).faceDown);
 assert.ok(has(s,0,'grave',discard)&&has(s,0,'grave',spell)&&has(s,0,'hand',keep));
 assert.deepEqual(physical(s),all);
});

test('De-Amdo can attack an untapped creature on the turn it enters and has W Breaker',()=>{
 const s=setup(),amdo=add(s,0,'hand',AMDO),enemy=add(s,1,'battle',STRONG);
 cast(s,amdo);
 assert.equal(e.effectiveCard(amdo,s).breaker,2);
 act(s,'toAttack');
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===amdo.uid&&a.target==='player'));
 attack(s,amdo.uid,enemy.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'battle',amdo));
});

test('Become My Strength mills exactly three, then can return a newly milled creature',()=>{
 const s=setup();
 give(s,0,'deck',[SPARK,W,N,N,N]);
 const [spellCard,target,other,next]=s.players[0].deck,spell=add(s,0,'hand',AMDO),all=physical(s);
 cast(s,spell,1);
 assert.deepEqual(new Set(values(s)),new Set([target.uid,other.uid]));
 pick(s,target.uid);
 assert.equal(s.players[0].deck[0].uid,next.uid);
 assert.ok(has(s,0,'grave',spellCard)&&has(s,0,'grave',other)&&has(s,0,'grave',spell));
 assert.ok(has(s,0,'hand',target));
 assert.deepEqual(physical(s),all);
});
