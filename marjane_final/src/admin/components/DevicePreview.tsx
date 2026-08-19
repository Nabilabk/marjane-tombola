import { useState } from 'react'
import type { ReactNode } from 'react'
import { Smartphone, Tablet, Laptop } from 'lucide-react'
import { cn } from '../lib/cn'
import { useAdminLang } from '../lib/adminI18n'

export type DeviceKind = 'phone' | 'tablet' | 'laptop'

/** Real device viewport sizes — not an arbitrary shrunk-down box. The content
    renders at its actual width (so responsive breakpoints trigger correctly),
    and the whole framed device is visually scaled down to fit the available
    panel space, the same way Chrome DevTools' device toolbar or a design
    tool's "zoom to fit" works. Scrolling inside the frame still behaves like
    a real device — we're not trying to fake "no scroll needed". Module-level
    const, so labelKey (not a translated label) — the strings are resolved
    with t() inside the components below. */
const DEVICES: Record<DeviceKind, { width: number; height: number; labelKey: string; icon: typeof Smartphone; bezel: number; topChrome: number; bottomChrome: number; radius: number }> = {
  phone: { width: 390, height: 844, labelKey: 'devicePreview.phone', icon: Smartphone, bezel: 10, topChrome: 26, bottomChrome: 0, radius: 46 },
  tablet: { width: 768, height: 1024, labelKey: 'devicePreview.tablet', icon: Tablet, bezel: 16, topChrome: 0, bottomChrome: 0, radius: 28 },
  laptop: { width: 1280, height: 800, labelKey: 'devicePreview.laptop', icon: Laptop, bezel: 3, topChrome: 34, bottomChrome: 0, radius: 12 },
}

const STAGE_MAX_WIDTH = 660
// Taller than STAGE_MAX_WIDTH is wide — deliberately, so portrait devices
// (phone/tablet) render bigger without affecting laptop's size, which is
// bound by width, not height, since it's landscape.
const STAGE_MAX_HEIGHT = 720

export function DeviceSwitcher({ device, onChange }: { device: DeviceKind; onChange: (d: DeviceKind) => void }) {
  const { t } = useAdminLang()
  return (
    <div className="inline-flex items-center gap-0.5 rounded-[var(--pf-radius-sm)] border border-[var(--pf-border-strong)] bg-white p-0.5 shadow-[var(--pf-shadow-xs)]">
      {(Object.keys(DEVICES) as DeviceKind[]).map((key) => {
        const d = DEVICES[key]
        const Icon = d.icon
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            title={t(d.labelKey)}
            aria-label={`${t('devicePreview.previewAs')} ${t(d.labelKey)}`}
            className={cn(
              'flex h-8 w-9 items-center justify-center rounded-[6px] transition-colors',
              device === key
                ? 'bg-[var(--pf-ink)] text-white'
                : 'text-[var(--pf-ink-muted)] hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-ink)]',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}

export function DevicePreview({ device, children, label }: { device: DeviceKind; children: ReactNode; label?: string }) {
  const d = DEVICES[device]
  const frameWidth = d.width + d.bezel * 2
  const frameHeight = d.height + d.bezel * 2 + d.topChrome + d.bottomChrome
  const scale = Math.min(1, STAGE_MAX_WIDTH / frameWidth, STAGE_MAX_HEIGHT / frameHeight)
  const scaledWidth = frameWidth * scale
  const scaledHeight = frameHeight * scale

  return (
    <div className="flex flex-col items-center">
      {/* Outer box is sized to the SCALED result so it doesn't leave a layout
          gap the size of the unscaled frame. */}
      <div style={{ width: scaledWidth, height: scaledHeight }}>
        <div
          style={{
            width: frameWidth,
            height: frameHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {device === 'laptop' ? (
            <div
              className="h-full w-full overflow-hidden border border-[#2a2b30] bg-[#1c1d21] shadow-[var(--pf-shadow-lg)]"
              style={{ borderRadius: d.radius }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 bg-[#2a2b30] px-3" style={{ height: d.topChrome }}>
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 flex-1 truncate rounded-[5px] bg-[#17181c] px-2.5 py-1 text-center font-mono text-[10px] text-white/40">
                  promo.company.com
                </span>
              </div>
              <div style={{ width: d.width, height: d.height }} className="overflow-y-auto bg-white">
                {children}
              </div>
            </div>
          ) : (
            <div
              className="relative h-full w-full bg-[#131316] shadow-[var(--pf-shadow-lg)]"
              style={{ borderRadius: d.radius, padding: d.bezel }}
            >
              {device === 'phone' && (
                <div className="absolute left-1/2 top-0 z-20 h-[26px] w-[124px] -translate-x-1/2 rounded-b-[16px] bg-[#131316]" />
              )}
              <div
                className="h-full w-full overflow-hidden bg-white"
                style={{ borderRadius: Math.max(4, d.radius - d.bezel) }}
              >
                <div style={{ width: d.width, height: d.height }} className="overflow-y-auto">
                  {children}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {label && (
        <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--pf-ink-faint)]">
          {label}
        </div>
      )}
    </div>
  )
}

/** Convenience hook-like default-state helper so call sites don't each redeclare it. */
export function useDeviceState(initial: DeviceKind = 'phone') {
  return useState<DeviceKind>(initial)
}
