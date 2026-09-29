export default {
  layout: 'layouts/page.njk',
  permalink: data => (data.page.fileSlug === 'home' ? '/' : `${data.page.filePathStem.replace(/^\/pages/, '')}/`),
};
