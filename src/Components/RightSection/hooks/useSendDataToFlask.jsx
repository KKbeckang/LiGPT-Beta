
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
                const response = await fetch('http://localhost:8080/process-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ query: inputString })
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                reader.read().then(function processText({ done, value }) {
                    if (done) {
                        setIsLoading(false);
                        return;
                    }

                    // Update the response state with each chunk
                    setResponse((prevResponse) => prevResponse + decoder.decode(value, { stream: true }));
                    return reader.read().then(processText);
                });

            } catch (error) {
                setError('Error processing data: ' + error.message);
                setIsLoading(false);
            }
        };

        sendData();
    }, [inputString]); // Effect depends on `inputString`


    return { setInputString, response, error, isLoading };
}

export default useSendDataToFlask;
