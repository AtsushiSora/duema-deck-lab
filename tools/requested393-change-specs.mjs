// Complete official abilities for the requested J-change/J-crime and twinpact cards.
const spell=(id,name,cost,defs)=>({id,name,type:'spell',civ:'自然',civilizations:['自然'],cost,effect:'sixPhoto',g34Tasks:defs});
export const REQUESTED393_CHANGE_SPECS={
 'dm26rp3-046':{exLife:true,g393Smash:true,spellFace:spell('dm26rp3-046','ジョリー・ザ・トラップ',2,[{op:'Ramp',n:1}])},
 'dm26rp3-052':{g393Change:{mana:4,grave:6},effect:'sixPhoto',g34Tasks:[{op:'Mill',n:3},{op:'Select',origin:'grave',to:'mana',n:1,optional:true,filter:{creature:true},title:'マナに置く墓地のクリーチャーを1体まで選ぶ'}]},
 'dm26rp3-S004':{slayer:true,g393Change:{grave:8},effect:'sixPhoto',g34Tasks:[{op:'Discard',n:1,random:true},{op:'DiscardFor248',defs:[{op:'Target',power:-4000,g242PowerMinus:true,title:'パワーを-4000する相手のクリーチャーを1体選ぶ'}]}]},
 'dm26rp3-045':{gStrike:true,machFighter:true,breaker:2,g393Change:{mana:8},spellFace:spell('dm26rp3-045','メモメモ・ジョーカーズ',1,[{op:'Look',n:3,g255Search:true,stages:[{n:1,to:'hand',optional:true,reveal:true,filter:{race:'ジョーカーズ'}}],rest:'bottom'}])},
 'dm24bd3-010':{gStrike:true,starEvolution:true,evolution:{any:[{race:'レクスターズ'},{civilization:'自然'}]},invasion:{colors:['自然'],categories:['レクスターズ'],min:4,origins:['hand']},breaker:2,effect:'sixPhoto',g34Tasks:[{op:'Ramp',n:1},{op:'Select',origin:'mana',to:'hand',n:1,optional:true,g232ManaReturn:true,title:'手札に戻す自分のマナを1枚まで選ぶ'}]}
};
