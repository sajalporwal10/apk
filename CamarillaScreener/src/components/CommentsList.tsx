// Comments List Component - Cyberpunk Theme

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
                <Text style={styles.ticker}>{item.ticker.replace('.NS', '')}</Text>
                <View style={styles.rangeBadge}>
                    <Text style={styles.rangeText}>{item.pctRangeR3?.toFixed(2)}%</Text>
                </View>
            </View>
            <Text style={styles.commentText} numberOfLines={3}>
                {item.comment.comment}
            </Text>
            <Text style={styles.timestamp}>
                📝 Updated: {formatDate(item.comment.updatedAt)}
            </Text>
        </TouchableOpacity>
    );

    if (stocksWithComments.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyTitle}>No Notes Yet</Text>
                <Text style={styles.emptyText}>
                    Tap on any stock in the Screener tab and add your notes!
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
        backgroundColor: 'rgba(26, 10, 46, 0.9)',
        marginHorizontal: 16,
        marginVertical: 6,
        padding: 18,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 0, 255, 0.4)',
        shadowColor: '#FF00FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    ticker: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 1,
        textShadowColor: '#00FFFF',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    rangeBadge: {
        backgroundColor: 'rgba(0, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 255, 0.5)',
    },
    rangeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#00FFFF',
    },
    commentText: {
        fontSize: 15,
        color: '#E0E0E0',
        lineHeight: 22,
        marginBottom: 12,
    },
    timestamp: {
        fontSize: 12,
        color: '#FF00FF',
        opacity: 0.8,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 80,
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 12,
        textShadowColor: '#FF00FF',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    emptyText: {
        fontSize: 15,
        color: '#00FFFF',
        textAlign: 'center',
        lineHeight: 24,
        opacity: 0.8,
    },
});
