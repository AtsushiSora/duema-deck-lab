const batch=[
  'dm10-047','dmx08-006','dmx19-s09','dm10-052','dmr10-009','dmr15-008','dm12-038','dmrp16-031'
];
const support=['dm01-075','dm01-083','dm01-090','dm01-097','dm01-108','dm01-088'];

export const STANDARD577_DECK={
  id:'standard577',
  name:'バトルゾーン残留と必須ブロック',
  format:'original',
  cards:[...batch.map(id=>({id,count:2})),...support.map(id=>({id,count:4}))]
};
