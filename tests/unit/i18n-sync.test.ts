import { describe, it, expect } from 'vitest';
import { getDefaults } from '../../src/i18n';

/**
 * This test enforces that the authoring tool's I18N_DEFAULTS list
 * stays in sync with the player's DEFAULTS in src/i18n.ts.
 *
 * If you add or remove a key from DEFAULTS, you must also update
 * I18N_DEFAULTS in authoring/src/ui/editor.ts.
 */

// Extract keys from the authoring tool's I18N_DEFAULTS by reading the file
// (we can't import it directly since it's not exported as a module constant)
import { readFileSync } from 'fs';
import { resolve } from 'path';

function getAuthoringI18nKeys(): string[] {
  const editorPath = resolve(__dirname, '../../authoring/src/ui/editor.ts');
  const content = readFileSync(editorPath, 'utf-8');

  // Extract the I18N_DEFAULTS block
  const match = content.match(/const I18N_DEFAULTS:.*?\{([\s\S]*?)\n\};/);
  if (!match) throw new Error('Could not find I18N_DEFAULTS in editor.ts');

  // Extract keys (lines like "  key_name: {")
  const keys: string[] = [];
  for (const line of match[1].split('\n')) {
    const keyMatch = line.match(/^\s+(\w+):\s*\{/);
    if (keyMatch) keys.push(keyMatch[1]);
  }
  return keys;
}

describe('i18n sync', () => {
  it('player DEFAULTS and authoring I18N_DEFAULTS have the same keys', () => {
    const playerKeys = Object.keys(getDefaults()).sort();
    const authoringKeys = getAuthoringI18nKeys().sort();

    const missingInAuthoring = playerKeys.filter(k => !authoringKeys.includes(k));
    const extraInAuthoring = authoringKeys.filter(k => !playerKeys.includes(k));

    if (missingInAuthoring.length > 0) {
      throw new Error(
        `Keys in player DEFAULTS but missing from authoring I18N_DEFAULTS:\n  ${missingInAuthoring.join(', ')}\n\nAdd them to I18N_DEFAULTS in authoring/src/ui/editor.ts`
      );
    }
    if (extraInAuthoring.length > 0) {
      throw new Error(
        `Keys in authoring I18N_DEFAULTS but missing from player DEFAULTS:\n  ${extraInAuthoring.join(', ')}\n\nRemove them from I18N_DEFAULTS in authoring/src/ui/editor.ts`
      );
    }
  });

  it('player DEFAULTS keys are sorted alphabetically', () => {
    const keys = Object.keys(getDefaults());
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });

  it('authoring I18N_DEFAULTS keys are sorted alphabetically', () => {
    const keys = getAuthoringI18nKeys();
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });
});
