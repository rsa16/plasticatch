const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidSplits(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language === 'groovy') {
      let contents = modConfig.modResults.contents;

      if (!contents.includes('splits {')) {
        const androidBlockStr = 'android {';
        const splitsInject = `
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
            universalApk true
        }
    }`;
        contents = contents.replace(androidBlockStr, androidBlockStr + splitsInject);
        modConfig.modResults.contents = contents;
      }
    }
    return modConfig;
  });
};
