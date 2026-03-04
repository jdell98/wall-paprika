import { useEffect, useState } from 'react';
import Setup from './pages/Setup';
import Collections from './pages/Collections';

type Tab = 'collections' | 'settings' | 'api-key' | 'about';

const tabs: { id: Tab; label: string }[] = [
  { id: 'collections', label: 'Collections' },
  { id: 'settings', label: 'Settings' },
  { id: 'api-key', label: 'API Key' },
  { id: 'about', label: 'About' },
];

export function App() {
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('collections');

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

  return (
    <div className="flex h-screen flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'collections' && <Collections />}
        {activeTab === 'settings' && (
          <div className="p-4 text-sm text-gray-500">Settings — coming soon</div>
        )}
        {activeTab === 'api-key' && (
          <div className="p-4 text-sm text-gray-500">API Key management — coming soon</div>
        )}
        {activeTab === 'about' && (
          <div className="p-4 text-sm text-gray-500">About — coming soon</div>
        )}
      </div>
    </div>
  );
}
