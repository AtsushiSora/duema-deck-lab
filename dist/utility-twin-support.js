// Target selection and subsequent group moves are separate instructions.
export function createUtilityTwinSupport(api){
 const{card,effective,creatures,put,task,choice,opt}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const follow=(t,op,more={})=>({...t,op:'g88_'+op,...more});
 const name=(s,x)=>{const c=effective(x,s);return c.spellFace||c.name===card(x).name&&card(x).spellFace?c.name.split(/\s*[/／]\s*/)[0]:c.name;};
 const recover=(p,source)=>task('g34_Select',p,source,{origin:'grave',to:'hand',n:1,optional:true,filter:{creature:true},title:'墓地から手札に戻すクリーチャーを1体まで選ぶ'});
 const groupValue=(s,p,selected)=>[p,1-p].reduce((n,owner)=>n+living(s,owner).filter(x=>name(s,x)===name(s,selected)).reduce((v,x)=>v+(owner===p?-1:1)*(10+api.cost(effective(x,s))*3),0),0);
 function run(s,t){if(!t.op.startsWith('g88_'))return false;switch(t.op){
 case'g88_Mad':put(s,recover(t.p,t.source));break;
 case'g88_Cyber':{const options=api.targetOptions(s,t.p,living(s,1-t.p).filter(x=>!x.tapped));if(options.length)choice(s,t,'山札に戻す相手のアンタップしているクリーチャーを1体選ぶ',options);else put(s,follow(t,'CyberFinish',{owner:1-t.p}));break;}
 case'g88_CyberFinish':api.shuffleLibrary(s,t.owner,[],t.source);put(s,task('g34_Draw',t.owner,t.source,{n:1,optional:true,controller:t.controller??t.p}));api.deckCheck(s,t.owner);break;
 case'g88_Spiral':choice(s,t,'同じ名前のクリーチャーをすべて戻す起点を1体選ぶ',api.targetOptions(s,t.p,[...living(s,t.p),...living(s,1-t.p)]).map(o=>({...o,score:groupValue(s,t.p,s.players.flatMap(p=>p.battle).find(x=>x.uid===o.value))})));break;
 case'g88_Squalo':{const moves=[t.p,1-t.p].flatMap(p=>living(s,p).filter(x=>effective(x,s).blocker).map(x=>({player:p,uid:x.uid,to:'hand',destroy:false,controller:t.p})));if(moves.length)api.move(s,moves);break;}
 default:throw Error('未実装の水・ツインパクト補助効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g88_'))return false;switch(t.op){
 case'g88_Cyber':if(v){put(s,follow(t,'CyberFinish',{owner:1-t.p}));api.move(s,[{player:1-t.p,uid:v,to:'deck',destroy:false,controller:t.p}]);}break;
 case'g88_Spiral':{const target=s.players.flatMap(p=>p.battle).find(x=>x.uid===v);if(target){const selected=name(s,target),moves=[t.p,1-t.p].flatMap(p=>living(s,p).filter(x=>name(s,x)===selected).map(x=>({player:p,uid:x.uid,to:'hand',destroy:false,controller:t.p})));if(moves.length)api.move(s,moves);}break;}
 default:throw Error('未実装の水・ツインパクト補助選択：'+t.op);
 }return true;}
 return{run,chosen,playScore(s,p,c){
  if(c.type==='spell'){if(api.spellIgnored(s,c))return 0;const targets=api.targetOptions(s,p,[...living(s,p),...living(s,1-p)].filter(x=>s.players[p].battle.includes(x)||!effective(x,s).spellUntargetable));if(c.g88Effect==='Cyber')return targets.some(o=>s.players[1-p].battle.some(x=>x.uid===o.value&&!x.tapped))?30:0;if(c.g88Effect==='Spiral')return targets.some(o=>groupValue(s,p,s.players.flatMap(p=>p.battle).find(x=>x.uid===o.value))>0)?32:0;}
  if(c.g88Effect==='Squalo'&&!api.selfStopped(s,p)&&!s.players[1-p].battle.some(x=>effective(x,s).entrySilence)){const x=s.players[p].hand.find(x=>x.cardId===c.id);if(x&&!api.ignored(s,x)){const value=who=>living(s,who).filter(x=>effective(x,s).blocker).reduce((n,x)=>n+api.cost(effective(x,s))+1,0);return 38+value(1-p)*4-value(p)*8;}}return null;
 },effect(s,p,c,uid){if(!c.g88Effect)return false;put(s,task('g88_'+c.g88Effect,p,c.id,{uid}));return true;},
 entry(s,p,x,o){if(!api.isCreature(s,x)||!effective(x,s).blocker||o.selfMuted||api.selfStopped(s,p))return;for(const y of living(s,p))if(effective(y,s).g88Lodriess)api.enqueue(s,p,{uid:y.uid,incarnation:y.incarnation||0,source:y.cardId,effect:'extended',task:task('g34_Draw',p,y.cardId,{n:1,optional:true})});},
 spellCast(s,p,c){if(!c.name.includes('ハンド'))return;for(const x of living(s,p))if(effective(x,s).g88Mad)api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g88_Mad',p,x.cardId)});}};
}
