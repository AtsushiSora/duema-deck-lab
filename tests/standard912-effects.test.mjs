import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';

const LOVE = 'dmr18-039', PROMO = 'promoy14-033', PANA = 'dm27-042', ADVEN = 'dmr16g-033';
const BIRD = 'dm36-063', DRAGON = 'dmr22-036', REV_EVOLUTION = 'promoy14-spd01', OTHER_EVOLUTION = 'dm02-024';
const FIRE = 'dm01-097', NATURE = 'dm01-108', WATER = 'dm01-083', LIGHT = 'dm01-075';
const ATTACKER = 'dm02-041';
const REV_CREATURE = 'dmx20-019', NO_REDUCTION = 'dmrp22-027', NO_BATTLE = 'dm06-032';

function field(p = 0) {
  const s = setup();
  s.active = p;
  for (const who of [0, 1]) give(s, who, 'deck', Array(12).fill(NATURE));
  return s;
}

function add(s, p, zone, id, attrs) {
  const x = Object.assign(inst(id), attrs);
  s.players[p][zone].push(x);
  return x;
}

function play(s, id) {
  const x = add(s, s.active, 'hand', id);
  act(s, 'play', a => a.uid === x.uid && !a.alternative);
  return x;
}

const restore = s => JSON.parse(JSON.stringify(s));
const physical = s => e.physicalCards(s).map(x => x.uid).sort();
const inZone = (s, p, zone, x) => s.players[p][zone].some(y => y.uid === x.uid);
const canBlock = (s, x) => e.getLegalActions(s).some(a => a.kind === 'block' && a.uid === x.uid);
const targets = (s, x) => new Set(e.getLegalActions(s).filter(a => a.kind === 'attack' && a.uid === x.uid).map(a => a.target));
const choose = (s, value) => act(s, 'extended', a => s.decision.choices[a.choice].value === value);
const manaPaid = (s, p) => s.players[p].mana.filter(x => x.tapped).length;
const end = s => { s.phase = 'attack'; act(s, 'endTurn'); drain(s); };

test('Phase 912 verifies complete printed abilities, art and the same limit across both Love Dratch prints', () => {
  const manifest = JSON.parse(readFileSync(new URL('../tools/support-phase-912.json', import.meta.url)));
  const refs = JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json', import.meta.url))).prints;
  const cat = createCatalogue(snapshot, data.cards, details);
  assert.deepEqual(manifest.cards.map(x => x.id), [LOVE, PANA, ADVEN]);
  assert.deepEqual(manifest.printAliases.map(x => [x.id, x.canonicalId]), [[PROMO, LOVE]]);
  for (const row of manifest.cards) {
    const d = details.cards.find(x => x.id === row.id);
    const c = e.card(row.id);
    const [f] = row.faces;
    assert.deepEqual(row.faces, d.faces);
    assert.deepEqual(standardCardSpec(d, { phase: 912 }), row.spec);
    assert.throws(() => standardCardSpec(d, { phase: 911 }));
    const changed = structuredClone(d);
    changed.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(changed, { phase: 912 }));
    for (const [key, value] of Object.entries(row.spec)) assert.deepEqual(c[key], value);
    assert.deepEqual([c.type, c.cost, c.power, c.civilizations, c.race, c.manaValue, c.limit],
      ['creature', f.cost, Number(f.powerText.replace('+', '')), f.civilizations, f.race, 1, 4]);
    assert.deepEqual(data.cards.filter(x => nameKey(x.name) === nameKey(row.name)).map(x => x.id), [row.id]);
    assert.equal(CARD_IMAGES[row.id], row.image);
  }
  for (const row of [...manifest.cards, ...manifest.printAliases]) {
    assert.ok(row.verification.facesMatched);
    assert.equal(manifest.regulationVerification.limits[row.id], 4);
    assert.equal(refs.find(x => x.id === row.id).image, row.image);
  }
  const [promo] = manifest.printAliases;
  assert.deepEqual(standardCardSpec({ ...promo, status: 'complete' }, { phase: 912 }), manifest.cards[0].spec);
  assert.deepEqual(cat.resolveRows([{ id: PROMO, count: 2 }, { id: LOVE, count: 2 }]), [{ id: LOVE, count: 4 }]);
  const deck = { id: 'phase912', name: '進化召喚とブロック',
    cards: [LOVE, PANA, ADVEN, BIRD, FIRE, NATURE, WATER, LIGHT, DRAGON, REV_EVOLUTION].map(id => ({ id, count: 4 })) };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(cat.coverage(deck).unsupported, 0);
});

for (const [p, amount] of [[0, 0], [1, 1], [0, 2]]) {
  test('Love Dratch counts itself and its allied Bird and pays the chosen amount ' + p + ' ' + amount, () => {
    let s = field(p);
    const love = play(s, LOVE);
    assert.equal(manaPaid(s, p), 2);
    add(s, p, 'battle', BIRD, { tapped: true });
    const sealed = add(s, p, 'battle', BIRD, { sealed: true });
    add(s, p, 'seals', NATURE, { faceDown: true, sealOf: sealed.uid });
    add(s, 1 - p, 'battle', BIRD);
    const evolution = play(s, REV_EVOLUTION);
    if (s.decision.type === 'evolution') act(s, 'evolve', a => a.baseUid === love.uid);
    assert.equal(s.decision?.task?.op, 'g34_PayAura560');
    assert.deepEqual(s.decision.choices.map(c => c.value), [2, 1, 0, false]);
    const before = physical(s);
    s = restore(s);
    choose(s, amount);
    if (s.decision?.type === 'evolution') act(s, 'evolve', a => a.baseUid === love.uid);
    drain(s);
    assert.ok(inZone(s, p, 'battle', evolution));
    assert.equal(manaPaid(s, p), 2 + e.card(REV_EVOLUTION).cost - amount);
    assert.deepEqual(physical(s), before);
  });
}

test('Love Dratch reductions stack to a one-mana floor and cancellation leaves the card in hand', () => {
  const s = field();
  const love = add(s, 0, 'battle', LOVE);
  add(s, 0, 'battle', LOVE);
  add(s, 0, 'battle', BIRD);
  give(s, 0, 'mana', [FIRE]);
  const evolution = play(s, REV_EVOLUTION);
  if (s.decision.type === 'evolution') act(s, 'evolve', a => a.baseUid === love.uid);
  assert.ok(s.decision.choices.some(c => c.value === 6));
  choose(s, false);
  assert.ok(inZone(s, 0, 'hand', evolution));
  assert.equal(manaPaid(s, 0), 0);
  act(s, 'play', a => a.uid === evolution.uid && !a.alternative);
  if (s.decision.type === 'evolution') act(s, 'evolve', a => a.baseUid === love.uid);
  choose(s, 6);
  if (s.decision?.type === 'evolution') act(s, 'evolve', a => a.baseUid === love.uid);
  drain(s);
  assert.equal(manaPaid(s, 0), 1);
  assert.ok(inZone(s, 0, 'battle', evolution));
});

test('Love Dratch needs both evolution and the Revolution Army race and respects suppression', () => {
  const s = field();
  const love = add(s, 0, 'battle', LOVE);
  add(s, 0, 'battle', BIRD);
  for (const id of [OTHER_EVOLUTION, REV_CREATURE, NATURE]) assert.equal(e.summonCost(s, 0, e.card(id)), e.card(id).cost);
  const target = e.card(REV_EVOLUTION);
  assert.equal(e.summonCost(s, 0, target), 3);
  const inhibitor = add(s, 1, 'battle', NO_REDUCTION);
  assert.equal(e.summonCost(s, 0, target), target.cost);
  inhibitor.cardId = GEN;
  assert.equal(e.summonCost(s, 0, target), target.cost);
  assert.equal(e.effectiveCard(love, s).g349SummonAuras, undefined);
});

for (const [p, id, goesToHand] of [[0, FIRE, true], [1, WATER, false], [0, NO_BATTLE, false]]) {
  test('Panaon waits for the battle and returns the surviving attacker ' + p + ' ' + id, () => {
    let s = field(p);
    const attacker = add(s, p, 'battle', id);
    const blocker = add(s, 1 - p, 'battle', PANA);
    const unrelated = add(s, p, 'battle', NATURE);
    const before = physical(s);
    attack(s, attacker.uid);
    assert.equal(canBlock(s, blocker), true);
    s = restore(s);
    act(s, 'block', a => a.uid === blocker.uid);
    drain(s);
    assert.equal(inZone(s, p, 'hand', attacker), goesToHand);
    assert.equal(inZone(s, p, 'grave', attacker), id === WATER);
    assert.equal(inZone(s, 1 - p, 'grave', blocker), id !== NO_BATTLE);
    assert.ok(inZone(s, p, 'battle', unrelated));
    assert.equal(s.players[1 - p].shields.length, 5);
    assert.deepEqual(physical(s), before);
    const battle = s.log.find(x => x.type === 'battle');
    const returnEvent = s.log.find(x => x.type === 'afterBattle' && x.cardId === PANA);
    assert.equal(!!battle, id !== NO_BATTLE);
    if (goesToHand) assert.ok(battle.index < returnEvent.index);
    else assert.equal(returnEvent, undefined);
  });
}

test('Panaon returns an evolved attacker as a complete stack, and cannot declare its own attacks', () => {
  const s = field();
  const base = inst(FIRE);
  const attacker = add(s, 0, 'battle', REV_EVOLUTION, { under: [base] });
  const blocker = add(s, 1, 'battle', PANA);
  attack(s, attacker.uid);
  act(s, 'block', a => a.uid === blocker.uid);
  drain(s);
  assert.ok(inZone(s, 0, 'hand', attacker));
  assert.ok(inZone(s, 0, 'hand', base));
  assert.ok(inZone(s, 1, 'grave', blocker));

  const u = field();
  const own = play(u, PANA);
  own.entered = 0;
  add(u, 1, 'battle', WATER, { tapped: true });
  act(u, 'toAttack');
  assert.equal(targets(u, own).size, 0);
});

for (const [top, matched] of [[DRAGON, true], [ADVEN, true], [FIRE, false]]) {
  test('Advenchuo mills one physical card before the block battle and checks its race ' + top, () => {
    const s = field();
    give(s, 1, 'deck', [top, LIGHT, WATER, NATURE]);
    const [first, next] = s.players[1].deck;
    const attacker = add(s, 0, 'battle', ATTACKER);
    const blocker = add(s, 1, 'battle', ADVEN);
    const before = physical(s);
    attack(s, attacker.uid);
    act(s, 'block', a => a.uid === blocker.uid);
    drain(s);
    assert.ok(inZone(s, 1, 'grave', first));
    assert.equal(s.players[1].deck[0].uid, next.uid);
    assert.equal(inZone(s, 0, 'grave', attacker), matched);
    assert.equal(inZone(s, 1, 'grave', blocker), !matched);
    if (matched) {
      assert.equal(e.power(blocker, false, s), 4000);
      end(s);
      assert.equal(e.power(blocker, false, s), 2000);
    }
    assert.deepEqual(physical(s), before);
  });
}

test('Advenchuo mills even when the blocked attacker skips battle and loses to mandatory deck exhaustion', () => {
  for (const last of [false, true]) {
    const s = field();
    give(s, 1, 'deck', last ? [ADVEN] : [ADVEN, NATURE]);
    const top = s.players[1].deck[0];
    const attacker = add(s, 0, 'battle', NO_BATTLE);
    const blocker = add(s, 1, 'battle', ADVEN);
    attack(s, attacker.uid);
    act(s, 'block', a => a.uid === blocker.uid);
    drain(s);
    assert.ok(inZone(s, 1, 'grave', top));
    assert.equal(s.winner, last ? 0 : null);
    assert.ok(!s.log.some(x => x.type === 'battle'));
    assert.equal(e.power(blocker, false, s), last ? 2000 : 4000);
  }
});

test('Advenchuo can attack a tapped creature, and Genmu removes its Blocker', () => {
  const s = field();
  const blocker = play(s, ADVEN);
  blocker.entered = 0;
  const enemy = add(s, 1, 'battle', WATER, { tapped: true });
  act(s, 'toAttack');
  assert.deepEqual(targets(s, blocker), new Set([enemy.uid]));
  const u = field();
  const attacker = add(u, 0, 'battle', FIRE);
  const defender = add(u, 1, 'battle', ADVEN);
  add(u, 0, 'battle', GEN);
  attack(u, attacker.uid);
  assert.equal(canBlock(u, defender), false);
  assert.equal(u.players[1].grave.length, 0);
});
