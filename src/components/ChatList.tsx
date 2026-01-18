import React from "react";
import { Chat } from "../types";
import { MessageSquare, Trash2 } from "lucide-react";
import { format } from "date-fns";
import "./ChatList.css";

interface ChatListProps {
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  currentChatId,
  onSelectChat,
  onDeleteChat,
}) => {
  return (
    <div className="chat-list">
      {chats.length === 0 ? (
        <div className="empty-state">
          <MessageSquare size={48} />
          <p>Нет чатов</p>
        </div>
      ) : (
        chats.map((chat) => (
          <div
            key={chat.id}
            className={`chat-item ${chat.id === currentChatId ? "active" : ""}`}
            onClick={() => onSelectChat(chat.id)}
          >
            <div className="chat-item-content">
              <div className="chat-item-title">{chat.title}</div>
              <div className="chat-item-time">
                {format(new Date(chat.updatedAt), "dd MMM, HH:mm")}
              </div>
            </div>
            <button
              className="chat-item-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
              }}
              title="Удалить чат"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))
      )}
    </div>
  );
};
