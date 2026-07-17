import "./Chat.style.css";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SideBar } from "../../layouts/side-bar";
import { Header } from "../../layouts/header";
import { ChatComposer } from "./components/ChatComposer.tsx";
import { ChatMessages } from "./components/ChatMessages.tsx";
import { useChatController } from "./hooks/useChatController.ts";
import { useMessageVoice } from "./hooks/useMessageVoice.ts";
import { useSpeechToText } from "./hooks/useSpeechToText.ts";

export const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [messageInput, setMessageInput] = useState("");

  const {
    listMessage,
    disableSendMessage,
    sessionRefresh,
    sendMessage,
  } = useChatController({
    sessionId: id,
    navigate,
  });

  const { playingVoiceIndex, handleVoiceClick } = useMessageVoice();

  const handleTranscribed = useCallback((text: string) => {
    setMessageInput(text);
  }, []);

  const { isRecording, isProcessingVoice, handleRecording } =
    useSpeechToText({
      onTranscribed: handleTranscribed,
    });

  const handleSend = useCallback(() => {
    const message = messageInput.trim();

    if (!message || disableSendMessage) {
      return;
    }

    setMessageInput("");
    void sendMessage(message);
  }, [disableSendMessage, messageInput, sendMessage]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((previousValue) => !previousValue);
  }, []);

  useEffect(() => {
    setMessageInput("");
  }, [id]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(window.innerWidth > 768);
  }, []);

  return (
    <div id="main-container" className={sidebarOpen ? "sidebar-open" : ""}>
      <div id="main-sidebar" className={sidebarOpen ? "open" : "closed"}>
        <SideBar refreshSession={sessionRefresh} sessionId={id} />
      </div>

      {sidebarOpen && isMobile && (
        <div className="overlay" onClick={toggleSidebar} />
      )}

      <div
        id="main"
        className={sidebarOpen ? "dim" : ""}
        onClick={() => {
          if (window.innerWidth < 768 && sidebarOpen) {
            toggleSidebar();
          }
        }}
      >
        <Header onToggleSidebar={toggleSidebar} />

        <div
          className="main__box-chat flex flex-col overflow-hidden bg-white h-dvh"
          style={{ height: "100dvh" }}
        >
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 md:px-0"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <ChatMessages
              messages={listMessage}
              playingVoiceIndex={playingVoiceIndex}
              onVoiceClick={handleVoiceClick}
            />
          </div>

          <ChatComposer
            value={messageInput}
            onChange={setMessageInput}
            onSend={handleSend}
            onRecord={handleRecording}
            isRecording={isRecording}
            isProcessingVoice={isProcessingVoice}
            isSending={disableSendMessage}
          />
        </div>
      </div>
    </div>
  );
};
