import { Platform, ViewStyle } from 'react-native';

/**
 * Gölgeler bilinçli olarak çok hafif: kartlar zeminden "yüzmesin",
 * yalnızca nazikçe ayrılsın. Gölge rengi sıcak kahve tonunda —
 * nötr gri gölge sıcak paletin üstünde kirli görünüyordu.
 */
const SHADOW_COLOR = '#3A2E22';

const make = (
  opacity: number,
  radiusValue: number,
  offsetY: number,
  elevation: number,
): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: SHADOW_COLOR,
      shadowOpacity: opacity,
      shadowRadius: radiusValue,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: { elevation },
    default: {
      // web
      boxShadow: `0px ${offsetY}px ${radiusValue}px rgba(58,46,34,${opacity})`,
    } as ViewStyle,
  })!;

export const shadows = {
  none: {} as ViewStyle,
  xs: make(0.025, 5, 1, 1),
  sm: make(0.04, 10, 3, 2),
  md: make(0.055, 18, 6, 4),
  lg: make(0.085, 28, 12, 8),
};
