const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// react-native-ble-advertiser hardcodes `compileSdkVersion 28` and
// `buildToolsVersion "28.0.3"` directly in its own
// node_modules/react-native-ble-advertiser/android/build.gradle.
//
// A previous version of this plugin tried to override that from the ROOT
// build.gradle via `subprojects { afterEvaluate { android.compileSdkVersion 34 } }`.
// That is fundamentally the wrong approach, not just mistimed: once a
// module's own build.gradle has set/read compileSdk, AGP locks it —
// "It is too late to set compileSdk. It has already been read to
// configure this project." — and no Gradle-configuration-time hook
// (afterEvaluate or otherwise) can change it after the fact, no matter
// how it's sequenced.
//
// The only correct fix is to change the SOURCE VALUE in the library's own
// build.gradle before Gradle ever reads it. withDangerousMod runs during
// `expo prebuild` as plain Node.js file I/O — before the Android project
// exists and long before Gradle starts — so this isn't a Gradle hook of
// any kind, late or otherwise; it edits the file Gradle will read, so it
// reads 34 the first time, with nothing to override later.
//
// This runs on every `expo prebuild` (registered as a config plugin in
// app.json), so it reapplies correctly even after a fresh `npm install`
// restores node_modules/react-native-ble-advertiser to its unpatched state.
const TARGET_MODULE = 'react-native-ble-advertiser';
const GRADLE_RELATIVE_PATH = path.join('node_modules', TARGET_MODULE, 'android', 'build.gradle');

function withForceCompileSdk(config, { compileSdkVersion = 34, buildToolsVersion = '34.0.0' } = {}) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const gradleFilePath = path.join(config.modRequest.projectRoot, GRADLE_RELATIVE_PATH);

      if (!fs.existsSync(gradleFilePath)) {
        console.warn(`[withForceCompileSdk] ${GRADLE_RELATIVE_PATH} not found — skipping (is ${TARGET_MODULE} installed?)`);
        return config;
      }

      let contents = fs.readFileSync(gradleFilePath, 'utf8');
      const before = contents;

      contents = contents.replace(/compileSdkVersion\s+\d+/g, `compileSdkVersion ${compileSdkVersion}`);
      contents = contents.replace(/buildToolsVersion\s+["'][^"']+["']/g, `buildToolsVersion "${buildToolsVersion}"`);

      if (contents !== before) {
        fs.writeFileSync(gradleFilePath, contents, 'utf8');
        console.log(`[withForceCompileSdk] Patched ${GRADLE_RELATIVE_PATH} to compileSdkVersion ${compileSdkVersion} / buildToolsVersion ${buildToolsVersion}`);
      }

      return config;
    },
  ]);
}

module.exports = withForceCompileSdk;
