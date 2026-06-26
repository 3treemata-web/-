import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Send, Bot, Sparkles, User, RefreshCw, AlertCircle, Loader2 } from "lucide-react";

interface ChatTabProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onResetChat: () => Promise<void>;
  loading: boolean;
}

const PRESET_QUESTIONS = [
  "14週目ですが、まだ胎動を感じなくても大丈夫ですか？👶",
  "14週目の妊婦生活で気をつけるべき食事のポイントは？🍏",
  "たまにお腹が張る（硬くなる）感じがする時の対処法 🛀",
  "体重管理が難しく、空腹時の食べづわりがある時の工夫 🍙"
];

export default function ChatTab({ messages, onSendMessage, onResetChat, loading }: ChatTabProps) {
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || loading) return;
    const textToSend = inputText.trim();
    setInputText("");
    await onSendMessage(textToSend);
  };

  const handlePresetClick = async (question: string) => {
    if (loading) return;
    await onSendMessage(question);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Bot Header description Card */}
      <div className="bg-gradient-to-br from-[#ffeef2] via-white to-[#fff0f4] rounded-3xl p-5 border border-pink-150 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-15 text-5xl">💝</div>
        <div className="flex gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-400 to-rose-400 flex items-center justify-center text-white font-bold shadow-md shadow-pink-200">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
              <span>ふんわりママのあんしん相談室 🌸</span>
              <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            </h4>
            <p className="text-[10.5px] text-slate-500 leading-relaxed mt-1">
              妊娠中の些細なからだの変化、気持ちのゆらぎ、食事や体重管理のモヤモヤなど、いつでも打ち明けてくださいね。助産師と栄養士の目線からやさしくお答えします。
            </p>
          </div>
        </div>

        {/* Note stating medical context */}
        <div className="mt-4 pt-3.5 border-t border-pink-100/60 flex gap-1.5 text-[9px] text-pink-500 font-bold bg-white/40 p-2 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>※AIのアドバイスは医療診断の代わりにはなりません。強い痛みや出血、異常を感じた場合は必ずかかりつけの産婦人科医師の診察を受けてください。</span>
        </div>
      </div>

      {/* Main Chat Flow Card */}
      <div className="bg-white rounded-3xl border border-pink-100/60 shadow-xl shadow-pink-100/20 overflow-hidden flex flex-col min-h-[400px]">
        
        {/* Chat top bar */}
        <div className="bg-slate-50/50 px-4 py-2.5 border-b border-pink-50/70 flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            アドバイザー常駐中
          </span>
          <button
            onClick={() => {
              if (window.confirm("チャット履歴をクリアしますか？")) {
                onResetChat();
              }
            }}
            title="リセット"
            className="text-slate-400 hover:text-rose-500 text-[10px] font-bold flex items-center gap-1 hover:underline transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>対話をクリア</span>
          </button>
        </div>

        {/* Conversation List area */}
        <div className="flex-1 p-4 space-y-4 max-h-[350px] overflow-y-auto bg-[#fffdfd]/30">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center text-xs text-slate-400 space-y-3">
              <span className="text-3xl animate-bounce">💬</span>
              <p className="font-medium">
                「お腹の張りはある？」、「14週目の適正体重は？」など<br />
                気になる質問をクリック、または入力してみてください 🌸
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-2.5`}
                >
                  {/* Left avatar for support adviser */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-pink-100 flex items-center justify-center text-pink-550 shrink-0 border border-pink-200">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[78%] rounded-2xl p-3.5 text-xs leading-relaxed font-medium transition-all ${
                    isUser
                      ? "bg-gradient-to-br from-pink-400 via-rose-350 to-pink-400 text-white rounded-br-none shadow-md shadow-pink-100"
                      : "bg-[#fff2f4] text-slate-700 border border-pink-100 rounded-bl-none shadow-sm"
                  }`}>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    <span className={`block text-[8px] mt-1.5 text-right ${isUser ? "text-white/70" : "text-slate-400"} font-mono`}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Right avatar for mother */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-650 shrink-0 border border-slate-200">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Typing Loading Indicator Animation */}
          {loading && (
            <div className="flex justify-start items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-pink-100 flex items-center justify-center text-pink-550 shrink-0 border border-pink-200">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#fff2f4] text-pink-500 border border-pink-100 rounded-2xl p-3.5 text-xs rounded-bl-none shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-bold animate-pulse text-[10px] text-pink-450">アドバイザーが考えています...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input box form */}
        <div className="p-4 bg-slate-50 border-t border-pink-50/60 font-sans">
          {/* Quick preset questions choices */}
          {messages.length === 0 && (
            <div className="mb-4">
              <span className="block text-[10px] text-pink-400 uppercase tracking-wider font-extrabold mb-2">よくある相談の例 💡</span>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetClick(q)}
                    className="text-left py-2.5 px-3.5 bg-white hover:bg-pink-50/50 border border-pink-100 rounded-2xl text-[11px] text-slate-650 font-bold transition-all shadow-sm hover:scale-[1.01]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              placeholder={loading ? "応答を待っています..." : "体調、食事、体重、なんでもお話ししてみてね..."}
              disabled={loading}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-white border border-pink-100 rounded-2xl px-4 py-3 text-xs placeholder:text-slate-350 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all text-slate-700 font-bold"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-2xl w-12 flex items-center justify-center hover:brightness-105 active:scale-95 transition-all shadow-md shadow-pink-200 shrink-0 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
