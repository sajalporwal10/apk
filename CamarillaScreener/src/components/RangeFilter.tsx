// Custom Range Filter Component - Dual Slider with Presets

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface RangeFilterProps {
    minValue: number;
    maxValue: number;
    onRangeChange: (min: number, max: number) => void;
    absoluteMin?: number;
    absoluteMax?: number;
    step?: number;
    matchCount?: number;
}

type PresetType = 'under3' | 'under5' | 'under6.5' | 'custom';

export const RangeFilter: React.FC<RangeFilterProps> = ({
    minValue,
    maxValue,
    onRangeChange,
    absoluteMin = 0,
    absoluteMax = 10,
    step = 0.5,
    matchCount = 0
}) => {
    const [sliderWidth, setSliderWidth] = useState(0);
    const [activePreset, setActivePreset] = useState<PresetType>('custom');
    const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);

    // Determine active preset based on values
    const getActivePreset = useCallback((): PresetType => {
        if (minValue === 0 && maxValue === 3) return 'under3';
        if (minValue === 0 && maxValue === 5) return 'under5';
        if (minValue === 0 && maxValue === 6.5) return 'under6.5';
        return 'custom';
    }, [minValue, maxValue]);

    // Handle preset selection
    const handlePresetPress = (preset: PresetType) => {
        switch (preset) {
            case 'under3':
                onRangeChange(0, 3);
                break;
            case 'under5':
                onRangeChange(0, 5);
                break;
            case 'under6.5':
                onRangeChange(0, 6.5);
                break;
            case 'custom':
                // Reset to full range
                onRangeChange(0, 6.5);
                break;
        }
        setActivePreset(preset);
    };

    // Calculate position percentages
    const minPercent = ((minValue - absoluteMin) / (absoluteMax - absoluteMin)) * 100;
    const maxPercent = ((maxValue - absoluteMin) / (absoluteMax - absoluteMin)) * 100;

    // Handle layout change to get slider width
    const onLayout = (event: LayoutChangeEvent) => {
        setSliderWidth(event.nativeEvent.layout.width);
    };

    // Value from position
    const valueFromPosition = (x: number): number => {
        const percent = Math.max(0, Math.min(100, (x / sliderWidth) * 100));
        const rawValue = (percent / 100) * (absoluteMax - absoluteMin) + absoluteMin;
        // Round to step
        const steppedValue = Math.round(rawValue / step) * step;
        return Math.max(absoluteMin, Math.min(absoluteMax, steppedValue));
    };

    // Create pan responders for the handles
    const createPanResponder = (type: 'min' | 'max') => {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setIsDragging(type);
            },
            onPanResponderMove: (evt: GestureResponderEvent) => {
                const x = evt.nativeEvent.locationX + (type === 'min' ? minPercent * sliderWidth / 100 : maxPercent * sliderWidth / 100) - 12;
                const newValue = valueFromPosition(x);

                if (type === 'min') {
                    if (newValue < maxValue - step) {
                        onRangeChange(newValue, maxValue);
                        setActivePreset('custom');
                    }
                } else {
                    if (newValue > minValue + step) {
                        onRangeChange(minValue, newValue);
                        setActivePreset('custom');
                    }
                }
            },
            onPanResponderRelease: () => {
                setIsDragging(null);
            },
        });
    };

    const minPanResponder = createPanResponder('min');
    const maxPanResponder = createPanResponder('max');

    const currentPreset = getActivePreset();

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.label}>📏 Range Filter</Text>
                <Text style={styles.rangeValue}>{minValue.toFixed(1)}% - {maxValue.toFixed(1)}%</Text>
            </View>

            {/* Slider Track */}
            <View style={styles.sliderContainer} onLayout={onLayout}>
                {/* Background Track */}
                <View style={styles.track} />

                {/* Active Track */}
                <LinearGradient
                    colors={['#00E5FF', '#B388FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                        styles.activeTrack,
                        {
                            left: `${minPercent}%`,
                            width: `${maxPercent - minPercent}%`,
                        }
                    ]}
                />

                {/* Min Handle */}
                <View
                    style={[
                        styles.handleContainer,
                        { left: `${minPercent}%` }
                    ]}
                    {...minPanResponder.panHandlers}
                >
                    <LinearGradient
                        colors={['#00E5FF', '#B388FF']}
                        style={[
                            styles.handle,
                            isDragging === 'min' && styles.handleActive
                        ]}
                    />
                </View>

                {/* Max Handle */}
                <View
                    style={[
                        styles.handleContainer,
                        { left: `${maxPercent}%` }
                    ]}
                    {...maxPanResponder.panHandlers}
                >
                    <LinearGradient
                        colors={['#00E5FF', '#B388FF']}
                        style={[
                            styles.handle,
                            isDragging === 'max' && styles.handleActive
                        ]}
                    />
                </View>
            </View>

            {/* Scale Labels */}
            <View style={styles.scaleLabels}>
                <Text style={styles.scaleText}>0%</Text>
                <Text style={styles.scaleText}>2.5%</Text>
                <Text style={styles.scaleText}>5%</Text>
                <Text style={styles.scaleText}>7.5%</Text>
                <Text style={styles.scaleText}>10%</Text>
            </View>

            {/* Preset Chips */}
            <View style={styles.presetsContainer}>
                <TouchableOpacity
                    style={[styles.presetChip, currentPreset === 'under3' && styles.presetChipActive]}
                    onPress={() => handlePresetPress('under3')}
                >
                    <Text style={[styles.presetText, currentPreset === 'under3' && styles.presetTextActive]}>
                        Under 3%
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.presetChip, currentPreset === 'under5' && styles.presetChipActive]}
                    onPress={() => handlePresetPress('under5')}
                >
                    <Text style={[styles.presetText, currentPreset === 'under5' && styles.presetTextActive]}>
                        Under 5%
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.presetChip, currentPreset === 'under6.5' && styles.presetChipActive]}
                    onPress={() => handlePresetPress('under6.5')}
                >
                    <Text style={[styles.presetText, currentPreset === 'under6.5' && styles.presetTextActive]}>
                        Under 6.5%
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.presetChip, currentPreset === 'custom' && styles.presetChipActive]}
                    onPress={() => handlePresetPress('custom')}
                >
                    <Text style={[styles.presetText, currentPreset === 'custom' && styles.presetTextActive]}>
                        Custom {currentPreset === 'custom' ? '✓' : ''}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Match Count */}
            <View style={styles.matchContainer}>
                <Text style={styles.matchText}>
                    <Text style={styles.matchCount}>{matchCount}</Text> stocks match this filter
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(13, 11, 18, 0.6)',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.6)',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    rangeValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#00E5FF',
    },
    sliderContainer: {
        height: 40,
        justifyContent: 'center',
        marginBottom: 4,
    },
    track: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
    },
    activeTrack: {
        position: 'absolute',
        height: 6,
        borderRadius: 3,
    },
    handleContainer: {
        position: 'absolute',
        width: 28,
        height: 28,
        marginLeft: -14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    handle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 3,
        borderColor: '#0d0b12',
        shadowColor: '#00E5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
    },
    handleActive: {
        transform: [{ scale: 1.15 }],
        shadowOpacity: 0.8,
        shadowRadius: 12,
    },
    scaleLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 2,
    },
    scaleText: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.3)',
    },
    presetsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    presetChip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    presetChipActive: {
        backgroundColor: 'rgba(0, 229, 255, 0.15)',
        borderColor: '#00E5FF',
        shadowColor: '#00E5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
    },
    presetText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
    },
    presetTextActive: {
        color: '#00E5FF',
    },
    matchContainer: {
        alignItems: 'center',
    },
    matchText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.4)',
    },
    matchCount: {
        color: '#00E5FF',
        fontWeight: '700',
        fontSize: 14,
    },
});
