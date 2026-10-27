// A revealed top card is reserved until the optional deployment finishes.
export function createUtilityRaidRules(api){
 const{card,effective,creatures,put,task,choice,opt}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const follow=(t,op,more={})=>({...t,op:'g87_'+op,...more});
 const available=own=>{const held=new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));return own.deck.filter(x=>!held.has(x.uid));};
 const raiserTarget=(s,p,x)=>card(x).type==='creature'&&/ドラゴン/.test(card(x).race||'')&&!api.isEvolution(x)&&api.canEnter(s,p,card(x),{origin:'deck',execution:false});
 function run(s,t){if(!t.op.startsWith('g87_'))return false;const own=s.players[t.p];switch(t.op){
 case'g87_Raiser':{if(api.deckLocked(s,t.p))break;const x=available(own)[0];if(!x)break;api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(x).name,{cardId:x.cardId});if(raiserTarget(s,t.p,x)){(own.g34Protected??=[]).push(x.uid);choice(s,follow(t,'RaiserPick',{target:x.uid}),'公開した'+card(x).name+'を出す？',[opt('バトルゾーンに出す',true,own.deck.length>1?25:-100,x.cardId),opt('山札の上に残す',false,0,x.cardId)]);}break;}
 case'g87_RaiserFinish':own.g34Protected=(own.g34Protected||[]).filter(uid=>uid!==t.target);api.deckCheck(s,t.p);break;
 case'g87_Tiger':case'g87_Crimson':{const moves=(t.op==='g87_Tiger'?[1-t.p]:[t.p,1-t.p]).flatMap(p=>living(s,p).filter(x=>t.op==='g87_Tiger'?api.power(x,x.uid===s.attack?.attacker,s)<=2000:effective(x,s).blocker).map(x=>({player:p,uid:x.uid,to:'grave',destroy:true,controller:t.p})));if(moves.length)api.move(s,moves);break;}
 case'g87_Anima':choice(s,t,'シールドをさらに1枚ブレイクする自分のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,living(s,t.p)).map(o=>{const x=own.battle.find(x=>x.uid===o.value),c=effective(x,s);return{...o,score:o.score+(!x.tapped&&!c.noAttack&&!c.noPlayerAttack&&(x.entered!==s.turn||c.speedAttacker||api.isEvolution(x))?40:0)};}));break;
 default:throw Error('未実装の攻撃・防御補助効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g87_'))return false;const own=s.players[t.p];switch(t.op){
 case'g87_RaiserPick':{const x=own.deck.find(x=>x.uid===t.target);if(v&&x&&raiserTarget(s,t.p,x))put(s,task('g34_Put',t.p,t.source,{origin:'deck',target:x.uid}),follow(t,'RaiserFinish'));else put(s,follow(t,'RaiserFinish'));break;}
 case'g87_Anima':{const x=own.battle.find(x=>x.uid===v);if(x)(x.g34Grants??=[]).push({turn:s.turn,g87ExtraBreak:1});break;}
 default:throw Error('未実装の攻撃・防御補助選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g87Effect)return false;put(s,task('g87_'+c.g87Effect,p,c.id,{uid}));return true;},
 decorate(s,p,x,c){const n=(x.g34Grants||[]).filter(g=>g.turn===s.turn).reduce((n,g)=>n+(g.g87ExtraBreak||0),0);return n?{...c,extraBreak:(c.extraBreak||0)+n}:c;},
 attack(s,p,x){if(effective(x,s).g87Raiser&&!api.selfStopped(s,p))api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g87_Raiser',p,x.cardId)});}};
}
