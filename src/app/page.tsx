
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Edit3, UserCheck, Bot, ShieldCheck, FileText, CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-background">
      <header className="mb-8">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-bold text-primary mb-4">
          Welcome to AssessMint
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-foreground max-w-2xl mx-auto">
          The modern platform for creating, managing, and taking exams with AI-powered assistance.
        </p>
      </header>

      <div className="mb-12 rounded-lg overflow-hidden shadow-2xl">
        <Image
          src="https://sw0u7owaczjz29lf.public.blob.vercel-storage.com/Gemini_Generated_Image_k1wslck1wslck1ws.png"
          alt="AI-powered exam platform hero image"
          width={800}
          height={450}
          className="object-cover"
          priority
        />
      </div>

      <section className="grid md:grid-cols-2 gap-8 max-w-4xl w-full mb-12">
        <div className="bg-card p-6 md:p-8 rounded-lg shadow-lg flex flex-col items-center">
          <Edit3 className="w-12 h-12 md:w-16 md:h-16 text-primary mb-4" />
          <h2 className="text-2xl md:text-3xl font-headline font-semibold text-primary mb-3">For Exam Setters</h2>
          <p className="text-sm md:text-base text-muted-foreground mb-6">
            Craft comprehensive exams, leverage AI for question generation, and securely manage your assessments.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base">
            <Link href="/setter-sign-in">
              Setter Portal <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Link>
          </Button>
        </div>

        <div className="bg-card p-6 md:p-8 rounded-lg shadow-lg flex flex-col items-center">
          <UserCheck className="w-12 h-12 md:w-16 md:h-16 text-accent mb-4" />
          <h2 className="text-2xl md:text-3xl font-headline font-semibold text-accent mb-3">For Exam Takers</h2>
          <p className="text-sm md:text-base text-muted-foreground mb-6">
            Access exams with ease, experience a smooth test-taking interface, and focus on demonstrating your knowledge.
          </p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-sm md:text-base">
            <Link href="/taker-sign-in">
              Taker Portal <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="max-w-4xl w-full">
        <h3 className="text-2xl md:text-3xl font-headline font-semibold text-primary mb-6 text-center">Key Features</h3>
        <div className="grid md:grid-cols-2 gap-6 text-left">
          {[
            { icon: <Bot className="h-8 w-8 text-primary" />, title: "AI Question Generation", description: "Paste your syllabus and let our AI suggest relevant exam questions." },
            { icon: <ShieldCheck className="h-8 w-8 text-primary" />, title: "Secure Exam Creation", description: "Set passcodes and manage exam access with robust security features." },
            { icon: <FileText className="h-8 w-8 text-primary" />, title: "Intuitive Exam Interface", description: "A clean, focused environment for exam takers to perform their best." },
            { icon: <CheckCircle className="h-8 w-8 text-primary" />, title: "Flexible Question Types", description: "Support for multiple choice, short answer, and essay questions." }
          ].map((feature, index) => (
            <div key={index} className="bg-card p-6 rounded-lg shadow-md flex items-start gap-4">
              <div className="shrink-0">
                {feature.icon}
              </div>
              <div>
                <h4 className="text-lg font-headline font-medium text-primary mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
