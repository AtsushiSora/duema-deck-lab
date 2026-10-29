// Two photographed lists: Galaxyshield is a paid zone move, not card execution.
export function createPhoto167Rules(api){
 const{card,cost,put,task,choice,targetOptions}=api;
 const lock=(p,source,more={})=>task('g167_TapLock',p,source,more);
 const eva=c=>!!c?.g167Eva;
 function run(s,t){if(!t.op.startsWith('g167_'))return false;const own=s.players[t.p];switch(t.op){
  case'g167_TapLock':choice(s,t,'相手のクリーチャー1体をタップし、次の自分のターンまでアンタップさせない',targetOptions(s,t.p,api.creatures(s,1-t.p)));break;
  case'g167_GalaxySummon':{
   const x=own.shields.flatMap(api.shieldCards).find(x=>x.uid===t.uid&&x.faceUp&&(x.zoneSerial||0)===t.serial&&!x.g37ShieldHeld),c=x&&card(x);
   if(!x||!eva(c)||!api.canMoveZone(s,t.p,'shields')||!api.canCast(s,t.p,c,'shields')||!api.canEnter(s,t.p,c,{origin:'shields',execution:true}))break;
   const physical=api.removeShieldCard(s,t.p,x.uid);if(!physical)break;api.clear(physical,'battle');
   const execution={ruleOrigin:'shields',origin:'shields',free:false,freeReason:'ギャラクシールド',alternativeCost:{fixedPayment:true,cost:cost(c)},paidMana:false,cost:cost(c),baseUid:null,face:0};
   if(!api.beforeExecution(s,t.p,c,physical,execution))api.completeExecution(s,t.p,physical,c,execution);
   break;
  }
  default:throw Error('未実装の写真167効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(t.op!=='g167_TapLock')return false;const x=api.creatures(s,1-t.p).find(x=>x.uid===v);if(x){api.tap(s,1-t.p,x);(x.tapLocks??=[]).push(t.p);}return true;}
 function mainActions(s,p){return s.players[p].hand.flatMap(x=>{const c=card(x);if(eva(c)&&api.canAddShield(s,p)&&api.canMoveZone(s,p,'hand')&&api.canPay(s,p,{...c,cost:2,civilizations:['光','水'],fixedPayment:true}))return[{kind:'galaxyShield',uid:x.uid,cardId:x.cardId,cost:2,label:'ギャラクシールドで表向きのシールドに置く · 2マナ',score:20}];if(c.g167Craft&&api.canCast(s,p,c,'hand')&&api.canPay(s,p,{...c,cost:1,civilizations:['火'],g40PayNormally:true}))return[{kind:'play',alternative:'g167Craft',uid:x.uid,cardId:x.cardId,cost:api.summonCost(s,p,{...c,cost:1,g40PayNormally:true}),label:api.summonCost(s,p,{...c,cost:1,g40PayNormally:true})+'マナで唱え、自分のエレメントを1つ破壊する'}];return[];});}
 function galaxy(s,p,a){const c=card(a.cardId);api.pay(s,p,{...c,cost:2,civilizations:['光','水'],fixedPayment:true});const x=api.remove(s.players[p].hand,a.uid);if(!x)throw Error('シールド化するカードがありません');api.clear(x,'shields');x.faceUp=true;api.addZone(s,p,'shields',x);api.notifyShieldAdded(s,p,x);api.log(s,p,'galaxyShield',c.name+'を2マナで表向きのシールドに置く（召喚ではありません）',{cardId:c.id});}
 function alternative(s,p,a){const x=s.players[p].hand.find(x=>x.uid===a.uid);if(!x)throw Error('唱えるカードがありません');x.g167CraftAlt=true;api.cast(s,p,a.uid,false,null,0,{cost:1,civilizations:['火'],g40PayNormally:true},'hand');}
 function effect(s,p,c,uid){if(c.g167Eva){put(s,lock(p,c.id,{uid}));return true;}if(c.g167Craft){const f=s.extSpells?.find(f=>f.inst.uid===uid),defs=[];if(f?.inst.g167CraftAlt)defs.push(task('g34_Select',p,c.id,{origin:'battle',to:'grave',n:1,filter:{element:true},title:'破壊する自分のエレメントを1つ選ぶ'}));defs.push(task('g34_Target',p,c.id,{to:'grave',element:true,filter:{element:true,max:4},title:'破壊するコスト4以下の相手のエレメントを選ぶ'}));put(s,...defs);return true;}return false;}
 function shieldAdded(s,p,x){if(x.faceUp&&eva(card(x)))api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:lock(p,x.cardId,{uid:x.uid})});}
 function start(s,p){return s.players[p].shields.flatMap(api.shieldCards).filter(x=>x.faceUp&&eva(card(x))&&!x.g37ShieldHeld).map(x=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g167_GalaxySummon',p,x.cardId,{uid:x.uid,serial:x.zoneSerial||0})}));}
 return{run,chosen,mainActions,galaxy,alternative,effect,shieldAdded,start};
}
