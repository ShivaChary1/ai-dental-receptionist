import ReactMarkdown from "react-markdown";

export default function ChatBubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold mr-2 shrink-0">
          AI
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-white rounded-br-sm"
            : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <div className="markdown">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
