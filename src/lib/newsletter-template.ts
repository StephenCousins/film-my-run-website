export interface NewsletterPayload {
  subject: string;
  intro?: string;
  news?: { title: string; url: string; source: string; imageUrl?: string; description?: string }[];
  blogPost?: { title: string; url: string; snippet: string; imageUrl?: string };
  videoOfTheWeek?: { title: string; url: string; description: string; thumbnailUrl: string };
  appOfTheWeek?: { name: string; url: string; description: string };
  sessionOfTheWeek?: { title: string; description: string };
  trainingTip?: { text: string; citation?: string };
  scienceSection?: { text: string; citation?: string };
  nutritionTip?: { text: string; citation?: string };
  parkrun?: { text: string; totalRuns?: number; venues?: number; avgTime?: string };
  fromTheArchives?: { title: string; url: string; description: string; imageUrl?: string };
  whatsNew?: { text: string };
}

// ─── Palette (light-first design) ───
const ORANGE = '#f88c00';
const DEEP = '#2d2926';
const SLATE = '#4a4541';
const GREY = '#6b6560';
const OLIVE = '#6b7a3f';
const CREAM = '#faf8f5';
const LIGHT_GREY = '#f5f3f0';
const WARM_PEACH = '#fff3e0';
const WHITE = '#ffffff';
const RULE = '#ebe7e2';
const OUTER_BG = '#f0eeeb';

// ─── Fonts ───
const DISPLAY = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── MSO fix string ───
const MSO_TABLE = 'border-collapse:collapse;border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt;';

/** Escapes HTML special characters so raw editor text can't break markup. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Converts a plain-text textarea value into email-safe HTML, preserving line
 * breaks the way the author typed them (blank line = paragraph gap). Raw HTML
 * has no idea about `\n` — without this, every newline the editor typed just
 * gets collapsed away and the text renders as one run-on paragraph.
 */
function textToHtml(text: string): string {
  return escapeHtml(text).split(/\n/).join('<br/>');
}

// ═══════════════════════════════════════════
//  GRAPHIC HELPERS
// ═══════════════════════════════════════════

/** Thin horizontal rule within a section */
function thinRule(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:1px;background:${RULE};font-size:0;">&nbsp;</td></tr></table>`;
}

/**
 * Film-strip sprocket row — a line of punched "holes" used to frame the
 * masthead and footer like a strip of 16mm film. Pure table cells + background
 * colors, so it survives Gmail/Outlook (no images, no positioning).
 */
function sprocketRow(holeColor: string): string {
  const count = 13;
  const pct = (100 / count).toFixed(2);
  const cells = Array.from({ length: count })
    .map(
      () =>
        `<td width="${pct}%" align="center" style="padding:0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width:14px;height:10px;background:${holeColor};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td></tr></table></td>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`;
}

/**
 * Right-pointing play triangle built from CSS borders (no image, no unicode —
 * unicode &#9654; gets emoji-styled on some mobile clients). Degrades to
 * nothing in old Outlook, which is acceptable.
 */
function playTriangle(size: number, color: string): string {
  const half = Math.round(size * 0.65);
  return `<div style="width:0;height:0;border-top:${half}px solid transparent;border-bottom:${half}px solid transparent;border-left:${size}px solid ${color};font-size:0;line-height:0;"></div>`;
}

/** CTA button — 3 variants */
function ctaButton(url: string, label: string, variant: 'orange' | 'ghost-dark' | 'ghost-orange' = 'orange'): string {
  const map: Record<string, { bg: string; border: string; color: string }> = {
    'orange': { bg: ORANGE, border: ORANGE, color: WHITE },
    'ghost-dark': { bg: 'transparent', border: DEEP, color: DEEP },
    'ghost-orange': { bg: 'transparent', border: ORANGE, color: ORANGE },
  };
  const s = map[variant];
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:6px;background:${s.bg};border:2px solid ${s.border};"><a href="${url}" style="display:inline-block;padding:14px 36px;font-family:${SANS};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-decoration:none;color:${s.color};">${label}</a></td></tr></table>`;
}

/**
 * Email-safe image with an orange accent border.
 *
 * Gmail strips position:absolute/relative, so CSS triangle overlays
 * are invisible. Instead we use a 4px orange bottom border for brand accent.
 *
 * `aspectRatio` (width/height, e.g. 1.5 for 3:2) crops tall source photos
 * down via object-fit so a portrait hero shot can't push the headline below
 * the fold. Clients without object-fit support (older Outlook) will stretch
 * the image instead of cropping it — an accepted tradeoff for this audience.
 */
function angularImage(
  imageUrl: string,
  alt: string,
  linkUrl: string,
  width: number,
  aspectRatio?: number,
): string {
  const heightStyle = aspectRatio
    ? `height:${Math.round(width / aspectRatio)}px;object-fit:cover;object-position:center;`
    : `height:auto;`;
  return `<a href="${linkUrl}" style="text-decoration:none;display:block;">
    <img src="${imageUrl}" alt="${alt}" width="${width}" style="display:block;width:100%;max-width:${width}px;${heightStyle}border:0;border-bottom:4px solid ${ORANGE};" />
  </a>`;
}


// ═══════════════════════════════════════════
//  SECTION RENDERERS
// ═══════════════════════════════════════════

function renderIntro(text: string): string {
  return `<tr><td style="background:${CREAM};padding:32px 48px 36px;" class="section-pad">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-family:${DISPLAY};font-size:18px;line-height:1.8;color:${SLATE};font-style:italic;">${textToHtml(text)}</td></tr>
      <tr><td style="padding-top:14px;font-family:${DISPLAY};font-size:16px;font-style:italic;color:${DEEP};">
        <span style="color:${ORANGE};">&mdash;</span>&nbsp;Stephen
      </td></tr>
    </table>
  </td></tr>`;
}

function renderBlogPost(post: NonNullable<NewsletterPayload['blogPost']>): string {
  const image = post.imageUrl
    ? `<tr><td style="padding:0;font-size:0;line-height:0;">
        ${angularImage(post.imageUrl, post.title, post.url, 600, 1.5)}
      </td></tr>`
    : '';

  return `<tr><td style="background:${WHITE};padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:28px 48px 16px;" class="section-pad">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">Latest Post</span>
      </td></tr>
      ${image}
      <tr><td style="padding:28px 48px 44px;" class="section-pad">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding-bottom:16px;">
            <a href="${post.url}" style="text-decoration:none;">
              <h2 style="margin:0;font-family:${DISPLAY};font-size:36px;font-weight:700;line-height:1.2;color:${DEEP};">${post.title}</h2>
            </a>
          </td></tr>
          <tr><td style="padding-bottom:28px;">
            <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.75;color:${GREY};">${textToHtml(post.snippet)}</p>
          </td></tr>
          <tr><td>${ctaButton(post.url, 'Read the Full Story')}</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}

function renderVideo(video: NonNullable<NewsletterPayload['videoOfTheWeek']>): string {
  // 16:9 crop removes the letterbox bars baked into YouTube hqdefault thumbs
  const thumbHeight = Math.round(504 / (16 / 9));

  return `<tr><td style="background:${LIGHT_GREY};padding:36px 48px 44px;" class="section-pad">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:16px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">Video of the Week</span>
      </td></tr>
      <tr><td style="padding-bottom:20px;">
        <h2 style="margin:0;font-family:${DISPLAY};font-size:22px;font-weight:700;line-height:1.3;color:${DEEP};">${video.title}</h2>
        <p style="margin:6px 0 0;font-family:${SANS};font-size:13px;font-weight:500;color:${GREY};">${video.description}</p>
      </td></tr>
      <tr><td style="padding-bottom:28px;font-size:0;line-height:0;">
        <a href="${video.url}" style="text-decoration:none;display:block;">
          <img src="${video.thumbnailUrl}" alt="${video.title}" width="504" style="display:block;width:100%;max-width:504px;height:${thumbHeight}px;object-fit:cover;object-position:center;border:0;" />
        </a>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="background:${DEEP};padding:11px 16px;border-bottom:4px solid ${ORANGE};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <a href="${video.url}" style="text-decoration:none;display:block;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td style="padding-right:10px;">${playTriangle(11, ORANGE)}</td>
                    <td style="font-family:${SANS};font-size:11px;font-weight:700;color:${CREAM};text-transform:uppercase;letter-spacing:2px;line-height:1;">Press Play</td>
                  </tr></table>
                </a>
              </td>
              <td align="right">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td valign="bottom"><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:8px solid #5a534d;font-size:0;line-height:0;"></div></td>
                  <td valign="bottom" style="padding-left:2px;"><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:12px solid #756c64;font-size:0;line-height:0;"></div></td>
                  <td valign="bottom" style="padding-left:2px;"><div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:6px solid #5a534d;font-size:0;line-height:0;"></div></td>
                </tr></table>
              </td>
            </tr></table>
          </td>
        </tr></table>
      </td></tr>
      <tr><td>${ctaButton(video.url, 'Watch Now', 'ghost-orange')}</td></tr>
    </table>
  </td></tr>`;
}

function renderNews(items: NonNullable<NewsletterPayload['news']>, newsPageUrl: string): string {
  const [first, ...rest] = items;

  const firstImage = first.imageUrl
    ? `<tr><td style="padding-bottom:20px;font-size:0;line-height:0;">
        ${angularImage(first.imageUrl, '', newsPageUrl, 504)}
      </td></tr>`
    : '';

  const firstDesc = first.description
    ? `<p style="margin:8px 0 0;font-family:${SANS};font-size:14px;line-height:1.7;color:${GREY};">${first.description}</p>`
    : '';

  const featured = `
    ${firstImage}
    <tr><td style="padding-bottom:6px;">
      <span style="font-family:${SANS};font-size:12px;font-weight:800;color:${ORANGE};">01</span>
      <span style="font-family:${SANS};font-size:11px;font-weight:600;color:${GREY};letter-spacing:0.5px;">&nbsp;&nbsp;${first.source}</span>
    </td></tr>
    <tr><td style="padding-bottom:24px;">
      <a href="${newsPageUrl}" style="text-decoration:none;">
        <span style="font-family:${DISPLAY};font-size:20px;font-weight:700;line-height:1.35;color:${DEEP};">${first.title}</span>
      </a>
      ${firstDesc}
    </td></tr>`;

  const compact = rest
    .map((item, i) => {
      const num = String(i + 2).padStart(2, '0');
      return `<tr><td style="padding-bottom:20px;">
        ${thinRule()}
      </td></tr>
      <tr><td style="padding-bottom:20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td valign="top" style="width:32px;">
            <span style="font-family:${SANS};font-size:12px;font-weight:800;color:${ORANGE};">${num}</span>
          </td>
          <td valign="top">
            <span style="font-family:${SANS};font-size:11px;font-weight:600;color:${GREY};letter-spacing:0.5px;">${item.source}</span><br/>
            <a href="${newsPageUrl}" style="text-decoration:none;">
              <span style="font-family:${DISPLAY};font-size:16px;font-weight:700;line-height:1.4;color:${DEEP};">${item.title}</span>
            </a>
          </td>
        </tr></table>
      </td></tr>`;
    })
    .join('');

  return `<tr><td style="background:${WHITE};padding:36px 48px 44px;" class="section-pad">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:6px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">Trail &amp; Ultra News</span>
      </td></tr>
      <tr><td style="padding-bottom:24px;">
        <h2 style="margin:0;font-family:${DISPLAY};font-size:22px;font-weight:700;color:${DEEP};">This Week in Running</h2>
      </td></tr>
      ${featured}
      ${compact}
      <tr><td>${ctaButton(newsPageUrl, 'All Stories &rarr;', 'ghost-dark')}</td></tr>
    </table>
  </td></tr>`;
}

function renderParkrun(parkrun: NonNullable<NewsletterPayload['parkrun']>): string {
  // Stats cards (show if data provided)
  const totalRuns = parkrun.totalRuns ?? 299;
  const venues = parkrun.venues ?? 73;
  const avgTime = parkrun.avgTime ?? '23:19';

  const statsRow = `<tr><td style="padding-top:28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="33%" align="center" style="padding:18px 8px;background:${WHITE};border-radius:6px;">
          <span style="display:block;font-family:${SANS};font-size:30px;font-weight:800;color:${ORANGE};line-height:1;" class="stat-num">${totalRuns}</span>
          <span style="display:block;font-family:${SANS};font-size:10px;font-weight:600;color:${GREY};text-transform:uppercase;letter-spacing:1px;margin-top:6px;">Total Runs</span>
        </td>
        <td style="width:12px;">&nbsp;</td>
        <td width="34%" align="center" style="padding:18px 8px;background:${WHITE};border-radius:6px;">
          <span style="display:block;font-family:${SANS};font-size:30px;font-weight:800;color:${ORANGE};line-height:1;" class="stat-num">${venues}</span>
          <span style="display:block;font-family:${SANS};font-size:10px;font-weight:600;color:${GREY};text-transform:uppercase;letter-spacing:1px;margin-top:6px;">Venues</span>
        </td>
        <td style="width:12px;">&nbsp;</td>
        <td width="33%" align="center" style="padding:18px 8px;background:${WHITE};border-radius:6px;">
          <span style="display:block;font-family:${SANS};font-size:30px;font-weight:800;color:${ORANGE};line-height:1;" class="stat-num">${avgTime}</span>
          <span style="display:block;font-family:${SANS};font-size:10px;font-weight:600;color:${GREY};text-transform:uppercase;letter-spacing:1px;margin-top:6px;">Avg Time</span>
        </td>
      </tr>
    </table>
  </td></tr>`;

  return `<tr><td style="background:${WARM_PEACH};padding:32px 48px 40px;" class="section-pad">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:16px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">parkrun</span>
      </td></tr>
      <tr><td>
        <p style="margin:0;font-family:${DISPLAY};font-size:19px;line-height:1.7;color:${SLATE};font-style:italic;">${textToHtml(parkrun.text)}</p>
      </td></tr>
      ${statsRow}
    </table>
  </td></tr>`;
}

function renderCards(
  app?: NewsletterPayload['appOfTheWeek'],
  session?: NewsletterPayload['sessionOfTheWeek']
): string {
  const cards: string[] = [];

  if (app) {
    cards.push(`<tr><td style="background:${CREAM};padding:28px 28px 28px 32px;border-left:3px solid ${ORANGE};border-radius:0 6px 6px 0;">
      <span style="font-family:${SANS};font-size:10px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2px;">App / Tool of the Week</span>
      <h3 style="margin:10px 0 8px;font-family:${DISPLAY};font-size:22px;font-weight:700;color:${DEEP};">
        <a href="${app.url}" style="text-decoration:none;color:${DEEP};">${app.name}</a>
      </h3>
      <p style="margin:0 0 14px;font-family:${SANS};font-size:14px;line-height:1.7;color:${GREY};">${textToHtml(app.description)}</p>
      <a href="${app.url}" style="font-family:${SANS};font-size:13px;font-weight:700;color:${ORANGE};text-decoration:none;">Try it &rarr;</a>
    </td></tr>`);
  }

  if (session) {
    if (app) cards.push(`<tr><td style="height:16px;font-size:0;">&nbsp;</td></tr>`);
    cards.push(`<tr><td style="background:${CREAM};padding:28px 28px 28px 32px;border-left:3px solid ${DEEP};border-radius:0 6px 6px 0;">
      <span style="font-family:${SANS};font-size:10px;font-weight:700;color:${DEEP};text-transform:uppercase;letter-spacing:2px;">Session of the Week</span>
      <h3 style="margin:10px 0 8px;font-family:${DISPLAY};font-size:22px;font-weight:700;color:${DEEP};">${session.title}</h3>
      <p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.7;color:${GREY};">${textToHtml(session.description)}</p>
    </td></tr>`);
  }

  return `<tr><td style="background:${WHITE};padding:36px 48px 44px;" class="section-pad">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards.join('')}</table>
  </td></tr>`;
}

type TipItem = { label: string; text: string; accent: string; citation?: string };

function renderTips(tips: TipItem[]): string {
  const items = tips
    .map((tip, i) => {
      const cite = tip.citation
        ? `<p style="margin:12px 0 0;font-family:${SANS};font-size:11px;font-style:italic;color:${GREY};">${tip.citation}</p>`
        : '';
      const spacer = i < tips.length - 1
        ? `<tr><td style="height:20px;font-size:0;">&nbsp;</td></tr>`
        : '';
      return `<tr><td style="background:${WHITE};padding:24px 24px 24px 28px;border-left:3px solid ${tip.accent};border-radius:0 6px 6px 0;">
        <span style="font-family:${SANS};font-size:10px;font-weight:700;color:${tip.accent};text-transform:uppercase;letter-spacing:2px;">${tip.label}</span>
        <p style="margin:10px 0 0;font-family:${SANS};font-size:14px;line-height:1.75;color:${SLATE};">${textToHtml(tip.text)}</p>
        ${cite}
      </td></tr>${spacer}`;
    })
    .join('');

  return `<tr><td style="background:${CREAM};padding:36px 48px 44px;" class="section-pad">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:6px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">Knowledge Corner</span>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <h2 style="margin:0;font-family:${DISPLAY};font-size:22px;font-weight:700;color:${DEEP};">Tips &amp; Insights</h2>
      </td></tr>
      ${items}
    </table>
  </td></tr>`;
}

function renderArchives(item: NonNullable<NewsletterPayload['fromTheArchives']>): string {
  const image = item.imageUrl
    ? `<tr><td style="padding-bottom:20px;font-size:0;line-height:0;">
        ${angularImage(item.imageUrl, item.title, item.url, 504)}
      </td></tr>`
    : '';

  return `<tr><td style="background:${WHITE};padding:36px 48px 44px;" class="section-pad">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:6px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">From the Archives</span>
      </td></tr>
      <tr><td style="padding-bottom:24px;">
        <h2 style="margin:0;font-family:${DISPLAY};font-size:22px;font-weight:700;color:${DEEP};line-height:1.25;">Worth Another Look</h2>
      </td></tr>
      ${image}
      <tr><td style="padding-bottom:12px;">
        <a href="${item.url}" style="text-decoration:none;">
          <span style="font-family:${DISPLAY};font-size:20px;font-weight:700;line-height:1.35;color:${DEEP};">${item.title}</span>
        </a>
      </td></tr>
      <tr><td style="padding-bottom:24px;">
        <p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.7;color:${GREY};">${textToHtml(item.description)}</p>
      </td></tr>
      <tr><td>${ctaButton(item.url, 'Read Again &rarr;', 'ghost-dark')}</td></tr>
    </table>
  </td></tr>`;
}

function renderWhatsNew(text: string): string {
  return `<tr><td style="background:${WHITE};padding:36px 48px 44px;" class="section-pad">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:6px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">What&rsquo;s New</span>
      </td></tr>
      <tr><td style="padding-bottom:20px;">
        <h2 style="margin:0;font-family:${DISPLAY};font-size:22px;font-weight:700;color:${DEEP};line-height:1.25;">On the Site</h2>
      </td></tr>
      <tr><td>
        <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.7;color:${GREY};">${textToHtml(text)}</p>
      </td></tr>
    </table>
  </td></tr>`;
}

const R2_URL = 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev';

function renderSponsors(): string {
  const sponsors = [
    { name: 'NoblePro', url: 'https://noble-pro.com', logo: `${R2_URL}/newsletter/sponsors/noblepro-logo.png`, width: 140 },
    { name: 'Enertor', url: 'https://enertor.com', logo: `${R2_URL}/newsletter/sponsors/enertor-logo.png`, width: 130 },
    { name: 'Protein Rebel', url: 'https://proteinrebel.com', logo: `${R2_URL}/newsletter/sponsors/protein-rebel-logo.png`, width: 55 },
    { name: 'Flying Burrito', url: 'https://flyingburrito.eu', logo: `${R2_URL}/newsletter/sponsors/flying-burrito-logo.png`, width: 80 },
  ];

  const card = (s: (typeof sponsors)[number]) =>
    `<td width="50%" class="mob-stack" style="padding:5px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" valign="middle" height="76" style="background:${WHITE};border:1px solid ${RULE};border-radius:6px;height:76px;padding:12px 16px;">
          <a href="${s.url}" style="text-decoration:none;">
            <img src="${s.logo}" alt="${s.name}" width="${s.width}" style="display:inline-block;width:${s.width}px;max-width:100%;max-height:52px;border:0;" />
          </a>
        </td></tr>
      </table>
    </td>`;

  return `<tr><td style="background:${CREAM};padding:32px 43px 36px;" align="center" class="section-pad">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding-bottom:18px;">
        <span style="font-family:${SANS};font-size:10px;font-weight:700;color:${GREY};text-transform:uppercase;letter-spacing:2.5px;">Thanks to Our Sponsors</span>
      </td></tr>
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>${card(sponsors[0])}${card(sponsors[1])}</tr>
          <tr>${card(sponsors[2])}${card(sponsors[3])}</tr>
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}


// ═══════════════════════════════════════════
//  APPROVAL BANNER
// ═══════════════════════════════════════════

export function wrapWithApprovalBanner(html: string, approveUrl: string, editUrl?: string): string {
  const editLink = editUrl
    ? `<p style="margin: 16px 0 0; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <a href="${editUrl}" style="color: #92400e; text-decoration: underline;">Not happy with it? Edit before sending &rarr;</a>
      </p>`
    : '';

  const banner = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border: 2px solid #f59e0b;">
      <tr>
        <td align="center" style="padding: 24px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
            <tr>
              <td align="center" style="padding: 20px 24px; background-color: #fffbeb; border-radius: 8px;">
                <p style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #92400e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  DRAFT — Review this newsletter
                </p>
                <p style="margin: 0 0 20px; font-size: 14px; color: #a16207; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  This email was sent only to you for review.
                </p>
                <a href="${approveUrl}" style="display: inline-block; padding: 14px 32px; background-color: #16a34a; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  Approve &amp; Send to All Subscribers
                </a>
                ${editLink}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  return html.replace(/(<body[^>]*>)/, `$1${banner}`);
}


// ═══════════════════════════════════════════
//  MAIN BUILD FUNCTION
// ═══════════════════════════════════════════

export function buildNewsletterHtml(
  payload: NewsletterPayload,
  unsubscribeUrl: string,
  baseUrl: string,
  viewInBrowserUrl?: string
): string {
  // ── Gather content blocks ──
  const body: string[] = [];

  if (payload.intro) {
    body.push(renderIntro(payload.intro));
  }
  if (payload.blogPost) {
    body.push(renderBlogPost(payload.blogPost));
  }
  if (payload.videoOfTheWeek) {
    body.push(renderVideo(payload.videoOfTheWeek));
  }
  if (payload.news?.length) {
    body.push(renderNews(payload.news, `${baseUrl}/news`));
  }
  if (payload.parkrun) {
    body.push(renderParkrun(payload.parkrun));
  }
  if (payload.appOfTheWeek || payload.sessionOfTheWeek) {
    body.push(renderCards(payload.appOfTheWeek, payload.sessionOfTheWeek));
  }

  // Combine tips into one section
  const tips: TipItem[] = [];
  if (payload.trainingTip) tips.push({ label: 'Training Tip', text: payload.trainingTip.text, accent: ORANGE, citation: payload.trainingTip.citation });
  if (payload.scienceSection) tips.push({ label: 'Science Says', text: payload.scienceSection.text, accent: DEEP, citation: payload.scienceSection.citation });
  if (payload.nutritionTip) tips.push({ label: 'Nutrition', text: payload.nutritionTip.text, accent: OLIVE, citation: payload.nutritionTip.citation });
  if (tips.length > 0) {
    body.push(renderTips(tips));
  }

  if (payload.fromTheArchives) {
    body.push(renderArchives(payload.fromTheArchives));
  }
  if (payload.whatsNew) {
    body.push(renderWhatsNew(payload.whatsNew.text));
  }

  // ── Date ──
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // ── View in browser link ──
  const viewLink = viewInBrowserUrl
    ? `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:10px 0 16px;">
          <a href="${viewInBrowserUrl}" style="font-family:${SANS};font-size:11px;color:${GREY};text-decoration:underline;">View this email in your browser</a>
        </td></tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${payload.subject}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,400;1,700&display=swap');

    @media only screen and (max-width: 620px) {
      .email-wrap { width: 100% !important; }
      .mob-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .mob-full { width: 100% !important; height: auto !important; }
      .mob-hide { display: none !important; }
      .mob-stack { display: block !important; width: 100% !important; }
      .section-pad { padding-left: 24px !important; padding-right: 24px !important; }
      .hero-title { font-size: 24px !important; }
      .stat-num { font-size: 22px !important; }
      .mast-title { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${OUTER_BG};font-family:${SANS};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:0;">
    ${escapeHtml(payload.intro || payload.subject)}${'&#847; &zwnj; &nbsp;'.repeat(40)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${OUTER_BG};">
    <tr><td align="center" style="padding:20px 16px;">

      ${viewLink}

      <table role="presentation" class="email-wrap" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;${MSO_TABLE}">

        <!-- ══ MASTHEAD — Film-strip band ══ -->
        <tr><td style="background:${DEEP};padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 22px 0;">${sprocketRow(OUTER_BG)}</td></tr>
            <tr><td align="center" style="padding:32px 40px 10px;" class="section-pad">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="padding-right:14px;" valign="middle">${playTriangle(15, ORANGE)}</td>
                <td valign="middle">
                  <h1 class="mast-title" style="margin:0;font-family:${DISPLAY};font-size:32px;font-weight:700;color:${CREAM};letter-spacing:2px;text-transform:uppercase;line-height:1;">Film My Run</h1>
                </td>
              </tr></table>
            </td></tr>
            <tr><td align="center" style="padding:0 40px 30px;">
              <span style="font-family:${SANS};font-size:11px;font-weight:600;color:#a89f96;text-transform:uppercase;letter-spacing:2.5px;">The Weekly Round-Up&nbsp;&nbsp;<span style="color:${ORANGE};">&middot;</span>&nbsp;&nbsp;${today}</span>
            </td></tr>
            <tr><td style="padding:0 22px 12px;">${sprocketRow(OUTER_BG)}</td></tr>
          </table>
        </td></tr>

        <!-- ══ CONTENT SECTIONS ══ -->
        ${body.join('\n')}

        <!-- ══ SPONSORS ══ -->
        ${renderSponsors()}

        <!-- ══ FOOTER — Film-strip band (mirrors masthead) ══ -->
        <tr><td style="padding:0;font-size:0;line-height:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:3px;background:${ORANGE};font-size:0;line-height:0;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td style="background:${DEEP};padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 22px 0;">${sprocketRow(OUTER_BG)}</td></tr>
            <tr><td align="center" style="padding:28px 48px 0;" class="section-pad">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="padding-right:10px;" valign="middle">${playTriangle(10, ORANGE)}</td>
                <td valign="middle">
                  <span style="font-family:${DISPLAY};font-size:18px;font-weight:700;color:${CREAM};letter-spacing:2px;text-transform:uppercase;line-height:1;">Film My Run</span>
                </td>
              </tr></table>
            </td></tr>
            <tr><td align="center" style="padding:8px 48px 20px;">
              <span style="font-family:${DISPLAY};font-size:14px;font-style:italic;color:#a89f96;">Every run tells a story.</span>
            </td></tr>
            <tr><td align="center" style="padding:0 48px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 14px;"><a href="https://youtube.com/@filmmyrun" style="font-family:${SANS};font-size:11px;font-weight:600;color:#c9c1b8;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">YouTube</a></td>
                  <td style="color:#5a534d;font-size:11px;">&middot;</td>
                  <td style="padding:0 14px;"><a href="https://instagram.com/filmmyrun" style="font-family:${SANS};font-size:11px;font-weight:600;color:#c9c1b8;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">Instagram</a></td>
                  <td style="color:#5a534d;font-size:11px;">&middot;</td>
                  <td style="padding:0 14px;"><a href="https://twitter.com/filmmyrun" style="font-family:${SANS};font-size:11px;font-weight:600;color:#c9c1b8;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">Twitter</a></td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding:0 48px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:1px;background:#453f3a;font-size:0;">&nbsp;</td></tr></table>
            </td></tr>
            <tr><td align="center" style="padding:0 48px 26px;">
              <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.8;color:#a89f96;">
                You&rsquo;re receiving this because you subscribed to the Film My Run newsletter.<br/>
                <a href="${unsubscribeUrl}" style="color:#a89f96;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td></tr>
            <tr><td style="padding:0 22px 12px;">${sprocketRow(OUTER_BG)}</td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
