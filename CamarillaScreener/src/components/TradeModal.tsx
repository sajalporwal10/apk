// Trade Modal Component - Buy/Sell stocks

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StockData } from '../types';
import { Position } from '../types/trading';
import { formatCurrency } from '../services/trading';

interface TradeModalProps {
    visible: boolean;
    onClose: () => void;
    stock: StockData | null;
    position?: Position | null; // For selling existing position
    mode: 'BUY' | 'SELL';
    availableCash: number;
    onConfirm: (quantity: number, notes: string) => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({
    visible,
    onClose,
    stock,
    position,
    mode,
    availableCash,
    onConfirm,
}) => {
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');

    const price = mode === 'BUY'
        ? stock?.close || 0
        : position?.currentPrice || stock?.close || 0;

    const maxQuantity = mode === 'BUY'
        ? Math.floor(availableCash / price)
        : position?.quantity || 0;

    const totalValue = (parseInt(quantity) || 0) * price;
    const isValid = parseInt(quantity) > 0 && parseInt(quantity) <= maxQuantity;

    useEffect(() => {
        if (visible) {
            setQuantity('');
            setNotes('');
        }
    }, [visible]);

    const handleConfirm = () => {
        if (!isValid) {
            Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
            return;
        }
        onConfirm(parseInt(quantity), notes);
        onClose();
    };

    const ticker = stock?.ticker.replace('.NS', '') || position?.ticker.replace('.NS', '') || '';
    const companyName = stock?.companyName || position?.companyName || '';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.container}>
                    {/* Header */}
                    <LinearGradient
                        colors={mode === 'BUY' ? ['#00563F', '#003D2C'] : ['#5C1515', '#3D1010']}
                        style={styles.header}
                    >
                        <View>
                            <Text style={styles.modeText}>{mode} ORDER</Text>
                            <Text style={styles.ticker}>{ticker}</Text>
                            <Text style={styles.companyName}>{companyName}</Text>
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </LinearGradient>

                    {/* Price Info */}
                    <View style={styles.priceSection}>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Price</Text>
                            <Text style={styles.priceValue}>₹{price.toFixed(2)}</Text>
                        </View>
                        {mode === 'BUY' && stock?.r3 && stock?.s3 && (
                            <View style={styles.levelsRow}>
                                <Text style={styles.levelText}>🎯 R3: ₹{stock.r3.toFixed(0)}</Text>
                                <Text style={styles.levelText}>🛑 S3: ₹{stock.s3.toFixed(0)}</Text>
                            </View>
                        )}
                    </View>

                    {/* Quantity Input */}
                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>Quantity</Text>
                        <View style={styles.quantityRow}>
                            <TextInput
                                style={styles.quantityInput}
                                value={quantity}
                                onChangeText={setQuantity}
                                keyboardType="number-pad"
                                placeholder="0"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                            />
                            <TouchableOpacity
                                style={styles.maxButton}
                                onPress={() => setQuantity(maxQuantity.toString())}
                            >
                                <Text style={styles.maxButtonText}>MAX ({maxQuantity})</Text>
                            </TouchableOpacity>
                        </View>
                        {mode === 'BUY' && (
                            <Text style={styles.availableText}>
                                Available: {formatCurrency(availableCash)}
                            </Text>
                        )}
                    </View>

                    {/* Total Value */}
                    <View style={styles.totalSection}>
                        <Text style={styles.totalLabel}>Total Value</Text>
                        <Text style={styles.totalValue}>{formatCurrency(totalValue)}</Text>
                    </View>

                    {/* Notes Input */}
                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>Notes (Optional)</Text>
                        <TextInput
                            style={styles.notesInput}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Add a note about this trade..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            multiline
                        />
                    </View>

                    {/* Confirm Button */}
                    <TouchableOpacity
                        style={[styles.confirmButton, !isValid && styles.confirmButtonDisabled]}
                        onPress={handleConfirm}
                        disabled={!isValid}
                    >
                        <LinearGradient
                            colors={mode === 'BUY'
                                ? ['#00E676', '#00C853']
                                : ['#FF5252', '#D32F2F']}
                            style={styles.confirmGradient}
                        >
                            <Text style={styles.confirmText}>
                                {mode === 'BUY' ? '📈 Confirm Buy' : '📉 Confirm Sell'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#0d0b12',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
    },
    header: {
        padding: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    modeText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.7)',
        letterSpacing: 1,
    },
    ticker: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginTop: 4,
    },
    companyName: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    priceSection: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    priceValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#00E5FF',
    },
    levelsRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 8,
    },
    levelText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    inputSection: {
        padding: 16,
    },
    inputLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 8,
    },
    quantityRow: {
        flexDirection: 'row',
        gap: 10,
    },
    quantityInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 14,
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    maxButton: {
        backgroundColor: 'rgba(0, 229, 255, 0.15)',
        borderRadius: 12,
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 229, 255, 0.3)',
    },
    maxButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#00E5FF',
    },
    availableText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.4)',
        marginTop: 8,
        textAlign: 'right',
    },
    totalSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    totalLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    totalValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    notesInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        color: '#FFFFFF',
        minHeight: 60,
    },
    confirmButton: {
        margin: 16,
        borderRadius: 14,
        overflow: 'hidden',
    },
    confirmButtonDisabled: {
        opacity: 0.5,
    },
    confirmGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    confirmText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
