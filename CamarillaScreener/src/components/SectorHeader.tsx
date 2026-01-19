// Sector Header Component - Collapsible sector group header

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SectorHeaderProps {
    sector: string;
    count: number;
    isExpanded: boolean;
    onToggle: () => void;
}

export const SectorHeader: React.FC<SectorHeaderProps> = ({
    sector,
    count,
    isExpanded,
    onToggle
}) => {
    return (
        <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
            <LinearGradient
                colors={['rgba(100, 80, 150, 0.3)', 'rgba(60, 40, 100, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.container}
            >
                <View style={styles.leftSection}>
                    <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                    <Text style={styles.sectorName}>{sector}</Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(180, 136, 255, 0.3)',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    expandIcon: {
        fontSize: 10,
        color: '#B388FF',
    },
    sectorName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    countBadge: {
        backgroundColor: 'rgba(180, 136, 255, 0.3)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#B388FF',
    },
});
