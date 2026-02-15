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

// ── Palette ──
const ORANGE = '#f88c00';
const ORANGE_LIGHT = '#ffad33';
const DEEP = '#2d2926';          // warm dark charcoal — NOT black
const DEEP_MID = '#3d3835';      // slightly lighter variant
const SLATE = '#4a4541';
const GREY = '#6b6560';
const SILVER = '#9e9893';
const CREAM = '#faf8f5';
const WARM_WHITE = '#f5f2ed';
const WHITE = '#ffffff';
const RULE = '#e0dbd3';
const OUTER_BG = '#d6d1c9';

// ── Fonts ──
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "Menlo, Consolas, 'Courier New', monospace";

// ── Helpers ──

function orangeRule(width = '60px'): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="height: 3px; width: ${width}; background-color: ${ORANGE}; font-size: 0; line-height: 0;">&nbsp;</td></tr></table>`;
}

function badge(text: string): string {
  return `<span style="display: inline-block; padding: 4px 12px; background-color: ${ORANGE}; color: ${WHITE}; font-family: ${SANS}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 2px; line-height: 1.4;">${text}</span>`;
}

function ctaButton(url: string, label: string, variant: 'orange' | 'dark' | 'ghost' = 'orange'): string {
  const styles: Record<string, string> = {
    orange: `background-color: ${ORANGE}; color: ${WHITE}; border: 2px solid ${ORANGE};`,
    dark: `background-color: ${DEEP}; color: ${WHITE}; border: 2px solid ${DEEP};`,
    ghost: `background-color: transparent; color: ${ORANGE}; border: 2px solid ${ORANGE};`,
  };
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius: 4px; ${styles[variant]}"><a href="${url}" style="display: inline-block; padding: 14px 36px; font-family: ${SANS}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; color: ${variant === 'ghost' ? ORANGE : WHITE};">${label}</a></td></tr></table>`;
}

/** Decorative angular divider — two-tone chevron stripe */
function angledDivider(): string {
  return `
    <tr>
      <td style="padding: 0; font-size: 0; line-height: 0; height: 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="height: 4px; background-color: ${ORANGE}; font-size: 0; line-height: 0;" width="120">&nbsp;</td>
            <td style="height: 4px; background-color: ${RULE}; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

/** Thin accent rule — orange left, fading to warm grey */
function accentRule(): string {
  return `
    <tr>
      <td style="padding: 0; font-size: 0; line-height: 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="height: 2px; background-color: ${ORANGE}; font-size: 0; line-height: 0;" width="80">&nbsp;</td>
            <td style="height: 2px; background-color: ${WARM_WHITE}; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ── Section renderers ──

function renderIntro(text: string): string {
  return `
    <tr>
      <td style="background-color: ${CREAM}; padding: 44px 40px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom: 24px;">${orangeRule('50px')}</td>
          </tr>
          <tr>
            <td style="font-family: ${SERIF}; font-size: 18px; line-height: 1.75; color: ${SLATE}; font-style: italic;">
              ${text}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderBlogPost(post: NonNullable<NewsletterPayload['blogPost']>): string {
  const image = post.imageUrl
    ? `<tr>
        <td style="padding: 0; font-size: 0; line-height: 0;">
          <a href="${post.url}" style="text-decoration: none;">
            <img src="${post.imageUrl}" alt="${post.title}" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;" />
          </a>
        </td>
      </tr>`
    : '';

  return `
    <tr>
      <td style="background-color: ${WHITE};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${image}
          <tr>
            <td style="padding: 36px 40px 44px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 16px;">${badge('Latest Post')}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 16px;">
                    <a href="${post.url}" style="text-decoration: none; color: ${DEEP};">
                      <h2 style="margin: 0; font-family: ${SERIF}; font-size: 32px; font-weight: 700; line-height: 1.2; color: ${DEEP};">
                        ${post.title}
                      </h2>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 28px;">
                    <p style="margin: 0; font-family: ${SANS}; font-size: 15px; line-height: 1.7; color: ${GREY};">
                      ${post.snippet}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td>${ctaButton(post.url, 'Read the Full Story')}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderVideo(video: NonNullable<NewsletterPayload['videoOfTheWeek']>): string {
  return `
    <tr>
      <td style="background-color: ${DEEP}; padding: 44px 40px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom: 20px;">${badge('Video of the Week')}</td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px;">
              <h2 style="margin: 0; font-family: ${SERIF}; font-size: 28px; font-weight: 700; line-height: 1.25; color: ${WHITE};">
                ${video.title}
              </h2>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px; font-size: 0; line-height: 0;">
              <a href="${video.url}" style="text-decoration: none;">
                <img src="${video.thumbnailUrl}" alt="${video.title}" width="520" style="display: block; width: 100%; max-width: 520px; height: auto; border: 0; border-radius: 4px;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 28px;">
              <p style="margin: 0; font-family: ${SANS}; font-size: 15px; line-height: 1.7; color: ${SILVER};">
                ${video.description}
              </p>
            </td>
          </tr>
          <tr>
            <td>${ctaButton(video.url, 'Watch Now &#9654;')}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderNews(items: NonNullable<NewsletterPayload['news']>, newsPageUrl: string): string {
  const cards = items
    .map((item, i) => {
      const num = String(i + 1).padStart(2, '0');

      const image = item.imageUrl
        ? `<td style="width: 90px; padding-right: 18px;" valign="top">
            <a href="${newsPageUrl}">
              <img src="${item.imageUrl}" alt="" width="90" height="90" style="display: block; width: 90px; height: 90px; object-fit: cover; border-radius: 4px; border: 0;" />
            </a>
           </td>`
        : '';

      const desc = item.description
        ? `<p style="margin: 8px 0 0; font-family: ${SANS}; font-size: 13px; line-height: 1.6; color: ${GREY};">${item.description}</p>`
        : '';

      const bottomBorder = i < items.length - 1
        ? `border-bottom: 1px solid ${RULE}; padding-bottom: 24px; margin-bottom: 24px;`
        : '';

      return `
      <tr>
        <td style="padding: ${i === 0 ? '0' : '24px'} 0 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${bottomBorder}">
            <tr>
              ${image}
              <td valign="top">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom: 6px;">
                      <span style="font-family: ${MONO}; font-size: 11px; font-weight: 700; color: ${ORANGE}; letter-spacing: 0.5px;">${num}</span>
                      <span style="font-family: ${SANS}; font-size: 10px; font-weight: 600; color: ${SILVER}; text-transform: uppercase; letter-spacing: 1px; padding-left: 10px;">${item.source}</span>
                    </td>
                  </tr>
                </table>
                <a href="${newsPageUrl}" style="text-decoration: none; color: ${DEEP};">
                  <span style="font-family: ${SERIF}; font-size: 17px; font-weight: 700; line-height: 1.35; color: ${DEEP};">${item.title}</span>
                </a>
                ${desc}
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join('');

  return `
    <tr>
      <td style="background-color: ${WHITE}; padding: 44px 40px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom: 8px;">
              <span style="font-family: ${SANS}; font-size: 11px; font-weight: 700; color: ${ORANGE}; text-transform: uppercase; letter-spacing: 2px;">Trail &amp; Ultra News</span>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 28px;">
              <h2 style="margin: 0; font-family: ${SERIF}; font-size: 28px; font-weight: 700; color: ${DEEP}; line-height: 1.2;">This Week in Running</h2>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${cards}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 32px;">
              ${ctaButton(newsPageUrl, 'All Stories on Film My Run', 'ghost')}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderParkrun(parkrun: NonNullable<NewsletterPayload['parkrun']>): string {
  return `
    <tr>
      <td style="background-color: ${CREAM}; padding: 44px 40px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom: 16px;">
              <span style="font-family: ${SERIF}; font-size: 54px; line-height: 1; color: ${ORANGE}; font-weight: 700;">&ldquo;</span>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="margin: 0; font-family: ${SERIF}; font-size: 20px; line-height: 1.65; color: ${SLATE}; font-style: italic;">
                ${parkrun.text}
              </p>
            </td>
          </tr>
          <tr>
            <td>
              ${orangeRule('40px')}
              <p style="margin: 12px 0 0; font-family: ${SANS}; font-size: 11px; font-weight: 700; color: ${ORANGE}; text-transform: uppercase; letter-spacing: 2px;">parkrun</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderAppOfTheWeek(app: NonNullable<NewsletterPayload['appOfTheWeek']>): string {
  return `
    <tr>
      <td style="background-color: ${WHITE}; padding: 44px 40px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: ${CREAM}; padding: 32px; border-radius: 4px; border-left: 4px solid ${ORANGE};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 4px;">
                    <span style="font-family: ${SANS}; font-size: 10px; font-weight: 700; color: ${ORANGE}; text-transform: uppercase; letter-spacing: 2px;">Tool / App of the Week</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px;">
                    <a href="${app.url}" style="text-decoration: none;">
                      <h3 style="margin: 0; font-family: ${SERIF}; font-size: 22px; font-weight: 700; color: ${DEEP}; line-height: 1.3;">${app.name}</h3>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 18px;">
                    <p style="margin: 0; font-family: ${SANS}; font-size: 14px; line-height: 1.7; color: ${GREY};">${app.description}</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="${app.url}" style="font-family: ${SANS}; font-size: 13px; font-weight: 700; color: ${ORANGE}; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px;">Try it &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderSession(session: NonNullable<NewsletterPayload['sessionOfTheWeek']>): string {
  return `
    <tr>
      <td style="background-color: ${CREAM}; padding: 44px 40px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: ${WHITE}; padding: 32px; border-radius: 4px; border-top: 4px solid ${ORANGE};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 4px;">
                    <span style="font-family: ${SANS}; font-size: 10px; font-weight: 700; color: ${ORANGE}; text-transform: uppercase; letter-spacing: 2px;">Session of the Week</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px;">
                    <h3 style="margin: 0; font-family: ${SERIF}; font-size: 22px; font-weight: 700; color: ${DEEP}; line-height: 1.3;">${session.title}</h3>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin: 0; font-family: ${SANS}; font-size: 14px; line-height: 1.7; color: ${GREY};">${session.description}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderTipSection(
  label: string,
  text: string,
  bg: string,
  accentColor: string,
  citation?: string
): string {
  const cite = citation
    ? `<tr><td style="padding-top: 16px;"><p style="margin: 0; font-family: ${SANS}; font-size: 11px; font-style: italic; line-height: 1.5; color: ${SILVER};">Source: ${citation}</p></td></tr>`
    : '';

  return `
    <tr>
      <td style="background-color: ${bg}; padding: 44px 40px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-left: 4px solid ${accentColor}; padding-left: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 14px;">
                    <span style="font-family: ${SANS}; font-size: 10px; font-weight: 700; color: ${accentColor}; text-transform: uppercase; letter-spacing: 2px;">${label}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin: 0; font-family: ${SERIF}; font-size: 16px; line-height: 1.75; color: ${SLATE};">
                      ${text}
                    </p>
                  </td>
                </tr>
                ${cite}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderTrainingTip(tip: NonNullable<NewsletterPayload['trainingTip']>): string {
  return renderTipSection('Training Tip', tip.text, WHITE, ORANGE, tip.citation);
}

function renderScience(sci: NonNullable<NewsletterPayload['scienceSection']>): string {
  return renderTipSection('Science Says', sci.text, CREAM, '#2563eb', sci.citation);
}

function renderNutrition(nut: NonNullable<NewsletterPayload['nutritionTip']>): string {
  return renderTipSection('Nutrition', nut.text, WHITE, '#16a34a', nut.citation);
}

function renderArchives(item: NonNullable<NewsletterPayload['fromTheArchives']>): string {
  const image = item.imageUrl
    ? `<tr>
        <td style="padding-bottom: 20px; font-size: 0; line-height: 0;">
          <a href="${item.url}" style="text-decoration: none;">
            <img src="${item.imageUrl}" alt="${item.title}" width="520" style="display: block; width: 100%; max-width: 520px; height: auto; border: 0; border-radius: 4px;" />
          </a>
        </td>
      </tr>`
    : '';

  return `
    <tr>
      <td style="background-color: ${WARM_WHITE}; padding: 44px 40px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom: 8px;">
              <span style="font-family: ${SANS}; font-size: 10px; font-weight: 700; color: ${ORANGE}; text-transform: uppercase; letter-spacing: 2px;">From the Archives</span>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px;">
              <h2 style="margin: 0; font-family: ${SERIF}; font-size: 24px; font-weight: 700; color: ${DEEP}; line-height: 1.25;">Worth Another Look</h2>
            </td>
          </tr>
          ${image}
          <tr>
            <td style="padding-bottom: 12px;">
              <a href="${item.url}" style="text-decoration: none;">
                <span style="font-family: ${SERIF}; font-size: 20px; font-weight: 700; line-height: 1.3; color: ${DEEP};">${item.title}</span>
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; font-family: ${SANS}; font-size: 14px; line-height: 1.7; color: ${GREY};">${item.description}</p>
            </td>
          </tr>
          <tr>
            <td>${ctaButton(item.url, 'Read Again', 'ghost')}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderWhatsNew(text: string): string {
  return `
    <tr>
      <td style="background-color: ${CREAM}; padding: 44px 40px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom: 8px;">
              <span style="font-family: ${SANS}; font-size: 10px; font-weight: 700; color: ${ORANGE}; text-transform: uppercase; letter-spacing: 2px;">What's New</span>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px;">
              <h2 style="margin: 0; font-family: ${SERIF}; font-size: 24px; font-weight: 700; color: ${DEEP}; line-height: 1.25;">On the Site</h2>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin: 0; font-family: ${SANS}; font-size: 15px; line-height: 1.7; color: ${GREY};">${text}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderSponsors(): string {
  const sponsors = [
    { name: 'NoblePro', url: 'https://noble-pro.com' },
    { name: 'Enertor', url: 'https://enertor.com' },
    { name: 'Protein Rebel', url: 'https://proteinrebel.com' },
    { name: 'Flying Burrito', url: 'https://flyingburrito.co.uk' },
  ];

  const sponsorCells = sponsors
    .map(
      (s) =>
        `<td style="padding: 10px 16px;" align="center" valign="middle">
          <a href="${s.url}" style="font-family: ${SANS}; font-size: 13px; font-weight: 700; color: ${SLATE}; text-decoration: none; letter-spacing: 0.3px; white-space: nowrap;">${s.name}</a>
        </td>`
    )
    .join('');

  return `
    <tr>
      <td style="background-color: ${WARM_WHITE}; padding: 36px 40px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <span style="font-family: ${SANS}; font-size: 11px; font-weight: 700; color: ${SILVER}; text-transform: uppercase; letter-spacing: 2px;">Thanks to Our Sponsors</span>
            </td>
          </tr>
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  ${sponsorCells}
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

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

export function buildNewsletterHtml(
  payload: NewsletterPayload,
  unsubscribeUrl: string,
  baseUrl: string,
  viewInBrowserUrl?: string
): string {
  const sections: string[] = [];

  if (payload.intro) sections.push(renderIntro(payload.intro));
  if (payload.blogPost) sections.push(renderBlogPost(payload.blogPost));
  if (payload.videoOfTheWeek) sections.push(renderVideo(payload.videoOfTheWeek));
  if (payload.news?.length) sections.push(renderNews(payload.news, `${baseUrl}/news`));
  if (payload.parkrun) sections.push(renderParkrun(payload.parkrun));
  if (payload.appOfTheWeek) sections.push(renderAppOfTheWeek(payload.appOfTheWeek));
  if (payload.sessionOfTheWeek) sections.push(renderSession(payload.sessionOfTheWeek));
  if (payload.trainingTip) sections.push(renderTrainingTip(payload.trainingTip));
  if (payload.scienceSection) sections.push(renderScience(payload.scienceSection));
  if (payload.nutritionTip) sections.push(renderNutrition(payload.nutritionTip));
  if (payload.fromTheArchives) sections.push(renderArchives(payload.fromTheArchives));
  if (payload.whatsNew) sections.push(renderWhatsNew(payload.whatsNew.text));

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const viewLink = viewInBrowserUrl
    ? `<a href="${viewInBrowserUrl}" style="color: ${SILVER}; text-decoration: underline;">View this email in your browser</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${payload.subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
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
<body style="margin: 0; padding: 0; background-color: ${OUTER_BG}; font-family: ${SANS}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">

  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 0;">
    ${payload.intro || payload.subject}${'&#847; &zwnj; &nbsp;'.repeat(40)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${OUTER_BG};">
    <tr>
      <td align="center" style="padding: 16px 16px 0;">

        <!-- View in browser -->
        ${viewLink ? `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td align="center" style="padding: 10px 0 16px;">
              <span style="font-family: ${SANS}; font-size: 11px; color: ${SILVER};">
                ${viewLink}
              </span>
            </td>
          </tr>
        </table>` : ''}

        <table role="presentation" class="email-wrap" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; border-collapse: separate;">

          <!-- ══ THICK ORANGE TOP BAR ══ -->
          <tr>
            <td style="height: 6px; background-color: ${ORANGE}; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- ══ HEADER ══ -->
          <tr>
            <td style="background-color: ${DEEP}; padding: 40px 40px 36px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 14px;">
                    <h1 style="margin: 0; font-family: ${SERIF}; font-size: 32px; font-weight: 700; color: ${WHITE}; letter-spacing: 4px; text-transform: uppercase;">
                      Film My Run
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 0 12px;">
                          <span style="font-family: ${MONO}; font-size: 10px; color: ${ORANGE}; text-transform: uppercase; letter-spacing: 2px;">${today}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Angular accent below header -->
          ${angledDivider()}

          <!-- ══ SECTIONS ══ -->
          ${sections.join(`
          <!-- section divider -->
          ${accentRule()}`)}

          <!-- ══ SPONSORS ══ -->
          ${accentRule()}
          ${renderSponsors()}

          <!-- ══ FOOTER ══ -->
          <tr><td style="height: 3px; background-color: ${ORANGE}; font-size: 0; line-height: 0;">&nbsp;</td></tr>
          <tr>
            <td style="background-color: ${DEEP}; padding: 40px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <span style="font-family: ${SERIF}; font-size: 20px; font-weight: 700; color: ${WHITE}; letter-spacing: 3px; text-transform: uppercase;">Film My Run</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 0 10px;"><a href="https://youtube.com/@filmmyrun" style="font-family: ${SANS}; font-size: 11px; font-weight: 600; color: ${SILVER}; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">YouTube</a></td>
                        <td style="color: ${DEEP_MID}; font-size: 11px;">&#8226;</td>
                        <td style="padding: 0 10px;"><a href="https://instagram.com/filmmyrun" style="font-family: ${SANS}; font-size: 11px; font-weight: 600; color: ${SILVER}; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Instagram</a></td>
                        <td style="color: ${DEEP_MID}; font-size: 11px;">&#8226;</td>
                        <td style="padding: 0 10px;"><a href="https://twitter.com/filmmyrun" style="font-family: ${SANS}; font-size: 11px; font-weight: 600; color: ${SILVER}; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Twitter</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="height: 1px; background-color: ${DEEP_MID}; font-size: 0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: ${SANS}; font-size: 11px; line-height: 1.7; color: ${SLATE};">
                      You're receiving this because you subscribed to the Film My Run newsletter.
                      <br />
                      <a href="${unsubscribeUrl}" style="color: ${SILVER}; text-decoration: underline;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
