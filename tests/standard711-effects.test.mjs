import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-711.json',import.meta.url)));

test('Phase 711 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:711}));
  assert.throws(()=>standardCardSpec(detail,{phase:710}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:711}));
 }
});

const GARIA='dm07-004',RONDO='dm07-021',WAVE='dm29-044';
const FIRE='dm01-097',NATURE='dm01-108',MULTI='dmr02-054',LIGHT='dm01-075';
const EVO='dm02-s01',EX='dmrp18-km3',DIVER='dm23rp1-058';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const field=()=>{
 const s=setup();
 s.active=0;
 s.phase='attack';
 return s;
};
const restore=s=>JSON.parse(JSON.stringify(s));
const uids=s=>e.physicalCards(s).map(x=>x.uid).sort();
const pick=(s,x)=>act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===x.uid);
const offered=s=>s.decision.choices.map(c=>c.value?.uid);
const use=(s,x)=>act(s,'tapAbility',a=>a.uid===x.uid);
const endable=s=>e.getLegalActions(s).some(a=>a.kind==='endTurn');
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 s.phase='attack';
}

test('Garia grants untapped attacks only to the friendly Fire creatures present on resolution',()=>{
 const s=field(),source=put(s,0,GARIA),fire=put(s,0,FIRE),multi=put(s,0,MULTI);
 const nature=put(s,0,NATURE),sick=put(s,0,FIRE,{entered:s.turn}),enemy=put(s,1,FIRE);
 const canTarget=x=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===enemy.uid);
 assert.ok(!canTarget(fire));
 use(s,source);
 assert.ok(source.tapped);
 assert.ok(canTarget(fire));
 assert.ok(canTarget(multi));
 assert.ok(!canTarget(nature));
 assert.ok(!canTarget(sick));
 assert.ok(!canTarget(put(s,0,FIRE)));
 assert.ok(!e.effectiveCard(enemy,s).attackUntapped);
 assert.ok(e.effectiveCard(source,s).attackUntapped);
 attack(s,fire.uid,enemy.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(find(s,1,'grave',enemy));
 end(s);
 assert.ok(!e.effectiveCard(multi,s).attackUntapped);
});

test('Rondobill can select itself and makes a new face-down shield after restoring the choice',()=>{
 let s=field();
 const x=put(s,0,RONDO),other=put(s,0,NATURE),enemy=put(s,1,NATURE),before=uids(s);
 use(s,x);
 assert.ok(x.tapped);
 assert.deepEqual(offered(s),[x.uid,other.uid]);
 assert.ok(!offered(s).includes(enemy.uid));
 s=restore(s);
 pick(s,x);
 assert.ok(!find(s,0,'battle',x));
 assert.equal(s.players[0].shields.length,6);
 const shield=find(s,0,'shields',x);
 assert.ok(shield&&!shield.faceUp);
 assert.deepEqual(uids(s),before);
});

test('Rondobill shields a normal evolution and each underlying card separately',()=>{
 const s=field(),source=put(s,0,RONDO),base=inst(LIGHT),x=put(s,0,EVO,{under:[base]}),before=uids(s);
 use(s,source);
 pick(s,x);
 assert.ok(find(s,0,'battle',source));
 assert.ok(!find(s,0,'battle',x));
 assert.equal(s.players[0].shields.length,7);
 for(const y of [x,base]){
  const shield=find(s,0,'shields',y);
  assert.ok(shield&&!shield.faceUp&&!shield.shieldStack?.length);
 }
 assert.deepEqual(uids(s),before);
});

test('Rondobill respects EX Life replacing movement to shields',()=>{
 const s=field(),source=put(s,0,RONDO),ex=put(s,0,EX),shield=s.players[0].shields[0],before=uids(s);
 ex.exLifeShieldUid=shield.uid;
 use(s,source);
 pick(s,ex);
 drain(s);
 assert.ok(find(s,0,'battle',ex));
 assert.ok(find(s,0,'grave',shield));
 assert.equal(s.players[0].shields.length,4);
 assert.deepEqual(uids(s),before);
});

test('Takanami requires an attack from only the chosen creature on the next opposing turn',()=>{
 let s=field();
 const source=put(s,0,WAVE),ally=put(s,0,NATURE),target=put(s,1,FIRE),other=put(s,1,NATURE);
 const untargetable=put(s,1,DIVER,{justDiverActive:true});
 use(s,source);
 assert.deepEqual(offered(s),[target.uid,other.uid]);
 assert.ok(!offered(s).includes(untargetable.uid));
 s=restore(s);
 pick(s,target);
 assert.ok(endable(s));
 assert.ok(!e.effectiveCard(find(s,1,'battle',target),s).mustAttack);
 end(s);
 const x=find(s,1,'battle',target);
 assert.ok(e.effectiveCard(x,s).mustAttack);
 for(const [p,y] of [[0,ally],[1,other]])assert.ok(!e.effectiveCard(find(s,p,'battle',y),s).mustAttack);
 assert.ok(!endable(s));
 attack(s,x.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(endable(s));
 end(s);
 assert.ok(!e.effectiveCard(x,s).mustAttack);
 end(s);
 assert.ok(endable(s));
});

test('Takanami does not override an attack prohibition or persist after its target leaves',()=>{
 for(const reason of ['tapped','left']){
  const s=field(),source=put(s,0,WAVE),target=put(s,1,FIRE);
  use(s,source);
  pick(s,target);
  if(reason==='left'){
   s.phase='main';
   give(s,0,'hand',['dm01-086']);
   act(s,'play',a=>a.cardId==='dm01-086');
   act(s,'effect',a=>a.targets.some(x=>x.uid===target.uid));
   assert.ok(find(s,1,'hand',target));
  }
  end(s);
  if(reason==='left'){
   s.phase='main';
   act(s,'play',a=>a.uid===target.uid);
   assert.ok(!e.effectiveCard(find(s,1,'battle',target),s).mustAttack);
  }else{
   target.tapped=true;
  }
  s.phase='attack';
  assert.ok(endable(s));
 }
});
