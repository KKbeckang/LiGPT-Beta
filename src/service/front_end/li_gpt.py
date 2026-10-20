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
import logging
import os
from langchain_openai import ChatOpenAI

from langchain.retrievers.document_compressors import EmbeddingsFilter, DocumentCompressorPipeline
from langchain_community.document_transformers import EmbeddingsRedundantFilter, LongContextReorder
from langchain import hub

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
import warnings
warnings.filterwarnings("ignore")

# Copy of the rlm/rag-prompt prompt from the LangChain hub, used when the hub cannot be reached.
RAG_PROMPT = ChatPromptTemplate.from_messages([(
    "human",
    "You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. "
    "If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.\n"
    "Question: {question} \nContext: {context} \nAnswer:",
)])


def embedding_device():
    # Serving only embeds the question, so the CPU is enough when there is no GPU.
    if os.getenv("EMBEDDING_DEVICE"):
        return os.getenv("EMBEDDING_DEVICE")
    import torch
    return 'cuda:0' if torch.cuda.is_available() else 'cpu'


class Li_gpt_base:
    def __init__(self):
        self.load_env_variables(".env")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.db_dir = 'db'
        self.model_kwargs = {'device': embedding_device()}
        self.encode_kwargs = {'normalize_embeddings': True}

        self.setup_embeddings()
        self.configure_databases()
        self.initialize_retrievers()
        self.configure_pipeline()
        self.setup_llm()

    def load_env_variables(self, filename):
        with open(filename) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                key, value = line.split('=', 1)
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

    def rag_prompt(self):
        # Pulled once; the bundled copy is used if the hub is unreachable.
        if getattr(self, '_rag_prompt', None) is None:
            try:
                self._rag_prompt = hub.pull("rlm/rag-prompt")
            except Exception as e:
                logging.getLogger(__name__).warning("LangChain hub unavailable (%s); using the bundled rag prompt", e)
                self._rag_prompt = RAG_PROMPT
        return self._rag_prompt

    def run(self, context, question):
        prompt = self.rag_prompt()

        rag_chain = ({"context": self.compression_retriever | self.format_docs, "question": RunnablePassthrough()} | prompt | self.llm | StrOutputParser())
        return rag_chain

    @staticmethod
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    def generate_questions(self, questions):
        return self.run("filler context", "filler question").invoke(questions)

    def answer_with_sources(self, question, llm=None):
        """Answer like generate_questions, and also return the passages the answer was built from."""
        docs = self.compression_retriever.invoke(question)
        chain = self.rag_prompt() | (llm or self.llm) | StrOutputParser()
        answer = chain.invoke({"context": self.format_docs(docs), "question": question})
        return answer, [self.describe_source(doc) for doc in docs]

    @staticmethod
    def describe_source(doc):
        # Papers are stored as papers\<reference id>.pdf, with 0-based page numbers.
        name = doc.metadata.get('source', '').replace('\\', '/').rsplit('/', 1)[-1]
        ref = name.split('.')[0]
        page = doc.metadata.get('page')
        return {
            'ref': int(ref) if ref.isdigit() else None,
            'page': page + 1 if isinstance(page, int) else None,
            'text': doc.page_content,
        }

