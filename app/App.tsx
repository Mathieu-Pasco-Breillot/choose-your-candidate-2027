import { motion } from 'motion/react';

/**
 * Page provisoire : l'interface réelle arrive au lot 5e (calcul au lot 5c, tirage des questions au lot 5d).
 */
export function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm tracking-wide text-sourdine uppercase">Présidentielle 2027</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold">Mon Isoloir</h1>
        <p className="mt-6 text-lg leading-relaxed">
          Le comparateur de la présidentielle 2027 est en construction. Il confrontera vos opinions aux positions publiques des candidats,
          chaque position étant adossée à une source vérifiable.
        </p>
        <p className="mt-4 text-sourdine">
          Tout le calcul se fera dans votre navigateur : aucune de vos réponses ne quittera votre appareil.
        </p>
      </motion.div>
    </main>
  );
}
