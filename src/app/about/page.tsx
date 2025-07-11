
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersRound, Sparkles, ClipboardEdit, ListChecks, KeyRound, Edit, BarChart3, ShieldCheck, Video, BrainCircuit, Lightbulb, Code2 } from 'lucide-react';

export default function AboutPage() {
  const features = [
    {
      icon: <UsersRound className="h-8 w-8 text-primary" />,
      title: 'Secure User Authentication',
      description: 'Effortless and secure sign-up and login portals for both Exam Setters and Takers, ensuring a personalized and protected environment for managing and taking assessments.',
    },
    {
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      title: 'AI-Powered Question Generation',
      description: 'Revolutionize exam creation! Setters can paste a syllabus or topic outline, and our intelligent AI, powered by Gemini, analyzes the content to suggest relevant and diverse exam questions.',
    },
    {
      icon: <ClipboardEdit className="h-8 w-8 text-primary" />,
      title: 'Comprehensive Exam Creation',
      description: 'Design detailed exams with ease. Define titles, descriptions, question types (Multiple Choice, Short Answer, Essay), points per question, passcodes, duration, and even schedule opening times.',
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: 'Granular Access Control',
      description: 'Manage who can take your exams. Optionally, specify a list of allowed taker email addresses to ensure only designated individuals can access a particular assessment.',
    },
    {
      icon: <ListChecks className="h-8 w-8 text-primary" />,
      title: 'Dynamic Exam Listing for Takers',
      description: 'Takers see a clear, personalized list of available exams. Exams only appear if they are open, not yet submitted by the taker, and if the taker is on the allowed list.',
    },
    {
      icon: <KeyRound className="h-8 w-8 text-primary" />,
      title: 'Passcode-Protected Exam Access',
      description: 'Secure each exam with a unique passcode. Takers must enter the correct passcode to begin their assessment, adding an essential layer of security.',
    },
    {
      icon: <Edit className="h-8 w-8 text-primary" />,
      title: 'Intuitive Exam-Taking Interface',
      description: 'A clean, distraction-free interface that allows takers to focus. Features include easy navigation, progress tracking, a countdown timer, and an immersive fullscreen mode.',
    },
     {
      icon: <Video className="h-8 w-8 text-primary" />,
      title: 'Live Jitsi Proctoring',
      description: 'Enhance exam integrity with live video proctoring. Setters can start a Jitsi meeting for any exam, allowing them to manually monitor takers in real-time during the assessment.',
    },
    {
      icon: <BrainCircuit className="h-8 w-8 text-primary" />,
      title: 'AI-Assisted Evaluation',
      description: 'Leverage the power of Gemini to auto-evaluate submissions. Get quick, consistent scoring and feedback, with the ability for setters to manually review and override results for full control.',
    },
    {
      icon: <Lightbulb className="h-8 w-8 text-primary" />,
      title: 'AI Practice Question Generator',
      description: 'Empower students to prepare effectively. Takers can paste their syllabus or notes to generate mock questions, helping them practice and master the material before an exam.',
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      title: 'Taker Performance Analytics',
      description: 'Students can track their progress with a dedicated performance dashboard, visualizing their scores, average performance, and best results across all completed exams.',
    },
  ];

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <header className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary mb-4">
          About AssessMint
        </h1>
        <p className="text-lg sm:text-xl text-foreground max-w-4xl mx-auto">
          AssessMint is a modern, AI-enhanced platform designed to streamline the entire examination process. Powered by <span className="font-semibold text-primary">Gemini AI</span>, it empowers educators and students to create, manage, take, and evaluate exams with unprecedented ease and intelligence.
        </p>
      </header>

      <section className="space-y-10">
        {features.map((feature, index) => (
          <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-4">
                {feature.icon}
                <CardTitle className="text-2xl font-headline text-primary">{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base text-muted-foreground leading-relaxed">
                {feature.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>

      <footer className="text-center mt-16 py-8 border-t">
        <Code2 className="h-10 w-10 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">
          Developed by <span className="font-semibold text-primary">Sohan Karfa</span>.
        </p>
        <p className="text-muted-foreground mt-2">
          Thank you for choosing AssessMint. We're committed to improving and innovating the assessment experience.
        </p>
      </footer>
    </div>
  );
}
