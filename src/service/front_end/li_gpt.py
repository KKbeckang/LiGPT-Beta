import chromadb
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_openai import OpenAIEmbeddings
from langchain.retrievers import (
    ContextualCompressionRetriever,
    # DocumentCompressorPipeline,
    MergerRetriever,
)
from langchain_chroma import Chroma
from langchain_community.document_transformers import (
    EmbeddingsClusteringFilter,
    EmbeddingsRedundantFilter,
)
import os
from langchain_openai import ChatOpenAI

from langchain.retrievers.document_compressors import EmbeddingsFilter, DocumentCompressorPipeline
from langchain_community.document_transformers import EmbeddingsRedundantFilter, LongContextReorder
from langchain import hub

from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
import warnings
warnings.filterwarnings("ignore")


class Li_gpt_base:
    def __init__(self):
        self.load_env_variables(".env")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.db_dir = 'db'
        self.model_kwargs = {'device': 'cuda:0'}
        self.encode_kwargs = {'normalize_embeddings': True}

        self.setup_embeddings()
        self.configure_databases()
        self.initialize_retrievers()
        self.configure_pipeline()
        self.setup_llm()

    def load_env_variables(self, filename):
        with open(filename) as f:
            for line in f:
                key, value = line.strip().split('=')
                os.environ[key] = value

    def setup_embeddings(self):
        self.material_embedding = HuggingFaceEmbeddings(model_name="pranav-s/MaterialsBERT", model_kwargs=self.model_kwargs, encode_kwargs=self.encode_kwargs)
        self.bio_embedding = HuggingFaceEmbeddings(model_name="dmis-lab/biobert-v1.1", model_kwargs=self.model_kwargs, encode_kwargs=self.encode_kwargs)
        self.filter_embeddings = OpenAIEmbeddings()

    def configure_databases(self):
        client_settings = chromadb.config.Settings(
            is_persistent=True,
            persist_directory=self.db_dir,
            anonymized_telemetry=False
        )
        self.db_material = Chroma(
            collection_name="project_store_material",
            persist_directory=self.db_dir,
            client_settings=client_settings,
            embedding_function=self.material_embedding,
        )

        self.db_bio = Chroma(
            collection_name="project_store_bio",
            persist_directory=self.db_dir,
            client_settings=client_settings,
            embedding_function=self.bio_embedding,
        )

    def initialize_retrievers(self):
        retriever_all = self.db_material.as_retriever(search_type="mmr", search_kwargs={"k": 10})
        retriever_multi_qa = self.db_bio.as_retriever(search_type="mmr", search_kwargs={"k": 10})
        self.lotr = MergerRetriever(retrievers=[retriever_all, retriever_multi_qa])

    def configure_pipeline(self):
        redundent_filter = EmbeddingsRedundantFilter(embeddings=self.filter_embeddings)
        reordering = LongContextReorder()
        pipeline = DocumentCompressorPipeline(transformers=[redundent_filter, reordering])
        self.compression_retriever = ContextualCompressionRetriever(base_compressor=pipeline, base_retriever=self.lotr)

    def setup_llm(self):
        self.llm = ChatOpenAI(model_name="gpt-4-turbo", temperature=0, api_key=self.openai_api_key)

    def run(self, context, question):
        prompt = hub.pull("rlm/rag-prompt")

        rag_chain = ({"context": self.compression_retriever | self.format_docs, "question": RunnablePassthrough()} | prompt | self.llm | StrOutputParser())
        return rag_chain

    @staticmethod
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    def generate_questions(self, questions):
        for chunk in self.run("filler context", "filler question").stream(questions):
            print(chunk, end="", flush=True)


def __main__():
    li_gpt = Li_gpt_base()
    li_gpt.generate_questions("Can you provide some electrolyte and with corresponding Coulombic efficiency of 99.5?")


if __name__ == "__main__":
    __main__()
