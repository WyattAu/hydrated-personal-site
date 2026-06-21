import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const projects = await getCollection('projects');
  const docs = await getCollection('docs');

  const items = [
    ...projects.map((project) => ({
      title: project.data.title,
      pubDate: new Date(),
      description: project.data.description,
      link: project.data.url,
    })),
    ...docs.map((doc) => ({
      title: doc.data.title,
      pubDate: new Date(),
      description: doc.data.description,
      link: `${context.site}/docs#${doc.data.order}`,
    })),
  ];

  return rss({
    title: 'Wyatt Au — Backend Engineer & Systems Architect',
    description:
      'Building deterministic infrastructure and high-performance systems. Currently bootstrapping QuestHive.',
    site: context.site ?? context.url.origin,
    items,
    customData: '<language>en-gb</language>',
  });
}
