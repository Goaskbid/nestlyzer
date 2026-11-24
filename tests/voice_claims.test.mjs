// r18: a place story may only state what its figures support. Population alone never yields services, prices, walking,
// hospitals, stations, swimming access or commuting; straight-line distances are never turned into travel claims.
import test from 'node:test'; import assert from 'node:assert';
import { placeStory } from '../build/voice.mjs';
const UNSUPPORTED = /short walk|walk away|hospital|station|bus stop|high street|bakery|shops? (are|is) close|big-city prices|cheaper|swim|commut|close enough to work|short drive|minutes|barbecue|notice board/i;
test('population-only stories make no service, price or access claims', () => {
  for (let i = 0; i < 400; i++) for (const pop of [300, 900, 4000, 9000, 25000, 50000, 90000, 400000, 2500000]) {
    const out = placeStory({ id: 'TEST:' + i, name: 'Test place', pop, cname: 'Test country' });
    assert.ok(!UNSUPPORTED.test(out), out.match(UNSUPPORTED) + ' in: ' + out);
  }
});
test('lake, sea and metro distances stay distances', () => {
  for (let i = 0; i < 300; i++) {
    const out = placeStory({ id: 'T:' + i, name: 'Test place', pop: 12000, cname: 'Test country', lake: 'Lake Test', lakeKm: i % 9, seaKm: i % 14, sea: 'North Sea', metro: 'Testcity', metroKm: 5 + (i % 40) });
    assert.ok(!UNSUPPORTED.test(out), out.match(UNSUPPORTED) + ' in: ' + out);
  }
});
