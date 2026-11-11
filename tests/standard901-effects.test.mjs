import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN,GG} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
const M='dmrp17-041',O='dmrp09-044',U='dmrp11-094',N='dm01-108',W='dm01-083',F='dm01-097',L='dm01-075',BIG='dm05-s04',SIX='dm01-s04',LOW='dmrp14-007',SEED='dmsd20-016',SPELL='dm06-085',APUL='dmrp22-042';
function field(p=0){const s=setup();s.active=p;for(const q of [0,1])give(s,q,'deck',Array(24).fill(N));return s;}
const add=(s,p,z,id,props)=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid),phys=s=>e.physicalCards(s).map(x=>x.uid).sort();
const vals=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,x)=>act(s,'extended',a=>vals(s)[a.choice]===(x?.uid??x));
function play(s,id){s.phase='main';const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
function invoke(s,p,defs){s.phase='main';s.extTasks=[{op:'g34_Sequence',p,source:M,defs}];act(s,'toAttack');}
function deploy(s,p,x,origin='hand',after=[]){invoke(s,p,[{op:'Put',origin,target:x.uid},...after]);}
function kill(s,p,x,to='grave',element=false){invoke(s,p,[{op:'Target',owner:p,to,element,filter:{exactUid:x.uid}}]);pick(s,x);}
function seal(s,p,x){x.sealed=true;add(s,p,'seals',N,{faceDown:true,sealOf:x.uid});}
function finish(s){if(s.decision?.type==='block')act(s,'noBlock');drain(s);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function attacks(s,x){s.phase='attack';return e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);}
const pause={op:'Offer',title:'待機中',defs:[]};

test('Phase901 validates three full definitions, images, stats, limits, canonical IDs and a legal forty',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-901.json',import.meta.url))),cat=createCatalogue(snapshot,data.cards,details);assert.deepEqual(m.cards.map(c=>c.id),[M,O,U]);assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:901}),row.spec);assert.throws(()=>standardCardSpec(d,{phase:900}));const changed=structuredClone(d);changed.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(changed,{phase:901}));for(const [k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],['creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);assert.equal(m.regulationVerification.limits[row.id],4);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(row.verification.facesMatched);assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);assert.deepEqual(cat.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);}
 const deck={id:'phase901',name:'戻ってくるもの',cards:[M,O,U,N,W,F,L,BIG,LOW,SPELL].map(id=>({id,count:4}))};assert.deepEqual(e.validateDeck(deck),[]);assert.equal(cat.coverage(deck).unsupported,0);
});
for(const p of [0,1])for(const summon of [false,true])test('Moors grave recovery is mandatory for own 6000 entry, summoned or not '+p+'/'+summon,()=>{
 const s=field(p),source=add(s,p,'grave',M),before=phys(s);if(summon)play(s,SIX);else{const x=add(s,p,'hand',SIX);deploy(s,p,x);}drain(s);assert.ok(has(s,p,'hand',source));assert.ok(!has(s,p,'grave',source));assert.equal(s.decision,null);assert.equal(new Set(phys(s)).size,phys(s).length);assert.ok(before.every(uid=>phys(s).includes(uid)));
});
test('Moors excludes lower power, opposing entries, seeds, its battlefield copy and non-grave cards',()=>{
 for(const mode of ['low','opponent','seed','battle','hand']){const s=field(),source=add(s,0,['battle','hand'].includes(mode)?mode:'grave',M),x=add(s,mode==='opponent'?1:0,'hand',mode==='low'?LOW:mode==='seed'?SEED:SIX);deploy(s,mode==='opponent'?1:0,x);drain(s);assert.equal(has(s,0,'grave',source),!['battle','hand'].includes(mode),mode);if(mode==='battle')assert.ok(has(s,0,'battle',source));}
});
test('Moors uses current entry power including static auras, not printed power or a later boost',()=>{
 for(const aura of [false,true]){const s=field(),source=add(s,0,'grave',M);if(aura)add(s,0,'battle','dm02-s04');const body=play(s,'dmr10-055');drain(s);assert.equal(e.power(body,false,s),aura?6000:5000);assert.equal(has(s,0,'hand',source),aura);}
 const t=field(),source=add(t,0,'grave',M),x=add(t,0,'hand',LOW);deploy(t,0,x,'hand',[pause]);x.powerModifiers=[{amount:500,expires:'end',who:0}];pick(t,null);drain(t);assert.ok(has(t,0,'grave',source));
});
test('Moors fixes the power condition when entry occurs, before later changes (QA39665 principle)',()=>{
 let s=field(),source=add(s,0,'grave',M),x=add(s,0,'hand',SIX);deploy(s,0,x,'hand',[pause]);x.powerModifiers=[{amount:-1000,expires:'end',who:0}];s=JSON.parse(JSON.stringify(s));pick(s,null);drain(s);assert.ok(has(s,0,'hand',source));
});
test('Moors in grave remains active under Genmu, GG and Brachio (QA41293)',()=>{
 for(const id of [GEN,GG,'dmrp14-s05']){const s=field(),source=add(s,0,'grave',M),enemy=add(s,1,'battle',id);if(id===GG)enemy.under=[inst(N)];play(s,SIX);drain(s);assert.ok(has(s,0,'hand',source),id);}
});
test('Moors grave recovery respects Apul and only the original grave visit',()=>{
 const s=field(),source=add(s,0,'grave',M);add(s,1,'battle',APUL);play(s,SIX);drain(s);assert.ok(has(s,0,'grave',source));
 const t=field(),x=add(t,0,'grave',M),entrant=add(t,0,'hand',SIX);deploy(t,0,entrant,'hand',[{op:'Select',origin:'grave',to:'hand',n:1,filter:{exactUid:x.uid}},{op:'Discard',owner:'self',n:1}]);pick(t,x);drain(t);assert.ok(has(t,0,'grave',x));assert.equal(t.players[0].hand.length,0);
});
test('Moors returns multiple grave copies independently with no duplicate physical cards',()=>{
 const s=field(),one=add(s,0,'grave',M),two=add(s,0,'grave',M),x=add(s,0,'hand',SIX),before=phys(s);deploy(s,0,x);drain(s);assert.ok(has(s,0,'hand',one)&&has(s,0,'hand',two));assert.deepEqual(phys(s),before);
});
for(const save of [false,true])test('Moors Shield Saver optionally preserves the actual shield '+save,()=>{
 const s=field(1),source=add(s,0,'battle',M),a=add(s,1,'battle',N),before=phys(s);attack(s,a.uid);act(s,'noBlock');assert.equal(s.decision.type,'shieldGuard');if(save)act(s,'saveShield',z=>z.uid===source.uid);else act(s,'finishShieldGuards');drain(s);assert.equal(s.players[0].shields.length,save?5:4);assert.equal(has(s,0,'grave',source),save);assert.deepEqual(phys(s),before);if(save){s.active=0;play(s,SIX);drain(s);assert.ok(has(s,0,'hand',source));}
});
test('Moors ignored or sealed shield saver cannot be chosen',()=>{
 for(const mode of ['ignored','sealed','genmu']){const s=field(1),x=add(s,0,'battle',M),a=add(s,1,'battle',N);if(mode==='ignored')x.g35Ignored=s.turn;if(mode==='sealed')seal(s,0,x);if(mode==='genmu')add(s,1,'battle',GEN);attack(s,a.uid);act(s,'noBlock');assert.ok(!e.getLegalActions(s).some(z=>z.kind==='saveShield'&&z.uid===x.uid));drain(s);assert.equal(s.players[0].shields.length,4);}
});
for(const p of [0,1])test('Only Walker cannot attack until either side really destroys a creature '+p,()=>{
 for(const owner of [0,1]){const s=field(p),x=add(s,p,'battle',O),victim=add(s,owner,'battle',N);assert.equal(attacks(s,x).length,0);kill(s,owner,victim);drain(s);assert.ok(attacks(s,x).some(a=>a.target==='player'));attack(s,x.uid);finish(s);assert.equal(s.players[1-p].shields.length,3);}
});
test('Only Walker sees destruction that happened before it existed but still has summoning sickness',()=>{
 const s=field(),victim=add(s,1,'battle',N);kill(s,1,victim);drain(s);const source=play(s,O);assert.equal(attacks(s,source).length,0);source.g34Grants=[{turn:s.turn,speedAttacker:true}];assert.ok(attacks(s,source).length>0);
});
test('Only Walker ignores bounce, a replaced destruction, and destruction of a noncreature',()=>{
 for(const mode of ['bounce','replace','seed']){const s=field(),source=add(s,0,'battle',O),victim=add(s,1,'battle',mode==='replace'?'dmrp08-052':mode==='seed'?SEED:N);kill(s,1,victim,mode==='bounce'?'hand':'grave',mode==='seed');drain(s);assert.equal(attacks(s,source).length,0,mode);assert.notEqual(s.g612CreatureDeathTurn,s.turn);}
});
test('Only Walker counts battle deaths, ignored victims and destruction from zero power',()=>{
 for(const mode of ['battle','ignored','zero']){const s=field(),source=add(s,0,'battle',O),victim=add(s,1,'battle',N,{tapped:true});if(mode==='battle'){const a=add(s,0,'battle',BIG);attack(s,a.uid,victim.uid);finish(s);}if(mode==='ignored'){victim.g35Ignored=s.turn;kill(s,1,victim);drain(s);}if(mode==='zero'){invoke(s,0,[{op:'Target',power:-2000,g242PowerMinus:true,filter:{exactUid:victim.uid}}]);pick(s,victim);drain(s);}assert.ok(has(s,1,'grave',victim));assert.ok(attacks(s,source).length>0,mode);}
});
test('Only Walker attack restriction resets every turn and is removed while ignored',()=>{
 const s=field(),source=add(s,0,'battle',O),victim=add(s,1,'battle',N);kill(s,1,victim);drain(s);let saved=JSON.parse(JSON.stringify(s));assert.ok(attacks(saved,saved.players[0].battle[0]).length>0);end(saved);end(saved);const x=saved.players[0].battle.find(y=>y.uid===source.uid);assert.equal(attacks(saved,x).length,0);x.g35Ignored=saved.turn;assert.ok(attacks(saved,x).length>0);delete x.g35Ignored;assert.equal(attacks(saved,x).length,0);
});
for(const p of [0,1])for(const tap of [false,true])test('Ukky revives tapped exactly when untapped immediately before destruction '+p+'/'+tap,()=>{
 const s=field(p),source=add(s,p,'battle',U,{tapped:tap}),before=phys(s);kill(s,p,source);drain(s);assert.equal(has(s,p,'battle',source),!tap);assert.equal(has(s,p,'grave',source),tap);if(!tap){assert.ok(source.tapped);assert.equal(source.entered,s.turn);assert.equal(s.players[p].enteredThisTurn,1);assert.equal(s.g463Summons?.[p]?.n||0,0);}assert.deepEqual(phys(s),before);
});
test('Ukky uses before-destruction tap state, not the cleared state in grave (QA32351)',()=>{
 const s=field(),source=add(s,0,'battle',U,{tapped:true});kill(s,0,source);drain(s);assert.ok(has(s,0,'grave',source));assert.equal(source.tapped,false);
});
test('Ukky does not revive after a bounce, mana move, or ignored death ability',()=>{
 for(const mode of ['hand','mana','ignored','genmu']){const s=field(),source=add(s,0,'battle',U);if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='genmu')add(s,1,'battle',GEN);kill(s,0,source,['hand','mana'].includes(mode)?mode:'grave');drain(s);assert.ok(has(s,0,['hand','mana'].includes(mode)?mode:'grave',source));assert.equal(s.players[0].enteredThisTurn||0,0);}
});
test('Ukky grave deployment honors Apul, Wallaby and Tokoshie without chaining replacements',()=>{
 for(const [id,zone]of [[APUL,'grave'],['dmrp14-035','hand'],['dmrp17-025','mana']]){const s=field(),source=add(s,0,'battle',U);add(s,1,'battle',id);const before=phys(s);kill(s,0,source);drain(s);assert.ok(has(s,0,zone,source),id);assert.deepEqual(phys(s),before);}
});
test('Ukky works after defending an untapped attack, but not after being tapped to attack',()=>{
 const s=field(1),source=add(s,0,'battle',U),a=add(s,1,'battle','dmrp17-011',{entered:s.turn});attack(s,a.uid,source.uid);finish(s);assert.ok(has(s,0,'battle',source)&&source.tapped);
 const t=field(),u=add(t,0,'battle',U),enemy=add(t,1,'battle',BIG,{tapped:true});attack(t,u.uid,enemy.uid);finish(t);assert.ok(has(t,0,'grave',u));
});
test('Ukky simultaneous destruction keeps separate tap snapshots and physical identities',()=>{
 let s=field(),one=add(s,0,'battle',U),two=add(s,0,'battle',U,{tapped:true}),before=phys(s);invoke(s,0,[{op:'Sweep',to:'grave',both:true,filter:{creature:true}}]);s=JSON.parse(JSON.stringify(s));drain(s);assert.ok(has(s,0,'battle',one)&&has(s,0,'grave',two));assert.deepEqual(phys(s),before);
});

test('Ukky cannot revive a later grave visit after its queued death trigger lost the original card',()=>{
 const s=field(),x=add(s,0,'battle',U);invoke(s,0,[{op:'Sweep',both:true,to:'grave',filter:{creature:true}},{op:'Select',origin:'grave',to:'hand',n:1,filter:{exactUid:x.uid}},{op:'Discard',owner:'self',n:1}]);pick(s,x);drain(s);assert.ok(has(s,0,'grave',x));assert.ok(!has(s,0,'battle',x));
});
test('Ukky revives once then stays destroyed if it dies again while tapped',()=>{
 const s=field(),x=add(s,0,'battle',U),before=phys(s);kill(s,0,x);drain(s);assert.ok(has(s,0,'battle',x)&&x.tapped);kill(s,0,x);drain(s);assert.ok(has(s,0,'grave',x));assert.equal(s.players[0].enteredThisTurn,1);assert.deepEqual(phys(s),before);
});
test('Only Walker does not count a sealed card moved to grave as a destroyed creature',()=>{
 const s=field(),x=add(s,0,'battle',O),victim=add(s,1,'battle',N);seal(s,1,victim);invoke(s,0,[{op:'Sweep',both:true,to:'grave',filter:{element:true,exactUid:victim.uid},element:true}]);drain(s);assert.ok(has(s,0,'battle',x));assert.notEqual(s.g612CreatureDeathTurn,s.turn);
});
test('Two untapped Ukky deaths preserve queued source identities through JSON and both return tapped',()=>{
 let s=field(),a=add(s,0,'battle',U),b=add(s,0,'battle',U),before=phys(s);invoke(s,0,[{op:'Sweep',both:true,to:'grave',filter:{creature:true}}]);assert.equal(s.decision?.type,'effectOrder');s=JSON.parse(JSON.stringify(s));drain(s);assert.ok(has(s,0,'battle',a)&&has(s,0,'battle',b));assert.ok(s.players[0].battle.every(x=>x.tapped));assert.equal(s.players[0].enteredThisTurn,2);assert.deepEqual(phys(s),before);
});
