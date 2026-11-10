import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
const CUTE='dmex14-055',KITA='dmrp15-095',REPRINT='dm24ex2-100',DOKU='dmrp13-s09';
const SMALL='dm01-108',FIRE='dm01-097',WATER='dm01-083',BIG='dm05-s04',MULTI='dmsd14-015',YAT='dmsd01-012';
function field(p=0){const s=setup();s.active=p;for(const q of [0,1])give(s,q,'deck',Array(20).fill(SMALL));return s;}
function add(s,p,z,id,props){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
function play(s,id){s.phase='main';const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
const vals=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>typeof v==='function'?v(s.decision.choices[a.choice].value):vals(s)[a.choice]===(v?.uid??v));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
function shieldTotal(s,n){give(s,0,'shields',Array(Math.min(n,3)).fill(SMALL));give(s,1,'shields',Array(Math.max(0,n-3)).fill(SMALL));}
function invoke(s,p,defs){s.phase='main';s.extTasks=[{op:'g34_Sequence',p,source:CUTE,defs}];act(s,'toAttack');}
function seal(s,p,x){x.sealed=true;add(s,p,'seals',SMALL,{sealOf:x.uid,faceDown:true});}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}

test('Phase 894 verifies three whole definitions, four official prints and original deck IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-894.json',import.meta.url))),cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[CUTE,KITA,DOKU]);assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,KITA]]);
 for(const row of [...m.cards,...m.printAliases]){
  const canonical=m.cards.find(c=>c.id===(row.canonicalId||row.id));assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:894}),canonical.spec);
  assert.ok(row.verification.facesMatched);assert.equal(m.regulationVerification.limits[row.id],4);
 }
 assert.deepEqual(cat.resolveRows([{id:KITA,count:2},{id:REPRINT,count:2}]),[{id:KITA,count:4}]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;assert.deepEqual(d.faces,row.faces);
  assert.throws(()=>standardCardSpec(d,{phase:893}));const unknown=structuredClone(d);unknown.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(unknown,{phase:894}));
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],[row.id===CUTE?'spell':'creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
 const deck={id:'phase894',name:'切札と鬼札',cards:[CUTE,KITA,DOKU,SMALL,WATER,FIRE,BIG,YAT,'dm01-090','dm01-076'].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck(deck),[]);assert.equal(cat.coverage(deck).unsupported,0);
});

for(const p of [0,1])test('Cute can deploy a qualifying multicolor Joker and immediately use its Rainbow battle (QA39406) '+p,()=>{
 let s=field(p),unit=add(s,p,'hand',MULTI),enemy=add(s,1-p,'battle',SMALL);
 const before=ids(s),spell=play(s,CUTE);assert.deepEqual(vals(s),[unit.uid,null]);pick(s,unit);
 assert.ok(has(s,p,'battle',unit));assert.deepEqual(vals(s),[unit.uid,null]);
 s=JSON.parse(JSON.stringify(s));pick(s,unit);pick(s,enemy);drain(s);
 assert.ok(has(s,p,'battle',unit)&&has(s,1-p,'grave',enemy)&&has(s,p,'grave',spell));assert.deepEqual(ids(s),[...before,spell.uid].sort());
});

test('Cute filters non-Jokers and high-cost or evolution cards, while allowing a zero-creature outcome',()=>{
 const s=field(),valid=add(s,0,'hand',YAT);add(s,0,'hand',SMALL);add(s,0,'hand','dmrp07-079');add(s,0,'hand','dmrp18-km1');
 play(s,CUTE);assert.deepEqual(vals(s),[valid.uid,null]);pick(s,null);assert.equal(s.decision,null);assert.equal(s.players[0].battle.length,0);
 const t=field();play(t,CUTE);assert.equal(t.decision,null);
});

test('Cute can decline either the initial deployment or its optional battle independently',()=>{
 for(const deploy of [false,true])for(const fight of [false,true]){
  const s=field(),existing=add(s,0,'battle',MULTI),hand=add(s,0,'hand',YAT),enemy=add(s,1,'battle',SMALL);
  play(s,CUTE);pick(s,deploy?hand:null);pick(s,fight?existing:null);if(fight)pick(s,enemy);drain(s);
  assert.equal(has(s,0,'battle',hand),deploy);assert.equal(has(s,1,'grave',enemy),fight);
 }
});

test('Cute uses current battle creatures for its multicolor condition and requires an eligible opponent',()=>{
 for(const mode of ['none','opponent','twin','seed','sealed','noEnemy']){
  const s=field();if(mode!=='noEnemy')add(s,1,'battle',SMALL);
  if(mode==='opponent')add(s,1,'battle',MULTI);
  if(mode==='twin')add(s,0,'battle','dm22ex1-059');
  if(mode==='seed')add(s,0,'battle','dm24rp3-011');
  if(mode==='sealed'){const x=add(s,0,'battle',MULTI);seal(s,0,x);}
  if(mode==='noEnemy')add(s,0,'battle',MULTI);
  play(s,CUTE);assert.equal(s.decision,null);
 }
});

test('Cute cannot bypass a hand deployment prohibition, and an ignored spell does nothing',()=>{
 const s=field(),unit=add(s,0,'hand',MULTI);invoke(s,1,[{op:'Lock',limit:{kind:'entryCost',player:0,max:4}}]);play(s,CUTE);
 if(s.decision){pick(s,unit);drain(s);}assert.ok(has(s,0,'hand',unit)&&!has(s,0,'battle',unit));
 const t=field(),hand=add(t,0,'hand',MULTI);add(t,1,'battle',GEN);play(t,CUTE);assert.equal(t.decision,null);assert.ok(has(t,0,'hand',hand));
});

for(const p of [0,1])test('Kita declares and summons for zero after a real shield break with no mana, through JSON '+p,()=>{
 let s=field(p),attacker=add(s,p,'battle',SMALL),host=add(s,p,'hand',KITA);give(s,p,'mana',[]);
 const before=ids(s);attack(s,attacker.uid);act(s,'noBlock');assert.equal(s.decision.task.op,'g14_DashDeclare');pick(s,true);
 assert.equal(s.decision.task.op,'g14_DashResolve');assert.ok(s.decision.choices.some(c=>c.label.includes('コストを支払わず')));
 s=JSON.parse(JSON.stringify(s));pick(s,v=>v!==null);drain(s);
 assert.ok(has(s,p,'battle',host));assert.equal(s.players[p].mana.length,0);assert.equal(s.metrics[p].played[KITA],1);assert.deepEqual(ids(s),before);
 s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===host.uid));
});

test('Kita zero dash remains free with Yattare Man reduction (QA34240)',()=>{
 const s=field(),attacker=add(s,0,'battle',SMALL),host=add(s,0,'hand',KITA);add(s,0,'battle',YAT);give(s,0,'mana',[]);
 attack(s,attacker.uid);act(s,'noBlock');pick(s,true);pick(s,v=>v!==null);drain(s);
 assert.ok(has(s,0,'battle',host));assert.equal(s.players[0].mana.length,0);
});

test('Kita dash may be declined and never opens for a creature battle or a blocked attack',()=>{
 const s=field(),a=add(s,0,'battle',SMALL),host=add(s,0,'hand',KITA);attack(s,a.uid);act(s,'noBlock');pick(s,null);assert.ok(has(s,0,'hand',host));
 for(const mode of ['battle','block']){
  const t=field(),attacker=add(t,0,'battle',BIG),kita=add(t,0,'hand',KITA),enemy=add(t,1,'battle',mode==='block'?'dm01-076':SMALL,{tapped:mode==='battle'});
  attack(t,attacker.uid,mode==='battle'?enemy.uid:'player');if(t.decision?.type==='block')act(t,mode==='block'?'block':'noBlock');drain(t);
  assert.ok(has(t,0,'hand',kita));assert.ok(!has(t,0,'battle',kita));
 }
});

for(const p of [0,1])test('Kita requires both Fire and Nature mana, accepts one multicolor or twinpact, and ignores face-down cards '+p,()=>{
 for(const [mana,faceDown,ready] of [[[],false,false],[[FIRE],false,false],[[SMALL],false,false],[[FIRE,SMALL],false,true],[[KITA],false,true],[['dm26ex4-079'],false,true],[[KITA],true,false]]){
  const s=field(p),host=add(s,p,'battle',KITA);give(s,p,'mana',mana);if(faceDown)s.players[p].mana[0].faceDown=true;
  s.phase='attack';assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===host.uid),ready);
 }
});

test('Kita attack permission tracks actual mana changes and disappears immediately when a color leaves',()=>{
 const s=field(),host=add(s,0,'battle',KITA);give(s,0,'mana',[FIRE,SMALL]);
 assert.ok(!e.effectiveCard(host,s).noAttack);invoke(s,0,[{op:'Select',origin:'mana',to:'hand',n:1}]);pick(s,s.players[0].mana.find(x=>x.cardId===FIRE));
 assert.ok(e.effectiveCard(host,s).noAttack);host.g35Ignored=s.turn;s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===host.uid));
});

test('Kita cannot use zero dash to enter through a creature-entry prohibition',()=>{
 const s=field(),a=add(s,0,'battle',BIG),host=add(s,0,'hand',KITA);invoke(s,1,[{op:'Lock',limit:{kind:'entryCost',player:0,max:4}}]);give(s,0,'mana',[]);
 attack(s,a.uid);act(s,'noBlock');if(s.decision?.task?.op==='g14_DashDeclare')pick(s,true);drain(s);assert.ok(has(s,0,'hand',host));
});

for(const p of [0,1])test('Doku has Speed Attacker, reduces current power by 5000 on attack and breaks two shields '+p,()=>{
 const s=field(p),enemy=add(s,1-p,'battle',SMALL),host=play(s,DOKU);
 attack(s,host.uid);assert.deepEqual(vals(s),[enemy.uid]);pick(s,enemy);drain(s);
 assert.ok(has(s,1-p,'grave',enemy));assert.equal(s.players[1-p].shields.length,3);assert.ok(has(s,p,'battle',host));
});

test('Doku current-power reduction survives save, ends at turn end and respects protected targets',()=>{
 let s=field(),host=add(s,0,'battle',DOKU),large=add(s,1,'battle',BIG),hidden=add(s,1,'battle',SMALL,{g34Grants:[{turn:s.turn,untargetable:true}]});
 attack(s,host.uid);assert.deepEqual(vals(s),[large.uid]);const before=ids(s);s=JSON.parse(JSON.stringify(s));pick(s,large);drain(s);
 const target=s.players[1].battle.find(x=>x.uid===large.uid);assert.equal(e.power(target,false,s),e.card(BIG).power-5000);
 end(s);assert.equal(e.power(target,false,s),e.card(BIG).power);assert.ok(has(s,1,'battle',hidden));assert.deepEqual(ids(s),before);
});

for(const p of [0,1])test('Doku grants only its own current creatures Blocker and Slayer at six shields, including itself '+p,()=>{
 for(const total of [6,7]){
  const s=field(p),host=add(s,p,'battle',DOKU),ally=add(s,p,'battle',SMALL),enemy=add(s,1-p,'battle',SMALL),seed=add(s,p,'battle','dmrp21-040');shieldTotal(s,total);
  for(const unit of [host,ally]){assert.equal(!!e.effectiveCard(unit,s).blocker,total===6);assert.equal(!!e.effectiveCard(unit,s).slayer,total===6);}
  assert.ok(!e.effectiveCard(enemy,s).slayer&&!e.effectiveCard(seed,s).slayer);
 }
});

test('Doku aura updates with shield counts and source departure, but an ordinary Slayer battle works',()=>{
 const s=field(1),host=add(s,0,'battle',DOKU),ally=add(s,0,'battle',SMALL),enemy=add(s,1,'battle',BIG);shieldTotal(s,6);
 attack(s,enemy.uid);act(s,'block',a=>a.uid===ally.uid);drain(s);assert.ok(has(s,0,'grave',ally)&&has(s,1,'grave',enemy));
 const next=add(s,0,'battle',SMALL);add(s,1,'shields',SMALL);assert.ok(!e.effectiveCard(next,s).blocker);
 invoke(s,0,[{op:'ShieldHand',g238ShieldHand:true}]);pick(s,s.players[0].shields[0]);assert.ok(e.effectiveCard(next,s).blocker);
 invoke(s,1,[{op:'ExactMove',owner:0,target:host.uid,to:'hand'}]);assert.ok(!e.effectiveCard(next,s).slayer);
});

test('Doku cannot grant or use its printed abilities while sealed or ignored',()=>{
 for(const mode of ['sealed','ignored']){
  const s=field(),host=add(s,0,'battle',DOKU),ally=add(s,0,'battle',SMALL);shieldTotal(s,6);
  if(mode==='sealed')seal(s,0,host);else host.g35Ignored=s.turn;
  assert.ok(!e.effectiveCard(ally,s).blocker&&!e.effectiveCard(ally,s).slayer);
  assert.ok(!e.effectiveCard(host,s).speedAttacker);
 }
});

for(const id of [CUTE,KITA,DOKU])test(e.card(id).name+' charges as one mana with the printed multicolor orientation',()=>{
 const s=field();s.phase='charge';give(s,0,'hand',[id]);const x=s.players[0].hand[0];act(s,'charge',a=>a.uid===x.uid);assert.ok(has(s,0,'mana',x));assert.equal(x.tapped,id!==CUTE);assert.equal(e.card(x).manaValue,1);
});

test('Kita zero dash and an existing paid dash are declared together and preserve their distinct payments',()=>{
 const s=field(),attacker=add(s,0,'battle',SMALL),zero=add(s,0,'hand',KITA),paid=add(s,0,'hand','dmrp16-077');
 give(s,0,'mana',[FIRE,SMALL]);attack(s,attacker.uid);act(s,'noBlock');pick(s,true);pick(s,true);
 act(s,'orderEffect',a=>a.cardId===KITA);pick(s,v=>v!==null);
 assert.ok(has(s,0,'battle',zero));assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===paid.cardId);
 assert.equal(s.decision.task.op,'g14_DashResolve');pick(s,v=>v!==null);drain(s);
 assert.ok(has(s,0,'battle',paid));assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
 assert.equal(s.players[0].battle.find(x=>x.uid===zero.uid).summonedTurn,s.turn);
});

test('Kita zero dash honors a multicolor mana summon permission and a mana movement lock',()=>{
 for(const locked of [false,true]){
  const s=field(),attacker=add(s,0,'battle',SMALL);add(s,0,'battle','dm24-s05');give(s,0,'mana',[KITA]);
  const host=s.players[0].mana[0];if(locked)add(s,1,'battle','dmrp22-042');
  const before=ids(s);attack(s,attacker.uid);act(s,'noBlock');
  if(locked){assert.equal(s.decision,null);assert.ok(has(s,0,'mana',host));assert.deepEqual(ids(s),before);continue;}
  pick(s,true);assert.equal(s.decision.task.op,'g14_DashResolve');
  pick(s,v=>v!==null);drain(s);assert.equal(has(s,0,'battle',host),!locked);assert.equal(has(s,0,'mana',host),locked);
  assert.deepEqual(ids(s),before);
 }
});
