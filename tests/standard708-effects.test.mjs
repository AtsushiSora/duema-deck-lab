import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-708.json',import.meta.url)));

test('Phase 708 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:708}));
  assert.throws(()=>standardCardSpec(detail,{phase:707}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:708}));
 }
});

const HORN='dm05-054',TIMER='dm16-032',AQUA='dm07-040',SURVIVOR='dm05-044';
const BODY='dm01-108',WATER='dm01-083',BLOCKER='dm01-076',DESTROY='dm01-027',BOUNCE='dm01-086';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,x)=>act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===x.uid);

test('Aqua Agent reprint compiles to the same effects without a second battle definition',()=>{
 const [print]=printAliases;
 const original=cards.find(c=>c.id===AQUA);
 assert.equal(print.canonicalId,AQUA);
 assert.ok(print.verification.facesMatched);
 assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:708}),original.spec);
 assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[AQUA]);
 assert.ok(!data.cards.some(c=>c.id===print.id));
});

test('each Smash Horn contributes its marked power once, only to its own side',()=>{
 const s=setup(),a=put(s,0,HORN),ally=put(s,0,SURVIVOR),other=put(s,0,BODY),enemy=put(s,1,HORN);
 assert.equal(e.card(a).power,2000);
 assert.equal(e.power(a,false,s),3000);
 assert.equal(e.power(ally,false,s),e.card(ally).power+1000);
 const b=put(s,0,HORN);
 for(const x of [a,b])assert.equal(e.power(x,false,s),4000);
 assert.equal(e.power(ally,false,s),e.card(ally).power+2000);
 assert.equal(e.power(other,false,s),e.card(other).power);
 assert.equal(e.power(enemy,false,s),3000);
 b.g35Ignored=s.turn;
 assert.equal(e.power(a,false,s),3000);
 assert.equal(e.power(b,false,s),2000);
 assert.equal(e.power(ally,false,s),e.card(ally).power+1000);
 delete b.g35Ignored;
 b.sealed=true;
 assert.equal(e.power(a,false,s),3000);
 s.players[0].grave.push(s.players[0].battle.splice(s.players[0].battle.indexOf(a),1)[0]);
 assert.equal(e.power(a,false,s),2000);
 assert.equal(e.power(ally,false,s),e.card(ally).power);
});

test('Timer taps itself and untaps only another friendly creature, allowing a second attack',()=>{
 let s=setup();
 s.active=0;
 const timer=put(s,0,TIMER),attacker=put(s,0,BODY),other=put(s,0,BODY,{tapped:true}),enemy=put(s,1,BODY,{tapped:true});
 attack(s,attacker.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(attacker.tapped);
 const mana=s.players[0].mana.filter(x=>x.tapped).length;
 act(s,'tapAbility',a=>a.uid===timer.uid);
 assert.ok(timer.tapped);
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid).sort(),[attacker.uid,other.uid].sort());
 s=restore(s);
 pick(s,attacker);
 assert.ok(!s.players[0].battle.find(x=>x.uid===attacker.uid).tapped);
 assert.ok(s.players[0].battle.find(x=>x.uid===other.uid).tapped);
 assert.ok(s.players[1].battle.find(x=>x.uid===enemy.uid).tapped);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,mana);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='tapAbility'&&a.uid===timer.uid));
 attack(s,attacker.uid);
});

test('Timer respects summoning sickness and effects that prevent untapping',()=>{
 const s=setup();
 s.active=0;
 s.phase='attack';
 const timer=put(s,0,TIMER,{entered:s.turn}),ally=put(s,0,BODY,{tapped:true,tapLocks:[0]});
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='tapAbility'&&a.uid===timer.uid));
 timer.entered=s.turn-1;
 act(s,'tapAbility',a=>a.uid===timer.uid);
 pick(s,ally);
 assert.ok(timer.tapped&&ally.tapped);
});

test('Aqua Agent cannot be blocked only while the opponent has water mana',()=>{
 const s=setup();
 s.active=0;
 const aqua=put(s,0,AQUA),blocker=put(s,1,BLOCKER);
 give(s,1,'mana',[BODY]);
 give(s,1,'grave',[WATER]);
 attack(s,aqua.uid);
 const canBlock=()=>e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid);
 assert.ok(canBlock());
 give(s,1,'mana',[WATER]);
 s.players[1].mana[0].tapped=true;
 assert.ok(!canBlock());
 s.players[1].mana[0].faceDown=true;
 assert.ok(canBlock());
});

function remove(s,x,id){
 s.active=1;
 const spell=inst(id);
 s.players[1].hand.push(spell);
 act(s,'play',a=>a.uid===spell.uid);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
}

for(const use of [true,false])test('Aqua Agent can '+(use?'replace':'accept')+' destruction after restoring the pending choice',()=>{
 let s=setup();
 const x=put(s,0,AQUA);
 remove(s,x,DESTROY);
 assert.equal(s.decision.type,'leaveReplace');
 assert.equal(s.decision.player,0);
 assert.ok(!s.decision.mandatory);
 assert.deepEqual(e.getLegalActions(s).map(a=>a.kind),['replaceOmega','allowLeave']);
 s=restore(s);
 act(s,use?'replaceOmega':'allowLeave');
 drain(s);
 assert.ok(s.players[0][use?'hand':'grave'].some(y=>y.uid===x.uid));
 assert.ok(!s.players[0][use?'grave':'hand'].some(y=>y.uid===x.uid));
 assert.ok(!s.players[0].battle.some(y=>y.uid===x.uid));
});

test('a mandatory replacement still disallows declining, and ordinary bounce has no choice',()=>{
 const s=setup(),x=put(s,0,AQUA,{g34Grants:[{turn:s.turn,destroyToMana:true}]});
 remove(s,x,DESTROY);
 assert.ok(s.decision.mandatory);
 assert.deepEqual(e.getLegalActions(s).map(a=>a.kind).sort(),['replaceOmega','replaceYamata']);
 act(s,'replaceYamata');
 assert.ok(s.players[0].mana.some(y=>y.uid===x.uid));
 const b=setup(),y=put(b,0,AQUA);
 remove(b,y,BOUNCE);
 assert.ok(!b.decision);
 assert.ok(b.players[0].hand.some(z=>z.uid===y.uid));
});
