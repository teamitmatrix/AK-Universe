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
 * Web Speech gives live words while the same mic is recorded in parallel: if the browser returns no final
 * text (frequent for Urdu / Hindi), the recording of what was actually said goes to Whisper instead of being lost.
 * Aborting `signal` = "stop now": whatever was heard so far is still returned.
 */
export async function dictateOnce(
  lang: string,
  onInterim?: (text: string) => void,
  signal?: AbortSignal
): Promise<string | null> {
  const stream = await ensureMicAccess();
  try {
    if (!recognitionCtor()) {
      const blob = await recordUntilSilence(stream, signal, { keepOnAbort: true });
      if (!blob || blob.size < 800) return null;
      return transcribeBlob(blob, lang);
    }

    const recording = startRecording(stream);
    const heard = await listenWithWebSpeech(lang, { onInterim, signal, maxMs: 30000 });
    const blob = await recording.stop();

    if (heard.final) return heard.final;
    // No final result: Whisper on the real audio, else the last live words rather than nothing.
    if (blob && blob.size >= 800 && (heard.interim || heard.sawSpeech || heard.failed)) {
      const text = await transcribeBlob(blob, lang).catch(() => null);
      if (text) return text;
    }
    return heard.interim || null;
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
    const blob = await recordUntilSilence(stream, opts.signal);
    if (!blob || blob.size < 800) return null;
    return transcribeBlob(blob, lang, opts.signal);
  } finally {
    if (owned) stream.getTracks().forEach((t) => t.stop());
  }
}

type WebSpeechResult = { final: string; interim: string; sawSpeech: boolean; failed: boolean };

function listenWithWebSpeech(
  lang: string,
  opts: { onInterim?: (text: string) => void; signal?: AbortSignal; maxMs?: number }
): Promise<WebSpeechResult> {
  const Ctor = recognitionCtor();
  if (!Ctor) return Promise.resolve({ final: "", interim: "", sawSpeech: false, failed: true });
  if (opts.signal?.aborted) return Promise.resolve({ final: "", interim: "", sawSpeech: false, failed: false });

  return new Promise((resolve) => {
    const recognition = new Ctor();
    recognition.lang = speechLocale(lang);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = "";
    let interimText = "";
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let maxTimer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;
    let sawSpeech = false;
    let failed = false;
    let restarts = 0;

    const cleanup = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (maxTimer) clearTimeout(maxTimer);
      opts.signal?.removeEventListener("abort", finish);
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      } catch {}
    };

    function finish() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ final: finalText.trim(), interim: `${finalText} ${interimText}`.trim(), sawSpeech, failed });
    }

    opts.signal?.addEventListener("abort", finish, { once: true });

    // End after a pause, with final or only interim results (some languages rarely send final ones).
    const scheduleEnd = (ms: number) => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(finish, ms);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (!piece) continue;
        sawSpeech = true;
        if (event.results[i].isFinal) {
          finalText = `${finalText} ${piece}`.trim();
        } else {
          interim += piece;
        }
      }
      interimText = interim;
      scheduleEnd(interim ? 2200 : 1300);
      opts.onInterim?.(`${finalText} ${interimText}`.trim());
    };
    recognition.onerror = (event) => {
      // network, language-not-supported, audio-capture… → the parallel recording goes to Whisper.
      if (event.error !== "no-speech" && event.error !== "aborted") failed = true;
      finish();
    };
    recognition.onend = () => {
      if (settled) return;
      if (finalText.trim() || interimText.trim() || restarts >= 3) {
        finish();
        return;
      }
      // Ended before anything was heard: listen again (Chrome stops after a few silent seconds).
      restarts += 1;
      try {
        recognition.start();
      } catch {
        failed = true;
        finish();
      }
    };

    maxTimer = setTimeout(finish, opts.maxMs ?? 25000);

    try {
      recognition.start();
    } catch {
      failed = true;
      finish();
    }
  });
}

function recorderMime() {
  return MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
}

/** Records the stream until stop() is called (runs next to Web Speech during dictation). */
function startRecording(stream: MediaStream): { stop: () => Promise<Blob | null> } {
  const mime = recorderMime();
  let recorder: MediaRecorder;
  try {
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    recorder.start(250);
  } catch {
    return { stop: async () => null };
  }
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  return {
    stop: () =>
      new Promise((resolve) => {
        const done = () =>
          resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" }) : null);
        if (recorder.state === "inactive") return done();
        recorder.onstop = done;
        try {
          recorder.stop();
        } catch {
          done();
        }
      }),
  };
}

/**
 * Records until a pause after speech. Returns null when nobody spoke (Whisper invents text from silence)
 * or when aborted, unless `keepOnAbort` (the dictation "stop" button keeps what was said).
 */
function recordUntilSilence(
  stream: MediaStream,
  signal?: AbortSignal,
  { keepOnAbort = false }: { keepOnAbort?: boolean } = {}
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const mime = recorderMime();
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
    const SILENCE_MS = 1300;
    const MAX_MS = 30000;
    const MIN_MS = 600;
    /** Gives up after this long without any speech (the live call then simply listens again). */
    const IDLE_MS = 12000;
    const SPEECH_THRESHOLD = 0.015;

    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      signal?.removeEventListener("abort", onAbort);
      void audioCtx.close().catch(() => {});
      resolve(cancelled || !speaking ? null : blob);
    };

    const stopRecorder = () => {
      try {
        if (recorder.state !== "inactive") recorder.stop();
        else finish(null);
      } catch {
        finish(null);
      }
    };

    function onAbort() {
      if (!keepOnAbort) cancelled = true;
      stopRecorder();
    }
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
      } else if (elapsed >= IDLE_MS) {
        stopRecorder();
        return;
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
