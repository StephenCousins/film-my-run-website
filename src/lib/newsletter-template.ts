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
  parkrun?: { text: string };
  fromTheArchives?: { title: string; url: string; description: string; imageUrl?: string };
  whatsNew?: { text: string };
}

// ─── Palette ───
const ORANGE = '#f88c00';
const DEEP = '#2d2926';
const DEEP_MID = '#3d3835';
const SLATE = '#4a4541';
const GREY = '#6b6560';
const SILVER = '#9e9893';
const CREAM = '#faf8f5';
const WARM_WHITE = '#f5f2ed';
const WHITE = '#ffffff';
const LIGHT_GREY = '#ebe7e2';
const RULE = '#e0dbd3';
const OUTER_BG = '#d6d1c9';

// ─── Fonts ───
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "Menlo, Consolas, 'Courier New', monospace";

// ─── MSO fix string ───
const MSO_TABLE = 'border-collapse:collapse;border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt;';

// ═══════════════════════════════════════════
//  GRAPHIC HELPERS
// ═══════════════════════════════════════════

/**
 * Stepped diagonal divider — creates a bold angular transition between sections.
 * 9 staircase rows + 1 solid orange cap = 40px total height.
 * The orange wedge grows from one side, creating a visible diagonal line.
 */
function angledDivider(fromBg: string, toBg: string, dir: 'ltr' | 'rtl' = 'ltr'): string {
  const pcts = [6, 16, 28, 40, 52, 64, 76, 88, 96];
  const h = 4;

  const rows = pcts.map((pct, i) => {
    const bg = i < 5 ? fromBg : toBg;
    const oTd = `<td style="width:${pct}%;background:${ORANGE};height:${h}px;font-size:0;line-height:0;">&nbsp;</td>`;
    const bTd = `<td style="background:${bg};height:${h}px;font-size:0;line-height:0;">&nbsp;</td>`;
    return dir === 'ltr' ? `<tr>${oTd}${bTd}</tr>` : `<tr>${bTd}${oTd}</tr>`;
  });

  // Final solid orange cap row
  rows.push(
    `<tr><td style="background:${ORANGE};height:${h}px;font-size:0;line-height:0;">&nbsp;</td><td style="background:${ORANGE};height:${h}px;font-size:0;line-height:0;">&nbsp;</td></tr>`
  );

  return `<tr><td style="padding:0;font-size:0;line-height:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${MSO_TABLE}">${rows.join('')}</table></td></tr>`;
}

/** Full-width solid color bar */
function solidBar(color: string = ORANGE, height: number = 8): string {
  return `<tr><td style="background:${color};height:${height}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

/** Subtle horizontal rule within a same-background area */
function thinRule(bg: string): string {
  return `<tr><td style="background:${bg};padding:0 40px;font-size:0;line-height:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:1px;background:${RULE};font-size:0;">&nbsp;</td></tr></table></td></tr>`;
}

/** Section label badge */
function badge(text: string): string {
  return `<span style="display:inline-block;padding:5px 14px;background:${ORANGE};color:${WHITE};font-family:${SANS};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.8px;border-radius:2px;line-height:1.4;">${text}</span>`;
}

/** CTA button — 4 variants */
function ctaButton(url: string, label: string, variant: 'orange' | 'dark' | 'ghost' | 'white' = 'orange'): string {
  const map: Record<string, { bg: string; border: string; color: string }> = {
    orange: { bg: ORANGE, border: ORANGE, color: WHITE },
    dark: { bg: DEEP, border: DEEP, color: WHITE },
    ghost: { bg: 'transparent', border: ORANGE, color: ORANGE },
    white: { bg: WHITE, border: WHITE, color: DEEP },
  };
  const s = map[variant];
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:4px;background:${s.bg};border:2px solid ${s.border};"><a href="${url}" style="display:inline-block;padding:16px 40px;font-family:${SANS};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;text-decoration:none;color:${s.color};">${label}</a></td></tr></table>`;
}

/** Centered short orange rule accent */
function orangeAccent(width = '60px'): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="height:3px;width:${width};background:${ORANGE};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

// ═══════════════════════════════════════════
//  SECTION RENDERERS
// ═══════════════════════════════════════════

function renderIntro(text: string): string {
  return `<tr><td style="background:${CREAM};padding:44px 40px 40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:24px;">${orangeAccent('50px')}</td></tr>
      <tr><td style="font-family:${SERIF};font-size:18px;line-height:1.75;color:${SLATE};font-style:italic;">${text}</td></tr>
    </table>
  </td></tr>`;
}

function renderBlogPost(post: NonNullable<NewsletterPayload['blogPost']>): string {
  const image = post.imageUrl
    ? `<tr><td style="padding:0;font-size:0;line-height:0;">
        <a href="${post.url}" style="text-decoration:none;">
          <img src="${post.imageUrl}" alt="${post.title}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
        </a>
      </td></tr>`
    : '';

  return `<tr><td style="background:${WHITE};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${image}
      <tr><td style="padding:36px 40px 44px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding-bottom:16px;">${badge('Latest Post')}</td></tr>
          <tr><td style="padding-bottom:16px;">
            <a href="${post.url}" style="text-decoration:none;color:${DEEP};">
              <h2 style="margin:0;font-family:${SERIF};font-size:32px;font-weight:700;line-height:1.2;color:${DEEP};">${post.title}</h2>
            </a>
          </td></tr>
          <tr><td style="padding-bottom:28px;">
            <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.7;color:${GREY};">${post.snippet}</p>
          </td></tr>
          <tr><td>${ctaButton(post.url, 'Read the Full Story')}</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}

function renderVideo(video: NonNullable<NewsletterPayload['videoOfTheWeek']>): string {
  return `<tr><td style="background:${DEEP};padding:44px 40px 48px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:20px;">${badge('Video of the Week')}</td></tr>
      <tr><td style="padding-bottom:20px;">
        <h2 style="margin:0;font-family:${SERIF};font-size:28px;font-weight:700;line-height:1.25;color:${WHITE};">${video.title}</h2>
      </td></tr>
      <tr><td style="padding-bottom:24px;font-size:0;line-height:0;">
        <a href="${video.url}" style="text-decoration:none;">
          <img src="${video.thumbnailUrl}" alt="${video.title}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:4px;" />
        </a>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.7;color:${SILVER};">${video.description}</p>
      </td></tr>
      <tr><td>${ctaButton(video.url, 'Watch Now &#9654;')}</td></tr>
    </table>
  </td></tr>`;
}

function renderNews(items: NonNullable<NewsletterPayload['news']>, newsPageUrl: string): string {
  // First item gets featured treatment, rest are compact
  const [first, ...rest] = items;

  const firstImage = first.imageUrl
    ? `<tr><td style="padding-bottom:16px;font-size:0;line-height:0;">
        <a href="${newsPageUrl}"><img src="${first.imageUrl}" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:4px;" /></a>
      </td></tr>`
    : '';

  const firstDesc = first.description
    ? `<tr><td><p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.7;color:${GREY};">${first.description}</p></td></tr>`
    : '';

  const featured = `
    ${firstImage}
    <tr><td style="padding-bottom:6px;">
      <span style="font-family:${MONO};font-size:12px;font-weight:700;color:${ORANGE};">01</span>
      <span style="font-family:${SANS};font-size:10px;font-weight:600;color:${SILVER};text-transform:uppercase;letter-spacing:1px;padding-left:10px;">${first.source}</span>
    </td></tr>
    <tr><td style="padding-bottom:8px;">
      <a href="${newsPageUrl}" style="text-decoration:none;color:${DEEP};">
        <h3 style="margin:0;font-family:${SERIF};font-size:22px;font-weight:700;line-height:1.3;color:${DEEP};">${first.title}</h3>
      </a>
    </td></tr>
    ${firstDesc}`;

  const compact = rest
    .map((item, i) => {
      const num = String(i + 2).padStart(2, '0');
      return `<tr><td style="padding-top:20px;border-top:1px solid ${RULE};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td valign="top" style="width:36px;">
            <span style="font-family:${MONO};font-size:12px;font-weight:700;color:${ORANGE};">${num}</span>
          </td>
          <td valign="top">
            <span style="font-family:${SANS};font-size:10px;font-weight:600;color:${SILVER};text-transform:uppercase;letter-spacing:1px;">${item.source}</span><br/>
            <a href="${newsPageUrl}" style="text-decoration:none;color:${DEEP};">
              <span style="font-family:${SERIF};font-size:16px;font-weight:700;line-height:1.4;color:${DEEP};">${item.title}</span>
            </a>
          </td>
        </tr></table>
      </td></tr>`;
    })
    .join('');

  return `<tr><td style="background:${WHITE};padding:44px 40px 48px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:6px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2px;">Trail &amp; Ultra News</span>
      </td></tr>
      <tr><td style="padding-bottom:24px;">
        <h2 style="margin:0;font-family:${SERIF};font-size:28px;font-weight:700;color:${DEEP};">This Week in Running</h2>
      </td></tr>
      ${featured}
      ${compact}
      <tr><td style="padding-top:28px;">${ctaButton(newsPageUrl, 'All Stories', 'ghost')}</td></tr>
    </table>
  </td></tr>`;
}

function renderParkrun(parkrun: NonNullable<NewsletterPayload['parkrun']>): string {
  return `<tr><td style="background:${ORANGE};padding:48px 40px 52px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:20px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:3px;">parkrun</span>
      </td></tr>
      <tr><td style="padding-bottom:4px;">
        <span style="font-family:${SERIF};font-size:56px;line-height:0.8;color:rgba(255,255,255,0.25);font-weight:700;">&ldquo;</span>
      </td></tr>
      <tr><td>
        <p style="margin:0;font-family:${SERIF};font-size:20px;line-height:1.7;color:${WHITE};font-style:italic;">${parkrun.text}</p>
      </td></tr>
    </table>
  </td></tr>`;
}

function renderCards(
  app?: NewsletterPayload['appOfTheWeek'],
  session?: NewsletterPayload['sessionOfTheWeek']
): string {
  const cards: string[] = [];

  if (app) {
    cards.push(`<tr><td style="background:${CREAM};padding:28px;border-left:4px solid ${ORANGE};border-radius:4px;">
      <span style="font-family:${SANS};font-size:10px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2px;">App / Tool of the Week</span>
      <h3 style="margin:10px 0 8px;font-family:${SERIF};font-size:22px;font-weight:700;color:${DEEP};">
        <a href="${app.url}" style="text-decoration:none;color:${DEEP};">${app.name}</a>
      </h3>
      <p style="margin:0 0 14px;font-family:${SANS};font-size:14px;line-height:1.7;color:${GREY};">${app.description}</p>
      <a href="${app.url}" style="font-family:${SANS};font-size:13px;font-weight:700;color:${ORANGE};text-decoration:none;">Try it &rarr;</a>
    </td></tr>`);
  }

  if (session) {
    if (app) cards.push(`<tr><td style="height:16px;font-size:0;">&nbsp;</td></tr>`);
    cards.push(`<tr><td style="background:${CREAM};padding:28px;border-left:4px solid ${DEEP};border-radius:4px;">
      <span style="font-family:${SANS};font-size:10px;font-weight:700;color:${DEEP};text-transform:uppercase;letter-spacing:2px;">Session of the Week</span>
      <h3 style="margin:10px 0 8px;font-family:${SERIF};font-size:22px;font-weight:700;color:${DEEP};">${session.title}</h3>
      <p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.7;color:${GREY};">${session.description}</p>
    </td></tr>`);
  }

  return `<tr><td style="background:${WHITE};padding:44px 40px 48px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards.join('')}</table>
  </td></tr>`;
}

type TipItem = { label: string; text: string; accent: string; citation?: string };

function renderTips(tips: TipItem[]): string {
  const items = tips
    .map((tip, i) => {
      const cite = tip.citation
        ? `<p style="margin:10px 0 0;font-family:${SANS};font-size:11px;font-style:italic;color:${SILVER};">Source: ${tip.citation}</p>`
        : '';
      const separator =
        i < tips.length - 1
          ? `<tr><td style="padding:20px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:1px;background:${RULE};font-size:0;">&nbsp;</td></tr></table></td></tr>`
          : '';
      return `<tr><td style="border-left:4px solid ${tip.accent};padding-left:20px;">
        <span style="font-family:${SANS};font-size:10px;font-weight:700;color:${tip.accent};text-transform:uppercase;letter-spacing:2px;">${tip.label}</span>
        <p style="margin:10px 0 0;font-family:${SERIF};font-size:15px;line-height:1.75;color:${SLATE};">${tip.text}</p>
        ${cite}
      </td></tr>${separator}`;
    })
    .join('');

  return `<tr><td style="background:${CREAM};padding:44px 40px 48px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:6px;">
        <span style="font-family:${SANS};font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2px;">Knowledge Corner</span>
      </td></tr>
      <tr><td style="padding-bottom:24px;">
        <h2 style="margin:0;font-family:${SERIF};font-size:26px;font-weight:700;color:${DEEP};">Tips &amp; Insights</h2>
      </td></tr>
      ${items}
    </table>
  </td></tr>`;
}

function renderArchives(item: NonNullable<NewsletterPayload['fromTheArchives']>): string {
  const image = item.imageUrl
    ? `<tr><td style="padding-bottom:20px;font-size:0;line-height:0;">
        <a href="${item.url}" style="text-decoration:none;">
          <img src="${item.imageUrl}" alt="${item.title}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:4px;" />
        </a>
      </td></tr>`
    : '';

  return `<tr><td style="background:${WARM_WHITE};padding:44px 40px 48px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:6px;">
        <span style="font-family:${SANS};font-size:10px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2px;">From the Archives</span>
      </td></tr>
      <tr><td style="padding-bottom:24px;">
        <h2 style="margin:0;font-family:${SERIF};font-size:24px;font-weight:700;color:${DEEP};line-height:1.25;">Worth Another Look</h2>
      </td></tr>
      ${image}
      <tr><td style="padding-bottom:12px;">
        <a href="${item.url}" style="text-decoration:none;">
          <span style="font-family:${SERIF};font-size:20px;font-weight:700;line-height:1.3;color:${DEEP};">${item.title}</span>
        </a>
      </td></tr>
      <tr><td style="padding-bottom:24px;">
        <p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.7;color:${GREY};">${item.description}</p>
      </td></tr>
      <tr><td>${ctaButton(item.url, 'Read Again', 'ghost')}</td></tr>
    </table>
  </td></tr>`;
}

function renderWhatsNew(text: string): string {
  return `<tr><td style="background:${WHITE};padding:44px 40px 48px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:6px;">
        <span style="font-family:${SANS};font-size:10px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:2px;">What&rsquo;s New</span>
      </td></tr>
      <tr><td style="padding-bottom:20px;">
        <h2 style="margin:0;font-family:${SERIF};font-size:24px;font-weight:700;color:${DEEP};line-height:1.25;">On the Site</h2>
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

  // 2×2 grid with bordered cells
  const makeCell = (s: { name: string; url: string }) =>
    `<td width="50%" align="center" style="padding:18px 12px;border:1px solid ${RULE};background:${WHITE};">
      <a href="${s.url}" style="font-family:${SANS};font-size:14px;font-weight:700;color:${DEEP};text-decoration:none;letter-spacing:0.3px;">${s.name}</a>
    </td>`;

  return `<tr><td style="background:${LIGHT_GREY};padding:40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding-bottom:24px;">
        <h3 style="margin:0;font-family:${SERIF};font-size:22px;font-weight:700;color:${DEEP};">Thanks to Our Sponsors</h3>
      </td></tr>
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="border-collapse:separate;">
          <tr>${makeCell(sponsors[0])}${makeCell(sponsors[1])}</tr>
          <tr>${makeCell(sponsors[2])}${makeCell(sponsors[3])}</tr>
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
    blocks.push({ html: renderVideo(payload.videoOfTheWeek), bg: DEEP });
  }
  if (payload.news?.length) {
    blocks.push({ html: renderNews(payload.news, `${baseUrl}/news`), bg: WHITE });
  }
  if (payload.parkrun) {
    blocks.push({ html: renderParkrun(payload.parkrun), bg: ORANGE });
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
  if (payload.scienceSection) tips.push({ label: 'Science Says', text: payload.scienceSection.text, accent: '#2563eb', citation: payload.scienceSection.citation });
  if (payload.nutritionTip) tips.push({ label: 'Nutrition', text: payload.nutritionTip.text, accent: '#16a34a', citation: payload.nutritionTip.citation });
  if (tips.length > 0) {
    blocks.push({ html: renderTips(tips), bg: CREAM });
  }

  if (payload.fromTheArchives) {
    blocks.push({ html: renderArchives(payload.fromTheArchives), bg: WARM_WHITE });
  }
  if (payload.whatsNew) {
    blocks.push({ html: renderWhatsNew(payload.whatsNew.text), bg: WHITE });
  }

  // ── Compose sections with automatic angular dividers ──
  let dir: 'ltr' | 'rtl' = 'ltr';
  const body: string[] = [];
  let prevBg = DEEP; // header background

  for (const block of blocks) {
    if (block.bg === prevBg) {
      // Same background — thin rule
      body.push(thinRule(block.bg));
    } else if (prevBg === ORANGE || block.bg === ORANGE) {
      // Transitions involving orange — solid dark bar as a frame
      body.push(solidBar(DEEP, 4));
    } else {
      // Different non-orange backgrounds — bold angular divider
      body.push(angledDivider(prevBg, block.bg, dir));
      dir = dir === 'ltr' ? 'rtl' : 'ltr';
    }
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
    @media only screen and (max-width: 620px) {
      .email-wrap { width: 100% !important; }
      .mob-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .mob-full { width: 100% !important; height: auto !important; }
      .mob-hide { display: none !important; }
      .mob-stack { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${OUTER_BG};font-family:${SANS};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:0;">
    ${payload.intro || payload.subject}${'&#847; &zwnj; &nbsp;'.repeat(40)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${OUTER_BG};">
    <tr><td align="center" style="padding:16px 16px 0;">

      ${viewLink}

      <table role="presentation" class="email-wrap" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;${MSO_TABLE}">

        <!-- ══ THICK ORANGE TOP BAR ══ -->
        ${solidBar(ORANGE, 8)}

        <!-- ══ HEADER ══ -->
        <tr><td style="background:${DEEP};padding:44px 40px 40px;" align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:16px;">
              <h1 style="margin:0;font-family:${SERIF};font-size:36px;font-weight:700;color:${WHITE};letter-spacing:6px;text-transform:uppercase;">Film My Run</h1>
            </td></tr>
            <tr><td align="center" style="padding-bottom:16px;">
              ${orangeAccent('60px')}
            </td></tr>
            <tr><td align="center" style="padding-bottom:4px;">
              <span style="font-family:${SANS};font-size:11px;font-weight:600;color:${SILVER};text-transform:uppercase;letter-spacing:3px;">Weekly Round-Up</span>
            </td></tr>
            <tr><td align="center">
              <span style="font-family:${MONO};font-size:11px;color:${GREY};letter-spacing:1px;">${today}</span>
            </td></tr>
          </table>
        </td></tr>

        <!-- ══ CONTENT SECTIONS WITH ANGULAR DIVIDERS ══ -->
        ${body.join('\n')}

        <!-- ══ SPONSORS ══ -->
        ${solidBar(ORANGE, 6)}
        ${renderSponsors()}

        <!-- ══ FOOTER ══ -->
        ${solidBar(ORANGE, 4)}
        <tr><td style="background:${DEEP};padding:40px;" align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:20px;">
              <span style="font-family:${SERIF};font-size:20px;font-weight:700;color:${WHITE};letter-spacing:3px;text-transform:uppercase;">Film My Run</span>
            </td></tr>
            <tr><td align="center" style="padding-bottom:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 14px;"><a href="https://youtube.com/@filmmyrun" style="font-family:${SANS};font-size:12px;font-weight:600;color:${SILVER};text-decoration:none;letter-spacing:1px;">YOUTUBE</a></td>
                  <td style="color:${DEEP_MID};font-size:11px;">|</td>
                  <td style="padding:0 14px;"><a href="https://instagram.com/filmmyrun" style="font-family:${SANS};font-size:12px;font-weight:600;color:${SILVER};text-decoration:none;letter-spacing:1px;">INSTAGRAM</a></td>
                  <td style="color:${DEEP_MID};font-size:11px;">|</td>
                  <td style="padding:0 14px;"><a href="https://twitter.com/filmmyrun" style="font-family:${SANS};font-size:12px;font-weight:600;color:${SILVER};text-decoration:none;letter-spacing:1px;">TWITTER</a></td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding-bottom:24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:1px;background:${DEEP_MID};font-size:0;">&nbsp;</td></tr>
              </table>
            </td></tr>
            <tr><td align="center">
              <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.7;color:${SLATE};">
                You&rsquo;re receiving this because you subscribed to the Film My Run newsletter.<br/>
                <a href="${unsubscribeUrl}" style="color:${SILVER};text-decoration:underline;">Unsubscribe</a>
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
