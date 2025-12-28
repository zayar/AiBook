'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  Zap,
  Shield,
  TrendingUp,
  BarChart3,
  Brain,
  Clock,
  Globe,
  Users,
  Star,
  ChevronRight,
  Sparkles,
  DollarSign,
  PieChart,
  Target,
  MessageCircle,
  Play
} from 'lucide-react';

const MarketingLandingPage = () => {
  const [email, setEmail] = useState('');

  const handleGetStarted = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle email submission
    console.log('Email submitted:', email);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AiBook
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#benefits" className="text-gray-600 hover:text-gray-900 transition-colors">Benefits</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">Testimonials</a>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
                Sign In
              </button>
              <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">AI-Powered Financial Intelligence</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Bookkeeping That
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Works For You</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Transform your financial management with AI-first bookkeeping. Automate transactions, gain instant insights, and make smarter business decisions.
              </p>
              <form onSubmit={handleGetStarted} className="flex gap-3 mb-6">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-6 py-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  required
                />
                <button
                  type="submit"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Free 14-day trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>No credit card required</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-8 border-white">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-white/80 text-sm">Monthly Revenue</span>
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">$124,500</div>
                    <div className="text-green-400 text-sm">+23.5% from last month</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <DollarSign className="w-6 h-6 text-white mb-2" />
                      <div className="text-white text-lg font-semibold">$45.2K</div>
                      <div className="text-white/70 text-xs">Net Profit</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <BarChart3 className="w-6 h-6 text-white mb-2" />
                      <div className="text-white text-lg font-semibold">98.5%</div>
                      <div className="text-white/70 text-xs">Accuracy</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full blur-3xl opacity-50"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-3xl opacity-50"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-gray-600 mb-8">Trusted by innovative companies worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
            {['Company A', 'Company B', 'Company C', 'Company D', 'Company E'].map((company, i) => (
              <div key={i} className="text-2xl font-bold text-gray-400">{company}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Powerful Features</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Everything you need to manage finances
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Streamline your bookkeeping with cutting-edge AI technology and intuitive tools
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: 'AI-Powered Categorization',
                description: 'Automatically categorize transactions with 98%+ accuracy using advanced machine learning',
                color: 'blue'
              },
              {
                icon: Zap,
                title: 'Real-Time Insights',
                description: 'Get instant financial insights and actionable recommendations as your business grows',
                color: 'purple'
              },
              {
                icon: Shield,
                title: 'Bank-Level Security',
                description: 'Your data is protected with enterprise-grade encryption and multi-factor authentication',
                color: 'green'
              },
              {
                icon: Globe,
                title: 'Multi-Currency Support',
                description: 'Handle transactions in 150+ currencies with automatic conversion and exchange rates',
                color: 'orange'
              },
              {
                icon: BarChart3,
                title: 'Smart Reporting',
                description: 'Generate comprehensive financial reports with one click and share with stakeholders',
                color: 'pink'
              },
              {
                icon: Clock,
                title: 'Automated Workflows',
                description: 'Save hours every week with intelligent automation of repetitive accounting tasks',
                color: 'indigo'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-white"
              >
                <div className={`w-12 h-12 bg-gradient-to-br from-${feature.color}-500 to-${feature.color}-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section with Image */}
      <section id="benefits" className="py-24 px-6 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
                <Target className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">Why Choose AiBook</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Built for modern businesses
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Experience the future of bookkeeping with intelligent automation and real-time financial intelligence.
              </p>
              
              <div className="space-y-6">
                {[
                  {
                    icon: TrendingUp,
                    title: 'Increase Efficiency by 10x',
                    description: 'Automate 90% of manual bookkeeping tasks and focus on growing your business'
                  },
                  {
                    icon: Brain,
                    title: 'AI-Powered Intelligence',
                    description: 'Get predictive insights and smart recommendations powered by advanced AI'
                  },
                  {
                    icon: Users,
                    title: 'Seamless Collaboration',
                    description: 'Work together with your team and accountant in real-time from anywhere'
                  }
                ].map((benefit, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <benefit.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <div className="aspect-square bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-12">
                  <div className="bg-white/95 rounded-xl p-6 mb-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-600">Financial Health Score</span>
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-4xl font-bold text-gray-900">92</div>
                      <div className="text-green-600 text-sm font-medium">Excellent</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/95 rounded-xl p-4 shadow-lg">
                      <PieChart className="w-8 h-8 text-blue-600 mb-2" />
                      <div className="text-2xl font-bold text-gray-900">$156K</div>
                      <div className="text-sm text-gray-600">Annual Revenue</div>
                    </div>
                    <div className="bg-white/95 rounded-xl p-4 shadow-lg">
                      <Target className="w-8 h-8 text-purple-600 mb-2" />
                      <div className="text-2xl font-bold text-gray-900">24%</div>
                      <div className="text-sm text-gray-600">Profit Margin</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Get started in minutes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simple setup, powerful results. Start automating your bookkeeping today.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Connect Your Accounts',
                description: 'Securely link your bank accounts and financial data sources in seconds',
                icon: Globe
              },
              {
                step: '02',
                title: 'AI Does the Work',
                description: 'Our AI automatically categorizes transactions and reconciles accounts',
                icon: Brain
              },
              {
                step: '03',
                title: 'Get Insights',
                description: 'Receive real-time financial insights and make data-driven decisions',
                icon: TrendingUp
              }
            ].map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
                    <step.icon className="w-10 h-10 text-white" />
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">{step.step}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-10 left-full w-full">
                    <ChevronRight className="w-6 h-6 text-gray-300 mx-auto" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Loved by thousands of businesses
            </h2>
            <p className="text-xl text-gray-600">
              See what our customers have to say
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Sarah Johnson',
                role: 'CEO, TechStart Inc',
                content: 'AiBook transformed our financial management. We save 20+ hours every week on bookkeeping tasks.',
                avatar: 'SJ'
              },
              {
                name: 'Michael Chen',
                role: 'Founder, GrowthCo',
                content: 'The AI insights are incredible. We make better financial decisions and our margins have improved by 15%.',
                avatar: 'MC'
              },
              {
                name: 'Emily Rodriguez',
                role: 'CFO, ScaleUp',
                content: 'Best investment we made. The automation is seamless and the accuracy is better than our previous accountant.',
                avatar: 'ER'
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">{testimonial.content}</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that's right for your business
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '29',
                description: 'Perfect for freelancers and small businesses',
                features: [
                  'Up to 100 transactions/month',
                  'AI transaction categorization',
                  'Basic reports',
                  'Email support',
                  '1 user'
                ]
              },
              {
                name: 'Professional',
                price: '79',
                description: 'For growing businesses',
                features: [
                  'Up to 1,000 transactions/month',
                  'Advanced AI insights',
                  'Custom reports',
                  'Priority support',
                  '5 users',
                  'Multi-currency support'
                ],
                popular: true
              },
              {
                name: 'Enterprise',
                price: '199',
                description: 'For large organizations',
                features: [
                  'Unlimited transactions',
                  'Full AI suite',
                  'Custom integrations',
                  'Dedicated support',
                  'Unlimited users',
                  'Advanced security'
                ]
              }
            ].map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl scale-105'
                    : 'bg-white border-2 border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-yellow-400 text-gray-900 text-sm font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm ${plan.popular ? 'text-blue-100' : 'text-gray-600'}`}>
                    {plan.description}
                  </p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                      ${plan.price}
                    </span>
                    <span className={`${plan.popular ? 'text-blue-100' : 'text-gray-600'}`}>/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.popular ? 'text-green-300' : 'text-green-600'}`} />
                      <span className={plan.popular ? 'text-blue-50' : 'text-gray-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
                    plan.popular
                      ? 'bg-white text-blue-600 hover:bg-blue-50'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to transform your bookkeeping?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of businesses already using AiBook to automate their finances
          </p>
          <form onSubmit={handleGetStarted} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
              required
            />
            <button
              type="submit"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
          <p className="text-blue-100 text-sm mt-4">14-day free trial • No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">AiBook</span>
              </div>
              <p className="text-sm">AI-powered bookkeeping for modern businesses.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Licenses</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; 2024 AiBook. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Floating Chat Button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center group">
        <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
};

export default MarketingLandingPage;
