import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,e,give,inst,PRESETS} from './target-fixture.mjs';

const MUSHA='dmc65-005', WHITE_RED='dmr03-050', BLUE_RED='dmr03-052';
const BLUE_GREEN='dmr03-053', BLACK_GREEN='dmr03-054';
const LIGHT='dm01-076', WATER='dm01-083', DARK='dm01-087', FIRE='dm01-097', NATURE='dm01-108';
const JOHN='dm37-033', MARTINI='dm37-024', CHEVAL='dm38-033', OFLAME='dm36-059';
const ONIKAMASU='dmrp01-041', TWIN='dm22ex1-030', MULTICOLOR='dmd34-007', SPELL='dm01-086';
const find=(rows,id)=>rows.find(x=>x.cardId===id);
const options=s=>s.decision?.choices?.map(c=>c.value)??[];
const pick=(s,x,back=false)=>act(s,'extended',a=>{
 const value=options(s)[a.choice];
 return value?.uid===x.uid&&!!value.g1104Back===back;
});
const choices=s=>options(s).map(value=>[value.uid,!!value.g1104Back]);

function table(){
 const extraCards=[JOHN,MARTINI,CHEVAL,OFLAME].map(id=>({id,count:1}));
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards}));
 const s=e.createGame(decks,{seed:1108});
 s.phase='main';
 s.turn=3;
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',[LIGHT,WATER,DARK,FIRE,NATURE].flatMap(id=>Array(4).fill(id)));
  give(s,p,'shields',Array(5).fill(NATURE));
 }
 return s;
}

test('Musha destroys a cost-4 enemy and can put John into play on the fire face',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],john=find(own.extra,JOHN),oflame=find(own.extra,OFLAME);
 const [cocco,nex,boundary,protectedCreature]=['dm06-062','dm32-s08',DARK,ONIKAMASU].map(inst);
 opp.battle.push(cocco,nex,boundary,protectedCreature);
 own.battle.push(inst(NATURE));
 cast(s,MUSHA);
 assert.deepEqual(choices(s),[[cocco.uid,false],[boundary.uid,false]]);
 pick(s,boundary);
 assert.ok(opp.grave.includes(boundary));
 assert.ok(opp.battle.includes(nex));
 assert.deepEqual(choices(s),[[john.uid,true],[oflame.uid,false]]);
 pick(s,john,true);
 assert.equal(e.card(john).civ,'火');
});

test('Musha can deploy its Psychic without an eligible opposing creature',()=>{
 const s=table(),oflame=find(s.players[0].extra,OFLAME);
 s.players[1].battle.push(inst('dm32-s08'));
 cast(s,MUSHA);
 pick(s,oflame);
 assert.ok(s.players[0].battle.includes(oflame));
});

test('White Red taps all enemies at or below current power 2000, including protected targets',()=>{
 const s=table(),own=s.players[0],opp=s.players[1];
 const [protectedCreature,reduced,above,boosted,sealed]=[ONIKAMASU,DARK,DARK,NATURE,WATER].map(inst);
 reduced.powerModifiers=[{amount:-1000}];
 boosted.powerModifiers=[{amount:1000}];
 sealed.sealed=true;
 opp.seals.push({...inst(NATURE),sealOf:sealed.uid,faceDown:true});
 opp.battle.push(protectedCreature,reduced,above,boosted,sealed);
 const ally=inst(NATURE);
 own.battle.push(ally);
 cast(s,WHITE_RED);
 assert.deepEqual(opp.battle.map(x=>x.tapped),[true,true,false,false,false]);
 assert.equal(ally.tapped,false);
 const cheval=find(own.extra,CHEVAL);
 pick(s,cheval);
 assert.ok(own.battle.includes(cheval));
});

test('White Red determines all recipients before any tap changes their power',()=>{
 const s=table(),opp=s.players[1],first=inst(WATER),second=inst(NATURE);
 const conditional={...e.card(NATURE),g260Self:{filter:{creature:true,tapped:true},grants:{power:1000}}};
 e.setCards(data.cards.map(c=>c.id===NATURE?conditional:c));
 try{
  opp.battle.push(first,second);
  assert.equal(e.power(second,false,s),2000);
  cast(s,WHITE_RED);
  assert.equal(first.tapped,true);
  assert.equal(second.tapped,true);
  assert.equal(e.power(second,false,s),3000);
 }finally{
  e.setCards(data.cards);
 }
});

test('Blue Red affects creatures already present, stacks Power Attacker, and expires (QA 36477 and 37323)',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],john=find(own.extra,JOHN);
 const attacker=inst('dm01-098');
 own.battle.push(attacker);
 opp.battle.push(inst(LIGHT));
 const base=e.power(attacker,false,s),attackPower=e.power(attacker,true,s);
 cast(s,BLUE_RED);
 pick(s,john);
 assert.equal(e.power(attacker,false,s),base);
 assert.equal(e.power(attacker,true,s),attackPower+2000);
 assert.ok(e.effectiveCard(attacker,s).unblockable);
 assert.ok(!e.effectiveCard(john,s).unblockable);
 assert.equal(e.power(john,true,s),e.power(john,false,s));
 attack(s,attacker.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.equal(opp.shields.length,4);
 act(s,'endTurn');
 assert.equal(e.power(attacker,true,s),attackPower);
 assert.ok(!e.effectiveCard(attacker,s).unblockable);
});

test('Blue Red distinguishes the granted Power Attacker from its blocking restriction',()=>{
 const s=table(),own=s.players[0],attacker=inst(NATURE),john=find(own.extra,JOHN);
 own.battle.push(attacker);
 cast(s,BLUE_RED);
 pick(s,john,true);
 assert.equal(e.card(john).civ,'火');
 attacker.g35Ignored=s.turn;
 assert.ok(e.effectiveCard(attacker,s).unblockable);
 assert.equal(e.power(attacker,true,s),e.power(attacker,false,s));
});

test('Blue Green counts the remaining hand, chooses before deployment, and expires (QA 36478/36479)',()=>{
 const s=table(),own=s.players[0],john=find(own.extra,JOHN),ally=inst(NATURE),other=inst(WATER);
 own.battle.push(ally,other);
 s.players[1].battle.push(inst(FIRE));
 give(s,0,'hand',[LIGHT,FIRE]);
 const base=e.power(ally,false,s);
 cast(s,BLUE_GREEN);
 assert.deepEqual(choices(s),[[ally.uid,false],[other.uid,false]]);
 pick(s,ally);
 assert.equal(e.power(ally,false,s),base+2000);
 pick(s,john);
 assert.equal(e.power(john,false,s),2000);
 own.hand.push(inst(DARK));
 assert.equal(e.power(ally,false,s),base+2000);
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(e.power(ally,false,s),base);
});

test('Blue Green still deploys with no current creature and cannot choose an over-cost face',()=>{
 const s=table(),own=s.players[0],martini=find(own.extra,MARTINI);
 cast(s,BLUE_GREEN);
 assert.ok(!choices(s).some(([uid,back])=>uid===martini.uid&&back));
 pick(s,martini);
 assert.ok(own.battle.includes(martini));
});

test('Black Green moves one creature card including Twinpacts, preserves multicolor tap, then deploys',()=>{
 for(const id of [TWIN,MULTICOLOR]){
  const s=table(),own=s.players[0],john=find(own.extra,JOHN);
  give(s,0,'grave',[TWIN,MULTICOLOR,SPELL]);
  give(s,1,'grave',[DARK]);
  const [twin,multicolor,spell]=own.grave,selected=find(own.grave,id);
  cast(s,BLACK_GREEN);
  assert.deepEqual(choices(s),[[twin.uid,false],[multicolor.uid,false]]);
  pick(s,selected);
  assert.ok(own.mana.includes(selected));
  assert.equal(selected.tapped,id===MULTICOLOR);
  assert.ok(own.grave.includes(spell));
  pick(s,john);
  assert.ok(own.battle.includes(john));
 }
});

test('Black Green can use only its deployment when there is no graveyard creature',()=>{
 const s=table(),own=s.players[0],john=find(own.extra,JOHN);
 give(s,0,'grave',[SPELL]);
 cast(s,BLACK_GREEN);
 pick(s,john);
 assert.ok(own.battle.includes(john));
 assert.equal(own.grave[0].cardId,SPELL);
});

test('All five official print definitions match the compiler and the live cards',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1108.json',import.meta.url),'utf8'));
 for(const row of manifest.cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(standardCardSpec(detail,{phase:1108}),row.spec);
  assert.equal(e.card(row.id).limit,4);
  assert.deepEqual(e.card(row.id).g34Tasks,row.spec.g34Tasks);
  const s=table();
  give(s,0,'hand',[row.id]);
  s.phase='charge';
  act(s,'charge',a=>a.cardId===row.id);
  assert.equal(s.players[0].mana.at(-1).tapped,row.id!==MUSHA);
 }
});
