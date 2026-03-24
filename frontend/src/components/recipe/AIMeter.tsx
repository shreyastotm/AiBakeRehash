interface AIMeterProps {
    value: number;
    min: number;
    max: number;
    label: string;
    unit?: string;
    isSafe?: (val: number) => boolean;
    colorMap?: (val: number) => string;
}

export const AIMeter = ({ value, min, max, label, unit = '', isSafe, colorMap }: AIMeterProps) => {
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    const getColor = () => {
        if (colorMap) return colorMap(value);
        if (isSafe) return isSafe(value) ? 'bg-green-500' : 'bg-red-500';
        return 'bg-amber-500';
    };

    return (
        <div className="flex flex-col gap-1.5 w-full">
            <div className="flex justify-between items-end">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-tighter">{label}</span>
                <span className="text-sm font-bold text-gray-900">{(Number(value) || 0).toFixed(2)}{unit}</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden relative">
                <div
                    className={`h-full transition-all duration-1000 ease-out ${getColor()}`}
                    style={{ width: `${percentage}%` }}
                />
                {/* Safe zone indicator overlay if applicable */}
                <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                    <div className="h-full w-px bg-white/20" />
                    <div className="h-full w-px bg-white/20" />
                </div>
            </div>
        </div>
    );
};
