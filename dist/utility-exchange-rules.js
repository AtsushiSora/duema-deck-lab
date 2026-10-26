// All targets are selected before the simultaneous tap or mana recovery.
export function createUtilityExchangeRules(api){
 const{card,cost,put,task,choice,opt}=api;
 const follow=(t,op,more={})=>({...t,op:'g66_'+op,...more});
 function tap(s,t){for(const ref of t.selected){const x=s.players[1-t.p].battle.find(x=>x.uid===ref.uid&&(x.incarnation||0)===ref.incarnation);if(x)api.tap(s,1-t.p,x);}}
 function recover(s,t){if(!api.canMoveZone(s,t.p,'mana'))return;for(const uid of t.selected){const x=api.remove(s.players[t.p].mana,uid);if(x){api.clear(x,'hand');api.addZone(s,t.p,'hand',x);}}}
 function run(s,t){if(!t.op.startsWith('g66_'))return false;const own=s.players[t.p];switch(t.op){
 case'g66_Rainbow':put(s,follow(t,'TapPick',{selected:[]}),follow(t,'RainbowDraw'));break;
 case'g66_TapPick':{const options=api.targetOptions(s,t.p,api.creatures(s,1-t.p).filter(x=>!x.sealed&&!t.selected.some(y=>y.uid===x.uid)));if(t.selected.length>=2||!options.length){tap(s,t);break;}choice(s,t,'タップする相手を2体まで選ぶ（'+t.selected.length+'/2）',[...options.map(o=>{const list=s.players[1-t.p].battle,x=list.find(x=>x.uid===o.value);return{...o,label:'場'+(list.indexOf(x)+1)+' '+o.label+'（'+(x.tapped?'タップ中':'アンタップ')+'）',score:x.tapped?-5:10+o.score};}),opt('ここまでで確定',null,0)]);break;}
 case'g66_RainbowDraw':if(own.mana.filter(x=>api.manaColors(card(x),s,t.p).length>1).length>=2)api.draw(s,t.p,2);break;
 case'g66_Hurricane':{let n=0;if(api.canMoveZone(s,t.p,'hand'))for(const x of [...own.hand]){api.remove(own.hand,x.uid);const to=api.manaRedirect(s,t.p)?'grave':'mana';api.clear(x,to);api.addZone(s,t.p,to,x);if(to==='mana'){n++;api.handMana(s,t.p,x);}}if(n)put(s,follow(t,'ManaPick',{n,selected:[]}));break;}
 case'g66_ManaPick':{if(!api.canMoveZone(s,t.p,'mana'))break;const list=own.mana.filter(x=>!t.selected.includes(x.uid));if(t.selected.length>=t.n||!list.length){recover(s,t);break;}choice(s,t,'マナから手札に戻すカードを'+t.n+'枚選ぶ（'+t.selected.length+'/'+t.n+'）',list.map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,x.faceDown?10:15+Math.min(cost(card(x)),30),x.faceDown?null:x.cardId)));break;}
 default:throw Error('未実装の入れ替え・防御効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g66_'))return false;switch(t.op){
 case'g66_TapPick':if(v){const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)put(s,follow(t,'TapPick',{selected:[...t.selected,{uid:x.uid,incarnation:x.incarnation||0}]}));}else tap(s,t);break;
 case'g66_ManaPick':put(s,follow(t,'ManaPick',{selected:[...t.selected,v]}));break;
 default:throw Error('未実装の入れ替え・防御選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g66Effect)return false;put(s,task('g66_'+c.g66Effect,p,c.id,{uid}));return true;}};
}
