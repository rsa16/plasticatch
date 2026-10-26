import { MATERIAL_COLORS } from '@/constants/map';

import { materialGroup, pinColor } from '../material';

describe('materialGroup', () => {
  it('maps the Debris Tracker taxonomy onto the eight palette buckets', () => {
    expect(materialGroup('PLASTIC')).toBe('plastic');
    expect(materialGroup('Plastic Bags')).toBe('plastic');
    expect(materialGroup('FOAM ITEMS')).toBe('plastic');
    expect(materialGroup('PAPER & LUMBER')).toBe('paper');
    expect(materialGroup('Food-related paper or wood')).toBe('paper');
    expect(materialGroup('METAL ITEMS')).toBe('metal');
    expect(materialGroup('Glass Pieces')).toBe('glass');
    expect(materialGroup('Textiles')).toBe('cloth');
    expect(materialGroup('RUBBER+ LATEX')).toBe('rubber');
    expect(materialGroup('FISHING GEAR')).toBe('fishing');
  });

  it('falls back to other for unknown, empty or missing material', () => {
    expect(materialGroup('COMMON + PRIORITY ITEMS')).toBe('other');
    expect(materialGroup('Organic waste')).toBe('other');
    expect(materialGroup('')).toBe('other');
    expect(materialGroup(null)).toBe('other');
    expect(materialGroup(undefined)).toBe('other');
  });

  it('keys each group to its palette colour', () => {
    expect(pinColor('plastic')).toBe(MATERIAL_COLORS.plastic);
    expect(pinColor('Glass Pieces')).toBe(MATERIAL_COLORS.glass);
    expect(pinColor(null)).toBe(MATERIAL_COLORS.other);
  });
});
