import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN,GG} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
const MONO='dmrp11-100',RUSS='dmrp11-083',ISLAND='dmrp12-099',N='dm01-108',W='dm01-083',F='dm01-097',L='dm01-075',BIG='dm05-s04',MULTI='dmrp17-011',SPELL='dm06-085',APUL='dmrp22-042';
function field(p=0){const s=setup();s.active=p;for(const q of [0,1])give(s,q,'deck',Array(24).fill(N));return s;}
const add=(s,p,z,id,props)=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid),phys=s=>e.physicalCards(s).map(x=>x.uid).sort();
const vals=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,x)=>act(s,'extended',a=>vals(s)[a.choice]===(x?.uid??x));
function play(s,id){s.phase='main';const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
function invoke(s,p,defs,source=ISLAND,uid){s.phase='main';s.extTasks=[{op:'g34_Sequence',p,source,uid,incarnation:0,defs}];act(s,'toAttack');}
function deploy(s,p,x,origin='hand'){invoke(s,p,[{op:'Put',origin,target:x.uid}]);}
function seal(s,p,x){x.sealed=true;add(s,p,'seals',N,{faceDown:true,sealOf:x.uid});}
const attacks=(s,x)=>{s.phase='attack';return e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);};
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function finish(s){if(s.decision?.type==='block')act(s,'noBlock');drain(s);}

test('Phase900 pins three complete original definitions, images, printed mana, canonical IDs and a legal forty',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-900.json',import.meta.url))),cat=createCatalogue(snapshot,data.cards,details);assert.deepEqual(m.cards.map(c=>c.id),[MONO,RUSS,ISLAND]);assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:900}),row.spec);assert.throws(()=>standardCardSpec(d,{phase:899}));for(const change of [s=>s+'\n未知の能力。',s=>s+'\n'+s.split('\n').at(-1)]){const bad=structuredClone(d);bad.faces[0].abilityText=change(bad.faces[0].abilityText);assert.throws(()=>standardCardSpec(bad,{phase:900}));}for(const [k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],['creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);assert.equal(m.regulationVerification.limits[row.id],4);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(row.verification.facesMatched);assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);assert.deepEqual(cat.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);}
 const deck={id:'phase900',name:'終わりの湿地',cards:[MONO,RUSS,ISLAND,N,W,F,L,BIG,MULTI,SPELL].map(id=>({id,count:4}))};assert.deepEqual(e.validateDeck(deck),[]);assert.equal(cat.coverage(deck).unsupported,0);
});
for(const p of [0,1])for(const tap of [false,true])test('Mono normal summon chooses entry state before entry and preserves JSON '+p+'/'+tap,()=>{
 let s=field(p),source=play(s,MONO),before=phys(s);assert.equal(s.decision.task.op,'g34_EntryTap432');assert.ok(!has(s,p,'battle',source));s=JSON.parse(JSON.stringify(s));pick(s,tap);drain(s);assert.equal(s.players[p].battle.find(x=>x.uid===source.uid).tapped,tap);assert.equal(s.players[p].enteredThisTurn,1);assert.equal(s.g463Summons[p].n,1);assert.deepEqual(phys(s),before);
});
for(const tap of [false,true])test('Mono S-Trigger summons without mana then independently chooses entry state '+tap,()=>{
 let s=field(),a=add(s,0,'battle',N);give(s,1,'mana',[]);give(s,1,'shields',[MONO]);const source=s.players[1].shields[0],before=phys(s);attack(s,a.uid);act(s,'noBlock');act(s,'useTrigger');assert.equal(s.decision.task.op,'g34_EntryTap432');s=JSON.parse(JSON.stringify(s));pick(s,tap);drain(s);assert.equal(s.players[1].battle.find(x=>x.uid===source.uid).tapped,tap);assert.equal(s.metrics[1].triggers,1);assert.deepEqual(phys(s),before);
});
test('Mono entry-state definition remains available under Genmu while its attack restriction is ignored',()=>{
 const s=field();add(s,1,'battle',GEN);const x=play(s,MONO);assert.equal(s.decision.task.op,'g34_EntryTap432');pick(s,true);drain(s);assert.ok(x.tapped);assert.equal(!!e.effectiveCard(x,s).g431AttackMe,false);s.active=1;const a=add(s,1,'battle',N);assert.ok(attacks(s,a).some(z=>z.target==='player'));
});
test('Mono is a compulsory legal attack target but never forces an attack (QA40270)',()=>{
 const s=field(1),x=add(s,0,'battle',MONO,{tapped:true}),other=add(s,0,'battle',BIG,{tapped:true}),a=add(s,1,'battle',N);assert.deepEqual(attacks(s,a).map(z=>z.target),[x.uid]);assert.ok(e.getLegalActions(s).some(z=>z.kind==='endTurn'));const before=phys(s);end(s);assert.ok(has(s,0,'battle',x)&&has(s,0,'battle',other));assert.deepEqual(phys(s),before);
});
test('Mono does not grant permission to attack an untapped wall and multiple tapped walls are alternatives',()=>{
 const s=field(1),one=add(s,0,'battle',MONO),a=add(s,1,'battle',N);assert.ok(attacks(s,a).some(z=>z.target==='player'));one.tapped=true;const two=add(s,0,'battle',MONO,{tapped:true});assert.deepEqual(attacks(s,a).map(z=>z.target).sort(),[one.uid,two.uid].sort());
});
test('Mono restriction honors ignored abilities, seals and attack bans',()=>{
 for(const mode of ['ignored','sealed','cannotAttack']){const s=field(1),x=add(s,0,'battle',MONO,{tapped:true}),a=add(s,1,'battle',N);if(mode==='ignored')x.g35Ignored=s.turn;if(mode==='sealed')seal(s,0,x);if(mode==='cannotAttack')a.g35NoAttack=[{turn:s.turn}];const rows=attacks(s,a);if(mode==='cannotAttack')assert.equal(rows.length,0);else assert.ok(rows.some(z=>z.target==='player'));}
});
test('Mono attack declaration remains fixed after its ability is ignored (QA42657)',()=>{
 const s=field(),x=add(s,1,'battle',MONO,{tapped:true}),other=add(s,1,'battle',N),a=add(s,0,'battle','dmx22b-128'),later=add(s,0,'battle',N);attack(s,a.uid,x.uid);assert.equal(s.decision.task.op,'g10_Destroy');x.g35Ignored=s.turn;pick(s,other);assert.equal(s.attack.target,x.uid);drain(s);assert.equal(s.players[1].shields.length,5);assert.ok(attacks(s,later).some(z=>z.target==='player'));
});
test('Mono nonsummon entry still offers tapping, while replaced entry has no state choice',()=>{
 const s=field(),x=add(s,0,'grave',MONO);deploy(s,0,x,'grave');assert.equal(s.decision.task.op,'g34_EntryTap432');pick(s,true);drain(s);assert.ok(has(s,0,'battle',x)&&x.tapped);
 const t=field(),y=add(t,0,'grave',MONO);add(t,1,'battle','dmrp14-035');deploy(t,0,y,'grave');drain(t);assert.ok(has(t,0,'hand',y));assert.equal(t.decision,null);
});
for(const p of [0,1])for(const tap of [false,true])test('Russ end of either player turn destroys itself only if tapped '+p+'/'+tap,()=>{
 const s=field(p),x=add(s,0,'battle',RUSS,{tapped:tap}),before=phys(s);end(s);assert.equal(has(s,0,'grave',x),tap);assert.equal(has(s,0,'battle',x),!tap);assert.deepEqual(phys(s),before);
});
test('Russ blocks a real attack and is destroyed at that opponent turn end',()=>{
 const s=field(1),x=add(s,0,'battle',RUSS),a=add(s,1,'battle',N);attack(s,a.uid);act(s,'block',z=>z.uid===x.uid);drain(s);assert.ok(has(s,0,'battle',x)&&x.tapped&&has(s,1,'grave',a));end(s);assert.ok(has(s,0,'grave',x));
});
test('Russ end trigger is suppressed by ignored abilities, Genmu or sealing but not GG',()=>{
 for(const mode of ['ignored','genmu','sealed','gg']){const s=field(),x=add(s,0,'battle',RUSS,{tapped:true});if(mode==='ignored')x.g35Ignored=s.turn;if(mode==='genmu')add(s,1,'battle',GEN);if(mode==='sealed')seal(s,0,x);if(mode==='gg')add(s,1,'battle',GG).under=[inst(N)];end(s);assert.equal(has(s,0,'grave',x),mode==='gg',mode);}
});
test('Russ uses the current tapped state when its queued condition resolves and not a replacement incarnation',()=>{
 for(const mode of ['untap','gone','reenter']){let s=field(),x=add(s,0,'battle',RUSS,{tapped:true}),uid=x.uid;const task={op:'g34_Sequence',p:0,source:RUSS,uid,incarnation:0,defs:e.card(RUSS).g474AnyEnd};if(mode==='untap')x.tapped=false;if(mode==='gone')s.players[0].grave.push(s.players[0].battle.pop());if(mode==='reenter')x.incarnation=1;s=JSON.parse(JSON.stringify(s));s.extTasks=[task];s.phase='main';act(s,'toAttack');drain(s);assert.equal(s.players[0].battle.some(y=>y.uid===uid),mode!=='gone');}
});
test('Russ self-destruction uses the normal replacement pipeline',()=>{
 const s=field(),x=add(s,0,'battle',RUSS,{tapped:true});add(s,0,'battle','dm24bd5-001');const before=phys(s);end(s);assert.ok(has(s,0,'mana',x));assert.deepEqual(phys(s),before);
});
for(const p of [0,1])for(const id of [N,SPELL,MULTI])test('Island may move any one own grave card to mana with printed entry state '+p+'/'+id,()=>{
 let s=field(p),x=add(s,p,'grave',id);add(s,1-p,'grave',BIG);const source=play(s,ISLAND),before=phys(s);assert.deepEqual(vals(s),[x.uid,null]);s=JSON.parse(JSON.stringify(s));pick(s,x);drain(s);const moved=s.players[p].mana.find(y=>y.uid===x.uid);assert.ok(moved);assert.equal(moved.tapped,id===MULTI);assert.ok(has(s,p,'battle',source));assert.deepEqual(phys(s),before);
});
test('Island permits declining or an empty graveyard without moving any card',()=>{
 for(const empty of [false,true]){const s=field(),x=empty?null:add(s,0,'grave',N);play(s,ISLAND);if(!empty)pick(s,null);drain(s);assert.equal(s.players[0].mana.length,50);if(x)assert.ok(has(s,0,'grave',x));}
});
test('Island S-Trigger summons freely and resolves grave recovery afterward',()=>{
 const s=field(),a=add(s,0,'battle',N),x=add(s,1,'grave',SPELL);give(s,1,'mana',[]);give(s,1,'shields',[ISLAND]);const before=phys(s);attack(s,a.uid);act(s,'noBlock');act(s,'useTrigger');assert.equal(s.decision.task.op,'g34_Select');pick(s,x);drain(s);assert.ok(has(s,1,'mana',x));assert.equal(s.players[1].battle[0].cardId,ISLAND);assert.equal(s.metrics[1].triggers,1);assert.deepEqual(phys(s),before);
});
test('Island respects Apul grave lock, Genmu and GG stopping entry triggers',()=>{
 for(const id of [APUL,GEN,GG]){const s=field(),x=add(s,0,'grave',SPELL);const enemy=add(s,1,'battle',id);if(id===GG)enemy.under=[inst(N)];play(s,ISLAND);drain(s);assert.ok(has(s,0,'grave',x));assert.equal(s.players[0].mana.length,50);}
});
test('Island queued recovery survives the source leaving and still checks a newly present grave lock',()=>{
 for(const lock of [false,true]){let s=field(),x=add(s,0,'grave',SPELL),source=play(s,ISLAND),before=phys(s);s.players[0].grave.push(s.players[0].battle.pop());if(lock)add(s,1,'battle',APUL);s=JSON.parse(JSON.stringify(s));pick(s,x);drain(s);assert.ok(has(s,0,'grave',source));assert.equal(has(s,0,'mana',x),!lock);if(!lock)assert.deepEqual(phys(s),before);}
});
