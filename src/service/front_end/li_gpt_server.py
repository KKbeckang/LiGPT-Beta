from flask import Flask, request, jsonify, Response, stream_with_context
import os
from flask_cors import CORS
# Load environment variables

from query_kg import Neo4J_QA  # Import your Neo4J_QA class
from li_gpt import Li_gpt_base
from llm_providers import available_models, get_llm
app = Flask(__name__)
CORS(app)  # This enables CORS for all domains on all routes

# Li_gpt_base loads .env into os.environ, so create it before reading the Neo4j settings
li_gpt = Li_gpt_base()

# provider:model entries from LLM_MODELS; the first one is the default
models = available_models()

# Initialize your Neo4j QA class
neo4j_qa = Neo4J_QA(
    url=os.getenv('NEO4J_URI'),
    username=os.getenv('NEO4J_USERNAME', 'neo4j'),
    password=os.getenv('NEO4J_PASSWORD'),
    llm=get_llm(models[0]),
)


@app.route('/models', methods=['GET'])
def list_models():
    return jsonify({'models': models, 'default': models[0]})


@app.route('/process-data', methods=['POST'])
def handle_query():
    data = request.get_json()
    if 'query' not in data:
        return jsonify({'error': 'No query provided'}), 400
    query = data['query']
    model = data.get('model') or models[0]
    if model not in models:
        return jsonify({'error': f"Model {model!r} is not in LLM_MODELS ({', '.join(models)})"}), 400
    try:
        llm = get_llm(model)
        result = neo4j_qa.query(query, llm=llm)
        try:
            graph = neo4j_qa.subgraph(result['intermediate_steps'][1]['context'])
        except Exception as e:
            app.logger.warning('Could not read the result subgraph: %s', e)
            graph = None
        li_result, li_sources = li_gpt.answer_with_sources(query, llm=llm)

        return jsonify({

            'intermediary_steps': result['intermediate_steps'],
            'answer': result['result'],
            'li_gpt_answer': li_result,
            'li_gpt_sources': li_sources,
            'graph': graph,
            'model': model
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # The Werkzeug debugger can run code sent to it, so it stays off unless FLASK_DEBUG=1.
    app.run(debug=os.getenv('FLASK_DEBUG') == '1', port=8080)

            # 'intermediary_steps': result['intermediate_steps'],
            # 'answer': result['result']
