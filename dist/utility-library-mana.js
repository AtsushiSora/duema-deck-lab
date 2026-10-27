// Multiple bounce targets are fixed before moving; Soil is chosen by the affected player.
export function createUtilityLibraryMana(api){
 const{card,creatures,put,task,choice,opt,targetOptions}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const follow=(t,op,more={})=>({...t,op:'g73_'+op,...more});
 function bounce(s,t){const moves=t.selected.filter(r=>s.players[r.p].battle.some(x=>x.uid===r.uid&&(x.incarnation||0)===r.incarnation)).map(r=>({player:r.p,uid:r.uid,to:'hand',destroy:false,controller:t.p}));if(moves.length)api.move(s,moves);}
 function run(s,t){if(!t.op.startsWith('g73_'))return false;const own=s.players[t.p];switch(t.op){
 case'g73_Devil':put(s,follow(t,'Destroy'),task('g34_Mill',t.p,t.source,{n:3,optional:true}));break;
 case'g73_Destroy':choice(s,t,'破壊する相手のクリーチャーを1体選ぶ',targetOptions(s,t.p,living(s,1-t.p)));break;
 case'g73_Sniper':put(s,follow(t,'SniperPick',{selected:[]}));break;
 case'g73_SniperPick':{const options=targetOptions(s,t.p,[t.p,1-t.p].flatMap(p=>living(s,p)).filter(x=>!t.selected.some(r=>r.uid===x.uid)));if(t.selected.length>=2||!options.length){bounce(s,t);break;}choice(s,t,'手札に戻すクリーチャーを2体まで選ぶ（'+t.selected.length+'/2）',[...options.map(o=>{const self=own.battle.some(x=>x.uid===o.value);return{...o,label:(self?'自分：':'相手：')+o.label,score:self?-5-o.score:15+o.score};}),opt('この内容で確定',null,0)]);break;}
 case'g73_Space':{if(api.deckLocked(s,t.p))break;const n=new Set(own.mana.flatMap(x=>api.manaColors(x.faceDown?{civilizations:[],civ:'ゼロ'}:card(x),s,t.p))).size;if(n&&own.deck.length)choice(s,{...t,n},'マナの文明数に応じて山札の上'+n+'枚を見る？',[opt('見る',true,own.deck.length>1?15:-100),opt('見ない',false,0)]);break;}
 case'g73_Soil':{const p=1-t.p;choice(s,{...t,p,op:'g73_SoilPick'},'自分のクリーチャーからマナに置く1体を選ぶ',targetOptions(s,p,living(s,p)).map(o=>({...o,score:-o.score})));break;}
 default:throw Error('未実装の山札・マナ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g73_'))return false;switch(t.op){
 case'g73_Destroy':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);break;
 case'g73_SniperPick':if(v){const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===v)),x=s.players[p]?.battle.find(x=>x.uid===v);if(x)put(s,follow(t,'SniperPick',{selected:[...t.selected,{p,uid:x.uid,incarnation:x.incarnation||0}]}));}else bounce(s,t);break;
 case'g73_Space':if(v)put(s,task('g34_Look',t.p,t.source,{n:t.n,stages:[{to:'hand',n:1}]}));break;
 case'g73_SoilPick':if(v)api.move(s,[{player:t.p,uid:v,to:'mana',destroy:false,controller:t.controller}]);break;
 default:throw Error('未実装の山札・マナ選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g73Effect)return false;put(s,task('g73_'+c.g73Effect,p,c.id,{uid}));return true;}};
}
