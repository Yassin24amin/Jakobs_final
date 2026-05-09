const { withEntitlementsPlist, createRunOncePlugin } = require("@expo/config-plugins");

const pkg = {
  name: "with-tap-to-pay-entitlement",
  version: "1.0.0",
};

function withTapToPayEntitlement(config) {
  return withEntitlementsPlist(config, (expoConfig) => {
    expoConfig.modResults["com.apple.developer.proximity-reader.payment.acceptance"] =
      true;
    return expoConfig;
  });
}

module.exports = createRunOncePlugin(
  withTapToPayEntitlement,
  pkg.name,
  pkg.version
);
