import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';

const DARK = 'dm27-026', NET = 'dm05-023', CHARGE = 'dm10-100';
const WATER = 'dm01-083', FIRE = 'dm01-097', LIGHT = 'dm01-075', SHADOW = 'dm01-090', NATURE = 'dm01-108';
const TWIN = 'dmbd17-007', MULTI = 'dmr04-048', ZERO = 'dmrp07-001', COURTNEY = 'dm13-015';
const BAIKEN = 'dm29-s02', PROTECT = 'dmbd04-003', HASTE = 'dm05-049', TAP = 'dm06-003';
const NO_ATTACK = 'dm27-042', PROTECTED_TARGET = 'dmrp01-041', SEED = 'dmsd20-016';

function field(p = 0) {
  const s = setup();
  s.active = p;
  for (const who of [0, 1]) give(s, who, 'deck', Array(16).fill(NATURE));
  return s;
}
function put(s, p, zone, id, attrs) {
  const x = Object.assign(inst(id), attrs);
  s.players[p][zone].push(x);
  return x;
}
function play(s, id) {
  const x = put(s, s.active, 'hand', id);
  act(s, 'play', a => a.uid === x.uid && !a.alternative);
  return x;
}
const choices = s => s.decision.choices.map(c => c.value?.uid ?? c.value);
const pick = (s, value) => act(s, 'extended', a => choices(s)[a.choice] === value);
const locate = (s, p, zone, x) => s.players[p][zone].find(y => y.uid === x.uid);
const restore = s => JSON.parse(JSON.stringify(s));
const canEnd = s => e.getLegalActions(s).some(a => a.kind === 'endTurn');
const goAttack = s => {
  if (s.phase === 'charge') act(s, 'skipCharge');
  if (s.phase === 'main') act(s, 'toAttack');
};
function hit(s, x) {
  attack(s, x.uid);
  if (s.decision?.type === 'block') act(s, 'noBlock');
  if (s.decision?.type === 'breakChoice') act(s, 'breakShields');
}
function end(s) {
  goAttack(s);
  act(s, 'endTurn');
  drain(s);
}

test('Phase 914 keeps canonical IDs and matches the complete definitions, verified art and legal deck limits', () => {
  const m = JSON.parse(readFileSync(new URL('../tools/support-phase-914.json', import.meta.url)));
  const cat = createCatalogue(snapshot, data.cards, details);
  assert.deepEqual(m.cards.map(x => x.id), [DARK, NET, CHARGE]);
  assert.deepEqual(m.printAliases, []);
  for (const row of m.cards) {
    const d = details.cards.find(x => x.id === row.id), c = e.card(row.id), [f] = row.faces;
    assert.deepEqual(row.faces, d.faces);
    assert.deepEqual(row.spec, standardCardSpec(d, { phase: 914 }));
    assert.throws(() => standardCardSpec(d, { phase: 913 }));
    const changed = structuredClone(d);
    changed.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(changed, { phase: 914 }));
    assert.deepEqual([c.type, c.cost, c.power, c.civilizations, c.manaValue, c.limit],
      ['spell', f.cost, 0, f.civilizations, 1, m.regulationVerification.limits[row.id]]);
    assert.equal(c.limit, 4);
    assert.deepEqual(data.cards.filter(x => nameKey(x.name) === nameKey(row.name)).map(x => x.id), [row.id]);
    assert.equal(CARD_IMAGES[row.id], row.image);
    assert.ok(row.verification.facesMatched);
    for (const [k, v] of Object.entries(row.spec)) assert.deepEqual(c[k], v);
  }
  const deck = { id: 'phase914', name: '文明・タップ・攻撃',
    cards: [DARK, NET, CHARGE, WATER, FIRE, LIGHT, SHADOW, NATURE, HASTE, TAP].map(id => ({ id, count: 4 })) };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(cat.coverage(deck).unsupported, 0);
});

test('Dark Spiral makes the opponent choose their discard and any of their own mana after a match', () => {
  let s = field(1);
  const [discarded, kept] = give(s, 0, 'hand', [TWIN, NATURE]);
  const [fire, water] = give(s, 0, 'mana', [FIRE, WATER]);
  give(s, 1, 'mana', [SHADOW, SHADOW, SHADOW, SHADOW, SHADOW]);
  const ownMana = s.players[1].mana.map(x => x.uid);
  const spell = play(s, DARK);
  assert.equal(s.decision.player, 0);
  assert.deepEqual(choices(s), [discarded.uid, kept.uid]);
  s = restore(s);
  pick(s, discarded.uid);
  assert.ok(locate(s, 0, 'grave', discarded));
  assert.ok(locate(s, 0, 'hand', kept));
  assert.equal(s.decision.player, 0);
  assert.deepEqual(choices(s), [fire.uid, water.uid]);
  s = restore(s);
  pick(s, fire.uid);
  assert.ok(locate(s, 0, 'grave', fire));
  assert.ok(locate(s, 0, 'mana', water));
  assert.ok(locate(s, 1, 'grave', spell));
  assert.deepEqual(s.players[1].mana.map(x => x.uid), ownMana);
  assert.ok(s.players[1].mana.every(x => x.tapped));
});

for (const [label, hand, ownMana, enemyMana] of [
  ['no shared color', [FIRE], Array(5).fill(SHADOW), [FIRE]],
  ['no discarded card', [], Array(5).fill(SHADOW), [SHADOW]],
  ['two colorless cards do not share a civilization', [ZERO], [...Array(5).fill(SHADOW), ZERO], [SHADOW]],
  ['the opponent has no mana', [SHADOW], Array(5).fill(SHADOW), []]
]) test('Dark Spiral leaves mana alone: ' + label, () => {
  const s = field();
  const [discarded] = give(s, 1, 'hand', hand);
  const before = give(s, 1, 'mana', enemyMana).map(x => x.uid);
  give(s, 0, 'mana', ownMana);
  play(s, DARK);
  if (discarded) {
    pick(s, discarded.uid);
    assert.ok(locate(s, 1, 'grave', discarded));
  }
  assert.equal(s.decision, null);
  assert.deepEqual(s.players[1].mana.map(x => x.uid), before);
});

test('Dark Spiral uses the caster’s currently modified mana colors', () => {
  const s = field(), [discarded] = give(s, 1, 'hand', [FIRE]);
  const [mana] = give(s, 1, 'mana', [WATER]);
  give(s, 0, 'mana', Array(5).fill(NATURE));
  put(s, 0, 'battle', COURTNEY);
  play(s, DARK);
  pick(s, discarded.uid);
  pick(s, mana.uid);
  assert.ok(locate(s, 1, 'grave', mana));
});

test('Dark Spiral skips the mana step if a replacement keeps the discarded card out of the grave', () => {
  const s = field(), [replacement] = give(s, 1, 'hand', [BAIKEN]);
  const before = s.players[1].mana.map(x => x.uid);
  play(s, DARK);
  pick(s, replacement.uid);
  assert.equal(s.decision.player, 1);
  assert.ok(choices(s).includes(true));
  pick(s, true);
  assert.ok(locate(s, 1, 'battle', replacement));
  drain(s);
  assert.deepEqual(s.players[1].mana.map(x => x.uid), before);
  assert.ok(!locate(s, 1, 'grave', replacement));
});

test('Dark Spiral respects discard protection before showing a hand choice', () => {
  const s = field(), [hand] = give(s, 1, 'hand', [SHADOW]);
  put(s, 1, 'battle', PROTECT);
  play(s, DARK);
  assert.equal(s.decision, null);
  assert.ok(locate(s, 1, 'hand', hand));
  assert.equal(s.players[1].mana.length, 50);
});

test('Dark Spiral casts as a shield trigger without mana and the active opponent makes both choices', () => {
  const s = field(1);
  give(s, 0, 'shields', [DARK, NATURE]);
  const [discarded] = give(s, 1, 'hand', [SHADOW]);
  const [lost] = give(s, 1, 'mana', [WATER]);
  hit(s, put(s, 1, 'battle', FIRE));
  act(s, 'useTrigger', a => a.cardId === DARK);
  assert.equal(s.decision.player, 1);
  pick(s, discarded.uid);
  assert.equal(s.decision.player, 1);
  pick(s, lost.uid);
  assert.ok(locate(s, 1, 'grave', lost));
  assert.equal(s.players[0].mana.filter(x => x.tapped).length, 0);
  assert.equal(s.players[0].grave.at(-1).cardId, DARK);
});

test('Thunder Net counts only current allied Water creatures, including a tapped multicolor creature', () => {
  let s = field();
  const water = put(s, 0, 'battle', WATER);
  put(s, 0, 'battle', MULTI, { tapped: true });
  const wrong = put(s, 0, 'battle', FIRE, { under: [inst(WATER)] });
  put(s, 0, 'battle', SEED);
  const sealed = put(s, 0, 'battle', WATER, { sealed: true });
  put(s, 0, 'seals', NATURE, { faceDown: true, sealOf: sealed.uid });
  const a = put(s, 1, 'battle', WATER), b = put(s, 1, 'battle', FIRE), c = put(s, 1, 'battle', FIRE);
  const spell = play(s, NET);
  assert.equal(s.decision.task.n, 2);
  assert.deepEqual(choices(s), [a.uid, b.uid, c.uid, null]);
  pick(s, a.uid);
  assert.equal(a.tapped, false);
  assert.ok(!choices(s).includes(a.uid));
  s = restore(s);
  pick(s, c.uid);
  assert.equal(s.decision, null);
  assert.deepEqual(s.players[1].battle.map(x => x.tapped), [true, false, true]);
  assert.ok(locate(s, 0, 'grave', spell));
  assert.equal(locate(s, 0, 'battle', water).tapped, false);
  assert.equal(locate(s, 0, 'battle', wrong).tapped, false);
});

for (const n of [0, 1]) test('Thunder Net allows stopping below its maximum: ' + n, () => {
  const s = field();
  put(s, 0, 'battle', WATER);
  put(s, 0, 'battle', WATER);
  const a = put(s, 1, 'battle', FIRE), b = put(s, 1, 'battle', FIRE);
  play(s, NET);
  if (n) pick(s, a.uid);
  pick(s, null);
  assert.equal(a.tapped, !!n);
  assert.equal(b.tapped, false);
});

test('Thunder Net allows already tapped creatures, skips untargetable ones and finishes when targets run out', () => {
  const s = field();
  for (let i = 0; i < 3; i++) put(s, 0, 'battle', WATER);
  const tapped = put(s, 1, 'battle', FIRE, { tapped: true });
  const regular = put(s, 1, 'battle', FIRE);
  const hidden = put(s, 1, 'battle', PROTECTED_TARGET);
  play(s, NET);
  assert.deepEqual(choices(s), [tapped.uid, regular.uid, null]);
  pick(s, tapped.uid);
  pick(s, regular.uid);
  assert.equal(s.decision, null);
  assert.equal(regular.tapped, true);
  assert.equal(hidden.tapped, false);
});

test('Thunder Net does nothing with no Water creatures', () => {
  const s = field();
  put(s, 0, 'battle', FIRE);
  const target = put(s, 1, 'battle', WATER);
  play(s, NET);
  assert.equal(s.decision, null);
  assert.equal(target.tapped, false);
});

test('Forced Charge applies to each existing opposing creature, prevents attack substitutes, and expires', () => {
  let s = field();
  const ally = put(s, 0, 'battle', TAP);
  const a = put(s, 1, 'battle', TAP), b = put(s, 1, 'battle', FIRE);
  const unable = put(s, 1, 'battle', NO_ATTACK);
  play(s, CHARGE);
  assert.ok(!e.effectiveCard(ally, s).mustAttack);
  end(s);
  assert.equal(s.active, 1);
  if (s.phase === 'charge') act(s, 'skipCharge');
  const late = play(s, HASTE);
  goAttack(s);
  assert.ok(e.getLegalActions(s).some(x => x.kind === 'attack' && x.uid === late.uid));
  assert.ok(!e.effectiveCard(late, s).mustAttack);
  s = restore(s);
  assert.equal(canEnd(s), false);
  assert.ok(!e.getLegalActions(s).some(x => x.kind === 'tapAbility' && x.uid === a.uid));
  hit(s, a);
  assert.equal(canEnd(s), false);
  hit(s, b);
  assert.equal(canEnd(s), true);
  assert.ok(!e.getLegalActions(s).some(x => x.kind === 'attack' && x.uid === unable.uid));
  end(s);
  assert.equal(s.active, 0);
  for (const x of [a, b, unable]) assert.ok(!e.effectiveCard(locate(s, 1, 'battle', x), s).mustAttack);
});

test('Forced Charge can force attacks immediately when cast as a shield trigger', () => {
  const s = field(1), a = put(s, 1, 'battle', FIRE), b = put(s, 1, 'battle', FIRE);
  give(s, 0, 'shields', [CHARGE, NATURE]);
  hit(s, a);
  act(s, 'useTrigger', x => x.cardId === CHARGE);
  assert.equal(s.players[0].mana.filter(x => x.tapped).length, 0);
  assert.equal(canEnd(s), false);
  hit(s, b);
  assert.equal(canEnd(s), true);
  assert.equal(s.players[0].shields.length, 0);
});

test('Forced Charge’s granted ability respects effects that ignore the creature or the spell', () => {
  const s = field(1), a = put(s, 1, 'battle', FIRE), b = put(s, 1, 'battle', FIRE);
  give(s, 0, 'shields', [CHARGE, NATURE]);
  hit(s, a);
  act(s, 'useTrigger', x => x.cardId === CHARGE);
  assert.equal(canEnd(s), false);
  b.g35Ignored = s.turn;
  assert.equal(canEnd(s), true);
  delete b.g35Ignored;
  assert.equal(canEnd(s), false);
  put(s, 0, 'battle', GEN);
  assert.equal(canEnd(s), true);
});
