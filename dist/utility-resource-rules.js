// Costs and object identities are captured before movement; each player chooses their own sacrifice.
export function createUtilityResourceRules(api){
 const{card,faces,cost,put,task,choice,opt}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0);
 const currentPower=(s,x)=>api.power(x,x.uid===s.attack?.attacker||s.attackLifecycle?.uid===x.uid&&(s.attackLifecycle.incarnation||0)===(x.incarnation||0),s);
 const creatures=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g61_'+op,...more});
 const release=(s,p,ids)=>s.players[p].g34Protected=(s.players[p].g34Protected||[]).filter(uid=>!ids.includes(uid));
 function look(s,t,n){const own=s.players[t.p],held=new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v)),xs=own.deck.filter(x=>!held.has(x.uid)).slice(0,api.lookCount(s,t.p,n));(own.g34Protected??=[]).push(...xs.map(x=>x.uid));if(xs.length)api.log(s,t.p,api.lookPublic(s,t.p)?'reveal':'look',card(t.source).name+'：山札の'+xs.length+'枚を確認'+(api.lookPublic(s,t.p)?'：'+xs.map(x=>card(x).name).join('・'):''),{cardId:t.source});return xs;}
 function finishManaReturn(s,t){if(!api.canMoveZone(s,t.p,'mana'))return;const own=s.players[t.p];for(const uid of t.selected||[]){const x=api.remove(own.mana,uid);if(x){api.clear(x,'hand');api.addZone(s,t.p,'hand',x);}}}
 function finishChain(s,t){put(s,{...t,op:'g61_Sacrifice',controller:t.p});const rows=(t.selected||[]).filter(r=>s.players[1-t.p].battle.some(x=>key(x)===key(r)));if(rows.length)api.move(s,rows.map(r=>({player:1-t.p,uid:r.uid,to:'grave',destroy:true,controller:t.p})));}
 function finishDeformer(s,t){const groups=[s.active,1-s.active].map(p=>({p,cards:api.canMoveZone(s,p,'mana')?s.players[p].mana.filter(x=>(t.selected||[]).some(r=>r.p===p&&r.uid===x.uid)&&!(s.players[p].g34ManaHeld||[]).includes(x.uid)):[]}));for(const {p,cards}of groups)for(const x of cards)api.remove(s.players[p].mana,x.uid);for(const {p,cards}of groups){for(const x of cards)api.clear(x,'hand');if(cards.length){api.addZone(s,p,'hand',...cards);api.log(s,p,'manaReturn',card(t.source).name+'：マナ'+cards.length+'枚を手札へ',{cardId:t.source});}}}
 function run(s,t){if(!t.op.startsWith('g61_'))return false;const own=s.players[t.p];switch(t.op){
 case'g61_Strategy':put(s,task('g13_Murder',t.p,t.source,{anyCard:true}));break;
 case'g61_Drill':put(s,{...t,op:'g61_ManaGrave',owner:t.p},{...t,op:'g61_DrillEnemy'});break;
 case'g61_DrillEnemy':put(s,{...t,op:'g61_ManaGrave',p:1-t.p,owner:1-t.p,controller:t.p});break;
 case'g61_Plot':put(s,{...t,op:'g61_PlotTarget'},task('discard',1-t.p,t.source,{n:1,causedBy:t.p,random:true}));break;
 case'g61_PlotTarget':choice(s,t,'手札に戻す相手の進化ではないクリーチャーを1体選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>!api.isEvolution(x))));break;
 case'g61_Crimson':put(s,task('g34_Sweep',t.p,t.source,{both:true,to:'grave',filter:{creature:true,blocker:true,maxPower:3000}}));break;
 case'g61_Core':choice(s,t,'墓地に置く相手のシールドを1つ選ぶ（S・トリガー不可）',s.players[1-t.p].shields.map((x,i)=>opt('シールド '+(i+1)+(x.faceUp?'：'+card(x).name:''),x.uid,15,x.faceUp?x.cardId:undefined)));break;
 case'g61_Zaruba':put(s,task('g34_Draw',1-t.p,t.source,{n:1}));break;
 case'g61_Zaar':put(s,task('g34_Select',t.p,t.source,{origin:'grave',to:'hand',n:1,optional:true,filter:{creature:true,minPower:6000},title:'墓地から手札に戻すパワー6000以上のクリーチャーを1体まで選ぶ'}));break;
 case'g61_Belo':if(own.shields.length>=5)api.shieldTop(s,t.p,card(t.source));break;
 case'g61_Bone':put(s,task('discard',t.p,t.source,{n:1,causedBy:t.p}));break;
 case'g61_SevenFifty':put(s,task('g55_ShieldHand',t.p,t.source));break;
 case'g61_Violet':for(const p of[0,1])for(const x of creatures(s,p))if(key(x)!==key(t))(x.powerModifiers??=[]).push({amount:-1000,expires:'end',who:s.active});break;
 case'g61_Hulk':put(s,task('g34_Draw',t.p,t.source,{n:1,optional:true}));break;
 case'g61_Casius':put(s,task('g34_Draw',t.p,t.source,{n:1}),{...t,op:'g52_TopHand',n:1,selected:[]});break;
 case'g61_Tyrant':put(s,task('g34_Select',t.p,t.source,{origin:'hand',to:'mana',n:2,title:'マナに置く自分の手札を2枚選ぶ'}));break;
 case'g61_Raiko':if(own.shields.length<=4)api.shieldTop(s,t.p,card(t.source));break;
 case'g61_Jamming':choice(s,t,'すべてタップするクリーチャーの文明を選ぶ',['闇','火'].map(color=>opt(color,color,[0,1].reduce((score,p)=>score+creatures(s,p).filter(x=>!x.tapped&&api.colors(api.effective(x,s)).includes(color)).reduce((n,x)=>n+(p===t.p?-12:15+(api.effective(x,s).blocker?8:0)),0),0))));break;
 case'g61_Goren':put(s,task('g34_Target',t.p,t.source,{to:'grave',filter:{maxPower:3000}}),{...t,op:'g61_GorenAfter'});break;
 case'g61_GorenAfter':if(['光','水','闇','火','自然'].every(color=>own.mana.some(x=>!x.faceDown&&api.manaColors(card(x),s,t.p).includes(color))))put(s,task('g34_Target',t.p,t.source,{to:'grave',filter:{maxPower:3000}}));break;
 case'g61_Camster':put(s,task('g13_Murder',t.p,t.source,{nonCreature:true}));break;
 case'g61_Gyaska':put(s,task('discard',t.p,t.source,{all:true,n:own.hand.length,causedBy:t.p}));break;
 case'g61_DrainWorm':put(s,task('g34_Target',t.p,t.source,{power:-1000}));break;
 case'g61_Pekotan':if(s.players[1-t.p].hand.length>own.hand.length)put(s,task('g34_Draw',t.p,t.source,{n:1,optional:true}));break;
 case'g61_Fist':put(s,task('g34_Target',t.p,t.source,{to:'grave',filter:{maxPower:2000},optional:true}));break;
 case'g61_Searcher':{if(api.deckLocked(s,t.p))break;const xs=look(s,t,own.deck.length),ids=xs.map(x=>x.uid);choice(s,{...t,ids},'山札から手札に加えるカードを1枚まで選ぶ',[...xs.filter(()=>api.canMoveZone(s,t.p,'deck')).map(x=>opt(card(x).name,x.uid,own.deck.length>1?15+Math.min(cost(card(x)),20):-1000,x.cardId)),opt('選ばずにシャッフル',null,0)]);break;}
 case'g61_Ready':{const n=Math.max(0,s.players[1-t.p].hand.length-own.hand.length);if(n)put(s,task('g34_Draw',t.p,t.source,{n}));break;}
 case'g61_Reaction':{const enemies=creatures(s,1-t.p),shako=creatures(s,t.p).some(x=>api.effective(x,s).shako);choice(s,t,'相手のクリーチャーを数える文明を1つ選ぶ',['光','水','闇','火','自然'].map(color=>{const n=enemies.filter(x=>api.colors(api.effective(x,s)).includes(color)).length;return opt(color+'：'+n+'枚引く',color,n>=own.deck.length&&n&&!shako?-1000:n*12);}));break;}
 case'g61_Eater':{const n=creatures(s,1-t.p).filter(x=>api.colors(api.effective(x,s)).includes('光')).length;if(n)put(s,task('discard',1-t.p,t.source,{n,causedBy:t.p}));break;}
 case'g61_Disaster':put(s,{...t,op:'g61_DisasterPick',p:1-t.p,controller:t.p});break;
 case'g61_DisasterPick':choice(s,t,'手札に戻す自分のアンタップしているクリーチャーを1体選ぶ',api.targetOptions(s,t.p,creatures(s,t.p).filter(x=>!x.tapped)).map(o=>({...o,score:api.canLeave(s,t.p,own.battle.find(x=>x.uid===o.value))?-cost(card(o.cardId))*4:50})));break;
 case'g61_Ice':choice(s,t,'マナゾーンに置く相手の闇または水のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>api.colors(api.effective(x,s)).some(v=>v==='闇'||v==='水'))));break;
 case'g61_Dekopin':put(s,task('g34_Target',t.p,t.source,{to:'grave',filter:{maxPower:4000}}));break;
 case'g61_Heart':if(own.shields.length<=2)put(s,task('g34_Target',t.p,t.source,{anyOwner:true,to:'hand',optional:true}));break;
 case'g61_RevSpiral':put(s,task('g34_Target',t.p,t.source,{to:'hand'}),{...t,op:'g61_RevSpiralAfter'});break;
 case'g61_RevSpiralAfter':if(own.shields.length<=2)put(s,{...t,op:'g52_TopHand',p:1-t.p,controller:t.controller??t.p,n:1,selected:[]});break;
 case'g61_RevGuillotine':put(s,task('g34_Target',t.p,t.source,{power:-2000,spell:true}),{...t,op:'g61_RevGuillotineAfter'});break;
 case'g61_RevGuillotineAfter':if(own.shields.length<=2)put(s,task('g34_Target',t.p,t.source,{power:-6000,spell:true}));break;
 case'g61_Unicorn':queue(s,t,'Neptas',{allPowers:true});break;
 case'g61_Fal':case'g61_Thief':choice(s,t,t.op==='g61_Fal'?'墓地から手札へ戻す呪文を1枚選ぶ？':'墓地から手札へ戻すリビング・デッドを1体選ぶ？',[...(api.canMoveZone(s,t.p,'grave')?own.grave.filter(x=>t.op==='g61_Fal'?faces(card(x)).some(c=>c.type==='spell'):card(x).type==='creature'&&String(card(x).race).split(/[\/／]/).includes('リビング・デッド')):[]).map(x=>opt(card(x).name,x.uid,10+Math.min(cost(card(x)),20),x.cardId)),opt('戻さない',null,0)]);break;
 case'g61_Bronx':{const xs=[...creatures(s,t.p),...creatures(s,1-t.p)],min=Math.min(...xs.map(x=>currentPower(s,x)));choice(s,t,'パワーが一番小さいクリーチャーを1体選んで破壊する',api.targetOptions(s,t.p,xs.filter(x=>currentPower(s,x)===min)).map(o=>({...o,score:own.battle.some(x=>x.uid===o.value)?-20-cost(card(o.cardId)):20+cost(card(o.cardId))})));break;}
 case'g61_Axe':choice(s,t,'山札の一番上1枚を公開してマナに置きますか？',[opt('マナに置く',true,own.deck.length<=1?-1000:api.manaRedirect(s,t.p)||api.deckRedirect(s,t.p)?-10:20),opt('置かない',null,0)]);break;
 case'g61_Fate':put(s,task('g34_Draw',t.p,t.source,{n:2,optional:true}),task('discard',t.p,t.source,{n:2,causedBy:t.p}));break;
 case'g61_Blast':queue(s,t,'ManaGrave',{owner:t.p});break;
 case'g61_Bolzard':queue(s,t,'ManaGrave',{owner:1-t.p});break;
 case'g61_ManaGrave':choice(s,t,t.owner===t.p?'墓地に置く自分のマナを1枚選ぶ':'墓地に置く相手のマナを1枚選ぶ',(api.canMoveZone(s,t.owner,'mana')?s.players[t.owner].mana.filter(x=>!(s.players[t.owner].g34ManaHeld||[]).includes(x.uid)):[]).map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,x.faceDown?10:20-Math.min(cost(card(x)),15)+(t.owner===t.p&&x.tapped?10:0),x.faceDown?null:x.cardId)));break;
 case'g61_Maboroshi':choice(s,t,'マナに置く墓地の自然のカードを1枚選ぶ？',[...(api.canMoveZone(s,t.p,'grave')?own.grave.filter(x=>faces(card(x)).some(c=>api.colors(c).includes('自然'))):[]).map(x=>opt(card(x).name,x.uid,api.manaRedirect(s,t.p)?-10:20-Math.min(cost(card(x)),15),x.cardId)),opt('置かない',null,0)]);break;
 case'g61_Deformer':queue(s,t,'DeformerPick',{p:s.active,owners:[s.active,1-s.active],controller:t.p,selected:[]});break;
 case'g61_DeformerPick':{if(!t.owners.length){finishDeformer(s,t);break;}const p=t.owners[0],own=s.players[p],selected=t.selected.filter(r=>r.p===p),xs=api.canMoveZone(s,p,'mana')?own.mana.filter(x=>!selected.some(r=>r.uid===x.uid)&&!(own.g34ManaHeld||[]).includes(x.uid)):[];if(selected.length>=2||!xs.length){queue(s,t,'DeformerPick',{owners:t.owners.slice(1),p:t.owners[1]??t.controller});break;}choice(s,{...t,p},'自分のマナから手札へ戻す2枚を選ぶ（'+selected.length+'/2）',xs.map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,x.faceDown?15:15+Math.min(cost(card(x)),15)+(x.tapped?10:0),x.faceDown?null:x.cardId)));break;}
 case'g61_Reiz':choice(s,t,'墓地から手札へ戻す水または火のクリーチャーを1体選ぶ？',[...(api.canMoveZone(s,t.p,'grave')?own.grave.filter(x=>card(x).type==='creature'&&api.colors(card(x)).some(v=>v==='水'||v==='火')):[]).map(x=>opt(card(x).name,x.uid,10+Math.min(cost(card(x)),20),x.cardId)),opt('戻さない',null,0)]);break;
 case'g61_Neptas':choice(s,t,t.allPowers?'手札に戻すクリーチャーを1体選ぶ？':'手札に戻すパワー2000以下1体を選ぶ？',[...api.targetOptions(s,t.p,[...creatures(s,t.p),...creatures(s,1-t.p)].filter(x=>t.allPowers||currentPower(s,x)<=2000)).map(o=>{const own=creatures(s,t.p).some(x=>x.uid===o.value);return{...o,score:own?-10:20+o.score};}),opt('戻さない',null,0)]);break;
 case'g61_Pepper':choice(s,t,'マナに置く自分のパワー3000以下1体を選ぶ',api.targetOptions(s,t.p,creatures(s,t.p).filter(x=>currentPower(s,x)<=3000)).map(o=>({...o,score:api.canLeave(s,t.p,own.battle.find(x=>x.uid===o.value))?20-Math.min(cost(card(o.cardId)),15):-10})));break;
 case'g61_Amber':choice(s,t,'墓地から手札へ戻すクリーチャーを1体選ぶ？',[...(api.canMoveZone(s,t.p,'grave')?own.grave.filter(x=>card(x).type==='creature'):[]).map(x=>opt(card(x).name,x.uid,10+Math.min(cost(card(x)),20),x.cardId)),opt('戻さない',null,0)]);break;
 case'g61_Night':queue(s,t,'Angler',{optional:false});break;
 case'g61_Nenbutsu':choice(s,t,'相手の山札の一番下に戻す墓地のカードを1枚選ぶ',(api.canMoveZone(s,1-t.p,'grave')?s.players[1-t.p].grave:[]).map(x=>opt(card(x).name,x.uid,10+Math.min(cost(card(x)),20),x.cardId)));break;
 case'g61_Maria':choice(s,t,'手札に戻す自分のコスト4以下1体を選ぶ',api.targetOptions(s,t.p,creatures(s,t.p).filter(x=>cost(api.effective(x,s))<=4)).map(o=>{const x=own.battle.find(x=>x.uid===o.value);return{...o,score:!api.canLeave(s,t.p,x)?60:x.uid===t.uid?-50:x.cardId===t.source?-40:10-Math.min(cost(card(x)),20)};}));break;
 case'g61_Lamp':if(own.grave.some(x=>card(x).name===card(t.source).name))put(s,task('g34_Draw',t.p,t.source,{n:1,optional:true}));break;
 case'g61_Negio':{const grave=api.canMoveZone(s,t.p,'grave')&&own.grave.length;choice(s,t,'山札の一番上に置く自分のマナを1枚選ぶ？',[...(api.canMoveZone(s,t.p,'mana')?own.mana.filter(x=>!(own.g34ManaHeld||[]).includes(x.uid)):[]).map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,grave?(x.tapped?25:10):-10,x.faceDown?null:x.cardId)),opt('置かない',null,0)]);break;}
 case'g61_NegioGrave':choice(s,t,'マナに置く自分の墓地のカードを1枚選ぶ',(api.canMoveZone(s,t.p,'grave')?own.grave:[]).map(x=>opt(card(x).name,x.uid,10-Math.min(cost(card(x)),20),x.cardId)));break;
 case'g61_Angler':{const owner=1-t.p;choice(s,t,t.optional===false?'相手の手札へ戻すマナを1枚選ぶ':'相手のマナを1枚、手札へ戻す？',[...(api.canMoveZone(s,owner,'mana')?s.players[owner].mana.filter(x=>!(s.players[owner].g34ManaHeld||[]).includes(x.uid)):[]).map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,x.faceDown?10:20-Math.min(cost(card(x)),15),x.faceDown?null:x.cardId)),...(t.optional===false?[]:[opt('戻さない',null,0)])]);break;}
 case'g61_NovaBurn':choice(s,t,'破壊する相手のパワー3000以下1体を選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>currentPower(s,x)<=3000)));break;
 case'g61_Poseidon':choice(s,t,'カードを2枚引きますか？',[opt('2枚引く',true,own.deck.length>2||creatures(s,t.p).some(x=>api.effective(x,s).shako)?20:-1000),opt('引かない',false,0)]);break;
 case'g61_Jet':choice(s,t,'破壊する相手のタップ済みクリーチャーを1体選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>x.tapped)));break;
 case'g61_ShellStorm':{const p=1-t.p;choice(s,{...t,p,controller:t.p},'マナゾーンに置く自分のクリーチャーを1体選ぶ',creatures(s,p).map(x=>opt(card(x).name,x.uid,api.canLeave(s,p,x)?-Math.min(cost(card(x)),20):50,x.cardId)));break;}
 case'g61_Izana':choice(s,t,'破壊する相手のパワー2000以下1体を選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>currentPower(s,x)<=2000)));break;
 case'g61_Cannon':choice(s,t,'破壊する相手のパワー'+(t.metamorph?6000:2000)+'以下1体を選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>currentPower(s,x)<=(t.metamorph?6000:2000))));break;
 case'g61_Punish':if(t.metamorph)choice(s,t,'相手の手札を見て、捨てさせる1枚を選ぶ',s.players[1-t.p].hand.map(x=>{const c=card(x),deploy=(c.enemyDiscardDeploy||c.discardDeploy&&t.p===s.active)&&api.canEnter(s,1-t.p,c,{origin:'hand',execution:false});return opt(c.name,x.uid,(deploy?-80:10)+Math.min(cost(c),20)*3,x.cardId);}));else put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n:1}));break;
 case'g61_Smoke':choice(s,t,'破壊する相手のアンタップしている1体を選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>!x.tapped)));break;
 case'g61_SmokeDraw':if(own.mana.some(x=>!x.faceDown&&api.manaColors(card(x),s,t.p).some(v=>t.colors.includes(v))))put(s,task('g34_Draw',t.p,t.source,{n:1,optional:true}));break;
 case'g61_Draco':choice(s,t,'タップする相手のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p)).map(o=>{const x=s.players[1-t.p].battle.find(x=>x.uid===o.value),dragon=String(api.effective(x,s).race).includes('ドラゴン'),risk=dragon&&api.canAddShield(s,t.p)&&own.deck.length<=1;return{...o,score:risk?-1000:(x.tapped?0:25)+Math.min(cost(card(x)),15)+(dragon&&api.canAddShield(s,t.p)?20:0)};}));break;
 case'g61_DracoShield':api.shieldTop(s,t.p,card(t.source));break;
 case'g61_Swamp':choice(s,t,'このターンのパワーを-3000する相手のタップ済み1体を選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>x.tapped)).map(o=>{const x=s.players[1-t.p].battle.find(x=>x.uid===o.value);return{...o,score:Math.min(cost(card(x)),15)+(currentPower(s,x)<=3000?35:5)};}));break;
 case'g61_GloryStone':if(s.players[1-t.p].mana.length>own.mana.length){const x=api.takeTop(s,t.p);if(x){const to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';api.clear(x,to);api.addZone(s,t.p,to,x);api.log(s,t.p,'reveal',card(t.source).name+'：'+card(x).name+'を'+(to==='mana'?'マナ':'墓地')+'へ',{cardId:x.cardId});api.deckCheck(s,t.p);}}break;
 case'g61_Accident':{const rows=[0,1].flatMap(p=>creatures(s,p).filter(x=>s.players[p].battle.some(g=>card(g).type==='gear'&&g.crossedTo?.uid===x.uid&&g.crossedTo.incarnation===(x.incarnation||0))).map(x=>({player:p,uid:x.uid,to:'grave',destroy:true,controller:t.p})));if(rows.length)api.move(s,rows);break;}
 case'g61_Backflow':{const groups=[s.active,1-s.active].map(p=>({p,cards:api.canMoveZone(s,p,'mana')?s.players[p].mana.filter(x=>!(s.players[p].g34ManaHeld||[]).includes(x.uid)):[]}));for(const {p,cards}of groups)for(const x of cards)api.remove(s.players[p].mana,x.uid);for(const {p,cards}of groups){for(const x of cards)api.clear(x,'hand');if(cards.length){api.addZone(s,p,'hand',...cards);api.log(s,p,'manaReturn',card(t.source).name+'：マナ'+cards.length+'枚を手札へ',{cardId:t.source});}}break;}
 case'g61_Kurt':choice(s,t,'山札の一番上に戻す墓地の呪文を1枚選ぶ',(api.canMoveZone(s,t.p,'grave')?own.grave.filter(x=>faces(card(x)).some(c=>c.type==='spell')):[]).map(x=>opt(card(x).name,x.uid,x.cardId===t.source?-5:30-Math.min(20,Math.abs(Math.min(...faces(card(x)).filter(c=>c.type==='spell').map(cost))-own.mana.length)),x.cardId)));break;
 case'g61_Justice':{const rows=[0,1].flatMap(p=>creatures(s,p).filter(x=>!api.effective(x,s).blocker).map(x=>({p,x})));for(const {p,x}of rows)api.tap(s,p,x);break;}
 case'g61_StrongDraw':if(creatures(s,t.p).some(x=>currentPower(s,x)>=6000))put(s,task('g34_Draw',t.p,t.source,{n:1,optional:true}));break;
 case'g61_StrongCrash':case'g61_StrongTrap':case'g61_StrongBreath':{queue(s,t,'StrongDraw');const xs=creatures(s,1-t.p).filter(x=>t.op==='g61_StrongCrash'?api.effective(x,s).blocker:t.op==='g61_StrongTrap'?currentPower(s,x)<=5000:!x.tapped);choice(s,t,t.op==='g61_StrongTrap'?'マナに置くパワー5000以下の相手1体を選ぶ':t.op==='g61_StrongCrash'?'破壊する相手のブロッカー1体を選ぶ':'破壊する相手のアンタップ済みクリーチャー1体を選ぶ',api.targetOptions(s,t.p,xs));break;}
 case'g61_Spiritual':{const n=creatures(s,1-t.p).filter(x=>x.tapped).length;if(n)put(s,task('g34_Draw',t.p,t.source,{n,optional:true}));break;}
 case'g61_ManaFactory':put(s,{...t,op:'g61_ManaReturn',n:2,optional:true,selected:[]});break;
 case'g61_ManaWave':put(s,{...t,op:'g61_ManaReturn',n:1,optional:false,selected:[]});break;
 case'g61_ManaReturn':{const xs=api.canMoveZone(s,t.p,'mana')?own.mana.filter(x=>!t.selected.includes(x.uid)&&!(own.g34ManaHeld||[]).includes(x.uid)):[];if(t.selected.length>=t.n||!xs.length){finishManaReturn(s,t);break;}choice(s,t,'マナから手札に戻すカードを'+t.n+'枚'+(t.optional?'まで':'')+'選ぶ（'+t.selected.length+'/'+t.n+'）',[...xs.map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,x.faceDown?15:15+Math.min(cost(card(x)),15)+(x.tapped?10:0),x.faceDown?null:x.cardId)),...(t.optional?[opt('ここまでで確定',null,0)]:[])]);break;}
 case'g61_Elemental':if(s.players[1-t.p].shields.length>own.shields.length)api.shieldTop(s,t.p,card(t.source));break;
 case'g61_Grappler':{const n=creatures(s,t.p).filter(x=>key(x)!==key(t)&&x.tapped).length;if(n)put(s,task('g34_Draw',t.p,t.source,{n,optional:true}));break;}
 case'g61_Choker':{const dragons=own.grave.filter(x=>String(card(x).race).includes('ドラゴン')),left=own.grave.filter(x=>!dragons.includes(x)&&card(x).type==='creature'),risk=creatures(s,t.p).some(x=>{const c=api.effective(x,s);return c.g117GraveCreaturePower&&!left.length||c.g122DarkGravePower&&!left.some(x=>api.colors(card(x)).includes('闇'));});choice(s,t,'墓地のドラゴンをすべて手札に戻す？',[opt('すべて戻す',true,api.canMoveZone(s,t.p,'grave')&&dragons.length&&!risk?30:-10),opt('戻さない',null,0)]);break;}
 case'g61_Demise':put(s,{...t,op:'g61_Sacrifice',p:1-t.p,controller:t.p});break;
 case'g61_Kusari':put(s,{...t,op:'g61_Sacrifice',p:1-t.p,untapped:true,controller:t.p});break;
 case'g61_Escort':choice(s,t,'手札へ戻す自分のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,creatures(s,t.p)).map(o=>({...o,score:api.canLeave(s,t.p,own.battle.find(x=>x.uid===o.value))?-cost(card(o.cardId))*4-(o.value===t.uid?10:0):50})));break;
 case'g61_Wave':{const rows=[t.p,1-t.p].flatMap(p=>creatures(s,p).filter(x=>!(p===t.p&&key(x)===key(t))&&api.colors(api.effective(x,s)).length<2).map(x=>({player:p,uid:x.uid,to:'hand',destroy:false,controller:t.p})));if(rows.length)api.move(s,rows);break;}
 case'g61_Chain':{const selected=t.selected||[],options=api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>!selected.some(r=>key(r)===key(x))));if(selected.length>=2||!options.length){finishChain(s,t);break;}choice(s,{...t,selected},'破壊する相手のクリーチャーを2体まで選ぶ（'+selected.length+'/2）',[...options,opt('ここまでで確定',null,0)]);break;}
 case'g61_Eco':{for(let i=0;i<2;i++){const x=api.takeTop(s,t.p);if(!x)break;const dragon=faces(card(x)).some(c=>String(c.race).includes('ドラゴン')),to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';api.clear(x,to);api.addZone(s,t.p,to,x);api.log(s,t.p,'reveal',card(t.source).name+'：'+card(x).name+'を'+(to==='mana'?'マナ':'墓地')+'へ',{cardId:x.cardId});if(!dragon)break;}api.deckCheck(s,t.p);break;}
 case'g61_Vines':put(s,{...t,op:'g61_Sacrifice',p:1-t.p,blocker:true,controller:t.p});break;
 case'g61_Zekira':put(s,{...t,op:'g61_Sacrifice',controller:t.p});break;
 case'g61_Sacrifice':choice(s,t,'破壊する自分の'+(t.untapped?'アンタップしている':'')+(t.blocker?'ブロッカー':'クリーチャー')+'を1体選ぶ',api.targetOptions(s,t.p,creatures(s,t.p).filter(x=>(!t.untapped||!x.tapped)&&(!t.blocker||api.effective(x,s).blocker))).map(o=>({...o,score:api.canLeave(s,t.p,own.battle.find(x=>x.uid===o.value))?-cost(card(o.cardId))*4:50})));break;
 case'g61_Genesis':choice(s,t,'破壊してカードを3枚引く自分のクリーチャーを1体まで選ぶ',[...api.targetOptions(s,t.p,creatures(s,t.p)).map(o=>({...o,score:own.deck.length>3||creatures(s,t.p).some(x=>x.uid!==o.value&&api.effective(x,s).shako)?40-cost(card(o.cardId))*3:-1000})),opt('破壊せずに使わない',null,0)]);break;
 case'g61_StrongGuard':case'g61_Protection':queue(s,t,t.op==='g61_StrongGuard'?'StrongDraw':'ProtectionDraw');if(api.canAddShield(s,t.p))choice(s,t,'新しいシールドとして裏向きに加える手札を1枚選ぶ',own.hand.map(x=>opt(card(x).name,x.uid,faces(card(x)).some(c=>c.trigger)?30:15-Math.min(cost(card(x)),30),x.cardId)));break;
 case'g61_ProtectionDraw':if(own.shields.length>s.players[1-t.p].shields.length)put(s,task('g34_Draw',t.p,t.source,{n:1,optional:true}));break;
 case'g61_DeathGate':choice(s,t,'破壊する相手のアンタップしているクリーチャーを1体選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>!x.tapped)));break;
 case'g61_Revive':put(s,task('g34_Select',t.p,t.source,{origin:'grave',n:1,deploy:true,optional:true,filter:{creature:true,nonEvolution:true,belowCost:t.max==='∞'?Number.MAX_SAFE_INTEGER:t.max},title:'破壊しようとした相手よりコストが小さい、進化ではない1体を墓地から出す？'}));break;
 case'g61_Ragmar':queue(s,t,'RagmarPick',{controller:t.p,owners:[s.active,1-s.active],selected:[]});break;
 case'g61_RagmarPick':{const owner=t.owners[0];if(owner===undefined){if(t.selected.length)api.move(s,t.selected.map(r=>({player:r.p,uid:r.uid,to:'mana',destroy:false,controller:t.controller})));break;}const xs=creatures(s,owner);if(!xs.length){queue(s,t,'RagmarPick',{owners:t.owners.slice(1)});break;}choice(s,{...t,p:owner},'自分のクリーチャーを1体選び、マナゾーンに置く',xs.map(x=>opt(card(x).name,x.uid,-cost(api.effective(x,s)),x.cardId)));break;}
 case'g61_Sonic':choice(s,t,'アンタップする自分のクリーチャーを1体選ぶ',creatures(s,t.p).map(x=>opt(card(x).name,x.uid,x.tapped?25:0,x.cardId)));break;
 case'g61_Piero':{const x=own.battle.find(x=>key(x)===key(t));if(x&&!x.sealed)choice(s,t,'ファル・ピエロを破壊して墓地の呪文を1枚手札へ戻す？',[opt('破壊して回収する',true,api.canMoveZone(s,t.p,'grave')&&own.grave.some(x=>faces(card(x)).some(c=>c.type==='spell'))?30:-10,x.cardId),opt('破壊しない',null,0)]);break;}
 case'g61_Treasure':{const xs=look(s,t,own.deck.length),ids=xs.map(x=>x.uid),hits=xs.filter(x=>faces(card(x)).every(c=>!api.colors(c).includes('自然')));choice(s,{...t,ids},'山札から自然を含まないカードを1枚までマナゾーンへ置く',[...hits.map(x=>opt(card(x).name,x.uid,10+Math.min(cost(card(x)),30),x.cardId)),opt('置かずにシャッフル',null,0)]);break;}
 case'g61_Clock':{const xs=look(s,t,3),ids=xs.map(x=>x.uid);if(xs.length)choice(s,{...t,ids},'上から見たカードのうち、手札に加える1枚を選ぶ',xs.map(x=>opt(card(x).name,x.uid,Math.min(cost(card(x)),30),x.cardId)));else release(s,t.p,ids);break;}
 case'g61_ClockBottom':{const xs=t.ids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(Boolean);if(xs.length)choice(s,t,'山札の一番下に置く1枚を選ぶ',xs.map(x=>opt(card(x).name,x.uid,0,x.cardId)));else release(s,t.p,t.ids);break;}
 default:throw Error('未実装の資源ユーティリティ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g61_'))return false;const own=s.players[t.p];switch(t.op){
 case'g61_PlotTarget':if(v)api.move(s,[{player:1-t.p,uid:v,to:'hand',destroy:false,controller:t.p}]);break;
 case'g61_Core':if(v){const moved=api.moveShield(s,1-t.p,v,'grave');api.log(s,t.p,'shieldBurn',card(t.source).name+'：相手のシールド1つ（カード'+moved.length+'枚）を墓地へ',{cardId:t.source});}break;
 case'g61_Jamming':for(const p of[0,1])for(const x of creatures(s,p))if(api.colors(api.effective(x,s)).includes(v))api.tap(s,p,x);break;
 case'g61_Searcher':{const x=v&&t.ids.includes(v)&&api.canMoveZone(s,t.p,'deck')&&own.deck.find(x=>x.uid===v);if(x){api.remove(own.deck,x.uid);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);api.log(s,t.p,'look',card(t.source).name+'：山札から手札に1枚加えた',{cardId:t.source});}release(s,t.p,t.ids);api.shuffleLibrary(s,t.p);api.deckCheck(s,t.p);break;}
 case'g61_Reaction':{const n=creatures(s,1-t.p).filter(x=>api.colors(api.effective(x,s)).includes(v)).length;if(n)put(s,task('g34_Draw',t.p,t.source,{n}));break;}
 case'g61_DisasterPick':if(v)api.move(s,[{player:t.p,uid:v,to:'hand',destroy:false,controller:t.controller}]);break;
 case'g61_Ice':if(v)api.move(s,[{player:1-t.p,uid:v,to:'mana',destroy:false,controller:t.p}]);break;
 case'g61_Fal':case'g61_Thief':if(v&&api.canMoveZone(s,t.p,'grave')){const x=api.remove(own.grave,v);if(x){api.clear(x,'hand');api.addZone(s,t.p,'hand',x);api.log(s,t.p,'reveal',card(t.source).name+'：'+card(x).name+'を墓地から手札へ',{cardId:x.cardId});}}break;
 case'g61_Bronx':if(v){const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(p>=0)api.move(s,[{player:p,uid:v,to:'grave',destroy:true,controller:t.p}]);}break;
 case'g61_Axe':if(v){const x=api.takeTop(s,t.p);if(x){const to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';api.clear(x,to);api.addZone(s,t.p,to,x);api.log(s,t.p,'reveal',card(t.source).name+'：'+card(x).name+'を'+(to==='mana'?'マナ':'墓地')+'へ',{cardId:x.cardId});}api.deckCheck(s,t.p);}break;
 case'g61_ManaGrave':if(v&&api.canMoveZone(s,t.owner,'mana')){const x=api.remove(s.players[t.owner].mana,v);if(x){api.clear(x,'grave');api.addZone(s,t.owner,'grave',x);api.log(s,t.p,'reveal',card(t.source).name+'：'+card(x).name+'をマナから墓地へ',{cardId:x.cardId});}}break;
 case'g61_Maboroshi':if(v&&api.canMoveZone(s,t.p,'grave')&&!api.manaRedirect(s,t.p)){const x=api.remove(own.grave,v);if(x){api.clear(x,'mana');api.addZone(s,t.p,'mana',x);api.log(s,t.p,'reveal',card(t.source).name+'：'+card(x).name+'を墓地からマナへ',{cardId:x.cardId});}}break;
 case'g61_DeformerPick':if(v)queue(s,t,'DeformerPick',{selected:[...t.selected,{p:t.p,uid:v}]});break;
 case'g61_Reiz':if(v&&api.canMoveZone(s,t.p,'grave')){const x=api.remove(own.grave,v);if(x){api.clear(x,'hand');api.addZone(s,t.p,'hand',x);api.log(s,t.p,'reveal',card(t.source).name+'：'+card(x).name+'を墓地から手札へ',{cardId:x.cardId});}}break;
 case'g61_Neptas':if(v){const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(p>=0)api.move(s,[{player:p,uid:v,to:'hand',destroy:false,controller:t.p}]);}break;
 case'g61_Pepper':if(v)api.move(s,[{player:t.p,uid:v,to:'mana',destroy:false,controller:t.p}]);break;
 case'g61_Amber':if(v&&api.canMoveZone(s,t.p,'grave')){const x=api.remove(own.grave,v);if(x){api.clear(x,'hand');api.addZone(s,t.p,'hand',x);api.log(s,t.p,'reveal',card(t.source).name+'：'+card(x).name+'を墓地から手札へ',{cardId:x.cardId});}}break;
 case'g61_Nenbutsu':if(v&&api.canMoveZone(s,1-t.p,'grave')){const x=api.remove(s.players[1-t.p].grave,v);if(x){api.clear(x,'deck');s.players[1-t.p].deck.push(x);api.log(s,t.p,'reveal',card(t.source).name+'：'+card(x).name+'を相手の山札の一番下へ',{cardId:x.cardId});}}break;
 case'g61_Maria':if(v)api.move(s,[{player:t.p,uid:v,to:'hand',destroy:false,controller:t.p}]);break;
 case'g61_Negio':if(v&&api.canMoveZone(s,t.p,'mana')){const x=api.remove(own.mana,v);if(x){api.clear(x,'deck');own.deck.unshift(x);api.log(s,t.p,'manaTop',card(t.source).name+'：マナ1枚を山札の一番上へ',{cardId:t.source});queue(s,t,'NegioGrave');}}break;
 case'g61_NegioGrave':if(v&&api.canMoveZone(s,t.p,'grave')){const x=own.grave.find(x=>x.uid===v);if(x&&!api.manaRedirect(s,t.p)){api.remove(own.grave,v);api.clear(x,'mana');api.addZone(s,t.p,'mana',x);api.log(s,t.p,'reveal',card(t.source).name+'：'+card(x).name+'をマナへ',{cardId:x.cardId});}}break;
 case'g61_Angler':if(v&&api.canMoveZone(s,1-t.p,'mana')){const x=api.remove(s.players[1-t.p].mana,v);if(x){api.clear(x,'hand');api.addZone(s,1-t.p,'hand',x);api.log(s,t.p,'manaReturn',card(t.source).name+'：相手のマナ1枚を手札へ',{cardId:t.source});}}break;
 case'g61_Poseidon':if(v)api.draw(s,t.p,2);break;
 case'g61_ShellStorm':if(v)api.move(s,[{player:t.p,uid:v,to:'mana',destroy:false,controller:t.controller}]);break;
 case'g61_NovaBurn':case'g61_Jet':case'g61_Izana':case'g61_Cannon':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);break;
 case'g61_Punish':if(v)put(s,task('discardChosen',1-t.p,t.source,{uid:v,causedBy:t.p,n:1}));break;
 case'g61_Smoke':{const x=creatures(s,1-t.p).find(x=>x.uid===v);if(x){queue(s,t,'SmokeDraw',{colors:api.colors(api.effective(x,s))});api.move(s,[{player:1-t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);}break;}
 case'g61_Draco':{const x=creatures(s,1-t.p).find(x=>x.uid===v);if(x){if(String(api.effective(x,s).race).includes('ドラゴン'))queue(s,t,'DracoShield');api.tap(s,1-t.p,x);}break;}
 case'g61_Swamp':{const x=creatures(s,1-t.p).find(x=>x.uid===v);if(x)(x.powerModifiers??=[]).push({amount:-3000,expires:'end',who:s.active,spellSource:t.source,spellCost:cost(card(t.source))});break;}
 case'g61_Kurt':if(v&&api.canMoveZone(s,t.p,'grave')){const x=api.remove(own.grave,v);if(x){api.clear(x,'deck');own.deck.unshift(x);api.log(s,t.p,'reveal',card(t.source).name+'で山札の一番上へ：'+card(x).name,{cardId:x.cardId});}}break;
 case'g61_StrongCrash':case'g61_StrongTrap':case'g61_StrongBreath':if(v)api.move(s,[{player:1-t.p,uid:v,to:t.op==='g61_StrongTrap'?'mana':'grave',destroy:t.op!=='g61_StrongTrap',controller:t.p}]);break;
 case'g61_ManaReturn':if(v)put(s,{...t,selected:[...t.selected,v]});else finishManaReturn(s,t);break;
 case'g61_Choker':if(v)put(s,task('g34_Select',t.p,t.source,{origin:'grave',to:'hand',n:'all',filter:{race:'ドラゴン'},title:'墓地のドラゴンをすべて手札へ戻す'}));break;
 case'g61_Escort':if(v)api.move(s,[{player:t.p,uid:v,to:'hand',destroy:false,controller:t.p}]);break;
 case'g61_Chain':if(v){const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)put(s,{...t,selected:[...t.selected,{uid:x.uid,incarnation:x.incarnation||0}]});}else finishChain(s,t);break;
 case'g61_Sacrifice':if(v)api.move(s,[{player:t.p,uid:v,to:'grave',destroy:true,controller:t.controller??t.p}]);break;
 case'g61_Genesis':{const x=creatures(s,t.p).find(x=>x.uid===v);if(x){put(s,task('g34_Draw',t.p,t.source,{n:3}));api.move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);}break;}
 case'g61_StrongGuard':case'g61_Protection':{const x=own.hand.find(x=>x.uid===v);if(x&&api.canAddShield(s,t.p)){api.remove(own.hand,x.uid);api.clear(x,'shields');api.addZone(s,t.p,'shields',x);api.notifyShieldAdded(s,t.p,x);}break;}
 case'g61_DeathGate':{const x=creatures(s,1-t.p).find(x=>x.uid===v&&!x.tapped);if(x){const n=cost(api.effective(x,s));queue(s,t,'Revive',{max:Number.isFinite(n)?n:'∞'});api.move(s,[{player:1-t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);}break;}
 case'g61_RagmarPick':queue(s,{...t,p:t.controller},'RagmarPick',{owners:t.owners.slice(1),selected:[...t.selected,{p:t.p,uid:v}]});break;
 case'g61_Sonic':{const x=creatures(s,t.p).find(x=>x.uid===v);if(x)put(s,task('g34_Untap',t.p,t.source,{uid:x.uid,incarnation:x.incarnation||0}));break;}
 case'g61_Piero':{const x=own.battle.find(x=>key(x)===key(t));if(v&&x&&!x.sealed){put(s,task('g34_Select',t.p,t.source,{origin:'grave',to:'hand',n:1,optional:false,filter:{spell:true},title:'墓地から手札に戻す呪文を1枚選ぶ'}));api.move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);}break;}
 case'g61_Treasure':{const x=v&&own.deck.find(x=>x.uid===v);if(x&&t.ids.includes(x.uid)&&faces(card(x)).every(c=>!api.colors(c).includes('自然'))){api.remove(own.deck,x.uid);const to=api.deckRedirect(s,t.p)?'grave':'mana';api.clear(x,to);api.addZone(s,t.p,to,x);api.log(s,t.p,'reveal',card(t.source).name+'で選択：'+card(x).name,{cardId:x.cardId});}release(s,t.p,t.ids);api.shuffleLibrary(s,t.p);api.deckCheck(s,t.p);break;}
 case'g61_Clock':{const x=own.deck.find(x=>x.uid===v);if(x&&t.ids.includes(v)){api.remove(own.deck,x.uid);release(s,t.p,[x.uid]);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);queue(s,t,'ClockBottom',{ids:t.ids.filter(uid=>uid!==v)});api.deckCheck(s,t.p);}break;}
 case'g61_ClockBottom':{const x=own.deck.find(x=>x.uid===v);if(x&&t.ids.includes(v)){api.remove(own.deck,x.uid);own.deck.push(x);}release(s,t.p,t.ids);break;}
 default:throw Error('未実装の資源ユーティリティ選択：'+t.op);
 }return true;}
 const enqueue=(s,p,x,t)=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:t});
 const snapshot=s=>[0,1].flatMap(p=>creatures(s,p).map(x=>{const c=api.effective(x,s);return{p,uid:x.uid,incarnation:x.incarnation||0,cardId:x.cardId,draw:!!c.g132GraveDraw,burn:!!c.g132DeathBurn,tap:!!c.g143DeathTap};}).filter(x=>x.draw||x.burn||x.tap));
 return{run,chosen,snapshot,leaving(s,p,x,before,to,destroy){if(to!=='grave')return;const ref=(before||snapshot(s)).find(y=>y.p===p&&key(y)===key(x));if(!ref)return;if(ref.draw)enqueue(s,p,ref,task('g34_Draw',p,ref.cardId,{n:1,optional:true}));if(ref.burn&&destroy)enqueue(s,p,ref,task('g61_NovaBurn',p,ref.cardId));if(ref.tap&&destroy)enqueue(s,p,ref,task('g34_Target',p,ref.cardId,{tap:true,optional:true}));},attack(s,p,x){if(api.selfStopped(s,p))return;const c=api.effective(x,s);if(c.g137RampAttack)enqueue(s,p,x,task('g61_Axe',p,x.cardId));if(c.g136ManaBurnAttack)enqueue(s,p,x,task('g61_Bolzard',p,x.cardId));if(c.g136NatureRecoverAttack)enqueue(s,p,x,task('g61_Maboroshi',p,x.cardId));if(c.g135BounceAttack)enqueue(s,p,x,task('g61_Neptas',p,x.cardId));if(c.g134GraveAttack)enqueue(s,p,x,task('g61_Amber',p,x.cardId));if(c.g125Grappler)enqueue(s,p,x,task('g61_Grappler',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0}));if(c.g132ManaReturn)enqueue(s,p,x,task('g61_ManaReturn',p,x.cardId,{n:1,optional:false,selected:[]}));if(c.g132EnemyManaReturn)enqueue(s,p,x,task('g61_Angler',p,x.cardId));},effect(s,p,c,uid,entry){if(!c.g61Effect)return false;put(s,task('g61_'+c.g61Effect,p,c.id,{uid,incarnation:entry?.incarnation||0,...(c.g129Role==='cannon'||c.g129Role==='punish'?{metamorph:c.g129Metamorph??s.players[p].mana.length>=7}:{})}));return true;}};
}
