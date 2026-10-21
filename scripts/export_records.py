"""Export the extracted CE records, with the place in each paper where the value appears.

Reads the GPT-4 Turbo extractions in database/extracted_info/*_hard.pkl and the paper text chunks in
the Chroma store, and writes the JSON files the web page uses:

  src/data/records.json  one entry per extracted record: composition, CE and evidence
  src/data/papers.json   one entry per paper: metadata from database/papers.json plus counts

database/papers.json holds each paper's title, first author, journal, year and DOI, read from the
paper's first pages (or, where pypdf lost the title, from a web search matched on the DOI).

Evidence is the text chunk of the record's own paper in which its CE value appears verbatim,
preferring chunks that also name the record's salts and solvents. A value with no such chunk is
marked "missing": it may sit in a figure or table that the PDF text extraction lost, or the
extraction may be wrong, so it needs checking by hand.

Needs only the Python standard library; no API keys, no network.

    python scripts/export_records.py
"""

import argparse
import json
import pickle
import re
import sqlite3
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SNIPPET = 260  # characters of context around the matched value


def load_records(records_dir):
    """Records in paper order, as build_kg.ipynb loads them (each record once)."""
    records = []
    files = sorted(Path(records_dir).glob('*_hard.pkl'), key=lambda p: int(p.name.split('_')[0]))
    for path in files:
        ref = int(path.name.split('_')[0])
        with open(path, 'rb') as f:
            data = pickle.load(f)['data']
        for i, item in enumerate(data if isinstance(data, list) else [data]):
            electrolyte = item.get('electrolyte', {})
            salts = [{'name': s['salt'].split(' ')[0], 'mol': s.get('mol_L') or None}
                     for s in electrolyte.get('salt_list', []) if s.get('salt')]
            solvents = [{'name': s['solvent'].split(' ')[0], 'frac': s.get('volume_percent') or None}
                        for s in electrolyte.get('solvent_list', []) if s.get('solvent')]
            records.append({'id': f'{ref}-{i + 1}', 'ref': ref, 'ce': item.get('ce'),
                            'salts': salts, 'solvents': solvents})
    return records


def load_chunks(db_path):
    """Text chunks per paper, deduplicated (the store holds one collection per embedding model)."""
    con = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    rows = con.execute("""
        SELECT src.string_value, page.int_value, doc.string_value
        FROM embedding_metadata doc
        JOIN embedding_metadata src ON src.id = doc.id AND src.key = 'source'
        JOIN embedding_metadata page ON page.id = doc.id AND page.key = 'page'
        WHERE doc.key = 'chroma:document'
        ORDER BY doc.id""")
    chunks = defaultdict(list)
    seen = set()
    for source, page, text in rows:
        ref = int(re.search(r'(\d+)\.pdf', source).group(1))
        text = re.sub(r'\s+', ' ', text).strip()
        if (ref, text) in seen:
            continue
        seen.add((ref, text))
        chunks[ref].append({'page': page + 1, 'text': text})
    con.close()
    return chunks


def ce_patterns(ce):
    """Regexes for a CE value as papers print it: an exact one (99.52 matches "99.52" and "99.520",
    99.0 matches "99%" and "99.0") and, for whole numbers, a loose one for the bare number as tables print it."""
    whole, _, decimals = f'{ce:.4f}'.rstrip('0').rstrip('.').partition('.')
    if decimals:
        return re.compile(rf'(?<![\d.]){whole}\.{decimals}0*(?!\d)'), None
    return (re.compile(rf'(?<![\d.]){whole}(?:\.0+\s?%|\s?%)'),
            re.compile(rf'(?<![\d.]){whole}(?![\d.])'))


def snippet(text, start, end):
    """A window of text around [start, end), cut at word boundaries, with the match offsets inside it."""
    left = max(0, start - SNIPPET // 2)
    right = min(len(text), end + SNIPPET // 2)
    if left > 0 and text.find(' ', left, start) != -1:
        left = text.find(' ', left, start) + 1
    if right < len(text) and text.rfind(' ', end, right) != -1:
        right = text.rfind(' ', end, right)
    prefix = '…' if left > 0 else ''
    suffix = '…' if right < len(text) else ''
    offset = len(prefix) - left
    return {'text': prefix + text[left:right] + suffix, 'match': [start + offset, end + offset]}


def best_match(pattern, chunks, names, anchor=None, min_named=0):
    """The chunk where pattern matches, preferring chunks that name more of the composition, then earlier pages.
    With an anchor (the salt name), only matches after its first mention count, which picks the right
    row when a table prints the same number for several electrolytes."""
    best = None
    for chunk in chunks:
        lower = chunk['text'].lower()
        named = [n for n in names if n.lower() in lower]
        if len(named) < min_named:
            continue
        start = 0
        if anchor:
            start = lower.find(anchor.lower())
            if start == -1:
                continue
        m = pattern.search(chunk['text'], start)
        if m and (best is None or (len(named), -chunk['page']) > best[0]):
            best = ((len(named), -chunk['page']), chunk, m, named)
    return best


def find_evidence(record, chunks):
    """found: the value appears as printed in text ("99.2", "99%").
    table: a whole-number value appears bare in a chunk that names the salt and solvents, as tables print it.
    missing: neither; no_value: the extraction has no CE."""
    if record['ce'] is None:
        return {'status': 'no_value'}
    exact, loose = ce_patterns(record['ce'])
    names = [s['name'] for s in record['salts'] + record['solvents']]
    status, best = 'found', best_match(exact, chunks, names)
    if best is None and loose:
        anchor = record['salts'][0]['name'] if record['salts'] else None
        status, best = 'table', best_match(loose, chunks, names, anchor, min_named=min(2, len(names)))
    if best is None:
        return {'status': 'missing'}
    _, chunk, m, named = best
    return {'status': status, 'page': chunk['page'], 'names': named, **snippet(chunk['text'], m.start(), m.end())}


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    parser.add_argument('--records', default=ROOT / 'database' / 'extracted_info')
    parser.add_argument('--papers', default=ROOT / 'database' / 'papers.json')
    parser.add_argument('--db', default=ROOT / 'src' / 'service' / 'front_end' / 'db' / 'chroma.sqlite3')
    parser.add_argument('--out', default=ROOT / 'src' / 'data')
    args = parser.parse_args()

    records = load_records(args.records)
    chunks = load_chunks(args.db)
    for record in records:
        record['evidence'] = find_evidence(record, chunks.get(record['ref'], []))

    meta = {p['ref']: p for p in json.loads(Path(args.papers).read_text())} if Path(args.papers).exists() else {}
    papers = []
    for ref in sorted(set(chunks) | {r['ref'] for r in records}):
        own = [r for r in records if r['ref'] == ref]
        papers.append({
            'ref': ref,
            **{k: meta.get(ref, {}).get(k) for k in ('title', 'first_author', 'journal', 'year', 'doi', 'note')},
            'pages': max((c['page'] for c in chunks.get(ref, [])), default=0),
            'chunks': len(chunks.get(ref, [])),
            'records': len(own),
            'traced': sum(r['evidence']['status'] in ('found', 'table') for r in own),
        })

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / 'records.json').write_text(json.dumps(records, indent=1) + '\n')
    (out / 'papers.json').write_text(json.dumps(papers, indent=1) + '\n')

    count = lambda status: sum(r['evidence']['status'] == status for r in records)
    print(f'{len(papers)} papers, {sum(len(c) for c in chunks.values())} text chunks')
    print(f'{len(records)} records, {len(records) - count("no_value")} with a CE value')
    print(f'CE value in its own paper: {count("found")} as printed in text, {count("table")} as a bare number '
          f'next to the composition (tables), {count("missing")} not found')
    print(f'wrote {out / "records.json"} and {out / "papers.json"}')


if __name__ == '__main__':
    main()
