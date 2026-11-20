import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const GYOU='dmex15-b009',SONIC='dmrp04s-004',REPRINT='dm22rp1-TR7';
const FEATHER='dm01-092',KEN='dm35-004',BELLA='dmbd10-009',HALKAS='dm01-080',FIRE='dm01-097';
const GENMU='dmrp15-km1',KIINARY='dm23bd1-007',DIVER='dmrp18-003',DEMON='dm01-027';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const opts=s=>s.decision?.choices?.map(y=>y.value)??[];
const pick=(s,value)=>act(s,'extended',a=>(opts(s)[a.choice]?.uid??opts(s)[a.choice])===value);
const replace=(s,mode)=>act(s,'entryReplacement1364',a=>s.decision.options[a.choice].mode===mode);
function add(s,p,zone,id){
 const x=inst(id);s.players[p][zone].push(x);return x;
}
function field(){
 const s=setup();s.turn=3;
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(FIRE));
 return s;
}
function play(s,p,id){
 s.active=p;s.phase='main';
 const x=add(s,p,'hand',id);
 // Inspect all entry decisions, including Just Diver, before helper auto-resolution.
 const a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&!a.alternative);
 assert.ok(a,id+' '+JSON.stringify(s.decision));
 e.step(s,a);
 return x;
}

test('official prints resolve to the two canonical names and preserve declared mana and limits',()=>{
 const m=read('tools/support-phase-1364.json'),db=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){
  const print=[...details.cards,...details.printAliases].find(x=>x.id===row.id);
  assert.deepEqual(standardCardSpec(print,{phase:1364}),row.spec);
  assert.deepEqual(print.faces,row.faces);
  const bad=structuredClone(print);
  bad.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(bad,{phase:1364}));
  assert.equal(e.card(row.canonicalId??row.id).limit,4);
  assert.equal(e.card(row.canonicalId??row.id).manaValue,1);
 }
 for(const row of m.cards){
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
 }
 assert.deepEqual(db.resolveRows([{id:GYOU,count:1},{id:REPRINT,count:1}]),[{id:GYOU,count:2}]);
});

test('QA 40958 uses Feather as the opponent source even when Gyou controller chooses Kengeki',()=>{
 for(const controller of [0,1]){
  let s=field();const gyou=play(s,controller,GYOU),ken=add(s,controller,'battle',KEN);
  const feather=play(s,1-controller,FEATHER);
  assert.equal(s.decision.player,controller);
  assert.ok(opts(s).includes(ken.uid));
  assert.ok(!opts(s).includes(feather.uid));
  s=JSON.parse(JSON.stringify(s));
  pick(s,ken.uid);
  assert.equal(s.winner,controller);
  assert.ok(has(s,controller,'battle',ken)&&has(s,controller,'battle',gyou));
 }
});

test('QA 39776 sacrifices Belladonna itself while Gyou chooses its effect',()=>{
 const s=field(),gyou=play(s,0,GYOU),bella=play(s,1,BELLA);
 assert.equal(s.decision.player,0);
 pick(s,true);
 assert.ok(has(s,1,'grave',bella)&&has(s,0,'battle',gyou));
 const n=s.players[0].mana.length;
 pick(s,'ramp');drain(s);
 assert.equal(s.players[0].mana.length,n+1);
});

test('Gyou revives the selected opposing grave creature tapped and uses its intervening entry trigger',()=>{
 const s=field();
 play(s,0,GYOU);
 const revive=add(s,1,'grave',HALKAS);
 const priorDraws=s.players[0].hand.length;
 s.active=0;s.phase='attack';act(s,'endTurn');
 assert.equal(s.active,1);
 assert.equal(s.decision.player,0);
 assert.ok(opts(s).some(x=>x?.uid===revive.uid));
 pick(s,revive.uid);
 assert.ok(has(s,1,'battle',revive)&&revive.tapped);
 assert.equal(s.decision.player,0);
 act(s,'draw',a=>a.n===1);
 assert.equal(s.players[0].hand.length,priorDraws+1);
});

test('QA 39771 uses Sonic first on the creature side’s turn and Gyou first on the other turn',()=>{
 const s=field();
 play(s,0,GYOU);play(s,1,SONIC);
 play(s,1,HALKAS);
 assert.equal(s.decision.type,'entryReplacement1364');
 assert.equal(s.decision.player,1);
 replace(s,'sonic');
 assert.equal(s.decision.type,'effectOrder');
 assert.equal(s.decision.player,1);
 assert.equal(e.getLegalActions(s).filter(a=>a.kind==='orderEffect').length,2);
 while(s.decision){assert.equal(s.decision.player,1);e.step(s,e.getLegalActions(s)[0]);}
 play(s,1,HALKAS);
 assert.equal(s.decision.type,'draw');
 assert.equal(s.decision.player,0);
 drain(s);
 const revived=add(s,1,'grave',HALKAS);
 s.active=0;s.phase='attack';act(s,'endTurn');
 // Declining the optional replacement leaves the opponent's mandatory one available.
 pick(s,revived.uid);
 assert.equal(s.decision.player,1);
 replace(s,'decline');
 assert.equal(s.decision.type,'draw');
 assert.equal(s.decision.player,0);
});

test('QA 39768 gives Gyou no trigger when Genmu ignores the source',()=>{
 const s=field();
 play(s,0,GYOU);add(s,0,'battle',GENMU);
 play(s,1,HALKAS);
 assert.equal(s.decision,null);
});

test('same-side Kiinary and Gyou leave a choice of the applicable replacement',()=>{
 const s=field();
 play(s,0,GYOU);
 add(s,0,'battle',KIINARY);
 play(s,1,HALKAS);
 assert.equal(s.decision.type,'entryReplacement1364');
 assert.equal(s.decision.player,0);
 replace(s,'silence');
 assert.equal(s.decision,null);
 play(s,1,HALKAS);
 replace(s,'gyou');
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.type,'draw');
});

test('QA 39868 reverses Just Diver choice protection and retains the unattackable part through saves',()=>{
 let s=field();const gyou=play(s,0,GYOU);
 const diver=play(s,1,DIVER);
 drain(s);
 assert.equal(diver.justDiverActive,undefined);
 assert.equal(e.effectiveCard(diver,s).cannotBeAttacked,true);
 // A self-targeting creature effect cannot choose the stolen Just Diver source.
 s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==gyou.uid);
 play(s,1,'dmrp21-010');
 assert.ok(!opts(s).some(x=>(x?.uid??x)===diver.uid));
 drain(s);
 s.players[0].battle.push(gyou);
 s=JSON.parse(JSON.stringify(s));
 const saved=s.players[1].battle.find(x=>x.uid===diver.uid);
 assert.equal(e.effectiveCard(saved,s).cannotBeAttacked,true);
 s.active=0;s.phase='attack';
 const attacker=add(s,0,'battle','dm01-s01');saved.tapped=true;
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===saved.uid));
 s.phase='main';
 play(s,0,DEMON);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='effect'&&a.targets.some(t=>t.uid===saved.uid)));
});

test('Sonic can decline an early entry and double a later entry, once for each copy each turn',()=>{
 const s=field();play(s,0,SONIC);
 play(s,0,HALKAS);
 replace(s,'decline');act(s,'draw',a=>a.n===0);
 play(s,0,HALKAS);
 replace(s,'sonic');
 assert.equal(s.decision.type,'effectOrder');
 drain(s);
 play(s,0,HALKAS);
 assert.equal(s.decision.type,'draw');
 act(s,'draw',a=>a.n===0);
 play(s,0,SONIC);
 play(s,0,HALKAS);
 replace(s,'sonic');drain(s);
 assert.equal(Object.keys(s.once).filter(k=>k.startsWith('sonic:')).length,2);
});

test('Gyou does not take an unrelated watcher or stop a tamaseed that is not a creature',()=>{
 const s=field();play(s,0,GYOU);
 add(s,1,'battle','dmex18-s07');
 give(s,1,'deck',Array(10).fill(FIRE));
 const before=s.players[1].deck.length;
 play(s,1,'dm08-049');
 assert.equal(s.decision.player,1);
 pick(s,true);
 drain(s);
 assert.ok(s.players[1].deck.length<before);
 const t=field();play(t,0,GYOU);
 add(t,0,'battle',FIRE);
 play(t,1,'dm22rp1-2B');
 assert.equal(t.decision.player,1);
});

test('QA 41317 lets the Gyou player discard Apollo sources and break the original owner’s shields',()=>{
 const s=field();play(s,0,GYOU);
 // The original legal ultimate evolution fixture uses Star evolution sources.
 const base=add(s,1,'battle','dmsd21-012');
 base.under=[inst(FIRE),inst(FIRE),inst(FIRE)];
 const apollo=add(s,1,'hand','dmex17-013');
 s.active=1;s.phase='main';
 const action=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===apollo.uid);
 assert.ok(action);
 e.step(s,action);
 if(s.decision?.type==='evolution')act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.decision?.player,0);
 pick(s,true);
 const sources=opts(s).slice(0,3);
 for(const uid of sources)pick(s,uid);
 drain(s);
 assert.equal(s.players[1].shields.length,0);
 assert.ok(s.players[1].grave.some(x=>x.uid===base.uid));
 assert.ok(s.players[0].shields.length>0);
});

test('QA 41171 excludes Heaven Kid itself after the entry ability changes user',()=>{
 const s=field();play(s,0,GYOU);
 add(s,1,'battle',FIRE);
 const kid=play(s,1,'dmrp21-010');
 assert.equal(s.decision.player,0);
 assert.ok(!opts(s).some(x=>(x?.uid??x)===kid.uid));
 assert.ok(opts(s).length);
});

test('a stolen Rozia entry returns a weapon which cannot attach to an opposing creature',()=>{
 const s=field();s.format='advance';
 play(s,0,GYOU);
 const weapon=add(s,0,'extra','dmr13-045');
 const rozia=play(s,1,'dmr16s-007');
 assert.equal(s.decision.player,0);
 assert.ok(opts(s).includes(weapon.uid));
 pick(s,weapon.uid);
 drain(s);
 assert.ok(has(s,0,'extra',weapon));
 assert.ok(has(s,1,'battle',rozia));
 assert.equal(weapon.weaponTo,undefined);
});

test('turn-player ordering rights stay with the entrant after Gyou takes its entry ability',()=>{
 const s=field();play(s,0,GYOU);
 // A real battle-zone watcher leaves a second trigger with the entrant’s player.
 add(s,1,'battle','dm24ex2-019');
 const before=s.players[0].hand.length;
 const entered=play(s,1,'dmex17-021');
 assert.equal(s.decision.type,'effectOrder');
 assert.equal(s.decision.player,1);
 const row=s.pendingEffects.find(x=>x.uid===entered.uid&&x.g1364Resolver===0);
 assert.ok(row);
 act(s,'orderEffect',a=>a.effectId===row.effectId);
 assert.equal(s.players[0].hand.length,before+2);
 if(s.decision)assert.equal(s.decision.player,1);
});

test('Sonic replacement choice survives saving and resets at the next real turn',()=>{
 let s=field();const sonic=play(s,0,SONIC);
 play(s,0,HALKAS);
 const pending=JSON.stringify(e.getLegalActions(s));
 s=JSON.parse(JSON.stringify(s));
 assert.equal(JSON.stringify(e.getLegalActions(s)),pending);
 replace(s,'sonic');drain(s);
 s.phase='attack';act(s,'endTurn');
 s.phase='attack';act(s,'endTurn');
 play(s,0,HALKAS);
 assert.equal(s.decision.type,'entryReplacement1364');
 replace(s,'sonic');drain(s);
 assert.ok(s.players[0].battle.some(x=>x.uid===sonic.uid));
});
