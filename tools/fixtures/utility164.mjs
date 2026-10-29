const requested=['dmr03-051','dmex06-042','dmr22-039','dmr18-036','dm13-s04','dmx21-060'];
const make=(id,name,other)=>({id,name,format:'original',cards:[...requested,...other].map(id=>({id,count:4}))});
export const UTILITY164_DECKS=[
 make('utility164-resource','手札補充・多色マナ・シンパシーの検証',['dmrp17-025','dm03-053','dm01-106','dm01-083']),
 make('utility164-shields','シールド移動とチャージャーの検証',['dm01-084','dm01-089','dm01-108','dm01-097'])
];
