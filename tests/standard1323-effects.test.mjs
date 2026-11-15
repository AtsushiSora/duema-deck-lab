import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const ZABI='dm25ex4-042',GAGA='dm25ex4-036',ULTIMATE='dm25rp4-S11';
const BASIC='dm01-108',LIGHT='dm01-075',WATER='dm01-083',FIRE='dm01-097',DARK='dm01-090';
const DARK_PSYCHIC='dm25ex4-043',LIGHT_PSYCHIC='dm25ex4-037',MECHA='dm24rp3-055';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(BASIC));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const choices=s=>s.decision?.choices?.map(value)??[];

test('three verified original IDs resolve with the current limits, image and complete ability',()=>{
 const m=read('tools/support-phase-1323.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[ZABI,GAGA,ULTIMATE]);
 assert.equal(m.printAliases.length,4);
 for(const row of m.printAliases){
  assert.equal(row.canonicalId,ULTIMATE);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:ULTIMATE,count:1}]);
  assert.deepEqual(prints.find(x=>x.id===row.id),{id:row.id,canonicalId:ULTIMATE,name:row.name,image:row.image,source:row.source});
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1323}),row.spec);
 }
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1323}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   [f.cost,Number(f.powerText)||0,f.race,f.civilizations,4,1]);
  for(const [key,v] of Object.entries(spec))assert.deepEqual(c[key],v);
  assert.equal(CARD_IMAGES[id],image);
  assert.equal(e.playFaces(c).length,faces.length);
  assert.deepEqual(e.playFaces(c).map(f=>[f.name,f.cost]),faces.map(f=>[f.name,f.cost]));
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

const play=(s,id,face=0)=>{
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
 return x;
};
const tapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
const pickBack=(s,x)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return v?.uid===x.uid&&v.g1104Back;
});
const trigger=(s,x)=>act(s,'useTrigger',a=>a.uid===x.uid&&(a.face??0)===0);
const four='dmr13-089',six='dm01-s06',seven='dm01-s05';
const faceDownMecha={faceDown:true};

test('Zabi can use Mega Last Burst before Slayer destroys the battle winner (QA45585)',()=>{
 const s=field(),zabi=add(s,0,'battle',ZABI),foe=add(s,1,'battle',BASIC,{tapped:true});
 const extra=add(s,0,'extra',DARK_PSYCHIC);
 attack(s,zabi.uid,foe.uid);
 act(s,'noBlock');
 assert.ok(has(s,0,'grave',zabi)&&has(s,1,'battle',foe));
 assert.equal(s.decision.task.op,'g21Mega');
 assert.equal(s.decision.task.origin,'grave');
 const resumed=JSON.parse(JSON.stringify(s));
 pick(resumed,true);
 act(resumed,'extended',a=>{
  const v=resumed.decision.choices[a.choice].value;
  return v?.uid===extra.uid&&!v.g1104Back;
 });
 drain(resumed);
 assert.ok(has(resumed,0,'grave',zabi)&&has(resumed,0,'battle',extra)&&has(resumed,1,'grave',foe));
 assert.equal(tapped(resumed,0),0);
});

test('Black Teleport Hole can be cast directly from hand',()=>{
 const s=field(),extra=add(s,0,'extra',DARK_PSYCHIC),spell=play(s,ZABI,1);
 pickBack(s,extra);
 assert.ok(has(s,0,'grave',spell)&&has(s,0,'battle',extra));
 assert.equal(tapped(s,0),3);
});

for(const fromShield of [false,true])test('Gaga pays Friend Burst with a distinct untapped Mecha '+fromShield,()=>{
 const s=field(),valid=add(s,0,'battle',MECHA),wrong=add(s,0,'battle',BASIC);
 const alreadyTapped=add(s,0,'battle',MECHA,{tapped:true}),hidden=add(s,0,'battle',MECHA,faceDownMecha);
 const extra=add(s,0,'extra',LIGHT_PSYCHIC);
 let gaga;
 if(fromShield){
  s.active=1;
  s.players[0].shields.length=0;
  gaga=add(s,0,'shields',GAGA);
  const foe=add(s,1,'battle',BASIC);
  attack(s,foe.uid);
  act(s,'noBlock');
  trigger(s,gaga);
 }else gaga=play(s,GAGA);
 assert.equal(s.decision.task.op,'g34_FriendBurst1210');
 assert.deepEqual(choices(s),[valid.uid,null]);
 pick(s,valid.uid);
 assert.equal(valid.tapped,true);
 assert.equal(wrong.tapped,false);
 assert.equal(alreadyTapped.tapped,true);
 assert.equal(hidden.tapped,false);
 pickBack(s,extra);
 assert.ok(has(s,0,'battle',gaga)&&has(s,0,'battle',extra));
 assert.equal(tapped(s,0),fromShield?0:2);
});

test('White Teleport Hole can be cast as the spell face, and an eligible Mecha can be declined',()=>{
 const s=field(),extra=add(s,0,'extra',LIGHT_PSYCHIC),spell=play(s,GAGA,1);
 pickBack(s,extra);
 assert.ok(has(s,0,'grave',spell)&&has(s,0,'battle',extra));
 assert.equal(tapped(s,0),3);
 const other=field(),ally=add(other,0,'battle',MECHA),host=play(other,GAGA);
 pick(other,null);
 assert.ok(!ally.tapped&&has(other,0,'battle',host)&&!other.decision);
});

for(const mana of [false,true])test('Ultimate can be cast from hand or mana and resolves each cap separately '+mana,()=>{
 const s=field();
 const low=add(s,0,'grave',four),mid=add(s,0,'mana',six,{tapped:true});
 const costly=add(s,0,'grave',seven),nonDemon=add(s,0,'grave',DARK);
 const hidden=add(s,0,'mana',four,{faceDown:true});
 const spell=add(s,0,mana?'mana':'hand',ULTIMATE,{tapped:mana});
 act(s,'play',a=>a.uid===spell.uid&&(a.origin==='mana')===mana);
 assert.deepEqual(choices(s),[low.uid,null]);
 pick(s,low.uid);
 assert.deepEqual(choices(s),[mid.uid,null]);
 pick(s,mid.uid);
 drain(s);
 assert.ok(has(s,0,'battle',low)&&has(s,0,'battle',mid)&&has(s,0,'grave',spell));
 assert.ok(has(s,0,'grave',costly)&&has(s,0,'grave',nonDemon)&&has(s,0,'mana',hidden));
 assert.equal(tapped(s,0),5);
 assert.equal(s.players[0].battle.find(x=>x.uid===mid.uid).tapped,false);
});

test('Ultimate may skip the first selection and still put a low-cost Demon into battle on the second',()=>{
 const s=field(),low=add(s,0,'mana',four),mid=add(s,0,'grave',six);
 play(s,ULTIMATE);
 pick(s,null);
 assert.deepEqual(new Set(choices(s)),new Set([low.uid,mid.uid,null]));
 pick(s,low.uid);
 assert.ok(has(s,0,'battle',low)&&has(s,0,'grave',mid));
});

test('Ultimate’s mana casting requires a face-up source, sufficient colors and permission to leave mana',()=>{
 const s=field();
 give(s,0,'mana',[DARK,DARK,DARK,DARK,DARK]);
 const x=add(s,0,'mana',ULTIMATE,{tapped:true});
 const castable=()=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid);
 assert.equal(castable(),false);
 add(s,0,'mana',FIRE);
 add(s,0,'mana',BASIC);
 assert.equal(castable(),true);
 x.faceDown=true;
 assert.equal(castable(),false);
 x.faceDown=false;
 add(s,1,'battle','dmrp22-042');
 assert.equal(castable(),false);
});

test('Ultimate can declare G Strike from a broken shield',()=>{
 const s=field();
 give(s,0,'shields',[ULTIMATE]);
 s.active=1;
 const attacker=add(s,1,'battle',BASIC),target=add(s,1,'battle',BASIC);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 pick(s,target.uid);
 assert.ok(e.attackLocked(s,1,target)&&!target.tapped);
 assert.equal(s.players[0].hand[0].cardId,ULTIMATE);
});
