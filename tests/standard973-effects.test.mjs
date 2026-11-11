import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const VOO='dmrp05-006',DAGON='dmrp02-027',PAR='dmrp04s-037',JUL='dmrp03-026',SPELLSHIP='dmrp04m-003';
const GREEN='dm01-108',BLUE='dm01-083',DEATH='dm01-027',BOUNCE='dm01-086';
const MADO='dmrp07-076',MADO_SPELL='dmrp07-071',LOCK='dmrp22-042',MOU='dmrp12-076';
const TWIN='dm23ex3-024',INFERNO='dmc44-001';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

function field(){
 const s=setup();s.active=0;
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(GREEN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

test('Phase 973 verifies five canonical cards and the Voomira reprint',()=>{
 const m=read('tools/support-phase-973.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[VOO,DAGON,PAR,JUL,SPELLSHIP]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmex08-206',VOO]]);
 for(const row of m.cards){
  const {id}=row,f=row.faces[0],d={...row,status:'complete'},c=e.card(id);
  assert.deepEqual(standardCardSpec(d,{phase:973}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:972}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:973}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations.filter(x=>x!=='無色'),1,4]);
  assert.equal(c.supportBatch,'phase-973');
  assert.equal(CARD_IMAGES[id],row.image);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
 for(const {id,canonicalId,faces} of m.printAliases){
  assert.deepEqual(catalogue.resolveRows([{id,count:1},{id:canonicalId,count:1}]),[{id:canonicalId,count:2}]);
  assert.deepEqual(standardCardSpec({id,faces,status:'complete'},{phase:973}),m.cards.find(row=>row.id===canonicalId).spec);
 }
 const rows=[...m.cards,...m.printAliases];
 for(const row of rows){
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[row.canonicalId??row.id,row.image]]);
 }
});

for(const accept of [true,false])test('Voomira may mill exactly three cards on entry '+accept,()=>{
 const s=field(),before=s.players[0].deck.slice(0,3).map(x=>x.uid);
 cast(s,VOO);
 assert.match(s.decision.title,/3枚/);
 pick(s,accept?true:null);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),accept?before:[]);
 assert.equal(s.players[0].deck.length,accept?17:20);
});

const gravePlays=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.origin==='grave'&&a.uid===x.uid);
const permit=x=>'g450:'+x.uid+'@'+(x.incarnation||0);

test('Voomira allows a paid Magic Tool summon once for each provider and refreshes next turn',()=>{
 let s=field();
 const first=put(s,0,'battle',VOO),second=put(s,0,'battle',VOO);
 const x=put(s,0,'grave',MADO),y=put(s,0,'grave',MADO),z=put(s,0,'grave',MADO);
 const initial=physical(s);
 assert.deepEqual(gravePlays(s,x).map(a=>a.manaPermit),[permit(first),permit(second)]);
 s=restore(s);
 act(s,'play',a=>a.uid===x.uid&&a.manaPermit===permit(second));
 assert.ok(inZone(s,0,'battle',x));
 assert.deepEqual(gravePlays(s,y).map(a=>a.manaPermit),[permit(first)]);
 act(s,'play',a=>a.uid===y.uid&&a.manaPermit===permit(first));
 assert.equal(s.players[0].mana.filter(q=>q.tapped).length,2*e.card(MADO).cost);
 assert.deepEqual(gravePlays(s,z),[]);
 assert.deepEqual(physical(s),initial);
 end(s);end(s);s.phase='main';
 assert.deepEqual(gravePlays(s,z).map(a=>a.manaPermit),[permit(first),permit(second)]);
});

test('Voomira rejects spells, other creatures, opposing turns and blocked grave movement',()=>{
 const s=field();
 const x=put(s,0,'grave',MADO),spell=put(s,0,'grave',MADO_SPELL),other=put(s,0,'grave',BLUE);
 put(s,0,'battle',VOO);
 assert.equal(gravePlays(s,x).length,1);
 assert.deepEqual(gravePlays(s,spell),[]);
 assert.deepEqual(gravePlays(s,other),[]);
 s.active=1;
 assert.deepEqual(gravePlays(s,x),[]);
 s.active=0;
 put(s,1,'battle',LOCK);
 assert.deepEqual(gravePlays(s,x),[]);
});

test('Dagonsim makes exactly one other ally larger and gives it two additional shield breaks',()=>{
 let s=field();
 const source=put(s,0,'battle',DAGON),ally=put(s,0,'battle',GREEN),other=put(s,0,'battle',BLUE);
 const enemy=put(s,1,'battle',BLUE,{tapped:true});
 attack(s,source.uid,enemy.uid);
 assert.deepEqual(s.decision.choices.map(value),[ally.uid,other.uid]);
 s=restore(s);
 pick(s,ally.uid);
 act(s,'noBlock');
 const current=s.players[0].battle.find(x=>x.uid===ally.uid);
 assert.equal(e.power(current,false,s),e.card(ally).power+12000);
 assert.equal(e.effectiveCard(current,s).extraBreak,2);
 assert.equal(e.effectiveCard(s.players[0].battle.find(x=>x.uid===other.uid),s).extraBreak??0,0);
 attack(s,ally.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 end(s);end(s);
 assert.equal(e.power(current,false,s),e.card(ally).power);
 assert.equal(e.effectiveCard(current,s).extraBreak??0,0);
});

test('Dagonsim continues its attack when it has no other ally',()=>{
 const s=field(),source=put(s,0,'battle',DAGON);
 s.phase='attack';
 const action=e.getLegalActions(s).find(a=>a.kind==='attack'&&a.uid===source.uid&&a.shield===s.players[1].shields[0].uid);
 assert.ok(action);
 e.step(s,action);
 assert.notEqual(s.decision?.type,'extended');
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Parnole counts itself and other matching physical cards in its own grave after destruction',()=>{
 const s=field(),x=put(s,0,'battle',PAR),second=put(s,0,'grave',PAR);
 put(s,0,'grave',BLUE);
 put(s,1,'grave',PAR);
 const draw=s.players[0].deck.slice(0,2).map(y=>y.uid);
 s.active=1;
 cast(s,DEATH);
 act(s,'effect',a=>a.targets[0].uid===x.uid);
 assert.ok(inZone(s,0,'grave',x)&&inZone(s,0,'grave',second));
 assert.deepEqual(s.players[0].hand.map(y=>y.uid),draw);
});

test('Parnole does not draw when returned to hand',()=>{
 const s=field(),x=put(s,0,'battle',PAR);
 s.active=1;
 cast(s,BOUNCE);
 act(s,'effect',a=>a.targets[0].uid===x.uid);
 assert.deepEqual(s.players[0].hand.map(y=>y.uid),[x.uid]);
});

test('Julange stays on its own summon and opposing summons, then moves on an allied summon',()=>{
 const s=field(),jul=put(s,0,'hand',JUL);
 act(s,'play',a=>a.uid===jul.uid);
 assert.ok(inZone(s,0,'battle',jul));
 s.active=1;cast(s,BLUE);
 assert.ok(inZone(s,0,'battle',jul));
 s.active=0;cast(s,BLUE);
 assert.ok(inZone(s,0,'mana',jul));
 assert.equal(s.players[0].mana.find(x=>x.uid===jul.uid).tapped,false);
});

test('Julange ignores an allied creature placed by an effect without summoning',()=>{
 const s=field(),jul=put(s,0,'battle',JUL);
 put(s,0,'grave',MADO);
 cast(s,INFERNO);
 pick(s,s.players[0].grave[0].uid);
 assert.ok(inZone(s,0,'battle',jul));
 assert.ok(s.players[0].battle.some(x=>x.cardId===MADO));
});

test('Julange breaks every opposing shield when its attack succeeds',()=>{
 const s=field(),jul=put(s,0,'battle',JUL);
 attack(s,jul.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,0);
});

test('Spell Ebeat mills before recovering a newly milled spell and retains blocker',()=>{
 let s=field();
 const x=put(s,0,'hand',SPELLSHIP),top=inst(TWIN);
 s.players[0].deck.unshift(top);
 put(s,0,'grave',BLUE);
 put(s,0,'grave',BOUNCE);
 const initial=physical(s);
 act(s,'play',a=>a.uid===x.uid);
 assert.equal(e.effectiveCard(s.players[0].battle[0],s).blocker,true);
 assert.ok(inZone(s,0,'grave',top));
 assert.deepEqual(new Set(s.decision.choices.map(value)),new Set([top.uid,s.players[0].grave.find(y=>y.cardId===BOUNCE).uid]));
 s=restore(s);
 pick(s,top.uid);
 assert.ok(inZone(s,0,'hand',top));
 assert.deepEqual(physical(s),initial);
});

test('Spell Ebeat watches other allied Muutopia but neither unrelated nor opposing entries',()=>{
 const s=field();
 put(s,0,'battle',SPELLSHIP);
 cast(s,BLUE);
 assert.equal(s.players[0].deck.length,20);
 s.active=1;cast(s,MOU);drain(s);
 assert.equal(s.players[0].deck.length,20);
 s.active=0;cast(s,MOU);drain(s);
 assert.equal(s.players[0].deck.length,19);
 assert.equal(s.players[0].grave.length,1);
});

test('Spell Ebeat can block an opposing attack in the ordinary blocker window',()=>{
 const s=field(),ship=put(s,0,'battle',SPELLSHIP),enemy=put(s,1,'battle',BLUE);
 s.active=1;
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===ship.uid);
 drain(s);
 assert.ok(inZone(s,1,'grave',enemy));
 assert.equal(s.players[0].shields.length,5);
});
