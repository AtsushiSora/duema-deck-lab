import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{e,data,details,snapshot,setup,give,inst,act,GEN,GG,PRESETS}from'./target-fixture.mjs';
import{standardCardSpec}from'../tools/standard-card-spec.mjs';import{createCatalogue}from'../dist/catalogue.js';import{CARD_IMAGES}from'../dist/card-images.js';import{STANDARD495_DECKS}from'../tools/fixtures/standard495.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-495.json',import.meta.url))),rows=m.cards,neos=rows.filter(r=>r.spec.neoEvolution);
const N='dm01-108',W='dm01-083',D='dm01-090',F='dm01-097',L='dm01-075',DOM='dm25rp3-062',FIST='dm25rp3-050',THUNDER='dm25rp3-048',SHINO='dm25rp3-053',FIRE='dm25rp3-057',GAKU='dm25rp3-038',BULU='promoy24-059',OJI='dm25rp3-042',UNTAP='dm25rp3-077',GRAVE='dm25rp3-067',RED='promoy24-050',MOON='dm25rp3-047',BLACK='dm25rp3-045';
const basics={光:L,水:W,闇:D,火:F,自然:N},put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;},physical=s=>e.physicalCards(s).map(x=>x.uid).sort(),tapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
function field(p=0){const s=setup();s.active=p;for(const q of[0,1])give(s,q,'deck',Array(30).fill(N));return s;}
const pick=(s,v)=>act(s,'extended',a=>{const x=s.decision.choices[a.choice].value;return typeof v==='function'?v(x):(x?.uid??x)===v;});
function finish(s){for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<600,JSON.stringify(s.decision));if(s.decision.type==='block')act(s,'noBlock');else e.step(s,e.chooseAI(s));}}
function play(s,p,id,base=null){s.active=p;s.phase='main';const x=inst(id);s.players[p].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative);if(s.decision?.type==='evolution')act(s,'evolve',a=>base?a.baseUid===base:!a.baseUid);return x;}
function attack(s,p,x,target='player'){s.active=p;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===target);}
function declared(s,p,id){const x=inst(id);s.players[p].hand.push(x);const attacker=put(s,p,N);attack(s,p,attacker);assert.equal(s.decision.type,'dddDeclare');assert.equal(tapped(s,p),0);act(s,'declareDDD',a=>a.uid===x.uid);return{x,attacker};}
function order(s,uid){act(s,'orderEffect',a=>a.uid===uid);}

for(const r of rows)test(r.name+' complete official face, art, statistics, mana, restriction and strict compiler phase',()=>{
 const d=details.cards.find(c=>c.id===r.id),before=JSON.stringify(d),c=e.card(r.id);assert.deepEqual(r.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase:495}),r.spec);assert.throws(()=>standardCardSpec(d,{phase:494}));assert.equal(JSON.stringify(d),before);
 for(const[k,v]of Object.entries(r.spec))assert.deepEqual(c[k],v);assert.equal(c.cost,d.faces[0].cost);assert.equal(c.power,parseInt(d.faces[0].powerText)||0);assert.equal(c.limit,m.regulationVerification.limits[r.id]);assert.equal(c.manaValue,1);assert.equal(CARD_IMAGES[r.id],r.image);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);
 const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(bad,{phase:495}));
});
test('two legal forties cover all thirteen new DDD cards',()=>{const cat=createCatalogue(snapshot,data.cards,details);assert.equal(rows.length,13);for(const deck of STANDARD495_DECKS){assert.deepEqual(e.validateDeck(deck),[]);assert.equal(deck.cards.reduce((n,c)=>n+c.count,0),40);assert.equal(cat.coverage(deck).unsupported,0);}for(const r of rows)assert.ok(STANDARD495_DECKS.some(d=>d.cards.some(c=>c.id===r.id)));});
for(const r of rows)test(r.name+' remains usable at its printed normal cost without an attack',()=>{
 const s=field(),victim=put(s,1,N);give(s,1,'hand',[F,W]);give(s,0,'grave',[N]);const x=play(s,0,r.id);assert.equal(tapped(s,0),e.card(r.id).cost);finish(s);assert.ok(s.players[0][e.card(r.id).type==='spell'?'grave':'battle'].some(y=>y.uid===x.uid));
 if(e.card(r.id).type==='creature')assert.ok(!e.isEvolution(x));if(r.id===OJI||r.id===MOON)assert.ok(s.players[1].grave.includes(victim));
});
for(const r of rows)test(r.name+' declares at attack time but pays its alternate cost only on resolution',()=>{
 const s=field(),victim=put(s,1,N);give(s,0,'grave',[N]);const{x}=declared(s,0,r.id),all=physical(s);assert.equal(s.decision.type,'dddSummon');assert.equal(tapped(s,0),0);const a=e.getLegalActions(s).find(a=>a.kind==='summonDDD'&&!a.baseUid);assert.ok(a);assert.equal(a.cost,r.spec.ddd.cost);e.step(s,a);assert.equal(tapped(s,0),r.spec.ddd.cost);finish(s);
 assert.ok(s.players[0][e.card(r.id).type==='spell'?'grave':'battle'].some(y=>y.uid===x.uid));assert.deepEqual(physical(s),all);if([OJI,MOON].includes(r.id))assert.ok(s.players[1].grave.includes(victim));
});
for(const r of rows)test(r.name+' can decline either the declaration or the later execution without spending mana',()=>{
 for(const early of[false,true]){const s=field(),x=inst(r.id);s.players[0].hand.push(x);const a=put(s,0,N),all=physical(s);attack(s,0,a);act(s,early?'skipDDD':'declareDDD');if(!early)act(s,'skipDDDSummon');finish(s);assert.ok(s.players[0].hand.includes(x));assert.equal(tapped(s,0),0);assert.deepEqual(physical(s),all);}
});
for(const r of rows)test(r.name+' declaration needs no ready mana but resolution rechecks amount, tapping, color and source identity',()=>{
 const s=field(),required=basics[r.spec.ddd.civilizations[0]],wrong=required===N?W:N;give(s,0,'mana',[]);const{x}=declared(s,0,r.id);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='summonDDD'));give(s,0,'mana',Array(r.spec.ddd.cost).fill(wrong));assert.ok(!e.getLegalActions(s).some(a=>a.kind==='summonDDD'));give(s,0,'mana',Array(r.spec.ddd.cost).fill(required));assert.ok(e.getLegalActions(s).some(a=>a.kind==='summonDDD'));s.players[0].mana.forEach(y=>y.tapped=true);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='summonDDD'));s.players[0].mana.forEach(y=>y.tapped=false);x.zoneSerial=1;assert.ok(!e.getLegalActions(s).some(a=>a.kind==='summonDDD'));act(s,'skipDDDSummon');finish(s);assert.ok(s.players[0].hand.includes(x));
});
for(const r of neos)test(r.name+' DDD can evolve on any of its printed civilizations and excludes the others',()=>{
 const s=field(),bases=[L,W,D,F,N].map(id=>put(s,0,id)),{x,attacker}=declared(s,0,r.id),legal=e.getLegalActions(s).filter(a=>a.kind==='summonDDD'),colors=r.spec.neoEvolution.any.map(x=>x.civilization);assert.ok(legal.some(a=>!a.baseUid));for(const b of bases)assert.equal(legal.some(a=>a.baseUid===b.uid),colors.includes(e.card(b.cardId).civ));
 const base=bases.find(b=>colors.includes(e.card(b.cardId).civ));act(s,'summonDDD',a=>a.baseUid===base.uid);finish(s);const top=s.players[0].battle.find(y=>y.uid===x.uid);assert.ok(top&&e.isEvolution(top));assert.ok(top.under.some(y=>y.uid===base.uid));assert.ok(s.players[0].battle.includes(attacker));
});
test('DDD on an attacking base keeps that same attack and its tapped state after NEO evolution and JSON save',()=>{
 let s=field(),{x,attacker}=declared(s,0,THUNDER),all=physical(s);act(s,'summonDDD',a=>a.baseUid===attacker.uid);s=JSON.parse(JSON.stringify(s));assert.equal(s.attack.attacker,x.uid);assert.ok(s.players[0].battle.find(y=>y.uid===x.uid).tapped);assert.equal(s.players[0].mana.length,51);finish(s);assert.equal(s.players[1].shields.length,3);assert.deepEqual(physical(s),all);
});
test('fixed DDD is an alternate payment rather than a cost reduction and still works under Diamond Star',()=>{
 const s=field();put(s,1,'dmrp22-027');give(s,0,'mana',[N,W]);const{x}=declared(s,0,THUNDER);assert.equal(e.getLegalActions(s).find(a=>a.kind==='summonDDD'&&!a.baseUid).cost,2);act(s,'summonDDD',a=>!a.baseUid);finish(s);assert.ok(s.players[0].battle.includes(x));assert.equal(tapped(s,0),2);
});
test('DDD cannot bypass a spell lock and can proceed if that lock disappears before resolution',()=>{
 const s=field(),lock=put(s,1,'dmrp20-012');const{x}=declared(s,0,DOM);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='summonDDD'));s.players[1].battle=s.players[1].battle.filter(x=>x.uid!==lock.uid);s.players[1].hand.push(lock);assert.ok(e.getLegalActions(s).some(a=>a.kind==='summonDDD'));act(s,'summonDDD');finish(s);assert.ok(s.players[0].grave.includes(x));assert.equal(s.players[0].deck.length,28);
});
for(const id of[DOM,THUNDER,BLACK])test(e.card(id).name+' DDD executes from hand under suppression but its low-cost effect stays ignored',()=>{
 const s=field();put(s,1,id===BLACK?GG:GEN).under=[inst(N)];const{x}=declared(s,0,id);act(s,'summonDDD',a=>!a.baseUid);finish(s);assert.ok(s.players[0][e.card(id).type==='spell'?'grave':'battle'].includes(x));assert.equal(s.players[0].deck.length,30);assert.equal(s.players[0].mana.length,50);
});
test('the grave spell allows declining recovery and cannot recover through an opponent grave lock',()=>{
 for(const lock of[false,true]){const s=field();if(lock)put(s,1,'dmrp22-042');give(s,0,'grave',[N]);const old=s.players[0].grave[0];play(s,0,GRAVE);if(!lock)pick(s,null);finish(s);assert.ok(s.players[0].grave.includes(old));assert.equal(s.players[0].hand.length,0);assert.equal(s.players[0].deck.length,27);}
});
test('Fist keeps its cannot-attack restriction whether evolved or unevolved',()=>{for(const evolve of[false,true]){const s=field(),base=put(s,0,N),x=play(s,0,FIST,evolve?base.uid:null);finish(s);x.entered=0;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));}});
for(const id of[SHINO,BULU,RED,BLACK])test(e.card(id).name+' can attack immediately only after evolution and then uses its printed breaker',()=>{
 const s=field(),base=put(s,0,id===SHINO?L:F),x=play(s,0,id,base.uid);finish(s);assert.ok(e.isEvolution(x));const before=s.players[1].shields.length;attack(s,0,x);finish(s);assert.equal(s.players[1].shields.length,before-(e.card(id).breaker||1));
 const t=field(),y=play(t,0,id);finish(t);t.phase='attack';assert.ok(!e.getLegalActions(t).some(a=>a.kind==='attack'&&a.uid===y.uid));
});
for(const accept of[false,true])test('Black Ganveat offers a real optional creature battle and Slayer stays separate '+accept,()=>{
 const s=field(),ally=put(s,0,N),enemy=put(s,1,F),x=play(s,0,BLACK);pick(s,accept?ally.uid:null);if(accept)pick(s,enemy.uid);finish(s);assert.equal(s.players[0].grave.includes(ally),accept);assert.ok(s.players[0].battle.includes(x));
});
test('Gakuricchi triggers two opponent-chosen discards only on actual untapping and Slayer destroys a larger battle opponent',()=>{
 const s=field(),x=put(s,0,GAKU);x.tapped=true;give(s,1,'hand',[N,F,W]);s.active=1;s.phase='attack';act(s,'endTurn');assert.equal(s.decision.player,1);const hand=s.players[1].hand.map(y=>y.uid);pick(s,hand[0]);pick(s,hand[1]);finish(s);assert.equal(s.players[1].hand.length,1);assert.ok(!x.tapped);const enemy=put(s,1,'dm01-s01');enemy.tapped=true;attack(s,0,x,enemy.uid);finish(s);assert.ok(s.players[0].grave.includes(x));assert.ok(s.players[1].grave.includes(enemy));
});
test('Gakuricchi does not discard just for entering untapped or an untap attempt on an already untapped card',()=>{
 const s=field();give(s,1,'hand',[N,F,W]);const x=play(s,0,GAKU);finish(s);assert.equal(s.players[1].hand.length,3);s.extTasks=[{op:'g34_Untap',p:0,source:GAKU,uid:x.uid,incarnation:x.incarnation||0}];s.phase='main';act(s,'toAttack');finish(s);assert.equal(s.players[1].hand.length,3);
});
test('the grave spell mills three real cards before offering a creature, including a twin creature face',()=>{
 const s=field(),twin='dm22ex1-030';give(s,0,'deck',[DOM,twin,N,...Array(20).fill(N)]);const selected=s.players[0].deck[1],all=physical(s),x=play(s,0,GRAVE);assert.equal(s.players[0].grave.length,3);assert.ok(s.decision.choices.some(c=>(c.value?.uid??c.value)===selected.uid));assert.ok(!s.decision.choices.some(c=>c.cardId===DOM));pick(s,selected.uid);finish(s);assert.ok(s.players[0].hand.includes(selected));assert.ok(s.players[0].grave.includes(x));assert.deepEqual(physical(s).filter(uid=>uid!==x.uid),all);
});
test('XENOFIRE deploys a cost-three creature as an effect, never pays its mana and excludes a cost-four creature',()=>{
 const s=field();give(s,0,'hand',[N,BLACK]);const [small,big]=s.players[0].hand;const x=play(s,0,FIRE);assert.ok(s.decision.choices.some(c=>(c.value?.uid??c.value)===small.uid));assert.ok(!s.decision.choices.some(c=>(c.value?.uid??c.value)===big.uid));assert.ok(s.decision.choices.every(c=>c.value!==null));pick(s,small.uid);finish(s);assert.ok(s.players[0].battle.includes(small));assert.ok(s.players[0].hand.includes(big));assert.ok(s.players[0].grave.includes(x));assert.equal(tapped(s,0),3);
});
test('the five-mana untap spell resolves between two declared DDD payments',()=>{
 const s=field(),u=inst(UNTAP),c=inst(BULU);give(s,0,'mana',Array(6).fill(N));s.players[0].mana[0].cardId=D;s.players[0].hand.push(u,c);const a=put(s,0,N);attack(s,0,a);act(s,'declareDDD',x=>x.uid===u.uid);act(s,'declareDDD',x=>x.uid===c.uid);order(s,u.uid);act(s,'summonDDD');assert.equal(tapped(s,0),2);for(const y of s.players[0].mana.slice(0,5))pick(s,y.uid);act(s,'summonDDD',a=>!a.baseUid);finish(s);assert.equal(tapped(s,0),6);assert.ok(s.players[0].battle.includes(c));assert.ok(s.players[0].grave.includes(u));
});
test('a declared DDD still resolves after a previous declared card removes the attacker in a real battle',()=>{
 let s=field(),black=inst(BLACK),spell=inst(DOM);s.players[0].hand.push(black,spell);const attacker=put(s,0,N),enemy=put(s,1,F),all=physical(s);attack(s,0,attacker);act(s,'declareDDD',a=>a.uid===black.uid);act(s,'declareDDD',a=>a.uid===spell.uid);order(s,black.uid);act(s,'summonDDD',a=>!a.baseUid);order(s,black.uid);pick(s,attacker.uid);pick(s,enemy.uid);assert.ok(s.players[0].grave.includes(attacker));s=JSON.parse(JSON.stringify(s));act(s,'summonDDD');finish(s);assert.ok(s.players[0].grave.some(x=>x.uid===spell.uid));assert.ok(s.players[0].battle.some(x=>x.uid===black.uid));assert.equal(s.players[0].deck.length,28);assert.deepEqual(physical(s),all);
});
for(const id of[OJI,MOON])for(const p of[0,1])test(e.card(id).name+' works as a free defensive S Trigger, not as DDD '+p,()=>{
 const s=field(1-p),attacker=put(s,1-p,N);give(s,p,'shields',[id]);const source=s.players[p].shields[0],all=physical(s);attack(s,1-p,attacker);act(s,'noBlock');act(s,'useTrigger',a=>a.uid===source.uid);finish(s);assert.ok(s.players[p].grave.includes(source));assert.ok(s.players[1-p].grave.includes(attacker));assert.equal(tapped(s,p),0);assert.deepEqual(physical(s),all);
});
test('Red End uses G Strike without being summoned and stops that exact attacker for this turn',()=>{
 const s=field(1),attacker=put(s,1,N);give(s,0,'shields',[RED]);const x=s.players[0].shields[0];attack(s,1,attacker);act(s,'noBlock');pick(s,true);pick(s,attacker.uid);finish(s);assert.ok(s.players[0].hand.includes(x));assert.ok(!s.players[0].battle.includes(x));attacker.tapped=false;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid));
});
for(const r of rows)test(r.name+' does not gain DDD permission from mana or grave and charges normally',()=>{
 const s=field();give(s,0,'mana',[r.id]);give(s,0,'grave',[r.id]);const a=put(s,0,N);attack(s,0,a);assert.ok(s.decision?.type!=='dddDeclare');finish(s);s.phase='charge';give(s,0,'hand',[r.id]);const x=s.players[0].hand[0];act(s,'charge',a=>a.uid===x.uid);assert.ok(s.players[0].mana.includes(x));assert.equal(x.tapped,r.faces[0].civilizations.length>1);
});
test('DDD decisions are pure and independent of opposing hidden identities and ordering',()=>{
 const s=field();declared(s,0,DOM);const before=JSON.stringify(s),action=e.chooseAI(s);e.analyzeAI(s);assert.equal(JSON.stringify(s),before);const t=JSON.parse(before);for(const z of['hand','deck','shields'])t.players[1][z].reverse().forEach(x=>x.cardId=GEN);assert.deepEqual(e.chooseAI(t),action);
});
test('DDD compiler and engine reject mismatched reminders, unsupported costs, origins and unknown fields',()=>{
 const d=details.cards.find(c=>c.id===DOM);for(const mutate of[r=>{r.faces[0].abilityText+='\n'+r.faces[0].abilityText.split('\n')[0];},r=>{r.faces[0].abilityText=r.faces[0].abilityText.replace('手札から','墓地から');},r=>{r.faces[0].abilityText=r.faces[0].abilityText.replace('[ww01]支払って','[ww02]支払って');},r=>{r.faces[0].abilityText=r.faces[0].abilityText.replaceAll('ww01','ww00');}]){const r=structuredClone(d);mutate(r);assert.throws(()=>standardCardSpec(r,{phase:495}));}
 for(const ddd of[{cost:0,civilizations:['水']},{cost:1,civilizations:['水','水']},{cost:1,civilizations:['光','水']},{cost:2,civilizations:['不明']},{cost:1,civilizations:['水'],free:true}])assert.throws(()=>e.setCards([...data.cards,{...e.card(DOM),id:'bad-ddd',ddd}]),/D・D・D/);e.setCards(data.cards);
});
for(const i of[0,1])test('legal forty CPU game conserves 80 cards and resumes after JSON '+i,()=>{
 let s=e.createGame([STANDARD495_DECKS[i],PRESETS[i]],{seed:49501+i,first:i}),saved=false;const all=physical(s);while(s.winner===null&&s.actions<2000&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),all);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);
});
