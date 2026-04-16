import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 32 32" width="32" height="32">
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <ellipse
              key={deg}
              cx="16"
              cy="10"
              rx="3.5"
              ry="6"
              fill="#3D6B4F"
              opacity="0.85"
              transform={`rotate(${deg} 16 16)`}
            />
          ))}
          <circle cx="16" cy="16" r="4" fill="#5a9e73" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
