import { speechLocale } from "@/lib/chatbot/speechLocales";

/** Browser SpeechRecognition constructor (Chrome / Edge / Safari variants). */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export class MicPermissionError extends Error {
  constructor(message = "mic_denied") {
    super(message);
    this.name = "MicPermissionError";
  }
}

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported() {
  return recognitionCtor() !== null;
}

export function micSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

/** Ask for the mic while we still have a user gesture (button click). */
export async function ensureMicAccess(): Promise<MediaStream> {
  if (!micSupported()) throw new MicPermissionError("mic_unsupported");
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch {
    throw new MicPermissionError("mic_denied");
  }
}

/** Strip paths / markdown so TTS sounds natural. */
export function speakableText(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\/[\w\-/#?=&%.]+/g, "")
    .replace(/[*_`#>-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * One-shot dictation into a field.
 * Opens the mic first (so the browser prompts), then prefers Web Speech with a Whisper recorder fallback.
 */
export async function dictateOnce(
  lang: string,
  onInterim?: (text: string) => void,
  signal?: AbortSignal
): Promise<string | null> {
  const stream = await ensureMicAccess();
  try {
    if (recognitionCtor()) {
      const spoken = await listenWithWebSpeech(lang, { onInterim, signal, maxMs: 20000 });
      if (spoken) return spoken;
    }
    onInterim?.("…");
    const blob = await recordUntilSilence(stream, signal);
    if (!blob || blob.size < 800) return null;
    return transcribeBlob(blob, lang, signal);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

/**
 * Continuous listening until the user pauses, or stop via AbortSignal.
 * Pass an already-open mic stream when possible (keeps permission alive across the voice call).
 */
export async function listenForUtterance(
  lang: string,
  opts: {
    onInterim?: (text: string) => void;
    signal?: AbortSignal;
    stream?: MediaStream | null;
  } = {}
): Promise<string | null> {
  if (opts.signal?.aborted) return Promise.resolve(null);

  const owned = !opts.stream;
  const stream = opts.stream ?? (await ensureMicAccess());
  try {
    // When we already hold a MediaStream (live call), record that stream.
    // Web Speech Recognition does not use our stream and can miss the mic entirely.
    opts.onInterim?.("…");
    const blob = await recordUntilSilence(stream, opts.signal);
    if (!blob || blob.size < 800) return null;
    return transcribeBlob(blob, lang, opts.signal);
  } finally {
    if (owned) stream.getTracks().forEach((t) => t.stop());
  }
}

function listenWithWebSpeech(
  lang: string,
  opts: { onInterim?: (text: string) => void; signal?: AbortSignal; maxMs?: number }
): Promise<string | null> {
  const Ctor = recognitionCtor();
  if (!Ctor) return Promise.resolve(null);

  return new Promise((resolve) => {
    const recognition = new Ctor();
    recognition.lang = speechLocale(lang);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = "";
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let maxTimer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;
    let sawSpeech = false;

    const cleanup = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (maxTimer) clearTimeout(maxTimer);
      opts.signal?.removeEventListener("abort", onAbort);
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      } catch {}
    };

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const onAbort = () => finish(null);
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    const scheduleEnd = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => finish(finalText.trim() || null), 1100);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (!piece) continue;
        sawSpeech = true;
        if (event.results[i].isFinal) {
          finalText = `${finalText} ${piece}`.trim();
          scheduleEnd();
        } else {
          interim += piece;
        }
      }
      opts.onInterim?.(`${finalText} ${interim}`.trim());
    };
    recognition.onerror = (event) => {
      // Hand control to the recorder fallback for hard failures.
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        finish(null);
        return;
      }
      if (event.error === "aborted") {
        finish(finalText.trim() || null);
        return;
      }
      if (event.error === "no-speech") {
        finish(finalText.trim() || null);
        return;
      }
      // network / audio-capture / etc. → let caller fall back
      finish(finalText.trim() || null);
    };
    recognition.onend = () => {
      if (settled) return;
      if (finalText.trim()) {
        finish(finalText.trim());
        return;
      }
      if (sawSpeech) {
        // Ended mid-phrase — return whatever we have / empty for fallback.
        finish(null);
        return;
      }
      try {
        recognition.start();
      } catch {
        finish(null);
      }
    };

    maxTimer = setTimeout(() => finish(finalText.trim() || null), opts.maxMs ?? 25000);

    try {
      recognition.start();
    } catch {
      finish(null);
    }
  });
}

function recordUntilSilence(stream: MediaStream, signal?: AbortSignal): Promise<Blob | null> {
  return new Promise((resolve) => {
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    let speaking = false;
    let silentFor = 0;
    let elapsed = 0;
    let settled = false;
    let cancelled = false;
    const TICK = 100;
    const SILENCE_MS = 1200;
    const MAX_MS = 20000;
    const MIN_MS = 600;
    const SPEECH_THRESHOLD = 0.015;

    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      signal?.removeEventListener("abort", onAbort);
      void audioCtx.close().catch(() => {});
      resolve(cancelled ? null : blob);
    };

    const stopRecorder = () => {
      try {
        if (recorder.state !== "inactive") recorder.stop();
        else finish(null);
      } catch {
        finish(null);
      }
    };

    const onAbort = () => {
      cancelled = true;
      stopRecorder();
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mime || "audio/webm";
      finish(chunks.length ? new Blob(chunks, { type }) : null);
    };

    void audioCtx.resume().catch(() => {});
    recorder.start(250);

    const timer = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      elapsed += TICK;
      if (rms > SPEECH_THRESHOLD) {
        speaking = true;
        silentFor = 0;
      } else if (speaking) {
        silentFor += TICK;
        if (silentFor >= SILENCE_MS && elapsed >= MIN_MS) {
          stopRecorder();
          return;
        }
      }
      if (elapsed >= MAX_MS) stopRecorder();
    }, TICK);
  });
}

async function transcribeBlob(blob: Blob, lang: string, signal?: AbortSignal): Promise<string | null> {
  const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
  const form = new FormData();
  form.append("file", blob, `speech.${ext}`);
  form.append("lang", lang);
  const res = await fetch("/api/chat/transcribe", { method: "POST", body: form, signal });
  if (!res.ok) return null;
  const data = (await res.json()) as { text?: string };
  return typeof data.text === "string" && data.text.trim() ? data.text.trim() : null;
}

/** Play assistant reply via OpenAI TTS, with browser speechSynthesis as fallback. */
export async function speakReply(text: string, lang: string, signal?: AbortSignal): Promise<void> {
  const clean = speakableText(text);
  if (!clean) return;

  try {
    const res = await fetch("/api/chat/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, lang }),
      signal,
    });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      if (signal?.aborted) return;
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      try {
        await playAudioUrl(url, signal);
      } finally {
        URL.revokeObjectURL(url);
      }
      return;
    }
  } catch {
    if (signal?.aborted) return;
  }

  await speakWithBrowser(clean, lang, signal);
}

function playAudioUrl(url: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    const onAbort = () => {
      audio.pause();
      audio.removeAttribute("src");
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    audio.onended = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    audio.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("audio_error"));
    };
    void audio.play().catch(reject);
  });
}

function speakWithBrowser(text: string, lang: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = speechLocale(lang);
    const onAbort = () => {
      window.speechSynthesis.cancel();
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    utter.onend = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    utter.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  });
}
