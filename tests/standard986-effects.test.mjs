import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const VESP='dmr14-031',MEDAL='dmr14-007',STRIKE='dmr14-027',SOUL='dmr16g-005',SPA='dmr16g-007';
const PRINTS=[['dmr16s-006',SOUL],['dmr16s-008',SPA]];
const NATURE='dm01-108',FIRE='dm01-097',WATER='dm01-083',LIGHT='dm01-075',TWIN='dm22ex1-074';
const BELL='dmr16g-016',BIG='dm01-001',IMMUNE='dm11-s01',SEED='dm22ex1-086',CLASH='dmrp19-085';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 986 registers five official definitions and maps both reprints to their canonical IDs',()=>{
 const m=read('tools/support-phase-986.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[VESP,MEDAL,STRIKE,SOUL,SPA]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),
  [{id:SOUL,count:1},{id:SPA,count:1}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:986}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:986}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,[STRIKE].includes(id)?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-986');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId??row.id,row.image]]);
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:986}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

const find=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const manaTapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
function seal(s,p,host,under=BELL){
 host.sealed=true;
 return put(s,p,'seals',under,{sealOf:host.uid,faceDown:true});
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Vesptox sends the creature that defeated it to mana without choosing it (QA 40374)',()=>{
 const s=field(),vesp=put(s,0,'battle',VESP,{tapped:true}),attacker=put(s,1,'battle',IMMUNE);
 s.active=1;
 assert.equal(e.effectiveCard(attacker,s).untargetable,true);
 const all=physical(s);
 attack(s,attacker.uid,vesp.uid);
 act(s,'noBlock');
 assert.ok(has(s,0,'grave',vesp)&&has(s,1,'mana',attacker));
 assert.equal(s.decision,null);
 assert.deepEqual(physical(s),all);
});

test('Vesptox watches effect battles and moves only an opposing winner while tapped',()=>{
 for(const mode of ['tapped','untapped','sealed','tie','friendlyWin']){
  const s=field(),watcher=put(s,0,'battle',VESP,{tapped:mode!=='untapped'});
  if(mode==='sealed')seal(s,0,watcher);
  const opponent=put(s,1,'battle',mode==='friendlyWin'||mode==='tie'?FIRE:BIG);
  const friend=put(s,0,'battle',mode==='friendlyWin'?BIG:FIRE);
  play(s,CLASH);
  pick(s,opponent.uid);
  pick(s,friend.uid);
  assert.equal(has(s,1,'mana',opponent),mode==='tapped');
  assert.equal(has(s,1,'grave',opponent),mode==='tie'||mode==='friendlyWin');
  assert.ok(has(s,0,'battle',watcher));
 }
});

test('Vesptox checks its live tap state after selecting a battle result ability across JSON',()=>{
 for(const tapped of [false,true]){
  let s=field();
  const one=put(s,0,'battle',VESP,{tapped:!tapped}),two=put(s,0,'battle',VESP);
  const defender=put(s,0,'battle',NATURE,{tapped:true}),attacker=put(s,1,'battle',BIG);
  s.active=1;
  attack(s,attacker.uid,defender.uid);
  act(s,'noBlock');
  assert.equal(s.decision.type,'battleWinOrder');
  assert.equal(s.decision.player,0);
  assert.deepEqual(e.getLegalActions(s).map(a=>a.uid),[one.uid,two.uid]);
  s=restore(s);
  find(s,0,'battle',one).tapped=tapped;
  act(s,'battleWinOrder',a=>a.uid===one.uid);
  assert.equal(has(s,1,'mana',attacker),tapped);
  assert.equal(has(s,1,'battle',attacker),!tapped);
 }
});

test('Medalo grants Blocker at five Light mana, includes itself, and updates when mana or source leaves',()=>{
 const s=field(),ally=put(s,0,'battle',FIRE),seed=put(s,0,'battle',SEED),enemy=put(s,1,'battle',FIRE);
 give(s,0,'mana',[LIGHT,LIGHT,LIGHT,LIGHT,FIRE]);
 const medalo=play(s,MEDAL);
 const blocker=x=>!!e.effectiveCard(x,s).blocker;
 assert.ok(!blocker(medalo)&&!blocker(ally));
 const multicolor=data.cards.find(c=>e.civilizations(c).includes('光')&&e.civilizations(c).length===2);
 const fifth=put(s,0,'mana',multicolor.id,{tapped:true});
 assert.ok(blocker(medalo)&&blocker(ally)&&!blocker(enemy)&&!blocker(seed));
 s.active=1;
 attack(s,enemy.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid),[ally.uid,medalo.uid]);
 act(s,'block',a=>a.uid===ally.uid);
 s.players[0].mana=s.players[0].mana.filter(x=>x.uid!==fifth.uid);
 assert.ok(!blocker(medalo));
 s.players[0].mana.push(fifth);
 assert.ok(blocker(medalo));
 s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==medalo.uid);
 assert.ok(!blocker(medalo));
});

test('Medalo cannot be chosen by opponent effects and can be attacked or blocked normally',()=>{
 const s=field(),medalo=put(s,0,'battle',MEDAL,{tapped:true}),other=put(s,0,'battle',FIRE);
 const enemy=put(s,1,'battle',BIG);
 s.active=1;
 give(s,1,'grave',[FIRE]);
 play(s,STRIKE);
 assert.deepEqual(choices(s),[other.uid]);
 pick(s,other.uid);
 attack(s,enemy.uid,medalo.uid);
 act(s,'noBlock');
 assert.ok(has(s,0,'grave',medalo));
 const t=field(),self=put(t,0,'battle',MEDAL),blocker=put(t,1,'battle',BIG);
 attack(t,self.uid);
 act(t,'block',a=>a.uid===blocker.uid);
 assert.ok(has(t,0,'grave',self));
});

test('Strike fixes power at resolution, counts one Twinpact creature, and ignores spells and the opponent grave',()=>{
 let s=field();
 const target=put(s,1,'battle',BIG),ally=put(s,0,'battle',FIRE),protectedFoe=put(s,1,'battle',IMMUNE);
 give(s,0,'grave',[FIRE,TWIN,CLASH]);
 give(s,1,'grave',[VESP,BIG]);
 play(s,STRIKE);
 assert.deepEqual(choices(s),[target.uid]);
 s=restore(s);
 pick(s,target.uid);
 const body=find(s,1,'battle',target);
 assert.equal(e.power(body,false,s),7000);
 put(s,0,'grave',WATER);
 assert.equal(e.power(body,false,s),7000);
 assert.equal(e.power(find(s,0,'battle',ally),false,s),2000);
 assert.equal(e.power(find(s,1,'battle',protectedFoe),false,s),8000);
 end(s);
 assert.equal(e.power(body,false,s),9000);
});

test('Strike requires a legal target with an empty creature grave and destroys at zero by rule when triggered',()=>{
 for(const triggered of [false,true]){
  const s=field(),target=put(s,1,'battle',FIRE);
  if(triggered){
   s.active=1;
   give(s,0,'grave',[WATER,TWIN]);
   give(s,0,'shields',[STRIKE]);
   attack(s,target.uid);
   act(s,'noBlock');
   act(s,'useTrigger');
  }else{
   give(s,0,'grave',[CLASH]);
   play(s,STRIKE);
  }
  assert.deepEqual(choices(s),[target.uid]);
  pick(s,target.uid);
  assert.equal(has(s,1,'grave',target),triggered);
  assert.equal(manaTapped(s,0),triggered?0:3);
 }
});

test('Soulgard and Spageria only gain Shield Trigger at five mana of their own color',()=>{
 for(const [id,colorId] of [[SOUL,LIGHT],[SPA,WATER]])for(const count of [4,5]){
  let s=field();
  s.active=1;
  give(s,0,'mana',[...Array(count).fill(colorId),...Array(8-count).fill(FIRE)]);
  s.players[0].mana[0].tapped=true;
  give(s,0,'shields',[id]);
  const source=s.players[0].shields[0],attacker=put(s,1,'battle',NATURE);
  const all=physical(s);
  attack(s,attacker.uid);
  act(s,'noBlock');
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===source.uid),count===5);
  if(count===5){
   s=restore(s);
   act(s,'useTrigger',a=>a.uid===source.uid);
   assert.deepEqual(choices(s),[attacker.uid]);
   pick(s,attacker.uid);
   assert.ok(has(s,0,'battle',source)&&has(s,1,id===SOUL?'shields':'hand',attacker));
  }else assert.ok(has(s,0,'hand',source));
  assert.equal(manaTapped(s,0),1);
  assert.deepEqual(physical(s),all);
 }
});

test('Soulgard selects only opposing non-evolution cards through cost five and places a separate face-down shield',()=>{
 for(const select of ['base','seal','limit']){
  const s=field(),base=inst(FIRE),deepEvolution=inst(BELL);
  const stack=put(s,1,'battle',BELL,{under:[deepEvolution,base]}),own=put(s,0,'battle',FIRE);
  const high=put(s,1,'battle',BIG),limit=put(s,1,'battle','dmr16s-002'),hidden=seal(s,1,high);
  const old=s.players[1].shields.length,card={base,seal:hidden,limit}[select];
  play(s,SOUL);
  assert.deepEqual(new Set(choices(s)),new Set([base.uid,limit.uid,hidden.uid]));
  assert.equal(s.decision.choices.find(c=>c.value===hidden.uid).cardId,undefined);
  pick(s,card.uid);
  assert.equal(s.players[1].shields.length,old+1);
  assert.ok(!find(s,1,'shields',card).faceUp&&has(s,1,'battle',stack)&&has(s,0,'battle',own));
 }
});

test('Spageria can return either owner’s non-evolution card while leaving an evolution and a higher cost creature in play',()=>{
 for(const owner of [0,1]){
  const s=field(),targets=[put(s,0,'battle',SEED),put(s,1,'battle',NATURE)];
  const higher=put(s,1,'battle',BIG),evolution=put(s,1,'battle',BELL);
  play(s,SPA);
  assert.deepEqual(new Set(choices(s)),new Set(targets.map(x=>x.uid)));
  pick(s,targets[owner].uid);
  assert.ok(has(s,owner,'hand',targets[owner]));
  assert.ok(has(s,1,'battle',higher)&&has(s,1,'battle',evolution));
 }
});

test('Each of the three new Dragons breaks two shields after a normal paid summon',()=>{
 for(const id of [VESP,SOUL,SPA]){
  const s=field(),dragon=play(s,id);
  assert.equal(manaTapped(s,0),7);
  end(s);
  end(s);
  attack(s,dragon.uid);
  act(s,'noBlock');
  drain(s);
  assert.equal(s.players[1].shields.length,3);
 }
});
