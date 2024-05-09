# from flask import Flask, jsonify
# import nbformat

# app = Flask(__name__)

# @app.route('/run-notebook', methods=['GET'])

# if __name__ == '__main__':
#     app.run(debug=True, port=8080)
from flask import Flask, request, jsonify
import nbformat
from nbconvert.preprocessors import ExecutePreprocessor
from flask_cors import CORS
import os
app = Flask(__name__)
CORS(app)  # This enables CORS for all domains on all routes

# @app.route('/process-data', methods=['POST'])
# def process_data_route():
#     # Get JSON data from the request
#     data = request.get_json()
#     input_string = data['input_string']
    
#     # Assuming you have some function to process the input_string
#     result = process_data(input_string)
    
#     # Return the processed data
#     return jsonify(result=result)

# def process_data(input_string):
#     # Here you can have the logic that was initially in your Jupyter notebook
#     reversed_string = input_string[::-1]
#     response_message = f"The reversed string is: {reversed_string}"
#     return response_message



def get_notebook_function(nb_path, func_name):
    with open(nb_path, 'r', encoding='utf-8') as file:
        nb = nbformat.read(file, as_version=4)
    
    # Execute the notebook
    ep = ExecutePreprocessor(timeout=600, kernel_name='python3')
    ep.preprocess(nb, {'metadata': {'path': os.path.dirname(nb_path)}})

    # Extract the function from the executed notebook
    exec_env = {}
    for cell in nb.cells:
        if cell.cell_type == 'code':
            exec(cell.source, exec_env)
    return exec_env[func_name]

@app.route('/process-data', methods=['POST'])
def process():
    data = request.get_json()
    input_string = data.get('input_string', '')

    # Load and execute the function from the notebook
    func = get_notebook_function('dummy_notebook.ipynb', 'process_data')
    result = func(input_string)

    return jsonify(result=result)

if __name__ == '__main__':
    app.run(debug=True, port=8080)
