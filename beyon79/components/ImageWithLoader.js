import React, { useEffect, useState } from 'react';

export default function ImageWithLoader({
  src,
  alt = '',
  className = '', // container classes
  imgClassName = '',
  style = {},
  imgStyle = {},
  color = '#ea580c',
  showSpinner = true,
  onLoadingChange,
  loadingAttr = 'lazy',
  spinnerOffsetY = '0%',
}) {
  const normalizeSrcList = (s) => Array.isArray(s) ? s.filter(Boolean) : (s ? [s] : []);
  const [srcList, setSrcList] = useState(normalizeSrcList(src));
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(srcList.length > 0);

  // Stabilize changes using a signature so passing inline arrays won't constantly reset state
  const srcSig = normalizeSrcList(src).join('||');
  useEffect(() => {
    const list = normalizeSrcList(src);
    setSrcList(list);
    setIndex(0);
    const next = list.length > 0;
    setLoading(next);
    if (typeof onLoadingChange === 'function') onLoadingChange(next);
  }, [onLoadingChange, src, srcSig]);

  if (!srcList.length) {
    return null;
  }

  return (
    <div className={`relative ${className}`} style={style}>
      {showSpinner && loading && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `translateY(${spinnerOffsetY})` }}>
          <div className="lds-ring lds-ring--sm" style={{ color }}>
            <div></div><div></div><div></div><div></div>
          </div>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={srcList[index]}
        alt={alt}
        className={imgClassName}
        loading={loadingAttr}
        decoding="async"
        onLoad={() => { setLoading(false); if (onLoadingChange) onLoadingChange(false); }}
        onError={() => {
          if (index + 1 < srcList.length) {
            setIndex(index + 1);
            setLoading(true);
            if (onLoadingChange) onLoadingChange(true);
          } else {
            setLoading(false);
            if (onLoadingChange) onLoadingChange(false);
          }
        }}
        style={{ opacity: loading ? 0 : 1, transition: 'opacity .2s ease', ...imgStyle }}
      />
    </div>
  );
}
