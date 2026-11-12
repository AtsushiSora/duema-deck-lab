import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const BLUE='dm24ex1-054',ROMANOV='dm23ex2-072',VAMP='dm24ex4-038',PRINT='dm25ex2-Cho041';
const NATURE='dm01-108',DARK='dm01-090',DARK_SPELL='dm01-027',TWIN='dmbd17-007';
const GAIA='dmrp16-s05',ONIKAMASU='dmrp01-041',STRIKE='dmsd17-014';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const ids=rows=>rows.map(x=>x.uid);
const physical=s=>ids(e.physicalCards(s)).sort();
const restore=s=>decodeBattleData(encodeBattleData(s));
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function add(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}

test('Three official cards and the Romanov reprint resolve to three battle definitions',()=>{
 const manifest=read('tools/support-phase-1043.json'),catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[BLUE,ROMANOV,VAMP]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[[PRINT,ROMANOV]]);
 assert.deepEqual(catalogue.resolveRows([{id:ROMANOV,count:2},{id:PRINT,count:2}]),[{id:ROMANOV,count:4}]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],base=manifest.cards.find(x=>x.id===id);
  assert.equal(catalogue.get(row.id).id,id);
  assert.ok(catalogue.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,manifest.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[id],base.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1043}),base.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

for(const destination of ['deckTop','deck'])test('Blue Hawaii draws three and returns two cards in order to '+destination,()=>{
 let s=field();
 const source=add(s,0,'hand',BLUE),previous=add(s,0,'hand',DARK),all=physical(s);
 const [first,second,third,...rest]=s.players[0].deck;
 play(s,source);
 assert.deepEqual(ids(s.players[0].hand),ids([previous,first,second,third]));
 assert.deepEqual(new Set(choices(s)),new Set(ids(s.players[0].hand)));
 pick(s,second.uid);
 assert.deepEqual(new Set(choices(s)),new Set(ids([previous,first,third])));
 pick(s,previous.uid);
 s=restore(s);
 assert.deepEqual(choices(s),['deckTop','deck']);
 pick(s,destination);
 assert.deepEqual(ids(s.players[0].deck),ids(destination==='deckTop'?[second,previous,...rest]:[...rest,second,previous]));
 assert.deepEqual(ids(s.players[0].hand),ids([first,third]));
 assert.deepEqual(physical(s),all);
});

test('Blue Hawaii can be summoned as a shield trigger with no mana',()=>{
 const s=Object.assign(field(),{active:1}),attacker=add(s,1,'battle',NATURE);
 give(s,0,'mana',[]);
 give(s,0,'shields',[BLUE,NATURE]);
 const source=s.players[0].shields[0],first=s.players[0].deck[0],second=s.players[0].deck[1];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===source.uid);
 assert.equal(s.decision.player,0);
 pick(s,first.uid);
 pick(s,second.uid);
 pick(s,'deckTop');
 drain(s);
 assert.ok(has(s,0,'battle',source));
 assert.equal(s.players[0].mana.length,0);
 assert.equal(s.players[0].hand.length,1);
});

test('Romanov pays three mana, evolves from one dark creature and recovers a newly milled dark card',()=>{
 let s=field();
 const source=add(s,0,'hand',ROMANOV),base=add(s,0,'grave',DARK),natural=add(s,0,'grave',NATURE);
 const otherDark=add(s,0,'grave','dm23rp1-039'),oldSpell=add(s,0,'grave',DARK_SPELL);
 give(s,0,'deck',[DARK_SPELL,TWIN,NATURE,DARK,...Array(10).fill(NATURE)]);
 const [spell,twin,nonDark,creature,next]=s.players[0].deck,all=physical(s);
 const action=e.getLegalActions(s).find(x=>x.kind==='play'&&x.uid===source.uid);
 assert.equal(action.cost,3);
 play(s,source);
 assert.equal(s.decision.task.op,'g31_Bases');
 assert.deepEqual(new Set(choices(s)),new Set(ids([base,otherDark])));
 s=restore(s);
 pick(s,base.uid);
 const evolution=s.players[0].battle.find(x=>x.uid===source.uid);
 assert.deepEqual(ids(evolution.under),[base.uid]);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 assert.equal(s.players[0].deck[0].uid,next.uid);
 assert.ok(has(s,0,'grave',nonDark)&&has(s,0,'grave',natural));
 assert.deepEqual(new Set(choices(s)),new Set(ids([otherDark,oldSpell,spell,twin,creature])));
 pick(s,spell.uid);
 assert.deepEqual(ids(s.players[0].hand),[spell.uid]);
 assert.deepEqual(physical(s),all);
});

test('Romanov needs a qualifying dark creature in its own graveyard',()=>{
 const s=field(),source=add(s,0,'hand',ROMANOV);
 add(s,0,'grave',DARK_SPELL);
 add(s,0,'grave',TWIN);
 add(s,0,'grave',NATURE);
 add(s,1,'grave',DARK);
 add(s,0,'battle',DARK);
 assert.ok(!e.getLegalActions(s).some(x=>x.kind==='play'&&x.uid===source.uid));
});

test('Gaia replaces Romanov entry without consuming its grave evolution base',()=>{
 const s=field(),source=add(s,0,'hand',ROMANOV),base=add(s,0,'grave',DARK);
 add(s,1,'battle',GAIA);
 const before=ids(s.players[0].deck);
 play(s,source);
 if(s.decision?.task?.op==='g31_Bases')pick(s,base.uid);
 assert.ok(has(s,0,'mana',source)&&has(s,0,'grave',base));
 assert.deepEqual(ids(s.players[0].deck),before);
});

test('Vamp collects a shield group without S Trigger, allows G Strike, and targets an untapped opponent',()=>{
 let s=field();
 const source=add(s,0,'hand',VAMP),victim=add(s,1,'battle',NATURE);
 const tapped=add(s,1,'battle',NATURE,{tapped:true}),hidden=add(s,1,'battle',ONIKAMASU);
 const friendly=add(s,0,'battle',NATURE);
 give(s,0,'shields',[DARK_SPELL,NATURE]);
 const shield=s.players[0].shields[0],strike=inst(STRIKE);
 shield.shieldStack=[strike];
 const all=physical(s);
 play(s,source);
 pick(s,true);
 pick(s,shield.uid);
 assert.equal(s.decision.task.op,'gsDeclare');
 assert.ok(!s.triggers.undeclared.length);
 pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');
 pick(s,tapped.uid);
 s=restore(s);
 assert.deepEqual(choices(s),[victim.uid]);
 pick(s,victim.uid);
 assert.ok(has(s,0,'hand',shield)&&has(s,0,'hand',strike)&&has(s,1,'grave',victim));
 assert.ok(has(s,0,'battle',friendly)&&has(s,1,'battle',tapped)&&has(s,1,'battle',hidden));
 assert.deepEqual(physical(s),all);
 attack(s,source.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const mode of ['decline','empty','noTarget'])test('Vamp shield and destruction handling with '+mode,()=>{
 const s=field(),source=add(s,0,'hand',VAMP),victim=add(s,1,'battle',NATURE,{tapped:mode==='noTarget'});
 if(mode==='empty')give(s,0,'shields',[]);
 const before=s.players[0].shields.length,shield=s.players[0].shields[0];
 play(s,source);
 if(mode==='decline')pick(s,null);
 if(mode==='noTarget'){
  pick(s,true);
  pick(s,shield.uid);
 }
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',victim));
 assert.equal(s.players[0].shields.length,before-Number(mode==='noTarget'));
});
