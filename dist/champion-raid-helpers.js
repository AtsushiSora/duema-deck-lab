// Mekraid uses one matching face from each selected card.
// Reserved cards remain in the library until chosen and are released before execution.
export function createChampionRaid(api,prefix){
 const {card,faces,cost,put,choice,opt,skip,task}=api;
 const release=(s,p,uid)=>{s.players[p].g34Protected=(s.players[p].g34Protected||[]).filter(x=>x!==uid);};
 const usable=(s,p,x,c)=>api.canCast(s,p,c,'deck')&&(c.type==='spell'||api.canEnter(s,p,c,{origin:'deck',execution:true})&&(!c.evolution||api.evolutionBases(s,p,c).length));
 const doubleLabel=t=>t.race+'・W・メクレイド'+t.max;
 const doubleOptions=(s,t,ids)=>ids.flatMap(uid=>{
  const x=s.players[t.p].deck.find(y=>y.uid===uid);
  return x?faces(card(x)).flatMap((c,face)=>String(c.race).includes(t.race)&&cost(c)<=t.max
   ?[opt(c.name,{uid,face},20+cost(c),x.cardId)]:[]):[];
 });
 const finishDouble=(s,t)=>put(s,task('g34_Order',t.p,t.source,{ids:t.ids,ordered:[],rest:'bottom'}));
 // Reveal both selections before the first use (QA 45572). The whole look stays reserved.
 function revealDouble(s,t){
  for(const {uid,face} of t.selected){
   const x=s.players[t.p].deck.find(y=>y.uid===uid);
   if(x)api.log(s,t.p,'reveal',doubleLabel(t)+'で使うカードを公開：'+faces(card(x))[face].name,{cardId:x.cardId});
  }
  put(s,{...t,op:prefix+'DoubleRaidUse',remaining:t.selected});
 }
 function useDouble(s,t,v){
  const x=s.players[t.p].deck.find(y=>y.uid===v.uid),c=x&&faces(card(x))[v.face];
  put(s,{...t,remaining:t.remaining.filter(row=>row.uid!==v.uid)});
  if(!c||!usable(s,t.p,x,c))return;
  release(s,t.p,v.uid);
  if(c.evolution||c.neoEvolution)put(s,task('g34_Put',t.p,t.source,{
   origin:'deck',target:v.uid,face:v.face,execution:true,reason:doubleLabel(t)
  }));
  else api.cast(s,t.p,v.uid,true,null,v.face,null,'deck',doubleLabel(t));
 }
 return {
 doubleSelect(s,t){
  const options=doubleOptions(s,t,t.ids.filter(uid=>!t.selected.some(row=>row.uid===uid)));
  if(t.selected.length===2||t.selected.length&&options.length===0){revealDouble(s,t);return;}
  choice(s,t,doubleLabel(t)+'：使うカードを2枚まで選ぶ（'+t.selected.length+'枚選択中）',[
   ...options,opt('ここまでで確定',null,0)
  ]);
 },
 doubleChosen(s,t,v){
  if(v)put(s,{...t,selected:[...t.selected,v]});
  else revealDouble(s,t);
 },
 doubleUse(s,t){
  const own=s.players[t.p];
  const rows=t.remaining.flatMap(v=>{
   const x=own.deck.find(y=>y.uid===v.uid),c=x&&faces(card(x))[v.face];
   return c&&usable(s,t.p,x,c)?[opt(c.name,v,c.evolution?20:30+cost(c),x.cardId)]:[];
  });
  if(rows.length===0)finishDouble(s,t);
  else if(rows.length===1)useDouble(s,t,rows[0].value);
  else choice(s,t,doubleLabel(t)+'：先に使うカードを選ぶ',rows);
 },
 doubleUseChosen:useDouble,
 run(s,t){if(t.op!==prefix+'Raid'&&t.op!==prefix+'RaidPick')return false;const own=s.players[t.p];if(t.op===prefix+'Raid'){const n=api.lookCount?api.lookCount(s,t.p,3):api.deckLocked(s,t.p)?0:3,held=new Set(own.g34Protected||[]),ids=own.deck.filter(x=>!held.has(x.uid)).slice(0,n).map(x=>x.uid);(own.g34Protected??=[]).push(...ids);api.log(s,t.p,'reveal',t.race+'・メクレイド'+t.max+'：'+ids.map(uid=>card(own.deck.find(x=>x.uid===uid)).name).join('・'),{cardId:t.source});put(s,{...t,op:prefix+'RaidPick',ids});}else{const rows=t.ids.flatMap(uid=>{const x=own.deck.find(x=>x.uid===uid);return x?faces(card(x)).flatMap((c,face)=>String(c.race).includes(t.race)&&cost(c)<=t.max&&usable(s,t.p,x,c)?[opt(c.name,{uid,face},20+cost(c),x.cardId)]:[]):[];});choice(s,t,t.race+'・メクレイド'+t.max+'：実行するカードを1枚まで選ぶ',[...rows,skip()]);}return true;},
 chosen(s,t,v){if(t.op!==prefix+'RaidPick')return false;put(s,task('g34_Order',t.p,t.source,{ids:t.ids.filter(uid=>uid!==v?.uid),ordered:[],rest:'bottom'}));if(v){const x=s.players[t.p].deck.find(x=>x.uid===v.uid),c=x&&faces(card(x))[v.face];release(s,t.p,v.uid);if(c&&usable(s,t.p,x,c)){if(t.privateLook)api.log(s,t.p,'reveal','メクレイドで使うカードを公開：'+c.name,{cardId:x.cardId});if(c.evolution||c.neoEvolution)put(s,task('g34_Put',t.p,t.source,{origin:'deck',target:v.uid,face:v.face,execution:true,reason:t.race+'・メクレイド'}));else api.cast(s,t.p,v.uid,true,null,v.face,null,'deck',t.race+'・メクレイド');}}return true;}
 };
}
