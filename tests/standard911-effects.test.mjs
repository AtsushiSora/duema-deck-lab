import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';

const PRISM = 'dm25-024', EEL = 'dm05-040', CACH = 'dmr13-042';
const FIRE = 'dm01-097', NATURE = 'dm01-108', WATER = 'dm01-083', LIGHT = 'dm01-075';
const MULTI = 'dmr03-051', TWIN = 'dmex12-074', BABYLONIA = 'dm32-021', BIG_BANG = 'dmrp20-s10';
const SEED = 'dm22ex1-086', BLOCKER = 'dm01-004', CONDITIONAL = 'dm03-022';

function field(p = 0) {
  const s = setup();
  s.active = p;
  for (const who of [0, 1]) give(s, who, 'deck', Array(12).fill(NATURE));
  return s;
}

function add(s, p, zone, id, props) {
  const x = Object.assign(inst(id), props);
  s.players[p][zone].push(x);
  return x;
}

function play(s, id) {
  const x = add(s, s.active, 'hand', id);
  act(s, 'play', a => a.uid === x.uid);
  return x;
}

const restore = s => JSON.parse(JSON.stringify(s));
const ids = rows => rows.map(x => x.cardId);
const physical = s => e.physicalCards(s).map(x => x.uid).sort();
const revealed = s => ids(s.log.filter(x => x.type === 'reveal' && x.source === PRISM));
const canBlock = (s, x) => e.getLegalActions(s).some(a => a.kind === 'block' && a.uid === x.uid);
const targets = (s, x) => new Set(e.getLegalActions(s).filter(a => a.kind === 'attack' && a.uid === x.uid).map(a => a.target));

test('Phase 911 uses the three complete official definitions and original catalogue IDs', () => {
  const manifest = JSON.parse(readFileSync(new URL('../tools/support-phase-911.json', import.meta.url)));
  const refs = JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json', import.meta.url))).prints;
  const cat = createCatalogue(snapshot, data.cards, details);
  assert.deepEqual(manifest.cards.map(x => x.id), [PRISM, EEL, CACH]);
  assert.deepEqual(manifest.printAliases, []);
  for (const row of manifest.cards) {
    const d = details.cards.find(x => x.id === row.id);
    const c = e.card(row.id);
    const [f] = row.faces;
    assert.deepEqual(row.faces, d.faces);
    assert.deepEqual(standardCardSpec(d, { phase: 911 }), row.spec);
    assert.throws(() => standardCardSpec(d, { phase: 910 }));
    const incomplete = structuredClone(d);
    incomplete.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(incomplete, { phase: 911 }));
    for (const [key, value] of Object.entries(row.spec)) assert.deepEqual(c[key], value);
    assert.deepEqual([c.type, c.cost, c.power, c.civilizations, c.race, c.manaValue, c.limit],
      [row.id === PRISM ? 'spell' : 'creature', f.cost, Number(f.powerText), f.civilizations, f.race, 1, 4]);
    assert.deepEqual(data.cards.filter(x => nameKey(x.name) === nameKey(row.name)).map(x => x.id), [row.id]);
    assert.equal(manifest.regulationVerification.limits[row.id], 4);
    assert.ok(row.verification.facesMatched);
    assert.equal(CARD_IMAGES[row.id], row.image);
    assert.equal(refs.find(x => x.id === row.id).image, row.image);
  }
  const deck = { id: 'phase911', name: 'ドローとブロッカー',
    cards: [PRISM, EEL, CACH, FIRE, NATURE, WATER, LIGHT, MULTI, TWIN, BLOCKER].map(id => ({ id, count: 4 })) };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(cat.coverage(deck).unsupported, 0);
});

for (const [top, extra] of [[[FIRE, WATER], 0], [[WATER, MULTI], 1], [[MULTI, GEN], 1], [[TWIN, WATER], 1]]) {
  test('Prism reveals exactly the first two actual draws ' + top.join(' '), () => {
    const s = field(1);
    give(s, 1, 'deck', [...top, LIGHT, FIRE, NATURE]);
    const old = add(s, 1, 'hand', MULTI);
    const spell = add(s, 1, 'hand', PRISM);
    const before = physical(s);
    act(s, 'play', a => a.uid === spell.uid);
    assert.deepEqual(revealed(s), top);
    assert.deepEqual(ids(s.players[1].hand), [old.cardId, ...top, ...Array(extra).fill(LIGHT)]);
    assert.equal(s.players[1].drawsThisTurn, 2 + extra);
    assert.equal(s.players[1].grave[0].uid, spell.uid);
    assert.deepEqual(physical(s), before);
  });
}

for (const directMulti of [false, true]) {
  test('Prism distinguishes the original draw from Babylonia and resumes its choices ' + directMulti, () => {
    let s = field();
    add(s, 0, 'battle', BABYLONIA);
    const direct = directMulti ? TWIN : WATER;
    give(s, 0, 'deck', [MULTI, FIRE, direct, LIGHT, NATURE]);
    play(s, PRISM);
    assert.equal(s.decision?.type, 'drawReplacement');
    act(s, 'replaceDraw', a => a.replace);
    s = restore(s);
    act(s, 'discardDraw', a => a.cardId === FIRE);
    act(s, 'replaceDraw', a => !a.replace);
    if (directMulti) act(s, 'replaceDraw', a => !a.replace);
    assert.deepEqual(revealed(s), [direct]);
    assert.deepEqual(ids(s.players[0].hand), directMulti ? [MULTI, direct, LIGHT] : [MULTI, direct]);
    assert.equal(s.players[0].drawsThisTurn, directMulti ? 4 : 3);
  });
}

test('Prism cannot reveal an original draw discarded during the second draw replacement', () => {
  const s = field();
  add(s, 0, 'battle', BABYLONIA);
  give(s, 0, 'deck', [MULTI, FIRE, WATER, LIGHT, NATURE]);
  play(s, PRISM);
  act(s, 'replaceDraw', a => !a.replace);
  act(s, 'replaceDraw', a => a.replace);
  act(s, 'discardDraw', a => a.cardId === MULTI);
  assert.deepEqual(revealed(s), []);
  assert.deepEqual(ids(s.players[0].hand), [FIRE, WATER]);
  assert.equal(s.players[0].deck[0].cardId, LIGHT);
});

test('Prism waits for Big Bang to replace the draw from an empty deck', () => {
  const s = field();
  add(s, 0, 'battle', BIG_BANG);
  give(s, 0, 'deck', [WATER]);
  const revived = add(s, 0, 'grave', FIRE);
  play(s, PRISM);
  assert.equal(s.decision?.task?.op, 'g10_Draws');
  assert.deepEqual(revealed(s), []);
  act(s, 'extended', a => s.decision.choices[a.choice].value === revived.uid);
  drain(s);
  assert.deepEqual(revealed(s), [WATER]);
  assert.equal(s.players[0].battle.at(-1).uid, revived.uid);
  assert.equal(s.winner, null);
});

test('Prism observes Genmu and the last-card loss boundary', () => {
  const muted = field();
  add(muted, 1, 'battle', GEN);
  play(muted, PRISM);
  assert.deepEqual(revealed(muted), []);
  assert.equal(muted.players[0].hand.length, 0);
  const s = field();
  give(s, 0, 'deck', [MULTI, WATER]);
  play(s, PRISM);
  assert.equal(s.winner, 1);
  assert.deepEqual(revealed(s), []);
  assert.deepEqual(ids(s.players[0].hand), [MULTI, WATER]);
});

for (const id of [FIRE, NATURE, MULTI, WATER]) {
  test('Eel blocks only attackers with fire or nature civilization ' + id, () => {
    const s = field();
    const eel = add(s, 1, 'battle', EEL);
    const attacker = add(s, 0, 'battle', id);
    assert.equal(e.effectiveCard(eel, s).blocker, true);
    attack(s, attacker.uid);
    assert.equal(canBlock(s, eel), id !== WATER);
    if (id === WATER) return;
    act(s, 'block', a => a.uid === eel.uid);
    drain(s);
    assert.equal(eel.tapped, true);
    assert.ok(s.players[0].grave.some(x => x.uid === attacker.uid));
    assert.equal(s.players[1].shields.length, 5);
  });
}

test('Eel can attack and can gain ordinary Blocker independently', () => {
  const s = field();
  const attacker = add(s, 0, 'battle', WATER);
  const eel = add(s, 1, 'battle', EEL, { g19Blocker: s.turn });
  attack(s, attacker.uid);
  assert.equal(canBlock(s, eel), true);
  const own = field();
  const played = play(own, EEL);
  played.entered = 0;
  act(own, 'toAttack');
  assert.ok(targets(own, played).has('player'));
});

test('Cachaludi can attack creatures and block without another allied Blocker', () => {
  const s = field();
  const cach = play(s, CACH);
  cach.entered = 0;
  const enemy = add(s, 1, 'battle', WATER, { tapped: true });
  add(s, 1, 'battle', BLOCKER);
  add(s, 0, 'battle', SEED);
  act(s, 'toAttack');
  assert.deepEqual(targets(s, cach), new Set([enemy.uid]));
  const defense = field(1);
  const attacker = add(defense, 1, 'battle', WATER);
  const defender = add(defense, 0, 'battle', CACH);
  attack(defense, attacker.uid);
  assert.equal(canBlock(defense, defender), true);
});

test('Cachaludi counts the current allied Blocker even while it is tapped', () => {
  let s = field();
  const cach = add(s, 0, 'battle', CACH);
  const ally = add(s, 0, 'battle', CONDITIONAL, { tapped: true });
  s.phase = 'attack';
  assert.ok(!targets(s, cach).has('player'));
  give(s, 0, 'mana', [LIGHT]);
  assert.ok(targets(s, cach).has('player'));
  ally.sealed = true;
  assert.ok(!targets(s, cach).has('player'));
  delete ally.sealed;
  s = restore(s);
  attack(s, cach.uid);
  act(s, 'noBlock');
  drain(s);
  assert.equal(s.players[1].shields.length, 3);
});

test('Cachaludi counts Eel and ignores its own attack restriction under Genmu', () => {
  const s = field();
  const cach = add(s, 0, 'battle', CACH);
  const eel = add(s, 0, 'battle', EEL);
  s.phase = 'attack';
  assert.ok(targets(s, cach).has('player'));
  s.players[0].battle = [cach];
  give(s, 1, 'shields', []);
  assert.ok(!targets(s, cach).has('player'));
  add(s, 1, 'battle', GEN);
  assert.ok(targets(s, cach).has('player'));
  assert.equal(e.effectiveCard(cach, s).blocker, undefined);
  assert.equal(e.effectiveCard(eel, s).blocker, true);
});
