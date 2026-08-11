import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
} from "../utils/mail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getTaskSummaryForUser } from "../utils/task-summary.js";

const generateAccessAndRefreshTokens = async (user) => {
  try {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token",
    );
  }
};

const toPublicUser = (user) => {
  const publicUser = user.toObject();
  for (const field of [
    "password",
    "refreshToken",
    "emailVerificationToken",
    "emailVerificationExpiry",
    "forgotPasswordToken",
    "forgotPasswordExpiry",
  ]) delete publicUser[field];
  return publicUser;
};

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/api/v1/auth",
  maxAge: 10 * 24 * 60 * 60 * 1000,
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, fullName } = req.body;
  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = String(username);

  const existingEmailUser = await User.findOne({ email: normalizedEmail });
  const existingUsernameUser = await User.findOne({ username: normalizedUsername });

  const canRetryUnverifiedRegistration =
    existingEmailUser && !existingEmailUser.isEmailVerified;

  if (
    (existingEmailUser && !canRetryUnverifiedRegistration) ||
    (existingUsernameUser &&
      existingUsernameUser._id.toString() !== existingEmailUser?._id.toString())
  ) {
    throw new ApiError(409, "User with email or username already exists", []);
  }

  const isRegistrationRetry = Boolean(canRetryUnverifiedRegistration);
  const user = existingEmailUser || new User();

  user.email = normalizedEmail;
  user.username = normalizedUsername;
  user.password = password;
  if (fullName !== undefined) user.fullName = fullName;
  user.isEmailVerified = false;

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;

  await user.save();

  try {
    await sendEmail({
      email: user?.email,
      subject: "Please verify your email",
      mailgenContent: emailVerificationMailgenContent(
        user.username,
        `${(process.env.CORS_ORIGIN || "http://localhost:5173").split(",")[0]}/verify-email/${unHashedToken}`,
      ),
    });
  } catch (error) {
    try {
      if (!isRegistrationRetry) {
        await User.deleteOne({ _id: user._id, isEmailVerified: false });
      }
    } catch (cleanupError) {
      console.error("Failed to roll back an undeliverable registration", {
        userId: user._id.toString(),
        code: cleanupError?.code,
      });
    }
    throw error;
  }

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering a user");
  }

  return res
    .status(isRegistrationRetry ? 200 : 201)
    .json(
      new ApiResponse(
        isRegistrationRetry ? 200 : 201,
        { user: createdUser },
        isRegistrationRetry
          ? "Verification email has been resent. Please verify your email before signing in."
          : "User registered successfully and verification email has been sent on your email",
      ),
    );
});

const login = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;

  if (!email) {
    throw new ApiError(400, " email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user);
  const loggedInUser = toPublicUser(user);

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, refreshTokenCookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
        },
        "User logged in successfully",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    },
  );
  return res
    .status(200)
    .clearCookie("refreshToken", refreshTokenCookieOptions)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateUserSkills = asyncHandler(async (req, res) => {
  const skills = [...new Set(req.body.skills.map((skill) => skill.trim()))];
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { skills },
    { new: true },
  ).select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Skills updated successfully"));
});

const getMyTaskSummary = asyncHandler(async (req, res) => {
  const summary = await getTaskSummaryForUser(req.user._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      summary,
      "Task summary fetched successfully",
    ),
  );
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  if (!verificationToken) {
    throw new ApiError(400, "Email verification token is missing");
  }

  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Token is invalid or expired");
  }

  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;

  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isEmailVerified: true,
      },
      "Email is verified",
    ),
  );
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  if (user.isEmailVerified) {
    throw new ApiError(409, "Email is already verified");
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${(process.env.CORS_ORIGIN || "http://localhost:5173").split(",")[0]}/verify-email/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Mail has been sent to your email ID"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token in expired");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user);

    return res
      .status(200)
      .cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken },
          "Access token refreshed",
        ),
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(200).json(
      new ApiResponse(200, {}, "If an account exists, a password reset email has been sent"),
    );
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Password reset request",
    mailgenContent: forgotPasswordMailgenContent(
      user.username,
      `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "If an account exists, a password reset email has been sent",
      ),
    );
});
const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Token is invalid or expired");
  }

  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid old Password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

export {
  registerUser,
  login,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  forgotPasswordRequest,
  changeCurrentPassword,
  resetForgotPassword,
  updateUserSkills,
  getMyTaskSummary,
};
