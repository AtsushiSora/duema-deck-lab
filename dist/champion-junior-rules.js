// Junior GP: the opponent chooses among declared modes; all pending state is serializable.
export function createJuniorChampionRules(api){
 const {card,cost,effective,creatures,put,task,choice,opt,skip,targetOptions}=api;
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g43_'+op,...more});
 const on=(s,p,x)=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g43_Razel',p,x.cardId)});
 const modeNames=['相手の手札をすべて捨てる','相手のクリーチャーをすべて破壊する','次の相手ターンのマナのアンタップを3枚までにする','相手のシールドを2つブレイクする'];
 const value=(s,p,m)=>m===0?s.players[1-p].hand.length*8:m===1?creatures(s,1-p).reduce((n,x)=>n+10+Math.min(20,cost(card(x))),0):m===2?Math.max(0,s.players[1-p].mana.filter(x=>x.tapped).length-3)*6:s.players[1-p].shields.length?15:-10;
 function run(s,t){if(!t.op.startsWith('g43_'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
 case'g43_Razel':{const selected=t.selected||[];choice(s,{...t,selected},'ラゼル＝ズバイラル：異なる効果を2つ選ぶ（'+selected.length+'/2）',modeNames.flatMap((label,m)=>selected.includes(m)?[]:[opt(label,m,value(s,t.p,m))]));break;}
 case'g43_OpponentMode':choice(s,t,'ラゼル＝ズバイラル：相手が使う効果を1つ選ぶ',t.selected.map(m=>opt(modeNames[m],m,-value(s,t.p,m))));s.decision.player=1-t.p;break;
 case'g43_Mode':if(t.mode===0)put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n:opp.hand.length,all:true}));if(t.mode===1)api.move(s,creatures(s,1-t.p).map(x=>({player:1-t.p,uid:x.uid,to:'grave',destroy:true})));if(t.mode===2)(s.g43UntapLimits??=[]).push({p:1-t.p,turns:opp.turns,source:t.source});if(t.mode===3)queue(s,t,'Shields',{selected:[],n:Math.min(2,opp.shields.length)});break;
 case'g43_Shields':{const ids=(t.selected||[]).filter(uid=>opp.shields.some(x=>x.uid===uid));if(ids.length>=t.n||!opp.shields.some(x=>!ids.includes(x.uid))){if(ids.length)api.interruptBreak(s,1-t.p,ids,task('g43_Done',t.p,t.source));break;}choice(s,{...t,selected:ids},'ブレイクするシールドを2つ選ぶ',opp.shields.flatMap((x,i)=>ids.includes(x.uid)?[]:[opt('シールド'+(i+1),x.uid)]));break;}
 case'g43_Done':break;
 case'g43_Mugen':api.draw(s,t.p,1);queue(s,t,'SkipOffer');break;
 case'g43_SkipOffer':choice(s,t,'夢幻の無：次の自分のターンをとばす？',[opt('次の自分のターンをとばす',true,-25),opt('とばさず、相手が効果を使う',false,-(opp.hand.length?8:0)-creatures(s,1-t.p).length*10-15)]);s.decision.player=1-t.p;break;
 case'g43_MugenTarget':{const hand=opp.hand.length?opp.hand[Math.floor(api.random(s)*opp.hand.length)].uid:null;const more={...t,hand};const opts=targetOptions(s,t.p,creatures(s,1-t.p));if(opts.length)choice(s,more,'山札の下に置く相手のクリーチャーを選ぶ',opts);else queue(s,more,'MugenBottom',{target:null});break;}
 case'g43_MugenBottom':{const ids=[],x=t.hand&&opp.hand.find(x=>x.uid===t.hand),target=opp.battle.find(x=>x.uid===t.target);if(x){api.remove(opp.hand,x.uid);api.clear(x,'deck');api.addZone(s,1-t.p,'deck',x);ids.push(x.uid);}if(target)ids.push(...api.layers(target).map(x=>x.uid));put(s,task('g5OrderBottom',1-t.p,t.source,{uids:ids}),task('g34_Select',t.p,t.source,{zones:['hand','grave'],n:1,optional:true,deploy:true,filter:{creature:true,any:[{color:'水'},{color:'闇'}]},title:'手札・墓地から水または闇のクリーチャーを1体まで出す'}));if(target)api.move(s,[{player:1-t.p,uid:target.uid,to:'deck',destroy:false}]);break;}
 default:throw Error('未実装のジュニア優勝効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g43_'))return false;switch(t.op){
 case'g43_Razel':{const selected=[...t.selected,v];queue(s,t,selected.length===2?'OpponentMode':'Razel',{selected});break;}
 case'g43_OpponentMode':queue(s,t,'Mode',{mode:v});break;
 case'g43_Shields':queue(s,t,'Shields',{selected:[...t.selected,v]});break;
 case'g43_SkipOffer':if(v)(s.g43Skip??=[0,0])[1-t.p]++;else queue(s,t,'MugenTarget');break;
 case'g43_MugenTarget':queue(s,t,'MugenBottom',{target:v});break;
 default:throw Error('未実装のジュニア優勝選択：'+t.op);
 }return true;}
 return {run,chosen,
 effect(s,p,c){if(!c.g43Effect)return false;put(s,task('g43_'+c.g43Effect,p,c.id));return true;},
 entry(s,p,x,options){if(!api.isCreature(s,x))return;for(const w of s.players[p].battle.filter(w=>card(w).g43Suiton&&!api.ignored(s,w)&&api.isCreature(s,w)))if(w.uid!==x.uid||!(options.selfMuted||api.selfStopped(s,p)))api.enqueue(s,p,{uid:w.uid,source:w.cardId,effect:'extended',task:task('g34_Target',p,w.cardId,{tap:true,title:'水雲の聖沌：タップする相手のクリーチャーを選ぶ'})});},
 tapped(s,p,x){if(card(x).g43Razel&&!api.ignored(s,x))on(s,p,x);},
 snapshot(s,rows){return rows.flatMap(r=>{const x=s.players[r.player].battle.find(x=>x.uid===r.uid);return x&&card(x).g43Razel&&!api.ignored(s,x)?[x.uid]:[];});},
 leaving(s,p,x,snapshot){if(snapshot?.includes(x.uid))on(s,p,x);},
 beforeUntap(s,p){const limits=(s.g43UntapLimits||[]).filter(x=>x.p===p&&x.turns<s.players[p].turns);if(!limits.length)return false;s.g43UntapLimits=(s.g43UntapLimits||[]).filter(x=>!limits.includes(x));const uids=s.players[p].mana.filter(x=>x.tapped&&!x.skipUntap&&api.canUntap(x)).map(x=>x.uid);if(uids.length)put(s,task('g4_Untap',p,limits[0].source,{uids,selected:[]}));return true;},
 };
}
