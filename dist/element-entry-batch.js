// Snapshot physical battlefield incarnations before a simultaneous entry group.
// A continuous restriction on a newly arriving element starts after that group.
export function beginElementEntryBatch(s,key){
 if(!s[key]){
  (s.g1821EntryBatch??={})[key]=s.players.flatMap(p=>p.battle.map(x=>({uid:x.uid,incarnation:x.incarnation||0})));
  s[key]=true;
 }
}
export function endElementEntryBatch(s,key){
 delete s[key];
 if(s.g1821EntryBatch){delete s.g1821EntryBatch[key];if(!Object.keys(s.g1821EntryBatch).length)delete s.g1821EntryBatch;}
}
export function elementEntrySourceEstablished(s,x){
 return Object.values(s.g1821EntryBatch||{}).every(refs=>refs.some(r=>r.uid===x.uid&&r.incarnation===(x.incarnation||0)));
}
