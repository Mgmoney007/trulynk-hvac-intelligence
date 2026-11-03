import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, compareTelLink, classifyPhones, telHrefDigits, telHrefProblem } from '../scripts/lib/phone.mjs';

test('normalizePhone handles common formats', () => {
  for (const s of ['(201) 555-0123'.replace('555-0123', '285-4793'), '201.285.4793', '+1 201 285 4793', 'tel:+12012854793', 'tel:(201)%20285-4793', '1-201-285-4793']) {
    assert.equal(normalizePhone(s)?.e164, '+12012854793', s);
  }
});

test('normalizePhone rejects invalid numbers', () => {
  for (const s of [null, '', '12345', 'tel:', '(011) 285-4793', '201-085-4793', '201285479', '22012854793']) {
    assert.equal(normalizePhone(s), null, String(s));
  }
});

test('normalizePhone strips extensions', () => {
  assert.equal(normalizePhone('201-285-4793 ext 12')?.e164, '+12012854793');
  assert.equal(normalizePhone('tel:2012854793,12')?.e164, '+12012854793');
});

test('compareTelLink', () => {
  assert.equal(compareTelLink('tel:2012854793', '(201) 285-4793'), 'match');
  assert.equal(compareTelLink('tel:2012854794', '(201) 285-4793'), 'mismatch');
  assert.equal(compareTelLink('tel:201285479', '(201) 285-4793'), 'href_invalid');
  assert.equal(compareTelLink('tel:2012854793', 'Call Now'), 'text_not_phone');
  assert.equal(compareTelLink('tel:', ''), 'href_invalid');
});

test('telHrefDigits', () => {
  assert.equal(telHrefDigits('tel:(201)%20285-4793'), '2012854793');
});

test('classifyPhones: anchors, session variants, tracking vendors, dedupe', () => {
  const r = classifyPhones([
    { raw: '201-285-4793', source: 'gbp' },
    { raw: 'tel:2012854793', source: 'tel_desktop' },
    { raw: 'tel:2012854793', source: 'tel_mobile' },
    { raw: 'tel:2015550199'.replace('5550199', '3334444'), source: 'tel_desktop' },
    { raw: 'garbage', source: 'text' },
  ], []);
  const by = Object.fromEntries(r.map(x => [x.e164, x]));
  assert.equal(r.length, 2);
  assert.equal(by['+12012854793'].classification, 'published_primary');
  assert.deepEqual(by['+12012854793'].sources, ['gbp', 'tel_desktop', 'tel_mobile']);
  assert.equal(by['+12013334444'].classification, 'likely_call_tracking');
});

test('classifyPhones: vendor without session variance -> possible tracking', () => {
  const r = classifyPhones([{ raw: '2013334444', source: 'text' }], ['CallRail']);
  assert.equal(r[0].classification, 'possible_call_tracking');
});

test('classifyPhones: no anchors, no vendors -> secondary', () => {
  const r = classifyPhones([{ raw: '2013334444', source: 'tel_desktop' }, { raw: '2013334444', source: 'tel_mobile' }], []);
  assert.equal(r[0].classification, 'published_secondary');
});

test('telHrefProblem flags malformed hrefs only', () => {
  assert.equal(telHrefProblem('tel:+19739255556'), null);
  assert.equal(telHrefProblem('tel:(973)%20925-5556'), null);
  assert.equal(telHrefProblem('tel:9739255556,12'), null);
  assert.equal(telHrefProblem('tel:tel:+19739255556'), 'duplicated_scheme');
  assert.equal(telHrefProblem('tel:'), 'empty');
  assert.equal(telHrefProblem('tel:973-925-555'), 'wrong_digit_count');
  assert.equal(telHrefProblem('tel:CALL-NOW'), 'contains_letters');
  assert.equal(telHrefProblem('https://x.com'), 'not_tel_scheme');
});
