import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';

const FULL = 'dm04-008', JUJU = 'dmrp12-046', MIRACLE = 'dm05-026';
const BODY = 'dm01-108', FIRE = 'dm01-097', SMALL = 'dmrp01-041', BIG = 'dm03-s03', W = 'dm01-007';
const WATER = 'dm01-083', LIGHT = 'dm01-075', SURFER = 'dm05-024', SAVER = 'dmex14-101';
const BREAK_SPELL = 'dm24rp4-020', RAINBOW = 'dm24ex4-015';

function field(p = 0) {
  const s = setup();
  s.active = p;
  for (const who of [0, 1]) give(s, who, 'deck', Array(16).fill(BODY));
  return s;
}
function put(s, p, zone, id, attrs) {
  const x = Object.assign(inst(id), attrs);
  s.players[p][zone].push(x);
  return x;
}
function play(s, id) {
  s.phase = 'main';
  const x = put(s, s.active, 'hand', id);
  act(s, 'play', a => a.uid === x.uid && !a.alternative);
  return x;
}
function hit(s, x) {
  attack(s, x.uid);
  if (s.decision?.type === 'block') act(s, 'noBlock');
  if (s.decision?.type === 'breakChoice') act(s, 'breakShields');
}
const restore = s => JSON.parse(JSON.stringify(s));
const inZone = (s, p, zone, x) => s.players[p][zone].some(y => y.uid === x.uid);
const pick = (s, value) => act(s, 'extended', a => s.decision.choices[a.choice].value === value);
const block = (s, x) => act(s, 'block', a => a.uid === x.uid);
const hasBlocker = (s, x) => !!e.effectiveCard(s.players.flatMap(p => p.battle).find(y => y.uid === x.uid), s).blocker;
const hand = (s, p) => s.players[p].hand.map(x => x.uid);
const end = s => { s.phase = 'attack'; act(s, 'endTurn'); drain(s); };

test('Phase 913 matches full official definitions, art and existing canonical IDs in a legal deck', () => {
  const manifest = JSON.parse(readFileSync(new URL('../tools/support-phase-913.json', import.meta.url)));
  const catalogue = createCatalogue(snapshot, data.cards, details);
  assert.deepEqual(manifest.cards.map(x => x.id), [FULL, JUJU, MIRACLE]);
  assert.deepEqual(manifest.printAliases, []);
  for (const row of manifest.cards) {
    const d = details.cards.find(x => x.id === row.id), c = e.card(row.id), [f] = row.faces;
    assert.deepEqual(row.faces, d.faces);
    assert.deepEqual(row.spec, standardCardSpec(d, { phase: 913 }));
    assert.throws(() => standardCardSpec(d, { phase: 912 }));
    const changed = structuredClone(d);
    changed.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(changed, { phase: 913 }));
    for (const [k, v] of Object.entries(row.spec)) assert.deepEqual(c[k], v);
    assert.deepEqual([c.type, c.cost, c.power, c.civilizations, c.race || '', c.manaValue, c.limit],
      [row.id === JUJU ? 'creature' : 'spell', f.cost, Number(f.powerText), f.civilizations, f.race, 1, 4]);
    assert.deepEqual(data.cards.filter(x => nameKey(x.name) === nameKey(row.name)).map(x => x.id), [row.id]);
    assert.equal(CARD_IMAGES[row.id], row.image);
    assert.equal(manifest.regulationVerification.limits[row.id], 4);
    assert.ok(row.verification.facesMatched);
  }
  const deck = { id: 'phase913', name: 'ブロックとブレイク',
    cards: [FULL, JUJU, MIRACLE, BODY, FIRE, SMALL, BIG, W, WATER, LIGHT].map(id => ({ id, count: 4 })) };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(catalogue.coverage(deck).unsupported, 0);
});

test('Full Defender snapshots all friendly creatures, persists through the opposing turn and expires at the next own start', () => {
  let s = field();
  const ready = put(s, 0, 'battle', BODY);
  const tapped = put(s, 0, 'battle', BODY, { tapped: true });
  const opponent = put(s, 1, 'battle', FIRE);
  const spell = play(s, FULL);
  const later = play(s, BODY);
  assert.ok(inZone(s, 0, 'grave', spell));
  assert.equal(s.players[0].mana.filter(x => x.tapped).length, e.card(FULL).cost + e.card(BODY).cost);
  assert.deepEqual([ready, tapped, opponent, later].map(x => hasBlocker(s, x)), [true, true, false, false]);
  end(s);
  s = restore(s);
  assert.equal(s.active, 1);
  attack(s, opponent.uid);
  assert.deepEqual(e.getLegalActions(s).filter(a => a.kind === 'block').map(a => a.uid), [ready.uid]);
  block(s, ready);
  assert.ok(inZone(s, 0, 'grave', ready));
  assert.ok(hasBlocker(s, tapped));
  end(s);
  assert.equal(s.active, 0);
  assert.ok(!hasBlocker(s, tapped));
});

test('Full Defender casts from the shield without payment and can block a later attack that turn', () => {
  const s = field(1);
  give(s, 0, 'shields', [FULL, BODY]);
  const ally = put(s, 0, 'battle', BODY);
  const a = put(s, 1, 'battle', FIRE), b = put(s, 1, 'battle', FIRE);
  hit(s, a);
  assert.equal(s.decision.type, 'trigger');
  act(s, 'useTrigger', v => v.cardId === FULL);
  assert.equal(s.players[0].mana.filter(x => x.tapped).length, 0);
  assert.equal(s.players[0].grave.at(-1).cardId, FULL);
  attack(s, b.uid);
  block(s, ally);
  assert.ok(inZone(s, 1, 'grave', b));
  assert.equal(s.players[0].shields.length, 1);
});

test('Full Defender is suppressed while a later Genmu Emperor remains in play', () => {
  const s = field();
  const ally = put(s, 0, 'battle', BODY);
  play(s, FULL);
  assert.ok(hasBlocker(s, ally));
  const genmu = put(s, 1, 'battle', GEN);
  assert.ok(!hasBlocker(s, ally));
  s.players[1].battle.splice(s.players[1].battle.indexOf(genmu), 1);
  s.players[1].grave.push(genmu);
  assert.ok(hasBlocker(s, ally));
});

test('Juju weakens the actual attacker without choosing it, and zero power prevents a battle', () => {
  const s = field(1);
  const juju = put(s, 0, 'battle', JUJU);
  const victim = put(s, 1, 'battle', SMALL);
  const other = put(s, 1, 'battle', SMALL);
  assert.ok(e.effectiveCard(victim, s).untargetable);
  attack(s, victim.uid);
  block(s, juju);
  assert.equal(s.decision, null);
  assert.ok(inZone(s, 1, 'grave', victim));
  assert.ok(inZone(s, 0, 'battle', juju));
  assert.equal(e.power(other, false, s), 2000);
  assert.equal(s.players[0].shields.length, 5);
  assert.ok(!s.log.some(x => x.type === 'battle'));
  end(s);
  assert.ok(inZone(s, 0, 'grave', juju));
});

test('Juju changes the battle result, leaves a larger attacker weakened for the turn, and the loss expires', () => {
  const s = field(1);
  const juju = put(s, 0, 'battle', JUJU);
  const large = put(s, 1, 'battle', 'dmrp03-087');
  assert.equal(e.power(large, false, s), 12000);
  attack(s, large.uid);
  block(s, juju);
  assert.ok(inZone(s, 0, 'grave', juju));
  assert.ok(inZone(s, 1, 'battle', large));
  assert.equal(e.power(large, false, s), 3000);
  end(s);
  assert.equal(e.power(large, false, s), 12000);

  const tie = field(1);
  const j = put(tie, 0, 'battle', JUJU), enemy = put(tie, 1, 'battle', BIG);
  attack(tie, enemy.uid);
  block(tie, j);
  assert.ok(inZone(tie, 0, 'grave', j));
  assert.ok(inZone(tie, 1, 'grave', enemy));
});

for (const p of [0, 1]) test('Juju destroys itself when tapped at the end of either turn: ' + p, () => {
  const s = field(p);
  const tapped = put(s, 0, 'battle', JUJU, { tapped: true });
  const ready = put(s, 0, 'battle', JUJU);
  end(s);
  assert.ok(inZone(s, 0, 'grave', tapped));
  assert.ok(inZone(s, 0, 'battle', ready));
});

test('Juju can attack players and its attack tap can cause self destruction', () => {
  const s = field();
  const juju = put(s, 0, 'battle', JUJU);
  hit(s, juju);
  assert.equal(s.players[1].shields.length, 4);
  end(s);
  assert.ok(inZone(s, 0, 'grave', juju));
});

test('Juju is summoned without mana from a shield, then blocks a second attacker', () => {
  const s = field(1);
  give(s, 0, 'shields', [JUJU, BODY]);
  const a = put(s, 1, 'battle', FIRE), b = put(s, 1, 'battle', FIRE);
  hit(s, a);
  act(s, 'useTrigger', v => v.cardId === JUJU);
  const juju = s.players[0].battle.find(x => x.cardId === JUJU);
  assert.ok(juju);
  assert.equal(s.players[0].mana.filter(x => x.tapped).length, 0);
  attack(s, b.uid);
  block(s, juju);
  assert.ok(inZone(s, 1, 'grave', b));
  assert.ok(inZone(s, 0, 'battle', juju));
});

test('Miracle Searcher draws two once for a simultaneous W-break, after the shield trigger enters', () => {
  let s = field();
  play(s, MIRACLE);
  give(s, 1, 'shields', [SURFER, BODY]);
  const attacker = put(s, 0, 'battle', W);
  const top = s.players[0].deck.slice(0, 2).map(x => x.uid);
  hit(s, attacker);
  assert.equal(s.decision.type, 'trigger');
  assert.deepEqual(hand(s, 0), []);
  act(s, 'useTrigger', a => a.cardId === SURFER);
  assert.equal(s.players[1].battle[0].cardId, SURFER);
  assert.equal(s.decision.task.op, 'g34_Offer');
  s = restore(s);
  pick(s, true);
  assert.deepEqual(hand(s, 0), top);
  assert.equal(s.decision.player, 1);
  act(s, 'effect', a => a.targets.some(x => x.uid === attacker.uid));
  assert.ok(inZone(s, 0, 'hand', attacker));
  assert.equal(s.decision, null);
});

test('Each casting of Miracle Searcher gives an independent choice for each subsequent break', () => {
  const s = field();
  play(s, MIRACLE);
  play(s, MIRACLE);
  const a = put(s, 0, 'battle', FIRE), b = put(s, 0, 'battle', FIRE);
  for (const [attacker, accept, count] of [[a, [true, null], 2], [b, [true, true], 6]]) {
    hit(s, attacker);
    for (const value of accept) {
      if (s.decision.type === 'effectOrder') act(s, 'orderEffect');
      assert.equal(s.decision.task.op, 'g34_Offer');
      pick(s, value);
    }
    assert.equal(s.decision, null);
    assert.equal(hand(s, 0).length, count);
  }
});

test('Miracle Searcher recognizes a creature breaking its own shield through an effect', () => {
  const s = field();
  play(s, MIRACLE);
  play(s, RAINBOW);
  assert.equal(s.decision.task.op, 'g34_Break497');
  pick(s, s.players[0].shields[0].uid);
  assert.equal(s.decision.task.op, 'g34_Offer');
  pick(s, true);
  assert.equal(hand(s, 0).length, 3);
  assert.equal(s.players[0].shields.length, 4);
});

test('Miracle Searcher recognizes a second break by a creature that left after its first break', () => {
  let s = field();
  const giza = put(s, 0, 'battle', 'dm35-013');
  const defender = put(s, 1, 'battle', BODY, { tapped: true });
  give(s, 1, 'shields', [SURFER, BODY]);
  play(s, MIRACLE);
  play(s, 'dm35-019');
  attack(s, giza.uid, defender.uid);
  if (s.decision?.type === 'block') act(s, 'noBlock');
  act(s, 'battleWinOrder', a => a.cardId === giza.cardId);
  pick(s, s.players[1].shields[0].uid);
  act(s, 'useTrigger', a => a.cardId === SURFER);
  assert.equal(s.decision.task.op, 'g34_Offer');
  pick(s, true);
  // Resolve the first shield's Surfer before resuming the other already-triggered break.
  if (s.decision.type === 'effectOrder') act(s, 'orderEffect', a => a.cardId === SURFER);
  act(s, 'effect', a => a.targets.some(x => x.uid === giza.uid));
  assert.ok(inZone(s, 0, 'hand', giza));
  assert.equal(s.decision.task.op, 'g34_Break497');
  s = restore(s);
  pick(s, s.players[1].shields[0].uid);
  assert.equal(s.decision.task.op, 'g34_Offer');
  pick(s, true);
  assert.equal(s.decision, null);
  assert.equal(hand(s, 0).length, 5);
  assert.equal(s.players[1].shields.length, 0);
});

test('Miracle Searcher ignores a spell break and a shield saved by a replacement', () => {
  const s = field();
  play(s, MIRACLE);
  play(s, BREAK_SPELL);
  pick(s, null);
  pick(s, 0);
  pick(s, s.players[1].shields[0].uid);
  assert.equal(s.decision, null);
  assert.deepEqual(hand(s, 0), []);
  assert.equal(s.players[1].shields.length, 4);

  const saver = put(s, 1, 'battle', SAVER);
  hit(s, put(s, 0, 'battle', FIRE));
  assert.equal(s.decision.type, 'shieldGuard');
  act(s, 'saveShield', a => a.uid === saver.uid);
  if (s.decision?.type === 'shieldGuard') act(s, 'finishShieldGuards');
  assert.equal(s.decision, null);
  assert.deepEqual(hand(s, 0), []);
  assert.equal(s.players[1].shields.length, 4);
});

test('Miracle Searcher does not trigger for an opposing creature or after the turn ends', () => {
  const s = field();
  play(s, MIRACLE);
  end(s);
  assert.equal(s.active, 1);
  const shield = s.players[0].shields[0];
  hit(s, put(s, 1, 'battle', FIRE));
  assert.equal(s.decision, null);
  assert.deepEqual(hand(s, 0), [shield.uid]);
  end(s);
  assert.equal(s.active, 0);
  const before = hand(s, 0);
  hit(s, put(s, 0, 'battle', FIRE));
  assert.equal(s.decision, null);
  assert.deepEqual(hand(s, 0), before);
});

test('Miracle Searcher cannot trigger while its resolved spell effect is ignored', () => {
  const s = field();
  play(s, MIRACLE);
  put(s, 1, 'battle', GEN);
  hit(s, put(s, 0, 'battle', FIRE));
  assert.equal(s.decision, null);
  assert.deepEqual(hand(s, 0), []);
  assert.equal(s.players[1].shields.length, 4);
});
