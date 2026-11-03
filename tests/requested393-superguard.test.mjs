import test from'node:test';import assert from'node:assert/strict';
import{createRequested393SuperguardRules}from'../dist/requested393-superguard.js';
import{e,data,details,setup,give,inst,act}from'./target-fixture.mjs';
import{championDefinition}from'../tools/champion-definition.mjs';
import{REQUESTED393_DISPECTOR_SPECS as specs}from'../tools/requested393-dispector-specs.mjs';
e.setCards([...data.cards.filter(c=>!specs[c.id]),...details.cards.filter(c=>specs[c.id]).map(c=>championDefinition({...c,spec:specs[c.id]},'phase-393'))]);
function fixture(){
 let helper;const events=[],queue=[],s={active:0,players:[{battle:[]},{battle:[]}],winner:null};
 const card=x=>({id:typeof x==='string'?x:x.cardId,name:typeof x==='string'?x:x.cardId});
 const api={card,effective:x=>x.ignored?{}:x.definition||{},isCreature:(_,x)=>x.definition?.type!=='seed',creatures:(s,p)=>s.players[p].battle.filter(x=>!x.sealed&&api.isCreature(s,x)),power:x=>x.definition?.power||1000,
  put:(_,t)=>queue.unshift(t),task:(op,p,source,more)=>({op,p,source,...more}),choice:(s,t,title,choices)=>s.decision={player:t.p,task:t,title,choices},opt:(label,value,score,cardId)=>({label,value,score,cardId}),skip:()=>({label:'使わない',value:null,score:0}),
  tap:(_,p,x)=>{x.tapped=true;events.push(['tap',p,x.uid]);},log:()=>{},battle:(_,pa,a,pb,b,attacking,replaced)=>{assert.equal(replaced,true,'resume skips all further battle replacements');events.push(['battle',pa,a.uid,pb,b.uid,attacking,replaced]);}
 };
 helper=createRequested393SuperguardRules(api);
 const unit=(p,id,definition={},more={})=>{const x={uid:id,cardId:id,incarnation:0,tapped:false,definition:{type:'creature',power:1000,...definition},...more};s.players[p].battle.push(x);return x;};
 const drain=()=>{for(let n=0;queue.length&&!s.decision;n++){assert.ok(n<20,'replacement does not recurse');helper.run(s,queue.shift());}};
 const start=(pa,a,pb,b,attacking=null)=>{const replaced=helper.replaceBattle(s,pa,a,pb,b,attacking);drain();return replaced;};
 const choose=v=>{const t=s.decision.task;delete s.decision;helper.chosen(s,t,v);drain();};
 const pick=id=>choose(s.decision.choices.find(x=>x.value?.uid===id)?.value??null);
 return{s,events,queue,helper,unit,start,choose,pick,drain};
}
for(const p of[0,1])test('superguard can replace either battle participant and its owner chooses '+p,()=>{
 const f=fixture(),a=f.unit(0,'attacker'),b=f.unit(1,'defender'),g=f.unit(p,'guard',{superGuardman:true,power:10000});
 assert.equal(f.start(0,a,1,b,a.uid),true);assert.equal(f.s.decision.player,p);f.pick(g.uid);
 assert.ok(g.tapped);assert.deepEqual(f.events,[['tap',p,g.uid],['battle',0,p===0?g.uid:a.uid,1,p===1?g.uid:b.uid,a.uid,true]]);
 assert.equal(a.tapped,false,'substituting does not mutate the original participant');assert.equal(f.s.decision,undefined);
});
test('effect battles offer superguard even without an attack',()=>{const f=fixture(),a=f.unit(1,'spell-own'),b=f.unit(0,'spell-opponent'),g=f.unit(1,'guard',{superGuardman:true});assert.ok(f.start(1,a,0,b));f.pick(g.uid);assert.deepEqual(f.events.at(-1),['battle',1,g.uid,0,b.uid,null,true]);});
for(const active of[0,1])test('turn player has first replacement choice; accepting prevents the opposing replacement '+active,()=>{
 const f=fixture();f.s.active=active;const a=f.unit(0,'a'),b=f.unit(1,'b'),g0=f.unit(0,'g0',{superGuardman:true}),g1=f.unit(1,'g1',{superGuardman:true});
 f.start(0,a,1,b,a.uid);assert.equal(f.s.decision.player,active);f.pick(active?'g1':'g0');assert.equal(f.events.filter(x=>x[0]==='battle').length,1);assert.equal(f.s.decision,undefined);assert.equal((active?g0:g1).tapped,false);
});
test('declining turn-player replacement passes optional choice to nonturn player',()=>{const f=fixture(),a=f.unit(0,'a'),b=f.unit(1,'b');f.unit(0,'g0',{superGuardman:true});f.unit(1,'g1',{superGuardman:true});f.start(0,a,1,b,a.uid);f.choose(null);assert.equal(f.s.decision.player,1);f.pick('g1');assert.equal(f.events.at(-1)[4],'g1');});
test('both players declining resumes the original battle exactly once',()=>{const f=fixture(),a=f.unit(0,'a'),b=f.unit(1,'b');f.unit(0,'g0',{superGuardman:true});f.unit(1,'g1',{superGuardman:true});f.start(0,a,1,b,a.uid);f.choose(null);f.choose(null);assert.deepEqual(f.events,[['battle',0,'a',1,'b','a',true]]);});
test('tapped, sealed, ignored and noncreature donors cannot superguard; participant cannot replace itself',()=>{for(const more of[{tapped:true},{sealed:true},{ignored:true},{definition:{type:'seed',superGuardman:true}}]){const f=fixture(),a=f.unit(0,'a',{superGuardman:true}),b=f.unit(1,'b');f.unit(0,'g',{superGuardman:true},more);assert.equal(f.start(0,a,1,b,a.uid),false);assert.equal(f.events.length,0);}});
test('not being attackable or redirectable does not prohibit replacing an actual battle',()=>{const f=fixture(),a=f.unit(0,'a',{attackUnredirectable:true}),b=f.unit(1,'b'),g=f.unit(1,'g',{superGuardman:true,cannotBeAttacked:true});assert.ok(f.start(0,a,1,b,a.uid));f.pick(g.uid);assert.equal(f.events.at(-1)[4],g.uid);});
test('galactic replacement competes in the same choice and never requires tapping',()=>{const f=fixture(),a=f.unit(0,'a',{race:'ジャイアント'}),b=f.unit(1,'b'),g=f.unit(0,'galaxy',{galacticBattle:true}),sg=f.unit(0,'super',{superGuardman:true});f.start(0,a,1,b,a.uid);assert.equal(f.s.decision.choices.filter(x=>x.value).length,2);f.pick(g.uid);assert.equal(g.tapped,false);assert.equal(sg.tapped,false);assert.deepEqual(f.events,[['battle',0,g.uid,1,b.uid,a.uid,true]]);});
test('without eligible superguard donors, legacy Galactic handler remains responsible',()=>{const f=fixture(),a=f.unit(0,'a',{race:'ジャイアント'}),b=f.unit(1,'b');f.unit(0,'galaxy',{galacticBattle:true});assert.equal(f.start(0,a,1,b,a.uid),false);});
test('a donor with both battle replacements can use its Galactic ability without tapping',()=>{const f=fixture(),a=f.unit(0,'a',{race:'ジャイアント'}),b=f.unit(1,'b'),g=f.unit(0,'g',{superGuardman:true,galacticBattle:true});f.start(0,a,1,b,a.uid);assert.equal(f.s.decision.choices.filter(x=>x.value).length,2);f.choose(f.s.decision.choices.find(x=>x.value?.kind==='galactic').value);assert.equal(g.tapped,false);assert.deepEqual(f.events,[['battle',0,g.uid,1,b.uid,a.uid,true]]);});
test('choice and battle references survive JSON persistence',()=>{const f=fixture(),a=f.unit(0,'a'),b=f.unit(1,'b');f.unit(1,'g',{superGuardman:true});f.start(0,a,1,b,a.uid);f.s.decision=JSON.parse(JSON.stringify(f.s.decision));f.pick('g');assert.deepEqual(f.events.at(-1),['battle',0,'a',1,'g','a',true]);});
test('same UID with a new incarnation cannot satisfy a stale donor choice',()=>{const f=fixture(),a=f.unit(0,'a'),b=f.unit(1,'b'),g=f.unit(1,'g',{superGuardman:true});f.start(0,a,1,b,a.uid);const v=f.s.decision.choices[0].value;g.incarnation++;f.choose(v);assert.equal(g.tapped,false);assert.deepEqual(f.events.at(-1),['battle',0,'a',1,'b','a',true]);});
test('a departed original participant cancels the deferred battle',()=>{const f=fixture(),a=f.unit(0,'a'),b=f.unit(1,'b');f.unit(1,'g',{superGuardman:true});f.start(0,a,1,b,a.uid);f.s.players[0].battle=[];f.choose(null);assert.equal(f.events.length,0);});
const enginePut=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const enginePick=(s,uid)=>act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===uid);
const engineFinish=s=>{for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<100,JSON.stringify(s.decision));if(s.decision.type==='block')act(s,'noBlock');else e.step(s,e.chooseAI(s));}};
for(const owner of[0,1])test('engine replacement saves an attacking or defending ally and the substitute actually battles '+owner,()=>{
 const s=setup(),weak=enginePut(s,owner,'dm01-108'),strong=enginePut(s,1-owner,'dm01-s01'),guard=enginePut(s,owner,'dm26rp3-010');
 const attacker=owner?strong:weak,defender=owner?weak:strong;defender.tapped=true;s.phase='attack';
 act(s,'attack',a=>a.uid===attacker.uid&&a.target===defender.uid);act(s,'noBlock');
 assert.equal(s.decision.task.op,'g393SG_Battle');assert.equal(s.decision.player,owner);enginePick(s,guard.uid);engineFinish(s);
 assert.ok(guard.tapped);assert.ok(s.players[owner].battle.some(x=>x.uid===weak.uid));assert.ok(s.players[owner].battle.some(x=>x.uid===guard.uid));assert.ok(s.players[1-owner].grave.some(x=>x.uid===strong.uid));
});
test('engine spell-created battle supports superguard and still processes Slayer afterwards',()=>{
 const s=setup(),weak=enginePut(s,0,'dm01-108'),slayer=enginePut(s,1,'dm01-088'),guard=enginePut(s,0,'dm26rp3-010');
 s.extTasks=[{op:'g34_Fight240',p:0,source:'dmrp19-011'}];act(s,'toAttack');enginePick(s,weak.uid);enginePick(s,slayer.uid);
 assert.equal(s.decision.task.op,'g393SG_Battle');enginePick(s,guard.uid);engineFinish(s);
 assert.ok(s.players[0].battle.some(x=>x.uid===weak.uid));assert.ok(s.players[0].grave.some(x=>x.uid===guard.uid));assert.ok(s.players[1].grave.some(x=>x.uid===slayer.uid));
});
test('replacement battle loss may still be replaced by the substitutes EX Life',()=>{
 const s=setup(),guard=inst('dm26rp3-010');s.players[0].hand.push(guard);act(s,'play',a=>a.uid===guard.uid);engineFinish(s);
 const weak=enginePut(s,0,'dm01-108'),enemy=enginePut(s,1,'dm01-s01');enemy.powerModifiers=[{amount:10000}];enemy.tapped=true;const shields=s.players[0].shields.length;
 s.phase='attack';act(s,'attack',a=>a.uid===weak.uid&&a.target===enemy.uid);act(s,'noBlock');enginePick(s,guard.uid);engineFinish(s);
 assert.ok(s.players[0].battle.some(x=>x.uid===guard.uid));assert.ok(s.players[0].battle.some(x=>x.uid===weak.uid));assert.equal(s.players[0].shields.length,shields-1);assert.ok(guard.tapped);
});

test('superguard does not redirect an attack on the player before any creature battle',()=>{const s=setup(),a=enginePut(s,0,'dm01-108');enginePut(s,1,'dm26rp3-010');s.phase='attack';act(s,'attack',x=>x.uid===a.uid&&x.target==='player');assert.equal(s.decision.type,'block');assert.ok(!e.getLegalActions(s).some(x=>x.kind==='guardman'));act(s,'noBlock');engineFinish(s);assert.ok(!s.decision);});
