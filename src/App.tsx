import React, { useEffect } from "react";
import { useAppStore } from "./store/appStore";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { ChatInput } from "./components/ChatInput";
import "./App.css";

function App() {
  const { fetchChats, fetchConfig, sendMessage, isLoading } = useAppStore();

  useEffect(() => {
    fetchChats();
    fetchConfig();
  }, []);

  return (
    <div className="app">
      <Sidebar />
      <div className="main-content">
        <ChatView />
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}

export default App;
