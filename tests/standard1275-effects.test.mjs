import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {manualScreenHTML,newManualUI} from '../dist/manual-ui.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CREATIVE='dmrp19-031',KIRA='dmrp17-033',BRAKKIO='dmr13-s05',MEDIC='dmrp19-035';
const WATER='dm01-083',NATURE='dm01-108',DARK='dm01-090';
const HALCAS='dmrp17-068',PAG='dmsd18-002',MARCH='dm32-054',DIDA='dmrp13-km3';
const VV='dmr22-l01',VIRIDE='dm24rp1-S02',TECH='dmrp12-075',JIRCON='dmrp17-028';
const NEW_WORLD='dmrp08-005',MADO_SPELL='dmex08-293',BOUNCE='dmrp20-036';
const EMOTIONAL='dmex12-s04',MIRADANTE='dmr22-l03',DAMD='dmbd10-002',VERDE='dmbd10-008';
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
const play=(s,x,pred=()=>true)=>act(s,'play',a=>a.uid===x.uid&&pred(a));
const values=s=>s.decision?.choices?.map(x=>x.value)??[];
const pick=(s,uid)=>act(s,'extended',a=>(values(s)[a.choice]?.uid??values(s)[a.choice])===uid);
const finishAttack=s=>{if(s.decision?.type==='block')act(s,'noBlock');if(s.decision?.type==='breakChoice')act(s,'breakShields');};
const pass=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

test('eight official copies resolve to the three original card IDs',()=>{
 const m=read('tools/support-phase-1275.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalog=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[CREATIVE,KIRA,BRAKKIO]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dm26ex4-CHO040',CREATIVE],['dm23rp4-T06',KIRA],['dm23rp4x-TF06',KIRA],
  ['dmbd05-004',BRAKKIO],['dmbd18-se04',BRAKKIO]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row,c=e.card(canonicalId);
  const detail={id,status:'complete',faces:row.faces};
  if(id===canonicalId)assert.deepEqual(row.faces,details.cards.find(x=>x.id===id).faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1275}),row.spec);
  const altered=structuredClone(detail);altered.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1275}));
  assert.deepEqual(catalog.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.ok(refs.some(ref=>ref.id===id&&ref.canonicalId===canonicalId&&ref.image===image));
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
 }
});

test('a Creative that entered before MediCrea can be attacked and chosen (QA40245)',()=>{
 const s=field(),c=add(s,0,'hand',CREATIVE),medic=add(s,0,'hand',MEDIC),attacker=add(s,1,'battle',WATER);
 play(s,c);play(s,medic);pass(s);
 assert.equal(e.effectiveCard(c,s).justDiver,true);
 assert.equal(c.justDiverActive,undefined);
 c.tapped=true;s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===c.uid));
 s.phase='main';cast(s,BOUNCE);pick(s,c.uid);drain(s);
 assert.ok(has(s,0,'hand',c));
});

for(const mana of [3,4])test('Creative tests the entering card cost against the opponent mana count '+mana,()=>{
 const s=field(1),source=add(s,1,'battle',CREATIVE),attacker=add(s,1,'battle',WATER);
 give(s,0,'mana',Array(mana).fill(WATER));s.players[0].mana.at(-1).tapped=true;
 give(s,0,'shields',[TECH]);
 const [target]=s.players[0].shields,top=s.players[0].deck[0];
 attack(s,attacker.uid);finishAttack(s);
 act(s,'useTrigger',a=>a.cardId===TECH);drain(s);
 assert.ok(has(s,0,'hand',top),'the entrant’s queued draw resolves even if it leaves');
 assert.equal(has(s,0,'battle',target),mana===4);
 if(mana===3)assert.equal(s.players[0].deck.at(-1),target);
 assert.ok(has(s,1,'battle',source));
});

test('Creative supplies a one-mana Sasage reduction for a Dispector',()=>{
 const s=field(),source=add(s,0,'battle',CREATIVE),target=add(s,0,'hand','dmrp19-030');
 play(s,target,a=>a.alternative==='sasage'&&a.cost===6&&a.sasage.includes(source.uid));drain(s);
 assert.ok(has(s,0,'grave',source)&&has(s,0,'battle',target));
});

test('Creative follows an entrant underneath Bolshack Dogiragon and the owner orders the stack',()=>{
 const s=field(),attacker=add(s,0,'battle',WATER),dogi=add(s,1,'hand','dmr19-l02');
 add(s,0,'battle',CREATIVE);
 give(s,1,'shields',[]);
 give(s,1,'mana',Array(7).fill(NATURE));
 const entrant=inst('dm05-030');s.players[1].deck.unshift(entrant);
 attack(s,attacker.uid);
 assert.equal(s.decision?.task?.op,'g50_Rev0Offer');
 pick(s,true);
 if(values(s).includes(false))pick(s,false);
 assert.ok(values(s).includes(dogi.uid)&&values(s).includes(entrant.uid));
 assert.equal(s.decision.player,1);
 pick(s,entrant.uid);drain(s);
 assert.deepEqual(s.players[1].deck.slice(-2).map(x=>x.uid),[entrant.uid,dogi.uid]);
});

test('Creative sees Miradante arrive when the named-ability suppressor leaves (QA40250)',()=>{
 const s=field(),c=add(s,1,'battle',CREATIVE),host=add(s,0,'battle',EMOTIONAL,{g34ChosenName:e.card(CREATIVE).name});
 const entrant=add(s,0,'hand',MIRADANTE);
 give(s,0,'mana',Array(7).fill(WATER));
 assert.equal(e.abilitiesIgnored(s,c),true);
 attack(s,host.uid);drain(s);
 assert.ok(has(s,0,'hand',host));
 assert.ok(has(s,0,'deck',entrant));
 assert.equal(s.players[0].deck.at(-1),entrant);
 assert.ok(s.finalHistory?.[0]||s.finalUsed?.[0]);
});

for(const controller of [0,1])test('Kira restricts off-hand entry for both players, including Fushigiverse ('+controller+')',()=>{
 const s=field(),kira=add(s,controller,'battle',KIRA),fushi=add(s,0,'grave',DIDA),jira=add(s,0,'mana',JIRCON);
 add(s,0,'battle',BRAKKIO);
 for(const p of [0,1]){
  assert.ok(e.canEnterCreature(s,p,e.card(WATER)));
  for(const origin of ['deck','grave','mana','extra','shields'])
   assert.ok(!e.canEnterCreature(s,p,e.card(WATER),{origin,execution:false}));
  assert.ok(!e.canEnterCreature(s,p,e.card(NEW_WORLD),{origin:'deck',execution:false}));
 }
 const ready=x=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid);
 assert.ok(!ready(fushi)&&!ready(jira));
 kira.g35Ignored=s.turn;
 assert.ok(ready(fushi)&&ready(jira));
});

test('Kira permits Death March to take a graveyard evolution base (QA39672)',()=>{
 const s=field(),base=add(s,0,'grave',DARK);
 add(s,1,'battle',KIRA);
 cast(s,MARCH);pick(s,base.uid);
 assert.equal(s.players[0].battle.find(x=>x.cardId===MARCH).under[0].uid,base.uid);
});

test('Kira permits putting a cast spell under New World (QA39670)',()=>{
 const s=field(),world=add(s,0,'battle',NEW_WORLD),spell=add(s,0,'hand',MADO_SPELL);
 add(s,1,'battle',KIRA);
 play(s,spell);drain(s);
 assert.ok(world.under.some(x=>x.uid===spell.uid));
});

test('Kira blocks VV-8 seals on either side while the two cards can still be taken (QA39669)',()=>{
 for(const controller of [0,1]){
  const s=field(),vv=add(s,0,'hand',VV),deck=s.players[0].deck.slice();
  add(s,controller,'battle',KIRA);
  play(s,vv);
  pick(s,deck[0].uid);pick(s,deck[1].uid);drain(s);
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),deck.slice(0,2).map(x=>x.uid));
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),deck.slice(2).map(x=>x.uid));
  assert.equal(s.players[0].seals.length,0);
  assert.equal(vv.sealed,undefined);
 }
});

test('Kira also prevents seals placed by Eichi no Tettai',()=>{
 const s=field(),kira=add(s,0,'battle',KIRA),enemy=add(s,1,'battle',WATER),top=s.players[1].deck[0];
 cast(s,'dm25ex4-058');pick(s,enemy.uid);drain(s);
 assert.ok(!enemy.sealed);
 assert.equal(s.players[1].deck[0],top);
 assert.deepEqual(s.players[1].seals,[]);
 kira.g35Ignored=s.turn;
 cast(s,'dm25ex4-058');pick(s,enemy.uid);drain(s);
 assert.ok(enemy.sealed);
 assert.equal(s.players[1].seals[0],top);
});

test('Kira can reveal G Strike and prevent a second attacker for the turn',()=>{
 const s=field(),x=add(s,0,'battle',WATER),next=add(s,0,'battle',WATER);
 give(s,1,'shields',[KIRA]);
 attack(s,x.uid);finishAttack(s);
 assert.equal(s.decision.task.op,'gsDeclare');pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');pick(s,next.uid);drain(s);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===next.uid));
 assert.equal(s.players[1].hand[0].cardId,KIRA);
});

test('Brakkio prevents granted Just Diver and native entry abilities while leaving static grants (QA40533)',()=>{
 const s=field(),x=add(s,0,'hand',HALCAS);
 add(s,1,'battle',BRAKKIO);add(s,0,'battle',MEDIC);
 play(s,x);
 assert.ok(has(s,0,'battle',x));
 assert.equal(x.justDiverActive,undefined);
 assert.equal(e.effectiveCard(x,s).justDiver,true);
 assert.equal(s.players[0].hand.length,0);
});

test('Brakkio leaves EX Life and triggers belonging to other creatures intact (QA40534/40536)',()=>{
 const s=field(),x=add(s,0,'hand',PAG),top=s.players[0].deck[0],revive=add(s,0,'grave',HALCAS);
 add(s,1,'battle',BRAKKIO);add(s,1,'battle',VIRIDE);
 play(s,x);
 assert.equal(s.decision?.task?.op,'g26_DrawDeploy');
 assert.deepEqual(e.exLifeShields(s,0,x).map(y=>y.uid),[top.uid]);
 assert.ok(has(s,0,'grave',revive));
 drain(s);
 assert.ok(has(s,0,'grave',revive));
});

test('Brakkio leaves same-side watchers active when another creature enters',()=>{
 const s=field(),dragon=add(s,0,'hand','dm05-030');
 add(s,1,'battle',BRAKKIO);
 add(s,0,'battle','dm22-041');
 add(s,0,'battle','dm04-024');
 const [first,second]=s.players[0].deck;
 play(s,dragon);drain(s);
 assert.ok(has(s,0,'hand',first)&&has(s,0,'hand',second));
});

test('the manual board identifies Brakkio as the source of entry suppression',()=>{
 const s=field();add(s,1,'battle',BRAKKIO);
 const html=manualScreenHTML(s,newManualUI(),{art:()=>'',icon:()=>'',practice:true});
 assert.match(html,/自分のクリーチャー自身の登場時能力は界王類絶対目 ワルド・ブラッキオによりトリガーしない/);
});

test('Brakkio suppresses both of Miradante’s entry abilities after Revolution Change',()=>{
 const s=field(),host=add(s,0,'battle',EMOTIONAL),miradante=add(s,0,'hand',MIRADANTE),top=s.players[0].deck[0];
 add(s,1,'battle',BRAKKIO);
 attack(s,host.uid);drain(s);
 assert.ok(has(s,0,'battle',miradante));
 assert.ok(has(s,0,'hand',host));
 assert.equal(s.players[0].deck[0],top);
 assert.ok(!s.finalHistory?.[0]&&!s.finalUsed?.[0]);
});

test('Brakkio has World Breaker and its ability can be ignored',()=>{
 const s=field(),enemy=add(s,0,'battle',BRAKKIO);
 attack(s,enemy.uid);finishAttack(s);drain(s);
 assert.equal(s.players[1].shields.length,0);
 const ignored=field(),x=add(ignored,1,'battle',BRAKKIO),entrant=add(ignored,0,'hand',HALCAS);
 x.g35Ignored=ignored.turn;
 play(ignored,entrant);
 assert.equal(ignored.players[0].hand.length,1);
});

for(const origin of ['hand','grave','mana','battle'])test('Brakkio distinguishes entry from a battlefield-only Dead Damd stack ('+origin+')',()=>{
 const s=field(),attacker=add(s,0,'battle',VERDE),source=add(s,0,origin,DAMD);
 add(s,1,'battle',BRAKKIO);
 attack(s,attacker.uid);
 assert.equal(s.decision?.task?.op,'g2_Declare');pick(s,true);
 assert.equal(s.decision?.task?.op,'g2_Invade');pick(s,true);
 assert.ok(source.under?.some(x=>x.uid===attacker.uid));
 if(origin==='battle'){
  assert.equal(s.decision?.task?.op,'g2_Damd');
 }else{
  assert.notEqual(s.decision?.task?.op,'g2_Damd');
  assert.ok(!s.pendingEffects?.some(x=>x.uid===source.uid&&x.effect==='entry'));
 }
});
