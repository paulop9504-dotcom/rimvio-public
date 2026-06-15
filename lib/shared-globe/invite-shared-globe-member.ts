import type { SharedGlobe, SharedGlobeMember } from "@/lib/shared-globe/shared-globe-types";

export function inviteSharedGlobeMember(
  globe: SharedGlobe,
  input: {
    displayName: string;
    userId?: string;
    now?: Date;
  },
): SharedGlobe {
  const name = input.displayName.trim();
  if (!name) {
    return globe;
  }

  const exists = globe.members.some(
    (member) =>
      member.displayName === name ||
      (Boolean(input.userId?.trim()) && member.userId === input.userId),
  );
  if (exists) {
    return globe;
  }

  const member: SharedGlobeMember = {
    displayName: name,
    userId: input.userId,
    role: "member",
    invitedAt: (input.now ?? new Date()).toISOString(),
  };

  return {
    ...globe,
    members: [...globe.members, member],
  };
}
