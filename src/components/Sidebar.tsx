import React, { useState } from "react";
import { useAppStore } from "../store/appStore";
import { Settings, Trash, X } from "lucide-react";
import "./Sidebar.css";
import { ChatList } from "./ChatList";

export const Sidebar: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const {
    chats,
    currentChatId,
    config,
    createChat,
    selectChat,
    deleteChat,
    clearChatContext,
    clearAllContexts,
  } = useAppStore();

  const handleNewChat = () => {
    createChat();
  };

  const handleClearContext = async () => {
    if (currentChatId && confirm("Очистить контекст этого чата?")) {
      await clearChatContext(currentChatId);
      alert("Контекст чата очищен");
    }
  };

  const handleClearAllContexts = async () => {
    if (confirm("Очистить контексты всех чатов? Это действие необратимо.")) {
      await clearAllContexts();
      alert("Все контексты очищены");
    }
  };

  return (
    <>
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>HADA</h1>
          <button className="icon-button" onClick={() => setShowSettings(true)}>
            <Settings size={20} />
          </button>
        </div>

        <button className="new-chat-button" onClick={handleNewChat}>
          + Новый чат
        </button>

        <ChatList
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={selectChat}
          onDeleteChat={deleteChat}
        />

        <div className="sidebar-footer">
          <div className="status-indicator">
            <div
              className={`status-dot ${config?.models.claudeAvailable ? "online" : "offline"}`}
            />
            <span>
              {config?.mode === "hybrid"
                ? "Гибридный режим"
                : "Локальный режим"}
            </span>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="settings-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Настройки</h2>
              <button
                className="icon-button"
                onClick={() => setShowSettings(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="settings-section">
                <h3>Модели</h3>
                <div className="setting-item">
                  <span>Исполнитель</span>
                  <span className="setting-value">
                    {config?.models.executor || "qwen3"}
                  </span>
                </div>
                <div className="setting-item">
                  <span>Claude</span>
                  <span
                    className={`setting-value ${config?.models.claudeAvailable ? "online" : "offline"}`}
                  >
                    {config?.models.claudeAvailable ? "Доступен" : "Недоступен"}
                  </span>
                </div>
              </div>

              <div className="settings-section">
                <h3>Режим работы</h3>
                <div className="setting-item">
                  <span>Текущий режим</span>
                  <span className="setting-value">
                    {config?.mode === "hybrid" ? "Гибридный" : "Локальный"}
                  </span>
                </div>
              </div>

              <div className="settings-section">
                <h3>Контекст</h3>
                {currentChatId && (
                  <button
                    className="danger-button"
                    onClick={handleClearContext}
                  >
                    <Trash size={16} />
                    Очистить контекст этого чата
                  </button>
                )}
                <button
                  className="danger-button"
                  onClick={handleClearAllContexts}
                >
                  <Trash size={16} />
                  Очистить все контексты
                </button>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setShowSettings(false)}
          />
        </div>
      )}
    </>
  );
};
