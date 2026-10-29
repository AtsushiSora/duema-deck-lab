// Photographed nature cards: mana thresholds, first-attack targeting and Zolge battles.
export function createPhoto160NatureRules(api){
 const{card,cost,effective,put,task,choice,opt}=api;
 const battlePower=(s,x,y)=>api.battlePower(s,x,y,x.uid===s.attack?.attacker);
 const key=x=>x.uid+'@'+(x.incarnation||0),living=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 const event=(p,x,op,more={})=>({player:p,uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g160N_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,event(p,x,op,more));
 const find=(s,p,uid,incarnation)=>living(s,p).find(x=>x.uid===uid&&(incarnation===undefined||(x.incarnation||0)===incarnation));
 const elements=(s,p)=>s.players[p].battle.filter(x=>!x.sealed&&['creature','seed','field','gear'].includes(effective(x,s).type));
 const attacks=(s,p)=>s.g160NAttacks?.[p]?.turn===s.turn?s.g160NAttacks[p].n:0;
 function run(s,t){if(!t.op.startsWith('g160N_'))return false;switch(t.op){
 case'g160N_Guard':{const selected=t.selected||[],index=t.index||0;if(index===2){const rows=selected.filter(r=>s.players[r.player].battle.some(x=>key(x)===key(r))).map(r=>({player:r.player,uid:r.uid,to:'mana',destroy:false,controller:t.p}));if(rows.length)api.move(s,rows);break;}const owner=index===0?t.p:1-t.p;choice(s,{...t,index,selected,owner},'クサビ＝護＝ノヌシ：'+(owner===t.p?'自分':'相手')+'のエレメントを1つまでマナに置く',[...api.targetOptions(s,t.p,elements(s,owner)).map(o=>({...o,score:owner===t.p?-cost(card(o.cardId)):20+cost(card(o.cardId))})),opt('選ばずに進む',null,0)]);break;}
 case'g160N_GuardAttack':{if(s.players[t.p].mana.length<8)break;const owner=1-t.p;choice(s,{...t,owner,p:owner,controller:t.p},'クサビ＝護＝ノヌシ：自分のクリーチャー1体を選び、マナに置く',api.targetOptions(s,owner,living(s,owner)).map(o=>({...o,score:15-cost(card(o.cardId))})));break;}
 case'g160N_Zolge':{const x=find(s,t.p,t.target,t.targetIncarnation);if(!x)break;const rows=[0,1].flatMap(p=>living(s,p)).filter(y=>y.uid!==x.uid);choice(s,t,'ゾルゲ：出したクリーチャーとバトルする別の1体を選ぶ',[...api.targetOptions(s,t.p,rows).map(o=>{const y=rows.find(y=>y.uid===o.value),owner=s.players.findIndex(p=>p.battle.some(z=>z.uid===y.uid)),a=battlePower(s,x,y),b=battlePower(s,y,x),win=owner===t.p?(a>b?x:b>a?y:null):a>b?x:null;return{...o,value:{owner,uid:y.uid,incarnation:y.incarnation||0},score:owner===t.p?(win&&effective(win,s).g160NRole==='enoki'?30:-20-cost(card(a>b?y:x))):a>b?30+cost(card(y))*3:a===b?cost(card(y))-cost(card(x)):-30-cost(card(x))};}),opt('バトルしない',null,0)]);break;}
 default:throw Error('未対応の自然写真カード効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g160N_'))return false;switch(t.op){
 case'g160N_Guard':{const x=v&&s.players[t.owner].battle.find(x=>x.uid===v);put(s,{...t,index:t.index+1,selected:x?[...t.selected,{player:t.owner,uid:x.uid,incarnation:x.incarnation||0}]:t.selected});break;}
 case'g160N_GuardAttack':if(v&&s.players[t.owner].battle.some(x=>x.uid===v))api.move(s,[{player:t.owner,uid:v,to:'mana',destroy:false,controller:t.controller}]);break;
 case'g160N_Zolge':{if(!v)break;const a=find(s,t.p,t.target,t.targetIncarnation),b=find(s,v.owner,v.uid,v.incarnation);if(a&&b&&a.uid!==b.uid)api.battle(s,t.p,a,v.owner,b,s.attack?.attacker);break;}
 default:throw Error('未対応の自然写真カード選択：'+t.op);
 }return true;}
 return{run,chosen,
 effect(s,p,c,uid,entry){if(!c.g160NRole)return false;switch(c.g160NRole){case'guard':put(s,task('g160N_Guard',p,c.id,{uid,index:0,selected:[]}));return true;case'take':put(s,task('g34_Ramp',p,c.id,{n:1,tapped:true}));return true;case'zolge':{const x=find(s,p,uid);put(s,task('g160N_Zolge',p,c.id,{uid,target:uid,targetIncarnation:x?.incarnation||0}));return true;}default:return false;}},
 decorate(s,p,x,c){if(c.g160NRole==='enoki')return{...c,power:c.power+s.players[p].mana.length*1000};if(c.g160NRole==='take'&&s.players[p].mana.length>=8)return{...c,power:c.power+5000,breaker:Math.max(c.breaker||1,2)};return c;},
 entry(s,p,x,options={}){if(!api.isCreature(s,x))return;for(const w of living(s,p))if(w.uid!==x.uid&&effective(w,s).g160NRole==='zolge')on(s,p,w,'Zolge',{target:x.uid,targetIncarnation:x.incarnation||0});},
 attack(s,p,x){(s.g160NAttacks??=[null,null])[p]={turn:s.turn,n:attacks(s,p)+1};for(const w of living(s,1-p))if(effective(w,s).g160NRole==='guard')on(s,1-p,w,'GuardAttack');},
 battleWins(s,p,w){const x=w&&find(s,p,w.uid);return x&&effective(x,s).g160NRole==='enoki'?[{player:p,uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g34_Ramp',p,x.cardId,{n:5,optional:true})}]:[];},
 forceActions(s,p,actions){if(attacks(s,p))return actions;const ids=new Set(living(s,1-p).filter(x=>effective(x,s).g160NRole==='enoki').map(x=>x.uid)),forced=new Set(actions.filter(a=>a.kind==='attack'&&ids.has(a.target)).map(a=>a.uid));return actions.filter(a=>a.kind!=='attack'||!forced.has(a.uid)||ids.has(a.target));}
 };
}
