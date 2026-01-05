import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Shield,
  Terminal,
  Globe,
  Gauge,
  Lock,
  Accessibility,
  ArrowRight,
  Zap,
  FileText,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EthicalUsePanel } from '@/components/EthicalUsePanel';

const features = [
  {
    icon: Terminal,
    title: 'Console Error Detection',
    description: 'Capture uncaught exceptions, promise rejections, and console errors with full stack traces',
  },
  {
    icon: Globe,
    title: 'Network Analysis',
    description: 'Identify failed API calls, 4xx/5xx responses, timeouts, and CORS issues',
  },
  {
    icon: Gauge,
    title: 'Performance Metrics',
    description: 'TTFB, large bundle detection, slow endpoints, and load timing analysis',
  },
  {
    icon: Lock,
    title: 'Security Hygiene',
    description: 'HTTPS validation, security headers (CSP, HSTS), and cookie flag verification',
  },
  {
    icon: Accessibility,
    title: 'Accessibility Checks',
    description: 'Automated axe-core scans for WCAG violations and accessibility issues',
  },
  {
    icon: Shield,
    title: 'UI Flow Testing',
    description: 'Safe navigation testing, broken page detection, and error state discovery',
  },
];

const howItWorks = [
  {
    step: 1,
    title: 'Paste Your URL',
    description: 'Enter the URL of your staging, UAT, or development environment',
  },
  {
    step: 2,
    title: 'Secure Login',
    description: 'Complete login in an isolated browser window — we never see your credentials',
  },
  {
    step: 3,
    title: 'Automated Audit',
    description: 'Our engine crawls your app, running 50+ technical checks in real-time',
  },
  {
    step: 4,
    title: 'Download Report',
    description: 'Get a detailed PDF report with scores, findings, and fix recommendations',
  },
];

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            {/* ✅ Use PNG logo from /public instead of Shield icon */}
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src="/Audivue-logo.png"
                alt="Audivue logo"
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>
            <span className="font-semibold text-lg text-foreground">Audivue</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/audit">
              <Button>
                Start Audit
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        style={{ opacity, scale }}
        className="relative pt-32 pb-24 overflow-hidden"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge variant="outline" className="mb-6 border-primary/30 text-primary">
              <Zap className="w-3 h-3 mr-1" />
              Technical Readiness Auditor
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
              Is Your App
              <span className="gradient-text block mt-2">Production Ready?</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
              Automated technical auditing for web applications. Detect console errors,
              API failures, performance issues, and security gaps before your users do.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/audit">
                <Button size="lg" className="w-full sm:w-auto glow-primary">
                  <Play className="w-4 h-4 mr-2" />
                  Start Free Audit
                </Button>
              </Link>
              <Link to="/reports">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <FileText className="w-4 h-4 mr-2" />
                  View Sample Report
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto"
          >
            {[
              { label: 'Checks Performed', value: '50+' },
              { label: 'Categories Analyzed', value: '6' },
              { label: 'Audit Time', value: '<5 min' },
              { label: 'Report Format', value: 'PDF' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-lg glass">
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Comprehensive Technical Checks
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Six categories of automated analysis to ensure your application is ready for production
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="glass h-full hover:border-primary/30 transition-colors">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Get from URL to production readiness report in under 5 minutes
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {howItWorks.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex gap-4"
                >
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary-foreground">{step.step}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-1">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ethical Use Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <EthicalUsePanel />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <Card className="glass border-primary/20 max-w-4xl mx-auto">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Audit Your App?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                Get a comprehensive technical readiness report in minutes.
                No signup required for your first audit.
              </p>
              <Link to="/audit">
                <Button size="lg" className="glow-primary">
                  <Shield className="w-5 h-5 mr-2" />
                  Start Your Free Audit
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* ✅ Use PNG logo from /public instead of Shield icon */}
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src="/Audivue-logo.png"
                  alt="Audivue logo"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              </div>
              <span className="font-semibold text-foreground">Audivue</span>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Technical readiness auditing for web applications.
              Non-destructive, ethical, and secure.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
