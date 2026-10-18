export function classifyUserAgent(userAgent = '') {
  const ua = userAgent.toLowerCase()
  const bot = /bot|crawler|spider|preview|facebookexternalhit|slackbot|discordbot|whatsapp|telegrambot|headless|uptime|monitor/.test(ua)
  const device = /ipad|tablet/.test(ua) ? 'tablet' : /mobile|iphone|android/.test(ua) ? 'mobile' : 'desktop'
  const browser = /edg\//.test(ua) ? 'Edge'
    : /firefox\//.test(ua) ? 'Firefox'
      : /(?:chrome|crios)\//.test(ua) && !/edg\//.test(ua) ? 'Chrome'
        : /safari\//.test(ua) && !/(?:chrome|crios)\//.test(ua) ? 'Safari'
          : /curl|wget/.test(ua) ? 'CLI' : 'Other'
  return { bot, device, browser }
}
