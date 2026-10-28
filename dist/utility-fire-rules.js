// Selected creatures move together; the Arrow's shield cost follows its destruction.
export function createUtilityFireRules(api){
 const{card,cost,effective,power,creatures,put,task,choice,opt,targetOptions}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const currentPower=(s,x)=>power(x,x.uid===s.attack?.attacker||s.attackLifecycle?.uid===x.uid&&(s.attackLifecycle.incarnation||0)===(x.incarnation||0),s);
 const follow=(t,op,more={})=>({...t,op:'g75_'+op,...more});
 const key=x=>x.uid+'@'+(x.incarnation||0);
 function destroySelected(s,t){const moves=t.selected.filter(r=>s.players[1-t.p].battle.some(x=>key(x)===key(r))).map(r=>({player:1-t.p,uid:r.uid,to:'grave',destroy:true,controller:t.p}));if(moves.length)api.move(s,moves);}
 function run(s,t){if(!t.op.startsWith('g75_'))return false;const own=s.players[t.p];switch(t.op){
 case'g75_Kiryu':for(const x of living(s,t.p))(x.g34Grants??=[]).push({turn:s.turn,speedAttacker:true,slayer:true,destroyToMana:true});break;
 case'g75_Dolbo':put(s,follow(t,'Destroy',{limit:6000}),follow(t,'ReturnLarge'));break;
 case'g75_ReturnLarge':choice(s,t,'手札に戻すパワー6000より大きい相手クリーチャーを1体選ぶ',targetOptions(s,t.p,living(s,1-t.p).filter(x=>currentPower(s,x)>6000)));break;
 case'g75_Arrow':put(s,follow(t,'Destroy',{limit:6000,both:true}),follow(t,'BurnShield'));break;
 case'g75_Meteor':put(s,follow(t,'Destroy',{limit:6000,blocker:true}));break;
 case'g75_Rush':put(s,follow(t,'Destroy',{limit:6000}),task('discard',t.p,t.source,{n:1,causedBy:t.p}));break;
 case'g75_Burst':put(s,follow(t,'Sweep',{limit:3000}),follow(t,'BurstDraw'));break;
 case'g75_BurstDraw':if(living(s,t.p).some(x=>currentPower(s,x)>=6000))api.draw(s,t.p,1);break;
 case'g75_Spear':put(s,follow(t,'Sweep',{limit:4000,both:true}));break;
 case'g75_Shark':put(s,follow(t,'Sweep',{limit:2000,both:true,to:'hand'}));break;
 case'g75_Duel':put(s,follow(t,'Sweep',{blockers:true,both:true}));break;
 case'g75_Sweep':{const rows=(t.both?[t.p,1-t.p]:[1-t.p]).flatMap(p=>living(s,p).filter(x=>t.blockers?effective(x,s).blocker:currentPower(s,x)<=t.limit).map(x=>({player:p,uid:x.uid,to:t.to||'grave',destroy:(t.to||'grave')==='grave',controller:t.p})));if(rows.length)api.move(s,rows);break;}
 case'g75_Destroy':{const list=(t.both?[t.p,1-t.p]:[1-t.p]).flatMap(p=>living(s,p)).filter(x=>currentPower(s,x)<=t.limit&&(!t.blocker||effective(x,s).blocker));choice(s,t,'破壊するパワー'+t.limit+'以下'+(t.blocker?'のブロッカー':'のクリーチャー')+'を1体選ぶ',targetOptions(s,t.p,list).map(o=>({...o,label:(own.battle.some(x=>x.uid===o.value)?'自分：':'相手：')+o.label,score:own.battle.some(x=>x.uid===o.value)?-10-o.score:15+o.score})));break;}
 case'g75_BurnShield':choice(s,t,'墓地に置く自分のシールドを1つ選ぶ（S・トリガーは使えません）',own.shields.map((x,i)=>opt('シールド '+(i+1)+'（カード'+api.shieldCards(x).length+'枚）',x.uid,-api.shieldCards(x).length)));break;
 case'g75_Scrapper':put(s,follow(t,'CostPick',{selected:[],total:0}));break;
 case'g75_CostPick':{const list=living(s,1-t.p).filter(x=>!t.selected.some(r=>r.uid===x.uid)&&cost(card(x))+t.total<=6),options=targetOptions(s,t.p,list);if(!options.length){destroySelected(s,t);break;}choice(s,t,'破壊する相手をコスト合計6以下で選ぶ（現在'+t.total+'）',[...options.map(o=>({...o,score:o.score+10})),opt('この内容で破壊する',null,0)]);break;}
 case'g75_Lion':choice(s,t,'獅子幻獣砲：使う効果を選ぶ',[opt('パワー2000以下の相手を1体破壊する','creature',targetOptions(s,t.p,living(s,1-t.p).filter(x=>currentPower(s,x)<=2000)).length?25:-5),opt('相手のクロスギアを1枚墓地に置く','gear',targetOptions(s,t.p,s.players[1-t.p].battle.filter(x=>card(x).type==='gear'&&!x.sealed)).length?25:-5)]);break;
 case'g75_Gear':choice(s,t,'墓地に置く相手のクロスギアを1枚選ぶ',targetOptions(s,t.p,s.players[1-t.p].battle.filter(x=>card(x).type==='gear'&&!x.sealed)));break;
 case'g75_Return':{const x=own.battle.find(x=>key(x)===key(t)||(x.g47ElementRefs||[]).some(r=>key(r)===key(t)));if(x&&!x.sealed)api.move(s,[{player:t.p,uid:x.uid,to:'hand',destroy:false,controller:t.p}]);break;}
 default:throw Error('未実装の火の除去効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g75_'))return false;switch(t.op){
 case'g75_Destroy':if(v){const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(p>=0)api.move(s,[{player:p,uid:v,to:'grave',destroy:true,controller:t.p}]);}break;
 case'g75_ReturnLarge':if(v)api.move(s,[{player:1-t.p,uid:v,to:'hand',destroy:false,controller:t.p}]);break;
 case'g75_BurnShield':if(v)api.moveShield(s,t.p,v,'grave');break;
 case'g75_CostPick':if(v){const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)put(s,follow(t,'CostPick',{selected:[...t.selected,{uid:x.uid,incarnation:x.incarnation||0}],total:t.total+cost(card(x))}));}else destroySelected(s,t);break;
 case'g75_Lion':put(s,v==='gear'?follow(t,'Gear'):follow(t,'Destroy',{limit:2000}));break;
 case'g75_Gear':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:false,controller:t.p}]);break;
 default:throw Error('未実装の火の除去選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g75Effect)return false;put(s,task('g75_'+c.g75Effect,p,c.id,{uid}));return true;},
 end(s){return living(s,s.active).filter(x=>effective(x,s).g75Exze).map(x=>({player:s.active,uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g75_Return',s.active,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}));}};
}
