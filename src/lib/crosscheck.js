// Compare the knowledge-graph rows with the passages the RAG answer was built from.
// confirmed: the cited paper was retrieved and its text contains the CE value
// cited:     the paper was retrieved but the value does not appear in the passage
// missing:   no passage from that paper was retrieved
export function crossCheck(rows, sources) {
  const items = rows
    .filter((row) => row.ref != null)
    .map((row) => {
      const passages = sources.filter((s) => s.ref === row.ref);
      let status = 'missing';
      if (passages.length) {
        status = row.ce != null && passages.some((p) => mentionsValue(p.text, row.ce)) ? 'confirmed' : 'cited';
      }
      return { ref: row.ref, ce: row.ce, status };
    });
  const count = (status) => items.filter((i) => i.status === status).length;
  return { items, confirmed: count('confirmed'), cited: count('cited'), missing: count('missing') };
}

function mentionsValue(text, value) {
  const [whole, decimals = ''] = String(+value).split('.');
  const pattern = decimals ? `${whole}\\.${decimals}0*` : `${whole}(\\.0+)?`;
  return new RegExp(`(^|[^\\d.])${pattern}(?![\\d])`).test(text);
}
