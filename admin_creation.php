<?php
// admin.php - User Administration Panel
require_once 'connection.php'; // Database connection and session start

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Initialize variables
$success = $error = "";
$users = [];
$edit_user = null;

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['add_user'])) {
        $role = $_POST['role'];
        $password = $_POST['password'];
        
        if ($role == 'teacher') {
            $tcode = trim($_POST['tcode']);
            $fname = trim($_POST['fname']);
            $lname = trim($_POST['lname']);
            
            // Insert into user table
            $stmt = $conn->prepare("INSERT INTO user (tcode, password, role) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $tcode, $password, $role);
            
            if ($stmt->execute()) {
                $user_id = $stmt->insert_id;
                
                // Insert into teacher table
                $stmt2 = $conn->prepare("INSERT INTO teacher (tid, fname, lname, tcode) VALUES (?, ?, ?, ?)");
                $stmt2->bind_param("isss", $user_id, $fname, $lname, $tcode);
                $stmt2->execute();
                $success = "Teacher added successfully!";
            } else {
                $error = "Error adding teacher: " . $conn->error;
            }
            
        } elseif ($role == 'admin') {
            $username = trim($_POST['username']);
            $position = trim($_POST['position']);
            
            // Insert into user table
            $stmt = $conn->prepare("INSERT INTO user (username, password, role) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $username, $password, $role);
            
            if ($stmt->execute()) {
                $user_id = $stmt->insert_id;
                
                // Insert into admin table
                $stmt2 = $conn->prepare("INSERT INTO admin (id, username, password, position) VALUES (?, ?, ?, ?)");
                $stmt2->bind_param("isss", $user_id, $username, $password, $position);
                $stmt2->execute();
                $success = "Admin added successfully!";
            } else {
                $error = "Error adding admin: " . $conn->error;
            }
        }
        
    } elseif (isset($_POST['update_user'])) {
        $user_id = (int)$_POST['user_id'];
        $role = $_POST['role'];
        
        if ($role == 'teacher') {
            $tcode = trim($_POST['tcode']);
            $fname = trim($_POST['fname']);
            $lname = trim($_POST['lname']);
            
            // Update user table
            if (!empty($_POST['password'])) {
                $password = $_POST['password'];
                $stmt = $conn->prepare("UPDATE user SET tcode=?, password=?, role=? WHERE uid=?");
                $stmt->bind_param("sssi", $tcode, $password, $role, $user_id);
            } else {
                $stmt = $conn->prepare("UPDATE user SET tcode=?, role=? WHERE uid=?");
                $stmt->bind_param("ssi", $tcode, $role, $user_id);
            }
            
            if ($stmt->execute()) {
                // Check if exists in teacher table
                $check = $conn->query("SELECT tid FROM teacher WHERE tid = $user_id");
                if ($check->num_rows > 0) {
                    $stmt2 = $conn->prepare("UPDATE teacher SET fname=?, lname=?, tcode=? WHERE tid=?");
                    $stmt2->bind_param("sssi", $fname, $lname, $tcode, $user_id);
                } else {
                    $stmt2 = $conn->prepare("INSERT INTO teacher (tid, fname, lname, tcode) VALUES (?, ?, ?, ?)");
                    $stmt2->bind_param("isss", $user_id, $fname, $lname, $tcode);
                }
                $stmt2->execute();
                
                // Remove from admin table if exists
                $conn->query("DELETE FROM admin WHERE id = $user_id");
                
                $success = "Teacher updated successfully!";
            }
            
        } elseif ($role == 'admin') {
            $username = trim($_POST['username']);
            $position = trim($_POST['position']);
            
            // Update user table
            if (!empty($_POST['password'])) {
                $password = $_POST['password'];
                $stmt = $conn->prepare("UPDATE user SET username=?, password=?, role=? WHERE uid=?");
                $stmt->bind_param("sssi", $username, $password, $role, $user_id);
            } else {
                $stmt = $conn->prepare("UPDATE user SET username=?, role=? WHERE uid=?");
                $stmt->bind_param("ssi", $username, $role, $user_id);
            }
            
            if ($stmt->execute()) {
                // Check if exists in admin table
                $check = $conn->query("SELECT id FROM admin WHERE id = $user_id");
                if ($check->num_rows > 0) {
                    if (!empty($_POST['password'])) {
                        $stmt2 = $conn->prepare("UPDATE admin SET username=?, password=?, position=? WHERE id=?");
                        $stmt2->bind_param("sssi", $username, $password, $position, $user_id);
                    } else {
                        $stmt2 = $conn->prepare("UPDATE admin SET username=?, position=? WHERE id=?");
                        $stmt2->bind_param("ssi", $username, $position, $user_id);
                    }
                } else {
                    $stmt2 = $conn->prepare("INSERT INTO admin (id, username, password, position) VALUES (?, ?, ?, ?)");
                    $stmt2->bind_param("isss", $user_id, $username, $password, $position);
                }
                $stmt2->execute();
                
                // Remove from teacher table if exists
                $conn->query("DELETE FROM teacher WHERE tid = $user_id");
                
                $success = "Admin updated successfully!";
            }
        }
    }
} elseif (isset($_GET['delete'])) {
    $user_id = (int)$_GET['delete'];
    
    // Get user role
    $result = $conn->query("SELECT role FROM user WHERE uid = $user_id");
    if ($result && $result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $role = $user['role'];
        
        // Delete from user table
        $stmt = $conn->prepare("DELETE FROM user WHERE uid=?");
        $stmt->bind_param("i", $user_id);
        
        if ($stmt->execute()) {
            // Delete from role-specific table
            if ($role == 'teacher') {
                $conn->query("DELETE FROM teacher WHERE tid = $user_id");
            } elseif ($role == 'admin') {
                $conn->query("DELETE FROM admin WHERE id = $user_id");
            }
            $success = "User deleted successfully!";
        }
    }
}

// FIRST: Let's debug by fetching data separately to see what's in the database
echo "<!-- DEBUG INFO START -->\n";

// Get all users from user table
$all_users = $conn->query("SELECT * FROM user ORDER BY uid");
echo "<!-- Total users in user table: " . ($all_users ? $all_users->num_rows : 0) . " -->\n";

// Get all teachers
$all_teachers = $conn->query("SELECT * FROM teacher");
echo "<!-- Total teachers: " . ($all_teachers ? $all_teachers->num_rows : 0) . " -->\n";

// Get all admins
$all_admins = $conn->query("SELECT * FROM admin");
echo "<!-- Total admins: " . ($all_admins ? $all_admins->num_rows : 0) . " -->\n";

echo "<!-- DEBUG INFO END -->\n";

// Fetch all users with proper joins - SIMPLIFIED QUERY
$result = $conn->query("
    SELECT 
        u.uid,
        u.role,
        u.last_activity,
        u.tcode,
        t.fname,
        t.lname,
        a.position
    FROM user u
    LEFT JOIN teacher t ON u.uid = t.tid
    LEFT JOIN admin a ON u.uid = a.id
    ORDER BY u.uid");

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
} else {
    echo "<!-- Query returned no results or error -->\n";
}

// Fetch edit user data if editing
if (isset($_GET['edit'])) {
    $user_id = (int)$_GET['edit'];
    $result = $conn->query("
        SELECT u.*, t.fname, t.lname, t.tcode as teacher_tcode, a.position, a.username as admin_username
        FROM user u
        LEFT JOIN teacher t ON u.uid = t.tid
        LEFT JOIN admin a ON u.uid = a.id
        WHERE u.uid = $user_id");
    
    if ($result && $result->num_rows > 0) {
        $edit_user = $result->fetch_assoc();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - User Management</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .form-section { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .table-responsive { margin-top: 20px; }
        .role-fields { display: none; }
    </style>
</head>
<body>
    <div class="container mt-4">
        <h2 class="mb-4">User Management</h2>
        
        <?php if ($success): ?>
            <div class="alert alert-success"><?= htmlspecialchars($success) ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="alert alert-danger"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        
        <!-- Add/Edit User Form -->
        <div class="form-section">
            <h4><?= isset($edit_user) ? 'Edit User' : 'Add New User' ?></h4>
            <form method="POST" id="userForm">
                <?php if (isset($edit_user)): ?>
                    <input type="hidden" name="user_id" value="<?= $edit_user['uid'] ?>">
                <?php endif; ?>
                
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">Role *</label>
                        <select class="form-select" name="role" id="roleSelect" required>
                            <option value="">Select Role</option>
                            <option value="teacher" <?= (isset($edit_user) && $edit_user['role'] == 'teacher') ? 'selected' : '' ?>>Teacher</option>
                            <option value="admin" <?= (isset($edit_user) && $edit_user['role'] == 'admin') ? 'selected' : '' ?>>Admin</option>
                        </select>
                    </div>
                    
                    <!-- Password Field -->
                    <div class="col-md-6">
                        <label class="form-label">Password <?= !isset($edit_user) ? '*' : '' ?></label>
                        <input type="password" class="form-control" name="password" 
                            placeholder="<?= isset($edit_user) ? 'Leave blank to keep current' : '' ?>"
                            <?= !isset($edit_user) ? 'required' : '' ?>>
                    </div>
                    
                    <!-- Teacher Fields -->
                    <div id="teacherFields" class="role-fields">
                        <div class="col-md-6">
                            <label class="form-label">Teacher Code *</label>
                            <input type="text" class="form-control" name="tcode" 
                                value="<?= isset($edit_user) && $edit_user['role'] == 'teacher' ? htmlspecialchars($edit_user['tcode'] ?? $edit_user['teacher_tcode'] ?? '') : '' ?>">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">First Name *</label>
                            <input type="text" class="form-control" name="fname" 
                                value="<?= isset($edit_user) && $edit_user['role'] == 'teacher' ? htmlspecialchars($edit_user['fname'] ?? '') : '' ?>">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Last Name *</label>
                            <input type="text" class="form-control" name="lname" 
                                value="<?= isset($edit_user) && $edit_user['role'] == 'teacher' ? htmlspecialchars($edit_user['lname'] ?? '') : '' ?>">
                        </div>
                    </div>
                    
                    <!-- Admin Fields -->
                    <div id="adminFields" class="role-fields">
                        <div class="col-md-6">
                            <label class="form-label">Username *</label>
                            <input type="text" class="form-control" name="username" 
                                value="<?= isset($edit_user) && $edit_user['role'] == 'admin' ? htmlspecialchars($edit_user['username'] ?? $edit_user['admin_username'] ?? '') : '' ?>">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Position *</label>
                            <input type="text" class="form-control" name="position" 
                                value="<?= isset($edit_user) && $edit_user['role'] == 'admin' ? htmlspecialchars($edit_user['position'] ?? '') : '' ?>">
                        </div>
                    </div>
                    
                    <div class="col-12 mt-3">
                        <button type="submit" class="btn btn-primary" name="<?= isset($edit_user) ? 'update_user' : 'add_user' ?>">
                            <?= isset($edit_user) ? 'Update User' : 'Add User' ?>
                        </button>
                        <?php if (isset($edit_user)): ?>
                            <a href="admin.php" class="btn btn-secondary">Cancel</a>
                        <?php endif; ?>
                    </div>
                </div>
            </form>
        </div>
        
        <!-- Users List -->
        <div class="table-responsive">
            <h4>Existing Users (Total: <?= count($users) ?>)</h4>
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Role</th>
                        <th>Login ID</th>
                        <th>Name</th>
                        <th>Details</th>
                        <th>Last Activity</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($users)): ?>
                        <tr>
                            <td colspan="7" class="text-center">No users found in database</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($users as $user): ?>
                            <tr>
                                <td><?= $user['uid'] ?></td>
                                <td>
                                    <span class="badge bg-<?= $user['role'] == 'admin' ? 'danger' : 'primary' ?>">
                                        <?= ucfirst($user['role'] ?? 'unknown') ?>
                                    </span>
                                </td>
                                <td>
                                    <?php 
                                    if ($user['role'] == 'teacher') {
                                        echo htmlspecialchars($user['tcode'] ?? 'No tcode');
                                    } else {
                                        echo htmlspecialchars($user['username'] ?? 'No username');
                                    }
                                    ?>
                                </td>
                                <td>
                                    <?php if ($user['role'] == 'teacher'): ?>
                                        <?= htmlspecialchars(($user['fname'] ?? '') . ' ' . ($user['lname'] ?? '')) ?>
                                    <?php elseif ($user['role'] == 'admin'): ?>
                                        <?= htmlspecialchars($user['username'] ?? 'Admin') ?>
                                    <?php else: ?>
                                        Unknown
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($user['role'] == 'teacher'): ?>
                                        Teacher
                                    <?php elseif ($user['role'] == 'admin'): ?>
                                        Position: <?= htmlspecialchars($user['position'] ?? 'Not specified') ?>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if (!empty($user['last_activity'])): ?>
                                        <?= date('Y-m-d H:i', strtotime($user['last_activity'])) ?>
                                    <?php else: ?>
                                        Never
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <a href="admin.php?edit=<?= $user['uid'] ?>" class="btn btn-sm btn-warning">Edit</a>
                                    <a href="admin.php?delete=<?= $user['uid'] ?>" class="btn btn-sm btn-danger" 
                                        onclick="return confirm('Are you sure you want to delete this user?')">Delete</a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        
        <!-- Debug Section (visible only during development) -->
        <div class="mt-4 p-3 bg-light border rounded">
            <h5>Debug Information:</h5>
            <p><strong>Users in user table:</strong> <?= $all_users ? $all_users->num_rows : 'Error' ?></p>
            <p><strong>Teachers in teacher table:</strong> <?= $all_teachers ? $all_teachers->num_rows : 'Error' ?></p>
            <p><strong>Admins in admin table:</strong> <?= $all_admins ? $all_admins->num_rows : 'Error' ?></p>
            <p><strong>Displayed users:</strong> <?= count($users) ?></p>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const roleSelect = document.getElementById('roleSelect');
            const teacherFields = document.getElementById('teacherFields');
            const adminFields = document.getElementById('adminFields');
            
            function showRoleFields() {
                // Hide all
                teacherFields.style.display = 'none';
                adminFields.style.display = 'none';
                
                // Show based on selection
                if (roleSelect.value === 'teacher') {
                    teacherFields.style.display = 'block';
                    // Set required fields
                    teacherFields.querySelectorAll('input').forEach(input => {
                        if (input.name === 'tcode' || input.name === 'fname' || input.name === 'lname') {
                            input.required = true;
                        } else {
                            input.required = false;
                        }
                    });
                } else if (roleSelect.value === 'admin') {
                    adminFields.style.display = 'block';
                    // Set required fields
                    adminFields.querySelectorAll('input').forEach(input => {
                        if (input.name === 'username' || input.name === 'position') {
                            input.required = true;
                        } else {
                            input.required = false;
                        }
                    });
                }
            }
            
            // Initial call
            showRoleFields();
            
            // Add event listener
            roleSelect.addEventListener('change', showRoleFields);
            
            // Form validation
            document.getElementById('userForm').addEventListener('submit', function(e) {
                const role = roleSelect.value;
                
                if (!role) {
                    alert('Please select a role');
                    e.preventDefault();
                    return;
                }
                
                if (role === 'teacher') {
                    const tcode = document.querySelector('input[name="tcode"]');
                    const fname = document.querySelector('input[name="fname"]');
                    const lname = document.querySelector('input[name="lname"]');
                    
                    if (!tcode.value || !fname.value || !lname.value) {
                        alert('Please fill all required fields for teacher');
                        e.preventDefault();
                    }
                } else if (role === 'admin') {
                    const username = document.querySelector('input[name="username"]');
                    const position = document.querySelector('input[name="position"]');
                    
                    if (!username.value || !position.value) {
                        alert('Please fill all required fields for admin');
                        e.preventDefault();
                    }
                }
            });
        });
    </script>
</body>
</html>