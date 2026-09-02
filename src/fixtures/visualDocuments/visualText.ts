/**
 * Fixed prose for the visual fixtures. Visual baselines are byte comparisons,
 * so fixture content must never vary between runs: no dates, no counters, no
 * randomness. Six characters of clock time were measured at 0.00022 mismatch,
 * which is 10% of the per-page pixel budget on its own.
 */
export const VISUAL_PARAGRAPHS: ReadonlyArray<string> = [
  'Circumambulate the city of a dreamy Sabbath afternoon. Go from Corlears Hook to Coenties Slip, and from thence, by Whitehall, northward. What do you see? Posted like silent sentinels all around the town, stand thousands upon thousands of mortal men fixed in ocean reveries.',
  'Some leaning against the spiles; some seated upon the pier-heads; some looking over the bulwarks of ships from China; some high aloft in the rigging, as if striving to get a still better seaward peep. But these are all landsmen; of week days pent up in lath and plaster.',
  'But look! here come more crowds, pacing straight for the water, and seemingly bound for a dive. Strange! Nothing will content them but the extremest limit of the land; loitering under the shady lee of yonder warehouses will not suffice.',
  'They must get just as nigh the water as they possibly can without falling in. And there they stand, miles of them, leagues. Inlanders all, they come from lanes and alleys, streets and avenues; north, east, south, and west. Yet here they all unite.',
  'Once more. Say you are in the country; in some high land of lakes. Take almost any path you please, and ten to one it carries you down in a dale, and leaves you there by a pool in the stream. There is magic in it.',
  'Let the most absent-minded of men be plunged in his deepest reveries, stand that man on his legs, set his feet a-going, and he will infallibly lead you to water, if water there be in all that region.',
];

/** Fixed title/date rows for the split and tab-split fixtures. */
export const VISUAL_ENTRIES: ReadonlyArray<{
  readonly title: string;
  readonly detail: string;
}> = [
  { title: 'Cetological Survey', detail: 'Nantucket, 1841' },
  { title: 'Harpooner, Second Watch', detail: 'New Bedford, 1842' },
  { title: 'Keeper of the Try-Works', detail: 'Off the Azores, 1843' },
  { title: 'Master of the Masthead', detail: 'Pacific Crossing, 1844' },
];
