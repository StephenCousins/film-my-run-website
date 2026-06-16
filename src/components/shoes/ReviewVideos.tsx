'use client';

import { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';

const VIDEOS = [
  {
    id: 'QNwpf-r0-jQ',
    title: 'Hoka Tecton X3 Review',
    subtitle: 'UTMB 2024-winning carbon trail racer tested',
    channel: 'The Run Testers',
    tag: 'Trail',
  },
  {
    id: 'OxW8gXJFU6Y',
    title: 'Best Carbon Race Shoes 2024',
    subtitle: 'ASICS, Nike, Hoka, Adidas, Puma compared',
    channel: 'The Run Testers',
    tag: 'Road',
  },
  {
    id: 'JNZlvWKobiU',
    title: 'HOKA Mach 6 Review',
    subtitle: "HOKA's snappy daily trainer verdict",
    channel: 'The Run Testers',
    tag: 'Road',
  },
  {
    id: 'VR9foVVs2sA',
    title: 'Road to Trail Shoe Comparison',
    subtitle: 'Tecton X vs Speedgoat vs Enduris vs Parkclaw',
    channel: 'The Run Testers',
    tag: 'Trail',
  },
  {
    id: 'Youi52ZwUTc',
    title: 'HOKA vs Altra vs La Sportiva',
    subtitle: 'The truth about these brands on trail',
    channel: 'The Run Testers',
    tag: 'Trail',
  },
  {
    id: 'CWpqteqbvQ8',
    title: 'Best Running Shoes 2024',
    subtitle: 'Nike, Adidas, Saucony, Hoka, ASICS and more',
    channel: 'The Run Testers',
    tag: 'Road',
  },
];

const TAG_COLORS: Record<string, string> = {
  Trail: 'bg-green-500/20 text-green-400 border border-green-500/30',
  Road: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

function VideoCard({ video }: { video: typeof VIDEOS[0] }) {
  const [playing, setPlaying] = useState(false);
  const thumbUrl = `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`;
  const youtubeUrl = `https://www.youtube.com/watch?v=${video.id}`;

  return (
    <div className="flex-none w-72 sm:w-80 group">
      <div className="relative rounded-xl overflow-hidden bg-[#18181b] border border-[#27272a] hover:border-orange-500/40 transition-all duration-300">
        {playing ? (
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full aspect-video"
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="relative w-full aspect-video block overflow-hidden"
            aria-label={`Play ${video.title}`}
          >
            {/* Thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbUrl}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={e => {
                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
              }}
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform duration-200">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </div>
            {/* Tag */}
            <span className={`absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full ${TAG_COLORS[video.tag]}`}>
              {video.tag}
            </span>
          </button>
        )}
      </div>

      <div className="pt-3 px-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#fafafa] leading-snug">{video.title}</h3>
            <p className="text-xs text-[#71717a] mt-0.5 line-clamp-1">{video.subtitle}</p>
          </div>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#52525b] hover:text-orange-500 transition-colors flex-none mt-0.5"
            aria-label="Open on YouTube"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-xs text-orange-500/70 mt-1">{video.channel}</p>
      </div>
    </div>
  );
}

export default function ReviewVideos() {
  return (
    <section className="bg-[#09090b] border-b border-[#18181b] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="text-xs font-medium text-orange-500 uppercase tracking-widest mb-2">Expert Reviews</p>
            <h2 className="text-2xl font-bold font-display text-[#fafafa]">Watch Before You Buy</h2>
          </div>
          <a
            href="https://www.youtube.com/@TheRunTesters"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#71717a] hover:text-orange-500 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            More reviews <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Horizontal scroll strip */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-none">
          {VIDEOS.map(v => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      </div>
    </section>
  );
}
