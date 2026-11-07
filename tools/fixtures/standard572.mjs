const ultraSavers = [
  'dmrp22-047', 'dmex11-042', 'dmrp04s-085', 'dmr20-065', 'dmr09-090',
  'dmrp16-037', 'dmr20-011', 'dmr05-013', 'dmr05-075', 'dmr08-038',
  'dmrp06-078', 'dm24rp1-055', 'dm23rp3-054', 'dmex14-100'
];

const savers = [
  'dmr13-076', 'dm14-092', 'promoy16-023', 'dm24rp4-055', 'dm33-024',
  'dm26rp1-068', 'dmr16s-034', 'dmr04-044', 'dm14-107', 'dmx15-028',
  'dm35-022', 'dm14-075'
];

function fixture(id, name, ids, support, fillCount) {
  return {
    id,
    name,
    format: 'original',
    cards: [
      ...ids.map(id => ({id, count: 1})),
      ...support.map(id => ({id, count: fillCount}))
    ]
  };
}

export const STANDARD572_DECKS = [
  fixture('standard572-ultra', 'ウルトラ・セイバーの検証', ultraSavers,
    ['dm01-075', 'dm01-097', 'dm01-090', 'dmrp07-079', 'dm01-076', 'dmrp13-084'], 4),
  fixture('standard572-saver', 'セイバーの対象条件の検証', savers,
    ['dm01-s01', 'dm01-s06', 'dmrp08-063', 'dm01-097', 'dm01-108', 'dm24ex1-028', 'dmrp13-084'], 4)
];
STANDARD572_DECKS[0].cards.push({id:'dmr05-072',count:2});
