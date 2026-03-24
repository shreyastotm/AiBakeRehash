import React, { useState } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
}

export const Tooltip = ({ content, children }: TooltipProps) => {
    const [show, setShow] = useState(false);

    return (
        <div className="relative inline-block"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            onFocus={() => setShow(true)}
            onBlur={() => setShow(false)}
        >
            {children}
            {show && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl min-w-[200px] text-center leading-relaxed backdrop-blur-sm bg-opacity-90">
                    {content}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900 border-opacity-90"></div>
                </div>
            )}
        </div>
    );
};
