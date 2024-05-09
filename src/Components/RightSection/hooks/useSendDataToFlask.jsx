
import { useState, useEffect } from 'react';
import axios from 'axios';

function useSendDataToFlask(initialInput) {
    const [inputString, setInputString] = useState(initialInput);
    const [response, setResponse] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const sendData = async () => {
            if (!inputString) return; // Exit if no input
            setIsLoading(true);
            try {
                const response = await axios.post('http://localhost:8080/process-data', {
                    query: inputString
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                setResponse(response.data.answer);
                console.log(response.data)
            } catch (error) {
                setError('Error processing data: ' + error);
            } finally {
                setIsLoading(false);
            }
        };

        sendData();
    }, [inputString]); // Effect depends on `inputString`

    return { setInputString, response, error, isLoading };
}

export default useSendDataToFlask;
