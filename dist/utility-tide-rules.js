// Only newly moved cards are ordered; existing hidden library cards never enter these choices.
export function createUtilityTideRules(api){
 const{card,cost,effective,creatures,put,task,choice,opt,targetOptions}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const follow=(t,op,more={})=>({...t,op:'g76_'+op,...more});
 const key=x=>x.uid+'@'+(x.incarnation||0);
 // Avoid effective-card recursion while resolving a creature's own continuous power bonus.
 const monoWater=(s,p)=>{const all=s.players[p].battle.some(x=>!x.sealed&&(card(x).casablanca||card(x).g51Courtney)&&!api.ignored(s,x));return s.players[p].mana.every(x=>all||api.manaColors(x.faceDown?{civilizations:[],civ:'ゼロ'}:card(x)).includes('水'));};
 function finishOrder(s,t,ids){const own=s.players[t.p],xs=ids.map(uid=>api.remove(own.deck,uid)).filter(Boolean);own.deck.unshift(...xs);}
 function run(s,t){if(!t.op.startsWith('g76_'))return false;const own=s.players[t.p];switch(t.op){
 case'g76_Corile':choice(s,t,'山札の一番上に置く相手のクリーチャーを1体選ぶ',targetOptions(s,t.p,living(s,1-t.p)));break;
 case'g76_TopOrder':{const rows=t.rows.filter(r=>own.deck.some(x=>x.uid===r.uid)&&!t.ordered.includes(r.uid));if(rows.length>1)choice(s,t,'山札の上から置く順に選ぶ（新しく置くカードのみ）',rows.map(r=>opt(r.label,r.uid,0,r.cardId)));else finishOrder(s,t,[...t.ordered,...rows.map(r=>r.uid)]);break;}
 case'g76_Lance':choice(s,t,'手札に戻すクロスギアを1枚選ぶ',targetOptions(s,t.p,[t.p,1-t.p].flatMap(p=>s.players[p].battle.filter(x=>!x.sealed&&card(x).type==='gear'))).map(o=>({...o,label:(own.battle.some(x=>x.uid===o.value)?'自分：':'相手：')+o.label,score:own.battle.some(x=>x.uid===o.value)?-5-o.score:15+o.score})));break;
 case'g76_Kuragen':{if(api.deckLocked(s,t.p))break;const held=new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v)),visible=own.deck.filter(x=>!held.has(x.uid)).slice(0,api.lookCount(s,t.p,own.deck.length)),publicLook=api.lookPublic(s,t.p),list=visible.filter(x=>api.isEvolution(x));if(visible.length)api.log(s,t.p,publicLook?'reveal':'look',card(t.source).name+'：山札の'+visible.length+'枚を'+(publicLook?'公開：'+visible.map(x=>card(x).name).join('・'):'確認'),{cardId:t.source});choice(s,t,'公開して山札の一番上に置く進化クリーチャーを1体まで探す',[...list.map(x=>opt(card(x).name,x.uid,10+Math.min(cost(card(x)),30),x.cardId)),opt('選ばずにシャッフル',null,0)]);break;}
 case'g76_Atlantis':{const self=own.battle.find(x=>key(x)===key(t)||(x.g47ElementRefs||[]).some(r=>key(r)===key(t))),list=[0,1].flatMap(p=>living(s,p).filter(x=>x!==self).map(x=>({player:p,uid:x.uid,to:'hand',destroy:false,controller:t.p})));if(list.length)api.move(s,list);break;}
 case'g76_JugglerDraw':if(monoWater(s,t.p))api.draw(s,t.p,1);break;
 default:throw Error('未実装の水の展開補助効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g76_'))return false;const own=s.players[t.p];switch(t.op){
 case'g76_Corile':if(v){const p=1-t.p,x=s.players[p].battle.find(x=>x.uid===v);if(x){const rows=api.allLayers(x).map((y,i)=>({uid:y.uid,label:y.faceDown?'裏向きのカード '+(i+1):card(y).name,cardId:y.faceDown?null:y.cardId}));put(s,follow(t,'TopOrder',{p,rows,ordered:[],newCards:true}));api.move(s,[{player:p,uid:v,to:'deckTop',destroy:false,controller:t.p}]);}}break;
 case'g76_TopOrder':put(s,follow(t,'TopOrder',{ordered:[...t.ordered,v]}));break;
 case'g76_Lance':if(v){const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(p>=0)api.move(s,[{player:p,uid:v,to:'hand',destroy:false,controller:t.p}]);}break;
 case'g76_Kuragen':{const x=v&&api.remove(own.deck,v);if(x){api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(x).name,{cardId:x.cardId});api.clear(x,'deck');}api.shuffleLibrary(s,t.p,[],t.source);if(x)own.deck.unshift(x);api.deckCheck(s,t.p);break;}
 default:throw Error('未実装の水の展開補助選択：'+t.op);
 }return true;}
 return{run,chosen,monoWater,effect(s,p,c,uid,entry){if(!c.g76Effect)return false;put(s,task('g76_'+c.g76Effect,p,c.id,{uid,incarnation:entry?.incarnation??s.players[p].battle.find(x=>x.uid===uid)?.incarnation??0}));return true;},
 decorate(s,p,x,c){return c.g76Juggler&&monoWater(s,p)?{...c,power:c.power+1000}:c;},
 attackStart(s,p,x){if(effective(x,s).g76Juggler)api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g76_JugglerDraw',p,x.cardId)});}};
}
