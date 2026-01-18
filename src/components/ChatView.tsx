import React, { useEffect, useRef } from "react";
import { useAppStore } from "../store/appStore";
import { Message } from "./Message";
import { Loader } from "lucide-react";
import "./ChatView.css";

export const ChatView: React.FC = () => {
  const { messages, isLoading, currentChatId } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!currentChatId) {
    return (
      <div className="chat-view-empty">
        <div className="empty-message">
          <h2>Выберите чат или создайте новый</h2>
          <p>Начните разговор с AI ассистентом</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-view">
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-message">
            <h3>Начните разговор</h3>
            <p>Задайте вопрос или опишите задачу</p>
          </div>
        ) : (
          messages.map((message) => (
            <Message key={message.id} message={message} />
          ))
        )}

        {isLoading && (
          <div className="loading-indicator">
            <Loader className="spinner-icon" size={24} />
            <span>Генерация ответа...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
