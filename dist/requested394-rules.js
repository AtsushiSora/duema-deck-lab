// All keep choices and discard replacements precede the three-zone removal.
export function createRequested394Rules(api){
 const{card,cost,effective,creatures,put,task,choice,opt,enqueue}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),ref=x=>({uid:x.uid,incarnation:x.incarnation||0});
 const queue=(s,p,x,op,more={})=>enqueue(s,p,{player:p,...ref(x),source:x.cardId,effect:'extended',task:task('g394_'+op,p,x.cardId,{...ref(x),...more})});
 const canDiscardDeploy=(s,t,x)=>api.canEnter(s,t.p,card(x),{origin:'hand',execution:false});
 const defs=(s,t,rows)=>put(s,...rows.map(({op,...d})=>task('g34_'+op,t.p,t.source,{uid:t.uid,incarnation:t.incarnation||0,...d})));
 function keep(s,t){
  const owner=1-t.actor,own=s.players[owner],zones=['shields','hand','battle'],limits=[3,2,1],zone=zones[t.stage];
  if(zone==='hand'&&api.handProtected(s,{p:owner,causedBy:t.actor,source:t.source})){put(s,{...t,stage:t.stage+1,kept:{...t.kept,hand:own.hand.map(x=>x.uid)}});return;}
  if(!zone){put(s,{...t,p:t.actor,op:'g394_DiscardPlans',plans:{}});return;}
  const rows=zone==='battle'?creatures(s,owner).filter(x=>!x.sealed):own[zone],selected=t.kept[zone]||[],n=Math.min(limits[t.stage],rows.length);
  if(selected.length>=n||rows.length<=n){put(s,{...t,op:'g394_Keep',stage:t.stage+1,kept:{...t.kept,[zone]:rows.length<=n?rows.map(x=>x.uid):selected}});return;}
  const available=rows.filter(x=>!selected.includes(x.uid));
  choice(s,{...t,p:owner},'ジャオウガ：残す'+({shields:'シールド',hand:'手札',battle:'クリーチャー'}[zone])+'を'+n+(zone==='battle'?'体':zone==='hand'?'枚':'つ')+'選ぶ（'+selected.length+'/'+n+'）',available.map(x=>opt(zone==='shields'?'シールド '+(own.shields.indexOf(x)+1)+'（カード'+api.shieldCards(x).length+'枚）':card(x).name,x.uid,zone==='shields'?api.shieldCards(x).length:cost(card(x))*3,x.faceDown||zone==='shields'?null:x.cardId)));
 }
 function planDiscard(s,t){
  const owner=1-t.actor,own=s.players[owner],event={p:owner,causedBy:t.actor,source:t.source};
  const rows=api.handProtected(s,event)?[]:own.hand.filter(x=>!t.kept.hand.includes(x.uid));
  const x=rows.find(x=>!Object.hasOwn(t.plans,x.uid)&&api.discardMode(s,event,x)==='optional'&&canDiscardDeploy(s,event,x));
  if(x){choice(s,{...t,p:owner},card(x).name+'を捨てるかわりに出す？',[opt('バトルゾーンに出す',x.uid,25,x.cardId),opt('そのまま捨てる',null,0)]);return;}
  const after={kind:'g394Cut',actor:t.actor,p:owner,source:t.source,shields:own.shields.filter(x=>!t.kept.shields.includes(x.uid)).map(x=>x.uid),hand:rows.map(x=>x.uid),plans:t.plans};
  // Freeze creature candidates before a discarded creature can enter (QA46609).
  api.move(s,creatures(s,owner).filter(x=>!x.sealed&&!t.kept.battle.includes(x.uid)).map(x=>({player:owner,uid:x.uid,to:'grave',destroy:true,controller:t.actor})),after);
 }
 function run(s,t){if(!t.op.startsWith('g394_'))return false;switch(t.op){
  case'g394_Keep':keep(s,t);break;
  case'g394_Baigya':defs(s,t,[{op:'Draw',n:1},{op:'Target',to:'deck',title:'山札の下に置く相手のクリーチャーを1体選ぶ'}]);break;
  case'g394_DiscardPlans':planDiscard(s,t);break;
  case'g394_Attack':defs(s,t,[{op:'Offer',g186GraveMill:true,title:'山札の上2枚を墓地に置く？',defs:[{op:'Mill',n:2}]},{op:'Select',origin:'grave',deploy:true,n:1,noEvolve:true,filter:{creature:true,nonEvolution:true,max:6,any:[{color:'闇'},{color:'火'}]},title:'墓地から出す闇か火のコスト6以下の進化ではないクリーチャーを1体選ぶ'}]);break;
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g394_'))return false;if(t.op==='g394_Keep'){const zone=['shields','hand','battle'][t.stage];put(s,{...t,p:t.actor,kept:{...t.kept,[zone]:[...(t.kept[zone]||[]),v]}});}else if(t.op==='g394_DiscardPlans'){const own=s.players[t.p],x=own.hand.find(x=>!t.kept.hand.includes(x.uid)&&!Object.hasOwn(t.plans,x.uid)&&api.discardMode(s,{p:t.p,causedBy:t.actor,source:t.source},x)==='optional'&&canDiscardDeploy(s,t,x));if(x)put(s,{...t,p:t.actor,plans:{...t.plans,[x.uid]:!!v}});}return true;}
 return{run,chosen,
  effect(s,p,c,uid){if(!c.g394Jao)return false;put(s,task('g394_Keep',p,c.id,{actor:p,controller:p,uid,stage:0,kept:{}}));return true;},
  attack(s,p,x){const n=s.g393DUnitAttacks?.[key(x)];if(!x.sealed&&!api.selfStopped(s,p)&&effective(x,s).g394Jao&&n?.turn===s.turn&&n.n===1)queue(s,p,x,'Attack');},
  shieldLeft(s,p,x,group){if(group==null)return;for(const y of creatures(s,p)){const c=effective(y,s);if(!y.sealed&&c.g394ExLife&&!api.ignored(s,y)&&api.allLayers(y).some(z=>(z.exLifeShieldUids||[z.exLifeShieldUid]).includes(group))){const n=Number(!!card(y.cardId).g394ExLife)+(y.g393JCopies||[]).filter(r=>card(r.cardId)?.g394ExLife).length;for(let i=0;i<(n||1);i++)queue(s,p,y,'Baigya');}}},
  finishZones(s,t){
   const own=s.players[t.p];for(const uid of t.shields)api.moveShield(s,t.p,uid,'grave');
   for(const uid of t.hand){
    const x=own.hand.find(x=>x.uid===uid);if(!x)continue;
    const event={p:t.p,causedBy:t.actor,controller:t.actor,source:t.source,n:1};
    if((t.plans[uid]||api.discardMode(s,event,x)==='mandatory')&&canDiscardDeploy(s,event,x))api.replaceDiscard(s,event,x);
    else api.discardCard(s,event,x);
   }
  }
 };
}
