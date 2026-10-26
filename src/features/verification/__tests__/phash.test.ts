import { hexToBitString, phashFromRgba } from '@/features/verification/phash';

function gradient(size = 64): { width: number; height: number; data: Uint8Array } {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      data[i] = (x * 255) / (size - 1);
      data[i + 1] = (y * 255) / (size - 1);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  return { width: size, height: size, data };
}

describe('perceptual hash', () => {
  it('produces the 16 hex characters the server contract expects', () => {
    const hash = phashFromRgba(gradient());
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is stable for the same pixels', () => {
    expect(phashFromRgba(gradient())).toBe(phashFromRgba(gradient()));
  });

  it('differs when the image changes', () => {
    const image = gradient();
    const changed = { ...image, data: image.data.slice() };
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const i = (y * 64 + x) * 4;
        changed.data[i] = 0;
        changed.data[i + 1] = 0;
        changed.data[i + 2] = 0;
      }
    }

    expect(phashFromRgba(changed)).not.toBe(phashFromRgba(image));
  });

  it('expands hex to the bit(64) form stored in Postgres', () => {
    const bits = hexToBitString('0123456789abcdef');
    expect(bits).toHaveLength(64);
    expect(bits.startsWith('0000')).toBe(true);
    expect(bits.endsWith('1111')).toBe(true);
  });

  it('rejects a malformed hash', () => {
    expect(() => hexToBitString('not-a-hash')).toThrow('p_hash_invalid');
  });
});
