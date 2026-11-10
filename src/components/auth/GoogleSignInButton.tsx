import React, { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { API_BASE } from '../../services/api.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (err: string) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onSuccess, onError }) => {
  const { loginWithGoogle } = useAuth();
  const { t, direction } = useI18n();

  const [isLoading, setIsLoading] = useState(false);
  const [clientId, setClientId] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [guidanceNotice, setGuidanceNotice] = useState<string | null>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchGoogleConfig() {
      try {
        const res = await fetch(`${API_BASE}/auth/google/config`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.success) {
            setClientId(data.clientId || '');
            setIsConfigured(Boolean(data.configured && data.clientId));
          }
        }
      } catch (err) {
        console.warn('[GoogleSignInButton] Failed to fetch Google auth config:', err);
      }
    }

    fetchGoogleConfig();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isConfigured || !clientId) return;

    // Load Google Identity Services script if not already in document
    const existingScript = document.getElementById('google-gsi-client');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogleGsi();
      document.body.appendChild(script);
    } else if (window.google?.accounts?.id) {
      initGoogleGsi();
    }

    function initGoogleGsi() {
      if (!window.google?.accounts?.id || !clientId) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'filled_black',
            size: 'large',
            shape: 'rectangular',
            width: 380,
            text: 'continue_with',
            logo_alignment: 'left'
          });
        }
      } catch (e) {
        console.warn('[GoogleSignInButton] GIS initialize error:', e);
      }
    }
  }, [isConfigured, clientId]);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      const msg = 'Google authentication response was empty.';
      if (onError) onError(msg);
      return;
    }

    setIsLoading(true);
    setGuidanceNotice(null);

    const res = await loginWithGoogle(response.credential);
    setIsLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      const msg = res.error || 'Failed to authenticate with Google.';
      if (onError) onError(msg);
    }
  };

  const handleManualGoogleClick = () => {
    if (isConfigured && clientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (e) {
        console.warn('[GoogleSignInButton] Prompt error:', e);
      }
      return;
    }

    // Helpful guidance when GOOGLE_CLIENT_ID is not configured in env
    setGuidanceNotice(
      direction === 'rtl'
        ? 'برای فعال‌کردن ورود با گوگل، مقدار GOOGLE_CLIENT_ID را در فایل .env یا تنظیمات محیطی سرور قرار دهید. تا آن زمان می‌توانید با ایمیل و رمز عبور وارد شوید.'
        : 'Google OAuth requires GOOGLE_CLIENT_ID in your environment variables (.env). Please configure it to enable live Google Sign-In, or use standard email/password authentication.'
    );
  };

  return (
    <div className="w-full space-y-2">
      {/* Official Google Button Render Container (Hidden when customized button matches) */}
      <div 
        ref={googleBtnContainerRef} 
        className={isConfigured ? 'flex justify-center my-1' : 'hidden'} 
      />

      {/* Styled Branded Button (Active when GIS button isn't rendered or as fallback) */}
      {(!isConfigured || isLoading) && (
        <button
          type="button"
          onClick={handleManualGoogleClick}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-700/80 hover:border-neutral-600 text-neutral-200 hover:text-white rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
              <span>{direction === 'rtl' ? 'در حال اتصال به حساب گوگل…' : 'Connecting with Google...'}</span>
            </>
          ) : (
            <>
              {/* Google SVG Icon */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{direction === 'rtl' ? 'ورود با حساب گوگل' : 'Continue with Google'}</span>
            </>
          )}
        </button>
      )}

      {/* Configuration Guidance Callout */}
      {guidanceNotice && (
        <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-start gap-2.5 text-xs text-neutral-400 animate-fadeIn">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            {guidanceNotice}
          </div>
        </div>
      )}
    </div>
  );
};
