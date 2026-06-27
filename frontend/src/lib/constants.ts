export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:8000";

export const OTP_LENGTH = 6;
export const MOCK_OTP = "123456";

export const MAX_MESSAGE_LENGTH = 4096;
export const MAX_FILE_SIZE_MB = 100;

export const SCROLL_TO_BOTTOM_THRESHOLD = 200;
export const TYPING_DEBOUNCE_MS = 1000;
export const MESSAGE_GROUP_GAP_MINUTES = 2;

export const SENDER_COLORS = [
  "#E57373",
  "#4DB6AC",
  "#7986CB",
  "#FF8A65",
  "#A1887F",
  "#90A4AE",
  "#F06292",
  "#AED581",
] as const;
