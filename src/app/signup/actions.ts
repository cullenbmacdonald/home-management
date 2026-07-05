"use server";

import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { households, users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { seedHousehold } from "@/db/seed";
import { consumeInvite, findValidInvite } from "@/lib/invites";

const ACCENTS = ["#059669", "#0e7490", "#7c3aed", "#db2777", "#ea580c", "#0891b2"];

interface Parsed {
  displayName: string;
  username: string;
  password: string;
  householdName: string;
  inviteCode: string;
}

function parse(formData: FormData): Parsed {
  return {
    displayName: String(formData.get("displayName") ?? "").trim(),
    username: String(formData.get("username") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    householdName: String(formData.get("householdName") ?? "").trim(),
    inviteCode: String(formData.get("invite") ?? "").trim(),
  };
}

/** True if `username` is already taken within the given household. */
async function usernameTaken(householdId: number, username: string) {
  const row = (
    await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.householdId, householdId),
          sql`lower(${users.username}) = ${username}`,
        ),
      )
      .limit(1)
  )[0];
  return !!row;
}

export async function signup(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const { displayName, username, password, householdName, inviteCode } =
    parse(formData);

  if (!displayName || !username || !password) return "All fields are required";
  if (password.length < 6) return "Password must be at least 6 characters";
  if (!/^[a-z0-9_.-]+$/.test(username))
    return "Username may only contain letters, numbers, and . _ -";

  let userId: number;

  if (inviteCode) {
    // Joining an existing household via invite.
    const invite = await findValidInvite(inviteCode);
    if (!invite) return "That invite link is invalid or has expired";
    if (await usernameTaken(invite.householdId, username))
      return "That username is already taken in this household";

    const [user] = await db
      .insert(users)
      .values({
        householdId: invite.householdId,
        username,
        displayName,
        passwordHash: bcrypt.hashSync(password, 10),
        accentColor: ACCENTS[Math.floor(Math.random() * ACCENTS.length)],
        role: "member",
      })
      .returning({ id: users.id });
    await consumeInvite(invite.id);
    userId = user.id;
  } else {
    // Creating a brand-new household; this user becomes its owner.
    if (!householdName) return "Please name your household";

    const [household] = await db
      .insert(households)
      .values({ name: householdName })
      .returning({ id: households.id });

    const [user] = await db
      .insert(users)
      .values({
        householdId: household.id,
        username,
        displayName,
        passwordHash: bcrypt.hashSync(password, 10),
        accentColor: ACCENTS[0],
        role: "owner",
      })
      .returning({ id: users.id });
    await seedHousehold(db, household.id);
    userId = user.id;
  }

  await createSession(userId);
  redirect("/");
}
