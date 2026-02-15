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

// ── Brand palette ──
const ORANGE = '#f88c00';
const ORANGE_DARK = '#e07800';
const DARK = '#18181b';
const CHARCOAL = '#27272a';
const BODY_TEXT = '#3f3f46';
const SECONDARY = '#52525b';
const MUTED = '#a1a1aa';
const LIGHT_BG = '#f4f4f5';
const WHITE = '#ffffff';
const BORDER = '#e4e4e7';

// ── Helpers ──

/** Full-width section wrapper with optional background colour */
function section(bg: string, content: string, extraStyle = ''): string {
  return `
    <tr>
      <td style="background-color: ${bg}; ${extraStyle}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 40px 32px;">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function sectionLabel(label: string): string {
  return `<p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: ${ORANGE}; text-transform: uppercase; letter-spacing: 2px;">${label}</p>`;
}

function heading(text: string, size = 24): string {
  return `<h2 style="margin: 0 0 16px; font-size: ${size}px; font-weight: 800; color: ${DARK}; line-height: 1.25; letter-spacing: -0.3px;">${text}</h2>`;
}

function headingLight(text: string, size = 24): string {
  return `<h2 style="margin: 0 0 16px; font-size: ${size}px; font-weight: 800; color: ${WHITE}; line-height: 1.25; letter-spacing: -0.3px;">${text}</h2>`;
}

function ctaButton(url: string, text: string, style: 'solid' | 'outline' = 'solid'): string {
  if (style === 'outline') {
    return `<a href="${url}" style="display: inline-block; padding: 14px 32px; border: 2px solid ${ORANGE}; color: ${ORANGE}; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${text}</a>`;
  }
  return `<a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: ${ORANGE}; color: ${WHITE}; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${text}</a>`;
}

function dividerLine(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding: 0; height: 1px; background-color: ${BORDER};"></td></tr></table>`;
}

// ── Section renderers ──

function renderIntro(text: string): string {
  return section(WHITE, `
    <p style="margin: 0; font-size: 16px; line-height: 1.7; color: ${BODY_TEXT};">
      ${text}
    </p>
  `);
}

function renderBlogPost(post: NonNullable<NewsletterPayload['blogPost']>): string {
  const image = post.imageUrl
    ? `<tr>
        <td style="padding: 0;">
          <a href="${post.url}">
            <img src="${post.imageUrl}" alt="${post.title}" width="600" style="display: block; width: 100%; max-width: 600px; height: auto;" />
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
            <td style="padding: 28px 32px 40px;">
              ${sectionLabel('Latest Blog Post')}
              <h2 style="margin: 0 0 14px; font-size: 28px; font-weight: 800; line-height: 1.2; letter-spacing: -0.5px;">
                <a href="${post.url}" style="color: ${DARK}; text-decoration: none;">${post.title}</a>
              </h2>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: ${SECONDARY};">
                ${post.snippet}
              </p>
              ${ctaButton(post.url, 'Read the Full Post &rarr;')}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderVideo(video: NonNullable<NewsletterPayload['videoOfTheWeek']>): string {
  return section(DARK, `
    ${sectionLabel('Video of the Week')}
    ${headingLight(video.title)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding: 0 0 20px; position: relative;">
          <a href="${video.url}" style="text-decoration: none;">
            <img src="${video.thumbnailUrl}" alt="${video.title}" width="536" style="display: block; width: 100%; max-width: 536px; height: auto; border-radius: 8px;" />
            <!--[if !mso]><!-->
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 64px; height: 64px; background-color: ${ORANGE}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <div style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-left: 20px solid ${WHITE}; margin-left: 4px;"></div>
            </div>
            <!--<![endif]-->
          </a>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: rgba(255,255,255,0.7);">${video.description}</p>
    ${ctaButton(video.url, 'Watch on YouTube &rarr;')}
  `, 'border-radius: 0;');
}

function renderNews(items: NonNullable<NewsletterPayload['news']>, newsPageUrl: string): string {
  const cards = items
    .map((item, i) => {
      const image = item.imageUrl
        ? `<td style="width: 100px; padding-right: 16px;" valign="top">
            <a href="${newsPageUrl}"><img src="${item.imageUrl}" alt="" width="100" height="68" style="border-radius: 6px; display: block; object-fit: cover; width: 100px; height: 68px;" /></a>
           </td>`
        : '';

      const description = item.description
        ? `<p style="margin: 6px 0 0; color: ${SECONDARY}; font-size: 13px; line-height: 1.55;">${item.description}</p>`
        : '';

      const border = i < items.length - 1
        ? `border-bottom: 1px solid ${BORDER};`
        : '';

      return `
      <tr>
        <td style="padding: 16px 0; ${border}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${image}
              <td valign="top">
                <a href="${newsPageUrl}" style="color: ${DARK}; text-decoration: none; font-size: 15px; font-weight: 700; line-height: 1.35;">
                  ${item.title}
                </a>
                <span style="color: ${MUTED}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 8px;">${item.source}</span>
                ${description}
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join('');

  return section(WHITE, `
    ${sectionLabel('Trail & Ultra News')}
    ${heading('This Week in Running')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${cards}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
      <tr><td>${ctaButton(newsPageUrl, 'All Stories on Film My Run &rarr;', 'outline')}</td></tr>
    </table>
  `);
}

function renderParkrun(parkrun: NonNullable<NewsletterPayload['parkrun']>): string {
  return section(LIGHT_BG, `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-left: 4px solid ${ORANGE}; padding-left: 20px;">
          ${sectionLabel('parkrun')}
          <p style="margin: 0; font-size: 15px; line-height: 1.7; color: ${BODY_TEXT};">
            ${parkrun.text}
          </p>
        </td>
      </tr>
    </table>
  `);
}

function renderAppOfTheWeek(app: NonNullable<NewsletterPayload['appOfTheWeek']>): string {
  return section(WHITE, `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color: ${LIGHT_BG}; border-radius: 10px; padding: 28px;">
          ${sectionLabel('Tool / App of the Week')}
          <h3 style="margin: 0 0 10px; font-size: 20px; font-weight: 800; color: ${DARK};">
            <a href="${app.url}" style="color: ${DARK}; text-decoration: none;">${app.name}</a>
          </h3>
          <p style="margin: 0 0 18px; color: ${SECONDARY}; font-size: 14px; line-height: 1.65;">${app.description}</p>
          <a href="${app.url}" style="color: ${ORANGE}; font-size: 14px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px;">Check it out &rarr;</a>
        </td>
      </tr>
    </table>
  `);
}

function renderSession(session: NonNullable<NewsletterPayload['sessionOfTheWeek']>): string {
  return section(WHITE, `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color: ${LIGHT_BG}; border-radius: 10px; padding: 28px;">
          ${sectionLabel('Session of the Week')}
          <h3 style="margin: 0 0 10px; font-size: 20px; font-weight: 800; color: ${DARK};">${session.title}</h3>
          <p style="margin: 0; color: ${SECONDARY}; font-size: 14px; line-height: 1.65;">${session.description}</p>
        </td>
      </tr>
    </table>
  `);
}

function renderTipCard(label: string, title: string, text: string, accentColor: string, citation?: string): string {
  const cite = citation
    ? `<p style="margin: 16px 0 0; color: ${MUTED}; font-size: 12px; font-style: italic; line-height: 1.45;">Source: ${citation}</p>`
    : '';

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-left: 4px solid ${accentColor}; padding-left: 20px;">
          ${sectionLabel(label)}
          ${heading(title, 20)}
          <p style="margin: 0; color: ${BODY_TEXT}; font-size: 15px; line-height: 1.7;">
            ${text}
          </p>
          ${cite}
        </td>
      </tr>
    </table>`;
}

function renderTrainingTip(tip: NonNullable<NewsletterPayload['trainingTip']>): string {
  return section(LIGHT_BG, renderTipCard('Training Tip', 'Train Smarter', tip.text, ORANGE, tip.citation));
}

function renderScience(sci: NonNullable<NewsletterPayload['scienceSection']>): string {
  return section(WHITE, renderTipCard('Science', 'What Does the Science Say?', sci.text, '#3b82f6', sci.citation));
}

function renderNutrition(nut: NonNullable<NewsletterPayload['nutritionTip']>): string {
  return section(LIGHT_BG, renderTipCard('Nutrition', 'Fuel Your Runs', nut.text, '#22c55e', nut.citation));
}

function renderArchives(item: NonNullable<NewsletterPayload['fromTheArchives']>): string {
  const image = item.imageUrl
    ? `<tr>
        <td style="padding-bottom: 16px;">
          <a href="${item.url}"><img src="${item.imageUrl}" alt="${item.title}" width="536" style="display: block; width: 100%; max-width: 536px; height: auto; border-radius: 8px;" /></a>
        </td>
      </tr>`
    : '';

  return section(WHITE, `
    ${sectionLabel('From the Archives')}
    ${heading('Worth Another Look')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${image}
      <tr>
        <td>
          <a href="${item.url}" style="color: ${DARK}; text-decoration: none; font-size: 18px; font-weight: 700; line-height: 1.3;">
            ${item.title}
          </a>
          <p style="margin: 10px 0 20px; color: ${SECONDARY}; font-size: 14px; line-height: 1.65;">${item.description}</p>
          ${ctaButton(item.url, 'Read Again &rarr;', 'outline')}
        </td>
      </tr>
    </table>
  `);
}

function renderWhatsNew(text: string): string {
  return section(LIGHT_BG, `
    ${sectionLabel("What's New")}
    ${heading('On the Site')}
    <p style="margin: 0; color: ${BODY_TEXT}; font-size: 15px; line-height: 1.7;">
      ${text}
    </p>
  `);
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
  baseUrl: string
): string {
  const sections: string[] = [];

  // Intro
  if (payload.intro) sections.push(renderIntro(payload.intro));

  // Hero feature: blog post with full-width image
  if (payload.blogPost) sections.push(renderBlogPost(payload.blogPost));

  // Video on dark background
  if (payload.videoOfTheWeek) sections.push(renderVideo(payload.videoOfTheWeek));

  // News
  if (payload.news?.length) sections.push(renderNews(payload.news, `${baseUrl}/news`));

  // Parkrun
  if (payload.parkrun) sections.push(renderParkrun(payload.parkrun));

  // Tools & sessions in cards
  if (payload.appOfTheWeek) sections.push(renderAppOfTheWeek(payload.appOfTheWeek));
  if (payload.sessionOfTheWeek) sections.push(renderSession(payload.sessionOfTheWeek));

  // Tips with coloured accents — alternating bg
  if (payload.trainingTip) sections.push(renderTrainingTip(payload.trainingTip));
  if (payload.scienceSection) sections.push(renderScience(payload.scienceSection));
  if (payload.nutritionTip) sections.push(renderNutrition(payload.nutritionTip));

  // Archives
  if (payload.fromTheArchives) sections.push(renderArchives(payload.fromTheArchives));

  // What's new
  if (payload.whatsNew) sections.push(renderWhatsNew(payload.whatsNew.text));

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
      .email-container { width: 100% !important; }
      .stack-col { display: block !important; width: 100% !important; }
      .mobile-pad { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${LIGHT_BG}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">

  <!-- Preheader (hidden preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${payload.intro || payload.subject}
    ${'&zwnj;&nbsp;'.repeat(30)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${LIGHT_BG};">
    <tr>
      <td align="center" style="padding: 16px 0;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: ${WHITE};">

          <!-- ══════ HEADER ══════ -->
          <tr>
            <td style="background-color: ${DARK}; padding: 36px 32px 32px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <!-- Orange accent bar -->
                    <div style="width: 48px; height: 4px; background-color: ${ORANGE}; border-radius: 2px;"></div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: ${WHITE}; letter-spacing: 3px; text-transform: uppercase;">
                      FILM MY RUN
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <p style="margin: 0; font-size: 12px; color: ${ORANGE}; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
                      Weekly Newsletter &bull; ${today}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ══════ SECTIONS ══════ -->
          ${sections.join('')}

          <!-- ══════ FOOTER ══════ -->
          <tr>
            <td style="background-color: ${DARK}; padding: 40px 32px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <!-- Orange accent -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="width: 48px; height: 4px; background-color: ${ORANGE}; border-radius: 2px;"></div>
                  </td>
                </tr>
                <!-- Brand -->
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <p style="margin: 0; font-size: 18px; font-weight: 800; color: ${WHITE}; letter-spacing: 2px; text-transform: uppercase;">Film My Run</p>
                  </td>
                </tr>
                <!-- Social links -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="https://youtube.com/@filmmyrun" style="display: inline-block; padding: 8px 14px; margin: 0 4px; background-color: ${CHARCOAL}; color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">YouTube</a>
                    <a href="https://instagram.com/filmmyrun" style="display: inline-block; padding: 8px 14px; margin: 0 4px; background-color: ${CHARCOAL}; color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Instagram</a>
                    <a href="https://twitter.com/filmmyrun" style="display: inline-block; padding: 8px 14px; margin: 0 4px; background-color: ${CHARCOAL}; color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Twitter</a>
                  </td>
                </tr>
                <!-- Divider -->
                <tr>
                  <td style="padding: 0 0 20px;">
                    <div style="height: 1px; background-color: ${CHARCOAL};"></div>
                  </td>
                </tr>
                <!-- Unsubscribe -->
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 12px; line-height: 1.6;">
                      You received this because you subscribed to the Film My Run newsletter.
                      <br />
                      <a href="${unsubscribeUrl}" style="color: rgba(255,255,255,0.5); text-decoration: underline;">Unsubscribe</a>
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
