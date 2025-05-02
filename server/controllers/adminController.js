const Admin = require("../models/AdminModel");
const logger = require("../utils/logger");
const { sendEmail } = require("../utils/mailer");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// @desc    Create a new admin
// @route   POST /api/admin
exports.createAdmin = async (req, res) => {
  try {
    const { username, adminName, email } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }],
      isDeleted: false,
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "An admin with this username or email already exists.",
      });
    }

    // Generate random password
    const plainPassword = crypto.randomBytes(8).toString("hex");

    // Create new admin
    const newAdmin = new Admin({
      username,
      adminName,
      email,
      password: plainPassword, // Will be hashed in pre-save hook
    });

    await newAdmin.save();
    logger.info(`[POST /api/admin] Created admin: ${newAdmin.username}`);

    // Prepare welcome email
    const emailSubject = "🎉 Welcome to Admin Portal - Your Login Credentials";
    const emailContent = `
    <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Admin Portal</title>
  <style>
    /* Same email styles as guideController */
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.8;
      color: #333333;
      max-width: 650px;
      margin: 0 auto;
      background-color: #f8f9fa;
      padding: 20px;
    }
    .email-container {
      border: 1px solid #e0e0e0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
      background-color: #ffffff;
    }
    .email-header {
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      color: white;
      padding: 25px 15px;
      text-align: center;
      position: relative;
    }
    .email-header h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 0.5px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .header-accent {
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 100%;
      height: 10px;
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z' fill='%23ffffff'%3E%3C/path%3E%3C/svg%3E");
      background-size: cover;
    }
    .email-body {
      padding: 35px 30px;
      background-color: #ffffff;
      text-align: center;
    }
    .welcome-emoji {
      font-size: 48px;
      margin-bottom: 20px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .credentials-box {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
      text-align: left;
    }
    .credential-item {
      margin-bottom: 20px;
      display: flex;
      flex-wrap: wrap;
    }
    .credential-label {
      font-weight: 600;
      width: 120px;
    }
    .credential-value {
      font-family: 'Courier New', monospace;
      background-color: #f3f4f6;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      flex: 1;
    }
    .important-note {
      background-color: #fffbeb;
      border-left: 5px solid #f59e0b;
      padding: 20px;
      margin: 30px 0;
      text-align: left;
      border-radius: 8px;
    }
    .button {
      display: inline-block;
      background-color: #3b82f6;
      color: white;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 10px;
      margin-top: 25px;
      font-weight: 600;
    }
    .support-section {
      margin-top: 40px;
      padding-top: 25px;
      border-top: 1px dashed #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>Welcome to Admin Portal</h1>
      <div class="header-accent"></div>
    </div>
    <div class="email-body">
      <div class="welcome-emoji">🎉✨</div>
      <h2>Hi ${newAdmin.adminName}!</h2>
      <p>Your admin account has been created successfully. Below are your login credentials:</p>
      
      <div class="credentials-box">
        <div class="credential-item">
          <span class="credential-label">Username:</span>
          <span class="credential-value">${newAdmin.username}</span>
        </div>
        <div class="credential-item">
          <span class="credential-label">Password:</span>
          <span class="credential-value">${plainPassword}</span>
        </div>
      </div>
      
      <div class="important-note">
        <p>⚠️ <strong>Important:</strong> Please change your password after logging in.</p>
      </div>
      
      <a href="http://localhost:3000/login" class="button">Login to Your Account</a>
    </div>
  </div>
</body>
</html>
    `;

    // Send welcome email
    await sendEmail(newAdmin.email, emailSubject, emailContent, true);

    res.status(201).json({
      success: true,
      data: {
        id: newAdmin._id,
        username: newAdmin.username,
        adminName: newAdmin.adminName,
        email: newAdmin.email,
      },
    });
  } catch (error) {
    logger.error(`[POST /api/admin] Error: ${error.message}`);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate key error - admin already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create admin",
      error: error.message,
    });
  }
};

// @desc    Update admin
// @route   PUT /api/admin/:id
exports.updateAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;
    const updateData = req.body;

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No update data provided",
      });
    }

    // Hash password if being updated
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedAdmin = await Admin.findOneAndUpdate(
      { _id: adminId, isDeleted: false },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found or deleted",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedAdmin,
    });

    logger.info(`[PUT /api/admin/${adminId}] Updated admin: ${updatedAdmin.username}`);
  } catch (error) {
    logger.error(`[PUT /api/admin/${req.params.id}] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to update admin",
      error: error.message,
    });
  }
};

// @desc    Soft delete admin
// @route   DELETE /api/admin/:id
exports.deleteAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;

    const admin = await Admin.findOne({ _id: adminId, isDeleted: false });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found or already deleted",
      });
    }

    admin.isDeleted = true;
    admin.deletedAt = new Date();
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Admin soft deleted successfully",
    });

    logger.info(`[DELETE /api/admin/${adminId}] Soft deleted admin: ${admin.username}`);
  } catch (error) {
    logger.error(`[DELETE /api/admin/${req.params.id}] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to delete admin",
      error: error.message,
    });
  }
};

// @desc    Get admin by ID
// @route   GET /api/admin/:id
exports.getAdminById = async (req, res) => {
  try {
    const adminId = req.params.id;

    const admin = await Admin.findOne({ _id: adminId, isDeleted: false });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found or deleted",
      });
    }

    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    logger.error(`[GET /api/admin/${req.params.id}] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to get admin",
      error: error.message,
    });
  }
};

// @desc    Change admin password
// @route   PATCH /api/admin/change-password/:id
exports.changePassword = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new password required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const admin = await Admin.findById(adminId).select("+password");
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different",
      });
    }

    admin.password = newPassword;
    await admin.save();

    logger.info(`[PATCH /api/admin/change-password/${adminId}] Password changed`);
    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    logger.error(`[PATCH /api/admin/change-password] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message,
    });
  }
};

// @desc    Get all admins
// @route   GET /api/admin
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({ isDeleted: false });
    res.status(200).json({
      success: true,
      data: admins,
    });
  } catch (error) {
    logger.error(`[GET /api/admin] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to get admins",
      error: error.message,
    });
  }
};

// @desc    Fetch admin by email
// @route   GET /api/admin/fetch/by-email
exports.fetchAdminByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email parameter is required",
      });
    }

    const admin = await Admin.findOne({ 
      email: email.toLowerCase() 
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: admin._id,
        username: admin.username,
        adminName: admin.adminName,
        email: admin.email,
        isDeleted: admin.isDeleted,
        createdAt: admin.createdAt,
        deletedAt: admin.deletedAt
      }
    });
  } catch (error) {
    logger.error(`[GET /api/admin/fetch/by-email] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin",
      error: error.message,
    });
  }
};

// @desc    Restore soft-deleted admin
// @route   PATCH /api/admin/restore/:id
exports.restoreAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }

    const restoredAdmin = await Admin.findOneAndUpdate(
      { _id: adminId, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true }
    );

    if (!restoredAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found or already active",
      });
    }

    logger.info(`[PATCH /api/admin/restore/${adminId}] Admin restored`);
    res.status(200).json({
      success: true,
      message: "Admin restored successfully",
      data: restoredAdmin,
    });
  } catch (error) {
    logger.error(`[PATCH /api/admin/restore/${req.params.id}] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to restore admin",
      error: error.message,
    });
  }
};