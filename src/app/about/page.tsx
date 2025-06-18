
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, KeyRound, ClipboardEdit, Sparkles, ListChecks, Edit, BarChart3, ShieldCheck, CalendarClock, UsersRound, BookOpenCheck, Info } from 'lucide-react';

export default function AboutPage() {
  const features = [
    {
      icon: <UsersRound className="h-8 w-8 text-primary" />,
      title: 'Secure Setter Authentication',
      description: 'Exam setters can effortlessly sign up and log in to their dedicated portal. This ensures that all exam creation tools, management dashboards, and evaluation interfaces are accessed securely, protecting sensitive exam data.',
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: 'Streamlined Taker Authentication',
      description: 'Exam takers benefit from a simple and secure sign-up and login process. This provides a personalized environment for accessing assigned exams and viewing their performance history.',
    },
    {
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      title: 'AI-Powered Question Generation',
      description: 'Revolutionize exam preparation! Setters can paste a syllabus or topic outline, and our intelligent AI analyzes the content to suggest relevant, diverse, and high-quality exam questions across various formats, saving valuable time.',
    },
    {
      icon: <ClipboardEdit className="h-8 w-8 text-primary" />,
      title: 'Comprehensive Exam Creation',
      description: 'Design detailed exams with ease. Setters can define titles, descriptions, question types (Multiple Choice, Short Answer, Essay), points per question, and add correct answers or model solutions. Features include setting passcodes for secure access, defining exam duration, and scheduling exam opening times.',
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: 'Granular Exam Access Control',
      description: 'Manage who can take your exams. Optionally, setters can specify a list of allowed taker email addresses, ensuring only designated individuals can access a particular exam, even with the passcode.',
    },
    {
      icon: <ListChecks className="h-8 w-8 text-primary" />,
      title: 'Dynamic Exam Listing for Takers',
      description: 'Takers see a clear, personalized list of available exams. Exams only appear if they are open, not yet submitted by the taker, and if the taker is on the allowed list (if specified by the setter).',
    },
    {
      icon: <KeyRound className="h-8 w-8 text-primary" />,
      title: 'Passcode-Protected Exam Access',
      description: 'Each exam can be secured with a unique passcode set by the exam creator. Takers must enter the correct passcode to begin their assessment, adding a layer of security.',
    },
    {
      icon: <Edit className="h-8 w-8 text-primary" />,
      title: 'Intuitive Exam-Taking Interface',
      description: 'Our clean, distraction-free interface allows takers to focus on their knowledge. Features include easy navigation, progress tracking, a countdown timer (if set), and a proctored environment that auto-submits if fullscreen is exited or tabs are switched.',
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      title: 'AI-Assisted Evaluation',
      description: 'Setters can leverage AI to auto-evaluate submissions for certain question types, offering quick, consistent feedback and scoring. Manual review and overrides are always possible, giving full control to the setter.',
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: 'Proctoring (Coming Soon)',
      description: 'Enhance exam integrity with our upcoming AI-powered proctoring features. Monitor exam sessions for unusual activity and gain greater confidence in assessment results.',
    },
  ];

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <header className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary mb-4">
          About AssessMint
        </h1>
        <p className="text-lg sm:text-xl text-foreground max-w-3xl mx-auto">
          AssessMint is a modern, AI-enhanced platform designed to streamline the entire examination process for educators and students alike. Discover how our features empower you to create, manage, take, and evaluate exams with unprecedented ease and intelligence.
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
        <BookOpenCheck className="h-10 w-10 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">
          Thank you for choosing AssessMint. We're committed to continuously improving and adding features to serve your assessment needs.
        </p>
      </footer>
    </div>
  );
}
