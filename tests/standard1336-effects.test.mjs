import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const ARKING='dm22ex2-S15',RABBIT='dm22ex1-057',HYAKUME='dmrp19-028';
const WATER='dm01-083',NATURE='dm01-108',DARK='dm01-090',KILL='dm01-027';
const add=(s,p,zone,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const ids=rows=>rows.map(x=>x.uid);
const choices=s=>s.decision?.choices?.map(x=>x.value)??[];
const pick=(s,uid)=>act(s,'extended',a=>(choices(s)[a.choice]?.uid??choices(s)[a.choice])===uid);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));
 return s;
}
function makeArking(s,board){
 const p=s.active;
 const arking=add(s,p,'hand',ARKING),mana=add(s,p,'mana',WATER),grave=add(s,p,'grave',DARK);
 play(s,arking);
 pick(s,mana.uid);pick(s,board.uid);pick(s,grave.uid);
 assert.ok(has(s,p,'battle',arking));
 return {arking,mana,grave,board};
}
function enemyDestroy(s,x){
 s.active=1;s.phase='main';
 cast(s,KILL);act(s,'effect',a=>a.targets[0].uid===x.uid);
}

test('Arking’s four official prints share a canonical ID, full rules and the printed zero mana value',()=>{
 const m=read('tools/support-phase-1336.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.equal(m.cards[0].id,ARKING);
 assert.deepEqual(new Set(m.printAliases.map(x=>x.id)),new Set(['dm22ex2-8A','dm22ex2-8B','dm26ex2-MC009']));
 for(const row of [...m.cards,...m.printAliases]){
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:ARKING,count:1}]);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[ARKING]);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===ARKING&&x.image===row.image));
  assert.equal(m.regulationVerification.limits[row.id],4);
 }
 const c=e.card(ARKING);
 assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations.length,c.breaker,c.limit],[9,25000,0,5,'∞',4]);
 assert.equal(CARD_IMAGES[ARKING],m.cards[0].image);
});

test('Evolution GV Omega selects one creature per zone and keeps the battle base tapped through JSON',()=>{
 let s=field();
 const board=add(s,0,'battle',NATURE,{tapped:true}),extra=add(s,0,'battle',WATER);
 const mana=add(s,0,'mana',WATER),hidden=add(s,0,'mana',DARK,{faceDown:true});
 const arking=add(s,0,'hand',ARKING);
 add(s,0,'grave',KILL);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===arking.uid&&a.kind==='play'));
 const grave=add(s,0,'grave',DARK),[shield1,shield2]=s.players[0].deck;
 play(s,arking);
 assert.ok(!choices(s).includes(hidden.uid));
 pick(s,board.uid);
 assert.ok(!choices(s).includes(extra.uid));
 pick(s,grave.uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,mana.uid);
 const actual=s.players[0].battle.find(x=>x.uid===arking.uid);
 assert.equal(actual.tapped,true);
 assert.deepEqual(ids(actual.under),ids([board,grave,mana]));
 assert.deepEqual(ids(e.exLifeShields(s,0,actual)),ids([shield1,shield2]));
});

test('Arking revives a base after the separate Rabbit’s EX Life shield leaves (QA42662)',()=>{
 const s=field();
 const rabbit=add(s,0,'hand',RABBIT),rabbitShield=s.players[0].deck[0];
 play(s,rabbit);
 const {arking,grave}=makeArking(s,add(s,0,'battle',NATURE));
 enemyDestroy(s,rabbit);
 assert.equal(s.decision?.task?.op,'g31_ArkingLife');
 assert.ok(has(s,0,'grave',rabbitShield));
 assert.ok(has(s,0,'battle',rabbit));
 pick(s,grave.uid);
 assert.ok(has(s,0,'battle',grave));
 assert.ok(!arking.under.some(x=>x.uid===grave.uid));
});

test('Arking uses the Rabbit shield inherited from its evolution base (QA42663 and QA43338)',()=>{
 let s=field();
 const rabbit=add(s,0,'hand',RABBIT),[inherited,extra1,extra2]=s.players[0].deck;
 play(s,rabbit);
 const {arking,mana}=makeArking(s,rabbit);
 assert.deepEqual(ids(e.exLifeShields(s,0,arking)),ids([inherited,extra1,extra2]));
 enemyDestroy(s,arking);
 assert.deepEqual(e.getLegalActions(s).filter(x=>x.kind==='replaceEx').map(a=>a.shield),ids([inherited,extra1,extra2]));
 s=JSON.parse(JSON.stringify(s));
 act(s,'replaceEx',a=>a.shield===inherited.uid);
 assert.equal(s.decision?.task?.op,'g31_ArkingLife');
 pick(s,mana.uid);
 assert.ok(has(s,0,'grave',inherited));
 assert.ok(has(s,0,'battle',arking));
 assert.ok(has(s,0,'battle',mana));
 assert.ok(has(s,0,'shields',extra1)&&has(s,0,'shields',extra2));
});

test('Arking grants G Strike to Dispector shields and breaks all opposing shields',()=>{
 const s=field(),{arking}=makeArking(s,add(s,0,'battle',NATURE));
 s.active=1;s.phase='attack';
 give(s,0,'shields',[ARKING,NATURE]);
 const [dispector,other]=s.players[0].shields;
 const attacker=add(s,1,'battle',NATURE);
 attack(s,attacker.uid);act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(dispector.uid));
 assert.equal(s.decision?.task?.op,'gsDeclare',JSON.stringify(s.decision));
 assert.equal(s.decision.task.uid,dispector.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===other.uid));
 drain(s);
 s.active=0;s.turn++;s.phase='attack';
 attack(s,arking.uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,0);
});

test('Sasageiru needs a grave base to declare and cannot put out Arking if the chosen base pays (QA42636 and QA43585)',()=>{
 const s=field(),donor=add(s,0,'battle',HYAKUME),other=add(s,0,'battle',NATURE);
 const mana=add(s,0,'mana',WATER),arking=add(s,0,'hand',ARKING);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===arking.uid&&a.alternative==='sasage'));
 const grave=add(s,0,'grave',DARK);
 act(s,'play',a=>a.uid===arking.uid&&a.alternative==='sasage');
 pick(s,donor.uid);pick(s,mana.uid);pick(s,grave.uid);
 drain(s);
 assert.ok(has(s,0,'hand',arking));
 assert.ok(has(s,0,'grave',grave));
 assert.ok(has(s,0,'mana',mana));
 assert.ok(has(s,0,'battle',other));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
});
