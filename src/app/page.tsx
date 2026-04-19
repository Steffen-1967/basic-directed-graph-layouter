'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { auth, db } from "@/lib/firebase";
import Link from 'next/link';
import { 
  Library, 
  UserRound, 
  CalendarDays, 
  Users,
  BookOpen,
  FilePlus
} from 'lucide-react';

export default function Home() {
  const [firebaseStatus, setFirebaseStatus] = useState<"connecting" | "connected" | "error">("connecting");

  useEffect(() => {
    if (auth && db) {
      setFirebaseStatus("connected");
    } else {
      setFirebaseStatus("error");
    }
  }, []);

  const welcomeModules = [
    {
      id: 'Documentation',
      title: 'Documentation',
      description: 'Was ist My Life?',
      icon: <BookOpen size={48} />,
      href: '#',
      onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('toggle-help', { detail: { helpId: 'welcome' } }));
      }
    },
    {
      id: 'UseCases',
      title: 'UseCases',
      description: 'Der TaskLibrary neue UseCases oder Scenarien hinzufügen',
      icon: <FilePlus size={48} />,
      href: '/usecases' // Changed from '#'
    },

    {
      id: 'PersonalData',
      title: 'PersonalData',
      description: 'Verwalten Sie Ihre persönlichen Informationen',
      icon: <UserRound size={48} />,
      href: '#'
    },
    {
      id: 'TaskLibrary',
      title: 'TaskLibrary',
      description: 'Prozessvisualisierung und Aufgabenverwaltung',
      icon: <Library size={48} />,
      href: '/tasklibrary'
    },
    {
      id: 'TimeManagement',
      title: 'TimeManagement',
      description: 'Planung und Zeiterfassung',
      icon: <CalendarDays size={48} />,
      href: '#'
    },
    {
      id: 'Relationships',
      title: 'Relationships',
      description: 'Netzwerke und Kontakte pflegen',
      icon: <Users size={48} />,
      href: '#'
    }
  ];

  const handleModuleClick = (e: React.MouseEvent, module: any) => {
    if (module.onClick) {
      module.onClick(e);
      return;
    }
    if (module.href === '#') {
      e.preventDefault();
      alert('Diese Ansicht ist noch in Arbeit.');
    }
  };

  return (
    <div className="welcome-view">
      <h1>Willkommen bei My Life</h1>
      <div className="welcome-grid">
        {welcomeModules.map((module) => (
          <Link 
            key={module.id} 
            href={module.href}
            className="welcome-card"
            onClick={(e) => handleModuleClick(e, module)}
          >
            <div className="card-icon">{module.icon}</div>
            <div className="card-text">
                <h3>{module.title}</h3>
                <p>{module.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="status-frame">
        <div className="flex items-center justify-center gap-3">
          <div className={`status-orb ${
            firebaseStatus === "connected" ? "status-orb-connected" : 
            firebaseStatus === "connecting" ? "status-orb-connecting" : "status-orb-error"
          }`} />
          <span className="font-medium text-zinc-600 dark:text-zinc-400">
            Firebase Status: {firebaseStatus.charAt(0).toUpperCase() + firebaseStatus.slice(1)}
          </span>
        </div>
        {firebaseStatus === "connected" && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" style={{ margin: 0 }}>
            Connected to project: <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-xs text-zinc-500">{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</code>
          </p>
        )}
      </div>
    </div>
  );
}
