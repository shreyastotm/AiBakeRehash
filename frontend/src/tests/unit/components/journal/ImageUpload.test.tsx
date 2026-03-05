import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ImageUpload } from '../../../../components/journal/ImageUpload';

describe('ImageUpload', () => {
    it('renders the upload area correctly', () => {
        render(<ImageUpload images={[]} onFilesSelect={vi.fn()} />);
        expect(screen.getByText(/Click to upload/i)).toBeInTheDocument();
        expect(screen.getByText(/JPEG, PNG, WebP up to 10MB/i)).toBeInTheDocument();
    });

    it('displays validation error for unsupported file types', async () => {
        const onFilesSelect = vi.fn();
        render(<ImageUpload images={[]} onFilesSelect={onFilesSelect} />);

        const fileInput = screen.getByTestId('image-upload-input') || screen.getAllByRole('textbox', { hidden: true })[0] || document.querySelector('input[type="file"]') as HTMLInputElement;

        const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });

        Object.defineProperty(fileInput, 'files', {
            value: [file],
        });

        fireEvent.change(fileInput);

        await waitFor(() => {
            expect(screen.getByText(/Invalid format/i)).toBeInTheDocument();
        });
        expect(onFilesSelect).not.toHaveBeenCalled();
    });

    it('displays validation error for large files', async () => {
        const onFilesSelect = vi.fn();
        render(<ImageUpload images={[]} onFilesSelect={onFilesSelect} />);

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

        // Create a 11MB file
        const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
        const file = new File([largeContent], 'test.png', { type: 'image/png' });

        Object.defineProperty(fileInput, 'files', {
            value: [file],
        });

        fireEvent.change(fileInput);

        await waitFor(() => {
            expect(screen.getByText(/File too large/i)).toBeInTheDocument();
        });
        expect(onFilesSelect).not.toHaveBeenCalled();
    });

    it('calls onFilesSelect for valid files', async () => {
        const onFilesSelect = vi.fn();
        // Mock URL.createObjectURL since it's not available in JSDOM
        global.URL.createObjectURL = vi.fn(() => 'mock-url');

        render(<ImageUpload images={[]} onFilesSelect={onFilesSelect} />);

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['dummy image content'], 'test.png', { type: 'image/png' });

        Object.defineProperty(fileInput, 'files', {
            value: [file],
        });

        fireEvent.change(fileInput);

        await waitFor(() => {
            expect(onFilesSelect).toHaveBeenCalledWith([file]);
            expect(screen.getByText('Pending')).toBeInTheDocument();
        });
    });
});
