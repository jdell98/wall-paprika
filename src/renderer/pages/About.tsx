import { useEffect, useState } from 'react';

export default function About() {
  const [version, setVersion] = useState('');

  useEffect(() => {
    window.api.getAppVersion().then(setVersion);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <h1 className="mb-1 text-xl font-bold text-gray-900">Wall Paprika</h1>
      <p className="mb-4 text-xs text-gray-400">v{version}</p>
      <p className="mb-6 max-w-sm text-sm text-gray-600">
        Open-source wallpaper rotator powered by Unsplash
      </p>
      <p className="mb-6 text-sm text-gray-500">
        Wall Paprika is open source — contributions welcome!
      </p>
      <div className="space-y-2 text-sm">
        <button
          onClick={() => window.open('https://github.com/jdell98/wall-paprika', '_blank')}
          className="block text-orange-600 hover:text-orange-700"
        >
          GitHub Repository
        </button>
        <p className="text-gray-500">
          Photos provided by{' '}
          <button
            onClick={() => window.open('https://unsplash.com', '_blank')}
            className="text-orange-600 hover:text-orange-700"
          >
            Unsplash
          </button>
        </p>
        <p className="text-xs text-gray-400">
          Inspired by{' '}
          <button
            onClick={() => window.open('https://irvue.tumblr.com', '_blank')}
            className="text-gray-500 hover:text-gray-600"
          >
            Irvue
          </button>
        </p>
      </div>
    </div>
  );
}
