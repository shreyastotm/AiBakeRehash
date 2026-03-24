import { useState, useEffect } from 'react';
import { Button } from './Button';

export const TimerWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [wakeLock, setWakeLock] = useState<any>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await (navigator as any).wakeLock.request('screen');
        setWakeLock(lock);
      }
    } catch (err: any) {
      console.error(`${err.name}, ${err.message}`);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock !== null) {
      await wakeLock.release();
      setWakeLock(null);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
      if (!wakeLock) requestWakeLock();
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      releaseWakeLock();
      alert("Timer finished!");
    } else {
      clearInterval(interval);
      releaseWakeLock();
    }
    return () => {
      clearInterval(interval);
      releaseWakeLock();
    }
  }, [isRunning, timeLeft]);

  const toggleOpen = () => setIsOpen(!isOpen);

  const formatTime = (sec: number) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) {
    return (
      <button 
        onClick={toggleOpen}
        className="fixed bottom-4 right-4 bg-amber-600 text-white rounded-full p-4 shadow-lg hover:bg-amber-700 transition-colors z-50 flex items-center gap-2"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {isRunning && <span className="font-bold">{formatTime(timeLeft)}</span>}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-64 z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800">Baking Timer</h3>
        <button onClick={toggleOpen} className="text-gray-400 hover:text-gray-600">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      
      <div className="text-center mb-6">
        <div className="text-4xl font-mono text-amber-600 font-bold tracking-wider mb-2">
          {formatTime(timeLeft)}
        </div>
        {!isRunning && timeLeft === 0 && (
           <div className="flex gap-2 justify-center">
             <Button size="sm" variant="outline" onClick={() => setTimeLeft(5 * 60)}>5m</Button>
             <Button size="sm" variant="outline" onClick={() => setTimeLeft(10 * 60)}>10m</Button>
             <Button size="sm" variant="outline" onClick={() => setTimeLeft(30 * 60)}>30m</Button>
           </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button 
          className="flex-1" 
          variant={isRunning ? "secondary" : "primary"}
          onClick={() => setIsRunning(!isRunning)}
          disabled={timeLeft === 0}
        >
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button 
          variant="outline"
          onClick={() => { setIsRunning(false); setTimeLeft(0); }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
};
