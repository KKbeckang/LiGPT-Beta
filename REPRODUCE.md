# Reproducing LithiumMind

This guide rebuilds LithiumMind from this repository, one step at a time. Each step says what it needs and what it should print, so you can tell whether it worked. Steps 1 and 2 need no keys, no GPU and no network. The later steps need the papers, Neo4j and API keys.

| Step | Needs | Gives |
|---|---|---|
| 1. Records and evidence | Python 3 (standard library only) | `src/data/records.json`, `src/data/papers.json`, the counts below |
| 2. Web page on stored data | Node 18 or later | the whole interface at `localhost:5173/?demo` |
| 3. Knowledge graph | Neo4j 5, the 71 PDFs, the PNAS dataset workbook | the graph the server queries |
| 4. Live server | OpenAI and/or Anthropic keys, Neo4j, the embedding models | live answers for any question |
| 5. Re-extraction (optional) | OpenAI key, a GPU is recommended | new `database/extracted_info/*.pkl` |

## 1. Records and evidence

```
python scripts/export_records.py
```

This reads the GPT-4 Turbo extractions in `database/extracted_info/` and the paper text stored in the Chroma database (`src/service/front_end/db/chroma.sqlite3`). For every record it then looks for the record's CE value in its own paper's text. It should print:

```
71 papers, 2212 text chunks
167 records, 150 with a CE value
CE value in its own paper: 117 as printed in text, 24 as a bare number next to the composition (tables), 9 not found
```

Each record gets an `evidence` entry:

- `found`: the value appears as printed, for example "99.52" or "99%". The passage and page are stored with it.
- `table`: the value is a whole number that appears bare in a chunk that also names the salt and solvents. This is how tables come out of pypdf.
- `missing`: the value was not found in the text. It may come from a figure, or the extraction may be wrong, so check it by hand.
- `no_value`: the extraction has no CE.

`database/papers.json` lists each paper's title, first author, journal, year and DOI. Most of this was read from the paper's first pages. Where pypdf lost the title, it came from a web search matched on the DOI, and the `metadata_from` field says which.

## 2. Web page on stored data

```
npm install
npm run dev
```

Open http://localhost:5173/?demo. The Data and How it works views use the stored records and work the same with or without a server. In demo mode the Ask view computes graph rows from the stored records, and the three example questions come with recorded LLM answers.

## 3. Knowledge graph

You need three things:

- The papers, saved as `database/papers/<ref>.pdf`. The numbering follows the References sheet of the dataset below, and `database/papers.json` gives the title and DOI for each number.
- `pnas.2214357120.sd01.xlsx` (Dataset S1 of Kim et al., PNAS 2023, [doi:10.1073/pnas.2214357120](https://doi.org/10.1073/pnas.2214357120)) in the repository root. It provides the salt and solvent properties and the paper titles.
- A Neo4j 5 database. Set `NEO4J_URI`, `NEO4J_USERNAME` and `NEO4J_PASSWORD` in the environment, or edit them in the notebook's first cell.

Then run:

```
jupyter nbconvert --to notebook --execute build_kg.ipynb
```

The graph should contain 167 Electrolyte nodes, each linked to its own paper. A graph built with the earlier version of the notebook has 334 Electrolyte nodes, and electrolytes linked to other papers that share their name. Step 4's check reports both problems.

## 4. Live server

Copy `.env.example` to `src/service/front_end/.env` and fill it in. `LLM_MODELS` lists the models the page offers, for example `openai:gpt-4-turbo,anthropic:claude-opus-5-5`. Retrieval uses OpenAI embeddings, so `OPENAI_API_KEY` is needed with either provider. Then:

```
cd src/service/front_end
python check_live.py
python li_gpt_server.py
```

`check_live.py` prints PASS or FAIL for each of these: the environment, the Neo4j connection and its contents, each model, the embeddings and retrieval, and one question end to end. When it passes, open http://localhost:5173/ without `?demo`.

## 5. Re-extraction (optional)

`langchain_extract_information.ipynb` repeats the extraction. It reads each PDF from `database/papers/`, drops the reference list, and splits the text into semantic chunks with MaterialsBERT. It then retrieves chunks for four questions (the electrolyte, its solvents, the CE and the test conditions) and asks GPT-4 Turbo to fill the schema. It skips any paper that already has a `.pkl` file, so move the stored files away first.

Do not expect the same records. Refs. 32 and 67 are the same PDF, as are Refs. 42 and 45, and each pair was extracted with different results. The stored files are the reference for everything else in the repository.

## Differences from the 2024 write-up

- The write-up reports 334 CE–electrolyte pairs. That figure came from the record loader in `build_kg.ipynb`, which added every record twice. The extraction holds 167 records: 164 unique and 147 unique with a CE value.
- The write-up's 46 matches with the PNAS dataset have not been rechecked.
- The 71 PDFs contain 69 distinct papers. One of them is a correction notice (Ref. 29) and one is off-topic (Ref. 40), and neither yielded records.
