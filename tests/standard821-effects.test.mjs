import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-821.json',import.meta.url)));
const POWER='dm32-070',MOON='dm32-s04',GAIRUS='dm32-026';
const NATURE='dm01-108',DARK='dm01-090',EVO='dm02-033',NEO='dmrp01-087';
const BOUNCE='dm01-086',TRAP='dm01-039',DEMON='dm01-027';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 821 definitions preserve their canonical saved deck IDs',()=>{
 assert.equal(cards.length,3);
 assert.deepEqual(printAliases,[]);
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:821}));
  assert.throws(()=>standardCardSpec(detail,{phase:820}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:821}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);

const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const noBlock=s=>act(s,'noBlock');

for(const mode of ['normal','evolution draws','evolution declines','NEO with base','NEO without base'])test('Evolute Power buffs the chosen creature and checks its evolution: '+mode,()=>{
 let s=setup();
 const id=mode.startsWith('NEO')?NEO:mode.startsWith('evolution')?EVO:NATURE;
 const target=put(s,0,'battle',id),enemy=put(s,1,'battle',EVO);
 if(mode!=='normal'&&mode!=='NEO without base')target.under=[inst(NATURE)];
 const original=e.power(target,false,s),[top]=give(s,0,'deck',[DARK,NATURE,DARK]);
 play(s,put(s,0,'hand',POWER));
 assert.deepEqual(values(s),[target.uid]);
 assert.ok(!values(s).includes(enemy.uid));
 s=JSON.parse(JSON.stringify(s));
 pick(s,target.uid);
 const live=s.players[0].battle.find(x=>x.uid===target.uid);
 assert.equal(e.power(live,false,s),original+3000);
 assert.equal(e.effectiveCard(live,s).extraBreak,1);
 const draws=mode==='evolution draws'||mode==='NEO with base';
 if(draws||mode==='evolution declines'){
  assert.equal(s.decision.task.op,'g34_DrawUpTo');
  pick(s,draws?true:null);
 }
 assert.equal(s.decision,null);
 assert.equal(has(s,0,'hand',top),draws);
});

test('Evolute Power stacks, applies to the actual attack, and expires at the end of the turn',()=>{
 const s=setup(),x=put(s,0,'battle',NEO);
 const before=e.power(x,false,s);
 for(let i=0;i<2;i++){play(s,put(s,0,'hand',POWER));pick(s,x.uid);}
 assert.equal(e.power(x,false,s),before+6000);
 assert.equal(e.effectiveCard(x,s).extraBreak,2);
 attack(s,x.uid);
 noBlock(s);
 drain(s);
 assert.equal(s.players[1].shields.length,1);
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(x,false,s),before);
 assert.ok(!e.effectiveCard(x,s).extraBreak);
});

test('Evolute Power adds one shield to a creature effect break',()=>{
 const s=setup(),x=put(s,0,'battle','dmr11-047'),y=put(s,1,'battle',NATURE);
 y.tapped=true;
 play(s,put(s,0,'hand',POWER));
 pick(s,x.uid);
 attack(s,x.uid,y.uid);
 noBlock(s);
 assert.equal(s.decision.task.op,'g34_Break497');
 const [a,b]=s.players[1].shields;
 pick(s,a.uid);
 pick(s,b.uid);
 drain(s);
 assert.ok(has(s,1,'grave',y));
 assert.equal(s.players[1].shields.length,3);
 assert.ok(has(s,1,'hand',a)&&has(s,1,'hand',b));
});

test('Evolute Power follows a later evolution without drawing and pauses when the spell is ignored',()=>{
 const s=setup(),base=put(s,0,'battle',NATURE);
 play(s,put(s,0,'hand',POWER));
 pick(s,base.uid);
 assert.equal(s.decision,null);
 const source=put(s,0,'hand',EVO);
 play(s,source);
 act(s,'evolve',a=>a.baseUid===base.uid);
 const x=s.players[0].battle.find(y=>y.uid===source.uid),original=e.card(EVO).power;
 assert.equal(e.power(x,false,s),original+3000);
 assert.equal(e.effectiveCard(x,s).extraBreak,1);
 const gen=put(s,1,'battle',GEN);
 assert.equal(e.power(x,false,s),original);
 assert.ok(!e.effectiveCard(x,s).extraBreak);
 s.players[1].battle.splice(s.players[1].battle.indexOf(gen),1);
 s.players[1].grave.push(gen);
 assert.equal(e.power(x,false,s),original+3000);
 assert.equal(e.effectiveCard(x,s).extraBreak,1);
});

for(const count of [0,1,2,3])test('Blizzard Moon evolves on an evolution and draws up to three before breaking two: '+count,()=>{
 let s=setup();
 const normal=put(s,0,'battle',NATURE),base=put(s,0,'battle',count%2?NEO:EVO);
 const under=inst(NATURE);
 base.under=[under];
 const source=put(s,0,'hand',MOON),deck=give(s,0,'deck',Array(6).fill(DARK));
 play(s,source);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='evolve'&&a.baseUid===normal.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 const moon=s.players[0].battle.find(x=>x.uid===source.uid);
 assert.deepEqual(moon.under.map(x=>x.uid),[base.uid]);
 assert.deepEqual(moon.under[0].under.map(x=>x.uid),[under.uid]);
 attack(s,moon.uid);
 assert.equal(s.decision.task.op,'g34_DrawUpTo');
 s=JSON.parse(JSON.stringify(s));
 for(let i=0;i<count;i++)pick(s,true);
 if(count<3)pick(s,null);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),deck.slice(0,count).map(x=>x.uid));
 noBlock(s);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Blizzard Moon needs a friendly evolution and preserves a tapped base',()=>{
 const s=setup(),source=put(s,0,'hand',MOON);
 put(s,0,'battle',NEO);
 put(s,1,'battle',EVO);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===source.uid));
 const base=put(s,0,'battle',EVO);
 base.under=[inst(NATURE)];
 base.tapped=true;
 play(s,source);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.players[0].battle.find(x=>x.uid===source.uid).tapped,true);
});

for(const mode of ['bounce','destroy','mana','decline','grave locked','empty grave','ignored'])test('Gairus uses blind entry discard and lets its opponent decide the leave recovery: '+mode,()=>{
 let s=setup();
 const source=put(s,0,'hand',GAIRUS),hidden=put(s,1,'hand',DARK);
 const keep=put(s,1,'hand',NATURE),unrelated=put(s,0,'grave',DARK);
 const other=mode==='empty grave'?null:put(s,1,'grave',TRAP);
 if(mode==='ignored')put(s,1,'battle',GEN);
 if(mode==='grave locked')put(s,0,'battle','dmrp22-042');
 play(s,source);
 if(mode==='ignored')assert.equal(s.decision,null);
 else{
  assert.equal(s.decision.player,0);
  assert.equal(s.decision.task.op,'g34_BlindDiscard773');
  assert.deepEqual(s.decision.choices.map(c=>[c.value,c.cardId]),[[0,undefined],[1,undefined]]);
  pick(s,0);
  assert.ok(has(s,1,'grave',hidden)&&has(s,1,'hand',keep));
 }
 if(mode==='empty grave')s.players[1].deck.push(s.players[1].grave.shift());
 s.active=1;
 const destroys=mode==='destroy'||mode==='ignored';
 const spell=destroys?DEMON:mode==='mana'?TRAP:BOUNCE;
 play(s,put(s,1,'hand',spell));
 act(s,'effect',a=>a.targets?.some(t=>t.uid===source.uid));
 assert.ok(has(s,0,destroys?'grave':mode==='mana'?'mana':'hand',source));
 if(['grave locked','ignored'].includes(mode)){assert.equal(s.decision,null);return;}
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.task.op,'g34_Select');
 assert.ok(!values(s).includes(unrelated.uid));
 if(other)assert.ok(values(s).includes(other.uid));
 assert.ok(values(s).includes(null));
 s=JSON.parse(JSON.stringify(s));
 if(mode==='decline')pick(s,null);
 else if(mode==='empty grave'){
  assert.ok(!values(s).includes(hidden.uid));
  pick(s,null);
 }else{
  pick(s,other.uid);
  assert.ok(has(s,1,'hand',other));
 }
 assert.equal(s.decision,null);
});
