import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
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
  "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=2070&auto=format&fit=crop",
];

const EVENT_IMAGES = [
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505236858219-8359eb29e329?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1515169067868-5387ec356754?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503428593586-e225b39bddfe?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=2070&auto=format&fit=crop",
];

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [enrollmentType, setEnrollmentType] = React.useState<
    "masterclass" | "event"
  >("event");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchEnrollment = async () => {
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
            (candidateData.enrollmentType as "masterclass" | "event") ||
              "event",
          );
        }
      } catch (error) {
        console.error("Error fetching enrollment type:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEnrollment();
  }, [user]);

  const images =
    enrollmentType === "masterclass" ? MASTERCLASS_IMAGES : EVENT_IMAGES;
  const eventTitle =
    enrollmentType === "masterclass" ? "Masterclass 3.0" : "Synergy Sphere 3.0";
  const pastEventTitle =
    enrollmentType === "masterclass" ? "Masterclass 2.0" : "Synergy Sphere 2.0";

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
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bento Grid */}
        <View className="flex-row flex-wrap justify-between">
          {/* Featured Large */}
          <View className="w-full h-56 rounded-[32px] overflow-hidden mb-4 shadow-sm">
            <Image
              source={{ uri: images[0] }}
              className="w-full h-full"
              resizeMode="cover"
            />
            <View className="absolute bottom-4 left-4 right-4">
              <View className="bg-black/30 self-start px-3 py-1 rounded-full border border-white/20">
                <Text className="text-white text-[10px] font-bold uppercase">
                  {pastEventTitle} Highlights
                </Text>
              </View>
            </View>
          </View>

          {/* Tall Left */}
          <View className="w-[48%] h-72 rounded-[32px] overflow-hidden mb-4 shadow-sm">
            <Image
              source={{ uri: images[1] }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>

          {/* Two Small Right */}
          <View className="w-[48%] h-72 justify-between mb-4">
            <View className="h-[47%] w-full rounded-[28px] overflow-hidden shadow-sm">
              <Image
                source={{ uri: images[2] }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <View className="h-[47%] w-full rounded-[28px] overflow-hidden shadow-sm">
              <Image
                source={{ uri: images[3] }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Wide Left */}
          <View className="w-[60%] h-44 rounded-[32px] overflow-hidden mb-4 shadow-sm">
            <Image
              source={{ uri: images[4] }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>

          {/* Small Square Right */}
          <View className="w-[36%] h-44 rounded-[32px] overflow-hidden mb-4 shadow-sm">
            <Image
              source={{ uri: images[5] }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>

          {/* Bottom Large */}
          <View className="w-full h-64 rounded-[32px] overflow-hidden mb-4 shadow-sm">
            <Image
              source={{ uri: images[6] }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
        </View>

        <View className="mt-6 items-center">
          <View className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
            <Text className="text-slate-400 text-xs font-bold text-center leading-5">
              Images are from our community archives.{"\n"}
              New photos from today will appear soon!
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
