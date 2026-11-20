import test from 'node:test';
import assert from 'node:assert/strict';
import {e,data,setup,inst,act,drain} from './target-fixture.mjs';
for(const [front,back,expected] of [[false,false,0],[true,false,1],[false,true,1],[true,true,2]])test('innate G Strike instances are counted separately on both twin faces: '+front+'/'+back,()=>{
 const id='test-twin-strike',base=e.card('dmrp05-080'),fixture={...base,id,gStrike:front,spellFace:{...base.spellFace,gStrike:back}};
 try{
  e.setCards([...data.cards,fixture]);let s=setup();s.active=0;s.players[0].battle=[inst('dm01-108')];s.players[1].shields=[inst(id)];s.players[1].mana=[];const attacker=s.players[0].battle[0];s.phase='attack';act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');act(s,'noBlock');let declared=0;
  while(s.decision?.task?.op==='gsDeclare'){
   s=JSON.parse(JSON.stringify(s));act(s,'extended',a=>s.decision.choices[a.choice].value===true);declared++;
  }
  let targets=0;while(s.decision?.task?.op==='gsTarget'){act(s,'extended',a=>s.decision.choices[a.choice].value===attacker.uid);targets++;}drain(s);assert.equal(targets,expected);assert.equal(declared,expected);assert.equal(s.players[1].hand.filter(x=>x.cardId===id).length,1);assert.equal(s.players[1].spellsThisTurn||0,0);assert.equal(s.players[1].mana.length,0);assert.equal(s.players[0].battle[0].tapped,true);
 }finally{e.setCards(data.cards);}
});
