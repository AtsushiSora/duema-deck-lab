import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DEATH='dm25rp2-040',MATATA='dm25rp2-020',BUCKET='dm25rp2-044';
const NATURE='dm01-108',FIRE='dm01-097';
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

test('five official prints match the three canonical names, stats, text, images and limits',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1128.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(c=>c.id),[DEATH,MATATA,BUCKET]);
 assert.equal(manifest.printAliases.length,2);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,detail={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(detail,{phase:1128}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.get(row.id).supported,true);
  assert.equal(e.card(id).limit,manifest.regulationVerification.limits[row.id]);
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1128}));
 }
});

for(const mode of ['self','NEO','evolution','ordinary','opponent','decline','empty'])test('Deathlios attack watcher: '+mode,()=>{
 const s=setup(),watcher=add(s,0,'battle',DEATH);
 const id=['NEO','decline','empty'].includes(mode)?'dm25rp2-052':mode==='evolution'?'dm02-024':NATURE;
 const owner=mode==='opponent'?1:0;
 const attacker=mode==='self'?watcher:add(s,owner,'battle',id);
 if(mode==='evolution'){
  // A conventional evolution qualifies even though it has no NEO prefix.
  attacker.under=[inst('dm01-083')];
  assert.ok(e.isEvolution(attacker));
 }
 s.active=owner;
 const discard=mode==='empty'?null:add(s,0,'hand',FIRE),top=s.players[0].deck.slice(0,2);
 attack(s,attacker.uid);
 const triggers=['self','NEO','evolution','decline'].includes(mode);
 if(triggers){
  assert.equal(s.decision.task.op,'g34_DiscardDraw');
  pick(s,mode==='decline'?null:discard.uid);
 }else assert.notEqual(s.decision?.source,DEATH);
 assert.equal(top.every(x=>inZone(s,0,'hand',x)),triggers&&mode!=='decline');
 if(discard)assert.equal(inZone(s,0,'grave',discard),triggers&&mode!=='decline');
 drain(s);
});

for(const id of [DEATH,MATATA])test(id+' G-NEO replaces destruction with the full departure of its bases',()=>{
 const s=setup();s.active=1;
 const host=add(s,0,'battle',id,{under:[{...inst(FIRE),under:[inst(NATURE)]}]});
 const [base,nested]=[host.under[0],host.under[0].under[0]];
 assert.equal(e.effectiveCard(host,s).gNeo,true);
 play(s,'dm01-027');
 act(s,'effect',a=>a.targets.some(x=>x.uid===host.uid));
 drain(s);
 assert.ok(inZone(s,0,'battle',host)&&!e.isEvolution(host));
 assert.ok(inZone(s,0,'grave',base)&&inZone(s,0,'grave',nested));
});

test('MATATA uses Mach Fighter to attack an untapped creature on its summon turn',()=>{
 const s=setup(),enemy=add(s,1,'battle',NATURE),host=play(s,MATATA);
 if(s.decision?.type==='evolution')act(s,'evolve',a=>!a.baseUid);
 const top=s.players[0].deck.slice(0,2),mana=s.players[0].mana.length;
 attack(s,host.uid,enemy.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.ok(inZone(s,1,'grave',enemy));
 assert.equal(s.players[0].mana.length,mana+2);
 assert.equal(s.decision.task.op,'g34_Select');
 assert.ok(!values(s).includes(null));
 pick(s,top[0].uid);
 assert.equal(s.players[0].mana.length,mana+1);
 assert.ok(inZone(s,0,'mana',top[1])&&host.under.includes(top[0])&&e.isEvolution(host));
});

test('MATATA cannot put mana under itself when lost in battle before the attack ends',()=>{
 const s=setup(),host=add(s,0,'battle',MATATA),enemy=add(s,1,'battle','dm25rp2-041',{tapped:true});
 const mana=s.players[0].mana.length;
 attack(s,host.uid,enemy.uid);
 drain(s);
 assert.ok(inZone(s,0,'grave',host));
 assert.equal(s.players[0].mana.length,mana);
});

test('BUCKET chooses its arrival position after declaring S-Trigger',()=>{
 for(const tap of [true,false]){
  const s=setup(),attacker=add(s,0,'battle',NATURE);
  give(s,1,'shields',[BUCKET]);
  const shield=s.players[1].shields[0];
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  act(s,'useTrigger',a=>a.uid===shield.uid);
  act(s,'triggerEvolve',a=>!a.baseUid);
  assert.equal(s.decision.task.op,'g34_EntryTap432');
  pick(s,tap);
  drain(s);
  assert.ok(inZone(s,1,'battle',shield));
  assert.equal(!!shield.tapped,tap);
 }
});

test('BUCKET limits opposing attacks to any legal creature, without requiring an attack',()=>{
 const s=setup(),attacker=add(s,0,'battle',NATURE),bucket=add(s,1,'battle',BUCKET,{tapped:true});
 const other=add(s,1,'battle',FIRE,{tapped:true});
 s.phase='attack';
 const attacks=()=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===attacker.uid);
 assert.deepEqual([...new Set(attacks().map(a=>a.target))].sort(),[bucket.uid,other.uid].sort());
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 bucket.tapped=false;
 assert.ok(attacks().every(a=>a.target===other.uid));
 other.tapped=false;
 assert.ok(attacks().some(a=>a.target==='player'));
 bucket.tapped=true;
 bucket.g35Ignored=s.turn;
 assert.ok(attacks().some(a=>a.target==='player'));
});

test('BUCKET gains a fixed T-breaker at three physical cards, including face-down layers',()=>{
 const s=setup(),base=add(s,0,'battle',FIRE,{under:[{...inst(NATURE),faceDown:true}]});
 const host=play(s,BUCKET);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.decision.task.op,'g34_EntryTap432');
 pick(s,false);
 assert.equal(e.power(host,false,s),15000);
 assert.equal(e.effectiveCard(host,s).breaker,3);
 base.under.pop();
 assert.equal(e.power(host,false,s),5000);
 assert.equal(e.effectiveCard(host,s).breaker,undefined);
});

test('MATATA still ramps while Apul prevents the subsequent move out of mana',()=>{
 const s=setup(),host=add(s,0,'battle',MATATA),apul=add(s,1,'battle','dmrp22-042');
 const top=s.players[0].deck.slice(0,2);
 attack(s,host.uid);
 drain(s);
 assert.ok(top.every(x=>inZone(s,0,'mana',x)));
 assert.ok(inZone(s,1,'battle',apul)&&!e.isEvolution(host));
});

test('BUCKET inherits a tapped evolution base and skips a redundant arrival choice',()=>{
 const s=setup(),base=add(s,0,'battle',FIRE,{tapped:true}),host=play(s,BUCKET);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.decision,null);
 assert.ok(host.tapped&&e.isEvolution(host));
});

test('MATATA survives a losing battle with G-NEO and can rebuild at attack end',()=>{
 const s=setup(),base=inst(FIRE),host=add(s,0,'battle',MATATA,{under:[base]});
 const enemy=add(s,1,'battle','dm25rp2-041',{tapped:true}),top=s.players[0].deck[0];
 attack(s,host.uid,enemy.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.ok(inZone(s,0,'battle',host)&&inZone(s,0,'grave',base));
 assert.equal(s.decision.task.op,'g34_Select');
 pick(s,top.uid);
 assert.ok(e.isEvolution(host)&&host.under.includes(top));
});
