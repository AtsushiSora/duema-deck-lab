import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const VALK='dm22rp1-5A',FORCE='dm22rp1-6A',LETTER='dm22rp1-038',IVY='dm22rp1-040';
const FIRE='dm01-097',GREEN='dm01-108',SEED='dm22rp1-068',HAMMER='dm01-101',
 AMO='dmrp19-s10',ABYSS_SPELL='dm23rp2-039',BOUNCE='dm22rp1-034';
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
const target=(s,x)=>s.decision.type==='effect'?act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid)):pick(s,x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const finishAttack=s=>{if(s.decision?.type==='block')act(s,'noBlock');drain(s);};
const top=(s,p,id)=>{const x=inst(id);s.players[p].deck.unshift(x);return x;};

test('nine official prints resolve to four original card IDs and preserve their images',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const m=read('support-phase-1223.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[VALK,FORCE,LETTER,IVY]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dm22rp1-S5','dm22rp1-7B','dm22rp1-S6','dm22rp1-8B','promoy21-052']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1223}),row.spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
 }
});

test('Valkyrie requires six mana and pays three fire for its delayed destruction and draw',()=>{
 for(const alternate of [false,true]){
  const s=field(),unit=add(s,0,'hand',VALK);
  give(s,0,'mana',Array(5).fill(FIRE));
  const alt=()=>e.getLegalActions(s).find(a=>a.uid===unit.uid&&a.role==='paidAlt568');
  assert.equal(alt(),undefined);
  add(s,0,'mana',FIRE);
  assert.equal(alt().cost,3);
  act(s,'play',a=>a.uid===unit.uid&&!!a.alternative===alternate);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,alternate?3:6);
  assert.equal(e.effectiveCard(unit,s).speedAttacker,true);
  assert.equal(e.effectiveCard(unit,s).poweredBreaker,true);
  end(s);
  assert.ok(has(s,0,alternate?'grave':'battle',unit));
  assert.equal(s.players[0].hand.length,Number(alternate));
 }
});

test('Valkyrie can decline, recycle an empty hand, or draw three and gain 4000 per discarded card',()=>{
 for(const [count,accept] of [[0,true],[2,true],[2,false]]){
  const s=field(),unit=add(s,0,'battle',VALK);
  add(s,0,'battle',FIRE);
  add(s,0,'battle',SEED);
  give(s,0,'hand',Array(count).fill(GREEN));
  attack(s,unit.uid);
  pick(s,accept?true:null);
  assert.equal(s.players[0].hand.length,accept?3:count);
  assert.equal(s.players[0].grave.length,accept?count:0);
  assert.equal(e.power(unit,true,s),8000+(accept?count*4000:0));
  finishAttack(s);
  end(s);
  assert.equal(e.power(unit,false,s),8000);
 }
 const s=field(),unit=add(s,0,'battle',VALK);
 add(s,0,'battle',FIRE);add(s,1,'battle',SEED);add(s,0,'hand',GREEN);
 attack(s,unit.uid);finishAttack(s);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(e.power(unit,false,s),8000);
});

test('Valkyrie draws after replacement but gains power only from the original discard batch',()=>{
 for(const replaced of [1,2]){
  let s=field(),unit=add(s,0,'battle',VALK);
  add(s,0,'battle',FIRE);add(s,0,'battle',SEED);add(s,0,'battle',AMO);
  give(s,0,'hand',[GREEN,GREEN]);
  attack(s,unit.uid);pick(s,true);
  s=JSON.parse(JSON.stringify(s));
  for(let i=0;i<2;i++){
   assert.equal(s.decision.type,'extended');
   const choice=s.decision.choices.find(({value})=>i<replaced?value?.g1090Mana:value===false);
   assert.ok(choice);
   pick(s,choice.value);
  }
  assert.equal(s.players[0].hand.length,3);
  assert.equal(s.players[0].mana.length,50+replaced);
  assert.equal(s.players[0].grave.length,2-replaced);
  assert.equal(e.power(s.players[0].battle.find(x=>x.uid===unit.uid),true,s),8000+(2-replaced)*4000);
 }
});

test('Force Dragon destroys a small creature even while it is a Tamaseed and changes type at four',()=>{
 const s=field(),small=add(s,1,'battle',FIRE);
 const big=add(s,1,'battle','dm01-008');
 cast(s,FORCE);
 const unit=s.players[0].battle.find(x=>x.cardId===FORCE);
 assert.equal(e.isCreature(s,unit),false);
 assert.equal(e.effectiveCard(unit,s).power,0);
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid??c.value),[small.uid]);
 target(s,small);
 assert.ok(has(s,1,'grave',small)&&has(s,1,'battle',big));
 add(s,0,'battle',FIRE);add(s,0,'battle',SEED);
 assert.equal(e.isCreature(s,unit),false);
 const fourth=add(s,0,'battle',FIRE);
 assert.equal(e.isCreature(s,unit),true);
 assert.equal(e.effectiveCard(unit,s).breaker,2);
 fourth.sealed=true;
 assert.equal(e.isCreature(s,unit),false);
 assert.equal(e.card(unit).type,'creature');
});

test('Force Dragon gives the three temporary abilities only to the allied creatures already in play',()=>{
 const s=field(),unit=add(s,0,'battle',FORCE);
 const ally=add(s,0,'battle',FIRE,{entered:s.turn});
 add(s,0,'battle',FIRE);add(s,0,'battle',SEED);
 const enemy=add(s,1,'battle',FIRE);
 attack(s,unit.uid);
 finishAttack(s);
 assert.equal(s.players[1].shields.length,3);
 const effect=()=>e.effectiveCard(ally,s);
 assert.equal(effect().speedAttacker,true);
 assert.equal(effect().poweredBreaker,true);
 assert.equal(e.power(ally,true,s),8000);
 for(const x of [unit,enemy,add(s,0,'battle',FIRE,{entered:s.turn})])
  assert.equal(e.effectiveCard(x,s).poweredBreaker,undefined);
 attack(s,ally.uid);finishAttack(s);
 assert.equal(s.players[1].shields.length,1);
 end(s);
 assert.equal(effect().poweredBreaker,undefined);
 assert.equal(e.power(ally,true,s),2000);
});

test('Force Dragon triggers Sonkun only if it is destroyed as a creature (QA42130)',()=>{
 for(const active of [false,true]){
  const s=field(1),unit=add(s,0,'battle',FORCE),sonkun=add(s,0,'battle','dm22rp1-006');
  if(active){add(s,0,'battle',FIRE);add(s,0,'battle',SEED);}
  assert.equal(e.isCreature(s,unit),active);
  const removal=add(s,1,'hand','dmbd16-009');
  act(s,'play',a=>a.uid===removal.uid&&a.face===1);
  target(s,unit);
  assert.ok(has(s,0,'grave',unit)&&has(s,0,'battle',sonkun));
  assert.equal(e.isCreature(s,unit),true);
  assert.equal(s.decision?.task?.source===sonkun.cardId,active);
 }
});

test('Yamino Camstar cannot select Force Dragon in the opposing hand (QA42144)',()=>{
 const s=field(),unit=add(s,1,'hand',FORCE),spell=add(s,1,'hand',HAMMER);
 cast(s,'dm31-028');
 const values=s.decision.choices.map(c=>c.value?.uid??c.value);
 assert.ok(values.includes(spell.uid)&&!values.includes(unit.uid));
 pick(s,spell.uid);
 assert.ok(has(s,1,'hand',unit)&&has(s,1,'grave',spell));
});

test('Letter destroys itself after combat, and blocks without its own attack penalty',()=>{
 const s=field(),letter=add(s,0,'battle',LETTER);
 attack(s,letter.uid);
 assert.ok(has(s,0,'battle',letter));
 finishAttack(s);
 assert.ok(has(s,0,'grave',letter));
 assert.equal(s.players[1].shields.length,4);

 const b=field(1),blocker=add(b,0,'battle',LETTER),attacker=add(b,1,'battle','dm01-083');
 attack(b,attacker.uid);
 act(b,'block',a=>a.uid===blocker.uid);
 drain(b);
 assert.ok(has(b,0,'battle',blocker));
 assert.ok(has(b,1,'grave',attacker));
});

test('Letter mills only on its own turn and draws when an Abyss creature or spell is milled',()=>{
 for(const id of [LETTER,ABYSS_SPELL,GREEN]){
  const s=field(1);
  add(s,0,'battle',LETTER);
  const milled=top(s,0,id);
  end(s);
  assert.ok(has(s,0,'hand',milled));
  const next=top(s,0,id),before=s.players[0].hand.length;
  end(s);
  assert.ok(has(s,0,'grave',next));
  assert.equal(s.players[0].hand.length,before+Number(id!==GREEN));
 }
});

test('Ivy cannot attack and preserves itself by ordering exactly two of its graveyard cards',()=>{
 let s=field(1);
 const ivy=add(s,0,'battle',IVY);
 const cards=[add(s,0,'grave',FIRE),add(s,0,'grave',GREEN),add(s,0,'grave',LETTER)];
 s.active=0;s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===ivy.uid));
 s.active=1;s.phase='main';
 cast(s,HAMMER);
 target(s,ivy);
 act(s,'replaceGraveBottom1202');
 act(s,'graveBottomStayPick1202',a=>a.uid===cards[2].uid);
 s=JSON.parse(JSON.stringify(s));
 act(s,'graveBottomStayPick1202',a=>a.uid===cards[0].uid);
 assert.ok(has(s,0,'battle',ivy));
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[cards[2].uid,cards[0].uid]);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),[cards[1].uid]);
});

test('Ivy cannot replace a deck move or pay with one card and may decline a legal replacement',()=>{
 for(const [id,n] of [[BOUNCE,2],[HAMMER,1],[HAMMER,2]]){
  const s=field(1),ivy=add(s,0,'battle',IVY);
  give(s,0,'grave',Array(n).fill(GREEN));
  cast(s,id);target(s,ivy);
  if(id===BOUNCE)pick(s,'deckTop');
  else if(n===2)act(s,'allowLeave');
  else assert.equal(s.decision,null);
  assert.ok(!has(s,0,'battle',ivy));
  assert.ok(has(s,0,id===BOUNCE?'deck':'grave',ivy));
  assert.equal(s.players[0].grave.length,n+Number(id===HAMMER));
 }
});

test('Ivy can use its destruction replacement after losing a battle as a blocker',()=>{
 const s=field(1),ivy=add(s,0,'battle',IVY),attacker=add(s,1,'battle',FIRE);
 const a=add(s,0,'grave',LETTER),b=add(s,0,'grave',FIRE);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===ivy.uid);
 act(s,'replaceGraveBottom1202');
 act(s,'graveBottomStayPick1202',x=>x.uid===a.uid);
 act(s,'graveBottomStayPick1202',x=>x.uid===b.uid);
 assert.ok(has(s,0,'battle',ivy)&&ivy.tapped);
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[a.uid,b.uid]);
});
