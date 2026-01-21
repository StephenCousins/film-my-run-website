'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Radio, Calendar, Clock, ArrowRight, Tv, Youtube, ExternalLink } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface LiveStreamInfo {
  type: 'live' | 'upcoming' | 'none';
  videoId?: string;
  title?: string;
  scheduledStart?: string;
}

const YOUTUBE_API_KEY = 'AIzaSyDIigYN5zLvMFLpyAgaSzmFRrMnAOUqVdc';
const CHANNEL_ID = 'UCvc-1cdDnoYjvSFwE69l8JQ';
const CHANNEL_URL = 'https://www.youtube.com/channel/UCvc-1cdDnoYjvSFwE69l8JQ';

export default function LivePage() {
  const [streamInfo, setStreamInfo] = useState<LiveStreamInfo>({ type: 'none' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLiveStream() {
      try {
        // First, check for live streams
        const liveResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`
        );
        const liveData = await liveResponse.json();

        if (liveData.items && liveData.items.length > 0) {
          setStreamInfo({
            type: 'live',
            videoId: liveData.items[0].id.videoId,
            title: liveData.items[0].snippet.title,
          });
          setIsLoading(false);
          return;
        }

        // If no live stream, check for upcoming streams
        const upcomingResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=upcoming&type=video&key=${YOUTUBE_API_KEY}`
        );
        const upcomingData = await upcomingResponse.json();

        if (upcomingData.items && upcomingData.items.length > 0) {
          // Get video details to find scheduled start time
          const videoId = upcomingData.items[0].id.videoId;
          const detailsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
          );
          const detailsData = await detailsResponse.json();

          const scheduledStart = detailsData.items?.[0]?.liveStreamingDetails?.scheduledStartTime;

          setStreamInfo({
            type: 'upcoming',
            videoId,
            title: upcomingData.items[0].snippet.title,
            scheduledStart,
          });
          setIsLoading(false);
          return;
        }

        // No live or upcoming streams
        setStreamInfo({ type: 'none' });
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching live stream:', err);
        setError('Unable to check live stream status');
        setIsLoading(false);
      }
    }

    fetchLiveStream();
  }, []);

  const formatScheduledTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-full border border-red-500/30 mb-6">
                  <Radio className={`w-4 h-4 text-red-500 ${streamInfo.type === 'live' ? 'animate-pulse' : ''}`} />
                  <span className="text-red-400 text-sm font-medium">
                    {streamInfo.type === 'live' ? 'Live Now' : 'Virtual Film My Run'}
                  </span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                  Live Treadmill Running
                </h1>

                <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                  Watch live coverage from the Virtual Film My Run Channel - featuring treadmill running sessions, training streams, and more.
                </p>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 text-center">
                  <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-zinc-400">Checking for live streams...</p>
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 text-center">
                  <p className="text-zinc-400 mb-4">{error}</p>
                  <a
                    href={CHANNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-full hover:bg-red-600 transition-colors"
                  >
                    <Youtube className="w-5 h-5" />
                    Visit Channel
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Live Stream */}
              {!isLoading && !error && streamInfo.type === 'live' && streamInfo.videoId && (
                <div className="space-y-6">
                  <div className="bg-zinc-900 rounded-2xl border border-red-500/50 overflow-hidden">
                    {/* Live Badge */}
                    <div className="flex items-center justify-between px-6 py-4 bg-red-500/10 border-b border-red-500/30">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-2 px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          LIVE
                        </span>
                        <span className="text-white font-medium">{streamInfo.title}</span>
                      </div>
                    </div>

                    {/* Video Player */}
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${streamInfo.videoId}?autoplay=1&mute=1`}
                        title="Live Stream"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <a
                      href={`https://www.youtube.com/watch?v=${streamInfo.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Youtube className="w-5 h-5" />
                      Watch on YouTube
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {/* Upcoming Stream */}
              {!isLoading && !error && streamInfo.type === 'upcoming' && streamInfo.videoId && (
                <div className="space-y-6">
                  <div className="bg-zinc-900 rounded-2xl border border-orange-500/50 overflow-hidden">
                    {/* Upcoming Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 bg-orange-500/10 border-b border-orange-500/30">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-2 px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded-full">
                          <Calendar className="w-4 h-4" />
                          UPCOMING
                        </span>
                        <span className="text-white font-medium">{streamInfo.title}</span>
                      </div>
                      {streamInfo.scheduledStart && (
                        <div className="flex items-center gap-2 text-orange-400 text-sm">
                          <Clock className="w-4 h-4" />
                          {formatScheduledTime(streamInfo.scheduledStart)}
                        </div>
                      )}
                    </div>

                    {/* Video Player (shows countdown/waiting room) */}
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${streamInfo.videoId}`}
                        title="Upcoming Stream"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <a
                      href={`https://www.youtube.com/watch?v=${streamInfo.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      <Youtube className="w-5 h-5" />
                      Set Reminder on YouTube
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {/* No Live Stream - Show Channel */}
              {!isLoading && !error && streamInfo.type === 'none' && (
                <div className="space-y-8">
                  {/* Channel Embed */}
                  <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                    <div className="px-6 py-4 bg-zinc-800/50 border-b border-zinc-800">
                      <div className="flex items-center gap-3">
                        <Tv className="w-5 h-5 text-zinc-400" />
                        <span className="text-white font-medium">Virtual Film My Run Channel</span>
                      </div>
                    </div>

                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src="https://www.youtube.com/embed?listType=user_uploads&list=UCvc-1cdDnoYjvSFwE69l8JQ"
                        title="Virtual Film My Run Channel"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>

                  {/* Info Card */}
                  <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 text-center">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Radio className="w-8 h-8 text-zinc-500" />
                    </div>
                    <h2 className="font-display text-xl font-semibold text-white mb-3">
                      No Live Stream Right Now
                    </h2>
                    <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                      Check out recent videos from the Virtual Film My Run Channel above, or subscribe to get notified when we go live.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <a
                        href={CHANNEL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-full hover:bg-red-600 transition-colors"
                      >
                        <Youtube className="w-5 h-5" />
                        Subscribe to Channel
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <Link
                        href="/films"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white font-semibold rounded-full hover:bg-zinc-700 transition-colors"
                      >
                        Watch Race Films
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* About Section */}
              <div className="mt-16 grid md:grid-cols-2 gap-6">
                <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                  <h3 className="font-display text-lg font-semibold text-white mb-3">
                    What is Virtual Film My Run?
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Virtual Film My Run features live treadmill running sessions, training streams, and interactive content. Join the community and run along from anywhere in the world.
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                  <h3 className="font-display text-lg font-semibold text-white mb-3">
                    Get Notified
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                    Subscribe to the YouTube channel and turn on notifications to never miss a live stream.
                  </p>
                  <a
                    href={`${CHANNEL_URL}?sub_confirmation=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 text-sm transition-colors"
                  >
                    <Youtube className="w-4 h-4" />
                    Subscribe Now
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
