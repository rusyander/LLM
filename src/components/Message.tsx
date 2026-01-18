import React from "react";
import { Message as MessageType } from "../types";
import { User, Bot } from "lucide-react";
import { format } from "date-fns";
import "./Message.css";

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.role === "user";
  const formattedTime = format(new Date(message.timestamp), "HH:mm");

  const renderContent = () => {
    // Parse code blocks
    const parts = message.content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.split("\n");
        const language = lines[0].replace("```", "").trim();
        const code = lines.slice(1, -1).join("\n");

        return (
          <pre key={index} className="code-block">
            {language && <div className="code-language">{language}</div>}
            <code>{code}</code>
          </pre>
        );
      }

      return (
        <div key={index} className="text-content">
          {part}
        </div>
      );
    });
  };

  return (
    <div className={`message ${isUser ? "user-message" : "assistant-message"}`}>
      <div className="message-icon">
        {isUser ? <User size={20} /> : <Bot size={20} />}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-role">{isUser ? "Вы" : "Ассистент"}</span>
          <span className="message-time">{formattedTime}</span>
        </div>
        <div className="message-text">{renderContent()}</div>
      </div>
    </div>
  );
};
