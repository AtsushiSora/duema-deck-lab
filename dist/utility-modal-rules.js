// Conditional modes use the current board; power-budget choices remain serializable.
export function createUtilityModalRules(api){
 const{card,cost,effective,power,creatures,put,task,choice,opt,targetOptions}=api;
 const follow=(t,op,more={})=>({...t,op:'g69_'+op,...more});
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const live=(s,t)=>s.players[t.p].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===(t.incarnation||0));
 const currentPower=(s,x)=>power(x,x.uid===s.attack?.attacker||s.attackLifecycle?.uid===x.uid&&(s.attackLifecycle.incarnation||0)===(x.incarnation||0),s);
 const both=(s,p)=>[p,1-p].flatMap(q=>living(s,q));
 function finishHell(s,t){const refs=t.selected.filter(r=>s.players[1-t.p].battle.some(x=>x.uid===r.uid&&(x.incarnation||0)===r.incarnation));if(refs.length)api.move(s,refs.map(r=>({player:1-t.p,uid:r.uid,to:'grave',destroy:true,controller:t.p})));}
 function run(s,t){if(!t.op.startsWith('g69_'))return false;const own=s.players[t.p];switch(t.op){
 case'g69_Burster':if(live(s,t))choice(s,t,'アクア・バースターを破壊して、クリーチャー1体を手札に戻す？',[opt('破壊する',true,targetOptions(s,t.p,living(s,1-t.p)).length?25:-10),opt('破壊しない',false,0)]);break;
 case'g69_Bounce':choice(s,t,'持ち主の手札に戻すクリーチャーを1体選ぶ',targetOptions(s,t.p,both(s,t.p)).map(o=>({...o,score:own.battle.some(x=>x.uid===o.value)?-5-cost(card(own.battle.find(x=>x.uid===o.value))):15+o.score})));break;
 case'g69_Variant':if(own.mana.length>=7){for(const x of living(s,1-t.p))api.tap(s,1-t.p,x);}else choice(s,t,'タップする相手を1体選ぶ',targetOptions(s,t.p,living(s,1-t.p)).map(o=>{const x=s.players[1-t.p].battle.find(x=>x.uid===o.value);return{...o,label:o.label+'（'+(x.tapped?'タップ中':'アンタップ')+'）',score:x.tapped?-5:10+o.score};}));break;
 case'g69_Spiral':{const evolved=living(s,t.p).some(api.isEvolution),safe=own.deck.length>2,win=living(s,t.p).some(x=>effective(x,s).shako),draw=safe?24:win?100:-100,bounce=targetOptions(s,t.p,living(s,1-t.p)).length?30:-10;choice(s,t,'爆進エナジー・スパイラル：使う効果を選ぶ',[opt('カードを2枚引く','draw',draw),opt('クリーチャー1体を手札に戻す','bounce',bounce),...(evolved?[opt('両方を使う','both',safe||win?draw+bounce:-100)]:[])]);break;}
 case'g69_Hell':put(s,follow(t,'HellPick',{selected:[],total:0}));break;
 case'g69_HellPick':{const total=t.total==='-∞'?-Infinity:t.total,options=targetOptions(s,t.p,living(s,1-t.p).filter(x=>{const n=currentPower(s,x);return !t.selected.some(r=>r.uid===x.uid)&&n!==Infinity&&total+n<=8000;}));if(!options.length){finishHell(s,t);break;}choice(s,t,'合計パワー8000以下で破壊する相手を選ぶ（現在'+t.total+'）',[...options.map(o=>{const x=s.players[1-t.p].battle.find(x=>x.uid===o.value);return{...o,label:o.label+'（パワー'+currentPower(s,x)+'）'};}),opt('この内容で破壊する',null,0)]);break;}
 default:throw Error('未実装の選択式ユーティリティ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g69_'))return false;switch(t.op){
 case'g69_Burster':{const x=live(s,t);if(v&&x){put(s,follow(t,'Bounce'));api.move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);}break;}
 case'g69_Bounce':if(v){const owner=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(owner>=0)api.move(s,[{player:owner,uid:v,to:'hand',destroy:false,controller:t.p}]);}break;
 case'g69_Variant':if(v)api.tap(s,1-t.p,s.players[1-t.p].battle.find(x=>x.uid===v));break;
 case'g69_Spiral':put(s,...(['draw','both'].includes(v)?[task('g34_Draw',t.p,t.source,{n:2})]:[]),...(['bounce','both'].includes(v)?[follow(t,'Bounce')]:[]));break;
 case'g69_HellPick':if(v){const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x){const n=(t.total==='-∞'?-Infinity:t.total)+currentPower(s,x);put(s,follow(t,'HellPick',{selected:[...t.selected,{uid:x.uid,incarnation:x.incarnation||0}],total:n===-Infinity?'-∞':n}));}}else finishHell(s,t);break;
 default:throw Error('未実装の選択式ユーティリティ選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid,entry){if(!c.g69Effect)return false;put(s,task('g69_'+c.g69Effect,p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;}};
}
