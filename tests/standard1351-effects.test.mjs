import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {manualBoardHTML,newManualUI} from '../dist/manual-ui.js';
import {projectRoom} from '../server/duel-core.mjs';

const LOVE='dm25rp4-OR1',ALLY='dm23rp3-OR1',PERFE='dm25rp2-S08',STAR='dmsd21-012',
 DOLFA='dmrp17-km2',PSYCHIC='dm36-s07',HEAVY='dmex17-033',METAL='dmex17-059',
 GR='dmrp09-m01',ONIKAMASU='dmrp01-041',NATURE='dm01-108',KILL='dm01-027';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const add=(s,p,zone,id,more={})=>{const x=Object.assign(inst(id),{cardOwner:p},more);s.players[p][zone].push(x);return x;};
const field=()=>{const s=setup();s.active=0;for(const p of [0,1])give(s,p,'deck',Array(15).fill(NATURE));return s;};
const has=(s,p,z,x)=>s.players[p][z]?.includes(x)??false;
const exact=s=>e.physicalCards(s).map(x=>x.uid).sort();
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
function send(s,attacker,target){
 attack(s,attacker.uid);
 const choices=s.decision?.choices;
 assert.equal(s.decision?.title,'深淵送りにする相手のクリーチャーを選ぶ');
 act(s,'extended',a=>(choices[a.choice]?.value?.uid??choices[a.choice]?.value)===target.uid);
}

test('all seven official Abyss Love prints resolve to one battle definition',()=>{
 const m=read('tools/support-phase-1351.json'),registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[LOVE]);
 for(const row of [...m.cards,...m.printAliases]){
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1351}),m.cards[0].spec);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:LOVE,count:1}]);
  assert.match(row.verification.imageSha256,/^[a-f0-9]{64}$/);
 }
 const actual=data.cards.filter(x=>nameKey(x.name)===nameKey(m.cards[0].name));
 assert.deepEqual(actual.map(x=>x.id),[LOVE]);
 assert.equal(CARD_IMAGES[LOVE],m.cards[0].image);
 assert.deepEqual(e.playFaces(actual[0]).map(c=>[c.type,c.power,c.cost,c.manaValue,c.breaker]),[['creature',9000,5,1,2]]);
});

for(const origin of ['battle','grave','none'])test('S-NEO chooses at most one eligible base from the board or grave: '+origin,()=>{
 const s=field(),battle=add(s,0,'battle',ALLY,{tapped:true}),grave=add(s,0,'grave',ALLY),non=add(s,0,'grave',NATURE),love=add(s,0,'hand',LOVE),before=exact(s);
 play(s,love);
 const options=e.getLegalActions(s);
 assert.deepEqual(options.filter(a=>a.kind==='evolve').map(a=>a.baseUid),[undefined,battle.uid,grave.uid]);
 act(s,'evolve',a=>a.baseUid===(origin==='battle'?battle.uid:origin==='grave'?grave.uid:undefined));
 assert.deepEqual(love.under?.map(x=>x.uid)||[],origin==='battle'?[battle.uid]:origin==='grave'?[grave.uid]:[]);
 assert.equal(e.isEvolution(love),origin!=='none');
 assert.equal(love.tapped,origin==='battle');
 assert.ok(has(s,0,'grave',non));
 assert.equal(has(s,0,'grave',grave),origin!=='grave');
 assert.deepEqual(exact(s),before);
});

test('QA47945: PERFE protects the same NEO stack from destruction but never from Abyss Send',()=>{
 const s=field(),attacker=add(s,0,'battle',LOVE),target=add(s,1,'battle',PERFE,{under:[inst(ALLY),inst(NATURE)]}),before=[target,...target.under],ids=exact(s);
 cast(s,KILL);act(s,'effect',a=>a.targets[0].uid===target.uid);
 assert.ok(has(s,1,'battle',target));
 send(s,attacker,target);
 assert.deepEqual(s.players[1].abyss,before);
 assert.equal(s.decision?.type,'block');
 assert.deepEqual(exact(s),ids.concat(s.players[0].grave.at(-1).uid).sort());
 assert.deepEqual(exact(JSON.parse(JSON.stringify(s))),exact(s));
 const ui=newManualUI();
 assert.match(manualBoardHTML(s,ui,{art:()=>'',icon:()=>''}),/data-zone="abyss"/);
});

for(const [name,id,fields] of [
 ['Star evolution',STAR,{under:[inst(NATURE)]}],
 ['Linked God',HEAVY,{godLinks:[inst(METAL)]}],
 ['Psychic',PSYCHIC,{}],
 ['GR',GR,{}],
 ['EX Life',DOLFA,{}],
])test('Abyss Send leaves all physical cards in their owners’ public zones: '+name,()=>{
 const s=field(),attacker=add(s,0,'battle',LOVE),target=add(s,1,'battle',id,structuredClone(fields));
 const attached=s.players[1].shields[0];if(id===DOLFA)target.exLifeShieldUid=attached.uid;
 if(id===STAR)target.under[0].cardOwner=0;
 const before=exact(s),attachedCards=target.under||target.godLinks||[];
 send(s,attacker,target);
 assert.deepEqual(s.players[1].abyss.map(x=>x.uid),[target.uid,...(id===STAR?[]:attachedCards.map(x=>x.uid))]);
 if(id===STAR)assert.deepEqual(s.players[0].abyss.map(x=>x.uid),attachedCards.map(x=>x.uid));
 assert.equal(s.players[1].extra?.length??0,0);
 assert.equal(s.players[1].gr?.length??0,0);
 assert.ok(s.players[1].shields.includes(attached));
 assert.deepEqual(exact(s),before);
});

test('ordinary leave triggers still resolve after Abyss Send',()=>{
 const s=field(),attacker=add(s,0,'battle',LOVE),target=add(s,1,'battle','dm24rp1-035');
 const grave=add(s,1,'grave',ALLY);
 send(s,attacker,target);
 assert.ok(has(s,1,'abyss',target));
 const relevant=[...s.extTasks||[],...s.pendingEffects||[]].some(x=>x.source===target.cardId)||s.decision?.source===target.cardId;
 assert.ok(relevant||!has(s,1,'grave',grave));
});

test('selection protections still apply; choosing no card is legal',()=>{
 const s=field();const love=add(s,0,'battle',LOVE),immune=add(s,1,'battle',ONIKAMASU),normal=add(s,1,'battle',NATURE);
 attack(s,love.uid);
 const choices=s.decision.choices.map(x=>x.value?.uid??x.value);
 assert.ok(!choices.includes(immune.uid));
 assert.ok(choices.includes(normal.uid));
 act(s,'extended',a=>choices[a.choice]===null);
 assert.equal(s.players[1].abyss,undefined);
 assert.ok(has(s,1,'battle',normal));
});

for(const mode of ['accept','decline','four'])test('the optional leave replacement mills exactly five or permits the move: '+mode,()=>{
 const s=field(),own=add(s,1,'battle',LOVE),before=mode==='four'?4:9;
 give(s,1,'deck',Array(before).fill(NATURE));
 cast(s,KILL);act(s,'effect',a=>a.targets[0].uid===own.uid);
 if(mode==='accept')act(s,'replaceMillStay1351');
 if(mode==='decline')act(s,'allowLeave');
 assert.equal(has(s,1,'battle',own),mode==='accept');
 assert.equal(s.players[1].deck.length,before-(mode==='accept'?5:0));
 assert.equal(s.players[1].grave.length,mode==='accept'?5:1);
});

test('both seats can inspect cards sent to the Abyss without exposing either library',()=>{
 const s=field(),love=add(s,0,'battle',LOVE),target=add(s,1,'battle',PERFE);
 send(s,love,target);
 const profiles=[{name:'host'},{name:'guest'}];
 const room={hostUid:'one',guestUid:'two',profiles,events:[],phase:'playing',expiresAt:1800000000000,game:s};
 for(const uid of ['one','two']){
  const view=projectRoom(room,{uid},0);
  assert.deepEqual(view.game.players[1].abyss.map(x=>x.id),[PERFE]);
  assert.equal(view.game.players[0].deck,undefined);
  assert.equal(view.game.players[1].deck,undefined);
 }
});
