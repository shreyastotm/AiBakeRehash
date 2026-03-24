import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// Size-based page dimensions (in pts)
const dimensions = {
    small:  { width: 56.7,  height: 56.7  }, // 2 × 2 cm
    medium: { width: 85.05, height: 113.4  }, // 3 × 4 cm
    large:  { width: 141.75,height: 212.6  }, // 5 × 7.5 cm
};

// Per-size, how many characters of ingredient list to allow before truncating
const MAX_INGREDIENT_CHARS: Record<string, number> = {
    small:  60,
    medium: 180,
    large:  700,
};

// Per-size content rules
const SHOW_NUTRITION: Record<string, boolean> = { small: false, medium: true, large: true };
const SHOW_ALLERGENS: Record<string, boolean> = { small: false, medium: true, large: true };
const SHOW_CONTACT:   Record<string, boolean> = { small: false, medium: false, large: true };

interface FSSAIPDFLabelProps {
    data: {
        title: string;
        custom_product_name: string;
        brand_name: string;
        manufacturer_name: string;
        manufacturer_address: string;
        fssai_license: string;
        business_contact_number: string;
        show_percentages: boolean;
        ingredients_sorted: Array<{ display_name: string; quantity_grams: number }>;
        allergens: string[];
        nutrition: any;
        mrp: string;
        batch_no: string;
        mfg_date: string;
        expiry_days: string;
        size: 'small' | 'medium' | 'large';
    };
}

export const FSSAIPDFLabel: React.FC<FSSAIPDFLabelProps> = ({ data }) => {
    const {
        title, custom_product_name, brand_name, manufacturer_name,
        manufacturer_address, fssai_license, business_contact_number,
        show_percentages, ingredients_sorted, allergens, nutrition,
        mrp, batch_no, mfg_date, expiry_days, size,
    } = data;

    const { width, height } = dimensions[size];

    // Font scale per size
    const scale = size === 'small' ? 0.52 : size === 'medium' ? 0.82 : 1.0;
    const fs = (base: number) => Math.max(3.5, base * scale);

    // Padding per size
    const pad = size === 'small' ? 3 : size === 'medium' ? 5 : 8;

    // Build ingredient string, truncated to avoid overflow
    const totalWeight = ingredients_sorted.reduce((s, i) => s + (Number(i.quantity_grams) || 0), 0);
    const ingParts = ingredients_sorted.map(item => {
        const pct = show_percentages && totalWeight > 0 && size === 'large'
            ? ` (${((Number(item.quantity_grams) / totalWeight) * 100).toFixed(0)}%)`
            : '';
        return `${item.display_name}${pct}`;
    });

    const maxChars = MAX_INGREDIENT_CHARS[size];
    let ingText = ingParts.join(', ');
    if (ingText.length > maxChars) {
        ingText = ingText.slice(0, maxChars - 3) + '...';
    }

    // Limit allergens on small
    const allergenText = size === 'small'
        ? ''
        : allergens.length > 0
            ? `Contains: ${allergens.join(', ')}`
            : '';

    const styles = StyleSheet.create({
        page: {
            width, height,
            padding: pad,
            backgroundColor: '#fff',
            overflow: 'hidden',
        },
        outerBox: {
            border: '0.75pt solid #000',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: pad * 0.6,
        },
        // Header section
        header: { fontSize: fs(11), fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase', marginBottom: 2 },
        subHeader: { fontSize: fs(8.5), fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
        vegRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
        vegBox: {
            width: fs(8), height: fs(8),
            border: '0.5pt solid green',
            alignItems: 'center', justifyContent: 'center',
            marginRight: 3,
        },
        vegDot: { width: fs(5), height: fs(5), backgroundColor: 'green', borderRadius: fs(3) },
        vegText: { fontSize: fs(7), color: 'green', fontWeight: 'bold' },
        // Content
        sectionLabel: {
            fontSize: fs(7.5), fontWeight: 'bold',
            borderBottom: '0.5pt solid #555',
            marginTop: 2, marginBottom: 1,
            paddingBottom: 1,
        },
        bodyText: { fontSize: fs(7), lineHeight: 1.25, flexWrap: 'wrap' },
        allergenText: { fontSize: fs(6.5), fontWeight: 'bold', marginTop: 2, flexWrap: 'wrap' },
        // Nutrition table
        nutritionBox: { marginTop: 3, border: '0.5pt solid #ccc' },
        nutritionHeader: {
            fontSize: fs(7), fontWeight: 'bold',
            backgroundColor: '#f4f4f4', padding: 2, textAlign: 'center',
        },
        nutritionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 3, paddingVertical: 1 },
        nutritionLabel: { fontSize: fs(6.5) },
        nutritionValue: { fontSize: fs(6.5) },
        nutritionIndent: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 8, paddingHorizontal: 3 },
        // Footer — pushed to bottom
        footer: {
            marginTop: 'auto',
            borderTop: '0.5pt solid #000',
            paddingTop: 2,
        },
        footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
        footerText: { fontSize: fs(6.5) },
        fssaiRow: { marginTop: 1, alignItems: 'center' },
        fssaiText: { fontSize: fs(6), fontWeight: 'bold' },
    });

    const n = nutrition || {};
    const fmt = (v: any) => (Number(v) || 0).toFixed(1);

    return (
        <Document>
            <Page size={[width, height]} style={styles.page}>
                <View style={styles.outerBox}>
                    {/* Brand */}
                    {brand_name ? <Text style={styles.subHeader}>{brand_name}</Text> : null}

                    {/* Product name */}
                    <Text style={styles.header}>{custom_product_name || title}</Text>

                    {/* Veg icon — only if medium/large and we have space */}
                    {size !== 'small' && (
                        <View style={styles.vegRow}>
                            <View style={styles.vegBox}>
                                <View style={styles.vegDot} />
                            </View>
                            <Text style={styles.vegText}>VEGETARIAN</Text>
                        </View>
                    )}

                    {/* Ingredients */}
                    <Text style={styles.sectionLabel}>INGREDIENTS</Text>
                    <Text style={styles.bodyText}>{ingText}</Text>

                    {/* Allergens */}
                    {SHOW_ALLERGENS[size] && allergenText ? (
                        <Text style={styles.allergenText}>{allergenText}</Text>
                    ) : null}

                    {/* Nutrition table (medium and large only) */}
                    {SHOW_NUTRITION[size] && (
                        <View style={styles.nutritionBox}>
                            <Text style={styles.nutritionHeader}>NUTRITION INFORMATION (per 100g)</Text>
                            <View style={styles.nutritionRow}>
                                <Text style={styles.nutritionLabel}>Energy</Text>
                                <Text style={styles.nutritionValue}>{fmt(n.energy_kcal)} kcal</Text>
                            </View>
                            <View style={styles.nutritionRow}>
                                <Text style={styles.nutritionLabel}>Protein</Text>
                                <Text style={styles.nutritionValue}>{fmt(n.protein_g)} g</Text>
                            </View>
                            <View style={styles.nutritionRow}>
                                <Text style={styles.nutritionLabel}>Total Fat</Text>
                                <Text style={styles.nutritionValue}>{fmt(n.fat_g)} g</Text>
                            </View>
                            <View style={styles.nutritionRow}>
                                <Text style={styles.nutritionLabel}>Carbohydrates</Text>
                                <Text style={styles.nutritionValue}>{fmt(n.carbs_g)} g</Text>
                            </View>
                            <View style={styles.nutritionIndent}>
                                <Text style={styles.nutritionLabel}>of which Sugars</Text>
                                <Text style={styles.nutritionValue}>{fmt(n.sugar_g)} g</Text>
                            </View>
                            {size === 'large' && (
                                <>
                                    <View style={styles.nutritionIndent}>
                                        <Text style={styles.nutritionLabel}>  Added Sugars</Text>
                                        <Text style={styles.nutritionValue}>{fmt(n.added_sugar_g)} g</Text>
                                    </View>
                                    <View style={styles.nutritionRow}>
                                        <Text style={styles.nutritionLabel}>Dietary Fiber</Text>
                                        <Text style={styles.nutritionValue}>{fmt(n.fiber_g)} g</Text>
                                    </View>
                                </>
                            )}
                        </View>
                    )}

                    {/* Footer */}
                    <View style={styles.footer}>
                        {manufacturer_name ? (
                            <Text style={[styles.footerText, { fontWeight: 'bold' }]}>
                                Mfd. By: {manufacturer_name}
                            </Text>
                        ) : null}
                        {size !== 'small' && manufacturer_address ? (
                            <Text style={styles.footerText}>{manufacturer_address}</Text>
                        ) : null}
                        {SHOW_CONTACT[size] && business_contact_number ? (
                            <Text style={styles.footerText}>Care: {business_contact_number}</Text>
                        ) : null}

                        <View style={styles.footerRow}>
                            <Text style={styles.footerText}>MRP: ₹{mrp}</Text>
                            <Text style={styles.footerText}>Batch: {batch_no}</Text>
                        </View>
                        <View style={styles.footerRow}>
                            <Text style={styles.footerText}>Mfg: {mfg_date}</Text>
                            <Text style={styles.footerText}>Best Before: {expiry_days}d</Text>
                        </View>
                        {fssai_license ? (
                            <View style={styles.fssaiRow}>
                                <Text style={styles.fssaiText}>FSSAI Lic. No. {fssai_license}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </Page>
        </Document>
    );
};
