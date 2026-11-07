const batch=[
  'dm25rp3-074','dmrp17-036','dm34-041','dmrp07-090','dmr15-031','dmr09-052',
  'dmr03-033','dmr22-041','dmrp13-052','dmc41-002','dm25rp1-049'
];
const support=['dm01-075','dm01-083','dm01-090','dm01-104','dmrp07-079','dm32-s08'];

export const STANDARD575_DECK={
  id:'standard575',
  name:'破壊時のマナ・手札置換',
  format:'original',
  cards:[...batch.map(id=>({id,count:2})),...support.map(id=>({id,count:3}))]
};
