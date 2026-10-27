// Targets are fixed before tapping; conditional G Zero uses both public battle zones.
export function createUtilityGuardRules(api){
 const{card,cost,faces,creatures,put,task,choice,opt}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed),follow=(t,op,more={})=>({...t,op:'g81_'+op,...more});
 function tapSelected(s,t){for(const ref of t.selected){const x=s.players[1-t.p].battle.find(x=>x.uid===ref.uid&&(x.incarnation||0)===ref.incarnation);if(x)api.tap(s,1-t.p,x);}}
 function run(s,t){if(!t.op.startsWith('g81_'))return false;const own=s.players[t.p];switch(t.op){
 case'g81_Saiphos':{const list=api.canMoveZone(s,t.p,'mana')?own.mana.filter(x=>!x.faceDown&&faces(card(x)).some(c=>c.type==='spell')):[];choice(s,t,'マナから手札に戻す呪文を1枚まで選ぶ',[...list.map(x=>opt(card(x).name,x.uid,15+Math.min(cost(card(x)),30),x.cardId)),opt('戻さない',null,0)]);break;}
 case'g81_Corteo':put(s,follow(t,'TapPick',{n:living(s,t.p).length,selected:[]}));break;
 case'g81_TapPick':{const options=api.targetOptions(s,t.p,living(s,1-t.p).filter(x=>!t.selected.some(r=>r.uid===x.uid)));if(t.selected.length>=t.n||!options.length){tapSelected(s,t);break;}choice(s,t,'相手のクリーチャーを'+t.n+'体まで選んでタップ（'+t.selected.length+'/'+t.n+'）',[...options.map(o=>{const x=s.players[1-t.p].battle.find(x=>x.uid===o.value);return{...o,label:o.label+'（'+(x.tapped?'タップ中':'アンタップ')+'）',score:x.tapped?-5:15+o.score};}),opt('この内容で確定',null,0)]);break;}
 default:throw Error('未実装の光の防御補助効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g81_'))return false;switch(t.op){
 case'g81_Saiphos':if(v&&api.canMoveZone(s,t.p,'mana')){const x=api.remove(s.players[t.p].mana,v);if(x){api.clear(x,'hand');api.addZone(s,t.p,'hand',x);}}break;
 case'g81_TapPick':if(v){const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)put(s,follow(t,'TapPick',{selected:[...t.selected,{uid:x.uid,incarnation:x.incarnation||0}]}));}else tapSelected(s,t);break;
 default:throw Error('未実装の光の防御補助選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g81Effect)return false;put(s,task('g81_'+c.g81Effect,p,c.id,{uid}));return true;},
 decorate(s,p,x,c){if(c.type!=='creature'||!c.blocker||x.sealed)return c;const n=living(s,p).filter(y=>y.uid!==x.uid&&card(y).g81Muru&&!api.ignored(s,y)).length;return n?{...c,power:c.power+3000*n}:c;},
 mainActions(s,p){if(![0,1].some(q=>living(s,q).some(x=>/エンジェル・コマンド/.test(api.effective(x,s).race||''))))return[];return s.players[p].hand.filter(x=>card(x).g81Webius&&api.canCast(s,p,card(x),'hand')&&api.canEnter(s,p,card(x),{origin:'hand',execution:true})).map(x=>({kind:'play',uid:x.uid,cardId:x.cardId,cost:0,freeSummon:'G・ゼロ',label:card(x).name+'をG・ゼロで召喚'}));}};
}
