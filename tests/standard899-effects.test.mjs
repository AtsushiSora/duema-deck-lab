import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN,GG} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
const DON='dmrp17-011',CROSS='dmrp09-057',SPIN='dmrp11-054',N='dm01-108',W='dm01-083',F='dm01-097',L='dm01-075',BIG='dm05-s04',FIVE='dmrp14-007',SIX='dm02-001',SEED='dmsd20-016',SPELL='dm06-085';
const add=(s,p,z,id,props)=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
function field(p=0){const s=setup();s.active=p;for(const q of [0,1])give(s,q,'deck',Array(24).fill(N));return s;}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid),phys=s=>e.physicalCards(s).map(x=>x.uid).sort();
const vals=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,x)=>act(s,'extended',a=>vals(s)[a.choice]===(x?.uid??x));
function play(s,id){s.phase='main';const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
function invoke(s,p,defs){s.phase='main';s.extTasks=[{op:'g34_Sequence',p,source:DON,defs}];act(s,'toAttack');}
function deploy(s,p,x,origin='hand'){invoke(s,p,[{op:'Put',origin,target:x.uid}]);}
function seal(s,p,x){x.sealed=true;add(s,p,'seals',N,{faceDown:true,sealOf:x.uid});}
function finishAttack(s){if(s.decision?.type==='block')act(s,'noBlock');drain(s);}
function fight(s,p,a,b){s.extTasks=[{op:'g34_Fight240',p,source:a.cardId,uid:a.uid,incarnation:a.incarnation||0,self:true}];s.phase='main';act(s,'toAttack');pick(s,b);drain(s);}

test('Phase899 verifies three complete definitions, four official printings, IDs, mana, images and forty-card legality',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-899.json',import.meta.url))),cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[DON,CROSS,SPIN]);assert.deepEqual(m.printAliases.map(({id,canonicalId})=>({id,canonicalId})),[{id:'dm22ex2-013',canonicalId:DON}]);
 for(const row of m.cards){const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:899}),row.spec);assert.throws(()=>standardCardSpec(d,{phase:898}));const changed=structuredClone(d);changed.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(changed,{phase:899}));for(const [k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],['creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);assert.equal(m.regulationVerification.limits[row.id],4);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(row.verification.facesMatched);assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);}
 const alias=m.printAliases[0];assert.deepEqual(standardCardSpec({...alias,status:'complete'},{phase:899}),m.cards[0].spec);assert.deepEqual(cat.resolveRows([{id:alias.id,count:4}]),[{id:DON,count:4}]);
 const deck={id:'phase899',name:'追い越し',cards:[DON,CROSS,SPIN,N,W,F,L,BIG,FIVE,SPELL].map(id=>({id,count:4}))};assert.deepEqual(e.validateDeck(deck),[]);assert.equal(cat.coverage(deck).unsupported,0);
});

for(const p of [0,1])test('Don optional entry deploys a cost-five hand creature without summoning '+p,()=>{
 let s=field(p),hand=add(s,p,'hand',FIVE);add(s,p,'hand',SIX);add(s,p,'hand',SPELL);const source=play(s,DON),before=phys(s);assert.deepEqual(vals(s),[hand.uid,null]);s=JSON.parse(JSON.stringify(s));pick(s,hand);drain(s);assert.ok(has(s,p,'battle',hand)&&has(s,p,'battle',source));assert.equal(s.g463Summons[p].n,1);assert.deepEqual(phys(s),before);
});
test('Don may decline entry, excludes illegal evolution, and can put an evolution onto its legal base',()=>{
 const s=field(),hand=add(s,0,'hand',N);play(s,DON);pick(s,null);assert.ok(has(s,0,'hand',hand));
 const t=field(),evo=add(t,0,'hand','dm02-s04');play(t,DON);assert.equal(t.decision,null);assert.ok(has(t,0,'hand',evo));
 const u=field(),base=add(u,0,'battle',F),evolution=add(u,0,'hand','dm02-s04');play(u,DON);pick(u,evolution);pick(u,base);drain(u);assert.ok(u.players[0].battle.find(x=>x.uid===evolution.uid).under.some(x=>x.uid===base.uid));
});
test('Don obeys entry prohibition and hand entry is unaffected by Wallaby',()=>{
 const s=field(),x=add(s,0,'hand',N);invoke(s,1,[{op:'Lock',limit:{kind:'entryCost',player:0,max:3}}]);play(s,DON);assert.ok(has(s,0,'hand',x));assert.equal(s.decision,null);
 const t=field(),y=add(t,0,'hand',N);add(t,1,'battle','dmrp14-035');play(t,DON);pick(t,y);drain(t);assert.ok(has(t,0,'battle',y));
});
for(const p of [0,1])test('Don immediately Mach Fights cost-five creatures with Slayer but not cost-six '+p,()=>{
 for(const id of [FIVE,SIX]){const s=field(p),enemy=add(s,1-p,'battle',id),source=play(s,DON);attack(s,source.uid,enemy.uid);assert.equal(!!e.effectiveCard(source,s).slayer,id===FIVE);finishAttack(s);assert.ok(has(s,p,'grave',source));assert.equal(has(s,1-p,'grave',enemy),id===FIVE);}
});
test('Don Slayer changes to the blocker actual cost in both directions (QA39683)',()=>{
 for(const [targetId,blockId,slayer]of [[FIVE,'dm01-004',false],[SIX,'dm01-011',true]]){let s=field(),source=add(s,0,'battle',DON),target=add(s,1,'battle',targetId,{tapped:true}),block=add(s,1,'battle',blockId);attack(s,source.uid,target.uid);assert.equal(!!e.effectiveCard(source,s).slayer,targetId===FIVE);s=JSON.parse(JSON.stringify(s));act(s,'block',a=>a.uid===block.uid);drain(s);assert.equal(has(s,1,'grave',block),slayer);assert.ok(has(s,1,'battle',target)&&has(s,0,'grave',source));}
});
test('Don has no Slayer while defending, blocking, making a normal effect battle, or attacking a player',()=>{
 for(const mode of ['defend','block','effect','player']){const s=field(mode==='defend'||mode==='block'?1:0),source=add(s,0,'battle',DON),enemy=add(s,1,'battle',FIVE);if(mode==='defend'){source.tapped=true;attack(s,enemy.uid,source.uid);finishAttack(s);}if(mode==='block'){source.g34Grants=[{turn:s.turn,blocker:true}];attack(s,enemy.uid);act(s,'block',a=>a.uid===source.uid);drain(s);}if(mode==='effect')fight(s,0,source,enemy);if(mode==='player'){attack(s,source.uid);assert.equal(!!e.effectiveCard(source,s).slayer,false);finishAttack(s);}assert.ok(has(s,1,'battle',enemy),mode);}
});
test('Don condition and entry respect ignored abilities and GG suppression scopes',()=>{
 for(const mode of ['genmu','gg']){const s=field(),source=add(s,0,'hand',DON),hand=add(s,0,'hand',N),enemy=add(s,1,'battle',FIVE,{tapped:true});if(mode==='genmu')add(s,1,'battle',GEN);if(mode==='gg')add(s,1,'battle',GG).under=[inst(N)];deploy(s,0,source);drain(s);assert.ok(has(s,0,'hand',hand));if(mode==='genmu'){assert.ok(!e.getLegalActions({...s,phase:'attack'}).some(a=>a.kind==='attack'&&a.uid===source.uid));source.entered=0;}attack(s,source.uid,enemy.uid);assert.equal(!!e.effectiveCard(source,s).slayer,mode==='gg');finishAttack(s);assert.equal(has(s,1,'grave',enemy),mode==='gg');}
});
test('Don gained Slayer stacks with another granted Slayer',()=>{
 const s=field(),source=add(s,0,'battle',DON,{g34Grants:[{turn:s.turn,slayer:true}]}),enemy=add(s,1,'battle',FIVE,{tapped:true});attack(s,source.uid,enemy.uid);assert.equal(e.effectiveCard(source,s).g208SlayerCount,2);finishAttack(s);assert.ok(has(s,1,'grave',enemy));
});

for(const p of [0,1])for(const n of [0,1,3])test('Cross taps any chosen count and ramps exactly that many '+p+'/'+n,()=>{
 let s=field(p),source=add(s,p,'battle',CROSS),allies=[add(s,p,'battle',N),add(s,p,'battle',W),add(s,p,'battle',F)],before=phys(s);attack(s,source.uid);const mana=s.players[p].mana.length;for(let i=0;i<n;i++){pick(s,allies[i]);if(i===0){assert.equal(allies[0].tapped,false);assert.ok(!vals(s).includes(allies[0].uid));s=JSON.parse(JSON.stringify(s));}}if(n<3)pick(s,null);finishAttack(s);assert.equal(s.players[p].mana.length,mana+n);assert.equal(s.players[p].deck.length,24-n);assert.equal(s.players[p].battle.filter(x=>allies.some(y=>y.uid===x.uid)&&x.tapped).length,n);assert.deepEqual(phys(s),before);
});
test('Cross excludes source, opponent, seeds, sealed and previously tapped creatures',()=>{
 const s=field(),source=add(s,0,'battle',CROSS),valid=add(s,0,'battle',N);add(s,1,'battle',W);add(s,0,'battle',SEED);add(s,0,'battle',F,{tapped:true});seal(s,0,add(s,0,'battle',W));attack(s,source.uid);assert.deepEqual(vals(s),[valid.uid,null]);pick(s,valid);finishAttack(s);assert.equal(s.players[0].mana.length,51);
});
test('Cross finishes with no targets, suppressed attack ability, or GG',()=>{
 for(const mode of ['none','ignored','genmu','gg']){const s=field(),source=add(s,0,'battle',CROSS);if(mode!=='none')add(s,0,'battle',N);if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='genmu')add(s,1,'battle',GEN);if(mode==='gg')add(s,1,'battle',GG).under=[inst(N)];attack(s,source.uid);finishAttack(s);assert.equal(s.players[0].mana.length,50,mode);}
});
test('Cross selected creatures that can no longer be tapped do not contribute ramp',()=>{
 const s=field(),source=add(s,0,'battle',CROSS),a=add(s,0,'battle',N),b=add(s,0,'battle',W),c=add(s,0,'battle',F);attack(s,source.uid);pick(s,a);pick(s,b);a.tapped=true;seal(s,0,b);pick(s,null);finishAttack(s);assert.equal(s.players[0].mana.length,50);assert.equal(c.tapped,false);
});
test('Cross AI declines optional fatal ramp and mandatory chosen ramp can lose on the last library card',()=>{
 for(const ai of [false,true]){const s=field(),source=add(s,0,'battle',CROSS),ally=add(s,0,'battle',N);give(s,0,'deck',[W]);attack(s,source.uid);if(ai){assert.equal(s.decision.choices[e.chooseAI(s).choice].value,null);drain(s);assert.equal(s.winner,null);assert.equal(ally.tapped,false);}else{pick(s,ally);assert.equal(s.winner,1);assert.equal(s.players[0].deck.length,0);}}
});
test('Cross finishes its queued ramp after source departure and honors deck-to-mana replacement',()=>{
 const s=field(),source=add(s,0,'battle',CROSS),ally=add(s,0,'battle',N);add(s,1,'battle','dmrp22-033');attack(s,source.uid);s.players[0].grave.push(s.players[0].battle.shift());pick(s,ally);finishAttack(s);assert.ok(has(s,0,'grave',source));assert.equal(s.players[0].deck.length,23);assert.equal(s.players[0].mana.length,50);assert.equal(s.players[0].grave.length,2);
});

for(const p of [0,1])test('Spin is slow as the first entry but gains haste from another prior creature even if it left '+p,()=>{
 const s=field(p),first=play(s,SPIN);assert.equal(!!e.effectiveCard(first,s).speedAttacker,false);assert.ok(!e.getLegalActions({...s,phase:'attack'}).some(a=>a.kind==='attack'&&a.uid===first.uid));s.players[p].grave.push(s.players[p].battle.pop());const second=play(s,SPIN);assert.ok(e.effectiveCard(second,s).speedAttacker);attack(s,second.uid);finishAttack(s);assert.equal(s.players[1-p].shields.length,4);
});
test('Spin ignores prior opponent, seed, and replaced entries but counts ignored creature entry',()=>{
 for(const mode of ['opponent','seed','replaced','ignored']){const s=field(),prior=add(s,mode==='opponent'?1:0,'hand',mode==='seed'?SEED:N);if(mode==='replaced'){s.players[0].hand.pop();s.players[0].grave.push(prior);add(s,1,'battle','dmrp14-035');}const gen=mode==='ignored'?add(s,1,'battle',GEN):null;deploy(s,mode==='opponent'?1:0,prior,mode==='replaced'?'grave':'hand');drain(s);if(gen)s.players[1].grave.push(s.players[1].battle.pop());const x=play(s,SPIN);assert.equal(!!e.effectiveCard(x,s).speedAttacker,mode==='ignored',mode);}
});
test('Spin entry ability is suppressed by GG or Genmu, and haste resets on a later turn',()=>{
 for(const mode of ['gg','genmu','normal']){const s=field(),prior=play(s,N);if(mode==='gg')add(s,1,'battle',GG).under=[inst(N)];if(mode==='genmu')add(s,1,'battle',GEN);const source=play(s,SPIN);assert.equal(!!e.effectiveCard(source,s).speedAttacker,mode==='normal');s.phase='attack';act(s,'endTurn');drain(s);assert.equal(!!e.effectiveCard(source,s).speedAttacker,false);assert.ok(has(s,0,'battle',prior));}
});
test('Spin uses the existing same-turn history for simultaneous deployment and survives JSON continuation',()=>{
 let s=field(),a=add(s,0,'hand',N),b=add(s,0,'hand',SPIN);invoke(s,0,[{op:'Select',origin:'hand',deploy:true,n:2,filter:{creature:true}}]);pick(s,a);s=JSON.parse(JSON.stringify(s));pick(s,b);drain(s);assert.ok(e.effectiveCard(s.players[0].battle.find(x=>x.uid===b.uid),s).speedAttacker);assert.equal(s.players[0].enteredThisTurn,2);
});

test('Don static attacking condition is ignored immediately on the battlefield',()=>{
 const s=field(),source=add(s,0,'battle',DON,{g35Ignored:s.turn}),enemy=add(s,1,'battle',FIVE,{tapped:true});attack(s,source.uid,enemy.uid);assert.equal(!!e.effectiveCard(source,s).slayer,false);finishAttack(s);assert.ok(has(s,1,'battle',enemy)&&has(s,0,'grave',source));
});

test('Cross tapping invokes native first-tap abilities once and completes ramp before their draw',()=>{
 const s=field(),source=add(s,0,'battle',CROSS),ally=add(s,0,'battle','dmrp04s-069');const top=s.players[0].deck[0];attack(s,source.uid);pick(s,ally);drain(s);assert.ok(ally.tapped);assert.ok(has(s,0,'mana',top));assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].deck.length,22);
});
test('Cross excludes the evolved host of its queued source from other-creature selection',()=>{
 const s=field(),old=inst(CROSS),host=add(s,0,'battle','dm02-s04',{under:[old]}),ally=add(s,0,'battle',N);s.extTasks=[{op:'g34_Sequence',p:0,source:CROSS,uid:old.uid,incarnation:0,defs:e.card(CROSS).g34Attack}];s.phase='main';act(s,'toAttack');assert.deepEqual(vals(s),[ally.uid,null]);pick(s,ally);drain(s);assert.equal(host.tapped,false);assert.equal(s.players[0].mana.length,51);
});
test('Spin granted haste is ignored then restored within its duration (QA39131)',()=>{
 const s=field();play(s,N);const source=play(s,SPIN);assert.ok(e.effectiveCard(source,s).speedAttacker);source.g35Ignored=s.turn;assert.equal(!!e.effectiveCard(source,s).speedAttacker,false);delete source.g35Ignored;assert.ok(e.effectiveCard(source,s).speedAttacker);s.phase='attack';act(s,'endTurn');drain(s);assert.equal(!!e.effectiveCard(source,s).speedAttacker,false);
});
test('Spin does not reuse a previous turn creature entry',()=>{
 const s=field();play(s,N);s.phase='attack';act(s,'endTurn');drain(s);assert.equal(s.players[0].enteredThisTurn,0);s.active=0;const source=play(s,SPIN);assert.equal(!!e.effectiveCard(source,s).speedAttacker,false);
});
