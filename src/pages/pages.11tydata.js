export default {
  layout: 'layouts/page.njk',
  // Page bodies contain {% summary %} shortcodes and {% include %} partials from the Squarespace conversion.
  templateEngineOverride: 'njk',
  permalink: data => (data.page.fileSlug === 'home' ? '/' : `${data.page.filePathStem.replace(/^\/pages/, '')}/`),
};
