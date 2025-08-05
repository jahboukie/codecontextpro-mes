/**
 * Better Auth Server Actions for Next.js
 * Handles authentication on the server side
 */

"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function signUpAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password || !name) {
    return { error: "All fields are required" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  try {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (result.error) {
      return { error: result.error.message };
    }

    // Redirect to dashboard on success
    redirect("/dashboard");
  } catch (error: any) {
    console.error("Signup error:", error);
    return { error: error.message || "Signup failed" };
  }
}

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    if (result.error) {
      return { error: result.error.message };
    }

    // Redirect to dashboard on success
    redirect("/dashboard");
  } catch (error: any) {
    console.error("Sign in error:", error);
    return { error: error.message || "Sign in failed" };
  }
}
