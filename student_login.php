<?php
session_start();
include("connection.php");

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get current active year
$current_year_query = mysqli_query($conn, "SELECT year_id, year FROM year WHERE status = 'active' LIMIT 1");
$current_year = mysqli_fetch_assoc($current_year_query);
$current_year_id = $current_year ? $current_year['year_id'] : 0;

// Get all available years
$years_query = mysqli_query($conn, "SELECT year_id, year, status FROM year ORDER BY year_id DESC");

// Handle AJAX request for classes based on selected year
if (isset($_GET['ajax']) && $_GET['ajax'] == 'get_classes') {
    header('Content-Type: application/json');
    
    $year_id = isset($_GET['year_id']) ? intval($_GET['year_id']) : 0;
    
    $classes = [];
    
    if ($year_id > 0) {
        // First try to get classes from promotion_log
        $classes_query = mysqli_query($conn, "
            SELECT DISTINCT c.cid, c.class_name, c.class_code
            FROM class c
            INNER JOIN student_promotion_log sp ON c.cid = sp.to_class
            WHERE sp.to_year = '$year_id'
            AND sp.decision = 'Promoted'
            ORDER BY c.class_name ASC
        ");
        
        while($class = mysqli_fetch_assoc($classes_query)) {
            $classes[] = [
                'cid' => $class['cid'],
                'class_name' => $class['class_name'],
                'class_code' => $class['class_code']
            ];
        }
        
        // If no classes found in promotion_log, get all classes
        if (empty($classes)) {
            $all_classes_query = mysqli_query($conn, "
                SELECT cid, class_name, class_code 
                FROM class 
                ORDER BY class_name ASC
            ");
            
            while($class = mysqli_fetch_assoc($all_classes_query)) {
                $classes[] = [
                    'cid' => $class['cid'],
                    'class_name' => $class['class_name'],
                    'class_code' => $class['class_code']
                ];
            }
        }
    }
    
    echo json_encode(['success' => true, 'classes' => $classes]);
    exit();
}

// Handle AJAX request for students
if (isset($_GET['ajax']) && $_GET['ajax'] == 'get_students') {
    header('Content-Type: application/json');
    
    $class_id = isset($_GET['class_id']) ? intval($_GET['class_id']) : 0;
    $year_id = isset($_GET['year_id']) ? intval($_GET['year_id']) : 0;
    
    $students = [];
    
    if ($class_id > 0 && $year_id > 0) {
        // First try to get students from promotion_log
        $students_query = mysqli_query($conn, "
            SELECT DISTINCT s.sid, s.firstname, s.lastname, s.reg, s.program_id
            FROM student s
            INNER JOIN student_promotion_log sp ON s.sid = sp.sid
            WHERE sp.to_class = '$class_id' 
            AND sp.to_year = '$year_id'
            AND sp.decision = 'Promoted'
            ORDER BY s.firstname ASC
        ");
        
        while($student = mysqli_fetch_assoc($students_query)) {
            $students[] = [
                'sid' => $student['sid'],
                'name' => $student['firstname'] . ' ' . $student['lastname'],
                'reg' => $student['reg'],
                'program_id' => $student['program_id']
            ];
        }
        
        // If no students found in promotion_log, get students directly from student table
        if (empty($students)) {
            $direct_query = mysqli_query($conn, "
                SELECT sid, firstname, lastname, reg, program_id
                FROM student 
                WHERE class = '$class_id'
                ORDER BY firstname ASC
            ");
            
            while($student = mysqli_fetch_assoc($direct_query)) {
                $students[] = [
                    'sid' => $student['sid'],
                    'name' => $student['firstname'] . ' ' . $student['lastname'],
                    'reg' => $student['reg'],
                    'program_id' => $student['program_id']
                ];
            }
        }
    }
    
    echo json_encode(['success' => true, 'students' => $students]);
    exit();
}

// Handle login form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $student_id = intval($_POST['student_id']);
    $class_id = intval($_POST['class_id']);
    $year_id = intval($_POST['year_id']);
    
    // Try to verify from promotion_log first
    $verify_query = mysqli_query($conn, "
        SELECT s.*, sp.to_class, sp.to_year, sp.decision, c.class_name, c.class_code
        FROM student s
        INNER JOIN student_promotion_log sp ON s.sid = sp.sid
        INNER JOIN class c ON sp.to_class = c.cid
        WHERE s.sid = '$student_id' 
        AND sp.to_class = '$class_id'
        AND sp.to_year = '$year_id'
        AND sp.decision = 'Promoted'
    ");
    
    if (mysqli_num_rows($verify_query) > 0) {
        $student = mysqli_fetch_assoc($verify_query);
    } else {
        // If not in promotion_log, try direct student table
        $direct_verify = mysqli_query($conn, "
            SELECT s.*, c.class_name, c.class_code
            FROM student s
            INNER JOIN class c ON s.class = c.cid
            WHERE s.sid = '$student_id' AND s.class = '$class_id'
        ");
        
        if (mysqli_num_rows($direct_verify) > 0) {
            $student = mysqli_fetch_assoc($direct_verify);
            $student['to_class'] = $class_id;
            $student['to_year'] = $year_id;
        } else {
            $error = "Invalid login credentials. Please ensure you are enrolled in this class.";
        }
    }
    
    if (isset($student) && $student) {
        // Login successful
        $_SESSION['sid'] = $student['sid'];
        $_SESSION['student_name'] = $student['firstname'] . ' ' . $student['lastname'];
        $_SESSION['student_class_id'] = $class_id;
        $_SESSION['student_class_name'] = $student['class_name'];
        $_SESSION['student_reg'] = $student['reg'];
        $_SESSION['student_program_id'] = $student['program_id'];
        $_SESSION['current_year_id'] = $year_id;
        
        // Add login notification
        mysqli_query($conn, "
            INSERT INTO notifications (sid, title, message, link, created_at) 
            VALUES ('{$student['sid']}', 'Login Successful', 
            'You logged in at " . date('Y-m-d H:i:s') . "', 'student_dashboard.php', NOW())
        ");
        
        header("location:student_dashboard.php");
        exit();
    } else {
        $error = "Invalid login credentials. Please ensure you have been promoted to this class for the selected academic year.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Login - Future King Schools</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .login-container {
            width: 100%;
            max-width: 500px;
        }
        
        .login-card {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            animation: fadeInUp 0.5s ease;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .login-header .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 15px;
        }
        
        .login-header .logo i {
            font-size: 40px;
            color: white;
        }
        
        .login-header h2 {
            color: #202124;
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .login-header p {
            color: #5f6368;
            font-size: 14px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            font-weight: 500;
            color: #202124;
            margin-bottom: 8px;
            display: block;
        }
        
        .form-label i {
            margin-right: 8px;
            color: #667eea;
        }
        
        .form-select, .form-control {
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 12px 15px;
            font-size: 14px;
            transition: all 0.3s;
        }
        
        .form-select:focus, .form-control:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
            outline: none;
        }
        
        .btn-login {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            width: 100%;
            padding: 12px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102,126,234,0.4);
        }
        
        .btn-login:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .info-text {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 10px;
            font-size: 12px;
            color: #5f6368;
            margin-top: 20px;
            text-align: center;
        }
        
        .info-text i {
            color: #667eea;
            margin-right: 5px;
        }
        
        .alert-custom {
            border-radius: 10px;
            padding: 12px 15px;
            margin-bottom: 20px;
        }
        
        .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.6s linear infinite;
            margin-right: 8px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Debug panel */
        .debug-panel {
            margin-top: 15px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 11px;
            font-family: monospace;
            display: none;
        }
        .debug-panel.show {
            display: block;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <div class="logo">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <h2>Student Portal Login</h2>
                <p>Access your academic dashboard</p>
            </div>
            
            <?php if(isset($error)): ?>
                <div class="alert alert-danger alert-custom">
                    <i class="fas fa-exclamation-circle"></i> <?php echo $error; ?>
                </div>
            <?php endif; ?>
            
            <form method="POST" id="loginForm">
                <!-- Academic Year Selection (First) -->
                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-calendar-alt"></i> Select Academic Year
                    </label>
                    <select name="year_id" id="year_id" class="form-select" required>
                        <option value="">-- Select Academic Year --</option>
                        <?php 
                        mysqli_data_seek($years_query, 0);
                        while($year = mysqli_fetch_assoc($years_query)): 
                        ?>
                            <option value="<?php echo $year['year_id']; ?>" <?php echo ($year['status'] == 'active') ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($year['year']); ?> 
                                <?php if($year['status'] == 'active'): ?>
                                    (Current)
                                <?php endif; ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
                
                <!-- Class Selection (Dynamically loaded based on Year) -->
                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-chalkboard"></i> Select Your Class
                    </label>
                    <select name="class_id" id="class_id" class="form-select" required disabled>
                        <option value="">-- First Select Academic Year --</option>
                    </select>
                </div>
                
                <!-- Student Name Selection (Dynamically loaded based on Class and Year) -->
                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-user-graduate"></i> Select Your Name
                    </label>
                    <select name="student_id" id="student_id" class="form-select" required disabled>
                        <option value="">-- First Select Class --</option>
                    </select>
                </div>
                
                <button type="submit" class="btn-login" id="loginBtn" disabled>
                    <i class="fas fa-sign-in-alt"></i> Login to Dashboard
                </button>
            </form>
            
            <div class="info-text">
                <i class="fas fa-info-circle"></i> 
                Select your academic year, class, and name to login. Contact the academic office if you have issues.
            </div>
            
            <!-- Debug Panel (Hidden by default, press Ctrl+Shift+D to show) -->
            <div id="debugPanel" class="debug-panel">
                <strong>Debug Info:</strong><br>
                <span id="debugMessage"></span>
            </div>
        </div>
    </div>
    
    <script>
        const yearSelect = document.getElementById('year_id');
        const classSelect = document.getElementById('class_id');
        const studentSelect = document.getElementById('student_id');
        const loginBtn = document.getElementById('loginBtn');
        const debugPanel = document.getElementById('debugPanel');
        const debugMessage = document.getElementById('debugMessage');
        
        // Show debug panel with Ctrl+Shift+D
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                debugPanel.classList.toggle('show');
            }
        });
        
        function logDebug(message) {
            console.log(message);
            debugMessage.innerHTML += new Date().toLocaleTimeString() + ': ' + message + '<br>';
        }
        
        // Load classes based on selected year
        async function loadClasses() {
            const yearId = yearSelect.value;
            
            logDebug('loadClasses called with yearId: ' + yearId);
            
            if (yearId) {
                classSelect.disabled = true;
                classSelect.innerHTML = '<option value="">Loading classes...</option>';
                studentSelect.disabled = true;
                studentSelect.innerHTML = '<option value="">-- First Select Class --</option>';
                loginBtn.disabled = true;
                
                try {
                    const url = `?ajax=get_classes&year_id=${yearId}`;
                    logDebug('Fetching: ' + url);
                    
                    const response = await fetch(url);
                    const data = await response.json();
                    
                    logDebug('Response received: ' + JSON.stringify(data));
                    
                    if (data.success && data.classes && data.classes.length > 0) {
                        classSelect.innerHTML = '<option value="">-- Select Your Class --</option>';
                        data.classes.forEach(cls => {
                            const option = document.createElement('option');
                            option.value = cls.cid;
                            option.textContent = `${cls.class_name} (${cls.class_code})`;
                            classSelect.appendChild(option);
                        });
                        classSelect.disabled = false;
                        logDebug('Classes loaded: ' + data.classes.length + ' classes');
                    } else {
                        classSelect.innerHTML = '<option value="">No classes available for this year</option>';
                        classSelect.disabled = true;
                        logDebug('No classes found');
                    }
                } catch (error) {
                    logDebug('Error loading classes: ' + error.message);
                    classSelect.innerHTML = '<option value="">Error loading classes. Check console.</option>';
                    classSelect.disabled = true;
                }
            } else {
                classSelect.innerHTML = '<option value="">-- First Select Academic Year --</option>';
                classSelect.disabled = true;
                studentSelect.innerHTML = '<option value="">-- First Select Class --</option>';
                studentSelect.disabled = true;
                loginBtn.disabled = true;
                logDebug('No year selected');
            }
        }
        
        // Load students based on selected class and year
        async function loadStudents() {
            const classId = classSelect.value;
            const yearId = yearSelect.value;
            
            logDebug('loadStudents called with classId: ' + classId + ', yearId: ' + yearId);
            
            if (classId && yearId) {
                studentSelect.disabled = true;
                studentSelect.innerHTML = '<option value="">Loading students...</option>';
                loginBtn.disabled = true;
                
                try {
                    const url = `?ajax=get_students&class_id=${classId}&year_id=${yearId}`;
                    logDebug('Fetching: ' + url);
                    
                    const response = await fetch(url);
                    const data = await response.json();
                    
                    logDebug('Response received: ' + JSON.stringify(data));
                    
                    if (data.success && data.students && data.students.length > 0) {
                        studentSelect.innerHTML = '<option value="">-- Select Your Name --</option>';
                        data.students.forEach(student => {
                            const option = document.createElement('option');
                            option.value = student.sid;
                            option.textContent = `${student.name} (${student.reg})`;
                            studentSelect.appendChild(option);
                        });
                        studentSelect.disabled = false;
                        logDebug('Students loaded: ' + data.students.length + ' students');
                    } else {
                        studentSelect.innerHTML = '<option value="">No students found for this class and year</option>';
                        studentSelect.disabled = true;
                        loginBtn.disabled = true;
                        logDebug('No students found');
                    }
                } catch (error) {
                    logDebug('Error loading students: ' + error.message);
                    studentSelect.innerHTML = '<option value="">Error loading students. Check console.</option>';
                    studentSelect.disabled = true;
                    loginBtn.disabled = true;
                }
            }
        }
        
        // Enable login button when student is selected
        function checkLoginEnabled() {
            if (studentSelect.value && studentSelect.value !== '') {
                loginBtn.disabled = false;
                logDebug('Login button enabled');
            } else {
                loginBtn.disabled = true;
                logDebug('Login button disabled');
            }
        }
        
        // Add event listeners
        yearSelect.addEventListener('change', function() {
            logDebug('Year changed to: ' + yearSelect.value);
            loadClasses();
        });
        
        classSelect.addEventListener('change', function() {
            logDebug('Class changed to: ' + classSelect.value);
            loadStudents();
        });
        
        studentSelect.addEventListener('change', checkLoginEnabled);
        
        // Initial load if year is pre-selected
        if (yearSelect.value) {
            logDebug('Initial year selected: ' + yearSelect.value);
            loadClasses();
        }
        
        // Also trigger classes if year is already selected on page load
        document.addEventListener('DOMContentLoaded', function() {
            if (yearSelect.value) {
                loadClasses();
            }
        });
    </script>
</body>
</html>