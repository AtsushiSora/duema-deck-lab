// Preserve effects which follow a deployment when the entering creature first
// needs a state choice. Tasks and physical references remain JSON serializable.
export function afterEntry(s,p,x,t,put){
 if(s.players[p].battle.includes(x)){put(s,t);return;}
 const pending=[...(s.extTasks||[]),s.decision?.task].find(q=>q?.op==='g34_EntryTap432'&&q.p===p&&q.target===x.uid);
 if(!pending)return;
 const incarnation=(x.incarnation||0)+1;
 (pending.afterEntryTasks??=[]).push({...t,...(t.uid===x.uid?{incarnation}:{}),...(t.target===x.uid?{targetIncarnation:incarnation}:{})});
}
