// Stock Details Modal Component - Cyberpunk Theme with Comments

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
}

export const StockDetailsModal: React.FC<StockDetailsModalProps> = ({
    stock,
    visible,
    onClose,
    onCommentSaved
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
            Alert.alert('Saved!', 'Your comment has been saved.');
            onCommentSaved?.();
        } catch (error) {
            Alert.alert('Error', 'Could not save comment.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!stock) return null;

    const DataRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
        <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>{label}</Text>
            <Text style={[styles.dataValue, highlight && styles.highlightValue]}>{value}</Text>
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
                <LinearGradient
                    colors={['#1a0a2e', '#12142a', '#0d1b2a']}
                    style={styles.modalContainer}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.ticker}>{stock.ticker.replace('.NS', '')}</Text>
                            <Text style={styles.subtitle}>NSE • {stock.yearMonth}</Text>
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <LinearGradient
                                colors={['#FF00FF', '#00FFFF']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.closeButtonGradient}
                            >
                                <Text style={styles.closeText}>✕</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Range Analysis - Made prominent */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>🎯 Range Analysis</Text>
                            <LinearGradient
                                colors={['rgba(0, 255, 255, 0.15)', 'rgba(255, 0, 255, 0.15)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.rangeCard}
                            >
                                <Text style={styles.rangeLabel}>R3-S3 Range</Text>
                                <Text style={styles.rangeValue}>{stock.pctRangeR3?.toFixed(2)}%</Text>
                                <Text style={styles.rangeDescription}>
                                    {stock.pctRangeR3 && stock.pctRangeR3 < 2.5
                                        ? '🔥 Very tight consolidation - High breakout potential'
                                        : stock.pctRangeR3 && stock.pctRangeR3 < 4
                                            ? '📊 Moderate consolidation - Watch for breakout'
                                            : stock.pctRangeR3 && stock.pctRangeR3 < 5
                                                ? '📈 Good range - Potential opportunity'
                                                : '📉 Wider range - Less predictable'}
                                </Text>
                            </LinearGradient>
                        </View>

                        {/* OHLC Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📊 Monthly OHLC</Text>
                            <View style={styles.card}>
                                <DataRow label="Open" value={`₹${stock.open?.toLocaleString()}`} />
                                <DataRow label="High" value={`₹${stock.high?.toLocaleString()}`} />
                                <DataRow label="Low" value={`₹${stock.low?.toLocaleString()}`} />
                                <DataRow label="Close" value={`₹${stock.close?.toLocaleString()}`} />
                            </View>
                        </View>

                        {/* Camarilla Levels */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📈 Camarilla Levels</Text>
                            <View style={styles.card}>
                                <DataRow label="Resistance 3 (R3)" value={`₹${stock.r3?.toLocaleString()}`} highlight />
                                <DataRow label="Support 3 (S3)" value={`₹${stock.s3?.toLocaleString()}`} highlight />
                            </View>
                        </View>

                        {/* Comments Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>💬 Your Notes</Text>
                            <View style={styles.commentCard}>
                                <TextInput
                                    style={styles.commentInput}
                                    placeholder="Add your notes about this stock..."
                                    placeholderTextColor="rgba(255,255,255,0.4)"
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
                                        colors={['#00FFFF', '#FF00FF']}
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

                        {/* Formula Reference */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>🧮 Formula Reference</Text>
                            <View style={styles.formulaCard}>
                                <Text style={styles.formulaText}>R3 = Close + (High - Low) × 1.1 / 4</Text>
                                <Text style={styles.formulaText}>S3 = Close - (High - Low) × 1.1 / 4</Text>
                            </View>
                        </View>
                    </ScrollView>
                </LinearGradient>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '92%',
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 255, 0.4)',
        borderBottomWidth: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 255, 255, 0.2)',
    },
    ticker: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 2,
        textShadowColor: '#00FFFF',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
    },
    subtitle: {
        fontSize: 14,
        color: '#FF00FF',
        marginTop: 4,
        letterSpacing: 1,
    },
    closeButton: {
        borderRadius: 22,
        overflow: 'hidden',
        shadowColor: '#FF00FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 8,
    },
    closeButtonGradient: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        fontSize: 18,
        color: '#FFFFFF',
        fontWeight: '800',
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#00FFFF',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 14,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 255, 0.3)',
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 255, 255, 0.1)',
    },
    dataLabel: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    dataValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#E0E0E0',
    },
    highlightValue: {
        color: '#00FFFF',
        fontWeight: '700',
        textShadowColor: '#00FFFF',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
    },
    rangeCard: {
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(0, 255, 255, 0.4)',
    },
    rangeLabel: {
        fontSize: 14,
        color: '#FF00FF',
        marginBottom: 8,
        letterSpacing: 1,
    },
    rangeValue: {
        fontSize: 56,
        fontWeight: '800',
        color: '#00FFFF',
        textShadowColor: '#00FFFF',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    rangeDescription: {
        fontSize: 14,
        color: '#E0E0E0',
        marginTop: 16,
        textAlign: 'center',
        lineHeight: 22,
    },
    commentCard: {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 255, 0.3)',
    },
    commentInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 16,
        color: '#FFFFFF',
        fontSize: 15,
        minHeight: 100,
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 255, 0.3)',
        marginBottom: 12,
    },
    saveButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonGradient: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    formulaCard: {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 255, 0.3)',
    },
    formulaText: {
        fontSize: 14,
        fontFamily: 'monospace',
        color: '#FF00FF',
        paddingVertical: 6,
        letterSpacing: 0.5,
    },
});
