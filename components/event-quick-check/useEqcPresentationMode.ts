'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

export type EqcPresentationMode = 'compact' | 'present'

export function clampEqcChapterIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return Math.max(0, Math.min(count - 1, index))
}

export function nextEqcChapterIndex(index: number, count: number): number {
  return clampEqcChapterIndex(index + 1, count)
}

export function prevEqcChapterIndex(index: number, count: number): number {
  return clampEqcChapterIndex(index - 1, count)
}

function listChapters(root: HTMLElement): HTMLElement[] {
  return Array.from(root.children).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement &&
      (el.classList.contains('plexon-eqc-masthead-shell') ||
        el.classList.contains('plexon-dash-band')),
  )
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[contenteditable="true"]'))
}

type Options = {
  mode: EqcPresentationMode
  resultsRootRef: RefObject<HTMLElement | null>
  onExitPresent: () => void
}

/**
 * Present-mode chapter keyboard nav + inview markers for motion.
 * Compact mode is a no-op aside from clearing inview attrs.
 */
export function useEqcPresentationMode({ mode, resultsRootRef, onExitPresent }: Options) {
  const [chapterIndex, setChapterIndex] = useState(0)
  const [chapterCount, setChapterCount] = useState(0)
  const chapterIndexRef = useRef(0)
  const presenting = mode === 'present'
  chapterIndexRef.current = chapterIndex

  const refreshChapters = useCallback(() => {
    const root = resultsRootRef.current
    if (!root) {
      setChapterCount(0)
      return [] as HTMLElement[]
    }
    const chapters = listChapters(root)
    setChapterCount(chapters.length)
    return chapters
  }, [resultsRootRef])

  const goToChapter = useCallback(
    (index: number) => {
      const chapters = refreshChapters()
      if (!chapters.length) return
      const next = clampEqcChapterIndex(index, chapters.length)
      chapterIndexRef.current = next
      setChapterIndex(next)
      chapters[next]?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    },
    [refreshChapters],
  )

  // Mirror mode onto scrollport; mark presenting for chrome-less shell.
  useEffect(() => {
    const root = resultsRootRef.current
    if (!root) return
    root.dataset.eqcMode = mode
    if (presenting) root.dataset.eqcPresenting = 'true'
    else delete root.dataset.eqcPresenting

    const scroll = root.closest('.plexon-eqc-results-scroll')
    if (scroll instanceof HTMLElement) {
      scroll.dataset.eqcMode = mode
      if (presenting) scroll.dataset.eqcPresenting = 'true'
      else delete scroll.dataset.eqcPresenting
    }

    const stage = root.closest('.plexon-eqc-stage')
    if (stage instanceof HTMLElement) {
      if (presenting) stage.dataset.eqcPresenting = 'true'
      else delete stage.dataset.eqcPresenting
    }

    return () => {
      delete root.dataset.eqcPresenting
      if (scroll instanceof HTMLElement) {
        delete scroll.dataset.eqcPresenting
        delete scroll.dataset.eqcMode
      }
      if (stage instanceof HTMLElement) delete stage.dataset.eqcPresenting
    }
  }, [mode, presenting, resultsRootRef])

  // Inview motion markers (present only).
  useEffect(() => {
    const root = resultsRootRef.current
    if (!root || !presenting) {
      const chapters = resultsRootRef.current ? listChapters(resultsRootRef.current) : []
      for (const el of chapters) delete el.dataset.eqcInview
      return
    }

    const chapters = refreshChapters()
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      for (const el of chapters) el.dataset.eqcInview = 'true'
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target
          if (!(el instanceof HTMLElement)) continue
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            el.dataset.eqcInview = 'true'
          }
        }
      },
      { root: root.closest('.plexon-eqc-results-scroll'), threshold: [0.35, 0.55] },
    )
    for (const el of chapters) {
      delete el.dataset.eqcInview
      observer.observe(el)
    }
    return () => observer.disconnect()
  }, [presenting, refreshChapters, resultsRootRef, mode])

  // Track active chapter from scroll position while presenting.
  useEffect(() => {
    if (!presenting) return
    const root = resultsRootRef.current
    const scroll = root?.closest('.plexon-eqc-results-scroll')
    if (!(root && scroll instanceof HTMLElement)) return

    const syncIndex = () => {
      const chapters = listChapters(root)
      setChapterCount(chapters.length)
      if (!chapters.length) return
      const scrollTop = scroll.scrollTop
      let best = 0
      let bestDist = Number.POSITIVE_INFINITY
      chapters.forEach((el, i) => {
        const top = el.offsetTop
        const dist = Math.abs(top - scrollTop)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      })
      chapterIndexRef.current = best
      setChapterIndex(best)
    }

    syncIndex()
    scroll.addEventListener('scroll', syncIndex, { passive: true })
    window.addEventListener('resize', syncIndex)
    return () => {
      scroll.removeEventListener('scroll', syncIndex)
      window.removeEventListener('resize', syncIndex)
    }
  }, [presenting, resultsRootRef])

  // Keyboard navigation.
  useEffect(() => {
    if (!presenting) return

    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const key = event.key

      if (key === 'Escape') {
        event.preventDefault()
        onExitPresent()
        return
      }

      const chapters = refreshChapters()
      if (!chapters.length) return
      const current = chapterIndexRef.current

      if (key === 'ArrowDown' || key === 'PageDown' || key === ' ') {
        event.preventDefault()
        goToChapter(nextEqcChapterIndex(current, chapters.length))
        return
      }
      if (key === 'ArrowUp' || key === 'PageUp') {
        event.preventDefault()
        goToChapter(prevEqcChapterIndex(current, chapters.length))
        return
      }
      if (key === 'Home') {
        event.preventDefault()
        goToChapter(0)
        return
      }
      if (key === 'End') {
        event.preventDefault()
        goToChapter(chapters.length - 1)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presenting, goToChapter, onExitPresent, refreshChapters])

  return {
    presenting,
    chapterIndex,
    chapterCount,
    goToChapter,
    goNext: () => goToChapter(nextEqcChapterIndex(chapterIndexRef.current, chapterCount)),
    goPrev: () => goToChapter(prevEqcChapterIndex(chapterIndexRef.current, chapterCount)),
  }
}
