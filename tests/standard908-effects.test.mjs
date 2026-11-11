import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';

const MAGNOLIA = 'dm23ex3-070', DODONGA = 'dmr10-028', MARON = 'dm26ex3-070';
const SECRET = 'dm26ex3-SEC018', SIGNED = 'dm26ex3-SEC018CHO';
const NATURE = 'dm01-108', WATER = 'dm01-083', LIGHT = 'dm01-075', FIRE = 'dm01-097';
const HIGHER = 'dm01-004', PIT = 'dm01-027', SPIRAL = 'dm01-086', YAMATA = 'dmbd18-003';
const BACKBEARD = 'dmx22b-020';
const OUTRAGE_MAX = 'dmr09-021', DRAGON = 'dm01-s08', SEED = 'dmrp21-069', DRAGON_SPELL = 'dm24ex2-038';

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
const pick = (s, v) => act(s, 'extended', a => (value(s, a)?.uid ?? value(s, a)) === v);
const targets = (s, x) => e.getLegalActions(s).filter(a => a.kind === 'attack' && a.uid === x.uid).map(a => a.target);

function play(s, id) {
  const x = add(s, s.active, 'hand', id);
  act(s, 'play', a => a.uid === x.uid && !a.alternative);
  return x;
}

function removeWith(s, id, target) {
  play(s, id);
  act(s, 'effect', a => a.targets.some(y => y.uid === target.uid));
  drain(s);
}

test('Phase 908 checks the full official definitions, five prints and a legal forty', () => {
  const m = JSON.parse(readFileSync(new URL('../tools/support-phase-908.json', import.meta.url)));
  const catalogue = createCatalogue(snapshot, data.cards, details);
  const refs = JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json', import.meta.url))).prints;
  assert.deepEqual(m.cards.map(c => c.id), [MAGNOLIA, DODONGA, MARON]);
  assert.deepEqual(m.printAliases.map(({ id, canonicalId }) => [id, canonicalId]), [[SECRET, MARON], [SIGNED, MARON]]);
  assert.deepEqual(catalogue.resolveRows([{ id: SECRET, count: 1 }, { id: SIGNED, count: 1 }, { id: MARON, count: 2 }]),
    [{ id: MARON, count: 4 }]);
  for (const row of m.printAliases) {
    assert.deepEqual(standardCardSpec({ ...row, status: 'complete' }, { phase: 908 }), m.cards[2].spec);
  }
  for (const row of m.cards) {
    const d = details.cards.find(x => x.id === row.id);
    const c = e.card(row.id);
    const [face] = row.faces;
    assert.deepEqual(row.faces, d.faces);
    assert.deepEqual(standardCardSpec(d, { phase: 908 }), row.spec);
    assert.throws(() => standardCardSpec(d, { phase: 907 }));
    const changed = structuredClone(d);
    changed.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(changed, { phase: 908 }));
    for (const [key, v] of Object.entries(row.spec)) assert.deepEqual(c[key], v);
    assert.deepEqual([c.type, c.cost, c.power, c.civilizations, c.race, c.manaValue, c.limit],
      [row.id === DODONGA ? 'spell' : 'creature', face.cost, Number(face.powerText), face.civilizations, face.race, 1, 4]);
    assert.equal(CARD_IMAGES[row.id], row.image);
    assert.deepEqual(data.cards.filter(x => nameKey(x.name) === nameKey(c.name)).map(x => x.id), [row.id]);
  }
  for (const row of [...m.cards, ...m.printAliases]) {
    assert.ok(row.verification.facesMatched);
    assert.equal(m.regulationVerification.limits[row.id], 4);
    assert.equal(refs.find(x => x.id === row.id)?.image, row.image);
  }
  const cards = [MAGNOLIA, DODONGA, MARON, NATURE, WATER, LIGHT, FIRE, HIGHER, PIT, SEED].map(id => ({ id, count: 4 }));
  const deck = { id: 'phase908', name: 'マナと攻撃', cards };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(catalogue.coverage(deck).unsupported, 0);
});

for (const p of [0, 1]) test('Magnolia uses Mach Fighter and replaces battle destruction with untapped colorless mana ' + p, () => {
  const s = field(p);
  const defender = add(s, 1 - p, 'battle', HIGHER);
  const source = play(s, MAGNOLIA);
  const before = physical(s);
  act(s, 'toAttack');
  assert.deepEqual(targets(s, source), [defender.uid]);
  attack(s, source.uid, defender.uid);
  act(s, 'noBlock');
  drain(s);
  const mana = find(s, p, 'mana', source);
  assert.ok(mana?.faceDown);
  assert.equal(mana.tapped, false);
  assert.equal(e.card(mana).cost, 0);
  assert.deepEqual(e.manaCivilizations(e.card(mana)), []);
  assert.equal(e.manaValueAt(s, p, mana), 1);
  assert.ok(!find(s, p, 'grave', source));
  assert.equal(e.observation(s, p).players[p].mana.find(x => x.uid === source.uid).cardId, MAGNOLIA);
  assert.equal(e.observation(s, 1 - p).players[p].mana.find(x => x.uid === source.uid).cardId, 'face-down-mana');
  assert.deepEqual(physical(s), before);
});

for (const faceDown of [true, false]) test('Magnolia and Yamata offer distinct replacement choices after restoring the game ' + faceDown, () => {
  let s = field();
  const source = add(s, 1, 'battle', MAGNOLIA, { tapped: true });
  add(s, 1, 'battle', YAMATA);
  play(s, PIT);
  const before = physical(s);
  act(s, 'effect', a => a.targets.some(y => y.uid === source.uid));
  assert.equal(s.decision.player, 1);
  assert.equal(s.decision.mandatory, true);
  assert.deepEqual(e.getLegalActions(s).map(a => [a.kind, !!a.faceDown]),
    [['replaceYamata', false], ['replaceYamata', true]]);
  s = restore(s);
  act(s, 'replaceYamata', a => !!a.faceDown === faceDown);
  drain(s);
  assert.equal(!!find(s, 1, 'mana', source)?.faceDown, faceDown);
  assert.ok(find(s, 1, 'mana', source));
  assert.ok(!find(s, 1, 'grave', source));
  assert.deepEqual(physical(s), before);
});

test('Magnolia goes to hand on bounce and to the grave when its ability is ignored', () => {
  const s = field();
  const bounced = add(s, 1, 'battle', MAGNOLIA);
  removeWith(s, SPIRAL, bounced);
  assert.ok(find(s, 1, 'hand', bounced));
  const muted = add(s, 1, 'battle', MAGNOLIA);
  add(s, 1, 'battle', GEN);
  removeWith(s, PIT, muted);
  assert.ok(find(s, 1, 'grave', muted));
  assert.ok(!find(s, 1, 'mana', muted));
});

test('Magnolia replaces simultaneous destruction on either side while other creatures die', () => {
  const s = field();
  const own = add(s, 0, 'battle', MAGNOLIA);
  const enemy = add(s, 1, 'battle', MAGNOLIA);
  const other = add(s, 1, 'battle', WATER);
  play(s, BACKBEARD);
  drain(s);
  assert.ok(find(s, 0, 'mana', own)?.faceDown);
  assert.ok(find(s, 1, 'mana', enemy)?.faceDown);
  assert.ok(find(s, 1, 'grave', other));
});

for (const paid of [false, true]) test('Dodonga can use G Zero with an Outrage MAX or pay normally ' + paid, () => {
  const s = field();
  const spell = add(s, 0, 'hand', DODONGA);
  add(s, 0, 'battle', OUTRAGE_MAX);
  const selected = add(s, 0, 'battle', NATURE);
  const other = add(s, 0, 'battle', WATER);
  const enemy = add(s, 1, 'battle', HIGHER);
  const before = physical(s);
  const casts = e.getLegalActions(s).filter(a => a.kind === 'play' && a.uid === spell.uid);
  assert.equal(casts.find(a => !a.alternative).cost, 0);
  assert.equal(casts.find(a => !a.alternative).freeSpell, 'G・ゼロ');
  assert.equal(casts.find(a => a.alternative === 'akashicPaid').cost, 5);
  act(s, 'play', a => a.uid === spell.uid && (paid ? a.alternative === 'akashicPaid' : !a.alternative));
  pick(s, selected.uid);
  assert.ok(find(s, 0, 'grave', spell));
  assert.equal(s.players[0].mana.filter(x => x.tapped).length, paid ? 5 : 0);
  assert.equal(e.power(selected, false, s), 2000);
  assert.equal(e.power(selected, true, s), 5000);
  assert.equal(e.power(other, true, s), 1000);
  act(s, 'toAttack');
  assert.ok(targets(s, selected).includes(enemy.uid));
  assert.ok(!targets(s, other).includes(enemy.uid));
  attack(s, selected.uid, enemy.uid);
  act(s, 'noBlock');
  drain(s);
  assert.ok(find(s, 1, 'grave', enemy));
  assert.deepEqual(physical(s), before);
  act(s, 'endTurn');
  drain(s);
  assert.equal(e.power(selected, true, s), 2000);
});

test('Dodonga needs a visible friendly battle-zone Outrage for G Zero', () => {
  const s = field();
  const spell = add(s, 0, 'hand', DODONGA);
  add(s, 1, 'battle', OUTRAGE_MAX);
  add(s, 0, 'mana', OUTRAGE_MAX);
  const sealed = add(s, 0, 'battle', OUTRAGE_MAX, { sealed: true });
  const cast = () => e.getLegalActions(s).find(a => a.kind === 'play' && a.uid === spell.uid);
  assert.equal(cast().cost, 5);
  s.players[0].mana.forEach(x => { x.tapped = true; });
  assert.equal(cast(), undefined);
  delete sealed.sealed;
  assert.equal(cast().cost, 0);
});

test('Dodonga does not let a creature attack in the turn it entered', () => {
  const s = field();
  const selected = play(s, NATURE);
  add(s, 1, 'battle', WATER);
  play(s, DODONGA);
  pick(s, selected.uid);
  assert.equal(e.power(selected, true, s), 5000);
  act(s, 'toAttack');
  assert.deepEqual(targets(s, selected), []);
});

test('Dodonga grants neither ability while Genmu Emperor ignores it', () => {
  const s = field();
  const selected = add(s, 0, 'battle', NATURE);
  const enemy = add(s, 1, 'battle', GEN);
  const spell = play(s, DODONGA);
  assert.equal(s.decision, null);
  assert.ok(find(s, 0, 'grave', spell));
  assert.equal(e.power(selected, true, s), 2000);
  act(s, 'toAttack');
  assert.ok(!targets(s, selected).includes(enemy.uid));
});

for (const [id, accept] of [[DRAGON, true], [DRAGON, false], [SEED, true]]) {
  test('Maron reveals after shuffling and gives a choice for a Dragon ' + id + ' ' + accept, () => {
    let s = field();
    give(s, 0, 'deck', Array(8).fill(id));
    const enemy = add(s, 1, 'battle', WATER);
    const source = play(s, MARON);
    const before = physical(s);
    const rng = s.rng;
    const expected = restore(s);
    e.shuffleLibrary(expected, 0);
    const top = expected.players[0].deck[0];
    act(s, 'toAttack');
    assert.deepEqual(targets(s, source), [enemy.uid]);
    attack(s, source.uid, enemy.uid);
    assert.notEqual(s.rng, rng);
    assert.equal(s.players[0].deck[0].uid, top.uid);
    assert.equal(s.log.filter(x => x.type === 'reveal').length, 1);
    assert.ok(s.decision.title.includes(e.card(id).name));
    assert.equal(s.decision.task.op, 'g34_Offer');
    s = restore(s);
    pick(s, accept ? true : null);
    drain(s);
    assert.equal(!!find(s, 0, 'battle', top), accept);
    if (!accept) assert.equal(s.players[0].deck[0].uid, top.uid);
    assert.ok(!find(s, 0, 'mana', top));
    assert.equal(s.players[0].g34Protected.length, 0);
    assert.deepEqual(physical(s), before);
  });
}

for (const id of [NATURE, DRAGON_SPELL]) test('Maron adds a non-Dragon to mana and leaves a Dragon spell on top ' + id, () => {
  const s = field(1);
  give(s, 1, 'deck', Array(8).fill(id));
  const source = add(s, 1, 'battle', MARON);
  const expected = restore(s);
  e.shuffleLibrary(expected, 1);
  const top = expected.players[1].deck[0];
  const before = physical(s);
  attack(s, source.uid);
  assert.equal(s.log.filter(x => x.type === 'reveal').length, 1);
  assert.notEqual(s.decision?.task?.op, 'g34_Offer');
  drain(s);
  if (id === NATURE) {
    assert.equal(find(s, 1, 'mana', top)?.tapped, false);
    assert.ok(!find(s, 1, 'deck', top));
  } else {
    assert.equal(s.players[1].deck[0].uid, top.uid);
    assert.ok(!find(s, 1, 'mana', top));
  }
  assert.equal(s.players[1].g34Protected.length, 0);
  assert.deepEqual(physical(s), before);
});

test('Maron does not shuffle or reveal when its printed attack ability is ignored', () => {
  const s = field();
  const source = add(s, 0, 'battle', MARON);
  add(s, 1, 'battle', GEN);
  const rng = s.rng;
  attack(s, source.uid);
  assert.equal(s.rng, rng);
  assert.ok(!s.log.some(x => x.type === 'reveal'));
});
