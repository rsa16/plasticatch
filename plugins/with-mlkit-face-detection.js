const { withDangerousMod, withGradleProperties } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Keeps ML Kit's face detection working in R8-minified release builds.
 *
 * ML Kit discovers its Firebase component registrars by class name and instantiates them
 * reflectively from `MlKitComponentDiscoveryService`. With the R8 version pulled in by this
 * project, the stock `-keep class * implements ComponentRegistrar` rule keeps the class names
 * but drops their no-arg constructors. The registry then comes up empty and
 * `FaceDetection.getClient()` returns null, which the privacy pipeline handles by blurring the
 * whole photo. The catch upload is then rejected as "too blurry".
 *
 * The keep rule below restores the constructors. The Gradle property keeps minification enabled:
 * this plugin exists so the fix survives `expo prebuild`, not to turn R8 off.
 */
const MARKER = 'PlastiCatch: keep ML Kit component registrar constructors';

const PROGUARD_RULES = `
# ${MARKER}
-keep class * implements com.google.firebase.components.ComponentRegistrar {
    public <init>();
}
`;

function withMinifyInReleaseBuilds(config) {
  return withGradleProperties(config, (config) => {
    const key = 'android.enableMinifyInReleaseBuilds';
    config.modResults = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === key),
    );
    config.modResults.push({ type: 'property', key, value: 'true' });
    return config;
  });
}

function withMlKitProguard(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (!current.includes(MARKER)) {
        fs.writeFileSync(file, `${current.trimEnd()}\n${PROGUARD_RULES}`);
      }
      return config;
    },
  ]);
}

module.exports = function withMlKitFaceDetection(config) {
  return withMinifyInReleaseBuilds(withMlKitProguard(config));
};
