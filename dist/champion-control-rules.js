// Official Original control decks: physical zone moves and serializable modal choices.
export function createControlChampionRules(api){
 const {card,cost,effective,creatures,put,task,choice,opt,skip,targetOptions}=api;
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g44_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g44_'+op,...more});
 const movable=(s,p,origin)=>api.canMoveZone(s,p,origin);
 const manaCreatures=(s,p)=>movable(s,p,'mana')?s.players[p].mana.filter(x=>card(x).type==='creature'&&cost(card(x))<=5&&api.canEnter(s,p,card(x),{origin:'mana',execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length)):[];
 const modeNames=['山札の上1枚をタップしてマナへ','マナからコスト5以下のクリーチャーを1体出す','自分の1体をパワー+3000・アンタップ中のクリーチャーも攻撃可能にする'];
 function run(s,t){if(!t.op?.startsWith('g44_'))return false;const own=s.players[t.p];switch(t.op){
 case'g44_Bella':choice(s,t,'山札の上を見るプレイヤーを選ぶ',[opt('自分',t.p,10),opt('相手',1-t.p,8)]);break;
 case'g44_BellaLook':{if(t.owner===t.p&&api.deckLocked(s,t.p))break;const target=s.players[t.owner],protectedIds=new Set(Object.entries(target).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v)),x=target.deck.find(x=>!protectedIds.has(x.uid));if(!x)break;const isPublic=t.owner===t.p&&api.lookPublic(s,t.p);api.log(s,t.p,isPublic?'reveal':'look',card(t.source).name+'：'+(t.owner===t.p?'自分':'相手')+'の山札の上は'+card(x).name,{cardId:x.cardId});choice(s,{...t,uid:x.uid,serial:x.zoneSerial||0},card(x).name+'を山札の下に置く？',[opt('山札の下に置く',true,t.owner===t.p?cost(card(x))>5?-2:1:cost(card(x))>4?10:0,x.cardId),opt('山札の上に残す',false,0,x.cardId)]);break;}
 case'g44_Kooni':case'g44_School':{const rows=own.battle.filter(x=>api.isCreature(s,x)||t.op==='g44_Kooni'&&card(x).type==='seed');queue(s,t,'SchoolSelect',{seed:t.op==='g44_Kooni',selected:[],n:Math.min(2,rows.length)});break;}
 case'g44_SchoolSelect':{const rows=own.battle.filter(x=>!t.selected.includes(x.uid)&&(api.isCreature(s,x)||t.seed&&card(x).type==='seed'));if(t.selected.length>=t.n||!rows.length){put(s,task('g44_SchoolOpponent',1-t.p,t.source,{controller:t.controller??t.p}));if(t.selected.length)api.move(s,t.selected.map(uid=>({player:t.p,uid,to:'grave',destroy:true,controller:t.controller??t.p})));break;}choice(s,t,'破壊する自分の'+(t.seed?'クリーチャーかタマシード':'クリーチャー')+'を2つ選ぶ（'+t.selected.length+'/2）',targetOptions(s,t.p,rows).map(o=>({...o,score:-o.score})));break;}
 case'g44_SchoolOpponent':choice(s,t,'破壊する自分のクリーチャーを1体選ぶ',targetOptions(s,t.p,creatures(s,t.p)).map(o=>({...o,score:-o.score})));break;
 case'g44_Rigel':{const options=['mana','grave'].flatMap(origin=>movable(s,t.p,origin)?own[origin].map(x=>opt((origin==='mana'?'マナ：':'墓地：')+card(x).name,{uid:x.uid,origin},10+cost(card(x)),x.cardId)):[]);choice(s,t,'マナか墓地からカードを1枚まで手札に戻す',[...options,skip()]);break;}
 case'g44_Yuzo':api.draw(s,t.p,2);put(s,task('discard',t.p,t.source,{n:2,causedBy:t.p}),task('g44_YuzoRevive',t.p,t.source));break;
 case'g44_YuzoRevive':if(movable(s,t.p,'grave'))put(s,task('g34_Select',t.p,t.source,{origin:'grave',n:2,optional:true,deploy:true,filter:{creature:true,max:2},title:'墓地からコスト2以下のクリーチャーを2体まで出す'}));break;
 case'g44_Decision':choice(s,{...t,selected:t.selected||[]},'生命と大地と轟破の決断：2回選ぶ（'+(t.selected?.length||0)+'/2・同じ効果も可）',modeNames.map((name,value)=>opt(name,value,value===0?own.deck.length>1?12:-100:value===1?manaCreatures(s,t.p).length?25:0:creatures(s,t.p).some(x=>x.entered<s.turn)?8:0)));break;
 case'g44_DecisionMode':if(t.mode===0)put(s,task('g34_Ramp',t.p,t.source,{n:1,tapped:true}));else if(t.mode===1){if(movable(s,t.p,'mana'))put(s,task('g34_Select',t.p,t.source,{origin:'mana',n:1,optional:false,deploy:true,filter:{creature:true,max:5},title:'マナからコスト5以下のクリーチャーを1体出す'}));}else queue(s,t,'DecisionBuff');break;
 case'g44_DecisionBuff':choice(s,t,'パワーを+3000し、アンタップ中の相手も攻撃できる自分の1体を選ぶ',targetOptions(s,t.p,creatures(s,t.p)));break;
 default:throw Error('未実装の優勝コントロール効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op?.startsWith('g44_'))return false;const own=s.players[t.p];switch(t.op){
 case'g44_Bella':queue(s,t,'BellaLook',{owner:v});break;
 case'g44_BellaLook':if(v){const target=s.players[t.owner],x=target.deck.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);if(x){api.remove(target.deck,x.uid);target.deck.push(x);api.log(s,t.p,'bottom',card(t.source).name+'：見たカードを山札の下に置いた',{cardId:t.source});}}break;
 case'g44_SchoolSelect':queue(s,t,'SchoolSelect',{selected:[...t.selected,v]});break;
 case'g44_SchoolOpponent':if(v)api.move(s,[{player:t.p,uid:v,to:'grave',destroy:true,controller:t.controller??1-t.p}]);break;
 case'g44_Rigel':if(v&&movable(s,t.p,v.origin)){const x=api.remove(own[v.origin],v.uid);if(x){api.clear(x,'hand');api.addZone(s,t.p,'hand',x);}}break;
 case'g44_Decision':{const selected=[...t.selected,v];if(selected.length===2)put(s,...selected.sort((a,b)=>a-b).map(mode=>task('g44_DecisionMode',t.p,t.source,{mode})));else queue(s,t,'Decision',{selected});break;}
 case'g44_DecisionBuff':{const x=own.battle.find(x=>x.uid===v);if(x){(x.powerModifiers??=[]).push({amount:3000,expires:'end',who:s.active});(x.g34Grants??=[]).push({turn:s.turn,attackUntapped:true});}break;}
 default:throw Error('未実装の優勝コントロール選択：'+t.op);
 }return true;}
 return {run,chosen,
 effect(s,p,c){if(!c.g44Effect)return false;put(s,task('g44_'+c.g44Effect,p,c.id));return true;},
 entry(s,p,x){if(!api.isCreature(s,x))return;for(const w of creatures(s,p).filter(w=>w.uid!==x.uid&&!api.ignored(s,w)&&effective(w,s).g44Bella))on(s,p,w,'Bella');},
 mainActions(s,p){return movable(s,p,'mana')?s.players[p].mana.filter(x=>card(x).g44ManaSpell&&api.canCast(s,p,card(x),'mana')&&api.canPay(s,p,card(x))).map(x=>({kind:'play',uid:x.uid,cardId:x.cardId,origin:'mana',alternative:'g44Mana',cost:api.summonCost(s,p,card(x)),label:card(x).name+'をマナから唱える'})):[];},
 alternative(s,p,a){const x=s.players[p].mana.find(x=>x.uid===a.uid);if(!x||!movable(s,p,'mana'))return;x.finishTo='deck';api.cast(s,p,a.uid,false,null,0,null,'mana','生命と大地と轟破の決断');},
 played(s,p,c,x,origin){if(c.g44ManaSpell&&origin==='mana')x.finishTo='deck';},
 };
}
