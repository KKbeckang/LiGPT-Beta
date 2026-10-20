from langchain.chains import GraphCypherQAChain
from langchain_community.graphs import Neo4jGraph
from langchain_openai import ChatOpenAI
import os

# The electrolytes in a result with their salts, solvents and papers (one Reference node per page,
# so papers are collapsed by reference_id). Rows are matched on name and CE, since names repeat.
SUBGRAPH_QUERY = """
UNWIND $rows AS row
MATCH (e:Electrolyte {name: row.name})
WHERE row.ce IS NULL OR e.coulombic_efficiency = row.ce
WITH DISTINCT e LIMIT 25
OPTIONAL MATCH (e)-[m:MOL_L]->(salt:Salt)
WITH e, collect(DISTINCT {name: salt.name, mol: m.MOL_L}) AS salts
OPTIONAL MATCH (e)-[v:VOLUME]->(sol:Solvent)
WITH e, salts, collect(DISTINCT {name: sol.name, volume: v.volume}) AS solvents
OPTIONAL MATCH (e)-[:CITED]->(r:Reference)
WITH e, salts, solvents, collect(DISTINCT {ref: r.reference_id, title: r.title}) AS refs
RETURN elementId(e) AS id, e.name AS name, e.coulombic_efficiency AS ce, salts, solvents, refs
"""


def result_rows(context):
    '''Electrolyte name and CE of each row the Cypher chain returned, whatever the column aliases.'''
    rows = []
    for row in context:
        name = next((v for k, v in row.items() if isinstance(v, str) and ('name' in k.lower() or 'electrolyte' in k.lower())), None)
        if name is None:
            continue
        ce = next((v for k, v in row.items() if isinstance(v, (int, float)) and not isinstance(v, bool)
                   and ('coulombic' in k.lower() or 'efficiency' in k.lower() or k.lower().split('.')[-1] == 'ce')), None)
        rows.append({'name': name, 'ce': ce})
    return rows


def to_graph(records):
    '''Nodes and links for the front end from SUBGRAPH_QUERY records.'''
    nodes, links, seen = [], [], set()

    def add(node):
        if node['id'] not in seen:
            seen.add(node['id'])
            nodes.append(node)

    for rec in records:
        add({'id': rec['id'], 'label': 'Electrolyte', 'name': rec['name'], 'ce': rec['ce']})
        for salt in rec['salts']:
            if salt.get('name') is not None:
                add({'id': f"salt:{salt['name']}", 'label': 'Salt', 'name': salt['name']})
                links.append({'source': rec['id'], 'target': f"salt:{salt['name']}", 'type': 'MOL_L', 'value': salt.get('mol')})
        for solvent in rec['solvents']:
            if solvent.get('name') is not None:
                add({'id': f"solvent:{solvent['name']}", 'label': 'Solvent', 'name': solvent['name']})
                links.append({'source': rec['id'], 'target': f"solvent:{solvent['name']}", 'type': 'VOLUME', 'value': solvent.get('volume')})
        for ref in rec['refs']:
            if ref.get('ref') is not None:
                title = ref.get('title') if isinstance(ref.get('title'), str) else None
                add({'id': f"ref:{ref['ref']}", 'label': 'Reference', 'ref': ref['ref'], 'title': title})
                links.append({'source': rec['id'], 'target': f"ref:{ref['ref']}", 'type': 'CITED'})
    return {'nodes': nodes, 'links': links}


class Neo4J_QA:
    def __init__(self, url = '', username = 'neo4j', password = '', openai_api_key = None, QA_model = "gpt-4-turbo", llm = None):
        if llm is None:
            if openai_api_key is None:
                openai_api_key = os.getenv('OPENAI_API_KEY')
                if openai_api_key is None:
                    raise ValueError("OpenAI API key is required. Please provide it as an argument or set it as an environment variable")
            llm = ChatOpenAI(api_key=openai_api_key, model=QA_model,temperature=0)
        self.graph = Neo4jGraph(
            url=url,
            username=username,
            password=password,
            enhanced_schema=True,
        )
        self.llm = llm
        self.chains = {}

    def chain_for(self, llm):
        # One chain per chat model, so each request can pick its model.
        if id(llm) not in self.chains:
            self.chains[id(llm)] = GraphCypherQAChain.from_llm(
                llm, graph=self.graph, verbose=True, top_k=3, return_intermediate_steps=True
            )
        return self.chains[id(llm)]

    def subgraph(self, context):
        '''Graph around the electrolytes in a result, read from Neo4j; None when the rows name none.'''
        rows = result_rows(context)
        if not rows:
            return None
        return to_graph(self.graph.query(SUBGRAPH_QUERY, {"rows": rows}))

    def query(self, query, llm = None):
        '''
        The result has 2 keys: 'intermediate_steps' and 'result'.
        'intermediate_steps' is a list of the intermediary steps taken by the model to arrive at the answer.
        '''
        result = self.chain_for(llm or self.llm).invoke({"query": query})
        return result


