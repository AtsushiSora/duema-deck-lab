import {policyLook} from './champion-zone-policy.js';
import {policyTake} from './champion-zone-policy.js';
// Screenshot Kenji deck: each reveal, source card and replacement stays physical.
export function createKenjiPhotoRules(api){
 const {card,cost,effective,creatures,layers,put,task,choice,opt,skip,remove,clear,enter,cast,move,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),live=(s,t)=>s.players[t.p].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===(t.incarnation||0));
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g32_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const canPut=(s,p,x,zone,bases=null)=>card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin:zone,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).some(x=>!bases||bases.includes(x.uid)));
 function assignable(s,p,ids,bases){if(!ids.length)return true;const x=s.players[p].deck.find(x=>x.uid===ids[0]);if(!x)return false;return !card(x).evolution?assignable(s,p,ids.slice(1),bases):api.evolutionBases(s,p,card(x)).filter(b=>bases.includes(b.uid)).some(b=>assignable(s,p,ids.slice(1),bases.filter(uid=>uid!==b.uid)));}
 function attach(s,p,x,y){const n=layers(x).length-1;(x.under??=[]).push(y);const c=effective(x,s),next=layers(x).length-1;x.g32NoUntap=!!c.g32Complex&&next<8;if(c.g32Complex&&n<8&&next===8)on(s,p,x,'Wake');api.log(s,p,'under',card(y).name+'を'+card(x).name+'の下に置いた',{cardId:x.cardId});}
 function putTop(s,p,x){const y=api.takeTop(s,p);if(y){clear(y,'battle');attach(s,p,x,y);}api.deckCheck(s,p);}
 function finishBatch(s,t){delete s.g32DeployBatch;api.shuffleLibrary(s,t.p);}
 function run(s,t){if(!t.op.startsWith('g32_'))return false;const own=s.players[t.p],opp=s.players[1-t.p],x=live(s,t);switch(t.op){
 case'g32_Cube':{api.shuffleLibrary(s,t.p);if(api.deckLocked(s,t.p))break;const y=own.deck[0];if(!y)break;api.log(s,t.p,'reveal',card(y).name,{cardId:y.cardId});if(card(y).type==='creature'){if(canPut(s,t.p,y,'deck'))choice(s,t,'ミステリー・キューブ：このクリーチャーを出す？',[opt('出す',y.uid,50,y.cardId),skip()]);}else{remove(own.deck,y.uid);const to=api.deckRedirect(s,t.p)?'grave':'mana';clear(y,to);api.addZone(s,own,to,y);api.deckCheck(s,t.p);}break;}
 case'g32_Put':{const y=own[t.origin].find(y=>y.uid===t.target),bases=t.bases? t.bases.filter(uid=>own.battle.some(b=>b.uid===uid)):null;if(!y||!canPut(s,t.p,y,t.origin,bases)){if(t.batch)put(s,t.batch);break;}if(card(y).evolution){const remaining=t.batch?.selected||[];choice(s,t,'進化元を選ぶ',api.evolutionBases(s,t.p,card(y)).filter(b=>(!bases||bases.includes(b.uid))&&(!t.batch||assignable(s,t.p,remaining,bases.filter(uid=>uid!==b.uid)))).map(b=>opt(card(b).name,b.uid,5,b.cardId)));}else deploy(s,t,null);break;}
 case'g32_Galaxy':if(!api.deckLocked(s,t.p))put(s,{...t,op:'g32_GalaxyPick',selected:[],bases:own.battle.map(x=>x.uid)});break;
 case'g32_GalaxyPick':{const xs=policyLook(s,t.p,own.deck.length,own.deck,api).filter(y=>(!own.entryLimitThisTurn||!t.selected.length)&&!t.selected.includes(y.uid)&&canPut(s,t.p,y,'deck',t.bases)&&assignable(s,t.p,[...t.selected,y.uid],t.bases));if(t.selected.length>=2||!xs.length){if(t.selected.length){s.g32DeployBatch=true;put(s,{...t,op:'g32_Batch'});}else finishBatch(s,t);break;}choice(s,t,'ギャラクシー：山札から2体まで選ぶ（'+t.selected.length+'/2）',[...xs.map(y=>opt(card(y).name,y.uid,20+cost(card(y)),y.cardId)),opt('選択を確定する',null,0)]);break;}
 case'g32_Batch':{s.g32DeployBatch=true;const selected=t.selected.filter(uid=>own.deck.some(y=>y.uid===uid));if(!selected.length){finishBatch(s,t);break;}choice(s,{...t,selected},'同時に出すクリーチャーの処理順を選ぶ',selected.map(uid=>{const y=own.deck.find(y=>y.uid===uid);return opt(card(y).name,uid,cost(card(y)),y.cardId);}));break;}
 case'g32_Cocoon':{api.resolveEffect(s,t.p,{...card(t.source),effect:'ramp1'});put(s,{...t,op:'g32_RecyclePlayer'});break;}
 case'g32_RecyclePlayer':choice(s,t,'墓地をシャッフルして山札の下に置くプレイヤーを選ぶ？',[opt('自分',t.p,own.grave.length>5?15:-5),opt('相手',1-t.p,opp.grave.length>5?20:-5),skip()]);break;
 case'g32_CocoonDeploy':{const xs=own.mana.filter(y=>cost(card(y))<=own.mana.length&&canPut(s,t.p,y,'mana'));choice(s,t,'スーパー・S・トリガー：マナから1体出す？',[...xs.map(y=>opt(card(y).name,y.uid,20+cost(card(y)),y.cardId)),skip()]);break;}
 case'g32_Panda':api.mill(s,t.p,3);put(s,{...t,op:'g32_PandaMinus'});break;
 case'g32_PandaMinus':choice(s,t,'墓地の枚数×1000パワーを下げる相手を選ぶ？',[...targetOptions(s,t.p,creatures(s,1-t.p)),skip()]);break;
 case'g32_Jaouga8':choice(s,t,'自分のシールド1つを墓地に置き、マナをすべてアンタップする？',[...own.shields.map((y,i)=>opt('シールド'+(i+1),y.uid,20)),skip()]);break;
 case'g32_AddTop':if(x)choice(s,t,'山札の上1枚をこのクリーチャーの下に置く？',[opt('下に置く',true,own.deck.length>2?20:-100),skip()]);break;
 case'g32_Wake':case'g32_MomoUntap':if(x&&api.canUntap(x))x.tapped=false;break;
 case'g32_ComplexAttack':if(x)choice(s,t,'下のカード1枚を墓地へ置く？',[...(x.under||[]).map(y=>opt(card(y).name,y.uid,canPut(s,t.p,y,'grave')?cost(card(y))*3:0,y.cardId)),skip()]);break;
 case'g32_DolfSweep':move(s,[0,1].flatMap(p=>creatures(s,p).map(y=>({player:p,uid:y.uid,to:'grave'}))));break;
 case'g32_DrawChoice':choice(s,t,'Dol-Fal-20th：カードを1枚引く？',[opt('引く',true,own.deck.length>3?10:-100),skip()]);break;
 case'g32_LockMana':choice(s,t,'相手のマナ1枚をタップし、次の自分のターンまでアンタップを封じる',opp.mana.map(y=>opt(card(y).name,y.uid,y.tapped?2:8,y.cardId)));break;
 case'g32_HawkEnd':put(s,...[s.active,1-s.active].map(p=>task('discard',p,t.source,{n:s.players[p].hand.length,causedBy:t.p})));break;
 case'g32_SBBase':{const y=own.hand.find(y=>y.uid===t.target);if(y&&api.canCast(s,t.p,card(y))&&api.canEnter(s,t.p,card(y)))choice(s,t,'S・バック：進化元を選ぶ',api.evolutionBases(s,t.p,card(y)).map(b=>opt(card(b).name,b.uid,5,b.cardId)));break;}
 default:throw Error('未実装の画像ケンジ効果：'+t.op);
 }return true;}
 function deploy(s,t,base){if(t.batch)put(s,t.batch);const y=remove(s.players[t.p][t.origin],t.target);if(y)enter(s,t.p,y,base,{origin:t.origin,execution:false});}
 function chosen(s,t,v){if(!t.op.startsWith('g32_'))return false;const own=s.players[t.p],x=live(s,t);switch(t.op){
 case'g32_Cube':if(v)put(s,{...t,op:'g32_Put',target:v,origin:'deck'});break;
 case'g32_Put':deploy(s,t,v);break;
 case'g32_GalaxyPick':if(v)put(s,{...t,selected:[...t.selected,v]});else if(t.selected.length)put(s,{...t,op:'g32_Batch'});else finishBatch(s,t);break;
 case'g32_Batch':put(s,{...t,op:'g32_Put',target:v,origin:'deck',batch:{...t,selected:t.selected.filter(uid=>uid!==v)}});break;
 case'g32_RecyclePlayer':if(v!==null){const target=s.players[v],all=policyTake(s,v,'grave',api);for(const y of all)clear(y,'deck');target.deck.push(...api.shuffled(all,s));}if(t.super)put(s,{...t,op:'g32_CocoonDeploy'});break;
 case'g32_CocoonDeploy':if(v)put(s,{...t,op:'g32_Put',target:v,origin:'mana'});break;
 case'g32_PandaMinus':if(v){const y=s.players[1-t.p].battle.find(y=>y.uid===v);if(y)(y.powerModifiers??=[]).push({amount:-own.grave.length*1000,expires:'end',who:s.active});}break;
 case'g32_Jaouga8':if(v){api.moveShield(s,t.p,v,'grave');for(const y of own.mana)if(api.canUntap(y))y.tapped=false;}break;
 case'g32_AddTop':if(v&&x)putTop(s,t.p,x);break;
 case'g32_ComplexAttack':if(v&&x){const y=remove(x.under,v);if(y){const all=layers(y);for(const z of all)clear(z,'grave');api.addZone(s,own,'grave',...all);if(card(y).type==='creature'&&canPut(s,t.p,y,'grave'))put(s,{...t,op:'g32_Put',target:y.uid,origin:'grave'});}}break;
 case'g32_DrawChoice':if(v)api.draw(s,t.p,1);break;
 case'g32_LockMana':{const y=s.players[1-t.p].mana.find(y=>y.uid===v);if(y){y.tapped=true;(y.tapLocks??=[]).push({who:t.p,afterTurns:own.turns});}}break;
 case'g32_SBBase':cast(s,t.p,t.target,true,v,0,null,'hand','S・バック');break;
 default:throw Error('未実装の画像ケンジ選択：'+t.op);
 }return true;}
 return{run,chosen,
 effect(s,p,c,uid,entry){const op={kenjiMysteryCube:'Cube',kenjiCocoon:'Cocoon',kenjiPanda:'Panda',kenjiJaouga8:'Jaouga8'}[c.effect];if(!op)return false;put(s,task('g32_'+op,p,c.id,{uid,incarnation:s.players[p].battle.find(x=>x.uid===uid)?.incarnation||0,super:!!entry?.super}));return true;},
 decorate(s,p,x,c){if(c.g32Momo&&creatures(s,p).some(y=>y.tapped))c={...c,blocker:true};return c;},
 noUntap(s,x){return !!effective(x,s).g32Complex&&layers(x).length<=8;},canLeave(s,p,x){return !(effective(x,s).g32Complex&&layers(x).length<=8);},
 attack(s,p,x){if(api.selfStopped(s,p))return;const c=effective(x,s);if(c.g32Complex)on(s,p,x,'ComplexAttack');if(c.g32Galaxy)on(s,p,x,'Galaxy');if(c.g32Dolf)on(s,p,x,'DolfSweep');if(c.g32Momo&&x.g32MomoAttack!==s.turn){x.g32MomoAttack=s.turn;on(s,p,x,'MomoUntap');}},
 snapshot(s){return[0,1].flatMap(p=>creatures(s,p).filter(x=>effective(x,s).g32Complex||effective(x,s).g32Dolf).map(x=>({p,uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,complex:!!effective(x,s).g32Complex,dolf:!!effective(x,s).g32Dolf})));},
 leaving(s,p,x,snapshot,to,destroy){for(const w of snapshot||[]){const src={uid:w.uid,incarnation:w.incarnation,cardId:w.source};if(w.complex&&w.uid!==x.uid&&card(x).type==='creature')on(s,w.p,src,'AddTop');if(w.dolf&&destroy&&to==='grave'&&card(x).type==='creature')on(s,w.p,src,'DrawChoice');}},
 drawn(s,p,n){for(const x of creatures(s,p))if(effective(x,s).g32Dolf)for(let i=0;i<n;i++)on(s,p,x,'LockMana');},
 start(s,p){return creatures(s,p).filter(x=>effective(x,s).g32Complex).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g32_AddTop',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}));},
 end(s){return[0,1].flatMap(p=>creatures(s,p).filter(x=>effective(x,s).g32Hawk).map(x=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g32_HawkEnd',p,x.cardId)})));},
 mainActions(s,p){const hawk=s.active===p&&creatures(s,p).some(x=>effective(x,s).g32Hawk),demon=s.active===p?creatures(s,p).filter(x=>effective(x,s).g32DemonOnce&&s.g32DemonUsed?.[key(x)]!==s.turn):[];return s.players[p].grave.flatMap(x=>api.faces(card(x)).flatMap((c,face)=>{if(!(hawk&&c.type==='creature'||demon.length&&String(c.race).includes('デモニオ'))||!api.canCast(s,p,c,'grave')||c.type==='creature'&&!api.canEnter(s,p,c,{origin:'grave',execution:true})||c.evolution&&!api.evolutionBases(s,p,c).length||!api.canPay(s,p,{...c,summonOrigin:'grave',executionUid:x.uid}))return[];return[{kind:'play',uid:x.uid,cardId:x.cardId,origin:'grave',face,cost:api.summonCost(s,p,{...c,summonOrigin:'grave',executionUid:x.uid}),...(hawk&&c.type==='creature'?{}:{manaPermit:'g32:'+key(demon[0])}),label:'墓地から'+c.name+'を実行'}];}));},
 played(s,p,c,x,origin,permit){if(origin==='grave'&&permit?.startsWith('g32:'))(s.g32DemonUsed??={})[permit.slice(4)]=s.turn;},
 };
}
