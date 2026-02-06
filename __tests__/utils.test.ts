import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadAsTxt, normalizeNovelText } from '../lib/utils';

describe('utils', () => {
  describe('normalizeNovelText', () => {
    it('compresses 3+ consecutive newlines into 2', () => {
      const input = 'Line 1\n\n\n\nLine 2\n\n\nLine 3';
      const expected = 'Line 1\n\nLine 2\n\nLine 3';
      expect(normalizeNovelText(input)).toBe(expected);
    });

    it('trims leading/trailing whitespace from every line', () => {
      const input = '  Line 1  \n\tLine 2\t\n  Line 3  ';
      const expected = 'Line 1\nLine 2\nLine 3';
      expect(normalizeNovelText(input)).toBe(expected);
    });

    it('unifies full-width punctuation', () => {
      const input = '你好！这是一个测试。』『「」…—';
      // Symbols: ！ -> !, 。 -> ., 』 -> ", 『 -> ", 「 -> ", 」 -> ", … -> ..., — -> --
      const expected = '你好!这是一个测试.""""...--';
      expect(normalizeNovelText(input)).toBe(expected);
    });

    it('handles combination of normalization rules', () => {
      const input = '  Line 1  \n\n\n\n  你好！  \n\n  Line 3  ';
      const expected = 'Line 1\n\n你好!\n\nLine 3';
      expect(normalizeNovelText(input)).toBe(expected);
    });
  });

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