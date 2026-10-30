import { describe, expect, it } from 'vitest';
import { exportActions } from '../exportActions';

describe('exportActions', () => {
  it('offers the share sheet only on touch devices that support it', () => {
    expect(exportActions({ canShare: true, coarsePointer: true })).toEqual(['share', 'copy']);
  });

  it('hides sharing on computers even when the browser supports it', () => {
    expect(exportActions({ canShare: true, coarsePointer: false })).toEqual(['copy', 'download']);
  });

  it('falls back to a file when a touch browser cannot share', () => {
    expect(exportActions({ canShare: false, coarsePointer: true })).toEqual(['copy', 'download']);
    expect(exportActions({ canShare: false, coarsePointer: false })).toEqual(['copy', 'download']);
  });
});
