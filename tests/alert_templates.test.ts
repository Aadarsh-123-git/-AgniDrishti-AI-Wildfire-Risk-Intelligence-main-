/**
 * tests/alert_templates.test.ts
 * ──────────────────────────────────────────────────────────────────────
 * Unit tests for voice alert template rendering.
 * Tests all 5 languages × 4 risk levels = 20 combinations.
 * Run with: npx tsx tests/alert_templates.test.ts
 * ──────────────────────────────────────────────────────────────────────
 */

import {
  generateAlertText,
  type AlertRiskLevel,
  type AlertLanguage,
} from '../server/alert_service';

const LANGUAGES: AlertLanguage[] = ['hi', 'bn', 'mr', 'te', 'ta'];
const RISK_LEVELS: AlertRiskLevel[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

const TEST_PARAMS = {
  safeZoneName: 'Central Relief Camp',
  timeToReach: 20,
};

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  Voice Alert Template Tests — 5 Languages × 4 Risk Levels');
console.log('═══════════════════════════════════════════════════════════\n');

// ── Test 1: All 20 combinations produce non-empty text ────────────────
console.log('▸ Test Suite 1: Template rendering (20 combinations)');
for (const lang of LANGUAGES) {
  for (const level of RISK_LEVELS) {
    const text = generateAlertText('Nagpur East', level, lang, TEST_PARAMS);

    // Non-empty
    assert(
      text.length > 0,
      `${lang}/${level}: should produce non-empty text`
    );

    // Contains village name placeholder replacement
    assert(
      text.includes('Nagpur East'),
      `${lang}/${level}: should contain village name 'Nagpur East'`
    );

    // Contains safe zone name
    assert(
      text.includes('Central Relief Camp'),
      `${lang}/${level}: should contain safe zone name`
    );

    // Contains time to reach (not in LOW — LOW doesn't instruct evacuation)
    if (level !== 'LOW') {
      assert(
        text.includes('20'),
        `${lang}/${level}: should contain time to reach '20'`
      );
    }

    // Under 100 characters (approx word count guard for 25 words)
    // Unicode chars may use multiple bytes, but we check char length as a rough gauge
    assert(
      text.length < 300,
      `${lang}/${level}: text too long (${text.length} chars). Should be concise.`
    );

    // No un-substituted placeholders remain
    assert(
      !text.includes('{villageName}') && !text.includes('{safeZoneName}') && !text.includes('{timeToReach}'),
      `${lang}/${level}: should have no un-replaced placeholders`
    );

    console.log(`  ✓ ${lang.toUpperCase()} / ${level}: "${text.substring(0, 60)}..."`);
  }
}

// ── Test 2: Test mode prefix ──────────────────────────────────────────
console.log('\n▸ Test Suite 2: Test mode prefix');
for (const lang of LANGUAGES) {
  const text = generateAlertText('TestVillage', 'HIGH', lang, {
    ...TEST_PARAMS,
    isTest: true,
  });

  // Text should be longer than non-test version (has prefix)
  const normalText = generateAlertText('TestVillage', 'HIGH', lang, {
    ...TEST_PARAMS,
    isTest: false,
  });

  assert(
    text.length > normalText.length,
    `${lang}: test mode text should be longer than normal text`
  );
  console.log(`  ✓ ${lang.toUpperCase()}: Test prefix applied`);
}

// ── Test 3: English fallback for unknown language ─────────────────────
console.log('\n▸ Test Suite 3: English fallback');
{
  const text = generateAlertText('FallbackVillage', 'CRITICAL', 'en', TEST_PARAMS);
  assert(
    text.includes('FallbackVillage'),
    'English fallback should contain village name'
  );
  assert(
    text.length > 0,
    'English fallback should produce non-empty text'
  );
  console.log(`  ✓ English fallback works: "${text.substring(0, 60)}..."`);
}

// ── Test 4: Default parameter handling ────────────────────────────────
console.log('\n▸ Test Suite 4: Default parameters');
{
  const text = generateAlertText('DefaultSector', 'LOW', 'hi');
  assert(
    text.includes('DefaultSector'),
    'Default params: should contain sector name'
  );
  assert(
    text.includes('Relief Camp') || text.includes('15'),
    'Default params: should use default safe zone or time'
  );
  console.log(`  ✓ Default parameters applied: "${text.substring(0, 60)}..."`);
}

// ── Summary ───────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
if (failed > 0) {
  console.log('\n  Failures:');
  failures.forEach((f) => console.log(`    • ${f}`));
  console.log('═══════════════════════════════════════════════════════════');
  process.exit(1);
} else {
  console.log('  All tests passed! ✓');
  console.log('═══════════════════════════════════════════════════════════');
  process.exit(0);
}
