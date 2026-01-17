import { source } from '@/app/source';
import { DocsPage, DocsBody, DocsDescription, DocsTitle } from 'fumadocs-ui/page';
import { notFound, redirect } from 'next/navigation';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Mermaid } from '@/components/mdx/mermaid';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;

  if (!slug || slug.length === 0) {
    redirect('/docs/what-is-voiddex');
  }

  const page = source.getPage(slug);
  if (!page) notFound();

  const pageData = page.data as Record<string, unknown>;
  const MDX = pageData.body as React.ComponentType<{ components: typeof defaultMdxComponents }>;

  return (
    <DocsPage
      toc={pageData.toc as { title: string; url: string; depth: number }[]}
      full={pageData.full as boolean}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents, Mermaid, Tab, Tabs } as typeof defaultMdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
