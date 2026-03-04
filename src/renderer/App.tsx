import { useEffect, useState } from 'react';
import Setup from './pages/Setup';

export function App() {
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    window.api.getSetupComplete().then((complete) => {
      setSetupComplete(complete);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!setupComplete) {
    return <Setup onComplete={() => setSetupComplete(true)} />;
  }

  return <div className="p-4 text-lg font-semibold">Wall Paprika Preferences</div>;
}
