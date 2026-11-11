import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';

const WAY = 'dm24ex1-070', APOLLO = 'dmrp16-029', LULLABY = 'dmr01-042';
const WAY_PROMO = 'promoy23-043', APOLLO_PROMO = 'promoy19-093';
const NATURE = 'dm01-108', WATER = 'dm01-083', HIGHER = 'dm01-004', SEED = 'dm22ex1-086';
const LIGHT_HUNTER = 'dmr05-076', FIRE_HUNTER = 'dmr05-101', PIT = 'dm01-027', SAVER = 'dmrp14-062';
const JOURNEY = 'dmex12-s03';

function field(p = 0) {
  const s = setup();
  s.active = p;
  for (const q of [0, 1]) give(s, q, 'deck', Array(16).fill(NATURE));
  return s;
}

function add(s, p, zone, id, props) {
  const x = Object.assign(inst(id), props);
  s.players[p][zone].push(x);
  return x;
}

const physical = s => e.physicalCards(s).map(x => x.uid).sort();
const restore = s => JSON.parse(JSON.stringify(s));
const find = (s, p, zone, x) => s.players[p][zone].find(y => y.uid === x.uid);
const value = (s, a) => s.decision.choices[a.choice].value;
const options = s => s.decision.choices.map(c => c.value?.uid ?? c.value);
const pick = (s, v) => act(s, 'extended', a => (value(s, a)?.uid ?? value(s, a)) === v);

function play(s, id) {
  const x = add(s, s.active, 'hand', id);
  act(s, 'play', a => a.uid === x.uid && !a.alternative);
  return x;
}

test('Phase 909 checks full official definitions, five prints, restrictions and a legal forty', () => {
  const m = JSON.parse(readFileSync(new URL('../tools/support-phase-909.json', import.meta.url)));
  const catalogue = createCatalogue(snapshot, data.cards, details);
  const refs = JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json', import.meta.url))).prints;
  assert.deepEqual(m.cards.map(c => c.id), [WAY, APOLLO, LULLABY]);
  assert.deepEqual(m.printAliases.map(({ id, canonicalId }) => [id, canonicalId]), [[WAY_PROMO, WAY], [APOLLO_PROMO, APOLLO]]);
  for (const row of m.printAliases) {
    assert.deepEqual(catalogue.resolveRows([{ id: row.id, count: 2 }, { id: row.canonicalId, count: 2 }]),
      [{ id: row.canonicalId, count: 4 }]);
    assert.deepEqual(standardCardSpec({ ...row, status: 'complete' }, { phase: 909 }),
      m.cards.find(c => c.id === row.canonicalId).spec);
  }
  for (const row of m.cards) {
    const d = details.cards.find(x => x.id === row.id);
    const c = e.card(row.id);
    const [face] = row.faces;
    assert.deepEqual(row.faces, d.faces);
    assert.deepEqual(standardCardSpec(d, { phase: 909 }), row.spec);
    const changed = structuredClone(d);
    changed.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(changed, { phase: 909 }));
    for (const [key, v] of Object.entries(row.spec)) assert.deepEqual(c[key], v);
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
  const cards = [WAY, APOLLO, LULLABY, NATURE, WATER, HIGHER, SEED, LIGHT_HUNTER, FIRE_HUNTER, PIT]
    .map(id => ({ id, count: 4 }));
  const deck = { id: 'phase909', name: 'シールドと登場時能力', cards };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(catalogue.coverage(deck).unsupported, 0);
});

for (const p of [0, 1]) test('Way sees its own entry, can decline, and uses its choice only once per turn ' + p, () => {
  let s = field(p);
  const enemy = add(s, 1 - p, 'battle', WATER);
  const ally = add(s, p, 'battle', NATURE, { tapped: true });
  const way = play(s, WAY);
  assert.equal(s.decision.source, WAY);
  assert.ok(options(s).includes(way.uid));
  pick(s, null);
  play(s, SEED);
  assert.equal(s.decision, null);
  play(s, NATURE);
  pick(s, ally.uid);
  assert.equal(s.decision.task.op, 'g34_TapState235');
  s = restore(s);
  pick(s, false);
  assert.equal(find(s, p, 'battle', ally).tapped, false);
  assert.equal(find(s, 1 - p, 'battle', enemy).tapped, false);
  play(s, NATURE);
  assert.equal(s.decision, null);
});

test('Each Way can use its own once-per-turn ability and ignores the enemy entering', () => {
  const s = field();
  const enemy = add(s, 1, 'battle', HIGHER);
  const one = play(s, WAY);
  pick(s, null);
  const two = play(s, WAY);
  assert.equal(s.decision.type, 'effectOrder');
  act(s, 'orderEffect', a => a.uid === one.uid);
  pick(s, enemy.uid);
  pick(s, true);
  assert.equal(enemy.tapped, true);
  pick(s, two.uid);
  pick(s, true);
  assert.equal(two.tapped, true);
  act(s, 'toAttack');
  act(s, 'endTurn');
  drain(s);
  act(s, 'skipCharge');
  play(s, NATURE);
  assert.equal(s.decision, null);
  act(s, 'toAttack');
  act(s, 'endTurn');
  drain(s);
  act(s, 'skipCharge');
  play(s, NATURE);
  assert.equal(s.decision.type, 'effectOrder');
  drain(s);
});

test('Way uses its Shield Trigger and can tap or untap on the opposing turn', () => {
  const s = field(1);
  const source = add(s, 1, 'battle', NATURE);
  const ally = add(s, 0, 'battle', WATER, { tapped: true });
  give(s, 0, 'shields', [WAY]);
  const way = s.players[0].shields[0];
  const before = physical(s);
  attack(s, source.uid);
  act(s, 'noBlock');
  act(s, 'useTrigger', a => a.uid === way.uid);
  assert.equal(s.decision.player, 0);
  assert.equal(s.decision.source, WAY);
  pick(s, ally.uid);
  pick(s, false);
  assert.ok(find(s, 0, 'battle', way));
  assert.equal(ally.tapped, false);
  assert.equal(s.players[0].mana.filter(x => x.tapped).length, 0);
  assert.deepEqual(physical(s), before);
});

test('Genmu suppresses Way’s battle-zone ability', () => {
  const s = field();
  add(s, 1, 'battle', GEN);
  play(s, WAY);
  play(s, NATURE);
  assert.equal(s.decision, null);
});

test('Lullaby offers to tap on its own entry and on another friendly Light Hunter entry', () => {
  const s = field();
  const enemy = add(s, 1, 'battle', WATER);
  const other = add(s, 1, 'battle', NATURE);
  const source = play(s, LULLABY);
  assert.equal(s.decision.source, LULLABY);
  assert.ok(!options(s).includes(source.uid));
  pick(s, enemy.uid);
  assert.equal(enemy.tapped, true);
  play(s, FIRE_HUNTER);
  assert.equal(s.decision, null);
  play(s, NATURE);
  assert.equal(s.decision, null);
  play(s, LIGHT_HUNTER);
  pick(s, null);
  assert.equal(other.tapped, false);
  play(s, LIGHT_HUNTER);
  pick(s, other.uid);
  assert.equal(other.tapped, true);
});

for (const hunter of [true, false]) test('Lullaby counts itself and only other visible friendly Hunters during battle ' + hunter, () => {
  const s = field();
  const source = add(s, 0, 'battle', LULLABY);
  const enemy = add(s, 1, 'battle', HIGHER, { tapped: true });
  add(s, 1, 'battle', LIGHT_HUNTER);
  const sealed = add(s, 0, 'battle', FIRE_HUNTER);
  add(s, 0, 'seals', WATER, { sealOf: sealed.uid });
  if (hunter) add(s, 0, 'battle', FIRE_HUNTER);
  assert.equal(e.power(source, false, s), 2500);
  attack(s, source.uid, enemy.uid);
  act(s, 'noBlock');
  drain(s);
  assert.equal(!!find(s, 1, 'grave', enemy), hunter);
  assert.equal(!!find(s, 0, 'grave', source), !hunter);
});

test('Apollo uses Mach Fighter and untaps six chosen mana after one own shield breaks', () => {
  let s = field();
  const enemy = add(s, 1, 'battle', WATER);
  const source = play(s, APOLLO);
  const original = s.players[0].mana.slice(0, 8);
  original.forEach(x => { x.tapped = true; });
  original[0].faceDown = true;
  const shield = s.players[0].shields[1];
  const before = physical(s);
  act(s, 'toAttack');
  assert.deepEqual(e.getLegalActions(s).filter(a => a.kind === 'attack' && a.uid === source.uid).map(a => a.target), [enemy.uid]);
  attack(s, source.uid, enemy.uid);
  pick(s, shield.uid);
  assert.ok(find(s, 0, 'hand', shield));
  assert.equal(s.players[0].shields.length, 4);
  assert.equal(s.decision.task.op, 'g34_Select');
  pick(s, original[0].uid);
  s = restore(s);
  for (const x of original.slice(1, 6)) pick(s, x.uid);
  assert.equal(s.decision.type, 'block');
  assert.deepEqual(original.map(x => find(s, 0, 'mana', x).tapped), [false, false, false, false, false, false, true, true]);
  assert.equal(find(s, 0, 'mana', original[0]).faceDown, true);
  act(s, 'noBlock');
  drain(s);
  assert.ok(find(s, 1, 'grave', enemy));
  assert.deepEqual(physical(s), before);
});

for (const count of [0, 2]) test('Apollo can untap fewer than six after breaking a shield ' + count, () => {
  const s = field();
  const source = add(s, 0, 'battle', APOLLO);
  const tapped = s.players[0].mana.slice(0, 7);
  tapped.forEach(x => { x.tapped = true; });
  attack(s, source.uid);
  pick(s, s.players[0].shields[0].uid);
  for (const x of tapped.slice(0, count)) pick(s, x.uid);
  pick(s, null);
  assert.equal(s.players[0].mana.filter(x => x.tapped).length, 7 - count);
  assert.equal(s.players[0].shields.length, 4);
});

for (const mode of ['declined', 'empty', 'saved']) test('Apollo cannot untap if its shield did not break ' + mode, () => {
  const s = field();
  const source = add(s, 0, 'battle', APOLLO);
  s.players[0].mana[0].tapped = true;
  if (mode === 'empty') give(s, 0, 'shields', []);
  const saver = mode === 'saved' && add(s, 0, 'battle', SAVER);
  const count = s.players[0].shields.length;
  attack(s, source.uid);
  if (mode === 'declined') pick(s, null);
  if (mode === 'saved') {
    pick(s, s.players[0].shields[0].uid);
    act(s, 'saveShield', a => a.uid === saver.uid);
    assert.ok(find(s, 0, 'grave', saver));
  }
  assert.equal(s.decision.type, 'block');
  assert.equal(s.players[0].shields.length, count);
  assert.equal(s.players[0].mana[0].tapped, true);
});

test('Apollo resolves its own shield trigger before resuming the mana choice', () => {
  const s = field();
  const source = add(s, 0, 'battle', APOLLO);
  const enemy = add(s, 1, 'battle', WATER);
  give(s, 0, 'shields', [PIT]);
  s.players[0].mana[0].tapped = true;
  attack(s, source.uid);
  pick(s, s.players[0].shields[0].uid);
  act(s, 'useTrigger', a => a.cardId === PIT);
  act(s, 'effect', a => a.targets.some(x => x.uid === enemy.uid));
  assert.ok(find(s, 1, 'grave', enemy));
  assert.equal(s.decision.task.op, 'g34_Select');
  pick(s, s.players[0].mana[0].uid);
  pick(s, null);
  assert.equal(s.players[0].mana[0].tapped, false);
});

test('Apollo can still break its shield after Revolution Change (QA39067)', () => {
  const s = field();
  const source = add(s, 0, 'battle', APOLLO);
  const journey = add(s, 0, 'hand', JOURNEY);
  s.players[0].mana[0].tapped = true;
  attack(s, source.uid);
  pick(s, true);
  act(s, 'orderEffect', a => a.cardId === JOURNEY);
  for (let i = 0; s.decision && s.decision.task?.op !== 'g34_Break497'; i++) {
    assert.ok(i < 20);
    if (s.decision.type === 'effectOrder') act(s, 'orderEffect', a => a.cardId === APOLLO);
    else e.step(s, e.chooseAI(s));
  }
  assert.ok(find(s, 0, 'hand', source));
  assert.ok(find(s, 0, 'battle', journey));
  const count = s.players[0].shields.length;
  pick(s, s.players[0].shields[0].uid);
  pick(s, s.players[0].mana[0].uid);
  pick(s, null);
  assert.equal(s.players[0].mana[0].tapped, false);
  assert.equal(s.players[0].shields.length, count - 1);
});
