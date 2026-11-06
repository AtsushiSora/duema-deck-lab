import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{e,data,details,snapshot,setup,give,inst,act,GEN,GG,PRESETS}from'./target-fixture.mjs';import{standardCardSpec}from'../tools/standard-card-spec.mjs';import{createCatalogue}from'../dist/catalogue.js';import{CARD_IMAGES}from'../dist/card-images.js';import{STANDARD497_DECKS}from'../tools/fixtures/standard497.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-497.json',import.meta.url))),rows=m.cards;
const N='dm01-108',F='dm01-097',W='dm01-083',L='dm01-075',BOUNCE='dm01-086',DRAGON='dm01-s08',TRICK='dm10-020',VENOM='dm10-092',GEJIRA='dm10-004',GANK='dm11-048',GAZE='dm11-012',JILBA='dm13-024',VARE='dm11-021',EARTH='dm11-018';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort(),put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const pick=(s,v)=>act(s,'extended',a=>{const x=s.decision.choices[a.choice].value;return typeof v==='function'?v(x):(x?.uid??x)===v;});
function field(p=0){const s=setup();s.active=p;for(const q of[0,1])give(s,q,'deck',Array(30).fill(N));return s;}
function finish(s){for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<700,JSON.stringify(s.decision));if(s.decision.type==='block')act(s,'noBlock');else e.step(s,e.chooseAI(s));}}
function start(s,p=0){s.active=1-p;s.phase='attack';act(s,'endTurn');}
const silent=(s,yes=true)=>act(s,'silent496',a=>a.yes===yes);
function begin(s,id,p=0){const x=put(s,p,id);x.tapped=true;start(s,p);silent(s);return x;}
function attack(s,p,x,target='player'){s.active=p;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===target);}
function play(s,id){const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}

for(const r of rows)test(r.name+' complete official face, art, stats, mana, restriction and strict phase boundary',()=>{
 const d=details.cards.find(c=>c.id===r.id),before=JSON.stringify(d),c=e.card(r.id);assert.deepEqual(r.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase:497}),r.spec);assert.throws(()=>standardCardSpec(d,{phase:496}));assert.equal(JSON.stringify(d),before);for(const[k,v]of Object.entries(r.spec))assert.deepEqual(c[k],v);assert.equal(c.cost,d.faces[0].cost);assert.equal(c.power,parseInt(d.faces[0].powerText)||0);assert.equal(c.manaValue,1);assert.equal(c.limit,m.regulationVerification.limits[r.id]);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[r.id],r.image);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(bad,{phase:497}));
});
test('a legal forty covers all eight silent skills and an actual Dragon for mana deployment',()=>{const cat=createCatalogue(snapshot,data.cards,details);assert.equal(rows.length,8);for(const deck of STANDARD497_DECKS){assert.deepEqual(e.validateDeck(deck),[]);assert.equal(cat.coverage(deck).unsupported,0);assert.equal(deck.cards.reduce((n,c)=>n+c.count,0),40);}for(const r of rows)assert.ok(STANDARD497_DECKS.some(d=>d.cards.some(c=>c.id===r.id)));});
for(const r of rows)test(r.name+' paid summon never resolves its silent ability on entry',()=>{
 const s=field(),enemy=put(s,1,N);give(s,1,'hand',[F,W]);give(s,0,'mana',[...s.players[0].mana.map(x=>x.cardId),DRAGON]);const x=play(s,r.id);finish(s);assert.ok(s.players[0].battle.includes(x));assert.equal(s.players[0].battle.length,1);assert.equal(s.players[0].deck.length,30);assert.equal(s.players[1].hand.length,2);assert.equal(s.players[1].shields.length,5);assert.ok(s.players[1].battle.includes(enemy));assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(r.id).cost);
});
for(const r of rows)test(r.name+' may decline its silent ability, or enter its turn untapped without an activation',()=>{
 for(const wasTapped of[false,true]){const s=field(1),x=put(s,0,r.id),enemy=put(s,1,N);x.tapped=wasTapped;give(s,1,'hand',[F,W]);start(s);if(wasTapped)silent(s,false);finish(s);assert.ok(!x.tapped);assert.equal(s.players[0].deck.length,29);assert.equal(s.players[1].hand.length,2);assert.equal(s.players[1].shields.length,5);assert.ok(s.players[1].battle.includes(enemy));}
});
for(const r of rows.filter(r=>r.faces[0].cost<=5))test(r.name+' cannot activate while ignored by Genmu',()=>{const s=field(1),x=put(s,0,r.id);put(s,1,GEN);x.tapped=true;start(s);assert.notEqual(s.decision?.type,'silent496');finish(s);assert.ok(!x.tapped);assert.equal(s.players[0].deck.length,29);});
for(const id of[VENOM,GEJIRA])for(const p of[0,1])test(e.card(id).name+' breaks without attacking or opening a block window for player '+p,()=>{
 const s=field(1-p),before=s.players[1-p].shields.length,x=put(s,p,id);x.tapped=true;const all=physical(s);start(s,p);silent(s);assert.ok(!s.attack);const n=id===GEJIRA?2:1,chosen=s.players[1-p].shields.slice(0,n).map(x=>x.uid);for(let i=0;i<n;i++){assert.equal(s.decision.task.op,'g34_Break497');assert.ok(!s.decision.choices.some(c=>chosen.slice(0,i).includes(c.value)));pick(s,chosen[i]);if(i+1<n)assert.equal(s.players[1-p].shields.length,before);}finish(s);assert.equal(s.players[1-p].shields.length,before-n);assert.equal(s.players[1-p].hand.length,n);assert.ok(x.tapped);assert.ok(!s.attack);assert.equal(s.players[p].deck.length,29);assert.deepEqual(physical(s),all);
});
for(const n of[0,1])test('Gejira caps its two-shield ability at remaining shields and never wins by excess breaks '+n,()=>{
 const s=field(1);give(s,1,'shields',Array(n).fill(N));const x=begin(s,GEJIRA);finish(s);assert.ok(x.tapped);assert.equal(s.players[1].shields.length,0);assert.equal(s.winner,null);assert.equal(s.players[1].hand.length,n);
});
test('Gejira breaks its chosen two shields simultaneously, granting both final-shield super abilities',()=>{
 let s=field(1);give(s,1,'shields',['dmrp04s-025','dmex08-018']);const [gedo,ben]=s.players[1].shields,victim=put(s,0,N),x=begin(s,GEJIRA),all=physical(s);pick(s,gedo.uid);assert.equal(s.players[1].shields.length,2);s=JSON.parse(JSON.stringify(s));pick(s,ben.uid);assert.equal(s.players[1].shields.length,0);assert.equal(s.players[1].brokenThisTurn,2);assert.equal(s.players[0].hand.length,0);act(s,'useTrigger',a=>a.uid===gedo.uid);act(s,'useTrigger',a=>a.uid===ben.uid);finish(s);
 assert.ok(s.players[1].battle.some(y=>y.uid===gedo.uid)&&s.players[1].battle.some(y=>y.uid===ben.uid));assert.equal(s.players[1].deck.length,20);assert.ok(s.players[0].grave.some(y=>y.uid===victim.uid));assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.equal(s.players[0].deck.length,29);assert.deepEqual(physical(s),all);
});
test('a shield trigger may destroy Gejira after both shields were broken without cancelling either break',()=>{
 const s=field(1),hand=data.cards.find(c=>c.name==='デーモン・ハンド').id;give(s,1,'shields',[hand,N]);const trigger=s.players[1].shields[0],x=begin(s,GEJIRA),all=physical(s);for(const uid of s.players[1].shields.map(x=>x.uid))pick(s,uid);act(s,'useTrigger',a=>a.uid===trigger.uid);act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));finish(s);assert.ok(s.players[0].grave.includes(x));assert.equal(s.players[1].shields.length,0);assert.equal(s.players[1].hand.length,1);assert.equal(s.players[0].deck.length,29);assert.deepEqual(physical(s),all);
});
test('Gejira keeps its printed W Breaker for a normal attack after declining the silent skill',()=>{
 const s=field(1),x=put(s,0,GEJIRA);x.tapped=true;start(s);silent(s,false);attack(s,0,x);finish(s);assert.equal(s.players[1].shields.length,3);
});
for(const exchange of[false,true])test('Trick may exchange a hand card for a shield, including returning its just-added S Trigger without using it '+exchange,()=>{
 const s=field(1);give(s,0,'hand',[BOUNCE]);const hand=s.players[0].hand[0],x=begin(s,TRICK),all=physical(s);assert.equal(s.decision.task.op,'g34_ShieldExchange446');pick(s,exchange?hand.uid:null);if(exchange){assert.equal(s.players[0].shields.length,6);pick(s,hand.uid);}finish(s);assert.ok(s.players[0].hand.includes(hand));assert.equal(s.players[0].hand.length,2);assert.equal(s.players[0].shields.length,5);assert.equal(s.metrics[0].triggers,0);assert.ok(x.tapped);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);assert.deepEqual(physical(s),all);
});
test('Trick does nothing with an empty hand before the ordinary draw',()=>{const s=field(1);begin(s,TRICK);finish(s);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].shields.length,5);});
test('Gazer Eyes inspects the opponent hand only after activation, then the controller chooses the discarded card',()=>{
 let s=field(1);give(s,1,'hand',[N,DRAGON,BOUNCE]);const target=s.players[1].hand[1],x=put(s,0,GAZE);x.tapped=true;start(s);assert.ok(e.getLegalActions(s).every(a=>!a.label.includes(e.card(DRAGON).name)));silent(s);assert.equal(s.decision.player,0);assert.equal(s.decision.task.op,'s6Inspect');assert.equal(s.decision.choices.length,3);const all=physical(s);s=JSON.parse(JSON.stringify(s));pick(s,target.uid);finish(s);assert.ok(s.players[1].grave.some(y=>y.uid===target.uid));assert.equal(s.players[1].hand.length,2);assert.equal(s.players[0].deck.length,29);assert.deepEqual(physical(s),all);
});
test('Gazer Eyes skips an empty opposing hand without delaying normal drawing',()=>{const s=field(1);begin(s,GAZE);finish(s);assert.equal(s.players[1].hand.length,0);assert.equal(s.players[0].deck.length,29);});
test('Gankroak grants W Breaker only to current friendly fire creatures and never reduces a T Breaker',()=>{
 const s=field(1),fire=put(s,0,F),water=put(s,0,W),big=put(s,0,'dmrp17-km2'),enemy=put(s,1,F),x=begin(s,GANK);finish(s);assert.equal(e.effectiveCard(fire,s).breaker,2);assert.equal(e.effectiveCard(x,s).breaker,2);assert.equal(e.effectiveCard(big,s).breaker,3);assert.ok(!e.effectiveCard(water,s).breaker&&!e.effectiveCard(enemy,s).breaker);attack(s,0,fire);finish(s);assert.equal(s.players[1].shields.length,3);s.phase='attack';act(s,'endTurn');finish(s);assert.ok(!e.effectiveCard(fire,s).breaker);
});
test('Jilba allows other creatures to attack an untapped target, excludes itself, and expires this turn',()=>{
 const s=field(1),ally=put(s,0,N),enemy=put(s,1,F),x=begin(s,JILBA);finish(s);assert.ok(e.effectiveCard(ally,s).attackUntapped);assert.ok(!e.effectiveCard(x,s).attackUntapped);s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===ally.uid&&a.target===enemy.uid));act(s,'endTurn');finish(s);assert.ok(!e.effectiveCard(ally,s).attackUntapped);
});
test('Vareid grants unblockability only to friendly light creatures and it expires at turn end',()=>{
 const s=field(1),light=put(s,0,L),water=put(s,0,W),enemy=put(s,1,'dm01-084');begin(s,VARE);finish(s);assert.ok(e.effectiveCard(light,s).unblockable);assert.ok(!e.effectiveCard(water,s).unblockable&&!e.effectiveCard(enemy,s).unblockable);attack(s,0,light);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));finish(s);attack(s,0,water);assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===enemy.uid));act(s,'noBlock');finish(s);s.phase='attack';act(s,'endTurn');finish(s);assert.ok(!e.effectiveCard(light,s).unblockable);
});
test('Earth Dragon forces a legal Dragon deployment from mana with no payment and ordinary summoning sickness',()=>{
 const s=field(1);give(s,0,'mana',[DRAGON,N,BOUNCE]);const [dragon,small,spell]=s.players[0].mana,x=begin(s,EARTH),all=physical(s);assert.ok(s.decision.choices.some(c=>(c.value?.uid??c.value)===dragon.uid));assert.ok(s.decision.choices.every(c=>c.value!==null));assert.ok(!s.decision.choices.some(c=>[small.uid,spell.uid].includes(c.value?.uid??c.value)));pick(s,dragon.uid);finish(s);assert.ok(s.players[0].battle.includes(dragon));assert.equal(s.players[0].mana.length,2);assert.ok(x.tapped);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===dragon.uid));assert.deepEqual(physical(s),all);
});
test('Earth Dragon can put an evolution Dragon onto a legal base and preserves both physical cards',()=>{
 const s=field(1),base=put(s,0,DRAGON);give(s,0,'mana',['dm27-007']);const dragon=s.players[0].mana[0];begin(s,EARTH);const all=physical(s);pick(s,dragon.uid);pick(s,base.uid);finish(s);assert.ok(s.players[0].battle.includes(dragon));assert.ok(e.isEvolution(dragon)&&dragon.under.some(x=>x.uid===base.uid));assert.deepEqual(physical(s),all);
});
for(const mode of['noBase','graveLock','gate'])test('Earth Dragon cannot bypass an impossible evolution, a mana lock or an entry gate '+mode,()=>{
 const s=field(1);give(s,0,'mana',[mode==='noBase'?'dm27-007':DRAGON]);const dragon=s.players[0].mana[0];if(mode==='graveLock')put(s,1,'dmrp22-042');if(mode==='gate')put(s,1,'dm26rp1-S008');begin(s,EARTH);finish(s);assert.ok(s.players[0].mana.includes(dragon));assert.equal(s.players[0].battle.length,1);
});
test('GG does not stop an activated silent shield break and Genmu does not ignore six-cost Gejira',()=>{
 for(const mute of[GG,GEN]){const s=field(1),lock=put(s,1,mute);if(mute===GG)lock.under=[inst(N)];begin(s,GEJIRA);finish(s);assert.equal(s.players[1].shields.length,3);}
});
for(const r of rows)test(r.name+' charges for its printed mana and orientation',()=>{const s=field();s.phase='charge';give(s,0,'hand',[r.id]);const x=s.players[0].hand[0];act(s,'charge',a=>a.uid===x.uid);assert.ok(s.players[0].mana.includes(x));assert.equal(x.tapped,r.faces[0].civilizations.length>1);});
test('AI silent evaluation uses prospective ordinary untapping and public state without exposing hand identities',()=>{
 for(const[id,ally,enemy]of[[GANK,F,N],[JILBA,N,F],[VARE,L,'dm01-084'],[VENOM,N,F],[GAZE,N,F]]){const s=field(1),x=put(s,0,id),a=put(s,0,ally);put(s,1,enemy);give(s,1,'hand',[W]);x.tapped=a.tapped=true;start(s);const before=JSON.stringify(s),choice=e.chooseAI(s);assert.equal(choice.yes,true,id);e.analyzeAI(s);assert.equal(JSON.stringify(s),before);const t=JSON.parse(before);for(const z of['hand','deck','shields'])t.players[1][z].reverse().forEach(x=>x.cardId=GEN);assert.deepEqual(e.chooseAI(t),choice);}
});
test('previously chosen silent sources remain tapped in the AI projection and are public information',()=>{
 const s=field(1),a=put(s,0,JILBA),b=put(s,0,GANK);a.tapped=b.tapped=true;start(s);silent(s);assert.deepEqual(e.observation(s,0).g496Kept,[a.uid]);const before=JSON.stringify(s);assert.equal(e.chooseAI(s).yes,false);assert.equal(JSON.stringify(s),before);silent(s,false);finish(s);
});
test('unknown additional abilities and changed break counts are not silently accepted',()=>{
 for(const r of rows){const d=structuredClone(details.cards.find(c=>c.id===r.id));d.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(d,{phase:497}));}const d=structuredClone(details.cards.find(c=>c.id===GEJIRA));d.faces[0].abilityText=d.faces[0].abilityText.replace('２枚ブレイク','３枚ブレイク');assert.throws(()=>standardCardSpec(d,{phase:497}));
});
for(const i of[0,1])test('legal forty CPU game conserves 80 cards and resumes after JSON '+i,()=>{
 let s=e.createGame([STANDARD497_DECKS[0],PRESETS[i]],{seed:49701+i,first:i}),saved=false;const all=physical(s);while(s.winner===null&&s.actions<2000&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),all);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);
});
