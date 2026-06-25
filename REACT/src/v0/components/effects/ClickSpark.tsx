import { useCallback, useEffect, useRef, type ReactNode } from "react"
import { useAppReducedMotion } from "@app/motion"

import "./ClickSpark.css"

interface Spark {
  x: number
  y: number
  angle: number
  startTime: number
}

interface ClickSparkProps {
  sparkColor?: string
  sparkSize?: number
  sparkRadius?: number
  sparkCount?: number
  duration?: number
  easing?: "linear" | "ease-in" | "ease-in-out" | "ease-out" | string
  extraScale?: number
  children: ReactNode
}

export default function ClickSpark({
  sparkColor = "white",
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = "ease-out",
  extraScale = 1,
  children,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sparksRef = useRef<Spark[]>([])
  const animationIdRef = useRef<number | null>(null)
  const reduceMotion = useAppReducedMotion()

  useEffect(() => {
    if (reduceMotion) return

    const canvas = canvasRef.current
    if (!canvas) return

    const parent = canvas.parentElement
    if (!parent) return

    let resizeTimeout: ReturnType<typeof setTimeout> | undefined

    const resizeCanvas = () => {
      const { width, height } = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const nextWidth = Math.max(1, Math.round(width * dpr))
      const nextHeight = Math.max(1, Math.round(height * dpr))

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth
        canvas.height = nextHeight
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
      }
    }

    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(resizeCanvas, 100)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(parent)
    resizeCanvas()

    return () => {
      resizeObserver.disconnect()
      if (resizeTimeout) clearTimeout(resizeTimeout)
    }
  }, [reduceMotion])

  const easeFunc = useCallback(
    (progress: number) => {
      switch (easing) {
        case "linear":
          return progress
        case "ease-in":
          return progress * progress
        case "ease-in-out":
          return progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress
        default:
          return progress * (2 - progress)
      }
    },
    [easing],
  )

  const draw = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current
      const context = canvas?.getContext("2d")
      if (!canvas || !context) return

      const dpr = window.devicePixelRatio || 1
      context.clearRect(0, 0, canvas.width, canvas.height)

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime
        if (elapsed >= duration) return false

        const progress = elapsed / duration
        const eased = easeFunc(progress)
        const distance = eased * sparkRadius * extraScale
        const lineLength = sparkSize * (1 - eased)
        const x = spark.x * dpr
        const y = spark.y * dpr
        const scaledDistance = distance * dpr
        const scaledLineLength = lineLength * dpr

        const x1 = x + scaledDistance * Math.cos(spark.angle)
        const y1 = y + scaledDistance * Math.sin(spark.angle)
        const x2 = x + (scaledDistance + scaledLineLength) * Math.cos(spark.angle)
        const y2 = y + (scaledDistance + scaledLineLength) * Math.sin(spark.angle)

        context.strokeStyle = sparkColor
        context.lineWidth = 2 * dpr
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()

        return true
      })

      if (sparksRef.current.length > 0) {
        animationIdRef.current = requestAnimationFrame(draw)
      } else {
        animationIdRef.current = null
      }
    },
    [duration, easeFunc, extraScale, sparkColor, sparkRadius, sparkSize],
  )

  useEffect(() => {
    if (reduceMotion && animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current)
      animationIdRef.current = null
      sparksRef.current = []
    }

    return () => {
      if (animationIdRef.current !== null) cancelAnimationFrame(animationIdRef.current)
    }
  }, [reduceMotion])

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return

    const canvas = canvasRef.current
    if (!canvas) return
    const target = event.target instanceof Element ? event.target : null
    const sparkOptIn = target?.closest("[data-click-spark='true']")
    const sparkSuppressed = target?.closest("[data-click-spark-scope='off']")

    if (sparkSuppressed && !sparkOptIn) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const now = performance.now()

    const newSparks = Array.from({ length: sparkCount }, (_, index) => ({
      x,
      y,
      angle: (2 * Math.PI * index) / sparkCount,
      startTime: now,
    }))

    sparksRef.current.push(...newSparks)

    if (animationIdRef.current === null) {
      animationIdRef.current = requestAnimationFrame(draw)
    }
  }

  return (
    <div className="click-spark-root" data-click-spark-scope="off" onClick={handleClick}>
      {reduceMotion ? null : <canvas ref={canvasRef} className="click-spark-canvas" aria-hidden="true" />}
      <div className="click-spark-content">{children}</div>
    </div>
  )
}
