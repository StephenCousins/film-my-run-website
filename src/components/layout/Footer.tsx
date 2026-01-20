'use client';

import Link from 'next/link';
import { Instagram, Youtube, Twitter, Mail, MapPin, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// FOOTER DATA
// ============================================

const footerLinks = {
  tools: {
    title: 'Running Tools',
    links: [
      { name: 'Pace Calculator', href: '/tools/calculators' },
      { name: 'Race Predictor', href: '/tools/calculators' },
      { name: 'Parkrun Stats', href: '/tools/parkrun' },
      { name: 'Race Map', href: '/tools/race-map' },
      { name: 'Race Dashboard', href: '/races' },
    ],
  },
  services: {
    title: 'Services',
    links: [
      { name: 'Race Filming', href: '/services/filming' },
      { name: 'Event Coverage', href: '/services/events' },
      { name: 'Training Plans', href: '/training' },
      { name: 'Shop', href: '/shop' },
    ],
  },
  content: {
    title: 'Content',
    links: [
      { name: 'Blog', href: '/blog' },
      { name: 'Films', href: '/films' },
      { name: 'Live Events', href: '/live' },
      { name: 'Discount Codes', href: '/discounts' },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { name: 'About', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
    ],
  },
};

const socialLinks = [
  { name: 'Instagram', href: 'https://instagram.com/filmmyrun', icon: Instagram },
  { name: 'YouTube', href: 'https://youtube.com/@filmmyrun', icon: Youtube },
  { name: 'Twitter', href: 'https://twitter.com/filmmyrun', icon: Twitter },
];

// ============================================
// LOGO COMPONENT
// ============================================

function FooterLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <svg
            key={i}
            className={cn(
              'w-6 h-6 text-orange-500 transition-transform duration-300',
              'group-hover:scale-110',
              i === 0 && 'group-hover:-translate-x-0.5',
              i === 2 && 'group-hover:translate-x-0.5'
            )}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z" />
          </svg>
        ))}
      </div>
      <span className="font-display text-xl font-semibold text-white">
        Film My Run
      </span>
    </Link>
  );
}

// ============================================
// NEWSLETTER FORM
// ============================================

function NewsletterForm() {
  return (
    <div className="max-w-md">
      <h3 className="font-display text-lg font-semibold text-white mb-2">
        Stay in the loop
      </h3>
      <p className="text-zinc-400 text-sm mb-4">
        Get race updates, new tools, and exclusive content delivered to your inbox.
      </p>
      <form className="flex gap-2">
        <input
          type="email"
          placeholder="your@email.com"
          className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-full text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
        />
        <button
          type="submit"
          className="px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors whitespace-nowrap"
        >
          Subscribe
        </button>
      </form>
    </div>
  );
}

// ============================================
// LINK COLUMN
// ============================================

interface LinkColumnProps {
  title: string;
  links: { name: string; href: string }[];
}

function LinkColumn({ title, links }: LinkColumnProps) {
  return (
    <div>
      <h4 className="font-display font-semibold text-white mb-4">{title}</h4>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.name}>
            <Link
              href={link.href}
              className="text-zinc-400 hover:text-orange-500 transition-colors text-sm"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// MAIN FOOTER COMPONENT
// ============================================

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 border-t border-zinc-800">
      {/* Main footer content */}
      <div className="container py-16 lg:py-20">
        {/* Top row: Brand + Newsletter */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12 mb-16">
          {/* Brand */}
          <div className="lg:max-w-sm">
            <FooterLogo />
            <p className="mt-4 text-zinc-400 text-sm leading-relaxed">
              Capturing the spirit of running since 2011. From parkruns to ultras,
              we film, we run, we celebrate every stride.
            </p>

            {/* Social links */}
            <div className="flex gap-3 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-zinc-800 rounded-full hover:bg-orange-500 transition-colors group"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <NewsletterForm />
        </div>

        {/* Bottom row: Link columns spread evenly */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-16 pt-12 border-t border-zinc-800">
          <LinkColumn {...footerLinks.tools} />
          <LinkColumn {...footerLinks.services} />
          <LinkColumn {...footerLinks.content} />
          <LinkColumn {...footerLinks.company} />
        </div>

        {/* Contact info */}
        <div className="flex flex-wrap gap-6 mt-12 pt-8 border-t border-zinc-800">
          <a
            href="mailto:hello@filmmyrun.co.uk"
            className="flex items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors text-sm"
          >
            <Mail className="w-4 h-4" />
            hello@filmmyrun.co.uk
          </a>
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <MapPin className="w-4 h-4" />
            United Kingdom
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-t border-zinc-800">
        <div className="container py-6">
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div>
              <span className="font-display text-2xl font-bold text-orange-500">500+</span>
              <p className="text-zinc-500 text-xs mt-1">Races Filmed</p>
            </div>
            <div>
              <span className="font-display text-2xl font-bold text-orange-500">15</span>
              <p className="text-zinc-500 text-xs mt-1">Years Running</p>
            </div>
            <div>
              <span className="font-display text-2xl font-bold text-orange-500">250K</span>
              <p className="text-zinc-500 text-xs mt-1">Weekly Tool Users</p>
            </div>
            <div>
              <span className="font-display text-2xl font-bold text-orange-500">1M+</span>
              <p className="text-zinc-500 text-xs mt-1">Video Views</p>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-zinc-800">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-zinc-500 text-xs">
            <p>&copy; {currentYear} Film My Run. All rights reserved.</p>
            <div className="flex items-center gap-1">
              <Camera className="w-3 h-3" />
              <span>Made with passion for the running community</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
