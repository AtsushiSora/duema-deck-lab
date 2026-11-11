import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';

const TSUNA = 'dmrp12-041', ZEOS = 'dmrp09-s06', JET = 'dmrp18-077';
const NATURE = 'dm01-108', LIGHT = 'dm01-075', DARK = 'dm01-090', WATER = 'dm01-083';
const FIRE = 'dm01-097', BLOCKER = 'dm01-076', BIG = 'dm05-s04';
const KIRA = 'dmrp17-s01', ALNARSI = 'dmrp10-069', BOLSHACK = 'dm01-008';

function field(p = 0) {
  const s = setup();
  s.active = p;
  for (const player of [0, 1]) give(s, player, 'deck', Array(24).fill(NATURE));
  return s;
}

function add(s, p, zone, id, props) {
  const card = Object.assign(inst(id), props);
  s.players[p][zone].push(card);
  return card;
}

const has = (s, p, zone, card) => s.players[p][zone].some(x => x.uid === card.uid);
const physical = s => e.physicalCards(s).map(x => x.uid).sort();
const restore = s => JSON.parse(JSON.stringify(s));
const values = s => s.decision.choices.map(({ value }) => value?.uid ?? value);
const pick = (s, value) => act(s, 'extended', a => values(s)[a.choice] === value);

function play(s, id) {
  s.phase = 'main';
  const card = add(s, s.active, 'hand', id);
  act(s, 'play', a => a.uid === card.uid && !a.alternative);
  return card;
}

function invoke(s, p, defs) {
  s.phase = 'main';
  s.extTasks = [{ op: 'g34_Sequence', p, source: ZEOS, defs }];
  act(s, 'toAttack');
}

function move(s, p, card, to = 'grave') {
  invoke(s, p, [{ op: 'Target', owner: 'self', to, filter: { exactUid: card.uid } }]);
  pick(s, card.uid);
}

function end(s) {
  s.phase = 'attack';
  act(s, 'endTurn');
  drain(s);
}

const attacks = (s, card) => e.getLegalActions(s).some(a => a.kind === 'attack' && a.uid === card.uid);
const blocks = s => e.getLegalActions(s).filter(a => a.kind === 'block').map(a => a.uid);

test('Phase 903 verifies complete definitions, art, printed data, unique IDs and a legal forty', () => {
  const m = JSON.parse(readFileSync(new URL('../tools/support-phase-903.json', import.meta.url)));
  const catalogue = createCatalogue(snapshot, data.cards, details);
  assert.deepEqual(m.cards.map(c => c.id), [TSUNA, ZEOS, JET]);
  assert.deepEqual(m.printAliases, []);
  for (const row of m.cards) {
    const d = details.cards.find(x => x.id === row.id);
    const c = e.card(row.id);
    const [face] = row.faces;
    assert.deepEqual(d.faces, row.faces);
    assert.deepEqual(standardCardSpec(d, { phase: 903 }), row.spec);
    const changed = structuredClone(d);
    changed.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(changed, { phase: 903 }));
    for (const [key, value] of Object.entries(row.spec)) assert.deepEqual(c[key], value);
    assert.deepEqual([c.type, c.cost, c.power, c.civilizations, c.race, c.manaValue, c.limit],
      ['creature', face.cost, Number(face.powerText), face.civilizations, face.race, 1, 4]);
    assert.equal(CARD_IMAGES[row.id], row.image);
    assert.equal(m.regulationVerification.limits[row.id], 4);
    assert.ok(row.verification.facesMatched);
    assert.deepEqual(data.cards.filter(x => nameKey(x.name) === nameKey(c.name)).map(x => x.id), [row.id]);
    assert.deepEqual(catalogue.resolveRows([{ id: row.id, count: 4 }]), [{ id: row.id, count: 4 }]);
  }
  const cards = [TSUNA, ZEOS, JET, NATURE, LIGHT, DARK, WATER, FIRE, BLOCKER, BIG].map(id => ({ id, count: 4 }));
  const deck = { id: 'phase903', name: 'ツナハッカとゼオス', cards };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(catalogue.coverage(deck).unsupported, 0);
});

for (const p of [0, 1]) test('Tsunahakka stops attacks for each eligible opposing creature and expires at turn end ' + p, () => {
  const s = field(1 - p);
  const attacker = add(s, 1 - p, 'battle', NATURE);
  const low = add(s, 1 - p, 'battle', WATER);
  const five = add(s, 1 - p, 'battle', KIRA);
  const six = add(s, 1 - p, 'battle', BOLSHACK);
  const friendly = add(s, p, 'battle', WATER);
  assert.equal(e.card(KIRA).cost, 5);
  assert.equal(e.card(BOLSHACK).cost, 6);
  give(s, p, 'shields', [TSUNA]);
  const shield = s.players[p].shields[0];
  const before = physical(s);

  attack(s, attacker.uid);
  act(s, 'noBlock');
  act(s, 'useTrigger', a => a.uid === shield.uid);
  drain(s);
  assert.ok(has(s, p, 'battle', shield));
  assert.equal(s.players[p].mana.filter(x => x.tapped).length, 0);
  assert.equal(s.players[p].shields.length, 0);
  assert.equal(e.attackLocked(s, 1 - p, attacker), true);
  assert.equal(attacks(s, low), false);
  assert.equal(attacks(s, five), false);
  assert.equal(attacks(s, six), true);
  assert.equal(e.attackLocked(s, p, friendly), false);

  const late = add(s, 1 - p, 'battle', WATER);
  assert.equal(attacks(s, late), true);
  assert.deepEqual(physical(s).filter(uid => uid !== late.uid), before);
  end(s);
  assert.equal(e.attackLocked(s, 1 - p, low), false);
  assert.equal(e.attackLocked(s, 1 - p, five), false);
});

test('Tsunahakka prohibits blocking without tapping or choosing creatures', () => {
  const s = field();
  const attacker = add(s, 0, 'battle', NATURE);
  const low = add(s, 1, 'battle', BLOCKER);
  const high = add(s, 1, 'battle', 'dm01-004');
  const protectedId = data.cards.find(c => c.type === 'creature' && c.cost <= 5 && c.untargetable).id;
  const protectedEnemy = add(s, 1, 'battle', protectedId);
  const sealed = add(s, 1, 'battle', BLOCKER, { sealed: true });
  add(s, 1, 'seals', NATURE, { faceDown: true, sealOf: sealed.uid });
  play(s, TSUNA);
  assert.equal(s.decision, null);
  assert.equal(low.tapped, false);
  assert.equal(e.attackLocked(s, 1, protectedEnemy), true);
  assert.equal(e.attackLocked(s, 1, sealed), false);
  const late = add(s, 1, 'battle', BLOCKER);
  attack(s, attacker.uid);
  assert.deepEqual(blocks(s).sort(), [high.uid, late.uid].sort());
  act(s, 'block', a => a.uid === late.uid);
  drain(s);
});

test('Tsunahakka freezes a previously eligible creature after it evolves and after the source leaves', () => {
  let s = field(1);
  const base = add(s, 1, 'battle', LIGHT);
  const source = add(s, 0, 'hand', TSUNA);
  invoke(s, 0, [{ op: 'Put', origin: 'hand', target: source.uid }]);
  drain(s);
  move(s, 0, source, 'hand');
  const evolved = play(s, KIRA);
  act(s, 'evolve', a => a.baseUid === base.uid);
  drain(s);
  s = restore(s);
  const current = s.players[1].battle.find(x => x.uid === evolved.uid);
  assert.ok(has(s, 0, 'hand', source));
  assert.ok(e.attackLocked(s, 1, current));
  end(s);
  assert.equal(e.attackLocked(s, 1, current), false);
});

test('Tsunahakka does not freeze a creature that leaves and comes back this turn', () => {
  const s = field(1);
  const enemy = add(s, 1, 'battle', WATER);
  const source = add(s, 0, 'hand', TSUNA);
  invoke(s, 0, [{ op: 'Put', origin: 'hand', target: source.uid }]);
  assert.ok(e.attackLocked(s, 1, enemy));
  move(s, 1, enemy, 'hand');
  invoke(s, 1, [{ op: 'Put', origin: 'hand', target: enemy.uid }]);
  assert.ok(has(s, 1, 'battle', enemy));
  assert.equal(e.attackLocked(s, 1, enemy), false);
});

test('Tsunahakka enters under Genmu without applying attack restrictions', () => {
  const s = field();
  add(s, 1, 'battle', GEN);
  const enemy = add(s, 1, 'battle', WATER);
  const source = play(s, TSUNA);
  assert.ok(has(s, 0, 'battle', source));
  assert.equal(e.attackLocked(s, 1, enemy), false);
});

for (const p of [0, 1]) test('Zeos sacrifices a friendly creature, draws one and breaks three shields ' + p, () => {
  const s = field(p);
  const source = add(s, p, 'battle', ZEOS);
  const victim = add(s, p, 'battle', JET);
  const before = physical(s);
  attack(s, source.uid);
  assert.deepEqual(values(s).sort(), [source.uid, victim.uid].sort());
  assert.equal(values(s)[e.chooseAI(s).choice], victim.uid);
  pick(s, victim.uid);
  assert.deepEqual(values(s), [0, 1]);
  pick(s, 0);
  assert.equal(s.players[p].hand.length, 1);
  act(s, 'noBlock');
  drain(s);
  assert.equal(s.players[1 - p].shields.length, 2);
  assert.ok(has(s, p, 'grave', victim));
  assert.deepEqual(physical(s), before);
});

for (const mode of [0, 1]) test('Zeos can sacrifice itself and still resolve its chosen mode after JSON resume ' + mode, () => {
  let s = field();
  const source = add(s, 0, 'battle', ZEOS);
  const enemy = add(s, 1, 'battle', TSUNA);
  attack(s, source.uid);
  assert.deepEqual(values(s), [source.uid]);
  pick(s, source.uid);
  assert.deepEqual(values(s), [0, 1]);
  s = restore(s);
  pick(s, mode);
  if (mode === 1) pick(s, enemy.uid);
  drain(s);
  assert.ok(has(s, 0, 'grave', source));
  assert.equal(s.players[0].hand.length, 1 - mode);
  assert.equal(has(s, 1, 'grave', enemy), mode === 1);
  assert.equal(s.players[1].shields.length, 5);
});

test('Zeos counts separate allied deaths, and power reductions add until the active turn ends', () => {
  const s = field(1);
  add(s, 0, 'battle', ZEOS);
  add(s, 0, 'battle', NATURE);
  add(s, 0, 'battle', JET);
  const enemy = add(s, 1, 'battle', BIG);
  const before = e.power(enemy, false, s);
  invoke(s, 0, [{ op: 'Sweep', owner: 'self', to: 'grave', filter: { max: 3 } }]);
  if (s.decision?.type === 'effectOrder') e.step(s, e.getLegalActions(s)[0]);
  pick(s, 1);
  pick(s, enemy.uid);
  pick(s, 1);
  pick(s, enemy.uid);
  drain(s);
  assert.equal(s.players[0].grave.length, 2);
  assert.equal(e.power(enemy, false, s), before - 6000);
  end(s);
  assert.equal(e.power(enemy, false, s), before);
});

test('Zeos looks back only at itself if it dies alongside an ally', () => {
  const s = field(1);
  const source = add(s, 0, 'battle', ZEOS);
  const victim = add(s, 0, 'battle', NATURE);
  invoke(s, 0, [{ op: 'Sweep', owner: 'self', to: 'grave', filter: { creature: true } }]);
  assert.deepEqual(values(s), [0, 1]);
  pick(s, 0);
  assert.equal(s.decision, null);
  assert.equal(s.players[0].hand.length, 1);
  assert.ok(has(s, 0, 'grave', source) && has(s, 0, 'grave', victim));
});

test('Zeos ignores opposing destruction, bounce, replaced destruction and an ignored watcher', () => {
  for (const mode of ['enemy', 'bounce', 'replaced', 'ignored']) {
    const s = field();
    add(s, 0, 'battle', ZEOS);
    if (mode === 'ignored') add(s, 1, 'battle', GEN);
    const p = mode === 'enemy' ? 1 : 0;
    const victim = add(s, p, 'battle', mode === 'replaced' ? ALNARSI : NATURE);
    move(s, p, victim, mode === 'bounce' ? 'hand' : 'grave');
    assert.equal(s.decision, null, mode);
    assert.equal(s.players[0].hand.length, mode === 'bounce' ? 1 : 0);
    if (mode === 'replaced') assert.ok(has(s, 0, 'shields', victim));
  }
});

for (const p of [0, 1]) test('Jet pays one dark mana and mills exactly the top card on entry ' + p, () => {
  const s = field(p);
  give(s, p, 'mana', [DARK]);
  give(s, p, 'deck', [DARK, LIGHT, NATURE]);
  const before = physical(s);
  const deck = s.players[p].deck.map(x => x.uid);
  const source = play(s, JET);
  assert.ok(has(s, p, 'battle', source));
  assert.equal(s.players[p].mana[0].tapped, true);
  const milled = s.players[p].grave[0].uid;
  assert.equal(milled, deck[0]);
  assert.deepEqual(s.players[p].deck.map(x => x.uid), deck.slice(1));
  assert.deepEqual(physical(s).filter(uid => uid !== source.uid), before);
});

test('Jet mills after non-summon entry and loses if it mills the last card', () => {
  const s = field();
  give(s, 0, 'deck', [NATURE]);
  const last = s.players[0].deck[0];
  const source = add(s, 0, 'hand', JET);
  invoke(s, 0, [{ op: 'Put', origin: 'hand', target: source.uid }]);
  assert.ok(has(s, 0, 'grave', last));
  assert.equal(s.winner, 1);
});

test('Jet cannot attack a player or creature even with speed attacker and can still block', () => {
  const s = field();
  const source = play(s, JET);
  const enemy = add(s, 1, 'battle', NATURE, { tapped: true });
  source.g34Grants = [{ turn: s.turn, speedAttacker: true }];
  s.phase = 'attack';
  assert.equal(attacks(s, source), false);
  end(s);
  attack(s, enemy.uid);
  assert.deepEqual(blocks(s), [source.uid]);
  act(s, 'block', a => a.uid === source.uid);
  drain(s);
  assert.equal(s.players[0].shields.length, 5);
});

test('Jet does not mill or block under Genmu and can attack when its abilities are ignored', () => {
  const s = field();
  add(s, 1, 'battle', GEN);
  const n = s.players[0].deck.length;
  const source = play(s, JET);
  assert.equal(s.players[0].deck.length, n);
  assert.equal(s.players[0].grave.length, 0);
  assert.equal(e.effectiveCard(source, s).blocker, undefined);
  end(s);
  end(s);
  s.phase = 'attack';
  assert.ok(attacks(s, source));
});
