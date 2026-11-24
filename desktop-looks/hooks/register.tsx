import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { LOOKS, mix, sceneSvg, type Look } from './looks'
import { makeColors } from './make-colors.js'

const SHARED_ROLES = { danger: '#c0392b', success: '#3f8a4a', warning: '#b7791f', pro: '#7b5cc4' }

const colorsFor = (look: Look) =>
  makeColors({
    label: look.name,
    id: `desktop-looks-${look.id}`,
    roles: SHARED_ROLES,
    light: {
      roles: { accent: look.L.accent },
      gray: {
        anchors: {
          'surface-0': look.L.panel,
          'surface-1': look.L.bg,
          'surface-2': mix(look.L.bg, '#ffffff', 0.5),
          'text-primary': look.L.text,
          'text-secondary': mix(look.L.text, look.L.muted, 0.5),
          'text-muted': look.L.muted,
        },
      },
    },
    dark: {
      roles: { accent: look.D.accent },
      gray: {
        anchors: {
          'surface-0': look.D.bg,
          'surface-1': look.D.panel,
          'surface-2': mix(look.D.panel, look.D.text, 0.05),
          'surface-3': mix(look.D.panel, look.D.text, 0.08),
          'text-primary': look.D.text,
          'text-secondary': mix(look.D.text, look.D.muted, 0.5),
          'text-muted': look.D.muted,
        },
      },
    },
  })

const lookArgs = (look: Look): ThemeSetArgs => ({
  colors: colorsFor(look).theme,
  backdrop: { scene: look.id },
})

const findLook = (text: string) => {
  const want = text.trim().toLowerCase().replace(/\s+/g, '-')
  return LOOKS.find(l => l.id === want || l.name.toLowerCase().replace(/\s+/g, '-') === want)
}

const svgCache = new Map<string, string>()
const svgFor = (look: Look) => {
  let svg = svgCache.get(look.id)
  if (svg === undefined) {
    svg = sceneSvg(look)
    svgCache.set(look.id, svg)
  }
  return svg
}

async function apply($: EngineInterface, look: Look) {
  await $.store.set('current', look.id)
  return $.theme.set(lookArgs(look))
}

const lookAt = (index: number): Look => LOOKS[((index % LOOKS.length) + LOOKS.length) % LOOKS.length] ?? LOOKS[0]!

export const register: Register = on => {

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'look',
      description: 'Desktop looks: show the list, skip to the next look, pin one, or go back to cycling',
      argumentHint: '[next | <name> | cycle | list]',
    })

    const pinned = (await $.store.get('pinned')) as string | undefined
    let look = pinned ? findLook(pinned) : undefined

    if (look === undefined) {
      // Cycle: each new session takes the next look in the list.
      const last = Number((await $.store.get('index')) ?? -1)
      const index = (Number.isFinite(last) ? last + 1 : 0) % LOOKS.length
      await $.store.set('index', index)
      look = lookAt(index)
    }

    const set = await apply($, look)
    if (set.isDrawn) {
      $.ui.toast(`Look: ${look.name}`)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const look = LOOKS.find(l => l.id === e.props.scene)
    if (look === undefined) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    return <Svg source={svgFor(look)} alt={`${look.name} background`} isInteractive />
  })

  on('command.run', { command: 'look' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const current = (await $.store.get('current')) as string | undefined
    const pinned = (await $.store.get('pinned')) as string | undefined
    const names = LOOKS.map(l => `${l.id === current ? '▸ ' : '  '}${l.name}`).join('\n')

    if (arg === '' || arg === 'list') {
      const mode = pinned ? `Pinned to ${findLook(pinned)?.name ?? pinned}. /look cycle to go back to cycling.` : 'Cycling: each new session gets the next look.'
      return { text: `${mode}\n\n${names}\n\n/look next · /look <name> · /look cycle` }
    }

    if (arg === 'next') {
      const last = Number((await $.store.get('index')) ?? -1)
      const index = (last + 1) % LOOKS.length
      await $.store.set('index', index)
      await $.store.delete('pinned')
      const look = lookAt(index)
      await apply($, look)
      return { text: `Now showing ${look.name}.` }
    }

    if (arg === 'cycle') {
      await $.store.delete('pinned')
      return { text: 'Back to cycling: the next session gets the next look.' }
    }

    const look = findLook(arg)
    if (look === undefined) {
      return { text: `No look called "${e.args.trim()}". The looks are:\n\n${names}` }
    }
    await $.store.set('pinned', look.id)
    await $.store.set('index', LOOKS.indexOf(look))
    await apply($, look)
    return { text: `Pinned ${look.name}. Every session will use it until you run /look cycle.` }
  })
}
