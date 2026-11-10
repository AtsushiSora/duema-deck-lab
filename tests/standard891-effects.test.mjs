import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const PAX='dmrp14-037',JITA='dmrp14-010',JO='dmex14-006';
const SMALL='dm01-108',WATER='dm01-083',BIG='dm05-s04',BROCCOLI='dm10-035',MULTI='dmr02-054';
function field(p=0){
 const s=setup();s.active=p;
 for(const q of [0,1])give(s,q,'deck',Array(20).fill(SMALL));
 return s;
}
function add(s,p,zone,id,props){const x=Object.assign(inst(id),props);s.players[p][zone].push(x);return x;}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===(v?.uid??v));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
function invoke(s,p,defs){
 s.phase='main';s.extTasks=[{op:'g34_Sequence',p,source:PAX,defs}];act(s,'toAttack');
}
function move(s,p,x,to='grave'){
 invoke(s,s.active,[{op:'ExactMove',owner:p,to,target:x.uid,targetIncarnation:x.incarnation||0}]);
}
function sweep(s,p,options={}){invoke(s,s.active,[{op:'Sweep',owner:p===s.active?'self':'opponent',to:'grave',filter:{creature:true},...options}]);}
function seal(s,p,x){x.sealed=true;add(s,p,'seals',SMALL,{faceDown:true,sealOf:x.uid});}
function resolveDraws(s){
 let n=0;
 for(let i=0;s.decision;i++){
  assert.ok(i<60,JSON.stringify(s.decision));
  if(s.decision.type==='effectOrder')act(s,'orderEffect');
  else {assert.equal(s.decision.task.op,'g34_Draw');pick(s,1);n++;}
 }
 return n;
}

test('Phase 891 verifies all official abilities, restrictions, images and original canonical IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-891.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[PAX,JITA,JO]);assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const detail=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:891}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:890}));
  const unknown=structuredClone(detail);unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:891}));
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   [row.id===PAX?'spell':'creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
 const forty={id:'phase891',name:'レインボーナス',cards:[PAX,JITA,JO,SMALL,WATER,BIG,'dm01-076','dm01-090','dm01-027','dm02-024'].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck(forty),[]);assert.equal(registry.coverage(forty).unsupported,0);
});

for(const p of [0,1])test('Pax requires an opponent choice first and permits exactly one friendly choice before simultaneous return '+p,()=>{
 for(const accept of [false,true]){
  let s=field(p),own=add(s,p,'battle',SMALL),extra=add(s,p,'battle',WATER);
  const enemy=add(s,1-p,'battle',SMALL),other=add(s,1-p,'battle',WATER);
  cast(s,PAX);assert.deepEqual(values(s),[enemy.uid,other.uid]);
  pick(s,enemy);assert.ok(has(s,1-p,'battle',enemy));
  assert.deepEqual(values(s),[own.uid,extra.uid,null]);
  const before=ids(s);s=JSON.parse(JSON.stringify(s));
  pick(s,accept?own:null);
  assert.ok(has(s,1-p,'hand',enemy)&&has(s,1-p,'battle',other));
  assert.equal(has(s,p,'hand',own),accept);assert.ok(has(s,p,'battle',extra));
  assert.equal(s.decision,null);assert.deepEqual(ids(s),before);
 }
});

test('Pax still offers its friendly return without an opponent, and completes with either side absent',()=>{
 for(const ownPresent of [false,true])for(const enemyPresent of [false,true]){
  const s=field(),own=ownPresent?add(s,0,'battle',SMALL):null,enemy=enemyPresent?add(s,1,'battle',WATER):null;
  cast(s,PAX);
  if(enemy)pick(s,enemy);
  if(own){assert.deepEqual(values(s),[own.uid,null]);pick(s,own);}
  assert.equal(s.decision,null);
  if(own)assert.ok(has(s,0,'hand',own));if(enemy)assert.ok(has(s,1,'hand',enemy));
 }
});

test('Pax preserves both evolution stacks and gives departure abilities one simultaneous batch',()=>{
 const s=field(),base=inst(WATER),enemy=add(s,1,'battle','dm02-024',{under:[base]});
 const jita=add(s,0,'battle',JITA),ally=add(s,0,'battle',SMALL);
 cast(s,PAX);pick(s,enemy);pick(s,jita);
 assert.ok(has(s,1,'hand',enemy)&&has(s,1,'hand',base)&&has(s,0,'hand',jita));
 assert.ok(has(s,0,'battle',ally));assert.equal(resolveDraws(s),1);
});

test('Pax respects untargetability and seals while preserving the later friendly choice',()=>{
 const s=field(),own=add(s,0,'battle',SMALL),hidden=add(s,1,'battle',SMALL,{g34Grants:[{turn:s.turn,untargetable:true}]});
 const sealed=add(s,1,'battle',WATER);seal(s,1,sealed);
 cast(s,PAX);assert.deepEqual(values(s),[own.uid,null]);pick(s,null);
 assert.ok(has(s,1,'battle',hidden)&&has(s,1,'battle',sealed));
});

test('Pax resolves replacements only after both selections, without cancelling the other return',()=>{
 const s=field(),own=add(s,0,'battle',SMALL),enemy=add(s,1,'battle',SMALL,{g26Stay:true});
 cast(s,PAX);pick(s,enemy);assert.ok(has(s,1,'battle',enemy));pick(s,own);drain(s);
 assert.ok(has(s,1,'battle',enemy)&&has(s,0,'hand',own));
});

test('Pax uses Shield Trigger without mana and returns the attacking creature',()=>{
 const s=field(1),enemy=add(s,1,'battle',SMALL);
 give(s,0,'shields',[PAX]);give(s,0,'mana',[]);const spell=s.players[0].shields[0];
 attack(s,enemy.uid);act(s,'noBlock');act(s,'useTrigger');pick(s,enemy);drain(s);
 assert.ok(has(s,1,'hand',enemy)&&has(s,0,'grave',spell));assert.equal(s.attack,null);
});

for(const p of [0,1])test('Jita sees own departures to hand, mana, deck and grave, with an optional draw '+p,()=>{
 for(const to of ['hand','mana','deck','grave']){
  const s=field(p);add(s,p,'battle',JITA);const ally=add(s,p,'battle',SMALL),top=s.players[p].deck[0];
  move(s,p,ally,to);assert.deepEqual(values(s),[0,1]);
  pick(s,to==='mana'?0:1);
  assert.equal(has(s,p,'hand',top),to!=='mana');assert.ok(!has(s,p,'battle',ally));
  assert.equal(s.decision,null);
 }
});

for(const p of [0,1])test('Jita sees only itself if leaving simultaneously, and each ally if it stays (QA33591) '+p,()=>{
 for(const keep of [false,true]){
  const s=field(p),host=add(s,p,'battle',JITA);
  add(s,p,'battle',SMALL);add(s,p,'battle',WATER);
  const before=ids(s);
  sweep(s,p,keep?{excludeUid:host.uid}:{});
  assert.equal(resolveDraws(s),keep?2:1);
  assert.equal(has(s,p,'battle',host),keep);assert.deepEqual(ids(s),before);
 }
});

test('Jita retains its other-creature watch when its own destruction is prevented',()=>{
 const s=field(),host=add(s,0,'battle',JITA,{g26Stay:true});
 add(s,0,'battle',SMALL);add(s,0,'battle',WATER);
 sweep(s,0);assert.equal(resolveDraws(s),2);assert.ok(has(s,0,'battle',host));
});

test('Jita ignores opposing departures, noncreatures and sealed creatures, and counts one evolution',()=>{
 const s=field();add(s,0,'battle',JITA);
 const enemy=add(s,1,'battle',SMALL);move(s,1,enemy);assert.equal(s.decision,null);
 const seed=add(s,0,'battle','dmrp21-040');move(s,0,seed);assert.equal(s.decision,null);
 const hidden=add(s,0,'battle',SMALL);seal(s,0,hidden);move(s,0,hidden);assert.equal(s.decision,null);
 const base=inst(WATER),evo=add(s,0,'battle','dm02-024',{under:[base]});
 move(s,0,evo);assert.equal(resolveDraws(s),1);assert.ok(has(s,0,'grave',base));
});

test('Jita observes replacement departures but no prevented departure',()=>{
 const s=field();add(s,0,'battle',JITA);
 const broccoli=add(s,0,'battle',BROCCOLI);move(s,0,broccoli);drain(s);
 assert.ok(has(s,0,'mana',broccoli));assert.equal(s.players[0].hand.length,1);
 const stay=add(s,0,'battle',SMALL,{g26Stay:true});move(s,0,stay);assert.equal(s.decision,null);
 assert.ok(has(s,0,'battle',stay));assert.equal(s.players[0].hand.length,1);
});

for(const p of [0,1])test('Jo watches either player destruction only if an allied multicolor creature exists at resolution '+p,()=>{
 for(const owner of [p,1-p])for(const multi of [false,true]){
  const s=field(p);add(s,p,'battle',JO);if(multi)add(s,p,'battle',MULTI);
  const victim=add(s,owner,'battle',SMALL);move(s,owner,victim);
  if(multi){assert.deepEqual(values(s),[0,1]);pick(s,1);}
  else assert.equal(s.decision,null);
  assert.equal(s.players[p].hand.length,multi?1:0);
 }
});

test('Jo cannot draw after its only allied multicolor creature is destroyed (QA39437)',()=>{
 const s=field();add(s,0,'battle',JO);const multi=add(s,0,'battle',MULTI);
 move(s,0,multi);assert.equal(s.decision,null);assert.equal(s.players[0].hand.length,0);
});

test('Jo uses current creature-face civilizations, excludes opposing multicolors and seeds (QA39442)',()=>{
 for(const id of ['dm22ex1-059','dmrp21-040']){
  const s=field();add(s,0,'battle',JO);add(s,0,'battle',id);add(s,1,'battle',MULTI);
  const victim=add(s,1,'battle',SMALL);move(s,1,victim);assert.equal(s.decision,null);
 }
});

test('Jo sees its own simultaneous destruction only, or every death when it remains',()=>{
 for(const keep of [false,true]){
  const s=field(),host=add(s,0,'battle',JO),multi=add(s,0,'battle',MULTI,{g26Stay:true});
  add(s,0,'battle',SMALL);add(s,0,'battle',WATER);
  sweep(s,0,keep?{excludeUid:host.uid}:{});
  assert.equal(resolveDraws(s),keep?2:1);
  assert.equal(has(s,0,'battle',host),keep);assert.ok(has(s,0,'battle',multi));
 }
});

test('Jo rechecks multicolor when its queued ability resolves',()=>{
 const s=field(),host=add(s,0,'battle',JO);add(s,0,'battle',JITA,{g26Stay:true});
 const victim=add(s,0,'battle',SMALL);move(s,0,victim);
 assert.equal(s.decision.type,'effectOrder');
 // Conditions belong to resolution: removing the multicolor before Jo resolves cancels its draw.
 const multi=s.players[0].battle.find(x=>x.cardId===JITA);
 s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==multi.uid);s.players[0].hand.push(multi);
 act(s,'orderEffect',a=>a.cardId===JO);assert.equal(s.decision.task.op,'g34_Draw');
 assert.equal(resolveDraws(s),1);assert.equal(s.players[0].hand.length,2);assert.ok(has(s,0,'battle',host));
});

test('Jo ignores ordinary bounce, destruction replacement and prevented destruction',()=>{
 const s=field();add(s,0,'battle',JO);add(s,0,'battle',JITA);
 const victim=add(s,1,'battle',SMALL);move(s,1,victim,'hand');assert.equal(s.decision,null);
 const broccoli=add(s,1,'battle',BROCCOLI);move(s,1,broccoli);drain(s);assert.ok(has(s,1,'mana',broccoli));
 assert.equal(s.players[0].hand.length,0);
 const stay=add(s,1,'battle',SMALL,{g26Stay:true});move(s,1,stay);assert.equal(s.decision,null);
});

for(const id of [JITA,JO])test(e.card(id).name+' has no watch while sealed or ignored, even if the suppressor leaves',()=>{
 for(const mode of ['sealed','ignored','genmu']){
  const s=field(),host=add(s,0,'battle',id);add(s,0,'battle',id===JO?MULTI:SMALL);
  if(mode==='sealed')seal(s,0,host);
  if(mode==='ignored')host.g35Ignored=s.turn;
  if(mode==='genmu')add(s,1,'battle',GEN);
  sweep(s,0,{both:true});assert.equal(s.decision,null);assert.equal(s.players[0].hand.length,0);
 }
});

test('Jo retains a queued death ability if later ignored and can decline drawing after a JSON save',()=>{
 let s=field(),host=add(s,0,'battle',JO);add(s,0,'battle',JITA);
 const victim=add(s,1,'battle',SMALL);move(s,1,victim);
 host.g35Ignored=s.turn;const before=ids(s);s=JSON.parse(JSON.stringify(s));pick(s,0);
 assert.equal(s.players[0].hand.length,0);assert.deepEqual(ids(s),before);
});

for(const p of [0,1])test('Jo has Slayer in ordinary battle and Jita breaks two shields '+p,()=>{
 const s=field(p),host=add(s,p,'battle',JO),enemy=add(s,1-p,'battle',BIG,{tapped:true});
 attack(s,host.uid,enemy.uid);drain(s);
 assert.ok(has(s,p,'grave',host)&&has(s,1-p,'grave',enemy));
 const t=field(p),jita=add(t,p,'battle',JITA);attack(t,jita.uid);act(t,'noBlock');drain(t);
 assert.equal(t.players[1-p].shields.length,3);
});

for(const id of [PAX,JITA,JO])test(e.card(id).name+' charges as one mana with its printed orientation',()=>{
 const s=field();s.phase='charge';give(s,0,'hand',[id]);const x=s.players[0].hand[0];
 act(s,'charge',a=>a.uid===x.uid);assert.ok(has(s,0,'mana',x));assert.equal(x.tapped,id===JITA);
 assert.equal(e.card(x).manaValue,1);
});

test('Jita sees only itself when sacrificed with another element for Reiai alternative payment',()=>{
 const s=field(),host=add(s,0,'battle',JITA),ally=add(s,0,'battle',SMALL),spell=add(s,0,'hand','dm26rp3-011');
 act(s,'play',a=>a.uid===spell.uid&&a.alternative==='sixPhoto'&&a.role==='reiai');
 pick(s,host);pick(s,ally);
 assert.ok(has(s,0,'grave',host)&&has(s,0,'grave',ally));
 assert.equal(s.pendingEffects.filter(x=>x.source===JITA||x.task?.source===JITA).length,1);
 drain(s);assert.equal(s.winner,null);
});

test('Pax has no selections when Genmu ignores its spell ability',()=>{
 const s=field();add(s,1,'battle',GEN);const enemy=add(s,1,'battle',SMALL),own=add(s,0,'battle',SMALL);
 cast(s,PAX);assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',enemy)&&has(s,0,'battle',own));
});
