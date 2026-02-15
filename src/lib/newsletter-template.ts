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
const SILVER = '#9e9893';
const MUTED = '#b5b0ab';
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

// ═══════════════════════════════════════════
//  GRAPHIC HELPERS
// ═══════════════════════════════════════════

/**
 * SVG-based diagonal divider — creates a visible diagonal line with an orange
 * triangle sweeping across the section transition.
 *
 * dir='ltr': Orange triangle grows from bottom-left
 * dir='rtl': Orange triangle grows from top-right
 */
function svgDivider(fromBg: string, toBg: string, dir: 'ltr' | 'rtl' = 'ltr'): string {
  // Encode colors for SVG data URI
  const enc = (c: string) => c.replace('#', '%23');

  let svg: string;
  if (dir === 'ltr') {
    // Diagonal from top-right to bottom-left; orange triangle on bottom-left
    svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 50' preserveAspectRatio='none'%3E%3Cpolygon points='0,0 600,0 600,50' fill='${enc(fromBg)}'/%3E%3Cpolygon points='0,0 0,50 600,50' fill='${enc(toBg)}'/%3E%3Cpolygon points='0,0 300,50 0,50' fill='${enc(ORANGE)}'/%3E%3C/svg%3E`;
  } else {
    // Diagonal from top-left to bottom-right; orange triangle on top-right
    svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 50' preserveAspectRatio='none'%3E%3Cpolygon points='0,0 600,0 0,50' fill='${enc(fromBg)}'/%3E%3Cpolygon points='600,0 600,50 0,50' fill='${enc(toBg)}'/%3E%3Cpolygon points='300,0 600,0 600,50' fill='${enc(ORANGE)}'/%3E%3C/svg%3E`;
  }

  return `<tr><td style="padding:0;font-size:0;line-height:0;"><img src="${svg}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" /></td></tr>`;
}

/** Thin horizontal rule within a section */
function thinRule(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:1px;background:${RULE};font-size:0;">&nbsp;</td></tr></table>`;
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
 * Wraps an image URL in a container with angular orange triangle overlays.
 * cornerPosition determines where the main orange triangle appears.
 */
function angularImage(
  imageUrl: string,
  alt: string,
  linkUrl: string,
  width: number,
  corner: 'bottom-right' | 'bottom-left' | 'top-right' = 'bottom-right',
  extraOverlay?: string
): string {
  // CSS border-triangle technique for each corner position
  let triangle = '';
  switch (corner) {
    case 'bottom-right':
      triangle = `<div style="position:absolute;bottom:0;right:0;width:0;height:0;border-style:solid;border-width:0 0 120px 180px;border-color:transparent transparent ${ORANGE} transparent;opacity:0.85;"></div>`;
      break;
    case 'bottom-left':
      triangle = `<div style="position:absolute;bottom:0;left:0;width:0;height:0;border-style:solid;border-width:100px 0 0 160px;border-color:transparent transparent transparent ${ORANGE};opacity:0.85;"></div>`;
      break;
    case 'top-right':
      triangle = `<div style="position:absolute;top:0;right:0;width:0;height:0;border-style:solid;border-width:0 140px 90px 0;border-color:transparent ${ORANGE} transparent transparent;opacity:0.8;"></div>`;
      break;
  }

  return `<div style="position:relative;display:block;overflow:hidden;border-radius:6px;">
    <a href="${linkUrl}" style="text-decoration:none;">
      <img src="${imageUrl}" alt="${alt}" width="${width}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;" />
    </a>
    ${triangle}
    ${extraOverlay || ''}
  </div>`;
}


// ═══════════════════════════════════════════
//  SECTION RENDERERS
// ═══════════════════════════════════════════

function renderIntro(text: string): string {
  return `<tr><td style="background:${CREAM};padding:32px 48px 36px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-family:${DISPLAY};font-size:18px;line-height:1.8;color:${SLATE};font-style:italic;">${text}</td></tr>
    </table>
  </td></tr>`;
}

function renderBlogPost(post: NonNullable<NewsletterPayload['blogPost']>): string {
  // Full-width image with angular overlay on bottom-right + white accent on top-left
  const image = post.imageUrl
    ? `<tr><td style="padding:0;font-size:0;line-height:0;">
        ${angularImage(
          post.imageUrl,
          post.title,
          post.url,
          600,
          'bottom-right',
          `<div style="position:absolute;top:0;left:0;width:0;height:0;border-style:solid;border-width:60px 100px 0 0;border-color:${WHITE} transparent transparent transparent;opacity:0.6;"></div>`
        )}
      </td></tr>`
    : '';

  return `<tr><td style="background:${WHITE};padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:28px 48px 16px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">Latest Post</span>
      </td></tr>
      ${image}
      <tr><td style="padding:28px 48px 44px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding-bottom:12px;">
            <a href="${post.url}" style="text-decoration:none;">
              <h2 style="margin:0;font-family:${DISPLAY};font-size:28px;font-weight:700;line-height:1.25;color:${DEEP};">${post.title}</h2>
            </a>
          </td></tr>
          <tr><td style="padding-bottom:16px;">
            <span style="font-family:${SANS};font-size:12px;font-weight:600;color:${ORANGE};letter-spacing:0.5px;">${post.snippet.length > 100 ? '' : post.snippet}</span>
          </td></tr>
          <tr><td style="padding-bottom:28px;">
            <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.75;color:${GREY};">${post.snippet}</p>
          </td></tr>
          <tr><td>${ctaButton(post.url, 'Read the Full Story')}</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}

function renderVideo(video: NonNullable<NewsletterPayload['videoOfTheWeek']>): string {
  // Angular overlay on bottom-left with PLAY label inside it
  const playOverlay = `<div style="position:absolute;bottom:12px;left:14px;font-family:${SANS};font-size:11px;font-weight:700;color:${WHITE};letter-spacing:1px;text-transform:uppercase;">&#9654; PLAY</div>`;

  return `<tr><td style="background:${LIGHT_GREY};padding:36px 48px 44px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:16px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">Video of the Week</span>
      </td></tr>
      <tr><td style="padding-bottom:20px;">
        <h2 style="margin:0;font-family:${DISPLAY};font-size:26px;font-weight:700;line-height:1.3;color:${DEEP};">${video.title}</h2>
        <p style="margin:6px 0 0;font-family:${SANS};font-size:13px;font-weight:500;color:${SILVER};">${video.description}</p>
      </td></tr>
      <tr><td style="padding-bottom:28px;font-size:0;line-height:0;">
        ${angularImage(video.thumbnailUrl, video.title, video.url, 504, 'bottom-left', playOverlay)}
      </td></tr>
      <tr><td>${ctaButton(video.url, 'Watch Now')}</td></tr>
    </table>
  </td></tr>`;
}

function renderNews(items: NonNullable<NewsletterPayload['news']>, newsPageUrl: string): string {
  const [first, ...rest] = items;

  // First item: featured with image + angular overlay on top-right
  const firstImage = first.imageUrl
    ? `<tr><td style="padding-bottom:20px;font-size:0;line-height:0;">
        ${angularImage(first.imageUrl, '', newsPageUrl, 504, 'top-right')}
      </td></tr>`
    : '';

  const firstDesc = first.description
    ? `<p style="margin:8px 0 0;font-family:${SANS};font-size:14px;line-height:1.7;color:${GREY};">${first.description}</p>`
    : '';

  const featured = `
    ${firstImage}
    <tr><td style="padding-bottom:6px;">
      <span style="font-family:${SANS};font-size:11px;font-weight:600;color:${SILVER};letter-spacing:0.5px;">${first.source}</span>
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
            <span style="font-family:${SANS};font-size:11px;font-weight:600;color:${SILVER};letter-spacing:0.5px;">${item.source}</span><br/>
            <a href="${newsPageUrl}" style="text-decoration:none;">
              <span style="font-family:${DISPLAY};font-size:16px;font-weight:700;line-height:1.4;color:${DEEP};">${item.title}</span>
            </a>
          </td>
        </tr></table>
      </td></tr>`;
    })
    .join('');

  return `<tr><td style="background:${WHITE};padding:36px 48px 44px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:6px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">Trail &amp; Ultra News</span>
      </td></tr>
      <tr><td style="padding-bottom:24px;">
        <h2 style="margin:0;font-family:${DISPLAY};font-size:26px;font-weight:700;color:${DEEP};">This Week in Running</h2>
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
          <span style="display:block;font-family:${SANS};font-size:30px;font-weight:800;color:${ORANGE};line-height:1;">${totalRuns}</span>
          <span style="display:block;font-family:${SANS};font-size:10px;font-weight:600;color:${SILVER};text-transform:uppercase;letter-spacing:1px;margin-top:6px;">Total Runs</span>
        </td>
        <td style="width:12px;">&nbsp;</td>
        <td width="34%" align="center" style="padding:18px 8px;background:${WHITE};border-radius:6px;">
          <span style="display:block;font-family:${SANS};font-size:30px;font-weight:800;color:${ORANGE};line-height:1;">${venues}</span>
          <span style="display:block;font-family:${SANS};font-size:10px;font-weight:600;color:${SILVER};text-transform:uppercase;letter-spacing:1px;margin-top:6px;">Venues</span>
        </td>
        <td style="width:12px;">&nbsp;</td>
        <td width="33%" align="center" style="padding:18px 8px;background:${WHITE};border-radius:6px;">
          <span style="display:block;font-family:${SANS};font-size:30px;font-weight:800;color:${ORANGE};line-height:1;">${avgTime}</span>
          <span style="display:block;font-family:${SANS};font-size:10px;font-weight:600;color:${SILVER};text-transform:uppercase;letter-spacing:1px;margin-top:6px;">Avg Time</span>
        </td>
      </tr>
    </table>
  </td></tr>`;

  return `<tr><td style="background:${WARM_PEACH};padding:32px 48px 40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:16px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">parkrun</span>
      </td></tr>
      <tr><td>
        <p style="margin:0;font-family:${DISPLAY};font-size:19px;line-height:1.7;color:${SLATE};font-style:italic;">${parkrun.text}</p>
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
      <p style="margin:0 0 14px;font-family:${SANS};font-size:14px;line-height:1.7;color:${GREY};">${app.description}</p>
      <a href="${app.url}" style="font-family:${SANS};font-size:13px;font-weight:700;color:${ORANGE};text-decoration:none;">Try it &rarr;</a>
    </td></tr>`);
  }

  if (session) {
    if (app) cards.push(`<tr><td style="height:16px;font-size:0;">&nbsp;</td></tr>`);
    cards.push(`<tr><td style="background:${CREAM};padding:28px 28px 28px 32px;border-left:3px solid ${DEEP};border-radius:0 6px 6px 0;">
      <span style="font-family:${SANS};font-size:10px;font-weight:700;color:${DEEP};text-transform:uppercase;letter-spacing:2px;">Session of the Week</span>
      <h3 style="margin:10px 0 8px;font-family:${DISPLAY};font-size:22px;font-weight:700;color:${DEEP};">${session.title}</h3>
      <p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.7;color:${GREY};">${session.description}</p>
    </td></tr>`);
  }

  return `<tr><td style="background:${WHITE};padding:36px 48px 44px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards.join('')}</table>
  </td></tr>`;
}

type TipItem = { label: string; text: string; accent: string; citation?: string };

function renderTips(tips: TipItem[]): string {
  const items = tips
    .map((tip, i) => {
      const cite = tip.citation
        ? `<p style="margin:12px 0 0;font-family:${SANS};font-size:11px;font-style:italic;color:${MUTED};">${tip.citation}</p>`
        : '';
      const spacer = i < tips.length - 1
        ? `<tr><td style="height:20px;font-size:0;">&nbsp;</td></tr>`
        : '';
      return `<tr><td style="background:${WHITE};padding:24px 24px 24px 28px;border-left:3px solid ${tip.accent};border-radius:0 6px 6px 0;">
        <span style="font-family:${SANS};font-size:10px;font-weight:700;color:${tip.accent};text-transform:uppercase;letter-spacing:2px;">${tip.label}</span>
        <p style="margin:10px 0 0;font-family:${SANS};font-size:14px;line-height:1.75;color:${SLATE};">${tip.text}</p>
        ${cite}
      </td></tr>${spacer}`;
    })
    .join('');

  return `<tr><td style="background:${CREAM};padding:36px 48px 44px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:6px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">Knowledge Corner</span>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <h2 style="margin:0;font-family:${DISPLAY};font-size:26px;font-weight:700;color:${DEEP};">Tips &amp; Insights</h2>
      </td></tr>
      ${items}
    </table>
  </td></tr>`;
}

function renderArchives(item: NonNullable<NewsletterPayload['fromTheArchives']>): string {
  // Image with angular overlay on bottom-right
  const image = item.imageUrl
    ? `<tr><td style="padding-bottom:20px;font-size:0;line-height:0;">
        ${angularImage(item.imageUrl, item.title, item.url, 504, 'bottom-right')}
      </td></tr>`
    : '';

  return `<tr><td style="background:${WHITE};padding:36px 48px 44px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:6px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">From the Archives</span>
      </td></tr>
      <tr><td style="padding-bottom:24px;">
        <h2 style="margin:0;font-family:${DISPLAY};font-size:24px;font-weight:700;color:${DEEP};line-height:1.25;">Worth Another Look</h2>
      </td></tr>
      ${image}
      <tr><td style="padding-bottom:12px;">
        <a href="${item.url}" style="text-decoration:none;">
          <span style="font-family:${DISPLAY};font-size:20px;font-weight:700;line-height:1.35;color:${DEEP};">${item.title}</span>
        </a>
      </td></tr>
      <tr><td style="padding-bottom:24px;">
        <p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.7;color:${GREY};">${item.description}</p>
      </td></tr>
      <tr><td>${ctaButton(item.url, 'Read Again &rarr;', 'ghost-dark')}</td></tr>
    </table>
  </td></tr>`;
}

function renderWhatsNew(text: string): string {
  return `<tr><td style="background:${WHITE};padding:36px 48px 44px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:6px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2.5px;">What&rsquo;s New</span>
      </td></tr>
      <tr><td style="padding-bottom:20px;">
        <h2 style="margin:0;font-family:${DISPLAY};font-size:24px;font-weight:700;color:${DEEP};line-height:1.25;">On the Site</h2>
      </td></tr>
      <tr><td>
        <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.7;color:${GREY};">${text}</p>
      </td></tr>
    </table>
  </td></tr>`;
}

function renderSponsors(): string {
  const sponsors = [
    { name: 'NoblePro', url: 'https://noble-pro.com' },
    { name: 'Enertor', url: 'https://enertor.com' },
    { name: 'Protein Rebel', url: 'https://proteinrebel.com' },
    { name: 'Flying Burrito', url: 'https://flyingburrito.co.uk' },
  ];

  const cells = sponsors
    .map(
      (s) =>
        `<td width="25%" align="center" style="padding:14px 4px;">
          <a href="${s.url}" style="font-family:${SANS};font-size:13px;font-weight:700;color:${SLATE};text-decoration:none;">${s.name}</a>
        </td>`
    )
    .join('');

  return `<tr><td style="padding:0;">${thinRule()}</td></tr>
  <tr><td style="background:${WHITE};padding:32px 48px 36px;" align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding-bottom:20px;">
        <span style="font-family:${SANS};font-size:10px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:2.5px;">Thanks to Our Sponsors</span>
      </td></tr>
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>${cells}</tr>
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}


// ═══════════════════════════════════════════
//  APPROVAL BANNER (unchanged)
// ═══════════════════════════════════════════

export function wrapWithApprovalBanner(html: string, approveUrl: string): string {
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
  // ── Gather content blocks with their background colors ──
  type Block = { html: string; bg: string };
  const blocks: Block[] = [];

  if (payload.intro) {
    blocks.push({ html: renderIntro(payload.intro), bg: CREAM });
  }
  if (payload.blogPost) {
    blocks.push({ html: renderBlogPost(payload.blogPost), bg: WHITE });
  }
  if (payload.videoOfTheWeek) {
    blocks.push({ html: renderVideo(payload.videoOfTheWeek), bg: LIGHT_GREY });
  }
  if (payload.news?.length) {
    blocks.push({ html: renderNews(payload.news, `${baseUrl}/news`), bg: WHITE });
  }
  if (payload.parkrun) {
    blocks.push({ html: renderParkrun(payload.parkrun), bg: WARM_PEACH });
  }
  if (payload.appOfTheWeek || payload.sessionOfTheWeek) {
    blocks.push({
      html: renderCards(payload.appOfTheWeek, payload.sessionOfTheWeek),
      bg: WHITE,
    });
  }

  // Combine tips into one section
  const tips: TipItem[] = [];
  if (payload.trainingTip) tips.push({ label: 'Training Tip', text: payload.trainingTip.text, accent: ORANGE, citation: payload.trainingTip.citation });
  if (payload.scienceSection) tips.push({ label: 'Science Says', text: payload.scienceSection.text, accent: '#3b82f6', citation: payload.scienceSection.citation });
  if (payload.nutritionTip) tips.push({ label: 'Nutrition', text: payload.nutritionTip.text, accent: '#22c55e', citation: payload.nutritionTip.citation });
  if (tips.length > 0) {
    blocks.push({ html: renderTips(tips), bg: CREAM });
  }

  if (payload.fromTheArchives) {
    blocks.push({ html: renderArchives(payload.fromTheArchives), bg: WHITE });
  }
  if (payload.whatsNew) {
    blocks.push({ html: renderWhatsNew(payload.whatsNew.text), bg: WHITE });
  }

  // ── Compose sections with SVG diagonal dividers ──
  let dir: 'ltr' | 'rtl' = 'ltr';
  const body: string[] = [];
  let prevBg = WHITE; // header background is now white

  for (const block of blocks) {
    // Always insert an SVG diagonal divider between sections
    body.push(svgDivider(prevBg, block.bg, dir));
    dir = dir === 'ltr' ? 'rtl' : 'ltr';
    body.push(block.html);
    prevBg = block.bg;
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
          <a href="${viewInBrowserUrl}" style="font-family:${SANS};font-size:11px;color:${SILVER};text-decoration:underline;">View this email in your browser</a>
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
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${OUTER_BG};font-family:${SANS};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:0;">
    ${payload.intro || payload.subject}${'&#847; &zwnj; &nbsp;'.repeat(40)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${OUTER_BG};">
    <tr><td align="center" style="padding:20px 16px;">

      ${viewLink}

      <table role="presentation" class="email-wrap" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;${MSO_TABLE}">

        <!-- ══ HEADER — Light & Clean ══ -->
        <tr><td style="background:${WHITE};padding:40px 40px 32px;" align="center" class="section-pad">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:14px;">
              <h1 style="margin:0;font-family:${SANS};font-size:28px;font-weight:800;color:${DEEP};letter-spacing:3px;text-transform:uppercase;">FILM MY RUN</h1>
            </td></tr>
            <tr><td align="center" style="padding-bottom:14px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="height:3px;width:50px;background:${ORANGE};font-size:0;line-height:0;">&nbsp;</td>
              </tr></table>
            </td></tr>
            <tr><td align="center">
              <span style="font-family:${SANS};font-size:12px;font-weight:500;color:${SILVER};text-transform:uppercase;letter-spacing:2px;">Weekly Round-Up&nbsp;&nbsp;&middot;&nbsp;&nbsp;${today}</span>
            </td></tr>
          </table>
        </td></tr>

        <!-- ══ CONTENT SECTIONS WITH SVG DIAGONAL DIVIDERS ══ -->
        ${body.join('\n')}

        <!-- ══ SPONSORS ══ -->
        ${renderSponsors()}

        <!-- ══ FOOTER — Light ══ -->
        <tr><td style="padding:0;font-size:0;line-height:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:3px;background:${ORANGE};font-size:0;line-height:0;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td style="background:${CREAM};padding:32px 48px 36px;" align="center" class="section-pad">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:14px;">
              <span style="font-family:${SANS};font-size:16px;font-weight:800;color:${DEEP};letter-spacing:3px;text-transform:uppercase;">Film My Run</span>
            </td></tr>
            <tr><td align="center" style="padding-bottom:20px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 14px;"><a href="https://youtube.com/@filmmyrun" style="font-family:${SANS};font-size:11px;font-weight:600;color:${SILVER};text-decoration:none;letter-spacing:1px;text-transform:uppercase;">YouTube</a></td>
                  <td style="color:#d6d1c9;font-size:11px;">&middot;</td>
                  <td style="padding:0 14px;"><a href="https://instagram.com/filmmyrun" style="font-family:${SANS};font-size:11px;font-weight:600;color:${SILVER};text-decoration:none;letter-spacing:1px;text-transform:uppercase;">Instagram</a></td>
                  <td style="color:#d6d1c9;font-size:11px;">&middot;</td>
                  <td style="padding:0 14px;"><a href="https://twitter.com/filmmyrun" style="font-family:${SANS};font-size:11px;font-weight:600;color:${SILVER};text-decoration:none;letter-spacing:1px;text-transform:uppercase;">Twitter</a></td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding-bottom:16px;">
              ${thinRule()}
            </td></tr>
            <tr><td align="center">
              <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.8;color:${SILVER};">
                You&rsquo;re receiving this because you subscribed to the Film My Run newsletter.<br/>
                <a href="${unsubscribeUrl}" style="color:${GREY};text-decoration:underline;">Unsubscribe</a>
              </p>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
