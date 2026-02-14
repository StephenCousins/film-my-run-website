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
  fromTheArchives?: { title: string; url: string; description: string; imageUrl?: string };
  whatsNew?: { text: string };
}

const BRAND_ORANGE = '#f88c00';
const DARK_TEXT = '#18181b';
const SECONDARY_TEXT = '#52525b';
const MUTED_TEXT = '#a1a1aa';
const LIGHT_BG = '#fafafa';
const WHITE = '#ffffff';
const BORDER = '#e4e4e7';

function sectionHeading(title: string): string {
  return `
    <tr>
      <td style="padding: 32px 0 12px 0;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: ${BRAND_ORANGE}; text-transform: uppercase; letter-spacing: 0.5px;">
          ${title}
        </h2>
        <div style="margin-top: 8px; height: 2px; width: 40px; background-color: ${BRAND_ORANGE};"></div>
      </td>
    </tr>`;
}

function renderNews(items: NonNullable<NewsletterPayload['news']>, newsPageUrl: string): string {
  const cards = items
    .map((item) => {
      const image = item.imageUrl
        ? `<td style="width: 80px; padding-right: 14px;" valign="top">
            <a href="${newsPageUrl}"><img src="${item.imageUrl}" alt="" width="80" height="54" style="border-radius: 6px; display: block; object-fit: cover; width: 80px; height: 54px;" /></a>
           </td>`
        : '';

      const description = item.description
        ? `<p style="margin: 4px 0 0; color: ${SECONDARY_TEXT}; font-size: 13px; line-height: 1.5;">${item.description}</p>`
        : '';

      return `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid ${BORDER};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${image}
              <td valign="top">
                <span style="color: ${DARK_TEXT}; font-size: 15px; font-weight: 600; line-height: 1.4;">
                  ${item.title}
                </span>
                <span style="color: ${MUTED_TEXT}; font-size: 12px; margin-left: 6px;">${item.source}</span>
                ${description}
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join('');

  return `
    ${sectionHeading('Trail & Ultra News')}
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${cards}
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
          <tr>
            <td>
              <a href="${newsPageUrl}" style="display: inline-block; padding: 10px 24px; background-color: ${BRAND_ORANGE}; color: ${WHITE}; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 999px;">Read all stories on Film My Run &rarr;</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderBlogPost(post: NonNullable<NewsletterPayload['blogPost']>): string {
  const image = post.imageUrl
    ? `<tr><td style="padding-bottom: 16px;"><a href="${post.url}"><img src="${post.imageUrl}" alt="${post.title}" width="100%" style="border-radius: 8px; display: block; max-width: 100%;" /></a></td></tr>`
    : '';

  return `
    ${sectionHeading('Latest Blog Post')}
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${image}
          <tr>
            <td>
              <a href="${post.url}" style="color: ${DARK_TEXT}; text-decoration: none; font-size: 18px; font-weight: 700; line-height: 1.3;">
                ${post.title}
              </a>
              <div style="margin: 12px 0 16px; color: ${SECONDARY_TEXT}; font-size: 14px; line-height: 1.65;">
                ${post.snippet}
              </div>
              <a href="${post.url}" style="display: inline-block; padding: 10px 24px; background-color: ${BRAND_ORANGE}; color: ${WHITE}; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 999px;">Read the full post &rarr;</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderVideo(video: NonNullable<NewsletterPayload['videoOfTheWeek']>): string {
  return `
    ${sectionHeading('Video of the Week')}
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom: 14px; position: relative;">
              <a href="${video.url}">
                <img src="${video.thumbnailUrl}" alt="${video.title}" width="100%" style="border-radius: 8px; display: block; max-width: 100%;" />
              </a>
            </td>
          </tr>
          <tr>
            <td>
              <a href="${video.url}" style="color: ${DARK_TEXT}; text-decoration: none; font-size: 16px; font-weight: 700; line-height: 1.3;">
                ${video.title}
              </a>
              <p style="margin: 8px 0 14px; color: ${SECONDARY_TEXT}; font-size: 14px; line-height: 1.6;">${video.description}</p>
              <a href="${video.url}" style="color: ${BRAND_ORANGE}; font-size: 14px; font-weight: 600; text-decoration: none;">Watch on YouTube &rarr;</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderAppOfTheWeek(app: NonNullable<NewsletterPayload['appOfTheWeek']>): string {
  return `
    ${sectionHeading('Tool / App of the Week')}
    <tr>
      <td style="padding: 16px; background-color: ${LIGHT_BG}; border-radius: 8px;">
        <a href="${app.url}" style="color: ${DARK_TEXT}; text-decoration: none; font-size: 16px; font-weight: 700;">
          ${app.name}
        </a>
        <p style="margin: 8px 0 0; color: ${SECONDARY_TEXT}; font-size: 14px; line-height: 1.5;">${app.description}</p>
      </td>
    </tr>`;
}

function renderSession(session: NonNullable<NewsletterPayload['sessionOfTheWeek']>): string {
  return `
    ${sectionHeading('Session of the Week')}
    <tr>
      <td style="padding: 16px; background-color: ${LIGHT_BG}; border-radius: 8px;">
        <strong style="color: ${DARK_TEXT}; font-size: 15px;">${session.title}</strong>
        <p style="margin: 8px 0 0; color: ${SECONDARY_TEXT}; font-size: 14px; line-height: 1.5;">${session.description}</p>
      </td>
    </tr>`;
}

function renderCitedSection(title: string, text: string, citation?: string): string {
  const cite = citation
    ? `<p style="margin: 12px 0 0; color: ${MUTED_TEXT}; font-size: 12px; font-style: italic; line-height: 1.4;">Source: ${citation}</p>`
    : '';

  return `
    ${sectionHeading(title)}
    <tr>
      <td style="padding: 16px; background-color: ${LIGHT_BG}; border-radius: 8px;">
        <div style="color: ${SECONDARY_TEXT}; font-size: 14px; line-height: 1.65;">
          ${text}
        </div>
        ${cite}
      </td>
    </tr>`;
}

function renderTextSection(title: string, text: string): string {
  return `
    ${sectionHeading(title)}
    <tr>
      <td style="color: ${SECONDARY_TEXT}; font-size: 14px; line-height: 1.6;">
        ${text}
      </td>
    </tr>`;
}

function renderArchives(item: NonNullable<NewsletterPayload['fromTheArchives']>): string {
  const image = item.imageUrl
    ? `<tr><td style="padding-bottom: 12px;"><a href="${item.url}"><img src="${item.imageUrl}" alt="${item.title}" width="100%" style="border-radius: 8px; display: block; max-width: 100%;" /></a></td></tr>`
    : '';

  return `
    ${sectionHeading('From the Archives')}
    <tr>
      <td style="padding: 16px; background-color: ${LIGHT_BG}; border-radius: 8px; border-left: 3px solid ${BRAND_ORANGE};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${image}
          <tr>
            <td>
              <a href="${item.url}" style="color: ${DARK_TEXT}; text-decoration: none; font-size: 15px; font-weight: 700;">
                ${item.title}
              </a>
              <p style="margin: 8px 0 0; color: ${SECONDARY_TEXT}; font-size: 14px; line-height: 1.5;">${item.description}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function buildNewsletterHtml(
  payload: NewsletterPayload,
  unsubscribeUrl: string,
  baseUrl: string
): string {
  const sections: string[] = [];

  // Welcome intro
  if (payload.intro) {
    sections.push(`
    <tr>
      <td style="padding: 24px 0 8px; color: ${SECONDARY_TEXT}; font-size: 15px; line-height: 1.65;">
        ${payload.intro}
      </td>
    </tr>`);
  }

  if (payload.news?.length) sections.push(renderNews(payload.news, `${baseUrl}/news`));
  if (payload.blogPost) sections.push(renderBlogPost(payload.blogPost));
  if (payload.videoOfTheWeek) sections.push(renderVideo(payload.videoOfTheWeek));
  if (payload.appOfTheWeek) sections.push(renderAppOfTheWeek(payload.appOfTheWeek));
  if (payload.sessionOfTheWeek) sections.push(renderSession(payload.sessionOfTheWeek));
  if (payload.trainingTip) sections.push(renderCitedSection('Training Tip', payload.trainingTip.text, payload.trainingTip.citation));
  if (payload.scienceSection) sections.push(renderCitedSection('What Does the Science Say?', payload.scienceSection.text, payload.scienceSection.citation));
  if (payload.nutritionTip) sections.push(renderCitedSection('Nutrition Tip', payload.nutritionTip.text, payload.nutritionTip.citation));
  if (payload.fromTheArchives) sections.push(renderArchives(payload.fromTheArchives));
  if (payload.whatsNew) sections.push(renderTextSection("What's New", payload.whatsNew.text));

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
</head>
<body style="margin: 0; padding: 0; background-color: ${LIGHT_BG}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${LIGHT_BG};">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; background-color: ${BRAND_ORANGE}; border-radius: 12px 12px 0 0;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <!-- Three runners logo -->
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="padding: 0 1px;"><svg width="28" height="28" viewBox="0 0 24 24" fill="${WHITE}" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/></svg></td>
                      <td style="padding: 0 1px;"><svg width="28" height="28" viewBox="0 0 24 24" fill="${WHITE}" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/></svg></td>
                      <td style="padding: 0 1px;"><svg width="28" height="28" viewBox="0 0 24 24" fill="${WHITE}" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/></svg></td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 12px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: ${WHITE}; letter-spacing: -0.5px;">
                      Film My Run
                    </h1>
                    <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px;">
                      Newsletter &bull; ${today}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 8px 32px 32px; background-color: ${WHITE};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${sections.join('')}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: ${LIGHT_BG}; border-top: 1px solid ${BORDER}; border-radius: 0 0 12px 12px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="https://instagram.com/filmmyrun" style="color: ${MUTED_TEXT}; text-decoration: none; font-size: 13px; margin: 0 8px;">Instagram</a>
                    <a href="https://youtube.com/@filmmyrun" style="color: ${MUTED_TEXT}; text-decoration: none; font-size: 13px; margin: 0 8px;">YouTube</a>
                    <a href="https://twitter.com/filmmyrun" style="color: ${MUTED_TEXT}; text-decoration: none; font-size: 13px; margin: 0 8px;">Twitter</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: ${MUTED_TEXT}; font-size: 12px; line-height: 1.5;">
                      You received this email because you subscribed to the Film My Run newsletter.
                      <br />
                      <a href="${unsubscribeUrl}" style="color: ${MUTED_TEXT}; text-decoration: underline;">Unsubscribe</a>
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
