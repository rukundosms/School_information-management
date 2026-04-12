<?php 
// Turn on ALL error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Check if connection.php exists
if (!file_exists("connection.php")) {
    die("❌ ERROR: connection.php file not found!");
}

include("connection.php");

// Check if connection was established
if (!isset($conn)) {
    die("❌ ERROR: \$conn variable not set in connection.php!");
}

// Test connection
if (!$conn) {
    die("❌ ERROR: Database connection failed! " . mysqli_connect_error());
}

// Initialize variables
$current_year = "";
$from_year = "";
$to_year = "";
$promoted_marks = "";
$success_message = "";
$error_message = "";
$processed_students = [];
$total_students = 0;
$promoted_count = 0;
$repeated_count = 0;
$graduated_count = 0;
$skipped_count = 0;

// Create student_promotion_log table if it doesn't exist
$create_table_sql = "CREATE TABLE IF NOT EXISTS student_promotion_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sid INT NOT NULL,
    total_marks INT NOT NULL,
    from_class INT NOT NULL,
    to_class INT NULL,
    from_year INT NOT NULL,
    to_year INT NOT NULL,
    program_id INT NOT NULL,
    decision VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

mysqli_query($conn, $create_table_sql);

// Get current year from database
$year_result = mysqli_query($conn, "SELECT * FROM year WHERE status='active' LIMIT 1");
if ($year_result && mysqli_num_rows($year_result) > 0) {
    $current_year_data = mysqli_fetch_assoc($year_result);
    $current_year = $current_year_data['year'] ?? '';
    $current_year_id = $current_year_data['year_id'] ?? '';
}

// Check if we're in POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['promote'])) {
    
    $from_year = $_POST['from-year'] ?? '';
    $to_year = $_POST['to-year'] ?? '';
    $promoted_marks = $_POST['promoted_marks'] ?? 0;
    
    // Validate inputs
    if (empty($from_year) || empty($to_year) || empty($promoted_marks)) {
        $error_message = "❌ Please fill all required fields!";
    } elseif ($from_year == $to_year) {
        $error_message = "❌ 'From Year' and 'To Year' cannot be the same!";
    } else {
        // Get all students with marks > 0
        $student_query = "SELECT s.sid, s.class, s.program_id, r.yearl_pass 
                         FROM student s 
                         INNER JOIN ranks r ON s.sid = r.sit 
                         WHERE r.yearl_pass > 0";
        
        $students_result = mysqli_query($conn, $student_query);
        
        if (!$students_result) {
            $error_message = "❌ Error fetching students: " . mysqli_error($conn);
        } elseif (mysqli_num_rows($students_result) == 0) {
            $error_message = "❌ No students found with marks > 0";
        } else {
            $total_students = mysqli_num_rows($students_result);
            
            // Process each student
            while ($student = mysqli_fetch_assoc($students_result)) {
                $student_id = $student['sid'];
                $student_class = $student['class'];
                $student_program = $student['program_id'];
                $student_marks = $student['yearl_pass'];
                
                // Check if student already promoted to target year
                $check_promotion = mysqli_query($conn, 
                    "SELECT log_id FROM student_promotion_log 
                     WHERE sid = '$student_id' AND to_year = '$to_year'");
                
                if (mysqli_num_rows($check_promotion) > 0) {
                    $skipped_count++;
                    $processed_students[] = [
                        'id' => $student_id,
                        'action' => 'skipped',
                        'reason' => 'Already promoted to this year'
                    ];
                    continue;
                }
                
                // Get current class details
                $class_query = mysqli_query($conn, 
                    "SELECT * FROM class 
                     WHERE cid = '$student_class' 
                     AND class_program = '$student_program'");
                
                if (!$class_query || mysqli_num_rows($class_query) == 0) {
                    $processed_students[] = [
                        'id' => $student_id,
                        'action' => 'error',
                        'reason' => 'Class not found'
                    ];
                    continue;
                }
                
                $current_class = mysqli_fetch_assoc($class_query);
                $current_level = $current_class['class_level'] ?? 0;
                $program_id = $current_class['class_program'] ?? $student_program;
                
                // Check if next level exists
                $next_level = $current_level + 1;
                $next_class_query = mysqli_query($conn,
                    "SELECT cid FROM class 
                     WHERE class_program = '$program_id' 
                     AND class_level = '$next_level' 
                     LIMIT 1");
                
                $next_class_exists = ($next_class_query && mysqli_num_rows($next_class_query) > 0);
                
                // Determine promotion decision
                if ($student_marks >= $promoted_marks) {
                    if ($next_class_exists) {
                        $next_class = mysqli_fetch_assoc($next_class_query);
                        $next_class_id = $next_class['cid'];
                        
                        // Insert promotion record
                        $insert_sql = "INSERT INTO student_promotion_log 
                            (sid, total_marks, from_class, to_class, from_year, to_year, program_id, decision) 
                            VALUES ('$student_id', '$student_marks', '$student_class', '$next_class_id', 
                                    '$from_year', '$to_year', '$program_id', 'Promoted')";
                        
                        if (mysqli_query($conn, $insert_sql)) {
                            $promoted_count++;
                            $processed_students[] = [
                                'id' => $student_id,
                                'action' => 'promoted',
                                'marks' => $student_marks,
                                'from_class' => $student_class,
                                'to_class' => $next_class_id
                            ];
                        }
                    } else {
                        // Graduate student (no next class)
                        $insert_sql = "INSERT INTO student_promotion_log 
                            (sid, total_marks, from_class, from_year, to_year, program_id, decision) 
                            VALUES ('$student_id', '$student_marks', '$student_class', 
                                    '$from_year', '$to_year', '$program_id', 'Graduated')";
                        
                        if (mysqli_query($conn, $insert_sql)) {
                            $graduated_count++;
                            $processed_students[] = [
                                'id' => $student_id,
                                'action' => 'graduated',
                                'marks' => $student_marks,
                                'reason' => 'No next class available'
                            ];
                        }
                    }
                } else {
                    // Marks below threshold
                    if ($next_class_exists) {
                        // Repeat in same class
                        $insert_sql = "INSERT INTO student_promotion_log 
                            (sid, total_marks, from_class, to_class, from_year, to_year, program_id, decision) 
                            VALUES ('$student_id', '$student_marks', '$student_class', '$student_class', 
                                    '$from_year', '$to_year', '$program_id', 'Repeated')";
                        
                        if (mysqli_query($conn, $insert_sql)) {
                            $repeated_count++;
                            $processed_students[] = [
                                'id' => $student_id,
                                'action' => 'repeated',
                                'marks' => $student_marks,
                                'reason' => 'Marks below threshold'
                            ];
                        }
                    } else {
                        // Graduate despite low marks (no next class)
                        $insert_sql = "INSERT INTO student_promotion_log 
                            (sid, total_marks, from_class, from_year, to_year, program_id, decision) 
                            VALUES ('$student_id', '$student_marks', '$student_class', 
                                    '$from_year', '$to_year', '$program_id', 'Graduated')";
                        
                        if (mysqli_query($conn, $insert_sql)) {
                            $graduated_count++;
                            $processed_students[] = [
                                'id' => $student_id,
                                'action' => 'graduated',
                                'marks' => $student_marks,
                                'reason' => 'No next class + low marks'
                            ];
                        }
                    }
                }
            }
            
            // Prepare success message
            if ($total_students > 0) {
                $success_message = "✅ Promotion process completed successfully!<br>";
                $success_message .= "📊 <strong>Summary:</strong><br>";
                $success_message .= "• Total students processed: $total_students<br>";
                $success_message .= "• ✅ Promoted: $promoted_count<br>";
                $success_message .= "• 🔄 Repeated: $repeated_count<br>";
                $success_message .= "• 🎓 Graduated: $graduated_count<br>";
                $success_message .= "• ⏭️ Skipped: $skipped_count";
            } else {
                $error_message = "⚠️ No students were processed.";
            }
        }
    }
}

// Get years for dropdowns
$active_years = mysqli_query($conn, "SELECT * FROM year WHERE status='active' ORDER BY year DESC");
$inactive_years = mysqli_query($conn, "SELECT * FROM year WHERE status!='active' ORDER BY year DESC");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Promotion System</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css">
    <style>
        body {
            background-color: #f8f9fa;
            padding: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .summary-card {
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .promoted { background: #d4edda; border-left: 4px solid #28a745; }
        .repeated { background: #fff3cd; border-left: 4px solid #ffc107; }
        .graduated { background: #d1ecf1; border-left: 4px solid #17a2b8; }
        .skipped { background: #f8d7da; border-left: 4px solid #dc3545; }
        .student-list {
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
        }
        .student-item {
            padding: 8px 12px;
            margin-bottom: 5px;
            border-radius: 5px;
            background: #f8f9fa;
        }
        .badge-promoted { background: #28a745; }
        .badge-repeated { background: #ffc107; }
        .badge-graduated { background: #17a2b8; }
        .badge-skipped { background: #6c757d; }
        .form-control, .form-select {
            border-radius: 8px;
            padding: 10px 15px;
        }
        .btn-promote {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            font-weight: 600;
            border-radius: 8px;
            width: 100%;
            transition: transform 0.3s;
        }
        .btn-promote:hover {
            transform: translateY(-2px);
            color: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header text-center">
            <h1><i class="bi bi-mortarboard"></i> Student Promotion System</h1>
            <p class="mb-0">Promote students to the next academic year</p>
            <?php if ($current_year): ?>
                <div class="mt-2">
                    <span class="badge bg-light text-dark">
                        <i class="bi bi-calendar-check"></i> Current Academic Year: <?php echo htmlspecialchars($current_year); ?>
                    </span>
                </div>
            <?php endif; ?>
        </div>

        <?php if ($success_message): ?>
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <h5 class="alert-heading"><i class="bi bi-check-circle"></i> Success!</h5>
                <?php echo $success_message; ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>

        <?php if ($error_message): ?>
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <h5 class="alert-heading"><i class="bi bi-exclamation-triangle"></i> Error</h5>
                <?php echo $error_message; ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>

        <div class="row">
            <div class="col-lg-8">
                <div class="card mb-4">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0"><i class="bi bi-sliders"></i> Promotion Settings</h5>
                    </div>
                    <div class="card-body">
                        <form method="POST" action="">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label"><i class="bi bi-arrow-left-circle"></i> From Year *</label>
                                    <select name="from-year" class="form-select" required>
                                        <option value="">Select current year...</option>
                                        <?php while ($year = mysqli_fetch_assoc($active_years)): ?>
                                            <option value="<?php echo $year['year_id']; ?>" 
                                                <?php echo ($from_year == $year['year_id']) ? 'selected' : ''; ?>>
                                                <?php echo htmlspecialchars($year['year']); ?> 
                                                <?php echo ($year['status'] == 'active') ? '(Active)' : ''; ?>
                                            </option>
                                        <?php endwhile; ?>
                                    </select>
                                </div>
                                
                                <div class="col-md-6">
                                    <label class="form-label"><i class="bi bi-arrow-right-circle"></i> To Year *</label>
                                    <select name="to-year" class="form-select" required>
                                        <option value="">Select next year...</option>
                                        <?php 
                                        // Reset pointer
                                        mysqli_data_seek($inactive_years, 0);
                                        while ($year = mysqli_fetch_assoc($inactive_years)): 
                                        ?>
                                            <option value="<?php echo $year['year_id']; ?>"
                                                <?php echo ($to_year == $year['year_id']) ? 'selected' : ''; ?>>
                                                <?php echo htmlspecialchars($year['year']); ?>
                                            </option>
                                        <?php endwhile; ?>
                                    </select>
                                </div>
                                
                                <div class="col-md-12">
                                    <label class="form-label"><i class="bi bi-bar-chart-line"></i> Promotion Marks Threshold *</label>
                                    <div class="input-group">
                                        <input type="number" name="promoted_marks" class="form-control" 
                                               placeholder="Enter minimum marks required for promotion"
                                               value="<?php echo htmlspecialchars($promoted_marks ?: '50'); ?>" 
                                               min="0" max="100" required>
                                        <span class="input-group-text">%</span>
                                    </div>
                                    <small class="text-muted">Students scoring equal or above this percentage will be promoted</small>
                                </div>
                                
                                <div class="col-12 mt-3">
                                    <button type="submit" name="promote" class="btn btn-promote">
                                        <i class="bi bi-rocket-takeoff"></i> Run Promotion Process
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <div class="col-lg-4">
                <div class="card">
                    <div class="card-header bg-info text-white">
                        <h5 class="mb-0"><i class="bi bi-info-circle"></i> How It Works</h5>
                    </div>
                    <div class="card-body">
                        <ol class="mb-0">
                            <li>Select the current year (From)</li>
                            <li>Select the next academic year (To)</li>
                            <li>Set minimum marks for promotion</li>
                            <li>Click "Run Promotion Process"</li>
                            <li>System will:
                                <ul class="mt-2">
                                    <li><span class="badge badge-promoted">Promote</span> if marks ≥ threshold & next class exists</li>
                                    <li><span class="badge badge-repeated">Repeat</span> if marks < threshold</li>
                                    <li><span class="badge badge-graduated">Graduate</span> if no next class exists</li>
                                </ul>
                            </li>
                        </ol>
                    </div>
                </div>
                
                <?php if ($total_students > 0): ?>
                <div class="card mt-4">
                    <div class="card-header bg-success text-white">
                        <h5 class="mb-0"><i class="bi bi-graph-up"></i> Quick Stats</h5>
                    </div>
                    <div class="card-body">
                        <div class="row text-center">
                            <div class="col-6 mb-3">
                                <div class="summary-card promoted">
                                    <h2><?php echo $promoted_count; ?></h2>
                                    <small>Promoted</small>
                                </div>
                            </div>
                            <div class="col-6 mb-3">
                                <div class="summary-card repeated">
                                    <h2><?php echo $repeated_count; ?></h2>
                                    <small>Repeated</small>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="summary-card graduated">
                                    <h2><?php echo $graduated_count; ?></h2>
                                    <small>Graduated</small>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="summary-card skipped">
                                    <h2><?php echo $skipped_count; ?></h2>
                                    <small>Skipped</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endif; ?>
            </div>
        </div>

        <?php if (!empty($processed_students)): ?>
        <div class="card mt-4">
            <div class="card-header bg-dark text-white">
                <h5 class="mb-0"><i class="bi bi-list-check"></i> Student Processing Details (<?php echo count($processed_students); ?> students)</h5>
            </div>
            <div class="card-body">
                <div class="student-list">
                    <?php foreach ($processed_students as $index => $student): ?>
                        <div class="student-item d-flex justify-content-between align-items-center">
                            <div>
                                <span class="badge 
                                    <?php echo $student['action'] == 'promoted' ? 'bg-success' : ''; ?>
                                    <?php echo $student['action'] == 'repeated' ? 'bg-warning text-dark' : ''; ?>
                                    <?php echo $student['action'] == 'graduated' ? 'bg-info' : ''; ?>
                                    <?php echo $student['action'] == 'skipped' ? 'bg-secondary' : ''; ?>
                                    <?php echo $student['action'] == 'error' ? 'bg-danger' : ''; ?>">
                                    <?php echo ucfirst($student['action']); ?>
                                </span>
                                <strong>Student ID: <?php echo $student['id']; ?></strong>
                                <?php if (isset($student['marks'])): ?>
                                    <span class="text-muted">(Marks: <?php echo $student['marks']; ?>%)</span>
                                <?php endif; ?>
                            </div>
                            <div>
                                <small class="text-muted">
                                    <?php if (isset($student['reason'])): ?>
                                        <?php echo $student['reason']; ?>
                                    <?php elseif (isset($student['from_class']) && isset($student['to_class'])): ?>
                                        Class <?php echo $student['from_class']; ?> → <?php echo $student['to_class']; ?>
                                    <?php endif; ?>
                                </small>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
        <?php endif; ?>

        <div class="mt-4 text-center">
            <div class="btn-group">
                <a href="?view_log=1" class="btn btn-outline-primary">
                    <i class="bi bi-journal-text"></i> View Promotion Log
                </a>
                <a href="?test=students" class="btn btn-outline-info">
                    <i class="bi bi-database-check"></i> Test Database
                </a>
                <button type="button" class="btn btn-outline-secondary" onclick="location.reload()">
                    <i class="bi bi-arrow-clockwise"></i> Refresh
                </button>
            </div>
        </div>

        <?php if (isset($_GET['view_log'])): ?>
        <div class="card mt-4">
            <div class="card-header bg-warning text-dark">
                <h5 class="mb-0"><i class="bi bi-journal-text"></i> Promotion Log (Latest 50 Records)</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-bordered table-hover">
                        <thead class="table-light">
                            <tr>
                                <th>Student ID</th>
                                <th>Marks</th>
                                <th>From Class</th>
                                <th>To Class</th>
                                <th>From Year</th>
                                <th>To Year</th>
                                <th>Decision</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $log_query = "SELECT * FROM student_promotion_log 
                                         ORDER BY total_marks ASC 
                                         LIMIT 200";
                            $log_result = mysqli_query($conn, $log_query);
                            
                            if ($log_result && mysqli_num_rows($log_result) > 0):
                                while ($log = mysqli_fetch_assoc($log_result)):
                            ?>
                                <tr>
                                    <td><?php echo $log['sid']; ?></td>
                                    <td><?php echo $log['total_marks']; ?>%</td>
                                    <td><?php echo $log['from_class']; ?></td>
                                    <td><?php echo $log['to_class'] ?? 'N/A'; ?></td>
                                    <td>
                                        <?php 
                                        $from_year_name = mysqli_query($conn, "SELECT year FROM year WHERE year_id = '{$log['from_year']}'");
                                        if ($from_year_name && mysqli_num_rows($from_year_name) > 0) {
                                            $f_year = mysqli_fetch_assoc($from_year_name);
                                            echo $f_year['year'];
                                        } else {
                                            echo $log['from_year'];
                                        }
                                        ?>
                                    </td>
                                    <td>
                                        <?php 
                                        $to_year_name = mysqli_query($conn, "SELECT year FROM year WHERE year_id = '{$log['to_year']}'");
                                        if ($to_year_name && mysqli_num_rows($to_year_name) > 0) {
                                            $t_year = mysqli_fetch_assoc($to_year_name);
                                            echo $t_year['year'];
                                        } else {
                                            echo $log['to_year'];
                                        }
                                        ?>
                                    </td>
                                    <td>
                                        <span class="badge 
                                            <?php echo $log['decision'] == 'Promoted' ? 'bg-success' : ''; ?>
                                            <?php echo $log['decision'] == 'Repeated' ? 'bg-warning text-dark' : ''; ?>
                                            <?php echo $log['decision'] == 'Graduated' ? 'bg-info' : ''; ?>
                                            <?php echo $log['decision'] == 'TEST' ? 'bg-secondary' : ''; ?>">
                                            <?php echo $log['decision']; ?>
                                        </span>
                                    </td>
                                    <td><?php echo date('Y-m-d H:i', strtotime($log['created_at'])); ?></td>
                                </tr>
                            <?php 
                                endwhile;
                            else:
                            ?>
                                <tr>
                                    <td colspan="8" class="text-center">No promotion records found</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Add confirmation dialog
        document.querySelector('form').addEventListener('submit', function(e) {
            const fromYear = document.querySelector('[name="from-year"]').value;
            const toYear = document.querySelector('[name="to-year"]').value;
            const marks = document.querySelector('[name="promoted_marks"]').value;
            
            if(!fromYear || !toYear || !marks) {
                alert('Please fill all required fields!');
                e.preventDefault();
                return;
            }
            
            if(fromYear === toYear) {
                alert('From Year and To Year cannot be the same!');
                e.preventDefault();
                return;
            }
            
            if(!confirm('Are you sure you want to run the promotion process? This action cannot be undone.')) {
                e.preventDefault();
            }
        });
        
        // Auto-refresh page after 5 seconds if there's a success message
        <?php if ($success_message): ?>
        setTimeout(function() {
            location.reload();
        }, 5000);
        <?php endif; ?>
    </script>
</body>
</html>