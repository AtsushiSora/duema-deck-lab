import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const GOL='dm23rp1-009',ICE='dm23rp1-023',TEN='dm23rp1-047',STELLA='dm23rp2-012';
const F='dm01-097',N='dm01-108',W='dm01-083',KILL='dm01-027',BIG='dm01-s09';
const BOUNCE='dm23rp1-056',RAMP='dm06-110',DEPLOY='dm25rp3-057',TRIG_DEPLOY='dm22rp1-055',DRAGON='dm22rp2-OR1';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const manifest=read('tools/support-phase-1288.json');
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(N));
 return s;
}
function add(s,p,zone,id,extra={}){
 const x=Object.assign(inst(id),extra);s.players[p][zone].push(x);return x;
}
function play(s,id,face=0){
 const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);return x;
}
const picks=s=>s.decision.choices.map(({value})=>value?.uid??value);
const pick=(s,value)=>act(s,'extended',a=>Object.is(picks(s)[a.choice],value));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function passBlock(s){if(s.decision?.type==='block')act(s,'noBlock');}

test('seven official prints share three canonical definitions and exact printed faces',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[GOL,ICE,TEN]);
 assert.equal(manifest.printAliases.length,4);
 for(const x of [...manifest.cards,...manifest.printAliases]){
  const id=x.canonicalId??x.id,c=e.card(id),[front,back]=x.faces;
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [front.cost,parseInt(front.powerText,10),1,front.civilizations,front.race,4]);
  assert.equal(manifest.regulationVerification.limits[x.id],4);
  assert.equal(nameKey(c.name),nameKey(x.name));
  assert.deepEqual(standardCardSpec({...x,status:'complete'},{phase:1288}),x.spec);
  if(back){
   assert.deepEqual([c.spellFace.name,c.spellFace.cost,c.spellFace.civilizations,c.spellFace.text],
    [back.name,back.cost,back.civilizations,back.abilityText]);
  }
  assert.equal(registry.get(x.id).id,id);
  if(!x.canonicalId)assert.equal(CARD_IMAGES[id],x.image);
  assert.deepEqual(refs.find(y=>y.id===x.id),{id:x.id,canonicalId:id,name:x.name,image:x.image,source:x.source});
  const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

const finishTurn=s=>{s.phase='attack';act(s,'endTurn');drain(s);act(s,'skipCharge');};
const manaActions=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.origin==='mana'&&a.uid===x.uid);

test('Golgagni blocks, breaks three shields and grants Blocker only to its own Stella creatures',()=>{
 const s=field(1),ally=add(s,0,'battle',STELLA),other=add(s,0,'battle',N);
 const opposing=add(s,1,'battle',STELLA),attacker=add(s,1,'battle',W);
 const gol=add(s,0,'battle',GOL);
 assert.equal(e.effectiveCard(gol,s).blocker,true);
 assert.equal(e.effectiveCard(ally,s).blocker,true);
 assert.ok(!e.effectiveCard(other,s).blocker&&!e.effectiveCard(opposing,s).blocker);
 attack(s,attacker.uid);act(s,'block',a=>a.uid===ally.uid);drain(s);
 assert.ok(has(s,1,'grave',attacker));
 finishTurn(s);
 attack(s,gol.uid);passBlock(s);drain(s);
 assert.equal(s.players[1].shields.length,2);
});

test('Downforce shields only the creatures present at resolution and expires at the caster’s next start',()=>{
 const s=field(),first=add(s,0,'battle',N),second=add(s,0,'battle',W);
 const seed=add(s,0,'battle','dmsd21-014'),foe=add(s,1,'battle',N);
 play(s,GOL,1);drain(s);
 const late=play(s,F);
 const limits=s.extLimits.filter(x=>x.kind==='g627Stay');
 assert.deepEqual(limits.map(x=>x.ref.uid),[first.uid,second.uid]);
 assert.ok(!limits.some(x=>[seed.uid,late.uid,foe.uid].includes(x.ref.uid)));
 finishTurn(s);
 play(s,KILL);act(s,'effect',a=>a.targets[0].uid===first.uid);drain(s);
 play(s,BOUNCE,1);pick(s,second.uid);drain(s);
 play(s,KILL);act(s,'effect',a=>a.targets[0].uid===late.uid);drain(s);
 assert.ok(has(s,0,'battle',first)&&has(s,0,'battle',second)&&has(s,0,'grave',late));
 finishTurn(s);
 assert.ok(!s.extLimits.some(x=>x.kind==='g627Stay'));
 play(s,BOUNCE,1);pick(s,second.uid);drain(s);
 assert.ok(has(s,0,'hand',second));
});

test('Downforce’s protection follows a creature through evolution',()=>{
 const s=field(),base=add(s,0,'battle',N);
 play(s,GOL,1);drain(s);
 const evolution=play(s,'dm02-033');act(s,'evolve',a=>a.baseUid===base.uid);drain(s);
 finishTurn(s);
 play(s,KILL);act(s,'effect',a=>a.targets[0].uid===evolution.uid);drain(s);
 assert.ok(has(s,0,'battle',evolution));
});

test('Icing Fairy cannot attack, even with a permission to attack the opposing player (QA 43293)',()=>{
 const s=field(),ice=add(s,0,'battle',ICE),enemy=add(s,1,'battle',F,{tapped:true});
 const spell=play(s,'dmex19-003');
 const mode=s.decision.choices.findIndex(o=>o.label.includes('プレイヤー'));
 assert.ok(mode>=0);
 const grant=s.decision.choices[mode].value;
 pick(s,grant);pick(s,ice.uid);pick(s,grant);pick(s,ice.uid);drain(s);
 assert.ok(has(s,0,'grave',spell));
 assert.ok(!e.canCreatureAttack(s,0,ice));
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===ice.uid));
 assert.ok(has(s,1,'battle',enemy));
});

test('Icing Fairy may battle the exact non-summoned entrant during its opponent’s turn',()=>{
 for(const use of [false,true]){
  const s=field(1),ice=add(s,0,'battle',ICE),other=add(s,1,'battle',F);
  const dragon=add(s,1,'hand',W);
  play(s,DEPLOY);pick(s,dragon.uid);
  assert.equal(s.decision.player,0);
  assert.equal(s.decision.task.enemy.uid,dragon.uid);
  pick(s,use?true:null);drain(s);
  assert.ok(has(s,1,use?'grave':'battle',dragon));
  assert.ok(has(s,0,'battle',ice)&&has(s,1,'battle',other));
 }
});

test('Icing Fairy ignores normal summons, S Trigger summons and off-turn non-summons',()=>{
 const ordinary=field(1);add(ordinary,0,'battle',ICE);
 assert.ok(has(ordinary,1,'battle',play(ordinary,DRAGON)));
 assert.equal(ordinary.decision,null);
 const trigger=field(0);add(trigger,1,'battle',ICE);give(trigger,0,'shields',['dm23rp1-032']);
 const first=add(trigger,1,'battle',F);
 trigger.active=1;attack(trigger,first.uid);passBlock(trigger);act(trigger,'useTrigger');drain(trigger);
 assert.ok(trigger.players[0].battle.some(x=>x.cardId==='dm23rp1-032'));
 const offTurn=field(0),attacker=add(offTurn,0,'battle',F);
 add(offTurn,0,'battle',ICE);give(offTurn,1,'shields',[TRIG_DEPLOY]);
 const target=add(offTurn,1,'hand',W);
 attack(offTurn,attacker.uid);passBlock(offTurn);act(offTurn,'useTrigger');pick(offTurn,target.uid);drain(offTurn);
 assert.ok(has(offTurn,1,'battle',target));
});

test('Giant Impact takes both race categories and sets the rest on the bottom in the chosen order',()=>{
 for(const ids of [['dm22ex1-124','dm38-054','dm23rp2-074'],[ICE,W,F]]){
  let s=field();
  give(s,0,'deck',[...ids,...Array(10).fill(N)]);
  const top=s.players[0].deck.slice(0,3),spell=play(s,ICE,1);
  if(ids[0]===ICE){
   assert.deepEqual(new Set(picks(s)),new Set([top[1].uid,top[2].uid]));
   s=JSON.parse(JSON.stringify(s));pick(s,top[2].uid);drain(s);
   assert.deepEqual(s.players[0].hand.map(x=>x.uid),[top[0].uid]);
   assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[top[2].uid,top[1].uid]);
  }else assert.deepEqual(s.players[0].hand.map(x=>x.uid),top.map(x=>x.uid));
  assert.ok(has(s,0,'grave',spell)&&!has(s,0,'battle',spell));
 }
});

test('Ten-Pillar can be put into battle from hand by an effect but cannot be summoned from hand',()=>{
 const s=field(),ten=add(s,0,'hand',TEN),victim=add(s,1,'battle',F);
 const actions=e.getLegalActions(s).filter(a=>a.uid===ten.uid&&a.kind==='play');
 assert.deepEqual(actions.map(a=>a.face),[1]);
 play(s,DEPLOY);pick(s,ten.uid);drain(s);
 assert.ok(has(s,0,'battle',ten));
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===ten.uid&&a.target==='player'));
 attack(s,ten.uid,victim.uid);passBlock(s);drain(s);
 assert.ok(has(s,1,'grave',victim));
 finishTurn(s);finishTurn(s);
 attack(s,ten.uid);passBlock(s);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Direct Hit gives one paid creature summon from the existing mana (QA 43048)',()=>{
 let s=field();
 const ten=add(s,0,'mana',TEN),second=add(s,0,'mana',F),spell=add(s,0,'mana',RAMP);
 s.players[0].deck[0].cardId=W;
 const late=s.players[0].deck[0];
 assert.equal(manaActions(s,ten).length,0);
 play(s,TEN,1);drain(s);
 assert.equal(manaActions(s,spell).length,0);
 play(s,RAMP);drain(s);
 assert.ok(has(s,0,'mana',late));
 assert.equal(manaActions(s,late).length,0);
 assert.ok(manaActions(s,second).length);
 assert.equal(manaActions(s,ten)[0]?.cost,3);
 s=JSON.parse(JSON.stringify(s));
 act(s,'play',a=>a.uid===ten.uid&&a.origin==='mana');drain(s);
 assert.ok(has(s,0,'battle',ten));
 assert.equal(manaActions(s,second).length,0);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
});

test('two Direct Hits grant separate uses, and an unused permission expires at end of turn',()=>{
 const s=field();
 const early=[add(s,0,'mana',F),add(s,0,'mana',F),add(s,0,'mana',N)];
 play(s,TEN,1);play(s,TEN,1);drain(s);
 assert.equal(manaActions(s,early[0]).length,2);
 for(const [i,left] of [[0,1],[1,0]]){
  act(s,'play',a=>a.uid===early[i].uid&&a.origin==='mana');drain(s);
  assert.ok(has(s,0,'battle',early[i]));
  assert.equal(manaActions(s,early[i+1]).length,left);
 }
 play(s,TEN,1);drain(s);
 assert.equal(manaActions(s,early[2]).length,1);
 finishTurn(s);finishTurn(s);
 assert.equal(manaActions(s,early[2]).length,0);
});

test('Direct Hit permits a legal G-Zero mana summon and consumes the permission (QA 40933)',()=>{
 const s=field(),crossfire=add(s,0,'mana','dm23ex1-011'),other=add(s,0,'mana',N);
 for(let i=0;i<4;i++)add(s,0,'battle',F);
 play(s,TEN,1);drain(s);
 assert.ok(manaActions(s,crossfire).some(a=>a.freeSummon==='G・ゼロ'));
 act(s,'play',a=>a.uid===crossfire.uid&&a.origin==='mana'&&a.freeSummon==='G・ゼロ');drain(s);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 assert.ok(has(s,0,'battle',crossfire));
 assert.equal(manaActions(s,other).length,0);
});

test('a creature that leaves mana and returns is outside Direct Hit’s original set',()=>{
 const s=field(),early=add(s,0,'mana',F),untouched=add(s,0,'mana',N);
 play(s,TEN,1);drain(s);
 play(s,'dm06-052');pick(s,early.uid);pick(s,null);drain(s);
 assert.ok(has(s,0,'hand',early));
 play(s,'dmrp15-020');pick(s,early.uid);drain(s);
 assert.ok(has(s,0,'mana',early));
 assert.equal(manaActions(s,early).length,0);
 assert.equal(manaActions(s,untouched).length,1);
});

test('Genmu suppresses the two ongoing spell effects while it is in battle (QA 45450)',()=>{
 const s=field(),ally=add(s,0,'battle',N),second=add(s,0,'battle',W),mana=add(s,0,'mana',F);
 play(s,GOL,1);play(s,TEN,1);drain(s);
 const genmu=add(s,0,'battle','dmrp15-km1');
 assert.equal(manaActions(s,mana).length,0);
 s.players[0].battle.pop();
 assert.equal(manaActions(s,mana).length,1);
 s.players[0].battle.push(genmu);
 finishTurn(s);
 play(s,KILL);act(s,'effect',a=>a.targets[0].uid===ally.uid);drain(s);
 assert.ok(has(s,0,'grave',ally));
 play(s,KILL);act(s,'effect',a=>a.targets[0].uid===genmu.uid);drain(s);
 play(s,KILL);act(s,'effect',a=>a.targets[0].uid===second.uid);drain(s);
 assert.ok(has(s,0,'battle',second));
});

test('a protected Doki is still chosen by an opponent’s targeted power reduction',()=>{
 const s=field(),doki=add(s,0,'battle','dm23rp3-013'),ally=add(s,0,'battle',N);
 play(s,GOL,1);drain(s);
 finishTurn(s);
 play(s,'dmr13-028');
 assert.deepEqual(picks(s),[doki.uid]);
 pick(s,doki.uid);drain(s);
 assert.ok(e.power(doki,false,s)<=0);
 assert.ok(has(s,0,'battle',doki)&&has(s,0,'battle',ally));
});
