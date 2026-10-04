import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './index.css';
import { appliquerApparence, lireApparence } from './reglages.ts';

// Apparence choisie (clair, sombre ou automatique), appliquée avant le premier rendu.
appliquerApparence(lireApparence());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Mise à jour du site : quand une nouvelle version prend le relais (service worker), la page se recharge une fois,
// pour qu'un visiteur de retour ou l'application installée n'affiche pas l'ancienne version. Pas de rechargement
// à la toute première visite. Une partie en cours est sauvegardée : elle se reprend depuis l'accueil.
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let recharge = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recharge) return;
    recharge = true;
    location.reload();
  });
}
