import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {encodeBattleData,decodeBattleData} from '../dist/battle-insights.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-633.json',import.meta.url)));
const PEAK='dm14-031',FIRE='dm01-097',SEED='dm22rp1-058',TRIPLE='dm05-s04',POWERED='dm23rp2-046';

function field(mana=7){
 const s=setup();
 give(s,0,'mana',Array(mana).fill(FIRE));
 return s;
}
function put(s,p,id){
 const x=inst(id);
 s.players[p].battle.push(x);
 return x;
}
const breaker=(s,x)=>e.effectiveCard(x,s).breaker??1;
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const shieldUIDs=s=>s.players[1].shields.map(x=>x.uid);

test('Dynamite Peak has one verified definition and a saved deck still resolves its original ID',()=>{
 assert.equal(cards.length,1);
 const [row]=cards,d=details.cards.find(c=>c.id===PEAK),c=e.card(PEAK);
 assert.equal(row.id,PEAK);
 assert.deepEqual(d.faces,row.faces);
 assert.deepEqual(standardCardSpec(d,{phase:633}),row.spec);
 assert.throws(()=>standardCardSpec(d,{phase:632}));
 assert.throws(()=>standardCardSpec({...d,faces:[{...d.faces[0],abilityText:d.faces[0].abilityText+'\nカードを1枚引く。'}]},{phase:633}));
 assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[PEAK]);
 assert.deepEqual([c.type,c.civ,c.cost,c.power,c.race,c.manaValue,c.limit],['creature','火',5,3000,'ビッグマッスル',1,regulationVerification.limits[PEAK]]);
 assert.deepEqual(c.g208Auras,row.spec.g208Auras);
 assert.equal(CARD_IMAGES[PEAK],row.image);
 assert.ok(row.verification.facesMatched);
 const deck=structuredClone(PRESETS[0]);
 deck.cards[0].id=PEAK;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
 assert.deepEqual(catalogue.validate(deck),[]);
 assert.deepEqual(e.validateDeck(deck),[]);
});

test('The aura follows seven physical mana cards and the source tap state without affecting non-creatures',()=>{
 const s=field(6),peak=put(s,0,PEAK),ally=put(s,0,FIRE),seed=put(s,0,SEED),enemy=put(s,1,FIRE);
 peak.tapped=true;
 assert.equal(breaker(s,ally),1);
 const seventh=inst(FIRE);
 seventh.tapped=true;
 seventh.faceDown=true;
 s.players[0].mana.push(seventh);
 const before=JSON.stringify(s);
 assert.equal(e.power(ally,true,s),5000);
 assert.equal(e.power(ally,false,s),2000);
 assert.equal(e.power(peak,true,s),6000);
 assert.equal(breaker(s,ally),2);
 assert.equal(breaker(s,seed),1);
 assert.equal(breaker(s,enemy),1);
 assert.equal(JSON.stringify(s),before);
 peak.tapped=false;
 assert.equal(breaker(s,ally),1);
 peak.tapped=true;
 s.players[0].mana.pop();
 assert.equal(breaker(s,ally),1);
});

test('Two active Peaks stack attack power but still grant a single two-shield break',()=>{
 const s=field(),a=put(s,0,PEAK),b=put(s,0,PEAK),ally=put(s,0,FIRE);
 a.tapped=b.tapped=true;
 assert.equal(e.power(ally,true,s),8000);
 assert.equal(breaker(s,ally),2);
 b.sealed=true;
 assert.equal(e.power(ally,true,s),5000);
 a.g35Ignored=s.turn;
 assert.equal(breaker(s,ally),1);
 delete a.g35Ignored;
 put(s,1,GEN);
 assert.equal(breaker(s,ally),1);
});

test('A paid summon activates its own aura when it taps to attack and breaks two shields',()=>{
 const s=field(),peak=inst(PEAK);
 s.players[0].hand.push(peak);
 const before=physical(s);
 act(s,'play',a=>a.uid===peak.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
 assert.equal(breaker(s,peak),1);
 act(s,'toAttack');act(s,'endTurn');drain(s);
 act(s,'skipCharge');act(s,'toAttack');act(s,'endTurn');drain(s);
 attack(s,peak.uid);
 assert.equal(e.power(peak,true,s),6000);
 act(s,'noBlock');
 assert.equal(s.decision.count,2);
 act(s,'breakShields');
 assert.equal(s.players[1].shields.length,3);
 assert.deepEqual(physical(s),before);
});

for(const count of [2,3])test('A T-breaker can choose the granted W-breaker or its own breaker after resume: '+count,()=>{
 let s=field();
 put(s,0,PEAK).tapped=true;
 const ally=put(s,0,TRIPLE);
 attack(s,ally.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_GrantedBreaker633');
 assert.deepEqual(s.decision.choices.map(q=>q.value),[2,3]);
 s=decodeBattleData(encodeBattleData(s));
 act(s,'extended',a=>s.decision.choices[a.choice].value===count);
 assert.equal(s.decision.count,count);
 const before=shieldUIDs(s);
 const selected=before.slice(-count);
 act(s,'breakShields',a=>a.shields.join()===selected.join());
 assert.deepEqual(shieldUIDs(s),before.slice(0,-count));
 assert.deepEqual(s.players[1].hand.map(x=>x.uid).sort(),[...selected].sort());
});

test('Powered Breaker at one can select a non-first shield after restoring the pending choice',()=>{
 let s=field();
 put(s,0,PEAK).tapped=true;
 const ally=put(s,0,POWERED);
 const before=shieldUIDs(s);
 const selected=before[2];
 attack(s,ally.uid);
 act(s,'noBlock');
 assert.deepEqual(s.decision.choices.map(q=>q.value),[2,1]);
 act(s,'extended',a=>s.decision.choices[a.choice].value===1);
 assert.deepEqual(shieldUIDs(s),before);
 assert.equal(s.decision.type,'breakChoice');
 assert.equal(s.decision.count,1);
 s=decodeBattleData(encodeBattleData(s));
 assert.deepEqual(e.getLegalActions(s).map(a=>a.shields),before.map(uid=>[uid]));
 act(s,'breakShields',a=>a.shields[0]===selected);
 assert.deepEqual(shieldUIDs(s),before.filter(uid=>uid!==selected));
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),[selected]);
});

for(const remaining of [1,2])test('A selected breaker is capped at the '+remaining+' remaining shields',()=>{
 const s=field();
 s.players[1].shields.length=remaining;
 const before=shieldUIDs(s);
 put(s,0,PEAK).tapped=true;
 const ally=put(s,0,TRIPLE);
 attack(s,ally.uid);
 act(s,'noBlock');
 act(s,'extended',a=>s.decision.choices[a.choice].value===3);
 assert.deepEqual(shieldUIDs(s),[]);
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),before);
 assert.equal(s.decision,null);
 assert.equal(s.winner,null);
});

test('Without Peak, ordinary attackers keep their preselected shield and T-breakers still choose three',()=>{
 const s=field();
 const attacker=put(s,0,FIRE);
 const triple=put(s,0,TRIPLE);
 const before=shieldUIDs(s);
 s.phase='attack';
 act(s,'attack',a=>a.uid===attacker.uid&&a.shield===before[1]);
 act(s,'noBlock');
 assert.equal(s.decision,null);
 assert.deepEqual(shieldUIDs(s),before.filter(uid=>uid!==before[1]));
 attack(s,triple.uid);
 act(s,'noBlock');
 assert.equal(s.decision.type,'breakChoice');
 assert.equal(s.decision.count,3);
 const keep=shieldUIDs(s)[0];
 act(s,'breakShields',a=>!a.shields.includes(keep));
 assert.deepEqual(shieldUIDs(s),[keep]);
});
