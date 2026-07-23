// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'

// A small "i" icon that reveals an explanation.
//
// The popup is rendered INSIDE the hovered wrapper, so the pointer can travel
// from the icon into the popup without it closing. That keeps any links in the
// content clickable. Click toggles it, so it also works on touch, and
// focus/blur & Escape make it usable from the keyboard.
//
// Note we only open on hover for a REAL mouse. On a touch device the browser
// fires a mouse enter just before the click, which would open the popup and
// then let the click toggle it straight back off, so it would never show.
const MARGIN = 8 // keep at least this much space to the window edges

export function InfoPopover({ ariaLabel, width, children }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [position, setPosition] = React.useState(null)
  const buttonRef = React.useRef(null)

  const isMouse = (e) => e.pointerType === 'mouse' || e.pointerType === 'pen'

  // Place the popup just below the icon, but keep it inside the window.
  // Centering it on the icon alone would push it off screen whenever the icon
  // sits close to an edge, which is exactly what happens on a phone.
  React.useLayoutEffect(() => {
    if (!isOpen) return undefined

    function place() {
      if (!buttonRef.current) return
      const icon = buttonRef.current.getBoundingClientRect()
      const maxWidth = window.innerWidth - 2 * MARGIN
      const popupWidth = Math.min(parseInt(width, 10), maxWidth)
      const centered = icon.left + icon.width / 2 - popupWidth / 2
      const left = Math.max(
        MARGIN,
        Math.min(centered, window.innerWidth - popupWidth - MARGIN)
      )
      setPosition({ top: icon.bottom + MARGIN, left, width: popupWidth })
    }

    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [isOpen, width])

  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onPointerEnter={(e) => {
        if (isMouse(e)) setIsOpen(true)
      }}
      onPointerLeave={(e) => {
        if (isMouse(e)) setIsOpen(false)
      }}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsOpen(false)
        }}
        ref={buttonRef}
        style={{
          background: 'none',
          border: 'none',
          padding: '0 0 0 4px',
          margin: 0,
          color: '#f1fa8c',
          opacity: isOpen ? 1 : 0.65,
          cursor: 'pointer',
          fontSize: '0.7em',
          lineHeight: 1,
          verticalAlign: 'super',
        }}
      >
        {/* https://icons.getbootstrap.com/ */}
        <i className="bi bi-info-circle"></i>
      </button>

      {isOpen && position && (
        <span
          role="tooltip"
          style={{
            // Fixed, so it can never be clipped or pushed off screen by the
            // layout it lives in. It stays a DOM child of the wrapper though,
            // so moving the pointer into it does not trigger a pointer leave.
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            zIndex: 1100,
            backgroundColor: '#21222c',
            border: '1px solid #44475a',
            borderRadius: '8px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
            padding: '12px 14px',
            color: '#f8f8f2',
            fontSize: '13px',
            fontWeight: 'normal',
            lineHeight: 1.5,
            textAlign: 'left',
            whiteSpace: 'normal',
            display: 'block',
          }}
        >
          {children}
        </span>
      )}
    </span>
  )
}

InfoPopover.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  width: PropTypes.string,
  children: PropTypes.node.isRequired,
}

InfoPopover.defaultProps = {
  width: '320px',
}
