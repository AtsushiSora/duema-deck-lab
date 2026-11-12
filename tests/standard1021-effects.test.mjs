import test from 'node:test';
import assert from 'node:assert/strict';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const BARAGHIARA='dmrp08-mh05', DARK='dmrp08-mh03', NATURE='dm01-108';
const spellName='天上天下輪廻独尊';

function castSpell(s,p=0){
 const x=inst(BARAGHIARA);
 s.players[p].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&a.face===1);
 drain(s);
 return x;
}

function finishTurn(s){
 act(s,'endTurn');
 drain(s);
 act(s,'skipCharge');
 act(s,'toAttack');
}

function targets(s,x){
 return [...new Set(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target))];
}

test('Baraghiara resolves through the catalogue by its existing ID and uses official art',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const card=e.card(BARAGHIARA);
 assert.equal(registry.byName.get(nameKey(card.name))?.id,BARAGHIARA);
 assert.equal(card.limit,4);
 assert.deepEqual(e.playFaces(card).map(c=>[c.type,c.cost,c.civ]),[['creature',9,'自然'],['spell',8,'自然']]);
 assert.equal(card.power,17000);
 assert.equal(card.breaker,3);
 assert.equal(e.playFaces(card)[1].name,spellName);
 assert.match(CARD_IMAGES[BARAGHIARA],/\/dmrp08-mh05a\.jpg$/);
});

test('Baraghiara untaps all own mana on summon and stays silent when put into battle',()=>{
 const s=setup();
 const [previouslyTapped]=s.players[0].mana;
 previouslyTapped.tapped=true;
 s.players[1].mana[0].tapped=true;
 give(s,0,'hand',[BARAGHIARA]);
 act(s,'play',a=>a.cardId===BARAGHIARA&&a.face===0&&a.cost===9);
 drain(s);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 assert.equal(s.players[1].mana[0].tapped,true);
 const cheated=setup();
 give(cheated,0,'deck',[BARAGHIARA,NATURE,NATURE]);
 const cube=data.cards.find(c=>c.effect==='kenjiMysteryCube');
 give(cheated,0,'hand',[cube.id]);
 act(cheated,'play',a=>a.cardId===cube.id);
 drain(cheated);
 assert.equal(cheated.players[0].battle[0].cardId,BARAGHIARA);
 assert.ok(cheated.players[0].mana.some(x=>x.tapped));
});

test('Rinne pays eight mana and ramps for each own Baraghiara without moving the spell source',()=>{
 let s=setup();
 give(s,0,'battle',[BARAGHIARA,DARK,NATURE]);
 give(s,1,'battle',[BARAGHIARA]);
 give(s,0,'mana',Array(8).fill(NATURE));
 give(s,0,'deck',Array(4).fill(NATURE));
 const source=s.players[0].battle[0];
 const top=s.players[0].deck.slice(0,2).map(x=>x.uid);
 const before=e.physicalCards(s).map(x=>x.uid).sort();
 act(s,'play',a=>a.uid===source.uid&&a.alternative==='rinne'&&a.cost===8);
 s=decodeBattleData(encodeBattleData(s));
 drain(s);
 assert.equal(s.players[0].battle[0].uid,source.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,8);
 assert.deepEqual(s.players[0].mana.slice(-2).map(x=>x.uid),top);
 assert.equal(s.players[0].grave.length,0);
 assert.equal(e.power(s.players[0].battle[0],false,s),25000);
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),before);
});

test('Rinne needs sufficient mana and spell permission for this face',()=>{
 const s=setup();
 give(s,0,'battle',[BARAGHIARA]);
 give(s,0,'mana',Array(7).fill(NATURE));
 assert.ok(!e.getLegalActions(s).some(a=>a.alternative==='rinne'));
 s.players[0].mana.push(inst(NATURE));
 assert.ok(e.getLegalActions(s).some(a=>a.alternative==='rinne'));
 s.players[0].battle[0].g35Ignored=s.turn;
 assert.ok(!e.getLegalActions(s).some(a=>a.alternative==='rinne'));
});

test('The hand spell boosts the current team and leaves later arrivals and opponents unchanged',()=>{
 const s=setup();
 give(s,0,'battle',[BARAGHIARA,NATURE]);
 give(s,1,'battle',[NATURE]);
 const [big,ally]=s.players[0].battle;
 const enemy=s.players[1].battle[0];
 const original=e.power(ally,false,s);
 const mana=s.players[0].mana.length;
 const used=castSpell(s);
 assert.equal(s.players[0].grave[0].uid,used.uid);
 assert.equal(s.players[0].mana.length,mana);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,8);
 assert.equal(e.power(big,false,s),25000);
 assert.equal(e.power(ally,false,s),original+8000);
 assert.equal(e.power(enemy,false,s),original);
 assert.deepEqual(e.effectiveCard(ally,s).g633BreakerChoices,['world']);
 const late=inst(NATURE);
 s.players[0].battle.push(late);
 assert.equal(e.power(late,false,s),original);
 assert.equal(e.effectiveCard(late,s).g633BreakerChoices,undefined);
 act(s,'toAttack');
 finishTurn(s);
 assert.equal(e.power(big,false,s),17000);
 assert.equal(e.effectiveCard(big,s).breaker,3);
 assert.equal(e.effectiveCard(ally,s).g633BreakerChoices,undefined);
});

for(const breaker of [3,'world'])test('Baraghiara retains its printed breaker alongside the granted World Breaker: '+breaker,()=>{
 let s=setup();
 give(s,0,'battle',[BARAGHIARA]);
 give(s,1,'shields',Array(5).fill(NATURE));
 castSpell(s);
 attack(s);
 act(s,'noBlock');
 assert.deepEqual(s.decision.choices.map(c=>c.value),[3,'world']);
 s=decodeBattleData(encodeBattleData(s));
 act(s,'extended',a=>s.decision.choices[a.choice].value===breaker);
 if(breaker===3){
  assert.equal(s.decision.count,3);
  act(s,'breakShields');
 }
 drain(s);
 assert.equal(s.players[1].shields.length,breaker===3?2:0);
 assert.equal(s.players[0].shields.length,5);
});

test('World Breaker is the sole breaker for a creature without a printed breaker',()=>{
 const s=setup();
 give(s,0,'battle',[NATURE]);
 castSpell(s);
 attack(s);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.players[0].shields.length,5);
});

test('The next opposing turn restricts legal targets without requiring an attack',()=>{
 let s=setup();
 give(s,0,'battle',[NATURE]);
 give(s,1,'battle',[NATURE]);
 const target=s.players[0].battle[0];
 target.tapped=true;
 castSpell(s);
 s.extraTurns=[{player:0}];
 act(s,'toAttack');
 finishTurn(s);
 assert.equal(s.active,0);
 s.players[0].battle[0].tapped=true;
 finishTurn(s);
 assert.equal(s.active,1);
 s=decodeBattleData(encodeBattleData(s));
 const enemy=s.players[1].battle[0];
 assert.deepEqual(targets(s,enemy),[target.uid]);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 s.players[0].battle[0].tapped=false;
 assert.deepEqual(targets(s,enemy),['player']);
 s.players[0].battle[0].tapped=true;
 finishTurn(s);
 const ally=s.players[0].battle[0];
 ally.tapped=true;
 finishTurn(s);
 assert.ok(targets(s,enemy).includes('player'));
});

for(const breaker of ['g','world'])test('G Breaker and the granted World Breaker remain separate: '+breaker,()=>{
 const s=setup();
 give(s,0,'battle',['promoy17-057']);
 castSpell(s);
 attack(s);
 act(s,'noBlock');
 assert.deepEqual(s.decision.choices.map(c=>c.value),['g','world']);
 act(s,'extended',a=>s.decision.choices[a.choice].value===breaker);
 drain(s);
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.players[0].shields.length,breaker==='g'?0:5);
});

test('A creature with infinity breaker can still choose the number of shields to break',()=>{
 const s=setup();
 give(s,0,'battle',['dmrp15-km1']);
 castSpell(s);
 attack(s);
 act(s,'noBlock');
 assert.deepEqual(s.decision.choices.map(c=>c.value),['∞','world']);
 act(s,'extended',a=>s.decision.choices[a.choice].value==='∞');
 assert.equal(s.decision.type,'infinityCount');
});

for(const breaker of ['null','normal'])test('Null Breaker remains optional when World Breaker is granted: '+breaker,()=>{
 const s=setup();
 give(s,0,'battle',['promoy24-065']);
 castSpell(s);
 attack(s);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_NullBreaker471');
 act(s,'extended',a=>s.decision.choices[a.choice].value===breaker);
 drain(s);
 assert.equal(s.players[1].shields.length,breaker==='null'?5:0);
});
