import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadAsTxt } from '../lib/utils';

describe('utils', () => {
  describe('downloadAsTxt', () => {
    beforeEach(() => {
      // Mock browser APIs
      global.URL.createObjectURL = vi.fn(() => 'mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      // Mock Blob
      global.Blob = vi.fn().mockImplementation(function(this: any, content: any, options: any) {
        this.content = content;
        this.options = options;
        return this;
      }) as any;
      
      // Mock document.createElement
      document.createElement = vi.fn().mockImplementation((tagName) => {
        if (tagName === 'a') {
          return {
            href: '',
            download: '',
            click: vi.fn(),
          };
        }
        return {};
      });
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();

      // Mock Date to have a fixed timestamp
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-01T15:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('uses the correct timestamp-based filename format', () => {
      const title = 'Test Novel';
      const original = 'Original content here.';
      const chapters = ['Chapter 1 content.'];

      downloadAsTxt(title, original, chapters);

      expect(document.createElement).toHaveBeenCalledWith('a');
      const link = vi.mocked(document.createElement).mock.results[0].value;
      
      // The spec says novel_export_[timestamp].txt
      // Expected: novel_export_20260201-150000.txt (or similar)
      expect(link.download).toMatch(/^novel_export_\d{8}-\d{6}\.txt$/);
    });
  });
});
