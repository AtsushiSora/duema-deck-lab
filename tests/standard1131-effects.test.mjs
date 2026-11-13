import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const RYOMA='dm25rp2-S05',CELEB='dm25rp2-001',JA='dm25rp2-S06';
const NATURE='dm01-108',FIRE='dm01-097',BLOCKER='dm01-075',DEATH='dm01-027';
const add=(s,p,zone,id,props={})=>{
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
};
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const play=(s,id)=>{
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
};
function evolve(s,base){
 if(s.decision?.type==='evolution')act(s,'evolve',a=>(a.baseUid||null)===(base?.uid??null));
}

test('twelve official prints resolve to their canonical cards, with complete text and usage limits',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1131.json',import.meta.url)));
 const images=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(c=>c.id),[RYOMA,CELEB,JA]);
 assert.equal(manifest.printAliases.length,9);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,detail={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(detail,{phase:1131}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.get(row.id).supported,true);
  assert.equal(e.card(id).limit,manifest.regulationVerification.limits[row.id]);
  assert.ok(images.prints.some(p=>p.id===row.id&&p.canonicalId===id&&p.image===row.image));
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  detail.faces=detail.faces.map(f=>({...f,abilityText:f.abilityText+'\n未知の能力'}));
  assert.throws(()=>standardCardSpec(detail,{phase:1131}));
 }
});

const topDeck=(s,p,ids)=>{give(s,p,'deck',[...ids,NATURE,NATURE,NATURE,NATURE]);return s.players[p].deck;};
const turnEnd=s=>{s.phase='attack';act(s,'endTurn');};
const destroy=(s,target)=>{
 play(s,DEATH);
 act(s,'effect',a=>a.targets?.some(y=>y.uid===target.uid));
};

for(const mode of ['decline','one','none','both','public one'])test('RYOMA reveals and distributes its inspected cards: '+mode,()=>{
 const s=setup();
 const [first,second,third]=topDeck(s,0,[NATURE,mode==='both'?CELEB:DEATH]);
 if(mode==='public one')add(s,1,'battle','dmrp22-030');
 const x=play(s,RYOMA);
 evolve(s,null);
 assert.ok(e.effectiveCard(x,s).machFighter);
 assert.equal(e.effectiveCard(x,s).breaker,3);
 pick(s,mode==='decline'?null:true);
 if(mode==='decline'){
  assert.deepEqual(s.players[0].deck.slice(0,2),[first,second]);
  return;
 }
 assert.ok(values(s).includes(first.uid));
 assert.equal(values(s).includes(second.uid),mode==='both');
 if(mode!=='none')pick(s,first.uid);
 if(mode==='both')pick(s,second.uid);
 else if(s.decision?.task.op==='g34_LookPick')pick(s,null);
 assert.equal(inZone(s,0,'hand',first),mode!=='none');
 assert.equal(inZone(s,0,'mana',first),mode==='none');
 assert.ok(inZone(s,0,mode==='both'?'hand':mode==='public one'?'deck':'mana',second));
 assert.equal(s.players[0].deck[0].uid,(mode==='public one'?second:third).uid);
});

for(const mode of ['yes','no','evolved'])test('RYOMA may replace destruction with moving to mana: '+mode,()=>{
 const s=setup();s.active=1;
 const material=inst(NATURE),x=add(s,0,'battle',RYOMA,{under:mode==='evolved'?[material]:[]});
 destroy(s,x);
 act(s,mode==='no'?'allowLeave':'replaceYamata');
 assert.ok(inZone(s,0,mode==='no'?'grave':'mana',x));
 if(mode==='evolved')assert.ok(inZone(s,0,'mana',material));
});

for(const mode of ['seven','eight','apul','evolve'])test('RYOMA starts from mana at the required count: '+mode,()=>{
 const s=setup();s.active=1;
 give(s,0,'mana',Array(mode==='seven'?6:7).fill(NATURE));
 const x=add(s,0,'mana',RYOMA,{tapped:true});
 const base=mode==='evolve'?add(s,0,'battle',NATURE):null;
 if(mode==='apul')add(s,1,'battle','dmrp22-042');
 turnEnd(s);
 if(mode==='seven'||mode==='apul'){
  assert.notEqual(s.decision?.source,RYOMA);
  assert.ok(inZone(s,0,'mana',x));
  return;
 }
 assert.equal(s.decision.source,RYOMA);
 pick(s,true);
 if(s.decision?.task.op==='g34_Put')pick(s,base?.uid??null);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,null);
 assert.ok(inZone(s,0,'battle',x));
 assert.equal(e.isEvolution(x),!!base);
 assert.ok(!x.summonedTurn);
});

for(const evolved of [false,true])test('Celeb offers on arrival only as an evolution: '+evolved,()=>{
 const s=setup(),base=add(s,0,'battle',NATURE),enemy=add(s,1,'battle',NATURE);
 const x=play(s,CELEB);
 evolve(s,evolved?base:null);
 assert.ok(e.effectiveCard(x,s).blocker&&e.effectiveCard(x,s).escape);
 assert.equal(e.effectiveCard(x,s).breaker,3);
 if(evolved){
  const top=s.players[0].deck[0];
  pick(s,enemy.uid);
  assert.equal(s.decision.source,CELEB);
  pick(s,true);
  assert.ok(inZone(s,0,'shields',top)&&enemy.tapped);
 }else assert.ok(!s.decision&&!enemy.tapped);
});

test('Celeb recognizes taps before it entered and resets at the next turn (QA47057)',()=>{
 const s=setup(),base=add(s,0,'battle',NATURE);
 const first=add(s,1,'battle',NATURE),second=add(s,1,'battle',NATURE),third=add(s,1,'battle',NATURE);
 play(s,'dm01-085');
 act(s,'effect',a=>a.targets.some(y=>y.uid===first.uid));
 play(s,CELEB);
 evolve(s,base);
 pick(s,second.uid);
 assert.ok(second.tapped&&!s.decision);
 turnEnd(s);
 drain(s);
 const top=s.players[0].deck[0];
 attack(s,third.uid);
 assert.equal(s.decision.source,CELEB);
 pick(s,true);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.ok(inZone(s,0,'shields',top));
});

test('Celeb also responds to tapping to attack, and only the first opposing tap can shield',()=>{
 const s=setup(),x=add(s,0,'battle',CELEB);
 const first=add(s,1,'battle',NATURE),second=add(s,1,'battle',NATURE);
 attack(s,x.uid);
 pick(s,first.uid);
 pick(s,null);
 drain(s);
 assert.ok(first.tapped&&!second.tapped);
 s.phase='main';
 play(s,'dm01-085');
 act(s,'effect',a=>a.targets.some(y=>y.uid===second.uid));
 assert.ok(second.tapped&&!s.decision);
});

for(const mode of ['decline draw','draw','own end'])test('Jagan PART II handles the optional draw and face-up hand attachment separately: '+mode,()=>{
 const s=setup(),held=add(s,0,'hand',FIRE);
 const top=s.players[0].deck[0];
 const x=mode==='own end'?add(s,0,'battle',JA):play(s,JA);
 if(mode==='own end')turnEnd(s);else evolve(s,null);
 assert.equal(s.decision.source,JA);
 pick(s,mode==='draw'?1:0);
 pick(s,mode==='draw'?top.uid:held.uid);
 assert.ok(x.under.some(y=>y.uid===(mode==='draw'?top:held).uid&&!y.faceDown));
 assert.ok(e.isEvolution(x));
});

test('Jagan PART II gets one mode per card moved from under itself by G-NEO',()=>{
 const s=setup();s.active=1;
 const layers=[inst(NATURE),inst(FIRE)],x=add(s,0,'battle',JA,{under:layers.slice()});
 const target=add(s,1,'battle',NATURE),top=s.players[0].deck[0];
 destroy(s,x);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect');
 pick(s,0);
 assert.equal(s.decision.source,JA);
 pick(s,1);
 pick(s,target.uid);
 assert.ok(inZone(s,0,'battle',x)&&!x.under?.length);
 assert.ok(layers.every(y=>inZone(s,0,'grave',y)));
 assert.ok(inZone(s,0,'shields',top)&&inZone(s,1,'grave',target));
});

test('Jagan PART II ignores the movement of cards from another creature',()=>{
 const s=setup();s.active=1;
 add(s,0,'battle',JA);
 const other=add(s,0,'battle','dm25rp2-040',{under:[inst(NATURE)]});
 destroy(s,other);
 assert.notEqual(s.decision?.source,JA);
 assert.ok(inZone(s,0,'battle',other)&&!other.under?.length);
});

test('Celeb can use Escape without offering the returned shield’s S-Trigger',()=>{
 const s=setup();s.active=1;
 const x=add(s,0,'battle',CELEB),shield=s.players[0].shields[0];
 shield.cardId='dm25rp2-049';
 destroy(s,x);
 act(s,'replaceEscape',a=>a.shield===shield.uid);
 assert.ok(inZone(s,0,'battle',x)&&inZone(s,0,'hand',shield));
 assert.ok(!s.decision);
});

test('Every Celeb sees the same first opposing tap, including after resuming',()=>{
 let s=setup();s.active=1;
 add(s,0,'battle',CELEB);
 add(s,0,'battle',CELEB);
 const x=add(s,1,'battle',NATURE),top=s.players[0].deck.slice(0,2);
 attack(s,x.uid);
 assert.equal(s.decision.type,'effectOrder');
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect');
 pick(s,true);
 pick(s,true);
 assert.ok(top.every(y=>inZone(s,0,'shields',y)));
});

test('RYOMA checks the current mana total for each pending start ability',()=>{
 const s=setup();s.active=1;
 give(s,0,'mana',Array(6).fill(NATURE));
 const first=add(s,0,'mana',RYOMA),second=add(s,0,'mana',RYOMA);
 turnEnd(s);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>s.pendingEffects.find(q=>q.effectId===a.effectId)?.uid===first.uid);
 pick(s,true);
 if(s.decision?.task.op==='g34_Put')pick(s,null);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.find(q=>q.effectId===a.effectId)?.uid===second.uid);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,null);
 drain(s);
 assert.ok(inZone(s,0,'battle',first)&&inZone(s,0,'mana',second));
});

test('A single targeted evolution base leaving gives Jagan PART II exactly one mode',()=>{
 const s=setup();s.active=1;
 const base=inst(FIRE),other=inst(CELEB),host=add(s,0,'battle',JA,{under:[base,other]});
 const spell=add(s,1,'hand','dmbd16-009'),top=s.players[0].deck[0];
 act(s,'play',a=>a.uid===spell.uid&&a.face===1);
 act(s,'effect',a=>a.targets?.some(y=>y.uid===base.uid));
 assert.equal(s.decision.source,JA);
 pick(s,0);
 assert.ok(!s.decision&&host.under.length===1&&host.under[0]===other);
 assert.ok(inZone(s,0,'grave',base)&&inZone(s,0,'shields',top));
});
