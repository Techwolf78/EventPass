import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

interface AnimatedSplashProps {
  onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(30)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // 1. Logo fades in and scales up with a spring effect
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),

      // 2. App name slides up and fades in
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),

      // 3. Tagline appears
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // 4. Hold for a moment
      // 4. Hold for a moment
      Animated.delay(300), // ← 1.8 seconds

      // 5. Fade everything out
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });

    // Continuous subtle pulse on the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: overlayOpacity }]}>
      {/* Background gradient effect using overlapping views */}
      <View style={styles.bgGradient1} />
      <View style={styles.bgGradient2} />

      {/* Glow effect behind logo */}
      <Animated.View style={[styles.glowCircle, { opacity: glowOpacity }]} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: Animated.multiply(logoScale, pulseAnim) }],
          },
        ]}
      >
        <Image
          source={require("../assets/images/shortlogo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* App Name */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.appName}>
          Gryphon <Text style={styles.appNameAccent}>Academy</Text>
        </Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View
        style={{
          opacity: taglineOpacity,
          transform: [{ translateY: taglineTranslateY }],
        }}
      >
        <Text style={styles.tagline}>Powering Seamless Event Operations</Text>
        <Text style={styles.subtagline}>Scan • Verify • Manage</Text>
      </Animated.View>

      {/* Bottom decoration dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: taglineOpacity,
                backgroundColor:
                  i === 1 ? "#60A5FA" : "rgba(96, 165, 250, 0.3)",
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  bgGradient1: {
    position: "absolute",
    top: -height * 0.3,
    right: -width * 0.3,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  bgGradient2: {
    position: "absolute",
    bottom: -height * 0.2,
    left: -width * 0.2,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: "rgba(139, 92, 246, 0.06)",
  },
  glowCircle: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: "#01224E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  logo: {
    width: 72,
    height: 72,
  },
  textContainer: {
    marginBottom: 20,
  },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
    textAlign: "center",
  },
  appNameAccent: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  tagline: {
    fontSize: 10,
    color: "rgba(148, 163, 184, 0.6)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 6,
    fontWeight: "600",
  },
  subtagline: {
    fontSize: 9,
    color: "rgba(96, 165, 250, 0.7)",
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 6,
    fontWeight: "700",
  },
  dotsContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 80,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
