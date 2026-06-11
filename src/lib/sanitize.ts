import sanitizeHtml from 'sanitize-html';

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'figure', 'figcaption', 'iframe', 'video', 'source',
      'picture', 'details', 'summary', 'mark', 'del', 'ins',
      'sup', 'sub', 'abbr', 'time', 'cite',
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height', 'loading', 'class', 'style'],
      iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'title', 'class', 'style'],
      video: ['src', 'controls', 'width', 'height', 'poster', 'class', 'preload'],
      source: ['src', 'type'],
      a: ['href', 'target', 'rel', 'class'],
      div: ['class', 'style', 'id', 'data-*'],
      span: ['class', 'style'],
      p: ['class', 'style'],
      figure: ['class', 'style'],
      figcaption: ['class'],
      time: ['datetime'],
      abbr: ['title'],
      '*': ['id', 'class'],
    },
    allowedIframeHostnames: [
      'www.youtube.com',
      'youtube.com',
      'player.vimeo.com',
      'www.strava.com',
      'strava.com',
    ],
  });
}
