// /* eslint-disable func-names */
// import type {
//   Props,
//   GetChildren,
//   HasChildren,
//   ExcludeChild,
//   OverwriteChildren,
//   HasRequiredChildren,
//   HasPartialChildren,
// } from './props';
// import { testWithType } from '../helpers/typeHelpers';
// import { describe } from 'vitest';

// type Child = 'one' | 'two' | 'three';

// type Children = ReadonlyArray<Child>;

// type PropsNoChildren = {
//   propName: 'propValue';
// };

// type WithOptionalChildren<T> = {
//   children?: T;
// };

// type WithRequiredChildren<T> = {
//   children: T;
// };

// type PropsOptionalChildren<T = ReadonlyArray<Child>> = PropsNoChildren &
//   WithOptionalChildren<T>;

// type PropsRequiredChildren<T = ReadonlyArray<Child>> = PropsNoChildren &
//   WithRequiredChildren<T>;

// describe('types', () => {
//   testWithType<Props>('AnyProps', function () {
//     this.expectType<PropsNoChildren>;
//     // @ts-expect-error
//     this.expectType<undefined>;
//   });

//   describe('HasChildren', () => {
//     testWithType<HasChildren<PropsNoChildren>>('no children', function () {
//       this.expectType<false>();
//     });

//     testWithType<HasChildren<PropsOptionalChildren>>(
//       'optional children',
//       function () {
//         this.expectType<true>();
//       },
//     );

//     testWithType<HasChildren<PropsRequiredChildren>>(
//       'required children',
//       function () {
//         this.expectType<true>();
//       },
//     );
//   });

//   describe('HasPartialChildren', () => {
//     testWithType<HasPartialChildren<PropsNoChildren>>(
//       'no children',
//       function () {
//         this.expectType<false>();
//       },
//     );

//     testWithType<HasPartialChildren<PropsOptionalChildren>>(
//       'optional children',
//       function () {
//         this.expectType<true>();
//       },
//     );

//     testWithType<HasPartialChildren<PropsRequiredChildren>>(
//       'required children',
//       function () {
//         this.expectType<false>();
//       },
//     );
//   });

//   describe('HasRequiredChildren', () => {
//     testWithType<HasRequiredChildren<PropsNoChildren>>(
//       'no children',
//       function () {
//         this.expectType<false>();
//       },
//     );

//     testWithType<HasRequiredChildren<PropsOptionalChildren>>(
//       'optional children',
//       function () {
//         this.expectType<false>();
//       },
//     );

//     testWithType<HasRequiredChildren<PropsRequiredChildren>>(
//       'required children',
//       function () {
//         this.expectType<true>();
//       },
//     );
//   });

//   describe('GetChildren', () => {
//     testWithType<GetChildren<PropsNoChildren>>('no children', function () {
//       this.expectType<undefined>();
//     });

//     testWithType<GetChildren<PropsOptionalChildren>>(
//       'optional children',
//       function () {
//         this.expectType<Children>();
//         this.expectType<undefined>();
//       },
//     );

//     testWithType<GetChildren<PropsRequiredChildren>>(
//       'required children',
//       function () {
//         this.expectType<Children>();
//         // @ts-expect-error
//         this.expectType<undefined>();
//       },
//     );
//   });

//   // TODO: Create describeWithType and access type with `typeof this.type`

//   describe('OverwriteChildren', () => {
//     type NewChildren = ReadonlyArray<'a' | 'b' | 'c'>;

//     testWithType<OverwriteChildren<PropsNoChildren, NewChildren>>(
//       'no children',
//       function () {
//         this.expectType<PropsNoChildren>;
//       },
//     );

//     testWithType<OverwriteChildren<PropsOptionalChildren, NewChildren>>(
//       'optional children',
//       function () {
//         this.expectType<PropsOptionalChildren<NewChildren>>;
//       },
//     );

//     testWithType<OverwriteChildren<PropsRequiredChildren, NewChildren>>(
//       'required children',
//       function () {
//         this.expectType<PropsRequiredChildren<NewChildren>>;
//       },
//     );
//   });

//   describe('ExcludeChild', () => {
//     testWithType<PropsNoChildren>('no children', function () {
//       this.expectType<ExcludeChild<PropsNoChildren, 'two'>>();
//     });

//     testWithType<ExcludeChild<PropsOptionalChildren, 'two'>>(
//       'optional children',
//       function () {
//         this.expectType<
//           PropsOptionalChildren<ReadonlyArray<'one' | 'three'>>
//         >();
//       },
//     );

//     testWithType<ExcludeChild<PropsRequiredChildren, 'two'>>(
//       'required children',
//       function () {
//         this.expectType<
//           PropsRequiredChildren<ReadonlyArray<'one' | 'three'>>
//         >();
//       },
//     );
//   });
// });
