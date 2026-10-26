// Pick the entire set before tapping it; mass effects never target individual creatures.
export function createUtilityBattleRules(api){
 const{card,effective,power,colors,creatures,put,task,choice,opt,targetOptions}=api;
 const enemies=(s,p)=>creatures(s,1-p).filter(x=>!x.sealed);
 // Shield triggers resolve before the attack lifecycle ends.
 const currentPower=(s,x)=>power(x,x.uid===s.attack?.attacker||s.attackLifecycle?.uid===x.uid&&(s.attackLifecycle.incarnation||0)===(x.incarnation||0),s);
 const follow=(t,op,more={})=>({...t,op:'g65_'+op,...more});
 function tapSelected(s,t){for(const ref of t.selected){const x=s.players[1-t.p].battle.find(x=>x.uid===ref.uid&&(x.incarnation||0)===ref.incarnation);if(x)api.tap(s,1-t.p,x);}}
 function run(s,t){if(!t.op.startsWith('g65_'))return false;switch(t.op){
 case'g65_Flame':case'g65_Smash':{const list=enemies(s,t.p).filter(x=>t.op==='g65_Flame'?currentPower(s,x)<=4000:colors(effective(x,s)).length<2);choice(s,t,t.op==='g65_Flame'?'破壊するパワー4000以下の相手を1体まで選ぶ':'破壊する多色ではない相手を1体選ぶ',[...targetOptions(s,t.p,list),...(t.op==='g65_Flame'?[opt('破壊しない',null,0)]:[])]);break;}
 case'g65_Superburst':{const list=enemies(s,t.p).filter(x=>currentPower(s,x)<=2000);if(list.length)api.move(s,list.map(x=>({player:1-t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p})));break;}
 case'g65_Larba':for(const x of enemies(s,t.p).filter(x=>effective(x,s).blocker))api.tap(s,1-t.p,x);break;
 case'g65_CloneLightning':{const copies=s.players.reduce((n,p)=>n+p.grave.filter(x=>card(x).name===card(t.source).name).length,0);put(s,follow(t,'ClonePick',{max:1+copies,selected:[]}));break;}
 case'g65_ClonePick':{const options=targetOptions(s,t.p,enemies(s,t.p).filter(x=>!t.selected.some(y=>y.uid===x.uid)));if(t.selected.length>=t.max||!options.length){tapSelected(s,t);break;}choice(s,t,'タップする相手を選ぶ（'+t.selected.length+'/'+t.max+'、最低1体）',[...options.map(o=>{const list=s.players[1-t.p].battle,x=list.find(x=>x.uid===o.value);return{...o,label:'場'+(list.indexOf(x)+1)+' '+o.label+'（'+(x.tapped?'タップ中':'アンタップ')+'）',score:x.tapped?-5:10+o.score};}),...(t.selected.length?[opt('ここまでで確定',null,0)]:[])]);break;}
 default:throw Error('未実装の戦闘補助効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g65_'))return false;switch(t.op){
 case'g65_Flame':case'g65_Smash':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);break;
 case'g65_ClonePick':if(v){const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)put(s,follow(t,'ClonePick',{selected:[...t.selected,{uid:x.uid,incarnation:x.incarnation||0}]}));}else tapSelected(s,t);break;
 default:throw Error('未実装の戦闘補助選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g65Effect)return false;put(s,task('g65_'+c.g65Effect,p,c.id,{uid}));return true;}};
}
