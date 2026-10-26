import { MATERIAL_COLORS, type MaterialGroup } from '@/constants/map';

/**
 * Normalise a Debris Tracker `material` string onto the eight palette buckets.
 *
 * The source taxonomy is inconsistent (upper case, title case and plural variants all appear),
 * so matching is case-insensitive and keyword-based. A value that matches nothing falls into
 * `other` rather than losing its pin.
 */
export function materialGroup(material: string | null | undefined): MaterialGroup {
  const value = material?.trim().toUpperCase() ?? '';
  if (!value) return 'other';

  if (value.includes('FISHING')) return 'fishing';
  if (value.includes('PLASTIC') || value.includes('FOAM')) return 'plastic';
  if (
    value.includes('PAPER') ||
    value.includes('LUMBER') ||
    value.includes('WOOD') ||
    value.includes('FIBER')
  ) {
    return 'paper';
  }
  if (value.includes('METAL') || value.includes('TIN')) return 'metal';
  if (value.includes('GLASS')) return 'glass';
  if (value.includes('CLOTH') || value.includes('TEXTILE')) return 'cloth';
  if (value.includes('RUBBER') || value.includes('LATEX')) return 'rubber';

  return 'other';
}

/** The pin colour for a raw `material` value. */
export function pinColor(material: string | null | undefined): string {
  return MATERIAL_COLORS[materialGroup(material)];
}
