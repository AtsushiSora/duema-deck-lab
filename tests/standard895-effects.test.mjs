import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN,GG} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
const OSHI='dmrp15-054',WARA='dmrp16-095',KO='dmrp16-056';
const SMALL='dm01-108',FIRE='dm01-097',WATER='dm01-083',LIGHT='dm01-075',DARK='dm01-090',BIG='dm05-s04',KITA='dmrp15-095';
function field(p=0){const s=setup();s.active=p;for(const q of [0,1])give(s,q,'deck',Array(20).fill(SMALL));return s;}
function add(s,p,z,id,props){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
function play(s,id){s.phase='main';const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
const vals=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>typeof v==='function'?v(s.decision.choices[a.choice].value):vals(s)[a.choice]===(v?.uid??v));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
function invoke(s,p,defs){s.phase='main';s.extTasks=[{op:'g34_Sequence',p,source:KO,defs}];act(s,'toAttack');}
function deploy(s,p,x,origin='hand'){invoke(s,p,[{op:'Put',origin,target:x.uid}]);}
function free(s,p,x,origin='hand'){invoke(s,p,[{op:'Execute',origin,creatureOnly:true,max:20,optional:false}]);pick(s,v=>v?.uid===x.uid);}
function seal(s,p,x){x.sealed=true;add(s,p,'seals',SMALL,{sealOf:x.uid,faceDown:true});}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
const boosted=(s,x,n=10000)=>{assert.equal(e.power(x,false,s),n);assert.equal(e.effectiveCard(x,s).breaker,2);};

test('Phase 895 verifies whole definitions, five official prints, original IDs and legal decks',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-895.json',import.meta.url))),cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[OSHI,WARA,KO]);assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dm22ex2-049',KO],['promoy22-077',KO]]);
 for(const row of [...m.cards,...m.printAliases]){
  const canonical=m.cards.find(c=>c.id===(row.canonicalId||row.id));assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:895}),canonical.spec);
  assert.ok(row.verification.facesMatched);assert.equal(m.regulationVerification.limits[row.id],4);
 }
 assert.deepEqual(cat.resolveRows([{id:KO,count:2},{id:'dm22ex2-049',count:1},{id:'promoy22-077',count:1}]),[{id:KO,count:4}]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;assert.deepEqual(d.faces,row.faces);
  assert.throws(()=>standardCardSpec(d,{phase:894}));const changed=structuredClone(d);changed.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(changed,{phase:895}));
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],['creature',f.cost,f.civilizations,Number(f.powerText.replace('+','')),f.race,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
 const deck={id:'phase895',name:'召喚と鬼札',cards:[OSHI,WARA,KO,SMALL,WATER,FIRE,LIGHT,DARK,BIG,KITA].map(id=>({id,count:4}))};assert.deepEqual(e.validateDeck(deck),[]);assert.equal(cat.coverage(deck).unsupported,0);
});

for(const p of [0,1])test('Oshiyabami self entry discards before drawing, preserves physical cards and JSON '+p,()=>{
 let s=field(p),discard=add(s,p,'hand',BIG),top=s.players[p].deck[0],before=ids(s),source=play(s,OSHI);
 assert.equal(s.decision.task.op,'discard');assert.equal(s.players[p].deck.length,20);assert.equal(s.decision.player,p);
 s=JSON.parse(JSON.stringify(s));pick(s,discard);drain(s);
 assert.ok(has(s,p,'grave',discard)&&has(s,p,'hand',top)&&has(s,p,'battle',source));assert.equal(s.players[p].deck.length,19);assert.deepEqual(ids(s),[...before,source.uid].sort());
});

for(const id of [WATER,FIRE,KITA,LIGHT,DARK,SMALL])test('Oshiyabami watches one allied water or fire hand summon, including dual color '+id,()=>{
 const s=field(),source=add(s,0,'battle',OSHI),before=s.players[0].deck.length;
 const x=play(s,id);drain(s);assert.equal(s.players[0].deck.length,before-Number([WATER,FIRE,KITA].includes(id)));assert.ok(has(s,0,'battle',x)&&has(s,0,'battle',source));
});

test('Oshiyabami has no once-per-turn cap and multiple sources each draw exactly once',()=>{
 const s=field();add(s,0,'battle',OSHI);add(s,0,'battle',OSHI);play(s,WATER);drain(s);assert.equal(s.players[0].deck.length,18);play(s,FIRE);drain(s);assert.equal(s.players[0].deck.length,16);
});

for(const origin of ['hand','mana','grave'])test('Oshiyabami distinguishes a free summon from nonsummon entry from '+origin,()=>{
 for(const summon of [false,true]){
  const s=field();add(s,0,'battle',OSHI);const x=add(s,0,origin,WATER);give(s,0,'hand',origin==='hand'?[WATER]:[]);const unit=origin==='hand'?s.players[0].hand[0]:x;
  if(summon)free(s,0,unit,origin);else deploy(s,0,unit,origin);drain(s);
  assert.ok(has(s,0,'battle',unit));assert.equal(s.players[0].deck.length,20-Number(summon&&origin==='hand'));
 }
});

test('Oshiyabami ignores opposing summons and water spells or tamaseeds',()=>{
 const s=field(1);add(s,0,'battle',OSHI);play(s,WATER);drain(s);assert.equal(s.players[0].deck.length,20);
 const t=field();add(t,0,'battle',OSHI);add(t,1,'battle',SMALL);play(t,'dm01-086');drain(t);assert.equal(t.players[0].deck.length,20);
 play(t,'dmsd20-016');drain(t);assert.equal(t.players[0].deck.length,20);
});

test('Oshiyabami requires actual entry, and a nonsummoned self does not loot',()=>{
 const s=field();add(s,0,'battle',OSHI);add(s,1,'battle','dm22rp1-049');give(s,0,'mana',[]);const unit=add(s,0,'hand',WATER);free(s,0,unit);drain(s);assert.ok(has(s,0,'mana',unit));assert.equal(s.players[0].deck.length,20);
 const t=field(),source=add(t,0,'hand',OSHI);deploy(t,0,source);drain(t);assert.equal(t.players[0].deck.length,20);
});

test('Oshiyabami respects GG for self only, suppression and seals, while queued loot survives departure',()=>{
 for(const mode of ['ggSelf','ggOther','genmu','ignored','sealed','left']){
  let s=field();let source;
  if(mode.startsWith('gg'))add(s,1,'battle',GG).under=[inst(SMALL)];
  if(mode==='genmu')add(s,1,'battle',GEN);
  if(mode!=='ggSelf')source=add(s,0,'battle',OSHI);
  if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='sealed')seal(s,0,source);
  add(s,0,'hand',BIG);play(s,mode==='ggSelf'?OSHI:WATER);
  const trigger=['ggOther','left'].includes(mode);assert.equal(!!s.decision,trigger,mode);
  if(mode==='left'){s.players[0].grave.push(s.players[0].battle.splice(0,1)[0]);s=JSON.parse(JSON.stringify(s));}
  drain(s);assert.equal(s.players[0].deck.length,20-Number(trigger),mode);
 }
});

for(const p of [0,1])test('Warashibe boosts only the first actual summon and grants a real two shield break '+p,()=>{
 let s=field(p),source=add(s,p,'battle',WARA),spell=add(s,p,'hand','dm01-086'),enemy=add(s,1-p,'battle',SMALL);
 act(s,'play',a=>a.uid===spell.uid);drain(s);assert.equal(e.power(source,false,s),5000);
 play(s,LIGHT);drain(s);boosted(s,source);play(s,WATER);drain(s);boosted(s,source);
 s=JSON.parse(JSON.stringify(s));source=s.players[p].battle.find(x=>x.uid===source.uid);attack(s,source.uid);act(s,'noBlock');drain(s);assert.equal(s.players[1-p].shields.length,3);boosted(s,source);
 end(s);assert.equal(e.power(source,false,s),5000);assert.equal(e.effectiveCard(source,s).breaker||1,1);
});

test('Warashibe never boosts from its own summon, and that summon consumes the first event (QA39109)',()=>{
 const s=field(),source=play(s,WARA);drain(s);assert.equal(e.power(source,false,s),5000);assert.equal(s.g463Summons[0].n,1);play(s,LIGHT);drain(s);assert.equal(e.power(source,false,s),5000);
});

test('Warashibe counts summons while absent, ignored or sealed without resetting the shared first event',()=>{
 for(const mode of ['absent','ignored','sealed']){
  const s=field();let source=mode==='absent'?null:add(s,0,'battle',WARA);
  if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='sealed')seal(s,0,source);
  play(s,LIGHT);drain(s);if(mode==='absent')source=add(s,0,'battle',WARA);if(mode==='ignored')delete source.g35Ignored;if(mode==='sealed'){source.sealed=false;s.players[0].seals=[];}
  play(s,WATER);drain(s);assert.equal(e.power(source,false,s),5000);assert.equal(s.g463Summons[0].n,2);
 }
});

test('Warashibe ignores nonsummon entries, counts free summons from every zone, and buffs each source',()=>{
 for(const origin of ['hand','mana','grave']){
  const s=field(),a=add(s,0,'battle',WARA),b=add(s,0,'battle',WARA),entry=add(s,0,'hand',SMALL);deploy(s,0,entry);assert.equal(e.power(a,false,s),5000);
  const unit=add(s,0,origin,LIGHT);free(s,0,unit,origin);drain(s);boosted(s,a);boosted(s,b);assert.ok(has(s,0,'battle',unit));assert.equal(s.g463Summons[0].n,1);
 }
});

test('Warashibe resets for each turn, watches its owner during the opponent turn, and never opposing summons',()=>{
 const s=field(),source=add(s,0,'battle',WARA);play(s,LIGHT);drain(s);boosted(s,source);end(s);play(s,WATER);drain(s);assert.equal(e.power(source,false,s),5000);
 const x=add(s,0,'hand',LIGHT);free(s,0,x);drain(s);boosted(s,source);end(s);assert.equal(e.power(source,false,s),5000);play(s,LIGHT);drain(s);boosted(s,source);
});

test('Warashibe summon trigger is independent of GG and entry prevention',()=>{
 for(const mode of ['gg','prevent']){
  const s=field(),source=add(s,0,'battle',WARA);
  if(mode==='gg')add(s,1,'battle',GG).under=[inst(SMALL)];else{add(s,1,'battle','dm22rp1-049');give(s,0,'mana',[]);}
  const x=add(s,0,'hand',LIGHT);free(s,0,x);drain(s);boosted(s,source);assert.equal(has(s,0,'battle',x),mode==='gg');if(mode==='prevent')assert.ok(has(s,0,'mana',x));assert.equal(s.g463Summons[0].n,1);
 }
});

test('Warashibe ability resolves on the same evolving unit and never a later incarnation',()=>{
 for(const mode of ['left','new','under']){
  const s=field(),source=add(s,0,'battle',WARA);add(s,0,'battle',OSHI);add(s,0,'hand',BIG);play(s,WATER);
  assert.equal(s.decision.type,'effectOrder');
  if(mode==='left')s.players[0].grave.push(s.players[0].battle.splice(0,1)[0]);
  if(mode==='new')source.incarnation=(source.incarnation||0)+1;
  let host=source;
  if(mode==='under'){host=inst(BIG);host.under=[source];s.players[0].battle[0]=host;}
  act(s,'orderEffect',a=>a.cardId===WARA);drain(s);
  assert.equal(e.power(host,false,s),mode==='under'?20000:5000);if(mode==='under')assert.equal(e.effectiveCard(host,s).breaker,3);
 }
});

for(const p of [0,1])for(const mode of [0,1])test('Kooni sacrifices before choosing either effect, with JSON and physical conservation '+p+' '+mode,()=>{
 let s=field(p),target=add(s,1-p,'battle',SMALL);give(s,1-p,'hand',[WATER,BIG,LIGHT]);const before=ids(s),source=play(s,KO);
 assert.equal(s.decision.task.op,'g34_SelfSacrifice407');s=JSON.parse(JSON.stringify(s));pick(s,true);assert.ok(has(s,p,'grave',source));assert.equal(s.decision.task.op,'g34_Choose');pick(s,mode);
 if(mode===1){assert.deepEqual(vals(s),[target.uid]);pick(s,target);}drain(s);
 assert.equal(s.players[1-p].hand.length,3-Number(mode===0));assert.equal(has(s,1-p,'grave',target),mode===1);assert.deepEqual(ids(s),[...before,source.uid].sort());
});

test('Kooni may decline sacrifice; modes with no eligible victim still resolve after sacrifice',()=>{
 const s=field(),source=play(s,KO);pick(s,null);assert.ok(has(s,0,'battle',source));assert.equal(s.decision,null);
 for(const mode of [0,1]){const t=field();give(t,1,'hand',[]);const x=play(t,KO);pick(t,true);pick(t,mode);drain(t);assert.ok(has(t,0,'grave',x));assert.equal(t.decision,null);}
});

test('Kooni destroys using current power, obeys target protection, and never targets its own creature',()=>{
 const s=field(),low=add(s,1,'battle',SMALL),high=add(s,1,'battle',WATER,{powerModifiers:[{amount:2000,expires:'end',who:0}]}),protectedUnit=add(s,1,'battle','dm06-048');add(s,0,'battle',WATER);
 play(s,KO);pick(s,true);pick(s,1);assert.deepEqual(vals(s),[low.uid]);pick(s,low);assert.ok(has(s,1,'battle',high)&&has(s,1,'battle',protectedUnit));
});

test('Kooni is an entry trigger, not a death trigger, and does not offer under GG or Genmu (QA39103)',()=>{
 for(const id of [GG,GEN]){const s=field();const blocker=add(s,1,'battle',id);if(id===GG)blocker.under=[inst(SMALL)];play(s,KO);assert.equal(s.decision,null);}
 const s=field(),source=add(s,0,'battle',KO);give(s,1,'hand',[SMALL]);invoke(s,0,[{op:'ExactMove',owner:0,target:source.uid,to:'grave'}]);assert.equal(s.decision,null);assert.equal(s.players[1].hand.length,1);
});

test('Kooni cannot sacrifice a departed source or a later incarnation, and blind discard is deterministic after restoration',()=>{
 for(const mode of ['left','new']){const s=field(),source=play(s,KO);if(mode==='left')s.players[0].hand.push(s.players[0].battle.pop());else source.incarnation=(source.incarnation||0)+1;pick(s,true);assert.equal(s.decision,null);}
 const s=field();give(s,1,'hand',[SMALL,WATER,LIGHT]);play(s,KO);pick(s,true);const t=JSON.parse(JSON.stringify(s));pick(s,0);pick(t,0);drain(s);drain(t);assert.deepEqual(t,s);assert.equal(s.players[1].hand.length,2);assert.equal(s.players[1].grave.length,1);
});

test('A real water S-Trigger summons from hand without payment and triggers both watchers on the opponent turn',()=>{
 const s=field(),attacker=add(s,0,'battle',SMALL),source=add(s,1,'battle',WARA);add(s,1,'battle',OSHI);give(s,1,'mana',[]);give(s,1,'shields',['dm04-026']);
 attack(s,attacker.uid);act(s,'noBlock');assert.equal(s.decision.type,'trigger');act(s,'useTrigger');drain(s);
 assert.ok(s.players[1].battle.some(x=>x.cardId==='dm04-026'));assert.equal(s.players[1].deck.length,19);assert.equal(s.players[1].mana.length,0);boosted(s,source);assert.equal(s.g463Summons[1].n,1);
});

test('Oshiyabami compulsory draw still happens with no discard and can exhaust the library',()=>{
 const s=field();give(s,0,'deck',[SMALL]);play(s,OSHI);assert.equal(s.winner,1);assert.equal(s.players[0].deck.length,0);assert.equal(s.players[0].hand.length,1);
});

test('Warashibe does not regain the first summon after Genmu stops ignoring its ability',()=>{
 const s=field(),source=add(s,0,'battle',WARA),lock=add(s,1,'battle',GEN);play(s,LIGHT);drain(s);assert.equal(e.power(source,false,s),5000);
 s.players[1].battle=[];s.players[1].grave.push(lock);play(s,WATER);drain(s);assert.equal(e.power(source,false,s),5000);assert.equal(s.g463Summons[0].n,2);
});

test('Kooni blind-discard mode does not reveal the hidden hand to its controller or AI',()=>{
 const s=field();give(s,1,'hand',[BIG,LIGHT,WATER]);play(s,KO);pick(s,true);const before=JSON.stringify(s),action=e.chooseAI(s);e.analyzeAI(s);assert.equal(JSON.stringify(s),before);
 const t=JSON.parse(before);t.players[1].hand.forEach(x=>x.cardId=SMALL);assert.deepEqual(e.chooseAI(t),action);pick(s,0);assert.equal(s.decision,null);assert.equal(s.players[1].grave.length,1);assert.equal(s.players[1].hand.length,2);
});
