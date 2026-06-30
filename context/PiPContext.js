import React, { createContext, useState, useContext, useCallback } from 'react';

const PiPContext = createContext(null);

let pipRef = null;

export const usePiP = () => {
  const ctx = useContext(PiPContext);
  return ctx;
};

export const activatePiP = (url, title, videoState) => {
  if (pipRef) {
    pipRef.activate(url, title, videoState);
  }
};

export const deactivatePiP = () => {
  if (pipRef) {
    pipRef.deactivate();
  }
};

export const isPiPActive = (url) => {
  if (pipRef) {
    return pipRef.isActive(url);
  }
  return false;
};

export const PiPProvider = ({ children }) => {
  const [pipUrl, setPipUrl] = useState(null);
  const [pipTitle, setPipTitle] = useState(null);
  const [pipVideoState, setPipVideoState] = useState(null);

  const activate = useCallback((url, title, videoState) => {
    setPipUrl(url);
    setPipTitle(title || '');
    setPipVideoState(videoState || null);
  }, []);

  const deactivate = useCallback(() => {
    setPipUrl(null);
    setPipTitle(null);
    setPipVideoState(null);
  }, []);

  const isActive = useCallback((url) => {
    if (!url || !pipUrl) return false;
    return url === pipUrl;
  }, [pipUrl]);

  pipRef = { activate, deactivate, isActive };

  return (
    <PiPContext.Provider value={{ pipUrl, pipTitle, pipVideoState, activate, deactivate, isActive }}>
      {children}
    </PiPContext.Provider>
  );
};
