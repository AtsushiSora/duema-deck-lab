import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD587_DECK} from '../tools/fixtures/standard587.mjs';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-587.json',import.meta.url)));
const CLIMAX='promoy11-055', GLORY='dmrp13-001', KUKAI='dmrp18-001', KING='dmsd05-001';
const TACTICS='dmr09-050', FIVE='dm39-023', RURURU='dmr20-027', CLUB='dmrp08-094', GUN='dm30-033';
const LIGHT_DUEL='dmr17-002', FULL='dmr13-s04', BAJULA='dm38-012', LIGER='dmex08-015', MAGMA='dmrp09-051';
const FIRE='dm01-097', WATER='dm01-083', LIGHT='dm01-075', BIG='dm01-001', DRAGON='dmx17-008';
const CLASH='dmrp19-085';

function field(){
  const s=setup();
  s.active=0;
  for(const p of [0,1])give(s,p,'deck',Array(26).fill(FIRE));
  return s;
}
function put(s,p,id,zone='battle'){
  const x=inst(id);
  s.players[p][zone].push(x);
  return x;
}
function play(s,id,base=null){
  const x=put(s,s.active,id,'hand');
  act(s,'play',a=>a.uid===x.uid&&!a.alternative);
  if(base)act(s,'evolve',a=>a.baseUid===base.uid);
  return x;
}
const choices=s=>s.decision?.choices??[];
const value=o=>o.value?.uid??o.value;
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const grantsWin=(s,x)=>!!e.effectiveCard(x,s).g34AlwaysWin;
function pick(s,uid){act(s,'extended',a=>value(choices(s)[a.choice])===uid);}
function fight(s,a,b){
  s.phase='main';
  play(s,CLASH);
  pick(s,a.uid);
  pick(s,b.uid);
}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function passBlock(s){if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const row of cards)test(row.name+' matches its official verified printing and battle definition',()=>{
  const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:587}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:586}));
  for(const [key,val] of Object.entries(row.spec))assert.deepEqual(c[key],val);
  assert.equal(c.limit,regulationVerification.limits[row.id]);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
});

test('Tactics affects allies already in the battle zone and expires at the end of the turn',()=>{
  const s=field(),early=put(s,0,FIRE),enemy=put(s,1,BIG);
  play(s,TACTICS);
  const late=play(s,WATER);
  assert.ok(grantsWin(s,early));
  assert.ok(!grantsWin(s,late)&&!grantsWin(s,enemy));
  fight(s,early,enemy);
  assert.ok(has(s,1,'grave',enemy));
  end(s);
  assert.ok(!grantsWin(s,early));
});

test('Tactics can be triggered from a shield on the opponent’s turn',()=>{
  const s=field(),attacker=put(s,0,FIRE),defender=put(s,1,WATER);
  const shield=put(s,1,TACTICS,'shields');
  s.players[1].shields=[shield];
  attack(s,attacker.uid);
  passBlock(s);
  if(e.getLegalActions(s).some(a=>a.kind==='breakShield'))act(s,'breakShield');
  act(s,'useTrigger',a=>a.uid===shield.uid);
  assert.ok(grantsWin(s,defender)&&!grantsWin(s,attacker));
  fight(s,attacker,defender);
  assert.ok(has(s,0,'grave',attacker));
  end(s);
  assert.ok(!grantsWin(s,defender));
});

test('Five Star tests current power once, including temporary modifiers',()=>{
  const s=field(),eligible=put(s,0,FIRE),other=put(s,0,WATER),enemy=put(s,1,BIG);
  eligible.powerModifiers=[{amount:500,expires:'end',who:0}];
  assert.equal(e.power(eligible,false,s),2500);
  play(s,FIVE);
  eligible.powerModifiers=[];
  other.powerModifiers=[{amount:500,expires:'end',who:0}];
  assert.ok(grantsWin(s,eligible)&&!grantsWin(s,other));
  fight(s,eligible,enemy);
  assert.ok(has(s,1,'grave',enemy));
});

test('Rururu counts itself and shield groups at resolution',()=>{
  for(const n of [2,3]){
    const s=field(),ally=put(s,0,FIRE);
    s.players[0].shields.splice(n);
    const x=play(s,RURURU);
    assert.equal(grantsWin(s,x),n===2);
    assert.equal(grantsWin(s,ally),n===2);
  }
});

test('Light Duel grants wins to low-cost light allies as long as it remains',()=>{
  const s=field(),source=put(s,0,LIGHT_DUEL),ally=put(s,0,LIGHT),fire=put(s,0,FIRE),enemy=put(s,1,BIG);
  fight(s,ally,enemy);
  assert.ok(has(s,1,'grave',enemy));
  const second=put(s,1,BIG);
  fight(s,fire,second);
  assert.ok(has(s,0,'grave',fire));
  s.players[0].battle.splice(s.players[0].battle.indexOf(source),1);
  fight(s,ally,second);
  assert.ok(has(s,0,'grave',ally));
});

test('FENIXXX grants itself victory after another ally arrives and expires at the end of the turn',()=>{
  const s=field(),enemy=put(s,1,BIG),x=play(s,GLORY);
  assert.ok(!grantsWin(s,x));
  play(s,WATER);
  assert.ok(grantsWin(s,x));
  fight(s,x,enemy);
  assert.ok(has(s,1,'grave',enemy));
  end(s);
  assert.ok(!grantsWin(s,x));
});

test('The first allied win boosts Club once and unlocks Gunbullet, including after reload',()=>{
  let s=field(),club=put(s,0,CLUB),gun=put(s,0,GUN),ally=put(s,0,BIG);
  const canAttack=()=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===gun.uid);
  const base=e.power(club,false,s);
  s.phase='attack';
  assert.ok(!canAttack());
  fight(s,ally,put(s,1,FIRE));
  assert.equal(e.power(club,false,s),base+3000);
  s=JSON.parse(JSON.stringify(s));
  const currentClub=s.players[0].battle.find(x=>x.uid===club.uid);
  fight(s,s.players[0].battle.find(x=>x.uid===ally.uid),put(s,1,FIRE));
  assert.equal(e.power(currentClub,false,s),base+3000);
  s.phase='attack';
  assert.ok(canAttack());
  assert.equal(e.observation(s,1).g587BattleWins.players[0],true);
  end(s);end(s);
  s.phase='attack';
  assert.ok(!canAttack());
  assert.equal(e.power(currentClub,false,s),base);
});

test('Both forced winners survive and count as winners for their own side',()=>{
  const s=field(),a=put(s,0,LIGHT),b=put(s,1,LIGHT);
  put(s,0,LIGHT_DUEL);
  put(s,1,LIGHT_DUEL);
  fight(s,a,b);
  assert.ok(has(s,0,'battle',a)&&has(s,1,'battle',b));
  assert.deepEqual(s.g587BattleWins.players,[true,true]);
});

test('Liger wins while attacking and taps the opposing team when targeted by an attack',()=>{
  const s=field(),x=put(s,0,LIGER),enemy=put(s,1,BIG);
  enemy.tapped=true;
  attack(s,x.uid,enemy.uid);
  passBlock(s);
  assert.ok(has(s,1,'grave',enemy));
  const bigger=put(s,1,BIG),other=put(s,1,FIRE);
  s.active=1;
  attack(s,bigger.uid,x.uid);
  passBlock(s);
  assert.ok(other.tapped&&has(s,0,'grave',x));
});

for(const id of [KUKAI,MAGMA])for(const pay of [true,false])test(id+' untaps only after paying with a different untapped ally ('+pay+')',()=>{
  const s=field(),source=id===KUKAI?play(s,id,put(s,0,LIGHT)):play(s,id),ally=put(s,0,FIRE),used=put(s,0,FIRE);
  used.tapped=true;
  const enemy=put(s,1,id===KUKAI?BIG:WATER);
  enemy.tapped=true;
  attack(s,source.uid,enemy.uid);
  assert.deepEqual(choices(s).map(value).filter(Boolean),[ally.uid]);
  if(pay)pick(s,ally.uid);
  else act(s,'extended',a=>!value(choices(s)[a.choice]));
  passBlock(s);
  assert.equal(ally.tapped,pay);
  assert.equal(has(s,1,'grave',enemy),id===MAGMA||pay);
  if(has(s,0,'battle',source))assert.equal(source.tapped,!pay);
});

test('Climax can attack upon being summoned and may untap after winning',()=>{
  const s=field(),x=play(s,CLIMAX),enemy=put(s,1,BIG);
  enemy.tapped=true;
  assert.ok(grantsWin(s,x));
  attack(s,x.uid,enemy.uid);
  passBlock(s);
  assert.ok(x.tapped&&has(s,1,'grave',enemy));
  drain(s);
  assert.equal(x.tapped,false);
});

for(const [id,n] of [[KING,9],[FULL,2]])test(id+' breaks up to '+n+' shields after a battle victory',()=>{
  const s=field(),enemy=put(s,1,FIRE),source=play(s,id,id===FULL?put(s,0,DRAGON):null);
  enemy.tapped=id===FULL;
  give(s,1,'shields',Array(10).fill(FIRE));
  attack(s,source.uid,enemy.uid);
  passBlock(s);
  for(let i=0;i<n;i++)pick(s,value(choices(s)[0]));
  drain(s);
  assert.equal(s.players[1].shields.length,10-n);
  assert.equal(source.tapped,id===KING);
});

test('Bajula Second evolves on a Dragon and handles both attack effects in order',()=>{
  const s=field(),enemy=put(s,1,FIRE),mana=s.players[1].mana[0],x=play(s,BAJULA,put(s,0,DRAGON));
  attack(s,x.uid);
  pick(s,mana.uid);
  pick(s,enemy.uid);
  passBlock(s);
  drain(s);
  assert.ok(has(s,1,'grave',mana)&&has(s,1,'grave',enemy));
});

test('legal forty CPU match completes after JSON continuation with every physical card',()=>{
  assert.deepEqual(e.validateDeck(STANDARD587_DECK),[]);
  let s=e.createGame([STANDARD587_DECK,PRESETS[0]],{seed:58701,first:0}),saved=false;
  const before=physical(s);
  while(s.winner===null&&s.actions<3000&&s.turn<160){
    e.step(s,e.chooseAI(s));
    assert.deepEqual(physical(s),before);
    if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}
  }
  assert.ok(saved);
  assert.notEqual(s.winner,null);
  assert.equal(new Set(physical(s)).size,80);
});
