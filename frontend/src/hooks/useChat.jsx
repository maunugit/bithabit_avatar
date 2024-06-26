import React, { createContext, useContext, useEffect, useState } from "react";

const backendUrl = "http://localhost:3000";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");

  const chat = async (userMessage) => {
    setLoading(true);
    // Add the user's message to the messages state
    setMessages((previousMessages) => [
      ...previousMessages,
      { text: userMessage, author: 'user' },
    ]);

    try {
      const response = await fetch(`${backendUrl}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }

      const jsonResponse = await response.json();
      console.log("Full JSON response:", jsonResponse);

      const aiMessage = {
        text: jsonResponse.reply,
        audio: jsonResponse.audio,
        animation: jsonResponse.animation,
        facialExpression: jsonResponse.facialExpression,
        author: 'ai'
      };

      setMessages((previousMessages) => [...previousMessages, aiMessage]);

      if (aiMessage.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${aiMessage.audio}`);
        audio.play();
        audio.onended = () => {
          setLoading(false);
          // Reset avatar state or perform any other necessary cleanup
          setMessage(null);
        };
      } else {
        setLoading(false);
        setMessage(null);
      }
    } catch (error) {
      console.error("Failed to chat:", error);
      setLoading(false);
    }
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLanguage;
    recognition.start();

    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      chat(transcript); // use transcript as input and submit
    };

    recognition.onerror = function(event) {
      console.error('Speech recognition error', event.error);
    };
  };

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[messages.length - 1]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        setMessage,
        messages,
        setMessages,
        loading,
        setLoading,
        cameraZoomed,
        setCameraZoomed,
        startVoiceRecognition,
        selectedLanguage,
        setSelectedLanguage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
