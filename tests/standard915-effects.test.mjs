import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { e, data, details, snapshot, setup, give, inst, act, attack, drain, GEN } from './target-fixture.mjs';
import { createCatalogue, nameKey } from '../dist/catalogue.js';
import { CARD_IMAGES } from '../dist/card-images.js';
import { standardCardSpec } from '../tools/standard-card-spec.mjs';

const BIND = 'dm10-094', IRON = 'dm13-013', WAVE = 'dm14-003';
const WATER = 'dm01-083', FIRE = 'dm01-097', LIGHT = 'dm01-075', DARK = 'dm01-090', NATURE = 'dm01-108';
const TAP = 'dm06-003', CANNOT_ATTACK = 'dm27-042', UNTARGETABLE = 'dmrp01-041';
const SURFER = 'dm05-024', SAVER = 'dmex14-101', SOLEIL = 'dm33-001';
const EX_LIFE = 'dmrp17-s07', SEED = 'dmsd20-016';

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
const locate = (s, p, zone, x) => s.players[p][zone].find(y => y.uid === x.uid);
const restore = s => JSON.parse(JSON.stringify(s));
const pick = (s, value) => act(s, 'extended', a => (s.decision.choices[a.choice].value?.uid ?? s.decision.choices[a.choice].value) === value);
const choices = s => s.decision.choices.map(c => c.value?.uid ?? c.value);
const canEnd = s => e.getLegalActions(s).some(a => a.kind === 'endTurn');
const physical = s => e.physicalCards(s).map(x => x.uid).sort();
function hit(s, x) {
  attack(s, x.uid);
  if (s.decision?.type === 'block') act(s, 'noBlock');
  if (s.decision?.type === 'breakChoice') act(s, 'breakShields');
}
function startEnd(s) {
  s.phase = 'attack';
  act(s, 'endTurn');
}
function selectMana(s, p, mana) {
  assert.equal(s.decision.player, p);
  assert.equal(s.decision.task.op, 'g34_ManaPick582');
  pick(s, mana.uid);
}

test('Phase 915 matches official complete definitions, art, canonical IDs and legal deck limits', () => {
  const m = JSON.parse(readFileSync(new URL('../tools/support-phase-915.json', import.meta.url)));
  const cat = createCatalogue(snapshot, data.cards, details);
  assert.deepEqual(m.cards.map(x => x.id), [BIND, IRON, WAVE]);
  assert.deepEqual(m.printAliases, []);
  for (const row of m.cards) {
    const d = details.cards.find(x => x.id === row.id), c = e.card(row.id), [f] = row.faces;
    assert.deepEqual(row.faces, d.faces);
    assert.deepEqual(standardCardSpec(d, { phase: 915 }), row.spec);
    assert.throws(() => standardCardSpec(d, { phase: 914 }));
    const changed = structuredClone(d);
    changed.faces[0].abilityText += '\n未知の能力。';
    assert.throws(() => standardCardSpec(changed, { phase: 915 }));
    assert.deepEqual([c.type, c.cost, c.power, c.civilizations, c.race, c.manaValue, c.limit],
      [row.id === BIND ? 'spell' : 'creature', f.cost, Number(f.powerText), f.civilizations, f.race, 1, 4]);
    assert.equal(m.regulationVerification.limits[row.id], 4);
    assert.deepEqual(data.cards.filter(x => nameKey(x.name) === nameKey(row.name)).map(x => x.id), [row.id]);
    assert.equal(CARD_IMAGES[row.id], row.image);
    assert.ok(row.verification.facesMatched);
    for (const [k, v] of Object.entries(row.spec)) assert.deepEqual(c[k], v);
  }
  const deck = { id: 'phase915', name: '攻撃とブレイク',
    cards: [BIND, IRON, WAVE, WATER, FIRE, LIGHT, DARK, NATURE, SURFER, TAP].map(id => ({ id, count: 4 })) };
  assert.deepEqual(e.validateDeck(deck), []);
  assert.equal(cat.coverage(deck).unsupported, 0);
});

test('Soul Bind requires one eligible opposing target and only that creature must attack until the next own turn', () => {
  let s = field();
  const ally = put(s, 0, 'battle', FIRE);
  const bound = put(s, 1, 'battle', TAP), free = put(s, 1, 'battle', FIRE);
  const untargetable = put(s, 1, 'battle', UNTARGETABLE);
  put(s, 1, 'battle', SEED);
  const spell = play(s, BIND);
  assert.deepEqual(choices(s), [bound.uid, free.uid]);
  pick(s, bound.uid);
  assert.ok(locate(s, 0, 'grave', spell));
  assert.equal(s.players[0].mana.filter(x => x.tapped).length, 1);
  assert.ok(!e.effectiveCard(ally, s).mustAttack);
  assert.ok(!e.effectiveCard(untargetable, s).mustAttack);
  startEnd(s);
  drain(s);
  s = restore(s);
  assert.equal(s.active, 1);
  s.phase = 'attack';
  assert.ok(!canEnd(s));
  assert.ok(!e.getLegalActions(s).some(a => a.kind === 'tapAbility' && a.uid === bound.uid));
  hit(s, free);
  assert.ok(!canEnd(s));
  hit(s, bound);
  assert.ok(canEnd(s));
  startEnd(s);
  drain(s);
  assert.equal(s.active, 0);
  assert.ok(!e.effectiveCard(locate(s, 1, 'battle', bound), s).mustAttack);
});

test('Soul Bind has no target if all opponents are protected, and does not override attack prohibitions', () => {
  const s = field();
  put(s, 1, 'battle', UNTARGETABLE);
  play(s, BIND);
  assert.equal(s.decision, null);
  const unable = put(s, 1, 'battle', CANNOT_ATTACK);
  play(s, BIND);
  pick(s, unable.uid);
  startEnd(s);
  drain(s);
  s.phase = 'attack';
  assert.ok(e.effectiveCard(unable, s).mustAttack);
  assert.ok(canEnd(s));
  assert.ok(!e.getLegalActions(s).some(a => a.kind === 'attack' && a.uid === unable.uid));
});

test('Soul Bind can force an immediate follow-up attack from a shield and is suspended by spell or ability suppression', () => {
  const s = field(1), a = put(s, 1, 'battle', FIRE), b = put(s, 1, 'battle', FIRE);
  give(s, 0, 'shields', [BIND, NATURE]);
  hit(s, a);
  act(s, 'useTrigger', x => x.cardId === BIND);
  assert.equal(s.decision.player, 0);
  pick(s, b.uid);
  assert.equal(s.players[0].mana.filter(x => x.tapped).length, 0);
  assert.ok(!canEnd(s));
  b.g35Ignored = s.turn;
  assert.ok(canEnd(s));
  delete b.g35Ignored;
  const genmu = put(s, 0, 'battle', GEN);
  assert.ok(canEnd(s));
  s.players[0].battle = s.players[0].battle.filter(x => x !== genmu);
  s.players[0].grave.push(genmu);
  hit(s, b);
  assert.ok(canEnd(s));
});

test('Metza’s Iron destroys itself at the end step and both players choose mana before either moves', () => {
  let s = field();
  const iron = play(s, IRON);
  iron.entered = 0;
  const [ours] = s.players[0].mana, [theirs] = s.players[1].mana;
  const before = physical(s);
  hit(s, iron);
  assert.ok(locate(s, 0, 'battle', iron));
  assert.equal(s.players[1].shields.length, 4);
  s = restore(s);
  startEnd(s);
  assert.ok(locate(s, 0, 'grave', iron));
  selectMana(s, 0, ours);
  assert.ok(locate(s, 0, 'mana', ours));
  s = restore(s);
  selectMana(s, 1, theirs);
  assert.ok(locate(s, 0, 'grave', ours));
  assert.ok(locate(s, 1, 'grave', theirs));
  assert.equal(s.active, 1);
  assert.deepEqual(physical(s), before);
});

test('Metza’s Iron keeps its scheduled mana effect if the shield trigger returns it to hand', () => {
  const s = field(), iron = put(s, 0, 'battle', IRON);
  const [ours] = s.players[0].mana, [theirs] = s.players[1].mana;
  give(s, 1, 'shields', [SURFER, NATURE]);
  hit(s, iron);
  act(s, 'useTrigger', a => a.cardId === SURFER);
  act(s, 'effect', a => a.targets.some(t => t.uid === iron.uid));
  assert.ok(locate(s, 0, 'hand', iron));
  startEnd(s);
  selectMana(s, 0, ours);
  selectMana(s, 1, theirs);
  assert.ok(locate(s, 0, 'hand', iron));
  assert.ok(locate(s, 0, 'grave', ours));
  assert.ok(locate(s, 1, 'grave', theirs));
});

test('Metza’s Iron still removes mana if destruction is prevented and can skip an empty mana zone', () => {
  const s = field(), iron = put(s, 0, 'battle', IRON);
  const [ours] = give(s, 0, 'mana', [WATER]);
  give(s, 1, 'mana', []);
  const shield = s.players[0].shields[0];
  const turn = s.turn;
  // An existing destruction replacement can be attached to an otherwise ordinary creature.
  iron.g34Grants = [{ turn, escape: true }];
  hit(s, iron);
  startEnd(s);
  assert.equal(s.decision.type, 'leaveReplace');
  act(s, 'replaceEscape', a => a.shield === shield.uid);
  assert.ok(locate(s, 0, 'battle', iron));
  selectMana(s, 0, ours);
  assert.ok(locate(s, 0, 'grave', ours));
  assert.equal(s.active, 1);
});

test('Metza’s Iron triggers once for a simultaneous two-shield break', () => {
  const s = field(), iron = put(s, 0, 'battle', IRON);
  const [ours] = s.players[0].mana, [theirs] = s.players[1].mana;
  iron.g34Grants = [{ turn: s.turn, g313Breaker: 2 }];
  give(s, 1, 'shields', [NATURE, FIRE]);
  hit(s, iron);
  assert.equal(s.players[1].shields.length, 0);
  startEnd(s);
  selectMana(s, 0, ours);
  selectMana(s, 1, theirs);
  assert.deepEqual(s.players.map(p => p.mana.length), [49, 49]);
  assert.equal(s.active, 1);
});

test('Separate breaks by two copies of Metza’s Iron produce two independent end-step abilities', () => {
  const s = field();
  const first = put(s, 0, 'battle', IRON), second = put(s, 0, 'battle', IRON);
  const mana = s.players.map(p => p.mana.slice(0, 2));
  hit(s, first);
  hit(s, second);
  startEnd(s);
  act(s, 'orderEffect', a => a.uid === second.uid);
  assert.ok(locate(s, 0, 'battle', first));
  assert.ok(locate(s, 0, 'grave', second));
  for (let i = 0; i < 2; i++) {
    selectMana(s, 0, mana[0][i]);
    selectMana(s, 1, mana[1][i]);
  }
  assert.ok(locate(s, 0, 'grave', first));
  assert.deepEqual(s.players.map(p => p.mana.length), [48, 48]);
  assert.equal(s.active, 1);
});

test('Metza’s Iron does not schedule anything when the shield break is replaced', () => {
  const s = field(), iron = put(s, 0, 'battle', IRON), saver = put(s, 1, 'battle', SAVER);
  hit(s, iron);
  act(s, 'saveShield', a => a.uid === saver.uid);
  if (s.decision?.type === 'shieldGuard') act(s, 'finishShieldGuards');
  startEnd(s);
  drain(s);
  assert.equal(s.players[1].shields.length, 5);
  assert.ok(locate(s, 0, 'battle', iron));
  assert.deepEqual(s.players.map(p => p.mana.length), [50, 50]);
});

test('Metza’s Iron can break by a creature ability during the opponent’s turn', () => {
  const s = field(1);
  put(s, 0, 'battle', SOLEIL);
  const iron = put(s, 0, 'battle', IRON);
  iron.g34Grants = [{ turn: s.turn, blocker: true }];
  const [ours] = s.players[0].mana, [theirs] = s.players[1].mana;
  attack(s, put(s, 1, 'battle', IRON).uid);
  act(s, 'block', a => a.uid === iron.uid);
  assert.equal(s.decision.task.op, 'g34_Break497');
  pick(s, s.players[1].shields[0].uid);
  assert.equal(s.players[1].shields.length, 4);
  startEnd(s);
  selectMana(s, 1, theirs);
  selectMana(s, 0, ours);
  assert.deepEqual(s.players.map(p => p.mana.length), [49, 49]);
});

test('Wave Crawler lets the opponent choose their own creature, even one protected from the caster', () => {
  let s = field();
  const own = put(s, 0, 'battle', FIRE);
  const plain = put(s, 1, 'battle', FIRE), protectedTarget = put(s, 1, 'battle', UNTARGETABLE);
  put(s, 1, 'battle', SEED);
  const sealed = put(s, 1, 'battle', WATER, { sealed: true });
  put(s, 1, 'seals', NATURE, { faceDown: true, sealOf: sealed.uid });
  const wave = play(s, WAVE), before = physical(s);
  assert.equal(s.decision.player, 1);
  assert.deepEqual(choices(s), [plain.uid, protectedTarget.uid, null]);
  s = restore(s);
  pick(s, protectedTarget.uid);
  assert.ok(locate(s, 0, 'hand', wave));
  assert.ok(locate(s, 1, 'hand', protectedTarget));
  assert.ok(locate(s, 0, 'battle', own));
  assert.ok(locate(s, 1, 'battle', plain));
  assert.deepEqual(physical(s), before);
});

test('Wave Crawler stays when the opponent declines, and keeps its W-Breaker', () => {
  const s = field();
  const other = put(s, 1, 'battle', FIRE);
  const wave = play(s, WAVE);
  pick(s, null);
  assert.ok(locate(s, 0, 'battle', wave));
  assert.ok(locate(s, 1, 'battle', other));
  assert.equal(e.effectiveCard(wave, s).breaker, 2);
  wave.entered = 0;
  hit(s, wave);
  assert.equal(s.players[1].shields.length, 3);
});

test('Wave Crawler stays without a target, and its entry ability is suppressed by Genmu Emperor', () => {
  for (const id of [null, GEN]) {
    const s = field();
    if (id) put(s, 1, 'battle', id);
    const wave = play(s, WAVE);
    assert.equal(s.decision, null);
    assert.ok(locate(s, 0, 'battle', wave));
  }
});

test('Wave Crawler still returns itself when the opponent’s selected return is replaced by EX Life', () => {
  const s = field(), shield = s.players[1].shields[0];
  const ex = put(s, 1, 'battle', EX_LIFE, { exLifeShieldUid: shield.uid });
  const wave = play(s, WAVE);
  pick(s, ex.uid);
  drain(s);
  assert.ok(locate(s, 1, 'grave', shield));
  assert.ok(locate(s, 1, 'battle', ex));
  assert.ok(locate(s, 0, 'hand', wave));
});
