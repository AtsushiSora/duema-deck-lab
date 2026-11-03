const shuge={op:'Select',zones:['hand','mana'],n:1,optional:true,deploy:true,noEvolve:true,filter:{creature:true,nonEvolution:true,max:5},title:'手札かマナから出すコスト5以下の進化ではないクリーチャーを1体まで選ぶ'};
export const REQUESTED393_JOKER_SPECS={
 'dm25ex2-045':{g393JWDFaces:[{name:'欲望の邪道 ニガ=アブシューム',type:'field',cost:5,power:0,race:'',civ:'闇',civilizations:['闇'],g393JWDFront:true},{name:'支配の邪道 獄鬼夜城',type:'field',cost:3,power:0,race:'',civ:'闇',civilizations:['闇'],g393JWDBack:true}]},
 'dmrp22-1B':{sMax:true,g34SmaxLoss:true,breaker:2,g393JMaxG:true,effect:'champion'},
 'dm26rp3-OR001':{slayer:true,breaker:'∞',worldBreaker:true,g393JSigma:true,effect:'champion'},
 'dmrp07-s10':{machFighter:true,breaker:2,g209BattlePower:{amount:6000},g393JDonJungle:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'mana',n:1,optional:true,deploy:true,filter:{creature:true,maxPower:7000},title:'マナから出すパワー7000以下のクリーチャーを1体まで選ぶ'}]},
 'dm26rp3-S006':{machFighter:true,breaker:3,g393JThunder:true,effect:'sixPhoto',g34Tasks:[{op:'Choose',repeat:3,g184Modes:true,title:'サンダイテイオー：効果を3回選ぶ',modes:[{label:'相手のクリーチャー1体をマナへ',defs:[{op:'Target',to:'mana'}]},{label:'山札の上1枚をマナへ',defs:[{op:'Ramp',n:1}]},{label:'マナのクリーチャー1体を手札へ',defs:[{op:'Select',origin:'mana',to:'hand',n:1,filter:{creature:true},title:'マナから手札へ戻すクリーチャーを1体選ぶ'}]}]}]},
 'dmr08-021':{trigger:true,g393JPurin:true,effect:'sixPhoto',g34Tasks:[{op:'Target',anyOwner:true,g235TapOrUntap:true,title:'タップまたはアンタップするクリーチャーを選ぶ'}]},
 'dmr10-s01':{breaker:2,effect:'sixPhoto',g34Tasks:[structuredClone(shuge)],g34Attack:[structuredClone(shuge)]}
};
export const REQUESTED393_JOKER_RULE_SOURCES=['https://dm.takaratomy.co.jp/rule/qa/49402/'];
