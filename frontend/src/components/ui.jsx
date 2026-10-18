import { Children, cloneElement, isValidElement, useEffect, useId, useRef } from 'react'
import { Check, CircleAlert, Info, X } from 'lucide-react'

export function Button({ children, variant = 'primary', size = '', className = '', type = 'button', ...props }) {
  return <button type={type} className={`button button-${variant} ${size ? `button-${size}` : ''} ${className}`} {...props}>{children}</button>
}

export function IconButton({ label, children, className = '', ...props }) {
  return <button className={`icon-button ${className}`} type="button" aria-label={label} title={label} {...props}>{children}</button>
}

export function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}><i />{children}</span>
}

export function Card({ children, className = '', ...props }) {
  return <section className={`card ${className}`} {...props}>{children}</section>
}

export function PageHeader({ eyebrow, title, description, actions, children }) {
  return <div className="page-heading">
    <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="heading-actions">{actions}</div>}
    {children}
  </div>
}

export function Field({ label, hint, error, children, className = '' }) {
  const id = useId()
  let assigned = false
  function attachLabel(node) {
    return Children.map(node, (child) => {
      if (!isValidElement(child)) return child
      if (!assigned && typeof child.type === 'string' && ['input', 'select', 'textarea'].includes(child.type)) {
        assigned = true
        return cloneElement(child, { id, 'aria-label': child.props['aria-label'] || label })
      }
      return cloneElement(child, {}, child.props.children ? attachLabel(child.props.children) : child.props.children)
    })
  }
  return <div className={`field ${className}`}><label htmlFor={id}>{label}</label>{attachLabel(children)}{error && <small className="field-error" role="alert">{error}</small>}{hint && !error && <small className="field-hint">{hint}</small>}</div>
}

export function EmptyState({ icon: Icon = Info, title, children, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={21} /></span><h3>{title}</h3><p>{children}</p>{action}</div>
}

export function Toast({ toast, onClose }) {
  if (!toast) return null
  const Icon = toast.type === 'error' ? CircleAlert : Check
  return <div className={`toast toast-${toast.type}`} role="status"><Icon size={17} /><span>{toast.message}</span><button aria-label="Dismiss notification" onClick={onClose}><X size={15} /></button></div>
}

export function Modal({ title, children, onClose, footer }) {
  const modalRef = useRef(null)
  useEffect(() => {
    const previousFocus = document.activeElement
    const modal = modalRef.current
    const focusable = () => modal?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])') || []
    focusable()[0]?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const items = focusable()
        if (!items.length) return
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus() }
        else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [onClose])
  return <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="modal" ref={modalRef} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><h2>{title}</h2><IconButton label="Close dialog" onClick={onClose}><X size={18} /></IconButton></div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-foot">{footer}</div>}
    </section>
  </div>
}
