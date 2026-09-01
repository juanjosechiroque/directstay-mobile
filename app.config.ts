import type { ConfigContext, ExpoConfig } from 'expo/config';

export const APP_SLUG = 'directstay-mobile';
export const APP_SCHEME = 'directstay';

type BuildProfile = 'development' | 'preview' | 'production';

interface ProfileSettings {
  name: string;
  bundleIdentifier: string;
}

const PROFILES: Record<BuildProfile, ProfileSettings> = {
  development: {
    name: 'DirectStay Dev',
    bundleIdentifier: 'com.juanjosechiroque.directstay.dev',
  },
  preview: {
    name: 'DirectStay Preview',
    bundleIdentifier: 'com.juanjosechiroque.directstay.preview',
  },
  production: {
    name: 'DirectStay',
    bundleIdentifier: 'com.juanjosechiroque.directstay',
  },
};

function resolveProfile(buildProfile: string | undefined): BuildProfile {
  if (buildProfile === 'preview' || buildProfile === 'production') {
    return buildProfile;
  }
  return 'development';
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const profile = PROFILES[resolveProfile(process.env.EAS_BUILD_PROFILE)];

  return {
    ...config,
    name: profile.name,
    slug: APP_SLUG,
    scheme: APP_SCHEME,
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/images/icon.png',
    ios: {
      ...config.ios,
      bundleIdentifier: profile.bundleIdentifier,
      icon: './assets/expo.icon',
    },
    android: {
      ...config.android,
      package: profile.bundleIdentifier,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      ...config.web,
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        { backgroundColor: '#208AEF', image: './assets/images/splash-icon.png', imageWidth: 76 },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};
