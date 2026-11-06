import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,GEN,GG,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD494_DECKS} from '../tools/fixtures/standard494.mjs';

const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-494.json',import.meta.url)));
const JEST='dmrp20-015',MITA='dmrp04m-008',YEAL='dmbd04-005',FIEK='dmrp18-031',GIRI='dmrp04m-010';
const N='dm01-108',F='dm01-097',W='dm01-083',L='dm01-075',LIFE='dm06-110',BOUNCE='dm01-086',CHARGER='dm08-043',DIS='dmrp19-057';
const put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const tapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
const pick=(s,v)=>act(s,'extended',a=>{const x=s.decision.choices[a.choice].value;return typeof v==='function'?v(x):(x?.uid??x)===v;});
const values=s=>s.decision?.choices?.map(x=>x.value)||[];
function field(p=0){const s=setup();s.active=p;for(const q of[0,1])give(s,q,'deck',Array(30).fill(N));return s;}
function finish(s){for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<500,JSON.stringify(s.decision));if(s.decision.type==='block')act(s,'noBlock');else e.step(s,e.chooseAI(s));}}
function play(s,p,id){s.active=p;s.phase='main';const x=inst(id);s.players[p].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
function attack(s,p,x,target='player'){s.active=p;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===target);}
function breakSource(s,p,id,last=true,attackerId=N){const attacker=put(s,1-p,attackerId);give(s,p,'shields',last?[id]:[id,N]);const source=s.players[p].shields[0];attack(s,1-p,attacker);if(s.decision?.type==='block')act(s,'noBlock');if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(source.uid));return{source,attacker};}
const use=(s,x)=>act(s,'useTrigger',a=>a.uid===x.uid);
function order(s,kind){assert.ok(['effectOrder','entryOrder'].includes(s.decision?.type));const entry=s.decision.type==='entryOrder',q=(entry?s.triggers.entries:s.pendingEffects).find(x=>x.effect===kind);assert.ok(q);act(s,entry?'orderEntry':'orderEffect',a=>a.effectId===q.effectId);}

for(const r of m.cards)test(r.name+' has a complete official face, correct stats, art, mana, restriction and phase boundary',()=>{
 const d=details.cards.find(x=>x.id===r.id),before=JSON.stringify(d),c=e.card(r.id);
 assert.deepEqual(r.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase:494}),r.spec);assert.throws(()=>standardCardSpec(d,{phase:493}));assert.equal(JSON.stringify(d),before);
 for(const[k,v]of Object.entries(r.spec))assert.deepEqual(c[k],v);
 assert.equal(c.cost,d.faces[0].cost);assert.equal(c.power,parseInt(d.faces[0].powerText)||0);assert.equal(c.manaValue,1);assert.equal(c.limit,m.regulationVerification.limits[r.id]);
 assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[r.id],r.image);
 const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(bad,{phase:494}));
});
test('the legal forty includes all five complete new definitions',()=>{
 const cat=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,5);
 for(const d of STANDARD494_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(cat.coverage(d).unsupported,0);assert.equal(d.cards.reduce((n,c)=>n+c.count,0),40);}
 for(const r of m.cards)assert.ok(STANDARD494_DECKS.some(d=>d.cards.some(c=>c.id===r.id)));
});

for(const p of[0,1])test('Jester draws first and can use that exact drawn spell without paying its mana '+p,()=>{
 let s=field(p);give(s,p,'deck',[LIFE,...Array(25).fill(N)]);give(s,p,'mana',Array(4).fill(W));const all=physical(s),x=play(s,p,JEST),drawn=s.players[p].hand.find(x=>x.cardId===LIFE);
 assert.equal(tapped(s,p),4);assert.equal(s.decision.task.op,'g34_Execute');assert.ok(values(s).some(v=>v?.uid===drawn.uid));s=JSON.parse(JSON.stringify(s));pick(s,v=>v?.uid===drawn.uid);finish(s);
 assert.ok(s.players[p].grave.some(y=>y.uid===x.uid));assert.ok(s.players[p].grave.some(y=>y.uid===drawn.uid));assert.equal(s.players[p].mana.length,5);assert.equal(tapped(s,p),4);assert.equal(s.players[p].deck.length,24);
 assert.deepEqual(physical(s).filter(uid=>uid!==x.uid),all);
});
for(const id of[JEST,FIEK])for(const accept of[false,true])test(e.card(id).name+' limits its hand spell choice, permits declining and never uses grave or opponent cards '+accept,()=>{
 const s=field(),spell=inst(id===JEST?LIFE:CHARGER),tooHigh=inst(id===JEST?CHARGER:'dm14-021'),creature=inst(N),foreign=inst(LIFE),buried=inst(LIFE);
 s.players[0].hand.push(spell,tooHigh,creature);s.players[1].hand.push(foreign);s.players[0].grave.push(buried);const x=play(s,0,id),paid=tapped(s,0),choices=values(s).filter(Boolean);
 assert.ok(choices.some(v=>v.uid===spell.uid));for(const y of[tooHigh,creature,foreign,buried])assert.ok(!choices.some(v=>v.uid===y.uid));pick(s,accept?v=>v?.uid===spell.uid:null);finish(s);
 assert.equal(s.players[0].hand.includes(spell),!accept);assert.equal(tapped(s,0),paid);assert.ok(s.players[0].grave.includes(buried));assert.ok(s.players[1].hand.includes(foreign));
 assert.ok(s.players[0][id===JEST?'grave':'battle'].includes(x));if(id===FIEK&&accept)assert.ok(s.players[0].mana.includes(spell));
});
for(const id of[JEST,FIEK])test(e.card(id).name+' uses the selected twin spell face cost, not the creature face',()=>{
 const s=field(),low=inst('dm22ex1-030'),high=inst('dm24bd5-010');s.players[0].hand.push(low,high);const own=put(s,0,N);play(s,0,id);
 const choices=values(s).filter(Boolean);assert.ok(choices.some(v=>v.uid===low.uid&&v.face===1));assert.ok(!choices.some(v=>v.uid===low.uid&&v.face===0));assert.ok(!choices.some(v=>v.uid===high.uid));pick(s,v=>v?.uid===low.uid&&v.face===1);finish(s);
 assert.ok(s.players[0].mana.some(x=>x.uid===low.uid));assert.ok(s.players[0].hand.includes(high));assert.ok(s.players[0].battle.includes(own));
});
for(const id of[JEST,FIEK])test(e.card(id).name+' does not bypass a live opponent spell prohibition',()=>{
 const s=field(),lock=put(s,1,'dmrp17-km2'),spell=inst(LIFE);s.players[0].hand.push(spell);if(id===JEST){const x=inst(id);s.players[0].hand.push(x);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid));}else{const x=play(s,0,id);assert.ok(!values(s).some(v=>v?.uid===spell.uid));finish(s);assert.ok(s.players[0].battle.includes(x));}assert.ok(s.players[0].hand.includes(spell));assert.ok(s.players[1].battle.includes(lock));
});
for(const id of[JEST,FIEK])test(e.card(id).name+' offers a harmless decline with no available spell',()=>{const s=field();give(s,0,'hand',[N]);play(s,0,id);assert.deepEqual(values(s),[null]);pick(s,null);finish(s);});
for(const p of[0,1])test('Jester works as an S Trigger and its nested spell can return the actual attacker '+p,()=>{
 const s=field(1-p);give(s,p,'hand',[BOUNCE]);const spell=s.players[p].hand[0],{source,attacker}=breakSource(s,p,JEST),all=physical(s);use(s,source);pick(s,v=>v?.uid===spell.uid);act(s,'effect',a=>a.targets?.some(t=>t.uid===attacker.uid));finish(s);
 assert.ok(s.players[p].grave.includes(source)&&s.players[p].grave.includes(spell));assert.ok(s.players[1-p].hand.includes(attacker));assert.equal(s.players[p].deck.length,29);assert.equal(tapped(s,p),0);assert.equal(s.metrics[p].triggers,1);assert.deepEqual(physical(s),all);
});
test('free spell execution skips cost taxes and civilization payment but preserves the printed cost cap',()=>{
 const s=field();give(s,0,'mana',Array(4).fill(L));const spell=inst(BOUNCE),tax=put(s,1,'dmrp02-063'),target=put(s,1,N);assert.ok(e.effectiveCard(tax,s).g222SpellTax.amount>0);s.players[0].hand.push(spell);play(s,0,FIEK);const paid=tapped(s,0);pick(s,v=>v?.uid===spell.uid);act(s,'effect',a=>a.targets?.some(t=>t.uid===target.uid));finish(s);assert.equal(tapped(s,0),paid);assert.ok(s.players[1].hand.includes(target));assert.ok(s.players[0].grave.includes(spell));
});

for(const shields of[0,3])test('Girigazami normal summon draws and returns one opposing creature without its super bonus '+shields,()=>{
 const s=field();give(s,0,'shields',Array(shields).fill(N));give(s,0,'hand',[LIFE]);const y=put(s,1,N),n=s.players[0].deck.length,x=play(s,0,GIRI);assert.equal(s.players[0].deck.length,n-1);pick(s,y.uid);finish(s);
 assert.ok(s.players[0].battle.includes(x));assert.ok(s.players[1].hand.includes(y));assert.ok(s.players[0].hand.some(y=>y.cardId===LIFE));assert.equal(tapped(s,0),8);
});
for(const p of[0,1])test('Girigazami nonfinal shield trigger has only its regular entry ability '+p,()=>{
 const s=field(1-p);give(s,p,'hand',[LIFE]);const victim=put(s,1-p,F),{source}=breakSource(s,p,GIRI,false);use(s,source);pick(s,victim.uid);finish(s);assert.ok(s.players[p].battle.includes(source));assert.ok(s.players[1-p].hand.includes(victim));assert.ok(s.players[p].hand.some(y=>y.cardId===LIFE));assert.equal(tapped(s,p),0);
});
for(const bonusFirst of[false,true])test('Girigazami may resolve the super spell before or after its draw and bounce '+bonusFirst,()=>{
 const s=field(1);give(s,0,'deck',[LIFE,...Array(25).fill(N)]);const {source,attacker}=breakSource(s,0,GIRI),all=physical(s);use(s,source);assert.equal(s.triggers.entries.length,2);order(s,bonusFirst?'extended':'entry');
 if(bonusFirst){assert.deepEqual(values(s),[null]);pick(s,null);pick(s,attacker.uid);}else{pick(s,attacker.uid);const spell=s.players[0].hand.find(y=>y.cardId===LIFE);pick(s,v=>v?.uid===spell.uid);}
 finish(s);assert.ok(s.players[1].hand.includes(attacker));assert.equal(s.players[0].mana.length,bonusFirst?50:51);assert.equal(s.players[0].deck.length,bonusFirst?25:24);assert.deepEqual(physical(s),all);
});
test('Girigazami accepts a cost-nine spell, excludes a cost-ten spell face and preserves nested execution',()=>{
 const s=field(1),nine=inst('dmrp04m-001'),ten=inst('dmrp05-m01');assert.equal(e.card(nine.cardId).cost,9);assert.equal(e.card(ten.cardId).spellFace.cost,10);s.players[0].hand.push(nine,ten);const {source}=breakSource(s,0,GIRI);use(s,source);order(s,'extended');
 assert.ok(values(s).some(v=>v?.uid===nine.uid));assert.ok(!values(s).some(v=>v?.uid===ten.uid&&v.face===1));pick(s,v=>v?.uid===nine.uid);finish(s);assert.ok(s.players[0].grave.includes(nine));assert.ok(s.players[0].hand.includes(ten));assert.equal(tapped(s,0),0);
});
for(const maximum of[false,true])test('Girigazami cannot cast after returning an attack-lock source until the attack ends '+maximum,()=>{
 let s=field(1);const attacker=put(s,1,maximum?N:'dmex13-064');
 if(maximum){play(s,1,'dmrp04m-001');pick(s,attacker.uid);finish(s);}
 give(s,0,'hand',[LIFE]);give(s,0,'shields',[GIRI]);const source=s.players[0].shields[0];attack(s,1,attacker);act(s,'noBlock');if(s.decision?.type==='breakChoice')act(s,'breakShields');use(s,source);order(s,'entry');pick(s,attacker.uid);
 assert.ok(s.players[1].hand.includes(attacker));s=JSON.parse(JSON.stringify(s));assert.deepEqual(values(s),[null]);pick(s,null);finish(s);assert.equal(s.players[0].mana.length,50);assert.ok(s.players[0].hand.some(x=>x.cardId===LIFE));
 s.active=0;s.phase='main';assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.cardId===LIFE));
});
test('Genmu does not suppress Girigazami because it costs eight',()=>{
 const s=field(1);put(s,1,GEN);const {source,attacker}=breakSource(s,0,GIRI);use(s,source);order(s,'entry');pick(s,attacker.uid);pick(s,null);finish(s);assert.equal(s.players[0].deck.length,29);assert.ok(s.players[1].hand.includes(attacker));
});
test('an ignored native attack lock does not become a lasting restriction when its creature leaves',()=>{
 const s=field(1),attacker=put(s,1,'dmex13-064');attacker.g35Ignored=s.turn;give(s,0,'hand',[LIFE]);give(s,0,'shields',[GIRI]);const source=s.players[0].shields[0];attack(s,1,attacker);act(s,'noBlock');use(s,source);order(s,'entry');pick(s,attacker.uid);const spell=s.players[0].hand.find(x=>x.cardId===LIFE);assert.ok(values(s).some(v=>v?.uid===spell.uid));pick(s,v=>v?.uid===spell.uid);finish(s);assert.equal(s.players[0].mana.length,51);
});

for(const p of[0,1])for(const ownCount of[2,3,4])test('Yeal ramps only with strictly fewer physical mana cards for player '+p+' count '+ownCount,()=>{
 const s=field(p);give(s,p,'mana',Array(ownCount).fill(L));give(s,1-p,'mana',Array(3).fill(L));const x=inst(YEAL);s.players[p].hand.push(x);
 // Free deployment uses the real entry path without changing the mana count under comparison.
 s.extTasks=[{op:'g34_Put',p,source:N,target:x.uid,origin:'hand',execution:false}];s.phase='main';act(s,'toAttack');finish(s);
 assert.ok(s.players[p].battle.includes(x));assert.equal(s.players[p].mana.length,ownCount+(ownCount<3?2:0));assert.equal(s.players[p].deck.length,30-(ownCount<3?2:0));assert.equal(s.players[p].hand.length,0);
});
test('Yeal compares physical cards including zero-mana cards and applies normal multicolor ramp orientation',()=>{
 const s=field();give(s,0,'mana',[L,L,L]);give(s,1,'mana',[L,L,L,'dm27-055']);const zero=s.players[1].mana[3];assert.equal(s.players[1].mana.reduce((n,x)=>n+e.manaValueAt(s,1,x),0),3);give(s,0,'deck',[DIS,N,...Array(20).fill(N)]);const x=inst(YEAL);s.players[0].hand.push(x);s.extTasks=[{op:'g34_Put',p:0,source:N,target:x.uid,origin:'hand',execution:false}];act(s,'toAttack');finish(s);
 assert.equal(s.players[0].mana.length,5);assert.ok(s.players[0].mana[3].tapped);assert.ok(!s.players[0].mana[4].tapped);assert.ok(s.players[1].mana.includes(zero));
});
for(const bonusFirst of[false,true])test('Yeal keeps optional up-to-two taps separate from its conditional ramp '+bonusFirst,()=>{
 const s=field(1);give(s,0,'mana',[L]);give(s,1,'mana',[L,L]);const a=put(s,1,F),b=put(s,1,W),own=put(s,0,N),{source}=breakSource(s,0,YEAL);use(s,source);order(s,bonusFirst?'extended':'entry');assert.ok(values(s).some(v=>v?.uid===a.uid));assert.ok(!values(s).some(v=>v?.uid===own.uid));pick(s,a.uid);pick(s,null);finish(s);
 assert.ok(a.tapped);assert.ok(!b.tapped&&!own.tapped);assert.equal(s.players[0].mana.length,3);assert.ok(s.players[0].battle.includes(source));
});
test('Yeal rechecks the mana comparison when its queued entry resolves, including after JSON save',()=>{
 let s=field(1);give(s,0,'mana',[L]);give(s,1,'mana',[L,L]);const {source}=breakSource(s,0,YEAL);use(s,source);assert.equal(s.triggers.entries.length,2);give(s,0,'mana',[L,L]);s=JSON.parse(JSON.stringify(s));order(s,'entry');finish(s);assert.equal(s.players[0].mana.length,2);assert.equal(s.players[0].deck.length,30);
});

for(const p of[0,1])test('Mitarashio taps every creature on both sides including itself but excludes sealed creatures and seeds '+p,()=>{
 const s=field(1-p),ally=put(s,p,N),enemy=put(s,1-p,F),sealed=put(s,1-p,W),seed=put(s,1-p,'dm25rp4-013');sealed.sealed=true;s.players[1-p].seals.push({...inst(N),sealOf:sealed.uid,faceDown:true});assert.equal(e.card(seed.cardId).type,'seed');const {source,attacker}=breakSource(s,p,MITA),all=physical(s);use(s,source);finish(s);
 for(const x of[ally,enemy,attacker,source])assert.ok(x.tapped);assert.ok(!sealed.tapped&&!seed.tapped);assert.ok(s.players[p].battle.includes(source));assert.deepEqual(physical(s),all);
});
test('Mitarashio is a working blocker that cannot attack creatures or players after a paid summon',()=>{
 const s=field(),x=play(s,0,MITA);finish(s);assert.ok(!x.tapped);x.entered=0;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));const attacker=put(s,1,N);attack(s,1,attacker);assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===x.uid));act(s,'block',a=>a.uid===x.uid);finish(s);assert.equal(s.players[0].shields.length,5);
});
for(const id of[MITA,YEAL])test(e.card(id).name+' has no extra tap ability after a nonfinal shield trigger',()=>{
 const s=field(1),victim=put(s,1,F),{source}=breakSource(s,0,id,false);use(s,source);finish(s);assert.ok(s.players[0].battle.includes(source));assert.ok(!victim.tapped&&!source.tapped);assert.equal(s.players[0].mana.length,50);
});
for(const mute of[GEN,GG])test('Fiek cannot use its entry casting ability when ignored by '+mute,()=>{
 const s=field(),lock=put(s,1,mute),spell=inst(LIFE);if(mute===GG)lock.under=[inst(N)];s.players[0].hand.push(spell);const x=play(s,0,FIEK);finish(s);assert.ok(s.players[0].battle.includes(x));assert.ok(s.players[0].hand.includes(spell));assert.equal(tapped(s,0),4);
});
for(const id of[MITA,YEAL,GIRI])for(const mute of(id===GIRI?[GG]:[GEN,GG]))test(e.card(id).name+' entry and super abilities obey suppression by '+mute,()=>{
 const s=field(1),lock=put(s,1,mute),victim=put(s,1,F);if(mute===GG)lock.under=[inst(N)];give(s,0,'hand',[LIFE]);give(s,0,'mana',[L]);give(s,1,'mana',[L,L]);const {source}=breakSource(s,0,id);use(s,source);finish(s);assert.equal(s.players[0].deck.length,30);assert.equal(s.players[0].mana.length,1);assert.ok(!victim.tapped);assert.ok(s.players[1].battle.includes(victim));assert.ok(s.players[0].battle.includes(source));
});
test('Fiek supplies exactly two Sasage reduction without spending the cost of its freely cast spell',()=>{
 const s=field();give(s,0,'mana',[L,W,F,N]);give(s,0,'hand',[DIS]);const donor=put(s,0,FIEK),all=physical(s);act(s,'play',a=>a.alternative==='sasage'&&a.sasage.includes(donor.uid));finish(s);assert.ok(s.players[0].grave.includes(donor));assert.ok(s.players[0].battle.some(x=>x.cardId===DIS));assert.equal(tapped(s,0),4);assert.deepEqual(physical(s),all);
});
for(const r of m.cards)test(r.name+' charges with its printed mana and correct orientation',()=>{const s=field();s.phase='charge';give(s,0,'hand',[r.id]);const x=s.players[0].hand[0];act(s,'charge',a=>a.uid===x.uid);assert.ok(s.players[0].mana.includes(x));assert.equal(x.tapped,r.faces[0].civilizations.length>1);});
test('free-spell decisions do not inspect opposing hidden cards or mutate state during AI inspection',()=>{
 const s=field();give(s,0,'hand',[LIFE,BOUNCE]);play(s,0,JEST);const before=JSON.stringify(s),a=e.chooseAI(s);e.analyzeAI(s);assert.equal(JSON.stringify(s),before);const t=JSON.parse(before);for(const z of['hand','deck','shields'])t.players[1][z].forEach(x=>x.cardId=GEN);assert.deepEqual(e.chooseAI(t),a);
});
test('the compiler requires full cost, origin, optionality and mana-comparison wording',()=>{
 for(const [id,change]of[[JEST,s=>s.replace('手札から','墓地から')],[JEST,s=>s.replace('手札からコストを支払わずに唱えてもよい','手札からコストを支払わずに唱える')],[YEAL,s=>s.replace('多ければ','以上なら')],[MITA,s=>s.replace('クリーチャーをすべて','カードをすべて')]]){const r=structuredClone(details.cards.find(c=>c.id===id));r.faces[0].abilityText=change(r.faces[0].abilityText);assert.throws(()=>standardCardSpec(r,{phase:494}));}
});
for(const first of[0,1])test('legal forty CPU game conserves 80 cards and resumes from JSON '+first,()=>{
 let s=e.createGame([STANDARD494_DECKS[0],PRESETS[first]],{seed:49401+first,first}),saved=false;const all=physical(s);
 while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),all);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}
 assert.ok(saved);assert.notEqual(s.winner,null);
});
