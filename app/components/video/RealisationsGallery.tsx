"use client";

import Image from "next/image";
import Link from "next/link";
import type { Realisation } from "@/config/realisations";
import { Icon } from "@/components/ui/Icon";
import { quoteHref } from "@/lib/contact/quote";
import { VideoPlayer } from "./VideoPlayer";

function RealisationCard({ project }: { project: Realisation }) {
  return (
    <article className="realisation-card dark-card">
      <VideoPlayer
        src={project.video}
        duration={project.duration ?? "0:00"}
        captions={project.captions}
        playClassName="realisation-play"
        poster={
          <Image
            src={project.poster}
            alt=""
            width={960}
            height={540}
            sizes="(max-width: 900px) 100vw, 50vw"
            className="realisation-poster"
          />
        }
      />
      <div className="realisation-body">
        <div className="realisation-meta">
          {project.serviceSlug ? (
            <Link href={`/services/${project.serviceSlug}`} className="tag">
              {project.service}
            </Link>
          ) : (
            <span className="tag">{project.service}</span>
          )}
        </div>
        <h2>{project.title}</h2>
        <p>{project.need}</p>
        <p className="realisation-credit">Réalisation : {project.credit}</p>
        {project.instagram ? (
          <a
            href={project.instagram}
            className="realisation-instagram"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="instagram" /> Voir sur Instagram
          </a>
        ) : null}
      </div>
    </article>
  );
}

/** Public project showcase for /marketing/realisations. */
export function RealisationsGallery({ projects }: { projects: Realisation[] }) {
  if (!projects.length) {
    return (
      <section className="section">
        <div className="container realisation-empty">
          <p className="eyebrow">Portfolio</p>
          <h2 className="section-title">
            Sélection <span className="gold">en préparation</span>
          </h2>
          <p className="section-sub">
            Les vidéos de projets approuvées seront publiées ici, avec lecture sur le site (sans compte Instagram). En
            attendant, demandez des références adaptées à votre secteur.
          </p>
          <div className="agents-cta">
            <Link href={quoteHref()} className="btn btn-primary btn-lg">
              Demander un devis <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">Portfolio</p>
        <h2 className="section-title">
          Une sélection de <span className="gold">nos projets</span>
        </h2>
        <p className="section-sub">
          Regardez le travail directement sur le site. Les liens Instagram complètent la présentation lorsqu&apos;ils
          sont disponibles.
        </p>
        <div className="realisations-grid">
          {projects.map((project) => (
            <RealisationCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
