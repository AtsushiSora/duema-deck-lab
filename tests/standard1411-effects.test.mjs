import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,inst,act,cast,drain,give} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {handInspectorHTML} from '../dist/hand-ui.js';
const TUNE='dm23rp2-S03',UMA='dmrp13-s08',N='dm01-108',HAND='dm01-027';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-1411.json',import.meta.url)));
function field(){const s=setup();s.active=0;s.turn=3;for(const p of[0,1])give(s,p,'deck',Array(40).fill(N));return s;}
function put(s,p,id,more={}){const x={...inst(id),cardOwner:p,...more};s.players[p].battle.push(x);return x;}
function play(s,id,n=0,manual=false){const x=inst(id);s.players[s.active].hand.push(x);const a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&(n?a.g1411BuzzN===n:!a.alternative));assert.ok(a);e.step(s,a,manual?{manualMana:true}:{});return x;}
function roundtrip(s){return JSON.parse(JSON.stringify(s));}
function fixtures(cards,fn){e.setCards([...data.cards,...cards.map(c=>({civ:'水',civilizations:['水'],race:'テスト',power:2000,manaValue:1,type:'creature',cost:4,text:'',limit:4,...c}))]);try{return fn();}finally{e.setCards(data.cards);}}
function pick(s,value){act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return(v?.uid??v)===value;});}

test('requested names, complete official abilities, images, limits, metadata and saved decks agree',()=>{
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of manifest.cards){const d=details.cards.find(x=>x.id===row.id);assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:1411}),row.spec);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未対応';assert.throws(()=>standardCardSpec(bad,{phase:1411}));assert.equal(CARD_IMAGES[row.id],row.image);assert.match(row.verification.imageSha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,4);assert.ok(cat.get(row.id).supported);assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).length,1);}
 const deck={id:'requested1411',name:'指定2種類',cards:[TUNE,UMA,N,'dm01-075','dm01-083','dm01-090','dm01-097','dm01-050','dm01-051','dm01-103'].map(id=>({id,count:4}))},saved=JSON.stringify(deck);
 assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(cat.validate(deck),[]);const s=e.createGame([deck,deck],{seed:1411});assert.equal(e.physicalCards(s).length,80);assert.equal(JSON.stringify(deck),saved);
});

for(const n of[0,1,2,4])test('Umakin pays 4 + 2 per addition and completes each look/hand/tapped-mana pair: '+n,()=>{
 let s=field();const before=e.physicalCards(s).map(x=>x.uid).sort(),deck=s.players[0].deck.length;
 const x=play(s,UMA,n);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4+2*n);
 let rounds=0;
 while(s.decision){assert.equal(s.decision.type,'extended');assert.match(s.decision.title,/手札/);assert.equal(s.players[0].hand.length,rounds);assert.equal(s.players[0].mana.length,50+rounds);s=roundtrip(s);e.step(s,e.chooseAI(s));rounds++;assert.ok(rounds<10);}
 assert.equal(rounds,n+1);assert.equal(s.players[0].deck.length,deck-2*(n+1));assert.equal(s.players[0].hand.length,n+1);assert.equal(s.players[0].mana.length,51+n);assert.ok(s.players[0].mana.slice(50).every(x=>x.tapped));assert.equal(e.power(s.players[0].battle.find(y=>y.uid===x.uid),false,s),(51+n)*1000);
 assert.deepEqual(e.physicalCards(s).filter(y=>y.uid!==x.uid).map(y=>y.uid).sort(),before);
});

test('buzz choices stop at available mana, retain both civilization requirements and show the repeat count',()=>{
 const s=field();give(s,0,'mana',['dm01-083',N,N,N,N,N,N]);const x=inst(UMA);s.players[0].hand.push(x);
 const actions=e.getLegalActions(s).filter(a=>a.uid===x.uid&&a.kind==='play');assert.deepEqual(actions.map(a=>a.g1411BuzzN||0),[0,1]);assert.match(actions[1].label,/追加1回/);
 s.players[0].mana=s.players[0].mana.filter(x=>x.cardId!=='dm01-083');assert.ok(!e.getLegalActions(s).some(a=>a.uid===x.uid&&a.kind==='play'));
});

test('the hand buttons show the number of additional buzz payments and the actual mana cost',()=>{
 const s=field();give(s,0,'mana',['dm01-083',N,N,N,N,N]);const x=inst(UMA);s.players[0].hand=[x];const html=handInspectorHTML(s,{hand:x.uid},{art:()=>''});assert.match(html,/バズレンダ追加1回で召喚 · 6マナ/);assert.match(html,/召喚する · 4マナ/);
});

test('manual mana payment preserves buzz addition through cancel, JSON replay and actual payment',()=>{
 let s=field();give(s,0,'mana',['dm01-083',N,N,N,N,N]);const x=play(s,UMA,1,true);assert.equal(s.decision.type,'manaPayment');assert.equal(s.decision.cost,6);assert.deepEqual(s.decision.colors,['水','自然']);assert.ok(!s.players[0].mana.some(x=>x.tapped));act(s,'cancelMana');assert.ok(s.players[0].hand.includes(x));const a=e.getLegalActions(s).find(a=>a.uid===x.uid&&a.g1411BuzzN===1);e.step(s,a,{manualMana:true});s=roundtrip(s);for(let i=0;s.decision?.type==='manaPayment';i++){assert.ok(i<20);e.step(s,e.chooseAI(s));}assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);drain(s);assert.equal(s.players[0].hand.length,2);assert.equal(s.players[0].mana.length,8);
});

test('Fairy Gift reduces the combined base and additional cost rather than just the base',()=>{
 const s=field();cast(s,'dm14-069');drain(s);const paid=s.players[0].mana.filter(x=>x.tapped).length;play(s,UMA,2);assert.equal(s.players[0].mana.filter(x=>x.tapped).length-paid,5);drain(s);assert.equal(s.players[0].hand.length,3);
});

test('free and non-summon entry use the one default buzz ability without additional payment',()=>fixtures([{id:'test1411-deploy',name:'無料出しテスト',type:'spell',cost:1,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'hand',n:1,filter:{creature:true},deploy:true}]}],()=>{
 const s=field();give(s,0,'hand',[UMA]);cast(s,'test1411-deploy');drain(s);assert.equal(s.players[0].battle.filter(x=>x.cardId===UMA).length,1);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].mana.length,51);
}));

test('summoning Umakin without paying does not offer additional buzz payments',()=>fixtures([{id:'test1411-free',name:'無料召喚テスト',type:'spell',cost:1,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'hand',n:1,filter:{creature:true},deploy:true,execution:true}]}],()=>{
 const s=field();give(s,0,'hand',[UMA]);play(s,'test1411-free');drain(s);const x=s.players[0].battle.find(x=>x.cardId===UMA);assert.ok(x);assert.equal(x.summonedTurn,s.turn);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].mana.length,51);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
}));

test('Umakin resolves the remaining pairs if it is no longer in battle during resolution',()=>{
 const s=field(),x=play(s,UMA,2);s.players[0].battle=[];s.players[0].grave.push(x);drain(s);assert.equal(s.players[0].hand.length,3);assert.equal(s.players[0].mana.length,53);
});

test('a buzz payment may not be forged above the legal available amount',()=>{
 const s=field();give(s,0,'mana',['dm01-083',N,N,N,N,N]);const x=inst(UMA);s.players[0].hand=[x];const a=e.getLegalActions(s).find(a=>a.g1411BuzzN===1),before=structuredClone(s);assert.throws(()=>e.step(s,{...a,g1411BuzzN:2}));assert.deepEqual(s,before);
});

test('Genmu ignores the printed four-cost Umakin even when six mana was paid',()=>{
 const s=field();put(s,1,'dmrp15-km1');const x=play(s,UMA,1);drain(s);assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));assert.equal(s.players[0].mana.length,50);assert.equal(s.players[0].hand.length,0);
});

test('Orugate copies the full paid repeat count from the entry ability',()=>{
 const s=field();put(s,1,'dm24rp4-S02');play(s,UMA,1);let guard=0;while(s.decision){assert.ok(guard++<60);if(s.decision.type==='extended'&&/オルゲイト.*登場時能力/.test(s.decision.title))pick(s,true);else e.step(s,e.chooseAI(s));}assert.equal(s.players[0].hand.length,2);assert.equal(s.players[1].hand.length,2);assert.equal(s.players[0].mana.length,52);assert.equal(s.players[1].mana.length,52);
});

for(const mana of[5,6,11,12,17,18])test('Umakin power and powered breaker follow the current mana count: '+mana,()=>{
 const s=field();give(s,0,'mana',Array(mana).fill(N));const x=put(s,0,UMA);assert.equal(e.power(x,false,s),mana*1000);s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');act(s,'noBlock');const count=Math.min(5,1+Math.floor(mana/6));if(count===1)assert.equal(s.players[1].shields.length,4);else{assert.equal(s.decision.type,'breakChoice');assert.equal(s.decision.count,count);}
});

test('Tune enters for eight mana, is a 12000 blocker and a triple breaker',()=>{
 const s=field();const x=play(s,TUNE);drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,8);assert.equal(e.power(x,false,s),12000);assert.ok(e.effectiveCard(x,s).blocker);x.entered=0;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');act(s,'noBlock');assert.equal(s.decision.count,3);
});

test('Tune freezes current enemy creatures of printed cost seven or less through the next own start',()=>{
 let s=field();const small=put(s,1,'dm01-001'),seven=put(s,1,'dm01-s04'),big=put(s,1,'dmsd16-001');play(s,TUNE);drain(s);s=roundtrip(s);s.active=1;s.phase='attack';let actions=e.getLegalActions(s);assert.ok(!actions.some(a=>a.kind==='attack'&&[small.uid,seven.uid].includes(a.uid)));assert.ok(actions.some(a=>a.kind==='attack'&&a.uid===big.uid));const later=put(s,1,N);actions=e.getLegalActions(s);assert.ok(actions.some(a=>a.kind==='attack'&&a.uid===later.uid));s.players[0].battle=[];assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===seven.uid));act(s,'endTurn');drain(s);assert.equal(s.active,0);s.active=1;s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===seven.uid));
});

test('Tune freeze also prevents blocking, but does not select or tap creatures',()=>{
 const s=field();const blocker=put(s,1,'dm01-001'),attacker=put(s,0,N);play(s,TUNE);drain(s);assert.equal(blocker.tapped,false);s.phase='attack';act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
});

test('a frozen unit that actually evolves above cost seven can attack; ignoring Tune leaves its resolved freeze',()=>{
 const s=field();const target=put(s,1,'dm01-s01'),tune=play(s,TUNE);drain(s);tune.g35Ignored=s.turn;s.active=1;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===target.uid));assert.equal(e.summonCost(s,1,e.card(HAND)),6);s.phase='main';const evolved=play(s,'dmsp02-003');act(s,'evolve',a=>a.baseUid===target.uid);drain(s);assert.ok(evolved.under.some(x=>x.uid===target.uid));s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===evolved.uid));
});

test('Tune replacement ignores reductions and taxes, retains printed cost and does not tax creatures/own cards',()=>fixtures([{id:'test1411-tax',name:'呪文税テスト',g222SpellTax:{amount:3,opponent:true}},{id:'test1411-eight',name:'8呪文テスト',type:'spell',cost:8,effect:'sixPhoto',g34Tasks:[{op:'Draw',n:1}]}],()=>{
 const s=field();put(s,1,TUNE);put(s,0,'dm28-082');put(s,1,'test1411-tax');assert.equal(e.summonCost(s,0,e.card(HAND)),8);assert.equal(e.card(HAND).cost,6);assert.equal(e.summonCost(s,0,e.card(N)),2);assert.equal(e.summonCost(s,1,e.card(HAND)),6);assert.notEqual(e.summonCost(s,0,e.card('test1411-eight')),8);
}));

test('Tune replacement applies to noncreature elements and adds buzz cost after replacing the base',()=>fixtures([{id:'test1411-seed',name:'タマシードテスト',type:'seed',cost:2},{id:'test1411-buzzspell',name:'バズ呪文テスト',type:'spell',cost:3,effect:'sixPhoto',g1411BuzzRenda:{cost:2},g34Tasks:[{op:'Draw',n:1}]}],()=>{
 const s=field();put(s,1,TUNE);assert.equal(e.summonCost(s,0,e.card('test1411-seed')),8);const spell=e.card('test1411-buzzspell');assert.equal(e.summonCost(s,0,{...spell,g1411BuzzN:1}),10);assert.equal(e.summonCost(s,0,{...spell,cost:10,printedCost:3}),8);assert.equal(e.summonCost(s,0,{...spell,cost:2,fixedPayment:true,g1411BuzzN:1}),4);play(s,spell.id,1);drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,10);assert.equal(s.players[0].hand.length,2);
}));

test('Tune payment replacement does not impose payment on an explicitly free spell',()=>fixtures([{id:'test1411-zero',name:'無料呪文テスト',type:'spell',cost:3,g261Free:{filter:{g837NoManaAdded:true},label:'無料'},effect:'sixPhoto',g34Tasks:[{op:'Draw',n:1}]}],()=>{
 const s=field();put(s,1,TUNE);assert.equal(e.summonCost(s,0,e.card('test1411-zero')),0);play(s,'test1411-zero');drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);assert.equal(s.players[0].hand.length,1);
}));

test('Demon Hand pays eight but cannot select Tune because its printed cost remains six',()=>{
 const s=field();const protectedUnit=put(s,1,TUNE),other=put(s,1,N);play(s,HAND);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,8);assert.ok(s.decision.targets.some(x=>x.uid===other.uid));assert.ok(!s.decision.targets.some(x=>x.uid===protectedUnit.uid));drain(s);assert.ok(s.players[1].battle.includes(protectedUnit));
});

for(const type of['creature','seed','field'])for(const sourceCost of[7,8])test('Tune protection reads the printed cost of an opposing '+type+' ability: '+sourceCost,()=>fixtures([{id:'test1411-source',name:'選択能力テスト',type,cost:sourceCost,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'hand'}]}],()=>{
 let s=field();const protectedUnit=put(s,1,TUNE),other=put(s,1,N);play(s,'test1411-source');assert.equal(s.decision.type,'extended');s=roundtrip(s);const options=s.decision.choices.map(x=>x.value?.uid??x.value);assert.equal(options.includes(protectedUnit.uid),sourceCost===8);assert.ok(options.includes(other.uid));
}));

for(const type of['creature','seed','field'])test('Tune protection still applies after the '+type+' ability source leaves battle',()=>fixtures([{id:'test1411-source',name:'発生源退場テスト',type,cost:7,effect:'sixPhoto',g34Tasks:[{op:'SelfDestroy'},{op:'Target',to:'hand'}]}],()=>{
 let s=field();const protectedUnit=put(s,1,TUNE),other=put(s,1,N);const source=play(s,'test1411-source');assert.ok(!s.players[0].battle.includes(source));assert.equal(s.decision.type,'extended');s=roundtrip(s);assert.ok(!s.decision.choices.some(x=>(x.value?.uid??x.value)===protectedUnit.uid));assert.ok(s.decision.choices.some(x=>(x.value?.uid??x.value)===other.uid));
}));

for(const type of['creature','seed'])test('Tune also protects against a '+type+' leave-triggered ability',()=>fixtures([{id:'test1411-source',name:'離れた時テスト',type,cost:7,effect:'sixPhoto',g34Tasks:[{op:'SelfDestroy'}],g172Leave:[{op:'Target',to:'hand'}]}],()=>{
 const s=field();const protectedUnit=put(s,1,TUNE),other=put(s,1,N);play(s,'test1411-source');assert.equal(s.decision.type,'extended');assert.ok(!s.decision.choices.some(x=>(x.value?.uid??x.value)===protectedUnit.uid));assert.ok(s.decision.choices.some(x=>(x.value?.uid??x.value)===other.uid));
}));

test('Tune protection disappears when its abilities are ignored',()=>{
 const s=field();const tune=put(s,1,TUNE),other=put(s,1,N);tune.g35Ignored=s.turn;play(s,HAND);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);assert.ok(s.decision.targets.some(x=>x.uid===tune.uid));assert.ok(s.decision.targets.some(x=>x.uid===other.uid));
});

test('Tune permits its controller to choose it and permits nonselecting effects',()=>fixtures([{id:'test1411-own',name:'自分の選択テスト',type:'spell',cost:2,effect:'sixPhoto',g34Tasks:[{op:'Target',owner:'self',to:'hand'}]},{id:'test1411-all',name:'全体除去テスト',type:'spell',cost:4,effect:'sixPhoto',g34Tasks:[{op:'Sweep',filter:{creature:true},to:'hand'}]}],()=>{
 const s=field();const tune=put(s,0,TUNE);play(s,'test1411-own');pick(s,tune.uid);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===tune.uid));const other=put(s,1,TUNE);play(s,'test1411-all');drain(s);assert.ok(s.players[1].hand.some(x=>x.uid===other.uid));
}));

test('off-battle G Strike can select Tune even when another copy of the source card is in battle',()=>{
 const s=field();put(s,0,'dmrp17-025');const tune=put(s,1,TUNE);s.players[0].shields=[inst('dmrp17-025')];s.active=1;s.phase='attack';act(s,'attack',a=>a.uid===tune.uid&&a.target==='player');act(s,'noBlock');if(e.getLegalActions(s).some(a=>a.kind==='breakShields'))act(s,'breakShields');let guard=0;while(s.decision&&!/gsTarget/.test(s.decision.task?.op||'')){assert.ok(guard++<30);const choices=e.getLegalActions(s),a=choices.find(a=>a.kind==='declareGS')||choices.find(a=>a.kind==='orderGS')||choices.find(a=>a.kind==='skipTrigger')||e.chooseAI(s);e.step(s,a);}assert.equal(s.decision.task.op,'gsTarget');assert.ok(s.decision.choices.some(x=>(x.value?.uid??x.value)===tune.uid));
});
