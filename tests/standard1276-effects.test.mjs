import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TIME='dm22-010',AREA='dmr21-004',WILHELM='dmr07-s05';
const KIRA='dmrp17-033',CREATIVE='dmrp19-031',DOGI='dmr19-l02',KINGDOM='dmrp19-km1';
const DARK='dm01-090',WATER='dm01-083',NATURE='dm01-108',MARCH='dm32-054';
const TOKOSHIE='dmrp17-025',BOUNCE='dmrp20-036',SPELL='dm01-086';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(x=>x.value)??[];
const pick=(s,value)=>act(s,'extended',a=>(values(s)[a.choice]?.uid??values(s)[a.choice])===value);
const turn=s=>{s.phase='attack';act(s,'endTurn');};
const take=(s,x)=>act(s,'play',a=>a.uid===x.uid);

test('the three identities and fourteen reprints keep canonical IDs and full card definitions',()=>{
 const m=read('tools/support-phase-1276.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalog=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[TIME,AREA,WILHELM]);
 assert.equal(m.printAliases.length,14);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row,c=e.card(canonicalId);
  const detail={id,status:'complete',faces:row.faces};
  if(id===canonicalId)assert.deepEqual(row.faces,details.cards.find(x=>x.id===id).faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1276}),row.spec);
  const altered=structuredClone(detail);altered.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1276}));
  assert.deepEqual(catalog.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.ok(refs.some(ref=>ref.id===id&&ref.canonicalId===canonicalId&&ref.image===image));
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
 }
 assert.equal(e.card(TIME).text,m.printAliases.find(x=>x.id==='dm25ex3-TF22').faces[0].abilityText);
});

for(const block of [KIRA,TOKOSHIE])test('Time Changer can put two revealed creatures under an evolution with '+block,()=>{
 const s=field(),host=add(s,0,'battle',MARCH,{under:[inst(DARK)]});
 add(s,1,'battle',block);give(s,0,'deck',[SPELL,WATER,NATURE,SPELL,SPELL]);
 const [,first,second]=s.players[0].deck;
 cast(s,TIME);pick(s,host.uid);
 assert.deepEqual(values(s),[first.uid,second.uid]);
 pick(s,second.uid);pick(s,first.uid);
 assert.deepEqual(host.under.slice(1).map(x=>x.uid),[second.uid,first.uid]);
 assert.equal(s.players[0].battle.length,2);
 assert.equal(s.players[0].deck.length,3);
 assert.equal(s.log.filter(x=>x.type==='reveal'&&x.text.includes('タイムチェンジャー')).length,2);
});

test('Time Changer cannot choose a non-evolved NEO, shuffles after an empty search and can decline',()=>{
 const s=field(),plain=add(s,0,'battle','dm25rp2-002'),host=add(s,0,'battle',MARCH,{under:[inst(DARK)]});
 give(s,0,'deck',Array(6).fill(SPELL));
 cast(s,TIME);
 assert.ok(!values(s).some(v=>v?.uid===plain.uid));
 const seed=s.rng;
 pick(s,null);assert.equal(s.rng,seed);
 cast(s,TIME);pick(s,host.uid);
 assert.equal(host.under.length,1);
 assert.notEqual(s.rng,seed);
});

test('Time Changer takes the single available creature and triggers the six-card threshold when adding two',()=>{
 const s=field(),king=add(s,0,'battle',KINGDOM,{under:Array.from({length:4},()=>inst(DARK))}),enemy=add(s,1,'battle',WATER);
 give(s,0,'deck',[WATER,SPELL,NATURE,SPELL]);
 cast(s,TIME);pick(s,king.uid);
 const [a,b]=values(s);pick(s,a);pick(s,b);
 assert.equal(king.under.length,6);
 assert.ok(has(s,1,'grave',enemy));
 const q=field(),host=add(q,0,'battle',MARCH,{under:[inst(DARK)]});give(q,0,'deck',[WATER,SPELL]);
 cast(q,TIME);pick(q,host.uid);pick(q,q.players[0].deck[0].uid);
 assert.equal(host.under.length,2);assert.equal(q.players[0].deck.length,1);
});

for(const blocker of [null,KIRA,TOKOSHIE])test('Dokindam Area leave replacement with '+(blocker||'no restriction'),()=>{
 const s=field(1),host=add(s,0,'battle',WATER,{tapped:true}),top=s.players[0].deck[0];
 add(s,0,'battle',AREA);
 if(blocker)add(s,1,'battle',blocker);
 cast(s,BOUNCE);pick(s,host.uid);drain(s);
 if(blocker===KIRA){
  assert.ok(has(s,0,'hand',host));assert.equal(s.players[0].deck[0],top);
 }else{
  assert.ok(has(s,0,'battle',host)&&host.sealed&&host.tapped);
  assert.deepEqual(s.players[0].seals,[top]);assert.equal(top.sealOf,host.uid);
 }
});

test('Dokindam Area offers a choice against EX Life and never offers the replaced move',()=>{
 const s=field(1);
 add(s,0,'battle',AREA);
 let host=add(s,0,'battle','dmsd18-002');
 const shield=s.players[0].shields[0];host.exLifeShieldUid=shield.uid;
 cast(s,BOUNCE);pick(s,host.uid);
 const actions=e.getLegalActions(s);
 assert.ok(actions.some(a=>a.kind==='replaceDokindam1276')&&actions.some(a=>a.kind==='replaceEx'));
 assert.ok(!actions.some(a=>a.kind==='allowLeave'));
 act(s,'replaceDokindam1276');
 assert.ok(host.sealed&&has(s,0,'shields',shield));
});

test('Dokindam Area can remove six of seven seals after untapping, once per field',()=>{
 const s=field(1),area=add(s,0,'battle',AREA),host=add(s,0,'battle',WATER,{tapped:true,sealed:true});
 const other=add(s,0,'battle',DARK,{tapped:true,sealed:true});
 const seals=Array.from({length:7},(_,i)=>add(s,0,'seals',NATURE,{faceDown:true,sealOf:i<6?host.uid:other.uid}));
 turn(s);assert.equal(s.decision?.task?.op,'g34_DokindamSwitch1276');pick(s,true);
 for(const seal of seals.slice(0,6))pick(s,seal.uid);
 assert.ok(area.g1175DSwitched&&host.tapped&&!host.sealed&&other.sealed);
 assert.deepEqual(s.players[0].seals,[seals[6]]);
 turn(s);drain(s);turn(s);drain(s);
 assert.deepEqual(s.players[0].seals,[seals[6]]);
});

test('playing a second D2 field retires Dokindam Area on either side',()=>{
 const s=field(1),one=add(s,0,'battle',AREA);
 const two=add(s,1,'hand',AREA);take(s,two);drain(s);
 assert.ok(has(s,0,'grave',one)&&has(s,1,'battle',two));
});

test('Wilhelm destroys one creature then one mana and offers one ramp per opponent card',()=>{
 const s=field(),enemy=add(s,1,'battle',WATER),mana=s.players[1].mana[0],top=s.players[0].deck[0];
 cast(s,WILHELM);pick(s,enemy.uid);pick(s,mana.uid);
 assert.ok(has(s,1,'grave',enemy)&&has(s,1,'grave',mana));
 assert.equal(s.decision?.type,'effectOrder');act(s,'orderEffect');
 pick(s,1);pick(s,0);
 assert.equal(s.players[0].mana.at(-1),top);
 assert.equal(s.players[0].grave.length,0);
});

test('Wilhelm can send the same Hachimen from mana to the grave after its destruction is replaced',()=>{
 const s=field(),enemy=add(s,1,'battle','dmr05-065');
 cast(s,WILHELM);pick(s,enemy.uid);
 assert.ok(has(s,1,'mana',enemy));
 pick(s,enemy.uid);pick(s,1);
 assert.ok(has(s,1,'grave',enemy));
 assert.equal(s.players[0].mana.length,51);
 assert.equal(s.decision,null);
});

test('Wilhelm ramps once per opponent creature sent from mana to grave by the Great Dragon King (QA38766)',()=>{
 const s=field();
 give(s,0,'mana',[]);
 for(const id of ['dmx13-s02','dmx16-001',WILHELM])add(s,0,'mana',id);
 const retained=Array.from({length:7},()=>add(s,0,'mana',SPELL));
 retained[0].cardId='dm01-109';
 give(s,1,'mana',[WATER,DARK]);
 const opposing=s.players[1].mana.slice();
 s.players[0].hand.push(inst('dmrp05-m01'));
 act(s,'play',a=>a.cardId==='dmrp05-m01'&&a.face===1);drain(s);
 assert.ok(opposing.every(x=>has(s,1,'grave',x)));
 assert.ok(retained.every(x=>has(s,0,'mana',x)));
 assert.equal(s.players[0].mana.length,9);
});

test('Wilhelm sees an opponent spell reach the grave but not a spell finished in its starting grave (QA41166)',()=>{
 const s=field(1);add(s,0,'battle',WILHELM);
 cast(s,'dm11-043');pick(s,0);drain(s);
 assert.equal(s.players[0].mana.length,51);
 const o=field(1);add(o,0,'battle',WILHELM);
 const spell=add(o,1,'grave',SPELL);
 o.extTasks=[{op:'g34_Execute',p:1,source:SPELL,origin:'grave',max:10,spellOnly:true}];
 act(o,'toAttack');pick(o,spell.uid);drain(o);
 assert.ok(has(o,1,'grave',spell));
 assert.equal(o.metrics[1].played[SPELL],1);
 assert.equal(o.players[0].mana.length,50);
});

test('Wilhelm sees no opponent grave placements if it leaves simultaneously (QA41440)',()=>{
 const s=field(1),wilhelm=add(s,0,'battle',WILHELM);
 for(const p of [0,1])for(let i=0;i<3;i++)add(s,p,'battle',DARK);
 cast(s,'dm14-015');drain(s);
 assert.ok(has(s,0,'grave',wilhelm));
 assert.equal(s.players[0].mana.length,50);
 assert.equal(s.players[1].battle.length,0);
});

test('Wilhelm remains queued after Creative bottoms an evolved stack (QA40249)',()=>{
 const s=field(),attacker=add(s,0,'battle',CREATIVE),first=add(s,1,'hand',DOGI),second=add(s,1,'hand',DOGI);
 const enemy=add(s,0,'battle',WATER),mana=s.players[0].mana[0];
 give(s,1,'shields',[]);give(s,1,'mana',Array(7).fill(NATURE));
 const wilhelm=inst(WILHELM);s.players[1].deck.unshift(wilhelm);
 attack(s,attacker.uid);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.effectId===a.effectId&&x.uid===first.uid));
 pick(s,true);
 assert.equal(s.decision?.player,1);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.effectId===a.effectId&&x.source===CREATIVE));
 assert.ok(values(s).includes(first.uid)&&values(s).includes(wilhelm.uid));
 pick(s,wilhelm.uid);
 assert.deepEqual(s.players[1].deck.slice(-2).map(x=>x.uid),[wilhelm.uid,first.uid]);
 assert.ok(s.pendingEffects.some(x=>x.source===WILHELM)&&s.pendingEffects.some(x=>x.uid===second.uid));
 assert.equal(s.decision?.player,1);
 act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.effectId===a.effectId&&x.source===WILHELM));
 pick(s,enemy.uid);pick(s,mana.uid);
 assert.ok(has(s,0,'grave',enemy)&&has(s,0,'grave',mana));
});
