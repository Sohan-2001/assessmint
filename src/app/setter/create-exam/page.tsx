
"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ExamCreationForm = dynamic(() => import('@/components/setter/ExamCreationForm').then(mod => mod.ExamCreationForm), {
  loading: () => (
    <div className="flex h-96 w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  ),
  ssr: false,
});


export default function CreateExamPage() {
  return (
    <div className="space-y-8">
      <ExamCreationForm />
    </div>
  );
}
