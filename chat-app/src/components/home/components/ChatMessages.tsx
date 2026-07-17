import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Square, Volume2 } from "lucide-react";
import type { Message } from "../chat.types.ts";

type ChatMessagesProps = {
  messages: Message[];
  playingVoiceIndex: number | null;
  onVoiceClick: (index: number, messageId?: string) => void;
};

const EmptyChat = () => (
  <div className="h-full flex flex-col items-center justify-center text-center px-5 sm:px-8">
    <h1 className="text-2xl font-bold text-gray-800 mb-2">
      Tra cứu học phần HUST
    </h1>
    <p className="text-sm text-gray-500 mb-6">
      Nhập mã môn học hoặc tên môn để bắt đầu
    </p>

    <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
      <img src="/hust-logo.svg" className="w-5 h-5" alt="HUST" />
      <span className="text-sm text-gray-600">
        Ví dụ: IT3180, Cấu trúc dữ liệu...
      </span>
    </div>
  </div>
);

export const ChatMessages = ({
  messages,
  playingVoiceIndex,
  onVoiceClick,
}: ChatMessagesProps) => {
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return <EmptyChat />;
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-5 md:px-6 py-4 space-y-5">
      {messages.map((message, index) => (
        <div
          key={message.id ?? `pending-${index}`}
          className="space-y-4"
        >
          <div className="flex justify-end">
            <div className="bg-[rgb(154,0,31)] text-white px-4 py-3 rounded-2xl rounded-br-md shadow-sm max-w-[90%] md:max-w-[70%] break-words">
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.message}
              </p>
            </div>
          </div>

          <div
            className={`relative w-full md:w-fit max-w-full md:max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-md ${
              !message.streaming ? "pr-12" : ""
            }`}
          >
            {!message.streaming && message.id && (
              <button
                type="button"
                onClick={() => onVoiceClick(index, message.id)}
                className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  playingVoiceIndex === index
                    ? "bg-gradient-to-br from-[rgb(154,0,31)] to-red-700 text-white shadow-[0_0_0_4px_rgba(154,0,31,0.15),0_4_12px_rgba(154,0,31,0.35)] scale-105"
                    : "bg-white text-gray-400 border border-gray-200 shadow-sm hover:text-[rgb(154,0,31)] hover:border-[rgb(154,0,31)] hover:shadow-md hover:scale-105"
                }`}
                title={
                  playingVoiceIndex === index
                    ? "Dừng đọc"
                    : "Nghe câu trả lời"
                }
              >
                {playingVoiceIndex === index ? (
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-5 h-5 rounded-full bg-white/20 animate-ping" />
                    <Square
                      size={13}
                      fill="currentColor"
                      className="relative"
                    />
                  </div>
                ) : (
                  <Volume2 size={16} />
                )}
              </button>
            )}

            <div className="text-[15px] leading-7 text-gray-800 prose prose-sm max-w-none prose-pre:bg-gray-900 prose-pre:text-white break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="table-scroll w-full my-3 overflow-x-auto">
                      <table className="border border-gray-300 border-separate border-spacing-0 min-w-full md:min-w-[800px]">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ ...props }) => (
                    <th
                      className="border-r border-b border-gray-300 bg-gray-100 px-3 py-2 text-left whitespace-nowrap"
                      {...props}
                    />
                  ),
                  td: ({ ...props }) => (
                    <td
                      className="border-r border-b border-gray-300 px-3 py-2"
                      {...props}
                    />
                  ),
                  tr: ({ ...props }) => <tr {...props} />,
                }}
              >
                {message.answer}
              </ReactMarkdown>
            </div>

            {message.started && (
              <div className="flex gap-1 mt-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            )}
          </div>
        </div>
      ))}

      <div ref={chatEndRef} />
    </div>
  );
};
