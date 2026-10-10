import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { Modal } from './Modal'
import { Btn } from './ui'

const ToastContext = createContext(null)
const ConfirmContext = createContext(null)

// Pop-up messages (toasts) and "Are you sure?" dialogs for the whole app.
//   const toast = useToast();      toast.success('Saved!')
//   const confirm = useConfirm();  if (await confirm({ title: 'Delete?', message: '...', danger: true })) { ... }
export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const nextId = useRef(0)

  const push = useCallback((type, text) => {
    const id = ++nextId.current
    setToasts((list) => [...list, { id, type, text }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3800)
  }, [])

  const toast = useMemo(
    () => ({ success: (text) => push('success', text), error: (text) => push('error', text) }),
    [push]
  )
  const confirm = useCallback((options) => new Promise((resolve) => setDialog({ ...options, resolve })), [])

  function answer(result) {
    dialog.resolve(result)
    setDialog(null)
  }

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="anim-pop pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xl"
            >
              {t.type === 'success' ? (
                <CircleCheck size={20} className="mt-0.5 shrink-0 text-emerald-500" />
              ) : (
                <CircleAlert size={20} className="mt-0.5 shrink-0 text-rose-500" />
              )}
              <p className="text-sm font-medium">{t.text}</p>
            </div>
          ))}
        </div>

        <Modal
          open={!!dialog}
          onClose={() => answer(false)}
          size="sm"
          title={dialog?.title}
          footer={
            <>
              <Btn variant="ghost" onClick={() => answer(false)}>Cancel</Btn>
              <Btn variant={dialog?.danger ? 'danger' : 'primary'} onClick={() => answer(true)}>
                {dialog?.confirmLabel || 'Confirm'}
              </Btn>
            </>
          }
        >
          <p className="text-sm text-muted">{dialog?.message}</p>
        </Modal>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
export const useConfirm = () => useContext(ConfirmContext)
