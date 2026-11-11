import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';
import { publicBoardSnapshot } from '../dist/battle-visuals.js';

const AGO = 'dmrp09-021', ACHI = 'dmrp12-096', KAI = 'dmrp16-087';
const NATURE = 'dm01-108', LIGHT = 'dm01-075', DARK = 'dm01-090', WATER = 'dm01-083';
const FIRE = 'dm01-097', BLOCKER = 'dm01-076', BIG = 'dm05-s04', KIRA = 'dmrp17-s01';
const ALNARSI = 'dmrp10-069', FUUJIN = 'dmrp22-037', ZEOS = 'dmrp09-s06';

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
  s.extTasks = [{ op: 'g34_Sequence', p, source: AGO, defs }];
  act(s, 'toAttack');
}

function tap(s, p, card) {
  invoke(s, p, [{ op: 'Target', owner: 'self', tap: true, filter: { exactUid: card.uid } }]);
  pick(s, card.uid);
}

function end(s) {
  s.phase = 'attack';
  act(s, 'endTurn');
  drain(s);
}

function resolve(s, source) {
  if (s.decision?.type !== 'effectOrder') return;
  const effect = s.pendingEffects.find(x => x.player === s.decision.player && x.source === source);
  assert.ok(effect, source);
  const action = e.getLegalActions(s).find(x => x.effectId === effect.effectId);
  assert.ok(action, source);
  e.step(s, action);
}

test('Phase 904 verifies complete definitions, art, printed data and distinct names across five prints', () => {
  const m = JSON.parse(readFileSync(new URL('../tools/support-phase-904.json', import.meta.url)));
  const catalogue = createCatalogue(snapshot, data.cards, details);
  const refs = JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json', import.meta.url))).prints;
  assert.deepEqual(m.cards.map(c => c.id), [AGO, ACHI, KAI]);
  assert.deepEqual(m.printAliases.map(x => [x.id, x.canonicalId]), [['dmex17-057', AGO], ['promoy21-075', KAI]]);
  for (const row of m.cards) {
    const d = details.cards.find(x => x.id === row.id);
    const c = e.card(row.id);
    const [face] = row.faces;
    assert.deepEqual(d.faces, row.faces);
    assert.deepEqual(standardCardSpec(d, { phase: 904 }), row.spec);
    const changed = structuredClone(d);
    changed.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(changed, { phase: 904 }));
    for (const [key, value] of Object.entries(row.spec)) assert.deepEqual(c[key], value);
    assert.deepEqual([c.type, c.cost, c.civilizations, c.race || '', c.manaValue, c.limit],
      [face.typeText === '呪文' ? 'spell' : 'creature', face.cost, face.civilizations, face.race, 1, 4]);
    if (c.type === 'creature') assert.equal(c.power, Number(face.powerText));
    assert.deepEqual(data.cards.filter(x => nameKey(x.name) === nameKey(c.name)).map(x => x.id), [row.id]);
  }
  for (const row of [...m.cards, ...m.printAliases]) {
    assert.equal(refs.find(x => x.id === row.id)?.image, row.image);
    if (!row.canonicalId) assert.equal(CARD_IMAGES[row.id], row.image);
    assert.equal(m.regulationVerification.limits[row.id], 4);
    assert.ok(row.verification.facesMatched);
    const original = m.cards.find(x => x.id === (row.canonicalId || row.id));
    assert.deepEqual(standardCardSpec({ ...row, status: 'complete' }, { phase: 904 }), original.spec);
    assert.deepEqual(catalogue.resolveRows([{ id: row.id, count: 4 }]), [{ id: row.canonicalId || row.id, count: 4 }]);
  }
  const cards = [AGO, ACHI, KAI, NATURE, LIGHT, DARK, WATER, FIRE, BLOCKER, BIG].map(id => ({ id, count: 4 }));
  const deck = { id: 'phase904', name: 'アゴクイと呪文', cards };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(catalogue.coverage(deck).unsupported, 0);
});

for (const p of [0, 1]) test('Agokui may sacrifice the attacking ally and draw before the attack resolves ' + p, () => {
  let s = field(p);
  play(s, AGO);
  const victim = add(s, p, 'battle', NATURE);
  const before = physical(s);
  attack(s, victim.uid);
  assert.equal(s.decision.source, AGO);
  s = restore(s);
  pick(s, true);
  drain(s);
  assert.ok(has(s, p, 'grave', victim));
  assert.equal(s.players[p].hand.length, 1);
  assert.equal(s.players[1 - p].shields.length, 5);
  assert.deepEqual(physical(s), before);
});

test('Agokui can decline and its own tap can be sacrificed', () => {
  for (const yes of [true, false]) {
    const s = field();
    const source = add(s, 0, 'battle', AGO);
    attack(s, source.uid);
    pick(s, yes ? true : null);
    if (!yes) act(s, 'noBlock');
    drain(s);
    assert.equal(has(s, 0, 'grave', source), yes);
    assert.equal(s.players[0].hand.length, yes ? 1 : 0);
    assert.equal(s.players[1].shields.length, yes ? 5 : 4);
  }
});

test('Agokui draws when the attempted destruction is replaced by Alnarsi’s shield placement', () => {
  const s = field();
  add(s, 0, 'battle', AGO);
  const victim = add(s, 0, 'battle', ALNARSI);
  tap(s, 0, victim);
  pick(s, true);
  assert.ok(has(s, 0, 'shields', victim));
  assert.ok(!has(s, 0, 'grave', victim));
  assert.equal(s.players[0].hand.length, 1);
});

test('Agokui may sacrifice a blocker on the opponent turn after the block is declared', () => {
  const s = field(1);
  add(s, 0, 'battle', AGO);
  const blocker = add(s, 0, 'battle', BLOCKER);
  const attacker = add(s, 1, 'battle', BIG);
  attack(s, attacker.uid);
  act(s, 'block', a => a.uid === blocker.uid);
  assert.equal(s.decision.player, 0);
  pick(s, true);
  drain(s);
  assert.ok(has(s, 0, 'grave', blocker));
  assert.equal(s.players[0].hand.length, 1);
  assert.equal(s.players[0].shields.length, 5);
});

test('Agokui ignores enemy taps, mana payments, already tapped cards and ignored watchers', () => {
  for (const mode of ['enemy', 'mana', 'already', 'ignored', 'entry tapped']) {
    const s = field();
    const watcher = add(s, 0, 'battle', AGO);
    if (mode === 'ignored') watcher.g35Ignored = s.turn;
    if (mode === 'mana') play(s, WATER);
    else if (mode === 'entry tapped') {
      const entering = add(s, 0, 'hand', NATURE);
      invoke(s, 0, [{ op: 'Put', origin: 'hand', target: entering.uid, tapped: true }]);
    } else {
      const p = mode === 'enemy' ? 1 : 0;
      const victim = add(s, p, 'battle', NATURE, { tapped: mode === 'already' });
      tap(s, p, victim);
    }
    assert.equal(s.decision, null, mode);
    assert.equal(s.players[0].hand.length, 0);
  }
});

test('Agokui’s pending effect is bound to the original creature and cannot sacrifice a re-entry', () => {
  const s = field();
  add(s, 0, 'battle', AGO);
  const victim = add(s, 0, 'battle', NATURE);
  invoke(s, 0, [
    { op: 'Target', owner: 'self', tap: true, filter: { exactUid: victim.uid } },
    { op: 'Target', owner: 'self', to: 'hand', filter: { exactUid: victim.uid } },
    { op: 'Put', origin: 'hand', target: victim.uid },
  ]);
  pick(s, victim.uid);
  pick(s, victim.uid);
  assert.equal(s.decision, null);
  assert.ok(has(s, 0, 'battle', victim));
  assert.equal(s.players[0].hand.length, 0);
});

for (const changeFirst of [true, false]) test('Agokui follows the chosen resolution order with Revolution Change ' + changeFirst, () => {
  const s = field();
  add(s, 0, 'battle', AGO);
  const attacker = add(s, 0, 'battle', 'dm01-008');
  const change = add(s, 0, 'hand', 'dmr21-l02');
  const deckBefore = s.players[0].deck.length;
  attack(s, attacker.uid);
  assert.equal(s.decision.task.op, 'revDeclare');
  pick(s, true);
  if (changeFirst) {
    resolve(s, change.cardId);
    pick(s, attacker.uid);
  } else {
    resolve(s, AGO);
    pick(s, true);
  }
  drain(s);
  assert.equal(has(s, 0, 'battle', change), changeFirst);
  assert.equal(has(s, 0, 'hand', attacker), changeFirst);
  assert.equal(has(s, 0, 'grave', attacker), !changeFirst);
  assert.equal(s.players[0].deck.length, deckBefore - Number(!changeFirst));
});

test('Agokui’s draw and Zeos’s actual destruction trigger both resolve', () => {
  const s = field();
  add(s, 0, 'battle', AGO);
  add(s, 0, 'battle', ZEOS);
  const victim = add(s, 0, 'battle', NATURE);
  attack(s, victim.uid);
  pick(s, true);
  assert.equal(s.players[0].hand.length, 1);
  assert.equal(s.decision.source, ZEOS);
  pick(s, 0);
  assert.equal(s.players[0].hand.length, 2);
});

for (const p of [0, 1]) test('Achichi Town draws after the selection and untaps only the first attack before block ' + p, () => {
  let s = field(p);
  const selected = add(s, p, 'battle', NATURE);
  const other = add(s, p, 'battle', NATURE);
  add(s, 1 - p, 'battle', BLOCKER);
  const source = play(s, ACHI);
  assert.equal(s.players[p].hand.length, 0);
  assert.deepEqual(values(s).sort(), [selected.uid, other.uid].sort());
  pick(s, selected.uid);
  assert.equal(s.players[p].hand.length, 1);
  assert.ok(has(s, p, 'grave', source));
  s = restore(s);
  const attacker = s.players[p].battle.find(x => x.uid === selected.uid);
  attack(s, other.uid);
  act(s, 'noBlock');
  drain(s);
  attack(s, attacker.uid);
  assert.equal(s.decision.type, 'block');
  assert.equal(attacker.tapped, false);
  act(s, 'noBlock');
  drain(s);
  attack(s, attacker.uid);
  assert.equal(attacker.tapped, true);
  act(s, 'noBlock');
  drain(s);
});

test('Achichi Town follows an evolution of the chosen creature', () => {
  const s = field();
  const base = add(s, 0, 'battle', LIGHT);
  play(s, ACHI);
  pick(s, base.uid);
  const top = play(s, KIRA);
  act(s, 'evolve', a => a.baseUid === base.uid);
  drain(s);
  attack(s, top.uid);
  resolve(s, ACHI);
  assert.equal(top.tapped, false);
  drain(s);
});

for (const duringAttack of [true, false]) test('Achichi Town follows Star reconstruction of the selected evolution ' + duringAttack, () => {
  const s = field();
  const base = add(s, 0, 'battle', LIGHT);
  const top = play(s, KIRA);
  act(s, 'evolve', a => a.baseUid === base.uid);
  drain(s);
  end(s);
  end(s);
  play(s, ACHI);
  pick(s, top.uid);
  if (duringAttack) {
    add(s, 0, 'battle', AGO);
    attack(s, top.uid);
    resolve(s, AGO);
    pick(s, true);
    resolve(s, ACHI);
  } else {
    invoke(s, 0, [{ op: 'Target', owner: 'self', to: 'grave', filter: { exactUid: top.uid } }]);
    pick(s, top.uid);
    attack(s, base.uid);
  }
  assert.ok(has(s, 0, 'grave', top));
  assert.ok(has(s, 0, 'battle', base));
  assert.equal(base.tapped, false);
  drain(s);
});

test('Achichi Town cannot untap a creature that attacked earlier that turn', () => {
  const s = field();
  const x = add(s, 0, 'battle', NATURE);
  attack(s, x.uid);
  act(s, 'noBlock');
  drain(s);
  x.tapped = false;
  play(s, ACHI);
  pick(s, x.uid);
  attack(s, x.uid);
  assert.equal(x.tapped, true);
});

test('Achichi Town draws with no creature and its delayed effect expires or is ignored under Genmu', () => {
  const empty = field();
  play(empty, ACHI);
  assert.equal(empty.players[0].hand.length, 1);
  for (const expire of [true, false]) {
    const s = field();
    const x = add(s, 0, 'battle', NATURE);
    play(s, ACHI);
    pick(s, x.uid);
    if (expire) {
      end(s);
      end(s);
    } else add(s, 1, 'battle', GEN);
    attack(s, x.uid);
    assert.equal(x.tapped, true);
  }
});

for (const p of [0, 1]) test('Kaitai privately inspects the hand and makes one public face-up shield ' + p, () => {
  let s = field(p);
  const shield = add(s, 1 - p, 'hand', BIG);
  const hidden = add(s, 1 - p, 'hand', FIRE);
  const oldShields = s.players[1 - p].shields.map(x => x.uid);
  const before = physical(s);
  const source = play(s, KAI);
  assert.equal(s.decision.player, p);
  assert.deepEqual(s.decision.task.seen, [BIG, FIRE]);
  assert.ok(!JSON.stringify(s.log).includes(e.card(FIRE).name));
  assert.ok(!JSON.stringify(publicBoardSnapshot(s)).includes(hidden.uid));
  s = restore(s);
  pick(s, shield.uid);
  drain(s);
  assert.deepEqual(s.players[1 - p].shields.map(x => x.uid), [...oldShields, shield.uid]);
  assert.equal(s.players[1 - p].shields.at(-1).faceUp, true);
  assert.ok(has(s, 1 - p, 'hand', hidden));
  assert.ok(has(s, p, 'grave', source));
  assert.deepEqual(physical(s).filter(uid => uid !== source.uid), before);
});

test('Kaitai permits declining, and an empty hand ends the spell', () => {
  const s = field();
  const x = add(s, 1, 'hand', BIG);
  play(s, KAI);
  pick(s, null);
  assert.ok(has(s, 1, 'hand', x));
  assert.equal(s.players[1].shields.length, 5);
  give(s, 1, 'hand', []);
  const source = play(s, KAI);
  assert.equal(s.decision, null);
  assert.ok(has(s, 0, 'grave', source));
});

test('Kaitai sends a selected card to its owner and respects the shield placement prohibition', () => {
  const s = field();
  const x = add(s, 1, 'hand', BIG, { cardOwner: 0 });
  play(s, KAI);
  pick(s, x.uid);
  assert.ok(has(s, 0, 'shields', x));
  assert.equal(s.players[0].shields.at(-1).faceUp, true);
  const t = field();
  const y = add(t, 1, 'hand', BIG, { cardOwner: 0 });
  add(t, 1, 'battle', FUUJIN);
  play(t, KAI);
  assert.deepEqual(t.decision.task.seen, [BIG]);
  assert.deepEqual(values(t), [null]);
  pick(t, null);
  assert.ok(has(t, 1, 'hand', y));
  assert.ok(!has(t, 0, 'shields', y));
});
