import { useEffect, useState } from "react";
import { WebContainer } from "@webcontainer/api";

let webContainerInstance: WebContainer | null = null;

export function useWebContainer() {
  const [webcontainer, setWebcontainer] = useState<WebContainer>();

  useEffect(() => {
    const main = async () => {
      if (!webContainerInstance) {
        webContainerInstance = await WebContainer.boot();
      }
      setWebcontainer(webContainerInstance);
    };

    main();
  }, []);

  return webcontainer;
}
