@AGENTS.md

## Figma → code
- This is React Native (Expo), NOT React web. Figma MCP output is React + Tailwind; always convert it to React Native primitives (View, Text, Pressable, expo-image) with StyleSheet.
- Reuse ThemedText, ThemedView, and values in src/constants/theme.ts instead of hardcoding colors and spacing.
- New screens go in src/app/, reusable components in src/components/.
