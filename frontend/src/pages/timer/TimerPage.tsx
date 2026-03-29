import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { recipeService } from '../../services/recipe.service'
import { Button } from '../../components/common/Button'

interface Timer {
  id: string
  label: string
  totalSeconds: number
  remaining: number
  running: boolean
  completed: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

const formatTime = (secs: number) => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

const PRESETS = [
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
  { label: '1 hr', seconds: 3600 },
]

export const TimerPage: React.FC = () => {
  const { recipeId } = useParams<{ recipeId: string }>()
  const [timers, setTimers] = useState<Timer[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newMinutes, setNewMinutes] = useState('10')
  const [newSeconds, setNewSeconds] = useState('0')
  const [wakeLock, setWakeLock] = useState(false)
  const [wakeLockSupported, setWakeLockSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [recipeSteps, setRecipeSteps] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  
  const wakeLockRef = useRef<any>(null)
  const intervalRef = useRef<any>(null)
  const recognitionRef = useRef<any>(null)
  const touchStart = useRef<number | null>(null)
  const stepsRef = useRef<HTMLDivElement>(null)

  // Voice Control Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        const last = event.results.length - 1
        const command = event.results[last][0].transcript.toLowerCase().trim()
        console.log('Voice Command:', command)

        if (command.includes('start') || command.includes('resume')) {
          setTimers(prev => prev.map(t => ({ ...t, running: true })))
        } else if (command.includes('pause') || command.includes('stop')) {
          setTimers(prev => prev.map(t => ({ ...t, running: false })))
        } else if (command.includes('reset')) {
          setTimers(prev => prev.map(t => ({ ...t, remaining: t.totalSeconds, running: false, completed: false })))
        } else if (command.includes('next') || command.includes('forward')) {
          setCurrentStep(prev => Math.min(prev + 1, recipeSteps.length - 1))
        } else if (command.includes('previous') || command.includes('back')) {
          setCurrentStep(prev => Math.max(prev - 1, 0))
        }
      }

      recognition.onend = () => {
        if (isListening) {
          try { recognition.start() } catch {}
        }
      }

      recognitionRef.current = recognition
    }
  }, [recipeSteps.length, isListening])

  const toggleVoice = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const { data: recipeData } = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => recipeService.getRecipe(recipeId!),
    enabled: !!recipeId,
  })

  useEffect(() => {
    if (recipeData?.sections) {
      const allSteps: string[] = []
      recipeData.sections.forEach((section: any) => {
        if (section.steps) {
          section.steps.forEach((step: any) => {
            allSteps.push(typeof step === 'string' ? step : step.instruction)
          })
        }
      })
      setRecipeSteps(allSteps)
    } else if ((recipeData as any)?.steps) {
      setRecipeSteps((recipeData as any).steps.map((s: any) => typeof s === 'string' ? s : s.instruction))
    }
  }, [recipeData])

  // Check wake lock support
  useEffect(() => {
    setWakeLockSupported('wakeLock' in navigator)
  }, [])

  // Load timers from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('aibake-timers')
    const savedAt = localStorage.getItem('aibake-timers-timestamp')
    
    if (saved) {
      try {
        let loadedTimers: Timer[] = JSON.parse(saved)
        if (savedAt) {
          const elapsed = Math.floor((Date.now() - Number(savedAt)) / 1000)
          loadedTimers = loadedTimers.map(t => {
            if (!t.running) return t
            const newRemaining = Math.max(0, t.remaining - elapsed)
            return {
              ...t,
              remaining: newRemaining,
              running: newRemaining > 0,
              completed: newRemaining === 0
            }
          })
        }
        setTimers(loadedTimers)
      } catch {}
    }
  }, [])

  // Persist timers
  useEffect(() => {
    localStorage.setItem('aibake-timers', JSON.stringify(timers))
    localStorage.setItem('aibake-timers-timestamp', Date.now().toString())
  }, [timers])

  // Tick
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const hasRunning = timers.some((t) => t.running)
    if (!hasRunning) return

    intervalRef.current = setInterval(() => {
      setTimers((prev) =>
        prev.map((t) => {
          if (!t.running) return t
          if (t.remaining <= 1) {
            playBeep()
            showNotification(t.label)
            return { ...t, remaining: 0, running: false, completed: true }
          }
          return { ...t, remaining: t.remaining - 1 }
        })
      )
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [timers.some((t) => t.running)])

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 1.5)
    } catch {}
  }

  const showNotification = (label: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`⏰ ${label} Complete!`, { body: 'Your timer has finished.', icon: '/icons/icon-192.png' })
    }
  }

  const requestNotificationPermission = () => {
    if ('Notification' in window) Notification.requestPermission()
  }

  const toggleWakeLock = async () => {
    if (!wakeLockSupported) return
    if (wakeLock && wakeLockRef.current) {
      await wakeLockRef.current.release()
      wakeLockRef.current = null
      setWakeLock(false)
    } else {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        setWakeLock(true)
        wakeLockRef.current.addEventListener('release', () => setWakeLock(false))
      } catch {}
    }
  }

  const addTimer = () => {
    const total = Number(newMinutes) * 60 + Number(newSeconds)
    if (total <= 0) return
    const id = crypto.randomUUID()
    const label = newLabel.trim() || `Timer ${timers.length + 1}`
    setTimers((prev) => [...prev, { id, label, totalSeconds: total, remaining: total, running: false, completed: false }])
    setNewLabel('')
    requestNotificationPermission()
  }

  const start = (id: string) => setTimers((p) => p.map((t) => t.id === id ? { ...t, running: true } : t))
  const pause = (id: string) => setTimers((p) => p.map((t) => t.id === id ? { ...t, running: false } : t))
  const reset = (id: string) => setTimers((p) => p.map((t) => t.id === id ? { ...t, remaining: t.totalSeconds, running: false, completed: false } : t))
  const remove = (id: string) => setTimers((p) => p.filter((t) => t.id !== id))

  const addPreset = (seconds: number, label: string) => {
    const id = crypto.randomUUID()
    setTimers((prev) => [...prev, { id, label, totalSeconds: seconds, remaining: seconds, running: false, completed: false }])
  }

  // Handle swipe gestures
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.targetTouches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return
    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart.current - touchEnd
    
    if (diff > 50) { // Swipe left -> Next step
      setCurrentStep(prev => Math.min(prev + 1, recipeSteps.length - 1))
    } else if (diff < -50) { // Swipe right -> Prev step
      setCurrentStep(prev => Math.max(prev - 1, 0))
    }
    touchStart.current = null
  }

  // Auto-scroll to active step
  useEffect(() => {
    if (stepsRef.current) {
      const activeEl = stepsRef.current.children[currentStep] as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentStep])

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Baking Timers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{timers.filter((t) => t.running).length} running · {timers.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) && (
            <button
              onClick={toggleVoice}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors min-h-[44px] ${
                isListening ? 'border-amber-500 bg-amber-50 text-amber-700 animate-pulse' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {isListening ? '🎙️ Listening...' : '🎤 Voice Control'}
            </button>
          )}
          {wakeLockSupported && (
            <button
              onClick={toggleWakeLock}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors min-h-[44px] ${
                wakeLock ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {wakeLock ? '🔆 Awake' : '💤 Sleep OK'}
            </button>
          )}
        </div>
      </div>

      {/* Recipe Steps Section (Swipeable) */}
      <div 
        className="bg-gray-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">Step {currentStep + 1} of {recipeSteps.length || 1}</h2>
          <div className="flex gap-2 text-[10px] text-gray-400">
            <span>← Swipe to Navigate →</span>
          </div>
        </div>
        
        <div className="min-h-[120px] flex items-center justify-center text-center">
          {recipeSteps.length > 0 ? (
            <p className="text-xl font-medium leading-relaxed">
              {recipeSteps[currentStep]}
            </p>
          ) : (
            <p className="text-gray-500 italic">No recipe steps loaded. Open a recipe to sync steps here.</p>
          )}
        </div>

        {/* Step Indicator dots */}
        <div className="flex justify-center gap-1.5 mt-6">
          {(recipeSteps.length > 0 ? recipeSteps : [1]).map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all ${i === currentStep ? 'w-6 bg-amber-400' : 'w-2 bg-gray-700'}`} 
            />
          ))}
        </div>
      </div>

      {/* Active Timers */}
      <div className="space-y-3">
        {timers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-3">⏰</div>
            <p className="text-sm">No timers yet. Use a preset below.</p>
          </div>
        ) : (
          timers.map((timer) => {
            const pct = (timer.remaining / timer.totalSeconds) * 100
            const isLow = timer.remaining <= 60 && timer.running
            return (
              <div
                key={timer.id}
                className={`bg-white rounded-xl border-2 p-5 transition-all ${
                  timer.completed ? 'border-green-400 bg-green-50' :
                  isLow ? 'border-red-400 bg-red-50 animate-pulse' :
                  timer.running ? 'border-amber-400 shadow-md' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-gray-900 truncate">{timer.label}</h3>
                  <div className={`text-3xl font-mono font-bold tabular-nums ${
                    timer.completed ? 'text-green-600' : isLow ? 'text-red-600' : 'text-amber-700'
                  }`}>
                    {formatTime(timer.remaining)}
                  </div>
                </div>

                <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      timer.completed ? 'bg-green-400' : isLow ? 'bg-red-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex gap-2">
                  {!timer.completed && !timer.running && (
                    <button onClick={() => start(timer.id)} className="min-h-[44px] px-4 py-2 bg-amber-500 text-white rounded-lg">▶ Start</button>
                  )}
                  {timer.running && (
                    <button onClick={() => pause(timer.id)} className="min-h-[44px] px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">⏸ Pause</button>
                  )}
                  <button onClick={() => reset(timer.id)} className="min-h-[44px] px-4 py-2 bg-gray-100 text-gray-600 rounded-lg">🔄 Reset</button>
                  <button onClick={() => remove(timer.id)} className="min-h-[44px] ml-auto px-3 text-red-300 hover:text-red-500">✕</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Start</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => addPreset(p.seconds, p.label)}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-sm font-medium rounded-lg transition-colors min-h-[44px]"
            >
              ⏱ {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Custom Timer</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Label (e.g. Proofing)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              type="number"
              className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center"
              value={newMinutes}
              onChange={(e) => setNewMinutes(e.target.value)}
            />
            <span className="self-center">:</span>
            <input
              type="number"
              className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center"
              value={newSeconds}
              onChange={(e) => setNewSeconds(e.target.value)}
            />
            <Button onClick={addTimer} className="whitespace-nowrap">Add</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
