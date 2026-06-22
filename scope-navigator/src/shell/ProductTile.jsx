import { useId } from 'react'

/* 32px product tile shared by both shells. Vibrant brand gradient when subscribed, a
   muted navy treatment when not — one glyph drives both states.

   Colors are CSS-var driven so the reseller-theme swap re-tints the tiles along with the
   rest of the chrome (see brandStyleVars in branding.jsx + the .shell-root defaults in
   shell.css). The defaults resolve to the original Figma blues exactly
   (--nav-accent #0068cb, --tile-edge #3EB3F0, midnight-1000/900/400), so the VIPRE theme
   is pixel-identical to the old baked-gradient SVG assets. */
export function ProductTile({ glyph, muted, size = 32 }) {
  const uid = useId().replace(/:/g, '')
  if (muted) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'block' }} aria-hidden="true">
        <rect width="32" height="32" rx="8" style={{ fill: 'var(--vds-midnight-900)' }} />
        <path d={glyph} style={{ fill: 'var(--vds-midnight-400)' }} />
      </svg>
    )
  }
  const bg = `ptbg-${uid}`, bd = `ptbd-${uid}`, gl = `ptgl-${uid}`
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'block' }} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={`url(#${bg})`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke={`url(#${bd})`} strokeOpacity="0.25" />
      <path d={glyph} fill={`url(#${gl})`} />
      <defs>
        <linearGradient id={bg} x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse"><stop style={{ stopColor: 'var(--nav-accent)' }} /><stop offset="1" style={{ stopColor: 'var(--vds-midnight-1000)' }} /></linearGradient>
        <linearGradient id={bd} x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse"><stop style={{ stopColor: 'var(--tile-edge)' }} /><stop offset="1" style={{ stopColor: 'var(--nav-accent)' }} /></linearGradient>
        <linearGradient id={gl} x1="16" y1="8" x2="16" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" /><stop offset="1" style={{ stopColor: 'var(--vds-midnight-400)' }} /></linearGradient>
      </defs>
    </svg>
  )
}

/* Section tiles (Overview, Customers): flat midnight-800 surface + a near-white glyph —
   distinct from the gradient product tiles. The background is tokenized so they re-tint
   with the reseller theme too (VIPRE = midnight-800 #152E51, unchanged). */
export function OverviewTile({ size = 32, className, style }) {
  return (
    <svg width={size} height={size} viewBox="1 0.5 32 32" fill="none" className={className} style={{ display: 'block', ...style }} aria-hidden="true">
      <path d="M1 8.5C1 4.08172 4.58172 0.5 9 0.5H25C29.4183 0.5 33 4.08172 33 8.5V24.5C33 28.9183 29.4183 32.5 25 32.5H9C4.58172 32.5 1 28.9183 1 24.5V8.5Z" style={{ fill: 'var(--nav-tile-bg, var(--vds-midnight-800))' }} />
      <path d="M15.55 22.7L20.725 16.5H16.725L17.45 10.825L12.825 17.5H16.3L15.55 22.7ZM13.577 25.9422L14.577 19H9.952L18.1922 7.10575H19.423L18.4327 15H23.9325L14.8077 25.9422H13.577Z" fill="#E3E3E3" />
    </svg>
  )
}
// `outline` renders the 4 panels as strokes instead of solid fills (used by the MSP shell).
export function DashboardTile({ size = 32, className, style, outline = false }) {
  const blockProps = outline
    ? { fill: 'none', stroke: '#E3E3E3', strokeWidth: 1.5 }
    : { fill: '#E3E3E3' }
  return (
    <svg width={size} height={size} viewBox="1 0.5 32 32" fill="none" className={className} style={{ display: 'block', ...style }} aria-hidden="true">
      <rect x="1" y="0.5" width="32" height="32" rx="8" style={{ fill: 'var(--nav-tile-bg, var(--vds-midnight-800))' }} />
      <rect x="9" y="8.5" width="6.5" height="9" rx="1.5" {...blockProps} />
      <rect x="18.5" y="8.5" width="6.5" height="5.5" rx="1.5" {...blockProps} />
      <rect x="9" y="19.5" width="6.5" height="5.5" rx="1.5" {...blockProps} />
      <rect x="18.5" y="16" width="6.5" height="9" rx="1.5" {...blockProps} />
    </svg>
  )
}
export function CustomersTile({ size = 32, className, style }) {
  return (
    <svg width={size} height={size} viewBox="1 0.5 32 32" fill="none" className={className} style={{ display: 'block', ...style }} aria-hidden="true">
      <rect x="1" y="0.5" width="32" height="32" rx="8" style={{ fill: 'var(--nav-tile-bg, var(--vds-midnight-800))' }} />
      <path d="M25.7653 15.473V23.4423C25.7653 23.9474 25.5903 24.375 25.2403 24.725C24.8903 25.075 24.4628 25.25 23.9578 25.25H10.073C9.568 25.25 9.1405 25.075 8.7905 24.725C8.4405 24.375 8.2655 23.9474 8.2655 23.4423V15.4538C7.86283 15.1231 7.56058 14.6939 7.35875 14.1663C7.15675 13.6388 7.15258 13.0692 7.34625 12.4578L8.35775 9.15375C8.49108 8.73325 8.71733 8.39417 9.0365 8.1365C9.35583 7.87883 9.73725 7.75 10.1808 7.75H23.8308C24.2744 7.75 24.6533 7.87308 24.9673 8.11925C25.2814 8.36542 25.5103 8.70392 25.6538 9.13475L26.6845 12.4578C26.8782 13.0692 26.874 13.6368 26.672 14.1605C26.4702 14.6843 26.1679 15.1218 25.7653 15.473ZM19.2155 14.75C19.7617 14.75 20.1723 14.583 20.4473 14.249C20.7223 13.915 20.8348 13.5563 20.7848 13.173L20.177 9.25H17.7653V13.2C17.7653 13.6205 17.9076 13.984 18.1923 14.2905C18.4769 14.5968 18.818 14.75 19.2155 14.75ZM14.7155 14.75C15.1757 14.75 15.549 14.5968 15.8355 14.2905C16.1222 13.984 16.2655 13.6205 16.2655 13.2V9.25H13.8538L13.2463 13.2115C13.1923 13.5667 13.3038 13.9119 13.5808 14.2473C13.8578 14.5824 14.236 14.75 14.7155 14.75ZM10.2655 14.75C10.636 14.75 10.9546 14.6208 11.2213 14.3625C11.4879 14.1042 11.6527 13.7795 11.7155 13.3885L12.3038 9.25H10.1808C10.0718 9.25 9.98525 9.274 9.92125 9.322C9.85708 9.37017 9.809 9.44233 9.777 9.5385L8.81525 12.7923C8.68325 13.2218 8.7455 13.6554 9.002 14.0932C9.25833 14.5311 9.6795 14.75 10.2655 14.75ZM23.7655 14.75C24.3065 14.75 24.7206 14.5375 25.0078 14.1125C25.2949 13.6875 25.3642 13.2474 25.2155 12.7923L24.2038 9.51925C24.1718 9.42308 24.1238 9.35417 24.0598 9.3125C23.9956 9.27083 23.909 9.25 23.8 9.25H21.727L22.3153 13.3885C22.3781 13.7795 22.5428 14.1042 22.8095 14.3625C23.0762 14.6208 23.3948 14.75 23.7655 14.75ZM10.073 23.75H23.9578C24.0474 23.75 24.1211 23.7212 24.1788 23.6635C24.2366 23.6058 24.2655 23.5321 24.2655 23.4423V16.1615C24.1565 16.2013 24.0654 16.226 23.9923 16.2355C23.9193 16.2452 23.8437 16.25 23.7655 16.25C23.3155 16.25 22.9197 16.1686 22.578 16.0058C22.2363 15.8429 21.9052 15.582 21.5845 15.223C21.3038 15.5358 20.9718 15.7853 20.5885 15.9713C20.2052 16.1571 19.768 16.25 19.277 16.25C18.8527 16.25 18.4527 16.1618 18.077 15.9855C17.7013 15.8093 17.3475 15.5552 17.0155 15.223C16.7065 15.5552 16.3565 15.8093 15.9655 15.9855C15.5743 16.1618 15.1782 16.25 14.777 16.25C14.3257 16.25 13.9026 16.1683 13.5078 16.0048C13.1129 15.8413 12.7655 15.5807 12.4655 15.223C12.0448 15.6435 11.6573 15.9198 11.3028 16.052C10.9484 16.184 10.6027 16.25 10.2655 16.25C10.1872 16.25 10.1063 16.2452 10.023 16.2355C9.93967 16.226 9.85375 16.2013 9.76525 16.1615V23.4423C9.76525 23.5321 9.79417 23.6058 9.852 23.6635C9.90967 23.7212 9.98333 23.75 10.073 23.75Z" fill="#E3E3E3" />
    </svg>
  )
}
