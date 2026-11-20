import test from 'node:test';
import assert from 'node:assert/strict';
import {e,act,data,details,inst,give,setup,snapshot,drain,attack} from './target-fixture.mjs';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
const SHUFFLES=['dmx12b-010','dmx15-005'],LUNA='dm23rp1-018',DRAGON='dmex18-s07',FIRE='dm01-097';
const add=(s,p,z,id)=>{const x=inst(id);s.players[p][z].push(x);return x;};
const field=()=>{const s=setup();s.turn=3;for(const p of [0,1])give(s,p,'deck',Array(15).fill(FIRE));return s;};
const play=(s,p,id)=>{s.active=p;s.phase='main';const x=add(s,p,'hand',id);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;};
const pick=(s,v)=>act(s,'extended',a=>{const value=s.decision.choices[a.choice].value;return(value?.uid??value)===v;});
test('five verified official prints have two canonical IDs, complete specs, images and current limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1365.json',import.meta.url)));
 const db=createCatalogue(snapshot,data.cards,details);
 assert.equal(m.cards.length,2);assert.equal(m.printAliases.length,3);
 for(const row of [...m.cards,...m.printAliases]){
  const detail=[...details.cards,...details.printAliases].find(x=>x.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1365}),row.spec);
  const bad=structuredClone(detail);bad.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(bad,{phase:1365}));
  const id=row.canonicalId??row.id;
  assert.equal(e.card(id).limit,m.regulationVerification.limits[row.id]);
  assert.equal(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).length,1);
  assert.equal(CARD_IMAGES[id],m.cards.find(x=>x.id===id).image);
  assert.deepEqual(db.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
 }
});
test('QA43060: both shuffle sources replace the whole Luna mill without exposing or losing cards',()=>{
 for(const id of SHUFFLES)for(const owner of [0,1]){
  const s=field();play(s,owner,id);const ids=s.players[0].deck.map(x=>x.uid).sort();
  play(s,0,LUNA);pick(s,true);
  assert.equal(s.players[0].grave.length,0);
  assert.deepEqual(s.players[0].deck.map(x=>x.uid).sort(),ids);
  assert.equal(s.decision,null);
  assert.ok(!s.log.some(x=>x.type==='reveal'&&x.text.includes('凶戦士')));
 }
});
test('QA40832: neither shuffle source allows Molnarlk to destroy an opponent creature',()=>{
 for(const id of SHUFFLES)for(const owner of [0,1]){
  const s=field();play(s,owner,id);give(s,0,'deck',Array(15).fill('dm01-s08'));
  const small=add(s,1,'battle',FIRE);play(s,0,DRAGON);pick(s,true);
  assert.equal(s.players[0].grave.length,0);
  assert.equal(s.players[0].deck.length,15);
  assert.ok(s.players[1].battle.some(x=>x.uid===small.uid));assert.equal(s.decision,null);
 }
});
test('native mana and shield placements stay in the library and do not generate arrivals',()=>{
 for(const id of SHUFFLES)for(const spell of ['dm06-110','dmr21-032']){
  const s=field();play(s,1,id);const before={deck:s.players[0].deck.length,mana:s.players[0].mana.length,shields:s.players[0].shields.length};
  play(s,0,spell);drain(s);
  assert.equal(s.players[0].deck.length,before.deck);
  assert.equal(s.players[0].mana.length,before.mana);
  assert.equal(s.players[0].shields.length,before.shields);
 }
});
test('replacement priority and choice survive saving, and chosen grave placement does not chain',()=>{
 for(const grave of [false,true]){
  let s=field();play(s,0,SHUFFLES[0]);play(s,0,'dm22ex1-086');
  play(s,0,LUNA);pick(s,true);
  assert.equal(s.decision.type,'deckMove1365');s=JSON.parse(JSON.stringify(s));
  act(s,'deckMove1365',a=>s.decision.choices[a.choice].to===(grave?'graveReplacement1365':'deckShuffle1365'));
  assert.equal(s.players[0].grave.length,grave?5:0);
  assert.equal(s.players[0].deck.length,grave?10:15);
 }
});
test('QA39943 keeps Deddam’s first hand card and shuffles the other two',()=>{
 const s=field();play(s,1,SHUFFLES[0]);
 const deck=s.players[0].deck.map(x=>x.uid),n=s.players[0].mana.length;
 play(s,0,'dmbd10-010');pick(s,deck[0]);
 if(s.decision)pick(s,deck[1]);drain(s);
 assert.ok(s.players[0].hand.some(x=>x.uid===deck[0]));
 assert.equal(s.players[0].mana.length,n);assert.equal(s.players[0].grave.length,0);
 assert.equal(s.players[0].deck.length,14);
});
test('QA43789 Fox keeps a chosen hand creature, or shuffles all four if mana is chosen',()=>{
 for(const to of ['hand','mana']){
  const s=field();play(s,1,SHUFFLES[0]);
  const first=s.players[0].deck[0],n=s.players[0].mana.length;
  play(s,0,'dm23rp3-008');pick(s,first.uid);pick(s,to);drain(s);
  assert.equal(s.players[0].hand.some(x=>x.uid===first.uid),to==='hand');
  assert.equal(s.players[0].deck.length,to==='hand'?14:15);
  assert.equal(s.players[0].mana.length,n);assert.equal(s.players[0].grave.length,0);
  assert.equal(new Set(e.physicalCards(s).map(x=>x.uid)).size,e.physicalCards(s).length);
 }
});
test('QA39981 stops Jolly’s old look after the first mana placement is replaced',()=>{
 const s=field();play(s,1,SHUFFLES[0]);
 const jolly=play(s,0,'dmex16-016');const victim=add(s,1,'battle',FIRE);
 const n=s.players[0].deck.length,hand=s.players[0].hand.length;
 attack(s,jolly.uid,victim.uid);act(s,'noBlock');
 pick(s,s.players[0].deck[0].uid);drain(s);
 assert.equal(s.players[0].deck.length,n);assert.equal(s.players[0].hand.length,hand);
});
test('a shuffling replacement cannot chain onto Amodegoras’s draw replacement',()=>{
 const s=field();play(s,0,SHUFFLES[0]);play(s,1,'dmrp19-s10');
 s.players[0].drawsThisTurn=1;
 const mana=s.players[0].mana.length;
 play(s,0,'dm01-052');drain(s);
 assert.equal(s.players[0].mana.length,mana+3);
});
test('QA41296 Fire Now starts with mana and ends its old three-card look when shuffled',()=>{
 const s=field();play(s,1,SHUFFLES[0]);const deck=s.players[0].deck.length,hand=s.players[0].hand.length;
 const victim=add(s,1,'battle',FIRE);play(s,0,'dmrp17-029');
 assert.match(s.decision.title,/マナ/);pick(s,s.players[0].deck[0].uid);drain(s);
 assert.equal(s.players[0].deck.length,deck);assert.equal(s.players[0].hand.length,hand);
 assert.ok(s.players[1].battle.some(x=>x.uid===victim.uid));
 assert.deepEqual(s.players[0].grave.map(x=>x.cardId),['dmrp17-029']);
});
test('QA49081 Redmad cannot use the unknown shuffled card’s cost to destroy',()=>{
 const s=field();play(s,1,SHUFFLES[0]);give(s,0,'deck',Array(15).fill('dm01-s08'));
 add(s,0,'battle',FIRE);const victim=add(s,1,'battle',FIRE);
 const n=s.players[0].mana.length;play(s,0,'dm26ex2-015');drain(s);
 assert.equal(s.players[0].mana.length,n);assert.equal(s.players[0].deck.length,15);
 assert.ok(s.players[1].battle.some(x=>x.uid===victim.uid));
});
test('Hogan can deploy a shuffle source itself before its continuous ability starts',()=>{
 const s=field();give(s,0,'deck',Array(4).fill(SHUFFLES[0]));
 play(s,0,'dm39-026');drain(s);
 assert.equal(s.players[0].battle.filter(x=>x.cardId===SHUFFLES[0]).length,1);
 assert.equal(s.players[0].deck.length,3);
});
test('a source already in battle replaces a Hogan creature entry and preserves every card',()=>{
 const s=field();play(s,1,SHUFFLES[0]);const before=e.physicalCards(s).length;
 play(s,0,'dm39-026');drain(s);
 assert.equal(s.players[0].battle.length,0);assert.equal(s.players[0].deck.length,15);
 assert.equal(e.physicalCards(s).length,before+1);
});
test('QQ forbids shuffling, so a replaced blind mill preserves library order and identities',()=>{
 const s=field();play(s,0,SHUFFLES[0]);add(s,1,'battle','dmrp07-m01');
 const ids=s.players[0].deck.map(x=>x.uid);
 play(s,0,LUNA);pick(s,true);assert.deepEqual(s.players[0].deck.map(x=>x.uid),ids);
 assert.equal(s.players[0].grave.length,0);
});
test('an ignored or sealed source does not replace milling, and Genmu suppresses its cheap ability',()=>{
 for(const mode of ['ignored','sealed','genmu']){
  const s=field(),source=play(s,1,SHUFFLES[0]);
  if(mode==='ignored')source.g35Ignored=s.turn;
  if(mode==='sealed'){
   source.sealed=true;
   (s.players[1].seals??=[]).push({...inst(FIRE),faceDown:true,sealOf:source.uid});
  }
  if(mode==='genmu'){
   add(s,1,'battle','dmrp15-km1');give(s,0,'deck',Array(15).fill('dm01-s08'));
   play(s,0,DRAGON);pick(s,true);assert.equal(s.players[0].grave.length,3);
  }else{
   play(s,0,LUNA);pick(s,true);assert.equal(s.players[0].grave.length,5);
  }
 }
});
test('normal draws still leave the library, and later hand discards cannot be mistaken for deck moves',()=>{
 const s=field();play(s,1,SHUFFLES[0]);play(s,0,'dm01-052');act(s,'draw',a=>a.n===3);
 const drawn=s.players[0].hand.map(x=>x.uid);assert.equal(drawn.length,3);
 const n=s.players[0].deck.length,grave=s.players[0].grave.length;
 play(s,1,'dm01-094');drain(s);
 assert.equal(s.players[0].deck.length,n);
 assert.equal(s.players[0].grave.length,grave+1);
 assert.ok(s.players[0].grave.some(x=>drawn.includes(x.uid)));
});
test('each replacement-owning player gets priority on their turn, without a second replacement',()=>{
 for(const owner of [0,1]){
  const s=field();play(s,owner,SHUFFLES[0]);play(s,1-owner,'dm22ex1-086');
  play(s,0,LUNA);pick(s,true);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].grave.length,owner===0?0:5);
 }
});
test('QA40785 a hidden Stone Tablet card grants no creature power, and VV seals stay in the library',()=>{
 for(const id of SHUFFLES){
  const s=field();play(s,1,id);const ally=add(s,0,'battle',FIRE),power=e.power(ally,false,s);
  play(s,0,'dm28-109');assert.equal(e.power(ally,false,s),power);
  const t=field();play(t,1,id);const n=t.players[0].deck.length;
  play(t,0,'dmr22-l01');drain(t);
  assert.equal(t.players[0].deck.length,n-2);assert.equal(t.players[0].seals.length,0);
  assert.equal(t.players[0].hand.length,2);assert.equal(t.players[0].battle[0].sealed??false,false);
 }
});
test('QA42507 Vision resolves a deck spell before returning it, and a played seed never enters',()=>{
 for(const id of ['dm01-027','dm22rp2-002']){
  const s=field();play(s,1,SHUFFLES[0]);add(s,0,'battle','dm22rp2-002');
  const victim=add(s,1,'battle',FIRE);give(s,0,'deck',[id,...Array(14).fill(FIRE)]);
  const top=s.players[0].deck[0];s.active=0;s.phase='main';
  act(s,'play',a=>a.origin==='deck'&&a.uid===top.uid);
  if(id==='dm01-027')act(s,'effect',a=>a.targets.some(x=>x.uid===victim.uid));
  drain(s);
  assert.ok(s.players[0].deck.some(x=>x.uid===top.uid));assert.equal(s.players[0].grave.length,0);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(id).cost);
  if(id==='dm01-027')assert.ok(s.players[1].grave.some(x=>x.uid===victim.uid));
  else assert.equal(s.players[0].battle.filter(x=>x.cardId===id).length,1);
 }
});
