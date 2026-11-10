"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/** Same controls as initVideo() in the static main.js. */
export function VideoPlayer({
  src,
  duration,
  poster,
  playClassName = "",
  captions,
}: {
  src: string;
  duration: string;
  poster: React.ReactNode;
  playClassName?: string;
  /** Optional WebVTT captions (French). */
  captions?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [icon, setIcon] = useState<"play" | "pause">("play");
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [time, setTime] = useState(`0:00 / ${duration}`);

  const fail = () => {
    cardRef.current?.classList.remove("playing");
    setIcon("play");
    setMessage(`Vidéo à venir — ajoutez le fichier : ${src}`);
    setShowMessage(true);
    window.setTimeout(() => setShowMessage(false), 3500);
  };

  const toggle = () => {
    const video = videoRef.current;
    const card = cardRef.current;
    if (!video || !card) return;
    if (video.paused) {
      card.classList.add("playing");
      video.play().then(() => setIcon("pause")).catch(fail);
    } else {
      video.pause();
      setIcon("play");
    }
  };

  return (
    <div className="video-card" ref={cardRef}>
      <div className="video-stage">
        {poster}
        <video
          ref={videoRef}
          src={src}
          preload="none"
          playsInline
          onClick={toggle}
          onError={fail}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (!video.duration) return;
            setProgress((video.currentTime / video.duration) * 100);
            setTime(`${clock(video.currentTime)} / ${clock(video.duration)}`);
          }}
        >
          {captions ? <track kind="captions" srcLang="fr" label="Français" src={captions} default /> : null}
        </video>
        <button type="button" className={`video-big-play ${playClassName}`.trim()} aria-label="Lire la vidéo" onClick={toggle}>
          <Icon name="play" />
        </button>
      </div>
      <div className="video-controls">
        <button type="button" className="v-toggle" aria-label="Lecture / pause" onClick={toggle}>
          <Icon name={icon} />
        </button>
        <div
          className="progress"
          role="presentation"
          onClick={(event) => {
            const video = videoRef.current;
            if (!video?.duration) return;
            const rect = event.currentTarget.getBoundingClientRect();
            video.currentTime = ((event.clientX - rect.left) / rect.width) * video.duration;
          }}
        >
          <span style={progress === null ? undefined : { width: `${progress}%` }} />
        </div>
        <span className="video-time">{time}</span>
        <button
          type="button"
          className="v-full"
          aria-label="Plein écran"
          onClick={() => void cardRef.current?.requestFullscreen?.()}
        >
          <Icon name="fullscreen" />
        </button>
      </div>
      <div className={`video-msg${showMessage ? " show" : ""}`} role="status">
        {message}
      </div>
    </div>
  );
}
