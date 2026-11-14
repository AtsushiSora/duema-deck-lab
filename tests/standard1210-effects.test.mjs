import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {projectRoom} from '../server/duel-core.mjs';

const MESH='dm23rp2-057',KARA='dm23rp2-020',MIDORI='dm23rp2-024';
const MAGIC='dm23rp2-056',ARMORED='dm23rp2-050',BIRD='dm23rp2-066',SMALL='dm01-108';
const SEED='dmrp21-074',NEVER='dmrp12-s01',LOCK='dmrp02-s10',QQ='dmrp07-m01';
const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(12).fill(SMALL));return s;};
const put=(s,p,z,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const play=(s,id,face=0)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);return x;};
const ids=xs=>xs.map(x=>x.uid);

test('eight printed versions resolve to the three canonical Twinpacts',()=>{
 const m=read('support-phase-1210.json'),refs=read('image-reference-prints.json').prints,catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[MESH,KARA,MIDORI]);
 assert.deepEqual(m.printAliases.map(c=>c.id),['dm23rp2x-057','dm23rp2x-020','dm23rp2x-024','dm23bd6-032','dm24bd5-024']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,live=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1210}),row.spec);
  for(const i of [0,1]){
   const changed=structuredClone({...row,status:'complete'});changed.faces[i].abilityText+='\n未知の能力。';
   assert.throws(()=>standardCardSpec(changed,{phase:1210}));
  }
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.equal(catalogue.get(id).supported,true);
  assert.equal(live.limit,4);assert.equal(live.manaValue,1);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(e.playFaces(live).map(c=>[c.type,c.cost,c.power,c.race,c.civilizations]),
   row.faces.map((f,i)=>[i?'spell':'creature',f.cost,i?undefined:+f.powerText,f.race,f.civilizations]));
  assert.equal(refs.find(c=>c.id===row.id&&c.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
 }
});

test('Mesh taps only an untapped other allied Magic, casts for no extra mana and stays in battle',()=>{
 let s=field();
 const eligible=put(s,0,'battle',MAGIC),tapped=put(s,0,'battle',MAGIC,{tapped:true});
 const sealed=put(s,0,'battle',MAGIC,{sealed:true});
 s.players[0].seals=[{...inst(SMALL),faceDown:true,sealOf:sealed.uid}];
 put(s,0,'battle',SMALL);put(s,1,'battle',MAGIC);
 const before=ids(s.players[0].deck),x=play(s,MESH);
 assert.equal(s.decision.task.op,'g34_FriendBurst1210');
 assert.deepEqual(values(s),[eligible.uid,null]);
 s=JSON.parse(JSON.stringify(s));pick(s,eligible.uid);
 assert.ok(s.players[0].battle.find(y=>y.uid===eligible.uid).tapped);
 assert.ok(s.players[0].battle.find(y=>y.uid===tapped.uid).tapped);
 assert.ok(has(s,0,'battle',x));assert.ok(!has(s,0,'grave',x));
 assert.deepEqual(ids(s.players[0].hand),before.slice(0,3));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,4);
});

test('Mesh may decline, cannot tap itself, and can cast the spell normally from hand',()=>{
 const s=field(),ally=put(s,0,'battle',MAGIC);
 play(s,MESH);pick(s,null);
 assert.equal(ally.tapped,false);assert.equal(s.players[0].hand.length,0);
 ally.tapped=true;
 const second=play(s,MESH);
 assert.ok(values(s).includes(s.players[0].battle[1].uid)&&!values(s).includes(second.uid));
 pick(s,null);
 const spell=play(s,MESH,1);
 assert.ok(has(s,0,'grave',spell));
 assert.equal(s.players[0].hand.length,3);
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,13);
 const empty=field();play(empty,MESH);assert.equal(empty.decision,null);
});

test('Mesh can still cast after Now or Never returns it to hand (QA 45088)',()=>{
 const s=field(),ally=put(s,0,'battle',MAGIC),x=put(s,0,'hand',MESH);
 const before=ids(s.players[0].deck);
 play(s,NEVER,1);pick(s,x.uid);
 assert.ok(has(s,0,'hand',x));
 assert.equal(s.decision.task.op,'g34_FriendBurst1210');
 pick(s,ally.uid);drain(s);
 assert.ok(ally.tapped);assert.ok(has(s,0,'hand',x));assert.ok(!has(s,0,'grave',x));
 assert.deepEqual(ids(s.players[0].hand),[x.uid,...before.slice(0,3)]);
});

test('Friend Burst can tap its ally even if the opponent prohibits casting',()=>{
 const s=field(),ally=put(s,0,'battle',MAGIC);
 put(s,1,'battle',LOCK);
 const x=play(s,MESH);
 pick(s,ally.uid);drain(s);
 assert.ok(ally.tapped);assert.ok(has(s,0,'battle',x));
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.metrics[0].played[MESH],1);
});

test('A copied Friend Burst uses the copying creature’s faces, not the original spell (QA 44115)',()=>{
 const s=field(),ally=put(s,1,'battle',MAGIC),copy=put(s,1,'battle','dm24rp4-S02');
 const x=play(s,MESH);
 assert.equal(s.decision.task.op,'g1_Copy');
 pick(s,true);
 assert.deepEqual(values(s),[ally.uid,null]);
 pick(s,ally.uid);drain(s);
 assert.ok(ally.tapped);assert.ok(has(s,1,'battle',copy));assert.ok(has(s,0,'battle',x));
 assert.equal(s.players[1].hand.length,0);
});

test('Karakara boosts only other friendly Birds and its burst discards before drawing',()=>{
 const s=field(),bird=put(s,0,'battle',BIRD),ally=put(s,0,'battle',ARMORED);
 const enemy=put(s,1,'battle',BIRD),discard=put(s,0,'hand',SMALL),before=ids(s.players[0].deck);
 const x=play(s,KARA);
 assert.equal(e.power(bird,false,s),6000);assert.equal(e.power(ally,false,s),e.card(ARMORED).power);
 assert.equal(e.power(x,false,s),2000);assert.equal(e.power(enemy,false,s),4000);
 assert.deepEqual(values(s),[bird.uid,ally.uid,null]);
 pick(s,ally.uid);
 assert.equal(s.players[0].deck.length,before.length);
 assert.deepEqual(values(s),[discard.uid]);
 pick(s,discard.uid);drain(s);
 assert.ok(ally.tapped);assert.ok(has(s,0,'grave',discard));assert.ok(has(s,0,'battle',x));
 assert.deepEqual(ids(s.players[0].hand),before.slice(0,2));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,2);
 x.g35Ignored=s.turn;
 assert.equal(e.power(bird,false,s),4000);
});

test('Karakara spell still draws two if there is nothing to discard',()=>{
 const s=field(),before=ids(s.players[0].deck);
 const x=play(s,KARA,1);drain(s);
 assert.ok(has(s,0,'grave',x));
 assert.deepEqual(ids(s.players[0].hand),before.slice(0,2));
});

test('Midori privately sees two and must place one in mana, without repositioning the other',()=>{
 for(const select of [0,1]){
  const s=field();
  give(s,0,'deck',[ARMORED,MESH,SMALL,SMALL]);
  const before=s.players[0].deck.slice(),x=play(s,MIDORI);
  const room={game:s,phase:'playing',hostUid:'a',guestUid:'b',profiles:[{},{}],decks:[{},{}],events:[],expiresAt:10000};
  assert.deepEqual(projectRoom(room,{uid:'a'},1).game.inspectedCards.map(y=>y.id),[ARMORED,MESH]);
  assert.equal(projectRoom(room,{uid:'b'},1).game.inspectedCards,undefined);
  assert.deepEqual(values(s),ids(before.slice(0,2)));
  pick(s,before[select].uid);
  assert.ok(has(s,0,'battle',x));
  assert.ok(has(s,0,'mana',before[select]));
  assert.equal(s.players[0].mana.at(-1).tapped,select===0);
  assert.deepEqual(ids(s.players[0].deck),ids(before.filter((_,i)=>i!==select)));
  assert.deepEqual(s.players[0].g34Protected,[]);
 }
});

test('Midori cannot look under Q.Q.QX. and leaves the top cards where they are',()=>{
 const s=field(),before=ids(s.players[0].deck),mana=s.players[0].mana.length;
 put(s,1,'battle',QQ);
 play(s,MIDORI);
 assert.equal(s.decision,null);
 assert.deepEqual(ids(s.players[0].deck),before);
 assert.equal(s.players[0].mana.length,mana);
});

test('Harmony sends unsealed creatures, including an evolution stack, tapped to each physical card owner',()=>{
 const s=field(),ours=put(s,0,'battle',SMALL),theirs=put(s,1,'battle',MAGIC);
 const stolen=put(s,1,'battle',MESH,{cardOwner:0}),base=Object.assign(inst(BIRD),{cardOwner:1});
 stolen.under=[base];
 const seed=put(s,1,'battle',SEED),sealed=put(s,0,'battle',SMALL,{sealed:true});
 s.players[0].seals=[{...inst(SMALL),faceDown:true,sealOf:sealed.uid}];
 theirs.justDiverActive=true;
 const x=play(s,MIDORI,1);drain(s);
 for(const [p,y] of [[0,ours],[0,stolen],[1,theirs],[1,base]]){
  assert.ok(has(s,p,'mana',y));assert.ok(s.players[p].mana.find(z=>z.uid===y.uid).tapped);
 }
 assert.ok(has(s,0,'battle',sealed));assert.ok(has(s,1,'battle',seed));
 assert.ok(has(s,0,'grave',x));assert.equal(s.players[0].mana.filter(y=>y.tapped).length,10);
});
