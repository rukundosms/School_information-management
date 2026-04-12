<?php
include("connection.php");
session_start();

// Check if user is logged in
if (!isset($_SESSION['tid']) || !isset($_SESSION['tcode'])) {
    header("Location: userlogin.php");
    exit();
}

$me = $_SESSION['tid'];
$code = $_SESSION['tcode'];
$error_message = "";
$info_message = "";

// Fetch user data to check if password already exists
$user_check = mysqli_query($conn, "SELECT * FROM user WHERE tcode='$code'");
$user_exists = mysqli_num_rows($user_check) > 0;
$has_password = false;

if ($user_exists) {
    $user_data = mysqli_fetch_assoc($user_check);
    if (!empty($user_data['password'])) {
        $has_password = true;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teacher Login</title>
    <style>
        * {
            padding: 0;
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            box-sizing: border-box;
        }
        
        body {
            background-color: rgb(238, 247, 238);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        
        form {
            width: 100%;
            max-width: 500px;
        }
        
        .cont {
            width: 100%;
            height: fit-content;
            padding: 30px;
            margin: auto;
            text-align: center;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 24px;
        }
        
        sup {
            color: rgb(18, 230, 18);
            font-size: 20px;
        }
        
        span {
            display: block;
            font-size: 16px;
            color: #555;
            margin-bottom: 20px;
        }
        
        input {
            width: 100%;
            font-size: 16px;
            height: 50px;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #ddd;
            margin-bottom: 20px;
            transition: border 0.3s;
        }
        
        input:focus {
            border-color: rgb(18, 230, 18);
            outline: none;
        }
        
        .button-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        button {
            font-size: 16px;
            border: none;
            border-radius: 8px;
            padding: 15px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s, transform 0.2s;
            width: 100%;
        }
        
        button:hover {
            transform: translateY(-2px);
        }
        
        button[name="login"] {
            background: rgb(18, 230, 18);
            color: white;
        }
        
        button[name="login"]:hover {
            background: rgb(15, 200, 15);
        }
        
        button[name="create"] {
            background: white;
            color: rgb(18, 230, 18);
            border: 2px solid rgb(18, 230, 18);
        }
        
        button[name="create"]:hover {
            background: rgba(18, 230, 18, 0.1);
        }
        
        button[name="create"]:disabled {
            background: #f5f5f5;
            color: #999;
            border-color: #ddd;
            cursor: not-allowed;
            transform: none;
        }
        
        .message {
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 5px;
            font-size: 14px;
        }
        
        .error {
            background-color: #ffe6e6;
            color: #cc0000;
            border: 1px solid #ffcccc;
        }
        
        .info {
            background-color: #e6f2ff;
            color: #0066cc;
            border: 1px solid #cce0ff;
        }
        
        .success {
            background-color: #e6ffe6;
            color: #006600;
            border: 1px solid #ccffcc;
        }
        
        @media (max-width: 600px) {
            .cont {
                padding: 25px;
            }
            
            h1 {
                font-size: 22px;
                margin-bottom: 15px;
            }
            
            input {
                height: 45px;
                font-size: 15px;
            }
            
            button {
                padding: 12px;
                font-size: 15px;
            }
        }
        
        @media (max-width: 400px) {
            .cont {
                padding: 20px;
            }
            
            h1 {
                font-size: 20px;
            }
            
            span {
                font-size: 14px;
            }
            
            input {
                height: 40px;
                font-size: 14px;
                padding: 10px;
            }
            
            button {
                padding: 10px;
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <form action="" method="post">
        <div class="cont">
            <h1><?php echo htmlspecialchars($_SESSION['fname']); ?></h1>
            <span>Enter password to continue</span>
            
            <?php if (!empty($error_message)): ?>
                <div class="message error"><?php echo htmlspecialchars($error_message); ?></div>
            <?php endif; ?>
            
            <?php if (!empty($info_message)): ?>
                <div class="message info"><?php echo htmlspecialchars($info_message); ?></div>
            <?php endif; ?>
            
            <?php if ($has_password): ?>
                <div class="message info">You already have a password. Please login.</div>
            <?php elseif ($user_exists && !$has_password): ?>
                <div class="message info">Please create a password for your account.</div>
            <?php endif; ?>
            
            <input type="password" name="password" placeholder="Your password" required>
            
            <div class="button-group">
                <button name="login">Login</button>
                <button name="create" <?php echo ($has_password) ? 'disabled' : ''; ?>>
                    <?php echo ($has_password) ? 'Password Already Exists' : 'Create Password'; ?>
                </button>
            </div>
        </div>
    </form>
</body>
</html>
<?php
// Login handler
if (isset($_POST['login'])) {
    $password = mysqli_real_escape_string($conn, $_POST['password']);
    
    if (empty($password)) {
        $error_message = "Please enter your password";
    } else {
        // Check if user exists with this tcode
        $check_tcode = mysqli_query($conn, "SELECT * FROM user WHERE tcode='$code'");
        
        if (mysqli_num_rows($check_tcode) < 1) {
            // User doesn't exist in user table
            $error_message = "Account not found. Please create a password first.";
        } else {
            // User exists, check if they have a password
            $user_data = mysqli_fetch_assoc($check_tcode);
            
            if (empty($user_data['password'])) {
                // Password not set yet
                $error_message = "Please create a password first.";
            } else {
                // Verify password (plain text comparison)
                if ($user_data['password'] === $password) {
                    // Update last_activity timestamp
                    $update_time = mysqli_query($conn, "UPDATE user SET last_activity=NOW() WHERE tcode='$code'");
                    
                    // Store user info in session
                    $_SESSION['user_id'] = $user_data['uid'];
                    $_SESSION['user_role'] = $user_data['role'];
                    
                    header("Location:user.php");
                    exit();
                } else {
                    $error_message = "Invalid password. Please try again.";
                }
            }
        }
    }
}

// Create password handler
if (isset($_POST['create'])) {
    // First check if tcode exists in user table
    $check_tcode = mysqli_query($conn, "SELECT * FROM user WHERE tcode='$code'");
    
    if (mysqli_num_rows($check_tcode) > 0) {
        // User exists, check if they already have a password
        $user_data = mysqli_fetch_assoc($check_tcode);
        
        if (!empty($user_data['password'])) {
            // Password already exists
            $error_message = "Password already exists. Please login instead.";
        } else {
            // User exists but has no password - redirect to create password page
            header("Location: create.php");
            exit();
        }
    } else {
        // User doesn't exist in user table - insert new record
        // First, check if tcode exists in teachers table (adjust table name as needed)
        $check_teacher = mysqli_query($conn, "SELECT * FROM teachers WHERE tcode='$code'");
        
        if (mysqli_num_rows($check_teacher) > 0) {
            // Teacher exists in teachers table, insert into user table
            $teacher_data = mysqli_fetch_assoc($check_teacher);
            $teacher_name = mysqli_real_escape_string($conn, $teacher_data['fname'] . ' ' . $teacher_data['lname']);
            
            $insert_user = mysqli_query($conn, "INSERT INTO user (tcode, password, role, last_activity) 
                                              VALUES ('$code', '', 'teacher', NOW())");
            
            if ($insert_user) {
                header("Location: create.php");
                exit();
            } else {
                $error_message = "Error creating user record. Please contact administrator.";
            }
        } else {
            // Teacher code not found in any table
            $error_message = "Invalid teacher code. Please contact administrator.";
        }
    }
}

// If there's an error, reload the page to show the message
if (!empty($error_message) || !empty($info_message)) {
    echo "<script>window.location.href = window.location.href.split('?')[0];</script>";
}
?>