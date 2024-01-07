import type { SetRequired } from 'type-fest';
import { type FontFaceOptions, matchFontFace } from '../utils/font';
import { getValueOf } from '../utils/object';
import type { DocumentType } from './options';
import { type TypographyOptions, typographyOptionsToFlat } from './typography';

export type FontFamily = string;

// const FONT_FAMILY_FALLBACKS = [
//   'serif',
//   'sans-serif',
//   'monospace',
//   // 'cursive',
//   // 'fantasy',
//   // 'system-ui',
//   // 'ui-serif',
//   // 'ui-sans-serif',
//   // 'ui-monospace',
//   // 'ui-rounded',
//   // 'math',
//   // 'emoji',
//   // 'fangsong' // (Chinese)
// ] as const;

// type FontFamilyFallback = (typeof FONT_FAMILY_FALLBACKS)[number];

// const FONT_FAMILY_FALLBACKS_MS_OFFICE = {
//   serif: 'Cambria',
//   'sans-serif': 'Calibri',
//   monospace: 'Courier New',
// } as const satisfies {
//   [K in FontFamilyFallback]: keyof {
//     [F in keyof FontsMsOffice as [FontsMsOffice[F]['type']] extends [K]
//       ? F
//       : never]: never;
//   };
// };

type FontFormat =
  | 'collection'
  | 'embedded-opentype'
  | 'opentype'
  // | 'svg' // Deprecated
  | 'truetype'
  | 'woff'
  | 'woff2';

export type FontFace = FontFaceOptions & {
  src?: string;
  sources: ReadonlyArray<
    | {
        documentType?: Exclude<DocumentType, 'docx'>;
        src: string;
        format: FontFormat;
      }
    | {
        documentType?: 'docx';
        src: `${keyof FontsMsOffice}${string}`;
        format: 'truetype';
      }
  >;
};

export type Font = {
  fontFaces: ReadonlyArray<FontFace>;
};

export type FontsOptions = Record<FontFamily, Font>;

export const getFontFace = (
  { fonts, documentType }: { fonts: FontsOptions; documentType: DocumentType },
  options: Pick<TypographyOptions, 'fontFamily' | 'fontWeight' | 'fontStyle'>,
): undefined | SetRequired<FontFace, 'src'> => {
  const {
    fontFamily: fontFamilyOption,
    fontWeight,
    fontStyle,
  } = typographyOptionsToFlat(options);

  if (!fontFamilyOption) {
    return undefined;
  }

  const fontFamilyValues = fontFamilyOption.trim().split(/\s*,\s*/);

  if (fontFamilyValues.length === 0) {
    return undefined;
  }

  // TODO: Handle fallbacks.
  const fontFamily = fontFamilyValues[0];

  const fontFaces = getValueOf(fonts, fontFamily)?.fontFaces ?? [];
  const fontFace = matchFontFace(fontFaces, { fontWeight, fontStyle });
  if (!fontFace) {
    console.error(`Could not find a font face for ${options.fontFamily}`);
    return undefined;
  }
  if (documentType === 'docx') {
    const source = fontFace.sources.find(
      ({ documentType }) => documentType === 'docx',
    );
    if (!source) {
      console.error(
        `Could not find a docx font face for ${options.fontFamily}`,
      );
      return undefined;
    }
    return { ...structuredClone(fontFace), src: source.src };
  }
  throw new TypeError(
    `Cannot resolve font face for documentType ${documentType}`,
  );
};

type FontsMsOffice = {
  Abadi: { type: 'sans-serif' };
  'Abadi Extra Light': { type: 'sans-serif' };
  'Agency FB': { type: 'sans-serif' };
  Aharoni: { type: 'sans-serif' };
  Aldhabi: { type: 'serif' };
  Algerian: { type: 'fantasy' };
  'Amasis MT': { type: 'serif' };
  'Angsana New': { type: 'serif' };
  Aparajita: { type: 'serif' };
  Aptos: { type: 'sans-serif' };
  'Aptos Light': { type: 'sans-serif' };
  'Aptos Semibold': { type: 'sans-serif' };
  'Aptos Black': { type: 'sans-serif' };
  'Aptos Mono': { type: 'monospace' };
  'Aptos Serif': { type: 'serif' };
  Arial: { type: 'sans-serif' };
  'Arial Narrow': { type: 'sans-serif' };
  'Arial Black': { type: 'sans-serif' };
  'Arial Nova': { type: 'sans-serif' };
  'Arial Nova Light': { type: 'sans-serif' };
  'Arial Nova Condensed': { type: 'sans-serif' };
  'Arial Rounded MT': { type: 'sans-serif' };
  'Avenir Next LT Pro': { type: 'sans-serif' };
  'Baguet Script': { type: 'cursive' };
  Bahnschrift: { type: 'sans-serif' };
  'Bahnschrift Light': { type: 'sans-serif' };
  'Bahnschrift SemiBold': { type: 'sans-serif' };
  'Bahnschrift Condensed': { type: 'sans-serif' };
  'Bahnschrift Light Condensed': { type: 'sans-serif' };
  'Bahnschrift Semi Bold Condensed': { type: 'sans-serif' };
  'Baskerville Old Face': { type: 'serif' };
  Batang: { type: 'serif' };
  'Bell MT': { type: 'serif' };
  'Berlin Sans FB': { type: 'sans-serif' };
  'Bernard MT Condensed': { type: 'serif' };
  Bierstadt: { type: 'sans-serif' };
  Biome: { type: 'sans-serif' };
  'Biome Light': { type: 'sans-serif' };
  'Blackadder ITC': { type: 'cursive' };
  'Bodoni MT': { type: 'serif' };
  'Bodoni MT Black': { type: 'serif' };
  'Book Antiqua': { type: 'serif' };
  'Bookman Old Style': { type: 'serif' };
  // 'Bookshelf Symbol 7': { type: 'symbol' };
  'Bradley Hand ITC': { type: 'cursive' };
  'Britannic Bold': { type: 'fantasy' };
  Broadway: { type: 'fantasy' };
  'Browallia New': { type: 'serif' };
  'Brush Script MT': { type: 'cursive' };
  Calibri: { type: 'sans-serif' };
  'Calibri Light': { type: 'sans-serif' };
  'Californian FB': { type: 'serif' };
  'Calisto MT': { type: 'serif' };
  Cambria: { type: 'serif' };
  Candara: { type: 'sans-serif' };
  Castellar: { type: 'fantasy' };
  Cavolini: { type: 'cursive' };
  Centaur: { type: 'serif' };
  Century: { type: 'serif' };
  'Century Gothic': { type: 'sans-serif' };
  'Chamberi Super Display Regular': { type: 'fantasy' };
  Chiller: { type: 'fantasy' };
  'Cochocib Script Latin Pro': { type: 'cursive' };
  'Colonna MT': { type: 'fantasy' };
  'sans-serif Sans MS': { type: 'sans-serif' };
  Congenial: { type: 'sans-serif' };
  Consolas: { type: 'sans-serif' };
  Constantia: { type: 'serif' };
  'Cooper Black': { type: 'fantasy' };
  'Copperplate Gothic': { type: 'fantasy'; recommended?: 'Yes' };
  Corbel: { type: 'sans-serif' };
  'Cordia New': { type: 'sans-serif' };
  'Courier New': { type: 'monospace' };
  DaunPenh: { type: 'serif' };
  David: { type: 'serif' };
  Daytona: { type: 'sans-serif' };
  'Daytona Light': { type: 'sans-serif' };
  'Daytona Condensed': { type: 'sans-serif' };
  DengXian: { type: 'sans-serif' };
  'DengXian Light': { type: 'sans-serif' };
  DilleniaUPC: { type: 'serif' };
  Dotum: { type: 'sans-serif' };
  'Dreaming Outloud Pro': { type: 'cursive' };
  'Dreaming Outloud Script Pro': { type: 'cursive' };
  Ebrima: { type: 'serif' };
  'Edwardian Script ITC': { type: 'sans-serif' };
  'Elephant Pro': { type: 'serif' };
  'Eras Medium ITC': { type: 'serif' };
  'Eucrosia UPC': { type: 'serif' };
  Euphemia: { type: 'serif' };
  'Fairwater Script': { type: 'cursive' };
  'Fave Script Bold Pro': { type: 'cursive' };
  'Felix Titling': { type: 'fantasy' };
  'Footlight MT Light': { type: 'serif' };
  'Forte Forward': { type: 'cursive' };
  'Franklin Gothic': { type: 'sans-serif' };
  FrankRuehl: { type: 'serif' };
  'Freestyle Script': { type: 'cursive' };
  Gabriola: { type: 'cursive' };
  Gadugi: { type: 'sans-serif' };
  Garamond: { type: 'serif' };
  'Georgia Pro': { type: 'serif' };
  'Gill Sans MT': { type: 'sans-serif' };
  'Gill Sans Nova': { type: 'sans-serif' };
  Gisha: { type: 'sans-serif' };
  'Gloucester MT Extra Condensed': { type: 'fantasy' };
  'Goudy Old Style': { type: 'serif' };
  'Goudy Type': { type: 'serif' };
  Grandview: { type: 'sans-serif' };
  Grotesque: { type: 'sans-serif' };
  Gulim: { type: 'sans-serif' };
  Gungsuh: { type: 'serif' };
  'Hadassah Friedlaender': { type: 'serif' };
  Harrington: { type: 'fantasy' };
  'High Tower Text': { type: 'serif' };
  Impact: { type: 'serif' };
  'Imprint MT Shadow': { type: 'serif' };
  'Ink Free': { type: 'cursive' };
  IrisUPC: { type: 'sans-serif'; recommended?: "Don't Use" };
  'Iskoola Pota': { type: 'serif' };
  JasmineUPC: { type: 'serif' };
  'Javanese Text': { type: 'serif' };
  Jokerman: { type: 'fantasy'; recommended?: "Don't Use" };
  'Juice ITC': { type: 'fantasy' };
  Jumble: { type: 'fantasy' };
  Kalinga: { type: 'sans-serif' };
  Kartika: { type: 'sans-serif' };
  'Khmer UI': { type: 'sans-serif' };
  Kigelia: { type: 'sans-serif' };
  KodchiangUPC: { type: 'serif' };
  Kokila: { type: 'serif' };
  'Kristen ITC': { type: 'sans-serif' };
  'Kunstler Script': { type: 'cursive' };
  'Lao UI': { type: 'sans-serif' };
  Latha: { type: 'sans-serif' };
  Leelawadee: { type: 'sans-serif' };
  'Levenim MT': { type: 'sans-serif' };
  LilyUPC: { type: 'sans-serif' };
  'Lucida Bright': { type: 'serif' };
  'Lucida Calligraphy': { type: 'cursive' };
  'Lucida Handwriting': { type: 'cursive' };
  Magneto: { type: 'fantasy' };
  'Maiandra GD': { type: 'sans-serif' };
  'Malgun Gothic': { type: 'sans-serif' };
  Mangal: { type: 'sans-serif' };
  'Matura MT Script Capitals': { type: 'fantasy' };
  Meiryo: { type: 'sans-serif' };
  Miriam: { type: 'sans-serif' };
  Mistral: { type: 'cursive' };
  'Modern Love': { type: 'cursive' };
  'Modern Love Caps': { type: 'cursive' };
  'Modern Love Grunge': { type: 'cursive' };
  'Modern No. 20': { type: 'serif' };
  'Mongolian Baiti': { type: 'serif' };
  MoolBoran: { type: 'serif' };
  'Myanmar Text': { type: 'sans-serif' };
  'Mystical Woods Smooth Script': { type: 'cursive' };
  Narkisim: { type: 'serif' };
  'Neue Haas Grotesk Text Pro': { type: 'sans-serif' };
  'News Gothic MT': { type: 'sans-serif' };
  'Niagara Engraved': { type: 'fantasy' };
  'Niagara Solid': { type: 'fantasy' };
  'Nirmala Text': { type: 'sans-serif' };
  'Nordique Inline Regular': { type: 'fantasy' };
  NSimSun: { type: 'monospace' };
  Nyala: { type: 'serif' };
  OCRB: { type: 'monospace' };
  Onyx: { type: 'fantasy' };
  'Palace Script MT': { type: 'cursive' };
  'Palatino Linotype': { type: 'serif' };
  Papyrus: { type: 'fantasy' };
  Perpetua: { type: 'serif' };
  'Plantagenet Cherokee': { type: 'serif' };
  Playbill: { type: 'fantasy' };
  PMingLiU: { type: 'serif' };
  Posterama: { type: 'sans-serif' };
  Pristina: { type: 'cursive' };
  'Quire Sans': { type: 'sans-serif' };
  Raavi: { type: 'sans-serif' };
  'Rage Italic': { type: 'cursive' };
  'Rastanty Cortez': { type: 'cursive' };
  Ravie: { type: 'fantasy'; recommended?: "Don't Use" };
  Rockwell: { type: 'serif' };
  'Rockwell Light': { type: 'serif' };
  'Rockwell Condensed': { type: 'serif' };
  'Rockwell Nova': { type: 'serif' };
  'Rockwell Nova Light': { type: 'serif' };
  Rod: { type: 'serif' };
  'Sabon Next LT': { type: 'serif' };
  Sagona: { type: 'serif' };
  'Sakkal Majalla': { type: 'serif' };
  'Sanskrit Text': { type: 'serif' };
  'Script MT Bold': { type: 'cursive' };
  Seaford: { type: 'sans-serif' };
  'Segoe UI': { type: 'sans-serif' };
  Selawik: { type: 'sans-serif' };
  'Selawik Light': { type: 'sans-serif' };
  'Selawik Semibold': { type: 'sans-serif' };
  'Shonar Bangla': { type: 'serif' };
  Shruti: { type: 'sans-serif' };
  SimHei: { type: 'serif' };
  'Simplified Arabic': { type: 'sans-serif' };
  SimSun: { type: 'sans-serif' };
  Sitka: { type: 'serif' };
  Skeena: { type: 'sans-serif' };
  'Snap ITC': { type: 'fantasy'; recommended?: "Don't Use" };
  'Source Sans Pro': { type: 'sans-serif' };
  'Source Sans Light / Extra Light': { type: 'sans-serif' };
  'Source Sans Pro Black': { type: 'sans-serif' };
  'Speak Pro': { type: 'sans-serif' };
  StCaiyun: { type: 'fantasy' };
  Sylfaen: { type: 'serif' };
  Tahoma: { type: 'sans-serif' };
  'Tempus Sans ITC': { type: 'fantasy' };
  Tenorite: { type: 'sans-serif' };
  'TH SarabunPSK': { type: 'sans-serif' };
  'The Hand Black': { type: 'cursive' };
  'The Serif Hand Black': { type: 'cursive' };
  'Times New Roman': { type: 'serif' };
  'Tisa Offc Serif Pro': { type: 'serif' };
  'Trade Gothic Inline': { type: 'fantasy' };
  'Trade Gothic Next': { type: 'sans-serif' };
  'Trade Gothic Next Rounded': { type: 'sans-serif' };
  'Traditional Arabic': { type: 'serif' };
  'Trebuchet MS': { type: 'sans-serif' };
  Tunga: { type: 'sans-serif' };
  'Tw Cen MT': { type: 'sans-serif' };
  'UD Digi Kyokasho N_B': { type: 'fantasy' };
  Univers: { type: 'sans-serif' };
  'Urdu Typesetting': { type: 'serif' };
  Utsaah: { type: 'sans-serif' };
  Vani: { type: 'serif' };
  Verdana: { type: 'sans-serif' };
  'Verdana Pro': { type: 'sans-serif' };
  'Verdana Pro Light': { type: 'sans-serif' };
  'Verdana Pro Semibold': { type: 'sans-serif' };
  Vijaya: { type: 'cursive' };
  'Viner Hand ITC': { type: 'cursive' };
  Vivaldi: { type: 'cursive' };
  'Vladimir Script': { type: 'cursive' };
  Vrinda: { type: 'sans-serif' };
  'Walbaum Display': { type: 'serif' };
  // Webdings: { type: 'symbol' };
  'Wide Latin': { type: 'fantasy' };
  // Wingdings: { type: 'symbol' };
  // 'Wingdings 2': { type: 'symbol' };
  // 'Wingdings 3': { type: 'symbol' };
};
