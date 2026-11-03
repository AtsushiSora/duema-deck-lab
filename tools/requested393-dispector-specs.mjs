// Every face and paragraph is verified by support-phase-393 before publication.
export const REQUESTED393_DISPECTOR_SPECS={
 'dmrp19-km2':{exLife:true,speedAttacker:true,breaker:3,justDiver:true,g393DRole:'volval',g34Attack:[{op:'Look',n:5,stages:[{n:2,to:'hand',optional:true}],rest:'bottom'},{op:'Offer',title:'パワー6000以下のクリーチャーをすべて破壊する？',defs:[{op:'Sweep',both:true,to:'grave',filter:{creature:true,maxPower:6000}}]}]},
 'dm26rp3-010':{exLife:true,speedAttacker:true,breaker:3,superGuardman:true,effect:'champion',g393DEntry:'iron',g393DRole:'iron'},
 'dmsd19-001':{exLife:true,speedAttacker:true,breaker:2,effect:'sixPhoto',g34Tasks:[{op:'UntapMana',filter:{raceAny:['ディスペクター','ディスタス']}}],g393DRole:'next'},
 'dmrp19-011':{effect:'champion',g393DEntry:'premium',g393DChance:true},
 'dm26rp3-044':{sasage:2,g393DRole:'maxi'},
 'dm26rp3-S009':{g211Sympathy:{amount:1,filter:{creature:true}},exLife:true,speedAttacker:true,breaker:2,superGuardman:true,g393DRole:'gorina'}
};
export const REQUESTED393_DISPECTOR_SOURCES=Object.keys(REQUESTED393_DISPECTOR_SPECS).map(id=>'https://dm.takaratomy.co.jp/card/detail/?id='+id);
