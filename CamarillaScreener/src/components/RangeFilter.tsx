// Custom Range Filter Component - Compact Design with Collapsible Slider

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
    const [isExpanded, setIsExpanded] = useState(false);
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
                setIsExpanded(true);
                break;
        }
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
                const x = evt.nativeEvent.locationX + (type === 'min' ? minPercent * sliderWidth / 100 : maxPercent * sliderWidth / 100) - 10;
                const newValue = valueFromPosition(x);

                if (type === 'min') {
                    if (newValue < maxValue - step) {
                        onRangeChange(newValue, maxValue);
                    }
                } else {
                    if (newValue > minValue + step) {
                        onRangeChange(minValue, newValue);
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
            {/* Compact Header with Presets */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.label}>📏</Text>
                    <Text style={styles.rangeValue}>{minValue.toFixed(1)}%-{maxValue.toFixed(1)}%</Text>
                    <Text style={styles.matchCount}>({matchCount})</Text>
                </View>
                <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setIsExpanded(!isExpanded)}
                >
                    <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>
            </View>

            {/* Preset Chips - Always Visible */}
            <View style={styles.presetsContainer}>
                <TouchableOpacity
                    style={[styles.presetChip, currentPreset === 'under3' && styles.presetChipActive]}
                    onPress={() => handlePresetPress('under3')}
                >
                    <Text style={[styles.presetText, currentPreset === 'under3' && styles.presetTextActive]}>
                        🔥 &lt;3%
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.presetChip, currentPreset === 'under5' && styles.presetChipActive]}
                    onPress={() => handlePresetPress('under5')}
                >
                    <Text style={[styles.presetText, currentPreset === 'under5' && styles.presetTextActive]}>
                        &lt;5%
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.presetChip, currentPreset === 'under6.5' && styles.presetChipActive]}
                    onPress={() => handlePresetPress('under6.5')}
                >
                    <Text style={[styles.presetText, currentPreset === 'under6.5' && styles.presetTextActive]}>
                        &lt;6.5%
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.presetChip, currentPreset === 'custom' && styles.presetChipActive]}
                    onPress={() => handlePresetPress('custom')}
                >
                    <Text style={[styles.presetText, currentPreset === 'custom' && styles.presetTextActive]}>
                        ⚙️ Custom
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Expandable Slider Section */}
            {isExpanded && (
                <View style={styles.sliderSection}>
                    <View style={styles.sliderContainer} onLayout={onLayout}>
                        <View style={styles.track} />
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
                        <View
                            style={[styles.handleContainer, { left: `${minPercent}%` }]}
                            {...minPanResponder.panHandlers}
                        >
                            <LinearGradient
                                colors={['#00E5FF', '#B388FF']}
                                style={[styles.handle, isDragging === 'min' && styles.handleActive]}
                            />
                        </View>
                        <View
                            style={[styles.handleContainer, { left: `${maxPercent}%` }]}
                            {...maxPanResponder.panHandlers}
                        >
                            <LinearGradient
                                colors={['#00E5FF', '#B388FF']}
                                style={[styles.handle, isDragging === 'max' && styles.handleActive]}
                            />
                        </View>
                    </View>
                    <View style={styles.scaleLabels}>
                        <Text style={styles.scaleText}>0%</Text>
                        <Text style={styles.scaleText}>5%</Text>
                        <Text style={styles.scaleText}>10%</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(13, 11, 18, 0.6)',
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    label: {
        fontSize: 14,
    },
    rangeValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#00E5FF',
    },
    matchCount: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.4)',
    },
    expandButton: {
        padding: 4,
    },
    expandIcon: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    presetsContainer: {
        flexDirection: 'row',
        gap: 6,
    },
    presetChip: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    presetChipActive: {
        backgroundColor: 'rgba(0, 229, 255, 0.15)',
        borderColor: '#00E5FF',
    },
    presetText: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
    },
    presetTextActive: {
        color: '#00E5FF',
    },
    sliderSection: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    sliderContainer: {
        height: 28,
        justifyContent: 'center',
    },
    track: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
    },
    activeTrack: {
        position: 'absolute',
        height: 4,
        borderRadius: 2,
    },
    handleContainer: {
        position: 'absolute',
        width: 20,
        height: 20,
        marginLeft: -10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    handle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#0d0b12',
    },
    handleActive: {
        transform: [{ scale: 1.1 }],
    },
    scaleLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    scaleText: {
        fontSize: 9,
        color: 'rgba(255, 255, 255, 0.3)',
    },
});
