"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Menu, X, Crown, Globe, ChevronDown } from 'lucide-react';
import { Button } from '@/components/landing/ui/Button';
import { useLanguage, languageNames, Language } from '@/context/landing/LanguageContext';
import { useRouter } from 'next/navigation';


export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false)
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { label: t('nav.home'), href: '#hero' },
    { label: t('nav.features'), href: '#problem' },
    { label: t('nav.map'), href: '#concept' },
    { label: t('nav.story'), href: '#story' },
    
  ]

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300 ${
          isScrolled ? 'bg-parchment/95 backdrop-blur-sm shadow-md' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            onClick={() => scrollToSection('#hero')}
          >
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-svarajya-blue to-svarajya-blue/80 flex items-center justify-center shadow-md">
              <Crown className="w-5 h-5 text-mudra-gold" />
            </div>
            <span className="font-serif text-xl font-semibold text-fort-stone">
              <span className="text-mudra-gold">S</span>varajya
            </span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.href)}
                className="relative text-fort-stone/70 hover:text-fort-stone text-sm font-medium transition-colors group"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-mudra-gold transition-all group-hover:w-full" />
              </button>
            ))}
          </div>

          {/* Language Switcher + CTA */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-parchment-dark/20 hover:border-mudra-gold/30 transition-colors"
              >
                <Globe className="w-4 h-4 text-fort-stone/60" />
                <span className="text-sm font-medium text-fort-stone">
                  {language.toUpperCase()}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-fort-stone/60 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {isLangMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute top-full right-0 mt-2 py-2 bg-card-white rounded-xl shadow-xl border border-parchment-dark/20 min-w-[140px]"
                  >
                    {(Object.keys(languageNames) as Language[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLanguage(lang)
                          setIsLangMenuOpen(false)
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-parchment transition-colors ${
                          language === lang ? 'text-mudra-gold font-medium' : 'text-fort-stone'
                        }`}
                      >
                        {languageNames[lang]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button variant="gold" size="sm" onClick={() => router.push('/start')}>
              {t('nav.login')}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-fort-stone"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <motion.div
        initial={false}
        animate={
          isMobileMenuOpen
            ? { opacity: 1, pointerEvents: 'auto' as const }
            : { opacity: 0, pointerEvents: 'none' as const }
        }
        className="fixed inset-0 z-40 bg-fort-stone/60 backdrop-blur-sm md:hidden"
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Menu Panel */}
      <motion.div
        initial={false}
        animate={isMobileMenuOpen ? { x: 0 } : { x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 bottom-0 w-72 z-50 bg-parchment shadow-2xl md:hidden"
      >
        <div className="p-6 pt-20">
          {/* Language Selector Mobile */}
          <div className="flex gap-2 mb-6">
            {(Object.keys(languageNames) as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  language === lang
                    ? 'bg-svarajya-blue text-white'
                    : 'bg-card-white text-fort-stone'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.href)}
                className="block w-full text-left px-4 py-3 rounded-xl text-fort-stone hover:bg-card-white transition-colors"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-4 border-t border-parchment-dark/30">
              <Button variant="gold" className="w-full" onClick={() => router.push('/start')}>
                {t('nav.login')}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

