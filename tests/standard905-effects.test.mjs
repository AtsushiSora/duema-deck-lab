import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';
import { publicBoardSnapshot } from '../dist/battle-visuals.js';

const ARISTIE = 'dmrp18-092', PEEP = 'dmrp10-080', RAGNAROK = 'dmrp16-006';
const NATURE = 'dm01-108', WATER = 'dm01-083', DARK = 'dm01-090';
const LIGHT = 'dm01-075', FIRE = 'dm01-097', BLOCKER = 'dm01-076';
const EVOLUTION = 'dm02-s02', STAR = 'dmrp17-s01', GIO = 'dmex17-105';
const NEO = 'dm25rp3-S09', HUSTLE = 'dm26rp1-047', TRIGGER = 'dm01-110';

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

const uids = cards => cards.map(x => x.uid);
const physical = s => uids(e.physicalCards(s)).sort();
const restore = s => JSON.parse(JSON.stringify(s));
const aristieCost = (s, p) => e.summonCost(s, p, e.card(ARISTIE));
const plays = (s, x) => e.getLegalActions(s).find(a => a.kind === 'play' && a.uid === x.uid);
const canBlock = (s, x) => e.getLegalActions(s).some(a => a.kind === 'block' && a.uid === x.uid);

function play(s, id) {
  const x = add(s, s.active, 'hand', id);
  act(s, 'play', a => a.uid === x.uid);
  return x;
}

test('Phase 905 verifies complete official text, art, legal deck, and unique definitions', () => {
  const m = JSON.parse(readFileSync(new URL('../tools/support-phase-905.json', import.meta.url)));
  const catalogue = createCatalogue(snapshot, data.cards, details);
  const refs = JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json', import.meta.url))).prints;
  assert.deepEqual(m.cards.map(c => c.id), [ARISTIE, PEEP, RAGNAROK]);
  assert.deepEqual(m.printAliases, []);
  for (const row of m.cards) {
    const detail = details.cards.find(x => x.id === row.id);
    const [face] = detail.faces;
    const c = e.card(row.id);
    assert.deepEqual(row.faces, detail.faces);
    assert.deepEqual(standardCardSpec(detail, { phase: 905 }), row.spec);
    const changed = structuredClone(detail);
    changed.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(changed, { phase: 905 }));
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
  const cards = [ARISTIE, PEEP, RAGNAROK, NATURE, WATER, DARK, LIGHT, FIRE, BLOCKER, EVOLUTION]
    .map(id => ({ id, count: 4 }));
  const deck = { id: 'phase905', name: 'アリスティーと呪文', cards };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(catalogue.coverage(deck).unsupported, 0);
});

test('Aristie counts its own mana evolution cards, including tapped, Star and twinpact cards', () => {
  const s = field();
  give(s, 0, 'mana', [NATURE, NEO, TRIGGER]);
  add(s, 0, 'mana', EVOLUTION, { faceDown: true });
  add(s, 0, 'grave', EVOLUTION);
  add(s, 1, 'mana', EVOLUTION);
  assert.equal(aristieCost(s, 0), 3);
  add(s, 0, 'mana', EVOLUTION, { tapped: true });
  assert.equal(aristieCost(s, 0), 2);
  add(s, 0, 'mana', STAR);
  assert.equal(aristieCost(s, 0), 1);
  add(s, 0, 'mana', GIO);
  assert.equal(aristieCost(s, 0), 0);
  add(s, 0, 'mana', STAR);
  assert.equal(aristieCost(s, 0), 0);
  add(s, 1, 'battle', 'dmrp22-027');
  assert.equal(aristieCost(s, 0), 3);
  assert.equal(e.card(ARISTIE).cost, 3);
});

for (const p of [0, 1]) test('Aristie at zero still requires one untapped Nature mana ' + p, () => {
  let s = field(p);
  give(s, p, 'mana', [STAR, STAR, EVOLUTION, WATER]);
  const source = add(s, p, 'hand', ARISTIE);
  assert.equal(aristieCost(s, p), 0);
  assert.equal(plays(s, source), undefined);
  const nature = add(s, p, 'mana', NATURE, { tapped: true });
  assert.equal(plays(s, source), undefined);
  nature.tapped = false;
  const before = physical(s);
  const action = plays(s, source);
  assert.ok(action);
  assert.equal(action.cost, 0);
  if (p === 1) {
    e.step(s, action, { manualMana: true });
    assert.equal(s.decision.type, 'manaPayment');
    assert.equal(s.decision.cost, 0);
    s = restore(s);
    assert.ok(!e.getLegalActions(s).some(a => a.kind === 'confirmMana'));
    act(s, 'selectMana', a => a.uid === nature.uid);
    act(s, 'confirmMana');
  } else {
    e.step(s, action);
  }
  assert.deepEqual(uids(s.players[p].mana.filter(x => x.tapped)), [nature.uid]);
  assert.ok(uids(s.players[p].battle).includes(source.uid));
  assert.deepEqual(physical(s), before);
});

for (const p of [0, 1]) test('Peeping forces one blind choice by the caster and only reveals the selected card ' + p, () => {
  let s = field(p);
  const hidden = add(s, 1 - p, 'hand', GIO);
  const shown = add(s, 1 - p, 'hand', RAGNAROK);
  const own = add(s, p, 'hand', DARK);
  const water = add(s, p, 'battle', WATER);
  const blocker = add(s, 1 - p, 'battle', BLOCKER);
  const before = physical(s);
  const source = play(s, PEEP);
  assert.equal(s.decision.player, p);
  assert.deepEqual(s.decision.choices.map(c => c.value), [0, 1]);
  for (const x of [hidden, shown]) {
    assert.ok(!JSON.stringify(s.decision).includes(x.cardId));
    assert.ok(!JSON.stringify(s.log).includes(e.card(x).name));
    assert.ok(!JSON.stringify(publicBoardSnapshot(s)).includes(x.uid));
  }
  s = restore(s);
  act(s, 'extended', a => a.choice === 1);
  assert.equal(s.decision, null);
  assert.deepEqual(uids(s.players[1 - p].hand), [hidden.uid, shown.uid]);
  assert.deepEqual(uids(s.players[p].hand), [own.uid]);
  assert.ok(uids(s.players[p].grave).includes(source.uid));
  assert.match(JSON.stringify(s.log), new RegExp(e.card(shown).name));
  assert.ok(!JSON.stringify(s.log).includes(e.card(hidden).name));
  assert.deepEqual(physical(s).filter(uid => uid !== source.uid), before);
  attack(s, water.uid);
  assert.ok(!canBlock(s, blocker));
});

test('Peeping still works with no opposing hand, and grants only to friendly Water creatures present at resolution', () => {
  const s = field();
  const water = add(s, 0, 'battle', WATER);
  const fire = add(s, 0, 'battle', FIRE);
  const blocker = add(s, 1, 'battle', BLOCKER);
  play(s, PEEP);
  assert.equal(s.decision, null);
  const newcomer = add(s, 0, 'battle', WATER);
  attack(s, fire.uid);
  assert.ok(canBlock(s, blocker));
  act(s, 'noBlock');
  drain(s);
  attack(s, newcomer.uid);
  assert.ok(canBlock(s, blocker));
  act(s, 'noBlock');
  drain(s);
  attack(s, water.uid);
  assert.ok(!canBlock(s, blocker));
  drain(s);
  act(s, 'endTurn');
  drain(s);
  act(s, 'skipCharge');
  act(s, 'toAttack');
  act(s, 'endTurn');
  drain(s);
  attack(s, water.uid);
  assert.ok(canBlock(s, blocker));
});

test('Genmu Emperor prevents both parts of Peeping', () => {
  const s = field();
  const water = add(s, 0, 'battle', WATER);
  add(s, 1, 'hand', LIGHT);
  add(s, 1, 'battle', GEN);
  const blocker = add(s, 1, 'battle', 'dm01-001');
  play(s, PEEP);
  assert.equal(s.decision, null);
  assert.ok(!s.log.some(x => x.kind === 'reveal'));
  attack(s, water.uid);
  assert.ok(canBlock(s, blocker));
});

for (const p of [0, 1]) test('Ragnarok counts cards within grouped shields and face-up G castles ' + p, () => {
  const s = field(p);
  give(s, p, 'shields', [TRIGGER, HUSTLE]);
  const [root, castle] = s.players[p].shields;
  const attached = inst(DARK);
  root.shieldStack = [attached];
  castle.faceUp = true;
  const firstFour = uids(s.players[p].deck.slice(0, 4));
  const enemy = uids(s.players[1 - p].shields);
  const before = physical(s);
  const source = play(s, RAGNAROK);
  assert.equal(s.decision, null);
  assert.deepEqual(uids(s.players[p].grave).sort(), [source.uid, root.uid, attached.uid, castle.uid].sort());
  assert.deepEqual(uids(s.players[p].shields), firstFour);
  assert.ok(s.players[p].shields.every(x => !x.faceUp && !x.shieldStack?.length));
  assert.deepEqual(uids(s.players[1 - p].shields), enemy);
  assert.equal(s.players[p].hand.length, 0);
  assert.equal(s.metrics[p].triggers, 0);
  assert.deepEqual(physical(s).filter(uid => uid !== source.uid), before);
});

test('Ragnarok places one shield with an empty shield zone', () => {
  const s = field();
  give(s, 0, 'shields', []);
  const [top] = s.players[0].deck;
  play(s, RAGNAROK);
  assert.deepEqual(uids(s.players[0].shields), [top.uid]);
  assert.ok(!s.players[0].shields[0].faceUp);
});

test('Ragnarok refills from the number of cards moved, leaving held shield cards in place', () => {
  const s = field();
  give(s, 0, 'shields', [TRIGGER, DARK]);
  const [held, single] = s.players[0].shields;
  const attached = inst(WATER);
  held.g37ShieldHeld = true;
  held.shieldStack = [attached];
  const top = uids(s.players[0].deck.slice(0, 3));
  const source = play(s, RAGNAROK);
  assert.deepEqual(uids(s.players[0].shields), [held.uid, ...top]);
  assert.deepEqual(uids(s.players[0].grave).sort(), [source.uid, attached.uid, single.uid].sort());
  assert.deepEqual(held.shieldStack ?? [], []);
});

test('Ragnarok clears old shields under Fuujin even when the new shields cannot be placed', () => {
  const s = field();
  give(s, 0, 'shields', [TRIGGER, DARK]);
  const old = uids(s.players[0].shields);
  const deck = uids(s.players[0].deck);
  add(s, 1, 'battle', 'dmrp22-037');
  const source = play(s, RAGNAROK);
  assert.deepEqual(uids(s.players[0].grave).sort(), [...old, source.uid].sort());
  assert.deepEqual(s.players[0].shields, []);
  assert.deepEqual(uids(s.players[0].deck), deck);
});

test('Ragnarok respects Kaleiko replacing the placement of each new shield', () => {
  const s = field();
  give(s, 0, 'shields', [TRIGGER]);
  const old = uids(s.players[0].shields);
  const top = uids(s.players[0].deck.slice(0, 2));
  add(s, 1, 'battle', 'dm22ex1-086');
  const source = play(s, RAGNAROK);
  assert.deepEqual(s.players[0].shields, []);
  assert.deepEqual(uids(s.players[0].grave).sort(), [...old, ...top, source.uid].sort());
  assert.equal(s.players[0].deck.length, 22);
});

test('Ragnarok places available cards when the deck runs short and the caster loses', () => {
  const s = field();
  give(s, 0, 'shields', [TRIGGER, WATER]);
  give(s, 0, 'deck', [DARK, LIGHT]);
  const top = uids(s.players[0].deck);
  play(s, RAGNAROK);
  assert.equal(s.winner, 1);
  assert.deepEqual(uids(s.players[0].shields), top);
});
