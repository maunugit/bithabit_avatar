import { useRef } from "react";
import { useChat } from "../hooks/useChat";

export const UI = ({ hidden, ...props }) => {
  const input = useRef();
  const {
    chat,
    loading,
    cameraZoomed,
    setCameraZoomed,
    message,
    startVoiceRecognition,
    selectedLanguage,
    setSelectedLanguage,
    messages,
  } = useChat();

  const sendMessage = () => {
    const text = input.current.value;
    if (!loading && !message) {
      chat(text);
      input.current.value = "";
    }
  };

  const handleLanguageChange = (event) => {
    setSelectedLanguage(event.target.value);
  };

  if (hidden) {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex flex-col justify-between p-4 pointer-events-none">
        <div className="self-start backdrop-blur-md bg-white bg-opacity-50 p-4 rounded-lg">
          <h1 className="font-black text-xl">BitHabit</h1>
          <p>BitHabit Avatar</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-2 w-full max-w-md mx-auto mb-4">
            <div className="flex items-center gap-2 w-full">
              <input
                className="w-full placeholder:text-gray-800 placeholder:italic p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md"
                placeholder="Type a message..."
                ref={input}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
              />
              <button
                disabled={loading || message}
                onClick={sendMessage}
                className={`bg-pink-500 hover:bg-pink-600 text-white p-4 px-10 font-semibold uppercase rounded-md ${
                  loading || message ? "cursor-not-allowed opacity-30" : ""
                }`}
              >
                Send
              </button>
            </div>
            <div className="flex items-center gap-2 w-full mt-2">
              <select
                onChange={handleLanguageChange}
                value={selectedLanguage}
                className="p-2 rounded-md bg-opacity-50 bg-white backdrop-blur-md"
              >
                <option value="en-US">English</option>
                <option value="fi-FI">Finnish</option>
              </select>
              <button
                onClick={startVoiceRecognition}
                className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md"
              >
                🎙 Speak
              </button>
            </div>
          </div>
        </div>
        <div className="w-full flex justify-end gap-4 mb-4">
          <button
            onClick={() => setCameraZoomed(!cameraZoomed)}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md"
          >
            {cameraZoomed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              const body = document.querySelector("body");
              if (body.classList.contains("greenScreen")) {
                body.classList.remove("greenScreen");
              } else {
                body.classList.add("greenScreen");
              }
            }}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 004.5 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </button>
        </div>
      </div>
      {/* Chat History */}
      <div className="fixed top-24 right-20 bottom-20 w-96 bg-white bg-opacity-50 backdrop-blur-md rounded-lg p-4 overflow-y-auto shadow-lg z-10">
        <h2 className="text-xl font-bold mb-4">Chat History</h2>
        {messages.map((msg, index) => (
          <div key={index} className="mb-2">
            <div className={`p-2 rounded-md ${msg.author === 'ai' ? 'bg-blue-100 text-left' : 'bg-green-100 text-right'}`}>
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
