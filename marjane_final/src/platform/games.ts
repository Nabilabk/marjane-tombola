/*
  Game Plugin Registry — games are plugins.

  Each game exposes:
    - id, name, description
    - a renderer (the React component that plays the game)
    - a configuration panel schema (the admin's setup form)
    - default settings
    - the prizes it can award

  The platform renders whatever game is selected in campaign.game. New games
  (Scratch, Wheel, Cups, Treasure Chest) can be added later by registering a
  new entry here — WITHOUT modifying the platform or the admin core.
*/

import type { ComponentType } from 'react'
import CardsScreen from '../tombola/screens/CardsScreen'
import type { BrandView } from '../engine/theme'
import type { GameId } from './types'

export interface GameConfigField {
  key: string
  label: string
  type: 'number' | 'text' | 'toggle' | 'select'
  min?: number
  max?: number
  options?: string[]
  hint?: string
}

export interface GameRendererProps {
  brand: BrandView
  lang: 'fr' | 'ar'
  pickLimit: number
  onResult: (amount: number) => void
}

export interface GameDefinition {
  id: GameId
  name: string
  description: string
  /** Renderer for this game. Currently the Cards engine is the default. */
  renderer: ComponentType<GameRendererProps>
  /** Configuration panel fields shown in the admin's Game editor. */
  configFields: GameConfigField[]
  defaultSettings: Record<string, string | number | boolean>
  defaultPrizes: number[]
}

/**
 * The default game renderer — the existing CardsScreen (dice + card flip).
 * Registered as the "cards" plugin. Other plugins would map to their own
 * renderer components (e.g. a WheelScreen, ScratchScreen, etc.).
 */
const CardsRenderer = CardsScreen as unknown as ComponentType<GameRendererProps>

export const GAMES: Record<GameId, GameDefinition> = {
  cards: {
    id: 'cards',
    name: 'Cards',
    description: 'Dice roll decides how many cards the player flips to reveal prizes.',
    renderer: CardsRenderer,
    configFields: [
      { key: 'cardCount', label: 'Number of cards', type: 'number', min: 4, max: 12 },
      { key: 'maxPickLimit', label: 'Max picks', type: 'number', min: 1, max: 6 },
      { key: 'rounds', label: 'Shuffle rounds', type: 'number', min: 3, max: 10 },
    ],
    defaultSettings: { cardCount: 9, maxPickLimit: 6, rounds: 6 },
    defaultPrizes: [20, 50, 0, 100, 30, 200, 10, 75],
  },
  scratch: {
    id: 'scratch',
    name: 'Scratch Card',
    description: 'Scratch a virtual card to reveal an instant prize.',
    renderer: CardsRenderer,
    configFields: [{ key: 'pools', label: 'Prize pools', type: 'number', min: 1, max: 10 }],
    defaultSettings: { pools: 3 },
    defaultPrizes: [0, 10, 50, 100],
  },
  wheel: {
    id: 'wheel',
    name: 'Wheel',
    description: 'Spin a wheel of fortune — the segment it lands on is the prize.',
    renderer: CardsRenderer,
    configFields: [{ key: 'segments', label: 'Segments', type: 'number', min: 4, max: 12 }],
    defaultSettings: { segments: 8 },
    defaultPrizes: [0, 20, 50, 100, 200, 10, 30, 75],
  },
  cups: {
    id: 'cups',
    name: 'Cups',
    description: 'Pick a cup to reveal whether it hides a prize.',
    renderer: CardsRenderer,
    configFields: [{ key: 'cups', label: 'Number of cups', type: 'number', min: 3, max: 6 }],
    defaultSettings: { cups: 3 },
    defaultPrizes: [0, 50, 100],
  },
  chest: {
    id: 'chest',
    name: 'Treasure Chest',
    description: 'Open a treasure chest to unlock a mystery prize.',
    renderer: CardsRenderer,
    configFields: [{ key: 'chests', label: 'Chests', type: 'number', min: 1, max: 5 }],
    defaultSettings: { chests: 3 },
    defaultPrizes: [0, 100, 200, 500],
  },
}

export function getGame(id: GameId): GameDefinition {
  return GAMES[id] ?? GAMES.cards
}
