from langchain.chains import GraphCypherQAChain
from langchain_community.graphs import Neo4jGraph
from langchain_openai import ChatOpenAI
import os
class Neo4J_QA:
    def __init__(self, url = '', username = 'neo4j', password = '', openai_api_key = None, QA_model = "gpt-4"):
        if openai_api_key is None:
            openai_api_key = os.getenv('OPENAI_API_KEY')
            if openai_api_key is None:
                raise ValueError("OpenAI API key is required. Please provide it as an argument or set it as an environment variable")
        self.graph = Neo4jGraph(
            url=url,
            username=username,
            password=password,
            enhanced_schema=True,
        )
        self.chain = GraphCypherQAChain.from_llm(
            ChatOpenAI(api_key=openai_api_key, model=QA_model,temperature=0), graph=self.graph, verbose=True, top_k=3, return_intermediate_steps=True
        )

    def query(self, query):
        '''
        The result has 2 keys: 'intermediate_steps' and 'result'.
        'intermediate_steps' is a list of the intermediary steps taken by the model to arrive at the answer.
        '''
        result = self.chain.invoke({"query": query})
        return result
    

