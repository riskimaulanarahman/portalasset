import { useEffect } from 'react';
import { useSettings } from './useSettings';

const useTitle = (title: string) => {
  const { getSetting } = useSettings();
  const appName = getSetting('app_name', 'Portal Asset');

  useEffect(() => {
    document.title = `${title} | ${appName}`;
  }, [title, appName]);
};

export default useTitle;
