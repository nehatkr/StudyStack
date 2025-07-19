import React from 'react';
import { Heart, Github, Twitter, Mail, BookOpen, Users, Shield, HelpCircle, Star, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    platform: [
      { name: 'Browse Resources', href: '#' },
      { name: 'Upload Content', href: '#' },
      { name: 'Categories', href: '#' },
      { name: 'Popular Downloads', href: '#' },
    ],
    community: [
      { name: 'Contributors', href: '#' },
      { name: 'Study Groups', href: '#' },
      { name: 'Forums', href: '#' },
      { name: 'Events', href: '#' },
    ],
    support: [
      { name: 'Help Center', href: '#' },
      { name: 'Contact Us', href: '#' },
      { name: 'Report Issue', href: '#' },
      { name: 'Feedback', href: '#' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '#' },
      { name: 'Terms of Service', href: '#' },
      { name: 'Copyright Policy', href: '#' },
      { name: 'Community Guidelines', href: '#' },
    ],
  };

  const socialLinks = [
    { name: 'GitHub', icon: Github, href: '#' },
    { name: 'Twitter', icon: Twitter, href: '#' },
    { name: 'Email', icon: Mail, href: 'mailto:hello@studystack.com' },
  ];

  return (
    <footer className="mt-16 bg-primary-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-4">
              <img 
                src="/ChatGPT Image Jul 15, 2025, 12_10_35 PM.png" 
                alt="StudyStack Logo" 
                className="w-10 h-10 rounded-lg object-cover"
              />
              <span className="ml-3 text-xl font-bold text-white">
                StudyStack
              </span>
            </div>
            <p className="text-sm text-white/80 mb-6 leading-relaxed">
              Empowering students through collaborative learning and resource sharing. 
              Build your knowledge stack with quality educational materials.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    aria-label={social.name}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              Platform
            </h3>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Community
            </h3>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
              <HelpCircle className="h-4 w-4 mr-2" />
              Support
            </h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Legal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-12 pt-8 border-t border-white/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                25K+
              </div>
              <div className="text-sm text-white/70">
                Resources Shared
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                12K+
              </div>
              <div className="text-sm text-white/70">
                Active Students
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                150+
              </div>
              <div className="text-sm text-white/70">
                Universities
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                500K+
              </div>
              <div className="text-sm text-white/70">
                Downloads
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center text-sm text-white/70 mb-4 md:mb-0">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-400 mx-1 fill-current" />
              <span>for students, by students</span>
            </div>
            <div className="text-sm text-white/70">
              © {currentYear} StudyStack. All rights reserved.
            </div>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/60 max-w-2xl mx-auto leading-relaxed">
            StudyStack is committed to democratizing education by providing a platform where students 
            and educators can freely share and access quality educational resources. Together, we're building a 
            collaborative learning ecosystem that empowers academic success.
          </p>
        </div>
      </div>
    </footer>
  );
};