import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,inst,act,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const {cards,printAliases,regulationVerification}=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-1178.json',import.meta.url)));
const LUPIA='dm22ex2-026',MOTH='dm12-029',DARTS='dm23ex1-054';
const DRAGON='dm08-049',SMALL_DRAGON='dmex06-026',MILPOLO='dm10-080';
const SMALL='dm01-083',SIX='dm01-s04',EIGHT='dmr01-066';
const add=(s,p,zone,id)=>{const x=inst(id);s.players[p][zone].push(x);return x;};
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);
const pass=s=>{s.phase='attack';act(s,'endTurn');};
const play=(s,x,origin='hand')=>act(s,'play',a=>a.uid===x.uid&&(a.origin??'hand')===origin&&!a.alternative);
const permit=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid&&a.origin==='grave'&&a.manaPermit?.startsWith('g450:'));
const save=s=>JSON.parse(JSON.stringify(s));

test('each verified print shares its canonical identity, official stats and image',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 for(const row of [...cards,...printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1178}),row.spec);
  assert.equal(c.limit,regulationVerification.limits[row.id]);
  assert.equal(c.manaValue,1);
  assert.equal(c.cost,row.faces[0].cost);
  assert.equal(c.power,Number(row.faces[0].powerText));
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  const corrupt=structuredClone(row);corrupt.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec({...corrupt,status:'complete'},{phase:1178}));
 }
});

test('Lupia charges two fewer mana for hand and grave Dragons, with a floor of one',()=>{
 const s=setup(),p=s.active;
 add(s,p,'battle',LUPIA);
 const hand=add(s,p,'hand',DRAGON),grave=add(s,p,'grave',DRAGON),small=add(s,p,'grave',SMALL_DRAGON);
 const other=add(s,p,'grave',SMALL),handOther=add(s,p,'hand',SMALL);
 assert.equal(e.getLegalActions(s).find(a=>a.uid===hand.uid&&a.kind==='play').cost,2);
 assert.equal(e.getLegalActions(s).find(a=>a.uid===handOther.uid&&a.kind==='play').cost,2);
 assert.equal(permit(s,grave)[0].cost,2);
 assert.equal(permit(s,small).length,1);
 assert.equal(permit(s,small)[0].cost,1);
 assert.equal(permit(s,other).length,0);
 play(s,grave,'grave');
 assert.ok(s.players[p].battle.includes(grave));
 assert.equal(s.players[p].mana.filter(x=>x.tapped).length,2);
 assert.equal(permit(s,small).length,0);
});

test('Lupia each copy grants one separate summon, restored on the next turn after JSON round-trip',()=>{
 let s=setup();const p=s.active,grave=add(s,p,'grave',DRAGON),second=add(s,p,'grave',DRAGON),third=add(s,p,'grave',DRAGON);
 add(s,p,'battle',LUPIA);add(s,p,'battle',LUPIA);
 assert.equal(permit(s,grave).length,2);
 assert.ok(permit(s,grave).every(a=>a.cost===1));
 e.step(s,permit(s,grave)[0]);
 s=save(s);
 assert.equal(permit(s,second).length,1);
 e.step(s,permit(s,second)[0]);
 assert.equal(permit(s,third).length,0);
 pass(s);pass(s);s.phase='main';
 assert.equal(permit(s,third).length,2);
});

test('Lupia provides neither cost reduction nor grave access while abilities are ignored',()=>{
 const s=setup(),p=s.active;
 add(s,p,'battle',LUPIA);add(s,1-p,'battle',GEN);
 const grave=add(s,p,'grave',DRAGON),hand=add(s,p,'hand',DRAGON);
 assert.equal(permit(s,grave).length,0);
 assert.equal(e.getLegalActions(s).find(a=>a.uid===hand.uid&&a.kind==='play').cost,4);
});

function startMoth(ours,theirs,copies=1){
 const s=setup(),p=1-s.active;
 for(let i=0;i<copies;i++)add(s,p,'battle',MOTH);
 for(const id of ours)add(s,p,'battle',id);
 for(const id of theirs)add(s,1-p,'battle',id);
 return {s,p,before:s.players[p].deck.length};
}
for(const [ours,theirs] of [[[SIX],[SIX]],[[SIX],[EIGHT]]]){
 test('Moth draws no extra cards at opposing tie or higher opposing power '+theirs[0],()=>{
  const {s,p,before}=startMoth(ours,theirs);
  pass(s);
  assert.equal(s.decision,null);
  assert.equal(s.players[p].deck.length,before-1);
 });
}
test('two allied maxima still give one extra per Moth, with the choice independent per copy',()=>{
 const {s,p,before}=startMoth([EIGHT,EIGHT],[SIX],2);
 pass(s);pick(s,true);pick(s,true);
 assert.equal(s.decision,null);
 assert.equal(s.players[p].deck.length,before-3);
});
test('the extra draw is optional against an empty battlefield',()=>{
 const {s,p,before}=startMoth([],[]);
 pass(s);pick(s,null);
 assert.equal(s.players[p].deck.length,before-1);
});
test('QA35241 Milpolo can receive the extra draw, and that Moth cannot also enhance the regular draw',()=>{
 const {s,p,before}=startMoth([],[]);
 add(s,p,'battle',MILPOLO).tapped=true;
 pass(s);
 act(s,'silent496',a=>a.yes===true);
 assert.equal(s.decision.source,MOTH);
 pick(s,true);
 assert.equal(s.decision,null);
 assert.equal(s.players[p].deck.length,before-3);
});
test('declining the extra Milpolo draw lets Moth offer it for the regular draw',()=>{
 const {s,p,before}=startMoth([],[]);
 add(s,p,'battle',MILPOLO).tapped=true;
 pass(s);act(s,'silent496',a=>a.yes===true);pick(s,null);
 assert.equal(s.decision.source,MOTH);
 pick(s,true);
 assert.equal(s.players[p].deck.length,before-3);
});

test('Darts collects both private selections before discard and can draw one of two cards',()=>{
 let s=setup();const p=s.active,darts=add(s,p,'hand',DARTS),own=add(s,p,'hand',SMALL),other=add(s,1-p,'hand',SIX);
 const before=s.players[p].deck.length;
 play(s,darts);assert.equal(s.decision.player,p);pick(s,own.uid);
 assert.equal(s.decision.player,1-p);
 assert.ok(s.players[p].hand.includes(own));
 s=save(s);pick(s,other.uid);
 assert.ok(s.players[p].grave.some(x=>x.uid===own.uid));
 assert.ok(s.players[1-p].grave.some(x=>x.uid===other.uid));
 pick(s,true);pick(s,null);
 assert.equal(s.players[p].deck.length,before-1);
});
test('Darts counts only actual discards and allows the other side to have an empty or protected hand',()=>{
 for(const mode of ['empty','protected','replaced','normal']){
  const s=setup(),p=s.active,darts=add(s,p,'hand',DARTS);
  const own=add(s,p,'hand',SMALL);
  const other=mode==='empty'?null:add(s,1-p,'hand',mode==='replaced'?'dmr02-005':SIX);
  const before=s.players[p].deck.length;
  if(mode==='protected')add(s,1-p,'battle','dm23rp2-029');
  play(s,darts);pick(s,own.uid);
  if(mode==='replaced'||mode==='normal')pick(s,other.uid);
  if(mode==='replaced')pick(s,true);
  pick(s,true);
  if(mode==='normal')pick(s,true);
  assert.equal(s.decision,null);
  assert.equal(s.players[p].deck.length,before-(mode==='normal'?2:1),mode);
  if(mode==='protected')assert.ok(s.players[1-p].hand.includes(other));
  if(mode==='replaced')assert.ok(s.players[1-p].mana.includes(other));
 }
});
test('Darts gives no draw when both hands are empty after it enters',()=>{
 const s=setup(),p=s.active,x=add(s,p,'hand',DARTS),before=s.players[p].deck.length;
 play(s,x);drain(s);
 assert.equal(s.players[p].deck.length,before);
 assert.equal(s.decision,null);
});
