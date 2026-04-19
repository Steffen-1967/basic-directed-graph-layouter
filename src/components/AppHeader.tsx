'use client';

import { createIcons, icons } from 'lucide';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HelpCircle, 
  Grip,
  LayoutGrid, 
  Home, 
  Library, 
  UserRound, 
  CalendarDays, 
  Users, 
  X,
  BookOpen,
  FilePlus
} from 'lucide-react';
import { MarkdownEngine } from '@/markdown';
import Script from 'next/script';

export default function AppHeader() {
  const pathname = usePathname();
  const [isAppsMenuOpen, setIsAppsMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpContent, setHelpContent] = useState('Lade Hilfe...');

  const currentView = pathname === '/' ? 'Welcome' : 
                      pathname === '/tasklibrary' ? 'TaskLibrary' : 'App';

  const toggleAppsMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAppsMenuOpen(!isAppsMenuOpen);
  };

  const toggleHelp = async (forcedHelpId?: string) => {
    const nextState = !isHelpOpen;
    setIsHelpOpen(nextState);
    
    if (nextState) {
      try {
        // Use pathname or forcedHelpId to determine help file
        let helpId = forcedHelpId || (pathname === '/' ? 'welcome' : 
                       pathname === '/tasklibrary' ? 'tasklibrary' : 'generic');
        
        // Check if we specifically want tasklibrary help from Welcome page documentation card
        // (This is implicitly handled by determing help based on current active page)
        
        let response = await fetch(`/help/${helpId}.md`);
        if (!response.ok) response = await fetch('/help/generic.md');
        const text = await response.text();
        setHelpContent(MarkdownEngine.render(text));
        
        // Ensure icons and mermaid diagrams in markdown are rendered
        setTimeout(() => {
          createIcons({ icons });
          
          const mermaid = (window as any).mermaid;
          if (mermaid) {
            mermaid.run({
              nodes: document.querySelectorAll('.help-markdown-body .mermaid')
            }).catch((err: any) => console.error('Mermaid error:', err));
          }
        }, 100);
      } catch (error) {
        console.error('Failed to load help', error);
        setHelpContent('Fehler beim Laden der Hilfe.');
      }
    }
  };

  useEffect(() => {
    const closeMenus = () => setIsAppsMenuOpen(false);
    const handleToggleHelp = (e: any) => {
        const specificHelpId = e.detail?.helpId;
        // Use a timeout to ensure we don't have race conditions with React state
        setTimeout(() => toggleHelp(specificHelpId), 0);
    };
    
    window.addEventListener('click', closeMenus);
    window.addEventListener('toggle-help', handleToggleHelp);
    
    return () => {
        window.removeEventListener('click', closeMenus);
        window.removeEventListener('toggle-help', handleToggleHelp);
    };
  }, [isHelpOpen, pathname]); 

  return (
    <>
      <header id="app-header">
        <div className="header-left">
          <Link href="/" className="app-logo">My Life</Link>
        </div>
        
        <div id="view-header-injection" className="header-center">
          {/* View-specific title/controls will be injected via React Portal into header-portal-root */}
          <div id="header-portal-root" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
             <span style={{ fontWeight: 500, color: '#495057', marginLeft: '20px' }}>{currentView}</span>
          </div>
        </div>

        <div className="header-right">
          <button 
            className="header-icon-btn" 
            title="Hilfe"
            onClick={toggleHelp}
          >
            <HelpCircle size={20} />
          </button>

          <div className="apps-dropdown-container">
            <button 
              className="header-icon-btn" 
              title="Views"
              onClick={toggleAppsMenu}
            >
              <Grip size={20} />
            </button>

            {isAppsMenuOpen && (
              <div className="apps-menu" style={{ display: 'block' }}>
                <Link href="/" className={`apps-menu-item ${pathname === '/' ? 'active' : ''}`}>
                  <Home size={18} /> Welcome
                </Link>
                <div className="apps-menu-item" onClick={() => window.dispatchEvent(new CustomEvent('toggle-help', { detail: { helpId: 'welcome' } }))}>
                  <BookOpen size={18} /> Documentation
                </div>
                <Link href="/usecases" className="apps-menu-item">
                  <FilePlus size={18} /> UseCases
                </Link>
                <Link href="/tasklibrary" className={`apps-menu-item ${pathname === '/tasklibrary' ? 'active' : ''}`}>
                  <Library size={18} /> TaskLibrary
                </Link>
                <div className="apps-menu-item disabled" onClick={() => alert('Noch in Arbeit')}>
                  <UserRound size={18} /> PersonalData
                </div>
                <div className="apps-menu-item disabled" onClick={() => alert('Noch in Arbeit')}>
                  <CalendarDays size={18} /> TimeManagement
                </div>
                <div className="apps-menu-item disabled" onClick={() => alert('Noch in Arbeit')}>
                  <Users size={18} /> Relationships
                </div>
              </div>
            )}
          </div>

          <button className="header-account-btn" title="Konto">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Steffen" alt="Account" />
          </button>
        </div>
      </header>

      {isHelpOpen && (
        <div className="help-overlay" style={{ display: 'flex' }} onClick={() => setIsHelpOpen(false)}>
          <div className="help-content-box" onClick={(e) => e.stopPropagation()}>
            <button className="help-close-btn" onClick={() => setIsHelpOpen(false)}>
              <X size={20} />
            </button>
            <div 
              className="help-markdown-body" 
              dangerouslySetInnerHTML={{ __html: helpContent }}
            />
          </div>
        </div>
      )}

      <Script 
        src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          // @ts-ignore
          if (typeof mermaid !== 'undefined') {
            // @ts-ignore
            mermaid.initialize({ 
              startOnLoad: false,
              theme: 'default',
              securityLevel: 'loose',
              fontFamily: 'Segoe UI',
              flowchart: {
                htmlLabels: true,
                useMaxWidth: true
              }
            });
          }
        }}
      />
    </>
  );
}
