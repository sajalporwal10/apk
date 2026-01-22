// Search Bar Component - Premium Glass Effect Design

import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChangeText,
    placeholder = 'Search stocks by name or symbol...'
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    autoCapitalize="characters"
                    autoCorrect={false}
                />
                {value.length > 0 && (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => onChangeText('')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.clearText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(0, 229, 255, 0.25)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
        // Glow effect
        shadowColor: '#00E5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 3,
    },
    searchIcon: {
        fontSize: 16,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: '#FFFFFF',
        paddingVertical: 2,
    },
    clearButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
    },
});
