// Stock Details Modal Component - Premium Elegant Theme

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StockData } from '../types';
import { saveComment, getComment } from '../services/storage';

interface StockDetailsModalProps {
    stock: StockData | null;
    visible: boolean;
    onClose: () => void;
    onCommentSaved?: () => void;
    onBuyPress?: (stock: StockData) => void;
}

export const StockDetailsModal: React.FC<StockDetailsModalProps> = ({
    stock,
    visible,
    onClose,
    onCommentSaved,
    onBuyPress
}) => {
    const [comment, setComment] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (stock && visible) {
            loadExistingComment();
        }
    }, [stock, visible]);

    const loadExistingComment = async () => {
        if (!stock) return;
        const existing = await getComment(stock.ticker);
        if (existing) {
            setComment(existing.comment);
        } else {
            setComment('');
        }
    };

    const handleSaveComment = async () => {
        if (!stock) return;
        setIsSaving(true);
        try {
            await saveComment(stock.ticker, comment);
            Alert.alert('Saved!', 'Your note has been saved.');
            onCommentSaved?.();
        } catch (error) {
            Alert.alert('Error', 'Could not save note.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!stock) return null;

    // Calculate range progress (0-6.5% maps to 0-100%)
    const rangeProgress = stock.pctRangeR3
        ? Math.min((stock.pctRangeR3 / 6.5) * 100, 100)
        : 0;

    const DataRow = ({ label, value }: { label: string; value: string }) => (
        <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>{label}</Text>
            <Text style={styles.dataValue}>{value}</Text>
        </View>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <LinearGradient
                        colors={['#1a1625', '#13111a']}
                        style={styles.header}
                    >
                        <View style={styles.headerContent}>
                            <View>
                                <Text style={styles.ticker}>{stock.ticker.replace('.NS', '')}</Text>
                                <Text style={styles.companyName} numberOfLines={1}>
                                    {stock.companyName || stock.ticker.replace('.NS', '')}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Text style={styles.closeText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.sectorBadge}>
                            <Text style={styles.sectorText}>{stock.sector || 'Other'}</Text>
                        </View>
                    </LinearGradient>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Range Analysis Card */}
                        <View style={styles.rangeCard}>
                            <View style={styles.rangeHeader}>
                                <Text style={styles.rangeTitle}>R3-S3 Range</Text>
                                <Text style={styles.rangeValue}>{stock.pctRangeR3?.toFixed(2)}%</Text>
                            </View>
                            <View style={styles.progressBackground}>
                                <LinearGradient
                                    colors={['#00E5FF', '#B388FF']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.progressBar, { width: `${rangeProgress}%` }]}
                                />
                            </View>
                            <Text style={styles.rangeDescription}>
                                {stock.pctRangeR3 && stock.pctRangeR3 < 2.5
                                    ? '🔥 Very tight - High breakout potential'
                                    : stock.pctRangeR3 && stock.pctRangeR3 < 4
                                        ? '📊 Moderate - Watch for breakout'
                                        : stock.pctRangeR3 && stock.pctRangeR3 < 5
                                            ? '📈 Good range - Potential opportunity'
                                            : '📉 Wider range'}
                            </Text>
                        </View>

                        {/* Price Levels */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Camarilla Levels</Text>
                            <View style={styles.levelsRow}>
                                <View style={styles.levelCard}>
                                    <Text style={styles.levelLabel}>R3</Text>
                                    <Text style={styles.levelValue}>₹{stock.r3?.toLocaleString()}</Text>
                                </View>
                                <View style={styles.levelCard}>
                                    <Text style={styles.levelLabel}>S3</Text>
                                    <Text style={styles.levelValue}>₹{stock.s3?.toLocaleString()}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Buy Button */}
                        {onBuyPress && (
                            <TouchableOpacity
                                style={styles.buyButtonContainer}
                                onPress={() => onBuyPress(stock)}
                            >
                                <LinearGradient
                                    colors={['#00E676', '#00C853']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.buyButtonGradient}
                                >
                                    <Text style={styles.buyButtonText}>📈 Paper Trade - Buy</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {/* OHLC Data */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Monthly OHLC • {stock.yearMonth}</Text>
                            <View style={styles.card}>
                                <DataRow label="Open" value={`₹${stock.open?.toLocaleString()}`} />
                                <DataRow label="High" value={`₹${stock.high?.toLocaleString()}`} />
                                <DataRow label="Low" value={`₹${stock.low?.toLocaleString()}`} />
                                <DataRow label="Close" value={`₹${stock.close?.toLocaleString()}`} />
                            </View>
                        </View>

                        {/* Notes Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Your Notes</Text>
                            <View style={styles.notesCard}>
                                <TextInput
                                    style={styles.notesInput}
                                    placeholder="Add your notes about this stock..."
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={comment}
                                    onChangeText={setComment}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                                <TouchableOpacity
                                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                                    onPress={handleSaveComment}
                                    disabled={isSaving}
                                >
                                    <LinearGradient
                                        colors={['#00E5FF', '#B388FF']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.saveButtonGradient}
                                    >
                                        <Text style={styles.saveButtonText}>
                                            {isSaving ? 'Saving...' : '💾 Save Note'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
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
    modalContainer: {
        backgroundColor: '#0d0b12',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '92%',
    },
    header: {
        padding: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    ticker: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    companyName: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 2,
        maxWidth: 250,
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
    sectorBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(179, 136, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 12,
    },
    sectorText: {
        fontSize: 12,
        color: '#B388FF',
        fontWeight: '600',
    },
    content: {
        padding: 20,
    },
    rangeCard: {
        backgroundColor: 'rgba(30, 25, 45, 0.8)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 229, 255, 0.2)',
    },
    rangeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    rangeTitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    rangeValue: {
        fontSize: 32,
        fontWeight: '700',
        color: '#00E5FF',
    },
    progressBackground: {
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    rangeDescription: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    levelsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    levelCard: {
        flex: 1,
        backgroundColor: 'rgba(30, 25, 45, 0.8)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    levelLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 4,
    },
    levelValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#00E5FF',
    },
    card: {
        backgroundColor: 'rgba(30, 25, 45, 0.8)',
        borderRadius: 12,
        padding: 16,
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    dataLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    dataValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    notesCard: {
        backgroundColor: 'rgba(30, 25, 45, 0.8)',
        borderRadius: 12,
        padding: 16,
    },
    notesInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 10,
        padding: 14,
        color: '#FFFFFF',
        fontSize: 14,
        minHeight: 100,
        marginBottom: 12,
    },
    saveButton: {
        borderRadius: 10,
        overflow: 'hidden',
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonGradient: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    buyButtonContainer: {
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    buyButtonGradient: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    buyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
