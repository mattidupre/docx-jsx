import type { FontsOptions } from '../entities';

// https://meowni.ca/font-style-matcher/

export const mockFonts: FontsOptions = {
  Merriweather: {
    fontFaces: [
      {
        sources: [
          {
            documentType: 'web',
            src: 'Merriweather-Black.ttf',
            format: 'truetype',
          },
          {
            documentType: 'docx',
            src: 'Calibri',
            format: 'truetype',
          },
        ],
        fontWeight: '800',
        fontStyle: 'normal',
      },
      {
        sources: [
          {
            documentType: 'web',
            src: 'Merriweather-BlackItalic.ttf',
            format: 'truetype',
          },
          {
            documentType: 'docx',
            src: 'Calibri',
            format: 'truetype',
          },
        ],
        fontWeight: '800',
        fontStyle: 'italic',
      },
      {
        sources: [
          {
            documentType: 'web',
            src: 'Merriweather-Bold.ttf',
            format: 'truetype',
          },
          {
            documentType: 'docx',
            src: 'Calibri',
            format: 'truetype',
          },
        ],
        fontWeight: '600',
        fontStyle: 'normal',
      },
      {
        sources: [
          {
            documentType: 'web',
            src: 'Merriweather-BoldItalic.ttf',
            format: 'truetype',
          },
          {
            documentType: 'docx',
            src: 'Calibri',
            format: 'truetype',
          },
        ],
        fontWeight: '600',
        fontStyle: 'italic',
      },
      {
        sources: [
          {
            documentType: 'web',
            src: 'Merriweather-Italic.ttf',
            format: 'truetype',
          },
          {
            documentType: 'docx',
            src: 'Calibri',
            format: 'truetype',
          },
        ],
        fontWeight: '400',
        fontStyle: 'italic',
      },
      {
        sources: [
          {
            documentType: 'web',
            src: 'Merriweather-Regular.ttf',
            format: 'truetype',
          },
          {
            documentType: 'docx',
            src: 'Calibri',
            format: 'truetype',
          },
        ],
        fontWeight: '400',
        fontStyle: 'normal',
      },
      {
        sources: [
          {
            documentType: 'web',
            src: 'Merriweather-Light.ttf',
            format: 'truetype',
          },
          {
            documentType: 'docx',
            src: 'Calibri',
            format: 'truetype',
          },
        ],
        fontWeight: '300',
        fontStyle: 'normal',
      },
      {
        sources: [
          {
            documentType: 'web',
            src: 'Merriweather-LightItalic.ttf',
            format: 'truetype',
          },
          {
            documentType: 'docx',
            src: 'Calibri',
            format: 'truetype',
          },
        ],
        fontWeight: '300',
        fontStyle: 'italic',
      },
    ],
  },
};
