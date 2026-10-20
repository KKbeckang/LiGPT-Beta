from flask import Flask, request, jsonify, Response, stream_with_context
import os
from flask_cors import CORS
# Load environment variables

from query_kg import Neo4J_QA  # Import your Neo4J_QA class
from li_gpt import Li_gpt_base
app = Flask(__name__)
CORS(app)  # This enables CORS for all domains on all routes

# Li_gpt_base loads .env into os.environ, so create it before reading the Neo4j settings
li_gpt = Li_gpt_base()

# Initialize your Neo4j QA class (the OpenAI key is read from OPENAI_API_KEY)
neo4j_qa = Neo4J_QA(
    url=os.getenv('NEO4J_URI'),
    username=os.getenv('NEO4J_USERNAME', 'neo4j'),
    password=os.getenv('NEO4J_PASSWORD'),
)


@app.route('/process-data', methods=['POST'])
def handle_query():
    data = request.get_json()
    if 'query' not in data:
        return jsonify({'error': 'No query provided'}), 400
    query = data['query']
    try:
        
        result = neo4j_qa.query(query)
        li_result = li_gpt.generate_questions(query)

        return jsonify({
            
            'intermediary_steps': result['intermediate_steps'],
            'answer': result['result'],
            'li_gpt_answer': li_result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8080)

            # 'intermediary_steps': result['intermediate_steps'],
            # 'answer': result['result']