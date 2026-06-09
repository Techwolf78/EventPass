import React from "react";
import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";

const supportHref = "/support" as any;

const features = [
  "QR-based event pass access",
  "Attendee agenda and profile views",
  "Organizer check-in support",
  "Firebase-backed event data",
];

const steps = [
  "Create or import event attendees.",
  "Share mobile passes with registered guests.",
  "Scan QR passes at event entry.",
  "Review attendance and event activity.",
];

export default function MarketingPage() {
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="mx-auto w-full max-w-[900px] px-5 py-6 md:px-8 md:py-8">
        <View className="flex-row items-center justify-between border-b border-slate-200 pb-4">
          <Text className="text-lg font-black text-slate-900">
            ConnectHQ EventPass
          </Text>
          <View className="flex-row items-center gap-4">
            <Link href="/privacy-policy" asChild>
              <Text className="text-sm font-semibold text-slate-600">
                Privacy
              </Text>
            </Link>
            <Link href={supportHref} asChild>
              <Text className="text-sm font-semibold text-slate-600">
                Support
              </Text>
            </Link>
          </View>
        </View>

        <View className="items-center py-16 md:py-20">
          <Text className="text-center text-4xl font-black leading-tight text-slate-950 md:text-5xl">
            Simple event passes and check-ins for ConnectHQ events.
          </Text>
          <Text className="mt-5 max-w-[620px] text-center text-base font-medium leading-7 text-slate-600 md:text-lg">
            ConnectHQ EventPass helps attendees access event details, view QR
            passes, follow agendas, and support smoother event entry.
          </Text>

          <Link href={supportHref} asChild>
            <Text className="mt-8 rounded-md bg-slate-900 px-6 py-3 text-center text-sm font-bold text-white">
              Contact Support
            </Text>
          </Link>
        </View>

        <View className="border-t border-slate-200 py-10">
          <Text className="text-2xl font-black text-slate-900">Features</Text>
          <View className="mt-5 gap-3">
            {features.map((feature) => (
              <View
                key={feature}
                className="rounded-md border border-slate-200 px-4 py-3"
              >
                <Text className="text-base font-semibold text-slate-700">
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="border-t border-slate-200 py-10">
          <Text className="text-2xl font-black text-slate-900">
            How It Works
          </Text>
          <View className="mt-5 gap-4">
            {steps.map((step, index) => (
              <View key={step} className="flex-row gap-3">
                <Text className="w-7 text-base font-black text-slate-900">
                  {index + 1}.
                </Text>
                <Text className="flex-1 text-base font-medium leading-6 text-slate-700">
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="border-t border-slate-200 py-10">
          <Text className="text-2xl font-black text-slate-900">Support</Text>
          <Text className="mt-3 text-base font-medium leading-7 text-slate-600">
            Need help with an event pass, account access, QR check-in, or app
            setup? Use the support page and the ConnectHQ team will review your
            request.
          </Text>
          <Link href={supportHref} asChild>
            <Text className="mt-4 text-base font-bold text-slate-900">
              Open support page
            </Text>
          </Link>
        </View>

        <View className="flex-col gap-3 border-t border-slate-200 py-8 md:flex-row md:items-center md:justify-between">
          <Text className="text-sm font-medium text-slate-500">
            2026 ConnectHQ. All rights reserved.
          </Text>
          <View className="flex-row gap-5">
            <Link href="/privacy-policy" asChild>
              <Text className="text-sm font-semibold text-slate-600">
                Privacy Policy
              </Text>
            </Link>
            <Link href="/terms-and-conditions" asChild>
              <Text className="text-sm font-semibold text-slate-600">
                Terms
              </Text>
            </Link>
            <Link href={supportHref} asChild>
              <Text className="text-sm font-semibold text-slate-600">
                Support
              </Text>
            </Link>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
