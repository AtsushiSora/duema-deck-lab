import test from 'node:test';
import assert from 'node:assert/strict';
import {e,setup,inst,act,cast,drain} from './target-fixture.mjs';
const GR='dmsd08-016',cases=[['dmsd08-020',0,false,true],['dmrp09-079',1,false,false],['dmex07-023',2,false,false],['dmrp11-067',0,true,false],['dmsd13-005',0,true,false]];
for(const [id,draw,creature,charger] of cases)for(const blocked of [false,true])test(e.card(id).name+' resolves summon, draw and final zone with GR '+(blocked?'forbidden':'available'),()=>{
 const s=setup();s.active=0;s.format='advance';const gr=inst(GR);s.players[0].gr=[gr,inst('dmsd11-014')];if(blocked)s.extLimits=[{kind:'summon',player:0,max:3}];const deck=s.players[0].deck.length,mana=s.players[0].mana.length;
 cast(s,id);drain(s);assert.equal(s.players[0].hand.length,draw);assert.equal(s.players[0].deck.length,deck-draw);assert.equal(s.players[0].mana.length,mana+(charger?1:0));assert.equal(s.players[0].battle.includes(gr),!blocked);
 if(blocked)assert.equal(s.players[0].gr[0],gr);else assert.equal(gr.summonedTurn,s.turn);
 assert.ok(s.players[0][creature?'battle':charger?'mana':'grave'].some(x=>x.cardId===id));assert.equal(s.winner,null);
});
for(const id of ['dmex07-023','dmsd13-005'])test(e.card(id).name+' uses its shield trigger without mana and GR summons on the defending side',()=>{
 const s=setup();s.active=0;s.format='advance';s.players[0].battle=[inst('dm01-108')];s.players[1].battle=[];s.players[1].mana=[];s.players[1].shields=[inst(id)];const gr=inst(GR);s.players[1].gr=[gr,inst('dmsd11-014')];s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');drain(s);assert.ok(s.players[1].battle.includes(gr));assert.equal(s.players[1].mana.length,0);assert.ok(s.players[1][id==='dmsd13-005'?'battle':'grave'].some(x=>x.cardId===id));assert.equal(s.winner,null);
});
for(const [id,draw] of cases)test(e.card(id).name+' keeps the draw portion and completes with empty super GR',()=>{const s=setup();s.active=0;s.format='advance';s.players[0].gr=[];cast(s,id);drain(s);assert.equal(s.players[0].hand.length,draw);assert.equal(s.decision,null);assert.equal(s.winner,null);});
