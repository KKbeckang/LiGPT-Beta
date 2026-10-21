import { recordById, recordsOfPaper, STATS } from '../lib/data';
import { EvidenceSnippet } from './Evidence';
import { ArrowIcon, ExternalIcon } from './Icons';

const REPO = 'https://github.com/KKbeckang/LiGPT-Beta';

function Section({ eyebrow, title, children, id }) {
  return (
    <section id={id} className="mt-16">
      <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-kg">{eyebrow}</div>
      <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-ink-100">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Step({ n, title, figure, unit, children, file }) {
  return (
    <div className="glass flex flex-col rounded-[20px] p-5">
      <div className="flex items-center gap-2 font-mono text-[12px] text-ink-500">
        <span className="grid h-6 w-6 place-items-center rounded-full border border-white/15 text-ink-200">{n}</span>
        {title}
      </div>
      <div className="mt-4 text-[38px] font-semibold leading-none tracking-tight text-ink-100">{figure}</div>
      <div className="mt-1 text-[14px] text-ink-400">{unit}</div>
      <p className="mt-4 flex-1 text-[14.5px] leading-relaxed text-ink-300">{children}</p>
      {file && <div className="mt-4 truncate font-mono text-[12px] text-ink-500">{file}</div>}
    </div>
  );
}

function Path({ accent, title, steps }) {
  const color = accent === 'kg' ? 'border-kg/25 bg-kg/[0.05]' : 'border-llm/25 bg-llm/[0.05]';
  const dot = accent === 'kg' ? 'bg-kg' : 'bg-llm';
  return (
    <div className={`rounded-[20px] border p-5 ${color}`}>
      <div className="flex items-center gap-2 text-[16px] font-semibold text-ink-100">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {title}
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map(([head, body], i) => (
          <li key={head} className="grid grid-cols-[26px_minmax(0,1fr)] gap-2">
            <span className="font-mono text-[13px] text-ink-500">{i + 1}.</span>
            <span className="text-[14.5px] leading-relaxed text-ink-300">
              <span className="font-medium text-ink-100">{head}</span> {body}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const TRUST = [
  { key: 'found', label: 'Value printed in the text', color: '#2DD4BF' },
  { key: 'table', label: 'Bare number next to the composition (tables)', color: '#38BDF8' },
  { key: 'missing', label: 'Not found: check by hand', color: '#FBBF24' },
  { key: 'noValue', label: 'No CE value extracted', color: '#465269' },
];

function TrustBar() {
  const total = STATS.records;
  return (
    <div>
      <div className="flex h-9 gap-[2px] overflow-hidden rounded-[6px]">
        {TRUST.map((t) => (
          <div key={t.key} className="h-full" style={{ width: `${(STATS[t.key] / total) * 100}%`, background: t.color }} title={`${STATS[t.key]} records`} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-4">
        {TRUST.map((t) => (
          <div key={t.key} className="flex items-start gap-2.5">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: t.color }} />
            <div>
              <div className="text-[22px] font-semibold leading-none text-ink-100">{STATS[t.key]}</div>
              <div className="mt-1 text-[13.5px] text-ink-400">{t.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Command({ children, note }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] items-center gap-6 border-b border-white/[0.05] py-3 last:border-0">
      <code className="rounded-lg bg-black/30 px-3 py-2 font-mono text-[13.5px] text-ink-100">{children}</code>
      <span className="text-[14px] leading-relaxed text-ink-400">{note}</span>
    </div>
  );
}

export function HowView({ onOpen, onNavigate }) {
  const ota = recordById('34-1');
  const otaCount = recordsOfPaper(34).length;
  return (
    <div className="mx-auto max-w-[1180px] pt-8">
      <div className="max-w-3xl">
        <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink-400">How it works</div>
        <h1 className="mt-3 text-[46px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-100">
          From {STATS.papers} papers to an answer you can check.
        </h1>
        <p className="mt-5 text-[18px] leading-relaxed text-ink-300">
          LithiumMind reads papers on lithium metal electrolytes, pulls out every Coulombic efficiency it can find, and answers questions two ways: from a knowledge graph of those values, and from the papers&apos; own text. This page shows each step, how far the numbers can be trusted, and how to rebuild everything.
        </p>
      </div>

      <Section eyebrow="1 · Build" title="From papers to data">
        <div className="grid grid-cols-4 gap-4">
          <Step n={1} title="Papers" figure={STATS.papers} unit="PDFs" file="database/papers/ (not in the repo)">
            The references behind the electrolyte dataset of Kim et al. (PNAS 2023): 69 distinct papers, since two PDFs were included twice. Reference lists are cut off before chunking.
          </Step>
          <Step n={2} title="Chunks" figure={STATS.chunks.toLocaleString('en')} unit="text chunks" file="src/service/front_end/db/">
            pypdf text, split into semantic chunks and embedded twice, with MaterialsBERT and BioBERT, into a Chroma store.
          </Step>
          <Step n={3} title="Extraction" figure={STATS.records} unit={`records · ${STATS.withCE} with a CE`} file="langchain_extract_information.ipynb">
            For each paper, GPT-4 Turbo reads the chunks retrieved for four questions (electrolyte, solvents, CE, test conditions) and fills a schema: CE, salts with mol/L, solvents with fractions.
          </Step>
          <Step n={4} title="Knowledge graph" figure="4" unit="node types in Neo4j" file="build_kg.ipynb">
            Electrolyte nodes hold the CE and link to their Salt (MOL_L), Solvent (VOLUME) and Reference (CITED) nodes.
          </Step>
        </div>
      </Section>

      <Section eyebrow="2 · Ask" title="Two answers to every question">
        <div className="grid grid-cols-2 gap-4">
          <Path
            accent="kg"
            title="Knowledge graph answer"
            steps={[
              ['The model writes Cypher', 'from the question and the graph schema (LangChain GraphCypherQAChain).'],
              ['Neo4j runs it', 'and returns rows: electrolyte, CE, reference.'],
              ['The model phrases the rows', 'as a short answer. Every number comes from the graph.'],
            ]}
          />
          <Path
            accent="llm"
            title="LLM answer from the papers"
            steps={[
              ['Retrieval', 'takes the 10 closest chunks from each of the two embedding stores, drops near-duplicates and reorders them.'],
              ['The model answers', 'from those passages, citing the papers, and can explain why one electrolyte beats another.'],
              ['Nothing is stored', 'in the graph from this path; it reads the text directly.'],
            ]}
          />
        </div>
        <p className="mt-4 max-w-4xl text-[15px] leading-relaxed text-ink-300">
          The page then draws the graph neighbourhood of the answer, read from Neo4j, and cross-checks each graph value against the retrieved passages. Any OpenAI or Anthropic model listed in <code className="font-mono text-[13.5px] text-ink-100">LLM_MODELS</code> can write the Cypher and the answer; the extraction itself was done once, with GPT-4 Turbo, in 2024.
        </p>
      </Section>

      <Section eyebrow="3 · Check" title="How far to trust a number">
        <p className="mb-6 max-w-4xl text-[15.5px] leading-relaxed text-ink-300">
          Every extracted value was matched against the text of its own paper. Where it appears, the Data view shows the passage and page, so a value can be checked in seconds instead of opening the PDF.
        </p>
        <div className="glass rounded-[20px] p-6">
          <TrustBar />
        </div>
        {ota && (
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
            <div>
              <h3 className="text-[17px] font-semibold text-ink-100">What the schema cannot hold</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-300">
                The extraction asks about test conditions but has nowhere to store them. Ota et al. (Ref. 34) measured four salts in EC:DMC, with and without 2 % VC, at 0, 25 and 50 °C. The graph keeps all {otaCount} values but not the temperature, so the same 1 M LiPF6 in EC:DMC 1:1 appears three times, at 60, 64 and 53 %.
              </p>
              <button
                type="button"
                onClick={() => onOpen({ type: 'paper', ref: 34 })}
                className="mt-3 inline-flex items-center gap-2 text-[14px] font-medium text-kg hover:text-kg-soft"
              >
                See the {otaCount} records from this paper <ArrowIcon />
              </button>
            </div>
            <div>
              <div className="mb-2 font-mono text-[11.5px] uppercase tracking-[0.14em] text-ink-500">Ref. 34, page {ota.evidence.page} · the table as pypdf reads it</div>
              <EvidenceSnippet evidence={ota.evidence} />
            </div>
          </div>
        )}
        <ul className="mt-8 grid grid-cols-2 gap-x-8 gap-y-3 text-[14.5px] leading-relaxed text-ink-300">
          {[
            'Test conditions are not extracted: temperature, current density, areal capacity, protocol and cell type all change CE.',
            'Solvent fractions sit in a field named volume_percent, but papers give volume, weight or molar ratios.',
            '8 records list only RbNO3 as the salt, and 8 list no salt: the lithium salt was missed.',
            'The 2024 write-up counted 334 pairs; that was these 167 records loaded twice, now fixed. Its 46 matches with the PNAS dataset have not been rechecked.',
            'Extraction is not repeatable: Refs. 32 and 67 are the same PDF, as are 42 and 45, and each pair came back with different records. Re-running it will not give these exact records; the stored ones are the reference.',
            'The LLM answer can misread a passage. Its citations open the paper, and the cross-check flags values it could not find.',
            'The papers come from the reference list of one dataset (Kim et al., PNAS 2023), not a survey of the field. One PDF is a correction notice and one is off-topic; neither yielded records.',
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-ink-400" />
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="4 · Reproduce" title="Rebuild it yourself">
        <div className="glass rounded-[20px] px-6 py-3">
          <Command note="Front end and Python dependencies (Python 3.10+ for Claude models).">npm install && pip install -r requirements.txt</Command>
          <Command note="Recomputes the records, the source passages and the counts on this page. No keys, no network.">python scripts/export_records.py</Command>
          <Command note="Runs the whole page on the stored data, without a server or keys.">npm run dev → localhost:5173/?demo</Command>
          <Command note="Builds the graph from the extracted records. Needs the papers and the PNAS dataset workbook.">jupyter nbconvert --execute build_kg.ipynb</Command>
          <Command note="Starts the live server, then checks Neo4j, every model, retrieval and one question end to end.">python li_gpt_server.py · python check_live.py</Command>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={`${REPO}/blob/HEAD/REPRODUCE.md`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-kg px-4 py-2.5 text-[14.5px] font-semibold text-ink-950 transition hover:bg-kg-soft">
            Step-by-step guide <ExternalIcon />
          </a>
          <button type="button" onClick={() => onNavigate('data')} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-[14.5px] font-medium text-ink-100 transition hover:border-white/25">
            Browse the data <ArrowIcon />
          </button>
        </div>
      </Section>
    </div>
  );
}
