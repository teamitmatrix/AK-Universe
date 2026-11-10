/*
 * Texts of the chat widget (components/ui/ChatWidget.tsx).
 * French, English, Urdu and Hindi are hand-written; the other site languages are translated once from English
 * by /api/chat/ui and cached, so the widget never depends on Google Translate (which misses texts that change
 * after the page was translated, such as the live voice status).
 */

export type WidgetText = {
  open: string;
  close: string;
  title: string;
  subtitle: string;
  nudge: string;
  nudgeDismiss: string;
  hello: string;
  suggestions: string[];
  placeholder: string;
  send: string;
  reset: string;
  error: string;
  rateLimited: string;
  disclaimer: string;
  voiceInput: string;
  voiceInputStop: string;
  voiceInputUnsupported: string;
  voiceLive: string;
  voiceLiveEnd: string;
  voiceListening: string;
  voiceThinking: string;
  voiceSpeaking: string;
  voiceHint: string;
  voiceMicDenied: string;
};

export const WIDGET_TEXT_KEYS = [
  "open",
  "close",
  "title",
  "subtitle",
  "nudge",
  "nudgeDismiss",
  "hello",
  "suggestions",
  "placeholder",
  "send",
  "reset",
  "error",
  "rateLimited",
  "disclaimer",
  "voiceInput",
  "voiceInputStop",
  "voiceInputUnsupported",
  "voiceLive",
  "voiceLiveEnd",
  "voiceListening",
  "voiceThinking",
  "voiceSpeaking",
  "voiceHint",
  "voiceMicDenied",
] as const satisfies readonly (keyof WidgetText)[];

export const WIDGET_TEXT: Record<"fr" | "en" | "ur" | "hi", WidgetText> = {
  fr: {
    open: "Une question ? Discutons",
    close: "Fermer le chat",
    title: "Assistant AK Universe",
    subtitle: "Réponse immédiate, 24h/24",
    nudge: "Bonjour, comment puis-je vous aider ?",
    nudgeDismiss: "Masquer",
    hello: "Bonjour ! Je peux vous renseigner sur nos vidéos, nos agents IA, les tarifs ou le déroulement d'un projet. Que puis-je faire pour vous ?",
    suggestions: ["Combien coûte une vidéo d'entreprise ?", "Comment fonctionnent les agents IA ?", "Comment réserver un tournage ?"],
    placeholder: "Écrivez votre message…",
    send: "Envoyer",
    reset: "Nouvelle conversation",
    error: "Désolé, je ne peux pas répondre pour le moment. Réessayez dans un instant ou demandez un devis sur /contact.",
    rateLimited: "Vous avez envoyé beaucoup de messages. Merci de patienter quelques minutes.",
    disclaimer: "Assistant IA : vérifiez les informations importantes sur votre devis.",
    voiceInput: "Parler pour écrire",
    voiceInputStop: "Arrêter l'écoute",
    voiceInputUnsupported: "La dictée n'est pas disponible sur ce navigateur.",
    voiceLive: "Discussion vocale",
    voiceLiveEnd: "Terminer l'appel",
    voiceListening: "Je vous écoute…",
    voiceThinking: "Un instant…",
    voiceSpeaking: "Réponse en cours…",
    voiceHint: "Parlez naturellement. L'assistant répond à voix haute.",
    voiceMicDenied: "Autorisez le micro pour utiliser la voix.",
  },
  en: {
    open: "Questions? Let's chat",
    close: "Close chat",
    title: "AK Universe assistant",
    subtitle: "Instant answers, 24/7",
    nudge: "Hi, how can I help you?",
    nudgeDismiss: "Dismiss",
    hello: "Hello! I can help with our videos, AI agents, prices or how a project works. What can I do for you?",
    suggestions: ["How much does a corporate video cost?", "How do the AI agents work?", "How do I book a shoot?"],
    placeholder: "Type your message…",
    send: "Send",
    reset: "New conversation",
    error: "Sorry, I can't answer right now. Please try again shortly or request a quote at /contact.",
    rateLimited: "You've sent a lot of messages. Please wait a few minutes.",
    disclaimer: "AI assistant: check important details on your quote.",
    voiceInput: "Speak to type",
    voiceInputStop: "Stop listening",
    voiceInputUnsupported: "Dictation isn't available in this browser.",
    voiceLive: "Live voice chat",
    voiceLiveEnd: "End call",
    voiceListening: "Listening…",
    voiceThinking: "Thinking…",
    voiceSpeaking: "Speaking…",
    voiceHint: "Speak naturally. The assistant replies out loud.",
    voiceMicDenied: "Allow the microphone to use voice.",
  },
  ur: {
    open: "کوئی سوال؟ بات کریں",
    close: "چیٹ بند کریں",
    title: "اے کے یونیورس اسسٹنٹ",
    subtitle: "فوری جواب، 24/7",
    nudge: "السلام علیکم، میں آپ کی کیا مدد کر سکتا ہوں؟",
    nudgeDismiss: "چھپائیں",
    hello: "خوش آمدید! میں آپ کو ہماری ویڈیوز، اے آئی ایجنٹس، قیمتوں یا پروجیکٹ کے طریقۂ کار کے بارے میں بتا سکتا ہوں۔ میں آپ کی کیا مدد کروں؟",
    suggestions: ["کمپنی ویڈیو کی قیمت کتنی ہے؟", "اے آئی ایجنٹس کیسے کام کرتے ہیں؟", "شوٹ کیسے بُک کروں؟"],
    placeholder: "اپنا پیغام لکھیں…",
    send: "بھیجیں",
    reset: "نئی گفتگو",
    error: "معذرت، میں ابھی جواب نہیں دے سکتا۔ تھوڑی دیر بعد دوبارہ کوشش کریں یا /contact پر کوٹیشن کی درخواست کریں۔",
    rateLimited: "آپ نے بہت سے پیغامات بھیجے ہیں۔ براہِ کرم چند منٹ انتظار کریں۔",
    disclaimer: "اے آئی اسسٹنٹ: اہم معلومات اپنی کوٹیشن پر ضرور چیک کریں۔",
    voiceInput: "بول کر لکھیں",
    voiceInputStop: "سننا بند کریں",
    voiceInputUnsupported: "اس براؤزر میں بول کر لکھنے کی سہولت دستیاب نہیں۔",
    voiceLive: "لائیو وائس چیٹ",
    voiceLiveEnd: "کال ختم کریں",
    voiceListening: "میں سن رہا ہوں…",
    voiceThinking: "ایک لمحہ…",
    voiceSpeaking: "جواب دے رہا ہوں…",
    voiceHint: "آرام سے بولیں، اسسٹنٹ آواز میں جواب دے گا۔",
    voiceMicDenied: "آواز استعمال کرنے کے لیے مائیکروفون کی اجازت دیں۔",
  },
  hi: {
    open: "कोई सवाल? बात करें",
    close: "चैट बंद करें",
    title: "एके यूनिवर्स असिस्टेंट",
    subtitle: "तुरंत जवाब, 24/7",
    nudge: "नमस्ते, मैं आपकी क्या मदद कर सकता हूँ?",
    nudgeDismiss: "छिपाएँ",
    hello: "नमस्ते! मैं आपको हमारे वीडियो, एआई एजेंट्स, कीमतों या प्रोजेक्ट की प्रक्रिया के बारे में बता सकता हूँ। मैं आपकी क्या मदद करूँ?",
    suggestions: ["कंपनी वीडियो की कीमत कितनी है?", "एआई एजेंट्स कैसे काम करते हैं?", "शूट कैसे बुक करूँ?"],
    placeholder: "अपना संदेश लिखें…",
    send: "भेजें",
    reset: "नई बातचीत",
    error: "क्षमा करें, मैं अभी जवाब नहीं दे सकता। थोड़ी देर बाद फिर कोशिश करें या /contact पर कोटेशन माँगें।",
    rateLimited: "आपने बहुत सारे संदेश भेजे हैं। कृपया कुछ मिनट रुकें।",
    disclaimer: "एआई असिस्टेंट: ज़रूरी जानकारी अपने कोटेशन पर ज़रूर जाँचें।",
    voiceInput: "बोलकर लिखें",
    voiceInputStop: "सुनना बंद करें",
    voiceInputUnsupported: "इस ब्राउज़र में बोलकर लिखने की सुविधा उपलब्ध नहीं है।",
    voiceLive: "लाइव वॉइस चैट",
    voiceLiveEnd: "कॉल समाप्त करें",
    voiceListening: "मैं सुन रहा हूँ…",
    voiceThinking: "एक पल…",
    voiceSpeaking: "जवाब दे रहा हूँ…",
    voiceHint: "आराम से बोलें, असिस्टेंट आवाज़ में जवाब देगा।",
    voiceMicDenied: "आवाज़ इस्तेमाल करने के लिए माइक्रोफ़ोन की अनुमति दें।",
  },
};

/** Hand-written texts for this language, if any. */
export function builtInWidgetText(lang: string): WidgetText | null {
  return (WIDGET_TEXT as Record<string, WidgetText>)[lang] ?? null;
}

/** Checks a translated object has every key with the right shape (strings, 3 suggestions). */
export function isWidgetText(value: unknown): value is WidgetText {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return WIDGET_TEXT_KEYS.every((key) =>
    key === "suggestions"
      ? Array.isArray(v[key]) && (v[key] as unknown[]).length === 3 && (v[key] as unknown[]).every((s) => typeof s === "string" && s.trim())
      : typeof v[key] === "string" && (v[key] as string).trim() !== ""
  );
}

/** Right-to-left site languages. */
export const isRtl = (lang: string) => lang === "ur";
