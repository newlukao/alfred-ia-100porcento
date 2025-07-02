import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  touchEnabled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}

export const useDevice = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1024,
    height: 768,
    orientation: 'landscape',
    touchEnabled: false,
    isIOS: false,
    isAndroid: false
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const orientation = width > height ? 'landscape' : 'portrait';
      const touchEnabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && typeof (window as any).MSStream === "undefined";
      const isAndroid = /android/i.test(userAgent);

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        width,
        height,
        orientation,
        touchEnabled,
        isIOS,
        isAndroid
      });
    };

    // Initial check
    updateDeviceInfo();

    // Listen for resize events
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}; 