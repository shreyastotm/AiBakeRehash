import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';

export interface AudioRecorderProps {
    onRecordingComplete: (file: File, durationSeconds: number) => void;
    disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
    onRecordingComplete,
    disabled = false
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (mediaRecorderRef.current && isRecording) {
                mediaRecorderRef.current.stop();
            }
        };
    }, [audioUrl, isRecording]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);

                const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
                setAudioFile(file);

                // Let parent know
                onRecordingComplete(file, recordingTime);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = window.setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Failed to access microphone:', err);
            alert('Failed to access microphone. Please ensure permissions are granted.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            // Stop all tracks to release mic
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const deleteRecording = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(null);
        setAudioFile(null);
        setRecordingTime(0);
    };

    const togglePlayback = () => {
        if (!audioElementRef.current) return;

        if (isPlaying) {
            audioElementRef.current.pause();
        } else {
            audioElementRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (audioUrl) {
        return (
            <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <button
                    type="button"
                    onClick={togglePlayback}
                    className="p-3 bg-white text-amber-600 rounded-full shadow-sm hover:shadow active:scale-95 transition-all"
                >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Audio Note</span>
                        <span className="text-xs text-gray-500 font-mono">{formatTime(recordingTime)}</span>
                    </div>
                    <audio
                        ref={audioElementRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                    />
                    {/* A simple placeholder for waveform */}
                    <div className="h-6 w-full bg-gray-200 rounded overflow-hidden flex items-center px-1">
                        <div className="h-2 w-full bg-amber-200 rounded animate-pulse" />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={deleteRecording}
                    disabled={disabled}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-4 border border-dashed rounded-xl p-4 transition-colors
      ${isRecording ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-gray-300 bg-gray-50 text-gray-600'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}>
            <button
                type="button"
                disabled={disabled}
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-4 rounded-full shadow flex items-center justify-center transition-all active:scale-95
          ${isRecording
                        ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                        : 'bg-white text-amber-600 hover:bg-gray-50'
                    }`}
            >
                {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <div>
                <div className="font-medium">
                    {isRecording ? 'Recording...' : 'Record an audio note'}
                </div>
                <div className="text-sm font-mono opacity-80 mt-1">
                    {formatTime(recordingTime)}
                </div>
            </div>
        </div>
    );
};
