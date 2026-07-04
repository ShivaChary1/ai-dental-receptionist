import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Expand, MapPin, Plus, Send, Sparkles, X } from "lucide-react";
import ChatBubble, { TypingIndicator } from "../ChatBubble.jsx";
import RecommendationCards from "../RecommendationCards.jsx";
import GuestUpsell from "./GuestUpsell.jsx";
import UrgencyBanner from "./UrgencyBanner.jsx";
import Citations from "./Citations.jsx";
import FindingsCard from "./FindingsCard.jsx";
import ThinkingSteps from "./ThinkingSteps.jsx";
import Button from "../ui/Button.jsx";
import { LogoMark } from "../ui/Logo.jsx";
import LottieFx from "../ui/LottieFx.jsx";
import chatbotAnim from "../../assets/lottie/chatbot.json";
import useTriageChat, { SUGGESTIONS } from "../../lib/useTriageChat.js";
import { staggerContainer, listItem } from "../../lib/motion.js";

function PanelHeader({ onClose }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border bg-card/60 px-4 py-3">
      <LogoMark className="h-8 w-8" />
      <div className="min-w-0 leading-tight">
        <div className="text-sm font-semibold text-foreground">SmileDesk Assistant</div>
        <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online
        </div>
      </div>
      <div className="ml-auto flex items-center gap-0.5">
        <Link
          to="/chat"
          title="Open full view"
          aria-label="Open full view"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Expand className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function AssistantPanel({ onClose, initialMessage, onInitialMessageConsumed }) {
  const {
    isPatient, coords, requestLocation,
    messages, input, setInput, loading, send, newChat,
    guestRemaining, limitReached, steps,
  } = useTriageChat();
  const scrollRef = useRef(null);
  const sentInitial = useRef(false);

  // A message handed over from the landing chat bar — send it once on mount.
  useEffect(() => {
    if (initialMessage && !sentInitial.current) {
      sentInitial.current = true;
      send(initialMessage);
      onInitialMessageConsumed?.();
    }
  }, [initialMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, limitReached]);

  const isFresh = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader onClose={onClose} />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {isFresh && !loading && !limitReached ? (
          /* Empty chat: the user speaks first. */
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <LottieFx animationData={chatbotAnim} size={120} className="-my-3" />
            <p className="mt-2 text-sm font-semibold text-foreground">
              How can I help your smile today?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Describe a symptom or ask any dental question.
            </p>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="mt-4 flex flex-wrap justify-center gap-2"
            >
              {SUGGESTIONS.map((s) => (
                <motion.button
                  key={s}
                  variants={listItem}
                  onClick={() => send(s)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Sparkles className="h-3 w-3 text-primary" /> {s}
                </motion.button>
              ))}
            </motion.div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i}>
                {m.role === "assistant" && m.urgency && <UrgencyBanner urgency={m.urgency} />}
                <ChatBubble
                  role={m.role}
                  content={m.content}
                  attachment={m.attachment}
                  streaming={m.streaming}
                />
                {m.role === "assistant" && (
                  <>
                    {m.structured_findings && <FindingsCard findings={m.structured_findings} />}
                    <Citations citations={m.citations} content={m.content} />
                    <RecommendationCards recommendations={m.recommendations} />
                  </>
                )}
              </div>
            ))}
            <AnimatePresence>
              {loading && (steps.length > 0
                ? <ThinkingSteps key="steps" steps={steps} />
                : <TypingIndicator key="typing" />)}
            </AnimatePresence>
            {limitReached && <GuestUpsell />}
          </>
        )}
      </div>

      <div className="border-t border-border bg-background/80 px-3 py-2.5 backdrop-blur-md">
        {!coords && !limitReached && (
          <button
            type="button"
            onClick={requestLocation}
            className="mb-2 inline-flex items-center gap-1.5 text-2xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            <MapPin className="h-3 w-3" /> Share location for nearby recommendations
          </button>
        )}
        <div className="flex items-center gap-1.5 rounded-xl border border-input bg-card p-1 shadow-sm transition-colors focus-within:border-primary">
          {!isFresh && isPatient && (
            <Button
              size="icon"
              variant="ghost"
              onClick={newChat}
              title="New chat"
              aria-label="New chat"
              className="h-8 w-8 shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={limitReached ? "Create an account to continue…" : "Describe your dental concern…"}
            disabled={limitReached}
            className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
          />
          <Button
            size="icon"
            onClick={() => send()}
            disabled={loading || limitReached || !input.trim()}
            aria-label="Send"
            className="h-8 w-8 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-2xs text-muted-foreground">
          {!isPatient && guestRemaining != null && !limitReached ? (
            <>
              {guestRemaining} free {guestRemaining === 1 ? "message" : "messages"} left ·{" "}
              <Link to="/register" className="font-medium text-primary hover:underline">
                Create an account
              </Link>{" "}
              to save this chat
            </>
          ) : (
            "Guidance, not a diagnosis. For emergencies contact a dentist."
          )}
        </p>
      </div>
    </div>
  );
}
