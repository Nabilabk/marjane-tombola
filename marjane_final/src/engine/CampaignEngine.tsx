/*
  THE SINGLE RENDERING ENGINE.

  This is the refactored App.tsx. It renders the REAL website for a campaign
  — driven entirely by the unified `Campaign` object. The admin preview and
  the public website BOTH use this exact component, so what you edit in the
  admin is literally what the website renders. One engine, one truth.

  - `campaign` prop → the source of theme, brand, translations, pages, game.
  - The preview passes a campaign from the store; the public URL passes the
    campaign matching the slug.
*/

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Campaign, GameId } from '../platform/types'
import type { Lang } from '../tombola/i18n'
import { isPastEndDate } from '../platform/schedule'
import { campaignToBrand, applyCampaignTheme } from './theme'
import { buildTranslations } from './translations'
import CampaignHeader from '../tombola/CampaignHeader'
import Confetti from '../tombola/Confetti'
import Confetti1 from '../tombola/Confetti1'
import FormScreen from '../tombola/screens/FormScreen'
import ScanScreen from '../tombola/screens/ScanScreen'
import DiceScreen from '../tombola/screens/DiceScreen'
import CardsScreen from '../tombola/screens/CardsScreen'
import ScratchScreen from '../tombola/screens/ScratchScreen'
import WheelScreen from '../tombola/screens/WheelScreen'
import ResultScreen from '../tombola/screens/ResultScreen'
import UnavailableScreen from '../tombola/screens/UnavailableScreen'
import { verifyClient } from '../tombola/services/clientsApi'
import { recordParticipation } from '../tombola/services/participateApi'
import { campaignToScratchTheme, campaignToWheelTheme, campaignToCardsTheme } from './theme'
import '../tombola/ambient.css'

export type Screen = 'form' | 'scan' | 'dice' | 'cards' | 'scratch' | 'wheel' | 'result'

// The screen order for each game mechanic the admin can pick in Prizes.
// 'chest' is declared in GameId but not built out yet — falls back to the
// cards flow, same as any campaign with no game.id set at all (every
// campaign created before this feature existed, incl. Marjane).
// Exported so the admin's Pages/ThemeEditor screen switchers can derive
// their own screen list from the same single source of truth.
export const FLOWS: Record<GameId, Screen[]> = {
  cards: ['form', 'scan', 'dice', 'cards', 'result'],
  // 'cups' no longer exists as a playable mechanic (replaced by the 3D
  // Scratch Card) but the id is kept in GameId for campaigns that already
  // have it saved — normalizeGameId() below routes it here instead of
  // silently falling back to Cards, which would be a confusing surprise.
  cups: ['form', 'scan', 'scratch', 'result'],
  wheel: ['form', 'scan', 'wheel', 'result'],
  scratch: ['form', 'scan', 'scratch', 'result'],
  chest: ['form', 'scan', 'dice', 'cards', 'result'],
  // No mini-game screen at all: scanning the receipt goes straight to
  // 'result', which renders the raffle-entry confirmation instead of an
  // instant win/lose outcome — see the `isRaffle` handling below.
  raffle: ['form', 'scan', 'result'],
}

/** `'cups'` is legacy — any campaign still carrying it plays the Scratch
 *  Card flow instead. Every place that indexes `FLOWS` by a campaign's
 *  `game.id` should go through this first. */
export function normalizeGameId(id: GameId): GameId {
  return id === 'cups' ? 'scratch' : id
}

// Only 3 step chips exist (Achetez/Scannez/Gagnez — see CampaignHeader's
// STEP_KEYS), so every "win phase" screen (Dice/Cards/Cups/Wheel/Result)
// maps to the same 3rd step, keeping "Gagnez" highlighted throughout
// instead of it only lighting up on the first win-phase screen.
const STEP_OF: Record<Screen, 1 | 2 | 3> = {
  form: 1,
  scan: 2,
  dice: 3,
  cards: 3,
  scratch: 3,
  wheel: 3,
  result: 3,
}

const TAGLINE_KEY: Record<Screen, string> = {
  form: 'homeTagline',
  scan: 'm2d',
  dice: 'diceTitle',
  cards: 'cardsTitle',
  scratch: 'scratchTitle',
  wheel: 'wheelTitle',
  result: 'prizesTitle',
}

// Theme.animationLevel used to be stored and displayed in the Theme Editor's
// own demo swatch but never actually affect the real site — this is what
// makes it real: it now drives the screen-to-screen transition distance,
// duration and easing everywhere CampaignEngine renders.
const ANIMATION_PRESETS = {
  none: { distance: 0, duration: 0.01, ease: [0, 0, 1, 1] as [number, number, number, number] },
  subtle: { distance: 48, duration: 0.36, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  lively: { distance: 88, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] },
}

function slideVariants(distance: number) {
  return {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? distance : -distance }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -distance : distance }),
  }
}

export interface CampaignEngineProps {
  campaign: Campaign
  /** Optional controlled screen (used by the admin page switcher). */
  screen?: Screen
  /** Optional initial language. */
  initialLang?: Lang
  /** Notifies the parent when internal navigation changes screen. */
  onScreenChange?: (screen: Screen) => void
  className?: string
  /** Admin-only: turns on inline click-to-edit text in the curated fields
      each screen exposes. Defaults off — the public site never passes this,
      so it renders exactly as before. */
  editable?: boolean
  /** Admin-only: called when an inline-edited field is committed. */
  onEditText?: (key: string, lang: Lang, value: string) => void
}

export default function CampaignEngine({
  campaign,
  screen: controlledScreen,
  initialLang,
  onScreenChange,
  className,
  editable = false,
  onEditText,
}: CampaignEngineProps) {
  const [lang, setLang] = useState<Lang>(() =>
    normalizeLang(initialLang ?? campaign.language),
  )
  // Root of everything this engine renders. In preview (admin), theme vars
  // and dir/lang get scoped to THIS element instead of the whole document —
  // see the effects below and applyCampaignTheme's `target` param.
  const rootRef = useRef<HTMLDivElement>(null)

  function normalizeLang(l: string): Lang {
    return l === 'ar' ? 'ar' : 'fr'
  }
  const [stack, setStack] = useState<Screen[]>(['form'])
  const [dir, setDir] = useState(1)
  const [wonAmount, setWonAmount] = useState(0)
  const [pickLimit, setPickLimit] = useState(0)

  // Participant identity, collected on the form step and carried through
  // to the backend once a result is in — see `finishRound` below.
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [billHash, setBillHash] = useState<string | undefined>(undefined)

  // The admin's ThemeEditor/ScreensTab previews both render this exact
  // engine with a controlled `screen` prop so they can jump straight to
  // any step; the real public site never does (it always navigates
  // normally from 'form'). That's already a reliable "is this a live
  // player or just a preview" signal — reuse it instead of adding a
  // separate prop, so a staff member clicking through cards in the admin
  // preview never writes a fake client/participation into the real data.
  const isPreview = Boolean(controlledScreen)

  const brand = campaignToBrand(campaign)
  const translations = buildTranslations(campaign)

  // Ended (permanent: archived/ended status, or past the scheduled end)
  // takes priority over maintenance (temporary, admin-toggled) — a
  // maintenance flag left on after a campaign has actually ended shouldn't
  // produce a "come back soon" message. Previews (admin clicking through
  // ThemeEditor/Pages) always render normally regardless — see isPreview
  // above. Mirrors backend/app.py's _lifecycle_block exactly.
  const isEnded =
    campaign.status === 'ended' ||
    campaign.status === 'archived' ||
    isPastEndDate(campaign.schedule.endDate, campaign.schedule.endTime)
  const isMaintenance = campaign.maintenanceMode && !isEnded
  // Draft = never published — nothing has gone live yet, so a real visitor
  // hitting the slug gets a blank page (not even the branded header), same
  // as a domain with nothing deployed on it. Admin preview ignores this
  // (isPreview) so editing a draft campaign still renders normally.
  const isDraft = campaign.status === 'draft'

  const screen = stack[stack.length - 1]
  const anim = ANIMATION_PRESETS[campaign.theme.animationLevel] ?? ANIMATION_PRESETS.subtle
  const slide = slideVariants(anim.distance)
  const flow = FLOWS[normalizeGameId(campaign.game.id)] ?? FLOWS.cards
  // 'raffle' skips every game screen — scanning goes straight to 'result',
  // which then needs to show a neutral "you're entered in the draw" state
  // instead of the normal win/lose outcome.
  const isRaffle = normalizeGameId(campaign.game.id) === 'raffle'
  const nextScreen = (s: Screen): Screen => {
    const i = flow.indexOf(s)
    return flow[i + 1] ?? 'result'
  }

  // Apply theme CSS vars — the heartbeat of live re-skinning. Skipped for a
  // real visitor on a draft campaign: nothing renders below, and applying
  // the brand's dark-mode page color here would still tint the otherwise-
  // blank <body> (see index.css), undoing the point of showing nothing.
  //
  // In preview (admin ThemeEditor/ScreensTab), scope to this component's own
  // root instead of the document — otherwise toggling a campaign's dark mode
  // while previewing it would flip the WHOLE admin panel light/dark, since
  // index.css's `body` reads these exact same --page/--ink vars.
  useEffect(() => {
    if (!isPreview && isDraft) return
    applyCampaignTheme(campaign, isPreview ? rootRef.current ?? undefined : undefined)
  }, [campaign, isPreview, isDraft])

  // Reflect the campaign language + RTL. Same scoping reasoning as above —
  // a preview shouldn't flip the admin's own document dir/lang.
  useEffect(() => {
    if (isPreview) {
      if (rootRef.current) {
        rootRef.current.dir = lang === 'ar' ? 'rtl' : 'ltr'
        rootRef.current.lang = lang
      }
      return
    }
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang, isPreview])

  // Controlled navigation (admin page switcher).
  useEffect(() => {
    if (controlledScreen && controlledScreen !== screen) {
      setDir(1)
      setStack([controlledScreen])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledScreen])

  useEffect(() => {
    onScreenChange?.(screen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  const go = (s: Screen) => {
    setDir(1)
    setStack((st) => [...st, s])
  }
  const back = () => {
    setDir(-1)
    setStack((st) => (st.length > 1 ? st.slice(0, -1) : st))
  }
  const home = () => {
    setDir(-1)
    setStack(['form'])
  }

  // Cards/Cups/Wheel all funnel their draw result through here: it sets
  // the amount the ResultScreen shows AND, on the real public site, logs
  // who won what against their verified phone number — the single write
  // that makes the admin's Participants tab and prize-pickup lookup
  // reflect actual plays instead of always being empty. Best-effort: the
  // draw already happened and was already shown to the player, so a
  // logging failure here (backend down, duplicate bill_hash, ...) must
  // never block the result screen.
  const finishRound = (fromScreen: Screen, amount: number) => {
    setWonAmount(amount)
    if (!isPreview && phone) {
      void recordParticipation({
        slug: campaign.slug,
        phoneNumber: phone,
        fullName: fullName || undefined,
        billHash,
        amount,
      }).catch((err) => {
        // Never block the result screen the player already saw — but a
        // silently-swallowed failure here is exactly why a real scan can
        // "not show up" in the admin dashboard with no clue why (backend
        // down, duplicate bill_hash, campaign paused, ...). Surface it.
        console.error('[tombola] failed to record participation:', err)
      })
    }
    go(nextScreen(fromScreen))
  }

  const tagline = translations[TAGLINE_KEY[screen]]?.[lang] ?? campaign.brand.tagline

  const renderScreen = () => {
    switch (screen) {
      case 'form':
        return (
          <FormScreen
            lang={lang}
            dict={translations}
            editable={editable}
            onEditText={onEditText}
            rulesUrl={brand.rulesUrl}
            onSubmit={(data) => {
              const full = `${data.firstName} ${data.lastName}`.trim()
              setPhone(data.phone)
              setFullName(full)
              if (!isPreview) {
                // Best-effort — /api/participate finds-or-creates by phone
                // too, so a failed verify here doesn't strand the player.
                void verifyClient(data.phone, full).catch((err) => {
                  console.error('[tombola] failed to verify client:', err)
                })
              }
              go(nextScreen('form'))
            }}
          />
        )
      case 'scan':
        return (
          <ScanScreen
            brand={brand}
            lang={lang}
            dict={translations}
            editable={editable}
            onEditText={onEditText}
            onValidate={(hash) => {
              setBillHash(hash)
              if (isRaffle) {
                // No game screen follows — the scan itself is the entry.
                // Route through finishRound (amount 0) so the participation
                // still gets logged for the admin, same as every other
                // mechanic's draw.
                finishRound('scan', 0)
              } else {
                go(nextScreen('scan'))
              }
            }}
          />
        )
      case 'dice':
        return (
          <DiceScreen
            brand={brand}
            lang={lang}
            dict={translations}
            editable={editable}
            onEditText={onEditText}
            theme={campaignToCardsTheme(campaign)}
            onResult={(_value, limit) => {
              setPickLimit(limit)
              go(nextScreen('dice'))
            }}
          />
        )
      case 'cards':
        return (
          <CardsScreen
            brand={brand}
            lang={lang}
            dict={translations}
            editable={editable}
            onEditText={onEditText}
            pickLimit={pickLimit}
            theme={campaignToCardsTheme(campaign)}
            onResult={(amt) => finishRound('cards', amt)}
          />
        )
      case 'scratch':
        return (
          <ScratchScreen
            brand={brand}
            scratchTheme={campaignToScratchTheme(campaign)}
            lang={lang}
            dict={translations}
            editable={editable}
            onEditText={onEditText}
            onResult={(amt) => finishRound('scratch', amt)}
          />
        )
      case 'wheel':
        return (
          <WheelScreen
            brand={brand}
            lang={lang}
            dict={translations}
            editable={editable}
            onEditText={onEditText}
            theme={campaignToWheelTheme(campaign)}
            onResult={(amt) => finishRound('wheel', amt)}
          />
        )
      case 'result':
        return (
          <ResultScreen
            lang={lang}
            dict={translations}
            editable={editable}
            onEditText={onEditText}
            amount={wonAmount}
            raffle={isRaffle}
            onHome={home}
          />
        )
    }
  }

  // Truly nothing — no header, no branding, no theme background. A draft
  // isn't "coming soon", it's not deployed: this is what an unclaimed
  // domain looks like, not a state a real visitor should be able to read
  // anything into.
  if (!isPreview && isDraft) return null

  return (
    // bg-[color:var(--page)] + min-h-full (not min-h-screen/100vh) so this
    // paints its OWN themed background over its full height — needed in the
    // admin preview, where it sits inside DevicePreview's fixed-height,
    // hardcoded-white device frame (see DevicePreview.tsx) rather than
    // directly under <body>. Without this, toggling a campaign to dark mode
    // left that white frame showing through instead of turning dark.
    //
    // text-[color:var(--ink)] does the same job for foreground text: form
    // elements (<input>/<textarea>/<select>) get `color: inherit` from
    // Tailwind's preflight, so without an explicit `color` set somewhere in
    // this subtree they fall through past this scoped root to the ADMIN
    // page's own (always-light) `--ink`, rendering near-black text on the
    // dark-mode field background (`--field`) below — invisible while typing.
    <div ref={rootRef} className={`flex min-h-full flex-col bg-[color:var(--page)] text-[color:var(--ink)] ${className ?? ''}`}>
      <CampaignHeader
        brand={brand}
        lang={lang}
        onLang={setLang}
        onBack={back}
        canBack={stack.length > 1}
        activeStep={STEP_OF[screen]}
        tagline={tagline}
        editable={editable}
        onEditTagline={(value) => onEditText?.(TAGLINE_KEY[screen], lang, value)}
      />

      <main className="relative flex-1 overflow-hidden">
        {campaign.theme.backgroundImageUrl && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${campaign.theme.backgroundImageUrl})` }}
          >
            {/* Scrim in the page color so body text stays legible over any photo,
                in both light and dark themes — the image reads as texture, not noise.
                Kept below ~60% or the photo becomes imperceptible (screen content
                itself sits on its own translucent InfoCard, so it doesn't rely on
                this scrim for contrast). */}
            <div className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--page) 55%, transparent)' }} />
          </div>
        )}
        <div className="tombola-ambient-bg" aria-hidden="true" />
        {!isPreview && (isEnded || isMaintenance) ? (
          // Header/background stay so the site still reads as branded, but
          // the whole game flow (and its state) is skipped entirely — a
          // real visitor never even reaches 'form'. Admin preview ignores
          // this (isPreview) so editing/reviewing an ended campaign still
          // works normally.
          <div className="relative mx-auto max-w-4xl px-5 py-9 sm:px-8 lg:py-14">
            <UnavailableScreen kind={isEnded ? 'ended' : 'maintenance'} lang={lang} dict={translations} />
          </div>
        ) : (
          <>
            {screen === 'form' && <Confetti1 />}
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={screen}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: anim.duration, ease: anim.ease }}
                className="relative mx-auto max-w-4xl px-5 py-9 sm:px-8 lg:py-14"
              >
                {renderScreen()}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </main>
    </div>
  )
}

// Re-export so the win screen can still use Confetti if needed.
export { Confetti }
