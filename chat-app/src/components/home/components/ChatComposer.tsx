import { useEffect, useRef } from "react";
import { FiMic, FiMicOff, FiSend } from "react-icons/fi";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onRecord: () => void;
  isRecording: boolean;
  isProcessingVoice: boolean;
  isSending: boolean;
};

const RecordingIndicator = () => (
  <div className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-red-50 via-red-100 to-red-50 border border-red-200 flex items-center justify-center gap-4 shadow-sm">
    <div className="flex items-center gap-1 h-8">
      {Array.from({ length: 12 }).map((_, index) => (
        <span
          key={index}
          className="w-1.5 rounded-full bg-[rgb(154,0,31)] animate-wave"
          style={{ animationDelay: `${index * 0.08}s` }}
        />
      ))}
    </div>

    <span className="text-sm font-medium text-[rgb(154,0,31)] animate-pulse">
      Đang thu âm...
    </span>
  </div>
);

const ProcessingIndicator = () => (
  <div className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-red-50 via-red-100 to-red-50 border border-red-200 flex items-center justify-center gap-3 shadow-sm">
    <svg
      className="h-5 w-5 animate-spin text-[rgb(154,0,31)]"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-20"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>

    <span className="text-sm font-medium text-[rgb(154,0,31)] animate-pulse">
      Đang xử lý giọng nói...
    </span>
  </div>
);

export const ChatComposer = ({
  value,
  onChange,
  onSend,
  onRecord,
  isRecording,
  isProcessingVoice,
  isSending,
}: ChatComposerProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!value && textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
  }, [value]);

  return (
    <div
      className="border-t border-gray-100 bg-white px-3 sm:px-4 pt-3 pb-3"
      style={{
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex items-end gap-2 w-full max-w-4xl mx-auto">
        {isRecording ? (
          <RecordingIndicator />
        ) : isProcessingVoice ? (
          <ProcessingIndicator />
        ) : (
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            placeholder="Nhập câu hỏi..."
            className="flex-1 min-w-0 px-4 py-3 text-base border border-gray-200 rounded-2xl focus:outline-none focus:border-[rgb(154,0,31)] shadow-md resize-none overflow-y-auto max-h-[240px] scroll-hidden"
            style={{ fontSize: 16 }}
            onChange={(event) => {
              onChange(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${Math.min(
                event.target.scrollHeight,
                240,
              )}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
          />
        )}

        <button
          type="button"
          onClick={onSend}
          disabled={
            isRecording ||
            isProcessingVoice ||
            isSending ||
            !value.trim()
          }
          className="flex-shrink-0 p-3 rounded-2xl bg-[rgb(154,0,31)] text-white hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
        >
          <FiSend size={18} />
        </button>

        <button
          type="button"
          onClick={onRecord}
          disabled={isProcessingVoice || isSending}
          className={`flex-shrink-0 p-3 rounded-2xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
            isRecording
              ? "bg-red-600 text-white scale-110 shadow-red-300"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {isRecording ? <FiMicOff size={18} /> : <FiMic size={18} />}
        </button>
      </div>
    </div>
  );
};
