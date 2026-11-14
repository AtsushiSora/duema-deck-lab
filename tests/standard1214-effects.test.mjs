import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CARPET='dm23rp2-037',PAR='dm23rp2-S08',DONNA='dm23rp4-012';
const SMALL='dm01-108',BOUNCE='dm01-086',DESTROY='dm01-027',GS='dm23rp2-044';
const ABYSS='dm23rp3-OR1',GIANT='dm23rp1-049',TWIN='dm23rp2-024',REV='dm24ex4-032';
const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(12).fill(SMALL));return s;};
const add=(s,p,zone,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p][zone].push(x);return x;};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const target=(s,x)=>act(s,'effect',a=>a.targets[0]?.uid===x.uid);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const ids=xs=>xs.map(x=>x.uid);
const clone=s=>JSON.parse(JSON.stringify(s));
function pass(s){s.phase='attack';act(s,'endTurn');}
function noBlock(s){if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');}

test('11 official prints resolve to the three active IDs and share four-copy limits',()=>{
 const m=read('support-phase-1214.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[CARPET,PAR,DONNA]);
 assert.deepEqual(m.printAliases.map(x=>x.id),[
  'dm23rp2x-037','dm23rp2x-S08','dm23rp2x-S08X','dm23rp2-08A','dm23rp2x-08A',
  'dm23rp4x-012','dm24ex4-042','dm24ex4-PR002'
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:1214}),row.spec);
  for(const i of d.faces.keys()){
   const changed=structuredClone(d);
   changed.faces[i].abilityText+='\n未知の能力。';
   assert.throws(()=>standardCardSpec(changed,{phase:1214}));
  }
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.equal(catalogue.get(id).supported,true);
  assert.deepEqual([c.manaValue,c.limit,m.regulationVerification.limits[row.id]],[1,4,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
 }
});

test('Carpet can be summoned with Abyss Rush, attack a player, and return to the bottom at end of turn',()=>{
 const s=field(),carpet=add(s,0,'grave',CARPET);
 act(s,'play',a=>a.uid===carpet.uid&&a.origin==='grave');
 assert.ok(has(s,0,'battle',carpet));
 assert.equal(carpet.entered,s.turn);
 attack(s,carpet.uid);noBlock(s);drain(s);
 pass(s);drain(s);
 assert.equal(s.players[0].deck.at(-1).uid,carpet.uid);
});

test('only an opposing spell triggers Carpet, and the caster chooses two distinct cards before discarding',()=>{
 let s=field();add(s,1,'battle',CARPET);
 const choices=[0,1,2].map(()=>add(s,0,'hand',SMALL));
 play(s,add(s,0,'hand','dm06-085'));
 assert.equal(s.decision.player,0);
 assert.ok(s.decision.task.op.startsWith('discard'));
 pick(s,choices[1].uid);
 assert.ok(has(s,0,'hand',choices[1]));
 s=clone(s);pick(s,choices[0].uid);
 assert.ok(has(s,0,'grave',choices[0])&&has(s,0,'grave',choices[1])&&has(s,0,'hand',choices[2]));
 s=field();add(s,0,'battle',CARPET);
 play(s,add(s,0,'hand','dm06-085'));
 assert.equal(s.decision,null);
});

test('Carpet spell checks only the two cards actually milled, can recover an older Abyss, and allows declining',()=>{
 for(const mode of ['mixed','recover','decline']){
  const s=field(),old=add(s,0,'grave',CARPET),spell=add(s,0,'hand',CARPET);
  give(s,0,'deck',[ABYSS,mode==='mixed'?SMALL:CARPET,...Array(8).fill(SMALL)]);
  const [one,two]=s.players[0].deck;
  act(s,'play',a=>a.uid===spell.uid&&a.face===1);
  assert.ok(has(s,0,'grave',one)&&has(s,0,'grave',two));
  if(mode==='mixed')assert.equal(s.decision,null);
  else {
   assert.ok(values(s).includes(old.uid)&&values(s).includes(one.uid)&&values(s).includes(two.uid));
   pick(s,mode==='recover'?old.uid:null);
  }
  assert.equal(has(s,0,'hand',old),mode==='recover');
 }
});

test('ParLife counts only allied Giant creatures for double sympathy and discounts Giant executions to a minimum of one',()=>{
 const s=field(),par=add(s,0,'hand',PAR);
 add(s,0,'battle',GIANT);add(s,0,'battle',TWIN);
 add(s,0,'battle',GIANT,{sealed:true});add(s,0,'battle',SMALL,{under:[inst(GIANT)]});add(s,1,'battle',GIANT);
 const playCost=(x,face=0)=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&(a.face??0)===face)?.cost;
 assert.equal(playCost(par),6);play(s,par);
 const one=add(s,0,'hand',GIANT),twin=add(s,0,'hand',TWIN),plain=add(s,0,'hand',SMALL);
 assert.equal(playCost(one),1);assert.equal(playCost(twin),1);
 assert.equal(playCost(twin,1),6);assert.equal(playCost(plain),2);
});

test('ParLife uses Mach Fighter on its entry turn and offers a draw for each allied Giant attack',()=>{
 const s=field(),par=add(s,0,'hand',PAR),enemy=add(s,1,'battle',SMALL),other=add(s,0,'battle',GIANT);
 play(s,par);s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===par.uid&&a.target==='player'));
 attack(s,par.uid,enemy.uid);pick(s,1);noBlock(s);
 assert.equal(s.players[0].hand.length,1);
 assert.ok(has(s,1,'grave',enemy));
 attack(s,other.uid);pick(s,0);noBlock(s);drain(s);
 assert.equal(s.players[0].hand.length,1);
});

test('ParLife wins only at the beginning of its own turn with at least 18 visible allied creatures',()=>{
 for(const n of [17,18]){
  const s=field();
  add(s,0,'battle',PAR);
  for(let i=1;i<n;i++)add(s,0,'battle',SMALL);
  const sealed=add(s,0,'battle',SMALL,{sealed:true});
  s.players[0].seals=[{...inst(SMALL),faceDown:true,sealOf:sealed.uid}];
  add(s,1,'battle',SMALL);
  pass(s);assert.equal(s.winner,null);
  pass(s);assert.equal(s.winner,n===18?0:null);
 }
});

test('Donna can protect another creature once per turn, and suppresses S Trigger for the returned shield',()=>{
 let s=field();
 const donna=add(s,1,'battle',DONNA),one=add(s,1,'battle',SMALL),two=add(s,1,'battle',SMALL);
 give(s,1,'shields',[DESTROY,SMALL]);
 const [shield]=s.players[1].shields;
 play(s,add(s,0,'hand',BOUNCE));target(s,one);
 s=clone(s);
 act(s,'g1088Kent',a=>a.choice.shield===shield.uid&&a.cardId===DONNA);
 assert.ok(has(s,1,'battle',one)&&has(s,1,'hand',shield));
 assert.equal(s.decision,null);
 play(s,add(s,0,'hand',DESTROY));target(s,two);
 assert.ok(has(s,1,'grave',two)&&has(s,1,'battle',donna));
 assert.equal(s.decision,null);
});

test('Donna excludes itself and can decline without spending its use for the turn',()=>{
 const s=field(),first=add(s,1,'battle',DONNA),second=add(s,1,'battle',DONNA),ally=add(s,1,'battle',SMALL);
 play(s,add(s,0,'hand',DESTROY));target(s,first);
 assert.deepEqual(new Set(e.getLegalActions(s).filter(a=>a.kind==='g1088Kent').map(a=>a.choice.key)),
  new Set(['g1214OtherShieldSaver:'+second.uid+'@0']));
 act(s,'allowLeave');assert.ok(has(s,1,'grave',first));
 play(s,add(s,0,'hand',BOUNCE));target(s,ally);
 act(s,'g1088Kent');assert.ok(has(s,1,'battle',ally));
});

test('Donna can cancel a Revolution Change without moving a shield or spending the turn use',()=>{
 const s=field(),donna=add(s,0,'battle',DONNA),ally=add(s,0,'battle','dm01-075'),incoming=add(s,0,'hand',REV);
 const shieldCount=s.players[0].shields.length;
 attack(s,ally.uid);
 act(s,'extended',a=>a.cardId===REV);pick(s,ally.uid);
 act(s,'g1088Kent');
 assert.equal(s.attack.attacker,ally.uid);
 assert.ok(has(s,0,'battle',donna)&&has(s,0,'hand',incoming));
 assert.equal(s.players[0].shields.length,shieldCount);
 assert.ok(!Object.keys(s.once||{}).some(x=>x.startsWith('g1214OtherShieldSaver:')));
});

test('Donna saves the Z Rush creature from zero power by moving a shield before the next state check',()=>{
 const s=field(),donna=add(s,1,'battle',DONNA),chakra=add(s,1,'battle','dm26rp1-S002');
 give(s,0,'deck',Array(9).fill('dmrp07-076'));
 const shield=s.players[1].shields[0];
 play(s,add(s,0,'hand','dm26ex1-N019'));pick(s,chakra.uid);
 act(s,'g1088Kent',a=>a.choice.shield===shield.uid);
 assert.ok(has(s,1,'battle',donna)&&has(s,1,'battle',chakra)&&has(s,1,'hand',shield));
 assert.equal(e.power(chakra,false,s),1500);
});
