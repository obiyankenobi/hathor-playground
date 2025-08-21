import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from './ThemeContext';

const ThemeDropdown: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = (themeType: string) => {
    switch (themeType) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      default:
        return '🌙';
    }
  };

  const getThemeLabel = (themeType: string) => {
    switch (themeType) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      default:
        return 'Dark';
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="theme-dropdown" ref={dropdownRef}>
      <button
        className="theme-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Theme selector"
      >
        <span className="theme-icon">{getThemeIcon(theme)}</span>
        <span className="theme-label">{getThemeLabel(theme)}</span>
        <span className="dropdown-arrow">▼</span>
      </button>
      
      {isOpen && (
        <div className="theme-dropdown-menu">
          <button
            className={`theme-option ${theme === 'light' ? 'active' : ''}`}
            onClick={() => handleThemeChange('light')}
          >
            <span className="theme-icon">☀️</span>
            <span>Light</span>
          </button>
          <button
            className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => handleThemeChange('dark')}
          >
            <span className="theme-icon">🌙</span>
            <span>Dark</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ThemeDropdown;