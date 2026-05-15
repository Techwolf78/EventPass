import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import ViewShot from "react-native-view-shot";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const NAVY = "#0F172A"; // More modern dark slate/navy than #1a2870
const GOLD = "#D4AF37"; // Metallic gold
const GOLD_L = "#FDF6E2"; // Very light gold/cream for backgrounds
const WHITE = "#ffffff";
const CREAM = "#FAF8F5"; // Premium paper feel

// ─── Certificate Styles ───────────────────────────────────────────────────────
const cert = StyleSheet.create({
  // Outer navy frame
  outerFrame: {
    backgroundColor: WHITE,
    borderWidth: 12,
    borderColor: NAVY,
    borderRadius: 4,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  // Inner gold border
  innerFrame: {
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 2,
    paddingVertical: 36,
    paddingHorizontal: 28,
    position: "relative",
    backgroundColor: CREAM,
  },
  // ── Corner bracket helper (shared) ──
  cornerBase: {
    position: "absolute",
    width: 20,
    height: 20,
  },
  cornerEdgeH: {
    position: "absolute",
    height: 2,
    width: 20,
    backgroundColor: GOLD,
  },
  cornerEdgeV: {
    position: "absolute",
    width: 2,
    height: 20,
    backgroundColor: GOLD,
  },
  cornerDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
  },

  // ── Typography ──
  companyName: {
    fontSize: 10,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  titleText: {
    fontSize: 24,
    fontWeight: "300",
    color: NAVY,
    textAlign: "center",
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  certifyLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: GOLD,
    textAlign: "center",
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  nameText: {
    fontSize: 32,
    fontStyle: "italic",
    color: NAVY,
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 12,
  },
  goldDivider: {
    height: 1,
    backgroundColor: GOLD,
    marginHorizontal: 40,
    marginBottom: 16,
    opacity: 0.5,
  },
  bodyText: {
    fontSize: 11,
    color: "#475569", // Slate-600
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  bodyBold: {
    fontWeight: "700",
    color: NAVY,
  },

  // ── Signature Row ──
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    marginBottom: 24,
  },
  sigCol: {
    alignItems: "center",
    flex: 1,
  },
  sigName: {
    fontSize: 14,
    fontStyle: "italic",
    color: NAVY,
    marginBottom: 6,
    fontWeight: "500",
  },
  sigLine: {
    height: 1,
    backgroundColor: "#CBD5E1", // Slate-300
    width: 80,
    marginBottom: 6,
  },
  sigRole: {
    fontSize: 8,
    color: "#94A3B8", // Slate-400
    letterSpacing: 1.5,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  // ── Stamp ──
  stampOuter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  stampInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: GOLD,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  stampStars: {
    fontSize: 8,
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 2,
  },
  stampWord: {
    fontSize: 9,
    color: GOLD,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  stampYear: {
    fontSize: 12,
    color: GOLD,
    fontWeight: "700",
  },

  // ── Footer ──
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#E2E8F0", // Slate-200
    paddingTop: 14,
    paddingHorizontal: 4,
  },
  footerText: {
    fontSize: 9,
    color: "#94A3B8", // Slate-400
    fontWeight: "600",
    letterSpacing: 0.5,
    flexShrink: 1,
  },
});

// ─── Corner Bracket Component ─────────────────────────────────────────────────
function CornerBracket({ position }: { position: "TL" | "TR" | "BL" | "BR" }) {
  const isTop = position === "TL" || position === "TR";
  const isLeft = position === "TL" || position === "BL";
  
  const dotStyle = {
    top: isTop ? -3 : undefined,
    bottom: !isTop ? -3 : undefined,
    left: isLeft ? -3 : undefined,
    right: !isLeft ? -3 : undefined,
  };
  const hStyle = {
    top: isTop ? 0 : undefined,
    bottom: !isTop ? 0 : undefined,
    left: isLeft ? 0 : undefined,
    right: !isLeft ? 0 : undefined,
  };
  const vStyle = {
    top: isTop ? 0 : undefined,
    bottom: !isTop ? 0 : undefined,
    left: isLeft ? 0 : undefined,
    right: !isLeft ? 0 : undefined,
  };

  const containerStyle = {
    position: "absolute" as const,
    top: isTop ? -2 : undefined,
    bottom: !isTop ? -2 : undefined,
    left: isLeft ? -2 : undefined,
    right: !isLeft ? -2 : undefined,
    width: 20,
    height: 20,
  };

  return (
    <View style={containerStyle}>
      <View style={[cert.cornerEdgeH, hStyle]} />
      <View style={[cert.cornerEdgeV, vStyle]} />
      <View style={[cert.cornerDot, dotStyle]} />
    </View>
  );
}

// ─── Premium Certificate Card ─────────────────────────────────────────────────
export interface CertificateCardProps {
  candidateName: string;
  eventName: string;
  eventLocation: string;
  eventDate: string;
  uniqueId: string;
  certRef: React.RefObject<any>;
}

export default function CertificateCard({
  candidateName,
  eventName,
  eventLocation,
  eventDate,
  uniqueId,
  certRef,
}: CertificateCardProps) {
  return (
    <ViewShot ref={certRef} options={{ format: "png", quality: 1.0 }}>
      <View style={cert.outerFrame}>
        <View style={cert.innerFrame}>
          {/* ── Corner Brackets ── */}
          <CornerBracket position="TL" />
          <CornerBracket position="TR" />
          <CornerBracket position="BL" />
          <CornerBracket position="BR" />

          {/* ── Company Header with Bird Logo ── */}
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Image
                source={{
                  uri: "https://res.cloudinary.com/dcjmaapvi/image/upload/v1730120218/Gryphon_Academy_Bird_Logo_yzzl3q.png",
                }}
                style={{ width: 20, height: 20, resizeMode: "contain" }}
              />
              <Text style={cert.companyName}>Gryphon Academy Pvt Ltd</Text>
            </View>
          </View>

          {/* ── Thin Gold Rule ── */}
          <View
            style={{
              height: 0.5,
              backgroundColor: GOLD,
              marginHorizontal: 0,
              marginBottom: 12,
              opacity: 0.3,
            }}
          />

          {/* ── Main Title ── */}
          <Text style={cert.titleText}>Certificate of Participation</Text>

          {/* ── Sub Label ── */}
          <Text style={cert.certifyLabel}>This is to certify that</Text>

          {/* ── Recipient Name ── */}
          <Text style={cert.nameText}>{candidateName}</Text>

          {/* ── Gold Divider ── */}
          <View style={cert.goldDivider} />

          {/* ── Body Text ── */}
          <Text style={cert.bodyText}>
            {"demonstrated successful participation and attendance at\n"}
            <Text style={cert.bodyBold}>{eventName}</Text>
            {"\norganized by Gryphon Academy\nat "}
            <Text style={cert.bodyBold}>{eventLocation}</Text>
            {" on "}
            <Text style={cert.bodyBold}>{eventDate}</Text>
          </Text>

          {/* ── Signature Row ── */}
          <View style={cert.sigRow}>
            {/* Founder */}
            <View style={cert.sigCol}>
              <Text style={cert.sigName}>Shashi Bhat</Text>
              <View style={cert.sigLine} />
              <Text style={cert.sigRole}>Founder</Text>
            </View>

            {/* Center Stamp */}
            <View style={[cert.sigCol, { paddingBottom: 2 }]}>
              <View style={cert.stampOuter}>
                <View style={cert.stampInner}>
                  <Text style={cert.stampStars}>★ ★ ★</Text>
                  <Text style={cert.stampWord}>Attended</Text>
                  <Text style={cert.stampYear}>2026</Text>
                </View>
              </View>
            </View>

            {/* Co-Founder */}
            <View style={cert.sigCol}>
              <Text style={cert.sigName}>Umme Ansari</Text>
              <View style={cert.sigLine} />
              <Text style={cert.sigRole}>Co-Founder</Text>
            </View>
          </View>

          {/* ── Footer ── */}
          <View style={cert.footerRow}>
            <View style={{ flex: 1, alignItems: "flex-start" }}>
              <Text
                style={cert.footerText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                ID: {uniqueId}
              </Text>
            </View>
            <Text style={{ ...cert.footerText, color: GOLD, marginHorizontal: 8, opacity: 0.5 }}>
              │
            </Text>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text
                style={cert.footerText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Date: {eventDate}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ViewShot>
  );
}
