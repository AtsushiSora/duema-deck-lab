// Three revised screenshots: physical mana events and optional ordered Space Charge.
export function createPhotoRevisionRules(api){
 const {card,power,creatures,put,task,choice,opt,skip,clear,targetOptions}=api;
 const order=['光','水','闇','火'];

 function value(s,p,c){return c==='光'?(s.players[p].deck.length>2?8:-50):c==='水'?(creatures(s,1-p).length?12:-5):c==='闇'?(s.players[1-p].hand.length?10:-5):creatures(s,p).length?5:-5;}
 function run(s,t){if(!t.op.startsWith('g41_'))return false;switch(t.op){
 case'g41_Ramp':{const batch=[];for(let i=0;i<2;i++){const x=api.takeTop(s,t.p);if(x)batch.push(x);}const to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';for(const x of batch){clear(x,to);if(to==='mana')x.tapped=true;}api.addZone(s,t.p,to,...batch);api.log(s,t.p,'ramp','デス＝ヴェルムート：山札の上'+batch.length+'枚を'+(to==='mana'?'タップしてマナ':'墓地')+'へ',{cardId:t.source});api.deckCheck(s,t.p);break;}
 case'g41_Charge':{const choices=[];for(let mask=1;mask<1<<t.colors.length;mask++){const list=t.colors.filter((_,i)=>mask&1<<i);choices.push(opt(list.join('・')+'の効果を使う',list,list.reduce((n,c)=>n+value(s,t.p,c),0)));}choice(s,t,'スペース・チャージ：使う文明を先に選ぶ（光→水→闇→火の順）',[...choices,skip()]);break;}
 case'g41_Light':api.shieldTop(s,t.p,card(t.source));api.deckCheck(s,t.p);break;
 case'g41_Water':choice(s,t,'スペース・チャージ（水）：手札に戻す相手のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g41_Dark':put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n:1}));break;
 case'g41_Fire':choice(s,t,'スペース・チャージ（火）：パワーを+6000する自分のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,t.p)));break;
 default:throw Error('未実装の改訂画像効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g41_'))return false;switch(t.op){
 case'g41_Charge':if(v)put(s,...order.filter(c=>v.includes(c)).map(c=>({...t,op:'g41_'+({光:'Light',水:'Water',闇:'Dark',火:'Fire'}[c])})));break;
 case'g41_Water':if(v)api.move(s,[{player:1-t.p,uid:v,to:'hand',destroy:false}]);break;
 case'g41_Fire':{const x=s.players[t.p].battle.find(x=>x.uid===v);if(x)(x.powerModifiers??=[]).push({amount:6000,expires:'end',who:s.active});break;}
 default:throw Error('未実装の改訂画像選択：'+t.op);
 }return true;}
 return {run,chosen,
 effect(s,p,c){if(!c.g41Des)return false;put(s,task('g41_Ramp',p,c.id));return true;},
 manaAdded(s,p,cards){const sources=s.players[p].battle.filter(x=>card(x).g41Des&&!api.ignored(s,x)&&api.isCreature(s,x));if(!sources.length)return;for(const x of cards){const actual=api.manaColors(card(x),s,p),cs=order.filter(c=>actual.includes(c));if(!cs.length)continue;for(const w of sources)api.enqueue(s,p,{uid:w.uid,incarnation:w.incarnation||0,source:w.cardId,effect:'extended',task:task('g41_Charge',p,w.cardId,{colors:cs})});}},
 mainActions(s,p){const candidates=s.players[p].hand.filter(x=>card(x).g41Momo);if(!candidates.length||creatures(s,p).filter(x=>power(x,false,s)>=12000).length<4)return[];return candidates.filter(x=>api.canCast(s,p,card(x),'hand')&&api.canEnter(s,p,card(x),{origin:'hand',execution:true})).map(x=>({kind:'play',uid:x.uid,cardId:x.cardId,cost:0,freeSummon:'G・ゼロ',label:card(x).name+'をG・ゼロで召喚'}));},
 };
}
