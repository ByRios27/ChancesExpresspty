import { toPng } from 'html-to-image';

type ShareImageOverrides = {
  pixelRatio?: number;
  backgroundColor?: string;
  skipFonts?: boolean;
  style?: Record<string, string>;
};

const DEFAULT_EXPORT_OPTIONS = {
  pixelRatio: 3,
  backgroundColor: '#ffffff',
  skipFonts: false,
  cacheBust: true,
  style: {
    borderRadius: '0px',
  },
};

export async function exportNodeAsPng(node: HTMLElement, overrides: ShareImageOverrides = {}) {
  return toPng(node, {
    ...DEFAULT_EXPORT_OPTIONS,
    ...overrides,
    style: {
      ...DEFAULT_EXPORT_OPTIONS.style,
      ...(overrides.style || {}),
    },
  });
}
