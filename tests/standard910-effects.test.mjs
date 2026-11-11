import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';

const BLUE = 'dm03-050', SPIDER = 'dm38-053', AVOCADO = 'dm14-038', GENOCIDE = 'dm31-013';
const BLUE_REPRINT = 'dmc27-050', SPIDER_REPRINT = 'dmx18-020';
const NATURE = 'dm01-108', WATER = 'dm01-083', HIGHER = 'dm01-004', SEED = 'dm22ex1-086';
const LIGHT_HUNTER = 'dmr05-076', FIRE = 'dm01-097', TIE = 'dm01-074', LIGHT = 'dm06-085';
const HEAVY = 'dmex17-033', METAL = 'dmex17-059', YAMATA = 'dmbd18-003', OROCHI = 'dmrp17-s11';
const AVALARD = 'dm28-043', END_DRAW = 'dmrp03-s05';

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

test('Phase 910 checks full official definitions, six prints, restrictions and a legal forty', () => {
  const m = JSON.parse(readFileSync(new URL('../tools/support-phase-910.json', import.meta.url)));
  const catalogue = createCatalogue(snapshot, data.cards, details);
  const refs = JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json', import.meta.url))).prints;
  assert.deepEqual(m.cards.map(c => c.id), [BLUE, SPIDER, AVOCADO, GENOCIDE]);
  assert.deepEqual(m.printAliases.map(({ id, canonicalId }) => [id, canonicalId]), [[BLUE_REPRINT, BLUE], [SPIDER_REPRINT, SPIDER]]);
  for (const row of m.printAliases) {
    assert.deepEqual(catalogue.resolveRows([{ id: row.id, count: 2 }, { id: row.canonicalId, count: 2 }]),
      [{ id: row.canonicalId, count: 4 }]);
    assert.deepEqual(standardCardSpec({ ...row, status: 'complete' }, { phase: 910 }),
      m.cards.find(c => c.id === row.canonicalId).spec);
  }
  for (const row of m.cards) {
    const d = details.cards.find(x => x.id === row.id);
    const c = e.card(row.id);
    const [face] = row.faces;
    assert.deepEqual(row.faces, d.faces);
    assert.deepEqual(standardCardSpec(d, { phase: 910 }), row.spec);
    const changed = structuredClone(d);
    changed.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(changed, { phase: 910 }));
    for (const [key, v] of Object.entries(row.spec)) assert.deepEqual(c[key], v);
    assert.deepEqual([c.type, c.cost, c.power, c.civilizations, c.race, c.manaValue, c.limit],
      [row.id === GENOCIDE ? 'spell' : 'creature', face.cost, Number(face.powerText), face.civilizations, face.race, 1, 4]);
    assert.equal(CARD_IMAGES[row.id], row.image);
    assert.deepEqual(data.cards.filter(x => nameKey(x.name) === nameKey(c.name)).map(x => x.id), [row.id]);
  }
  for (const row of [...m.cards, ...m.printAliases]) {
    assert.ok(row.verification.facesMatched);
    assert.equal(m.regulationVerification.limits[row.id], 4);
    assert.equal(refs.find(x => x.id === row.id)?.image, row.image);
  }
  const cards = [BLUE, SPIDER, AVOCADO, GENOCIDE, NATURE, WATER, HIGHER, SEED, LIGHT_HUNTER, FIRE]
    .map(id => ({ id, count: 4 }));
  const deck = { id: 'phase910', name: '攻撃と登場時能力', cards };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(catalogue.coverage(deck).unsupported, 0);
});

const attacks = (s, x) => e.getLegalActions(s).filter(a => a.kind === 'attack' && a.uid === x.uid);
const end = s => { s.phase = 'attack'; act(s, 'endTurn'); };
const taskIs = (s, op) => assert.equal(s.decision?.task?.op, op, JSON.stringify(s.decision));

for (const p of [0, 1]) test('Blue Razor can attack when tied or ahead and is restricted only while outnumbered ' + p, () => {
  const s = field(p);
  const blue = play(s, BLUE);
  blue.entered = 0;
  const target = add(s, 1 - p, 'battle', WATER, { tapped: true });
  add(s, 1 - p, 'battle', SEED);
  act(s, 'toAttack');
  assert.deepEqual(new Set(attacks(s, blue).map(a => a.target)), new Set(['player', target.uid]));
  const extra = add(s, 1 - p, 'battle', NATURE);
  assert.deepEqual(attacks(s, blue), []);
  const seal = add(s, 1 - p, 'seals', WATER, { sealOf: extra.uid });
  extra.sealed = true;
  assert.ok(attacks(s, blue).length);
  s.players[1 - p].seals.splice(s.players[1 - p].seals.indexOf(seal), 1);
  delete extra.sealed;
  add(s, p, 'battle', WATER);
  add(s, p, 'battle', NATURE);
  assert.ok(attacks(s, blue).length);
});

test('Genmu disables Blue Razor’s own attack restriction', () => {
  const s = field();
  const blue = add(s, 0, 'battle', BLUE);
  add(s, 1, 'battle', WATER);
  add(s, 1, 'battle', GEN);
  act(s, 'toAttack');
  assert.ok(attacks(s, blue).some(a => a.target === 'player'));
});

test('Spider pays normally and ramps the physical top card when it enters', () => {
  const s = field();
  const top = s.players[0].deck[0];
  const x = play(s, SPIDER);
  assert.ok(find(s, 0, 'battle', x));
  assert.equal(find(s, 0, 'mana', top)?.tapped, false);
  assert.equal(s.players[0].mana.filter(y => y.tapped).length, 5);
  assert.deepEqual(e.card(x).g558Souls, ['W']);
});

test('Spider counts the opposing start-of-turn draw and draws from a spell (QA36188)', () => {
  let s = field();
  const x = add(s, 0, 'hand', SPIDER);
  const top = s.players[0].deck[0];
  end(s);
  assert.equal(s.active, 1);
  assert.equal(s.players[1].drawsThisTurn, 1);
  act(s, 'skipCharge');
  play(s, LIGHT);
  assert.equal(s.players[1].drawsThisTurn, 3);
  const before = physical(s);
  end(s);
  taskIs(s, 'g34_RevengeDeclare795');
  assert.equal(s.decision.player, 0);
  s = restore(s);
  pick(s, true);
  taskIs(s, 'g34_RevengeSummon795');
  pick(s, true);
  assert.ok(find(s, 0, 'battle', x));
  assert.equal(find(s, 0, 'mana', top)?.tapped, false);
  assert.equal(s.players[0].mana.filter(y => y.tapped).length, 0);
  assert.deepEqual(physical(s), before);
});

test('Spider does not count cards looked at and added by Avalard (QA36189)', () => {
  const s = field(1);
  const x = add(s, 0, 'hand', SPIDER);
  give(s, 1, 'deck', Array(12).fill(LIGHT));
  play(s, AVALARD);
  drain(s);
  assert.equal(s.players[1].hand.length, 3);
  assert.equal(s.players[1].drawsThisTurn || 0, 0);
  end(s);
  assert.ok(find(s, 0, 'hand', x));
  assert.equal(s.decision, null);
});

for (const accept of [false, true]) test('Spider can declare on its own turn and opt out of the free summon ' + accept, () => {
  const s = field();
  const x = add(s, 0, 'hand', SPIDER);
  s.players[1].drawsThisTurn = 4;
  end(s);
  taskIs(s, 'g34_RevengeDeclare795');
  pick(s, true);
  taskIs(s, 'g34_RevengeSummon795');
  pick(s, accept ? true : null);
  assert.equal(!!find(s, 0, 'battle', x), accept);
  assert.equal(!!find(s, 0, 'hand', x), !accept);
});

test('The non-turn Spider can declare after the turn player draws their third card at end of turn', () => {
  const s = field(1);
  const x = add(s, 0, 'hand', SPIDER);
  add(s, 1, 'battle', END_DRAW);
  play(s, LIGHT);
  assert.equal(s.players[1].drawsThisTurn, 2);
  end(s);
  assert.equal(s.decision.source, END_DRAW);
  pick(s, true);
  assert.equal(s.players[1].drawsThisTurn, 3);
  taskIs(s, 'g34_RevengeDeclare795');
  pick(s, true);
  pick(s, true);
  assert.ok(find(s, 0, 'battle', x));
});

test('Orochi enables Spider’s Revenge Chance from the deck top (QA39655)', () => {
  const s = field();
  add(s, 0, 'battle', OROCHI);
  const x = inst(SPIDER);
  s.players[0].deck.unshift(x);
  const top = s.players[0].deck[1];
  s.players[1].drawsThisTurn = 3;
  end(s);
  taskIs(s, 'g34_RevengeDeclare795');
  assert.equal(s.decision.task.origin, 'deck');
  pick(s, true);
  taskIs(s, 'g34_RevengeSummon795');
  pick(s, true);
  assert.ok(find(s, 0, 'battle', x));
  assert.ok(find(s, 0, 'mana', top));
});

for (const p of [0, 1]) test('Avocado moves to mana only for a larger creature entering on either side ' + p, () => {
  const s = field(p);
  const x = p === 0 ? play(s, AVOCADO) : add(s, 0, 'battle', AVOCADO);
  play(s, WATER);
  play(s, TIE);
  play(s, SEED);
  assert.ok(find(s, 0, 'battle', x));
  play(s, HIGHER);
  assert.equal(find(s, 0, 'mana', x)?.tapped, false);
  assert.ok(!find(s, 0, 'grave', x));
});

test('Avocado compares modified power and does not trigger when Genmu enters', () => {
  const s = field();
  const x = play(s, AVOCADO);
  x.powerModifiers = [{ amount: 2000, expires: 'end', who: 0 }];
  play(s, HIGHER);
  assert.ok(find(s, 0, 'battle', x));
  const helpers = [x, ...s.players[0].battle.filter(y => y.uid !== x.uid)];
  helpers.push(add(s, 0, 'battle', WATER), add(s, 0, 'battle', WATER));
  const genmu = add(s, 0, 'hand', GEN);
  act(s, 'mugenStart', a => a.uid === genmu.uid);
  for (const helper of helpers) act(s, 'mugenTap', a => a.uid === helper.uid);
  assert.ok(find(s, 0, 'battle', genmu));
  assert.ok(find(s, 0, 'battle', x));
  assert.equal(s.decision, null);
});

test('Genocide destroys the first non-God without offering a second target', () => {
  const s = field();
  const first = add(s, 1, 'battle', NATURE);
  const god = add(s, 1, 'battle', METAL);
  const spell = play(s, GENOCIDE);
  pick(s, first.uid);
  assert.ok(find(s, 1, 'grave', first));
  assert.ok(find(s, 1, 'battle', god));
  assert.ok(find(s, 0, 'grave', spell));
  assert.equal(s.decision, null);
});

for (const accept of [false, true]) test('Genocide offers optional second destruction after selecting a God ' + accept, () => {
  const s = field();
  const first = add(s, 1, 'battle', METAL);
  const other = add(s, 1, 'battle', WATER);
  add(s, 0, 'battle', NATURE);
  play(s, GENOCIDE);
  pick(s, first.uid);
  assert.ok(find(s, 1, 'grave', first));
  assert.deepEqual(options(s), [other.uid, null]);
  pick(s, accept ? other.uid : null);
  assert.equal(!!find(s, 1, 'grave', other), accept);
});

test('Genocide checks God before destruction replacement and offers a different second target', () => {
  const s = field();
  const first = add(s, 1, 'battle', METAL);
  const other = add(s, 1, 'battle', WATER);
  const yamata = add(s, 1, 'battle', YAMATA);
  play(s, GENOCIDE);
  pick(s, first.uid);
  act(s, 'replaceYamata');
  assert.ok(find(s, 1, 'mana', first));
  assert.deepEqual(new Set(options(s)), new Set([other.uid, yamata.uid, null]));
  pick(s, null);
});

test('Genocide lets the owner choose one linked God part and cannot pick the remaining part as a different creature', () => {
  let s = field();
  const heavy = add(s, 1, 'battle', HEAVY);
  const metal = inst(METAL);
  heavy.godLinks = [metal];
  const other = add(s, 1, 'battle', NATURE);
  play(s, GENOCIDE);
  const before = physical(s);
  pick(s, heavy.uid);
  assert.equal(s.decision.type, 'godLeave');
  s = restore(s);
  act(s, 'godLeave', a => a.uid === heavy.uid);
  assert.ok(find(s, 1, 'grave', heavy));
  assert.ok(find(s, 1, 'battle', metal));
  assert.deepEqual(options(s), [other.uid, null]);
  pick(s, other.uid);
  assert.ok(find(s, 1, 'grave', other));
  assert.deepEqual(physical(s), before);
});
