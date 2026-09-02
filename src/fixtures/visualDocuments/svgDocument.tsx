import { DocumentProvider, Raw, Stack, Svg } from '../../reactComponents';
import { VISUAL_PARAGRAPHS } from './visualText';

/**
 * The explicit-degradation contract, made visible.
 *
 * No `svgImages` entry is passed to `reactToDocx` for these ids, so HTML and PDF
 * show the vector and DOCX shows the gap where it would be. That asymmetry is
 * the point: the baselines record that the graphic is *absent* from Word rather
 * than that its text labels leaked into the body. Rendering this fixture emits
 * one `console.warn` per SVG naming the id, which is the warning contract.
 */
export function SvgDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <h1>Inline SVG</h1>
        <p>{VISUAL_PARAGRAPHS[0]}</p>

        <h2>Shapes</h2>
        <Svg id="visualShapes" width="300" height="120">
          <rect width="300" height="120" fill="#00dddd" />
          <circle cx="60" cy="60" r="45" fill="#ff00ff" />
          <rect x="130" y="20" width="80" height="80" fill="#ffff00" />
        </Svg>

        <p>{VISUAL_PARAGRAPHS[1]}</p>

        <h2>Stroked path</h2>
        <Svg id="visualPath" width="300" height="80">
          <path
            d="M0 60 L60 20 L120 60 L180 20 L240 60 L300 20"
            fill="none"
            stroke="#000000"
            strokeWidth="4"
          />
        </Svg>

        <h2>Raw markup passthrough</h2>
        <Raw as="p">Raw paragraph content</Raw>

        <p>{VISUAL_PARAGRAPHS[2]}</p>
      </Stack>
    </DocumentProvider>
  );
}
