const batch=[
  'dm23rp3-001','dm23rp4-045','dm24bd3-009','dmx17-037','dm23-055','dm24bd5-001','dm24-103'
];
const support=[
  'dm01-097','dm01-083','dm01-075','dm01-090','dm35-054','dmr07-012','dm26rp3-068'
];

export const STANDARD576_DECK={
  id:'standard576',
  name:'エレメント破壊と任意マナ置換',
  format:'original',
  cards:[...batch.map(id=>({id,count:2})),...support.map((id,i)=>({id,count:i<5?4:3}))]
};
