import { CautionIcon, LightningChargeIcon, SunIcon } from "../../constants";
import TextComponent from "./TextInput";
import useSendDataToFlask from "./hooks/useSendDataToFlask";
import React, { useState,useRef, useEffect  } from "react";
import UserIcon from "../../assets/user-logo.svg";  // Import user icon
import ChatGPTIcon from "../../assets/chatgpt-logo.svg";


const RightSection = () => {
  const { setInputString, response, error, isLoading } = useSendDataToFlask('');
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // Store messages here
  const messagesEndRef = useRef(null);

  const responseMessageIdRef = useRef(0);

  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (value) => {
    setInput(value);
  };

  const handleSubmit = () => {
    if (input.trim()) {
      responseMessageIdRef.current += 1;  // Increment the response message ID
      const newMessage = { type: 'user', text: input, id: responseMessageIdRef.current };
      setMessages([...messages, newMessage]);
      setInputString(input);
      setInput("");
      // Prepare a place for the response
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: 'chatgpt', text: '', id: responseMessageIdRef.current }
      ]);
    }
  };
  // When response is received, update messages to include the response
  useEffect(() => {
    if (response) {
      setMessages((prevMessages) => {
        const index = prevMessages.findIndex(msg => msg.id === responseMessageIdRef.current && msg.type === 'chatgpt');
        if (index !== -1) {
          const updatedMessages = [...prevMessages];
          updatedMessages[index].text += response;  // Append new response data
          return updatedMessages;
        }
        return prevMessages;
      });
    }
  }, [response]);
  return (
    <div className="flex h-full flex-1 flex-col md:pl-[260px]">
      <main className="relative h-full w-full transition-width flex flex-col overflow-hidden items-stretch flex-1">
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col items-center text-sm h-full md:h-screen bg-lightBlack">
            <div className="text-white w-full md:max-w-2xl lg:max-w-3xl md:h-full md:flex md:flex-col px-6 overflow-y-auto scrollbar-hide"  style={{ paddingBottom: '250px' }}>
            {messages.map((msg, index) => (
                <div key={index} className="flex flex-col items-start my-2 max-w-2/3 p-2 rounded-lg" >
                  <div className="flex items-center">
                {msg.type === 'chatgpt' && <img src={ChatGPTIcon} alt="ChatGPT Icon" className="h-6 w-6 mr-2 rounded-full ring-0.5 ring-white " />}
                  {msg.type === 'user' &&    <img src={UserIcon} alt="User Icon" className="h-6 w-6 mr-2 rounded-full ring-0.5 ring-white" />}
                    <h2 className="font-bold">{msg.type === 'user' ? 'You:' : 'Lithium-GPT:'}</h2>
                  </div>
                  <p className="text-sm mt-2">{msg.text}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
        <TextComponent
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          input={input}
        />
      </main>
    </div>
  );
};


export default RightSection;
