/* eslint-disable react/jsx-no-useless-fragment */

import {
  Document,
  PagesGroup,
  Header,
  Content,
  Footer,
  TextRun,
  Paragraph,
} from 'src/react';
import { TextProvider, useTextConfig } from 'src/context';
import { type FunctionComponent } from 'react';
import { vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const componentElements = new Map<FunctionComponent, any>();

const createMockComponent = <TComponent extends FunctionComponent>(
  component: TComponent,
) => component;
// vi.fn((...args: Parameters<TComponent>) => {
//   // eslint-disable-next-line prefer-spread
//   const value = component.apply(undefined, args);
//   componentElements.set(component, value);
//   return value;
// }) as unknown as TComponent;

const ColorString = createMockComponent(() => {
  return useTextConfig().color.toUpperCase();
});

const ComponentD = createMockComponent(() => {
  return (
    <>
      <TextRun>Component D 1</TextRun>
      <TextRun>Component D 2</TextRun>
    </>
  );
});

const ComponentB = createMockComponent(() => {
  return (
    <>
      <TextProvider options={{ color: 'red' }}>
        <Paragraph>
          <ColorString />
          <TextRun>COMPONENT 1</TextRun>
          <TextRun>{0}</TextRun>
        </Paragraph>
        <Paragraph>EXTRA</Paragraph>
      </TextProvider>
    </>
  );
});

const ComponentA = createMockComponent(() => {
  return (
    <>
      <Paragraph>NO TEXTRUN</Paragraph>
      <Paragraph text="WEIRD" />
      <ComponentB />
      <Paragraph text="WEIRD" />
      <Paragraph>
        <TextRun>THREE</TextRun>
        <ComponentD />
      </Paragraph>
    </>
  );
});

const mockPageTypes = (prefix: string) => ({
  default: {
    header: (
      <Header>
        <Paragraph>{prefix} HEADER TEXT</Paragraph>
      </Header>
    ),
    footer: (
      <Footer>
        <Paragraph>{prefix} FOOTER TEXT</Paragraph>
      </Footer>
    ),
  },
});

export const mockDocumentElement = (
  <Document>
    <PagesGroup pageTypes={mockPageTypes('FIRST SECTION')}>
      <Paragraph text={`Generated at ${new Date().toLocaleTimeString()}`} />
      <ComponentA />
    </PagesGroup>
    <PagesGroup pageTypes={mockPageTypes('SECOND SECTION')}>
      <LoremIpsum />
      <LoremIpsum />
      <LoremIpsum />
      <LoremIpsum />
      <LoremIpsum />
    </PagesGroup>
  </Document>
);

// export const mockDocumentMarkup = renderToStaticMarkup(mockDocumentElement);

function LoremIpsum() {
  return (
    <Paragraph>
      <TextRun>
        Lorem ipsum dolor sit amet, cum ad illud iisque eloquentiam. Pro id
        propriae interesset, has no primis tritani. Et quas luptatum sensibus
        est, ad quod petentium sea. Eos deleniti officiis disputationi eu, sit
        tollit ocurreret et, eirmod corrumpit repudiare ut ius. Mei summo
        tractatos ne. Ius ut regione fastidii forensibus, duo dicit oporteat ad,
        munere doming pro id. Eam modus dicta cu, te nam oportere indoctum
        vituperata, ut modus quaeque qui. Summo nobis ne pri, an modo postulant
        sit, laoreet apeirian ei eam. At est debet aeterno accusamus. Sale
        discere instructior te vim, dicta euismod laoreet nam ad. Sanctus
        explicari et pri. Eos labores praesent ex, sit assum paulo ad. Est cu
        tale reque dissentiunt, sed noluisse torquatos eu, qui doctus viderer
        civibus no. Et nam veniam tibique mediocrem, dicunt reformidans te mei.
        Usu liber liberavisse no, vix duis tritani ex. Has ad agam alterum, no
        ullum delenit intellegebat eum. Cum albucius percipit appellantur no, te
        affert periculis vix. Praesent sententiae adversarium ex pri, cu paulo
        nihil torquatos mei, amet inani eos cu. Has ferri alterum fabulas ei, cu
        graeco salutatus eam. Partem facilis delectus vel at, et ius doctus
        eruditi. Id legere delicata scriptorem cum. Mei ut dicit causae. Nam
        accusam epicurei ut. Unum nibh forensibus cu est. Vis et dignissim
        urbanitas intellegat. At assum feugiat quaestio vim, dicta audiam mel
        te. Id option labores mediocritatem sit, veritus fabellas in vel, alii
        debet ut has. Amet delicata sed an, ut intellegat argumentum sed, his at
        nostro accusam gloriatur. Cu vel maluisset appellantur concludaturque,
        cu ius agam autem animal. Eirmod nominavi cu usu, rationibus eloquentiam
        nec in, nec populo putant lucilius ex. Mea sententiae scribentur ex, ut
        vis illum decore aliquid. At tritani maiorum vim. Erat debet eam cu, ut
        graecis accusam nec. In agam duis tritani ius. Has te vidit admodum
        assentior, an quem minimum abhorreant vim. Exerci adipisci in ius, solet
        eligendi ut eum. Vix appareat quaestio an. Aeque errem vim id, duo no
        ferri prima option. An soluta tamquam disputationi pri. Facete perpetua
        disputando eos et, virtute ocurreret inciderint id quo. Ne graeci
        accusam maiestatis est, nisl zril ei sed. Eu erat imperdiet cum, id
        atomorum assentior pro. Cu signiferumque conclusionemque sea. Ex vix
        esse omnium percipitur, cu mei graeci dolorem gubergren. Tale possim
        laboramus an vix, diam nemore audiam id sea. Sit in quis scaevola
        voluptatum. Mea fugit omittantur liberavisse id. Te sed gubergren
        voluptaria omittantur. Nobis everti offendit ex est, qualisque prodesset
        eam te. Sonet doctus luptatum cu usu, te has assum equidem periculis. Ex
        cum liber prompta suscipit, in tota periculis accusamus ius, ne elit
        ipsum deleniti vis. Vel ad posidonium conclusionemque, an vel quem
        tollit sadipscing. Intellegat pertinacia omittantur in est, vis ei
        veniam everti feugait. At vim volumus voluptua cotidieque. Ea duis
        adipisci per, vis delicata consequat appellantur an. Duo ut persecuti
        mnesarchum, eam labitur appetere ei. Qui tincidunt reprimique in. Et
        eligendi consequat adipiscing per. Sit eu choro dolorem accommodare, eu
        cum graece efficiantur delicatissimi, eu viris clita mel. Postea graeco
        vis no. Eam eu errem graecis omittam. Sed maluisset conceptam reprimique
        ei, ei case dignissim est. Mei civibus pertinacia omittantur ut, enim
        ludus no has, falli omnium facilisi vel in. Sit case intellegat cu. His
        id tractatos reprehendunt mediocritatem. Ei latine deserunt maiestatis
        eum, persius nominavi an pro, his et tale errem postea. Iisque
        reformidans philosophia eu vix, modus ponderum recusabo sea te. Sed in
        eligendi persecuti, vim ut tota insolens tractatos. Vix ridens saperet
        ad, recusabo expetendis elaboraret eu eos, cu vis platonem inimicus. Eam
        euripidis laboramus in, has cu modo tacimates. Ne summo consectetuer
        nec, in insolens intellegebat eos. Nostrud inermis in vis, homero
        albucius patrioque pri ad. Ei mea magna euismod aliquando. Ad suscipit
        vulputate consetetur ius, per cu amet partem sapientem, sed eius
        tractatos eu. Quo meis augue ut, at paulo volumus est. Novum partiendo
        at eam. Possit hendrerit vis ad. Cu solet iudico delicatissimi has. Ut
        duo soluta saperet. Per te euismod repudiare, ei nam dolores iudicabit.
        Cum an nostrud ceteros, vidit argumentum mei ex. Mundi feugiat fastidii
        per an. Essent euismod sed ea, cum accumsan repudiare deterruisset ut.
        Nec cu libris salutandi, te ius aliquip sapientem. Quo ea rebum utroque
        luptatum, errem verear sapientem mea cu, nostro honestatis dissentiunt
        usu in. Corpora interesset in cum, vix singulis posidonium te. Postea
        perpetua ius ne. Est error molestie ut, in oporteat mediocritatem usu,
        et maiorum dignissim usu. Vis cu delicata praesent salutandi. Qui cu
        neglegentur definitiones, qui cu erant ubique. Quo iusto accommodare te,
        eam ne stet epicurei voluptaria, ipsum delicata eam ea. Id vis deleniti
        scaevola persecuti, solet aliquam deseruisse eu duo. Solum pericula
        deterruisset eu vis, scripta volumus sadipscing est ei. Pro at inermis
        insolens. Quo zril audiam ei, laoreet appetere cum ei. At vel enim vidit
        ponderum, vel te nulla suscipit. Reque noster propriae qui eu, in ius
        quodsi dissentiet philosophia, cu ius denique incorrupte. Pri id vidit
        prima inimicus, usu choro prompta saperet eu, ius alii iriure
        contentiones no. Tation luptatum deseruisse ex mei. Ut doctus equidem
        usu. Est partem labores te. Modo postulant ad vim. Quod aliquid
        constituam eam ad, elitr appetere tractatos vis cu.
      </TextRun>
    </Paragraph>
  );
}
