import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const PRESENCE_STALE_AFTER_MS = 30_000;

async function requireAdminUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();

  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

function isPresenceFresh(lastSeenAt: number) {
  return Date.now() - lastSeenAt <= PRESENCE_STALE_AFTER_MS;
}

export const registerDevice = mutation({
  args: {
    deviceInstanceId: v.string(),
    name: v.string(),
    platform: v.union(
      v.literal("ipad"),
      v.literal("iphone"),
      v.literal("android")
    ),
    role: v.union(v.literal("register"), v.literal("tap_to_pay_companion")),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const existing = await ctx.db
      .query("posDevices")
      .withIndex("by_deviceInstanceId", (q) =>
        q.eq("deviceInstanceId", args.deviceInstanceId)
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        platform: args.platform,
        role: args.role,
        isActive: true,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("posDevices", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setPresence = mutation({
  args: {
    deviceInstanceId: v.string(),
    status: v.union(
      v.literal("offline"),
      v.literal("register_ready"),
      v.literal("companion_ready"),
      v.literal("busy"),
      v.literal("reconnecting")
    ),
    currentPaymentRequestId: v.optional(v.id("posPaymentRequests")),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const device = await ctx.db
      .query("posDevices")
      .withIndex("by_deviceInstanceId", (q) =>
        q.eq("deviceInstanceId", args.deviceInstanceId)
      )
      .unique();

    if (!device) {
      throw new Error("Device must be registered before updating presence");
    }

    const existing = await ctx.db
      .query("posDevicePresence")
      .withIndex("by_deviceInstanceId", (q) =>
        q.eq("deviceInstanceId", args.deviceInstanceId)
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        currentPaymentRequestId: args.currentPaymentRequestId,
        lastSeenAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("posDevicePresence", {
      deviceInstanceId: args.deviceInstanceId,
      status: args.status,
      currentPaymentRequestId: args.currentPaymentRequestId,
      lastSeenAt: now,
      updatedAt: now,
    });
  },
});

export const listAvailableCompanions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminUser(ctx);

    const devices = await ctx.db
      .query("posDevices")
      .withIndex("by_role", (q) => q.eq("role", "tap_to_pay_companion"))
      .take(50);

    const companions = [];
    for (const device of devices) {
      if (!device.isActive) continue;

      const presence = await ctx.db
        .query("posDevicePresence")
        .withIndex("by_deviceInstanceId", (q) =>
          q.eq("deviceInstanceId", device.deviceInstanceId)
        )
        .unique();

      const isOnline =
        presence !== null &&
        presence.status !== "offline" &&
        isPresenceFresh(presence.lastSeenAt);

      if (!isOnline) continue;

      companions.push({
        ...device,
        isOnline,
        status: presence.status,
        currentPaymentRequestId: presence.currentPaymentRequestId ?? null,
        lastSeenAt: presence.lastSeenAt,
      });
    }

    return companions.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  },
});

export const getPairingForDevice = query({
  args: {
    deviceInstanceId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const device = await ctx.db
      .query("posDevices")
      .withIndex("by_deviceInstanceId", (q) =>
        q.eq("deviceInstanceId", args.deviceInstanceId)
      )
      .unique();

    if (!device) {
      return null;
    }

    let pairedDevice: Doc<"posDevices"> | null = null;
    let pairedPresence: Doc<"posDevicePresence"> | null = null;

    if (device.pairedDeviceInstanceId) {
      pairedDevice = await ctx.db
        .query("posDevices")
        .withIndex("by_deviceInstanceId", (q) =>
          q.eq("deviceInstanceId", device.pairedDeviceInstanceId!)
        )
        .unique();

      if (pairedDevice) {
        const pairedDeviceInstanceId = pairedDevice.deviceInstanceId;
        pairedPresence = await ctx.db
          .query("posDevicePresence")
          .withIndex("by_deviceInstanceId", (q) =>
            q.eq("deviceInstanceId", pairedDeviceInstanceId)
          )
          .unique();
      }
    }

    const isPairedDeviceOnline =
      pairedPresence !== null &&
      pairedPresence.status !== "offline" &&
      isPresenceFresh(pairedPresence.lastSeenAt);

    return {
      device,
      pairedDevice,
      pairedPresence:
        pairedPresence === null
          ? null
          : {
              ...pairedPresence,
              isOnline: isPairedDeviceOnline,
            },
    };
  },
});

export const pairRegisterToCompanion = mutation({
  args: {
    registerDeviceInstanceId: v.string(),
    companionDeviceInstanceId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const registerDevice = await ctx.db
      .query("posDevices")
      .withIndex("by_deviceInstanceId", (q) =>
        q.eq("deviceInstanceId", args.registerDeviceInstanceId)
      )
      .unique();
    const companionDevice = await ctx.db
      .query("posDevices")
      .withIndex("by_deviceInstanceId", (q) =>
        q.eq("deviceInstanceId", args.companionDeviceInstanceId)
      )
      .unique();

    if (!registerDevice) {
      throw new Error("Register device not found");
    }
    if (registerDevice.role !== "register") {
      throw new Error(`Register device has unexpected role: ${registerDevice.role}`);
    }
    if (!companionDevice) {
      throw new Error("Companion device not found");
    }
    if (companionDevice.role !== "tap_to_pay_companion") {
      throw new Error(
        `Companion device has unexpected role: ${companionDevice.role}`
      );
    }

    const now = Date.now();

    if (
      registerDevice.pairedDeviceInstanceId &&
      registerDevice.pairedDeviceInstanceId !== companionDevice.deviceInstanceId
    ) {
      const previousCompanion = await ctx.db
        .query("posDevices")
        .withIndex("by_deviceInstanceId", (q) =>
          q.eq("deviceInstanceId", registerDevice.pairedDeviceInstanceId!)
        )
        .unique();

      if (previousCompanion) {
        await ctx.db.patch(previousCompanion._id, {
          pairedDeviceInstanceId: undefined,
          updatedAt: now,
        });
      }
    }

    if (
      companionDevice.pairedDeviceInstanceId &&
      companionDevice.pairedDeviceInstanceId !== registerDevice.deviceInstanceId
    ) {
      const previousRegister = await ctx.db
        .query("posDevices")
        .withIndex("by_deviceInstanceId", (q) =>
          q.eq("deviceInstanceId", companionDevice.pairedDeviceInstanceId!)
        )
        .unique();

      if (previousRegister) {
        await ctx.db.patch(previousRegister._id, {
          pairedDeviceInstanceId: undefined,
          updatedAt: now,
        });
      }
    }

    await ctx.db.patch(registerDevice._id, {
      pairedDeviceInstanceId: companionDevice.deviceInstanceId,
      updatedAt: now,
    });
    await ctx.db.patch(companionDevice._id, {
      pairedDeviceInstanceId: registerDevice.deviceInstanceId,
      updatedAt: now,
    });

    return {
      registerDeviceInstanceId: registerDevice.deviceInstanceId,
      companionDeviceInstanceId: companionDevice.deviceInstanceId,
    };
  },
});
