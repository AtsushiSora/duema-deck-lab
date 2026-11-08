import {deckContentSnapshot} from './deck-history.js?v=0.720.0';
export function lastMatchSetup({deck,opponent,mode='manual',first='random',count=1000,practice=true,allOpp=false}){
 if(!deck?.id||!['manual','spectate','auto'].includes(mode))return null;
 return {version:1,deckId:deck.id,mode,first:['first','second','random'].includes(first)?first:'random',count:Number.isSafeInteger(count)&&count>0&&count<=100000?count:1000,practice:!!practice,allOpp:mode==='auto'&&!!allOpp,opponent:opponent?.id?{id:opponent.id,...deckContentSnapshot(opponent)}:null};
}
export function resolveLastMatch(saved,validate){
 const setup=saved.lastMatch;if(setup?.version!==1||!['manual','spectate','auto'].includes(setup.mode)||!['first','second','random'].includes(setup.first)||!Number.isSafeInteger(setup.count)||setup.count<1||setup.count>100000)return null;
 const deck=saved.decks.find(d=>d.id===setup.deckId);if(!deck)return null;
 const opponent=(saved.friends||[]).find(d=>d.id===setup.opponent?.id)||setup.opponent,opponents=setup.allOpp?(saved.friends||[]):opponent?[opponent]:[];
 const error=validate(deck)[0]||(!opponents.length?'相手デッキを選んでください':opponents.flatMap(d=>validate(d))[0]);
 return {setup,deck,opponent,error:error||null};
}
