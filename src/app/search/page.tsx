'use client';

import { Suspense } from 'react';

import PageLayout from '@/components/PageLayout';
import SearchSection from '@/components/SearchSection';

export default function SearchPage() {
  return (
    <Suspense>
      <PageLayout activePath='/search'>
        <div className='px-4 sm:px-10 py-4 sm:py-8 overflow-visible mb-10'>
          <SearchSection />
        </div>
      </PageLayout>
    </Suspense>
  );
}
