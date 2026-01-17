import { source } from '@/app/source';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import type { ReactNode } from 'react';
import Image from 'next/image';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <div className="flex items-center gap-2 ml-2">
            <Image src="/void-dex-logo.svg" alt="VoidDex" width={24} height={24} />
            <span>VoidDex</span>
          </div>
        ),
      }}
      sidebar={{
        defaultOpenLevel: 0,
      }}
      githubUrl="https://github.com/pzzaworks/void-dex"
    >
      {children}
    </DocsLayout>
  );
}
