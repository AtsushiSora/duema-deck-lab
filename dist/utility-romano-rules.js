// The casting source is carried on the physical spell until its execution finishes.
export function createUtilityRomanoRules(api){
 const{card,faces,cost,colors,effective,creatures,put,task,choice,opt}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed),follow=(t,op,more={})=>({...t,op:'g85_'+op,...more});
 function monoDark(s,p){const all=s.players[p].battle.some(x=>!x.sealed&&(card(x).casablanca||card(x).g51Courtney)&&!api.ignored(s,x));return s.players[p].mana.every(x=>all||api.manaColors(x.faceDown?{civilizations:[],civ:'ゼロ'}:card(x)).includes('闇'));}
 function weaken(s,t,uid){const list=living(s,1-t.p).filter(x=>x.uid===uid||t.sweep);for(const x of list)(x.powerModifiers??=[]).push({amount:t.amount,expires:'end',who:s.active,...(t.spell?{spellSource:t.source,spellCost:cost(card(t.source))}:{})});}
 function run(s,t){if(!t.op.startsWith('g85_'))return false;const own=s.players[t.p];switch(t.op){
 case'g85_RomanoCast':{const rows=api.canMoveZone(s,t.p,'grave')?own.grave.flatMap(x=>faces(card(x)).flatMap((c,face)=>c.type==='spell'&&colors(c).includes('闇')&&cost(c)<=6&&api.canCast(s,t.p,c,'grave')?[opt(c.name,{uid:x.uid,face},20+cost(c),x.cardId)]:[])):[];choice(s,t,'墓地から闇のコスト6以下の呪文を1枚まで無料で唱える',[...rows,opt('唱えない',null,0)]);break;}
 case'g85_Strike':case'g85_Zanji':{const options=api.targetOptions(s,t.p,living(s,1-t.p));if(options.length)choice(s,t,'パワーを'+t.amount+'する相手のクリーチャーを1体選ぶ',options.map(o=>({...o,score:api.power(s.players[1-t.p].battle.find(x=>x.uid===o.value),false,s)<=-t.amount?40+o.score:o.score})));else if(t.sweep)weaken(s,t,null);break;}
 case'g85_Jack':{const max=t.maxPower??2000;choice(s,t,'破壊する相手のパワー'+max+'以下のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,living(s,1-t.p).filter(x=>api.power(x,x.uid===s.attack?.attacker,s)<=max)));break;}
 case'g85_ZamarDiscard':if(monoDark(s,t.p))put(s,task('discard',1-t.p,t.source,{n:1,random:true,causedBy:t.p}));break;
 default:throw Error('未実装のロマノフ・闇の防御効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g85_'))return false;const own=s.players[t.p];switch(t.op){
 case'g85_RomanoCast':if(v&&api.canMoveZone(s,t.p,'grave')){const x=own.grave.find(x=>x.uid===v.uid),c=x&&faces(card(x))[v.face];if(x&&c?.type==='spell'&&colors(c).includes('闇')&&cost(c)<=6&&api.canCast(s,t.p,c,'grave')){x.finishTo='deck';x.g85RomanoCast=true;api.cast(s,t.p,x.uid,true,null,v.face,null,'grave','邪眼皇ロマノフI世');}}break;
 case'g85_Strike':case'g85_Zanji':if(v)weaken(s,t,v);break;
 case'g85_Jack':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);break;
 default:throw Error('未実装のロマノフ・闇の防御選択：'+t.op);
 }return true;}
 return{run,chosen,monoDark,effect(s,p,c,uid){if(!c.g85Effect)return false;const amount=c.g85Effect==='Strike'?-5000:-2000,sweep=c.g85Effect==='Strike'&&!!s.extSpells?.find(f=>f.inst.uid===uid)?.inst.g85RomanoCast;put(s,task('g85_'+c.g85Effect,p,c.id,{uid,amount,spell:c.type==='spell',sweep,maxPower:c.g85JackMax??2000}));return true;},
 decorate(s,p,x,c){return c.g85Zamar&&monoDark(s,p)?{...c,power:c.power+2000}:c;},
 attack(s,p,x){if(api.selfStopped(s,p))return;const c=effective(x,s),op=c.g85Romano?'RomanoCast':c.g85Zamar&&monoDark(s,p)?'ZamarDiscard':null;if(op)api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g85_'+op,p,x.cardId)});},
 mainActions(s,p){const own=s.players[p];if(own.grave.filter(x=>card(x).type==='creature').length<6)return[];return own.hand.filter(x=>card(x).g85Morse&&api.canCast(s,p,card(x),'hand')&&api.canEnter(s,p,card(x),{origin:'hand',execution:true})).map(x=>({kind:'play',uid:x.uid,cardId:x.cardId,cost:0,freeSummon:'G・ゼロ',label:card(x).name+'をG・ゼロで召喚'}));}};
}
