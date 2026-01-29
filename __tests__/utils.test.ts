import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadAsTxt } from '../lib/utils';

describe('utils', () => {
  describe('downloadAsTxt', () => {
    beforeEach(() => {
      // Mock browser APIs
      global.URL.createObjectURL = vi.fn(() => 'mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      // Mock Blob as a constructor
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
    });

    it('formats the story correctly and triggers a download', () => {
      const title = 'Test Novel';
      const original = 'Original content here.';
      const chapters = ['Chapter 1 content.', 'Chapter 2 content.'];

      downloadAsTxt(title, original, chapters);

      // Verify Blob creation
      expect(global.Blob).toHaveBeenCalled();
      const blobCall = vi.mocked(global.Blob).mock.calls[0];
      const content = blobCall[0][0];

      expect(content).toContain('TITLE: Test Novel');
      expect(content).toContain('【ORIGINAL NOVEL】');
      expect(content).toContain('Original content here.');
      expect(content).toContain('【CHAPTER 1】');
      expect(content).toContain('Chapter 1 content.');
      expect(content).toContain('【CHAPTER 2】');
      expect(content).toContain('Chapter 2 content.');

      // Verify link creation and click
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
    });
  });
});
