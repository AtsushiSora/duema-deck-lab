// Photo cards: triggered mana untaps and turn-scoped Sasage grants.
export function createPhoto159ResourceRules(api){
 const{card,faces,colors,cost,put,task,choice,opt}=api;
 const living=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 const key=x=>x.uid+'@'+(x.incarnation||0);
 const dista=c=>/ディスタス|ディスペクター/.test(String(c.race));
 const on=(p,x,op,more={})=>({player:p,uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 function run(s,t){if(!t.op.startsWith('g159R_'))return false;switch(t.op){
 case'g159R_Stone':{for(let i=0;i<2&&s.winner===null;i++){const x=api.takeTop(s,t.p);if(!x)break;const to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';api.clear(x,to);if(to==='mana')x.tapped=true;api.addZone(s,t.p,to,x);}api.deckCheck(s,t.p);put(s,task('g61_ManaGrave',t.p,t.source,{owner:t.p}));break;}
 case'g159R_ManaUntap':{const x=s.players[t.p].mana.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);if(x&&api.canUntap(x))x.tapped=false;break;}
 case'g159R_Grant':choice(s,t,'このターン、ササゲール2を与える自分のエレメントを1つ選ぶ',api.targetOptions(s,t.p,s.players[t.p].battle.filter(x=>!x.sealed&&['creature','seed','field','gear'].includes(api.effective(x,s).type))).map(o=>({...o,score:20-cost(card(o.cardId))})));break;
 default:throw Error('未対応の写真カード資源処理：'+t.op);
 }return true;}
 function chosen(s,t,v){if(t.op!=='g159R_Grant')return false;const x=s.players[t.p].battle.find(x=>x.uid===v);if(x)x.g159Sasage={turn:s.turn,amount:2};return true;}
 return{run,chosen,
 effect(s,p,c,uid){if(c.g159Role!=='stone')return false;put(s,task('g159R_Stone',p,c.id,{uid}));return true;},
 manaAdded(s,p,cards){for(const w of living(s,p).filter(x=>card(x).g159Role==='condama'&&!api.ignored(s,x)))for(const x of cards)if(!x.faceDown&&faces(card(x)).some(dista))api.enqueue(s,p,on(p,w,'g159R_ManaUntap',{target:x.uid,serial:x.zoneSerial||0}));},
 start(s,p){return living(s,p).filter(x=>card(x).g159Role==='condama'&&!api.ignored(s,x)&&!api.selfStopped(s,p)).map(x=>on(p,x,'g159R_Grant'));},
 decorate(s,p,x,c){return x.g159Sasage?.turn===s.turn?{...c,sasage:Math.max(c.sasage||0,x.g159Sasage.amount)}:c;}
 };
}
