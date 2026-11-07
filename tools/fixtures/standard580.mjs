const batch=[
  'dmr23-s02','dmex14-074','dmrp12-092','dm22rp2-039','dmr15-050',
  'dmx23-007','dmrp19-034','dmrp06-s04','dmrp10-031'
];
const support=[
  {id:'dm01-083',count:4},{id:'dm01-090',count:4},{id:'dm01-097',count:4},
  {id:'dm01-108',count:4},{id:'dm23ex2-071',count:3},{id:'dmrp21-010',count:3}
];

export const STANDARD580_DECK={
  id:'standard580',name:'カード指定と選択順',format:'original',
  cards:[...batch.map(id=>({id,count:2})),...support]
};
