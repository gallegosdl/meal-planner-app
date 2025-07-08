// client/src/components/Header.jsx
import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';
import { getHeaderStyles } from '../utils/styleUtils';

const Header = ({ user, handleLogout }) => {
  const { themeMode } = useTheme();
  
  // Theme-aware logo selection
  const logoSrc = themeMode === 'dark' 
    ? '/images/NutriIQ-dark-preferred.png'
    : '/images/NutriIQ-light-preferred.png';

  // Generate theme-aware styles
  const containerStyles = getHeaderStyles(themeMode, 'container');
  const mobileStyles = getHeaderStyles(themeMode, 'mobile');
  const desktopStyles = getHeaderStyles(themeMode, 'desktop');
  const logoContainerMobileStyles = getHeaderStyles(themeMode, 'logo_container_mobile');
  const logoContainerDesktopStyles = getHeaderStyles(themeMode, 'logo_container_desktop');
  const logoImageStyles = getHeaderStyles(themeMode, 'logo_image');
  const titleMobileStyles = getHeaderStyles(themeMode, 'title_mobile');
  const titleDesktopStyles = getHeaderStyles(themeMode, 'title_desktop');
  const titleNutriStyles = getHeaderStyles(themeMode, 'title_nutri');
  const titleIqStyles = getHeaderStyles(themeMode, 'title_iq');
  const subtitleMobileStyles = getHeaderStyles(themeMode, 'subtitle_mobile');
  const subtitleDesktopStyles = getHeaderStyles(themeMode, 'subtitle_desktop');
  const logoutButtonStyles = getHeaderStyles(themeMode, 'logout_button');
  const logoutButtonDesktopStyles = getHeaderStyles(themeMode, 'logout_button_desktop');
  
  // User info styles
  const userLabelStyles = getHeaderStyles(themeMode, 'user_label');
  const userNameStyles = getHeaderStyles(themeMode, 'user_name');
  const avatarFallbackStyles = getHeaderStyles(themeMode, 'avatar_fallback');
  const iconColorStyles = getHeaderStyles(themeMode, 'icon_color');
  const iconHoverStyles = getHeaderStyles(themeMode, 'icon_hover');

  return (
    <div className={containerStyles}>
      {/* Mobile Header */}
      <div className={mobileStyles}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={logoContainerMobileStyles}>
              <img 
                src={logoSrc}
                alt="Nutri IQ Logo" 
                className={logoImageStyles}
              />
            </div>
            <div>
              <h1 className={titleMobileStyles}>
                <span className={titleNutriStyles}>Nutri </span>
                <span className={titleIqStyles}>IQ</span>
              </h1>
              <p className={subtitleMobileStyles}>Personalized nutrition planning</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" variant="switch" />
            {user && (
              <button
                onClick={handleLogout}
                className={logoutButtonStyles}
                title={`Logout ${user.name}`}
              >
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.name}
                    className="w-4 h-4 rounded-full object-cover"
                    onError={(e) => {
                      // If image fails to load, show default SVG
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                ) : (
                  <div className={`w-4 h-4 ${avatarFallbackStyles}`}>
                    <span className="text-xs">?</span>
                  </div>
                )}
                <svg 
                  className={`w-4 h-4 ${iconColorStyles} ${user.avatar_url ? 'hidden' : ''}`} 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                  style={{ display: user.avatar_url ? 'none' : 'block' }}
                >
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <svg 
                  className={`w-4 h-4 ${iconHoverStyles}`} 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className={desktopStyles}>
        <div className="flex items-center gap-4">
          <div className={logoContainerDesktopStyles}>
            <img 
              src={logoSrc}
              alt="Nutri IQ Logo" 
              className={logoImageStyles}
            />
          </div>
          <div>
            <h1 className={titleDesktopStyles}>
              <span className={titleNutriStyles}>Nutri </span>
              <span className={titleIqStyles}>IQ</span>
            </h1>
            <p className={subtitleDesktopStyles}>Personalized nutrition planning</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle size="md" variant="switch" />
          {user && (
            <button
              onClick={handleLogout}
              className={logoutButtonDesktopStyles}
            >
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.name}
                  className="w-5 h-5 rounded-full object-cover"
                  onError={(e) => {
                    // If image fails to load, show default SVG
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : (
                <div className={`w-5 h-5 ${avatarFallbackStyles}`}>
                  <span className="text-xs">?</span>
                </div>
              )}
              <svg 
                className={`w-5 h-5 ${iconColorStyles} ${user.avatar_url ? 'hidden' : ''}`} 
                viewBox="0 0 20 20" 
                fill="currentColor"
                style={{ display: user.avatar_url ? 'none' : 'block' }}
              >
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <div className="flex flex-col items-start">
                <span className={userLabelStyles}>Logged in as</span>
                <span className={userNameStyles}>{user.name}</span>
              </div>
              <svg 
                className={`w-4 h-4 ${iconHoverStyles} ml-2`} 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header; 