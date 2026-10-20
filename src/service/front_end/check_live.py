"""Checks the server's real dependencies one at a time and prints PASS or FAIL for each.

Run it where the server runs, with the same .env:
    cd src/service/front_end
    python check_live.py
    python check_live.py --model anthropic:claude-opus-5-5 --question "..."
"""
import argparse
import os
import sys
import time

DEFAULT_QUESTION = "Which LiFSI electrolytes reach the highest Coulombic efficiency?"
EXTRACTED_RECORDS = 167
results = []


def run(name, fn):
    start = time.time()
    try:
        detail = fn()
        results.append(True)
        print(f"PASS  {name} ({time.time() - start:.1f}s){': ' + detail if detail else ''}", flush=True)
    except Exception as e:
        results.append(False)
        print(f"FAIL  {name}: {type(e).__name__}: {e}", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--question", default=DEFAULT_QUESTION)
    parser.add_argument("--model", help="provider:model from LLM_MODELS for the end-to-end check (default: the first)")
    args = parser.parse_args()

    from li_gpt import Li_gpt_base
    if os.path.exists(".env"):
        Li_gpt_base.load_env_variables(None, ".env")
    from llm_providers import available_models, get_llm

    def environment():
        models = available_models()
        needed = ["OPENAI_API_KEY", "NEO4J_URI", "NEO4J_PASSWORD"]
        if any(m.startswith("anthropic:") for m in models):
            needed.append("ANTHROPIC_API_KEY")
        missing = [k for k in needed if not os.getenv(k) or os.getenv(k).startswith("your_")]
        if missing:
            raise RuntimeError("not set: " + ", ".join(missing))
        return "models " + ", ".join(models)

    def neo4j():
        from neo4j import GraphDatabase
        auth = (os.getenv("NEO4J_USERNAME", "neo4j"), os.environ["NEO4J_PASSWORD"])
        with GraphDatabase.driver(os.environ["NEO4J_URI"], auth=auth) as driver:
            driver.verify_connectivity()
            records, _, _ = driver.execute_query("MATCH (n) RETURN labels(n)[0] AS label, count(*) AS n")
            counts = {r["label"]: r["n"] for r in records}
            records, _, _ = driver.execute_query(
                "MATCH (e:Electrolyte)-[:CITED]->(r:Reference) "
                "WITH e, count(DISTINCT r.reference_id) AS papers WHERE papers > 1 RETURN count(e) AS n"
            )
            cross_linked = records[0]["n"]
        summary = ", ".join(f"{label} {n}" for label, n in sorted(counts.items(), key=lambda kv: str(kv[0])))
        problems = []
        if counts.get("Electrolyte", EXTRACTED_RECORDS) != EXTRACTED_RECORDS:
            problems.append(f"{counts['Electrolyte']} Electrolyte nodes for {EXTRACTED_RECORDS} extracted records")
        if cross_linked:
            problems.append(f"{cross_linked} electrolytes cite more than one paper")
        if problems:
            summary += " | rebuild the graph with build_kg.ipynb: " + "; ".join(problems)
        return summary

    run("environment", environment)
    run("Neo4j connection and graph contents", neo4j)
    for spec in available_models():
        run(f"model {spec}", lambda spec=spec: repr(get_llm(spec).invoke("Reply with the single word OK.").content.strip()[:40]))

    retriever = {}

    def retrieval():
        # Loads the embedding models (downloaded from Hugging Face the first time) and the Chroma store.
        retriever["li"] = li = Li_gpt_base()
        docs = li.compression_retriever.invoke(args.question)
        refs = sorted({li.describe_source(d)["ref"] for d in docs} - {None})
        return f"{len(docs)} passages from papers {refs[:10]} on {li.model_kwargs['device']}"

    def end_to_end():
        from query_kg import Neo4J_QA
        if "li" not in retriever:
            raise RuntimeError("skipped because retrieval failed")
        spec = args.model or available_models()[0]
        llm = get_llm(spec)
        qa = Neo4J_QA(url=os.getenv("NEO4J_URI"), username=os.getenv("NEO4J_USERNAME", "neo4j"), password=os.getenv("NEO4J_PASSWORD"), llm=llm)
        result = qa.query(args.question, llm=llm)
        cypher, context = result["intermediate_steps"][0]["query"], result["intermediate_steps"][1]["context"]
        graph = qa.subgraph(context)
        answer, sources = retriever["li"].answer_with_sources(args.question, llm=llm)
        first_line = cypher.strip().splitlines()[0] if cypher.strip() else "(empty)"
        return (f"{spec}: {len(context)} rows, subgraph {len(graph['nodes']) if graph else 0} nodes, {len(sources)} passages"
                f" | Cypher: {first_line[:80]} | answer: {answer[:100]!r}")

    run("embeddings and retrieval", retrieval)
    run("end to end", end_to_end)
    print(f"\n{sum(results)}/{len(results)} checks passed")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
