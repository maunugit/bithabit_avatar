import React, { createContext, useContext, useEffect, useState } from "react";

const backendUrl = "http://localhost:3000";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [threadId, setThreadId] = useState(null);
  const [threads, setThreads] = useState([]);

  // Start a new thread when the component mounts
  // useEffect(() => {
  //   const startThread = async () => {
  //     try {
  //       const response = await fetch(`${backendUrl}/start`, {
  //         method: "POST",
  //       });

  //       if (!response.ok) {
  //         throw new Error(`HTTP status ${response.status}`);
  //       }

  //       const jsonResponse = await response.json();
  //       setThreadId(jsonResponse.thread_id);
  //     } catch (error) {
  //       console.error("Failed to start thread:", error);
  //     }
  //   };

  //   startThread();
  // }, []);
  useEffect(() => {
    const loadThreads = async () => {
      const fetchedThreads = await fetchThreads();
      setThreads(fetchedThreads);
      if (fetchedThreads.length > 0) {
        setThreadId(fetchedThreads[0]); // Set the most recent thread as default
      } else {
        startNewThread();
      }
    };
    loadThreads();
  }, []);
  
  const setThreadIdManually = (id) => {
    setThreadId(id);
    loadConversationHistory(id);
  };
  
  // Add this function if you want to load conversation history
  const loadConversationHistory = async (id) => {
    try {
      const response = await fetch(`${backendUrl}/messages/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
      const jsonResponse = await response.json();
      setMessages(jsonResponse.messages);
    } catch (error) {
      console.error("Failed to load conversation history:", error);
    }
  };
  const startNewThread = async () => {
    try {
      const response = await fetch(`${backendUrl}/start`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
      const jsonResponse = await response.json();
      setThreadId(jsonResponse.thread_id);
      setThreads(prevThreads => [...prevThreads, jsonResponse.thread_id]);
    } catch (error) {
      console.error("Failed to start thread:", error);
    }
  };

  const chat = async (userMessage) => {
    if (!threadId) {
      console.error('Thread ID not set.');
      return;
    }

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
        body: JSON.stringify({ message: userMessage, thread_id: threadId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }

      const jsonResponse = await response.json();
      console.log("Full JSON response:", jsonResponse);

      const aiMessage = {
        text: jsonResponse.reply,
        audio: jsonResponse.audio,
        author: 'ai'
      };

      setMessages((previousMessages) => [...previousMessages, aiMessage]);

      if (aiMessage.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${aiMessage.audio}`);
        audio.play();
        audio.onended = () => {
          setLoading(false);
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

  const fetchThreads = async () => {
    try {
      const response = await fetch(`${backendUrl}/threads`);
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
      const jsonResponse = await response.json();
      return jsonResponse.thread_ids;
    } catch (error) {
      console.error("Failed to fetch threads:", error);
      return [];
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
  useEffect(() => {
    setMessages([]); // Clear messages when thread changes
  }, [threadId]);

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
    threadId,
    setThreadId,
    threads,
    startNewThread,
    setThreadIdManually,
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
