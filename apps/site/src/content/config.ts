import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    technologies: z.array(z.string()),
    url: z.string().url(),
    featured: z.boolean().default(false),
    order: z.number().default(0),
  }),
});

const expertise = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    icon: z.string(),
    description: z.string(),
    order: z.number().default(0),
  }),
});

const timeline = defineCollection({
  type: 'content',
  schema: z.object({
    role: z.string(),
    company: z.string(),
    duration: z.string(),
    type: z.enum(['employment', 'education']),
    order: z.number().default(0),
  }),
});

export const collections = { projects, expertise, timeline };
