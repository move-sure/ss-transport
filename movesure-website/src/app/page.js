'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, 
  MapPin, 
  Shield, 
  BarChart3, 
  Phone, 
  Mail, 
  Menu,
  X,
  LogIn,
  UserPlus,
  CheckCircle,
  ArrowRight,
  Star,
  Clock
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigateToLogin = () => {
    router.push('/login');
    setIsMenuOpen(false);
  };

  const navigateToRegister = () => {
    router.push('/register');
    setIsMenuOpen(false);
  };

  const services = [
    {
      icon: <Truck className="w-8 h-8 text-blue-600" />,
      title: "Bilty Management",
      description: "Complete digital bilty creation and tracking system"
    },
    {
      icon: <MapPin className="w-8 h-8 text-green-600" />,
      title: "Route Tracking",
      description: "Real-time vehicle and cargo tracking solutions"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-purple-600" />,
      title: "Analytics & Reports",
      description: "Detailed insights and business analytics"
    },
    {
      icon: <Shield className="w-8 h-8 text-orange-600" />,
      title: "Secure Operations",
      description: "Bank-level security for all your data"
    }
  ];

  const features = [
    "Complete Bilty Management",
    "Real-time Tracking",
    "Digital Documentation",
    "GST Compliance",
    "Multi-branch Support",
    "Mobile App Access"
  ];

  const testimonials = [
    {
      name: "Rajesh Kumar",
      company: "ABC Transport Co.",
      rating: 5,
      text: "Movesure ne hamare business ko completely transform kar diya. Bahut easy aur efficient hai."
    },
    {
      name: "Priya Sharma",
      company: "Delhi Logistics",
      rating: 5,
      text: "Best transport management system in India. Customer support bhi excellent hai."
    },
    {
      name: "Amit Singh",
      company: "Punjab Carriers",
      rating: 5,
      text: "GST compliance aur billing ka kaam bahut easy ho gaya hai. Highly recommend!"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100' 
          : 'bg-white/80 backdrop-blur-sm'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Truck className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Movesure</span>
              <span className="text-sm text-blue-600 font-medium">.io</span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Services
              </a>
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Features
              </a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Reviews
              </a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Contact
              </a>
              
              <div className="flex items-center space-x-3">
                <button 
                  onClick={navigateToLogin}
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
                <button 
                  onClick={navigateToRegister}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Get Started
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-3 space-y-3">
              <a href="#services" onClick={() => setIsMenuOpen(false)} className="block py-2 text-gray-700 hover:text-blue-600 transition-colors">Services</a>
              <a href="#features" onClick={() => setIsMenuOpen(false)} className="block py-2 text-gray-700 hover:text-blue-600 transition-colors">Features</a>
              <a href="#testimonials" onClick={() => setIsMenuOpen(false)} className="block py-2 text-gray-700 hover:text-blue-600 transition-colors">Reviews</a>
              <a href="#contact" onClick={() => setIsMenuOpen(false)} className="block py-2 text-gray-700 hover:text-blue-600 transition-colors">Contact</a>
              
              <div className="pt-3 space-y-2 border-t border-gray-100">
                <button 
                  onClick={navigateToLogin}
                  className="w-full text-left py-2 text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
                <button 
                  onClick={navigateToRegister}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center gap-2 justify-center"
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
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium inline-block mb-6">
            🚛 Indias #1 Transport Management System
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Transport Business को<br />
            <span className="text-blue-600">Digital</span> बनाएं
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Complete bilty management, real-time tracking, and digital documentation 
            in one simple platform. Made for Indian transport businesses.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button 
              onClick={navigateToRegister}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors flex items-center justify-center gap-3"
            >
              Free Trial शुरू करें
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="border-2 border-gray-300 hover:border-blue-600 text-gray-700 hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-medium transition-all">
              Demo देखें
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">500+</div>
              <div className="text-gray-600 text-sm">Transport Companies</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">1M+</div>
              <div className="text-gray-600 text-sm">Bilties Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">50+</div>
              <div className="text-gray-600 text-sm">Cities Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">4.9★</div>
              <div className="text-gray-600 text-sm">Customer Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage your transport business efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-3 bg-gray-50 rounded-lg">
                    {service.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.title}</h3>
                    <p className="text-gray-600">{service.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Choose Movesure?
              </h2>
              
              <p className="text-xl text-gray-600 mb-8">
                Designed specifically for Indian transport businesses with local compliance and easy-to-use interface.
              </p>
              
              <div className="space-y-4 mb-8">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={navigateToRegister}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Start Free Trial
              </button>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-900 font-semibold">Todays Summary</span>
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Bilties</span>
                    <span className="font-semibold text-gray-900">247</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue</span>
                    <span className="font-semibold text-green-600">₹2,45,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Vehicles</span>
                    <span className="font-semibold text-blue-600">45</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Customer Reviews
            </h2>
            <p className="text-xl text-gray-600">
              See what our customers say about us
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">{testimonial.text}</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-gray-600 text-sm">{testimonial.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-blue-600 rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join 500+ transport companies already using Movesure
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button 
                onClick={navigateToRegister}
                className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Start Free Trial
              </button>
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +91 98765 43210
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  hello@movesure.io
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <Truck className="w-8 h-8 text-blue-500" />
                <span className="text-2xl font-bold">Movesure.io</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Indias leading transport management system. Simplifying logistics 
                for businesses across the country.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mobile App</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 mb-4 md:mb-0">
              <p>&copy; 2025 Movesure.io. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}