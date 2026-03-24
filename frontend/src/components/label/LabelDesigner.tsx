import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { recipeService } from '../../services/recipe.service';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { FSSAIPDFLabel } from './FSSAIPDFLabel';
import { useAuthStore } from '../../store/authStore';
import { X, Loader2, Download, Eye, EyeOff } from 'lucide-react';

interface LabelDesignerProps {
    recipeId: string;
    onClose: () => void;
}

export const LabelDesigner: React.FC<LabelDesignerProps> = ({ recipeId, onClose }) => {
    const { data: labelData, isLoading } = useQuery({
        queryKey: ['recipe-label', recipeId],
        queryFn: () => recipeService.getLabelData(recipeId),
    });

    const { user } = useAuthStore();
    const [showPreview, setShowPreview] = useState(true);

    const [form, setForm] = useState({
        mrp: '',
        batch_no: '',
        mfg_date: new Date().toISOString().split('T')[0],
        expiry_days: '7',
        size: 'medium' as 'small' | 'medium' | 'large',
        custom_product_name: '',
        brand_name: user?.business_brand_name || '',
        manufacturer_name: user?.business_manufacturer_name || '',
        manufacturer_address: user?.business_manufacturer_address || '',
        fssai_license: user?.business_fssai_license || '',
        business_contact_number: user?.business_contact_number || '',
        business_email_id: user?.business_email_id || '',
        show_percentages: false,
    });

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-2xl flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-4" />
                    <p className="text-gray-600">Preparing label data...</p>
                </div>
            </div>
        );
    }

    if (!labelData) return null;

    const fullData = { ...labelData, ...form };

    // Size descriptions
    const sizeDesc: Record<string, string> = {
        small:  '2×2 cm — Product name + ingredients + FSSAI only',
        medium: '3×4 cm — + allergens + basic nutrition',
        large:  '5×7.5 cm — Full label with all nutrition details',
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                {/* Header */}
                <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-amber-900">FSSAI Label Designer</h2>
                        <p className="text-sm text-amber-700">Customise and preview your product label</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowPreview(v => !v)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium hover:bg-amber-200 transition-colors"
                        >
                            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-amber-100 rounded-full transition-colors text-amber-900">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Body — side by side */}
                <div className={`flex-1 overflow-hidden flex ${showPreview ? 'flex-row' : 'flex-col'}`}>
                    {/* Form Panel */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 min-w-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Label Details */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 border-b pb-2">Label Details</h3>
                                <Input
                                    label="Custom Product Name"
                                    value={form.custom_product_name}
                                    onChange={(e) => setForm({ ...form, custom_product_name: e.target.value })}
                                    placeholder={labelData.title}
                                    hint="Leave blank to use recipe title"
                                />
                                <Input
                                    label="Brand Name"
                                    value={form.brand_name}
                                    onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
                                />
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <Input
                                            label="MRP (₹)"
                                            type="number"
                                            value={form.mrp}
                                            onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            label="Batch Number"
                                            value={form.batch_no}
                                            onChange={(e) => setForm({ ...form, batch_no: e.target.value })}
                                            placeholder="BATCH-001"
                                        />
                                    </div>
                                </div>
                                <Input
                                    label="Manufacturing Date"
                                    type="date"
                                    value={form.mfg_date}
                                    onChange={(e) => setForm({ ...form, mfg_date: e.target.value })}
                                />
                                <Input
                                    label="Best Before (Days)"
                                    type="number"
                                    value={form.expiry_days}
                                    onChange={(e) => setForm({ ...form, expiry_days: e.target.value })}
                                />
                            </div>

                            {/* Layout + Manufacturer */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 border-b pb-2">Label Size</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['small', 'medium', 'large'] as const).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setForm({ ...form, size: s })}
                                            className={`py-2 px-3 rounded-lg border text-sm capitalize transition-all ${
                                                form.size === s
                                                    ? 'border-amber-600 bg-amber-50 text-amber-900 font-semibold'
                                                    : 'border-gray-200 text-gray-600 hover:border-amber-300'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500">{sizeDesc[form.size]}</p>

                                <label className="flex items-center gap-2 cursor-pointer pt-2">
                                    <input
                                        type="checkbox"
                                        checked={form.show_percentages}
                                        onChange={(e) => setForm({ ...form, show_percentages: e.target.checked })}
                                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-600"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Show ingredient % (large size only)
                                    </span>
                                </label>

                                <div className="space-y-3 pt-4 border-t">
                                    <h3 className="font-semibold text-gray-900">Manufacturer Details</h3>
                                    <Input
                                        label="Manufacturer Name"
                                        value={form.manufacturer_name}
                                        onChange={(e) => setForm({ ...form, manufacturer_name: e.target.value })}
                                    />
                                    <Input
                                        label="Manufacturer Address"
                                        value={form.manufacturer_address}
                                        onChange={(e) => setForm({ ...form, manufacturer_address: e.target.value })}
                                    />
                                    <Input
                                        label="FSSAI License No."
                                        value={form.fssai_license}
                                        onChange={(e) => setForm({ ...form, fssai_license: e.target.value })}
                                    />
                                    <Input
                                        label="Customer Care Number"
                                        value={form.business_contact_number}
                                        onChange={(e) => setForm({ ...form, business_contact_number: e.target.value })}
                                    />
                                </div>

                                {/* Recipe summary */}
                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 mt-2">
                                    <p className="text-xs font-semibold text-blue-900 mb-1">Recipe Summary</p>
                                    <ul className="text-xs text-blue-800 space-y-0.5">
                                        <li>• {labelData.ingredients_sorted.length} ingredients</li>
                                        <li>• Allergens: {labelData.allergens.length > 0 ? labelData.allergens.join(', ') : 'None detected'}</li>
                                        <li>• Nutrition: {labelData.nutrition ? '✓ available' : '⚠ missing — calculate first'}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Live Preview Panel */}
                    {showPreview && (
                        <div className="w-80 shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col">
                            <div className="px-4 py-3 border-b border-gray-200 bg-white">
                                <p className="text-sm font-semibold text-gray-700">Live Preview</p>
                                <p className="text-xs text-gray-500">Updates as you type</p>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <PDFViewer
                                    width="100%"
                                    height="100%"
                                    showToolbar={false}
                                    style={{ border: 'none' }}
                                >
                                    <FSSAIPDFLabel data={fullData} />
                                </PDFViewer>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center shrink-0">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <PDFDownloadLink
                        document={<FSSAIPDFLabel data={fullData} />}
                        fileName={`${(labelData.title || 'label').replace(/\s+/g, '_')}_FSSAI_Label.pdf`}
                    >
                        {({ loading }) => (
                            <Button disabled={loading} className="gap-2">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                {loading ? 'Preparing...' : 'Download PDF'}
                            </Button>
                        )}
                    </PDFDownloadLink>
                </div>
            </div>
        </div>
    );
};
