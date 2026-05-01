import { useWindowDimensions } from "react-native";

/**
 * iPad-first responsive breakpoints.
 * iPad landscape >= 1024, iPad portrait >= 768, phone < 768.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return {
    isPhone: width < 768,
    isTabletPortrait: width >= 768 && width < 1024,
    isTabletLandscape: width >= 1024,
    /** Number of columns for product grids */
    columns: width >= 1024 ? 5 : width >= 768 ? 4 : 3,
    width,
    height,
  };
}
