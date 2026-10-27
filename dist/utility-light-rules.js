// Hand inspection stays in the inspecting player's decision, never in a public log.
export function createUtilityLightRules(api){
 const{card,faces,colors,cost,effective,creatures,put,task,choice,opt,targetOptions}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const forbiddenRace=(s,x)=>/ドラゴン|フェニックス/.test(effective(x,s).race||'');
 function run(s,t){if(!t.op.startsWith('g74_'))return false;const own=s.players[t.p];switch(t.op){
 case'g74_Mail':if(api.canAddShield(s,t.p))choice(s,t,'裏向きでシールドに加える手札を1枚選ぶ',own.hand.map(x=>opt(card(x).name,x.uid,faces(card(x)).some(c=>c.trigger)?25:5-Math.min(30,cost(card(x))),x.cardId)));break;
 case'g74_Riku':if(own.shields.length<=2&&own.deck.length&&api.canAddShield(s,t.p))choice(s,t,'山札の上1枚を裏向きでシールドに加える？',[opt('シールドに加える',true,own.deck.length>1?20:-100),opt('加えない',false,0)]);break;
 case'g74_Cavalt':{const hand=s.players[1-t.p].hand;if(!hand.length)break;const ids=hand.filter(x=>faces(card(x)).some(c=>c.type==='spell'&&colors(c).some(v=>v==='闇'||v==='火'))).map(x=>x.uid);choice(s,{...t,ids},'相手の手札を確認：'+hand.map(x=>card(x).name).join('・'),[opt('確認して、闇または火の呪文'+ids.length+'枚をすべて捨てさせる',true,20)]);break;}
 case'g74_Arc':choice(s,t,'シールドに置く、ドラゴンでもフェニックスでもないクリーチャーを1体選ぶ',targetOptions(s,t.p,[t.p,1-t.p].flatMap(p=>living(s,p)).filter(x=>!forbiddenRace(s,x))).map(o=>{const self=own.battle.some(x=>x.uid===o.value);return{...o,label:(self?'自分：':'相手：')+o.label,score:self?-5-o.score:15+o.score};}));break;
 default:throw Error('未実装の光の補助効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g74_'))return false;const own=s.players[t.p];switch(t.op){
 case'g74_Mail':{const x=own.hand.find(x=>x.uid===v);if(x&&api.canAddShield(s,t.p)){api.remove(own.hand,v);api.clear(x,'shields');x.faceUp=false;api.addZone(s,t.p,'shields',x);api.notifyShieldAdded(s,t.p,x);api.log(s,t.p,'shieldAdd',card(t.source).name+'：手札1枚を裏向きでシールドに加えた',{cardId:t.source});}break;}
 case'g74_Riku':if(v)api.shieldTop(s,t.p,card(t.source));break;
 case'g74_Cavalt':if(v&&t.ids.length)api.discardSelected(s,{p:1-t.p,source:t.source,causedBy:t.p,controller:t.p,n:t.ids.length},t.ids);break;
 case'g74_Arc':if(v){const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(p>=0)api.move(s,[{player:p,uid:v,to:'shields',destroy:false,controller:t.p}]);}break;
 default:throw Error('未実装の光の補助選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g74Effect)return false;put(s,task('g74_'+c.g74Effect,p,c.id,{uid}));return true;}};
}
