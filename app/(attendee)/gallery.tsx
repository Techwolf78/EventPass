import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { getCandidateByEmail, getCandidateByQRToken } from "@/utils/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MASTERCLASS_IMAGES = [
  "https://res.cloudinary.com/dcjmaapvi/image/upload/v1779695056/qcdt0wcf7rbeozyghcde.jpg",
  "https://res.cloudinary.com/dcjmaapvi/image/upload/v1779695057/vuxdh5wtchibvorkmpj1.jpg",
  "https://res.cloudinary.com/dcjmaapvi/image/upload/v1779695056/z7auygqaksylfdo0gynr.jpg",
  "https://res.cloudinary.com/dcjmaapvi/image/upload/v1779695057/qaihoz5thtqumvymia6b.jpg",
  "https://res.cloudinary.com/dcjmaapvi/image/upload/v1779695056/hxnqmmoay9rptpzaesr5.jpg",
  "https://res.cloudinary.com/dcjmaapvi/image/upload/v1779695057/uakubwnfcjkc1yheerq6.jpg",
  "https://res.cloudinary.com/dcjmaapvi/image/upload/v1779695056/qnnnwwy0qekoby0qfxrj.jpg",
];

const EVENT_IMAGES = [
  require("../../assets/images/sns/banner-1.jpg"),
  require("../../assets/images/sns/pratapsir.jpg"),
  require("../../assets/images/sns/banner-3.jpg"),
  require("../../assets/images/sns/banner-4.jpg"),
  require("../../assets/images/sns/guest.jpg"),
  require("../../assets/images/sns/ummimam.jpg"),
  require("../../assets/images/sns/ummimamstage.jpg"),
];

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [enrollmentType, setEnrollmentType] = React.useState<
    "masterclass" | "event"
  >("event");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchEnrollment = React.useCallback(async () => {
    try {
      let token = await AsyncStorage.getItem("guestQrToken");
      let candidateData = null;

      if (token) {
        candidateData = await getCandidateByQRToken(token);
      } else if (user?.email) {
        candidateData = await getCandidateByEmail(user.email);
      }

      if (candidateData) {
        setEnrollmentType(
          (candidateData.enrollmentType as "masterclass" | "event") || "event",
        );
      }
    } catch (error) {
      console.error("Error fetching enrollment type:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchEnrollment();
  }, [fetchEnrollment]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchEnrollment();
    setRefreshing(false);
  }, [fetchEnrollment]);

  const [selectedImage, setSelectedImage] = React.useState<any>(null);
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    if (!selectedImage) return;
    setDownloading(true);
    try {
      let uri = "";
      if (typeof selectedImage === "string") {
        uri = selectedImage;
      } else if (
        selectedImage &&
        typeof selectedImage === "object" &&
        selectedImage.uri
      ) {
        uri = selectedImage.uri;
      } else {
        const resolved = Image.resolveAssetSource(selectedImage);
        if (resolved && resolved.uri) {
          uri = resolved.uri;
        }
      }

      if (!uri) {
        Alert.alert("Error", "Could not resolve image source.");
        return;
      }

      // Web Download Support
      if (Platform.OS === "web") {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `event_pass_image_${Date.now()}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
          Alert.alert("Success", "Image download started!");
        } catch (webError) {
          // Fallback if fetch fails (e.g. CORS on remote URLs)
          window.open(uri, "_blank");
          Alert.alert("Notice", "Image opened in a new tab for download.");
        }
        return;
      }

      let hasPermission = false;
      if (Platform.OS === 'android' && Number(Platform.Version) >= 29) {
        hasPermission = true;
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync(false, [
          "photo",
        ]);
        hasPermission = status === 'granted';
      }

      if (!hasPermission) {
        Alert.alert(
          "Permission Denied",
          "We need storage permissions to save images to your gallery.",
        );
        return;
      }

      const filename = `event_pass_image_${Date.now()}.jpg`;
      const localFileUri = `${FileSystem.cacheDirectory}${filename}`;

      if (uri.startsWith("http://") || uri.startsWith("https://")) {
        const downloadResult = await FileSystem.downloadAsync(
          uri,
          localFileUri,
        );
        uri = downloadResult.uri;
      } else {
        await FileSystem.copyAsync({
          from: uri,
          to: localFileUri,
        });
        uri = localFileUri;
      }

      const asset = await MediaLibrary.createAssetAsync(uri);
      try {
        await MediaLibrary.createAlbumAsync("Event Highlights", asset, false);
      } catch {
        // Fallback if album creation fails
      }

      Alert.alert("Success", "Image saved to your gallery!");
    } catch (error: any) {
      console.error("Save image error:", error);
      Alert.alert("Error", `Failed to save image: ${error.message || error}`);
    } finally {
      setDownloading(false);
    }
  };

  const images =
    enrollmentType === "masterclass" ? MASTERCLASS_IMAGES : EVENT_IMAGES;
  const eventTitle =
    enrollmentType === "masterclass" ? "Gryphon Academy's\nMasterclass 3.0" : "Gryphon Academy's\nSynergy Sphere 2.0";
  const pastEventTitle =
    enrollmentType === "masterclass" ? "Gryphon Academy's Masterclass 3.0" : "Gryphon Academy's Synergy Sphere 1.0";

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-4 text-slate-500 font-bold">
          Curating your memories...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="mb-8">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-3xl font-black text-slate-900 tracking-tight">
                {eventTitle}
              </Text>
              <Text className="text-slate-500 font-bold mt-0.5">
                Past event highlights
              </Text>
            </View>
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
              onPress={() => {
                console.log(
                  "Back button pressed. Redirecting to /(attendee)/qr-pass",
                );
                router.replace("/(attendee)/qr-pass");
              }}
            >
              <Ionicons name="chevron-back" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bento Grid */}
        <View className="flex-row flex-wrap justify-between">
          {/* Featured Large */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedImage(images[0])}
            className="w-full h-56 rounded-[32px] overflow-hidden mb-4 shadow-sm bg-slate-900"
          >
            <Image
              source={
                typeof images[0] === "string" ? { uri: images[0] } : images[0]
              }
              className="w-full h-full"
              resizeMode="cover"
              style={{ backgroundColor: "#000" }}
            />
            <View className="absolute bottom-4 left-4 right-4">
              <View className="bg-black/30 self-start px-3 py-1 rounded-full border border-white/20">
                <Text className="text-white text-[10px] font-bold uppercase">
                  {pastEventTitle} Highlights
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Row 2: Two Side-by-Side Images */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedImage(images[2])}
            className="w-[48%] h-44 rounded-[28px] overflow-hidden mb-4 shadow-sm bg-slate-900"
          >
            <Image
              source={
                typeof images[2] === "string" ? { uri: images[2] } : images[2]
              }
              className="w-full h-full"
              resizeMode="cover"
              style={{ backgroundColor: "#000" }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedImage(images[3])}
            className="w-[48%] h-44 rounded-[28px] overflow-hidden mb-4 shadow-sm bg-slate-900"
          >
            <Image
              source={
                typeof images[3] === "string" ? { uri: images[3] } : images[3]
              }
              className="w-full h-full"
              resizeMode="cover"
              style={{ backgroundColor: "#000" }}
            />
          </TouchableOpacity>

          {/* Row 3: Full Width Horizontal (former Tall Left) */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedImage(images[1])}
            className="w-full h-56 rounded-[32px] overflow-hidden mb-4 shadow-sm bg-slate-900"
          >
            <Image
              source={
                typeof images[1] === "string" ? { uri: images[1] } : images[1]
              }
              className="w-full h-full"
              resizeMode="cover"
              style={{ backgroundColor: "#000" }}
            />
          </TouchableOpacity>

          {/* Row 4: Wide Left and Small Square Right */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedImage(images[4])}
            className="w-[60%] h-44 rounded-[32px] overflow-hidden mb-4 shadow-sm bg-slate-900"
          >
            <Image
              source={
                typeof images[4] === "string" ? { uri: images[4] } : images[4]
              }
              className="w-full h-full"
              resizeMode="cover"
              style={{ backgroundColor: "#000" }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedImage(images[5])}
            className="w-[36%] h-44 rounded-[32px] overflow-hidden mb-4 shadow-sm bg-slate-900"
          >
            <Image
              source={
                typeof images[5] === "string" ? { uri: images[5] } : images[5]
              }
              className="w-full h-full"
              resizeMode="cover"
              style={{ backgroundColor: "#000" }}
            />
          </TouchableOpacity>

          {/* Row 5: Bottom Large */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedImage(images[6])}
            className="w-full h-64 rounded-[32px] overflow-hidden mb-4 shadow-sm bg-slate-900"
          >
            <Image
              source={
                typeof images[6] === "string" ? { uri: images[6] } : images[6]
              }
              className="w-full h-full"
              resizeMode="cover"
              style={{ backgroundColor: "#000" }}
            />
          </TouchableOpacity>
        </View>

        <View className="mt-2 items-center">
          <View className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
            <Text className="text-slate-400 text-xs font-bold text-center leading-5">
              Images are from our event archives.{"\n"}
              New photos from today will appear soon!
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Premium Fullscreen Image Viewer Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View className="flex-1 bg-slate-950/95 justify-center items-center">
          {/* Header Controls */}
          <View
            className="absolute left-0 right-0 flex-row justify-between items-center px-6 z-10"
            style={{ top: insets.top > 0 ? insets.top : 20 }}
          >
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setSelectedImage(null)}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md items-center justify-center border border-white/10"
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>

            {/* Download Button */}
            <TouchableOpacity
              onPress={handleDownload}
              disabled={downloading}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md items-center justify-center border border-white/10"
              activeOpacity={0.7}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="download-outline" size={24} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Full Screen Image */}
          {selectedImage && (
            <View className="w-full h-full px-4 justify-center items-center">
              <Image
                source={
                  typeof selectedImage === "string"
                    ? { uri: selectedImage }
                    : selectedImage
                }
                className="w-full h-[70%]"
                resizeMode="contain"
              />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
