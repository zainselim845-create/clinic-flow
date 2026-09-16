import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Reusable Code & DNS snippet box with built-in 1-click copy to clipboard.
 * 
 * @param {string} code - The code string to display and copy
 * @param {string} label - Optional title/tag (e.g. 'CNAME Record', 'API Token')
 * @param {string} language - Language badge text
 */
export const CodeSnippet = ({
  code = '',
  label = '',
  language = 'bash'
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      className="code-snippet-box"
      style={{
        borderRadius: '12px',
        backgroundColor: '#0F172A',
        color: '#E2E8F0',
        border: '1px solid #1E293B',
        overflow: 'hidden',
        margin: '8px 0',
        direction: 'ltr',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
      }}
    >
      {(label || language) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: '#1E293B',
            borderBottom: '1px solid #334155',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#94A3B8'
          }}
        >
          <span>{label || language}</span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="نسخ الكود إلى الحافظة"
            title="نسخ"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: copied ? '#059669' : '#334155',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
          </button>
        </div>
      )}

      <div style={{ position: 'relative', padding: '12px' }}>
        {!label && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label="نسخ الكود"
            title="نسخ"
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: copied ? '#059669' : '#334155',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
          </button>
        )}
        <pre style={{ margin: 0, overflowX: 'auto', fontSize: '0.8rem', lineHeight: '1.5' }}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export default CodeSnippet;
