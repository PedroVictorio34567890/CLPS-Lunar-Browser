import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLanguage, formatCoordinates, locale } from '../src/i18n.ts';
import { sphericalEngine } from '../src/science/sphericalEngine.ts';
import { missionError, DEFAULT_MISSION } from '../src/lib/mission.ts';
import { periodError } from '../src/lib/period.ts';

test('language changes translate existing scientific reports without mutating their data', async () => {
  setLanguage('es');
  const report = await sphericalEngine.compare([{ id: 'test', slot: 0, color: '#fff', latitude: 0, longitude: -20 }], { start: '2026-09-27T00:00', end: '2026-10-27T00:00' });
  const before = JSON.stringify(report);
  const messages = [report.methodology!.ephemeris, report.methodology!.scoreFormula, ...report.methodology!.assumptions, ...report.sites[0].warnings, report.sites[0].recommendation!];
  setLanguage('en');
  for (const message of messages) assert.notEqual(t(message), message, message);
  assert.ok(t(report.sites[0].warnings.find(w => w.startsWith('Reserva energética'))!).startsWith('Energy storage to be sized:'));
  assert.equal(t('Editar lugar {0}', [3]), 'Edit site 3');
  assert.equal(locale(), 'en-US');
  assert.ok(formatCoordinates({latitude:-85,longitude:-20}).endsWith(' W'));
  assert.equal(JSON.stringify(report), before);
  setLanguage('es');
  for (const message of messages) assert.equal(t(message), message);
  assert.ok(formatCoordinates({latitude:-85,longitude:-20}).endsWith(' O'));
});

test('validation messages and dynamic labels switch between both languages', () => {
  const invalidPeriod = periodError({ start:'2026-10-04T00:00',end:'2026-09-27T00:00' })!;
  const invalidMission = missionError({...DEFAULT_MISSION, maxOutageHours:-1})!;
  setLanguage('en');
  assert.equal(t(invalidPeriod), 'The end must be later than the start.');
  assert.equal(t(invalidMission), 'Maximum outage cannot be negative.');
  assert.equal(t('{0} días', [7]), '7 days');
  assert.equal(t('No se pudo leer el resultado del motor.'), 'The engine result could not be read.');
  setLanguage('es');
  assert.equal(t('{0} días', [7]), '7 días');
  assert.equal(t(invalidPeriod), invalidPeriod);
});
