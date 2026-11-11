import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';

const BACK = 'dmx22b-020', SENSOR = 'dmsd11-006', BYRON = 'dmrp18-s01';
const NATURE = 'dm01-108', WATER = 'dm01-083', DARK = 'dm01-090';
const LIGHT = 'dm01-075', FIRE = 'dm01-097', BLOCKER = 'dm01-076';
const SEED = 'dmsd20-016', REX = 'dmrp18-092', KOIKOI = 'dmr18-050', NINJA = 'dm29-037';

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

function play(s, id) {
  const x = add(s, s.active, 'hand', id);
  act(s, 'play', a => a.uid === x.uid && !a.alternative);
  return x;
}

function selectSensor(s, card) {
  play(s, SENSOR);
  pick(s, card.uid);
}

function evolve(s, base) {
  const x = play(s, BYRON);
  act(s, 'evolve', a => a.baseUid === base.uid);
  drain(s);
  return x;
}

function finishUnblocked(s) {
  act(s, 'noBlock');
  drain(s);
}

test('Phase 906 verifies complete official definitions, art, unique names and a legal forty', () => {
  const m = JSON.parse(readFileSync(new URL('../tools/support-phase-906.json', import.meta.url)));
  const catalogue = createCatalogue(snapshot, data.cards, details);
  const refs = JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json', import.meta.url))).prints;
  assert.deepEqual(m.cards.map(c => c.id), [BACK, SENSOR, BYRON]);
  assert.deepEqual(m.printAliases, []);
  for (const row of m.cards) {
    const detail = details.cards.find(x => x.id === row.id);
    const [face] = row.faces;
    const c = e.card(row.id);
    assert.deepEqual(row.faces, detail.faces);
    assert.deepEqual(standardCardSpec(detail, { phase: 906 }), row.spec);
    const changed = structuredClone(detail);
    changed.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(changed, { phase: 906 }));
    for (const [key, value] of Object.entries(row.spec)) assert.deepEqual(c[key], value);
    assert.deepEqual([c.type, c.cost, c.civilizations, c.race || '', c.manaValue, c.limit],
      [face.typeText === '呪文' ? 'spell' : 'creature', face.cost, face.civilizations, face.race, 1, 4]);
    if (c.type === 'creature') assert.equal(c.power, Number(face.powerText));
    assert.ok(row.verification.facesMatched);
    assert.equal(m.regulationVerification.limits[row.id], 4);
    assert.equal(CARD_IMAGES[row.id], row.image);
    assert.equal(refs.find(x => x.id === row.id)?.image, row.image);
    assert.deepEqual(data.cards.filter(x => nameKey(x.name) === nameKey(c.name)).map(x => x.id), [row.id]);
    assert.deepEqual(catalogue.resolveRows([{ id: row.id, count: 4 }]), [{ id: row.id, count: 4 }]);
  }
  const cards = [BACK, SENSOR, BYRON, NATURE, WATER, DARK, LIGHT, FIRE, BLOCKER, REX]
    .map(id => ({ id, count: 4 }));
  const deck = { id: 'phase906', name: 'バイロンとバックベアード', cards };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(catalogue.coverage(deck).unsupported, 0);
});

for (const p of [0, 1]) test('Backbeard sweeps other untapped creatures on both sides ' + p, () => {
  const s = field(p);
  const earlier = add(s, p, 'battle', BACK);
  const ally = add(s, p, 'battle', NATURE);
  const enemy = add(s, 1 - p, 'battle', WATER, { justDiverActive: true });
  const tapped = [add(s, p, 'battle', DARK, { tapped: true }), add(s, 1 - p, 'battle', BLOCKER, { tapped: true })];
  const seed = add(s, p, 'battle', SEED);
  const sealed = add(s, 1 - p, 'battle', LIGHT, { sealed: true });
  s.players[1 - p].seals = [Object.assign(inst(NATURE), { faceDown: true, sealOf: sealed.uid })];
  const before = physical(s);
  const source = play(s, BACK);
  drain(s);
  for (const x of [earlier, ally]) assert.ok(has(s, p, 'grave', x));
  assert.ok(has(s, 1 - p, 'grave', enemy));
  assert.deepEqual(ids(s.players[p].battle).sort(), ids([source, tapped[0], seed]).sort());
  assert.deepEqual(ids(s.players[1 - p].battle).sort(), ids([tapped[1], sealed]).sort());
  assert.deepEqual(physical(s).filter(uid => uid !== source.uid), before);
});

test('Backbeard uses the existing Star leave replacement and W-Breaker', () => {
  const s = field();
  const base = inst(WATER);
  const star = add(s, 1, 'battle', BYRON, { under: [base] });
  const source = play(s, BACK);
  drain(s);
  assert.ok(has(s, 1, 'grave', star));
  assert.ok(has(s, 1, 'battle', base));
  act(s, 'toAttack');
  act(s, 'endTurn');
  act(s, 'skipCharge');
  act(s, 'toAttack');
  act(s, 'endTurn');
  attack(s, source.uid);
  finishUnblocked(s);
  assert.equal(s.players[1].shields.length, 3);
});

for (const p of [0, 1]) test('Sensor watches only the chosen ally and draws two on each attack ' + p, () => {
  let s = field(p);
  const selected = add(s, p, 'battle', WATER);
  const other = add(s, p, 'battle', NATURE);
  add(s, 1 - p, 'battle', BLOCKER);
  play(s, SENSOR);
  assert.deepEqual(values(s).sort(), ids([selected, other]).sort());
  s = restore(s);
  pick(s, selected.uid);
  attack(s, other.uid);
  assert.equal(s.players[p].hand.length, 0);
  finishUnblocked(s);
  attack(s, selected.uid);
  assert.equal(s.players[p].hand.length, 2);
  finishUnblocked(s);
  s.players[p].battle.find(x => x.uid === selected.uid).tapped = false;
  attack(s, selected.uid);
  assert.equal(s.players[p].hand.length, 4);
  finishUnblocked(s);
  act(s, 'endTurn');
  act(s, 'skipCharge');
  act(s, 'toAttack');
  act(s, 'endTurn');
  const count = s.players[p].hand.length;
  attack(s, selected.uid);
  assert.equal(s.players[p].hand.length, count);
});

test('Sensor stacks multiple copies and follows the chosen creature through evolution', () => {
  const s = field();
  const base = add(s, 0, 'battle', WATER);
  selectSensor(s, base);
  selectSensor(s, base);
  const invader = play(s, KOIKOI);
  act(s, 'evolve', a => a.baseUid === base.uid);
  drain(s);
  attack(s, invader.uid);
  drain(s);
  assert.equal(s.players[0].hand.length, 4);
});

test('Sensor follows a chosen Star evolution through reconstruction', () => {
  const s = field();
  const base = add(s, 0, 'battle', WATER);
  const top = evolve(s, base);
  for (const p of [0, 1]) {
    assert.equal(s.active, p);
    act(s, 'toAttack');
    act(s, 'endTurn');
    act(s, 'skipCharge');
  }
  selectSensor(s, top);
  play(s, 'dm01-086');
  act(s, 'effect', a => a.targets[0].uid === top.uid);
  drain(s);
  assert.ok(has(s, 0, 'hand', top));
  assert.ok(has(s, 0, 'battle', base));
  const before = s.players[0].hand.length;
  attack(s, base.uid);
  assert.equal(s.players[0].hand.length, before + 2);
});

test('Sensor is ignored if Genmu Emperor enters before the selected attack', () => {
  const s = field();
  const base = add(s, 0, 'battle', WATER);
  selectSensor(s, base);
  add(s, 1, 'battle', GEN);
  attack(s, base.uid);
  assert.equal(s.players[0].hand.length, 0);
});

test('Sensor resolves without a selection on an empty friendly battlefield', () => {
  const s = field();
  add(s, 1, 'battle', WATER);
  const source = play(s, SENSOR);
  assert.equal(s.decision, null);
  assert.ok(has(s, 0, 'grave', source));
});

test('Sensor does not follow the same physical card after it leaves and returns', () => {
  const s = field();
  const base = add(s, 0, 'battle', WATER);
  selectSensor(s, base);
  play(s, 'dm01-086');
  act(s, 'effect', a => a.targets[0].uid === base.uid);
  act(s, 'play', a => a.uid === base.uid);
  const invader = play(s, KOIKOI);
  act(s, 'evolve', a => a.baseUid === base.uid);
  drain(s);
  attack(s, invader.uid);
  assert.equal(s.players[0].hand.length, 0);
});

test('CPU applies Sensor draw exhaustion only to the selected attacker', () => {
  const s = field();
  const selected = add(s, 0, 'battle', WATER);
  const other = add(s, 0, 'battle', NATURE);
  selectSensor(s, selected);
  give(s, 0, 'deck', [NATURE, NATURE]);
  s.phase = 'attack';
  const attacks = e.rankHeuristicActions(s).filter(({ a }) => a.kind === 'attack');
  assert.equal(attacks.find(({ a }) => a.uid === selected.uid).value, -1000);
  assert.ok(attacks.find(({ a }) => a.uid === other.uid).value > -1000);
});

test('Byron can evolve from a non-Water Rex Star and reconstructs after leaving', () => {
  const s = field();
  const base = add(s, 0, 'battle', REX);
  const water = add(s, 0, 'battle', WATER);
  const neither = add(s, 0, 'battle', NATURE);
  const top = play(s, BYRON);
  const bases = e.getLegalActions(s).filter(a => a.kind === 'evolve').map(a => a.baseUid);
  assert.deepEqual(bases.sort(), ids([base, water]).sort());
  assert.ok(!bases.includes(neither.uid));
  act(s, 'evolve', a => a.baseUid === base.uid);
  drain(s);
  act(s, 'toAttack');
  act(s, 'endTurn');
  act(s, 'skipCharge');
  play(s, BACK);
  drain(s);
  assert.ok(has(s, 0, 'grave', top));
  assert.ok(has(s, 0, 'battle', base));
});

for (const [p, starting] of [[0, 4], [1, 5]]) test('Byron checks the hand after drawing and uses the six-card cutoff ' + p, () => {
  const s = field(p);
  const base = add(s, p, 'battle', WATER);
  const top = evolve(s, base);
  give(s, p, 'hand', Array(starting).fill(NATURE));
  const before = physical(s);
  attack(s, top.uid);
  assert.equal(s.players[p].hand.length, starting + 2);
  assert.equal(top.tapped, true);
  if (starting === 4) {
    assert.equal(s.attack, null);
    assert.equal(s.decision, null);
    assert.equal(s.players[1 - p].shields.length, 5);
  } else {
    finishUnblocked(s);
    assert.equal(s.players[1 - p].shields.length, 2);
  }
  assert.deepEqual(physical(s), before);
});

test('Byron still stops the attack when KoiKoi invades before Byron resolves (QA39850)', () => {
  let s = field();
  const top = evolve(s, add(s, 0, 'battle', WATER));
  const invader = add(s, 0, 'hand', KOIKOI);
  attack(s, top.uid);
  pick(s, true);
  act(s, 'orderEffect', a => a.cardId === KOIKOI);
  act(s, 'extended', a => a.cardId === KOIKOI);
  s = restore(s);
  drain(s);
  assert.ok(has(s, 0, 'battle', invader));
  assert.equal(s.players[0].hand.length, 2);
  assert.equal(s.attack, null);
  assert.equal(s.players[1].shields.length, 5);
});

test('Byron preserves public attack triggers and skips the Ninja Strike window on a stopped attack (QA39849)', () => {
  const s = field();
  const top = evolve(s, add(s, 0, 'battle', WATER));
  add(s, 1, 'battle', 'dm30-041');
  const ninja = add(s, 1, 'hand', NINJA);
  const [drawn] = s.players[1].deck;
  attack(s, top.uid);
  assert.equal(s.decision.source, 'dm30-041');
  assert.equal(s.decision.player, 1);
  assert.ok(e.getLegalActions(s).every(a => a.cardId !== NINJA));
  pick(s, true);
  assert.ok(has(s, 1, 'hand', drawn));
  pick(s, drawn.uid);
  assert.deepEqual(ids(s.players[1].hand), [ninja.uid]);
  assert.equal(s.decision, null);
  assert.equal(s.attack, null);
  assert.equal(s.players[1].shields.length, 5);
});

for (const first of [SENSOR, BYRON]) test('Sensor and Byron resolve in either chosen order ' + first, () => {
  const s = field();
  const top = evolve(s, add(s, 0, 'battle', WATER));
  selectSensor(s, top);
  give(s, 0, 'hand', [NATURE, DARK, FIRE]);
  attack(s, top.uid);
  act(s, 'orderEffect', a => a.cardId === first);
  assert.equal(s.players[0].hand.length, 7);
  if (first === SENSOR) {
    finishUnblocked(s);
    assert.equal(s.players[1].shields.length, 2);
  } else {
    assert.equal(s.attack, null);
    assert.equal(s.players[1].shields.length, 5);
  }
});
