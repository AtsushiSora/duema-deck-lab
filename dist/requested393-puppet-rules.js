// Grave-departure observation is based on physical UIDs and zone serials, including bulk moves.
export function createRequested393PuppetRules(api){
 const{card,effective,put,task,choice,opt,skip}=api;
 const defs=(s,t,rows)=>put(s,...rows.map(({op,...d})=>task('g34_'+op,t.p,t.source,{...d,uid:t.uid,incarnation:t.incarnation||0})));
 function run(s,t){if(!t.op.startsWith('g393P_'))return false;switch(t.op){
  case'g393P_NagaEntry':choice(s,t,'山札の上3枚を墓地に置き、水か闇のカード1枚を墓地から手札に戻す？',[opt('使う',true,s.players[t.p].deck.length>3?15:-1000),skip()]);break;
  case'g393P_NagaFirst':defs(s,t,[{op:'Choose',g184Modes:true,modes:[{label:'相手が自身の手札1枚を捨てる',defs:[{op:'Discard',n:1}]},{label:'カードを1枚引く',defs:[{op:'Draw',n:1}]}]}]);break;
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g393P_'))return false;if(t.op==='g393P_NagaEntry'&&v)defs(s,t,[{op:'Mill',n:3},{op:'Select',origin:'grave',to:'hand',n:1,filter:{any:[{anyFaceColor:'水'},{anyFaceColor:'闇'}]},title:'墓地から手札に戻す水か闇のカードを1枚選ぶ'}]);return true;}
 const sources=(s,p)=>s.players[p].battle.filter(x=>!x.sealed&&!api.ignored(s,x)&&effective(x,s).g393PNaga).map(x=>({uid:x.uid,incarnation:x.incarnation||0,source:x.cardId}));
 return{run,chosen,
  effect(s,p,c,uid){if(!c.g393PNaga)return false;const x=s.players[p].battle.find(x=>x.uid===uid);put(s,task('g393P_NagaEntry',p,c.id,{uid,incarnation:x?.incarnation||0}));return true;},
  graveSnapshot(s){return s.players.map((own,p)=>s.g393PGraveFirst?.[p]===s.turn?null:{rows:own.grave.map(x=>[x.uid,x.zoneSerial||0]),sources:sources(s,p)});},
  graveObserved(s,before){if(!before)return false;let queued=false;for(let p=0;p<2;p++){const row=before[p];if(!row||s.g393PGraveFirst?.[p]===s.turn)continue;const now=new Map(s.players[p].grave.map(x=>[x.uid,x.zoneSerial||0]));if(!row.rows.some(([uid,serial])=>!now.has(uid)||now.get(uid)!==serial))continue;(s.g393PGraveFirst??={})[p]=s.turn;for(const x of row.sources){queued=true;api.enqueue(s,p,{...x,effect:'extended',task:task('g393P_NagaFirst',p,x.source,x)});}}return queued;}
 };
}
