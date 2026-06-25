import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { motion, useInView } from "motion/react"

import "./animated-list.css"

type AnimatedListItem = ReactNode

interface AnimatedItemProps {
  children: ReactNode
  delay?: number
  index: number
  onMouseEnter: () => void
  onClick: () => void
}

interface AnimatedListProps {
  items?: AnimatedListItem[]
  onItemSelect?: (item: AnimatedListItem, index: number) => void
  showGradients?: boolean
  enableArrowNavigation?: boolean
  className?: string
  itemClassName?: string
  displayScrollbar?: boolean
  initialSelectedIndex?: number
}

const defaultItems = [
  "Item 1",
  "Item 2",
  "Item 3",
  "Item 4",
  "Item 5",
  "Item 6",
  "Item 7",
  "Item 8",
  "Item 9",
  "Item 10",
  "Item 11",
  "Item 12",
  "Item 13",
  "Item 14",
  "Item 15",
]

const AnimatedItem = ({ children, delay = 0, index, onMouseEnter, onClick }: AnimatedItemProps) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { amount: 0.5, once: false })

  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.96, opacity: 0, filter: "blur(8px)" }}
      animate={inView ? { scale: 1, opacity: 1, filter: "blur(0px)" } : { scale: 0.96, opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 0.24, delay }}
      style={{ marginBottom: "0.75rem", cursor: "pointer" }}
    >
      {children}
    </motion.div>
  )
}

export default function AnimatedList({
  items = defaultItems,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  itemClassName = "",
  displayScrollbar = true,
  initialSelectedIndex = -1,
}: AnimatedListProps) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex)
  const [keyboardNav, setKeyboardNav] = useState(false)
  const [topGradientOpacity, setTopGradientOpacity] = useState(0)
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1)

  const handleItemMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  const handleItemClick = useCallback(
    (item: AnimatedListItem, index: number) => {
      setSelectedIndex(index)
      onItemSelect?.(item, index)
    },
    [onItemSelect],
  )

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    setTopGradientOpacity(Math.min(scrollTop / 50, 1))
    const bottomDistance = scrollHeight - (scrollTop + clientHeight)
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1))
  }, [])

  useEffect(() => {
    if (!enableArrowNavigation) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
        event.preventDefault()
        setKeyboardNav(true)
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1))
      } else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
        event.preventDefault()
        setKeyboardNav(true)
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (event.key === "Enter" && selectedIndex >= 0 && selectedIndex < items.length) {
        event.preventDefault()
        onItemSelect?.(items[selectedIndex], selectedIndex)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation])

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return

    const container = listRef.current
    const selectedItem = container.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)

    if (selectedItem) {
      const extraMargin = 50
      const containerScrollTop = container.scrollTop
      const containerHeight = container.clientHeight
      const itemTop = selectedItem.offsetTop
      const itemBottom = itemTop + selectedItem.offsetHeight

      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" })
      } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: "smooth",
        })
      }
    }

    setKeyboardNav(false)
  }, [selectedIndex, keyboardNav])

  return (
    <div className={`scroll-list-container ${className}`}>
      <div ref={listRef} className={`scroll-list ${!displayScrollbar ? "no-scrollbar" : ""}`} onScroll={handleScroll}>
        {items.map((item, index) => (
          <AnimatedItem
            key={index}
            delay={0.06}
            index={index}
            onMouseEnter={() => handleItemMouseEnter(index)}
            onClick={() => handleItemClick(item, index)}
          >
            <div className={`item ${selectedIndex === index ? "selected" : ""} ${itemClassName}`}>
              {typeof item === "string" ? <p className="item-text">{item}</p> : item}
            </div>
          </AnimatedItem>
        ))}
      </div>
      {showGradients && (
        <>
          <div className="top-gradient" style={{ opacity: topGradientOpacity }} />
          <div className="bottom-gradient" style={{ opacity: bottomGradientOpacity }} />
        </>
      )}
    </div>
  )
}
