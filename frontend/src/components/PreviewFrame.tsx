import { WebContainer } from '@webcontainer/api';
import { useEffect, useState, useRef } from 'react';

interface PreviewFrameProps {
  files: any[];
  webContainer: WebContainer;
}

export function PreviewFrame({ webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitializedRef = useRef(false); // ✅ Guard flag

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);

        // Prevent re-initialization
        if (!webContainer || hasInitializedRef.current) return;

        hasInitializedRef.current = true; // ✅ Set init flag

        // Install dependencies
        const installProcess = await webContainer.spawn('npm', ['install']);
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log('[install]', data);
            },
          })
        );
        await installProcess.exit;

        // Start dev server
        const devProcess = await webContainer.spawn('npm', ['run', 'dev']);
        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log('[dev]', data);
            },
          })
        );

        // Wait for server to be ready
        const url = await new Promise<string>((resolve) => {
          webContainer.on('server-ready', (_port, url) => {
            resolve(url);
          });
        });

        setUrl(url);
      } catch (err) {
        console.error('❌ Failed to launch preview:', err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [webContainer]);

  return (
    <div className="h-full w-full flex items-center justify-center bg-gray-950 rounded-xl shadow-inner">
      {isLoading || !url ? (
        <div className="text-center animate-pulse">
          <p className="text-lg text-purple-300 mb-2"> Loading...</p>
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="w-full h-full rounded-lg overflow-hidden shadow-md border border-gray-700">
          <iframe
            src={url}
            className="w-full h-full rounded-lg"
            frameBorder="0"
            title="Preview"
          />
        </div>
      )}
    </div>
  );
}
