"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { VideoPlayer } from "./VideoPlayer";

export function MarketingView() {
  return (
    <main className="mk-hero stars">
      <svg className="mk-waves" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="w1" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#fdb942" stopOpacity=".9" />
            <stop offset=".5" stopColor="#f59e0b" stopOpacity=".35" />
            <stop offset="1" stopColor="#fdb942" stopOpacity=".8" />
          </linearGradient>
          <radialGradient id="rg" cx=".3" cy="1" r=".8">
            <stop offset="0" stopColor="#3a2408" />
            <stop offset="1" stopColor="#070504" stopOpacity="0" />
          </radialGradient>
          <filter id="blur">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <path d="M0 900 C 300 620, 600 700, 820 440 S 1120 60, 1260 0 L 1600 0 L 1600 900 Z" fill="url(#rg)" opacity=".8" />
        <path
          d="M-20 880 C 280 640, 560 700, 800 460 S 1140 80, 1270 -10"
          stroke="url(#w1)"
          strokeWidth="10"
          fill="none"
          filter="url(#blur)"
          opacity=".7"
        />
        <path d="M-20 880 C 280 640, 560 700, 800 460 S 1140 80, 1270 -10" stroke="#ffd27a" strokeWidth="2" fill="none" />
        <path d="M200 900 C 600 760, 900 800, 1600 520" stroke="#fdb942" strokeOpacity=".25" strokeWidth="1.5" fill="none" />
      </svg>

      <div className="container mk-grid">
        <div className="mk-copy">
          <h1 className="mk-title">
            Marketing
            <br />
            <span className="gold">Digital</span>
          </h1>
          <p>
            Attirez plus de clients, développez votre visibilité et automatisez votre communication grâce à des outils
            marketing simples et puissants, propulsés par l&apos;IA.
          </p>
          <Link href="/services" className="btn btn-primary btn-lg">
            Commencer maintenant <Icon name="arrow" />
          </Link>
        </div>
        <VideoPlayer
          src="/assets/video/presentation.mp4"
          duration="1:24"
          poster={<div className="ph ph-m2 ph-video" aria-hidden="true" />}
        />
      </div>
    </main>
  );
}
