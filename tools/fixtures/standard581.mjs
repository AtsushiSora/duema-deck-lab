const batch=[
  'dm06-034','dm19-022','dm24-018','dmd29-006',
  'dm10-045','dmrp04m-004','dmr21-046','dm19-047'
];
const support=['dm01-075','dm01-083','dm01-090','dm01-097','dm01-108','dmr21-050'];

export const STANDARD581_DECK={
  id:'standard581',name:'場・マナ・手札からのカード選択',format:'original',
  cards:[...batch.map(id=>({id,count:2})),...support.map(id=>({id,count:4}))]
};
