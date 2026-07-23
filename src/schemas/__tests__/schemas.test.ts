import { describe, it, expect } from "vitest";
import { signUpSchema, usernameValidation } from "@/schemas/signUpSchema";
import { verifySchema } from "@/schemas/verifySchema";
import { messageSchema } from "@/schemas/messageSchema";
import { AcceptMessageSchema } from "@/schemas/acceptMessageSchema";
import { forgotPasswordSchema } from "@/schemas/forgotPasswordSchema";
import { resetPasswordSchema } from "@/schemas/resetPasswordSchema";
import { changePasswordSchema } from "@/schemas/changePasswordSchema";
import { updateUsernameSchema } from "@/schemas/updateUsernameSchema";

describe("usernameValidation", () => {
  it("accepts a valid alphanumeric username", () => {
    expect(usernameValidation.safeParse("alex99").success).toBe(true);
  });

  it("rejects usernames that are too short or too long", () => {
    expect(usernameValidation.safeParse("a").success).toBe(false);
    expect(usernameValidation.safeParse("a".repeat(21)).success).toBe(false);
  });

  it("rejects special characters", () => {
    expect(usernameValidation.safeParse("bad name").success).toBe(false);
    expect(usernameValidation.safeParse("bad!").success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("accepts valid input", () => {
    const result = signUpSchema.safeParse({
      username: "alex",
      email: "alex@example.com",
      password: "secret1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = signUpSchema.safeParse({
      username: "alex",
      email: "not-an-email",
      password: "secret1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a short password", () => {
    const result = signUpSchema.safeParse({
      username: "alex",
      email: "alex@example.com",
      password: "123",
    });
    expect(result.success).toBe(false);
  });
});

describe("verifySchema", () => {
  it("requires exactly 6 characters", () => {
    expect(verifySchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(verifySchema.safeParse({ code: "123" }).success).toBe(false);
    expect(verifySchema.safeParse({ code: "1234567" }).success).toBe(false);
  });
});

describe("messageSchema", () => {
  it("enforces min 10 and max 300 characters", () => {
    expect(messageSchema.safeParse({ content: "a".repeat(10) }).success).toBe(
      true
    );
    expect(messageSchema.safeParse({ content: "short" }).success).toBe(false);
    expect(messageSchema.safeParse({ content: "a".repeat(301) }).success).toBe(
      false
    );
  });
});

describe("acceptMessageSchema", () => {
  it("requires a boolean", () => {
    expect(AcceptMessageSchema.safeParse({ acceptMessages: true }).success).toBe(
      true
    );
    expect(
      AcceptMessageSchema.safeParse({ acceptMessages: "yes" }).success
    ).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("validates the email", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "a@b.com" }).success
    ).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(
      false
    );
  });
});

describe("resetPasswordSchema", () => {
  it("accepts a valid reset payload", () => {
    const result = resetPasswordSchema.safeParse({
      email: "a@b.com",
      code: "123456",
      password: "secret1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-6-digit code or short password", () => {
    expect(
      resetPasswordSchema.safeParse({
        email: "a@b.com",
        code: "12",
        password: "secret1",
      }).success
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        email: "a@b.com",
        code: "123456",
        password: "no",
      }).success
    ).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts matching passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldpass",
      newPassword: "newpass1",
      confirmPassword: "newpass1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when the confirmation does not match", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldpass",
      newPassword: "newpass1",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("confirmPassword");
    }
  });
});

describe("updateUsernameSchema", () => {
  it("reuses the username rules", () => {
    expect(updateUsernameSchema.safeParse({ username: "newname" }).success).toBe(
      true
    );
    expect(updateUsernameSchema.safeParse({ username: "x" }).success).toBe(
      false
    );
  });
});
