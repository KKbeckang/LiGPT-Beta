from flask import Flask, request, jsonify, Response, stream_with_context
import os
from flask_cors import CORS
# Load environment variables

from query_kg import Neo4J_QA  # Import your Neo4J_QA class
from li_gpt import Li_gpt_base
app = Flask(__name__)
CORS(app)  # This enables CORS for all domains on all routes

# Initialize your Neo4j QA class
neo4j_qa = Neo4J_QA(
    url='',
    username='',
    password='',
    openai_api_key=''
)

li_gpt = Li_gpt_base()


@app.route('/process-data', methods=['POST'])
def handle_query():
    data = request.get_json()
    if 'query' not in data:
        return jsonify({'error': 'No query provided'}), 400
    query = data['query']
    try:
        
        
        li_result = li_gpt.generate_questions(query)
        result = neo4j_qa.query(query)
        
        return jsonify({
            'li_gpt-answer': li_result,
            'intermediary_steps': result['intermediate_steps'],
            'answer': result['result']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8080)

            # 'intermediary_steps': result['intermediate_steps'],
            # 'answer': result['result']