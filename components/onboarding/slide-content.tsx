import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useCallback, useEffect, useRef, useState } from 'react';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery } from 'convex/react';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { SharedValue } from 'react-native-reanimated';

type SlideData = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
};

const slides: SlideData[] = [
  {
    icon: 'account-balance-wallet',
    title: 'Welcome to Coin Expo',
    subtitle:
      'The simplest way to send and receive USDC. No complicated crypto jargon, no gas fees to worry about.',
  },
  {
    icon: 'send',
    title: 'Pay Anyone, Instantly',
    subtitle:
      "Send USDC to any email address or scan a QR code. It's as easy as sending a text message.",
  },
  {
    icon: 'alternate-email',
    title: 'Choose Your Username',
    subtitle: 'Pick a unique @username so friends can pay you easily.',
  },
];

type SlideContentProps = {
  activeIndex: SharedValue<number>;
  onAvailableUsernameChange?: (username: string | null) => void;
  onAvatarStorageId?: (storageId: string | null) => void;
  walletAddress?: string | null;
  cdpUserId?: string | null;
  saving?: boolean;
};

export const SlideContent: React.FC<SlideContentProps> = ({
  activeIndex,
  onAvailableUsernameChange,
  onAvatarStorageId,
  walletAddress,
  cdpUserId,
  saving,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const tintColor = Colors[colorScheme].tint;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [usernameInput, setUsernameInput] = useState('');
  const [debouncedUsername, setDebouncedUsername] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const availability = useQuery(
    api.users.checkUsernameAvailable,
    !saving && debouncedUsername.length >= 3 ? { username: debouncedUsername } : 'skip',
  );

  const updateSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  useAnimatedReaction(
    () => activeIndex.get(),
    (index) => {
      scheduleOnRN(updateSlide, index);
    },
  );

  const rFadeStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(1, { duration: 300 }),
    };
  });

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedUsername(usernameInput);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [usernameInput]);

  useEffect(() => {
    if (availability?.available) {
      onAvailableUsernameChange?.(debouncedUsername);
    } else {
      onAvailableUsernameChange?.(null);
    }
  }, [availability, debouncedUsername, onAvailableUsernameChange]);

  const handleAvatarPress = async () => {
    if (!cdpUserId || !walletAddress) return;

    try {
      const ImagePicker = await import('expo-image-picker');
      const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access in Settings to upload an avatar.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (result.canceled) return;

      setAvatarUploading(true);
      const asset = result.assets[0];

      const resized = await manipulateAsync(
        asset.uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.8, format: SaveFormat.JPEG },
      );

      setAvatarUri(resized.uri);

      const uploadUrl = await generateUploadUrl();

      const response = await fetch(resized.uri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const { storageId } = await uploadResponse.json();
      onAvatarStorageId?.(storageId);
    } catch (error) {
      Alert.alert('Error', 'Failed to upload avatar.');
      console.error(error);
      setAvatarUri(null);
      onAvatarStorageId?.(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  const slide = slides[currentSlide]!;

  if (currentSlide === 2) {
    return (
      <Animated.View style={[styles.container, rFadeStyle]}>
        <TouchableOpacity
          onPress={handleAvatarPress}
          disabled={avatarUploading}
          style={styles.avatarTouchable}
        >
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <MaterialIcons name="person" size={40} color="#fff" />
            )}
            {avatarUploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            )}
          </View>
          <View style={styles.cameraIconContainer}>
            <MaterialIcons name="camera-alt" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          {slide.title}
        </ThemedText>
        <ThemedText style={styles.subtitle}>{slide.subtitle}</ThemedText>
        <View style={styles.inputRow}>
          <ThemedText style={styles.atSymbol}>@</ThemedText>
          <TextInput
            style={[styles.input, { color: Colors[colorScheme].text }]}
            placeholder="username"
            placeholderTextColor={Colors[colorScheme].text + '66'}
            autoCapitalize="none"
            autoCorrect={false}
            value={usernameInput}
            onChangeText={setUsernameInput}
          />
        </View>
        {usernameInput.length > 0 && !saving && (
          <View style={styles.statusRow}>
            {debouncedUsername !== usernameInput ? (
              <ThemedText style={styles.checkingText}>Checking...</ThemedText>
            ) : availability === undefined ? (
              <ThemedText style={styles.checkingText}>Checking...</ThemedText>
            ) : availability.available ? (
              <>
                <MaterialIcons name="check-circle" size={16} color="#34C759" />
                <ThemedText style={styles.availableText}>
                  @{debouncedUsername} is available!
                </ThemedText>
              </>
            ) : (
              <>
                <MaterialIcons name="cancel" size={16} color="#FF3B30" />
                <ThemedText style={styles.unavailableText}>
                  {availability.error}
                </ThemedText>
              </>
            )}
          </View>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, rFadeStyle]}>
      <View style={styles.iconContainer}>
        <MaterialIcons name={slide.icon} size={64} color={tintColor} />
      </View>
      <ThemedText type="title" style={styles.title}>
        {slide.title}
      </ThemedText>
      <ThemedText style={styles.subtitle}>{slide.subtitle}</ThemedText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  atSymbol: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Segment-Bold',
    marginRight: 4,
  },
  availableText: {
    color: '#34C759',
    fontSize: 14,
    fontFamily: 'Segment-Medium',
    marginLeft: 6,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 80,
  },
  avatarImage: {
    borderRadius: 40,
    height: 80,
    width: 80,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 40,
    justifyContent: 'center',
  },
  avatarTouchable: {
    marginBottom: 16,
  },
  cameraIconContainer: {
    alignItems: 'center',
    backgroundColor: '#008CFF',
    borderColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    bottom: 0,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 24,
  },
  checkingText: {
    fontSize: 14,
    fontFamily: 'Segment-Medium',
    opacity: 0.5,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  input: {
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    flex: 1,
    fontSize: 20,
    fontFamily: 'Segment-Medium',
    paddingVertical: 8,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 24,
    width: '100%',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  subtitle: {
    lineHeight: 22,
    opacity: 0.7,
    textAlign: 'center',
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  unavailableText: {
    color: '#FF3B30',
    fontSize: 14,
    fontFamily: 'Segment-Medium',
    marginLeft: 6,
  },
});
