import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN,GG} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
const WANA='dmrp14-035',BIL='dmrp17-063',GIGA='dmrp09-s12';
const SMALL='dm01-108',WATER='dm01-083',FIRE='dm01-097',LIGHT='dm01-075',BIG='dm05-s04',VEVE='dmrp14-007',SEED='dmsd20-016',SPELL='dm06-085',LAPUTA='dm25rp1-S05';
function field(p=0){const s=setup();s.active=p;for(const q of [0,1])give(s,q,'deck',Array(24).fill(SMALL));return s;}
function add(s,p,z,id,props){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
function play(s,id){s.phase='main';const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
const vals=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>typeof v==='function'?v(s.decision.choices[a.choice].value):vals(s)[a.choice]===(v?.uid??v));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
function invoke(s,p,defs){s.phase='main';s.extTasks=[{op:'g34_Sequence',p,source:GIGA,defs}];act(s,'toAttack');}
function deploy(s,p,x,origin='hand'){invoke(s,p,[{op:'Put',origin,target:x.uid}]);}
function free(s,p,x,origin='hand'){invoke(s,p,[{op:'Execute',origin,creatureOnly:true,max:20,optional:false}]);pick(s,v=>v?.uid===x.uid);}
function seal(s,p,x){x.sealed=true;add(s,p,'seals',SMALL,{sealOf:x.uid,faceDown:true});}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function win(s,source,enemy){attack(s,source.uid,enemy.uid);if(s.decision?.type==='block')act(s,'noBlock');}

test('Phase 898 validates three complete original definitions, images, limits and legal deck IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-898.json',import.meta.url))),cat=createCatalogue(snapshot,data.cards,details);assert.deepEqual(m.cards.map(c=>c.id),[WANA,BIL,GIGA]);assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:898}),row.spec);assert.throws(()=>standardCardSpec(d,{phase:897}));
  const changed=structuredClone(d);changed.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(changed,{phase:898}));for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);assert.ok(row.verification.facesMatched);assert.equal(m.regulationVerification.limits[row.id],4);assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);assert.deepEqual(cat.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
 const deck={id:'phase898',name:'チームとテキサリス',cards:[WANA,BIL,GIGA,SMALL,WATER,FIRE,LIGHT,BIG,VEVE,SPELL].map(id=>({id,count:4}))};assert.deepEqual(e.validateDeck(deck),[]);assert.equal(cat.coverage(deck).unsupported,0);
});

for(const p of [0,1])for(const origin of ['grave','mana','deck','shields'])test('Wallaby replaces a low-cost opposing nonsummon entry from '+origin+' with hand return '+p,()=>{
 let s=field(p);add(s,1-p,'battle',WANA);const x=add(s,p,origin,WATER),before=ids(s);deploy(s,p,x,origin);drain(s);assert.ok(has(s,p,'hand',x)&&!has(s,p,'battle',x));assert.equal(s.players[p].enteredThisTurn||0,0);assert.deepEqual(ids(s),before);
});

test('Wallaby covers the cost-four boundary while permitting cost-five creatures and noncreatures',()=>{
 for(const [id,returned] of [['dm04-026',true],[VEVE,false],[SEED,false]]){
  const s=field();add(s,1,'battle',WANA);const x=add(s,0,'grave',id);deploy(s,0,x,'grave');drain(s);assert.equal(has(s,0,'hand',x),returned);assert.equal(has(s,0,'battle',x),!returned);
 }
});

test('Wallaby does not replace hand deployments, ordinary summons, or a real S-Trigger hand summon',()=>{
 const s=field();add(s,1,'battle',WANA);const ordinary=play(s,WATER);assert.ok(has(s,0,'battle',ordinary));const unit=add(s,0,'hand',FIRE);deploy(s,0,unit);assert.ok(has(s,0,'battle',unit));
 const t=field(),a=add(t,0,'battle',SMALL);add(t,0,'battle',WANA);give(t,1,'mana',[]);give(t,1,'shields',['dm04-026']);attack(t,a.uid);act(t,'noBlock');act(t,'useTrigger');drain(t);assert.ok(t.players[1].battle.some(x=>x.cardId==='dm04-026'));assert.equal(t.players[1].mana.length,0);
});

test('Wallaby also replaces a free mana or grave summon and keeps its summon history distinct from entry',()=>{
 for(const origin of ['mana','grave']){const s=field();add(s,1,'battle',WANA);const x=add(s,0,origin,WATER);free(s,0,x,origin);drain(s);assert.ok(has(s,0,'hand',x));assert.equal(s.g463Summons[0].n,1);assert.equal(s.players[0].enteredThisTurn||0,0);}
});

test('Wallaby ignores own creatures and stops replacing entries when sealed, ignored, absent or under Genmu',()=>{
 for(const mode of ['own','sealed','ignored','left','genmu']){
  const s=field(),source=add(s,mode==='own'?0:1,'battle',WANA),x=add(s,0,'grave',WATER);if(mode==='sealed')seal(s,1,source);if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='left')s.players[1].grave.push(s.players[1].battle.pop());if(mode==='genmu')add(s,0,'battle',GEN);deploy(s,0,x,'grave');drain(s);assert.ok(has(s,0,'battle',x),mode);
 }
});

test('Wallaby competes with Tokoshie as one replacement, preserves JSON and does not chain',()=>{
 for(const hand of [false,true]){
  let s=field();add(s,1,'battle',WANA);add(s,1,'battle','dmrp17-025');const x=add(s,0,'grave',WATER),before=ids(s);deploy(s,0,x,'grave');assert.equal(s.decision.task.op,'g22Replace');assert.equal(s.decision.player,1);s=JSON.parse(JSON.stringify(s));pick(s,hand?0:1);drain(s);assert.ok(has(s,0,hand?'hand':'mana',x));assert.deepEqual(ids(s),before);assert.equal(s.players[0].enteredThisTurn||0,0);
 }
});

test('Wallaby retains low-cost evolution bases on the battlefield instead of moving them into hand',()=>{
 const s=field();add(s,1,'battle',WANA);const base=add(s,0,'battle',FIRE),x=add(s,0,'grave','dm02-s04'),before=ids(s);deploy(s,0,x,'grave');if(s.decision?.task?.op==='g34_Put')pick(s,base);drain(s);assert.ok(has(s,0,'battle',base)&&has(s,0,'hand',x));assert.deepEqual(ids(s),before);
});

test('Wallaby prevents a mana exchange without moving either physical unit (rule change 31620)',()=>{
 const s=field(),source=add(s,0,'battle',LAPUTA),old=add(s,1,'battle',BIG),incoming=add(s,1,'mana',WATER);add(s,0,'battle',WANA);const before=ids(s);attack(s,source.uid);assert.equal(s.decision.task.op,'g34_ManaExchange753');pick(s,old);pick(s,incoming);drain(s);assert.ok(has(s,1,'battle',old)&&has(s,1,'mana',incoming));assert.deepEqual(ids(s),before);
});

for(const p of [0,1])test('Bilpan requires a current own creature of at least 6000 and blocks an actual attack '+p,()=>{
 const s=field(p),source=add(s,1-p,'battle',BIL),enemy=add(s,p,'battle',WATER),large=add(s,1-p,'battle',BIG);attack(s,enemy.uid);assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===source.uid));act(s,'block',a=>a.uid===source.uid);drain(s);assert.ok(has(s,p,'grave',enemy)&&has(s,1-p,'battle',source)&&has(s,1-p,'battle',large));
});

test('Bilpan uses current power at the 6000 boundary, counts itself, and updates immediately on source departure',()=>{
 const s=field(),source=add(s,0,'battle',BIL),ally=add(s,0,'battle',VEVE);assert.equal(!!e.effectiveCard(source,s).blocker,false);ally.powerModifiers=[{amount:500,expires:'end',who:0}];assert.equal(!!e.effectiveCard(source,s).blocker,true);ally.powerModifiers=[{amount:499,expires:'end',who:0}];assert.equal(!!e.effectiveCard(source,s).blocker,false);
 source.powerModifiers=[{amount:4500,expires:'end',who:0}];assert.equal(!!e.effectiveCard(source,s).blocker,true);source.powerModifiers=[];s.players[0].battle.pop();assert.equal(!!e.effectiveCard(source,s).blocker,false);
});

test('Bilpan excludes opposing creatures, seeds and sealed creatures and honors suppression',()=>{
 for(const mode of ['opponent','seed','sealed','ignored','genmu']){
  const s=field(),source=add(s,0,'battle',BIL),large=add(s,mode==='opponent'?1:0,'battle',mode==='seed'?SEED:BIG);if(mode==='seed')large.powerModifiers=[{amount:12000,expires:'end',who:0}];if(mode==='sealed')seal(s,0,large);if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='genmu')add(s,1,'battle',GEN);assert.equal(!!e.effectiveCard(source,s).blocker,false,mode);
 }
});

test('Bilpan conditional blocker ends with a temporary power boost and remains serializable',()=>{
 let s=field(),source=add(s,0,'battle',BIL),ally=add(s,0,'battle',SMALL,{powerModifiers:[{amount:4000,expires:'end',who:0}]});assert.ok(e.effectiveCard(source,s).blocker);s=JSON.parse(JSON.stringify(s));end(s);assert.equal(!!e.effectiveCard(s.players[0].battle.find(x=>x.uid===source.uid),s).blocker,false);assert.equal(e.power(s.players[0].battle.find(x=>x.uid===ally.uid),false,s),2000);
});

for(const p of [0,1])test('Gigant can Mach Fight an untapped enemy immediately, draws before selecting a 12000 hand creature '+p,()=>{
 let s=field(p),enemy=add(s,1-p,'battle',WATER),large=add(s,p,'hand',BIG),source=play(s,GIGA),top=s.players[p].deck[0],before=ids(s);win(s,source,enemy);assert.ok(has(s,1-p,'grave',enemy)&&has(s,p,'hand',top));assert.equal(s.players[p].deck.length,23);assert.equal(s.decision.task.op,'g34_Select');assert.deepEqual(vals(s),[large.uid,null]);s=JSON.parse(JSON.stringify(s));pick(s,large);drain(s);assert.ok(has(s,p,'battle',large));assert.equal(s.g463Summons[p].n,1);assert.deepEqual(ids(s),before);
});

test('Gigant can deploy the just-drawn 12000 creature and may independently decline deployment',()=>{
 for(const accept of [true,false]){
  const s=field(),source=add(s,0,'battle',GIGA),enemy=add(s,1,'battle',WATER,{tapped:true});give(s,0,'deck',[GIGA,...Array(9).fill(SMALL)]);const drawn=s.players[0].deck[0];win(s,source,enemy);assert.deepEqual(vals(s),[drawn.uid,null]);pick(s,accept?drawn:null);drain(s);assert.equal(has(s,0,'battle',drawn),accept);assert.equal(has(s,0,'hand',drawn),!accept);
 }
});

test('Gigant excludes lower-power cards, respects entry prohibition, and can deploy an evolution with a legal base',()=>{
 const s=field(),source=add(s,0,'battle',GIGA),enemy=add(s,1,'battle',WATER,{tapped:true});add(s,0,'hand',VEVE);add(s,0,'hand',SPELL);win(s,source,enemy);assert.equal(s.decision,null);
 const t=field(),g=add(t,0,'battle',GIGA),target=add(t,1,'battle',WATER,{tapped:true}),hand=add(t,0,'hand',BIG);invoke(t,1,[{op:'Lock',limit:{kind:'entryCost',player:0,max:20}}]);win(t,g,target);drain(t);assert.ok(has(t,0,'hand',hand));
 const u=field(),giga=add(u,0,'battle',GIGA),victim=add(u,1,'battle',WATER,{tapped:true}),base=add(u,0,'battle',BIG),evo=add(u,0,'hand','dm27-007');win(u,giga,victim);pick(u,evo);pick(u,base);drain(u);assert.ok(has(u,0,'battle',evo));assert.ok(u.players[0].battle.find(x=>x.uid===evo.uid).under.some(x=>x.uid===base.uid));
});

test('Gigant does not draw after a loss or tie, a destruction effect, or an ordinary shield break',()=>{
 for(const mode of ['loss','tie','effect','shields']){
  const s=field(),source=add(s,0,'battle',GIGA),enemy=add(s,1,'battle',mode==='tie'?GIGA:BIG,{tapped:true});if(mode==='effect')invoke(s,0,[{op:'Target',to:'grave',filter:{exactUid:enemy.uid}}]);
  if(mode==='effect')pick(s,enemy);else{attack(s,source.uid,mode==='shields'?'player':enemy.uid);if(s.decision?.type==='block')act(s,'noBlock');}drain(s);assert.equal(s.players[0].deck.length,24,mode);if(mode==='shields')assert.equal(s.players[1].shields.length,2);
 }
});

test('Gigant victory in an effect battle or while blocking also draws and offers deployment',()=>{
 for(const mode of ['effect','block']){
  const s=field(mode==='block'?1:0),source=add(s,0,'battle',GIGA),enemy=add(s,1,'battle',WATER),large=add(s,0,'hand',BIG);
  if(mode==='effect'){s.extTasks=[{op:'g34_Fight240',p:0,source:GIGA,uid:source.uid,incarnation:0,self:true}];s.phase='main';act(s,'toAttack');pick(s,enemy);}else{source.g34Grants=[{turn:s.turn,blocker:true}];attack(s,enemy.uid);act(s,'block',a=>a.uid===source.uid);}
  assert.equal(s.players[0].deck.length,23);pick(s,large);drain(s);assert.ok(has(s,0,'battle',large));
 }
});

test('Gigant ignores its victory ability under suppression, and compulsory draw can exhaust the library',()=>{
 const s=field(),source=add(s,0,'battle',GIGA,{g35Ignored:1}),enemy=add(s,1,'battle',WATER,{tapped:true});source.g35Ignored=s.turn;win(s,source,enemy);assert.equal(s.players[0].deck.length,24);
 const t=field(),g=add(t,0,'battle',GIGA),target=add(t,1,'battle',WATER,{tapped:true});give(t,0,'deck',[BIG]);win(t,g,target);assert.equal(t.winner,1);assert.equal(t.players[0].deck.length,0);assert.ok(!t.players[0].battle.some(x=>x.cardId===BIG));
});

test('Wallaby uses the creature face printed cost rather than the cheaper twinpact spell face',()=>{
 const s=field();add(s,1,'battle',WANA);const x=add(s,0,'grave','dm22ex1-059');deploy(s,0,x,'grave');drain(s);assert.ok(has(s,0,'battle',x));assert.equal(e.effectiveCard(x,s).cost,7);
});

test('Bilpan conditional blocker is continuous and is not suppressed by GG on its entry',()=>{
 const s=field();add(s,0,'battle',BIG);add(s,1,'battle',GG).under=[inst(SMALL)];const source=play(s,BIL);assert.equal(s.decision,null);assert.ok(e.effectiveCard(source,s).blocker);
});

test('Gigant queued victory deployment survives its source leaving after the draw',()=>{
 let s=field(),source=add(s,0,'battle',GIGA),enemy=add(s,1,'battle',WATER,{tapped:true}),large=add(s,0,'hand',BIG);win(s,source,enemy);assert.equal(s.decision.task.op,'g34_Select');s.players[0].grave.push(s.players[0].battle.pop());s=JSON.parse(JSON.stringify(s));pick(s,large);drain(s);assert.ok(has(s,0,'grave',source)&&has(s,0,'battle',large));assert.equal(s.players[0].deck.length,23);
});

test('Gigant resolves its victory draw and deployment before the defeated Slayer destroys it',()=>{
 const s=field(),source=add(s,0,'battle',GIGA),enemy=add(s,1,'battle','dm01-088',{tapped:true}),large=add(s,0,'hand',BIG);win(s,source,enemy);assert.equal(s.players[0].deck.length,23);assert.equal(s.decision.task.op,'g34_Select');assert.ok(has(s,0,'battle',source));pick(s,large);drain(s);assert.ok(has(s,0,'grave',source)&&has(s,1,'grave',enemy)&&has(s,0,'battle',large));
});
