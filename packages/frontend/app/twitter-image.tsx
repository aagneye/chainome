import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Chainome — Patient-sovereign genomic data marketplace on WorldChain";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #070c18 0%, #0e1424 60%, #0d1f1a 100%)",
          padding: "64px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0,201,167,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,167,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow orb */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,201,167,0.15) 0%, transparent 70%)",
          }}
        />

        {/* WorldChain badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(0,201,167,0.12)",
            border: "1px solid rgba(0,201,167,0.3)",
            borderRadius: "9999px",
            padding: "6px 16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#00c9a7",
            }}
          />
          <span style={{ color: "#00c9a7", fontSize: "14px", fontWeight: 500 }}>
            WorldChain Sepolia · Chain ID 4801
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <span
            style={{
              fontSize: "80px",
              fontWeight: 800,
              color: "#dde8f8",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            Chainome
          </span>
          <span
            style={{
              fontSize: "28px",
              color: "rgba(221,232,248,0.6)",
              fontWeight: 400,
              lineHeight: 1.4,
              maxWidth: "700px",
            }}
          >
            Your genome. Your data. Your future.
          </span>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: "48px",
          }}
        >
          {[
            { label: "Verified Humans", value: "13M+" },
            { label: "GNM Earned per Upload", value: "500" },
            { label: "Data Leakage", value: "Zero" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <span
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "#00c9a7",
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: "rgba(221,232,248,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom right: ETHGlobal badge */}
        <div
          style={{
            position: "absolute",
            bottom: "64px",
            right: "64px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ color: "rgba(221,232,248,0.3)", fontSize: "13px" }}>
            ETHGlobal Mumbai 2026
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
