"""Chat models the server can answer with, chosen per request.

LLM_MODELS lists them as provider:model entries, the first being the default, e.g.
    LLM_MODELS=openai:gpt-4-turbo,anthropic:claude-opus-5-5
"""
import os
from functools import lru_cache
from typing import Any, List, Optional

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, SystemMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_openai import ChatOpenAI

DEFAULT_MODELS = 'openai:gpt-4-turbo'
PROVIDERS = ('openai', 'anthropic')

# Claude models that take the server-side refusal fallback ("fallbacks": "default").
FALLBACK_MODELS = {'claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'}
FALLBACK_BETA = 'server-side-fallback-2026-07-01'


def available_models():
    raw = os.getenv('LLM_MODELS') or DEFAULT_MODELS
    models = [m.strip() for m in raw.split(',') if m.strip()]
    for spec in models:
        provider, _, name = spec.partition(':')
        if provider not in PROVIDERS or not name:
            raise ValueError(f"LLM_MODELS entry {spec!r} should look like openai:<model> or anthropic:<model>")
    return models


@lru_cache(maxsize=None)
def get_llm(spec):
    provider, _, model = spec.partition(':')
    if provider == 'openai':
        # Reasoning models only accept temperature 1; set OPENAI_TEMPERATURE=1 for those.
        temperature = float(os.getenv('OPENAI_TEMPERATURE', '0'))
        return ChatOpenAI(model=model, temperature=temperature, api_key=os.getenv('OPENAI_API_KEY'))
    if provider == 'anthropic':
        return ClaudeChat(model=model, effort=os.getenv('ANTHROPIC_EFFORT') or None)
    raise ValueError(f'Unknown provider in {spec!r}')


class ClaudeChat(BaseChatModel):
    """LangChain chat model that calls Claude through the official Anthropic SDK.

    No sampling parameters are sent: current Claude models reject temperature/top_p, and their
    thinking is adaptive by default, so only the text blocks of the response are returned.
    """

    model: str
    max_tokens: int = 16000
    effort: Optional[str] = None
    client: Any = None

    @property
    def _llm_type(self) -> str:
        return 'anthropic-messages'

    def _generate(self, messages: List[BaseMessage], stop: Optional[List[str]] = None, run_manager: Any = None, **kwargs: Any) -> ChatResult:
        if self.client is None:
            import anthropic

            self.client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY
        system = '\n\n'.join(m.content for m in messages if isinstance(m, SystemMessage))
        turns = [
            {'role': 'assistant' if isinstance(m, AIMessage) else 'user', 'content': m.content}
            for m in messages
            if not isinstance(m, SystemMessage)
        ]
        params = {'model': self.model, 'max_tokens': self.max_tokens, 'messages': turns}
        if system:
            params['system'] = system
        if stop:
            params['stop_sequences'] = stop
        if self.effort:
            params['output_config'] = {'effort': self.effort}
        if self.model in FALLBACK_MODELS:
            response = self.client.beta.messages.create(betas=[FALLBACK_BETA], fallbacks='default', **params)
        else:
            response = self.client.messages.create(**params)
        if response.stop_reason == 'refusal':
            category = response.stop_details.category if response.stop_details else None
            raise RuntimeError(f'{self.model} declined the request (refusal category: {category})')
        text = ''.join(block.text for block in response.content if block.type == 'text')
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))], llm_output={'model': response.model})
