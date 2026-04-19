'use client';

import React from 'react';

export default function UseCasesPage() {
  return (
    <div className="welcome-view">
      <h1>UseCases & Szenarien</h1>
      <p style={{ color: '#868e96', fontSize: '1.1rem', maxWidth: '600px', textAlign: 'center' }}>
        Hier können Sie der TaskLibrary neue UseCases oder Szenarien hinzufügen. 
        Dieser Bereich befindet sich aktuell noch im Aufbau.
      </p>
      
      <div style={{ 
        marginTop: '40px', 
        padding: '30px', 
        border: '2px dashed #dee2e6', 
        borderRadius: '16px',
        color: '#adb5bd'
      }}>
        [ Ansicht für UseCase-Management kommt in Kürze ]
      </div>
    </div>
  );
}
