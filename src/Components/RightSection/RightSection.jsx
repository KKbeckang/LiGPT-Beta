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
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (value) => {
    setInput(value);
  };

  const handleSubmit = () => {
    if (input.trim()) {
      const newMessages = [...messages, { type: 'user', text: input }];
      setMessages(newMessages);
      setInputString(input); // Send input to Flask and reset input field
      setInput("");
    }
  };

  // When response is received, update messages to include the response
  useEffect(() => {
    if (response) {
      const { li_gpt_answer, intermediary_steps, answer } = response;
      const formattedResponse = `
        Lithium-GPT Answer:\n${li_gpt_answer}\n\n
        Intermediary Steps:\n${intermediary_steps}\n\n
        KnowLedge Graph Answer:\n${answer}
      `;
      const newMessages = [...messages, { type: 'chatgpt', text: formattedResponse }];
      setMessages(newMessages);
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
              {msg.type === 'user' && <img src={UserIcon} alt="User Icon" className="h-6 w-6 mr-2 rounded-full ring-0.5 ring-white" />}
                <h2 className="font-bold">{msg.type === 'user' ? 'You:' : 'Lithium-GPT:'}</h2>
              </div>
              <p className="text-sm mt-2" dangerouslySetInnerHTML={{ __html: msg.text.split("\n").join("<br/>") }}></p>
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
