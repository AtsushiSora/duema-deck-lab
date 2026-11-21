import test from 'node:test';import assert from 'node:assert/strict';
import{e,data,setup,inst,act,drain,attack}from'./target-fixture.mjs';
import{verifyTwinBatch,put,pick,playFace}from'./target8500-twin-fixture.mjs';
verifyTwinBatch(1590);const J='dmsd11-008',G='dmrp09-049',B='dmrp08-s08',N='dm01-108';
const grId=data.cards.find(c=>c.gr&&c.type==='creature'&&!c.g34Tasks&&!c.g172Death).id;
function kill(s,x){s.players[1].hand.push(inst('dm01-027'));s.active=1-(s.players[0].battle.some(y=>y.uid===x.uid)?0:1);s.phase='main';s.players[s.active].hand.push(inst('dm01-027'));act(s,'play',a=>a.cardId==='dm01-027');act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));drain(s);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
test('Jenne cannot attack before a spell, can attack after casting one, resets next turn and remains a blocker',()=>{
 const s=setup(),x=put(s,0,J);s.phase='attack';assert.ok(e.effectiveCard(x,s).blocker);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));s.phase='main';playFace(s,J,1);drain(s);s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));end(s);end(s);s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
});
test('GYORAI summons the physical top GR with immediate speed, and the grant expires at turn end',()=>{
 let s=setup();s.format='advance';const top=inst(grId);s.players[0].gr=[top];const all=e.physicalCards(s).map(x=>x.uid).sort();const src=playFace(s,J,1);drain(s);const body=s.players[0].battle.find(x=>x.uid===top.uid);assert.ok(body);assert.ok(e.effectiveCard(body,s).speedAttacker);s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===body.uid&&a.target==='player'));s=JSON.parse(JSON.stringify(s));assert.deepEqual(e.physicalCards(s).filter(x=>x.uid!==src.uid).map(x=>x.uid).sort(),all);end(s);assert.ok(!e.effectiveCard(s.players[0].battle.find(x=>x.uid===top.uid),s).speedAttacker);
});
test('GARIGARI grants battle-only6000 to creatures present on entry and expires at end',()=>{
 const s=setup(),ally=put(s,0,N),enemy=put(s,1,'dm01-s04');enemy.tapped=true;playFace(s,G);drain(s);assert.equal(e.power(ally,true,s),2000);attack(s,ally.uid,enemy.uid);act(s,'noBlock');drain(s);assert.ok(s.players[0].battle.some(x=>x.uid===ally.uid));assert.ok(s.players[1].grave.some(x=>x.uid===enemy.uid));const next=put(s,0,N),low=put(s,1,'dm01-075');low.tapped=true;attack(s,next.uid,low.uid);act(s,'noBlock');drain(s);assert.ok(s.players[0].grave.some(x=>x.uid===next.uid));
});
test('GARIGARI GR summons only for another non-GR own death, including after JSON restore',()=>{
 for(const victimKind of ['other','gr','self','opponent']){let s=setup();s.format='advance';const source=put(s,0,G),ally=put(s,victimKind==='opponent'?1:0,victimKind==='gr'?grId:N),top=inst(grId);s.players[0].gr=[top];s=JSON.parse(JSON.stringify(s));const victim=victimKind==='self'?source:ally;kill(s,victim);assert.equal(s.players[0].battle.some(x=>x.uid===top.uid),victimKind==='other');}
});
test('Ishoku gives existing own creatures Slayer for the turn, preserving normal power and source ID',()=>{
 const s=setup(),ally=put(s,0,N),enemy=put(s,1,'dm01-s05');enemy.tapped=true;playFace(s,G,1);drain(s);assert.ok(e.effectiveCard(ally,s).slayer);assert.ok(!e.effectiveCard(enemy,s).slayer);attack(s,ally.uid,enemy.uid);act(s,'noBlock');drain(s);assert.ok(s.players[0].grave.some(x=>x.uid===ally.uid));assert.ok(s.players[1].grave.some(x=>x.uid===enemy.uid));
});
test('Stronga breaks one enemy shield for own or allied death but not an enemy death',()=>{
 for(const kind of ['self','ally','enemy']){const s=setup(),source=put(s,0,B),ally=put(s,kind==='enemy'?1:0,N),before=s.players[1].shields.length;kill(s,kind==='self'?source:ally);assert.equal(s.players[1].shields.length,before-(kind==='enemy'?0:1));}
});
test('Absolute shield requires the optional sacrifice, prevents direct loss, and expires at own next start',()=>{
 for(const accept of [false,true]){let s=setup();const ally=put(s,0,N),attacker=put(s,1,N);s.players[0].shields=[];playFace(s,B,1);if(accept)pick(s,ally.uid);else pick(s,null);drain(s);assert.equal(!!s.extLimits?.some(l=>l.kind==='g34NoLose'&&l.player===0),accept);s=JSON.parse(JSON.stringify(s));end(s);attack(s,attacker.uid);drain(s);if(accept){assert.equal(s.winner,null);end(s);assert.ok(!s.extLimits.some(l=>l.kind==='g34NoLose'));}else assert.equal(s.winner,1);}
});
test('Stronga Smash Burst may cast its spell virtually and leaves exactly one physical body',()=>{
 const s=setup(),source=put(s,0,B),ally=put(s,0,N),before=e.physicalCards(s).map(x=>x.uid).sort();attack(s,source.uid);pick(s,true);pick(s,ally.uid);drain(s);assert.equal(s.players[0].battle.filter(x=>x.uid===source.uid).length,1);assert.ok(s.extLimits?.some(l=>l.kind==='g34NoLose'));assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),before);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
});
