const batch=[
  'dmrp18-082','dm25-025','dmsd13-008','dmrp04s-017','dmr11-043','dm24rp3-069',
  'dmr18-003','dmc27-003','dmbd17-010','dmr10-026','dmx07-019'
];
const support=['dm01-083','dm01-090','dm01-097','dmsd01-011'];

export const STANDARD584_DECK={
  id:'standard584',name:'手札の入れ替えと条件付きの追加効果',format:'original',
  cards:[...batch.map(id=>({id,count:2})),...support.map(id=>({id,count:4})),{id:'dmx17-008',count:2}]
};
