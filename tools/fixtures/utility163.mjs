const requested=['dmsd21-011','dm26ex4-074','dm14-004','dmrp18-079','dmx15-030','dmr18-050'];
const make=(id,name,other)=>({id,name,format:'original',cards:[...requested,...other].map(id=>({id,count:4}))});
export const UTILITY163_DECKS=[
 make('utility163-control','手札破壊・除去・進化の検証',['dm01-083','dm01-090','dm01-108','dm01-097']),
 make('utility163-defense','速攻対策とシールド・トリガーの検証',['dm01-084','dm01-089','dm01-108','dm01-097'])
];
