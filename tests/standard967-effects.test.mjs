import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,GG} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MENG='dmex14-088',LAIRA='dmrp21-061',TAIMAN='dmx17-034';
const NATURE='dm01-108',LIGHT='dm01-075',DARK='dm01-090',DRAGON='dm08-049';
const SEED='dm24rp4-007',DUAL='dm22rp1-8A',FIELD='dmr21-036',UNTAP='dm26rp2-057';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(18).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

test('Phase 967 verifies three canonical cards with official images and limits',()=>{
 const m=read('tools/support-phase-967.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[MENG,LAIRA,TAIMAN]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id}=row,f=row.faces[0],d={...row,status:'complete'},c=e.card(id);
  assert.deepEqual(standardCardSpec(d,{phase:967}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:966}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:967}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-967');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(refs.filter(r=>r.id===id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  assert.deepEqual(catalogue.resolveRows([{id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

test('Mengomengo only draws on a successful turn-start untap',()=>{
 const s=field(1);
 const tapped=put(s,0,'battle',MENG,{tapped:true});
 const untapped=put(s,0,'battle',MENG);
 const frozen=put(s,0,'battle',MENG,{tapped:true,skipUntap:true});
 const before=physical(s);
 s.phase='attack';act(s,'endTurn');
 assert.equal(s.active,0);
 assert.equal(s.phase,'charge');
 assert.ok(!tapped.tapped&&!untapped.tapped&&frozen.tapped);
 assert.equal(s.players[0].hand.length,2);
 assert.deepEqual(physical(s),before);
});

test('Mengomengo draws once per actual effect untap, including after JSON continuation',()=>{
 let s=field();
 const x=put(s,0,'battle',MENG,{tapped:true});
 const choose=()=>act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===x.uid);
 cast(s,UNTAP);s=restore(s);choose();
 assert.equal(s.players[0].hand.length,1);
 cast(s,UNTAP);choose();
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.players[0].battle.find(y=>y.uid===x.uid).tapped,false);
});

test('Mengomengo enters untapped without drawing and obeys ability suppression',()=>{
 const s=field();
 cast(s,MENG);
 const x=s.players[0].battle[0];
 assert.equal(s.players[0].hand.length,0);
 x.tapped=true;x.g35Ignored=s.turn;
 cast(s,UNTAP);
 act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===x.uid);
 assert.equal(x.tapped,false);
 assert.equal(s.players[0].hand.length,0);
});

for(const asCreature of [false,true])test('Lairarai counts each friendly creature or tamaseed once (dual creature='+asCreature+')',()=>{
 const s=field(),dual=put(s,0,'battle',DUAL);
 put(s,0,'battle',SEED);put(s,0,'battle',FIELD);
 const ally=put(s,0,'battle',NATURE,{under:[inst(NATURE)]});
 const sealed=put(s,0,'battle',LIGHT,{sealed:true});
 s.players[0].seals=[{...inst(LIGHT),sealOf:sealed.uid,faceDown:true}];
 if(asCreature){put(s,0,'battle',NATURE);put(s,0,'battle',NATURE);}
 put(s,1,'battle',SEED);put(s,1,'battle',DARK);
 assert.equal(e.isCreature(s,dual),asCreature);
 const x=put(s,0,'hand',LAIRA),before=physical(s);
 const n=asCreature?6:4,top=s.players[0].deck.slice(0,n).map(y=>y.uid);
 act(s,'play',a=>a.uid===x.uid);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck.length,18-n);
 assert.deepEqual(s.players[0].grave.map(y=>y.uid),top);
 assert.equal(ally.under.length,1);
 assert.deepEqual(physical(s),before);
});

test('Lairarai alone mills one card and can lose to deck exhaustion',()=>{
 const s=field();give(s,0,'deck',[NATURE]);
 cast(s,LAIRA);
 assert.equal(s.players[0].grave.length,1);
 assert.equal(s.players[0].deck.length,0);
 assert.equal(s.winner,1);
});

test('Lairarai cannot mill while its own entry ability is suppressed',()=>{
 const s=field();put(s,1,'battle',GG,{under:[inst(NATURE)]});
 cast(s,LAIRA);
 assert.equal(s.players[0].deck.length,18);
 assert.equal(s.players[0].grave.length,0);
});

const canHit=(s,x,y)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===y.uid);

test('Taimand gives only its other friendly Dragons permission, and respects summoning sickness',()=>{
 const s=field(),source=put(s,0,'hand',TAIMAN),dragon=put(s,0,'battle',DRAGON);
 const ordinary=put(s,0,'battle',NATURE),target=put(s,1,'battle',LIGHT);
 const fresh=put(s,0,'battle',DRAGON,{entered:s.turn});
 act(s,'play',a=>a.uid===source.uid);
 source.entered=0;s.phase='attack';
 assert.equal(canHit(s,dragon,target),true);
 assert.equal(canHit(s,source,target),false);
 assert.equal(canHit(s,ordinary,target),false);
 assert.equal(canHit(s,fresh,target),false);
 const before=physical(s);
 attack(s,dragon.uid,target.uid);act(s,'noBlock');
 assert.ok(s.players[1].grave.includes(target));
 assert.deepEqual(physical(s),before);
});

test('Taimand permissions track the source’s suppression and departure, independently of its recipient',()=>{
 const s=field(),source=put(s,0,'battle',TAIMAN),dragon=put(s,0,'battle',DRAGON,{g35Ignored:s.turn});
 const target=put(s,1,'battle',LIGHT);
 s.phase='attack';
 assert.equal(canHit(s,dragon,target),true);
 source.g35Ignored=s.turn;
 assert.equal(canHit(s,dragon,target),false);
 target.tapped=true;
 assert.equal(canHit(s,dragon,target),true);
 delete source.g35Ignored;target.tapped=false;
 assert.equal(canHit(s,dragon,target),true);
 s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==source.uid);
 s.players[0].grave.push(source);
 assert.equal(canHit(s,dragon,target),false);
});
