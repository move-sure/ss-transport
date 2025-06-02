'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Shield, 
  BarChart3, 
  Phone, 
  Mail, 
  ChevronRight,
  Star,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  LogIn,
  UserPlus,
  Zap,
  Brain,
  Cpu,
  Database,
  Globe,
  TrendingUp,
  Users,
  Award,
  Sparkles,
  MousePointer
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleNavClick = () => {
    setIsMenuOpen(false);
  };

  const navigateToLogin = () => {
    router.push('/login');
  };

  const navigateToRegister = () => {
    router.push('/register');
  };

  const services = [
    {
      icon: <Brain className="w-12 h-12 text-indigo-400" />,
      title: "AI Fleet Intelligence",
      description: "Neural network-powered fleet optimization with predictive maintenance and autonomous decision making.",
      gradient: "from-indigo-500/10 to-purple-500/10"
    },
    {
      icon: <Cpu className="w-12 h-12 text-cyan-400" />,
      title: "Smart Route Computing",
      description: "Quantum-inspired algorithms for real-time route optimization across multi-dimensional transport networks.",
      gradient: "from-cyan-500/10 to-blue-500/10"
    },
    {
      icon: <Database className="w-12 h-12 text-emerald-400" />,
      title: "Predictive Analytics",
      description: "Advanced machine learning models that forecast demand, optimize capacity, and prevent disruptions.",
      gradient: "from-emerald-500/10 to-teal-500/10"
    },
    {
      icon: <Shield className="w-12 h-12 text-violet-400" />,
      title: "Neural Security",
      description: "AI-powered threat detection and autonomous security protocols for comprehensive cargo protection.",
      gradient: "from-violet-500/10 to-purple-500/10"
    }
  ];

  const features = [
    "Real-time AI decision engine",
    "Predictive maintenance alerts",
    "Autonomous route planning",
    "Neural network monitoring",
    "Quantum-inspired optimization",
    "Machine learning insights"
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      company: "FutureTech Logistics",
      rating: 5,
      text: "The AI capabilities are revolutionary. Our efficiency increased by 40% within the first month of deployment."
    },
    {
      name: "Marcus Rodriguez",
      company: "NextGen Transport",
      rating: 5,
      text: "The predictive analytics saved us millions in potential losses. This is the future of logistics."
    },
    {
      name: "Elena Kowalski",
      company: "Quantum Delivery Systems",
      rating: 5,
      text: "Seamless integration with our existing systems. The AI learns and adapts incredibly fast."
    }
  ];

  const stats = [
    { value: "99.7%", label: "AI Accuracy", icon: <Brain className="w-6 h-6" /> },
    { value: "47%", label: "Cost Reduction", icon: <TrendingUp className="w-6 h-6" /> },
    { value: "250ms", label: "Response Time", icon: <Zap className="w-6 h-6" /> },
    { value: "500K+", label: "AI Decisions/Day", icon: <Cpu className="w-6 h-6" /> }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950"></div>
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99, 102, 241, 0.1), transparent 40%)`
          }}
        ></div>
        
        {/* Neural Network Animation */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-cyan-400 rounded-full animate-ping"></div>
          <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
          <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-violet-400 rounded-full animate-ping"></div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center group">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Truck className="w-8 h-8 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                  <div className="absolute inset-0 bg-indigo-400/20 rounded-full animate-pulse"></div>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                  Movesure.ai
                </span>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:block">
              <div className="flex items-center space-x-8">
                <a href="#services" className="text-slate-300 hover:text-indigo-400 transition-colors duration-300 font-medium">
                  Solutions
                </a>
                <a href="#features" className="text-slate-300 hover:text-indigo-400 transition-colors duration-300 font-medium">
                  AI Features
                </a>
                <a href="#testimonials" className="text-slate-300 hover:text-indigo-400 transition-colors duration-300 font-medium">
                  Testimonials
                </a>
                <a href="#contact" className="text-slate-300 hover:text-indigo-400 transition-colors duration-300 font-medium">
                  Contact
                </a>
                
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={navigateToLogin}
                    className="text-slate-300 hover:text-white transition-colors duration-300 flex items-center gap-2 font-medium"
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </button>
                  <button 
                    onClick={navigateToRegister}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                  >
                    <UserPlus className="w-4 h-4" />
                    Get Started
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-slate-300 hover:text-indigo-400 transition-colors"
                aria-label="Toggle mobile menu"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/50">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a href="#services" onClick={handleNavClick} className="block px-3 py-2 text-slate-300 hover:text-indigo-400 transition-colors">Solutions</a>
              <a href="#features" onClick={handleNavClick} className="block px-3 py-2 text-slate-300 hover:text-indigo-400 transition-colors">AI Features</a>
              <a href="#testimonials" onClick={handleNavClick} className="block px-3 py-2 text-slate-300 hover:text-indigo-400 transition-colors">Testimonials</a>
              <a href="#contact" onClick={handleNavClick} className="block px-3 py-2 text-slate-300 hover:text-indigo-400 transition-colors">Contact</a>
              
              <div className="pt-4 space-y-2">
                <button 
                  onClick={() => { navigateToLogin(); setIsMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
                <button 
                  onClick={() => { navigateToRegister(); setIsMenuOpen(false); }}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-2 rounded-lg transition-colors mt-2 flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-5xl mx-auto">
            {/* AI Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-full px-6 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-indigo-300">Powered by Advanced AI Neural Networks</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-white via-indigo-200 to-cyan-200 bg-clip-text text-transparent">
                Next-Gen AI
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Transportation
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed max-w-4xl mx-auto">
              Revolutionize your logistics with quantum-inspired AI algorithms, 
              neural network optimization, and autonomous decision-making systems.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <button 
                onClick={navigateToRegister}
                className="group bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40"
              >
                <span className="flex items-center justify-center gap-3">
                  Start AI Journey
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <button className="border-2 border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 backdrop-blur-sm">
                <span className="flex items-center justify-center gap-3">
                  <MousePointer className="w-5 h-5" />
                  Interactive Demo
                </span>
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-indigo-500/30 transition-all duration-300">
                    <div className="flex justify-center mb-3 text-indigo-400 group-hover:text-indigo-300 transition-colors">
                      {stat.icon}
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-slate-400 text-sm">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="relative py-32 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-full px-6 py-2 mb-6">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-indigo-300">AI-Powered Solutions</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Intelligent Solutions
              </span>
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Experience the future of transportation with our cutting-edge AI technology 
              that learns, adapts, and optimizes in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <div key={index} className="group relative">
                <div className={`bg-gradient-to-br ${service.gradient} backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 hover:border-indigo-500/30 transition-all duration-500 transform hover:-translate-y-2`}>
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 group-hover:border-indigo-500/30 transition-all duration-300">
                        {service.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-4">{service.title}</h3>
                      <p className="text-slate-300 leading-relaxed mb-6">{service.description}</p>
                      <button className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-2 group-hover:gap-3 transition-all duration-300">
                        Explore AI Capabilities
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 rounded-full px-6 py-2 mb-6">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-300">Neural Network Features</span>
              </div>
              
              <h2 className="text-5xl md:text-6xl font-bold mb-8">
                <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Advanced AI
                </span>
                <br />
                <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                  Capabilities
                </span>
              </h2>
              
              <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                Our neural networks continuously learn from millions of data points, 
                making intelligent decisions that evolve with your business needs.
              </p>
              
              <div className="space-y-4 mb-10">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-4 group">
                    <div className="flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                    </div>
                    <span className="text-slate-300 text-lg group-hover:text-white transition-colors">{feature}</span>
                  </div>
                ))}
              </div>

              <button className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40">
                <span className="flex items-center gap-3">
                  <Brain className="w-5 h-5" />
                  Explore AI Engine
                </span>
              </button>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
                {/* AI Dashboard Mockup */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm p-6 rounded-2xl border border-indigo-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-white font-semibold flex items-center gap-2">
                        <Brain className="w-5 h-5 text-indigo-400" />
                        AI Neural Dashboard
                      </span>
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-100"></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-200"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Neural Processing</span>
                        <span className="text-emerald-400 font-bold">97.3%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">AI Decisions/Min</span>
                        <span className="text-cyan-400 font-bold">12,847</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Learning Rate</span>
                        <span className="text-indigo-400 font-bold">+24.6%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 backdrop-blur-sm p-6 rounded-2xl border border-cyan-500/20">
                    <div className="flex items-center space-x-3 mb-4">
                      <Zap className="w-5 h-5 text-cyan-400" />
                      <span className="text-white font-semibold">Quantum Optimization</span>
                    </div>
                    <div className="text-slate-300 text-sm">
                      AI has optimized 1,247 routes today, reducing costs by $89,000 
                      and improving delivery times by 34 minutes on average.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative py-32 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-full px-6 py-2 mb-6">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">Client Success Stories</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Trusted by Leaders
              </span>
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Join industry pioneers who are transforming their operations with our AI technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="group">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 hover:border-indigo-500/30 transition-all duration-500 h-full">
                  <div className="flex items-center mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-300 mb-8 italic leading-relaxed">&quot;{testimonial.text}&quot;</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-slate-400 text-sm">{testimonial.company}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative py-32 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-sm border border-indigo-500/20 rounded-3xl p-12">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Ready to Transform?
                </span>
              </h2>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                Join the AI revolution in transportation. Lets build the future together.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="flex items-center space-x-4 group">
                  <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-4 rounded-2xl border border-indigo-500/20 group-hover:border-indigo-400/40 transition-all duration-300">
                    <Phone className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">AI Support Line</div>
                    <div className="text-slate-300">+1 (555) 123-4567</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 group">
                  <div className="bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 p-4 rounded-2xl border border-cyan-500/20 group-hover:border-cyan-400/40 transition-all duration-300">
                    <Mail className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">Neural Network Team</div>
                    <div className="text-slate-300">ai@movesure.ai</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 group">
                  <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 p-4 rounded-2xl border border-emerald-500/20 group-hover:border-emerald-400/40 transition-all duration-300">
                    <Globe className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">Global AI Center</div>
                    <div className="text-slate-300">123 Neural Network Hub<br />Tech Valley, CA 94000</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50">
                <form className="space-y-6">
                  <div>
                    <input
                      type="text"
                      placeholder="Your Name"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Your Email"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Company Name"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                  <div>
                    <textarea
                      placeholder="Tell us about your AI transformation needs..."
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 resize-none"
                    ></textarea>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Start AI Consultation
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-20 z-10 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative">
                  <Truck className="w-10 h-10 text-indigo-400" />
                  <div className="absolute inset-0 bg-indigo-400/20 rounded-full animate-pulse"></div>
                </div>
                <span className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                  Movesure.ai
                </span>
              </div>
              <p className="text-slate-400 mb-8 max-w-md leading-relaxed">
                Pioneering the future of transportation with advanced AI neural networks, 
                quantum-inspired algorithms, and autonomous decision-making systems.
              </p>
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-full px-4 py-2">
                  <span className="text-sm font-medium text-indigo-300">AI-Powered Since 2024</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">AI Solutions</h3>
              <ul className="space-y-3 text-slate-400">
                <li><a href="#" className="hover:text-indigo-400 transition-colors duration-300">Neural Fleet Management</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors duration-300">Quantum Route Optimization</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors duration-300">Predictive Analytics</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors duration-300">AI Security Systems</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">Company</h3>
              <ul className="space-y-3 text-slate-400">
                <li><a href="#" className="hover:text-indigo-400 transition-colors duration-300">About AI Team</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors duration-300">Research & Development</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors duration-300">AI Ethics</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors duration-300">Neural Network Blog</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800/50 mt-16 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-slate-400 mb-4 md:mb-0">
                <p>&copy; 2025 Movesure.ai. All rights reserved. Powered by Neural Networks.</p>
              </div>
              <div className="flex items-center gap-6">
                <a href="#" className="text-slate-400 hover:text-indigo-400 transition-colors duration-300 text-sm">Privacy Policy</a>
                <a href="#" className="text-slate-400 hover:text-indigo-400 transition-colors duration-300 text-sm">AI Terms</a>
                <a href="#" className="text-slate-400 hover:text-indigo-400 transition-colors duration-300 text-sm">Neural Ethics</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating AI Assistant */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white p-4 rounded-full shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 group">
          <Brain className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
            <div className="bg-slate-800 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap">
              AI Assistant
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}