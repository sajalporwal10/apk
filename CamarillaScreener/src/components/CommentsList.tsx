// Comments List Component - Premium Elegant Theme

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StockData, StockComment } from '../types';

interface CommentItemData extends StockData {
    comment: StockComment;
}

interface CommentsListProps {
    stocksWithComments: CommentItemData[];
    onStockPress: (stock: StockData) => void;
}

export const CommentsList: React.FC<CommentsListProps> = ({
    stocksWithComments,
    onStockPress
}) => {
    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderCommentItem = ({ item }: { item: CommentItemData }) => (
        <TouchableOpacity
            style={styles.commentCard}
            onPress={() => onStockPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.ticker}>{item.ticker.replace('.NS', '')}</Text>
                    <Text style={styles.companyName} numberOfLines={1}>
                        {item.companyName || item.ticker.replace('.NS', '')}
                    </Text>
                </View>
                <View style={styles.rangeBadge}>
                    <Text style={styles.rangeText}>{item.pctRangeR3?.toFixed(2)}%</Text>
                </View>
            </View>

            <Text style={styles.commentText} numberOfLines={3}>
                {item.comment.comment}
            </Text>

            <View style={styles.cardFooter}>
                <View style={styles.sectorPill}>
                    <Text style={styles.sectorText}>{item.sector || 'Other'}</Text>
                </View>
                <Text style={styles.timestamp}>
                    {formatDate(item.comment.updatedAt)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (stocksWithComments.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyTitle}>No Notes Yet</Text>
                <Text style={styles.emptyText}>
                    Tap on any stock in the Screener{'\n'}and add your notes!
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={stocksWithComments}
            keyExtractor={(item) => item.ticker}
            renderItem={renderCommentItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
        />
    );
};

const styles = StyleSheet.create({
    listContent: {
        paddingVertical: 8,
        paddingBottom: 24,
    },
    commentCard: {
        backgroundColor: 'rgba(30, 25, 45, 0.95)',
        marginHorizontal: 16,
        marginVertical: 6,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(100, 80, 150, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    ticker: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    companyName: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 2,
        maxWidth: 200,
    },
    rangeBadge: {
        backgroundColor: 'rgba(0, 229, 255, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    rangeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#00E5FF',
    },
    commentText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        lineHeight: 20,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectorPill: {
        backgroundColor: 'rgba(179, 136, 255, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    sectorText: {
        fontSize: 11,
        color: '#B388FF',
        fontWeight: '600',
    },
    timestamp: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.4)',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        lineHeight: 22,
    },
});
