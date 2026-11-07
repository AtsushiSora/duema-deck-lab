const batch=[
  'dmex17-087','dm09-024','dmr17-072','dm02-043','dm03-043','dmr20-049',
  'dm26-045','dmx11-004','dm26-047','dmrp16-062','dm06-043'
];
const support=['dm01-075','dm01-083','dm01-090','dm01-097'];

export const STANDARD585_DECK={
  id:'standard585',name:'シールドの非公開確認と入れ替え',format:'original',
  cards:[...batch.map(id=>({id,count:2})),...support.map(id=>({id,count:4})),{id:'dm01-108',count:2}]
};
