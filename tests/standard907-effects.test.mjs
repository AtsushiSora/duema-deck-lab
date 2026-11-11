import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';

const HANAKI = 'dmsd05-005', PROMO = 'promoy17-013', PONPON = 'dm25rp1-044', DAYS = 'dmrp21-043';
const NATURE = 'dm01-108', WATER = 'dm01-083', DARK = 'dm01-090';
const LIGHT = 'dm01-075', FIRE = 'dm01-097', BLOCKER = 'dm01-076';
const RAINBOW = 'dmr04-048', SEED = 'dmrp21-074', ACE = 'dm22rp1-8A';
const PIT = 'dm01-027', SOUZAN = 'dm26ex4-010', SHINBO = 'dmx22b-090';

function field(p = 0) {
  const s = setup();
  s.active = p;
  for (const player of [0, 1]) give(s, player, 'deck', Array(24).fill(NATURE));
  return s;
}

function add(s, p, zone, id, props) {
  const x = Object.assign(inst(id), props);
  s.players[p][zone].push(x);
  return x;
}

const ids = cards => cards.map(x => x.uid);
const has = (s, p, zone, x) => ids(s.players[p][zone]).includes(x.uid);
const physical = s => ids(e.physicalCards(s)).sort();
const restore = s => JSON.parse(JSON.stringify(s));
const values = s => s.decision.choices.map(c => c.value?.uid ?? c.value);
const pick = (s, value) => act(s, 'extended', a => values(s)[a.choice] === value);
const targets = (s, x) => e.getLegalActions(s).filter(a => a.kind === 'attack' && a.uid === x.uid).map(a => a.target);

function play(s, id) {
  const x = add(s, s.active, 'hand', id);
  act(s, 'play', a => a.uid === x.uid && !a.alternative);
  return x;
}

function finishUnblocked(s) {
  act(s, 'noBlock');
  if (s.decision?.type === 'breakChoice') act(s, 'breakShields');
  drain(s);
}

test('Phase 907 verifies complete card definitions, four official prints, and a legal forty', () => {
  const m = JSON.parse(readFileSync(new URL('../tools/support-phase-907.json', import.meta.url)));
  const catalogue = createCatalogue(snapshot, data.cards, details);
  const refs = JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json', import.meta.url))).prints;
  assert.deepEqual(m.cards.map(c => c.id), [HANAKI, PONPON, DAYS]);
  assert.deepEqual(m.printAliases.map(({ id, canonicalId }) => [id, canonicalId]), [[PROMO, HANAKI]]);
  assert.deepEqual(catalogue.resolveRows([{ id: PROMO, count: 2 }, { id: HANAKI, count: 2 }]), [{ id: HANAKI, count: 4 }]);
  assert.deepEqual(standardCardSpec({ ...m.printAliases[0], status: 'complete' }, { phase: 907 }), m.cards[0].spec);
  for (const row of m.cards) {
    const d = details.cards.find(x => x.id === row.id);
    const c = e.card(row.id);
    const [face] = row.faces;
    assert.deepEqual(row.faces, d.faces);
    assert.deepEqual(standardCardSpec(d, { phase: 907 }), row.spec);
    const changed = structuredClone(d);
    changed.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(changed, { phase: 907 }));
    for (const [key, value] of Object.entries(row.spec)) assert.deepEqual(c[key], value);
    assert.deepEqual([c.type, c.cost, c.power, c.civilizations, c.race, c.manaValue, c.limit],
      ['creature', face.cost, Number(face.powerText), face.civilizations, face.race, 1, 4]);
    assert.equal(CARD_IMAGES[row.id], row.image);
    assert.deepEqual(data.cards.filter(x => nameKey(x.name) === nameKey(c.name)).map(x => x.id), [row.id]);
  }
  for (const row of [...m.cards, ...m.printAliases]) {
    assert.ok(row.verification.facesMatched);
    assert.equal(m.regulationVerification.limits[row.id], 4);
    assert.equal(refs.find(x => x.id === row.id)?.image, row.image);
  }
  const cards = [HANAKI, PONPON, DAYS, NATURE, WATER, DARK, LIGHT, FIRE, BLOCKER, SEED]
    .map(id => ({ id, count: 4 }));
  const deck = { id: 'phase907', name: '自然のマッハファイター', cards };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(catalogue.coverage(deck).unsupported, 0);
});

for (const p of [0, 1]) test('Hanaki can attack either creature position on entry and moves only after combat ' + p, () => {
  let s = field(p);
  const untapped = add(s, 1 - p, 'battle', WATER);
  const tapped = add(s, 1 - p, 'battle', LIGHT, { tapped: true });
  const source = play(s, HANAKI);
  act(s, 'toAttack');
  assert.deepEqual(targets(s, source).sort(), ids([untapped, tapped]).sort());
  const before = physical(s);
  attack(s, source.uid, p ? tapped.uid : untapped.uid);
  assert.ok(has(s, p, 'battle', source));
  assert.ok(!has(s, p, 'mana', source));
  s = restore(s);
  finishUnblocked(s);
  assert.ok(has(s, 1 - p, 'grave', p ? tapped : untapped));
  const mana = s.players[p].mana.find(x => x.uid === source.uid);
  assert.equal(mana.tapped, false);
  assert.deepEqual(physical(s), before);
});

test('Hanaki no longer attacks untapped enemies on a later turn and breaks three shields', () => {
  const s = field();
  const source = add(s, 0, 'battle', HANAKI);
  const tapped = add(s, 1, 'battle', LIGHT, { tapped: true });
  add(s, 1, 'battle', WATER);
  act(s, 'toAttack');
  assert.deepEqual(targets(s, source).sort(), ['player', tapped.uid].sort());
  attack(s, source.uid);
  finishUnblocked(s);
  assert.equal(s.players[1].shields.length, 2);
  assert.ok(has(s, 0, 'mana', source));
});

test('Hanaki moves after an attack canceled by Souzan without breaking a shield', () => {
  const s = field();
  const source = add(s, 0, 'battle', HANAKI);
  add(s, 1, 'battle', SOUZAN);
  add(s, 1, 'hand', NATURE);
  attack(s, source.uid);
  assert.equal(s.decision.source, SOUZAN);
  pick(s, true);
  drain(s);
  assert.ok(has(s, 0, 'mana', source));
  assert.equal(s.players[1].shields.length, 5);
});

test('Hanaki is not moved out of its grave after a Shield Trigger destroys it', () => {
  const s = field();
  const source = add(s, 0, 'battle', HANAKI);
  give(s, 1, 'shields', [PIT]);
  attack(s, source.uid);
  act(s, 'noBlock');
  act(s, 'useTrigger', a => a.cardId === PIT);
  act(s, 'effect', a => a.targets[0].uid === source.uid);
  drain(s);
  assert.ok(has(s, 0, 'grave', source));
  assert.ok(!has(s, 0, 'mana', source));
});

for (const p of [0, 1]) test('Ponpon chooses distinct Light and Fire mana and applies both together ' + p, () => {
  let s = field(p);
  const light = add(s, p, 'mana', LIGHT, { tapped: true });
  const fire = add(s, p, 'mana', FIRE, { tapped: true });
  const multi = add(s, p, 'mana', RAINBOW, { tapped: true });
  const other = add(s, p, 'mana', DARK, { tapped: true });
  const hidden = add(s, p, 'mana', RAINBOW, { tapped: true, faceDown: true });
  const source = play(s, PONPON);
  assert.ok(values(s).includes(multi.uid));
  assert.ok(!values(s).includes(other.uid) && !values(s).includes(hidden.uid));
  pick(s, light.uid);
  assert.equal(light.tapped, true);
  assert.ok(!values(s).includes(light.uid));
  assert.ok(values(s).includes(fire.uid) && values(s).includes(multi.uid));
  assert.ok(!values(s).includes(null));
  s = restore(s);
  pick(s, multi.uid);
  const mana = uid => s.players[p].mana.find(x => x.uid === uid);
  assert.equal(mana(light.uid).tapped, false);
  assert.equal(mana(multi.uid).tapped, false);
  for (const x of [fire, other, hidden]) assert.equal(mana(x.uid).tapped, true);
  const victim = add(s, 1 - p, 'battle', WATER);
  act(s, 'toAttack');
  assert.ok(targets(s, source).includes(victim.uid));
  assert.ok(!targets(s, source).includes('player'));
});

test('Ponpon untaps one matching mana when a complete pair is unavailable', () => {
  for (const id of [RAINBOW, LIGHT, FIRE]) {
    const s = field();
    give(s, 0, 'mana', Array(3).fill(NATURE));
    const x = add(s, 0, 'mana', id, { tapped: true });
    play(s, PONPON);
    assert.deepEqual(values(s), [x.uid]);
    pick(s, x.uid);
    assert.equal(s.decision, null);
    assert.equal(x.tapped, false);
  }
});

test('Ponpon reads current mana civilizations and respects untap prohibitions', () => {
  const s = field();
  give(s, 0, 'mana', Array(3).fill(NATURE));
  add(s, 0, 'battle', 'dm13-015');
  const locked = add(s, 0, 'mana', DARK, { tapped: true, tapLocks: [0] });
  const free = add(s, 0, 'mana', NATURE, { tapped: true });
  play(s, PONPON);
  pick(s, locked.uid);
  pick(s, free.uid);
  assert.equal(locked.tapped, true);
  assert.equal(free.tapped, false);
});

test('Ponpon needs no selection without matching mana and does not pass Mach Fighter to its evolution (QA46491)', () => {
  const s = field();
  give(s, 0, 'mana', Array(12).fill(NATURE));
  const target = add(s, 1, 'battle', WATER);
  const source = play(s, PONPON);
  assert.equal(s.decision, null);
  const evolution = play(s, SHINBO);
  act(s, 'evolve', a => a.baseUid === source.uid);
  drain(s);
  act(s, 'toAttack');
  assert.ok(!targets(s, evolution).includes(target.uid));
  assert.ok(targets(s, evolution).includes('player'));
});

for (const p of [0, 1]) test('Days counts each own Nature creature or tamaseed once and adds the chosen top cards tapped ' + p, () => {
  let s = field(p);
  add(s, p, 'battle', NATURE);
  add(s, p, 'battle', SEED);
  add(s, p, 'battle', ACE);
  add(s, p, 'battle', LIGHT);
  const sealed = add(s, p, 'battle', NATURE, { sealed: true });
  s.players[p].seals = [Object.assign(inst(DARK), { faceDown: true, sealOf: sealed.uid })];
  const opponent = add(s, 1 - p, 'battle', NATURE);
  give(s, p, 'deck', [FIRE, RAINBOW, DARK, NATURE, ...Array(12).fill(LIGHT)]);
  const top = ids(s.players[p].deck.slice(0, 2));
  const before = physical(s);
  const source = play(s, DAYS);
  assert.deepEqual(values(s), [0, 1, 2, 3, 4]);
  assert.deepEqual(ids(s.players[p].deck.slice(0, 2)), top);
  s = restore(s);
  pick(s, 2);
  assert.deepEqual(ids(s.players[p].mana.slice(-2)), top);
  assert.ok(s.players[p].mana.slice(-2).every(x => x.tapped));
  assert.deepEqual(physical(s).filter(uid => uid !== source.uid), before);
  act(s, 'toAttack');
  assert.ok(targets(s, source).includes(opponent.uid));
  assert.ok(!targets(s, source).includes('player'));
});

test('Days counts itself when alone and can choose zero without moving the top card', () => {
  const s = field();
  const top = s.players[0].deck[0];
  play(s, DAYS);
  assert.deepEqual(values(s), [0, 1]);
  pick(s, 0);
  assert.equal(s.players[0].deck[0], top);
  assert.equal(s.players[0].mana.length, 50);
});

test('Days uses existing deck-to-mana replacement and observes deck exhaustion', () => {
  const s = field();
  add(s, 1, 'battle', 'dm22ex1-086');
  add(s, 0, 'battle', SEED);
  give(s, 0, 'deck', [WATER, FIRE]);
  const top = ids(s.players[0].deck);
  play(s, DAYS);
  pick(s, 2);
  assert.deepEqual(ids(s.players[0].grave), top);
  assert.equal(s.players[0].mana.length, 50);
  assert.equal(s.winner, 1);
});

test('Genmu Emperor suppresses Ponpon but leaves the six-cost Mach Fighters active', () => {
  for (const id of [PONPON, DAYS, HANAKI]) {
    const s = field();
    const target = add(s, 1, 'battle', GEN);
    const mana = add(s, 0, 'mana', RAINBOW, { tapped: true });
    const source = play(s, id);
    if (id === DAYS) pick(s, 0);
    assert.equal(s.decision, null);
    assert.equal(mana.tapped, true);
    act(s, 'toAttack');
    assert.equal(targets(s, source).includes(target.uid), id !== PONPON);
  }
});
