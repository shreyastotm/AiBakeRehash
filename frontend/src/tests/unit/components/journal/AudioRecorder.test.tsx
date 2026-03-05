import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioRecorder } from '../../../../components/journal/AudioRecorder';

// Mock MediaRecorder
class MockMediaRecorder {
    stream: any;
    state: string;
    ondataavailable: any;
    onstop: any;

    constructor(stream: any) {
        this.stream = stream;
        this.state = 'inactive';
    }

    start() {
        this.state = 'recording';
    }

    stop() {
        this.state = 'inactive';
        if (this.onstop) {
            this.onstop();
        }
    }
}

describe('AudioRecorder', () => {
    beforeEach(() => {
        // Mock getUserMedia
        Object.defineProperty(global.navigator, 'mediaDevices', {
            value: {
                getUserMedia: vi.fn().mockResolvedValue({
                    getTracks: () => [{ stop: vi.fn() }],
                }),
            },
            configurable: true,
        });

        // Mock MediaRecorder globally
        (global as any).MediaRecorder = MockMediaRecorder;

        // Mock URL
        global.URL.createObjectURL = vi.fn(() => 'mock-audio-url');
        global.URL.revokeObjectURL = vi.fn();
    });

    it('renders initial state correctly', () => {
        render(<AudioRecorder onRecordingComplete={vi.fn()} />);
        expect(screen.getByText('Record an audio note')).toBeInTheDocument();
        expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('starts recording when clicked', async () => {
        render(<AudioRecorder onRecordingComplete={vi.fn()} />);

        const recordButton = screen.getByRole('button');
        fireEvent.click(recordButton);

        await waitFor(() => {
            expect(screen.getByText('Recording...')).toBeInTheDocument();
        });
    });

    it('stops recording and calls onRecordingComplete', async () => {
        const onRecordingComplete = vi.fn();
        render(<AudioRecorder onRecordingComplete={onRecordingComplete} />);

        const recordButton = screen.getByRole('button');

        // Start
        fireEvent.click(recordButton);
        await waitFor(() => {
            expect(screen.getByText('Recording...')).toBeInTheDocument();
        });

        // Stop
        fireEvent.click(recordButton);

        await waitFor(() => {
            expect(onRecordingComplete).toHaveBeenCalled();
            expect(screen.getByText('Audio Note')).toBeInTheDocument();
        });
    });
});
