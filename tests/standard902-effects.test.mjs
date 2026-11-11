import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';

const SHURAI = 'dmrp17-032', JUSTICE = 'dmrp17-001', ALNARSI = 'dmrp10-069';
const KIRA = 'dmrp17-s01', NEO = 'dmsp01-010', RAJU = 'dm32-045';
const MAID = 'dm26ex4-029', WATER = 'dm01-083', DARK = 'dm01-090';
const LIGHT = 'dm01-075', NATURE = 'dm01-108', BIG = 'dm05-s04';
const COST4 = 'dm01-040', COST5 = 'dm01-109';
const DOKKOI = 'dm26rp1-009', FUUJIN = 'dmrp22-037';

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
const tappedMana = (s, p) => s.players[p].mana.filter(x => x.tapped).length;
const restore = s => JSON.parse(JSON.stringify(s));
const values = s => s.decision.choices.map(({ value }) => value?.uid ?? value);
const pick = (s, value) => act(s, 'extended', action => values(s)[action.choice] === value);

function play(s, p, id) {
  s.phase = 'main';
  const card = add(s, p, 'hand', id);
  act(s, 'play', action => action.uid === card.uid && !action.alternative);
  return card;
}

function beginEnd(s) {
  s.phase = 'attack';
  act(s, 'endTurn');
}

function end(s) {
  beginEnd(s);
  drain(s);
}

function move(s, p, card, to = 'grave') {
  s.phase = 'main';
  s.extTasks = [{
    op: 'g34_Sequence',
    p,
    source: JUSTICE,
    defs: [{ op: 'Target', owner: 'self', to, filter: { exactUid: card.uid } }],
  }];
  act(s, 'toAttack');
  pick(s, card.uid);
}

test('Phase 902 verifies full definitions, images, limits, unique names and a legal deck', () => {
  const manifest = JSON.parse(readFileSync(new URL('../tools/support-phase-902.json', import.meta.url)));
  const catalogue = createCatalogue(snapshot, data.cards, details);
  assert.deepEqual(manifest.cards.map(row => row.id), [SHURAI, JUSTICE, ALNARSI]);
  assert.deepEqual(manifest.printAliases, []);
  for (const row of manifest.cards) {
    const detail = details.cards.find(x => x.id === row.id);
    const [face] = row.faces;
    const card = e.card(row.id);
    assert.deepEqual(detail.faces, row.faces);
    assert.deepEqual(standardCardSpec(detail, { phase: 902 }), row.spec);
    const changed = structuredClone(detail);
    changed.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(changed, { phase: 902 }));
    assert.throws(() => standardCardSpec(detail, { phase: 901 }));
    for (const [key, value] of Object.entries(row.spec)) assert.deepEqual(card[key], value);
    assert.deepEqual([card.type, card.cost, card.power, card.civilizations, card.race, card.manaValue, card.limit],
      ['creature', face.cost, Number(face.powerText), face.civilizations, face.race, 1, 4]);
    assert.equal(manifest.regulationVerification.limits[row.id], 4);
    assert.equal(CARD_IMAGES[row.id], row.image);
    assert.ok(row.verification.facesMatched);
    assert.deepEqual(data.cards.filter(x => nameKey(x.name) === nameKey(card.name)).map(x => x.id), [row.id]);
    assert.deepEqual(catalogue.resolveRows([{ id: row.id, count: 4 }]), [{ id: row.id, count: 4 }]);
  }
  const ids = [SHURAI, JUSTICE, ALNARSI, KIRA, NEO, RAJU, LIGHT, WATER, DARK, NATURE];
  const deck = { id: 'phase902', name: '光の進化', cards: ids.map(id => ({ id, count: 4 })) };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(catalogue.coverage(deck).unsupported, 0);
});

for (const p of [0, 1]) test('Shurai taps itself and makes the chosen other ally untap after JSON resume for player ' + p, () => {
  let s = field(p);
  const source = play(s, p, SHURAI);
  const chosen = add(s, p, 'battle', LIGHT, { tapped: true });
  const other = add(s, p, 'battle', NATURE, { tapped: true });
  const enemy = add(s, 1 - p, 'battle', LIGHT, { tapped: true, tapLocks: [p] });
  const before = physical(s);

  beginEnd(s);
  s = restore(s);
  assert.deepEqual(values(s), [true, null]);
  pick(s, true);
  s = restore(s);
  assert.deepEqual(values(s).sort(), [chosen.uid, other.uid].sort());
  pick(s, chosen.uid);
  drain(s);

  const find = (player, uid) => s.players[player].battle.find(x => x.uid === uid);
  assert.equal(find(p, source.uid).tapped, true);
  assert.equal(find(p, chosen.uid).tapped, false);
  assert.equal(find(p, other.uid).tapped, true);
  assert.ok(find(1 - p, enemy.uid).tapped);
  assert.deepEqual(physical(s), before);
});

test('Shurai may decline its own end ability', () => {
  const s = field();
  const source = play(s, 0, SHURAI);
  const target = add(s, 0, 'battle', LIGHT, { tapped: true });
  beginEnd(s);
  pick(s, null);
  drain(s);
  assert.equal(source.tapped, false);
  assert.equal(target.tapped, true);
});

test('Shurai can tap with no other ally to untap', () => {
  const s = field();
  const source = play(s, 0, SHURAI);
  beginEnd(s);
  pick(s, true);
  assert.equal(s.decision, null);
  assert.equal(source.tapped, true);
});

test('Shurai can choose an already untapped ally or one that cannot untap', () => {
  for (const locked of [true, false]) {
    const s = field();
    const source = play(s, 0, SHURAI);
    const target = add(s, 0, 'battle', LIGHT, { tapped: locked, tapLocks: locked ? [0] : [] });
    beginEnd(s);
    pick(s, true);
    assert.deepEqual(values(s), [target.uid]);
    pick(s, target.uid);
    drain(s);
    assert.equal(source.tapped, true);
    assert.equal(target.tapped, locked);
  }
});

test('Shurai does not offer to tap on the opposing turn or while tapped, sealed or ignored', () => {
  for (const mode of ['opposing turn', 'tapped', 'sealed', 'ignored', 'Genmu']) {
    const s = field(mode === 'opposing turn' ? 1 : 0);
    const source = add(s, 0, 'battle', SHURAI);
    if (mode === 'tapped') source.tapped = true;
    if (mode === 'sealed') add(s, 0, 'seals', NATURE, { faceDown: true, sealOf: source.uid });
    if (mode === 'ignored') source.g35Ignored = s.turn;
    if (mode === 'Genmu') add(s, 1, 'battle', GEN);
    beginEnd(s);
    assert.equal(s.decision, null, mode);
  }
});

test('Shurai pays Sasage 1 for an actual Dispector summon', () => {
  const s = field();
  const source = play(s, 0, SHURAI);
  const maid = add(s, 0, 'hand', MAID);
  give(s, 0, 'mana', [WATER, DARK, WATER, DARK, WATER, DARK, WATER]);
  const ordinary = add(s, 0, 'hand', LIGHT);
  assert.ok(e.getLegalActions(s).every(action => action.uid !== ordinary.uid || action.alternative !== 'sasage'));
  act(s, 'play', action => action.uid === maid.uid && action.alternative === 'sasage'
    && action.sasage.length === 1 && action.sasage[0] === source.uid && action.cost === 7);
  drain(s);
  assert.equal(tappedMana(s, 0), 7);
  assert.ok(has(s, 0, 'grave', source));
  assert.ok(has(s, 0, 'battle', maid));
});

test('Justice reduces every own evolution summon by one per active copy, with a floor of one', () => {
  const s = field();
  play(s, 0, JUSTICE);
  play(s, 0, JUSTICE);
  const ignored = play(s, 0, JUSTICE);
  ignored.g35Ignored = s.turn;
  add(s, 1, 'battle', JUSTICE);
  const kira = e.card(KIRA);
  const neo = e.card(NEO);
  assert.equal(e.summonCost(s, 0, kira), 3);
  assert.equal(e.summonCost(s, 1, kira), 4);
  assert.equal(e.summonCost(s, 0, e.card(LIGHT)), e.card(LIGHT).cost);
  assert.equal(e.summonCost(s, 0, { ...neo, g27BaseUid: 'base' }), 1);
  assert.equal(e.summonCost(s, 0, { ...neo, g27BaseUid: null }), neo.cost);
});

test('Justice keeps the mandatory discount when the player declines optional Raju reduction', () => {
  const s = field();
  const base = play(s, 0, JUSTICE);
  add(s, 0, 'battle', RAJU);
  give(s, 0, 'mana', Array(4).fill(LIGHT));
  play(s, 0, KIRA);
  act(s, 'evolve', action => action.baseUid === base.uid);
  assert.equal(s.decision.type, 'extended');
  assert.deepEqual(values(s).sort(), [0, 1]);
  pick(s, 0);
  drain(s);
  assert.equal(tappedMana(s, 0), 4);
  assert.ok(!has(s, 0, 'battle', base));
});

for (const to of ['grave', 'hand', 'mana']) test('Justice stays through the opponent turn and can then move to ' + to, () => {
  const s = field();
  const source = play(s, 0, JUSTICE);
  move(s, 0, source, to);
  assert.ok(has(s, 0, 'battle', source));
  end(s);
  move(s, 0, source, to);
  assert.ok(has(s, 0, 'battle', source));
  end(s);
  move(s, 0, source, to);
  assert.ok(has(s, 0, to, source));
});

test('Justice stays under an evolved creature and Shinka blocks only opposing spells up to printed cost 4', () => {
  let s = field();
  const base = play(s, 0, JUSTICE);
  give(s, 0, 'mana', Array(4).fill(LIGHT));
  const top = play(s, 0, KIRA);
  act(s, 'evolve', action => action.baseUid === base.uid);
  drain(s);
  assert.equal(tappedMana(s, 0), 4);
  assert.equal(e.card(COST4).cost, 4);
  assert.equal(e.card(COST5).cost, 5);
  assert.equal(e.canCastSpell(s, 1, e.card(COST4)), false);
  assert.equal(e.canCastSpell(s, 1, e.card(COST5)), true);
  assert.equal(e.canCastSpell(s, 0, e.card(COST4)), true);
  assert.deepEqual(top.under.map(x => x.uid), [base.uid]);
  move(s, 0, top, 'hand');
  assert.ok(has(s, 0, 'battle', top));

  s = restore(s);
  end(s);
  assert.equal(s.active, 1);
  assert.equal(e.canCastSpell(s, 1, e.card(COST4)), false);
  end(s);
  assert.equal(s.active, 0);
  assert.equal(e.canCastSpell(s, 1, e.card(COST4)), true);
  move(s, 0, top, 'hand');
  assert.ok(!has(s, 0, 'battle', top));
});

for (const evolve of [true, false]) test('Justice prices NEO correctly and triggers Shinka only with an evolution base ' + evolve, () => {
  const s = field();
  const base = play(s, 0, JUSTICE);
  give(s, 0, 'mana', Array(evolve ? 1 : 2).fill(LIGHT));
  const top = play(s, 0, NEO);
  act(s, 'evolve', action => action.baseUid === (evolve ? base.uid : undefined));
  drain(s);
  assert.equal(tappedMana(s, 0), evolve ? 1 : 2);
  assert.equal(e.isEvolution(top), evolve);
  assert.equal(e.canCastSpell(s, 1, e.card(COST4)), !evolve);
});

test('Justice Shinka remains in force if the evolved creature leaves', () => {
  const s = field();
  const base = add(s, 0, 'battle', JUSTICE);
  const top = play(s, 0, NEO);
  act(s, 'evolve', action => action.baseUid === base.uid);
  drain(s);
  move(s, 0, top, 'hand');
  assert.ok(has(s, 0, 'hand', top));
  assert.ok(has(s, 0, 'hand', base));
  assert.equal(e.canCastSpell(s, 1, e.card(COST4)), false);
});

test('Justice resolves neither entry protection nor the discount under Genmu', () => {
  const s = field();
  add(s, 1, 'battle', GEN);
  const source = play(s, 0, JUSTICE);
  assert.equal(e.summonCost(s, 0, e.card(KIRA)), e.card(KIRA).cost);
  move(s, 0, source, 'hand');
  assert.ok(has(s, 0, 'hand', source));
});

for (const p of [0, 1]) test('Alnarsi replaces effect destruction with a new face-down shield for player ' + p, () => {
  const s = field(p);
  const source = play(s, p, ALNARSI);
  const before = physical(s);
  const oldShields = s.players[p].shields.map(x => x.uid);
  move(s, p, source);
  drain(s);
  assert.deepEqual(s.players[p].shields.map(x => x.uid), [...oldShields, source.uid]);
  assert.ok(!s.players[p].shields.at(-1).faceUp);
  assert.ok(!has(s, p, 'grave', source));
  assert.deepEqual(physical(s), before);
});

test('Alnarsi also becomes a shield after losing a battle', () => {
  const s = field(1);
  const source = add(s, 0, 'battle', ALNARSI, { tapped: true });
  const attacker = add(s, 1, 'battle', BIG);
  attack(s, attacker.uid, source.uid);
  drain(s);
  assert.ok(has(s, 0, 'shields', source));
  assert.ok(!has(s, 0, 'grave', source));
});

test('Alnarsi follows ordinary moves and goes to grave if the ability is ignored or shields cannot be added', () => {
  for (const [opponent, to] of [[null, 'hand'], [null, 'mana'], [GEN, 'grave'], [FUUJIN, 'grave']]) {
    const s = field();
    if (opponent) add(s, 1, 'battle', opponent);
    const source = play(s, 0, ALNARSI);
    move(s, 0, source, to);
    drain(s);
    assert.ok(has(s, 0, to, source), opponent || to);
    assert.ok(!has(s, 0, 'shields', source));
  }
});

for (const useShield of [true, false]) test('Alnarsi can choose between applicable replacements after JSON resume ' + useShield, () => {
  let s = field(1);
  const source = add(s, 0, 'battle', ALNARSI);
  add(s, 0, 'battle', DOKKOI);
  move(s, 0, source);
  assert.equal(s.decision.type, 'leaveReplace');
  s = restore(s);
  assert.ok(!e.getLegalActions(s).some(action => action.kind === 'allowLeave'));
  if (useShield) act(s, 'replaceShield842');
  else act(s, 'g47Replace', action => action.choice.to === 'hand');
  drain(s);
  assert.ok(has(s, 0, useShield ? 'shields' : 'hand', source));
});
