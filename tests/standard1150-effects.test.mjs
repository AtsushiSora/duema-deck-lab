import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BULL='dm22rp1-010',ULEX='dm10-066',PIT='dm25rp3-040';
const NAT='dm01-108',BOUNCE='dm01-086',MANA='dm01-039',DESTROY='dm01-027';
const SPARK='dm01-015',NEO='dmrp02-036',EVOLUTION='dm14-001';
function add(s,p,zone,id,attrs={}){
 const card=Object.assign(inst(id),attrs);
 s.players[p][zone].push(card);
 return card;
}
const value=c=>c.value?.uid??c.value;
const options=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const targets=s=>s.decision.targets.map(c=>c.uid);
const target=(s,uid)=>act(s,'effect',a=>a.targets.some(x=>x.uid===uid));

test('three canonical cards match official faces, images and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1150.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[BULL,ULEX,PIT]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1150}),row.spec);
  assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  assert.equal(c.cost,f.cost);
  assert.equal(c.power,Number(f.powerText));
  assert.deepEqual(c.civilizations,f.civilizations);
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(catalogue.get(row.id).id,row.id);
  assert.equal(catalogue.byName.get(nameKey(row.name)).id,row.id);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
});

test('Bull protects other allied creatures from hand and mana removal but permits destruction',()=>{
 const s=setup();
 const bull=add(s,0,'battle',BULL),ally=add(s,0,'battle',NAT);
 s.active=1;
 cast(s,BOUNCE);target(s,ally.uid);
 cast(s,MANA);target(s,ally.uid);
 assert.ok(s.players[0].battle.includes(ally));
 cast(s,DESTROY);target(s,ally.uid);
 assert.ok(s.players[0].grave.includes(ally));
 cast(s,BOUNCE);target(s,bull.uid);
 assert.ok(s.players[0].hand.includes(bull));
});

test('Bull protects neither opposing creatures nor its allies while sealed',()=>{
 const s=setup();
 const bull=add(s,0,'battle',BULL),ally=add(s,0,'battle',NAT),enemy=add(s,1,'battle',NAT);
 cast(s,BOUNCE);target(s,enemy.uid);
 assert.ok(s.players[1].hand.includes(enemy));
 add(s,0,'seals',NAT,{faceDown:true,sealOf:bull.uid});
 bull.sealed=true;s.active=1;
 cast(s,BOUNCE);target(s,ally.uid);
 assert.ok(s.players[0].hand.includes(ally));
});

test('Bull stops revolution change without moving either card or ending the original attack',()=>{
 const s=setup();
 add(s,0,'battle',BULL);
 const attacker=add(s,0,'battle','dmx01-015'),incoming=add(s,0,'hand','dmex17-020');
 attack(s,attacker.uid);
 assert.equal(s.decision.task.op,'revDeclare');
 pick(s,true);drain(s);
 assert.ok(s.players[0].hand.includes(incoming));
 assert.ok(s.players[0].battle.includes(attacker));
 assert.equal(attacker.tapped,true);
 assert.equal(s.players[1].shields.length,4);
});

test('Bull allows a destruction event whose destination is replaced (QA 38648)',()=>{
 const s=setup();
 add(s,0,'battle',BULL);
 const ally=add(s,0,'battle','dmx13-s02');
 s.active=1;cast(s,DESTROY);target(s,ally.uid);drain(s);
 assert.ok(s.players[0].hand.includes(ally));
});

test('Bull stops J-change to mana and allows J-crime to the grave (QA 49409)',()=>{
 const s=setup(),attacker=add(s,0,'battle','dm26rp3-052');
 add(s,0,'battle',BULL);
 const mana=add(s,0,'mana','dmrp08-091'),grave=add(s,0,'grave','dmrp08-091');
 attack(s,attacker.uid);drain(s);
 assert.ok(s.players[0].mana.includes(mana));
 assert.ok(s.players[0].grave.includes(attacker));
 assert.ok(s.players[0].battle.includes(grave));
});

test('Bull keeps a Fushigibirth base in battle while its cost reduction applies (QA 40178)',()=>{
 const s=setup(),ally=add(s,0,'battle',NAT);
 add(s,0,'battle',BULL);
 const entrant=add(s,0,'grave','dmrp13-078');
 const play=e.getLegalActions(s).find(a=>a.uid===entrant.uid&&a.fushiBase===ally.uid);
 assert.ok(play&&play.cost<e.card(entrant).fushigibirth);
 e.step(s,play);drain(s);
 assert.ok(s.players[0].battle.includes(ally)&&ally.tapped);
 assert.ok(s.players[0].battle.includes(entrant));
});

test('Ulex charges tapped and keeps both printed civilizations',()=>{
 const s=setup(),ulex=add(s,0,'hand',ULEX);
 s.phase='charge';
 act(s,'charge',a=>a.uid===ulex.uid);
 assert.ok(s.players[0].mana.includes(ulex)&&ulex.tapped);
 assert.deepEqual(e.card(ulex).civilizations,['闇','火']);
});

test('Ulex resists the opposing mass tap and still taps when its owner attacks',()=>{
 const s=setup();
 const ulex=add(s,0,'battle',ULEX),ally=add(s,0,'battle',NAT);
 s.active=1;cast(s,SPARK);
 assert.equal(ulex.tapped,false);
 assert.equal(ally.tapped,true);
 s.active=0;attack(s,ulex.uid);
 assert.equal(ulex.tapped,true);
});

test('Ulex still can be chosen by an opposing tap spell and loses immunity while its abilities are ignored',()=>{
 const s=setup(),ulex=add(s,0,'battle',ULEX);
 s.active=1;cast(s,'dm01-085');
 target(s,ulex.uid);
 assert.equal(ulex.tapped,false);
 ulex.g35Ignored=s.turn;
 cast(s,SPARK);
 assert.equal(ulex.tapped,true);
});

test('Ulex can enter tapped under a placement effect (QA 41160)',()=>{
 const s=setup();
 add(s,1,'battle','dmr02-s03');
 const ulex=add(s,0,'hand',ULEX);
 act(s,'play',a=>a.uid===ulex.uid);
 assert.ok(s.players[0].battle.includes(ulex)&&ulex.tapped);
});

test('Pit Out must put one grave card under an allied NEO on entry, even a spell (QA 41077)',()=>{
 const s=setup(),neo=add(s,0,'battle',NEO),regular=add(s,0,'battle',NAT);
 const foe=add(s,1,'battle',NEO),spell=add(s,0,'grave',BOUNCE),other=add(s,0,'grave',NAT);
 cast(s,PIT);
 assert.deepEqual(options(s),[neo.uid]);
 assert.equal(e.isEvolution(neo),false);
 pick(s,neo.uid);
 assert.deepEqual(new Set(options(s)),new Set([spell.uid,other.uid]));
 pick(s,spell.uid);
 assert.deepEqual(neo.under,[spell]);
 assert.ok(e.isEvolution(neo));
 assert.ok(s.players[0].grave.includes(other));
 assert.equal(regular.under,undefined);
 assert.equal(foe.under,undefined);
});

test('Pit Out can add another card under an ordinary evolution on attack',()=>{
 const s=setup();
 const pit=add(s,0,'battle',PIT),base=inst(NAT);
 const evolution=add(s,0,'battle',EVOLUTION,{under:[base]});
 const material=add(s,0,'grave',NAT);
 attack(s,pit.uid);
 assert.deepEqual(options(s),[evolution.uid]);
 pick(s,evolution.uid);pick(s,material.uid);drain(s);
 assert.deepEqual(evolution.under,[base,material]);
 assert.ok(!s.players[0].grave.includes(material));
});

test('Pit Out has no choices without a grave card or an eligible allied host',()=>{
 for(const hasHost of [false,true]){
  const s=setup();
  add(s,0,hasHost?'battle':'grave',NEO);
  cast(s,PIT);
  assert.equal(s.decision,null);
 }
});

test('Pit Out cannot attach a card from a graveyard locked by Apul',()=>{
 const s=setup(),neo=add(s,0,'battle',NEO),grave=add(s,0,'grave',NAT);
 add(s,1,'battle','dmrp22-042');
 cast(s,PIT);
 assert.equal(s.decision,null);
 assert.equal(neo.under,undefined);
 assert.ok(s.players[0].grave.includes(grave));
});
