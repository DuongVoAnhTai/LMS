import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { testRAG } from "@/tests/testRAG";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export async function POST(req: Request) {
  try {
    testRAG();
    const { emailOrUsername, password } = await req.json();
    const errors: ValidationErrorLogin = {};

    // Validate required fields
    if (!emailOrUsername) {
      errors.emailOrUsername = "Email or username is required";
    }
    if (!password) {
      errors.password = "Password is required";
    }

    // Return all validation errors
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const user = await prisma.users.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { errors: { invalid: "Incorrect email/username or password" } },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { errors: { invalid: "Incorrect email/username or password" } },
        { status: 400 }
      );
    }

    // Tạo JWT token
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "3h",
    });

    const res = NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

    res.cookies.set(`token`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
